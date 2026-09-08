import { useParams, Link } from 'react-router-dom'
import { useTourDetail } from '@/features/tours/useTourDetail'
import { RegistrationForm } from '@/features/tours/RegistrationForm'
import { PassengerCountForm } from '@/features/tours/PassengerCountForm'
import { PageLoading } from '@/components/PageLoading'
import { BottomSheet } from '@/components/BottomSheet'
import { useAuth } from '@/features/auth/AuthProvider'
import { useIsAdmin } from '@/features/auth/useIsAdmin'
import { supabase } from '@/lib/supabase'
import { formatDate, formatDateRange, isMultiDayTour, tourDayCount, currentTourDay } from '@/utils/date'
import { freeSlotsLabel } from '@/utils/capacity'
import { routeButtonLabel } from '@/utils/routeLink'
import { rpcErrorMessage } from '@/types/tour'
import type { RegistrationResult } from '@/types/tour'
import { TOUR_STOP_TYPE_LABELS } from '@/types/tourStop'
import { MealOrderForm } from '@/features/tours/MealOrderForm'
import { CheckInButton } from '@/features/tours/CheckInButton'
import { TourInterestButton } from '@/features/tours/TourInterestButton'
import { AccommodationSection } from '@/features/tours/AccommodationSection'
import { useEffect, useState } from 'react'

const STATUS_MESSAGE: Record<string, string> = {
  pending: 'Deine Anfrage wird geprüft.',
  rejected: 'Deine Anfrage wurde leider abgelehnt.',
}

const factLabel = 'font-mono text-[9px] tracking-[0.16em] text-sft-gray-dim'
const factValue = 'mt-1.5 font-mono text-[15px] font-semibold leading-tight text-sft-white'
const sectionLabel = 'px-4 pt-3.5 pb-2.5 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim'
const card = 'mt-3.5 rounded-2xl border border-white/9 bg-sft-card overflow-hidden'
const linkButton =
  'tap-scale rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-3 text-center text-[13px] font-semibold text-white'
