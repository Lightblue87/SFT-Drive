import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import type { Vehicle } from '@/types/vehicle'
import { formatDateRange } from '@/utils/date'
import {
  RATING_CRITERIA,
  formatRating,
  ratingAverage,
  type AdminUserNote,
  type DriverRatingWithTour,
} from '@/types/adminReview'

interface UserRow {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  created_at: string
  is_admin: boolean
  is_banned: boolean
}

interface TourOption {
  id: string
  title: string
}

const fieldInput =
  'w-full min-w-0 rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3 text-[16px] text-sft-white outline-none focus:border-sft-red/60'

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function initials(name: string): string {
  return name.replace('@', '').slice(0, 2).toUpperCase()
}

/**
 * Admin-Detailansicht eines einzelnen Nutzers, erreichbar über den Pfeil auf
 * der jeweiligen Zeile in `/admin/users` (siehe CLAUDE.md §21.3/§27.20).
 * Zeigt neben den bereits in der Liste sichtbaren Stammdaten zusätzlich die
 * persönliche Fahrzeuggarage (§34.2) — dieselbe `admin_get_user_vehicles`-RPC,
 * die auch das Admin-Formular zum Nachtragen einer Registrierung verwendet
 * (`AddRegistrationSheet`), hier aber für die vollständige Garage statt nur
 * das Standardfahrzeug.
 */
