import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const fieldLabel = 'font-mono text-[9px] font-medium tracking-[0.2em] text-sft-gray-dim'
const fieldInput =
  'mt-2 w-full rounded-xl border border-white/12 bg-sft-card px-3.5 py-[15px] text-[16px] text-sft-white outline-none focus:border-sft-red/60'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    setSubmitting(false)

    if (signInError) {
      setError('E-Mail oder Passwort ist falsch.')
      return
    }

    navigate(returnTo, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-sm flex-col justify-center px-6 py-8">
      <img src="/icons/icon-192.png" alt="" className="mx-auto h-[76px] w-[76px] rounded-[20px]" />
      <h1 className="mt-5 text-center text-2xl font-semibold leading-tight">Willkommen zurück</h1>
      <p className="mt-2 text-center text-[13px] leading-relaxed text-sft-gray">
        Melde dich an, um dich für Ausfahrten anzumelden.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-[11px]">
        <label>
          <span className={fieldLabel}>E-MAIL</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldInput}
          />
        </label>

        <label>
          <span className={fieldLabel}>PASSWORT</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldInput}
          />
        </label>

        {error && <p className="text-sm text-sft-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="tap-scale mt-1 rounded-2xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-[17px] text-[16px] font-semibold text-white shadow-[0_12px_26px_-12px_#e10600] disabled:opacity-60"
        >
          {submitting ? 'Wird geprüft…' : 'Anmelden'}
        </button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-3 text-[13px] text-sft-gray">
        <Link to="/forgot-password" className="underline">
          Passwort vergessen?
        </Link>
        <Link
          to={`/register?returnTo=${encodeURIComponent(returnTo)}`}
          className="font-medium text-sft-white underline"
        >
          Noch kein Konto? Jetzt registrieren
        </Link>
      </div>

      <div className="mt-8 flex items-center gap-[11px] rounded-2xl border border-dashed border-white/14 px-[15px] py-[13px]">
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-white/6">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M12 4v12m0 0-5-5m5 5 5-5M4 20h16" stroke="#9a9a9a" strokeWidth="1.8" />
          </svg>
        </span>
        <span className="text-[12px] leading-relaxed text-[#8e8e96]">
          Tipp: „Zum Home-Bildschirm hinzufügen" — SFT Drive läuft dann wie eine App, auch offline.
        </span>
      </div>
    </div>
  )
}
