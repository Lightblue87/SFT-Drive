// Entspricht public.notifications (siehe CLAUDE.md §27.14).
export interface AppNotification {
  id: string
  tour_id: string | null
  type: string
  title: string
  body: string
  target_path: string | null
  created_at: string
  read_at: string | null
}
