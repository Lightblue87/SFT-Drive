import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import { formatDateRange } from '@/utils/date'
import {
  RATING_CRITERIA,
  RATING_SCALE_HINT,
  formatRating,
  ratingAverage,
  type DriverRating,
  type RatingCriterion,
} from '@/types/adminReview'

interface TourInfo {
  id: string
  title: string
  start_date: string
  end_date: string
}

interface DriverRow {
  user_id: string
  username: string
  full_name: string
  vehicle: string
  // Gespeicherter Stand (null = noch nicht bewertet) und aktueller Entwurf.
  saved: DriverRating | null
  draft: Record<RatingCriterion, number | null>
  comment: string
}

type SaveState = { saving: boolean; error: string | null; savedAt: number | null }

function draftFrom(rating: DriverRating | null): DriverRow['draft'] {
  return {
    vehicle_control: rating?.vehicle_control ?? null,
    convoy_discipline: rating?.convoy_discipline ?? null,
    rules_safety: rating?.rules_safety ?? null,
  }
}

function isDirty(row: DriverRow): boolean {
  const saved = draftFrom(row.saved)
  return (
    RATING_CRITERIA.some((c) => row.draft[c.key] !== saved[c.key]) ||
    row.comment.trim() !== (row.saved?.comment ?? '')
  )
}

const fieldInput =
  'w-full rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3 text-[16px] text-sft-white outline-none focus:border-sft-red/60'

/**
 * Fahrerbewertung nach Abschluss einer Ausfahrt (siehe CLAUDE.md §42).
 * Ausschließlich für Admins: je bestätigtem Fahrer drei Kriterien von 1–5
 * plus optionaler Kommentar. Erreichbar über die Dashboard-Karte "Bewertung
 * offen", die Mitteilung DRIVER_RATING_DUE und den Bewertungsverlauf eines
 * Nutzers. Die fachlichen Vorbedingungen (Tour beendet, Fahrer bestätigt)
 * prüft ein DB-Trigger; hier wird nur vorab passend angezeigt.
 */
