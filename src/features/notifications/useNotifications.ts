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

  // Eine installierte PWA wird beim Sperren/Entsperren des Displays meist
  // nicht neu geladen (kein Remount, kein erneuter Mount-Effect) -- ohne
  // diesen Listener bleibt die Liste auf dem Stand vor dem Wegklicken
  // stehen, auch wenn zwischenzeitlich (z. B. während das Handy aus war)
  // neue Mitteilungen in der Datenbank entstanden sind. Die In-App-
  // Mitteilung existiert dort bereits zuverlässig (§27.16), sie muss nur
  // beim Zurückkehren tatsächlich nachgeladen werden.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [reload])

  const unreadCount = notifications.filter((n) => !n.read_at).length

  return { notifications, unreadCount, loading, reload }
}
