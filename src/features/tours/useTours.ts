import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tour, PublicTourStats } from '@/types/tour'
import { registrationPhase } from '@/utils/tourStatus'
import { todayKey } from '@/utils/date'

export interface TourWithStats {
  tour: Tour
  stats: PublicTourStats | null
  ownStatus: string | null
}

function sortTours(tours: Tour[]): Tour[] {
  const todayStr = todayKey()

  const running = tours.filter((t) => t.start_date <= todayStr && t.end_date >= todayStr)
  const upcoming = tours
    .filter((t) => t.start_date > todayStr)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
  const past = tours
    .filter((t) => t.end_date < todayStr)
    .sort((a, b) => b.end_date.localeCompare(a.end_date))

  return [...running, ...upcoming, ...past]
}

/**
 * Lädt die für den Betrachter sichtbaren Touren und reichert sie um
 * öffentliche Kapazitätsdaten und den eigenen Anmeldestatus an.
 *
 * Bewusst ohne Statusfilter: welche Touren sichtbar sind, entscheidet
 * ausschließlich die RLS (`tour_is_visible()`, siehe CLAUDE.md §8.3) — also
 * `published`, `registration_closed`, `completed` sowie abgesagte Touren bis
 * zu ihrem Starttag. Ein zusätzlicher Client-Filter auf `published` hatte
 * dazu geführt, dass eine Tour mit Anmeldeschluss für Teilnehmer schlagartig
 * ganz verschwand.
 */
export function useTours() {
  const [tours, setTours] = useState<TourWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { data: tourRows, error: toursError } = await supabase.from('tours').select('*')

      if (cancelled) return

      if (toursError) {
        setError('Touren konnten nicht geladen werden.')
        setLoading(false)
        return
      }

      // Admins bekommen über die RLS zusätzlich Entwürfe und archivierte Touren
      // — die gehören aber in die Tourenverwaltung, nicht in die öffentliche
      // Übersicht. Deshalb hier dieselbe Auswahl wie für alle anderen.
      const visible = ((tourRows ?? []) as Tour[]).filter(
        (t) => registrationPhase(t) !== 'unavailable',
      )
      const sorted = sortTours(visible)

      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id

      const results: TourWithStats[] = await Promise.all(
        sorted.map(async (tour) => {
          const { data: stats } = await supabase.rpc('get_public_tour_stats', {
            p_tour_id: tour.id,
          })

          let ownStatus: string | null = null
          if (userId) {
            const { data: reg } = await supabase
              .from('tour_registrations')
              .select('status')
              .eq('tour_id', tour.id)
              .eq('user_id', userId)
              .maybeSingle()
            ownStatus = reg?.status ?? null
          }

          return {
            tour,
            stats: (stats?.[0] as PublicTourStats) ?? null,
            ownStatus,
          }
        }),
      )

      if (!cancelled) {
        setTours(results)
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { tours, loading, error }
}
