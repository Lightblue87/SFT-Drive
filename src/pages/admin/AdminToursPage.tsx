import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { RegistrationResult, Tour } from '@/types/tour'
import { rpcErrorMessage } from '@/types/tour'
import { PageLoading } from '@/components/PageLoading'
import { SwipeToDelete } from '@/components/SwipeToDelete'
import { formatDateRange } from '@/utils/date'

const STATUS_LABEL: Record<string, string> = {
  draft: 'ENTWURF',
  published: 'VERÖFFENTLICHT',
  registration_closed: 'ANMELDUNG ZU',
  cancelled: 'ABGESAGT',
  completed: 'ABGESCHLOSSEN',
  archived: 'ARCHIVIERT',
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-sft-amber/14 text-sft-amber',
  published: 'bg-sft-red/16 text-[#ff6b63]',
  registration_closed: 'bg-white/6 text-[#c9c9ce]',
  cancelled: 'bg-white/6 text-sft-gray',
  completed: 'bg-white/6 text-sft-gray',
  archived: 'bg-white/6 text-sft-gray',
}

export function AdminToursPage() {
  const [tours, setTours] = useState<Tour[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  /**
   * Wischen-zum-Löschen, analog zu den Mitteilungen (§27.20), aber mit
   * Bestätigung — anders als eine einzelne Mitteilung ist eine Tour inklusive
   * aller abhängigen Daten nicht trivial wiederherstellbar. Nur für
   * `draft`/`cancelled` überhaupt aufrufbar (siehe `admin_delete_tour`).
   */
  async function deleteTour(tour: Tour) {
    if (deletingId) return // Löschung läuft bereits (z. B. erneutes Wischen während der Anfrage)
    if (
      !window.confirm(
        `„${tour.title}" und ihre organisatorischen Tourdaten endgültig löschen? Bereits versendete Mitteilungen und Bilder in der Mediengalerie bleiben erhalten. Das kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return
    }

    setDeleteError(null)
    setDeletingId(tour.id)
    const { data, error: rpcError } = await supabase.rpc('admin_delete_tour', { p_tour_id: tour.id })
    setDeletingId(null)

    if (rpcError) {
      setDeleteError('Löschen fehlgeschlagen. Bitte versuche es erneut.')
      return
    }

    const result = data as RegistrationResult
    if (result.code !== 'OK') {
      setDeleteError(rpcErrorMessage(result.code))
      return
    }

    try {
      localStorage.removeItem(`sft-drive-tour-draft-${tour.id}`)
    } catch {
      // ignorieren
    }

    setTours((prev) => prev.filter((t) => t.id !== tour.id))
  }

  if (loading) return <PageLoading />

  // Archivierte Touren sind standardmäßig ausgeblendet (§8.3: "Archived-Touren sind
  // standardmäßig nicht in der normalen Tourübersicht sichtbar") — sonst verliert sich
  // die Tourenverwaltung auf Dauer in alten Touren. Manuell über den Filter einblendbar.
  const visibleTours = showArchived ? tours : tours.filter((tour) => tour.status !== 'archived')
  const archivedCount = tours.length - tours.filter((tour) => tour.status !== 'archived').length

  return (
    <div className="pt-3">
      <Link
        to="/admin/tours/new"
        className="tap-scale block w-full rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-3.5 text-center text-[15px] font-semibold text-white"
      >
        + Neue Tour anlegen
      </Link>

      {archivedCount > 0 && (
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="tap-scale mt-3.5 flex w-full items-center gap-2.5 rounded-xl border border-white/9 bg-[#0f0f12] px-3.5 py-2.5 text-left"
        >
          <span
            className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border ${
              showArchived ? 'border-sft-red bg-sft-red' : 'border-white/20'
            }`}
          >
            {showArchived && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M4 12.5 9.5 18 20 6" stroke="#fff" strokeWidth="2.6" />
              </svg>
            )}
          </span>
          <span className="text-[13px] text-[#c9c9ce]">
            Archivierte Touren einblenden ({archivedCount})
          </span>
        </button>
      )}

      {deleteError && <p className="mt-3.5 text-sm text-sft-red">{deleteError}</p>}

      {visibleTours.length === 0 ? (
        <p className="mt-4 text-sm text-sft-gray">Noch keine Touren vorhanden.</p>
      ) : (
        <div className="mt-3.5 flex flex-col gap-2.5">
          {visibleTours.map((tour) => {
            const multiDay = tour.end_date > tour.start_date
            const deletable = tour.status === 'draft' || tour.status === 'cancelled'
            const isDeleting = deletingId === tour.id
            const card = (
              <div
                className={`overflow-hidden rounded-2xl border border-white/9 bg-sft-card ${
                  isDeleting ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                <Link
                  to={`/admin/tours/${tour.id}/edit`}
                  className="tap-scale flex items-center gap-3 px-[15px] py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold leading-tight">{tour.title}</div>
                    <div className="mt-1.5 font-mono text-[10px] text-sft-gray">
                      {formatDateRange(tour.start_date, tour.end_date).toUpperCase()} · {tour.region.toUpperCase()}
                    </div>
                  </div>
                  <span
                    className={`flex-none rounded-md px-2 py-1 font-mono text-[9px] font-bold tracking-[0.1em] ${STATUS_STYLE[tour.status] ?? 'bg-white/6 text-sft-gray'}`}
                  >
                    {STATUS_LABEL[tour.status] ?? tour.status}
                  </span>
                </Link>
                <div className="grid grid-cols-2 gap-px bg-white/6 border-t border-white/6">
                  <Link
                    to={`/admin/tours/${tour.id}/registrations`}
                    className="tap-scale bg-sft-card px-2 py-2.5 text-center text-[11px] font-medium text-[#c9c9ce]"
                  >
                    Teilnehmer
                  </Link>
                  <Link
                    to={`/admin/tours/${tour.id}/stops`}
                    className="tap-scale bg-sft-card px-2 py-2.5 text-center text-[11px] font-medium text-[#c9c9ce]"
                  >
                    Stopps
                  </Link>
                  {multiDay ? (
                    <Link
                      to={`/admin/tours/${tour.id}/stages`}
                      className="tap-scale bg-sft-card px-2 py-2.5 text-center text-[11px] font-medium text-[#c9c9ce]"
                    >
                      Tagesrouten
                    </Link>
                  ) : (
                    <span className="bg-sft-card px-2 py-2.5 text-center text-[11px] font-medium text-sft-gray-faint">
                      Tagesrouten
                    </span>
                  )}
                  {multiDay ? (
                    <Link
                      to={`/admin/tours/${tour.id}/hotels`}
                      className="tap-scale bg-sft-card px-2 py-2.5 text-center text-[11px] font-medium text-[#c9c9ce]"
                    >
                      Übernachtungen
                    </Link>
                  ) : (
                    <span className="bg-sft-card px-2 py-2.5 text-center text-[11px] font-medium text-sft-gray-faint">
                      Übernachtungen
                    </span>
                  )}
                  <Link
                    to={`/admin/tours/new?duplicate=${tour.id}`}
                    className="tap-scale col-span-2 bg-sft-card px-2 py-2.5 text-center text-[11px] font-medium text-[#c9c9ce]"
                  >
                    Tour duplizieren
                  </Link>
                </div>
              </div>
            )

            return deletable ? (
              <SwipeToDelete key={tour.id} onDelete={() => deleteTour(tour)}>
                {card}
              </SwipeToDelete>
            ) : (
              <div key={tour.id}>{card}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
