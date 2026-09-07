import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import { rpcErrorMessage } from '@/types/tour'

interface UserRow {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  created_at: string
  is_admin: boolean
  is_banned: boolean
}

/**
 * Admin-Verwaltung anderer Nutzer (siehe CLAUDE.md §21.3, §27.20): Admin-
 * Rolle vergeben/entziehen (z. B. für eine Admin-Übergabe), Details ansehen,
 * Konto sperren/entsperren oder löschen — ohne direkten Datenbankzugriff.
 */
export function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.rpc('admin_list_users')
    setUsers((data as UserRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      [u.username, u.first_name, u.last_name, u.email].some((field) => field?.toLowerCase().includes(q)),
    )
  }, [users, query])

  async function toggleAdmin(user: UserRow) {
    setActionError(null)
    setPendingId(user.id)

    const { data, error } = await supabase.rpc('admin_set_admin_role', {
      p_user_id: user.id,
      p_grant: !user.is_admin,
    })

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

    load()
  }

  async function toggleBan(user: UserRow) {
    setActionError(null)
    setPendingId(user.id)

    const { error } = await supabase.functions.invoke('admin-manage-user', {
      body: { action: user.is_banned ? 'unban' : 'ban', user_id: user.id },
    })

    setPendingId(null)

    if (error) {
      setActionError('Aktion fehlgeschlagen.')
      return
    }

    load()
  }

  async function deleteUser(user: UserRow) {
    setActionError(null)
    setPendingId(user.id)

    const { error } = await supabase.functions.invoke('admin-manage-user', {
      body: { action: 'delete', user_id: user.id },
    })

    setPendingId(null)
    setConfirmDeleteId(null)

    if (error) {
      setActionError('Konto konnte nicht gelöscht werden.')
      return
    }

    load()
  }

  if (loading) return <PageLoading />

  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold">Nutzerverwaltung</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Suche nach Username, Name oder E-Mail"
        className="mt-4 w-full rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
      />

      {actionError && <p className="mt-3 text-sm text-sft-red">{actionError}</p>}

      <ul className="mt-4 flex flex-col gap-2">
        {filteredUsers.map((user) => (
          <li key={user.id} className="flex flex-col gap-2 rounded-md bg-sft-surface p-3 text-sm">
            <div>
              <div className="flex flex-wrap items-center gap-2 break-all font-medium">
                {user.username}
                {user.is_admin && (
                  <span className="shrink-0 rounded bg-sft-red px-1.5 py-0.5 text-[11px]">Admin</span>
                )}
                {user.is_banned && (
                  <span className="shrink-0 rounded bg-sft-surface2 px-1.5 py-0.5 text-[11px] text-sft-gray">
                    Gesperrt
                  </span>
                )}
              </div>
              <div className="text-sft-gray">
                {user.first_name} {user.last_name}
              </div>
              <div className="break-all text-sft-gray">{user.email}</div>
              <div className="text-sft-gray">
                Registriert seit{' '}
                {new Date(user.created_at).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleAdmin(user)}
                disabled={pendingId === user.id}
                className="rounded-md border border-sft-surface2 px-3 py-1.5 text-xs disabled:opacity-60"
              >
                {user.is_admin ? 'Admin entfernen' : 'Zum Admin machen'}
              </button>
              <button
                onClick={() => toggleBan(user)}
                disabled={pendingId === user.id}
                className="rounded-md border border-sft-surface2 px-3 py-1.5 text-xs disabled:opacity-60"
              >
                {user.is_banned ? 'Entsperren' : 'Sperren'}
              </button>
              {confirmDeleteId === user.id ? (
                <>
                  <button
                    onClick={() => deleteUser(user)}
                    disabled={pendingId === user.id}
                    className="rounded-md bg-sft-red px-3 py-1.5 text-xs disabled:opacity-60"
                  >
                    Wirklich löschen?
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-md border border-sft-surface2 px-3 py-1.5 text-xs text-sft-gray"
                  >
                    Abbrechen
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(user.id)}
                  className="rounded-md border border-sft-red/50 px-3 py-1.5 text-xs text-sft-red"
                >
                  Konto löschen
                </button>
              )}
            </div>
          </li>
        ))}
        {filteredUsers.length === 0 && <p className="text-sm text-sft-gray">Keine Nutzer gefunden.</p>}
      </ul>
    </div>
  )
}
