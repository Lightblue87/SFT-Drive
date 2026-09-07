import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'

interface SiteSettings {
  organization_name: string
  responsible_name: string
  street: string
  postal_code: string
  city: string
  contact_email: string
  phone: string
}

const EMPTY: SiteSettings = {
  organization_name: '',
  responsible_name: '',
  street: '',
  postal_code: '',
  city: '',
  contact_email: '',
  phone: '',
}

/**
 * Angaben für Impressum/Datenschutzerklärung (siehe CLAUDE.md §7). Zentral
 * hier gepflegt, damit z. B. bei einem Zuständigkeits- oder Adresswechsel
 * kein Code geändert werden muss.
 */
export function AdminSettingsPage() {
  const [form, setForm] = useState<SiteSettings>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('*')
      .eq('id', true)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            organization_name: data.organization_name ?? '',
            responsible_name: data.responsible_name ?? '',
            street: data.street ?? '',
            postal_code: data.postal_code ?? '',
            city: data.city ?? '',
            contact_email: data.contact_email ?? '',
            phone: data.phone ?? '',
          })
        }
        setLoading(false)
      })
  }, [])

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)

    const { error: updateError } = await supabase
      .from('site_settings')
      .update({
        organization_name: form.organization_name || null,
        responsible_name: form.responsible_name || null,
        street: form.street || null,
        postal_code: form.postal_code || null,
        city: form.city || null,
        contact_email: form.contact_email || null,
        phone: form.phone || null,
      })
      .eq('id', true)

    setSaving(false)

    if (updateError) {
      setError('Speichern fehlgeschlagen.')
      return
    }

    setSaved(true)
  }

  if (loading) return <PageLoading />

  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <h1 className="text-xl font-semibold">Angaben für Impressum &amp; Datenschutz</h1>
      <p className="mt-2 text-sm text-sft-gray">
        Diese Angaben erscheinen öffentlich auf den Seiten „Impressum" und „Datenschutzerklärung".
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Verein / Organisation
          <input
            value={form.organization_name}
            onChange={(e) => set('organization_name', e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Verantwortliche Person (§ 5 TMG)
          <input
            value={form.responsible_name}
            onChange={(e) => set('responsible_name', e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Straße &amp; Hausnummer
          <input value={form.street} onChange={(e) => set('street', e.target.value)} className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            PLZ
            <input
              value={form.postal_code}
              onChange={(e) => set('postal_code', e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Ort
            <input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Kontakt-E-Mail
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => set('contact_email', e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Telefon (optional)
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
        </label>

        {error && <p className="text-sm text-sft-red">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-2 rounded-md bg-sft-red px-4 py-2.5 font-medium disabled:opacity-60"
        >
          {saving ? 'Wird gespeichert…' : 'Speichern'}
        </button>
        {saved && <p className="text-sm text-sft-gray">Gespeichert.</p>}
      </form>
    </div>
  )
}

const inputClass = 'rounded-md border border-sft-surface2 bg-sft-surface px-3 py-2 text-sft-white'
