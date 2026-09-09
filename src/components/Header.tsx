import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { NotificationBell } from '@/components/NotificationBell'

export function Header() {
  const { user } = useAuth()

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-sft-black/95 backdrop-blur-md"
      style={{
        height: 'calc(4rem + env(safe-area-inset-top))',
        paddingTop: 'env(safe-area-inset-top)',
        // max(1rem, safe-area-inset) statt reinem Tailwind px-4: auf Android-Geräten
        // mit Kameraausschnitt im Querformat (§16 "Android-Chrome-Eigenheiten")
        // sonst Gefahr, dass der Header links/rechts in den Cutout läuft.
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      <Link to="/" className="flex items-center gap-2.5">
        <img src="/icons/icon-192.png" alt="" className="h-7 w-7 rounded-lg" />
        <span className="font-sans text-[15px] font-bold tracking-[0.14em]">
          SFT<span className="text-sft-red"> DRIVE</span>
        </span>
      </Link>

      {user ? (
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link
            to="/profile"
            className="tap-scale rounded-xl border border-white/10 bg-gradient-to-b from-[#17171a] to-[#101013] px-3.5 py-2 text-sm font-medium text-sft-white"
          >
            Profil
          </Link>
        </div>
      ) : (
        <Link
          to="/login"
          className="tap-scale rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_#e10600]"
        >
          Login
        </Link>
      )}
    </header>
  )
}
