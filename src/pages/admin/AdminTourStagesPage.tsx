import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import type { Tour } from '@/types/tour'
import type { TourStage } from '@/types/tourStage'

interface DayRow {
  stageDate: string
  stageNumber: number
  stageId: string | null
  title: string | null
  fallbackKurvigerUrl: string | null
  routeUrl: string
}

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

/**
 * Tagesrouten für Mehrtagestouren (siehe CLAUDE.md §34.4). Pro Kalendertag der
 * Tour genau ein optionales Routen-Linkfeld — kein eigenes Roadbook, keine
 * Anbieterauswahl. Die Tage werden automatisch aus `start_date`/`end_date`
 * abgeleitet, der Admin muss sie nicht einzeln anlegen.
 */
export function AdminTourStagesPage() {
  const { id } = useParams<{ id: string }>()
  const [tour, setTour] = useState<Tour | null>(null)
  const [days, setDays] = useState<DayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingDay, setSavingDay] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)

    const [{ data: tourRow }, { data: stageRows }] = await Promise.all([
      supabase.from('tours').select('*').eq('id', id).single(),
      supabase.from('tour_stages').select('*').eq('tour_id', id).order('stage_number', { ascending: true }),
    ])

    if (!tourRow) {
      setError('Tour konnte nicht geladen werden.')
      setLoading(false)
      return
    }

    const t = tourRow as Tour
    setTour(t)

    const stages = (stageRows as TourStage[]) ?? []
    const stageByNumber = new Map(stages.map((s) => [s.stage_number, s]))

    const start = parseDateOnly(t.start_date)
    const end = parseDateOnly(t.end_date)
    const dayCount = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1

    const rows: DayRow[] = []
    for (let i = 0; i < dayCount; i++) {
      const stageNumber = i + 1
      const stageDate = toDateOnly(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
      const existing = stageByNumber.get(stageNumber)
      rows.push({
        stageDate,
        stageNumber,
        stageId: existing?.id ?? null,
        title: existing?.title ?? null,
        fallbackKurvigerUrl: existing?.kurviger_url ?? null,
        routeUrl: existing?.route_url ?? existing?.kurviger_url ?? '',
      })
    }

    setDays(rows)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  function setRouteUrl(stageNumber: number, value: string) {
    setDays((prev) => prev.map((d) => (d.stageNumber === stageNumber ? { ...d, routeUrl: value } : d)))
  }

  async function save(day: DayRow) {
    if (!id) return
    setError(null)
    setSavingDay(day.stageNumber)

    const routeUrl = day.routeUrl.trim() || null

    const { error: dbError } = day.stageId
      ? await supabase
          .from('tour_stages')
          .update({ route_url: routeUrl, updated_at: new Date().toISOString() })
          .eq('id', day.stageId)
      : await supabase.from('tour_stages').insert({
          tour_id: id,
          stage_date: day.stageDate,
          stage_number: day.stageNumber,
          title: `Tag ${day.stageNumber}`,
          route_url: routeUrl,
        })

    setSavingDay(null)

    if (dbError) {
      setError('Routen-Link konnte nicht gespeichert werden.')
      return
    }

    load()
  }

  if (loading) return <PageLoading />
  if (error && !tour) return <p className="py-6 text-sm text-sft-red">{error}</p>

  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold">Tagesrouten</h1>
      <p className="mt-1 text-sm text-sft-gray">
        Pro Tag ein optionaler Routen-Link (Kurviger, Google Maps, Apple Karten o. Ä.). Nur für
        bestätigte Teilnehmer sichtbar. Kein Link hinterlegt → kein Button auf der Tourdetailseite.
      </p>

      {error && <p className="mt-3 text-sm text-sft-red">{error}</p>}

      <ul className="mt-4 flex flex-col gap-3">
        {days.map((day) => (
          <li key={day.stageNumber} className="rounded-md bg-sft-surface p-3 text-sm">
            <div className="mb-2 font-medium">
              Tag {day.stageNumber} ·{' '}
              {new Date(day.stageDate).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
              {day.title && day.title !== `Tag ${day.stageNumber}` && (
                <span className="text-sft-gray"> · {day.title}</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={day.routeUrl}
                onChange={(e) => setRouteUrl(day.stageNumber, e.target.value)}
                placeholder="https://…"
                className="flex-1 rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
              />
              <button
                onClick={() => save(day)}
                disabled={savingDay === day.stageNumber}
                className="rounded-md bg-sft-red px-4 py-2 font-medium disabled:opacity-60"
              >
                {savingDay === day.stageNumber ? 'Speichert…' : 'Speichern'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
