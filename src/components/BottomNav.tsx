import { NavLink } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { useIsAdmin } from '@/features/auth/useIsAdmin'

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `tap-scale flex flex-1 flex-col items-center gap-1 py-2 pt-2.5 text-[10px] font-medium ${
    isActive ? 'text-sft-red' : 'text-sft-gray'
  }`

function ToursIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 18 8 6l4 8 3-5 5 9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function MyToursIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6 20V4h11l-2.5 4L17 12H6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 20a8 8 0 0 1 16 0M8 4h8v8H8z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function AdminIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l7 3v5.5c0 4-3 7-7 8.5-4-1.5-7-4.5-7-8.5V6l7-3Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function GarageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20v-8l2.5-5h11L20 12v8M4 20h2v-2h12v2h2M4 20h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="15.5" r="1.3" fill="currentColor" />
      <circle cx="16.5" cy="15.5" r="1.3" fill="currentColor" />
    </svg>
  )
}

/**
 * Kompakte Bottom-Navigation. Archiv und Freunde sind bewusst nicht als
 * eigener Punkt geführt, sondern über /profile erreichbar (siehe CLAUDE.md
 * §21.6) — die Garage wurde auf ausdrücklichen Wunsch als eigenes primäres
 * Ziel ergänzt. Admin steht bewusst ganz rechts als letzter Punkt.
 */
export function BottomNav() {
  const { user } = useAuth()
  const { isAdmin } = useIsAdmin()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-white/8 bg-sft-black/95 backdrop-blur-md"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        // Landscape-Kameraausschnitt auf Android (§16 "Android-Chrome-Eigenheiten"):
        // ohne das würden die äußeren Nav-Punkte im Querformat in den Cutout laufen.
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <NavLink to="/tours" className={itemClass}>
        <ToursIcon />
        Touren
      </NavLink>

      {user ? (
        <>
          <NavLink to="/profile/tours" className={itemClass}>
            <MyToursIcon />
            Meine Touren
          </NavLink>
          <NavLink to="/profile/vehicles" className={itemClass}>
            <GarageIcon />
            Garage
          </NavLink>
          <NavLink to="/profile" end className={itemClass}>
            <ProfileIcon />
            Profil
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={itemClass}>
              <AdminIcon />
              Admin
            </NavLink>
          )}
        </>
      ) : (
        <NavLink to="/login" className={itemClass}>
          <ProfileIcon />
          Login
        </NavLink>
      )}
    </nav>
  )
}
