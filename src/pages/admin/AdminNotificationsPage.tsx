import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import { rpcErrorMessage } from '@/types/tour'
import type { RegistrationResult } from '@/types/tour'

interface TourOption {
  id: string
  title: string
}

type Target = 'tour' | 'broadcast'

/**
 * Zentrale Mitteilungsverwaltung (siehe CLAUDE.md §27.11 Admin Notification
 * Trigger) — bewusst als eigener Admin-Bereich statt verschachtelt in einer
 * einzelnen Tour, damit auch allgemeine Ankündigungen an alle Nutzer möglich
 * sind, nicht nur an die Teilnehmer einer bestimmten Tour.
 */
export function AdminNotificationsPage() {
  const [tours, setTours] = useState<TourOption[]>([])
  const [loading, setLoading] = useState(true)

  const [target, setTarget] = useState<Target>('tour')
  const [tourId, setTourId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('tours')
      .select('id, title')
      .order('start_date', { ascending: false })
      .then(({ data }) => {
        setTours((data as TourOption[]) ?? [])
        if (data && data.length > 0) setTourId(data[0].id)
        setLoading(false)
      })
  }, [])

  async function send() {
    setError(null)
    setSent(false)

    if (!title.trim() || !body.trim()) {
      setError('Bitte Titel und Text ausfüllen.')
      return
    }
    if (target === 'tour' && !tourId) {
      setError('Bitte eine Tour auswählen.')
      return
    }

    setSending(true)

    const { data, error: rpcError } =
      target === 'tour'
        ? await supabase.rpc('admin_send_tour_notification', {
            p_tour_id: tourId,
            p_title: title.trim(),
            p_body: body.trim(),
          })
        : await supabase.rpc('admin_send_broadcast_notification', {
            p_title: title.trim(),
            p_body: body.trim(),
          })

    setSending(false)

    if (rpcError) {
      setError('Mitteilung konnte nicht gesendet werden.')
      return
    }

    const result = data as RegistrationResult
    if (result.code !== 'OK') {
      setError(rpcErrorMessage(result.code))
      return
    }

    // Push ist rein zusätzlich zur bereits erstellten In-App-Mitteilung
    // (§27.16) — ein Fehlschlag hier darf die Kernfunktion nicht als
    // gescheitert melden, deshalb bewusst kein await auf den Erfolg.
    void supabase.functions.invoke('send-push', {
      body:
        target === 'tour'
          ? { tour_id: tourId, title: title.trim(), body: body.trim() }
          : { broadcast: true, title: title.trim(), body: body.trim() },
    })

    setTitle('')
    setBody('')
    setSent(true)
  }

  if (loading) return <PageLoading />

  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold">Mitteilungen</h1>

      <div className="mt-4 flex flex-col gap-4 rounded-md bg-sft-surface p-4 text-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setTarget('tour')}
            className={`flex-1 rounded-md px-3 py-2 ${
              target === 'tour' ? 'bg-sft-red' : 'border border-sft-surface2 text-sft-gray'
            }`}
          >
            An eine Tour
          </button>
          <button
            onClick={() => setTarget('broadcast')}
            className={`flex-1 rounded-md px-3 py-2 ${
              target === 'broadcast' ? 'bg-sft-red' : 'border border-sft-surface2 text-sft-gray'
            }`}
          >
            An alle Nutzer
          </button>
        </div>

        {target === 'tour' && (
          <label className="flex flex-col gap-1">
            Tour
            <select
              value={tourId}
              onChange={(e) => setTourId(e.target.value)}
              className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
            >
              {tours.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <span className="text-xs text-sft-gray">
              Erreicht nur die bestätigten Teilnehmer dieser Tour.
            </span>
          </label>
        )}
        {target === 'broadcast' && (
          <p className="text-xs text-sft-gray">Erreicht alle registrierten Nutzer.</p>
        )}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel"
          className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Text"
          rows={4}
          className="rounded-md border border-sft-surface2 bg-sft-black px-3 py-2 text-sft-white"
        />

        {error && <p className="text-sft-red">{error}</p>}
        {sent && <p className="text-sft-gray">Mitteilung gesendet.</p>}

        <button
          onClick={send}
          disabled={sending}
          className="rounded-md bg-sft-red px-4 py-2.5 font-medium disabled:opacity-60"
        >
          {sending ? 'Wird gesendet…' : 'Senden'}
        </button>
      </div>
    </div>
  )
}
