import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'

/**
 * "Benachrichtige mich bei neuen Touren in Region X" (siehe CLAUDE.md §27.10
 * — allgemeine Notification-Infrastruktur, nicht nur für Restaurants). Die
 * eigentliche Benachrichtigung übernimmt ein DB-Trigger beim Veröffentlichen
 * einer Tour (notify_region_subscribers_on_publish) — hier wird nur die
 * eigene Präferenzliste verwaltet.
 */
export function RegionNotificationPreferences() {
  const { user } = useAuth()
  const [availableRegions, setAvailableRegions] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [pendingRegion, setPendingRegion] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    Promise.all([
      supabase.from('tours').select('region').eq('status', 'published'),
      supabase.from('notification_preferences').select('region').eq('user_id', user.id),
    ]).then(([toursRes, prefsRes]) => {
      const regions = [...new Set((toursRes.data ?? []).map((t) => t.region as string))].sort()
      setAvailableRegions(regions)
      setSelected(new Set((prefsRes.data ?? []).map((p) => p.region as string)))
      setLoading(false)
    })
  }, [user])

  async function toggle(region: string) {
    if (!user) return
    setPendingRegion(region)

    if (selected.has(region)) {
      await supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('region', region)
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(region)
        return next
      })
    } else {
      await supabase.from('notification_preferences').insert({ user_id: user.id, region })
      setSelected((prev) => new Set(prev).add(region))
    }

    setPendingRegion(null)
  }

  if (loading || availableRegions.length === 0) return null

  return (
    <div className="mt-6 rounded-md bg-sft-surface p-4 text-sm">
      <p className="font-medium">Benachrichtigungen nach Region</p>
      <p className="mt-1 text-sft-gray">
        Erhalte eine Mitteilung, sobald eine neue Tour in einer ausgewählten Region veröffentlicht
        wird.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {availableRegions.map((region) => (
          <button
            key={region}
            onClick={() => toggle(region)}
            disabled={pendingRegion === region}
            className={`rounded-full px-3 py-1.5 text-xs disabled:opacity-60 ${
              selected.has(region) ? 'bg-sft-red' : 'border border-sft-surface2 text-sft-gray'
            }`}
          >
            {region}
          </button>
        ))}
      </div>
    </div>
  )
}
