import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { RequireAuth } from '@/routes/RequireAuth'
import { RequireAdmin } from '@/routes/RequireAdmin'

import { ToursPage } from '@/pages/ToursPage'
import { TourDetailPage } from '@/pages/TourDetailPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ProfileToursPage } from '@/pages/ProfileToursPage'
import { ProfileArchivePage } from '@/pages/ProfileArchivePage'
import { ImpressumPage } from '@/pages/ImpressumPage'
import { DatenschutzPage } from '@/pages/DatenschutzPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminToursPage } from '@/pages/admin/AdminToursPage'
import { AdminTourFormPage } from '@/pages/admin/AdminTourFormPage'
import { AdminTourRegistrationsPage } from '@/pages/admin/AdminTourRegistrationsPage'

/**
 * Zentrale Routing-Konfiguration (siehe CLAUDE.md §21). `/` und `/tours`
 * verwenden dieselbe Page-Komponente — keine doppelte Businesslogik.
 */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <ToursPage /> },
      { path: '/tours', element: <ToursPage /> },
      { path: '/tours/:slug', element: <TourDetailPage /> },

      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },

      { path: '/impressum', element: <ImpressumPage /> },
      { path: '/datenschutz', element: <DatenschutzPage /> },

      {
        path: '/profile',
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      {
        path: '/profile/tours',
        element: (
          <RequireAuth>
            <ProfileToursPage />
          </RequireAuth>
        ),
      },
      {
        path: '/profile/archive',
        element: (
          <RequireAuth>
            <ProfileArchivePage />
          </RequireAuth>
        ),
      },

      {
        path: '/admin',
        element: (
          <RequireAdmin>
            <AdminDashboardPage />
          </RequireAdmin>
        ),
      },
      {
        path: '/admin/tours',
        element: (
          <RequireAdmin>
            <AdminToursPage />
          </RequireAdmin>
        ),
      },
      {
        path: '/admin/tours/new',
        element: (
          <RequireAdmin>
            <AdminTourFormPage />
          </RequireAdmin>
        ),
      },
      {
        path: '/admin/tours/:id/edit',
        element: (
          <RequireAdmin>
            <AdminTourFormPage />
          </RequireAdmin>
        ),
      },
      {
        path: '/admin/tours/:id/registrations',
        element: (
          <RequireAdmin>
            <AdminTourRegistrationsPage />
          </RequireAdmin>
        ),
      },

      { path: '/404', element: <NotFoundPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
