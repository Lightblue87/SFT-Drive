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

const fieldLabel = 'font-mono text-[9px] font-medium tracking-[0.2em] text-sft-gray-dim'
const fieldInput =
  'mt-2 w-full rounded-xl border border-white/12 bg-[#0f0f12] px-3.5 py-3.5 text-[16px] text-sft-white outline-none focus:border-sft-red/60'

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
    <div className="pt-3">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3.5 rounded-2xl border border-white/9 bg-sft-card p-3.5"
      >
        <p className="text-[12px] leading-relaxed text-sft-gray">
          Diese Angaben erscheinen öffentlich auf „Impressum" und „Datenschutzerklärung".
        </p>

        <label>
          <span className={fieldLabel}>VEREIN / ORGANISATION</span>
          <input
            value={form.organization_name}
            onChange={(e) => set('organization_name', e.target.value)}
            className={fieldInput}
          />
        </label>
        <label>
          <span className={fieldLabel}>VERANTWORTLICH (§ 5 TMG)</span>
          <input
            value={form.responsible_name}
            onChange={(e) => set('responsible_name', e.target.value)}
            className={fieldInput}
          />
        </label>
        <label>
          <span className={fieldLabel}>STRASSE &amp; HAUSNUMMER</span>
          <input value={form.street} onChange={(e) => set('street', e.target.value)} className={fieldInput} />
        </label>
        <div className="grid grid-cols-[100px_1fr] gap-[11px]">
          <label>
            <span className={fieldLabel}>PLZ</span>
            <input
              value={form.postal_code}
              onChange={(e) => set('postal_code', e.target.value)}
              className={`${fieldInput} font-mono font-medium`}
            />
          </label>
          <label>
            <span className={fieldLabel}>ORT</span>
            <input value={form.city} onChange={(e) => set('city', e.target.value)} className={fieldInput} />
          </label>
        </div>
        <label>
          <span className={fieldLabel}>KONTAKT-E-MAIL</span>
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => set('contact_email', e.target.value)}
            className={fieldInput}
          />
        </label>
        <label>
          <span className={fieldLabel}>TELEFON (OPTIONAL)</span>
          <input
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className={`${fieldInput} font-mono font-medium`}
          />
        </label>

        {error && <p className="text-sm text-sft-red">{error}</p>}
        {saved && <p className="font-mono text-[11px] text-sft-gray">GESPEICHERT</p>}

        <button
          type="submit"
          disabled={saving}
          className="tap-scale mt-1 rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] py-[15px] text-[15px] font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Wird gespeichert…' : 'Speichern'}
        </button>
      </form>
    </div>
  )
}
