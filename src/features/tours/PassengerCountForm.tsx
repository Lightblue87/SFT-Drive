import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { RegistrationResult } from '@/types/tour'
import { rpcErrorMessage } from '@/types/tour'

interface Props {
  tourId: string
  /** Beifahrer-Anzahl gemäß `tour_registrations.passenger_count` (CLAUDE.md §9.8: 0 = Fahrer allein). */
  initialCount: number
  onUpdated: () => void
}

/**
 * Änderung der Personenzahl bis zur Admin-Deadline (siehe CLAUDE.md §9.8).
 *
 * Angezeigt/bearbeitet wird die Gesamtpersonenzahl inklusive Fahrer (nie
 * unter 1), das gespeicherte `passenger_count`-Feld bleibt weiterhin die
 * reine Beifahrerzahl (Gesamt − 1).
 */
export function PassengerCountForm({ tourId, initialCount, onUpdated }: Props) {
  const [total, setTotal] = useState(String(initialCount + 1))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    setSubmitting(true)

    const { data, error: rpcError } = await supabase.rpc('update_passenger_count', {
      p_tour_id: tourId,
      p_passenger_count: Number(total) - 1,
    })

    setSubmitting(false)

    if (rpcError) {
      setError('Änderung fehlgeschlagen.')
      return
    }

    const result = data as RegistrationResult
    if (result.code !== 'OK') {
      setError(rpcErrorMessage(result.code))
      return
    }

    setSaved(true)
    onUpdated()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center justify-between rounded-xl border border-white/9 bg-sft-card px-3.5 py-3.5"
    >
      <div>
        <div className="text-[13px] font-medium">Personen im Fahrzeug</div>
        <div className="mt-0.5 font-mono text-[10px] text-sft-gray-dim">INKL. FAHRER</div>
        {saved && <div className="mt-1 font-mono text-[10px] text-sft-gray">GESPEICHERT</div>}
        {error && <div className="mt-1 font-mono text-[10px] text-sft-red">{error}</div>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setTotal((n) => String(Math.max(1, Number(n) - 1)))}
          className="tap-scale h-8 w-8 rounded-lg border border-white/14 bg-sft-surface2 font-mono text-base text-sft-white"
        >
          −
        </button>
        <span className="min-w-[16px] text-center font-mono text-base font-bold">{total}</span>
        <button
          type="button"
          onClick={() => setTotal((n) => String(Number(n) + 1))}
          className="tap-scale h-8 w-8 rounded-lg border border-white/14 bg-sft-surface2 font-mono text-base text-sft-white"
        >
          +
        </button>
        <button
          type="submit"
          disabled={submitting || total === String(initialCount + 1)}
          className="tap-scale rounded-lg border border-white/13 bg-[#17171b] px-3 py-2 text-xs font-medium text-sft-white disabled:opacity-40"
        >
          Speichern
        </button>
      </div>
    </form>
  )
}
