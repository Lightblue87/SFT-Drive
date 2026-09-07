import { Link } from 'react-router-dom'
import type { TourWithStats } from '@/features/tours/useTours'
import { formatDateRange, isMultiDayTour, tourDayCount, currentTourDay } from '@/utils/date'

const OWN_STATUS_LABEL: Record<string, string> = {
  confirmed: 'Du bist dabei',
  pending: 'Freigabe ausstehend',
  waitlisted: 'Warteliste',
  rejected: 'Anfrage abgelehnt',
}

/**
 * Quadratische 1:1-Tourkachel (siehe CLAUDE.md §13.10–§13.14). Die gesamte
 * Kachel ist ein Touch-Ziel, kein separater "Mehr erfahren"-Button.
 */
export function TourTile({ tour, stats, ownStatus }: TourWithStats) {
  const multiDay = isMultiDayTour(tour.start_date, tour.end_date)
  const dayInfo = multiDay ? currentTourDay(tour.start_date, tour.end_date) : null

  return (
    <Link to={`/tours/${tour.slug}`} className="block">
      <h3 className="mb-2 text-base font-semibold">{tour.title}</h3>

      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-sft-surface">
        {tour.cover_image_url ? (
          <img
            src={tour.cover_image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sft-gray">
            SFT Drive
          </div>
        )}

        {stats && (
          <span className="absolute left-2 top-2 rounded-full bg-sft-black/80 px-2.5 py-1 text-xs font-medium">
            {stats.is_full
              ? 'Ausgebucht'
              : stats.free_vehicle_slots === 1
                ? '1 Platz frei'
                : `${stats.free_vehicle_slots} Plätze frei`}
          </span>
        )}

        {ownStatus && OWN_STATUS_LABEL[ownStatus] && (
          <span className="absolute right-2 top-2 rounded-full bg-sft-red px-2.5 py-1 text-xs font-medium">
            {OWN_STATUS_LABEL[ownStatus]}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sft-black/90 to-transparent p-3 text-xs text-sft-white">
          <div>
            {formatDateRange(tour.start_date, tour.end_date)}
            {multiDay && ` · ${tourDayCount(tour.start_date, tour.end_date)} Tage`}
            {dayInfo && ` · Läuft aktuell · Tag ${dayInfo} von ${tourDayCount(tour.start_date, tour.end_date)}`}
          </div>
          <div className="text-sft-gray">
            {tour.region}
            {tour.route_length_km != null && ` · ${tour.route_length_km} km`}
          </div>
          {stats && (
            <div className="text-sft-gray">
              {stats.confirmed_vehicles} / {stats.max_vehicles} Fahrzeuge
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
