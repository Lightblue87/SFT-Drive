import { useSiteSettings } from '@/lib/useSiteSettings'
import { PageLoading } from '@/components/PageLoading'

export function ImpressumPage() {
  const { settings, loading, isComplete } = useSiteSettings()

  if (loading) return <PageLoading />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold">Impressum</h1>

      {!isComplete ? (
        <p className="mt-4 text-sm text-sft-gray">Angaben gemäß § 5 TMG folgen in Kürze.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-1 text-sm">
          <p>Angaben gemäß § 5 TMG:</p>
          {settings?.organization_name && <p>{settings.organization_name}</p>}
          <p>{settings?.responsible_name}</p>
          <p>{settings?.street}</p>
          <p>
            {settings?.postal_code} {settings?.city}
          </p>
          <p className="mt-4">Kontakt:</p>
          {settings?.contact_email && <p>E-Mail: {settings.contact_email}</p>}
          {settings?.phone && <p>Telefon: {settings.phone}</p>}
        </div>
      )}
    </div>
  )
}
