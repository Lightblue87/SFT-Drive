import { RouterProvider } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { SplashScreen } from '@/components/SplashScreen'
import { router } from '@/routes/router'

function AppShell() {
  const { loading } = useAuth()

  if (loading) return <SplashScreen />

  return <RouterProvider router={router} />
}

export function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
