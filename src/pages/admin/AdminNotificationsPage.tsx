import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import { BottomSheet } from '@/components/BottomSheet'
import { rpcErrorMessage } from '@/types/tour'
import type { RegistrationResult } from '@/types/tour'

interface TourOption {
  id: string
  title: string
}

type Target = 'tour' | 'broadcast'

/** Antwortform von send-push (§27.16/§27.22) -- alle Felder optional, da sie
 * bei nicht konfiguriertem Kanal (skipped) fehlen können. */
interface DeliveryStats {
  sent?: number
  failed?: number
  email_sent?: number
  email_failed?: number
  skipped?: string
}

interface Draft {
  target: Target
  tourId: string
  title: string
  body: string
}

/** Ein Versand (mehrere notifications-Zeilen mit gemeinsamer batch_id,
 * siehe Migration 20260923020000) samt Lesequote -- Quelle für den
 * "Verlauf"-Bereich unten. */
interface NotificationBatch {
  batch_id: string
  title: string
  body: string
  created_at: string
  recipient_count: number
  read_count: number
}

interface BatchRecipient {
  username: string
  read_at: string | null
}

function formatBatchTimestamp(value: string): string {
  const d = new Date(value)
  const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

// iOS/Android können den Tab beim Displaysperren jederzeit aus dem Speicher
// werfen -- ohne Zwischenspeicherung wäre ein noch nicht abgesendeter Titel/
// Text danach komplett weg (§16 "Formular-Resilienz bei Tab-Reloads", analog
// zum bestehenden Muster in AdminTourFormPage). Ein einzelner globaler
// Schlüssel genügt, da diese Seite nur ein Formular gleichzeitig zeigt.
const DRAFT_KEY = 'sft-drive-notification-draft'

/**
 * Zentrale Mitteilungsverwaltung (siehe CLAUDE.md §27.11 Admin Notification
 * Trigger) — bewusst als eigener Admin-Bereich statt verschachtelt in einer
 * einzelnen Tour, damit auch allgemeine Ankündigungen an alle Nutzer möglich
 * sind, nicht nur an die Teilnehmer einer bestimmten Tour.
 */
export function AdminNotificationsPage() {
  const [searchParams] = useSearchParams()
  const preselectedTourId = searchParams.get('tour')

  const [tours, setTours] = useState<TourOption[]>([])
  const [loading, setLoading] = useState(true)
  const [draftHydrated, setDraftHydrated] = useState(false)

  const [target, setTarget] = useState<Target>('tour')
  const [tourId, setTourId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats | null>(null)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)

  const [batches, setBatches] = useState<NotificationBatch[]>([])
  const [batchesLoading, setBatchesLoading] = useState(false)
  const [openBatch, setOpenBatch] = useState<NotificationBatch | null>(null)
  const [batchRecipients, setBatchRecipients] = useState<BatchRecipient[] | null>(null)
  const [recipientsLoading, setRecipientsLoading] = useState(false)

  const loadBatches = useCallback(async () => {
    if (target === 'tour' && !tourId) {
      setBatches([])
      return
    }
    setBatchesLoading(true)
    const { data } = await supabase.rpc('admin_list_notification_batches', {
      p_tour_id: target === 'tour' ? tourId : null,
    })
    setBatches((data as NotificationBatch[]) ?? [])
    setBatchesLoading(false)
  }, [target, tourId])

  useEffect(() => {
    loadBatches()
  }, [loadBatches])

  async function openBatchDetail(batch: NotificationBatch) {
    setOpenBatch(batch)
    setBatchRecipients(null)
    setRecipientsLoading(true)
    const { data } = await supabase.rpc('admin_get_notification_batch_recipients', { p_batch_id: batch.batch_id })
    setBatchRecipients((data as BatchRecipient[]) ?? [])
    setRecipientsLoading(false)
  }

  // Ein per Link mitgegebenes ?tour= ist eine bewusste Navigationsentscheidung
  // und soll einen älteren, unabhängigen Entwurf überstimmen -- Titel/Text
  // werden trotzdem wiederhergestellt, Ziel und Tourauswahl nicht. Ohne die
  // Erzwingung von target='tour' könnte ein zuvor gespeicherter
  // broadcast-Entwurf sonst dazu führen, dass die über den Link verlinkte
  // Mitteilung versehentlich an alle Nutzer statt nur an diese Tour geht.
  useEffect(() => {
    if (preselectedTourId) {
      setTarget('tour')
      setTourId(preselectedTourId)
    }
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const draft = JSON.parse(saved) as Partial<Draft>
        if (!preselectedTourId) {
          if (typeof draft.target === 'string') setTarget(draft.target)
          if (typeof draft.tourId === 'string') setTourId(draft.tourId)
        }
        if (typeof draft.title === 'string') setTitle(draft.title)
        if (typeof draft.body === 'string') setBody(draft.body)
      }
    } catch {
      // localStorage nicht verfügbar (z. B. privater Modus) oder Entwurf beschädigt — ignorieren.
    }
    setDraftHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!draftHydrated) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ target, tourId, title, body }))
    } catch {
      // localStorage nicht verfügbar — Entwurfssicherung ist ein reines Komfort-Feature.
    }
  }, [draftHydrated, target, tourId, title, body])

  useEffect(() => {
    supabase
      .from('tours')
      .select('id, title')
      .order('start_date', { ascending: false })
      .then(({ data }) => {
        setTours((data as TourOption[]) ?? [])
        // Aus der Teilnehmerverwaltung einer Tour verlinkt ("Mitteilung an
        // diese Tour") soll genau diese Tour vorausgewählt sein, nicht die
        // per Default zuerst sortierte -- nur auf eine tatsächlich noch
        // existierende Tour zurückfallen, sonst bliebe die Auswahl leer.
        // Ein per Draft wiederhergestelltes tourId (siehe oben) bleibt dabei
        // unangetastet, solange es zu einer noch vorhandenen Tour gehört.
        const preselected = data?.find((t) => t.id === preselectedTourId)
        if (preselected) {
          setTourId(preselected.id)
        } else {
          setTourId((current) => {
            if (current && data?.some((t) => t.id === current)) return current
            return data && data.length > 0 ? data[0].id : current
          })
        }
        setLoading(false)
      })
  }, [preselectedTourId])

  async function send() {
    setError(null)
    setSent(false)
    setDeliveryStats(null)
    setDeliveryError(null)

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

    // Die In-App-Mitteilung ist ab hier bereits unwiderruflich angelegt --
    // der Entwurf muss deshalb sofort verworfen werden, nicht erst nach dem
    // optionalen (potenziell langsamen) send-push-Aufruf unten. Würde die
    // PWA währenddessen aus dem Speicher geworfen, käme sonst beim nächsten
    // Start derselbe Entwurf zurück und ein erneutes Absenden würde die
    // nicht-idempotente RPC ein zweites Mal auslösen (doppelte Mitteilung).
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      // localStorage nicht verfügbar — kein Problem, der Entwurf ist ohnehin leer.
    }

    // Push/E-Mail sind rein zusätzlich zur bereits erstellten In-App-Mitteilung
    // (§27.16) — ein Fehlschlag hier darf die Kernfunktion nicht als
    // gescheitert melden, In-App-Erfolg bleibt also unabhängig von diesem
    // Ergebnis sichtbar. Die Auswertung unten dient nur der Diagnose (§27.22
    // Debugging), nicht als Voraussetzung für "gesendet".
    const { data: pushData, error: pushError } = await supabase.functions.invoke<DeliveryStats>('send-push', {
      body:
        target === 'tour'
          ? { tour_id: tourId, title: title.trim(), body: body.trim() }
          : { broadcast: true, title: title.trim(), body: body.trim() },
    })

    if (pushError) {
      // pushError.message ist der einzige Diagnosehinweis ohne Supabase-
      // Dashboard-Zugriff -- lieber zeigen als generisch verschlucken, auch
      // wenn er technisch klingt (§27.16: blockiert weiterhin nichts).
      setDeliveryError(`Push/E-Mail-Versand fehlgeschlagen: ${pushError.message}`)
    } else {
      setDeliveryStats(pushData)
    }

    setTitle('')
    setBody('')
    setSent(true)
    loadBatches()
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
          {sent && deliveryError && <p className="font-mono text-[11px] text-sft-red">{deliveryError}</p>}
          {sent && deliveryStats && (
            <div className="rounded-xl border border-white/10 bg-[#0f0f12] p-3 font-mono text-[11px] leading-relaxed text-sft-gray">
              {deliveryStats.skipped ? (
                <p>Push/E-Mail nicht konfiguriert ({deliveryStats.skipped}).</p>
              ) : (
                <>
                  <p>
                    Push: {deliveryStats.sent ?? 0} gesendet
                    {deliveryStats.failed ? `, ${deliveryStats.failed} fehlgeschlagen` : ''}
                  </p>
                  <p>
                    E-Mail: {deliveryStats.email_sent ?? 0} gesendet
                    {deliveryStats.email_failed ? `, ${deliveryStats.email_failed} fehlgeschlagen` : ''}
                  </p>
                </>
              )}
            </div>
          )}

          <button
            onClick={send}
            disabled={sending}
            className="tap-scale rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-[15px] text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {sending
              ? 'Wird gesendet…'
              : target === 'tour'
                ? 'In-App senden · Push & E-Mail falls aktiviert'
                : 'In-App senden · Push falls aktiviert'}
          </button>
        </div>
      </div>

      <div className="mt-5 px-1">
        <span className="font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">VERLAUF</span>
      </div>

      {batchesLoading ? (
        <p className="mt-2 px-1 text-[13px] text-sft-gray">Wird geladen…</p>
      ) : batches.length === 0 ? (
        <p className="mt-2 px-1 text-[13px] text-sft-gray">Noch keine Mitteilung an dieses Ziel gesendet.</p>
      ) : (
        <div className="mt-2 overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
          {batches.map((b, i) => (
            <button
              key={b.batch_id}
              onClick={() => openBatchDetail(b)}
              className={`flex w-full flex-col gap-1 px-3.5 py-3 text-left ${i > 0 ? 'border-t border-white/7' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-semibold leading-tight">{b.title}</span>
                <span className="flex-none font-mono text-[11px] text-sft-gray">
                  {b.read_count} / {b.recipient_count} gelesen
                </span>
              </div>
              <div className="line-clamp-1 text-[13px] text-sft-gray">{b.body}</div>
              <div className="font-mono text-[10px] tracking-[0.1em] text-[#8a8a92]">
                {formatBatchTimestamp(b.created_at)}
              </div>
            </button>
          ))}
        </div>
      )}

      {openBatch && (
        <BottomSheet
          title={openBatch.title}
          subtitle={formatBatchTimestamp(openBatch.created_at)}
          onClose={() => setOpenBatch(null)}
        >
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-sft-white">{openBatch.body}</p>
          <div className="mt-5 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
            GELESEN {openBatch.read_count} / {openBatch.recipient_count}
          </div>
          {recipientsLoading ? (
            <p className="mt-2 text-[13px] text-sft-gray">Wird geladen…</p>
          ) : (
            <div className="mt-2 overflow-hidden rounded-xl border border-white/9">
              {batchRecipients?.map((r, i) => (
                <div
                  key={`${r.username}-${i}`}
                  className={`flex items-center justify-between px-3 py-2.5 text-[13px] ${
                    i > 0 ? 'border-t border-white/7' : ''
                  }`}
                >
                  <span className={r.read_at ? 'text-sft-white' : 'text-sft-gray'}>{r.username}</span>
                  <span className={`font-mono text-[11px] ${r.read_at ? 'text-sft-gray' : 'text-sft-red'}`}>
                    {r.read_at ? formatBatchTimestamp(r.read_at) : 'noch nicht gelesen'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </BottomSheet>
      )}
    </div>
  )
}
