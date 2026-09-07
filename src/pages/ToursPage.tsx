import { useTours } from '@/features/tours/useTours'
import { TourTile } from '@/features/tours/TourTile'
import { PageLoading } from '@/components/PageLoading'

/**
 * Öffentliche Tourübersicht (siehe CLAUDE.md §13). Dient gleichzeitig als
 * Inhalt für `/` und `/tours` — keine doppelte Businesslogik (§21.11).
 *
 * TODO (nächster Schritt): Monatskalender als primären Filter ergänzen
 * (§13.2–§13.9). Aktuell chronologische Liste ohne Kalenderfilter.
 */
export function ToursPage() {
  const { tours, loading, error } = useTours()

  if (loading) return <PageLoading />

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-sm text-sft-red">{error}</p>
      </div>
    )
  }

  if (tours.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-semibold">Ausfahrten</h1>
        <p className="mt-4 text-sm text-sft-gray">
          Aktuell ist noch keine neue Ausfahrt geplant.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Ausfahrten</h1>
      <div className="flex flex-col gap-6">
        {tours.map((t) => (
          <TourTile key={t.tour.id} {...t} />
        ))}
      </div>
    </div>
  )
}
