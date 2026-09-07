import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tour, RegistrationResult } from '@/types/tour'
import { rpcErrorMessage } from '@/types/tour'

interface Props {
  tour: Tour
  onRegistered: () => void
}

/**
 * Fahrzeugbezogenes Anmeldeformular (siehe CLAUDE.md §14.3). Die eigentliche
 * Kapazitäts-/Anforderungsprüfung passiert ausschließlich serverseitig in
 * `register_for_tour` — dieses Formular validiert nur oberflächlich für UX.
 */
export function RegistrationForm({ tour, onRegistered }: Props) {
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [power, setPower] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [passengerCount, setPassengerCount] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const { data, error: rpcError } = await supabase.rpc('register_for_tour', {
      p_tour_id: tour.id,
      p_vehicle_manufacturer: manufacturer,
      p_vehicle_model: model,
      p_vehicle_power_ps: Number(power),
      p_license_plate: licensePlate || null,
      p_passenger_count: Number(passengerCount),
    })

    setSubmitting(false)

    if (rpcError) {
      setError('Anmeldung fehlgeschlagen. Bitte versuche es erneut.')
      return
    }

    const result = data as RegistrationResult
    if (!['CONFIRMED', 'PENDING_APPROVAL', 'WAITLISTED'].includes(result.code)) {
      setError(rpcErrorMessage(result.code))
      return
    }

    onRegistered()
  }

  const submitLabel = tour.confirmation_mode === 'automatic' ? 'Verbindlich anmelden' : 'Teilnahme anfragen'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Hersteller *
        <input
          required
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          className="rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Modell *
        <input
          required
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Leistung in PS *
        <input
          required
          type="number"
          min={1}
          value={power}
          onChange={(e) => setPower(e.target.value)}
          className="rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Kennzeichen {tour.license_plate_required ? '*' : '(optional)'}
        <input
          required={tour.license_plate_required}
          value={licensePlate}
          onChange={(e) => setLicensePlate(e.target.value)}
          className="rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Anzahl Beifahrer / zusätzliche Personen
        <input
          type="number"
          min={0}
          value={passengerCount}
          onChange={(e) => setPassengerCount(e.target.value)}
          className="rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
        />
      </label>

      {error && <p className="text-sm text-sft-red">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-sft-red px-4 py-2.5 font-medium text-sft-white disabled:opacity-60"
      >
        {submitting ? 'Wird gesendet…' : submitLabel}
      </button>
    </form>
  )
}
