import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import { rpcErrorMessage } from '@/types/tour'
import type { Friendship, UserSearchResult } from '@/types/friend'

/**
 * Freunde verwalten (siehe CLAUDE.md §34.1). Die Freundschaftsfunktion hat
 * aktuell genau einen Zweck: eine akzeptierte Freundschaft IST die
 * gegenseitige Klarnamenfreigabe — es gibt keinen separaten Freigabe-
 * Schalter. Suche, Anfragen und Liste laufen ausschließlich über
 * kontrollierte RPCs, die serverseitig auth.uid() verwenden.
 */
export function ProfileFriendsPage() {
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
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold">Freunde</h1>
      <p className="mt-1 text-sm text-sft-gray">
        Eine akzeptierte Freundschaft gibt euch gegenseitig euren Klarnamen frei — bei Touren seht ihr
        dann statt nur des Usernames auch den Vornamen des jeweils anderen. Es gibt keine weiteren
        Funktionen.
      </p>

      <div className="mt-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nutzer per Username suchen"
          className="w-full rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
        />
        {searching && <p className="mt-1 text-xs text-sft-gray">Suche…</p>}
        {results.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {results.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between rounded-md bg-sft-surface px-3 py-2 text-sm"
              >
                {u.username}
                <button
                  onClick={() => sendRequest(u.id)}
                  disabled={pendingId === u.id}
                  className="rounded-md bg-sft-red px-3 py-1 text-xs disabled:opacity-60"
                >
                  Anfrage senden
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {actionError && <p className="mt-3 text-sm text-sft-red">{actionError}</p>}

      {incoming.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium">Eingehende Anfragen</h2>
          <ul className="flex flex-col gap-1">
            {incoming.map((f) => (
              <li
                key={f.friendship_id}
                className="flex items-center justify-between rounded-md bg-sft-surface px-3 py-2 text-sm"
              >
                {f.other_username}
                <span className="flex gap-2">
                  <button
                    onClick={() => respond(f.friendship_id, true)}
                    disabled={pendingId === f.friendship_id}
                    className="rounded-md bg-sft-red px-3 py-1 text-xs disabled:opacity-60"
                  >
                    Annehmen
                  </button>
                  <button
                    onClick={() => respond(f.friendship_id, false)}
                    disabled={pendingId === f.friendship_id}
                    className="rounded-md border border-sft-surface2 px-3 py-1 text-xs text-sft-gray"
                  >
                    Ablehnen
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium">Ausgehende Anfragen</h2>
          <ul className="flex flex-col gap-1">
            {outgoing.map((f) => (
              <li
                key={f.friendship_id}
                className="flex items-center justify-between rounded-md bg-sft-surface px-3 py-2 text-sm"
              >
                {f.other_username}
                <span className="text-sft-gray">Ausstehend</span>
                <button
                  onClick={() => cancelRequest(f.friendship_id)}
                  disabled={pendingId === f.friendship_id}
                  className="rounded-md border border-sft-surface2 px-3 py-1 text-xs text-sft-gray"
                >
                  Zurückziehen
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-medium">Freunde</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-sft-gray">Noch keine Freunde.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {friends.map((f) => (
              <li
                key={f.friendship_id}
                className="flex items-center justify-between rounded-md bg-sft-surface px-3 py-2 text-sm"
              >
                {f.other_username}
                <button
                  onClick={() => endFriendship(f.friendship_id)}
                  disabled={pendingId === f.friendship_id}
                  className="rounded-md border border-sft-red/50 px-3 py-1 text-xs text-sft-red"
                >
                  Freundschaft beenden
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
