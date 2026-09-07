import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { useIsAdmin } from '@/features/auth/useIsAdmin'
import { PageLoading } from '@/components/PageLoading'

/**
 * Route Guard ist nur eine UX-Hilfe. Die eigentliche Zugriffskontrolle erfolgt
 * serverseitig über RLS und die `is_admin()`-Funktion (siehe CLAUDE.md §21.8).
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const location = useLocation()

  if (authLoading || adminLoading) return <PageLoading />

  if (!user) {
    const returnTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />
  }

  if (!isAdmin) {
    return <Navigate to="/404" replace />
  }

  return <>{children}</>
}
