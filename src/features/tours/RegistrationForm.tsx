import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import type { Tour, RegistrationResult } from '@/types/tour'
import { rpcErrorMessage } from '@/types/tour'
import type { Vehicle } from '@/types/vehicle'

interface Props {
  tour: Tour
  onRegistered: () => void
  /**
   * War die vorherige Registrierung `rejected`, erzwingt die RPC unabhängig
   * vom Bestätigungsmodus wieder `pending` (eine Admin-Ablehnung wiegt
   * schwerer als der Automatik-Modus) — der Button-Text muss das widerspiegeln.
   */
  wasRejected?: boolean
}

const fieldLabel = 'font-mono text-[9px] font-medium tracking-[0.2em] text-sft-gray-dim'
const fieldInput =
  'mt-2 w-full rounded-xl border border-white/12 bg-sft-card px-3.5 py-3.5 text-[15px] text-sft-white outline-none focus:border-sft-red/60'

/**
 * Fahrzeugbezogenes Anmeldeformular (siehe CLAUDE.md §14.3). Die eigentliche
 * Kapazitäts-/Anforderungsprüfung passiert ausschließlich serverseitig in
 * `register_for_tour` — dieses Formular validiert nur oberflächlich für UX.
 */
export function RegistrationForm({ tour, onRegistered, wasRejected }: Props) {
  const { user } = useAuth()
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [power, setPower] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  // Gesamtpersonenzahl inklusive Fahrer (nie unter 1) — beim Absenden in
  // die vom Backend erwartete Beifahrerzahl umgerechnet (CLAUDE.md §9.8).
  const [totalPersons, setTotalPersons] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Existiert eine Altersanforderung und ist kein Geburtsdatum im Profil
  // gespeichert, muss es hier ergänzt werden (siehe CLAUDE.md §14.3, §6).
  const [needsDateOfBirth, setNeedsDateOfBirth] = useState(false)
  const [dateOfBirth, setDateOfBirth] = useState('')

  // Persönliche Fahrzeuggarage (§34.2): reine Komfortfunktion zum Vorbefüllen
  // des Formulars — die Anmeldung speichert weiterhin einen unabhängigen
  // Snapshot, nie eine Referenz auf vehicles.id.
  const [savedVehicles, setSavedVehicles] = useState<Vehicle[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('vehicles')
      .select('*')
      .order('is_default', { ascending: false })
      .order('manufacturer', { ascending: true })
      .then(({ data }) => {
        const vehicles = (data as Vehicle[]) ?? []
        setSavedVehicles(vehicles)
        const preferred = vehicles.find((v) => v.is_default) ?? vehicles[0]
        if (preferred) applyVehicle(preferred)
      })
  }, [user])

  function applyVehicle(v: Vehicle) {
    setManufacturer(v.manufacturer)
    setModel(v.model)
    setPower(String(v.power_ps))
    setLicensePlate(v.license_plate ?? '')
    setSelectedVehicleId(v.id)
  }

  useEffect(() => {
    if (!tour.min_driver_age || !user) return

    supabase
      .from('profiles')
      .select('date_of_birth')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!data?.date_of_birth) setNeedsDateOfBirth(true)
      })
  }, [tour.min_driver_age, user])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    if (needsDateOfBirth) {
      if (!dateOfBirth) {
        setError('Bitte gib dein Geburtsdatum an.')
        setSubmitting(false)
        return
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ date_of_birth: dateOfBirth })
        .eq('id', user!.id)

      if (profileError) {
        setError('Geburtsdatum konnte nicht gespeichert werden.')
        setSubmitting(false)
        return
      }
    }

    const { data, error: rpcError } = await supabase.rpc('register_for_tour', {
      p_tour_id: tour.id,
      p_vehicle_manufacturer: manufacturer,
      p_vehicle_model: model,
      p_vehicle_power_ps: Number(power),
      p_license_plate: licensePlate || null,
      p_passenger_count: totalPersons - 1,
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

  const submitLabel =
    // "Verbindlich anmelden" ist bewusst so formuliert (CLAUDE.md §14.3): die
    // Anmeldung im Automatikmodus ist verbindlich, nicht bloß ein Absenden.
    !wasRejected && tour.confirmation_mode === 'automatic' ? 'Verbindlich anmelden' : 'Teilnahme anfragen'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {wasRejected && (
        <div className="rounded-xl border border-white/9 bg-sft-card px-3.5 py-3.5 text-[13px] leading-relaxed text-sft-gray">
          Deine vorherige Anfrage für diese Tour wurde abgelehnt. Eine Neuanmeldung muss erneut vom
          Admin bestätigt werden.
        </div>
      )}

      {savedVehicles.length > 0 && (
        <div>
          <span className={fieldLabel}>FAHRZEUG AUS DEINER GARAGE</span>
          <div className="mt-2 flex flex-col gap-2">
            {savedVehicles.map((v) => {
              const active = selectedVehicleId === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => applyVehicle(v)}
                  className={`tap-scale flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
                    active ? 'border-sft-red/55 bg-sft-red/8' : 'border-white/9 bg-sft-card'
                  }`}
                >
                  <span
                    className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-2 ${
                      active ? 'border-sft-red' : 'border-white/22'
                    }`}
                  >
                    {active && <span className="h-2 w-2 rounded-full bg-sft-red" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">
                      {v.manufacturer} {v.model}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] text-sft-gray">
                      {v.license_plate ?? '—'}
                    </span>
                  </span>
                  <span className="font-mono text-[16px] font-bold">
                    {v.power_ps}
                    <span className="text-[9px] text-sft-gray"> PS</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <label>
        <span className={fieldLabel}>HERSTELLER *</span>
        <input
          required
          value={manufacturer}
          onChange={(e) => {
            setManufacturer(e.target.value)
            setSelectedVehicleId(null)
          }}
          placeholder="Porsche"
          className={fieldInput}
        />
      </label>

      <label>
        <span className={fieldLabel}>MODELL *</span>
        <input
          required
          value={model}
          onChange={(e) => {
            setModel(e.target.value)
            setSelectedVehicleId(null)
          }}
          placeholder="911 Carrera S"
          className={fieldInput}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className={fieldLabel}>LEISTUNG (PS) *</span>
          <input
            required
            type="number"
            min={1}
            inputMode="numeric"
            value={power}
            onChange={(e) => {
              setPower(e.target.value)
              setSelectedVehicleId(null)
            }}
            placeholder="450"
            className={`${fieldInput} font-mono font-semibold`}
          />
        </label>

        <label>
          <span className={fieldLabel}>
            KENNZEICHEN {tour.license_plate_required ? '*' : '(OPTIONAL)'}
          </span>
          <input
            required={tour.license_plate_required}
            value={licensePlate}
            onChange={(e) => {
              setLicensePlate(e.target.value.toUpperCase())
              setSelectedVehicleId(null)
            }}
            placeholder="KA-SF 911"
            className={`${fieldInput} font-mono font-semibold tracking-wide`}
          />
        </label>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/9 bg-sft-card px-3.5 py-3.5">
        <div>
          <div className="text-[14px] font-medium">Personen im Fahrzeug</div>
          <div className="mt-1 font-mono text-[11px] text-sft-gray">INKL. FAHRER</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTotalPersons((n) => Math.max(1, n - 1))}
            className="tap-scale h-9 w-9 rounded-lg border border-white/14 bg-sft-surface2 font-mono text-lg text-sft-white"
          >
            −
          </button>
          <span className="min-w-[20px] text-center font-mono text-lg font-bold">{totalPersons}</span>
          <button
            type="button"
            onClick={() => setTotalPersons((n) => n + 1)}
            className="tap-scale h-9 w-9 rounded-lg border border-white/14 bg-sft-surface2 font-mono text-lg text-sft-white"
          >
            +
          </button>
        </div>
      </div>

      {needsDateOfBirth && (
        <label className="min-w-0 block">
          <span className={fieldLabel}>GEBURTSDATUM * · FÜR MINDESTALTER</span>
          <input
            required
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={`${fieldInput} font-mono`}
          />
        </label>
      )}

      {/*
        Der Hinweis zum Bestätigungsmodus muss immer erscheinen, auch wenn die
        Tour gar keine Fahrzeug-/Fahreranforderungen besitzt — sonst weiß der
        User nicht, ob seine Anmeldung sofort gilt (CLAUDE.md §14.3).
      */}
      <div className="rounded-xl border border-sft-amber/30 bg-sft-amber/[0.07] px-3.5 py-3.5 text-xs leading-relaxed text-[#e6c07a]">
        {[
          tour.min_power_ps != null ? `Mindestleistung ${tour.min_power_ps} PS` : null,
          tour.max_power_ps != null ? `Maximalleistung ${tour.max_power_ps} PS` : null,
          tour.min_driver_age != null ? `Mindestalter ${tour.min_driver_age} Jahre` : null,
          !wasRejected && tour.confirmation_mode === 'automatic'
            ? 'Bestätigung erfolgt automatisch, solange Plätze frei sind.'
            : 'Die Tourleitung prüft deine Anfrage manuell.',
        ]
          .filter(Boolean)
          .join(' · ')}
      </div>

      {error && <p className="text-sm text-sft-red">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="tap-scale mt-1 rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-4 text-[16px] font-semibold text-white shadow-[0_12px_26px_-12px_#e10600] disabled:opacity-60"
      >
        {submitting ? 'Wird gesendet…' : submitLabel}
      </button>
    </form>
  )
}
