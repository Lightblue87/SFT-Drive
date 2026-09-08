import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import { formatDate } from '@/utils/date'
import { rpcErrorMessage } from '@/types/tour'
import type { RegistrationResult } from '@/types/tour'
import type { HotelSuggestion, AccommodationConfirmation } from '@/types/accommodation'

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
  const [newForm, setNewForm] = useState<Record<string, { name: string; url: string; address: string; note: string }>>({})

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
    const form = newForm[night] ?? { name: '', url: '', address: '', note: '' }
    if (!form.name.trim()) return

    const { error: dbError } = await supabase.from('tour_hotel_suggestions').insert({
      tour_id: id,
      night_date: night,
      name: form.name.trim(),
      url: form.url.trim() || null,
      address: form.address.trim() || null,
      note: form.note.trim() || null,
    })
    if (dbError) {
      setError('Hotelvorschlag konnte nicht gespeichert werden.')
      return
    }
    setNewForm((prev) => ({ ...prev, [night]: { name: '', url: '', address: '', note: '' } }))
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
        body: `Bitte bestätige deine Übernachtung vom ${formatDate(night)}.`,
      },
    })

    setReminderStatus((prev) => ({ ...prev, [night]: `Erinnerung an ${userIds.length} Teilnehmer gesendet.` }))
  }

  if (loading) return <PageLoading />
  if (error) return <p className="py-6 text-sm text-sft-red">{error}</p>

  if (nights.length === 0) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-semibold">Übernachtungen</h1>
        <p className="mt-2 text-sm text-sft-gray">
          Übernachtungen sind nur bei Mehrtagestouren relevant. Diese Tour ist eintägig.
        </p>
      </div>
    )
  }

  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold">Übernachtungen · {tourTitle}</h1>
      <p className="mt-1 text-sm text-sft-gray">
        Hotelvorschläge pro Nacht sind unverbindlich — die Buchung erfolgt außerhalb der App. Teilnehmer
        bestätigen lediglich, dass ihre Übernachtung organisiert ist.
      </p>

      {nights.map((night, i) => {
        const nightSuggestions = suggestions.filter((s) => s.night_date === night)
        const confirmedUserIds = new Set(
          confirmations.filter((c) => c.night_date === night).map((c) => c.user_id),
        )
        const openParticipants = participants.filter((p) => !confirmedUserIds.has(p.userId))
        const form = newForm[night] ?? { name: '', url: '', address: '', note: '' }

        return (
          <div key={night} className="mt-6 rounded-md bg-sft-surface p-4 text-sm">
            <h2 className="font-medium">
              Nacht {i + 1} · {formatDate(night)}
            </h2>

            <div className="mt-1 text-sft-gray">
              {confirmedUserIds.size} / {participants.length} bestätigt
            </div>

            {nightSuggestions.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {nightSuggestions.map((s) => (
                  <li key={s.id} className="rounded-md bg-sft-black p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        {s.address && <div className="text-sft-gray">{s.address}</div>}
                        {s.note && <div className="text-sft-gray">{s.note}</div>}
                        {s.url && (
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sft-red underline">
                            Hotel öffnen
                          </a>
                        )}
                        {s.booking_deadline && (
                          <div className="text-sft-gray">Buchung bis {formatDate(s.booking_deadline)}</div>
                        )}
                      </div>
                      <button onClick={() => deleteSuggestion(s.id)} className="text-xs text-sft-gray underline">
                        Entfernen
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-col gap-2">
              <input
                value={form.name}
                onChange={(e) => setNewForm((prev) => ({ ...prev, [night]: { ...form, name: e.target.value } }))}
                placeholder="Hotelname"
                className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
              />
              <input
                value={form.url}
                onChange={(e) => setNewForm((prev) => ({ ...prev, [night]: { ...form, url: e.target.value } }))}
                placeholder="Link (optional)"
                className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
              />
              <input
                value={form.address}
                onChange={(e) => setNewForm((prev) => ({ ...prev, [night]: { ...form, address: e.target.value } }))}
                placeholder="Adresse (optional)"
                className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
              />
              <input
                value={form.note}
                onChange={(e) => setNewForm((prev) => ({ ...prev, [night]: { ...form, note: e.target.value } }))}
                placeholder="Hinweis (optional)"
                className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
              />
              <button
                onClick={() => addSuggestion(night)}
                className="self-start rounded-md bg-sft-red px-4 py-2 font-medium"
              >
                Hotelvorschlag hinzufügen
              </button>
            </div>

            {participants.length > 0 && (
              <div className="mt-4">
                <p className="font-medium">Status der Teilnehmer</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {participants.map((p) => (
                    <li key={p.userId} className="flex items-center justify-between text-sft-gray">
                      <span>{p.username}</span>
                      <span>{confirmedUserIds.has(p.userId) ? '✓ bestätigt' : 'Übernachtung noch nicht bestätigt'}</span>
                    </li>
                  ))}
                </ul>

                {openParticipants.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => sendReminder(night, openParticipants.map((p) => p.userId))}
                      className="rounded-md border border-sft-surface2 px-3 py-1.5 text-xs"
                    >
                      Erinnerung an {openParticipants.length} offene Teilnehmer senden
                    </button>
                    {reminderStatus[night] && (
                      <p className="mt-1 text-xs text-sft-gray">{reminderStatus[night]}</p>
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
