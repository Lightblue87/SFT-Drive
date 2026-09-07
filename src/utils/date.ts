import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

/**
 * Datumsformatierung nach CLAUDE.md §19. `start_date`/`end_date` sind reine
 * DATE-Werte — wir parsen sie nie über UTC-Mitternacht, damit der Tag nicht
 * durch Zeitzonenkonvertierung verschoben wird.
 */
function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDate(value: string): string {
  return format(parseDateOnly(value), 'dd.MM.yyyy', { locale: de })
}

export function formatDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    return formatDate(startDate)
  }

  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)

  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()

  if (sameMonth) {
    return `${format(start, 'dd', { locale: de })}.–${format(end, 'dd.MM.yyyy', { locale: de })}`
  }
  if (sameYear) {
    return `${format(start, 'dd.MM', { locale: de })}.–${format(end, 'dd.MM.yyyy', { locale: de })}`
  }
  return `${formatDate(startDate)}–${formatDate(endDate)}`
}

export function formatTime(value: string): string {
  return format(parseISO(value), 'HH:mm', { locale: de })
}

export function tourDayCount(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
}

export function isMultiDayTour(startDate: string, endDate: string): boolean {
  return startDate !== endDate
}

export function currentTourDay(startDate: string, endDate: string): number | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)

  if (today < start || today > end) return null

  return Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1
}
