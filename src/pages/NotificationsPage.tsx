import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useNotifications } from '@/features/notifications/useNotifications'
import { PageLoading } from '@/components/PageLoading'
import { SwipeToDelete } from '@/components/SwipeToDelete'
import { RegionNotificationPreferences } from '@/features/notifications/RegionNotificationPreferences'
import { formatDate, formatTime } from '@/utils/date'
import type { AppNotification } from '@/types/notification'

/** In-App Notification Center (siehe CLAUDE.md §27.13). */
export function NotificationsPage() {
  const { notifications, loading, reload } = useNotifications()
  const navigate = useNavigate()
  const [showRegionSettings, setShowRegionSettings] = useState(false)

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
        <div className="flex-1 text-[22px] font-semibold leading-none">Mitteilungen</div>
        <button
          onClick={() => setShowRegionSettings((v) => !v)}
          className={`tap-scale flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] border ${
            showRegionSettings ? 'border-sft-red/50 bg-sft-red/10' : 'border-white/10 bg-[#131316]'
          }`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
              stroke={showRegionSettings ? '#f01a12' : '#c9c9ce'}
              strokeWidth="1.8"
            />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
              stroke={showRegionSettings ? '#f01a12' : '#c9c9ce'}
              strokeWidth="1.8"
            />
          </svg>
        </button>
      </div>

      {showRegionSettings && (
        <div className="px-[18px] pb-4">
          <RegionNotificationPreferences />
          <button
            onClick={() => setShowRegionSettings(false)}
            className="tap-scale mt-2.5 w-full rounded-xl border border-white/12 py-2.5 text-[13px] font-medium text-sft-gray"
          >
            Fertig
          </button>
        </div>
      )}

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
