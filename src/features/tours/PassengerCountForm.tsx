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
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        Beifahrer / zusätzliche Personen
        <input
          type="number"
          min={0}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="w-24 rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sft-surface2 px-3 py-2 text-sm disabled:opacity-60"
      >
        Speichern
      </button>
      {saved && <span className="text-sm text-sft-gray">Gespeichert.</span>}
      {error && <span className="text-sm text-sft-red">{error}</span>}
    </form>
  )
}
