// Entspricht dem (bereits vor Phase 15 bestehenden) Schema aus
// supabase/migrations/20260907080350_tour_participant_details_and_stages.sql,
// erweitert um `route_url` in 20260908103000_tour_stage_route_url.sql
// (siehe CLAUDE.md §34.4). Participant-Inhalt — nur für bestätigte
// Teilnehmer und Admins lesbar.

export interface TourStage {
  id: string
  tour_id: string
  stage_date: string
  stage_number: number
  title: string
  description: string | null
  route_length_km: number | null
  kurviger_url: string | null
  route_url: string | null
  meeting_point_private: string | null
  start_time: string | null
}
