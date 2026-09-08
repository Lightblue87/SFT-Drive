import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { formatDateRange, isMultiDayTour, tourDayCount } from '@/utils/date'
import type { RegistrationStatus } from '@/types/tour'

interface Row {
  id: string
  status: RegistrationStatus
  tour_id: string
  vehicle_manufacturer: string
  vehicle_model: string
  tours: { slug: string; title: string; start_date: string; end_date: string } | null
}

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  confirmed: 'DABEI',
  pending: 'OFFEN',
  waitlisted: 'WARTELISTE',
  rejected: 'ABGELEHNT',
  cancelled: 'STORNIERT',
}

const STATUS_STYLE: Record<RegistrationStatus, { bg: string; fg: string; tick: string }> = {
  confirmed: { bg: 'bg-sft-red/16', fg: 'text-[#ff6b63]', tick: 'bg-sft-red' },
  pending: { bg: 'bg-sft-amber/14', fg: 'text-sft-amber', tick: 'bg-sft-amber' },
  waitlisted: { bg: 'bg-sft-amber/14', fg: 'text-sft-amber', tick: 'bg-sft-amber' },
  rejected: { bg: 'bg-white/6', fg: 'text-sft-gray', tick: 'bg-white/12' },
  cancelled: { bg: 'bg-white/6', fg: 'text-sft-gray', tick: 'bg-white/12' },
}

const MONTH_ABBR = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ']

/**
 * Eigene aktuelle/zukünftige Touranmeldungen, chronologisch sortiert
 * (siehe CLAUDE.md §21.2).
 */
export function ProfileToursPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function load() {
      const { data: regs } = await supabase
        .from('tour_registrations')
        .select('id, status, tour_id, vehicle_manufacturer, vehicle_model')
        .eq('user_id', user!.id)

      const tourIds = [...new Set((regs ?? []).map((r) => r.tour_id))]
      const { data: tours } = tourIds.length
        ? await supabase.from('tours').select('id, slug, title, start_date, end_date').in('id', tourIds)
        : { data: [] }

      const tourById = new Map((tours ?? []).map((t) => [t.id, t]))

      setRows(
        (regs ?? [])
          .map((r) => ({ ...r, tours: tourById.get(r.tour_id) ?? null }))
          .filter((r) => r.tours && r.tours.end_date >= new Date().toISOString().slice(0, 10))
          .sort((a, b) => a.tours!.start_date.localeCompare(b.tours!.start_date)),
      )
      setLoading(false)
    }

    load()
  }, [user])

  if (loading) return null

  return (
    <div className="pb-[110px]">
      <div className="px-[18px] pb-4 pt-1.5 text-[26px] font-semibold leading-none">Meine Touren</div>

      {rows.length === 0 ? (
        <p className="px-[18px] text-sm text-sft-gray">Du bist aktuell zu keiner Tour angemeldet.</p>
      ) : (
        rows.map((r) => {
          const tour = r.tours!
          const style = STATUS_STYLE[r.status]
          const [, month, day] = tour.start_date.split('-').map(Number)
          const multiDay = isMultiDayTour(tour.start_date, tour.end_date)
          const label =
            r.status === 'waitlisted'
              ? 'WARTELISTE'
              : STATUS_LABEL[r.status]

          return (
            <Link
              key={r.id}
              to={`/tours/${tour.slug}`}
              className="tap-scale flex items-center gap-3.5 border-t border-white/7 px-[18px] py-3.5"
            >
              <div className="w-11 flex-none text-center">
                <div className="font-mono text-[19px] font-bold leading-none">{day}</div>
                <div className="mt-1 font-mono text-[9px] tracking-[0.12em] text-sft-gray-dim">
                  {MONTH_ABBR[month - 1]}
                </div>
              </div>
              <div className={`w-0.5 flex-none self-stretch rounded-sm ${style.tick}`} />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold leading-tight">{tour.title}</div>
                <div className="mt-1.5 font-mono text-[11px] text-sft-gray">
                  {formatDateRange(tour.start_date, tour.end_date)}
                  {multiDay && ` · ${tourDayCount(tour.start_date, tour.end_date)} TAGE`} ·{' '}
                  {r.vehicle_manufacturer} {r.vehicle_model}
                </div>
              </div>
              <span
                className={`flex-none rounded-md px-2 py-1 font-mono text-[9px] font-medium tracking-[0.1em] ${style.bg} ${style.fg}`}
              >
                {label}
              </span>
            </Link>
          )
        })
      )}
    </div>
  )
}