const linkButtonGhost =
  'tap-scale rounded-xl border border-white/12 bg-[#17171b] py-3 text-center text-[13px] font-medium text-sft-white'

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
  const [regSheetOpen, setRegSheetOpen] = useState(false)

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
        <h1 className="text-2xl font-semibold">Diese Seite wurde nicht gefunden.</h1>
        <Link
          to="/tours"
          className="tap-scale mt-6 inline-block rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] px-5 py-3 text-[15px] font-semibold text-white"
        >
          Zur Tourübersicht
        </Link>
      </div>
    )
  }

  const {
    tour,
    stats,
    memberDetails,
    participantDetails,
    confirmedVehicles,
    ownRegistration,
    stops,
    stages,
    hotelSuggestions,
    ownAccommodationConfirmations,
  } = data
  // Cancelled/rejected sind keine aktiven Anmeldungen — die RPC erlaubt eine
  // Neuanmeldung in diesem Fall ausdrücklich (kontrollierte Reaktivierung,
  // siehe CLAUDE.md §8.7), das Formular muss dafür also wieder sichtbar sein.
  const activeRegistration =
    ownRegistration && ownRegistration.status !== 'cancelled' && ownRegistration.status !== 'rejected'
      ? ownRegistration
      : null
  const confirmed = activeRegistration?.status === 'confirmed'
  const multiDay = isMultiDayTour(tour.start_date, tour.end_date)
  const dayInfo = multiDay ? currentTourDay(tour.start_date, tour.end_date) : null
  const returnTo = encodeURIComponent(`/tours/${tour.slug}`)
  const registrationNotYetOpen = Boolean(
    tour.registration_open_at && new Date(tour.registration_open_at) > new Date(),
  )
  const canRegister = Boolean(user && memberDetails && !activeRegistration && !registrationNotYetOpen)

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
    <div className="pb-8">
      <div className="relative h-[220px] bg-[repeating-linear-gradient(115deg,#1e1e23_0_10px,#15151a_10px_20px)]">
        {tour.cover_image_url && (
          <img src={tour.cover_image_url} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-sft-black" />
        <div className="absolute inset-x-0 bottom-0 px-[18px] pb-3.5">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            <span
              className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] ${
                confirmed ? 'bg-sft-red text-white' : 'bg-white/12 text-sft-white'
              }`}
            >
              {confirmed
                ? 'DU BIST DABEI'
                : stats
                  ? freeSlotsLabel(stats.free_vehicle_slots, stats.is_full)
                  : ''}
            </span>
            {multiDay && (
              <span className="rounded-md bg-white/12 px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.1em] text-sft-white backdrop-blur">
                {tourDayCount(tour.start_date, tour.end_date)} TAGE
              </span>
            )}
            {dayInfo && (
              <span className="rounded-md bg-sft-red/90 px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.1em] text-white">
                LÄUFT · TAG {dayInfo}
              </span>
            )}
          </div>
          <h1 className="text-balance text-[27px] font-semibold leading-[1.06] tracking-tight">
            {tour.title}
          </h1>
        </div>
      </div>

      <div className="mx-3.5">
        <div className="mt-3.5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/9 bg-white/6">
          <div className="bg-sft-card px-3.5 py-3">
            <div className={factLabel}>DATUM</div>
            <div className={factValue}>{formatDateRange(tour.start_date, tour.end_date)}</div>
          </div>
          <div className="bg-sft-card px-3.5 py-3">
            <div className={factLabel}>REGION</div>
            <div className={factValue}>{tour.region}</div>
          </div>
          <div className="bg-sft-card px-3.5 py-3">
            <div className={factLabel}>STRECKE</div>
            <div className={factValue}>{tour.route_length_km != null ? `${tour.route_length_km} km` : '—'}</div>
          </div>
          <div className="bg-sft-card px-3.5 py-3">
            <div className={factLabel}>FAHRZEUGE</div>
            <div className={factValue}>
              {stats ? `${stats.confirmed_vehicles}/${stats.max_vehicles}` : '—'}
            </div>
          </div>
          {(tour.min_power_ps != null || tour.max_power_ps != null) && (
            <div className="bg-sft-card px-3.5 py-3">
              <div className={factLabel}>LEISTUNG</div>
              <div className={factValue}>
                {[
                  tour.min_power_ps != null ? `ab ${tour.min_power_ps} PS` : null,
                  tour.max_power_ps != null ? `max ${tour.max_power_ps} PS` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          )}
          {tour.min_driver_age != null && (
            <div className="bg-sft-card px-3.5 py-3">
              <div className={factLabel}>MINDESTALTER</div>
              <div className={factValue}>{tour.min_driver_age} Jahre</div>
            </div>
          )}
          {tour.license_plate_required && (
            <div className="bg-sft-card px-3.5 py-3">
              <div className={factLabel}>KENNZEICHEN</div>
              <div className={factValue}>Pflicht</div>
            </div>
          )}
        </div>

        {tour.public_description && (
          <p className="mt-4 px-1 text-[14px] leading-relaxed text-[#b9b9c0]">{tour.public_description}</p>
        )}

        {/* Mitgliederinhalt (§10 MEMBER): nur für eingeloggte User. */}
        {memberDetails?.member_description && (
          <div className={card}>
            <div className={sectionLabel}>FÜR MITGLIEDER</div>
            <p className="whitespace-pre-line px-4 pb-4 text-[14px] leading-relaxed text-[#b9b9c0]">
              {memberDetails.member_description}
            </p>
          </div>
        )}

        {isAdmin && (
          <Link
            to={`/admin/tours/${tour.id}/edit`}
            className="tap-scale mt-3.5 inline-block rounded-lg border border-white/12 bg-sft-surface2 px-3.5 py-2 text-sm"
          >
            Tour bearbeiten
          </Link>
        )}

        {!user && (
          <div className="mt-3.5 rounded-2xl border border-dashed border-white/14 px-4 py-3.5 text-xs leading-relaxed text-[#8e8e96]">
            Treffpunkt-Adresse, Route und Teilnehmerliste werden nach bestätigter Anmeldung sichtbar.
          </div>
        )}

        {user && memberDetails && !activeRegistration && registrationNotYetOpen && (
          <div className="mt-3.5">
            <TourInterestButton tourId={tour.id} registrationOpenAt={tour.registration_open_at!} />
          </div>
        )}

        {activeRegistration && (
          <>
            {STATUS_MESSAGE[activeRegistration.status] && (
              <div className={card}>
                <div className="px-4 py-3.5 text-[14px] font-medium">
                  {STATUS_MESSAGE[activeRegistration.status]}
                </div>
              </div>
            )}
            {activeRegistration.status === 'waitlisted' && (
              <div className="mt-3.5 rounded-2xl border border-sft-amber/30 bg-sft-amber/[0.07] px-4 py-3.5 text-[14px] font-medium text-sft-amber">
                {waitlistPosition != null ? `Warteliste · Position ${waitlistPosition}` : 'Warteliste'}
              </div>
            )}

            {confirmed && (
              <CheckInButton
                tour={tour}
                checkedInAt={activeRegistration.checked_in_at}
                onCheckedIn={reload}
              />
            )}

            {/* Teilnehmerinhalt (§10 CONFIRMED_PARTICIPANT): interne Ablaufdetails. */}
            {participantDetails?.participant_description && (
              <div className={card}>
                <div className={sectionLabel}>INTERNE HINWEISE</div>
                <p className="whitespace-pre-line px-4 pb-4 text-[14px] leading-relaxed text-[#b9b9c0]">
                  {participantDetails.participant_description}
                </p>
              </div>
            )}

            {participantDetails && (
              <div className={card}>
                <div className={sectionLabel}>TREFFPUNKT (INTERN)</div>
                <div className="px-4 pb-3.5 text-[14px] font-medium leading-relaxed">
                  {participantDetails.meeting_point_private ?? '—'}
                </div>
                <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                  {participantDetails.kurviger_url && (
                    <a href={participantDetails.kurviger_url} target="_blank" rel="noopener noreferrer" className={linkButton}>
                      {routeButtonLabel(participantDetails.kurviger_url)}
                    </a>
                  )}
                  {participantDetails.whatsapp_group_url && (
                    <a href={participantDetails.whatsapp_group_url} target="_blank" rel="noopener noreferrer" className={linkButtonGhost}>
                      WhatsApp-Gruppe
                    </a>
                  )}
                  {participantDetails.zello_url ? (
                    <a href={participantDetails.zello_url} target="_blank" rel="noopener noreferrer" className={linkButtonGhost}>
                      Zello-Kanal
                    </a>
                  ) : (
                    <div className="col-span-2 text-xs leading-relaxed text-sft-gray">
                      Zello-Zugang: Der QR-Code für den Tourkanal wird am Treffpunkt bereitgestellt.
                    </div>
                  )}
                </div>
              </div>
            )}

            {multiDay && stages.some((s) => s.route_url || s.kurviger_url) && (
              <div className={card}>
                <div className={sectionLabel}>TAGESROUTEN</div>
                <div className="flex flex-col">
                  {stages.map((stage) => {
                    const url = stage.route_url ?? stage.kurviger_url
                    if (!url) return null
                    return (
                      <div key={stage.id} className="border-t border-white/6 px-4 py-3.5">
                        <div className="font-mono text-[11px] text-sft-gray">
                          TAG {stage.stage_number} · {formatDate(stage.stage_date)}
                        </div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tap-scale mt-2 block rounded-xl border border-white/12 bg-[#17171b] py-2.5 text-center text-[13px] font-medium"
                        >
                          {routeButtonLabel(url)}
                        </a>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {multiDay && (
              <AccommodationSection
                tourId={tour.id}
                startDate={tour.start_date}
                endDate={tour.end_date}
                hotelSuggestions={hotelSuggestions}
                ownConfirmations={ownAccommodationConfirmations}
                onChanged={reload}
              />
            )}

            {stops.length > 0 && (
              <div className={card}>
                <div className={sectionLabel}>STOPPS</div>
                <div className="flex flex-col">
                  {stops.map((stop) => (
                    <div key={stop.id} className="border-t border-white/6 px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        {stop.starts_at && (
                          <div className="w-11 flex-none font-mono text-[13px] font-bold text-[#c9c9ce]">
                            {new Date(stop.starts_at).toLocaleTimeString('de-DE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-semibold">
                            {TOUR_STOP_TYPE_LABELS[stop.type]} · {stop.title}
                          </div>
                          {stop.location_name && (
                            <div className="mt-1 text-[12px] text-sft-gray">{stop.location_name}</div>
                          )}
                          {stop.address && <div className="mt-0.5 text-[12px] text-sft-gray">{stop.address}</div>}
                          {stop.description && (
                            <div className="mt-1 text-[12px] leading-relaxed text-sft-gray">{stop.description}</div>
                          )}
                        </div>
                      </div>
                      {stop.type === 'restaurant' && (
                        <MealOrderForm
                          restaurantStopId={stop.id}
                          personCount={1 + activeRegistration.passenger_count}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {confirmedVehicles.length > 0 && (
              <div className={card}>
                <div className="flex items-baseline justify-between px-4 pb-2.5 pt-3.5">
                  <div className="font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
                    BESTÄTIGTE FAHRZEUGE
                  </div>
                  <div className="font-mono text-[11px] text-sft-gray">
                    {stats ? `${stats.confirmed_vehicles}/${stats.max_vehicles}` : confirmedVehicles.length}
                  </div>
                </div>
                {confirmedVehicles.map((v) => (
                  <div
                    key={v.registration_id}
                    className={`flex items-center gap-2.5 border-t border-white/6 px-4 py-2.5 ${
                      v.is_self ? 'bg-sft-red/7' : ''
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg font-mono text-[11px] font-bold ${
                        v.is_self ? 'bg-sft-red text-white' : 'bg-white/6 text-[#c9c9ce]'
                      }`}
                    >
                      {initials(v.first_name ?? v.username)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[13px] font-semibold ${v.is_self ? 'text-white' : 'text-sft-white'}`}>
                        {v.first_name && v.last_name ? `${v.first_name} · ${v.username}` : v.username}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-sft-gray">
                        {v.vehicle_manufacturer} {v.vehicle_model} · {v.vehicle_power_ps} PS
                      </div>
                    </div>
                    {v.is_self && <span className="font-mono text-[9px] tracking-[0.12em] text-sft-red">DU</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3.5 rounded-2xl border border-white/9 bg-sft-card px-4 py-3.5">
              <div className="font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">DEINE ANMELDUNG</div>
              <div className="mt-2.5 text-[14px] font-medium">
                {activeRegistration.vehicle_manufacturer} {activeRegistration.vehicle_model} ·{' '}
                {activeRegistration.vehicle_power_ps} PS
              </div>
              <div className="mt-1 font-mono text-[12px] text-sft-gray">
                {activeRegistration.license_plate ?? '—'} · {1 + activeRegistration.passenger_count}{' '}
                {1 + activeRegistration.passenger_count === 1 ? 'PERSON' : 'PERSONEN'}
              </div>

              {['pending', 'confirmed', 'waitlisted'].includes(activeRegistration.status) &&
                tour.passenger_edit_deadline_at &&
                new Date(tour.passenger_edit_deadline_at) > new Date() && (
                  <div className="mt-3">
                    <PassengerCountForm
                      tourId={tour.id}
                      initialCount={activeRegistration.passenger_count}
                      onUpdated={reload}
                    />
                  </div>
                )}

              {['pending', 'confirmed', 'waitlisted'].includes(activeRegistration.status) && (
                <button
                  onClick={handleCancel}
                  className="tap-scale mt-3.5 w-full rounded-xl border border-white/12 py-2.5 text-[13px] font-medium text-sft-gray"
                >
                  Teilnahme stornieren
                </button>
              )}
              {cancelError && <p className="mt-2 text-sm text-sft-red">{cancelError}</p>}
            </div>
          </>
        )}

        {!activeRegistration && !registrationNotYetOpen && user && memberDetails && (
          <div className={card}>
            <div className={sectionLabel}>VORAUSSETZUNGEN</div>
            <div className="flex flex-col gap-2.5 px-4 pb-4">
              {requirements(tour).map((r) => (
                <div key={r} className="flex items-center gap-2.5 text-[13px] text-[#d3d3d9]">
                  <span className="h-1.5 w-1.5 flex-none rounded-sm bg-sft-red" />
                  {r}
                </div>
              ))}
              {requirements(tour).length === 0 && (
                <div className="text-[13px] text-sft-gray">Keine besonderen Voraussetzungen.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {!user && (
        <div className="fixed inset-x-0 bottom-[92px] z-10 bg-gradient-to-t from-sft-black via-sft-black/90 to-transparent px-3.5 pb-2.5 pt-6">
          <Link
            to={`/login?returnTo=${returnTo}`}
            className="tap-scale block w-full rounded-2xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-4 text-center text-[16px] font-semibold text-white shadow-[0_12px_26px_-12px_#e10600]"
          >
            Für diese Tour anmelden
          </Link>
        </div>
      )}

      {canRegister && (
        <div className="fixed inset-x-0 bottom-[92px] z-10 bg-gradient-to-t from-sft-black via-sft-black/90 to-transparent px-3.5 pb-2.5 pt-6">
          <button
            onClick={() => setRegSheetOpen(true)}
            className="tap-scale block w-full rounded-2xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-4 text-center text-[16px] font-semibold text-white shadow-[0_12px_26px_-12px_#e10600]"
          >
            {ownRegistration?.status === 'rejected' ? 'Erneut anfragen' : 'Für diese Tour anmelden'}
          </button>
          {stats && (
            <div className="mt-1.5 text-center font-mono text-[10px] tracking-[0.1em] text-sft-gray-dim">
              {stats.free_vehicle_slots} VON {stats.max_vehicles} PLÄTZEN FREI
            </div>
          )}
        </div>
      )}

      {regSheetOpen && (
        <BottomSheet
          title="Anmeldung"
          subtitle={`${tour.title.toUpperCase()} · ${formatDateRange(tour.start_date, tour.end_date)}`}
          onClose={() => setRegSheetOpen(false)}
        >
          <RegistrationForm
            tour={tour}
            wasRejected={ownRegistration?.status === 'rejected'}
            onRegistered={() => {
              setRegSheetOpen(false)
              reload()
            }}
          />
        </BottomSheet>
      )}
    </div>
  )
}

function requirements(tour: {
  min_power_ps: number | null
  max_power_ps: number | null
  min_driver_age: number | null
  license_plate_required: boolean
}): string[] {
  const list: string[] = []
  if (tour.min_power_ps != null) list.push(`Mindestleistung ${tour.min_power_ps} PS`)
  if (tour.max_power_ps != null) list.push(`Maximalleistung ${tour.max_power_ps} PS`)
  if (tour.min_driver_age != null) list.push(`Mindestalter ${tour.min_driver_age} Jahre`)
  if (tour.license_plate_required) list.push('Kennzeichen bei Anmeldung erforderlich')
  return list
}

function initials(name: string): string {
  return name.replace('@', '').slice(0, 2).toUpperCase()
}
