/**
 * Persönliches Tourenarchiv (siehe CLAUDE.md §8.8, §21.2).
 * TODO: über `get_my_tour_archive()` laden, sobald die RPC existiert.
 */
export function ProfileArchivePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold">Tourenarchiv</h1>
      <p className="mt-4 text-sm text-sft-gray">
        Hier erscheinen deine vergangenen, bestätigten Teilnahmen.
      </p>
    </div>
  )
}
