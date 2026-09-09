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
    <div className="pt-3">
      <div className="overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
        <div className="px-4 pb-2.5 pt-3.5 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
          TAGESROUTEN · MEHRTAGESTOUR
        </div>

        {error && <p className="px-4 pb-2 text-sm text-sft-red">{error}</p>}

        {days.map((day) => (
          <div key={day.stageNumber} className="border-t border-white/6 px-4 py-3.5">
            <div className="flex items-baseline justify-between">
              <div className="text-[14px] font-semibold">Tag {day.stageNumber}</div>
              <div className="font-mono text-[11px] text-sft-gray">
                {parseDateOnly(day.stageDate).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </div>
            </div>
            <input
              value={day.routeUrl}
              onChange={(e) => setRouteUrl(day.stageNumber, e.target.value)}
              placeholder="https://…"
              className="mt-2 w-full rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3 font-mono text-[15px] text-sft-white outline-none focus:border-sft-red/60"
            />
            <button
              onClick={() => save(day)}
              disabled={savingDay === day.stageNumber}
              className="tap-scale mt-2.5 rounded-lg border border-white/13 bg-[#17171b] px-3 py-2 text-xs font-medium disabled:opacity-60"
            >
              {savingDay === day.stageNumber ? 'Speichert…' : 'Speichern'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
