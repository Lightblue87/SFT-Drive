import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/** Nur über den gültigen Auth-Recovery-Link erreichbar (siehe CLAUDE.md §21.1). */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    setSubmitting(false)

    if (updateError) {
      setError('Passwort konnte nicht gesetzt werden. Bitte fordere einen neuen Link an.')
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <h1 className="text-xl font-semibold">Neues Passwort</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Neues Passwort
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

        {error && <p className="text-sm text-sft-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-sft-red px-4 py-2.5 font-medium text-sft-white disabled:opacity-60"
        >
          {submitting ? 'Wird gespeichert…' : 'Passwort speichern'}
        </button>
      </form>
    </div>
  )
}
