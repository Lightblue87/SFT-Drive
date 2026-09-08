import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import type { Vehicle } from '@/types/vehicle'

interface FormState {
  manufacturer: string
  model: string
  power_ps: string
  license_plate: string
}

const EMPTY_FORM: FormState = { manufacturer: '', model: '', power_ps: '', license_plate: '' }

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
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

  function startEdit(v: Vehicle) {
    setEditingId(v.id)
    setForm({
      manufacturer: v.manufacturer,
      model: v.model,
      power_ps: String(v.power_ps),
      license_plate: v.license_plate ?? '',
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function save() {
    setError(null)
    if (!user) return
    if (!form.manufacturer.trim() || !form.model.trim() || !form.power_ps) {
      setError('Bitte Hersteller, Modell und Leistung angeben.')
      return
    }

    setSaving(true)
    const payload = {
      user_id: user.id,
      manufacturer: form.manufacturer.trim(),
      model: form.model.trim(),
      power_ps: Number(form.power_ps),
      license_plate: form.license_plate.trim() || null,
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

    resetForm()
    load()
  }

  async function remove(id: string) {
    await supabase.from('vehicles').delete().eq('id', id)
    if (editingId === id) resetForm()
    load()
  }

  async function makeDefault(id: string) {
    await supabase
      .from('vehicles')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', id)
    load()
  }

  if (loading) return <PageLoading />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold">Meine Fahrzeuge</h1>
      <p className="mt-1 text-sm text-sft-gray">
        Gespeicherte Fahrzeuge erleichtern das Ausfüllen des Anmeldeformulars. Bei der Anmeldung wird
        immer eine unabhängige Kopie gespeichert — spätere Änderungen hier wirken sich nicht auf
        bereits angemeldete Touren aus.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {vehicles.map((v) => (
          <li key={v.id} className="rounded-md bg-sft-surface p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 font-medium">
                  {v.manufacturer} {v.model}
                  {v.is_default && (
                    <span className="rounded bg-sft-red px-1.5 py-0.5 text-[11px]">Standard</span>
                  )}
                </div>
                <div className="text-sft-gray">
                  {v.power_ps} PS{v.license_plate && ` · ${v.license_plate}`}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="flex gap-2">
                  {!v.is_default && (
                    <button onClick={() => makeDefault(v.id)} className="text-xs underline">
                      Als Standard
                    </button>
                  )}
                  <button onClick={() => startEdit(v)} className="text-xs underline">
                    Bearbeiten
                  </button>
                  <button onClick={() => remove(v.id)} className="text-xs text-sft-red underline">
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
        {vehicles.length === 0 && <p className="text-sm text-sft-gray">Noch keine Fahrzeuge gespeichert.</p>}
      </ul>

      <div className="mt-6 flex flex-col gap-3 rounded-md bg-sft-surface p-4 text-sm">
        <p className="font-medium">{editingId ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug anlegen'}</p>

        <label className="flex flex-col gap-1">
          Hersteller *
          <input
            value={form.manufacturer}
            onChange={(e) => set('manufacturer', e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
          />
        </label>

        <label className="flex flex-col gap-1">
          Modell *
          <input
            value={form.model}
            onChange={(e) => set('model', e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
          />
        </label>

        <label className="flex flex-col gap-1">
          Leistung in PS *
          <input
            type="number"
            min={1}
            value={form.power_ps}
            onChange={(e) => set('power_ps', e.target.value)}
            className="w-32 rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
          />
        </label>

        <label className="flex flex-col gap-1">
          Kennzeichen (optional)
          <input
            value={form.license_plate}
            onChange={(e) => set('license_plate', e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
          />
        </label>

        {error && <p className="text-sft-red">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-sft-red px-4 py-2 font-medium disabled:opacity-60"
          >
            {saving ? 'Wird gespeichert…' : editingId ? 'Speichern' : 'Anlegen'}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="rounded-md border border-sft-surface2 px-4 py-2 text-sft-gray"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
