import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import type { RegistrationStatus, RegistrationResult } from '@/types/tour'
import { rpcErrorMessage } from '@/types/tour'

interface AdminRegistrationRow {
  id: string
  status: RegistrationStatus
  vehicle_manufacturer: string
  vehicle_model: string
  vehicle_power_ps: number
  license_plate: string | null
  passenger_count: number
  registered_at: string
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
  const [rows, setRows] = useState<AdminRegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)

  const [showMessageForm, setShowMessageForm] = useState(false)
  const [messageTitle, setMessageTitle] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [messageSending, setMessageSending] = useState(false)
  const [messageSent, setMessageSent] = useState(false)
  const [messageError, setMessageError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)

    // Kein direkter FK zwischen tour_registrations und profiles für PostgREST-
    // Embedding (beide referenzieren nur auth.users) — deshalb zwei Abfragen
    // und clientseitig zusammenführen.
    const { data: regs } = await supabase
      .from('tour_registrations')
      .select(
        'id, status, vehicle_manufacturer, vehicle_model, vehicle_power_ps, license_plate, passenger_count, registered_at, user_id',
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

  async function sendMessage() {
    setMessageError(null)
    setMessageSent(false)

    if (!id || !messageTitle.trim() || !messageBody.trim()) {
      setMessageError('Bitte Titel und Text ausfüllen.')
      return
    }

    setMessageSending(true)
    const { data, error } = await supabase.rpc('admin_send_tour_notification', {
      p_tour_id: id,
      p_title: messageTitle.trim(),
      p_body: messageBody.trim(),
    })
    setMessageSending(false)

    if (error) {
      setMessageError('Mitteilung konnte nicht gesendet werden.')
      return
    }

    const result = data as RegistrationResult
    if (result.code !== 'OK') {
      setMessageError(rpcErrorMessage(result.code))
      return
    }

    // Push ist rein zusätzlich zur bereits erstellten In-App-Mitteilung
    // (siehe CLAUDE.md §27.16) — ein Fehlschlag hier darf die Kernfunktion
    // nicht als gescheitert melden, deshalb bewusst kein await auf den Erfolg.
    void supabase.functions.invoke('send-push', {
      body: { tour_id: id, title: messageTitle.trim(), body: messageBody.trim() },
    })

    setMessageTitle('')
    setMessageBody('')
    setMessageSent(true)
  }

  async function savePassengerCount(registrationId: string, count: number) {
    await runAction(() =>
      supabase.rpc('admin_update_passenger_count', {
        p_registration_id: registrationId,
        p_passenger_count: count,
      }),
    )
  }

  if (loading) return <PageLoading />

  const confirmedCount = rows.filter((r) => r.status === 'confirmed').length
  const confirmedPersons = rows
    .filter((r) => r.status === 'confirmed')
    .reduce((sum, r) => sum + 1 + r.passenger_count, 0)

  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold">Teilnehmer</h1>

      <div className="mt-3 rounded-md bg-sft-surface p-4 text-sm">
        <div>Bestätigte Fahrzeuge: {confirmedCount}</div>
        <div>Bestätigte Personen: {confirmedPersons}</div>
      </div>

      <div className="mt-3">
        {!showMessageForm ? (
          <button onClick={() => setShowMessageForm(true)} className="text-sm underline">
            Mitteilung an bestätigte Teilnehmer senden
          </button>
        ) : (
          <div className="flex flex-col gap-2 rounded-md bg-sft-surface p-4 text-sm">
            <input
              value={messageTitle}
              onChange={(e) => setMessageTitle(e.target.value)}
              placeholder="Titel"
              className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
            />
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Text"
              rows={3}
              className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
            />
            {messageError && <p className="text-sft-red">{messageError}</p>}
            {messageSent && <p className="text-sft-gray">Mitteilung gesendet.</p>}
            <div className="flex gap-2">
              <button
                onClick={sendMessage}
                disabled={messageSending}
                className="rounded-md bg-sft-red px-3 py-1.5 text-xs disabled:opacity-60"
              >
                {messageSending ? 'Wird gesendet…' : 'Senden'}
              </button>
              <button
                onClick={() => setShowMessageForm(false)}
                className="rounded-md border border-sft-surface2 px-3 py-1.5 text-xs text-sft-gray"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
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
