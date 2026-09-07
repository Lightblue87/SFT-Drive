import { useEffect, useState, type FormEvent } from 'react'
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

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('username, first_name, last_name, date_of_birth')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }, [user])

  async function handlePasswordChange(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSaved(false)

    if (newPassword.length < 8) {
      setPasswordError('Das Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }

    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)

    if (error) {
      setPasswordError('Passwort konnte nicht geändert werden.')
      return
    }

    setNewPassword('')
    setPasswordSaved(true)
  }

  async function handleDeleteAccount() {
    setDeleteError(null)
    setDeleting(true)

    // Anonymisiert das Profil, storniert aktive Anmeldungen und löscht
    // anschließend den Auth-Account selbst (Edge Function, benötigt
    // service_role — siehe supabase/functions/delete-account).
    const { error } = await supabase.functions.invoke('delete-account')

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

      <div className="mt-6 border-t border-sft-surface2 pt-6">
        {!showPasswordForm ? (
          <button onClick={() => setShowPasswordForm(true)} className="text-sm underline">
            Passwort ändern
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-3 text-sm">
            <label className="flex flex-col gap-1">
              Neues Passwort
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
              />
            </label>
            {passwordError && <p className="text-sft-red">{passwordError}</p>}
            {passwordSaved && <p className="text-sft-gray">Passwort geändert.</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="rounded-md bg-sft-red px-4 py-2.5 font-medium disabled:opacity-60"
              >
                {passwordSaving ? 'Wird gespeichert…' : 'Speichern'}
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordForm(false)}
                className="rounded-md border border-sft-surface2 px-4 py-2.5 text-sft-gray"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}
      </div>

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
              Dein Profil (Username, Vor- und Nachname, Geburtsdatum) wird anonymisiert, laufende
              Touranmeldungen werden storniert und dein Konto wird anschließend endgültig
              gelöscht — ein Login ist danach nicht mehr möglich. Diese Aktion kann nicht
              rückgängig gemacht werden.
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
