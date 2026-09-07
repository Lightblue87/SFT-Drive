import { useMemo } from 'react'
import { getMonthWeeks, type CalendarDay } from '@/utils/calendar'
import { isMultiDayTour } from '@/utils/date'

export interface CalendarTour {
  id: string
  slug: string
  title: string
  start_date: string
  end_date: string
}

interface Props {
  year: number
  month: number // 0-basiert
  tours: CalendarTour[]
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]
const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

// Systemfarben für Mehrtagestour-Balken — bewusst kein Rot (Marken-/Aktionsfarbe)
// und keine Erfolgs-/Fehlerfarben (siehe CLAUDE.md §13.6).
const LANE_COLORS = ['bg-sky-600', 'bg-amber-600', 'bg-teal-600', 'bg-violet-600']

function overlaps(a: CalendarTour, b: CalendarTour): boolean {
  return a.start_date <= b.end_date && a.end_date >= b.start_date
}

function assignLanes(tours: CalendarTour[]): Map<string, number> {
  const sorted = [...tours].sort((a, b) => a.start_date.localeCompare(b.start_date) || a.id.localeCompare(b.id))
  const laneOf = new Map<string, number>()
  const laneOccupants: CalendarTour[][] = []

  for (const tour of sorted) {
    let lane = laneOccupants.findIndex((occupants) => occupants.every((o) => !overlaps(o, tour)))
    if (lane === -1) {
      lane = laneOccupants.length
      laneOccupants.push([])
    }
    laneOccupants[lane].push(tour)
    laneOf.set(tour.id, lane)
  }

  return laneOf
}

/**
 * Monatskalender als primärer Filter der Tourübersicht (siehe CLAUDE.md §13.2–§13.9).
 * Eintägige Touren erscheinen als Punkt, Mehrtagestouren als zusammenhängender,
 * farbiger Zeitraum-Balken — die Unterscheidung erfolgt über die Form, nicht nur Farbe.
 */
export function MonthCalendar({ year, month, tours, selectedDay, onSelectDay, onPrevMonth, onNextMonth }: Props) {
  const weeks = useMemo(() => getMonthWeeks(year, month), [year, month])

  const singleDayTours = tours.filter((t) => !isMultiDayTour(t.start_date, t.end_date))
  const multiDayTours = tours.filter((t) => isMultiDayTour(t.start_date, t.end_date))
  const laneOf = useMemo(() => assignLanes(multiDayTours), [multiDayTours])
  const laneCount = Math.max(0, ...Array.from(laneOf.values()).map((l) => l + 1))

  const singleDayByKey = useMemo(() => {
    const map = new Map<string, CalendarTour[]>()
    for (const t of singleDayTours) {
      const list = map.get(t.start_date) ?? []
      list.push(t)
      map.set(t.start_date, list)
    }
    return map
  }, [singleDayTours])

  function toursInWeek(week: CalendarDay[]): CalendarTour[] {
    const weekStart = week[0].key
    const weekEnd = week[6].key
    return multiDayTours.filter((t) => t.start_date <= weekEnd && t.end_date >= weekStart)
  }

  function handleDayClick(day: CalendarDay) {
    onSelectDay(selectedDay === day.key ? null : day.key)
  }

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={onPrevMonth} aria-label="Vorheriger Monat" className="px-2 py-1 text-lg text-sft-gray">
          ‹
        </button>
        <div className="text-sm font-medium">
          {MONTH_NAMES[month]} {year}
        </div>
        <button onClick={onNextMonth} aria-label="Nächster Monat" className="px-2 py-1 text-lg text-sft-gray">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] text-sft-gray">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-0.5">
        {weeks.map((week) => {
          const weekTours = toursInWeek(week)
          const weekStart = week[0].key
          const weekEnd = week[6].key

          return (
            <div key={weekStart} className="relative">
              <div className="grid grid-cols-7">
                {week.map((day) => {
                  const dayTours = singleDayByKey.get(day.key) ?? []
                  const isSelected = selectedDay === day.key

                  return (
                    <button
                      key={day.key}
                      onClick={() => handleDayClick(day)}
                      className={`flex flex-col items-center gap-0.5 rounded py-1 text-xs ${
                        day.inMonth ? 'text-sft-white' : 'text-sft-gray/40'
                      } ${isSelected ? 'bg-sft-surface2' : ''} ${day.isToday ? 'font-semibold text-sft-red' : ''}`}
                    >
                      <span>{day.dayOfMonth}</span>
                      {dayTours.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-sft-red" />
                          {dayTours.length > 1 && <span className="text-[10px] text-sft-gray">{dayTours.length}</span>}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {laneCount > 0 && (
                <div className="pointer-events-none grid grid-cols-7 gap-y-0.5 pb-1">
                  {Array.from({ length: laneCount }).map((_, lane) => (
                    <div key={lane} className="col-span-7 grid grid-cols-7">
                      {weekTours
                        .filter((t) => laneOf.get(t.id) === lane)
                        .map((t) => {
                          const segStart = t.start_date > weekStart ? t.start_date : weekStart
                          const segEnd = t.end_date < weekEnd ? t.end_date : weekEnd
                          const startCol = week.findIndex((d) => d.key === segStart) + 1
                          const endCol = week.findIndex((d) => d.key === segEnd) + 1
                          const color = LANE_COLORS[laneOf.get(t.id)! % LANE_COLORS.length]

                          return (
                            <div
                              key={t.id}
                              className={`pointer-events-auto h-2 truncate px-1 text-[9px] leading-[8px] text-white ${color} ${
                                t.start_date === segStart ? 'rounded-l-full' : ''
                              } ${t.end_date === segEnd ? 'rounded-r-full' : ''}`}
                              style={{ gridColumn: `${startCol} / ${endCol + 1}` }}
                              title={t.title}
                            />
                          )
                        })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
