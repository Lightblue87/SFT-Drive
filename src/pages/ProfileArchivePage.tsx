import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatDateRange } from '@/utils/date'
import type { ArchiveEntry } from '@/types/tour'
import { PageLoading } from '@/components/PageLoading'

/**
 * Persönliches Tourenarchiv (siehe CLAUDE.md §8.8, §21.2), geladen über die
 * sichere RPC `get_my_tour_archive()` (verwendet ausschließlich auth.uid()).
 */
export function ProfileArchivePage() {
  const navigate = useNavigate()
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
    <div className="pb-[110px]">
      <div className="flex items-center gap-3 px-4 pb-4 pt-1.5">
        <button
          onClick={() => navigate('/profile')}
          className="tap-scale flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] border border-white/10 bg-[#131316]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M15 4 7 12l8 8" stroke="#f5f5f5" strokeWidth="2" />
          </svg>
        </button>
        <div className="text-[22px] font-semibold leading-none">Tourenarchiv</div>
      </div>

      {entries.length === 0 ? (
        <p className="px-[18px] text-sm text-sft-gray">Hier erscheinen deine vergangenen, bestätigten Teilnahmen.</p>
      ) : (
        entries.map((e) => (
          <Link
            key={e.tour_id}
            to={`/tours/${e.tour_slug}`}
            className="tap-scale flex items-center gap-3.5 border-t border-white/7 px-[18px] py-3.5"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold leading-tight">{e.tour_title}</div>
              <div className="mt-1.5 font-mono text-[11px] text-sft-gray">
                {formatDateRange(e.start_date, e.end_date)} · {e.region.toUpperCase()}
                {e.route_length_km != null && ` · ${e.route_length_km} KM`}
              </div>
              <div className="mt-1 font-mono text-[11px] text-sft-gray-dim">
                {e.vehicle_manufacturer} {e.vehicle_model} · {e.vehicle_power_ps} PS
              </div>
            </div>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="flex-none">
              <path d="M1 1l6 6-6 6" stroke="#5e5e66" strokeWidth="1.8" />
            </svg>
          </Link>
        ))
      )}
    </div>
  )
}
