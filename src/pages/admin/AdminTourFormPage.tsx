import { useParams } from 'react-router-dom'

/**
 * Tour anlegen/bearbeiten (siehe CLAUDE.md §21.3). Ein Formular für beide
 * Fälle: `/admin/tours/new` (kein `id`) und `/admin/tours/:id/edit`.
 *
 * TODO: Formularfelder (Basisdaten, Zeitraum, Fahrzeuganforderungen,
 * Kurviger/Zello, Sichtbarkeitsstufen) sobald das Datenbankschema existiert.
 */
export function AdminTourFormPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold">{id ? 'Tour bearbeiten' : 'Neue Tour'}</h1>
      <p className="mt-4 text-sm text-sft-gray">
        Das Tourformular wird implementiert, sobald das Datenbankschema angelegt ist.
      </p>
    </div>
  )
}
