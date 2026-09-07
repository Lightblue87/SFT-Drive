// Entspricht public.tour_stops (siehe CLAUDE.md §27.2).
export type TourStopType = 'restaurant' | 'meeting' | 'fuel' | 'break' | 'hotel' | 'viewpoint' | 'other'

export interface TourStop {
  id: string
  tour_id: string
  stage_id: string | null
  type: TourStopType
  title: string
  description: string | null
  location_name: string | null
  address: string | null
  starts_at: string | null
  sort_order: number
}

export const TOUR_STOP_TYPE_LABELS: Record<TourStopType, string> = {
  restaurant: 'Restaurant',
  meeting: 'Treffpunkt',
  fuel: 'Tanken',
  break: 'Pause',
  hotel: 'Hotel',
  viewpoint: 'Aussichtspunkt',
  other: 'Sonstiges',
}
