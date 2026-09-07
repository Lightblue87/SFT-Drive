import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface SiteSettings {
  organization_name: string | null
  responsible_name: string | null
  street: string | null
  postal_code: string | null
  city: string | null
  contact_email: string | null
  phone: string | null
}

/** Öffentlich lesbare Angaben für Impressum/Datenschutz, siehe CLAUDE.md §7. */
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('organization_name, responsible_name, street, postal_code, city, contact_email, phone')
      .eq('id', true)
      .single()
      .then(({ data }) => {
        setSettings(data)
        setLoading(false)
      })
  }, [])

  const isComplete = !!(settings?.responsible_name && settings?.street && settings?.contact_email)

  return { settings, loading, isComplete }
}
