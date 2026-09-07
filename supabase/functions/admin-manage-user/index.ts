// Admin-Nutzerverwaltung: Konto sperren/entsperren/löschen (siehe CLAUDE.md
// §21.3 "/admin/users", §27.20). Sperren/Entsperren erfordert die Supabase
// Auth Admin API (auth.admin.updateUserById mit ban_duration) — das geht nur
// mit dem service_role Key, der deshalb ausschließlich hier serverseitig
// verwendet wird, niemals im Client (§6 Sicherheitsregeln). Löschen läuft wie
// bei der Selbstlöschung zweistufig: erst die admin-gated Anonymisierungs-
// RPC (im Kontext des Zielnutzers, nicht des Admins — dafür sorgt die RPC
// selbst über p_user_id + is_admin()-Prüfung), dann erst der eigentliche
// Auth-Löschschritt hier.
//
// Deployment: Supabase Dashboard → Edge Functions → "Deploy a new function"
// → Name exakt "admin-manage-user" → diesen Code einfügen. Keine
// zusätzlichen Secrets nötig (SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY sind
// automatisch verfügbar).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RequestBody {
  action: 'ban' | 'unban' | 'delete'
  user_id: string
}

// Deutlich über jeder realistischen Bindungsdauer — es gibt in der Supabase
// Auth Admin API keinen eigenen Wert für "dauerhaft gesperrt", nur eine sehr
// lange Dauer.
const BAN_DURATION = '876000h'

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 })
  }

  let payload: RequestBody
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 })
  }

  if (!payload.user_id || !['ban', 'unban', 'delete'].includes(payload.action)) {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 })
  }

  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  }

  if (payload.user_id === userData.user.id) {
    // Selbst-Sperrung/-Löschung über diesen Weg nicht zulassen — Selbst-
    // löschung existiert bereits kontrolliert über /profile, Selbst-Sperrung
    // hätte niemand mehr rückgängig machen können.
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  }

  // Ab hier service_role — ausschließlich serverseitig, nie im Client.
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  if (payload.action === 'ban' || payload.action === 'unban') {
    const { error } = await adminClient.auth.admin.updateUserById(payload.user_id, {
      ban_duration: payload.action === 'ban' ? BAN_DURATION : 'none',
    })
    if (error) {
      return new Response(JSON.stringify({ error: 'update_failed' }), { status: 500 })
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  // action === 'delete'
  const { data: rpcResult, error: rpcError } = await userClient.rpc('admin_delete_user_account', {
    p_user_id: payload.user_id,
  })
  if (rpcError) {
    return new Response(JSON.stringify({ error: 'anonymize_failed' }), { status: 500 })
  }
  const code = (rpcResult as { code?: string })?.code
  if (code !== 'OK') {
    return new Response(JSON.stringify({ error: code ?? 'unknown' }), { status: 400 })
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(payload.user_id)
  if (deleteError) {
    return new Response(JSON.stringify({ error: 'auth_delete_failed' }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
