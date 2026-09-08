import { Link } from 'react-router-dom'
import type { TourWithStats } from '@/features/tours/useTours'
import { formatDateRange, formatTime, isMultiDayTour, tourDayCount } from '@/utils/date'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'DU BIST DABEI',
  pending: 'FREIGABE OFFEN',
  waitlisted: 'WARTELISTE',
}

/** Hero-Kachel der nächsten laufenden/anstehenden Ausfahrt auf der Tourübersicht. */
export function NextTourHero({ tour, stats, ownStatus }: TourWithStats) {
  const multiDay = isMultiDayTour(tour.start_date, tour.end_date)
  const statusLabel =
    (ownStatus && STATUS_LABEL[ownStatus]) ??
    (stats ? (stats.is_full ? 'AUSGEBUCHT' : `${stats.free_vehicle_slots} PLÄTZE FREI`) : null)
  const statusActive = ownStatus === 'confirmed'

  return (
    <div className="mx-3.5 mt-1 overflow-hidden rounded-3xl border border-white/11 bg-gradient-to-b from-[#191a1e] via-[#111114] to-[#0e0e11] shadow-[0_20px_40px_-20px_#000] ring-1 ring-inset ring-white/7">
      <div className="flex items-center justify-between px-4 pt-3.5">
        <div className="font-mono text-[10px] font-medium tracking-[0.22em] text-sft-gray">
          NÄCHSTE AUSFAHRT
        </div>
        {statusLabel && (
          <div
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.12em] ${
              statusActive ? 'bg-sft-red text-white' : 'bg-white/12 text-sft-white'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-sm ${statusActive ? 'bg-white' : 'bg-sft-white'}`} />
            {statusLabel}
          </div>
        )}
      </div>

      <div className="px-4 pt-2.5">
        <div className="text-balance text-[28px] font-semibold leading-[1.08] tracking-tight">
          {tour.title}
        </div>
        <div className="mt-1.5 text-[13px] text-sft-gray">
          {tour.region} · {formatDateRange(tour.start_date, tour.end_date)}
          {multiDay && ` · ${tourDayCount(tour.start_date, tour.end_date)} Tage`}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 border-t border-white/9">
        <div className="border-r border-white/7 p-3.5">
          <div className="font-mono text-[9px] tracking-[0.18em] text-sft-gray-dim">STRECKE</div>
          <div className="mt-1.5 font-mono text-[22px] font-bold leading-none">
            {tour.route_length_km ?? '—'}
            <span className="text-[11px] text-sft-gray"> km</span>
          </div>
        </div>
        <div className="border-r border-white/7 p-3.5">
          <div className="font-mono text-[9px] tracking-[0.18em] text-sft-gray-dim">FAHRZEUGE</div>
          <div className="mt-1.5 font-mono text-[22px] font-bold leading-none">
            {stats?.confirmed_vehicles ?? '—'}
            <span className="text-[11px] text-sft-gray">/{stats?.max_vehicles ?? '—'}</span>
          </div>
        </div>
        <div className="p-3.5">
          <div className="font-mono text-[9px] tracking-[0.18em] text-sft-gray-dim">TREFFEN</div>
          <div className="mt-1.5 font-mono text-[22px] font-bold leading-none">
            {tour.meeting_at ? formatTime(tour.meeting_at) : '—'}
          </div>
        </div>
      </div>

      <div className="border-t border-white/9 bg-white/[0.02] p-3">
        <Link
          to={`/tours/${tour.slug}`}
          className="tap-scale block w-full rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-3.5 text-center text-[15px] font-semibold text-white shadow-[0_8px_20px_-10px_#e10600]"
        >
          Tour öffnen
        </Link>
      </div>
    </div>
  )
}
