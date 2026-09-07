import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/**
 * Registrierung mit E-Mail/Passwort + Onboarding-Feldern (Username, Vorname,
 * Nachname) und Zustimmung zur Datenschutzerklärung (siehe CLAUDE.md §6, §7).
 *
 * Die Felder werden als `user_metadata` übergeben. Sobald die `profiles`-Migration
 * existiert, übernimmt ein serverseitiger Trigger diese Daten in `profiles`
 * (Username-Eindeutigkeit wird dort geprüft, nicht im Client).
 */
export function RegisterPage() {
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!privacyAccepted) {
      setError('Bitte stimme der Datenschutzerklärung zu.')
      return
    }

    setSubmitting(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${returnTo}`,
        data: {
          username,
          first_name: firstName,
          last_name: lastName,
          privacy_policy_accepted_at: new Date().toISOString(),
        },
      },
    })

    setSubmitting(false)

    if (signUpError) {
      setError('Registrierung fehlgeschlagen. Bitte Angaben prüfen.')
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-sm px-4 py-8">
        <h1 className="text-xl font-semibold">Fast geschafft</h1>
        <p className="mt-4 text-sm text-sft-gray">
          Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir gerade geschickt haben.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <h1 className="text-xl font-semibold">Registrierung</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Username
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Vorname
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Nachname
          <input
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
          />
        </label>

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
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
          />
        </label>

        <label className="flex items-start gap-2 text-sm text-sft-gray">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(e) => setPrivacyAccepted(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Ich stimme der{' '}
            <Link to="/datenschutz" className="text-sft-white underline">
              Datenschutzerklärung
            </Link>{' '}
            zu.
          </span>
        </label>

        {error && <p className="text-sm text-sft-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-sft-red px-4 py-2.5 font-medium text-sft-white disabled:opacity-60"
        >
          {submitting ? 'Wird gesendet…' : 'Registrieren'}
        </button>
      </form>

      <p className="mt-6 text-sm text-sft-gray">
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
