import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/utils/date'
import { rpcErrorMessage } from '@/types/tour'
import type { RegistrationResult } from '@/types/tour'
import type { HotelSuggestion, AccommodationConfirmation } from '@/types/accommodation'
import { hotelSuggestionCoversNight } from '@/types/accommodation'

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
    <div className="mt-3.5 rounded-2xl border border-white/9 bg-sft-card overflow-hidden">
      <div className="px-4 pt-3.5 pb-2.5 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
        ÜBERNACHTUNGEN
      </div>
      {error && <p className="px-4 pb-2 text-sm text-sft-red">{error}</p>}
      <div className="flex flex-col">
        {nights.map((night, i) => {
          const suggestions = hotelSuggestions.filter((s) => hotelSuggestionCoversNight(s, night))
          const confirmed = confirmedNights.has(night)

          return (
            <div key={night} className="border-t border-white/6 px-4 py-3.5">
              <div className="text-[14px] font-semibold">
                Nacht {i + 1} · {formatDate(night)}
              </div>

              {suggestions.length > 0 && (
                <div className="mt-2 flex flex-col gap-2.5">
                  {suggestions.map((s) => (
                    <div key={s.id} className="text-[13px]">
                      <div className="font-medium">{s.name}</div>
                      {s.price_per_night != null && (
                        <div className="mt-0.5 text-sft-gray">{s.price_per_night.toFixed(2)} € / Nacht</div>
                      )}
                      {s.address && <div className="mt-0.5 text-sft-gray">{s.address}</div>}
                      {s.note && <div className="mt-0.5 text-sft-gray">{s.note}</div>}
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block font-medium text-sft-red underline"
                        >
                          Hotel öffnen
                        </a>
                      )}
                      {s.booking_deadline && (
                        <div className="mt-0.5 font-mono text-[11px] text-sft-gray-dim">
                          BUCHUNG BIS {formatDate(s.booking_deadline).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {confirmed ? (
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#5fd3b4]">✓ Übernachtung bestätigt</span>
                  <button
                    onClick={() => toggle(night)}
                    disabled={submittingNight === night}
                    className="font-mono text-[11px] text-sft-gray underline disabled:opacity-60"
                  >
                    ZURÜCKNEHMEN
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => toggle(night)}
                  disabled={submittingNight === night}
                  className="tap-scale mt-2.5 rounded-lg border border-white/13 bg-sft-surface2 px-3.5 py-2 text-[12px] font-medium disabled:opacity-60"
                >
                  Übernachtung bestätigen
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
