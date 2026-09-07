import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { SplashScreen } from '@/components/SplashScreen'
import { router } from '@/routes/router'

// Kurze Mindestanzeigedauer, damit der Marken-Moment tatsächlich wahrnehmbar
// ist (Supabase liest die Session oft in wenigen Millisekunden aus dem
// lokalen Speicher). Bewusst kurz gehalten, um §16 nicht zu verletzen
// ("keine kritischen Daten... hinter einer künstlich verlängerten
// Splash-Animation blockieren") — kein künstliches Warten auf das ganze Video.
const MIN_SPLASH_MS = 700

function AppShell() {
  const { loading } = useAuth()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setMinTimeElapsed(true)
      return
    }
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS)
    return () => clearTimeout(timer)
  }, [])

  if (loading || !minTimeElapsed) return <SplashScreen />

  return <RouterProvider router={router} />
}

export function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
