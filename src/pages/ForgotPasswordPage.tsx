import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'

const fieldLabel = 'font-mono text-[9px] font-medium tracking-[0.2em] text-sft-gray-dim'
const fieldInput =
  'mt-2 w-full rounded-xl border border-white/12 bg-sft-card px-3.5 py-[15px] text-[16px] text-sft-white outline-none focus:border-sft-red/60'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setSubmitting(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">E-Mail unterwegs</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-sft-gray">
          Falls ein Konto mit dieser E-Mail-Adresse existiert, erhältst du gleich einen Link zum
          Zurücksetzen deines Passworts.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-sm flex-col justify-center px-6 py-8">
      <h1 className="text-center text-2xl font-semibold">Passwort vergessen</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-[11px]">
        <label>
          <span className={fieldLabel}>E-MAIL</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldInput}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="tap-scale mt-1 rounded-2xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-[17px] text-[16px] font-semibold text-white shadow-[0_12px_26px_-12px_#e10600] disabled:opacity-60"
        >
          {submitting ? 'Wird gesendet…' : 'Link anfordern'}
        </button>
      </form>
    </div>
  )
}
