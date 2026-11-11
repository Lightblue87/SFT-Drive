// Hotelvorschläge und Übernachtungsbestätigung (siehe CLAUDE.md §36).
// Entspricht dem Schema aus supabase/migrations/20260908120000_accommodation.sql.
// Beide Tabellen sind Participant-Inhalt — nur für bestätigte Teilnehmer der
// jeweiligen Tour und Admins lesbar.

export interface HotelSuggestion {
  id: string
  tour_id: string
  night_date: string
  /** Letzte abgedeckte Nacht, wenn der Vorschlag mehrere Nächte abdeckt
   * (§36.2/§36.5) — null bedeutet "nur night_date". Immer über
   * `hotelSuggestionCoversNight()` prüfen, nie direkt auf null testen. */
  night_date_end: string | null
  name: string
  /** Vom Hotel genannter Preis pro Nacht, organisatorische Angabe des Admins
   * zum Vorschlag selbst — keine persönlichen Zahlungs-/Buchungsdaten (§36.3). */
  price_per_night: number | null
  url: string | null
  hotel_url: string | null
  booking_url: string | null
  price_unit: string | null
  room_type: string | null
  breakfast_details: string | null
  parking_details: string | null
  cancellation_terms: string | null
  allotment_details: string | null
  contact: string | null
  address: string | null
  note: string | null
  booking_deadline: string | null
  sort_order: number
}

/** night_date_end fehlt (null) bedeutet "deckt nur night_date ab". */
export function hotelSuggestionCoversNight(suggestion: HotelSuggestion, night: string): boolean {
  return suggestion.night_date <= night && (suggestion.night_date_end ?? suggestion.night_date) >= night
}

export interface AccommodationConfirmation {
  id: string
  tour_id: string
  user_id: string
  night_date: string
  confirmed_at: string
  accommodation_choice: 'suggested_hotel' | 'other_accommodation' | null
  hotel_suggestion_id: string | null
}
