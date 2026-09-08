import { useParams, Link } from 'react-router-dom'
import { useTourDetail } from '@/features/tours/useTourDetail'
import { RegistrationForm } from '@/features/tours/RegistrationForm'
import { PassengerCountForm } from '@/features/tours/PassengerCountForm'
import { PageLoading } from '@/components/PageLoading'
import { useAuth } from '@/features/auth/AuthProvider'
import { useIsAdmin } from '@/features/auth/useIsAdmin'
import { supabase } from '@/lib/supabase'
import { formatDateRange, isMultiDayTour, tourDayCount, currentTourDay } from '@/utils/date'
import { routeButtonLabel } from '@/utils/routeLink'
import { rpcErrorMessage } from '@/types/tour'
import type { RegistrationResult } from '@/types/tour'
import { TOUR_STOP_TYPE_LABELS } from '@/types/tourStop'
import { MealOrderForm } from '@/features/tours/MealOrderForm'
import { CheckInButton } from '@/features/tours/CheckInButton'
import { useEffect, useState } from 'react'

const STATUS_MESSAGE: Record<string, string> = {
  pending: 'Deine Anfrage wird geprüft.',
  rejected: 'Deine Anfrage wurde leider abgelehnt.',
}

/**
 * Öffentliche Tourdetailseite mit zustandsabhängiger Erweiterung
 * (Visitor / Member / Confirmed Participant / Admin, siehe CLAUDE.md §14).
 */
