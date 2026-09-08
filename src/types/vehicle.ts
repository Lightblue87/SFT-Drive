// Entspricht dem Schema aus supabase/migrations/20260908093000_vehicle_garage.sql
// (siehe CLAUDE.md §34.2). Reine Komfortfunktion — bei einer Touranmeldung
// werden die Werte als Snapshot kopiert, nie per vehicles.id referenziert.

export interface Vehicle {
  id: string
  user_id: string
  manufacturer: string
  model: string
  power_ps: number
  license_plate: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}
