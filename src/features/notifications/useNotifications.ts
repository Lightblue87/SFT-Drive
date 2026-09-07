import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import type { AppNotification } from '@/types/notification'

/**
 * Lädt die eigenen Mitteilungen (siehe CLAUDE.md §27.13/§27.14). RLS sorgt
 * dafür, dass ausschließlich eigene Zeilen zurückkommen — kein Client-Filter
 * auf user_id nötig.
 */
export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data as AppNotification[]) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    reload()
  }, [reload])

  const unreadCount = notifications.filter((n) => !n.read_at).length

  return { notifications, unreadCount, loading, reload }
}
