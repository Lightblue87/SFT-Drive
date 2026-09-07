import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Nur ein Hinweis für Entwickler — die App darf trotzdem laden, damit
  // öffentliche UI-Arbeit auch ohne konfiguriertes Supabase-Projekt möglich ist.
  console.warn(
    'Supabase ist nicht konfiguriert. Bitte VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env setzen.',
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
