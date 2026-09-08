import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  tourId: string
  registrationOpenAt: string
}

/**
 * Vormerkung vor Öffnung der Touranmeldung (siehe CLAUDE.md §35.3).
 * Reserviert ausdrücklich keinen Fahrzeugplatz und zählt nicht gegen
 * `max_vehicles` — reines "Informiere mich, sobald die Anmeldung öffnet".
 * Self-Service über RLS (kein RPC nötig); die Voraussetzungen (Tour
 * veröffentlicht, Anmeldung noch nicht offen) prüft serverseitig ein
 * Trigger auf `tour_interests`.
 */
export function TourInterestButton({ tourId, registrationOpenAt }: Props) {
  const [interested, setInterested] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('tour_interests')
      .select('id')
      .eq('tour_id', tourId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setInterested(Boolean(data))
      })
    return () => {
      cancelled = true
    }
  }, [tourId])

  async function toggle() {
    setSubmitting(true)
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) {
      setSubmitting(false)
      return
    }

    if (interested) {
      await supabase.from('tour_interests').delete().eq('tour_id', tourId).eq('user_id', userId)
      setInterested(false)
    } else {
      const { error } = await supabase.from('tour_interests').insert({ tour_id: tourId, user_id: userId })
      if (!error) setInterested(true)
    }
    setSubmitting(false)
  }

  if (interested === null) return null

  return (
    <div className="rounded-md bg-sft-surface p-4 text-sm">
      <p>
        Anmeldung öffnet am{' '}
        {new Date(registrationOpenAt).toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>

      {interested ? (
        <>
          <p className="mt-2 text-sft-red">★ Für diese Tour vorgemerkt</p>
          <p className="text-sft-gray">Du wirst benachrichtigt, sobald die Anmeldung öffnet.</p>
          <button onClick={toggle} disabled={submitting} className="mt-2 text-xs underline disabled:opacity-60">
            Vormerkung entfernen
          </button>
        </>
      ) : (
        <button
          onClick={toggle}
          disabled={submitting}
          className="mt-2 w-full rounded-md bg-sft-red px-4 py-2.5 font-medium disabled:opacity-60"
        >
          Für diese Tour vormerken
        </button>
      )}
    </div>
  )
}
