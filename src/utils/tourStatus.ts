import type { Tour, TourStatus } from '@/types/tour'

/**
 * Ableitung des tatsächlichen Anmeldezustands einer Tour (siehe CLAUDE.md §8.3
 * "Lebenszyklus der Tourstatus").
 *
 * Bewusst nicht allein aus `tours.status`: den setzt ein zeitgesteuerter Job
 * (`apply_tour_lifecycle()`, alle 15 Minuten). Zwischen Ablauf des
 * Anmeldeschlusses und dem nächsten Joblauf wäre das UI sonst kurzzeitig
 * falsch und würde ein Anmeldeformular anbieten, das die RPC anschließend
 * ablehnt. Die verbindliche Prüfung bleibt in jedem Fall serverseitig in
 * `register_for_tour` — das hier ist reine UX.
 */
export type RegistrationPhase =
  | 'open' // Anmeldung möglich
  | 'not_yet' // Anmeldezeitraum beginnt erst später (Vormerkung möglich, §35.3)
  | 'closed' // Anmeldeschluss vorbei bzw. Status registration_closed
  | 'cancelled' // Tour abgesagt
  | 'completed' // Tour vorbei
  | 'unavailable' // draft/archived — sollte für normale User gar nicht sichtbar sein

export function registrationPhase(tour: Tour, now: Date = new Date()): RegistrationPhase {
  if (tour.status === 'cancelled') return 'cancelled'
  if (tour.status === 'completed') return 'completed'
  if (tour.status === 'draft' || tour.status === 'archived') return 'unavailable'

  // Ein bereits vergangener letzter Tourtag zählt als abgeschlossen, auch wenn
  // der Lifecycle-Job den Status noch nicht nachgezogen hat.
  const todayKey = localDateKey(now)
  if (tour.end_date < todayKey) return 'completed'

  if (tour.status === 'registration_closed') return 'closed'
  if (tour.registration_close_at && new Date(tour.registration_close_at) < now) return 'closed'
  if (tour.registration_open_at && new Date(tour.registration_open_at) > now) return 'not_yet'

  return 'open'
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Kurzes Badge-Label für Kachel und Hero — null, wenn nichts zu melden ist. */
export function tourPhaseBadge(phase: RegistrationPhase): string | null {
  switch (phase) {
    case 'cancelled':
      return 'ABGESAGT'
    case 'completed':
      return 'ABGESCHLOSSEN'
    case 'closed':
      return 'ANMELDUNG GESCHLOSSEN'
    default:
      return null
  }
}

/** Erklärender Satz auf der Tourdetailseite. */
export function tourPhaseMessage(phase: RegistrationPhase): string | null {
  switch (phase) {
    case 'cancelled':
      return 'Diese Ausfahrt wurde abgesagt. Eine Anmeldung ist nicht mehr möglich.'
    case 'completed':
      return 'Diese Ausfahrt ist beendet.'
    case 'closed':
      return 'Die Anmeldung für diese Ausfahrt ist geschlossen. Wende dich an die Tourleitung, wenn du noch mitfahren möchtest.'
    default:
      return null
  }
}

/**
 * Zählt der eigene Anmeldestatus als aktive Teilnahme? `cancelled` und
 * `rejected` sind keine — sie bedeuten, dass man gerade nicht dabei ist
 * (dieselbe Abgrenzung wie `activeRegistration` auf der Tourdetailseite).
 */
export function isActiveRegistration(ownStatus: string | null): boolean {
  return ownStatus === 'confirmed' || ownStatus === 'pending' || ownStatus === 'waitlisted'
}

export const TOUR_STATUS_LABEL: Record<TourStatus, string> = {
  draft: 'ENTWURF',
  published: 'VERÖFFENTLICHT',
  registration_closed: 'ANMELDUNG ZU',
  cancelled: 'ABGESAGT',
  completed: 'ABGESCHLOSSEN',
  archived: 'ARCHIVIERT',
}
