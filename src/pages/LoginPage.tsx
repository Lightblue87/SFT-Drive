import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

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
    <div className="mx-auto max-w-sm px-4 py-8">
      <h1 className="text-xl font-semibold">Login</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          E-Mail
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Passwort
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
          />
        </label>

        {error && <p className="text-sm text-sft-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-sft-red px-4 py-2.5 font-medium text-sft-white disabled:opacity-60"
        >
          {submitting ? 'Wird geprüft…' : 'Anmelden'}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm text-sft-gray">
        <Link to="/forgot-password" className="underline">
          Passwort vergessen?
        </Link>
        <span>
          Noch kein Konto?{' '}
          <Link
            to={`/register?returnTo=${encodeURIComponent(returnTo)}`}
            className="text-sft-white underline"
          >
            Jetzt registrieren
          </Link>
        </span>
      </div>
    </div>
  )
}