export function TourDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const { isAdmin } = useIsAdmin()
  const { data, loading, notFound, reload } = useTourDetail(slug)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null)

  useEffect(() => {
    if (data?.ownRegistration?.status !== 'waitlisted') {
      setWaitlistPosition(null)
      return
    }
    supabase
      .rpc('get_my_waitlist_position', { p_tour_id: data.tour.id })
      .then(({ data: position }) => setWaitlistPosition(position as number | null))
  }, [data?.ownRegistration?.status, data?.tour.id])

  if (loading) return <PageLoading />

  if (notFound || !data) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Diese Seite wurde nicht gefunden.</h1>
        <Link to="/tours" className="mt-6 inline-block text-sft-red underline">
          Zur Tourübersicht
        </Link>
      </div>
    )
  }

  const { tour, stats, memberDetails, participantDetails, confirmedVehicles, ownRegistration, stops, stages } =
    data
  // Cancelled/rejected sind keine aktiven Anmeldungen — die RPC erlaubt eine
  // Neuanmeldung in diesem Fall ausdrücklich (kontrollierte Reaktivierung,
  // siehe CLAUDE.md §8.7), das Formular muss dafür also wieder sichtbar sein.
  const activeRegistration =
    ownRegistration && ownRegistration.status !== 'cancelled' && ownRegistration.status !== 'rejected'
      ? ownRegistration
      : null
  const multiDay = isMultiDayTour(tour.start_date, tour.end_date)
  const dayInfo = multiDay ? currentTourDay(tour.start_date, tour.end_date) : null
  const returnTo = encodeURIComponent(`/tours/${tour.slug}`)

  async function handleCancel() {
    setCancelError(null)
    const { data: result, error } = await supabase.rpc('cancel_tour_registration', {
      p_tour_id: tour.id,
    })
    if (error) {
      setCancelError('Stornierung fehlgeschlagen.')
      return
    }
    const r = result as RegistrationResult
    if (r.code !== 'CANCELLED') {
      setCancelError(rpcErrorMessage(r.code))
      return
    }
    reload()
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold">{tour.title}</h1>

      <div className="mt-3 aspect-square w-full overflow-hidden rounded-lg bg-sft-surface">
        {tour.cover_image_url ? (
          <img src={tour.cover_image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sft-gray">SFT Drive</div>
        )}
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <div>
          {formatDateRange(tour.start_date, tour.end_date)}
          {multiDay && ` · ${tourDayCount(tour.start_date, tour.end_date)} Tage`}
        </div>
        {dayInfo && (
          <div className="text-sft-red">
            Läuft aktuell · Tag {dayInfo} von {tourDayCount(tour.start_date, tour.end_date)}
          </div>
        )}
        <div className="text-sft-gray">
          {tour.region}
          {tour.route_length_km != null && ` · ${tour.route_length_km} km`}
        </div>
        {stats && (
          <div className="text-sft-gray">
            {stats.is_full ? 'Ausgebucht' : `${stats.free_vehicle_slots} von ${stats.max_vehicles} Fahrzeugplätzen frei`}
          </div>
        )}
        <div className="text-sft-gray">
          {tour.min_power_ps != null && `Mindestleistung ${tour.min_power_ps} PS`}
          {tour.max_power_ps != null && ` · Maximal ${tour.max_power_ps} PS`}
          {tour.min_driver_age != null && ` · Mindestalter ${tour.min_driver_age}`}
        </div>
        {tour.license_plate_required && (
          <div className="text-sft-gray">Kennzeichen bei Anmeldung erforderlich</div>
        )}
      </div>

      {tour.public_description && (
        <p className="mt-4 text-sm text-sft-gray">{tour.public_description}</p>
      )}

      {isAdmin && (
        <Link
          to={`/admin/tours/${tour.id}/edit`}
          className="mt-4 inline-block rounded-md bg-sft-surface px-3 py-1.5 text-sm"
        >
          Tour bearbeiten
        </Link>
      )}

      <div className="mt-6 border-t border-sft-surface2 pt-6">
        {!user && (
          <Link
            to={`/login?returnTo=${returnTo}`}
            className="block rounded-md bg-sft-red px-4 py-2.5 text-center font-medium"
          >
            Für diese Tour anmelden
          </Link>
        )}

        {user && memberDetails && !activeRegistration && (
          <RegistrationForm
            tour={tour}
            onRegistered={reload}
            wasRejected={ownRegistration?.status === 'rejected'}
          />
        )}

        {user && activeRegistration && (
          <div className="flex flex-col gap-4">
            {STATUS_MESSAGE[activeRegistration.status] && (
              <p className="text-sm">{STATUS_MESSAGE[activeRegistration.status]}</p>
            )}
            {activeRegistration.status === 'waitlisted' && (
              <p className="text-sm">
                {waitlistPosition != null ? `Warteliste · Position ${waitlistPosition}` : 'Warteliste'}
              </p>
            )}
            {activeRegistration.status === 'confirmed' && (
              <p className="text-sm text-sft-red">Du bist dabei</p>
            )}

            {activeRegistration.status === 'confirmed' && (
              <CheckInButton
                tour={tour}
                checkedInAt={activeRegistration.checked_in_at}
                onCheckedIn={reload}
              />
            )}

            <div className="rounded-md bg-sft-surface p-4 text-sm">
              <div>
                {activeRegistration.vehicle_manufacturer} {activeRegistration.vehicle_model} ·{' '}
                {activeRegistration.vehicle_power_ps} PS
              </div>
            </div>

            {['pending', 'confirmed', 'waitlisted'].includes(activeRegistration.status) &&
              tour.passenger_edit_deadline_at &&
              new Date(tour.passenger_edit_deadline_at) > new Date() && (
                <PassengerCountForm
                  tourId={tour.id}
                  initialCount={activeRegistration.passenger_count}
                  onUpdated={reload}
                />
              )}

            {participantDetails && (
              <div className="flex flex-col gap-3 rounded-md bg-sft-surface p-4 text-sm">
                {participantDetails.meeting_point_private && (
                  <div>Treffpunkt: {participantDetails.meeting_point_private}</div>
                )}
                {participantDetails.kurviger_url && (
                  <a
                    href={participantDetails.kurviger_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-sft-red px-4 py-2.5 text-center font-medium"
                  >
                    Route in Kurviger öffnen
                  </a>
                )}
                {participantDetails.zello_url ? (
                  <a
                    href={participantDetails.zello_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-sft-surface2 px-4 py-2.5 text-center"
                  >
                    Zello-Kanal öffnen
                  </a>
                ) : (
                  <div className="text-sft-gray">
                    Zello-Zugang: Der QR-Code für den Tourkanal wird am Treffpunkt bereitgestellt.
                  </div>
                )}
              </div>
            )}

            {multiDay && stages.some((s) => s.route_url || s.kurviger_url) && (
              <div className="rounded-md bg-sft-surface p-4 text-sm">
                <h2 className="mb-2 font-medium">Tagesrouten</h2>
                <ul className="flex flex-col gap-2">
                  {stages.map((stage) => {
                    const url = stage.route_url ?? stage.kurviger_url
                    if (!url) return null
                    return (
                      <li key={stage.id} className="flex flex-col gap-1">
                        <div className="text-sft-gray">
                          Tag {stage.stage_number} ·{' '}
                          {new Date(stage.stage_date).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md bg-sft-surface2 px-4 py-2 text-center"
                        >
                          {routeButtonLabel(url)}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {stops.length > 0 && (
              <div className="rounded-md bg-sft-surface p-4 text-sm">
                <h2 className="mb-2 font-medium">Stopps</h2>
                <ul className="flex flex-col gap-3">
                  {stops.map((stop) => (
                    <li key={stop.id}>
                      <div className="font-medium">
                        {TOUR_STOP_TYPE_LABELS[stop.type]} · {stop.title}
                      </div>
                      {stop.starts_at && (
                        <div className="text-sft-gray">
                          {new Date(stop.starts_at).toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                      {stop.location_name && <div className="text-sft-gray">{stop.location_name}</div>}
                      {stop.address && <div className="text-sft-gray">{stop.address}</div>}
                      {stop.description && <div className="text-sft-gray">{stop.description}</div>}
                      {stop.type === 'restaurant' && (
                        <MealOrderForm
                          restaurantStopId={stop.id}
                          personCount={1 + activeRegistration.passenger_count}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {confirmedVehicles.length > 0 && (
              <div className="rounded-md bg-sft-surface p-4 text-sm">
                <h2 className="mb-2 font-medium">Bestätigte Fahrzeuge</h2>
                <ul className="flex flex-col gap-1">
                  {confirmedVehicles.map((v) => (
                    <li
                      key={v.registration_id}
                      className={v.is_self ? 'font-medium text-sft-red' : ''}
                    >
                      {v.first_name && v.last_name ? `${v.first_name} · ${v.username}` : v.username} ·{' '}
                      {v.vehicle_manufacturer} {v.vehicle_model} · {v.vehicle_power_ps} PS
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {['pending', 'confirmed', 'waitlisted'].includes(activeRegistration.status) && (
              <button
                onClick={handleCancel}
                className="rounded-md border border-sft-surface2 px-4 py-2.5 text-sm text-sft-gray"
              >
                Teilnahme stornieren
              </button>
            )}
            {cancelError && <p className="text-sm text-sft-red">{cancelError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
