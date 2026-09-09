import { Link } from 'react-router-dom'
import type { TourWithStats } from '@/features/tours/useTours'
import { formatDateRange, isMultiDayTour, tourDayCount, currentTourDay } from '@/utils/date'
import { freeSlotsLabel } from '@/utils/capacity'
import { registrationPhase, tourPhaseBadge } from '@/utils/tourStatus'

const OWN_STATUS_LABEL: Record<string, string> = {
  confirmed: 'DU BIST DABEI',
  pending: 'FREIGABE OFFEN',
  waitlisted: 'WARTELISTE',
  rejected: 'ABGELEHNT',
}

const OWN_STATUS_CLASS: Record<string, string> = {
  confirmed: 'bg-sft-red/16 text-[#ff6b63]',
  pending: 'bg-sft-amber/14 text-sft-amber',
  waitlisted: 'bg-sft-amber/14 text-sft-amber',
  rejected: 'bg-white/6 text-sft-gray',
}

/**
 * Tourzeile (siehe CLAUDE.md §13.10–§13.14) — die gesamte Zeile ist ein
 * Touch-Ziel, kein separater "Mehr erfahren"-Button.
 */
export function TourTile({ tour, stats, ownStatus }: TourWithStats) {
  const multiDay = isMultiDayTour(tour.start_date, tour.end_date)
  const dayInfo = multiDay ? currentTourDay(tour.start_date, tour.end_date) : null

  // Eigener Anmeldestatus ergänzt die Kapazitätsangabe, ersetzt sie nicht —
  // der allgemeine Kapazitätsstatus bleibt sichtbar (siehe CLAUDE.md §13.14).
  const ownLabel = ownStatus ? OWN_STATUS_LABEL[ownStatus] : null
  const ownClass = (ownStatus && OWN_STATUS_CLASS[ownStatus]) || 'bg-white/6 text-sft-gray'

  // Ist die Tour nicht mehr buchbar (Anmeldeschluss, abgesagt, beendet), tritt
  // das an die Stelle der freien Plätze — die Zahl wäre dort irreführend.
  const phase = registrationPhase(tour)
  const phaseLabel = tourPhaseBadge(phase)
  const slotsLabel = phaseLabel ?? (stats ? freeSlotsLabel(stats.free_vehicle_slots, stats.is_full) : null)
  const slotsClass =
    phase === 'cancelled'
      ? 'bg-sft-red/16 text-[#ff6b63]'
      : phaseLabel || stats?.is_full
        ? 'bg-white/6 text-sft-gray'
        : 'bg-white/6 text-[#c9c9ce]'

  return (
    <Link
      to={`/tours/${tour.slug}`}
      className="tap-scale flex items-center gap-3.5 rounded-2xl border border-white/9 bg-gradient-to-b from-[#141417] to-[#0f0f12] p-2.5 text-left"
    >
      <div className="flex h-[74px] w-[74px] flex-none items-center justify-center overflow-hidden rounded-xl border border-white/6 bg-[repeating-linear-gradient(135deg,#1b1b1f_0_6px,#141418_6px_12px)]">
        {tour.cover_image_url ? (
          <img src={tour.cover_image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-center font-mono text-[8px] leading-tight text-sft-gray-dim">
            TOUR
            <br />
            FOTO
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div className="truncate text-[15px] font-semibold leading-tight">{tour.title}</div>
        <div className="font-mono text-xs text-sft-gray">
          {formatDateRange(tour.start_date, tour.end_date)}
          {multiDay && ` · ${tourDayCount(tour.start_date, tour.end_date)} Tage`}
          {dayInfo && ` · Läuft aktuell · Tag ${dayInfo} von ${tourDayCount(tour.start_date, tour.end_date)}`}
        </div>
        <div className="truncate font-mono text-[11px] text-sft-gray-dim">
          {tour.region}
          {tour.route_length_km != null && ` · ${tour.route_length_km} km`}
          {stats && ` · ${stats.confirmed_vehicles}/${stats.max_vehicles} Fahrzeuge`}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {slotsLabel && (
            <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium ${slotsClass}`}>
              {slotsLabel}
            </span>
          )}
          {ownLabel && (
            <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium ${ownClass}`}>
              {ownLabel}
            </span>
          )}
        </div>
      </div>

      <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="flex-none">
        <path d="M1 1l6 6-6 6" stroke="#5e5e66" strokeWidth="1.8" />
      </svg>
    </Link>
  )
}
