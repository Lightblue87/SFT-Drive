import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'

/**
 * Adminstatus wird ausschließlich serverseitig ermittelt (siehe CLAUDE.md §5, §8.2).
 * Diese RPC existiert erst, sobald die Supabase-Migrationen angelegt sind — bis dahin
 * liefert der Hook sicher `false` statt einen Fehler zu werfen.
 */
export function useIsAdmin() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .rpc('is_admin')
      .then(({ data, error }) => {
        if (cancelled) return
        setIsAdmin(!error && data === true)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  return { isAdmin, loading }
}
