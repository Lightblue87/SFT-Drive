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
      <div className="mt-3.5 rounded-2xl border border-[#2fa88a]/35 bg-[#2fa88a]/[0.08] px-4 py-3.5">
        <div className="font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">CHECK-IN</div>
        <div className="mt-1.5 text-[15px] font-semibold text-[#5fd3b4]">✓ Eingecheckt</div>
        <div className="mt-1 font-mono text-[11px] text-sft-gray">
          BESTÄTIGT UM{' '}
          {new Date(checkedInAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} UHR
        </div>
      </div>
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
    <div className="mt-3.5 overflow-hidden rounded-2xl border border-sft-red/35 bg-gradient-to-b from-[#1a1215] to-[#0f0e11]">
      <div className="px-4 py-3.5">
        <div className="font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">CHECK-IN</div>
        <div className="mt-1.5 text-[15px] font-semibold">Am Treffpunkt einchecken</div>
        <div className="mt-1 font-mono text-[11px] text-sft-gray">
          FENSTER OFFEN BIS{' '}
          {closesAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} UHR
        </div>
      </div>
      <button
        onClick={handleClick}
        disabled={submitting}
        className="tap-scale w-full border-t border-white/8 py-3.5 text-[15px] font-semibold text-white disabled:opacity-60"
        style={{ background: 'linear-gradient(#f01a12,#c00500)' }}
      >
        {submitting ? 'Wird gesendet…' : '✓ Am Treffpunkt angekommen'}
      </button>
      {error && <p className="px-4 pb-3 text-sm text-sft-red">{error}</p>}
    </div>
  )
}
