import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import type { RestaurantStopSettings, MenuItem } from '@/types/mealOrder'

interface OrderRow {
  order_id: string
  registration_id: string
  status: string
  username: string
  vehicle_manufacturer: string
  vehicle_model: string
  items: { name: string; quantity: number; note: string | null }[]
}

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

  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold">Restaurant-Bestellung</h1>

      <div className="mt-4 flex flex-col gap-3 rounded-md bg-sft-surface p-4 text-sm">
        <p className="font-medium">Bestellkonfiguration</p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={orderingEnabled} onChange={(e) => setOrderingEnabled(e.target.checked)} />
          Essensbestellung aktiviert
        </label>
        <label className="flex flex-col gap-1">
          Bestellung möglich ab
          <input
            type="datetime-local"
            value={openAt}
            onChange={(e) => setOpenAt(e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          Bestellfrist
          <input
            type="datetime-local"
            value={deadlineAt}
            onChange={(e) => setDeadlineAt(e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          Hinweis (z. B. Öffnungszeiten)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
          />
        </label>
        <button
          onClick={saveSettings}
          disabled={savingSettings}
          className="self-start rounded-md bg-sft-red px-4 py-2 font-medium disabled:opacity-60"
        >
          {savingSettings ? 'Wird gespeichert…' : 'Speichern'}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-md bg-sft-surface p-4 text-sm">
        <p className="font-medium">Speisekarte</p>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2">
              <span className={item.is_available ? undefined : 'text-sft-gray line-through'}>{item.name}</span>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => toggleAvailable(item)} className="text-xs underline">
                  {item.is_available ? 'Deaktivieren' : 'Aktivieren'}
                </button>
                <button onClick={() => removeMenuItem(item.id)} className="text-xs text-sft-red underline">
                  Löschen
                </button>
              </div>
            </li>
          ))}
          {items.length === 0 && <p className="text-sft-gray">Noch keine Gerichte angelegt.</p>}
        </ul>
        <div className="flex gap-2">
          <input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Neues Gericht"
            className="flex-1 rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
          />
          <button onClick={addMenuItem} className="rounded-md bg-sft-red px-4 py-2 font-medium">
            Hinzufügen
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-md bg-sft-surface p-4 text-sm">
        <p className="font-medium">Gesamtbestellung</p>
        {totals.size === 0 ? (
          <p className="mt-2 text-sft-gray">Noch keine Bestellungen.</p>
        ) : (
          <>
            <ul className="mt-2 flex flex-col gap-1">
              {[...totals.entries()].map(([name, qty]) => (
                <li key={name}>
                  {qty} × {name}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sft-gray">Gesamt: {totalDishes} Gerichte</p>
          </>
        )}
      </div>

      <div className="mt-4 rounded-md bg-sft-surface p-4 text-sm">
        <p className="font-medium">Fahrzeugbezogene Bestellungen</p>
        {orders.length === 0 ? (
          <p className="mt-2 text-sft-gray">Noch keine Bestellungen.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {orders.map((o) => (
              <li key={o.order_id}>
                <div className="font-medium">
                  {o.username} · {o.vehicle_manufacturer} {o.vehicle_model}
                </div>
                <ul className="text-sft-gray">
                  {o.items.map((i, idx) => (
                    <li key={idx}>
                      {i.quantity} × {i.name}
                      {i.note && ` (${i.note})`}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
