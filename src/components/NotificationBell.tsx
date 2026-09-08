import { Link } from 'react-router-dom'
import { useNotifications } from '@/features/notifications/useNotifications'

/** Glocke mit Badge im Header (siehe CLAUDE.md §27.13). */
export function NotificationBell() {
  const { unreadCount } = useNotifications()

  return (
    <Link
      to="/notifications"
      className="tap-scale relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-b from-[#17171a] to-[#101013]"
      aria-label="Mitteilungen"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-[18px] w-[18px]">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
        />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-sft-red px-1 font-mono text-[9px] font-bold text-white ring-2 ring-sft-black">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
