import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import { formatDate } from '@/utils/date'
import { rpcErrorMessage } from '@/types/tour'
import type { RegistrationResult } from '@/types/tour'
import type { HotelSuggestion, AccommodationConfirmation } from '@/types/accommodation'
import { hotelSuggestionCoversNight } from '@/types/accommodation'

/** `start_date`/`end_date` sind reine DATE-Werte — nie über UTC-Mitternacht
 * parsen, sonst verschiebt sich der Tag (§19). */
function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

interface Participant {
  userId: string
  username: string
}

/**
 * Nacht als Zeitraum darstellen (§36.4: "18./19.06.2027") — ein einzelnes
 * Datum ist für eine Übernachtung mehrdeutig.
 */
function formatNight(night: string): string {
  const from = parseDateOnly(night)
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(from.getDate())}.${pad(from.getMonth() + 1)}.–${pad(to.getDate())}.${pad(to.getMonth() + 1)}.${to.getFullYear()}`
}

const EMPTY_SUGGESTION_FORM = {
  name: '',
  url: '',
  address: '',
  note: '',
  booking_deadline: '',
  night_date_end: '',
  price_per_night: '',
}

type OverallStatus = 'all' | 'partial' | 'none'

const OVERALL_LABEL: Record<OverallStatus, string> = {
  all: 'Alle Übernachtungen bestätigt',
  partial: 'Teilweise bestätigt',
  none: 'Keine Übernachtung bestätigt',
}

/**
 * Hotelvorschläge und Übernachtungsbestätigung — Admin-Verwaltung (siehe
 * CLAUDE.md §36). Nächte werden automatisch aus dem Tourzeitraum abgeleitet
 * (letzter Tag hat keine Übernachtung mehr). Pro Nacht: Hotelvorschläge
 * pflegen sowie sehen, welche bestätigten Teilnehmer die Übernachtung noch
 * nicht bestätigt haben (§36.9: exakt "Übernachtung noch nicht bestätigt",
 * niemals "hat kein Hotel").
 */
export function AdminTourAccommodationPage() {
  const { id } = useParams<{ id: string }>()
  const [tourTitle, setTourTitle] = useState('')
  const [nights, setNights] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<HotelSuggestion[]>([])
  const [confirmations, setConfirmations] = useState<AccommodationConfirmation[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reminderStatus, setReminderStatus] = useState<Record<string, string>>({})
  const [newForm, setNewForm] = useState<Record<string, typeof EMPTY_SUGGESTION_FORM>>({})
  // Auswahl der Empfänger je Nacht (§36.10: einzelne oder mehrere offene
  // Teilnehmer gezielt ansprechen). Leere Auswahl = alle offenen.
  const [selectedRecipients, setSelectedRecipients] = useState<Record<string, string[]>>({})
  const [overallFilter, setOverallFilter] = useState<OverallStatus | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)

    const { data: tourRow } = await supabase.from('tours').select('id, title, start_date, end_date').eq('id', id).single()
    if (!tourRow) {
      setError('Tour konnte nicht geladen werden.')
      setLoading(false)
      return
    }
    setTourTitle(tourRow.title)

    if (tourRow.end_date <= tourRow.start_date) {
      setNights([])
      setLoading(false)
      return
    }

    const start = parseDateOnly(tourRow.start_date)
    const end = parseDateOnly(tourRow.end_date)
    const nightCount = Math.round((end.getTime() - start.getTime()) / 86_400_000)
    const nightList: string[] = []
    for (let i = 0; i < nightCount; i++) {
      nightList.push(toDateOnly(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)))
    }
    setNights(nightList)

    const [{ data: suggestionRows }, { data: confirmationRows }, { data: regs }] = await Promise.all([
      supabase.from('tour_hotel_suggestions').select('*').eq('tour_id', id).order('sort_order', { ascending: true }),
      supabase.from('tour_accommodation_confirmations').select('*').eq('tour_id', id),
      supabase.from('tour_registrations').select('user_id').eq('tour_id', id).eq('status', 'confirmed'),
    ])

    setSuggestions((suggestionRows as HotelSuggestion[]) ?? [])
    setConfirmations((confirmationRows as AccommodationConfirmation[]) ?? [])

    const userIds = [...new Set((regs ?? []).map((r) => r.user_id as string))]
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('id, username').in('id', userIds)
      : { data: [] }
    const usernameById = new Map((profiles ?? []).map((p) => [p.id, p.username as string]))
    setParticipants(userIds.map((uid) => ({ userId: uid, username: usernameById.get(uid) ?? '—' })))

    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function addSuggestion(night: string) {
    if (!id) return
    const form = newForm[night] ?? EMPTY_SUGGESTION_FORM
    if (!form.name.trim()) return

    // "Übernachtung bis": deckt der Vorschlag mehrere aufeinander folgende
    // Nächte ab, muss der Eintrag nicht für jede Nacht wiederholt werden
    // (§36.2/§36.5). Muss eine gültige, spätere oder gleiche Tournacht sein.
    const endNight = form.night_date_end || null
    if (endNight && (endNight < night || !nights.includes(endNight))) {
      setError('„Übernachtung bis" muss eine gültige, nicht vor der Startnacht liegende Tournacht sein.')
      return
    }
    const price = form.price_per_night.trim() ? Number(form.price_per_night) : null
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setError('Preis pro Nacht muss eine positive Zahl sein.')
      return
    }

    const { error: dbError } = await supabase.from('tour_hotel_suggestions').insert({
      tour_id: id,
      night_date: night,
      night_date_end: endNight,
      price_per_night: price,
      name: form.name.trim(),
      url: form.url.trim() || null,
      address: form.address.trim() || null,
      note: form.note.trim() || null,
      booking_deadline: form.booking_deadline || null,
    })
    if (dbError) {
      setError('Hotelvorschlag konnte nicht gespeichert werden.')
      return
    }
    setNewForm((prev) => ({ ...prev, [night]: EMPTY_SUGGESTION_FORM }))
    load()
  }

  async function deleteSuggestion(suggestionId: string) {
    await supabase.from('tour_hotel_suggestions').delete().eq('id', suggestionId)
    load()
  }

  async function sendReminder(night: string, userIds: string[]) {
    if (!id || userIds.length === 0) return
    setReminderStatus((prev) => ({ ...prev, [night]: 'Sendet…' }))

    const { data, error: rpcError } = await supabase.rpc('admin_send_accommodation_reminder', {
      p_tour_id: id,
      p_user_ids: userIds,
      p_night_date: night,
    })

    if (rpcError) {
      setReminderStatus((prev) => ({ ...prev, [night]: 'Fehlgeschlagen.' }))
      return
    }

    const result = data as RegistrationResult
    if (result.code !== 'OK') {
      setReminderStatus((prev) => ({ ...prev, [night]: rpcErrorMessage(result.code) }))
      return
    }

    // Push ist rein zusätzlich (§27.16) — die In-App-Mitteilung existiert bereits.
    void supabase.functions.invoke('send-push', {
      body: {
        tour_id: id,
        user_ids: userIds,
        title: 'Übernachtung noch nicht bestätigt',
        body: `Bitte bestätige deine Übernachtung vom ${formatNight(night)}.`,
      },
    })

    setReminderStatus((prev) => ({ ...prev, [night]: `Erinnerung an ${userIds.length} Teilnehmer gesendet.` }))
  }

  if (loading) return <PageLoading />
  if (error) return <p className="pt-6 text-sm text-sft-red">{error}</p>

  if (nights.length === 0) {
    return (
      <div className="pt-3">
        <p className="text-sm text-sft-gray">Übernachtungen sind nur bei Mehrtagestouren relevant. Diese Tour ist eintägig.</p>
      </div>
    )
  }

  // Gesamtstatus je Teilnehmer über alle Nächte (§36.9).
  const overallStatusByUser = new Map<string, OverallStatus>()
  for (const p of participants) {
    const done = nights.filter((n) =>
      confirmations.some((c) => c.night_date === n && c.user_id === p.userId),
    ).length
    overallStatusByUser.set(
      p.userId,
      done === nights.length ? 'all' : done === 0 ? 'none' : 'partial',
    )
  }

  const overallCounts: Record<OverallStatus, number> = { all: 0, partial: 0, none: 0 }
  for (const status of overallStatusByUser.values()) overallCounts[status] += 1

  return (
    <div className="flex flex-col gap-3.5 pt-3">
      <div className="font-mono text-[11px] text-sft-gray-dim">{tourTitle.toUpperCase()}</div>

      {participants.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
          <div className="px-4 pb-2.5 pt-3.5 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
            GESAMTSTATUS JE TEILNEHMER
          </div>
          <div className="flex flex-wrap gap-2 px-3.5 pb-3.5">
            {(['all', 'partial', 'none'] as OverallStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setOverallFilter((prev) => (prev === status ? null : status))}
                className={`tap-scale rounded-lg border px-2.5 py-1.5 text-[12px] font-medium ${
                  overallFilter === status
                    ? 'border-sft-red/55 bg-sft-red/10 text-sft-white'
                    : 'border-white/12 bg-[#17171b] text-sft-gray'
                }`}
              >
                {OVERALL_LABEL[status]} ({overallCounts[status]})
              </button>
            ))}
          </div>
        </div>
      )}
      {nights.map((night, i) => {
        const nightSuggestions = suggestions.filter((s) => hotelSuggestionCoversNight(s, night))
        const confirmedUserIds = new Set(
          confirmations.filter((c) => c.night_date === night).map((c) => c.user_id),
        )
        // Nur aktuell bestätigte Tourteilnehmer zählen (§36.9) — die
        // Bestätigungszeilen allein könnten von inzwischen stornierten
        // Teilnehmern stammen und den Zähler verfälschen.
        const openParticipants = participants.filter((p) => !confirmedUserIds.has(p.userId))
        const confirmedCount = participants.filter((p) => confirmedUserIds.has(p.userId)).length
        const selection = (selectedRecipients[night] ?? []).filter((uid) =>
          openParticipants.some((p) => p.userId === uid),
        )
        const shownParticipants = participants.filter(
          (p) => overallFilter === null || overallStatusByUser.get(p.userId) === overallFilter,
        )
        const form = newForm[night] ?? EMPTY_SUGGESTION_FORM

        return (
          <div key={night} className="overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
            <div className="px-4 pb-2.5 pt-3.5 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
              ÜBERNACHTUNG {i + 1} · {formatNight(night)}
            </div>

            {nightSuggestions.map((s) => (
              <div key={s.id} className="border-t border-white/6 px-4 py-3.5">
                <div className="flex items-baseline justify-between gap-2.5">
                  <div className="text-[14px] font-semibold">{s.name}</div>
                  <button onClick={() => deleteSuggestion(s.id)} className="flex-none font-mono text-[10px] text-sft-gray underline">
                    ENTFERNEN
                  </button>
                </div>
                {s.night_date_end && s.night_date_end !== s.night_date && (
                  <div className="mt-0.5 font-mono text-[10px] text-sft-gray-dim">
                    GILT {formatDate(s.night_date).toUpperCase()} BIS {formatDate(s.night_date_end).toUpperCase()}
                  </div>
                )}
                {s.price_per_night != null && (
                  <div className="mt-0.5 text-[13px] text-sft-gray">{s.price_per_night.toFixed(2)} € / Nacht</div>
                )}
                {(s.address || s.note) && (
                  <div className="mt-1 font-mono text-[11px] leading-relaxed text-sft-gray">
                    {s.address}
                    {s.address && s.note && <br />}
                    {s.note}
                  </div>
                )}
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-[13px] font-medium text-sft-red underline">
                    Hotel öffnen
                  </a>
                )}
                {s.booking_deadline && (
                  <div className="mt-1 font-mono text-[10px] text-sft-gray-dim">
                    BUCHUNG BIS {formatDate(s.booking_deadline).toUpperCase()}
                  </div>
                )}
              </div>
            ))}

            <div className="flex flex-col gap-2.5 border-t border-white/6 p-3.5">
              <input
                value={form.name}
                onChange={(e) => setNewForm((prev) => ({ ...prev, [night]: { ...form, name: e.target.value } }))}
                placeholder="Hotelname"
                className="rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3 text-[15px] text-sft-white"
              />
              <input
                value={form.url}
                onChange={(e) => setNewForm((prev) => ({ ...prev, [night]: { ...form, url: e.target.value } }))}
                placeholder="Link (optional)"
                className="rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3 font-mono text-[13px] text-sft-white"
              />
              <input
                value={form.address}
                onChange={(e) => setNewForm((prev) => ({ ...prev, [night]: { ...form, address: e.target.value } }))}
                placeholder="Adresse (optional)"
                className="rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3 text-[15px] text-sft-white"
              />
              <input
                value={form.note}
                onChange={(e) => setNewForm((prev) => ({ ...prev, [night]: { ...form, note: e.target.value } }))}
                placeholder="Hinweis (optional)"
                className="rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3 text-[15px] text-sft-white"
              />
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form.price_per_night}
                onChange={(e) =>
                  setNewForm((prev) => ({ ...prev, [night]: { ...form, price_per_night: e.target.value } }))
                }
                placeholder="Preis pro Nacht in € (optional)"
                className="rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3 text-[15px] text-sft-white"
              />
              <label className="block min-w-0">
                <span className="font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
                  ÜBERNACHTUNG BIS (OPTIONAL, FÜR MEHRERE NÄCHTE)
                </span>
                <input
                  type="date"
                  min={night}
                  value={form.night_date_end}
                  onChange={(e) =>
                    setNewForm((prev) => ({ ...prev, [night]: { ...form, night_date_end: e.target.value } }))
                  }
                  className="mt-2 w-full min-w-0 rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3 font-mono text-[15px] text-sft-white"
                />
              </label>
              <label className="block min-w-0">
                <span className="font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
                  BUCHUNGSDEADLINE / ABRUFKONTINGENT (OPTIONAL)
                </span>
                <input
                  type="date"
                  value={form.booking_deadline}
                  onChange={(e) =>
                    setNewForm((prev) => ({ ...prev, [night]: { ...form, booking_deadline: e.target.value } }))
                  }
                  className="mt-2 w-full min-w-0 rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3 font-mono text-[15px] text-sft-white"
                />
              </label>
              <button
                onClick={() => addSuggestion(night)}
                className="tap-scale rounded-xl border border-white/13 bg-[#17171b] py-3 text-[13px] font-medium"
              >
                + Hotelvorschlag hinzufügen
              </button>
            </div>

            {shownParticipants.length > 0 && (
              <div className="border-t border-white/6 p-3.5">
                <div className="mb-2 flex items-baseline justify-between font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
                  <span>STATUS</span>
                  <span className="text-[#5fd3b4]">
                    {confirmedCount} / {participants.length} BESTÄTIGT
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {shownParticipants.map((p) => {
                    const done = confirmedUserIds.has(p.userId)
                    const selected = selection.includes(p.userId)
                    return (
                      <button
                        key={p.userId}
                        type="button"
                        disabled={done}
                        onClick={() =>
                          setSelectedRecipients((prev) => ({
                            ...prev,
                            [night]: selected
                              ? (prev[night] ?? []).filter((uid) => uid !== p.userId)
                              : [...(prev[night] ?? []), p.userId],
                          }))
                        }
                        className="flex items-center gap-2.5 rounded-lg px-1 py-1 text-left text-[12px] disabled:opacity-100"
                      >
                        {/* Offene Teilnehmer sind einzeln auswählbar (§36.10);
                            bereits bestätigte brauchen keine Erinnerung. */}
                        <span
                          className={`flex h-[15px] w-[15px] flex-none items-center justify-center rounded-[4px] border ${
                            done
                              ? 'border-transparent'
                              : selected
                                ? 'border-sft-red bg-sft-red'
                                : 'border-white/25'
                          }`}
                        >
                          {selected && !done && (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                              <path d="M4 12.5 9.5 18 20 6" stroke="#fff" strokeWidth="3" />
                            </svg>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{p.username}</span>
                        <span className={done ? 'flex-none text-[#5fd3b4]' : 'flex-none text-sft-gray'}>
                          {done ? '✓ bestätigt' : 'Übernachtung noch nicht bestätigt'}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {openParticipants.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() =>
                        sendReminder(
                          night,
                          // Ohne eigene Auswahl gehen die Erinnerungen an alle
                          // offenen Teilnehmer dieser Nacht.
                          selection.length > 0 ? selection : openParticipants.map((p) => p.userId),
                        )
                      }
                      className="tap-scale rounded-lg border border-white/13 px-3 py-2 text-xs font-medium"
                    >
                      Erinnerung an {selection.length > 0 ? selection.length : openParticipants.length}{' '}
                      {(selection.length > 0 ? selection.length : openParticipants.length) === 1
                        ? 'offenen Teilnehmer'
                        : 'offene Teilnehmer'}{' '}
                      senden
                    </button>
                    {reminderStatus[night] && (
                      <p className="mt-1.5 font-mono text-[11px] text-sft-gray">{reminderStatus[night]}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
