import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { formatDateRange } from '@/utils/date'
import type { RegistrationStatus } from '@/types/tour'

interface Row {
  id: string
  status: RegistrationStatus
  tour_id: string
  vehicle_manufacturer: string
  vehicle_model: string
  tours: { slug: string; title: string; start_date: string; end_date: string } | null
}

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  confirmed: 'Du bist dabei',
  pending: 'Freigabe ausstehend',
  waitlisted: 'Warteliste',
  rejected: 'Anfrage abgelehnt',
  cancelled: 'Storniert',
}

const GROUP_ORDER: RegistrationStatus[] = ['confirmed', 'pending', 'waitlisted', 'rejected', 'cancelled']

/**
 * Eigene aktuelle/zukünftige Touranmeldungen, gruppiert nach Status
 * (siehe CLAUDE.md §21.2).
 */
export function ProfileToursPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function load() {
      const { data: regs } = await supabase
        .from('tour_registrations')
        .select('id, status, tour_id, vehicle_manufacturer, vehicle_model')
        .eq('user_id', user!.id)

      const tourIds = [...new Set((regs ?? []).map((r) => r.tour_id))]
      const { data: tours } = tourIds.length
        ? await supabase.from('tours').select('id, slug, title, start_date, end_date').in('id', tourIds)
        : { data: [] }

      const tourById = new Map((tours ?? []).map((t) => [t.id, t]))

      setRows(
        (regs ?? [])
          .map((r) => ({ ...r, tours: tourById.get(r.tour_id) ?? null }))
          .filter((r) => r.tours && r.tours.end_date >= new Date().toISOString().slice(0, 10)),
      )
      setLoading(false)
    }

    load()
  }, [user])

  if (loading) return null

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-semibold">Meine Touren</h1>
        <p className="mt-4 text-sm text-sft-gray">Du bist aktuell zu keiner Tour angemeldet.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Meine Touren</h1>

      {GROUP_ORDER.map((status) => {
        const groupRows = rows.filter((r) => r.status === status)
        if (groupRows.length === 0) return null

        return (
          <div key={status} className="mb-4">
            <h2 className="mb-2 text-sm font-medium text-sft-gray">{STATUS_LABEL[status]}</h2>
            <ul className="flex flex-col gap-2">
              {groupRows.map((r) => (
                <li key={r.id}>
                  <Link to={`/tours/${r.tours!.slug}`} className="block rounded-md bg-sft-surface p-3 text-sm">
                    <div className="font-medium">{r.tours!.title}</div>
                    <div className="text-sft-gray">
                      {formatDateRange(r.tours!.start_date, r.tours!.end_date)} · {r.vehicle_manufacturer}{' '}
                      {r.vehicle_model}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
