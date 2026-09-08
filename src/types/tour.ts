// Entspricht dem Schema aus supabase/migrations (siehe CLAUDE.md §8).

export type TourStatus =
  | 'draft'
  | 'published'
  | 'registration_closed'
  | 'cancelled'
  | 'completed'
  | 'archived'

export type ConfirmationMode = 'automatic' | 'manual'

export type RegistrationStatus = 'pending' | 'confirmed' | 'waitlisted' | 'cancelled' | 'rejected'

export interface Tour {
  id: string
  slug: string
  title: string
  short_description: string | null
  public_description: string | null
  start_date: string
  end_date: string
  meeting_at: string | null
  planned_end_at: string | null
  region: string
  route_length_km: number | null
  meeting_point_public: string | null
  max_vehicles: number
  confirmation_mode: ConfirmationMode
  license_plate_required: boolean
  min_power_ps: number | null
  max_power_ps: number | null
  min_driver_age: number | null
  registration_open_at: string | null
  registration_close_at: string | null
  passenger_edit_deadline_at: string | null
  check_in_enabled: boolean
  check_in_open_minutes_before: number
  check_in_close_minutes_after: number
  status: TourStatus
  cover_image_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface TourMemberDetails {
  tour_id: string
  member_description: string | null
}

export interface TourParticipantDetails {
  tour_id: string
  participant_description: string | null
  meeting_point_private: string | null
  kurviger_url: string | null
  zello_url: string | null
}

export interface PublicTourStats {
  max_vehicles: number
  confirmed_vehicles: number
  free_vehicle_slots: number
  is_full: boolean
}

export interface TourRegistration {
  id: string
  tour_id: string
  user_id: string
  status: RegistrationStatus
  vehicle_manufacturer: string
  vehicle_model: string
  vehicle_power_ps: number
  license_plate: string | null
  passenger_count: number
  registered_at: string
  checked_in_at: string | null
}

export interface ConfirmedVehicle {
  registration_id: string
  username: string
  // Nur bei akzeptierter Freundschaft zwischen Betrachter und Fahrer gesetzt
  // (Phase 12, siehe CLAUDE.md §34.1/§8.9) — sonst null.
  first_name: string | null
  last_name: string | null
  vehicle_manufacturer: string
  vehicle_model: string
  vehicle_power_ps: number
  is_self: boolean
}

export interface ArchiveEntry {
  tour_id: string
  tour_slug: string
  tour_title: string
  cover_image_url: string | null
  start_date: string
  end_date: string
  region: string
  route_length_km: number | null
  vehicle_manufacturer: string
  vehicle_model: string
  vehicle_power_ps: number
  passenger_count: number
}

/** Ergebniscodes der Anmelde-/Verwaltungs-RPCs (siehe CLAUDE.md §9.9). */
export type RpcResultCode =
  | 'CONFIRMED'
  | 'PENDING_APPROVAL'
  | 'WAITLISTED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'OK'
  | 'TOUR_NOT_FOUND'
  | 'TOUR_NOT_OPEN'
  | 'TOUR_FULL'
  | 'REGISTRATION_NOT_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'ALREADY_REGISTERED'
  | 'ALREADY_CANCELLED'
  | 'REGISTRATION_NOT_FOUND'
  | 'REGISTRATION_NOT_PENDING'
  | 'VEHICLE_DATA_INVALID'
  | 'LICENSE_PLATE_REQUIRED'
  | 'POWER_TOO_LOW'
  | 'POWER_TOO_HIGH'
  | 'DATE_OF_BIRTH_REQUIRED'
  | 'DRIVER_TOO_YOUNG'
  | 'PASSENGER_EDIT_DEADLINE_PASSED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'USER_NOT_FOUND'
  | 'LAST_ADMIN'
  | 'ORDERING_NOT_ENABLED'
  | 'ORDERING_NOT_OPEN'
  | 'ORDERING_CLOSED'
  | 'MENU_ITEM_INVALID'

export interface RegistrationResult {
  code: RpcResultCode
  status: RegistrationStatus | null
  registration_id: string | null
}

export const RPC_ERROR_MESSAGES: Record<string, string> = {
  TOUR_NOT_FOUND: 'Diese Tour wurde nicht gefunden.',
  TOUR_NOT_OPEN: 'Diese Tour ist aktuell nicht buchbar.',
  TOUR_FULL: 'Diese Tour ist bereits ausgebucht.',
  REGISTRATION_NOT_OPEN: 'Die Anmeldung für diese Tour hat noch nicht begonnen.',
  REGISTRATION_CLOSED: 'Die Anmeldung für diese Tour ist geschlossen.',
  ALREADY_REGISTERED: 'Du bist bereits für diese Tour angemeldet.',
  ALREADY_CANCELLED: 'Diese Anmeldung ist bereits storniert.',
  REGISTRATION_NOT_FOUND: 'Keine Anmeldung gefunden.',
  REGISTRATION_NOT_PENDING: 'Diese Anmeldung wartet aktuell nicht auf Freigabe.',
  VEHICLE_DATA_INVALID: 'Bitte Hersteller, Modell, Leistung und Personenzahl prüfen.',
  LICENSE_PLATE_REQUIRED: 'Für diese Tour ist ein Kennzeichen erforderlich.',
  POWER_TOO_LOW: 'Die Leistung deines Fahrzeugs liegt unter der Mindestanforderung.',
  POWER_TOO_HIGH: 'Die Leistung deines Fahrzeugs liegt über der zulässigen Maximalleistung.',
  DATE_OF_BIRTH_REQUIRED: 'Für diese Tour wird dein Geburtsdatum benötigt.',
  DRIVER_TOO_YOUNG: 'Du erfüllst die Mindestaltersanforderung für diese Tour nicht.',
  PASSENGER_EDIT_DEADLINE_PASSED: 'Die Frist zur Änderung der Personenzahl ist abgelaufen.',
  UNAUTHENTICATED: 'Bitte melde dich an, um fortzufahren.',
  FORBIDDEN: 'Dazu bist du nicht berechtigt.',
  USER_NOT_FOUND: 'Dieser Nutzer wurde nicht gefunden.',
  LAST_ADMIN: 'Der letzte verbleibende Admin kann die Rolle nicht ablegen.',
  ORDERING_NOT_ENABLED: 'Für diesen Stopp ist keine Essensbestellung aktiviert.',
  ORDERING_NOT_OPEN: 'Die Essensbestellung hat noch nicht begonnen.',
  ORDERING_CLOSED: 'Die Bestellfrist ist abgelaufen.',
  MENU_ITEM_INVALID: 'Ein ausgewähltes Gericht ist nicht verfügbar.',
  CANNOT_FRIEND_SELF: 'Du kannst dir nicht selbst eine Freundschaftsanfrage senden.',
  ALREADY_FRIENDS: 'Ihr seid bereits befreundet.',
  REQUEST_ALREADY_SENT: 'Du hast bereits eine Anfrage an diesen Nutzer gesendet.',
  FRIENDSHIP_NOT_FOUND: 'Diese Freundschaftsanfrage wurde nicht gefunden.',
  CHECK_IN_NOT_ENABLED: 'Für diese Tour ist kein Check-in aktiviert.',
  MEETING_TIME_NOT_SET: 'Für diese Tour ist keine Treffpunktzeit hinterlegt.',
  ALREADY_CHECKED_IN: 'Du bist bereits eingecheckt.',
  CHECK_IN_NOT_OPEN: 'Der Check-in hat noch nicht begonnen.',
  CHECK_IN_CLOSED: 'Der Check-in-Zeitraum ist bereits abgelaufen.',
}

export function rpcErrorMessage(code: string): string {
  return RPC_ERROR_MESSAGES[code] ?? 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
}
