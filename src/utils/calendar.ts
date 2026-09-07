/** Reine Kalendertag-Hilfsfunktionen. Arbeitet ausschließlich mit lokalen
 * Datumsteilen (nie über UTC-Mitternacht geparst), siehe CLAUDE.md §19. */

export interface CalendarDay {
  date: Date
  key: string
  dayOfMonth: number
  inMonth: boolean
  isToday: boolean
}

function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Montag = 0 ... Sonntag = 6 (deutsche Wochenkonvention). */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

export function getMonthWeeks(year: number, month: number): CalendarDay[][] {
  const firstOfMonth = new Date(year, month, 1)
  const start = new Date(firstOfMonth)
  start.setDate(start.getDate() - mondayIndex(firstOfMonth))

  const todayKey = dateKey(new Date())
  const weeks: CalendarDay[][] = []
  const cursor = new Date(start)

  for (let week = 0; week < 6; week++) {
    const days: CalendarDay[] = []
    for (let i = 0; i < 7; i++) {
      days.push({
        date: new Date(cursor),
        key: dateKey(cursor),
        dayOfMonth: cursor.getDate(),
        inMonth: cursor.getMonth() === month,
        isToday: dateKey(cursor) === todayKey,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(days)

    // Letzte Woche weglassen, wenn der nächste Monat schon begonnen hat und
    // keine Zelle dieser Woche mehr zum aktuellen Monat gehört.
    if (week >= 3 && days.every((d) => !d.inMonth)) {
      weeks.pop()
      break
    }
  }

  return weeks
}

export { dateKey }
