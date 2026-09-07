/**
 * Öffentliche Tourübersicht (siehe CLAUDE.md §13). Dient gleichzeitig als
 * Inhalt für `/` und `/tours` — keine doppelte Businesslogik (§21.11).
 *
 * TODO (nächste Phase): Monatskalender, Tourkacheln und freie Plätze aus
 * Supabase laden, sobald das Datenbankschema angelegt ist.
 */
export function ToursPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold">Ausfahrten</h1>
      <p className="mt-4 text-sm text-sft-gray">
        Aktuell ist noch keine neue Ausfahrt geplant.
      </p>
    </div>
  )
}
