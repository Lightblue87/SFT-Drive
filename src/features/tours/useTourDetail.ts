import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  Tour,
  TourMemberDetails,
  TourParticipantDetails,
  PublicTourStats,
  TourRegistration,
  ConfirmedVehicle,
} from '@/types/tour'
import type { TourStop } from '@/types/tourStop'
import type { TourStage } from '@/types/tourStage'

export interface TourDetailData {
  tour: Tour
  stats: PublicTourStats | null
  memberDetails: TourMemberDetails | null
  participantDetails: TourParticipantDetails | null
  confirmedVehicles: ConfirmedVehicle[]
  ownRegistration: TourRegistration | null
  stops: TourStop[]
  stages: TourStage[]
}

/**
 * Lädt eine Tour zustandsabhängig nach Sichtbarkeitsstufe (siehe CLAUDE.md §10,
 * §14). RLS entscheidet serverseitig, was tatsächlich zurückkommt — Member-
 * und Participant-Details werden hier best-effort nachgeladen und bleiben
 * `null`, wenn der Caller keinen Zugriff hat (RLS liefert dann leere Ergebnisse
 * statt Fehler).
 */
export function useTourDetail(slug: string | undefined) {
  const [data, setData] = useState<TourDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const reload = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setNotFound(false)

    const { data: tourRow, error: tourError } = await supabase
      .from('tours')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (tourError || !tourRow) {
      setNotFound(true)
      setLoading(false)
      return
    }

    const tour = tourRow as Tour

    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id

    const [{ data: stats }, { data: memberDetails }] = await Promise.all([
      supabase.rpc('get_public_tour_stats', { p_tour_id: tour.id }),
      userId
        ? supabase.from('tour_member_details').select('*').eq('tour_id', tour.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    let ownRegistration: TourRegistration | null = null
    let participantDetails: TourParticipantDetails | null = null
    let confirmedVehicles: ConfirmedVehicle[] = []
    let stops: TourStop[] = []
    let stages: TourStage[] = []

    if (userId) {
      const { data: reg } = await supabase
        .from('tour_registrations')
        .select('*')
        .eq('tour_id', tour.id)
        .eq('user_id', userId)
        .maybeSingle()
      ownRegistration = (reg as TourRegistration) ?? null

      if (ownRegistration?.status === 'confirmed') {
        const [{ data: pd }, { data: vehicles }, { data: stopRows }, { data: stageRows }] = await Promise.all([
          supabase.from('tour_participant_details').select('*').eq('tour_id', tour.id).maybeSingle(),
          supabase.rpc('get_confirmed_tour_vehicles', { p_tour_id: tour.id }),
          supabase.from('tour_stops').select('*').eq('tour_id', tour.id).order('sort_order', { ascending: true }),
          supabase
            .from('tour_stages')
            .select('*')
            .eq('tour_id', tour.id)
            .order('stage_number', { ascending: true }),
        ])
        participantDetails = (pd as TourParticipantDetails) ?? null
        confirmedVehicles = (vehicles as ConfirmedVehicle[]) ?? []
        stops = (stopRows as TourStop[]) ?? []
        stages = (stageRows as TourStage[]) ?? []
      }
    }

    setData({
      tour,
      stats: (stats?.[0] as PublicTourStats) ?? null,
      memberDetails: (memberDetails as TourMemberDetails) ?? null,
      participantDetails,
      confirmedVehicles,
      ownRegistration,
      stops,
      stages,
    })
    setLoading(false)
  }, [slug])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, notFound, reload }
}
