import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
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
    <div className="py-6">
      <h1 className="text-xl font-semibold">Tour-Stopps</h1>
      <p className="mt-1 text-sm text-sft-gray">
        Nur für bestätigte Teilnehmer dieser Tour sichtbar (Restaurant, Treffpunkt, Tanken, Pause,
        Hotel, Aussichtspunkt).
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {stops.map((stop) => (
          <li key={stop.id} className="rounded-md bg-sft-surface p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">
                  {TOUR_STOP_TYPE_LABELS[stop.type]} · {stop.title}
                </div>
                {stop.location_name && <div className="text-sft-gray">{stop.location_name}</div>}
                {stop.starts_at && (
                  <div className="text-sft-gray">
                    {new Date(stop.starts_at).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => startEdit(stop)} className="text-xs underline">
                  Bearbeiten
                </button>
                <button onClick={() => remove(stop.id)} className="text-xs text-sft-red underline">
                  Löschen
                </button>
              </div>
            </div>
          </li>
        ))}
        {stops.length === 0 && <p className="text-sm text-sft-gray">Noch keine Stopps angelegt.</p>}
      </ul>

      <div className="mt-6 flex flex-col gap-3 rounded-md bg-sft-surface p-4 text-sm">
        <p className="font-medium">{editingId ? 'Stopp bearbeiten' : 'Neuen Stopp anlegen'}</p>

        <label className="flex flex-col gap-1">
          Typ
          <select
            value={form.type}
            onChange={(e) => set('type', e.target.value as TourStopType)}
            className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
          >
            {STOP_TYPES.map((t) => (
              <option key={t} value={t}>
                {TOUR_STOP_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Titel *
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
          />
        </label>

        <label className="flex flex-col gap-1">
          Ortsname
          <input
            value={form.location_name}
            onChange={(e) => set('location_name', e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
          />
        </label>

        <label className="flex flex-col gap-1">
          Adresse
          <input
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
          />
        </label>

        <label className="flex flex-col gap-1">
          Beschreibung
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
          />
        </label>

        <label className="flex flex-col gap-1">
          Uhrzeit
          <input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => set('starts_at', e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
          />
        </label>

        <label className="flex flex-col gap-1">
          Reihenfolge
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => set('sort_order', e.target.value)}
            className="w-24 rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
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
