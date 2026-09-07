import { useParams } from 'react-router-dom'

/**
 * Öffentliche Tourdetailseite mit zustandsabhängiger Erweiterung
 * (Visitor / Member / Confirmed Participant / Admin, siehe CLAUDE.md §14).
 *
 * TODO (nächste Phase): Tourdaten per Slug laden und je nach Sichtbarkeitsstufe rendern.
 */
export function TourDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold">Tour: {slug}</h1>
      <p className="mt-4 text-sm text-sft-gray">Diese Tour konnte noch nicht geladen werden.</p>
    </div>
  )
}
