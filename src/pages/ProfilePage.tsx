import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

/**
 * TODO (nächste Phase): Username, Vorname, Nachname und Geburtsdatum aus
 * `profiles` laden/bearbeiten, sobald die Migration existiert.
 */
export function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <h1 className="text-xl font-semibold">Profil</h1>

      <p className="mt-4 text-sm text-sft-gray">{user?.email}</p>

      <div className="mt-6 flex flex-col gap-3 text-sm">
        <Link to="/profile/tours" className="rounded-md bg-sft-surface px-4 py-3">
          Meine Touren
        </Link>
        <Link to="/profile/archive" className="rounded-md bg-sft-surface px-4 py-3">
          Tourenarchiv
        </Link>
      </div>

      <button
        onClick={() => supabase.auth.signOut()}
        className="mt-8 rounded-md border border-sft-surface2 px-4 py-2.5 text-sm text-sft-gray"
      >
        Abmelden
      </button>
    </div>
  )
}
