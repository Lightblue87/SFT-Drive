import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { RegistrationResult } from '@/types/tour'
import { rpcErrorMessage } from '@/types/tour'

interface Props {
  tourId: string
  initialCount: number
  onUpdated: () => void
}

/** Änderung der Personenzahl bis zur Admin-Deadline (siehe CLAUDE.md §9.8). */
export function PassengerCountForm({ tourId, initialCount, onUpdated }: Props) {
  const [count, setCount] = useState(String(initialCount))
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
      p_passenger_count: Number(count),
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
        {saved && <div className="mt-1 font-mono text-[10px] text-sft-gray">GESPEICHERT</div>}
        {error && <div className="mt-1 font-mono text-[10px] text-sft-red">{error}</div>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCount((n) => String(Math.max(0, Number(n) - 1)))}
          className="tap-scale h-8 w-8 rounded-lg border border-white/14 bg-sft-surface2 font-mono text-base text-sft-white"
        >
          −
        </button>
        <span className="min-w-[16px] text-center font-mono text-base font-bold">{count}</span>
        <button
          type="button"
          onClick={() => setCount((n) => String(Math.min(4, Number(n) + 1)))}
          className="tap-scale h-8 w-8 rounded-lg border border-white/14 bg-sft-surface2 font-mono text-base text-sft-white"
        >
          +
        </button>
        <button
          type="submit"
          disabled={submitting || count === String(initialCount)}
          className="tap-scale rounded-lg border border-white/13 bg-[#17171b] px-3 py-2 text-xs font-medium text-sft-white disabled:opacity-40"
        >
          Speichern
        </button>
      </div>
    </form>
  )
}
