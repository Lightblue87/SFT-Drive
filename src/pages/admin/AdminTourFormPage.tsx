import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { PageLoading } from '@/components/PageLoading'
import type { TourStatus, ConfirmationMode, RegistrationResult } from '@/types/tour'
import { rpcErrorMessage } from '@/types/tour'

interface FormState {
  slug: string
  title: string
  short_description: string
  public_description: string
  start_date: string
  end_date: string
  region: string
  route_length_km: string
  meeting_at: string
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
  check_in_enabled: boolean
  check_in_open_minutes_before: string
  check_in_close_minutes_after: string
  status: TourStatus
  cover_image_url: string
  youtube_url: string
  youtube_embed: boolean
  member_description: string
  participant_description: string
  meeting_point_private: string
  kurviger_url: string
  zello_url: string
  whatsapp_group_url: string
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
  meeting_at: '',
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
  check_in_enabled: false,
  check_in_open_minutes_before: '30',
  check_in_close_minutes_after: '15',
  status: 'draft',
  cover_image_url: '',
  youtube_url: '',
  youtube_embed: true,
  member_description: '',
  participant_description: '',
  meeting_point_private: '',
  kurviger_url: '',
  zello_url: '',
  whatsapp_group_url: '',
}

// Statusbedeutung gemäß Lebenszyklus (CLAUDE.md §8.3). `registration_closed`
// und `completed` setzt normalerweise der zeitgesteuerte Job automatisch —
// hier stehen sie für den seltenen Fall einer manuellen Korrektur.
const STATUS_HINT: Record<TourStatus, string> = {
  draft: 'Nur für Admins sichtbar, keine Anmeldung möglich.',
  published: 'Öffentlich sichtbar, Anmeldung im Anmeldefenster möglich.',
  registration_closed:
    'Weiterhin für alle sichtbar, aber keine neuen Anmeldungen. Wird automatisch gesetzt, sobald der Anmeldeschluss erreicht ist — nur der Admin kann dann noch jemanden nachtragen.',
  cancelled:
    'Wird über "Tour absagen" gesetzt, nicht hier. Angemeldete Teilnehmer werden dabei benachrichtigt.',
  completed:
    'Weiterhin sichtbar, keine Anmeldung mehr. Wird automatisch gesetzt, sobald der letzte Tourtag vorbei ist.',
  archived: 'In Übersicht und Tourenverwaltung ausgeblendet.',
}

