import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { rpcErrorMessage } from '@/types/tour'
import type { RegistrationResult } from '@/types/tour'
import type { RestaurantStopSettings, MenuItem, MealOrderItem } from '@/types/mealOrder'

interface Props {
  restaurantStopId: string
  personCount: number
}

/** Essensvorbestellung für einen Restaurant-Stopp (siehe CLAUDE.md §27.5-§27.8). */
export function MealOrderForm({ restaurantStopId, personCount }: Props) {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<RestaurantStopSettings | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [existingOrderStatus, setExistingOrderStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const [{ data: settingsRow }, { data: menuRows }] = await Promise.all([
        supabase
          .from('restaurant_stop_settings')
          .select('*')
          .eq('tour_stop_id', restaurantStopId)
          .maybeSingle(),
        supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_stop_id', restaurantStopId)
          .eq('is_available', true)
          .order('sort_order', { ascending: true }),
      ])

      setSettings((settingsRow as RestaurantStopSettings) ?? null)
      setItems((menuRows as MenuItem[]) ?? [])

      const { data: order } = await supabase
        .from('meal_orders')
        .select('id, status')
        .eq('restaurant_stop_id', restaurantStopId)
        .maybeSingle()

      if (order && order.status === 'submitted') {
        setExistingOrderStatus(order.status)
        const { data: orderItems } = await supabase
          .from('meal_order_items')
          .select('menu_item_id, quantity, note')
          .eq('meal_order_id', order.id)

        const q: Record<string, number> = {}
        const n: Record<string, string> = {}
        for (const oi of (orderItems as MealOrderItem[]) ?? []) {
          q[oi.menu_item_id] = oi.quantity
          if (oi.note) n[oi.menu_item_id] = oi.note
        }
        setQuantities(q)
        setNotes(n)
      }

      setLoading(false)
    }
    load()
  }, [restaurantStopId])

  async function submit() {
    setError(null)
    setSaved(false)
    setSaving(true)

    const orderItems = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([menu_item_id, quantity]) => ({ menu_item_id, quantity, note: notes[menu_item_id] || undefined }))

    const { data, error: rpcError } = await supabase.rpc('submit_meal_order', {
      p_restaurant_stop_id: restaurantStopId,
      p_items: orderItems,
    })
    setSaving(false)

    if (rpcError) {
      setError('Bestellung konnte nicht gespeichert werden.')
      return
    }

    const result = data as RegistrationResult
    if (result.code !== 'OK') {
      setError(rpcErrorMessage(result.code))
      return
    }

    setExistingOrderStatus(orderItems.length > 0 ? 'submitted' : 'cancelled')
    setSaved(true)
  }

  if (loading || !settings?.ordering_enabled) return null

  const now = new Date()
  const notYetOpen = settings.ordering_open_at && now < new Date(settings.ordering_open_at)
  const closed = settings.ordering_deadline_at && now > new Date(settings.ordering_deadline_at)

  const totalSelected = Object.values(quantities).reduce((sum, q) => sum + q, 0)

  return (
    <div className="mt-3.5 rounded-2xl border border-sft-amber/25 bg-sft-amber/[0.05] p-3.5">
      <div className="text-[14px] font-semibold text-sft-amber">Essen vorbestellen</div>
      {settings.restaurant_note && (
        <p className="mt-1 text-[12px] text-sft-gray">{settings.restaurant_note}</p>
      )}

      {notYetOpen ? (
        <p className="mt-2 font-mono text-[11px] text-sft-gray">BESTELLUNG IST NOCH NICHT MÖGLICH</p>
      ) : closed ? (
        <>
          <p className="mt-2 font-mono text-[11px] text-sft-gray">BESTELLUNG GESCHLOSSEN</p>
          {existingOrderStatus === 'submitted' && totalSelected > 0 && (
            <ul className="mt-2 flex flex-col gap-1 text-[13px] text-sft-gray">
              {items
                .filter((i) => quantities[i.id] > 0)
                .map((i) => (
                  <li key={i.id}>
                    {quantities[i.id]} × {i.name}
                  </li>
                ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <span className="text-[13px]">{item.name}</span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantities((prev) => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1) }))
                    }
                    className="tap-scale h-8 w-8 rounded-lg border border-white/14 bg-sft-surface2 font-mono text-sft-white"
                  >
                    −
                  </button>
                  <span className="w-4 text-center font-mono text-sm font-bold">{quantities[item.id] ?? 0}</span>
                  <button
                    type="button"
                    onClick={() => setQuantities((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }))}
                    className="tap-scale h-8 w-8 rounded-lg border border-white/14 bg-sft-surface2 font-mono text-sft-white"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
            {items.length === 0 && (
              <p className="font-mono text-[11px] text-sft-gray">AKTUELL KEINE GERICHTE VERFÜGBAR</p>
            )}
          </ul>

          {totalSelected !== personCount && (
            <p className="mt-2.5 text-[12px] leading-relaxed text-sft-gray">
              Du hast {personCount} {personCount === 1 ? 'Person' : 'Personen'} für diese Tour angegeben, aber
              aktuell {totalSelected} {totalSelected === 1 ? 'Gericht' : 'Gerichte'} ausgewählt.
            </p>
          )}

          {error && <p className="mt-2.5 text-sm text-sft-red">{error}</p>}
          {saved && <p className="mt-2.5 font-mono text-[11px] text-sft-gray">BESTELLUNG GESPEICHERT</p>}

          <button
            onClick={submit}
            disabled={saving || items.length === 0}
            className="tap-scale mt-3.5 w-full rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-3 text-[14px] font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Wird gespeichert…' : existingOrderStatus === 'submitted' ? 'Bestellung ändern' : 'Bestellen'}
          </button>
        </>
      )}
    </div>
  )
}
