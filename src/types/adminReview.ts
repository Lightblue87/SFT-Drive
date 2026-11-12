// Entspricht supabase/migrations/20261111010000_admin_notes_and_driver_ratings.sql
// (siehe CLAUDE.md §42). Beides ist ausschließlich für Admins les- und pflegbar.

export interface AdminUserNote {
  id: string
  user_id: string
  tour_id: string | null
  body: string
  created_by: string | null
  created_at: string
  tour: { title: string } | null
}

export type RatingCriterion = 'vehicle_control' | 'convoy_discipline' | 'rules_safety'

export const RATING_CRITERIA: { key: RatingCriterion; label: string; hint: string }[] = [
  { key: 'vehicle_control', label: 'Fahrzeugbeherrschung', hint: 'Linie, Bremsen, Kontrolle über das Auto' },
  { key: 'convoy_discipline', label: 'Kolonnendisziplin', hint: 'Abstand, Position halten, Funk beachten' },
  { key: 'rules_safety', label: 'Regeln & Sicherheit', hint: 'Verkehrsregeln, Rücksicht, kein Risiko' },
]

export const RATING_SCALE_HINT = '1 = unsicher · 3 = solide · 5 = souverän'

export type RatingValues = Record<RatingCriterion, number>

export interface DriverRating extends RatingValues {
  id: string
  tour_id: string
  user_id: string
  comment: string | null
  rated_by: string | null
  updated_at: string
}

export interface DriverRatingWithTour extends DriverRating {
  tour: { title: string; start_date: string; end_date: string } | null
}

export interface PendingDriverRatingTour {
  tour_id: string
  title: string
  start_date: string
  end_date: string
  confirmed_count: number
  rated_count: number
}

/** Mittelwert der drei Kriterien einer Bewertung. */
export function ratingAverage(r: RatingValues): number {
  return (r.vehicle_control + r.convoy_discipline + r.rules_safety) / 3
}

export function formatRating(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
