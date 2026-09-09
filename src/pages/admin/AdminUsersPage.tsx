import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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

function initials(name: string): string {
  return name.replace('@', '').slice(0, 2).toUpperCase()
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
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_list_users')
    if (error) {
      setLoadError(error.message)
      setUsers([])
      setLoading(false)
      return
    }
    setLoadError(null)
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
    <div className="pt-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Username, Name oder E-Mail"
        className="w-full rounded-xl border border-white/12 bg-sft-card px-3.5 py-3.5 text-[16px] text-sft-white"
      />

      {loadError && (
        <p className="mt-3 text-sm text-sft-red">Nutzer konnten nicht geladen werden: {loadError}</p>
      )}
      {actionError && <p className="mt-3 text-sm text-sft-red">{actionError}</p>}

      <div className="mt-3.5 flex flex-col gap-2.5">
        {filteredUsers.map((user) => (
          <div key={user.id} className="overflow-hidden rounded-2xl border border-white/9 bg-sft-card">
            <Link to={`/admin/users/${user.id}`} className="tap-scale flex items-center gap-2.5 px-[15px] py-3.5">
              <div
                className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] font-mono text-xs font-bold ${
                  user.is_admin ? 'bg-sft-red text-white' : user.is_banned ? 'bg-white/4 text-[#c9c9ce]' : 'bg-white/7 text-[#c9c9ce]'
                }`}
              >
                {initials(user.username)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-semibold">{user.username}</span>
                  {user.is_admin && (
                    <span className="flex-none rounded-md bg-sft-red/18 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em] text-[#ff6b63]">
                      ADMIN
                    </span>
                  )}
                  {user.is_banned && (
                    <span className="flex-none rounded-md bg-sft-amber/16 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em] text-sft-amber">
                      GESPERRT
                    </span>
                  )}
                </div>
                <div className="mt-1 break-all font-mono text-[11px] leading-relaxed text-sft-gray">
                  {user.first_name} {user.last_name}
                  <br />
                  {user.email}
                </div>
                <div className="mt-1 font-mono text-[10px] text-[#8a8a92]">
                  SEIT{' '}
                  {new Date(user.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <svg width="9" height="14" viewBox="0 0 9 14" fill="none" className="flex-none text-sft-gray">
                <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div className="grid grid-cols-3 gap-px border-t border-white/6 bg-white/6">
              <button
                onClick={() => toggleAdmin(user)}
                disabled={pendingId === user.id}
                className="bg-sft-card px-2 py-2.5 text-[11px] font-medium text-[#c9c9ce] disabled:opacity-60"
              >
                {user.is_admin ? 'Admin entfernen' : 'Zum Admin'}
              </button>
              <button
                onClick={() => toggleBan(user)}
                disabled={pendingId === user.id}
                className="bg-sft-card px-2 py-2.5 text-[11px] font-medium text-[#c9c9ce] disabled:opacity-60"
              >
                {user.is_banned ? 'Entsperren' : 'Sperren'}
              </button>
              {/* Kontolöschung ist endgültig — die Bestätigung braucht deshalb
                  einen sichtbaren Weg zurück, nicht nur "Wirklich?". */}
              {confirmDeleteId === user.id ? (
                <div className="flex bg-sft-card">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 px-2 py-2.5 text-[11px] font-medium text-[#c9c9ce]"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => deleteUser(user)}
                    disabled={pendingId === user.id}
                    className="flex-1 bg-sft-red px-2 py-2.5 text-[11px] font-medium text-white disabled:opacity-60"
                  >
                    Endgültig löschen
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(user.id)}
                  className="bg-sft-card px-2 py-2.5 text-[11px] font-medium text-[#ff6b63]"
                >
                  Löschen
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && <p className="text-sm text-sft-gray">Keine Nutzer gefunden.</p>}
      </div>
    </div>
  )
}
