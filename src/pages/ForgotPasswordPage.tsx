import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'

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
      <div className="mx-auto max-w-sm px-4 py-8">
        <h1 className="text-xl font-semibold">E-Mail unterwegs</h1>
        <p className="mt-4 text-sm text-sft-gray">
          Falls ein Konto mit dieser E-Mail-Adresse existiert, erhältst du gleich einen Link zum
          Zurücksetzen deines Passworts.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <h1 className="text-xl font-semibold">Passwort vergessen</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          E-Mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-sft-red px-4 py-2.5 font-medium text-sft-white disabled:opacity-60"
        >
          {submitting ? 'Wird gesendet…' : 'Link anfordern'}
        </button>
      </form>
    </div>
  )
}
