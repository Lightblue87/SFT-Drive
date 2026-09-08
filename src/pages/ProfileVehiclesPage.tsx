import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import { BottomSheet } from '@/components/BottomSheet'
import type { Vehicle } from '@/types/vehicle'

interface FormState {
  manufacturer: string
  model: string
  power_ps: string
  license_plate: string
  is_default: boolean
}

const EMPTY_FORM: FormState = { manufacturer: '', model: '', power_ps: '', license_plate: '', is_default: false }

const fieldLabel = 'font-mono text-[9px] font-medium tracking-[0.2em] text-sft-gray-dim'
const fieldInput =
  'mt-2 w-full rounded-xl border border-white/12 bg-sft-card px-3.5 py-3.5 text-[16px] text-sft-white outline-none focus:border-sft-red/60'

/**
 * Persönliche Fahrzeuggarage (siehe CLAUDE.md §34.2). Reine Komfortfunktion:
 * beim Anmelden zu einer Tour wird ein hier gespeichertes Fahrzeug nur als
 * Ausgangswert für das Anmeldeformular verwendet — die eigentliche Anmeldung
 * speichert weiterhin einen unabhängigen Snapshot in `tour_registrations`
 * (§8.11), spätere Änderungen hier wirken sich nicht auf vergangene
 * Anmeldungen aus. Reines Self-Service-CRUD über RLS, keine RPC nötig.
 */
