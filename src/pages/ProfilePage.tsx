import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

interface Profile {
  username: string
  first_name: string
  last_name: string
  date_of_birth: string | null
}

export function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('username, first_name, last_name, date_of_birth')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }, [user])

  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <h1 className="text-xl font-semibold">Profil</h1>

      <div className="mt-4 flex flex-col gap-1 text-sm">
        <div className="text-sft-gray">{user?.email}</div>
        {profile && (
          <>
            <div>Username: {profile.username}</div>
            <div>
              {profile.first_name} {profile.last_name}
            </div>
          </>
        )}
      </div>

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
