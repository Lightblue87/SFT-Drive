import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import type { RestaurantStopSettings, MenuItem } from '@/types/mealOrder'
import { downloadCsv } from '@/utils/csv'
import { shareOrCopyText } from '@/utils/share'

interface OrderRow {
  order_id: string
  registration_id: string
  status: string
  username: string
  vehicle_manufacturer: string
  vehicle_model: string
  items: { name: string; quantity: number; note: string | null }[]
}

const fieldLabel = 'font-mono text-[9px] font-medium tracking-[0.2em] text-sft-gray-dim'
const fieldInput =
  'mt-2 w-full rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3 text-[15px] text-sft-white outline-none focus:border-sft-red/60'

/** Settings-Form braucht lokale Datetime-local-Konvertierung (§19, wie an anderer Stelle im Admin-Bereich). */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fromDatetimeLocal(value: string): string | null {
  if (!value) return null
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes).toISOString()
}

/** Restaurant-Stopp verwalten: Bestellkonfiguration, Speisekarte, Auswertung (§27.3-§27.9). */
export function AdminRestaurantStopPage() {
  const { stopId } = useParams<{ id: string; stopId: string }>()

  const [loading, setLoading] = useState(true)
  const [orderingEnabled, setOrderingEnabled] = useState(false)
  const [openAt, setOpenAt] = useState('')
  const [deadlineAt, setDeadlineAt] = useState('')
  const [note, setNote] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  const [items, setItems] = useState<MenuItem[]>([])
  const [newItemName, setNewItemName] = useState('')

  const [orders, setOrders] = useState<OrderRow[]>([])

  const load = useCallback(async () => {
    if (!stopId) return
    setLoading(true)

    const [{ data: settingsRow }, { data: menuRows }] = await Promise.all([
      supabase.from('restaurant_stop_settings').select('*').eq('tour_stop_id', stopId).maybeSingle(),
      supabase.from('menu_items').select('*').eq('restaurant_stop_id', stopId).order('sort_order', { ascending: true }),
    ])

    if (settingsRow) {
      const s = settingsRow as RestaurantStopSettings
      setOrderingEnabled(s.ordering_enabled)
      setOpenAt(toDatetimeLocal(s.ordering_open_at))
      setDeadlineAt(toDatetimeLocal(s.ordering_deadline_at))
      setNote(s.restaurant_note ?? '')
    }
    setItems((menuRows as MenuItem[]) ?? [])

    const { data: orderRows } = await supabase
      .from('meal_orders')
      .select(
        'id, registration_id, status, tour_registrations(id, vehicle_manufacturer, vehicle_model), meal_order_items(quantity, note, menu_items(name))',
      )
      .eq('restaurant_stop_id', stopId)
      .eq('status', 'submitted')

    // tour_registrations enthält user_id, aber wir brauchen den Username separat
    // (kein direkter FK zu profiles für PostgREST-Embedding, siehe AdminTourRegistrationsPage).
    const regIds = ((orderRows ?? []) as { registration_id: string }[]).map((o) => o.registration_id)
    const { data: regs } = regIds.length
      ? await supabase.from('tour_registrations').select('id, user_id').in('id', regIds)
      : { data: [] }
    const regUserId = new Map((regs ?? []).map((r) => [r.id as string, r.user_id as string]))
    const profileUserIds = [...new Set([...regUserId.values()])]
    const { data: profiles } = profileUserIds.length
      ? await supabase.from('profiles').select('id, username').in('id', profileUserIds)
      : { data: [] }
    const usernameByUserId = new Map((profiles ?? []).map((p) => [p.id as string, p.username as string]))

    type RawOrderRow = {
      id: string
      registration_id: string
      status: string
      tour_registrations: { vehicle_manufacturer: string; vehicle_model: string } | null
      meal_order_items: { quantity: number; note: string | null; menu_items: { name: string } | null }[]
    }

    setOrders(
      ((orderRows ?? []) as unknown as RawOrderRow[]).map((o) => ({
        order_id: o.id,
        registration_id: o.registration_id,
        status: o.status,
        username: usernameByUserId.get(regUserId.get(o.registration_id) ?? '') ?? '—',
        vehicle_manufacturer: o.tour_registrations?.vehicle_manufacturer ?? '',
        vehicle_model: o.tour_registrations?.vehicle_model ?? '',
        items: (o.meal_order_items ?? []).map((i) => ({
          name: i.menu_items?.name ?? '—',
          quantity: i.quantity,
          note: i.note,
        })),
      })),
    )

    setLoading(false)
  }, [stopId])

  useEffect(() => {
    load()
  }, [load])

  async function saveSettings() {
    if (!stopId) return
    setSavingSettings(true)
    await supabase.from('restaurant_stop_settings').upsert({
      tour_stop_id: stopId,
      ordering_enabled: orderingEnabled,
      ordering_open_at: fromDatetimeLocal(openAt),
      ordering_deadline_at: fromDatetimeLocal(deadlineAt),
      restaurant_note: note.trim() || null,
      updated_at: new Date().toISOString(),
    })
    setSavingSettings(false)
    load()
  }

  async function addMenuItem() {
    if (!stopId || !newItemName.trim()) return
    await supabase.from('menu_items').insert({
      restaurant_stop_id: stopId,
      name: newItemName.trim(),
      sort_order: items.length,
    })
    setNewItemName('')
    load()
  }

  async function toggleAvailable(item: MenuItem) {
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id)
    load()
  }

  async function removeMenuItem(itemId: string) {
    await supabase.from('menu_items').delete().eq('id', itemId)
    load()
  }

  if (loading) return <PageLoading />

  const totals = new Map<string, number>()
  for (const o of orders) {
    for (const i of o.items) {
      totals.set(i.name, (totals.get(i.name) ?? 0) + i.quantity)
    }
  }
  const totalDishes = [...totals.values()].reduce((sum, n) => sum + n, 0)

  // Restaurant-Export (siehe CLAUDE.md §35.1): aggregierte Mengen je
  // Menüposition sowie fahrzeugbezogene Detailansicht, immer aus dem
  // aktuellen autorisierten Datenbestand — keine separate Export-Datenhaltung.
  function exportCsv() {
    const header = ['Username', 'Fahrzeug', 'Gericht', 'Menge', 'Notiz']
    const dataRows = orders.flatMap((o) =>
      o.items.map((i) => [
        o.username,
        `${o.vehicle_manufacturer} ${o.vehicle_model}`,
        i.name,
        i.quantity,
        i.note ?? '',
      ]),
    )
    downloadCsv('restaurant-bestellung.csv', [header, ...dataRows])
  }

  async function shareSummary() {
    const lines = [
      'Restaurant-Bestellung',
      ...[...totals.entries()].map(([name, qty]) => `${qty} × ${name}`),
      '',
      `Gesamt: ${totalDishes} Gerichte`,
    ]
    await shareOrCopyText('Restaurant-Bestellung', lines.join('\n'))
  }

  return (
    <div className="flex flex-col gap-3.5 pt-3">
      <div className="rounded-2xl border border-white/9 bg-sft-card p-3.5">
        <div className="mb-2.5 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">BESTELLFENSTER</div>
        <button
          type="button"
          onClick={() => setOrderingEnabled((v) => !v)}
          className="mb-3.5 flex w-full items-center justify-between gap-3 rounded-xl border border-white/9 bg-[#0f0f12] px-3.5 py-3 text-left"
        >
          <span className="text-[13px] font-medium">Essensbestellung aktiviert</span>
          <span
            className={`relative h-7 w-[46px] flex-none rounded-full ${orderingEnabled ? 'bg-sft-red' : 'bg-white/14'}`}
          >
            <span
              className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-[left] ${
                orderingEnabled ? 'left-[21px]' : 'left-[3px]'
              }`}
            />
          </span>
        </button>
        <div className="grid grid-cols-2 gap-[11px]">
          <label>
            <span className={fieldLabel}>ÖFFNET</span>
            <input
              type="datetime-local"
              value={openAt}
              onChange={(e) => setOpenAt(e.target.value)}
              className={`${fieldInput} font-mono`}
            />
          </label>
          <label>
            <span className={fieldLabel}>SCHLIESST</span>
            <input
              type="datetime-local"
              value={deadlineAt}
              onChange={(e) => setDeadlineAt(e.target.value)}
              className={`${fieldInput} font-mono`}
            />
          </label>
        </div>
        <label className="mt-3.5 block">
          <span className={fieldLabel}>HINWEIS (Z. B. ÖFFNUNGSZEITEN)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={fieldInput} />
        </label>
        <button
          onClick={saveSettings}
          disabled={savingSettings}
          className="tap-scale mt-3.5 w-full rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-3 text-[14px] font-semibold text-white disabled:opacity-60"
        >
          {savingSettings ? 'Wird gespeichert…' : 'Speichern'}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
        <div className="px-4 pb-2.5 pt-3.5 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">SPEISEKARTE</div>
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2.5 border-t border-white/6 px-4 py-3">
            <span className={`flex-1 text-[13px] font-medium ${item.is_available ? '' : 'text-sft-gray line-through'}`}>
              {item.name}
            </span>
            <button onClick={() => toggleAvailable(item)} className="flex-none font-mono text-[10px] text-sft-gray underline">
              {item.is_available ? 'DEAKTIVIEREN' : 'AKTIVIEREN'}
            </button>
            <button onClick={() => removeMenuItem(item.id)} className="flex-none font-mono text-[10px] text-[#ff6b63] underline">
              LÖSCHEN
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="px-4 pb-3 text-sm text-sft-gray">Noch keine Gerichte angelegt.</p>}
        <div className="flex gap-2 border-t border-white/6 p-3.5">
          <input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Neues Gericht"
            className="flex-1 rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-2.5 text-[15px] text-sft-white"
          />
          <button onClick={addMenuItem} className="tap-scale rounded-xl bg-sft-red px-4 py-2.5 text-sm font-medium">
            +
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
        <div className="px-4 pb-2.5 pt-3.5 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
          GESAMTBESTELLUNG
        </div>
        {totals.size === 0 ? (
          <p className="px-4 pb-3.5 text-sm text-sft-gray">Noch keine Bestellungen.</p>
        ) : (
          <>
            {[...totals.entries()].map(([name, qty]) => (
              <div key={name} className="flex items-center justify-between border-t border-white/6 px-4 py-2.5">
                <span className="text-[13px] font-medium">{name}</span>
                <span className="font-mono text-[15px] font-bold">{qty}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-white/6 px-4 py-2.5 font-mono text-[11px] text-sft-gray">
              GESAMT
              <span className="font-bold text-sft-white">{totalDishes} GERICHTE</span>
            </div>
            <div className="flex flex-wrap gap-2 p-3.5">
              <button onClick={exportCsv} className="tap-scale rounded-lg border border-white/13 px-3 py-2 text-xs font-medium">
                CSV exportieren
              </button>
              <button onClick={shareSummary} className="tap-scale rounded-lg border border-white/13 px-3 py-2 text-xs font-medium">
                Zusammenfassung teilen
              </button>
            </div>
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
        <div className="px-4 pb-2.5 pt-3.5 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
          FAHRZEUGBEZOGENE BESTELLUNGEN
        </div>
        {orders.length === 0 ? (
          <p className="px-4 pb-3.5 text-sm text-sft-gray">Noch keine Bestellungen.</p>
        ) : (
          orders.map((o) => (
            <div key={o.order_id} className="border-t border-white/6 px-4 py-3">
              <div className="text-[13px] font-semibold">
                {o.username} · {o.vehicle_manufacturer} {o.vehicle_model}
              </div>
              <div className="mt-1 font-mono text-[11px] text-sft-gray">
                {o.items.map((i, idx) => (
                  <div key={idx}>
                    {i.quantity} × {i.name}
                    {i.note && ` (${i.note})`}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
