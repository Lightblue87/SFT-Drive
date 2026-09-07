export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-sft-surface2 border-t-sft-red motion-reduce:animate-none"
        role="status"
        aria-label="Lädt"
      />
    </div>
  )
}
