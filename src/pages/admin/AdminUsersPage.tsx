import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import { rpcErrorMessage } from '@/types/tour'

interface UserRow {
  id: string
  username: string
  first_name: string
  last_name: string
  is_admin: boolean
}

/**
 * Admin-Verwaltung anderer Nutzer als Admin (siehe CLAUDE.md §21.3). Damit
 * eine Admin-Übergabe (z. B. bei Zuständigkeitswechsel) ohne direkten
 * Datenbankzugriff möglich ist.
 */
export function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.rpc('admin_list_users')
    setUsers((data as UserRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

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

  if (loading) return <PageLoading />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold">Nutzerverwaltung</h1>

      {actionError && <p className="mt-3 text-sm text-sft-red">{actionError}</p>}

      <ul className="mt-4 flex flex-col gap-2">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex flex-col gap-2 rounded-md bg-sft-surface p-3 text-sm"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2 break-all font-medium">
                {user.username}
                {user.is_admin && (
                  <span className="shrink-0 rounded bg-sft-red px-1.5 py-0.5 text-[11px]">Admin</span>
                )}
              </div>
              <div className="text-sft-gray">
                {user.first_name} {user.last_name}
              </div>
            </div>
            <button
              onClick={() => toggleAdmin(user)}
              disabled={pendingId === user.id}
              className="self-start rounded-md border border-sft-surface2 px-3 py-1.5 text-xs disabled:opacity-60"
            >
              {user.is_admin ? 'Admin entfernen' : 'Zum Admin machen'}
            </button>
          </li>
        ))}
        {users.length === 0 && <p className="text-sm text-sft-gray">Keine Nutzer gefunden.</p>}
      </ul>
    </div>
  )
}
