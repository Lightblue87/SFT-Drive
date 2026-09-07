import { NavLink } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { useIsAdmin } from '@/features/auth/useIsAdmin'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
    isActive ? 'text-sft-red' : 'text-sft-gray'
  }`

/**
 * Kompakte Bottom-Navigation, maximal 4 primäre Ziele (siehe CLAUDE.md §21.6).
 * Archiv ist bewusst nicht als eigener Punkt geführt, sondern über /profile erreichbar.
 */
export function BottomNav() {
  const { user } = useAuth()
  const { isAdmin } = useIsAdmin()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-sft-surface2 bg-sft-black/95 backdrop-blur">
      <NavLink to="/tours" className={linkClass}>
        Touren
      </NavLink>

      {user ? (
        <>
          <NavLink to="/profile/tours" className={linkClass}>
            Meine Touren
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          )}
          <NavLink to="/profile" className={linkClass}>
            Profil
          </NavLink>
        </>
      ) : (
        <NavLink to="/login" className={linkClass}>
          Login
        </NavLink>
      )}
    </nav>
  )
}
