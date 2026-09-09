import { supabase } from '@/lib/supabase'

export const PENDING_VEHICLE_STORAGE_KEY = 'sft-drive-pending-vehicle'

interface PendingVehicle {
  // User-ID aus der signUp()-Antwort. Ohne sie würde der Entwurf beim
  // nächsten Login irgendeines Accounts übernommen — auf einem gemeinsam
  // genutzten Browser also möglicherweise beim falschen Nutzer (§7).
  user_id: string
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

  // Gehört der Entwurf zu einem anderen Account, bleibt er unangetastet
  // liegen — sein Besitzer soll ihn bei seinem eigenen ersten Login noch
  // bekommen können. Fehlt die Zuordnung ganz (Entwurf aus einer älteren
  // App-Version), wird er verworfen statt einem fremden Account zugeordnet.
  if (!vehicle.user_id) {
    localStorage.removeItem(PENDING_VEHICLE_STORAGE_KEY)
    return
  }
  if (vehicle.user_id !== userId) return

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
