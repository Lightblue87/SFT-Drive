import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatDateRange } from '@/utils/date'
import type { ArchiveEntry } from '@/types/tour'
import { PageLoading } from '@/components/PageLoading'

/**
 * Persönliches Tourenarchiv (siehe CLAUDE.md §8.8, §21.2), geladen über die
 * sichere RPC `get_my_tour_archive()` (verwendet ausschließlich auth.uid()).
 */
export function ProfileArchivePage() {
  const [entries, setEntries] = useState<ArchiveEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('get_my_tour_archive').then(({ data }) => {
      setEntries((data as ArchiveEntry[]) ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return <PageLoading />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Tourenarchiv</h1>

      {entries.length === 0 ? (
        <p className="text-sm text-sft-gray">Hier erscheinen deine vergangenen, bestätigten Teilnahmen.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((e) => (
            <li key={e.tour_id}>
              <Link to={`/tours/${e.tour_slug}`} className="block rounded-md bg-sft-surface p-3 text-sm">
                <div className="font-medium">{e.tour_title}</div>
                <div className="text-sft-gray">
                  {formatDateRange(e.start_date, e.end_date)} · {e.region}
                  {e.route_length_km != null && ` · ${e.route_length_km} km`}
                </div>
                <div className="text-sft-gray">
                  {e.vehicle_manufacturer} {e.vehicle_model} · {e.vehicle_power_ps} PS
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
