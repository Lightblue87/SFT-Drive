// Hotelvorschläge und Übernachtungsbestätigung (siehe CLAUDE.md §36).
// Entspricht dem Schema aus supabase/migrations/20260908120000_accommodation.sql.
// Beide Tabellen sind Participant-Inhalt — nur für bestätigte Teilnehmer der
// jeweiligen Tour und Admins lesbar.

export interface HotelSuggestion {
  id: string
  tour_id: string
  night_date: string
  name: string
  url: string | null
  address: string | null
  note: string | null
  booking_deadline: string | null
  sort_order: number
}

export interface AccommodationConfirmation {
  id: string
  tour_id: string
  user_id: string
  night_date: string
  confirmed_at: string
}
