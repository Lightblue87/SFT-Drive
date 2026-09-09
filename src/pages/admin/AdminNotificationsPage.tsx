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

  const recipients =
    target === 'tour'
      ? `${tours.find((t) => t.id === tourId)?.title ?? ''} · Nur bestätigte Teilnehmer`
      : 'Alle registrierten Nutzer'

  return (
    <div className="pt-3">
      <div className="overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
        <div className="grid grid-cols-2 gap-2 p-3.5 pb-0">
          <button
            onClick={() => setTarget('tour')}
            className={`rounded-xl border px-3 py-3 text-[13px] font-medium ${
              target === 'tour' ? 'border-sft-red bg-sft-red text-white' : 'border-white/12 text-[#c9c9ce]'
            }`}
          >
            An eine Tour
          </button>
          <button
            onClick={() => setTarget('broadcast')}
            className={`rounded-xl border px-3 py-3 text-[13px] font-medium ${
              target === 'broadcast' ? 'border-sft-red bg-sft-red text-white' : 'border-white/12 text-[#c9c9ce]'
            }`}
          >
            An alle Nutzer
          </button>
        </div>

        <div className="flex flex-col gap-3.5 p-3.5">
          {target === 'tour' && (
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">TOUR</span>
              <select
                value={tourId}
                onChange={(e) => setTourId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3.5 text-[15px] font-medium text-sft-white"
              >
                {tours.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="font-mono text-[11px] leading-relaxed text-sft-gray">{recipients.toUpperCase()}</p>

          <label className="flex flex-col gap-2">
            <span className="font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">TITEL</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Treffpunkt geändert"
              className="w-full rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3.5 text-[16px] text-sft-white"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">TEXT</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Neuer Treffpunkt: Parkplatz Nord, 08:45."
              rows={4}
              className="w-full resize-none rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3.5 text-[16px] leading-relaxed text-sft-white"
            />
          </label>

          {error && <p className="text-sm text-sft-red">{error}</p>}
          {sent && <p className="font-mono text-[11px] text-sft-gray">MITTEILUNG GESENDET</p>}

          <button
            onClick={send}
            disabled={sending}
            className="tap-scale rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-[15px] text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {sending ? 'Wird gesendet…' : 'In-App senden · Push falls aktiviert'}
          </button>
        </div>
      </div>
    </div>
  )
}