export function AdminTourRatingsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tour, setTour] = useState<TourInfo | null>(null)
  const [rows, setRows] = useState<DriverRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setLoadError(false)

    const [tourRes, regsRes, ratingsRes] = await Promise.all([
      supabase.from('tours').select('id, title, start_date, end_date').eq('id', id).maybeSingle(),
      supabase
        .from('tour_registrations')
        .select('user_id, vehicle_manufacturer, vehicle_model, vehicle_power_ps, registered_at')
        .eq('tour_id', id)
        .eq('status', 'confirmed')
        .order('registered_at', { ascending: true }),
      supabase.from('driver_ratings').select('*').eq('tour_id', id),
    ])

    if (tourRes.error || regsRes.error || ratingsRes.error) {
      setLoadError(true)
      setLoading(false)
      return
    }

    const regs = regsRes.data ?? []
    const userIds = regs.map((r) => r.user_id)
    const profilesRes = userIds.length
      ? await supabase.from('profiles').select('id, username, first_name, last_name').in('id', userIds)
      : { data: [], error: null }

    if (profilesRes.error) {
      setLoadError(true)
      setLoading(false)
      return
    }

    const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]))
    const ratingByUser = new Map(((ratingsRes.data ?? []) as DriverRating[]).map((r) => [r.user_id, r]))

    setTour(tourRes.data as TourInfo | null)
    setRows(
      regs.map((r) => {
        const profile = profileById.get(r.user_id)
        const saved = ratingByUser.get(r.user_id) ?? null
        return {
          user_id: r.user_id,
          username: profile?.username ?? '—',
          full_name: profile ? `${profile.first_name} ${profile.last_name}` : '',
          vehicle: `${r.vehicle_manufacturer} ${r.vehicle_model} · ${r.vehicle_power_ps} PS`,
          saved,
          draft: draftFrom(saved),
          comment: saved?.comment ?? '',
        }
      }),
    )
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  function updateRow(userId: string, patch: Partial<Pick<DriverRow, 'draft' | 'comment'>>) {
    setRows((prev) => prev.map((r) => (r.user_id === userId ? { ...r, ...patch } : r)))
  }

  async function save(row: DriverRow) {
    if (!id) return
    const { vehicle_control, convoy_discipline, rules_safety } = row.draft
    if (vehicle_control === null || convoy_discipline === null || rules_safety === null) return

    setSaveStates((s) => ({ ...s, [row.user_id]: { saving: true, error: null, savedAt: null } }))
    const { data, error } = await supabase
      .from('driver_ratings')
      .upsert(
        {
          tour_id: id,
          user_id: row.user_id,
          vehicle_control,
          convoy_discipline,
          rules_safety,
          comment: row.comment.trim() || null,
        },
        { onConflict: 'tour_id,user_id' },
      )
      .select('*')
      .single()

    if (error || !data) {
      const message = error?.message.includes('TOUR_NOT_FINISHED')
        ? 'Die Ausfahrt ist noch nicht beendet.'
        : error?.message.includes('NOT_A_CONFIRMED_PARTICIPANT')
          ? 'Dieser Fahrer ist nicht mehr bestätigter Teilnehmer.'
          : 'Bewertung konnte nicht gespeichert werden.'
      setSaveStates((s) => ({ ...s, [row.user_id]: { saving: false, error: message, savedAt: null } }))
      return
    }

    const saved = data as DriverRating
    setRows((prev) =>
      prev.map((r) =>
        r.user_id === row.user_id ? { ...r, saved, draft: draftFrom(saved), comment: saved.comment ?? '' } : r,
      ),
    )
    setSaveStates((s) => ({ ...s, [row.user_id]: { saving: false, error: null, savedAt: Date.now() } }))
  }

  if (loading) return <PageLoading />

  if (loadError || !tour) {
    return (
      <div className="pt-3">
        <p className="text-sm text-sft-gray">
          {loadError ? 'Die Bewertungen konnten nicht geladen werden.' : 'Diese Tour wurde nicht gefunden.'}
        </p>
        {loadError && (
          <button onClick={load} className="tap-scale mt-3.5 mr-4 text-sm text-sft-red">
            Erneut laden
          </button>
        )}
        <Link to="/admin" className="tap-scale mt-3.5 inline-block text-sm text-sft-red">
          Zurück zum Dashboard
        </Link>
      </div>
    )
  }

  const ratedCount = rows.filter((r) => r.saved).length
  const notFinished = tour.end_date > new Date().toLocaleDateString('sv-SE')

  return (
    <div className="pt-3">
      <div className="flex items-center gap-3 pb-3.5">
        <button
          onClick={() => navigate(-1)}
          aria-label="Zurück"
          className="tap-scale flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] border border-white/10 bg-[#131316]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M15 4 7 12l8 8" stroke="#f5f5f5" strokeWidth="2" />
          </svg>
        </button>
        <div className="min-w-0">
          <div className="text-[22px] font-semibold leading-none">Fahrer bewerten</div>
          <div className="mt-1.5 truncate font-mono text-[10px] text-sft-gray">
            {tour.title.toUpperCase()} · {formatDateRange(tour.start_date, tour.end_date).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/9 bg-sft-card px-[15px] py-3.5">
        <div className="flex items-baseline justify-between">
          <div className="font-mono text-[9px] tracking-[0.2em] text-[#8a8a92]">BEWERTET</div>
          <div className="font-mono text-[13px] font-bold">
            {ratedCount} / {rows.length}
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-sft-gray">
          Nur für Admins sichtbar. {RATING_SCALE_HINT}. Du musst nicht jeden Fahrer bewerten — wen du
          nicht beurteilen kannst, lässt du einfach offen.
        </p>
      </div>

      {notFinished && (
        <p className="mt-3 rounded-2xl border border-sft-amber/28 bg-sft-amber/[0.06] px-[15px] py-3 text-xs leading-relaxed text-[#e6c07a]">
          Diese Ausfahrt ist noch nicht beendet. Bewertungen lassen sich erst ab dem letzten Tourtag
          speichern.
        </p>
      )}

      {rows.length === 0 && (
        <p className="mt-3.5 text-sm text-sft-gray">Bei dieser Ausfahrt gab es keine bestätigten Fahrer.</p>
      )}

      <div className="mt-3.5 flex flex-col gap-3">
        {rows.map((row) => {
          const state = saveStates[row.user_id]
          const complete = RATING_CRITERIA.every((c) => row.draft[c.key] !== null)
          const dirty = isDirty(row)
          const average = complete
            ? ratingAverage(row.draft as Record<RatingCriterion, number>)
            : null

          return (
            <div key={row.user_id} className="rounded-2xl border border-white/9 bg-sft-card px-[15px] py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/admin/users/${row.user_id}`} className="block truncate text-[14px] font-semibold">
                    {row.username}
                  </Link>
                  <div className="mt-1 truncate font-mono text-[11px] text-sft-gray">
                    {row.full_name}
                    {row.full_name && ' · '}
                    {row.vehicle}
                  </div>
                </div>
                {average !== null && (
                  <div className="flex-none text-right">
                    <div className="font-mono text-lg font-bold leading-none">{formatRating(average)}</div>
                    <div className="mt-1 font-mono text-[9px] tracking-[0.1em] text-[#8a8a92]">
                      {row.saved && !dirty ? 'GESPEICHERT' : 'ENTWURF'}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3.5 flex flex-col gap-3">
                {RATING_CRITERIA.map((criterion) => (
                  <div key={criterion.key}>
                    <div className="text-[13px] font-medium">{criterion.label}</div>
                    <div className="mt-0.5 text-[11px] text-[#8a8a92]">{criterion.hint}</div>
                    <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={criterion.label}>
                      {[1, 2, 3, 4, 5].map((value) => {
                        const selected = row.draft[criterion.key] === value
                        return (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() =>
                              updateRow(row.user_id, { draft: { ...row.draft, [criterion.key]: value } })
                            }
                            className={`tap-scale rounded-[10px] border py-2.5 font-mono text-[15px] font-bold ${
                              selected
                                ? 'border-sft-red bg-sft-red text-white'
                                : 'border-white/12 bg-[#131316] text-[#c9c9ce]'
                            }`}
                          >
                            {value}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <textarea
                value={row.comment}
                onChange={(e) => updateRow(row.user_id, { comment: e.target.value })}
                maxLength={1000}
                rows={2}
                placeholder="Kommentar zu dieser Ausfahrt (optional)"
                className={`${fieldInput} mt-3.5 resize-y`}
              />

              {state?.error && <p className="mt-2 text-xs text-sft-red">{state.error}</p>}

              <button
                onClick={() => save(row)}
                disabled={!complete || !dirty || state?.saving || notFinished}
                className="tap-scale mt-3 w-full rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {state?.saving
                  ? 'Wird gespeichert…'
                  : !complete
                    ? 'Alle drei Kriterien wählen'
                    : !dirty
                      ? 'Gespeichert'
                      : row.saved
                        ? 'Änderung speichern'
                        : 'Bewertung speichern'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
