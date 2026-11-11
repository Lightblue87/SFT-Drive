import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePushSubscription } from '@/features/notifications/usePushSubscription'

const DISMISSED_KEY = 'sft-drive-push-prompt-dismissed'

/**
 * Einmalige, aktive Aufforderung, Push-Mitteilungen zu aktivieren (CLAUDE.md
 * §27.16). Deckt sowohl frisch registrierte als auch bereits bestehende User
 * ohne aktivierten Push mit demselben Mechanismus ab: sie erscheint für jeden
 * eingeloggten User, solange die Berechtigung noch nicht entschieden ist
 * (`default`) und dieses Gerät sie nicht bereits weggeklickt hat — danach
 * bleibt Push weiterhin jederzeit manuell im Profil aktivierbar.
 *
 * Bewusst nicht beim reinen App-Start (Visitor sieht sie nie, `user` fehlt),
 * sondern erst nach dem Login/der Registrierung als klarer User-Kontext, und
 * der Nutzen wird vor der eigentlichen Browser-Abfrage erklärt.
 */
export function PushPermissionBanner() {
  const { user } = useAuth()
  const { permission, subscribing, error, subscribe } = usePushSubscription()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  if (!user || permission !== 'default' || dismissed) return null

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      /* localStorage kann in seltenen Fällen (Private Mode) fehlschlagen — egal. */
    }
  }

  async function activate() {
    await subscribe()
    dismiss()
  }

  return (
    <div className="mx-3.5 mt-3 flex items-start gap-3 rounded-2xl border border-white/8 bg-sft-card px-4 py-3.5">
      <div className="flex-1">
        <div className="text-sm font-medium">Push-Mitteilungen aktivieren?</div>
        <div className="mt-1 text-xs leading-relaxed text-sft-gray">
          Bleib informiert über Treffpunkt-Änderungen, Absagen und Restaurantbestellungen deiner
          Ausfahrten.
        </div>
        {error && <p className="mt-1 text-xs text-sft-red">{error}</p>}
        <div className="mt-2.5 flex items-center gap-2">
          <button
            onClick={activate}
            disabled={subscribing}
            className="tap-scale rounded-lg bg-sft-red px-3 py-1.5 text-xs font-medium disabled:opacity-60"
          >
            {subscribing ? 'Wird aktiviert…' : 'Aktivieren'}
          </button>
          <button onClick={dismiss} className="tap-scale px-3 py-1.5 text-xs font-medium text-sft-gray">
            Später
          </button>
        </div>
      </div>
    </div>
  )
}
