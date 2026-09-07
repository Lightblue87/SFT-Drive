import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'

export function Header() {
  const { user } = useAuth()

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between border-b border-sft-surface2 bg-sft-black/95 px-4 backdrop-blur"
      style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))', paddingBottom: '0.625rem' }}
    >
      <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="text-sft-red">SFT</span>
        <span>Drive</span>
      </Link>

      {user ? (
        <Link
          to="/profile"
          className="rounded-full bg-sft-surface px-3 py-1.5 text-sm text-sft-white"
        >
          Profil
        </Link>
      ) : (
        <Link
          to="/login"
          className="rounded-full bg-sft-red px-3 py-1.5 text-sm font-medium text-sft-white"
        >
          Login
        </Link>
      )}
    </header>
  )
}
