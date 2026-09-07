import { Link } from 'react-router-dom'
import { useNotifications } from '@/features/notifications/useNotifications'

/** Glocke mit Badge im Header (siehe CLAUDE.md §27.13). */
export function NotificationBell() {
  const { unreadCount } = useNotifications()

  return (
    <Link to="/notifications" className="relative rounded-full bg-sft-surface p-2" aria-label="Mitteilungen">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
        />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sft-red px-1 text-[10px] font-medium text-sft-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
