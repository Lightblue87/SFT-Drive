/**
 * Eigene aktuelle/zukünftige Touranmeldungen, gruppiert nach Status
 * (siehe CLAUDE.md §21.2). TODO: an `tour_registrations` anbinden.
 */
export function ProfileToursPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold">Meine Touren</h1>
      <p className="mt-4 text-sm text-sft-gray">Du bist aktuell zu keiner Tour angemeldet.</p>
    </div>
  )
}
