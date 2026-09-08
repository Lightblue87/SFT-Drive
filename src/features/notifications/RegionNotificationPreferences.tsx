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
    <div className="rounded-2xl border border-white/8 bg-sft-card px-4 py-[15px]">
      <div className="font-mono text-[9px] tracking-[0.18em] text-sft-gray-dim">
        BENACHRICHTIGUNGEN NACH REGION
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-sft-gray">
        Erhalte eine Mitteilung, sobald eine neue Tour in einer ausgewählten Region veröffentlicht
        wird.
      </p>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {availableRegions.map((region) => {
          const active = selected.has(region)
          return (
            <button
              key={region}
              onClick={() => toggle(region)}
              disabled={pendingRegion === region}
              className={`tap-scale rounded-full px-3.5 py-2 text-xs font-medium disabled:opacity-60 ${
                active
                  ? 'bg-gradient-to-b from-[#f01a12] to-[#c00500] text-white shadow-[0_6px_14px_-8px_#e10600]'
                  : 'border border-white/13 text-sft-gray'
              }`}
            >
              {region}
            </button>
          )
        })}
      </div>
    </div>
  )
}
