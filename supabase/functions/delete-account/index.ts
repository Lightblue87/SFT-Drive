// Vollständige Selbstbedienungs-Kontolöschung (siehe CLAUDE.md §7 Datenschutz,
// §8.7 "bei Accountlöschung Datenschutz und notwendige Historie sauber behandeln").
//
// Ergänzt die bestehende `delete_own_account()` RPC (Anonymisierung von
// `profiles`, Stornierung aktiver Anmeldungen inkl. Wartelisten-Nachrücken)
// um den eigentlichen Schritt, der clientseitig nicht möglich ist: das
// Entfernen der Zeile in `auth.users`. Das erfordert die Supabase Auth Admin
// API mit dem `service_role` Key — der deshalb ausschließlich hier, in dieser
// serverseitigen Edge Function, verwendet wird und niemals ins Frontend
// gelangt (§6 Sicherheitsregeln).
//
// Ablauf:
//   1. Aufrufer über das mitgeschickte User-JWT identifizieren (kein
//      client-geliefertes user_id-Feld als Berechtigungsnachweis, §8.12).
//   2. `delete_own_account()` im Kontext dieses Users ausführen (RLS/auth.uid()
//      bleibt dabei unverändert wirksam).
//   3. Erst danach den Auth-Account selbst über die Admin-API löschen.
//
// Deployment: Supabase Dashboard → Edge Functions → "Deploy a new function" →
// Name exakt "delete-account" → diesen Code einfügen. SUPABASE_URL,
// SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY sind als Umgebungsvariablen
// automatisch für jede Edge Function verfügbar — keine manuellen Secrets nötig.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Läuft im Kontext des aufrufenden Users — auth.uid() und RLS greifen
  // innerhalb der RPC ganz normal, kein Vertrauen auf clientseitige IDs.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 })
  }
  const userId = userData.user.id

  const { error: rpcError } = await userClient.rpc('delete_own_account')
  if (rpcError) {
    return new Response(JSON.stringify({ error: 'anonymize_failed' }), { status: 500 })
  }

  // Erst ab hier service_role — ausschließlich serverseitig, nie im Client.
  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
  if (deleteError) {
    return new Response(JSON.stringify({ error: 'auth_delete_failed' }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
