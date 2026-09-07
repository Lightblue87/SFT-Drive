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
    <div className="mt-3 rounded-md bg-sft-black p-3">
      <p className="font-medium">Essen vorbestellen</p>
      {settings.restaurant_note && <p className="mt-1 text-sft-gray">{settings.restaurant_note}</p>}

      {notYetOpen ? (
        <p className="mt-2 text-sft-gray">Bestellung ist noch nicht möglich.</p>
      ) : closed ? (
        <>
          <p className="mt-2 text-sft-gray">Bestellung geschlossen.</p>
          {existingOrderStatus === 'submitted' && totalSelected > 0 && (
            <ul className="mt-2 text-sft-gray">
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
          <ul className="mt-2 flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span>{item.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantities((prev) => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1) }))
                    }
                    className="h-7 w-7 rounded-md border border-sft-surface2"
                  >
                    −
                  </button>
                  <span className="w-4 text-center">{quantities[item.id] ?? 0}</span>
                  <button
                    type="button"
                    onClick={() => setQuantities((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }))}
                    className="h-7 w-7 rounded-md border border-sft-surface2"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
            {items.length === 0 && <p className="text-sft-gray">Aktuell keine Gerichte verfügbar.</p>}
          </ul>

          {totalSelected !== personCount && (
            <p className="mt-2 text-sft-gray">
              Du hast {personCount} {personCount === 1 ? 'Person' : 'Personen'} für diese Tour angegeben, aber
              aktuell {totalSelected} {totalSelected === 1 ? 'Gericht' : 'Gerichte'} ausgewählt.
            </p>
          )}

          {error && <p className="mt-2 text-sft-red">{error}</p>}
          {saved && <p className="mt-2 text-sft-gray">Bestellung gespeichert.</p>}

          <button
            onClick={submit}
            disabled={saving || items.length === 0}
            className="mt-3 rounded-md bg-sft-red px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {saving ? 'Wird gespeichert…' : existingOrderStatus === 'submitted' ? 'Bestellung ändern' : 'Bestellen'}
          </button>
        </>
      )}
    </div>
  )
}
