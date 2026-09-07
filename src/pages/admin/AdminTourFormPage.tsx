import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { PageLoading } from '@/components/PageLoading'
import type { TourStatus, ConfirmationMode } from '@/types/tour'

interface FormState {
  slug: string
  title: string
  short_description: string
  public_description: string
  start_date: string
  end_date: string
  region: string
  route_length_km: string
  meeting_point_public: string
  max_vehicles: string
  confirmation_mode: ConfirmationMode
  license_plate_required: boolean
  min_power_ps: string
  max_power_ps: string
  min_driver_age: string
  registration_open_at: string
  registration_close_at: string
  passenger_edit_deadline_at: string
  status: TourStatus
  cover_image_url: string
  member_description: string
  meeting_point_private: string
  kurviger_url: string
  zello_url: string
}

const EMPTY: FormState = {
  slug: '',
  title: '',
  short_description: '',
  public_description: '',
  start_date: '',
  end_date: '',
  region: '',
  route_length_km: '',
  meeting_point_public: '',
  max_vehicles: '10',
  confirmation_mode: 'manual',
  license_plate_required: false,
  min_power_ps: '',
  max_power_ps: '',
  min_driver_age: '',
  registration_open_at: '',
  registration_close_at: '',
  passenger_edit_deadline_at: '',
  status: 'draft',
  cover_image_url: '',
  member_description: '',
  meeting_point_private: '',
  kurviger_url: '',
  zello_url: '',
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return ''
  return value.slice(0, 16)
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Umlaute/Akzente auf Basisbuchstaben reduzieren
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildSlug(title: string, startDate: string): string {
  const base = slugify(title)
  if (!base) return ''
  return startDate ? `${base}-${startDate}` : base
}

/**
 * Tour anlegen/bearbeiten (siehe CLAUDE.md §12, §21.3). Ein Formular für beide
 * Fälle: `/admin/tours/new` (kein `id`) und `/admin/tours/:id/edit`.
 */
export function AdminTourFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [originalMaxVehicles, setOriginalMaxVehicles] = useState<number | null>(null)
  const [loading, setLoading] = useState(!!id)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Mobile Browser (v. a. iOS Safari) können den Tab beim App-Wechsel jederzeit
  // aus dem Speicher werfen und beim Zurückkommen komplett neu laden — ohne
  // Zwischenspeicherung wäre dann der gesamte Formularinhalt weg. Der Entwurf
  // wird deshalb bei jeder Änderung lokal gesichert und nach einem Neustart
  // wiederhergestellt (nimmt Vorrang vor dem aus der DB geladenen Stand, da er
  // den zuletzt eingegebenen, noch nicht gespeicherten Stand darstellt).
  const draftKey = `sft-drive-tour-draft-${id ?? 'new'}`

  useEffect(() => {
    if (loading) return
    try {
      const saved = localStorage.getItem(draftKey)
      if (saved) {
        setForm(JSON.parse(saved))
      }
    } catch {
      // localStorage nicht verfügbar (z. B. privater Modus) oder Entwurf beschädigt — ignorieren.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  useEffect(() => {
    if (loading) return
    try {
      localStorage.setItem(draftKey, JSON.stringify(form))
    } catch {
      // localStorage nicht verfügbar — Entwurfssicherung ist ein reines Komfort-Feature.
    }
  }, [form, loading, draftKey])

  useEffect(() => {
    if (!id) return

    async function load() {
      const [{ data: tour }, { data: member }, { data: participant }] = await Promise.all([
        supabase.from('tours').select('*').eq('id', id).single(),
        supabase.from('tour_member_details').select('*').eq('tour_id', id).maybeSingle(),
        supabase.from('tour_participant_details').select('*').eq('tour_id', id).maybeSingle(),
      ])

      if (!tour) {
        setError('Tour konnte nicht geladen werden.')
        setLoading(false)
        return
      }

      setOriginalMaxVehicles(tour.max_vehicles)
      setForm({
        slug: tour.slug,
        title: tour.title,
        short_description: tour.short_description ?? '',
        public_description: tour.public_description ?? '',
        start_date: tour.start_date,
        end_date: tour.end_date,
        region: tour.region,
        route_length_km: tour.route_length_km?.toString() ?? '',
        meeting_point_public: tour.meeting_point_public ?? '',
        max_vehicles: tour.max_vehicles.toString(),
        confirmation_mode: tour.confirmation_mode,
        license_plate_required: tour.license_plate_required,
        min_power_ps: tour.min_power_ps?.toString() ?? '',
        max_power_ps: tour.max_power_ps?.toString() ?? '',
        min_driver_age: tour.min_driver_age?.toString() ?? '',
        registration_open_at: toDatetimeLocal(tour.registration_open_at),
        registration_close_at: toDatetimeLocal(tour.registration_close_at),
        passenger_edit_deadline_at: toDatetimeLocal(tour.passenger_edit_deadline_at),
        status: tour.status,
        cover_image_url: tour.cover_image_url ?? '',
        member_description: member?.member_description ?? '',
        meeting_point_private: participant?.meeting_point_private ?? '',
        kurviger_url: participant?.kurviger_url ?? '',
        zello_url: participant?.zello_url ?? '',
      })
      setLoading(false)
    }

    load()
  }, [id])

  // Der Slug ist rein intern (URL-Baustein) und wird automatisch aus Titel und
  // Startdatum abgeleitet — kein sichtbares/editierbares Feld. Bei bestehenden
  // Touren bleibt der geladene Slug unangetastet, damit sich die öffentliche
  // URL nicht unter der Hand ändert.
  useEffect(() => {
    if (id) return
    setForm((f) => ({ ...f, slug: buildSlug(f.title, f.start_date) }))
  }, [id, form.title, form.start_date])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const MAX_COVER_IMAGE_BYTES = 5 * 1024 * 1024

  async function handleCoverImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // erneutes Auswählen derselben Datei soll wieder auslösen
    if (!file) return

    setUploadError(null)

    if (!file.type.startsWith('image/')) {
      setUploadError('Bitte eine Bilddatei auswählen.')
      return
    }
    if (file.size > MAX_COVER_IMAGE_BYTES) {
      setUploadError('Bild ist zu groß (max. 5 MB).')
      return
    }

    setUploading(true)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${crypto.randomUUID()}.${extension}`

    const { error: uploadErr } = await supabase.storage.from('tour-covers').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (uploadErr) {
      setUploadError('Upload fehlgeschlagen. Bitte erneut versuchen.')
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('tour-covers').getPublicUrl(path)
    set('cover_image_url', data.publicUrl)
    setUploading(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const tourPayload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      short_description: form.short_description || null,
      public_description: form.public_description || null,
      start_date: form.start_date,
      end_date: form.end_date,
      region: form.region.trim(),
      route_length_km: form.route_length_km ? Number(form.route_length_km) : null,
      meeting_point_public: form.meeting_point_public || null,
      confirmation_mode: form.confirmation_mode,
      license_plate_required: form.license_plate_required,
      min_power_ps: form.min_power_ps ? Number(form.min_power_ps) : null,
      max_power_ps: form.max_power_ps ? Number(form.max_power_ps) : null,
      min_driver_age: form.min_driver_age ? Number(form.min_driver_age) : null,
      registration_open_at: form.registration_open_at || null,
      registration_close_at: form.registration_close_at || null,
      passenger_edit_deadline_at: form.passenger_edit_deadline_at || null,
      status: form.status,
      cover_image_url: form.cover_image_url || null,
      published_at: form.status === 'published' ? new Date().toISOString() : null,
    }

    const newMaxVehicles = Number(form.max_vehicles)
    let tourId = id

    if (!tourId) {
      // Der Slug wird automatisch aus Titel + Datum abgeleitet und ist für den
      // Admin unsichtbar — ein seltener Konflikt (identischer Titel + Datum)
      // wird deshalb hier selbst aufgelöst, statt den Admin damit zu behelligen.
      let insertPayload = { ...tourPayload, max_vehicles: newMaxVehicles, created_by: user?.id }
      let data: { id: string } | null = null
      let insertError: { code?: string } | null = null

      for (let attempt = 0; attempt < 5; attempt++) {
        const result = await supabase.from('tours').insert(insertPayload).select('id').single()
        data = result.data
        insertError = result.error
        if (!insertError) break
        if (insertError.code === '23505') {
          insertPayload = { ...insertPayload, slug: `${tourPayload.slug}-${attempt + 2}` }
          continue
        }
        break
      }

      if (insertError || !data) {
        setError('Tour konnte nicht angelegt werden.')
        setSubmitting(false)
        return
      }
      tourId = data.id
    } else {
      // max_vehicles läuft über die kontrollierte RPC (Warteliste-Nachrücken, §9.6),
      // niemals als direktes UPDATE.
      if (originalMaxVehicles !== null && newMaxVehicles !== originalMaxVehicles) {
        const { error: rpcError } = await supabase.rpc('admin_update_max_vehicles', {
          p_tour_id: tourId,
          p_max_vehicles: newMaxVehicles,
        })
        if (rpcError) {
          setError('Fahrzeuglimit konnte nicht geändert werden.')
          setSubmitting(false)
          return
        }
      }

      const { error: updateError } = await supabase.from('tours').update(tourPayload).eq('id', tourId)
      if (updateError) {
        setError('Tour konnte nicht gespeichert werden.')
        setSubmitting(false)
        return
      }
    }

    await Promise.all([
      supabase
        .from('tour_member_details')
        .upsert({ tour_id: tourId, member_description: form.member_description || null }),
      supabase.from('tour_participant_details').upsert({
        tour_id: tourId,
        meeting_point_private: form.meeting_point_private || null,
        kurviger_url: form.kurviger_url || null,
        zello_url: form.zello_url || null,
      }),
    ])

    try {
      localStorage.removeItem(draftKey)
    } catch {
      // ignorieren
    }

    setSubmitting(false)
    navigate('/admin/tours')
  }

  if (loading) return <PageLoading />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold">{id ? 'Tour bearbeiten' : 'Neue Tour'}</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <h2 className="text-sm font-medium text-sft-gray">Basisdaten</h2>
        <Field label="Titel *">
          <input required value={form.title} onChange={(e) => set('title', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Region *">
          <input required value={form.region} onChange={(e) => set('region', e.target.value)} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Startdatum *">
            <input
              required
              type="date"
              value={form.start_date}
              onChange={(e) => set('start_date', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Enddatum *">
            <input
              required
              type="date"
              value={form.end_date}
              onChange={(e) => set('end_date', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Streckenlänge (km)">
          <input
            type="number"
            min={0}
            value={form.route_length_km}
            onChange={(e) => set('route_length_km', e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Coverbild (quadratisch, z. B. Tourlogo, Fahrzeugfoto, Routen-Screenshot)">
          <div className="flex flex-col gap-2">
            {form.cover_image_url && (
              <img
                src={form.cover_image_url}
                alt=""
                className="aspect-square w-32 rounded-md object-cover"
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-md bg-sft-surface2 px-3 py-2 text-sm">
                {uploading ? 'Wird hochgeladen…' : form.cover_image_url ? 'Bild ändern' : 'Bild hochladen'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {form.cover_image_url && (
                <button
                  type="button"
                  onClick={() => set('cover_image_url', '')}
                  className="rounded-md border border-sft-surface2 px-3 py-2 text-sm text-sft-gray"
                >
                  Entfernen
                </button>
              )}
            </div>
            {uploadError && <p className="text-sm text-sft-red">{uploadError}</p>}
            <details className="text-sm text-sft-gray">
              <summary className="cursor-pointer">Stattdessen Bild-URL eintragen</summary>
              <input
                value={form.cover_image_url}
                onChange={(e) => set('cover_image_url', e.target.value)}
                placeholder="https://…"
                className={`${inputClass} mt-2`}
              />
            </details>
          </div>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => set('status', e.target.value as TourStatus)} className={inputClass}>
            <option value="draft">Entwurf</option>
            <option value="published">Veröffentlicht</option>
            <option value="registration_closed">Anmeldung geschlossen</option>
            <option value="cancelled">Abgesagt</option>
            <option value="completed">Abgeschlossen</option>
            <option value="archived">Archiviert</option>
          </select>
        </Field>

        <h2 className="mt-2 text-sm font-medium text-sft-gray">Beschreibungen</h2>
        <Field label="Kurzbeschreibung">
          <input value={form.short_description} onChange={(e) => set('short_description', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Öffentliche Beschreibung">
          <textarea
            value={form.public_description}
            onChange={(e) => set('public_description', e.target.value)}
            className={inputClass}
            rows={3}
          />
        </Field>
        <Field label="Mitgliedertext (nur für eingeloggte User)">
          <textarea
            value={form.member_description}
            onChange={(e) => set('member_description', e.target.value)}
            className={inputClass}
            rows={2}
          />
        </Field>

        <h2 className="mt-2 text-sm font-medium text-sft-gray">Treffpunkt</h2>
        <Field label="Öffentlicher Treffpunkt (nur ungefähr)">
          <input value={form.meeting_point_public} onChange={(e) => set('meeting_point_public', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Genauer Treffpunkt (nur bestätigte Teilnehmer)">
          <input value={form.meeting_point_private} onChange={(e) => set('meeting_point_private', e.target.value)} className={inputClass} />
        </Field>

        <h2 className="mt-2 text-sm font-medium text-sft-gray">Kurviger &amp; Zello</h2>
        <Field label="Kurviger-Link (nur bestätigte Teilnehmer)">
          <input value={form.kurviger_url} onChange={(e) => set('kurviger_url', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Zello-Link (nur bestätigte Teilnehmer)">
          <input value={form.zello_url} onChange={(e) => set('zello_url', e.target.value)} className={inputClass} />
        </Field>

        <h2 className="mt-2 text-sm font-medium text-sft-gray">Fahrzeug- &amp; Fahreranforderungen</h2>
        <Field label="Maximale Fahrzeugzahl *">
          <input
            required
            type="number"
            min={1}
            value={form.max_vehicles}
            onChange={(e) => set('max_vehicles', e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Bestätigungsmodus">
          <select
            value={form.confirmation_mode}
            onChange={(e) => set('confirmation_mode', e.target.value as ConfirmationMode)}
            className={inputClass}
          >
            <option value="automatic">Automatisch</option>
            <option value="manual">Manuell</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.license_plate_required}
            onChange={(e) => set('license_plate_required', e.target.checked)}
          />
          Kennzeichen bei Anmeldung verpflichtend
        </label>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mindestleistung (PS)">
            <input
              type="number"
              min={1}
              value={form.min_power_ps}
              onChange={(e) => set('min_power_ps', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Maximalleistung (PS)">
            <input
              type="number"
              min={1}
              value={form.max_power_ps}
              onChange={(e) => set('max_power_ps', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Mindestalter des Fahrers">
          <input
            type="number"
            min={18}
            value={form.min_driver_age}
            onChange={(e) => set('min_driver_age', e.target.value)}
            className={inputClass}
          />
        </Field>

        <h2 className="mt-2 text-sm font-medium text-sft-gray">Zeitfenster</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Anmeldung öffnet">
            <input
              type="datetime-local"
              value={form.registration_open_at}
              onChange={(e) => set('registration_open_at', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Anmeldung schließt">
            <input
              type="datetime-local"
              value={form.registration_close_at}
              onChange={(e) => set('registration_close_at', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Deadline Änderung Personenzahl">
          <input
            type="datetime-local"
            value={form.passenger_edit_deadline_at}
            onChange={(e) => set('passenger_edit_deadline_at', e.target.value)}
            className={inputClass}
          />
        </Field>

        {error && <p className="text-sm text-sft-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-md bg-sft-red px-4 py-2.5 font-medium disabled:opacity-60"
        >
          {submitting ? 'Wird gespeichert…' : 'Speichern'}
        </button>
      </form>
    </div>
  )
}

const inputClass = 'rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      {children}
    </label>
  )
}
