import { supabase } from '@/lib/supabase'

export const PENDING_VEHICLE_STORAGE_KEY = 'sft-drive-pending-vehicle'

interface PendingVehicle {
  manufacturer: string
  model: string
  power_ps: number
  license_plate: string | null
}

/**
 * Übernimmt ein bei der Registrierung (Schritt 3, siehe RegisterPage.tsx)
 * gewähltes erstes Fahrzeug in die Garage — bei der Registrierung selbst gab
 * es dafür noch keine Session (E-Mail-Bestätigung steht noch aus), RLS auf
 * `vehicles` hätte den Insert also abgelehnt. Wird nach dem ersten
 * erfolgreichen Login aufgerufen; ist idempotent (löscht den Eintrag sofort).
 */
export async function claimPendingVehicle(userId: string) {
  const raw = localStorage.getItem(PENDING_VEHICLE_STORAGE_KEY)
  if (!raw) return

  let vehicle: PendingVehicle
  try {
    vehicle = JSON.parse(raw)
  } catch {
    localStorage.removeItem(PENDING_VEHICLE_STORAGE_KEY)
    return
  }

  if (!vehicle.manufacturer || !vehicle.model || !vehicle.power_ps) {
    localStorage.removeItem(PENDING_VEHICLE_STORAGE_KEY)
    return
  }

  const { error } = await supabase.from('vehicles').insert({
    user_id: userId,
    manufacturer: vehicle.manufacturer,
    model: vehicle.model,
    power_ps: vehicle.power_ps,
    license_plate: vehicle.license_plate,
    is_default: true,
  })

  // Nur nach erfolgreichem Insert löschen — schlägt er fehl (z. B. Netzwerk),
  // bleibt der Entwurf erhalten und wird beim nächsten Login erneut versucht.
  if (!error) {
    localStorage.removeItem(PENDING_VEHICLE_STORAGE_KEY)
  }
}
