import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/** Sichtbarer Hinweis bei echtem Verbindungsverlust (siehe CLAUDE.md §16, §18). */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="bg-sft-red px-4 py-2 text-center text-sm font-medium text-sft-white">
      Keine Internetverbindung. Manche Inhalte sind eventuell nicht aktuell.
    </div>
  )
}
