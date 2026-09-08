import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import type { RegistrationStatus, RegistrationResult } from '@/types/tour'
import { rpcErrorMessage } from '@/types/tour'
import { downloadCsv } from '@/utils/csv'
import { shareOrCopyText } from '@/utils/share'

interface AdminRegistrationRow {
  id: string
  status: RegistrationStatus
  vehicle_manufacturer: string
  vehicle_model: string
  vehicle_power_ps: number
  license_plate: string | null
  passenger_count: number
  registered_at: string
  checked_in_at: string | null
  user_id: string
  profiles: { username: string; first_name: string; last_name: string } | null
}

/** Admin darf die Personenzahl unabhängig von der Deadline korrigieren (§9.8). */
function PassengerCountEditor({
  registrationId,
  passengerCount,
  onSave,
}: {
  registrationId: string
  passengerCount: number
  onSave: (registrationId: string, count: number) => Promise<void>
}) {
  const [value, setValue] = useState(String(passengerCount))
  const [saving, setSaving] = useState(false)

  const changed = Number(value) !== passengerCount

  return (
    <div className="flex items-center gap-2 text-sft-gray">
      <span>Personen:</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-14 rounded border border-sft-surface2 bg-sft-black px-1.5 py-0.5 text-sft-white"
      />
      {changed && (
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true)
            await onSave(registrationId, Number(value))
            setSaving(false)
          }}
          className="text-xs text-sft-red underline disabled:opacity-60"
        >
          Speichern
        </button>
      )}
    </div>
  )
}

const GROUPS: { status: RegistrationStatus; label: string }[] = [
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'pending', label: 'Pending' },
  { status: 'waitlisted', label: 'Waitlist' },
  { status: 'rejected', label: 'Rejected' },
  { status: 'cancelled', label: 'Cancelled' },
]

