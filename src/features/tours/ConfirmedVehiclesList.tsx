import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { rpcErrorMessage } from '@/types/tour'
import type { ConfirmedVehicle, FriendshipStatus } from '@/types/tour'
import { BottomSheet } from '@/components/BottomSheet'

function initials(name: string): string {
  return name.replace('@', '').slice(0, 2).toUpperCase()
}

const card = 'mt-3.5 rounded-2xl border border-white/9 bg-sft-card overflow-hidden'
const primaryButton =
  'tap-scale w-full rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-3 text-center text-[14px] font-semibold text-white disabled:opacity-60'
const ghostLinkButton =
  'tap-scale block w-full rounded-xl border border-white/12 bg-[#17171b] py-3 text-center text-[13px] font-medium text-sft-white'

interface Props {
  vehicles: ConfirmedVehicle[]
  maxVehicles?: number
}

/**
 * Liste der bestätigten mitfahrenden Fahrzeuge (§11) mit der Möglichkeit,
 * aus der Tourteilnahme heraus eine Freundschaftsanfrage zu senden (§34.1).
 *
 * Ein Tap auf eine Zeile schließt sie nicht sofort ab, sondern öffnet
 * zunächst ein Bottom-Sheet mit den Details und, falls zutreffend, dem
 * eigentlichen "Freundschaftsanfrage senden"-Button. Dieser zweistufige
 * Ablauf (Zeile antippen -> Sheet öffnet sich -> Button im Sheet antippen)
 * ist bewusst gewählt, damit beim Scrollen der Liste niemals versehentlich
 * eine Anfrage ausgelöst wird: ein Scroll-Swipe unterbricht den nativen
 * Touch/Click-Zyklus bereits vor dem ersten Tap (kein click-Event bei
 * touchmove über die Scroll-Schwelle), und selbst ein unbeabsichtigtes
 * Antippen einer Zeile öffnet nur das informative Sheet, sendet aber noch
 * nichts -- exakt dasselbe Muster wie bei Mitteilungen (NotificationsPage).
 */
export function ConfirmedVehiclesList({ vehicles, maxVehicles }: Props) {
  const [open, setOpen] = useState<ConfirmedVehicle | null>(null)
  const [statuses, setStatuses] = useState<Record<string, FriendshipStatus>>({})
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (vehicles.length === 0) return null

  const statusOf = (v: ConfirmedVehicle) => statuses[v.registration_id] ?? v.friendship_status

  async function sendRequest(v: ConfirmedVehicle) {
    setSending(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('send_friend_request', {
      p_addressee_id: v.user_id,
    })
    setSending(false)
    if (rpcError) {
      setError('Aktion fehlgeschlagen. Bitte versuche es erneut.')
      return
    }
    const result = data as { code: string }
    if (result.code !== 'OK') {
      setError(rpcErrorMessage(result.code))
      return
    }
    // Bei einer bereits eingehenden Anfrage der Gegenseite nimmt
    // send_friend_request sie direkt an (§34.1/send_friend_request) --
    // in dem Fall ist der neue Status "accepted", sonst "pending_outgoing".
    setStatuses((prev) => ({
      ...prev,
      [v.registration_id]: statusOf(v) === 'pending_incoming' ? 'accepted' : 'pending_outgoing',
    }))
  }

  return (
    <>
      <div className={card}>
        <div className="flex items-baseline justify-between px-4 pb-2.5 pt-3.5">
          <div className="font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">BESTÄTIGTE FAHRZEUGE</div>
          <div className="font-mono text-[11px] text-sft-gray">
            {maxVehicles ? `${vehicles.length}/${maxVehicles}` : vehicles.length}
          </div>
        </div>
        {vehicles.map((v) => {
          const status = statusOf(v)
          return (
            <button
              key={v.registration_id}
              type="button"
              onClick={() => {
                if (v.is_self) return
                setError(null)
                setOpen(v)
              }}
              className={`flex w-full items-center gap-2.5 border-t border-white/6 px-4 py-2.5 text-left ${
                v.is_self ? 'bg-sft-red/7' : ''
              }`}
            >
              <div
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg font-mono text-[11px] font-bold ${
                  v.is_self ? 'bg-sft-red text-white' : 'bg-white/6 text-[#c9c9ce]'
                }`}
              >
                {initials(v.first_name ?? v.username)}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-[13px] font-semibold ${v.is_self ? 'text-white' : 'text-sft-white'}`}>
                  {v.first_name && v.last_name ? `${v.first_name} ${v.last_name} · ${v.username}` : v.username}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-sft-gray">
                  {v.vehicle_manufacturer} {v.vehicle_model} · {v.vehicle_power_ps} PS
                </div>
              </div>
              {v.is_self ? (
                <span className="font-mono text-[9px] tracking-[0.12em] text-sft-red">DU</span>
              ) : status === 'accepted' ? (
                <span className="font-mono text-[9px] tracking-[0.1em] text-sft-gray-dim">FREUNDE</span>
              ) : null}
            </button>
          )
        })}
      </div>

      {open && (
        <BottomSheet
          title={open.first_name && open.last_name ? `${open.first_name} ${open.last_name}` : open.username}
          subtitle={`${open.vehicle_manufacturer} ${open.vehicle_model} · ${open.vehicle_power_ps} PS`}
          onClose={() => setOpen(null)}
        >
          {(() => {
            const status = statusOf(open)
            if (status === 'accepted') {
              return (
                <p className="text-[14px] leading-relaxed text-sft-gray">
                  Ihr seid bereits befreundet. Klarnamen sind dadurch für euch beide sichtbar.
                </p>
              )
            }
            if (status === 'pending_outgoing') {
              return (
                <p className="text-[14px] leading-relaxed text-sft-gray">
                  Du hast {open.username} bereits eine Freundschaftsanfrage gesendet. Die Antwort steht noch aus.
                </p>
              )
            }
            if (status === 'pending_incoming') {
              return (
                <>
                  <p className="mb-4 text-[14px] leading-relaxed text-sft-gray">
                    {open.username} hat dir bereits eine Freundschaftsanfrage gesendet. Antworte darauf unter
                    „Freunde" in deinem Profil.
                  </p>
                  <Link to="/profile/friends" className={ghostLinkButton}>
                    Zu Freunde
                  </Link>
                </>
              )
            }
            return (
              <>
                <p className="mb-4 text-[14px] leading-relaxed text-sft-gray">
                  Sendet {open.username} eine Freundschaftsanfrage. Wird sie angenommen, sehen ihr euch gegenseitig
                  mit Klarnamen statt nur Username.
                </p>
                {error && <p className="mb-3 text-[13px] text-sft-red">{error}</p>}
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => sendRequest(open)}
                  className={primaryButton}
                >
                  Freundschaftsanfrage senden
                </button>
              </>
            )
          })()}
        </BottomSheet>
      )}
    </>
  )
}
