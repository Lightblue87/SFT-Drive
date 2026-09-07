import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useNotifications } from '@/features/notifications/useNotifications'
import { PageLoading } from '@/components/PageLoading'
import { SwipeToDelete } from '@/components/SwipeToDelete'
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
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold">Mitteilungen</h1>

      {notifications.length === 0 ? (
        <p className="mt-4 text-sm text-sft-gray">Noch keine Mitteilungen.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <SwipeToDelete onDelete={() => remove(n.id)}>
                <button
                  onClick={() => open(n)}
                  className="flex w-full items-start gap-2 p-3 text-left text-sm"
                >
                  {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sft-red" />}
                  <div className={n.read_at ? 'text-sft-gray' : undefined}>
                    <div className="font-medium text-sft-white">{n.title}</div>
                    <div className="text-sft-gray">{n.body}</div>
                  </div>
                </button>
              </SwipeToDelete>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
