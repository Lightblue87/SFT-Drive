import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Tour } from '@/types/tour'
import { PageLoading } from '@/components/PageLoading'
import { formatDateRange } from '@/utils/date'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Entwurf',
  published: 'Veröffentlicht',
  registration_closed: 'Anmeldung geschlossen',
  cancelled: 'Abgesagt',
  completed: 'Abgeschlossen',
  archived: 'Archiviert',
}

export function AdminToursPage() {
  const [tours, setTours] = useState<Tour[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    supabase
      .from('tours')
      .select('*')
      .order('start_date', { ascending: false })
      .then(({ data }) => {
        setTours((data as Tour[]) ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <PageLoading />

  // Archivierte Touren sind standardmäßig ausgeblendet (§8.3: "Archived-Touren sind
  // standardmäßig nicht in der normalen Tourübersicht sichtbar") — sonst verliert sich
  // die Tourenverwaltung auf Dauer in alten Touren. Manuell über den Filter einblendbar.
  const visibleTours = showArchived ? tours : tours.filter((tour) => tour.status !== 'archived')
  const archivedCount = tours.length - tours.filter((tour) => tour.status !== 'archived').length

  return (
    <div className="py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tourenverwaltung</h1>
        <Link to="/admin/tours/new" className="rounded-md bg-sft-red px-3 py-1.5 text-sm">
          Neue Tour
        </Link>
      </div>

      {archivedCount > 0 && (
        <label className="mt-4 flex items-center gap-2 text-sm text-sft-gray">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Archivierte Touren einblenden ({archivedCount})
        </label>
      )}

      {visibleTours.length === 0 ? (
        <p className="mt-4 text-sm text-sft-gray">Noch keine Touren vorhanden.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {visibleTours.map((tour) => (
            <li key={tour.id}>
              <Link
                to={`/admin/tours/${tour.id}/edit`}
                className="flex items-center justify-between rounded-md bg-sft-surface px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-medium">{tour.title}</div>
                  <div className="text-sft-gray">
                    {formatDateRange(tour.start_date, tour.end_date)} · {tour.region}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sft-gray">{STATUS_LABEL[tour.status] ?? tour.status}</span>
                  <span className="text-sft-red">→</span>
                </div>
              </Link>
              <div className="mt-1 flex gap-3">
                <Link
                  to={`/admin/tours/${tour.id}/registrations`}
                  className="text-xs text-sft-gray underline"
                >
                  Teilnehmer verwalten
                </Link>
                <Link to={`/admin/tours/${tour.id}/stops`} className="text-xs text-sft-gray underline">
                  Tour-Stopps verwalten
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
