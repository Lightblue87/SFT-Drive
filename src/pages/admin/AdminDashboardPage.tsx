import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import { formatDateRange } from '@/utils/date'
import type { Tour } from '@/types/tour'

interface TourSummary {
  tour: Tour
  confirmedVehicles: number
  pendingCount: number
  waitlistCount: number
  confirmedPersons: number
}

export function AdminDashboardPage() {
  const [summaries, setSummaries] = useState<TourSummary[]>([])
  const [draftCount, setDraftCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: tours } = await supabase
        .from('tours')
        .select('*')
        .in('status', ['published', 'registration_closed'])
        .order('start_date', { ascending: true })

      const { count: drafts } = await supabase
        .from('tours')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft')
      setDraftCount(drafts ?? 0)

      const results: TourSummary[] = await Promise.all(
        ((tours ?? []) as Tour[]).map(async (tour) => {
          const { data: regs } = await supabase
            .from('tour_registrations')
            .select('status, passenger_count')
            .eq('tour_id', tour.id)

          const confirmed = (regs ?? []).filter((r) => r.status === 'confirmed')
          return {
            tour,
            confirmedVehicles: confirmed.length,
            pendingCount: (regs ?? []).filter((r) => r.status === 'pending').length,
            waitlistCount: (regs ?? []).filter((r) => r.status === 'waitlisted').length,
            confirmedPersons: confirmed.reduce((sum, r) => sum + 1 + r.passenger_count, 0),
          }
        }),
      )

      setSummaries(results)
      setLoading(false)
    }

    load()
  }, [])

  if (loading) return <PageLoading />

  const totalPending = summaries.reduce((sum, s) => sum + s.pendingCount, 0)

  return (
    <div className="pt-3">
      <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#17171b] to-[#0f0f12]">
        <div className="border-r border-white/7 px-3.5 py-3">
          <div className="font-mono text-[9px] tracking-[0.2em] text-[#8a8a92]">TOUREN</div>
          <div className="mt-1.5 font-mono text-[21px] font-bold leading-none">{summaries.length}</div>
        </div>
        <div className="border-r border-white/7 px-3.5 py-3">
          <div className="font-mono text-[9px] tracking-[0.2em] text-[#8a8a92]">ENTWÜRFE</div>
          <div className="mt-1.5 font-mono text-[21px] font-bold leading-none">{draftCount}</div>
        </div>
        <div className="px-3.5 py-3">
          <div className="font-mono text-[9px] tracking-[0.2em] text-[#8a8a92]">OFFEN</div>
          <div className="mt-1.5 font-mono text-[21px] font-bold leading-none text-sft-amber">{totalPending}</div>
        </div>
      </div>

      <div className="mt-3.5 overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
        <div className="px-4 pb-2.5 pt-3.5 font-mono text-[9px] tracking-[0.2em] text-[#8a8a92]">
          VERÖFFENTLICHTE TOUREN
        </div>
        {summaries.map((s) => (
          <Link
            key={s.tour.id}
            to={`/admin/tours/${s.tour.id}/registrations`}
            className="tap-scale flex items-center gap-3 border-t border-white/6 px-4 py-3.5 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold leading-tight">{s.tour.title}</div>
              <div className="mt-1.5 font-mono text-[10px] leading-relaxed text-sft-gray">
                {formatDateRange(s.tour.start_date, s.tour.end_date).toUpperCase()} ·{' '}
                {s.confirmedVehicles} FZG · {s.confirmedPersons} PERSONEN
              </div>
              <div
                className={`mt-1 font-mono text-[10px] ${s.pendingCount === 0 ? 'text-[#8a8a92]' : 'text-sft-amber'}`}
              >
                OFFEN {s.pendingCount} · WARTELISTE {s.waitlistCount}
              </div>
            </div>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="flex-none">
              <path d="M1 1l6 6-6 6" stroke="#5e5e66" strokeWidth="1.8" />
            </svg>
          </Link>
        ))}
        {summaries.length === 0 && (
          <p className="px-4 pb-4 text-sm text-sft-gray">Noch keine veröffentlichten Touren.</p>
        )}
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <Link
          to="/admin/tours/new"
          className="tap-scale rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-3.5 text-center text-[15px] font-semibold text-white"
        >
          Neue Tour
        </Link>
        <Link
          to="/admin/notifications"
          className="tap-scale rounded-xl border border-white/13 bg-[#17171b] py-3.5 text-center text-[15px] font-medium"
        >
          Mitteilung senden
        </Link>
      </div>

      <Link to="/admin/tours" className="mt-3.5 block text-center text-sm underline">
        Zur Tourenverwaltung →
      </Link>
    </div>
  )
}
