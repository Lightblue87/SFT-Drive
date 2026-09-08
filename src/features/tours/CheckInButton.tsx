import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tour, RegistrationResult } from '@/types/tour'
import { rpcErrorMessage } from '@/types/tour'

interface Props {
  tour: Tour
  checkedInAt: string | null
  onCheckedIn: () => void
}

/**
 * Self-Check-in am Treffpunkt (siehe CLAUDE.md §34.3). Das clientseitig
 * berechnete Fenster ist reine UX (Button ein-/ausblenden) — die eigentliche
 * Prüfung von Zeitfenster und Berechtigung passiert ausschließlich
 * serverseitig in `check_in_to_tour`.
 */
export function CheckInButton({ tour, checkedInAt, onCheckedIn }: Props) {
  const [now, setNow] = useState(() => new Date())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(interval)
  }, [])

  if (!tour.check_in_enabled || !tour.meeting_at) return null

  if (checkedInAt) {
    return (
      <p className="text-sm text-sft-red">
        ✓ Angekommen ·{' '}
        {new Date(checkedInAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
      </p>
    )
  }

  const meetingAt = new Date(tour.meeting_at)
  const opensAt = new Date(meetingAt.getTime() - tour.check_in_open_minutes_before * 60_000)
  const closesAt = new Date(meetingAt.getTime() + tour.check_in_close_minutes_after * 60_000)

  if (now < opensAt || now > closesAt) return null

  async function handleClick() {
    setError(null)
    setSubmitting(true)
    const { data, error: rpcError } = await supabase.rpc('check_in_to_tour', { p_tour_id: tour.id })
    setSubmitting(false)

    if (rpcError) {
      setError('Check-in fehlgeschlagen.')
      return
    }

    const result = data as RegistrationResult
    if (result.code !== 'OK') {
      setError(rpcErrorMessage(result.code))
      return
    }

    onCheckedIn()
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={submitting}
        className="rounded-md bg-sft-red px-4 py-3 text-base font-medium disabled:opacity-60"
      >
        ✓ Am Treffpunkt angekommen
      </button>
      {error && <p className="text-sm text-sft-red">{error}</p>}
    </div>
  )
}