/** Teilnehmerverwaltung je Tour (siehe CLAUDE.md §12, §21.3). */
export function AdminTourRegistrationsPage() {
  const { id } = useParams<{ id: string }>()
  const [tourTitle, setTourTitle] = useState('')
  const [rows, setRows] = useState<AdminRegistrationRow[]>([])
  const [interestCount, setInterestCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [includePrivateExportFields, setIncludePrivateExportFields] = useState(false)
  const [shareStatus, setShareStatus] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)

    supabase
      .from('tours')
      .select('title')
      .eq('id', id)
      .single()
      .then(({ data }) => setTourTitle(data?.title ?? ''))

    supabase
      .from('tour_interests')
      .select('id', { count: 'exact', head: true })
      .eq('tour_id', id)
      .then(({ count }) => setInterestCount(count ?? 0))

    // Kein direkter FK zwischen tour_registrations und profiles für PostgREST-
    // Embedding (beide referenzieren nur auth.users) — deshalb zwei Abfragen
    // und clientseitig zusammenführen.
    const { data: regs } = await supabase
      .from('tour_registrations')
      .select(
        'id, status, vehicle_manufacturer, vehicle_model, vehicle_power_ps, license_plate, passenger_count, registered_at, checked_in_at, user_id',
      )
      .eq('tour_id', id)
      .order('registered_at', { ascending: true })

    const userIds = [...new Set((regs ?? []).map((r) => r.user_id))]
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('id, username, first_name, last_name').in('id', userIds)
      : { data: [] }

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

    setRows(
      (regs ?? []).map((r) => ({
        ...r,
        profiles: profileById.get(r.user_id) ?? null,
      })) as AdminRegistrationRow[],
    )
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function runAction(fn: () => PromiseLike<{ data: unknown; error: unknown }>) {
    setActionError(null)
    const { data, error } = await fn()
    if (error) {
      setActionError('Aktion fehlgeschlagen.')
      return
    }
    const result = data as RegistrationResult
    if (!['CONFIRMED', 'REJECTED', 'CANCELLED', 'OK'].includes(result.code)) {
      setActionError(rpcErrorMessage(result.code))
      return
    }
    load()
  }

  async function savePassengerCount(registrationId: string, count: number) {
    await runAction(() =>
      supabase.rpc('admin_update_passenger_count', {
        p_registration_id: registrationId,
        p_passenger_count: count,
      }),
    )
  }

  async function toggleCheckedIn(registrationId: string, checkedIn: boolean) {
    await runAction(() =>
      supabase.rpc('admin_set_checked_in', {
        p_registration_id: registrationId,
        p_checked_in: checkedIn,
      }),
    )
  }

  // Teilnehmerexport (siehe CLAUDE.md §35.1): Klarname und Kennzeichen nur,
  // wenn der Admin sie für den konkreten Zweck ausdrücklich auswählt.
  function exportCsv() {
    const header = [
      'Username',
      'Status',
      'Hersteller',
      'Modell',
      'PS',
      'Personen',
      ...(includePrivateExportFields ? ['Vorname', 'Nachname', 'Kennzeichen'] : []),
    ]
    const dataRows = rows.map((r) => [
      r.profiles?.username ?? '',
      r.status,
      r.vehicle_manufacturer,
      r.vehicle_model,
      r.vehicle_power_ps,
      1 + r.passenger_count,
      ...(includePrivateExportFields
        ? [r.profiles?.first_name ?? '', r.profiles?.last_name ?? '', r.license_plate ?? '']
        : []),
    ])
    downloadCsv(`${tourTitle || 'tour'}-teilnehmer.csv`, [header, ...dataRows])
  }

  async function shareSummary() {
    setShareStatus(null)
    const lines = [
      `${tourTitle} — Teilnehmer`,
      `${confirmedCount} bestätigte Fahrzeuge · ${confirmedPersons} Personen`,
      '',
      ...confirmedRows.map(
        (r) =>
          `${r.profiles?.username ?? '—'} · ${r.vehicle_manufacturer} ${r.vehicle_model} · ${r.vehicle_power_ps} PS · ${1 + r.passenger_count} Person${1 + r.passenger_count === 1 ? '' : 'en'}`,
      ),
    ]
    const result = await shareOrCopyText(`${tourTitle} — Teilnehmer`, lines.join('\n'))
    setShareStatus(
      result === 'shared'
        ? null
        : result === 'copied'
          ? 'In die Zwischenablage kopiert.'
          : 'Teilen nicht möglich.',
    )
  }

  if (loading) return <PageLoading />

  const confirmedRows = rows.filter((r) => r.status === 'confirmed')
  const confirmedCount = confirmedRows.length
  const confirmedPersons = confirmedRows.reduce((sum, r) => sum + 1 + r.passenger_count, 0)
  const checkedInCount = confirmedRows.filter((r) => r.checked_in_at).length

  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold">Teilnehmer</h1>

      <div className="mt-3 rounded-md bg-sft-surface p-4 text-sm">
        <div>Bestätigte Fahrzeuge: {confirmedCount}</div>
        <div>Bestätigte Personen: {confirmedPersons}</div>
        {confirmedCount > 0 && (
          <div>
            Eingecheckt: {checkedInCount} / {confirmedCount}
          </div>
        )}
        {interestCount > 0 && <div>Vorgemerkt: {interestCount}</div>}
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <Link to="/admin/notifications" className="inline-block text-sm underline">
          Mitteilung an diese Tour senden →
        </Link>
      </div>

      <div className="mt-3 flex flex-col gap-2 rounded-md bg-sft-surface p-4 text-sm">
        <p className="font-medium">Exportieren</p>
        <label className="flex items-center gap-2 text-sft-gray">
          <input
            type="checkbox"
            checked={includePrivateExportFields}
            onChange={(e) => setIncludePrivateExportFields(e.target.checked)}
          />
          Klarname &amp; Kennzeichen einschließen
        </label>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className="rounded-md border border-sft-surface2 px-3 py-1.5 text-xs">
            CSV exportieren
          </button>
          <button onClick={shareSummary} className="rounded-md border border-sft-surface2 px-3 py-1.5 text-xs">
            Zusammenfassung teilen
          </button>
        </div>
        {shareStatus && <p className="text-xs text-sft-gray">{shareStatus}</p>}
      </div>

      {actionError && <p className="mt-3 text-sm text-sft-red">{actionError}</p>}

      {GROUPS.map((group) => {
        const groupRows = rows.filter((r) => r.status === group.status)
        if (groupRows.length === 0) return null

        return (
          <div key={group.status} className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-sft-gray">
              {group.label} ({groupRows.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {groupRows.map((r) => (
                <li key={r.id} className="rounded-md bg-sft-surface p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {r.profiles?.username ?? '—'}{' '}
                        <span className="text-sft-gray">
                          ({r.profiles?.first_name} {r.profiles?.last_name})
                        </span>
                      </div>
                      <div className="text-sft-gray">
                        {r.vehicle_manufacturer} {r.vehicle_model} · {r.vehicle_power_ps} PS
                        {r.license_plate && ` · ${r.license_plate}`}
                      </div>
                      <div className="text-sft-gray">Personen gesamt: {1 + r.passenger_count}</div>
                      {['pending', 'confirmed', 'waitlisted'].includes(r.status) && (
                        <PassengerCountEditor
                          registrationId={r.id}
                          passengerCount={r.passenger_count}
                          onSave={savePassengerCount}
                        />
                      )}
                      {r.status === 'confirmed' && (
                        <div className="flex items-center gap-2 text-sft-gray">
                          {r.checked_in_at ? (
                            <span>
                              ✓ Angekommen ·{' '}
                              {new Date(r.checked_in_at).toLocaleTimeString('de-DE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : (
                            <span>Noch nicht eingecheckt</span>
                          )}
                          <button
                            onClick={() => toggleCheckedIn(r.id, !r.checked_in_at)}
                            className="text-xs underline"
                          >
                            {r.checked_in_at ? 'Check-in zurücksetzen' : 'Als angekommen markieren'}
                          </button>
                        </div>
                      )}
                    </div>
                    {group.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            runAction(() => supabase.rpc('approve_tour_registration', { p_registration_id: r.id }))
                          }
                          className="rounded-md bg-sft-red px-3 py-1.5 text-xs"
                        >
                          Bestätigen
                        </button>
                        <button
                          onClick={() =>
                            runAction(() =>
                              supabase.rpc('reject_tour_registration', {
                                p_registration_id: r.id,
                                p_reason: null,
                              }),
                            )
                          }
                          className="rounded-md border border-sft-surface2 px-3 py-1.5 text-xs"
                        >
                          Ablehnen
                        </button>
                      </div>
                    )}
                    {(group.status === 'confirmed' || group.status === 'waitlisted') && (
                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={() =>
                            runAction(() =>
                              supabase.rpc('admin_remove_registration', {
                                p_registration_id: r.id,
                                p_reason: null,
                              }),
                            )
                          }
                          className="rounded-md border border-sft-surface2 px-3 py-1.5 text-xs text-sft-gray"
                        >
                          Entfernen
                        </button>
                        <button
                          onClick={() =>
                            runAction(() =>
                              supabase.rpc('reject_tour_registration', {
                                p_registration_id: r.id,
                                p_reason: null,
                              }),
                            )
                          }
                          className="rounded-md border border-sft-red/50 px-3 py-1.5 text-xs text-sft-red"
                        >
                          Ablehnen
                        </button>
                        <p className="max-w-[9rem] text-right text-[11px] leading-tight text-sft-gray">
                          Ablehnen verhindert eine spätere automatische Neubestätigung für diese Tour.
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      {rows.length === 0 && <p className="mt-4 text-sm text-sft-gray">Noch keine Anmeldungen.</p>}
    </div>
  )
}
