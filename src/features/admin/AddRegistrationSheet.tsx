import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BottomSheet } from '@/components/BottomSheet'
import { rpcErrorMessage } from '@/types/tour'
import type { RegistrationResult } from '@/types/tour'

interface AdminUser {
  id: string
  username: string
  first_name: string
  last_name: string
}

interface Props {
  tourId: string
  tourTitle: string
  onClose: () => void
  onAdded: () => void
}

const fieldLabel = 'font-mono text-[9px] font-medium tracking-[0.2em] text-sft-gray-dim'
const fieldInput =
  'mt-2 w-full rounded-xl border border-white/12 bg-sft-card px-3.5 py-3.5 text-[16px] text-sft-white outline-none focus:border-sft-red/60'

/**
 * Teilnehmer administrativ nachtragen (siehe CLAUDE.md §8.3, §12).
 *
 * Gedacht für den Fall, dass der reguläre Anmeldeschluss vorbei ist und nur
 * noch die Tourleitung jemanden aufnehmen darf. Die Kapazität wird dabei
 * serverseitig weiterhin geprüft: ist die Tour voll, landet der Eintrag auf
 * der Warteliste statt bestätigt zu werden.
 */
export function AddRegistrationSheet({ tourId, tourTitle, onClose, onAdded }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [power, setPower] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [totalPersons, setTotalPersons] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.rpc('admin_list_users').then(({ data }) => setUsers((data as AdminUser[]) ?? []))
  }, [])

  const term = query.trim().toLowerCase()
  const matches = term
    ? users
        .filter((u) =>
          [u.username, u.first_name, u.last_name].some((v) => v?.toLowerCase().includes(term)),
        )
        .slice(0, 6)
    : []

  async function save() {
    setError(null)
    if (!selected) {
      setError('Bitte zuerst einen Nutzer auswählen.')
      return
    }

    setSaving(true)
    const { data, error: rpcError } = await supabase.rpc('admin_add_registration', {
      p_tour_id: tourId,
      p_user_id: selected.id,
      p_vehicle_manufacturer: manufacturer,
      p_vehicle_model: model,
      p_vehicle_power_ps: Number(power),
      p_license_plate: licensePlate || null,
      // Backend erwartet die reine Beifahrerzahl (§9.8).
      p_passenger_count: totalPersons - 1,
    })
    setSaving(false)

    if (rpcError) {
      setError('Teilnehmer konnte nicht hinzugefügt werden.')
      return
    }

    const result = data as RegistrationResult
    if (!['CONFIRMED', 'WAITLISTED'].includes(result.code)) {
      setError(rpcErrorMessage(result.code))
      return
    }

    onAdded()
  }

  return (
    <BottomSheet
      title="Teilnehmer hinzufügen"
      subtitle={tourTitle.toUpperCase()}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3.5">
        <p className="rounded-xl border border-sft-amber/30 bg-sft-amber/[0.07] px-3.5 py-3 text-xs leading-relaxed text-[#e6c07a]">
          Umgeht Anmeldefrist sowie Leistungs- und Altersanforderungen — nicht aber das
          Fahrzeuglimit. Ist die Tour voll, wird der Eintrag auf die Warteliste gesetzt.
        </p>

        <label>
          <span className={fieldLabel}>NUTZER SUCHEN (USERNAME ODER NAME)</span>
          <input
            value={selected ? selected.username : query}
            onChange={(e) => {
              setSelected(null)
              setQuery(e.target.value)
            }}
            placeholder="s4shadow"
            className={fieldInput}
          />
        </label>

        {!selected && matches.length > 0 && (
          <div className="flex flex-col gap-2">
            {matches.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelected(u)}
                className="tap-scale rounded-xl border border-white/9 bg-sft-card px-3.5 py-3 text-left"
              >
                <div className="text-[14px] font-semibold">{u.username}</div>
                <div className="mt-1 font-mono text-[11px] text-sft-gray">
                  {u.first_name} {u.last_name}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className={fieldLabel}>HERSTELLER *</span>
            <input
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="Porsche"
              className={fieldInput}
            />
          </label>
          <label>
            <span className={fieldLabel}>MODELL *</span>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="911"
              className={fieldInput}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className={fieldLabel}>LEISTUNG (PS) *</span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={power}
              onChange={(e) => setPower(e.target.value)}
              placeholder="450"
              className={`${fieldInput} font-mono font-semibold`}
            />
          </label>
          <label>
            <span className={fieldLabel}>KENNZEICHEN</span>
            <input
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
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
              className="tap-scale h-9 w-9 rounded-lg border border-white/14 bg-sft-surface2 font-mono text-lg"
            >
              −
            </button>
            <span className="min-w-[20px] text-center font-mono text-lg font-bold">
              {totalPersons}
            </span>
            <button
              type="button"
              onClick={() => setTotalPersons((n) => n + 1)}
              className="tap-scale h-9 w-9 rounded-lg border border-white/14 bg-sft-surface2 font-mono text-lg"
            >
              +
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-sft-red">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="tap-scale mt-1 rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-4 text-[16px] font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Wird hinzugefügt…' : 'Teilnehmer hinzufügen'}
        </button>
      </div>
    </BottomSheet>
  )
}
