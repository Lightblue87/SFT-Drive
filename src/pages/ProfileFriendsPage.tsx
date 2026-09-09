import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import { rpcErrorMessage } from '@/types/tour'
import type { Friendship, UserSearchResult } from '@/types/friend'

function initials(name: string): string {
  return name.replace('@', '').slice(0, 2).toUpperCase()
}

const fieldInput =
  'w-full rounded-xl border border-white/12 bg-sft-card px-3.5 py-3.5 text-[15px] text-sft-white outline-none focus:border-sft-red/60'

/**
 * Freunde verwalten (siehe CLAUDE.md §34.1). Die Freundschaftsfunktion hat
 * aktuell genau einen Zweck: eine akzeptierte Freundschaft IST die
 * gegenseitige Klarnamenfreigabe — es gibt keinen separaten Freigabe-
 * Schalter. Suche, Anfragen und Liste laufen ausschließlich über
 * kontrollierte RPCs, die serverseitig auth.uid() verwenden.
 */
export function ProfileFriendsPage() {
  const navigate = useNavigate()
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('list_my_friendships')
    if (!error) setFriendships((data as Friendship[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const timeout = setTimeout(async () => {
      const { data } = await supabase.rpc('search_users_by_username', { p_query: trimmed })
      setResults((data as UserSearchResult[]) ?? [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  async function sendRequest(userId: string) {
    setActionError(null)
    setPendingId(userId)
    const { data, error } = await supabase.rpc('send_friend_request', { p_addressee_id: userId })
    setPendingId(null)
    if (error) {
      setActionError('Aktion fehlgeschlagen.')
      return
    }
    const result = data as { code: string }
    if (result.code !== 'OK') {
      setActionError(rpcErrorMessage(result.code))
      return
    }
    setQuery('')
    setResults([])
    load()
  }

  async function respond(friendshipId: string, accept: boolean) {
    setActionError(null)
    setPendingId(friendshipId)
    const { error } = await supabase.rpc('respond_friend_request', {
      p_friendship_id: friendshipId,
      p_accept: accept,
    })
    setPendingId(null)
    if (error) {
      setActionError('Aktion fehlgeschlagen.')
      return
    }
    load()
  }

  async function cancelRequest(friendshipId: string) {
    setActionError(null)
    setPendingId(friendshipId)
    const { error } = await supabase.rpc('cancel_friend_request', { p_friendship_id: friendshipId })
    setPendingId(null)
    if (error) {
      setActionError('Aktion fehlgeschlagen.')
      return
    }
    load()
  }

  async function endFriendship(friendshipId: string) {
    setActionError(null)
    setPendingId(friendshipId)
    const { error } = await supabase.rpc('end_friendship', { p_friendship_id: friendshipId })
    setPendingId(null)
    if (error) {
      setActionError('Aktion fehlgeschlagen.')
      return
    }
    load()
  }

  if (loading) return <PageLoading />

  const friends = friendships.filter((f) => f.status === 'accepted')
  const incoming = friendships.filter((f) => f.status === 'pending' && f.direction === 'incoming')
  const outgoing = friendships.filter((f) => f.status === 'pending' && f.direction === 'outgoing')

  return (
    <div className="pb-[110px]">
      <div className="flex items-center gap-3 px-4 pb-3.5 pt-1.5">
        <button
          onClick={() => navigate('/profile')}
          className="tap-scale flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] border border-white/10 bg-[#131316]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M15 4 7 12l8 8" stroke="#f5f5f5" strokeWidth="2" />
          </svg>
        </button>
        <div className="text-[22px] font-semibold leading-none">Freunde</div>
      </div>

      <div className="px-3.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Username suchen, z. B. @tkoenig"
          className={fieldInput}
        />
        {searching && <p className="mt-1.5 px-1 text-xs text-sft-gray">Suche…</p>}
        {results.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {results.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-sft-card px-3.5 py-2.5 text-sm"
              >
                {u.username}
                <button
                  onClick={() => sendRequest(u.id)}
                  disabled={pendingId === u.id}
                  className="tap-scale rounded-lg bg-sft-red px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                >
                  Anfrage senden
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {actionError && <p className="mt-3 px-3.5 text-sm text-sft-red">{actionError}</p>}

      {incoming.length > 0 && (
        <div className="mx-3.5 mt-4 overflow-hidden rounded-2xl border border-sft-amber/28 bg-sft-amber/[0.06]">
          <div className="flex items-baseline justify-between px-3.5 py-[13px] pb-2.5">
            <div className="font-mono text-[9px] tracking-[0.2em] text-[#e6c07a]">OFFENE ANFRAGEN</div>
            <div className="font-mono text-[11px] font-bold text-sft-amber">{incoming.length}</div>
          </div>
          {incoming.map((f) => (
            <div
              key={f.friendship_id}
              className="flex items-center gap-2.5 border-t border-sft-amber/14 px-3.5 py-[11px]"
            >
              <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] bg-sft-amber/16 font-mono text-xs font-bold text-sft-amber">
                {initials(f.other_username)}
              </div>
              <div className="min-w-0 flex-1 text-[13px] font-semibold">{f.other_username}</div>
              <button
                onClick={() => respond(f.friendship_id, true)}
                disabled={pendingId === f.friendship_id}
                className="tap-scale flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-sft-red disabled:opacity-60"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12.5 9.5 18 20 6" stroke="#fff" strokeWidth="2.2" />
                </svg>
              </button>
              <button
                onClick={() => respond(f.friendship_id, false)}
                disabled={pendingId === f.friendship_id}
                className="tap-scale flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border border-white/14 disabled:opacity-60"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M5 5l14 14M19 5 5 19" stroke="#9a9a9a" strokeWidth="2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="mx-3.5 mt-4 overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
          <div className="px-3.5 pb-2.5 pt-[13px] font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">
            AUSGEHENDE ANFRAGEN
          </div>
          {outgoing.map((f) => (
            <div
              key={f.friendship_id}
              className="flex items-center justify-between gap-2.5 border-t border-white/6 px-3.5 py-[11px] text-[13px]"
            >
              <span className="font-semibold">{f.other_username}</span>
              <button
                onClick={() => cancelRequest(f.friendship_id)}
                disabled={pendingId === f.friendship_id}
                className="font-mono text-[11px] text-sft-gray underline disabled:opacity-60"
              >
                ZURÜCKZIEHEN
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-baseline justify-between px-[18px] pb-2 pt-[22px]">
        <div className="text-base font-semibold">Deine Freunde</div>
        <div className="font-mono text-xs text-sft-gray">{friends.length}</div>
      </div>

      {friends.length === 0 ? (
        <p className="px-[18px] text-sm text-sft-gray">Noch keine Freunde.</p>
      ) : (
        friends.map((f) => (
          <div key={f.friendship_id} className="flex items-center gap-2.5 border-t border-white/7 px-[18px] py-3">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-white/7 font-mono text-xs font-bold text-[#c9c9ce]">
              {initials(f.other_username)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {f.other_first_name && f.other_last_name
                  ? `${f.other_first_name} ${f.other_last_name}`
                  : f.other_username}
              </div>
              {f.other_first_name && (
                <div className="mt-0.5 truncate font-mono text-[11px] text-sft-gray">
                  {f.other_username}
                </div>
              )}
            </div>
            <button
              onClick={() => endFriendship(f.friendship_id)}
              disabled={pendingId === f.friendship_id}
              className="flex-none font-mono text-[9px] tracking-[0.1em] text-sft-red disabled:opacity-60"
            >
              BEENDEN
            </button>
          </div>
        ))
      )}

      <div className="mx-3.5 mt-[18px] rounded-2xl border border-dashed border-white/14 px-[15px] py-[13px] text-xs leading-relaxed text-[#8e8e96]">
        Klarnamen werden erst nach bestätigter Freundschaft gegenseitig sichtbar. In der Teilnehmerliste
        einer Tour siehst du bei Freunden dann zusätzlich zum Username den vollen Namen. Kennzeichen und
        Personenzahl bleiben immer privat.
      </div>
    </div>
  )
}