// `<input type="datetime-local">` liefert/erwartet Werte ohne Zeitzone
// ("YYYY-MM-DDTHH:mm"), gemeint als lokale Wanduhrzeit des Admins. `timestamptz`
// in der Datenbank braucht dagegen einen absoluten UTC-Zeitpunkt. Ohne
// Umrechnung würde die eingegebene Uhrzeit als UTC statt als Lokalzeit
// gespeichert (z. B. 2 Stunden Differenz im Sommer).
function toDatetimeLocal(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null
  // Bewusst nicht `new Date(value)` mit dem rohen "YYYY-MM-DDTHH:mm"-String:
  // iOS Safari parst dieses sekunden- und zeitzonenlose Format inkonsistent
  // teils als UTC statt als lokale Zeit. Die Komponenten-Form des
  // Date-Konstruktors ist dagegen immer eindeutig als Lokalzeit definiert.
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes).toISOString()
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
  const [searchParams] = useSearchParams()
  // `?duplicate=<id>` befüllt das Neu-Anlegen-Formular aus einer bestehenden
  // Tour vor (siehe CLAUDE.md "Entwicklungsphase 20") — erlaubt nur, wenn
  // wirklich eine neue Tour angelegt wird, nicht beim Bearbeiten.
  const duplicateId = !id ? searchParams.get('duplicate') : null
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [originalMaxVehicles, setOriginalMaxVehicles] = useState<number | null>(null)
  // Einmal gesetztes published_at bleibt erhalten — sonst würde jedes Speichern
  // einer bereits veröffentlichten Tour den Veröffentlichungszeitpunkt auf
  // "jetzt" zurücksetzen (§8.3).
  const [originalPublishedAt, setOriginalPublishedAt] = useState<string | null>(null)
  // Für die Sichtbarkeit von "Tour löschen" (§37.3) bewusst getrennt von
  // `form.status`: sonst würde ein im Formular noch ungespeichert auf
  // draft/cancelled umgestellter Status den Löschbereich zeigen, obwohl die
  // Tour in der Datenbank noch published ist (die RPC würde das zwar korrekt
  // mit TOUR_NOT_DELETABLE ablehnen, aber der Button sollte dann gar nicht
  // erst erscheinen) — und umgekehrt könnte er verschwinden, obwohl der
  // gespeicherte Status weiterhin löschbar wäre.
  const [originalStatus, setOriginalStatus] = useState<TourStatus | null>(null)
  const [loading, setLoading] = useState(!!id || !!duplicateId)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showGallery, setShowGallery] = useState(false)
  const [galleryImages, setGalleryImages] = useState<{ name: string; url: string }[] | null>(null)
  const [galleryLoading, setGalleryLoading] = useState(false)

  // Mobile Browser (v. a. iOS Safari) können den Tab beim App-Wechsel jederzeit
  // aus dem Speicher werfen und beim Zurückkommen komplett neu laden — ohne
  // Zwischenspeicherung wäre dann der gesamte Formularinhalt weg. Der Entwurf
  // wird deshalb bei jeder Änderung lokal gesichert und nach einem Neustart
  // wiederhergestellt (nimmt Vorrang vor dem aus der DB geladenen Stand, da er
  // den zuletzt eingegebenen, noch nicht gespeicherten Stand darstellt).
  const draftKey = `sft-drive-tour-draft-${id ?? (duplicateId ? `duplicate-${duplicateId}` : 'new')}`

  useEffect(() => {
    if (loading) return
    try {
      const saved = localStorage.getItem(draftKey)
      if (saved) {
        // Über EMPTY mergen statt vollständig zu ersetzen: ein vor diesem
        // Deployment lokal gespeicherter Entwurf kennt neu hinzugekommene
        // Felder (z. B. youtube_url/youtube_embed) noch nicht und würde sie
        // beim Absenden sonst als `undefined` an z. B. `.trim()` übergeben.
        setForm((f) => ({ ...EMPTY, ...f, ...JSON.parse(saved) }))
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
      setOriginalPublishedAt(tour.published_at ?? null)
      setOriginalStatus(tour.status)
      setForm({
        slug: tour.slug,
        title: tour.title,
        short_description: tour.short_description ?? '',
        public_description: tour.public_description ?? '',
        start_date: tour.start_date,
        end_date: tour.end_date,
        region: tour.region,
        route_length_km: tour.route_length_km?.toString() ?? '',
        meeting_at: toDatetimeLocal(tour.meeting_at),
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
        check_in_enabled: tour.check_in_enabled,
        check_in_open_minutes_before: tour.check_in_open_minutes_before.toString(),
        check_in_close_minutes_after: tour.check_in_close_minutes_after.toString(),
        status: tour.status,
        cover_image_url: tour.cover_image_url ?? '',
        youtube_url: tour.youtube_url ?? '',
        youtube_embed: tour.youtube_embed,
        member_description: member?.member_description ?? '',
        participant_description: participant?.participant_description ?? '',
        meeting_point_private: participant?.meeting_point_private ?? '',
        kurviger_url: participant?.kurviger_url ?? '',
        zello_url: participant?.zello_url ?? '',
        whatsapp_group_url: participant?.whatsapp_group_url ?? '',
      })
      setLoading(false)
    }

    load()
  }, [id])

  // Tour duplizieren (§21.3-Erweiterung, "Entwicklungsphase 20"): übernimmt die
  // Inhalte einer bestehenden Tour in das Formular für eine neue Tour, damit
  // der Admin sie danach nur noch anpassen muss. Bewusst NICHT übernommen:
  // Status (immer wieder `draft`), Zeitraum, Treffpunktzeit, Anmeldefenster,
  // Personenzahl-Deadline und Slug — das sind Entscheidungen für die neue Tour,
  // keine Kopie der alten. Registrierungen, Stopps, Etappen und
  // Hotelvorschläge werden ebenfalls nicht kopiert.
  useEffect(() => {
    if (id || !duplicateId) return

    async function loadDuplicate() {
      const [{ data: tour }, { data: member }, { data: participant }] = await Promise.all([
        supabase.from('tours').select('*').eq('id', duplicateId).single(),
        supabase.from('tour_member_details').select('*').eq('tour_id', duplicateId).maybeSingle(),
        supabase.from('tour_participant_details').select('*').eq('tour_id', duplicateId).maybeSingle(),
      ])

      if (!tour) {
        setError('Tour konnte nicht geladen werden.')
        setLoading(false)
        return
      }

      setForm({
        ...EMPTY,
        title: `${tour.title} (Kopie)`,
        short_description: tour.short_description ?? '',
        public_description: tour.public_description ?? '',
        region: tour.region,
        route_length_km: tour.route_length_km?.toString() ?? '',
        meeting_point_public: tour.meeting_point_public ?? '',
        max_vehicles: tour.max_vehicles.toString(),
        confirmation_mode: tour.confirmation_mode,
        license_plate_required: tour.license_plate_required,
        min_power_ps: tour.min_power_ps?.toString() ?? '',
        max_power_ps: tour.max_power_ps?.toString() ?? '',
        min_driver_age: tour.min_driver_age?.toString() ?? '',
        check_in_enabled: tour.check_in_enabled,
        check_in_open_minutes_before: tour.check_in_open_minutes_before.toString(),
        check_in_close_minutes_after: tour.check_in_close_minutes_after.toString(),
        cover_image_url: tour.cover_image_url ?? '',
        youtube_url: tour.youtube_url ?? '',
        youtube_embed: tour.youtube_embed,
        member_description: member?.member_description ?? '',
        participant_description: participant?.participant_description ?? '',
        meeting_point_private: participant?.meeting_point_private ?? '',
        kurviger_url: participant?.kurviger_url ?? '',
        zello_url: participant?.zello_url ?? '',
        whatsapp_group_url: participant?.whatsapp_group_url ?? '',
      })
      setLoading(false)
    }

    loadDuplicate()
  }, [id, duplicateId])

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

  async function openGallery() {
    setShowGallery(true)
    if (galleryImages) return // schon geladen

    setGalleryLoading(true)
    const { data } = await supabase.storage
      .from('tour-covers')
      .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })

    setGalleryImages(
      (data ?? []).map((file) => ({
        name: file.name,
        url: supabase.storage.from('tour-covers').getPublicUrl(file.name).data.publicUrl,
      })),
    )
    setGalleryLoading(false)
  }

  /**
   * Absage über die kontrollierte RPC (§8.3): sie setzt den Status und legt
   * für alle noch angemeldeten Teilnehmer eine Mitteilung an. Der Push ist wie
   * überall rein zusätzlich (§27.16).
   */
  async function handleCancelTour() {
    if (!id) return
    if (!window.confirm('Diese Ausfahrt wirklich absagen? Alle angemeldeten Teilnehmer werden benachrichtigt.')) {
      return
    }

    setCancelError(null)
    setCancelling(true)
    const { data, error: rpcError } = await supabase.rpc('admin_cancel_tour', {
      p_tour_id: id,
      p_reason: cancelReason.trim() || null,
    })
    setCancelling(false)

    if (rpcError) {
      setCancelError('Absage fehlgeschlagen. Bitte versuche es erneut.')
      return
    }

    const result = data as RegistrationResult
    if (result.code !== 'OK') {
      setCancelError(rpcErrorMessage(result.code))
      return
    }

    void supabase.functions.invoke('send-push', {
      body: {
        tour_id: id,
        // Auch pending/waitlisted — sie sind von der Absage genauso betroffen.
        statuses: ['confirmed', 'pending', 'waitlisted'],
        title: 'Ausfahrt abgesagt',
        body: `Die Ausfahrt "${form.title}" wurde abgesagt.`,
      },
    })

    setForm((prev) => ({ ...prev, status: 'cancelled' }))
    navigate('/admin/tours')
  }

  /**
   * Vollständiges Löschen einer Tour (nur Entwurf/Abgesagt, siehe CLAUDE.md
   * "Entwicklungsphase 20" / `admin_delete_tour`). Anders als eine Absage ist
   * das nicht umkehrbar — deshalb eine eigene, deutliche Bestätigung.
   */
  async function handleDeleteTour() {
    if (!id) return
    if (
      !window.confirm(
        'Diese Tour inklusive aller zugehörigen Daten (Anmeldungen, Stopps, Tagesrouten, Hotelvorschläge) endgültig löschen? Das kann nicht rückgängig gemacht werden.',
      )
    ) {
      return
    }

    setDeleteError(null)
    setDeleting(true)
    const { data, error: rpcError } = await supabase.rpc('admin_delete_tour', { p_tour_id: id })
    setDeleting(false)

    if (rpcError) {
      setDeleteError('Löschen fehlgeschlagen. Bitte versuche es erneut.')
      return
    }

    const result = data as RegistrationResult
    if (result.code !== 'OK') {
      setDeleteError(rpcErrorMessage(result.code))
      return
    }

    try {
      localStorage.removeItem(draftKey)
    } catch {
      // ignorieren
    }

    navigate('/admin/tours')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    // Vorabprüfung logisch unmöglicher Kombinationen. Die Datenbank lehnt sie
    // seit 20260909020000 ebenfalls ab — hier geht es um eine verständliche
    // Meldung statt eines rohen Constraint-Fehlers.
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      setError('Das Enddatum darf nicht vor dem Startdatum liegen.')
      return
    }
    if (
      form.registration_open_at &&
      form.registration_close_at &&
      form.registration_close_at < form.registration_open_at
    ) {
      setError('Der Anmeldeschluss darf nicht vor dem Anmeldestart liegen.')
      return
    }
    if (form.check_in_enabled && !form.meeting_at) {
      setError('Für den Check-in wird eine Treffpunktzeit benötigt.')
      return
    }
    if (
      form.min_power_ps &&
      form.max_power_ps &&
      Number(form.max_power_ps) < Number(form.min_power_ps)
    ) {
      setError('Die Maximalleistung darf nicht unter der Mindestleistung liegen.')
      return
    }

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
      meeting_at: fromDatetimeLocal(form.meeting_at),
      meeting_point_public: form.meeting_point_public || null,
      confirmation_mode: form.confirmation_mode,
      license_plate_required: form.license_plate_required,
      min_power_ps: form.min_power_ps ? Number(form.min_power_ps) : null,
      max_power_ps: form.max_power_ps ? Number(form.max_power_ps) : null,
      min_driver_age: form.min_driver_age ? Number(form.min_driver_age) : null,
      registration_open_at: fromDatetimeLocal(form.registration_open_at),
      registration_close_at: fromDatetimeLocal(form.registration_close_at),
      passenger_edit_deadline_at: fromDatetimeLocal(form.passenger_edit_deadline_at),
      check_in_enabled: form.check_in_enabled,
      check_in_open_minutes_before: Number(form.check_in_open_minutes_before) || 0,
      check_in_close_minutes_after: Number(form.check_in_close_minutes_after) || 0,
      status: form.status,
      cover_image_url: form.cover_image_url || null,
      youtube_url: form.youtube_url.trim() || null,
      youtube_embed: form.youtube_embed,
      published_at:
        form.status === 'published' ? (originalPublishedAt ?? new Date().toISOString()) : null,
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
        participant_description: form.participant_description || null,
        meeting_point_private: form.meeting_point_private || null,
        kurviger_url: form.kurviger_url || null,
        zello_url: form.zello_url || null,
        whatsapp_group_url: form.whatsapp_group_url || null,
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
    <div className="min-w-0 pt-3">
      <div className="mb-3.5 text-[19px] font-semibold">{id ? 'Tour bearbeiten' : 'Neue Tour'}</div>

      <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-3.5">
        <Section title="Grunddaten">
          <Field label="TITEL *">
            <input required value={form.title} onChange={(e) => set('title', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Region *">
            <input required value={form.region} onChange={(e) => set('region', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Kurzbeschreibung">
            <input
              value={form.short_description}
              onChange={(e) => set('short_description', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Öffentliche Beschreibung">
            <textarea
              value={form.public_description}
              onChange={(e) => set('public_description', e.target.value)}
              className={`${inputClass} resize-none leading-relaxed`}
              rows={3}
            />
          </Field>
          <Field label="Mitgliedertext (nur für eingeloggte User)">
            <textarea
              value={form.member_description}
              onChange={(e) => set('member_description', e.target.value)}
              className={`${inputClass} resize-none leading-relaxed`}
              rows={2}
            />
          </Field>
          <Field label="Teilnehmertext (nur für bestätigte Teilnehmer)">
            <textarea
              value={form.participant_description}
              onChange={(e) => set('participant_description', e.target.value)}
              className={`${inputClass} resize-none leading-relaxed`}
              rows={2}
            />
          </Field>
          <Field label="Titelbild">
            <div className="flex flex-col gap-2">
              {form.cover_image_url && (
                <img
                  src={form.cover_image_url}
                  alt=""
                  className="aspect-square w-24 rounded-xl border border-white/8 object-cover"
                />
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="tap-scale cursor-pointer rounded-lg border border-white/13 bg-[#17171b] px-3 py-2 text-xs font-medium">
                  {uploading ? 'Wird hochgeladen…' : form.cover_image_url ? 'Bild ändern' : 'Bild hochladen'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={openGallery}
                  className="tap-scale rounded-lg border border-white/13 px-3 py-2 text-xs font-medium"
                >
                  Vorhandenes Bild wählen
                </button>
                {form.cover_image_url && (
                  <button
                    type="button"
                    onClick={() => set('cover_image_url', '')}
                    className="rounded-lg border border-white/13 px-3 py-2 text-xs text-sft-gray"
                  >
                    Entfernen
                  </button>
                )}
              </div>
              {uploadError && <p className="text-sm text-sft-red">{uploadError}</p>}
              <details className="text-xs text-sft-gray">
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
          <Field label="YouTube-Video-URL">
            <input
              value={form.youtube_url}
              onChange={(e) => set('youtube_url', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              className={`${inputClass} font-mono font-medium`}
            />
          </Field>
          {form.youtube_url && (
            <Toggle
              label="Video eingebettet anzeigen"
              hint="Sonst nur als Link zu YouTube. Wird auf der Tourseite erst nach Klick geladen."
              checked={form.youtube_embed}
              onChange={(v) => set('youtube_embed', v)}
            />
          )}
        </Section>

        <Section title="Zeitraum & Treffpunkt">
          {/* Start/Ende bewusst untereinander statt nebeneinander im Grid: native
              date-Inputs bringen auf manchen Mobilbrowsern eine intrinsische
              Mindestbreite mit, die eine 2-Spalten-Aufteilung sprengen kann. */}
          <Field label="Start">
            <input
              required
              type="date"
              value={form.start_date}
              onChange={(e) => set('start_date', e.target.value)}
              className={`${inputClass} font-mono font-medium`}
            />
          </Field>
          <Field label="Ende">
            <input
              required
              type="date"
              value={form.end_date}
              onChange={(e) => set('end_date', e.target.value)}
              className={`${inputClass} font-mono font-medium`}
            />
          </Field>
          <Field label="Streckenlänge (km)">
            <input
              type="number"
              min={0}
              value={form.route_length_km}
              onChange={(e) => set('route_length_km', e.target.value)}
              className={`${inputClass} font-mono font-medium`}
            />
          </Field>
          <Field label="Treffen">
            <input
              type="datetime-local"
              value={form.meeting_at}
              onChange={(e) => set('meeting_at', e.target.value)}
              className={`${inputClass} font-mono font-medium`}
            />
          </Field>
          <Field label="Treffpunkt öffentlich">
            <input
              value={form.meeting_point_public}
              onChange={(e) => set('meeting_point_public', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Treffpunkt intern">
            <input
              value={form.meeting_point_private}
              onChange={(e) => set('meeting_point_private', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Kurviger-URL">
            <input
              value={form.kurviger_url}
              onChange={(e) => set('kurviger_url', e.target.value)}
              className={`${inputClass} font-mono font-medium`}
            />
          </Field>
          <div className="grid min-w-0 grid-cols-2 gap-[11px]">
            <Field label="WhatsApp">
              <input
                value={form.whatsapp_group_url}
                onChange={(e) => set('whatsapp_group_url', e.target.value)}
                className={`${inputClass} font-mono font-medium`}
              />
            </Field>
            <Field label="Zello">
              <input
                value={form.zello_url}
                onChange={(e) => set('zello_url', e.target.value)}
                className={`${inputClass} font-mono font-medium`}
              />
            </Field>
          </div>
        </Section>

        <Section title="Teilnahme & Grenzen">
          <div className="grid min-w-0 grid-cols-2 gap-[11px]">
            <Field label="Max. Fahrzeuge *">
              <input
                required
                type="number"
                min={1}
                value={form.max_vehicles}
                onChange={(e) => set('max_vehicles', e.target.value)}
                className={`${inputClass} font-mono font-medium`}
              />
            </Field>
            <Field label="Mindestalter">
              <input
                type="number"
                min={18}
                value={form.min_driver_age}
                onChange={(e) => set('min_driver_age', e.target.value)}
                className={`${inputClass} font-mono font-medium`}
              />
            </Field>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-[11px]">
            <Field label="Min. PS">
              <input
                type="number"
                min={1}
                value={form.min_power_ps}
                onChange={(e) => set('min_power_ps', e.target.value)}
                className={`${inputClass} font-mono font-medium`}
              />
            </Field>
            <Field label="Max. PS">
              <input
                type="number"
                min={1}
                value={form.max_power_ps}
                onChange={(e) => set('max_power_ps', e.target.value)}
                className={`${inputClass} font-mono font-medium`}
              />
            </Field>
          </div>

          <div>
            <div className="mb-2 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">BESTÄTIGUNG</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set('confirmation_mode', 'automatic')}
                className={`rounded-xl border px-3 py-3 text-[13px] font-medium ${
                  form.confirmation_mode === 'automatic'
                    ? 'border-sft-red bg-sft-red text-white'
                    : 'border-white/12 text-[#c9c9ce]'
                }`}
              >
                Automatisch
              </button>
              <button
                type="button"
                onClick={() => set('confirmation_mode', 'manual')}
                className={`rounded-xl border px-3 py-3 text-[13px] font-medium ${
                  form.confirmation_mode === 'manual'
                    ? 'border-sft-red bg-sft-red text-white'
                    : 'border-white/12 text-[#c9c9ce]'
                }`}
              >
                Manuell freigeben
              </button>
            </div>
          </div>

          <Toggle
            label="Kennzeichen erforderlich"
            hint="Nur für die Tourleitung sichtbar"
            checked={form.license_plate_required}
            onChange={(v) => set('license_plate_required', v)}
          />
          <Toggle
            label="Check-in aktiviert"
            hint="Fenster relativ zur Treffpunktzeit"
            checked={form.check_in_enabled}
            onChange={(v) => set('check_in_enabled', v)}
          />
        </Section>

        <Section title="Anmelde- & Check-in-Fenster">
          <Field label="Anmeldung ab">
            <input
              type="datetime-local"
              value={form.registration_open_at}
              onChange={(e) => set('registration_open_at', e.target.value)}
              className={`${inputClass} font-mono font-medium`}
            />
          </Field>
          <Field label="Anmeldung bis">
            <input
              type="datetime-local"
              value={form.registration_close_at}
              onChange={(e) => set('registration_close_at', e.target.value)}
              className={`${inputClass} font-mono font-medium`}
            />
          </Field>
          <Field label="Personenzahl änderbar bis">
            <input
              type="datetime-local"
              value={form.passenger_edit_deadline_at}
              onChange={(e) => set('passenger_edit_deadline_at', e.target.value)}
              className={`${inputClass} font-mono font-medium`}
            />
          </Field>
          {form.check_in_enabled && (
            <div className="grid min-w-0 grid-cols-2 gap-[11px]">
              <Field label="Check-in ab (min)">
                <input
                  type="number"
                  min={0}
                  value={form.check_in_open_minutes_before}
                  onChange={(e) => set('check_in_open_minutes_before', e.target.value)}
                  className={`${inputClass} font-mono font-medium`}
                />
              </Field>
              <Field label="Check-in bis (min)">
                <input
                  type="number"
                  min={0}
                  value={form.check_in_close_minutes_after}
                  onChange={(e) => set('check_in_close_minutes_after', e.target.value)}
                  className={`${inputClass} font-mono font-medium`}
                />
              </Field>
            </div>
          )}
        </Section>

        <Section title="Status">
          <select value={form.status} onChange={(e) => set('status', e.target.value as TourStatus)} className={selectClass}>
            <option value="draft">Entwurf</option>
            <option value="published">Veröffentlicht</option>
            <option value="registration_closed">Anmeldung geschlossen</option>
            <option value="completed">Abgeschlossen</option>
            <option value="archived">Archiviert</option>
            {/* "Abgesagt" bewusst nicht wählbar: eine Absage muss die Teilnehmer
                benachrichtigen und läuft deshalb über admin_cancel_tour(). */}
            {form.status === 'cancelled' && <option value="cancelled">Abgesagt</option>}
          </select>
          <p className="text-[11px] leading-relaxed text-[#8e8e96]">{STATUS_HINT[form.status]}</p>
        </Section>

        {id && (form.status === 'published' || form.status === 'registration_closed') && (
          <Section title="Tour absagen">
            <p className="text-[11px] leading-relaxed text-[#8e8e96]">
              Die Ausfahrt entfällt. Alle angemeldeten Teilnehmer (bestätigt, Freigabe offen und
              Warteliste) erhalten eine Mitteilung und – sofern aktiviert – einen Push. Die
              abgesagte Ausfahrt bleibt bis zu ihrem Starttag sichtbar und wird danach automatisch
              archiviert.
            </p>
            <Field label="GRUND (OPTIONAL, WIRD MITGESENDET)">
              <input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Wetterlage"
                className={inputClass}
              />
            </Field>
            {cancelError && <p className="text-sm text-sft-red">{cancelError}</p>}
            <button
              type="button"
              onClick={handleCancelTour}
              disabled={cancelling}
              className="tap-scale rounded-xl border border-sft-red/45 bg-sft-red/8 py-3.5 text-[15px] font-semibold text-[#ff6b63] disabled:opacity-60"
            >
              {cancelling ? 'Wird abgesagt…' : 'Tour absagen'}
            </button>
          </Section>
        )}

        {id && (originalStatus === 'draft' || originalStatus === 'cancelled') && (
          <Section title="Tour löschen">
            <p className="text-[11px] leading-relaxed text-[#8e8e96]">
              Löscht die Tour und ihre organisatorischen Tourdaten (Anmeldungen, Stopps,
              Tagesrouten, Hotelvorschläge) endgültig. Bereits versendete Mitteilungen und Bilder
              in der Mediengalerie bleiben erhalten. Nur möglich im Status Entwurf oder Abgesagt.
              Das kann nicht rückgängig gemacht werden.
            </p>
            {deleteError && <p className="text-sm text-sft-red">{deleteError}</p>}
            <button
              type="button"
              onClick={handleDeleteTour}
              disabled={deleting}
              className="tap-scale rounded-xl border border-sft-red/45 bg-sft-red/8 py-3.5 text-[15px] font-semibold text-[#ff6b63] disabled:opacity-60"
            >
              {deleting ? 'Wird gelöscht…' : 'Tour endgültig löschen'}
            </button>
          </Section>
        )}

        {error && <p className="text-sm text-sft-red">{error}</p>}

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="submit"
            disabled={submitting}
            className="tap-scale rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-3.5 text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Wird gespeichert…' : 'Speichern'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/tours')}
            className="tap-scale rounded-xl border border-white/13 bg-[#17171b] py-3.5 text-[15px] font-medium"
          >
            Abbrechen
          </button>
        </div>
      </form>

      {showGallery && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
          onClick={() => setShowGallery(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border-t border-white/12 bg-[#111114] p-4 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Vorhandenes Bild wählen</h2>
              <button type="button" onClick={() => setShowGallery(false)} className="text-sft-gray">
                Schließen
              </button>
            </div>

            {galleryLoading && <PageLoading />}

            {!galleryLoading && galleryImages && galleryImages.length === 0 && (
              <p className="text-sm text-sft-gray">Noch keine hochgeladenen Bilder vorhanden.</p>
            )}

            {!galleryLoading && galleryImages && galleryImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {galleryImages.map((img) => (
                  <button
                    key={img.name}
                    type="button"
                    onClick={() => {
                      set('cover_image_url', img.url)
                      setShowGallery(false)
                    }}
                    className="aspect-square overflow-hidden rounded-xl border border-white/9"
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const inputClass =
  'w-full min-w-0 rounded-xl border border-white/12 bg-sft-card px-3.5 py-3.5 text-[16px] text-sft-white outline-none focus:border-sft-red/60'
const selectClass =
  'w-full appearance-none rounded-xl border border-white/12 bg-sft-card px-3.5 py-3.5 text-[15px] font-medium text-sft-white outline-none focus:border-sft-red/60'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/9 bg-sft-card p-3.5">
      <div className="mb-2.5 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">{title.toUpperCase()}</div>
      <div className="flex min-w-0 flex-col gap-3.5">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="font-mono text-[9px] font-medium tracking-[0.2em] text-sft-gray-dim">
        {label.toUpperCase()}
      </span>
      {children}
    </label>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 rounded-xl border border-white/9 bg-[#0f0f12] px-3.5 py-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium leading-relaxed">{label}</span>
        <span className="mt-1 block text-[11px] leading-relaxed text-sft-gray">{hint}</span>
      </span>
      <span className={`relative h-7 w-[46px] flex-none rounded-full ${checked ? 'bg-sft-red' : 'bg-white/14'}`}>
        <span
          className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-[left] ${
            checked ? 'left-[21px]' : 'left-[3px]'
          }`}
        />
      </span>
    </button>
  )
}
