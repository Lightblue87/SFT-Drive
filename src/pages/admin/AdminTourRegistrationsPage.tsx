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

function initials(name: string): string {
  return name.replace('@', '').slice(0, 2).toUpperCase()
}

/**
 * Admin darf die Personenzahl unabhängig von der Deadline korrigieren (§9.8).
 * Angezeigt und bearbeitet wird — wie überall in der App — die
 * Gesamtpersonenzahl inklusive Fahrer (nie unter 1); gespeichert wird
 * weiterhin die reine Beifahrerzahl (Gesamt − 1).
 */
function PassengerCountEditor({
  registrationId,
  passengerCount,
  onSave,
}: {
  registrationId: string
  passengerCount: number
  onSave: (registrationId: string, count: number) => Promise<void>
}) {
  const [value, setValue] = useState(String(passengerCount + 1))
  const [saving, setSaving] = useState(false)

  const total = Number(value)
  const changed = Number.isFinite(total) && total >= 1 && total !== passengerCount + 1

  return (
    <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px] text-sft-gray">
      <span>PERSONEN (INKL. FAHRER):</span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-12 rounded border border-white/12 bg-sft-black px-1.5 py-0.5 text-sft-white"
      />
      {changed && (
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true)
            await onSave(registrationId, total - 1)
            setSaving(false)
          }}
          className="text-sft-red underline disabled:opacity-60"
        >
          Speichern
        </button>
      )}
    </div>
  )
}

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

  const pendingRows = rows.filter((r) => r.status === 'pending')
  const waitlistRows = rows.filter((r) => r.status === 'waitlisted')
  const confirmedRows = rows.filter((r) => r.status === 'confirmed')
  const rejectedRows = rows.filter((r) => r.status === 'rejected')
  const cancelledRows = rows.filter((r) => r.status === 'cancelled')
  const confirmedCount = confirmedRows.length
  const confirmedPersons = confirmedRows.reduce((sum, r) => sum + 1 + r.passenger_count, 0)
  const checkedInCount = confirmedRows.filter((r) => r.checked_in_at).length

  return (
    <div className="pt-3">
      <div className="mb-1 text-[19px] font-semibold">Teilnehmer</div>
      <div className="mb-3.5 font-mono text-[11px] text-sft-gray-dim">{tourTitle.toUpperCase()}</div>

      <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
        <div className="border-r border-white/7 px-3 py-3">
          <div className="font-mono text-[9px] tracking-[0.16em] text-sft-gray-dim">FAHRZEUGE</div>
          <div className="mt-1.5 font-mono text-lg font-bold">{confirmedCount}</div>
        </div>
        <div className="border-r border-white/7 px-3 py-3">
          <div className="font-mono text-[9px] tracking-[0.16em] text-sft-gray-dim">PERSONEN</div>
          <div className="mt-1.5 font-mono text-lg font-bold">{confirmedPersons}</div>
        </div>
        <div className="px-3 py-3">
          <div className="font-mono text-[9px] tracking-[0.16em] text-sft-gray-dim">CHECK-IN</div>
          <div className="mt-1.5 font-mono text-lg font-bold">
            {checkedInCount}
            <span className="text-[10px] text-sft-gray">/{confirmedCount}</span>
          </div>
        </div>
        {interestCount > 0 && (
          <div className="col-span-3 border-t border-white/7 px-3 py-2 font-mono text-[11px] text-sft-gray">
            VORGEMERKT: {interestCount}
          </div>
        )}
      </div>

      {actionError && <p className="mt-3 text-sm text-sft-red">{actionError}</p>}

      {pendingRows.length > 0 && (
        <div className="mt-3.5 overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
          <div className="flex items-baseline justify-between px-4 pb-2.5 pt-3.5">
            <div className="font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">ANMELDUNGEN FREIGEBEN</div>
            <div className="font-mono text-[11px] font-bold text-sft-amber">{pendingRows.length}</div>
          </div>
          {pendingRows.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 border-t border-white/6 px-4 py-3">
              <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] bg-white/7 font-mono text-xs font-bold text-[#c9c9ce]">
                {initials(r.profiles?.username ?? '—')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">{r.profiles?.username ?? '—'}</div>
                <div className="mt-1 font-mono text-[10px] leading-relaxed text-sft-gray">
                  {r.vehicle_manufacturer} {r.vehicle_model} · {r.vehicle_power_ps} PS
                  <br />
                  {r.license_plate ?? '—'} · {1 + r.passenger_count} PERSONEN
                </div>
                <PassengerCountEditor
                  registrationId={r.id}
                  passengerCount={r.passenger_count}
                  onSave={savePassengerCount}
                />
              </div>
              <button
                onClick={() => runAction(() => supabase.rpc('approve_tour_registration', { p_registration_id: r.id }))}
                className="tap-scale flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-sft-red"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12.5 9.5 18 20 6" stroke="#fff" strokeWidth="2.2" />
                </svg>
              </button>
              <button
                onClick={() =>
                  runAction(() => supabase.rpc('reject_tour_registration', { p_registration_id: r.id, p_reason: null }))
                }
                className="tap-scale flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border border-white/14"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M5 5l14 14M19 5 5 19" stroke="#9a9a9a" strokeWidth="2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {waitlistRows.length > 0 && (
        <div className="mt-3.5 overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
          <div className="px-4 pb-2.5 pt-3.5 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">WARTELISTE</div>
          {waitlistRows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2.5 border-t border-white/6 px-4 py-3">
              <div className="w-6 flex-none text-center font-mono text-[15px] font-bold text-sft-amber">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">{r.profiles?.username ?? '—'}</div>
                <div className="mt-1 font-mono text-[10px] text-sft-gray">
                  {r.vehicle_manufacturer} {r.vehicle_model} · {r.vehicle_power_ps} PS
                </div>
              </div>
              <button
                onClick={() =>
                  runAction(() =>
                    supabase.rpc('admin_remove_registration', { p_registration_id: r.id, p_reason: null }),
                  )
                }
                className="tap-scale flex-none rounded-[11px] border border-white/13 bg-[#17171b] px-3 py-2 text-xs font-medium"
              >
                Entfernen
              </button>
              <button
                onClick={() =>
                  runAction(() => supabase.rpc('reject_tour_registration', { p_registration_id: r.id, p_reason: null }))
                }
                className="tap-scale flex-none rounded-[11px] border border-sft-red/40 px-3 py-2 text-xs font-medium text-[#ff6b63]"
              >
                Ablehnen
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmedRows.length > 0 && (
        <div className="mt-3.5 overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
          <div className="flex items-baseline justify-between px-4 pb-2.5 pt-3.5">
            <div className="font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">BESTÄTIGTE TEILNEHMER</div>
            <div className="font-mono text-[11px] text-sft-gray">
              {confirmedCount} FZG · {confirmedPersons} PERS.
            </div>
          </div>
          {confirmedRows.map((r) => (
            <div key={r.id} className="border-t border-white/6 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-white/6 font-mono text-[11px] font-bold text-[#c9c9ce]">
                  {initials(r.profiles?.username ?? '—')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">{r.profiles?.username ?? '—'}</div>
                  <div className="mt-1 font-mono text-[10px] text-sft-gray">
                    {r.vehicle_manufacturer} {r.vehicle_model} · {r.license_plate ?? '—'}
                  </div>
                </div>
                <button
                  onClick={() =>
                    runAction(() =>
                      supabase.rpc('reject_tour_registration', { p_registration_id: r.id, p_reason: null }),
                    )
                  }
                  className="flex-none rounded-[9px] border border-sft-red/40 px-2.5 py-2 text-[11px] font-medium text-[#ff6b63]"
                >
                  Ablehnen
                </button>
              </div>
              <PassengerCountEditor
                registrationId={r.id}
                passengerCount={r.passenger_count}
                onSave={savePassengerCount}
              />
              <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-sft-gray">
                {r.checked_in_at ? (
                  <span className="text-[#5fd3b4]">
                    ✓ ANGEKOMMEN ·{' '}
                    {new Date(r.checked_in_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span>NOCH NICHT EINGECHECKT</span>
                )}
                <button onClick={() => toggleCheckedIn(r.id, !r.checked_in_at)} className="underline">
                  {r.checked_in_at ? 'ZURÜCKSETZEN' : 'MARKIEREN'}
                </button>
              </div>
              <button
                onClick={() =>
                  runAction(() =>
                    supabase.rpc('admin_remove_registration', { p_registration_id: r.id, p_reason: null }),
                  )
                }
                className="mt-2 font-mono text-[10px] text-sft-gray underline"
              >
                TEILNAHME ENTFERNEN
              </button>
            </div>
          ))}
        </div>
      )}

      {[
        { rows: rejectedRows, label: 'Abgelehnt' },
        { rows: cancelledRows, label: 'Storniert' },
      ].map(
        (group) =>
          group.rows.length > 0 && (
            <div key={group.label} className="mt-3.5 overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
              <div className="px-4 pb-2.5 pt-3.5 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
                {group.label.toUpperCase()} ({group.rows.length})
              </div>
              {group.rows.map((r) => (
                <div key={r.id} className="border-t border-white/6 px-4 py-3 text-[13px]">
                  <span className="font-semibold">{r.profiles?.username ?? '—'}</span>
                  <span className="ml-2 font-mono text-[11px] text-sft-gray">
                    {r.vehicle_manufacturer} {r.vehicle_model}
                  </span>
                </div>
              ))}
            </div>
          ),
      )}

      {rows.length === 0 && <p className="mt-4 text-sm text-sft-gray">Noch keine Anmeldungen.</p>}

      <div className="mt-3.5 rounded-2xl border border-white/9 bg-sft-card p-3.5">
        <p className="mb-2.5 text-[13px] font-medium">Exportieren</p>
        <button
          onClick={() => setIncludePrivateExportFields((v) => !v)}
          className="flex items-center gap-2.5 text-left text-[12px] text-sft-gray"
        >
          <span
            className={`flex h-[16px] w-[16px] flex-none items-center justify-center rounded-[4px] border ${
              includePrivateExportFields ? 'border-sft-red bg-sft-red' : 'border-white/22'
            }`}
          >
            {includePrivateExportFields && (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                <path d="M4 12.5 9.5 18 20 6" stroke="#fff" strokeWidth="3" />
              </svg>
            )}
          </span>
          Klarname &amp; Kennzeichen einschließen
        </button>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={exportCsv} className="tap-scale rounded-lg border border-white/13 px-3 py-2 text-xs font-medium">
            CSV exportieren
          </button>
          <button onClick={shareSummary} className="tap-scale rounded-lg border border-white/13 px-3 py-2 text-xs font-medium">
            Zusammenfassung teilen
          </button>
        </div>
        {shareStatus && <p className="mt-2 text-xs text-sft-gray">{shareStatus}</p>}
      </div>

      <Link
        to="/admin/notifications"
        className="tap-scale mt-3.5 block rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-3.5 text-center text-[15px] font-semibold text-white"
      >
        Mitteilung an diese Tour
      </Link>
    </div>
  )
}
