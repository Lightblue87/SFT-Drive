import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

interface Profile {
  username: string
  first_name: string
  last_name: string
  date_of_birth: string | null
}

export function ProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('username, first_name, last_name, date_of_birth')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }, [user])

  async function handleDeleteAccount() {
    setDeleteError(null)
    setDeleting(true)

    const { error } = await supabase.rpc('delete_own_account')

    if (error) {
      setDeleteError('Konto konnte nicht gelöscht werden. Bitte versuche es erneut.')
      setDeleting(false)
      return
    }

    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <h1 className="text-xl font-semibold">Profil</h1>

      <div className="mt-4 flex flex-col gap-1 text-sm">
        <div className="text-sft-gray">{user?.email}</div>
        {profile && (
          <>
            <div>Username: {profile.username}</div>
            <div>
              {profile.first_name} {profile.last_name}
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 text-sm">
        <Link to="/profile/tours" className="rounded-md bg-sft-surface px-4 py-3">
          Meine Touren
        </Link>
        <Link to="/profile/archive" className="rounded-md bg-sft-surface px-4 py-3">
          Tourenarchiv
        </Link>
      </div>

      <button
        onClick={() => supabase.auth.signOut()}
        className="mt-8 rounded-md border border-sft-surface2 px-4 py-2.5 text-sm text-sft-gray"
      >
        Abmelden
      </button>

      <div className="mt-8 border-t border-sft-surface2 pt-6">
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="text-sm text-sft-red underline"
          >
            Konto löschen
          </button>
        ) : (
          <div className="flex flex-col gap-3 rounded-md border border-sft-red/50 p-4 text-sm">
            <p>
              Dein Profil (Username, Vor- und Nachname, Geburtsdatum) wird anonymisiert und
              laufende Touranmeldungen werden storniert. Diese Aktion kann nicht rückgängig
              gemacht werden.
            </p>
            {deleteError && <p className="text-sft-red">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="rounded-md bg-sft-red px-4 py-2.5 font-medium disabled:opacity-60"
              >
                {deleting ? 'Wird gelöscht…' : 'Endgültig löschen'}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="rounded-md border border-sft-surface2 px-4 py-2.5 text-sft-gray"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
