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
import { ProfileFriendsPage } from '@/pages/ProfileFriendsPage'
import { ProfileVehiclesPage } from '@/pages/ProfileVehiclesPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { ImpressumPage } from '@/pages/ImpressumPage'
import { DatenschutzPage } from '@/pages/DatenschutzPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminToursPage } from '@/pages/admin/AdminToursPage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminNotificationsPage } from '@/pages/admin/AdminNotificationsPage'
import { AdminTourFormPage } from '@/pages/admin/AdminTourFormPage'
import { AdminTourRegistrationsPage } from '@/pages/admin/AdminTourRegistrationsPage'
import { AdminTourStopsPage } from '@/pages/admin/AdminTourStopsPage'
import { AdminRestaurantStopPage } from '@/pages/admin/AdminRestaurantStopPage'

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
        path: '/profile/friends',
        element: (
          <RequireAuth>
            <ProfileFriendsPage />
          </RequireAuth>
        ),
      },
      {
        path: '/profile/vehicles',
        element: (
          <RequireAuth>
            <ProfileVehiclesPage />
          </RequireAuth>
        ),
      },
      {
        path: '/notifications',
        element: (
          <RequireAuth>
            <NotificationsPage />
          </RequireAuth>
        ),
      },

      {
        path: '/admin',
        element: (
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        ),
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'tours', element: <AdminToursPage /> },
          { path: 'tours/new', element: <AdminTourFormPage /> },
          { path: 'tours/:id/edit', element: <AdminTourFormPage /> },
          { path: 'tours/:id/registrations', element: <AdminTourRegistrationsPage /> },
          { path: 'tours/:id/stops', element: <AdminTourStopsPage /> },
          { path: 'tours/:id/stops/:stopId', element: <AdminRestaurantStopPage /> },
          { path: 'settings', element: <AdminSettingsPage /> },
          { path: 'users', element: <AdminUsersPage /> },
          { path: 'notifications', element: <AdminNotificationsPage /> },
        ],
      },

      { path: '/404', element: <NotFoundPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