export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserRow | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Admin-Notizen und Fahrerbewertung (§42) — beides nur für Admins lesbar.
  const [notes, setNotes] = useState<AdminUserNote[]>([])
  const [ratings, setRatings] = useState<DriverRatingWithTour[]>([])
  const [reviewError, setReviewError] = useState(false)
  const [usernameById, setUsernameById] = useState<Map<string, string>>(new Map())
  const [userTours, setUserTours] = useState<TourOption[]>([])
  const [noteBody, setNoteBody] = useState('')
  const [noteTourId, setNoteTourId] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)

  const loadReview = useCallback(async () => {
    if (!id) return
    const [notesRes, ratingsRes] = await Promise.all([
      supabase
        .from('admin_user_notes')
        .select('id, user_id, tour_id, body, created_by, created_at, tour:tours(title)')
        .eq('user_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('driver_ratings')
        .select('*, tour:tours(title, start_date, end_date)')
        .eq('user_id', id),
    ])

    if (notesRes.error || ratingsRes.error) {
      setReviewError(true)
      return
    }
    setReviewError(false)
    setNotes((notesRes.data as unknown as AdminUserNote[]) ?? [])
    setRatings(
      ((ratingsRes.data as unknown as DriverRatingWithTour[]) ?? []).sort((a, b) =>
        (b.tour?.end_date ?? '').localeCompare(a.tour?.end_date ?? ''),
      ),
    )
  }, [id])

  useEffect(() => {
    if (!id) return

    async function load() {
      const [{ data: users }, { data: vehicleRows }, { data: regRows }] = await Promise.all([
        supabase.rpc('admin_list_users'),
        supabase.rpc('admin_get_user_vehicles', { p_user_id: id }),
        // Touren dieses Users für den optionalen Tourbezug einer Notiz.
        supabase
          .from('tour_registrations')
          .select('tour:tours(id, title, start_date)')
          .eq('user_id', id)
          .eq('status', 'confirmed'),
      ])

      const allUsers = (users as UserRow[]) ?? []
      const found = allUsers.find((u) => u.id === id) ?? null
      if (!found) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setUser(found)
      setUsernameById(new Map(allUsers.map((u) => [u.id, u.username])))
      setVehicles((vehicleRows as Vehicle[]) ?? [])
      setUserTours(
        ((regRows as unknown as { tour: (TourOption & { start_date: string }) | null }[]) ?? [])
          .map((r) => r.tour)
          .filter((t): t is TourOption & { start_date: string } => t !== null)
          .sort((a, b) => b.start_date.localeCompare(a.start_date)),
      )
      await loadReview()
      setLoading(false)
    }

    load()
  }, [id, loadReview])

  async function handleAddNote(event: FormEvent) {
    event.preventDefault()
    if (!id || !noteBody.trim()) return
    setNoteError(null)
    setNoteSaving(true)
    const { error } = await supabase
      .from('admin_user_notes')
      .insert({ user_id: id, body: noteBody.trim(), tour_id: noteTourId || null })
    setNoteSaving(false)

    if (error) {
      setNoteError('Notiz konnte nicht gespeichert werden.')
      return
    }
    setNoteBody('')
    setNoteTourId('')
    loadReview()
  }

  async function handleDeleteNote(noteId: string) {
    if (!window.confirm('Diese Notiz wirklich löschen?')) return
    setNoteError(null)
    const { error } = await supabase.from('admin_user_notes').delete().eq('id', noteId)
    if (error) {
      setNoteError('Notiz konnte nicht gelöscht werden.')
      return
    }
    loadReview()
  }

  if (loading) return <PageLoading />

  if (notFound || !user) {
    return (
      <div className="pt-3">
        <p className="text-sm text-sft-gray">Dieser Nutzer wurde nicht gefunden.</p>
        <Link to="/admin/users" className="tap-scale mt-3.5 inline-block text-sm text-sft-red">
          Zurück zur Nutzerverwaltung
        </Link>
      </div>
    )
  }

  return (
    <div className="pt-3">
      <div className="flex items-center gap-3 pb-3.5">
        <button
          onClick={() => navigate('/admin/users')}
          className="tap-scale flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] border border-white/10 bg-[#131316]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M15 4 7 12l8 8" stroke="#f5f5f5" strokeWidth="2" />
          </svg>
        </button>
        <div className="text-[22px] font-semibold leading-none">@{user.username}</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/9 bg-sft-card px-[15px] py-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] font-mono text-xs font-bold ${
              user.is_admin ? 'bg-sft-red text-white' : user.is_banned ? 'bg-white/4 text-[#c9c9ce]' : 'bg-white/7 text-[#c9c9ce]'
            }`}
          >
            {initials(user.username)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[14px] font-semibold">{user.username}</span>
              {user.is_admin && (
                <span className="flex-none rounded-md bg-sft-red/18 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em] text-[#ff6b63]">
                  ADMIN
                </span>
              )}
              {user.is_banned && (
                <span className="flex-none rounded-md bg-sft-amber/16 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em] text-sft-amber">
                  GESPERRT
                </span>
              )}
            </div>
            <div className="mt-1 break-all font-mono text-[11px] leading-relaxed text-sft-gray">
              {user.first_name} {user.last_name}
              <br />
              {user.email}
            </div>
            <div className="mt-1 font-mono text-[10px] text-[#8a8a92]">
              SEIT{' '}
              {new Date(user.created_at).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3.5 px-1 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
        FAHRERBEWERTUNG · NUR FÜR ADMINS
      </div>

      {reviewError && (
        <p className="mt-2 text-sm text-sft-red">
          Bewertungen und Notizen konnten nicht geladen werden.{' '}
          <button onClick={loadReview} className="underline">
            Erneut laden
          </button>
        </p>
      )}

      {!reviewError && ratings.length === 0 && (
        <p className="mt-2 text-sm text-sft-gray">Noch keine Bewertung vorhanden.</p>
      )}

      {ratings.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
          <div className="flex items-center gap-4 px-[15px] py-3.5">
            <div className="flex-none">
              <div className="font-mono text-[28px] font-bold leading-none">
                {formatRating(ratings.reduce((sum, r) => sum + ratingAverage(r), 0) / ratings.length)}
              </div>
              <div className="mt-1.5 font-mono text-[9px] tracking-[0.1em] text-[#8a8a92]">
                Ø AUS {ratings.length} {ratings.length === 1 ? 'AUSFAHRT' : 'AUSFAHRTEN'}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              {RATING_CRITERIA.map((criterion) => (
                <div key={criterion.key} className="flex items-baseline justify-between gap-2 py-0.5">
                  <span className="truncate text-xs text-sft-gray">{criterion.label}</span>
                  <span className="flex-none font-mono text-xs font-bold">
                    {formatRating(ratings.reduce((sum, r) => sum + r[criterion.key], 0) / ratings.length)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {ratings.map((rating) => (
            <Link
              key={rating.id}
              to={`/admin/tours/${rating.tour_id}/ratings`}
              className="tap-scale block border-t border-white/6 px-[15px] py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] font-semibold">
                  {rating.tour?.title ?? 'Ausfahrt'}
                </span>
                <span className="flex-none font-mono text-[13px] font-bold">
                  {formatRating(ratingAverage(rating))}
                </span>
              </div>
              <div className="mt-1 font-mono text-[10px] text-sft-gray">
                {rating.tour ? formatDateRange(rating.tour.start_date, rating.tour.end_date).toUpperCase() : ''}
                {' · '}
                {rating.vehicle_control} / {rating.convoy_discipline} / {rating.rules_safety}
              </div>
              {rating.comment && (
                <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-[#c9c9ce]">
                  {rating.comment}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-3.5 px-1 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
        NOTIZEN · NUR FÜR ADMINS
      </div>

      <form
        onSubmit={handleAddNote}
        className="mt-2 flex min-w-0 flex-col gap-2.5 rounded-2xl border border-white/9 bg-sft-card px-[15px] py-3.5"
      >
        <textarea
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Notiz für die Orga, z. B. nach einer Ausfahrt"
          className={`${fieldInput} resize-y`}
        />
        {userTours.length > 0 && (
          <select value={noteTourId} onChange={(e) => setNoteTourId(e.target.value)} className={fieldInput}>
            <option value="">Ohne Tourbezug</option>
            {userTours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        )}
        {noteError && <p className="text-xs text-sft-red">{noteError}</p>}
        <button
          type="submit"
          disabled={noteSaving || !noteBody.trim()}
          className="tap-scale rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {noteSaving ? 'Wird gespeichert…' : 'Notiz speichern'}
        </button>
      </form>

      {notes.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-2.5">
          {notes.map((note) => (
            <div key={note.id} className="rounded-2xl border border-white/9 bg-sft-card px-[15px] py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 font-mono text-[10px] leading-relaxed text-sft-gray">
                  {formatDay(note.created_at)}
                  {note.created_by && usernameById.get(note.created_by)
                    ? ` · ${usernameById.get(note.created_by)}`
                    : ''}
                  {note.tour ? ` · ${note.tour.title}` : ''}
                </div>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="flex-none font-mono text-[9px] tracking-[0.1em] text-sft-red"
                >
                  LÖSCHEN
                </button>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed">{note.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3.5 px-1 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">GARAGE</div>

      {vehicles.length === 0 ? (
        <p className="mt-2 text-sm text-sft-gray">Keine Fahrzeuge in der Garage.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-2.5">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/9 bg-sft-card px-[15px] py-3.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-semibold">
                    {vehicle.manufacturer} {vehicle.model}
                  </span>
                  {vehicle.is_default && (
                    <span className="flex-none rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em] text-[#c9c9ce]">
                      STANDARD
                    </span>
                  )}
                </div>
                <div className="mt-1 font-mono text-[11px] text-sft-gray">
                  {vehicle.power_ps} PS{vehicle.license_plate ? ` · ${vehicle.license_plate}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
