import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PENDING_VEHICLE_STORAGE_KEY } from '@/features/auth/pendingVehicle'

const fieldLabel = 'font-mono text-[9px] font-medium tracking-[0.2em] text-sft-gray-dim'
const fieldInput =
  'mt-2 w-full rounded-xl border border-white/12 bg-sft-card px-3.5 py-[15px] text-[16px] text-sft-white outline-none focus:border-sft-red/60'

/**
 * Registrierung mit E-Mail/Passwort + Onboarding-Feldern (Username, Vorname,
 * Nachname) und Zustimmung zur Datenschutzerklärung (siehe CLAUDE.md §6, §7),
 * als 3-Schritt-Assistent (Zugangsdaten → Wer fährt? → Erstes Fahrzeug).
 *
 * Das optionale erste Fahrzeug landet nicht direkt in `vehicles` — bis zur
 * E-Mail-Bestätigung existiert noch keine Session, RLS würde den Insert
 * ablehnen. Stattdessen wird es kurzzeitig in localStorage zwischengelegt und
 * von `AuthProvider` nach dem ersten erfolgreichen Login automatisch in die
 * Garage übernommen (siehe `features/auth/pendingVehicle.ts`).
 */
export function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/'

  const [step, setStep] = useState(1)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [vehicleMaker, setVehicleMaker] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehiclePs, setVehiclePs] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)

  async function goNext() {
    setError(null)

    if (step === 1) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Bitte eine gültige E-Mail-Adresse angeben.')
        return
      }
      if (password.length < 8) {
        setError('Das Passwort muss mindestens 8 Zeichen lang sein.')
        return
      }
      setStep(2)
      return
    }

    if (step === 2) {
      if (!firstName.trim() || !lastName.trim() || !username.trim()) {
        setError('Bitte Vorname, Nachname und Username angeben.')
        return
      }

      // Ohne diese Prüfung würde ein bereits vergebener Username (case-
      // insensitiv, §8.1) erst ganz am Ende von Schritt 3 auffallen: der
      // Insert in profiles läuft innerhalb derselben Transaktion wie
      // signUp(), GoTrue gibt den konkreten Postgres-Fehler dabei aber nicht
      // an den Client weiter. Der Nutzer sähe dann eine unspezifische
      // Fehlermeldung unter dem Fahrzeug-Formular, ohne zu erfahren, dass der
      // Username in Schritt 2 das eigentliche Problem war.
      setCheckingUsername(true)
      const { data: available, error: checkError } = await supabase.rpc('is_username_available', {
        p_username: username.trim(),
      })
      setCheckingUsername(false)

      if (!checkError && available === false) {
        setError('Dieser Username ist bereits vergeben. Bitte wähle einen anderen.')
        return
      }

      setStep(3)
      return
    }

    handleSubmit()
  }

  function goBack() {
    setError(null)
    if (step === 1) {
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`)
      return
    }
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleSubmit() {
    if (!privacyAccepted) {
      setError('Bitte stimme der Datenschutzerklärung zu.')
      return
    }

    setSubmitting(true)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${returnTo}`,
        data: {
          username: username.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          privacy_policy_accepted_at: new Date().toISOString(),
        },
      },
    })

    setSubmitting(false)

    if (signUpError) {
      // Vollständigen Fehler immer loggen (§18: nicht nur Konsole, aber die
      // konkrete Ursache muss zumindest dort nachvollziehbar sein) — GoTrue
      // liefert seit auth-js v2 einen stabilen `code`, der Message-Text kann
      // sich je Server-Version unterscheiden.
      console.error('Registrierung fehlgeschlagen:', signUpError)

      const code = (signUpError as { code?: string }).code
      const msg = signUpError.message?.toLowerCase() ?? ''

      if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) {
        setError('Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an oder setze dein Passwort zurück.')
      } else if (code === 'weak_password') {
        setError('Das Passwort ist zu schwach (z. B. zu leicht zu erraten). Bitte ein anderes Passwort wählen.')
      } else if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
        setError('Zu viele Versuche in kurzer Zeit. Bitte warte einen Moment und versuche es erneut.')
      } else if (code === 'email_address_invalid' || code === 'email_address_not_authorized') {
        setError('Diese E-Mail-Adresse wird leider nicht akzeptiert. Bitte eine andere verwenden.')
      } else {
        setError('Registrierung fehlgeschlagen. Bitte Angaben prüfen.')
      }
      return
    }

    if (signUpData.user && vehicleMaker.trim() && vehicleModel.trim() && vehiclePs) {
      localStorage.setItem(
        PENDING_VEHICLE_STORAGE_KEY,
        JSON.stringify({
          user_id: signUpData.user.id,
          manufacturer: vehicleMaker.trim(),
          model: vehicleModel.trim(),
          power_ps: Number(vehiclePs),
          license_plate: vehiclePlate.trim() || null,
        }),
      )
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-sm px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Fast geschafft</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-sft-gray">
          Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir gerade geschickt haben.
        </p>
      </div>
    )
  }

  return (
    <div className="pb-[130px]">
      <div className="flex items-center gap-3 px-4 pb-3.5 pt-1.5">
        <button
          onClick={goBack}
          className="tap-scale flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] border border-white/10 bg-[#131316]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M15 4 7 12l8 8" stroke="#f5f5f5" strokeWidth="2" />
          </svg>
        </button>
        <div>
          <div className="text-[21px] font-semibold leading-none">Konto anlegen</div>
          <div className="mt-1.5 font-mono text-[10px] tracking-[0.16em] text-sft-gray">
            SCHRITT {step} VON 3
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 px-[18px] pb-[18px]">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-[3px] flex-1 rounded-sm ${n <= step ? 'bg-sft-red' : 'bg-white/12'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-[13px] px-[18px]">
          <div className="text-lg font-semibold leading-tight">Zugangsdaten</div>
          <label>
            <span className={fieldLabel}>E-MAIL</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="du@example.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldInput}
            />
          </label>
          <label>
            <span className={fieldLabel}>PASSWORT · MIND. 8 ZEICHEN</span>
            <input
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldInput}
            />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-[13px] px-[18px]">
          <div className="text-lg font-semibold leading-tight">Wer fährt?</div>
          <div className="grid grid-cols-2 gap-[11px]">
            <label>
              <span className={fieldLabel}>VORNAME</span>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={fieldInput} />
            </label>
            <label>
              <span className={fieldLabel}>NACHNAME</span>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={fieldInput} />
            </label>
          </div>
          <label>
            <span className={fieldLabel}>USERNAME · ÖFFENTLICH SICHTBAR</span>
            <input
              placeholder="dein_name"
              value={username}
              // Ohne führendes @ speichern — die Darstellung ergänzt es
              // (Profil, Teilnehmerlisten), sonst entstünde "@@name".
              onChange={(e) => setUsername(e.target.value.replace(/^@+/, ''))}
              className={fieldInput}
            />
          </label>
          {/* Kein Geburtsdatum hier: §7 verlangt ausdrücklich, es erst zu
              erheben, wenn eine Tour eine Altersanforderung hat — danach fragt
              das Anmeldeformular gezielt (RegistrationForm.tsx). */}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-[13px] px-[18px]">
          <div className="text-lg font-semibold leading-tight">Erstes Fahrzeug</div>
          <p className="text-[13px] leading-relaxed text-sft-gray">
            Landet direkt in deiner Garage — bei der Tour-Anmeldung musst du dann nichts mehr eintippen.
          </p>
          <div className="grid grid-cols-2 gap-[11px]">
            <label>
              <span className={fieldLabel}>HERSTELLER</span>
              <input
                placeholder="Porsche"
                value={vehicleMaker}
                onChange={(e) => setVehicleMaker(e.target.value)}
                className={fieldInput}
              />
            </label>
            <label>
              <span className={fieldLabel}>MODELL</span>
              <input
                placeholder="911 Carrera S"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className={fieldInput}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-[11px]">
            <label>
              <span className={fieldLabel}>LEISTUNG (PS)</span>
              <input
                inputMode="numeric"
                placeholder="450"
                value={vehiclePs}
                onChange={(e) => setVehiclePs(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                className={`${fieldInput} font-mono font-semibold`}
              />
            </label>
            <label>
              <span className={fieldLabel}>KENNZEICHEN</span>
              <input
                placeholder="KA-SF 911"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                className={`${fieldInput} font-mono font-semibold`}
              />
            </label>
          </div>
          <label className="mt-1 flex items-start gap-2.5 rounded-2xl border border-white/10 bg-sft-card p-[13px] text-[12px] leading-relaxed text-[#8e8e96]">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Mit dem Anlegen akzeptierst du die{' '}
              <a
                href="/datenschutz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sft-white underline"
              >
                Datenschutzerklärung
              </a>
              . Kennzeichen sind nur für die Tourleitung sichtbar.
            </span>
          </label>
        </div>
      )}

      {error && <p className="mt-3 px-[18px] text-sm text-sft-red">{error}</p>}

      <div
        className="fixed inset-x-0 z-20 bg-gradient-to-t from-sft-black via-sft-black/90 to-transparent px-[18px] pb-3.5 pt-6"
        style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={goNext}
          disabled={submitting || checkingUsername}
          className="tap-scale w-full rounded-2xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-[17px] text-[16px] font-semibold text-white shadow-[0_12px_26px_-12px_#e10600] disabled:opacity-60"
        >
          {submitting
            ? 'Wird gesendet…'
            : checkingUsername
              ? 'Wird geprüft…'
              : step === 3
                ? 'Konto anlegen'
                : 'Weiter'}
        </button>
      </div>

      <p className="mt-6 px-[18px] text-sm text-sft-gray">
        Schon registriert?{' '}
        <Link
          to={`/login?returnTo=${encodeURIComponent(returnTo)}`}
          className="text-sft-white underline"
        >
          Zum Login
        </Link>
      </p>
    </div>
  )
}
