import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { useIsAdmin } from '@/features/auth/useIsAdmin'
import { supabase } from '@/lib/supabase'
import { usePushSubscription } from '@/features/notifications/usePushSubscription'
import { RegionNotificationPreferences } from '@/features/notifications/RegionNotificationPreferences'
import type { ArchiveEntry } from '@/types/tour'
import type { Vehicle } from '@/types/vehicle'

interface Profile {
  username: string
  first_name: string
  last_name: string
  date_of_birth: string | null
}

const fieldInput =
  'rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3 text-[16px] text-sft-white'

export function ProfilePage() {
  const { user } = useAuth()
  const { isAdmin } = useIsAdmin()
  const navigate = useNavigate()
  const { permission, subscribing, error: pushError, subscribe } = usePushSubscription()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [archive, setArchive] = useState<ArchiveEntry[]>([])
  const [defaultVehicle, setDefaultVehicle] = useState<Vehicle | null>(null)
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

    supabase.rpc('get_my_tour_archive').then(({ data }) => setArchive((data as ArchiveEntry[]) ?? []))

    supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle()
      .then(({ data }) => setDefaultVehicle(data as Vehicle | null))
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

  const totalKm = archive.reduce((sum, e) => sum + (e.route_length_km ?? 0), 0)

  const links = [
    { label: 'Meine Touren', to: '/profile/tours' },
    { label: 'Tourenarchiv', to: '/profile/archive', meta: String(archive.length) },
    { label: 'Freunde', to: '/profile/friends' },
    { label: 'Meine Fahrzeuge', to: '/profile/vehicles' },
    { label: 'Mitteilungen', to: '/notifications' },
    ...(isAdmin ? [{ label: 'Admin-Bereich', to: '/admin', meta: 'TOURLEITER' }] : []),
  ]

  return (
    <div className="pb-[110px]">
      <div className="px-[18px] pb-1 pt-1.5 text-[26px] font-semibold leading-none">Profil</div>
      <div className="px-[18px] pt-2.5 font-mono text-[13px] text-sft-gray">
        {profile ? `@${profile.username}` : ''} {profile && '·'} {user?.email}
      </div>

      <div className="mx-3.5 mt-4 grid grid-cols-2 overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-b from-[#17171b] to-[#0f0f12]">
        <div className="border-r border-white/7 px-4 py-3.5">
          <div className="font-mono text-[9px] tracking-[0.18em] text-sft-gray-dim">KILOMETER</div>
          <div className="mt-1.5 font-mono text-2xl font-bold leading-none">{totalKm.toLocaleString('de-DE')}</div>
        </div>
        <div className="px-4 py-3.5">
          <div className="font-mono text-[9px] tracking-[0.18em] text-sft-gray-dim">TOUREN</div>
          <div className="mt-1.5 font-mono text-2xl font-bold leading-none">{archive.length}</div>
        </div>
        {defaultVehicle && (
          <div className="col-span-2 flex items-center justify-between border-t border-white/7 px-4 py-[13px]">
            <div>
              <div className="font-mono text-[9px] tracking-[0.18em] text-sft-gray-dim">AKTUELLES FAHRZEUG</div>
              <div className="mt-1.5 text-sm font-semibold">
                {defaultVehicle.manufacturer} {defaultVehicle.model}
              </div>
            </div>
            <div className="font-mono text-lg font-bold">
              {defaultVehicle.power_ps}
              <span className="text-[10px] text-sft-gray"> PS</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 px-3.5">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="tap-scale flex items-center justify-between rounded-2xl border border-white/8 bg-sft-card px-4 py-[15px]"
          >
            <span className="text-sm font-medium">{l.label}</span>
            <span className="flex items-center gap-2.5">
              {l.meta && <span className="font-mono text-[11px] text-sft-gray-dim">{l.meta}</span>}
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                <path d="M1 1l6 6-6 6" stroke="#5e5e66" strokeWidth="1.8" />
              </svg>
            </span>
          </Link>
        ))}
      </div>

      {permission !== 'unsupported' && (
        <div className="mx-3.5 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-sft-card px-4 py-[14px]">
          <div>
            <div className="text-sm font-medium">Push-Mitteilungen</div>
            <div className="mt-1 text-xs leading-relaxed text-sft-gray">
              Treffpunkt-Änderungen, Freigaben, Bestellfristen
            </div>
            {pushError && <p className="mt-1 text-xs text-sft-red">{pushError}</p>}
            {permission === 'denied' && (
              <p className="mt-1 text-xs text-sft-gray">
                In den Browser-/System-Einstellungen abgelehnt — dort manuell erlauben.
              </p>
            )}
          </div>
          {permission !== 'granted' ? (
            <button
              onClick={subscribe}
              disabled={subscribing}
              className="tap-scale flex-none rounded-lg border border-white/13 bg-[#17171b] px-3 py-2 text-xs font-medium disabled:opacity-60"
            >
              {subscribing ? 'Wird aktiviert…' : 'Aktivieren'}
            </button>
          ) : (
            <span className="flex-none font-mono text-[10px] tracking-[0.1em] text-[#5fd3b4]">AKTIV</span>
          )}
        </div>
      )}

      <div className="mx-3.5 mt-4">
        <RegionNotificationPreferences />
      </div>

      <div className="mt-6 flex flex-col gap-2 px-3.5">
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="tap-scale rounded-2xl border border-white/8 bg-sft-card px-4 py-[15px] text-left text-sm font-medium"
          >
            Passwort ändern
          </button>
        ) : (
          <form
            onSubmit={handlePasswordChange}
            className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-sft-card p-4 text-sm"
          >
            <label className="flex flex-col gap-1">
              Neues Passwort
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={fieldInput}
              />
            </label>
            {passwordError && <p className="text-sft-red">{passwordError}</p>}
            {passwordSaved && <p className="text-sft-gray">Passwort geändert.</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="tap-scale rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] px-4 py-2.5 font-medium text-white disabled:opacity-60"
              >
                {passwordSaving ? 'Wird gespeichert…' : 'Speichern'}
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordForm(false)}
                className="rounded-xl border border-white/13 px-4 py-2.5 text-sft-gray"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}
      </div>

      {!confirmingDelete ? (
        <div className="mt-6 flex justify-center gap-3.5 px-4 text-[11px] text-sft-gray">
          <button onClick={() => supabase.auth.signOut()}>Abmelden</button>
          <span>·</span>
          <button onClick={() => setConfirmingDelete(true)} className="text-sft-red">
            Konto löschen
          </button>
        </div>
      ) : (
        <div className="mx-3.5 mt-6 flex flex-col gap-3 rounded-2xl border border-sft-red/50 p-4 text-sm">
          <p className="font-medium">Was mit deinen Daten passiert:</p>
          <ul className="list-disc space-y-1 pl-5 text-sft-gray">
            <li>
              Username, Vor- und Nachname, Geburtsdatum sowie alle deine Touranmeldungen (inkl.
              Fahrzeugdaten und Kennzeichen, auch aus vergangenen Touren) werden vollständig gelöscht.
            </li>
            <li>
              Fremde Touren oder Anmeldungen anderer Nutzer, die du als Admin ggf. erstellt oder
              bestätigt hast, bleiben bestehen — nur der Verweis auf dich wird entfernt.
            </li>
            <li>Vor der endgültigen Löschung werden laufende Anmeldungen storniert, Wartelisten rücken nach.</li>
            <li>Dein Login ist danach nicht mehr möglich.</li>
          </ul>
          <p className="font-medium text-sft-red">Diese Aktion kann nicht rückgängig gemacht werden.</p>
          {deleteError && <p className="text-sft-red">{deleteError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="tap-scale rounded-xl bg-sft-red px-4 py-2.5 font-medium disabled:opacity-60"
            >
              {deleting ? 'Wird gelöscht…' : 'Endgültig löschen'}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="rounded-xl border border-white/13 px-4 py-2.5 text-sft-gray"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-center gap-3.5 px-4 font-mono text-[11px] text-[#8a8a92]">
        <Link to="/impressum">Impressum</Link>
        <Link to="/datenschutz">Datenschutz</Link>
      </div>
    </div>
  )
}
