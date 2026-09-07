// Web-Push-Zustellung für Admin-Mitteilungen (siehe CLAUDE.md §27.10-§27.17).
//
// Wird vom Frontend direkt nach einem erfolgreichen Aufruf von
// admin_send_tour_notification() aufgerufen — die In-App-Mitteilung existiert
// zu diesem Zeitpunkt bereits garantiert, Push ist rein zusätzlich und darf
// bei Fehlschlag die Kernfunktion nicht beeinträchtigen (§27.16 "Push ist nie
// Voraussetzung für die App-Nutzung").
//
// Braucht service_role, um push_subscriptions ANDERER Nutzer zu lesen (die
// RLS-Policy dort erlaubt nur den jeweils eigenen Zugriff) — deshalb
// ausschließlich hier serverseitig, niemals im Client. Der Aufrufer wird
// trotzdem zuerst über sein eigenes JWT als Admin verifiziert (nie das
// Client-Argument als Berechtigungsnachweis akzeptieren, §8.12).
//
// Deployment: Supabase Dashboard → Edge Functions → "Deploy a new function"
// → Name exakt "send-push" → diesen Code einfügen. Zusätzlich als Secrets
// (Dashboard → Edge Functions → Secrets, projektweit) hinterlegen:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (z. B. "mailto:admin@example.de")
// SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY sind automatisch verfügbar.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

interface RequestBody {
  tour_id: string
  title: string
  body: string
}

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

  if (!payload.tour_id || !payload.title || !payload.body) {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    // Push ist optional (§27.16) — kein harter Fehler, nur nichts zu tun.
    return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 'vapid_not_configured' }), {
      status: 200,
    })
  }

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

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  // Ab hier service_role — ausschließlich serverseitig, nie im Client.
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: registrations } = await adminClient
    .from('tour_registrations')
    .select('user_id')
    .eq('tour_id', payload.tour_id)
    .eq('status', 'confirmed')

  const userIds = [...new Set((registrations ?? []).map((r) => r.user_id as string))]
  if (userIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 })
  }

  const { data: subscriptions } = await adminClient
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  let sent = 0
  let failed = 0

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          target_path: `/notifications`,
        }),
      )
      sent++
    } catch (err) {
      failed++
      const statusCode = (err as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        // Subscription ist nicht mehr gültig (§27.15 "ungültige Subscriptions entfernbar").
        await adminClient.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, failed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
