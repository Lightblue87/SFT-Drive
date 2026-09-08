import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/utils/date'
import { rpcErrorMessage } from '@/types/tour'
import type { RegistrationResult } from '@/types/tour'
import type { HotelSuggestion, AccommodationConfirmation } from '@/types/accommodation'

interface Props {
  tourId: string
  startDate: string
  endDate: string
  hotelSuggestions: HotelSuggestion[]
  ownConfirmations: AccommodationConfirmation[]
  onChanged: () => void
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Hotelvorschläge und Übernachtungsbestätigung für bestätigte Teilnehmer
 * (siehe CLAUDE.md §36). Reserviert kein Hotelzimmer und speichert keine
 * Buchungsdaten — nur den organisatorischen Status "Übernachtung
 * gebucht/organisiert" pro Nacht.
 */
export function AccommodationSection({
  tourId,
  startDate,
  endDate,
  hotelSuggestions,
  ownConfirmations,
  onChanged,
}: Props) {
  const [submittingNight, setSubmittingNight] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (endDate <= startDate) return null

  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)
  const nightCount = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  const nights: string[] = []
  for (let i = 0; i < nightCount; i++) {
    nights.push(toDateOnly(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)))
  }

  const confirmedNights = new Set(ownConfirmations.map((c) => c.night_date))

  async function toggle(night: string) {
    setError(null)
    setSubmittingNight(night)
    const { data, error: rpcError } = await supabase.rpc('set_accommodation_confirmation', {
      p_tour_id: tourId,
      p_night_date: night,
      p_confirmed: !confirmedNights.has(night),
    })
    setSubmittingNight(null)

    if (rpcError) {
      setError('Etwas ist schiefgelaufen. Bitte versuche es erneut.')
      return
    }
    const result = data as RegistrationResult
    if (result.code !== 'OK') {
      setError(rpcErrorMessage(result.code))
      return
    }
    onChanged()
  }

  return (
    <div className="rounded-md bg-sft-surface p-4 text-sm">
      <h2 className="mb-2 font-medium">Übernachtungen</h2>
      {error && <p className="mb-2 text-sft-red">{error}</p>}
      <ul className="flex flex-col gap-3">
        {nights.map((night, i) => {
          const suggestions = hotelSuggestions.filter((s) => s.night_date === night)
          const confirmed = confirmedNights.has(night)

          return (
            <li key={night} className="flex flex-col gap-2 rounded-md bg-sft-black p-3">
              <div className="font-medium">
                Nacht {i + 1} · {formatDate(night)}
              </div>

              {suggestions.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <div>{s.name}</div>
                      {s.address && <div className="text-sft-gray">{s.address}</div>}
                      {s.note && <div className="text-sft-gray">{s.note}</div>}
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sft-red underline"
                        >
                          Hotel öffnen
                        </a>
                      )}
                      {s.booking_deadline && (
                        <div className="text-sft-gray">Buchung bis {formatDate(s.booking_deadline)}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {confirmed ? (
                <div className="flex items-center justify-between text-sft-gray">
                  <span>✓ Übernachtung bestätigt</span>
                  <button
                    onClick={() => toggle(night)}
                    disabled={submittingNight === night}
                    className="text-xs underline disabled:opacity-60"
                  >
                    zurücknehmen
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => toggle(night)}
                  disabled={submittingNight === night}
                  className="rounded-md border border-sft-surface2 px-3 py-1.5 text-xs disabled:opacity-60"
                >
                  Übernachtung bestätigen
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
