import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/PageLoading'
import type { Vehicle } from '@/types/vehicle'

interface UserRow {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  created_at: string
  is_admin: boolean
  is_banned: boolean
}

function initials(name: string): string {
  return name.replace('@', '').slice(0, 2).toUpperCase()
}

/**
 * Admin-Detailansicht eines einzelnen Nutzers, erreichbar über den Pfeil auf
 * der jeweiligen Zeile in `/admin/users` (siehe CLAUDE.md §21.3/§27.20).
 * Zeigt neben den bereits in der Liste sichtbaren Stammdaten zusätzlich die
 * persönliche Fahrzeuggarage (§34.2) — dieselbe `admin_get_user_vehicles`-RPC,
 * die auch das Admin-Formular zum Nachtragen einer Registrierung verwendet
 * (`AddRegistrationSheet`), hier aber für die vollständige Garage statt nur
 * das Standardfahrzeug.
 */
export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<UserRow | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return

    async function load() {
      const [{ data: users }, { data: vehicleRows }] = await Promise.all([
        supabase.rpc('admin_list_users'),
        supabase.rpc('admin_get_user_vehicles', { p_user_id: id }),
      ])

      const found = ((users as UserRow[]) ?? []).find((u) => u.id === id) ?? null
      if (!found) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setUser(found)
      setVehicles((vehicleRows as Vehicle[]) ?? [])
      setLoading(false)
    }

    load()
  }, [id])

  if (loading) return <PageLoading />

  if (notFound || !user) {
    return (
      <div className="pt-3">
        <p className="text-sm text-sft-gray">Dieser Nutzer wurde nicht gefunden.</p>
        <Link to="/admin/users" className="tap-scale mt-3.5 inline-block text-sm text-sft-red">
          Zurück zur Nutzerverwaltung
        </Link>
      </div>
    )
  }

  return (
    <div className="pt-3">
      <Link to="/admin/users" className="tap-scale mb-3.5 inline-block text-sm text-sft-gray">
        ‹ Zurück
      </Link>

      <div className="overflow-hidden rounded-2xl border border-white/9 bg-sft-card px-[15px] py-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] font-mono text-xs font-bold ${
              user.is_admin ? 'bg-sft-red text-white' : user.is_banned ? 'bg-white/4 text-[#c9c9ce]' : 'bg-white/7 text-[#c9c9ce]'
            }`}
          >
            {initials(user.username)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[14px] font-semibold">{user.username}</span>
              {user.is_admin && (
                <span className="flex-none rounded-md bg-sft-red/18 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em] text-[#ff6b63]">
                  ADMIN
                </span>
              )}
              {user.is_banned && (
                <span className="flex-none rounded-md bg-sft-amber/16 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em] text-sft-amber">
                  GESPERRT
                </span>
              )}
            </div>
            <div className="mt-1 break-all font-mono text-[11px] leading-relaxed text-sft-gray">
              {user.first_name} {user.last_name}
              <br />
              {user.email}
            </div>
            <div className="mt-1 font-mono text-[10px] text-[#8a8a92]">
              SEIT{' '}
              {new Date(user.created_at).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3.5 px-1 font-mono text-[9px] tracking-[0.2em] text-sft-gray-dim">GARAGE</div>

      {vehicles.length === 0 ? (
        <p className="mt-2 text-sm text-sft-gray">Keine Fahrzeuge in der Garage.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-2.5">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/9 bg-sft-card px-[15px] py-3.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-semibold">
                    {vehicle.manufacturer} {vehicle.model}
                  </span>
                  {vehicle.is_default && (
                    <span className="flex-none rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em] text-[#c9c9ce]">
                      STANDARD
                    </span>
                  )}
                </div>
                <div className="mt-1 font-mono text-[11px] text-sft-gray">
                  {vehicle.power_ps} PS{vehicle.license_plate ? ` · ${vehicle.license_plate}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
