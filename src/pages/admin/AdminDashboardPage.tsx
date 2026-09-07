import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import { formatDateRange } from '@/utils/date'
import type { Tour } from '@/types/tour'

interface TourSummary {
  tour: Tour
  confirmedVehicles: number
  pendingCount: number
  waitlistCount: number
  confirmedPersons: number
}

export function AdminDashboardPage() {
  const [summaries, setSummaries] = useState<TourSummary[]>([])
  const [draftCount, setDraftCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: tours } = await supabase
        .from('tours')
        .select('*')
        .in('status', ['published', 'registration_closed'])
        .order('start_date', { ascending: true })

      const { count: drafts } = await supabase
        .from('tours')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft')
      setDraftCount(drafts ?? 0)

      const results: TourSummary[] = await Promise.all(
        ((tours ?? []) as Tour[]).map(async (tour) => {
          const { data: regs } = await supabase
            .from('tour_registrations')
            .select('status, passenger_count')
            .eq('tour_id', tour.id)

          const confirmed = (regs ?? []).filter((r) => r.status === 'confirmed')
          return {
            tour,
            confirmedVehicles: confirmed.length,
            pendingCount: (regs ?? []).filter((r) => r.status === 'pending').length,
            waitlistCount: (regs ?? []).filter((r) => r.status === 'waitlisted').length,
            confirmedPersons: confirmed.reduce((sum, r) => sum + 1 + r.passenger_count, 0),
          }
        }),
      )

      setSummaries(results)
      setLoading(false)
    }

    load()
  }, [])

  if (loading) return <PageLoading />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Link to="/admin/tours" className="rounded-md bg-sft-red px-3 py-1.5 text-sm">
            Tourenverwaltung
          </Link>
          <Link to="/admin/settings" className="rounded-md border border-sft-surface2 px-3 py-1.5 text-sm">
            Einstellungen
          </Link>
          <Link to="/admin/users" className="rounded-md border border-sft-surface2 px-3 py-1.5 text-sm">
            Nutzer
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-sft-surface p-3">
          <div className="text-sft-gray">Geplante Touren</div>
          <div className="text-lg font-semibold">{summaries.length}</div>
        </div>
        <div className="rounded-md bg-sft-surface p-3">
          <div className="text-sft-gray">Entwürfe</div>
          <div className="text-lg font-semibold">{draftCount}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {summaries.map((s) => (
          <Link
            key={s.tour.id}
            to={`/admin/tours/${s.tour.id}/registrations`}
            className="rounded-md bg-sft-surface p-3 text-sm"
          >
            <div className="font-medium">{s.tour.title}</div>
            <div className="text-sft-gray">
              {formatDateRange(s.tour.start_date, s.tour.end_date)} · {s.confirmedVehicles} /{' '}
              {s.tour.max_vehicles} Fahrzeuge · {s.confirmedPersons} Personen
            </div>
            <div className="text-sft-gray">
              Pending: {s.pendingCount} · Warteliste: {s.waitlistCount}
            </div>
          </Link>
        ))}
        {summaries.length === 0 && (
          <p className="text-sm text-sft-gray">Noch keine veröffentlichten Touren.</p>
        )}
      </div>
    </div>
  )
}