export function ProfileVehiclesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .order('is_default', { ascending: false })
      .order('manufacturer', { ascending: true })
    setVehicles((data as Vehicle[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
    setSheetOpen(true)
  }

  function openEdit(v: Vehicle) {
    setEditingId(v.id)
    setForm({
      manufacturer: v.manufacturer,
      model: v.model,
      power_ps: String(v.power_ps),
      license_plate: v.license_plate ?? '',
      is_default: v.is_default,
    })
    setError(null)
    setSheetOpen(true)
  }

  async function save() {
    setError(null)
    if (!user) return
    if (!form.manufacturer.trim() || !form.model.trim() || !form.power_ps) {
      setError('Hersteller, Modell und Leistung sind Pflichtfelder.')
      return
    }

    setSaving(true)
    const payload = {
      user_id: user.id,
      manufacturer: form.manufacturer.trim(),
      model: form.model.trim(),
      power_ps: Number(form.power_ps),
      license_plate: form.license_plate.trim() || null,
      is_default: form.is_default,
      updated_at: new Date().toISOString(),
    }

    const { error: dbError } = editingId
      ? await supabase.from('vehicles').update(payload).eq('id', editingId)
      : await supabase.from('vehicles').insert(payload)
    setSaving(false)

    if (dbError) {
      setError('Fahrzeug konnte nicht gespeichert werden.')
      return
    }

    setSheetOpen(false)
    load()
  }

  /**
   * Ein DB-Trigger sorgt dafür, dass pro User genau ein Standardfahrzeug
   * bestehen bleibt (§34.2) — hier reicht deshalb das Setzen des Flags.
   */
  async function makeDefault(id: string) {
    await supabase
      .from('vehicles')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', id)
    load()
  }

  async function remove() {
    if (!editingId) return
    await supabase.from('vehicles').delete().eq('id', editingId)
    setSheetOpen(false)
    load()
  }

  if (loading) return <PageLoading />

  return (
    <div className="pb-[110px]">
      <div className="flex items-center gap-3 px-4 pb-4 pt-1.5">
        <button
          onClick={() => navigate('/profile')}
          className="tap-scale flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] border border-white/10 bg-[#131316]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M15 4 7 12l8 8" stroke="#f5f5f5" strokeWidth="2" />
          </svg>
        </button>
        <div className="text-[22px] font-semibold leading-none">Meine Fahrzeuge</div>
      </div>

      <div className="flex flex-col gap-2.5 px-3.5">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className={`rounded-[15px] border ${
              v.is_default ? 'border-sft-red/45' : 'border-white/8'
            } bg-sft-card`}
          >
            <button
              onClick={() => openEdit(v)}
              className="tap-scale flex w-full items-center gap-3.5 p-3.5 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold leading-tight">
                  {v.manufacturer} {v.model}
                </div>
                <div className="mt-1.5 font-mono text-[11px] text-sft-gray">
                  {v.license_plate ?? '—'}
                  {v.is_default && ' · STANDARD'}
                </div>
              </div>
              <div className="flex-none text-right">
                <div className="font-mono text-[26px] font-bold leading-none">{v.power_ps}</div>
                <div className="mt-1 font-mono text-[9px] tracking-[0.16em] text-sft-gray-dim">PS</div>
              </div>
            </button>
            {/*
              Eigener Button außerhalb des Bearbeiten-Buttons: als reines
              <span> darin sah die Aktion klickbar aus, öffnete aber nur das
              Bearbeiten-Sheet (verschachtelte Buttons sind zudem ungültig).
            */}
            {!v.is_default && (
              <button
                onClick={() => makeDefault(v.id)}
                className="tap-scale w-full border-t border-white/8 px-3.5 py-2.5 text-left font-mono text-[9px] font-bold tracking-[0.12em] text-sft-gray"
              >
                ALS STANDARD FESTLEGEN
              </button>
            )}
          </div>
        ))}

        {vehicles.length === 0 && (
          <p className="px-1 text-sm text-sft-gray">Noch keine Fahrzeuge gespeichert.</p>
        )}

        <p className="px-1 pt-1 font-mono text-[11px] leading-relaxed text-[#8a8a92]">
          FAHRZEUG ANTIPPEN ZUM BEARBEITEN ODER LÖSCHEN. DAS STANDARDFAHRZEUG WIRD BEI DER
          TOURANMELDUNG VORAUSGEWÄHLT.
        </p>

        <button
          onClick={openAdd}
          className="tap-scale mt-1.5 rounded-2xl border border-dashed border-white/18 py-[15px] text-[14px] font-medium"
        >
          + Fahrzeug hinzufügen
        </button>
      </div>

      {sheetOpen && (
        <BottomSheet
          title={editingId ? 'Fahrzeug bearbeiten' : 'Fahrzeug hinzufügen'}
          subtitle="LANDET IN DEINER GARAGE"
          onClose={() => setSheetOpen(false)}
        >
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-[11px]">
              <label>
                <span className={fieldLabel}>HERSTELLER *</span>
                <input
                  value={form.manufacturer}
                  onChange={(e) => set('manufacturer', e.target.value)}
                  placeholder="Porsche"
                  className={fieldInput}
                />
              </label>
              <label>
                <span className={fieldLabel}>MODELL *</span>
                <input
                  value={form.model}
                  onChange={(e) => set('model', e.target.value)}
                  placeholder="718 Cayman S"
                  className={fieldInput}
                />
              </label>
            </div>

            <label>
              <span className={fieldLabel}>LEISTUNG (PS) *</span>
              <input
                type="number"
                min={1}
                value={form.power_ps}
                onChange={(e) => set('power_ps', e.target.value)}
                placeholder="350"
                className={`${fieldInput} font-mono font-bold`}
              />
            </label>

            <label>
              <span className={fieldLabel}>KENNZEICHEN</span>
              <input
                value={form.license_plate}
                onChange={(e) => set('license_plate', e.target.value.toUpperCase())}
                placeholder="KA-SF 718"
                className={`${fieldInput} font-mono font-semibold tracking-wide`}
              />
              <span className="mt-2 block text-[11px] leading-relaxed text-[#8e8e96]">
                Nur für die Tourleitung sichtbar. Bei Touren mit Kennzeichenpflicht wird es benötigt.
              </span>
            </label>

            <button
              type="button"
              onClick={() => set('is_default', !form.is_default)}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/9 bg-sft-card px-3.5 py-3.5 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Als Standardfahrzeug</span>
                <span className="mt-1 block text-[11px] leading-relaxed text-sft-gray">
                  Wird bei der Anmeldung vorausgewählt
                </span>
              </span>
              <span
                className={`relative h-7 w-[46px] flex-none rounded-full ${form.is_default ? 'bg-sft-red' : 'bg-white/14'}`}
              >
                <span
                  className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-[left] ${
                    form.is_default ? 'left-[21px]' : 'left-[3px]'
                  }`}
                />
              </span>
            </button>

            {error && (
              <p className="rounded-xl border border-sft-red/40 bg-sft-red/8 px-3.5 py-3 text-[12px] font-medium text-[#ff8b84]">
                {error}
              </p>
            )}

            <button
              onClick={save}
              disabled={saving}
              className="tap-scale mt-1 rounded-2xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-4 text-[16px] font-semibold text-white shadow-[0_12px_26px_-12px_#e10600] disabled:opacity-60"
            >
              {saving ? 'Wird gespeichert…' : 'Fahrzeug speichern'}
            </button>

            {editingId && (
              <button
                onClick={remove}
                className="rounded-xl border border-sft-red/40 py-3 text-[13px] font-medium text-[#ff6b63]"
              >
                Fahrzeug löschen
              </button>
            )}
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
