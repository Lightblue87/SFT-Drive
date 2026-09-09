import { useEffect, useRef, useState } from 'react'
import { useTours } from '@/features/tours/useTours'
import { TourTile } from '@/features/tours/TourTile'
import { NextTourHero } from '@/features/tours/NextTourHero'
import { MonthCalendar } from '@/features/tours/MonthCalendar'
import { PageLoading } from '@/components/PageLoading'
import { dateKey } from '@/utils/calendar'
import { parseDateOnly } from '@/utils/date'
import { isActiveRegistration, registrationPhase } from '@/utils/tourStatus'

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

/**
 * Öffentliche Tourübersicht (siehe CLAUDE.md §13). Dient gleichzeitig als
 * Inhalt für `/` und `/tours` — keine doppelte Businesslogik (§21.11).
 */
export function ToursPage() {
  const { tours, loading, error } = useTours()

  const today = useRef(new Date()).current
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const defaultMonthSet = useRef(false)

  // Standardmonat beim Öffnen (§13.3): aktueller Monat, falls dort noch eine
  // laufende/zukünftige Tour liegt — sonst Monat der nächsten geplanten Tour.
  useEffect(() => {
    if (defaultMonthSet.current || loading) return
    defaultMonthSet.current = true

    const todayKey = dateKey(today)
    const endOfCurrentMonthKey = dateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0))

    const relevant = tours
      .map((t) => t.tour)
      .filter((t) => t.end_date >= todayKey)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))

    const hasRelevantThisMonth = relevant.some((t) => t.start_date <= endOfCurrentMonthKey)

    if (hasRelevantThisMonth || relevant.length === 0) {
      return // aktueller Monat bleibt Standard
    }

    // parseDateOnly statt new Date(...): ein reiner DATE-String würde sonst als
    // UTC-Mitternacht gelesen und könnte lokal in den Vormonat rutschen (§19).
    const nextDate = parseDateOnly(relevant[0].start_date)
    setViewYear(nextDate.getFullYear())
    setViewMonth(nextDate.getMonth())
  }, [loading, tours, today])

  function goToMonth(delta: number) {
    setSelectedDay(null)
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  if (loading) return <PageLoading />

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-sm text-sft-red">{error}</p>
      </div>
    )
  }

  const todayKey = dateKey(today)

  const monthStartKey = dateKey(new Date(viewYear, viewMonth, 1))
  const monthEndKey = dateKey(new Date(viewYear, viewMonth + 1, 0))
  const monthTours = tours.filter((t) => t.tour.start_date <= monthEndKey && t.tour.end_date >= monthStartKey)

  const dayFiltered = selectedDay
    ? tours.filter((t) => t.tour.start_date <= selectedDay && t.tour.end_date >= selectedDay)
    : monthTours

  const running = dayFiltered.filter((t) => t.tour.start_date <= todayKey && t.tour.end_date >= todayKey)
  const upcoming = dayFiltered
    .filter((t) => t.tour.start_date > todayKey)
    .sort((a, b) => a.tour.start_date.localeCompare(b.tour.start_date))
  const past = dayFiltered
    .filter((t) => t.tour.end_date < todayKey)
    .sort((a, b) => b.tour.end_date.localeCompare(a.tour.end_date))

  const upcomingList = [...running, ...upcoming]
  // Aufmacher ist die nächste Ausfahrt, die für den Betrachter noch relevant
  // ist. Nicht relevant sind: abgesagte Touren, und Touren mit geschlossener
  // Anmeldung, bei denen man selbst nicht dabei ist — bei denen gibt es nichts
  // mehr zu tun. Ist man dagegen angemeldet, bleibt die geschlossene Tour der
  // Aufmacher, denn sie ist die nächste, die einen betrifft. Sonst rückt die
  // nächste Tour nach, bei der eines von beidem gilt (§13.10).
  const heroTour = [...tours]
    .filter((t) => t.tour.end_date >= todayKey && t.tour.status !== 'cancelled')
    .filter((t) => {
      const phase = registrationPhase(t.tour)
      if (phase === 'open' || phase === 'not_yet') return true
      return isActiveRegistration(t.ownStatus)
    })
    .sort((a, b) => a.tour.start_date.localeCompare(b.tour.start_date))[0]

  return (
    <div className="mx-auto max-w-2xl pb-4 pt-1">
      {heroTour && !selectedDay && <NextTourHero {...heroTour} />}

      <div className="mx-3.5 mt-4">
        <button
          onClick={() => setCalendarOpen((v) => !v)}
          className="tap-scale flex w-full items-center justify-between rounded-2xl border border-white/9 bg-sft-surface px-4 py-3.5 text-left"
        >
          <div className="flex items-baseline gap-2.5">
            <span className="text-sm font-semibold">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <span className="font-mono text-xs text-sft-gray">
              {monthTours.length} {monthTours.length === 1 ? 'Ausfahrt' : 'Ausfahrten'}
            </span>
          </div>
          <span className="font-mono text-[11px] tracking-[0.1em] text-sft-red">
            {calendarOpen ? 'ZUKLAPPEN' : 'KALENDER'}
          </span>
        </button>

        {calendarOpen && (
          <div className="mt-2">
            <MonthCalendar
              year={viewYear}
              month={viewMonth}
              tours={tours.map((t) => t.tour)}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onPrevMonth={() => goToMonth(-1)}
              onNextMonth={() => goToMonth(1)}
            />
          </div>
        )}
      </div>

      <div className="px-3.5">
        <div className="flex items-center justify-between px-1 pb-2.5 pt-6">
          <div className="text-[17px] font-semibold">Geplante Ausfahrten</div>
          <div className="font-mono text-xs text-sft-gray">{upcomingList.length}</div>
        </div>

        {selectedDay && (
          <div className="mb-3 flex items-center justify-between text-sm text-sft-gray">
            <span>Gefiltert nach ausgewähltem Tag</span>
            <button onClick={() => setSelectedDay(null)} className="underline">
              Tag löschen
            </button>
          </div>
        )}

        {upcomingList.length === 0 && past.length === 0 && (
          <p className="px-1 text-sm text-sft-gray">
            {selectedDay
              ? 'An diesem Tag findet keine Ausfahrt statt.'
              : 'Für diesen Monat sind aktuell keine Ausfahrten geplant.'}
          </p>
        )}

        {upcomingList.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {upcomingList.map((t) => (
              <TourTile key={t.tour.id} {...t} />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <details className="mt-8">
            <summary className="cursor-pointer px-1 text-sm font-medium text-sft-gray">
              Vergangene Ausfahrten
            </summary>
            <div className="mt-3 flex flex-col gap-2.5">
              {past.map((t) => (
                <TourTile key={t.tour.id} {...t} />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
