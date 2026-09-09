import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import { TOUR_STOP_TYPE_LABELS, type TourStop, type TourStopType } from '@/types/tourStop'

const STOP_TYPES = Object.keys(TOUR_STOP_TYPE_LABELS) as TourStopType[]

interface FormState {
  type: TourStopType
  title: string
  description: string
  location_name: string
  address: string
  starts_at: string
  sort_order: string
}

const EMPTY_FORM: FormState = {
  type: 'meeting',
  title: '',
  description: '',
  location_name: '',
  address: '',
  starts_at: '',
  sort_order: '0',
}

const fieldLabel = 'font-mono text-[9px] font-medium tracking-[0.2em] text-sft-gray-dim'
const fieldInput =
  'mt-2 w-full rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3 text-[15px] text-sft-white outline-none focus:border-sft-red/60'

/** Datetime-local korrekt lokal statt über UTC-Stringparsing (§19). */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes).toISOString()
}

/** Tour-Stopps verwalten (siehe CLAUDE.md §27.2, §21.4 "/admin/tours/:id/stops"). */
export function AdminTourStopsPage() {
  const { id } = useParams<{ id: string }>()
  const [stops, setStops] = useState<TourStop[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mobile Browser (v. a. iOS Safari) können den Tab beim App-Wechsel jederzeit aus dem
  // Speicher werfen; ohne Zwischenspeicherung geht ein noch nicht gespeicherter Stopp-
  // Entwurf beim Verlassen/Zurückkehren zur Seite verloren (§16). Deshalb wie beim
  // Tourformular lokal sichern und nach einem Neustart wiederherstellen.
  const draftKey = `sft-drive-tour-stop-draft-${id ?? 'new'}`

  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey)
      if (saved) {
        const parsed = JSON.parse(saved) as { editingId: string | null; form: FormState }
        setEditingId(parsed.editingId)
        setForm(parsed.form)
      }
    } catch {
      // localStorage nicht verfügbar oder Entwurf beschädigt — ignorieren.
    }
  }, [draftKey])

  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ editingId, form }))
    } catch {
      // localStorage nicht verfügbar — Entwurfssicherung ist ein reines Komfort-Feature.
    }
  }, [editingId, form, draftKey])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data } = await supabase
      .from('tour_stops')
      .select('*')
      .eq('tour_id', id)
      .order('sort_order', { ascending: true })
    setStops((data as TourStop[]) ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function startEdit(stop: TourStop) {
    setEditingId(stop.id)
    setForm({
      type: stop.type,
      title: stop.title,
      description: stop.description ?? '',
      location_name: stop.location_name ?? '',
      address: stop.address ?? '',
      starts_at: toDatetimeLocal(stop.starts_at),
      sort_order: String(stop.sort_order),
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    try {
      localStorage.removeItem(draftKey)
    } catch {
      // localStorage nicht verfügbar — kein Problem, der Entwurf ist ohnehin verworfen.
    }
  }

  async function save() {
    setError(null)
    if (!id || !form.title.trim()) {
      setError('Bitte einen Titel angeben.')
      return
    }

    setSaving(true)
    const payload = {
      tour_id: id,
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      location_name: form.location_name.trim() || null,
      address: form.address.trim() || null,
      starts_at: fromDatetimeLocal(form.starts_at),
      sort_order: Number(form.sort_order) || 0,
    }

    const { error: dbError } = editingId
      ? await supabase.from('tour_stops').update(payload).eq('id', editingId)
      : await supabase.from('tour_stops').insert(payload)
    setSaving(false)

    if (dbError) {
      setError('Stopp konnte nicht gespeichert werden.')
      return
    }

    resetForm()
    load()
  }

  async function remove(stopId: string) {
    await supabase.from('tour_stops').delete().eq('id', stopId)
    if (editingId === stopId) resetForm()
    load()
  }

  if (loading) return <PageLoading />

  return (
    <div className="pt-3">
      <div className="overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
        <div className="px-4 pb-2.5 pt-3.5 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
          STOPPS DIESER TOUR
        </div>
        {stops.map((stop) => (
          <div key={stop.id} className="flex items-center gap-3 border-t border-white/6 px-4 py-3.5">
            <span className="flex-none rounded-md bg-white/6 px-[7px] py-[4px] font-mono text-[9px] font-bold tracking-[0.1em] text-[#c9c9ce]">
              {TOUR_STOP_TYPE_LABELS[stop.type].toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold">{stop.title}</div>
              <div className="mt-1 font-mono text-[10px] text-sft-gray">
                {stop.starts_at &&
                  new Date(stop.starts_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                {stop.starts_at && stop.location_name && ' · '}
                {stop.location_name}
              </div>
            </div>
            {stop.type === 'restaurant' ? (
              <Link
                to={`/admin/tours/${id}/stops/${stop.id}`}
                className="tap-scale flex-none rounded-[11px] border border-white/13 bg-[#17171b] px-2.5 py-2 text-[11px] font-medium"
              >
                Speisekarte
              </Link>
            ) : (
              <button
                onClick={() => startEdit(stop)}
                className="tap-scale flex-none rounded-[11px] border border-white/13 bg-[#17171b] px-2.5 py-2 text-[11px] font-medium"
              >
                Bearbeiten
              </button>
            )}
          </div>
        ))}
        {stops.length === 0 && <p className="px-4 pb-4 text-sm text-sft-gray">Noch keine Stopps angelegt.</p>}
      </div>

      <div className="mt-3.5 flex flex-col gap-3.5 overflow-hidden rounded-2xl border border-white/9 bg-sft-card p-3.5">
        <p className="text-[13px] font-medium">{editingId ? 'Stopp bearbeiten' : 'Neuen Stopp anlegen'}</p>

        <label className="min-w-0">
          <span className={fieldLabel}>TYP</span>
          <select
            value={form.type}
            onChange={(e) => set('type', e.target.value as TourStopType)}
            className={`${fieldInput} appearance-none font-medium`}
          >
            {STOP_TYPES.map((t) => (
              <option key={t} value={t}>
                {TOUR_STOP_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-0">
          <span className={fieldLabel}>TITEL *</span>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} className={fieldInput} />
        </label>

        <label className="min-w-0">
          <span className={fieldLabel}>ORTSNAME</span>
          <input
            value={form.location_name}
            onChange={(e) => set('location_name', e.target.value)}
            className={fieldInput}
          />
        </label>

        <label className="min-w-0">
          <span className={fieldLabel}>ADRESSE</span>
          <input value={form.address} onChange={(e) => set('address', e.target.value)} className={fieldInput} />
        </label>

        <label className="min-w-0">
          <span className={fieldLabel}>BESCHREIBUNG</span>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            className={`${fieldInput} resize-none leading-relaxed`}
          />
        </label>

        <label className="min-w-0 block">
          <span className={fieldLabel}>UHRZEIT</span>
          <input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => set('starts_at', e.target.value)}
            className={`${fieldInput} font-mono`}
          />
        </label>
        <label className="min-w-0 block">
          <span className={fieldLabel}>REIHENFOLGE</span>
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => set('sort_order', e.target.value)}
            className={`${fieldInput} font-mono`}
          />
        </label>

        {error && <p className="text-sm text-sft-red">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="tap-scale flex-1 rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-3 text-[14px] font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Wird gespeichert…' : editingId ? 'Speichern' : 'Anlegen'}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="rounded-xl border border-white/13 px-4 py-3 text-sft-gray"
            >
              Abbrechen
            </button>
          )}
        </div>
        {editingId && (
          <button
            onClick={() => remove(editingId)}
            className="rounded-xl border border-sft-red/40 py-2.5 text-[13px] font-medium text-[#ff6b63]"
          >
            Stopp löschen
          </button>
        )}
      </div>
    </div>
  )
}
