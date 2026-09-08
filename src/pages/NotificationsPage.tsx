import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useNotifications } from '@/features/notifications/useNotifications'
import { PageLoading } from '@/components/PageLoading'
import { SwipeToDelete } from '@/components/SwipeToDelete'
import { formatDate, formatTime } from '@/utils/date'
import type { AppNotification } from '@/types/notification'

/** In-App Notification Center (siehe CLAUDE.md §27.13). */
export function NotificationsPage() {
  const { notifications, loading, reload } = useNotifications()
  const navigate = useNavigate()

  async function open(notification: AppNotification) {
    if (!notification.read_at) {
      await supabase.rpc('mark_notification_read', { p_id: notification.id })
      reload()
    }
    if (notification.target_path) {
      navigate(notification.target_path)
    }
  }

  async function remove(id: string) {
    await supabase.rpc('delete_notification', { p_id: id })
    reload()
  }

  if (loading) return <PageLoading />

  return (
    <div className="pb-[110px]">
      <div className="flex items-center gap-3 px-4 pb-4 pt-1.5">
        <button
          onClick={() => navigate('/tours')}
          className="tap-scale flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] border border-white/10 bg-[#131316]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M15 4 7 12l8 8" stroke="#f5f5f5" strokeWidth="2" />
          </svg>
        </button>
        <div className="text-[22px] font-semibold leading-none">Mitteilungen</div>
      </div>

      {notifications.length === 0 ? (
        <p className="px-[18px] text-sm text-sft-gray">Noch keine Mitteilungen.</p>
      ) : (
        notifications.map((n) => (
          <SwipeToDelete key={n.id} onDelete={() => remove(n.id)}>
            <button
              onClick={() => open(n)}
              className={`flex w-full items-start gap-3 border-t border-white/7 px-[18px] py-3.5 text-left ${
                n.read_at ? '' : 'bg-sft-red/[0.05]'
              }`}
            >
              <span
                className={`mt-[5px] h-2 w-2 flex-none rounded-sm ${n.read_at ? 'bg-white/20' : 'bg-sft-red'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold leading-tight">{n.title}</div>
                <div className="mt-1.5 text-pretty text-[13px] leading-relaxed text-sft-gray">{n.body}</div>
                <div className="mt-1.5 font-mono text-[10px] tracking-[0.1em] text-[#8a8a92]">
                  {formatDate(n.created_at.slice(0, 10))} · {formatTime(n.created_at)}
                </div>
              </div>
            </button>
          </SwipeToDelete>
        ))
      )}
    </div>
  )
}
