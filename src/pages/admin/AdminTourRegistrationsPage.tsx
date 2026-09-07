import { useParams } from 'react-router-dom'

/** Teilnehmerverwaltung je Tour (siehe CLAUDE.md §12, §21.3). */
export function AdminTourRegistrationsPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold">Teilnehmer</h1>
      <p className="mt-4 text-sm text-sft-gray">Tour {id}: noch keine Anmeldungen.</p>
    </div>
  )
}
