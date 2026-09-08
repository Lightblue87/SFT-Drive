import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const fieldLabel = 'font-mono text-[9px] font-medium tracking-[0.2em] text-sft-gray-dim'
const fieldInput =
  'mt-2 w-full rounded-xl border border-white/12 bg-sft-card px-3.5 py-[15px] text-[16px] text-sft-white outline-none focus:border-sft-red/60'

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
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-sm flex-col justify-center px-6 py-8">
      <h1 className="text-center text-2xl font-semibold">Neues Passwort</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-[11px]">
        <label>
          <span className={fieldLabel}>NEUES PASSWORT</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
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
          {submitting ? 'Wird gespeichert…' : 'Passwort speichern'}
        </button>
      </form>
    </div>
  )
}
