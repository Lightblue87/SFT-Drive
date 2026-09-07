import { useEffect, useRef, useState } from 'react'
import { useTours } from '@/features/tours/useTours'
import { TourTile } from '@/features/tours/TourTile'
import { MonthCalendar } from '@/features/tours/MonthCalendar'
import { PageLoading } from '@/components/PageLoading'
import { dateKey } from '@/utils/calendar'

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

    const nextDate = new Date(relevant[0].start_date)
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

  return (
    <div>
      <MonthCalendar
        year={viewYear}
        month={viewMonth}
        tours={tours.map((t) => t.tour)}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onPrevMonth={() => goToMonth(-1)}
        onNextMonth={() => goToMonth(1)}
      />

      <div className="mx-auto max-w-2xl px-4 py-4">
        {selectedDay && (
          <div className="mb-4 flex items-center justify-between text-sm text-sft-gray">
            <span>Gefiltert nach ausgewähltem Tag</span>
            <button onClick={() => setSelectedDay(null)} className="underline">
              Tag löschen
            </button>
          </div>
        )}

        {upcomingList.length === 0 && past.length === 0 && (
          <p className="text-sm text-sft-gray">
            {selectedDay
              ? 'An diesem Tag findet keine Ausfahrt statt.'
              : 'Für diesen Monat sind aktuell keine Ausfahrten geplant.'}
          </p>
        )}

        {upcomingList.length > 0 && (
          <div className="flex flex-col gap-6">
            {upcomingList.map((t) => (
              <TourTile key={t.tour.id} {...t} />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <details className="mt-8">
            <summary className="cursor-pointer text-sm font-medium text-sft-gray">
              Vergangene Ausfahrten
            </summary>
            <div className="mt-4 flex flex-col gap-6">
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
