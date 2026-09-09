import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

/** Web Push public key ist base64url — PushManager.subscribe() braucht ein Uint8Array. */
function urlBase64ToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

export type PushSupportState = 'unsupported' | 'denied' | 'granted' | 'default'

/**
 * Push-Subscription-Verwaltung (siehe CLAUDE.md §27.15, §27.16). Fragt die
 * Berechtigung erst nach einer klaren User-Aktion an, niemals automatisch
 * beim App-Start — Push bleibt jederzeit ablehnbar, ohne die App-Nutzung
 * einzuschränken.
 */
export function usePushSubscription() {
  const { user } = useAuth()
  const [permission, setPermission] = useState<PushSupportState>('default')
  // Erteilte Berechtigung heißt noch nicht, dass wirklich eine Subscription
  // existiert und in der DB liegt (Upsert kann fehlschlagen, Subscription kann
  // vom Browser verworfen werden). Beides deshalb getrennt führen, sonst
  // meldet die Oberfläche "aktiv", ohne dass je ein Push ankäme.
  const [subscriptionActive, setSubscriptionActive] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as PushSupportState)

    if (Notification.permission !== 'granted' || !user) return

    let cancelled = false
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then(async (subscription) => {
        if (cancelled || !subscription) return
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('endpoint', subscription.endpoint)
          .maybeSingle()
        if (!cancelled) setSubscriptionActive(Boolean(data))
      })
      .catch(() => {
        /* Kein Push verfügbar — die App bleibt vollständig nutzbar (§27.16). */
      })

    return () => {
      cancelled = true
    }
  }, [user])

  const subscribe = useCallback(async () => {
    if (!user || permission === 'unsupported' || !VAPID_PUBLIC_KEY) return
    setError(null)
    setSubscribing(true)

    try {
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult as PushSupportState)
      if (permissionResult !== 'granted') return

      const registration = await navigator.serviceWorker.ready

      // Eine Push-Subscription (inkl. `endpoint`) gehört zu Browser/Gerät,
      // nicht zum eingeloggten Account. War auf diesem Gerät zuvor ein
      // anderer User angemeldet und hat Push aktiviert, liefert der Browser
      // beim erneuten subscribe() sonst denselben endpoint zurück — der
      // Upsert unten schlägt dann an der RLS-Policy ab (§27.15: nur eigene
      // Subscription), weil die Zeile noch dem alten User gehört. Erst
      // abmelden erzwingt einen neuen, garantiert eindeutigen endpoint.
      const existing = await registration.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })

      const json = subscription.toJSON()
      const { error: dbError } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      )
      if (dbError) {
        setError('Push konnte nicht aktiviert werden. Bitte versuche es erneut.')
        return
      }
      setSubscriptionActive(true)
    } catch {
      setError('Push konnte nicht aktiviert werden. Bitte versuche es erneut.')
    } finally {
      setSubscribing(false)
    }
  }, [user, permission])

  return { permission, subscriptionActive, subscribing, error, subscribe }
}
