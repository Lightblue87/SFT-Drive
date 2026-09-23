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
//
// E-Mail als zusätzlicher Kanal (siehe CLAUDE.md §27.22): erreicht auch
// Teilnehmer ohne aktivierten Push. Optional, über Brevo (kostenloses
// Free-Tier, Single-Sender-Verifizierung ohne eigene Domain möglich).
// Zusätzliche Secrets, falls gewünscht:
//   BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME (optional, Default "SFT Drive")
// Ohne diese Secrets bleibt E-Mail-Versand deaktiviert (fail-soft, analog VAPID).
// Bewusst nur für die tour_id-Fälle (registrierungsbasierter, klar begrenzter
// Empfängerkreis) — nicht für broadcast: dort müsste der Empfängerkreis erst
// unabhängig von Push-Subscriptions neu definiert werden (potenziell alle
// Nutzer), das ist eine gesonderte Entscheidung.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// Entweder an die bestätigten Teilnehmer einer bestimmten Tour (tour_id), als
// Broadcast an alle Nutzer mit gespeicherter Push-Subscription, oder gezielt an
// eine Auswahl von user_ids innerhalb einer Tour (z. B. Phase 19 Übernachtungs-
// Erinnerung, siehe CLAUDE.md §36.10) — dort IMMER zusammen mit tour_id, damit
// serverseitig auf tatsächlich bestätigte Teilnehmer dieser Tour eingeschränkt
// werden kann statt der Client-Liste blind zu vertrauen (§8.12).
//
// `statuses` schränkt bei tour_id ein, welche Anmeldestatus erreicht werden.
// Standard ist ausschließlich `confirmed` (§27.11). Eine Tourabsage (§8.3) ist
// die begründete Ausnahme: dort sind auch `pending` und `waitlisted` betroffen,
// weil auch deren Planung an der Ausfahrt hängt.
interface RequestBody {
  tour_id?: string
  broadcast?: boolean
  user_ids?: string[]
  statuses?: string[]
  title: string
  body: string
}

const ALLOWED_STATUSES = ['confirmed', 'pending', 'waitlisted']

// Ohne diese Header liefert der Browser den (serverseitig durchaus
// erfolgreichen) Response niemals an den aufrufenden JS-Code aus -- der
// fetch()-Aufruf schlägt dann mit einem generischen Netzwerkfehler fehl,
// obwohl die Function selbst korrekt durchgelaufen ist (in den Supabase-
// Logs als Status 200 sichtbar). supabase-js ruft ausschließlich per Browser-
// fetch() auf, daher zwingend auf jeder Response inkl. Preflight nötig.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: corsHeaders,
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401, headers: corsHeaders })
  }

  let payload: RequestBody
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400, headers: corsHeaders })
  }

  if ((!payload.tour_id && !payload.broadcast) || !payload.title || !payload.body) {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400, headers: corsHeaders })
  }
  if (payload.user_ids && !payload.tour_id) {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400, headers: corsHeaders })
  }
  if (payload.statuses && (!payload.tour_id || !payload.statuses.every((s) => ALLOWED_STATUSES.includes(s)))) {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  const brevoApiKey = Deno.env.get('BREVO_API_KEY')
  const brevoSenderEmail = Deno.env.get('BREVO_SENDER_EMAIL')
  const brevoSenderName = Deno.env.get('BREVO_SENDER_NAME') || 'SFT Drive'

  const pushConfigured = Boolean(vapidPublicKey && vapidPrivateKey && vapidSubject)
  const emailConfigured = Boolean(brevoApiKey && brevoSenderEmail)

  if (!pushConfigured && !emailConfigured) {
    // Beide Kanäle optional (§27.16) — kein harter Fehler, nur nichts zu tun.
    return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 'not_configured' }), {
      status: 200,
      headers: corsHeaders,
    })
  }

  if (pushConfigured) {
    webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401, headers: corsHeaders })
  }

  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders })
  }

  // Ab hier service_role — ausschließlich serverseitig, nie im Client.
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  let subscriptionsQuery = adminClient.from('push_subscriptions').select('id, endpoint, p256dh, auth')

  // userIds bleibt bei broadcast bewusst null: E-Mail-Versand ist dafür
  // absichtlich nicht vorgesehen (siehe Kommentar oben).
  let userIds: string[] | null = null

  if (payload.broadcast) {
    // Keine weitere Einschränkung — alle Subscriptions.
  } else {
    const { data: registrations } = await adminClient
      .from('tour_registrations')
      .select('user_id')
      .eq('tour_id', payload.tour_id!)
      .in('status', payload.statuses ?? ['confirmed'])

    userIds = [...new Set((registrations ?? []).map((r) => r.user_id as string))]
    if (payload.user_ids && payload.user_ids.length > 0) {
      const requested = new Set(payload.user_ids)
      userIds = userIds.filter((uid) => requested.has(uid))
    }
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200, headers: corsHeaders })
    }
    subscriptionsQuery = subscriptionsQuery.in('user_id', userIds)
  }

  let sent = 0
  let failed = 0

  if (pushConfigured) {
    const { data: subscriptions } = await subscriptionsQuery

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
  }

  let emailSent = 0
  let emailFailed = 0

  if (emailConfigured && userIds && userIds.length > 0) {
    for (const uid of userIds) {
      // Jeder Empfänger wird unabhängig behandelt -- ein Fehler bei genau
      // diesem Nutzer (Auth-Admin-API-Hänger, keine E-Mail hinterlegt,
      // Brevo lehnt ab) darf weder die übrigen E-Mails noch das bereits
      // berechnete Push-Ergebnis der Function zum Absturz bringen.
      try {
        const { data } = await adminClient.auth.admin.getUserById(uid)
        const email = data.user?.email
        if (!email) continue

        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey!,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            sender: { name: brevoSenderName, email: brevoSenderEmail },
            to: [{ email }],
            subject: payload.title,
            textContent: `${payload.body}\n\n— SFT Drive\nhttps://sft-drive.pages.dev/notifications`,
          }),
        })
        if (res.ok) {
          emailSent++
        } else {
          emailFailed++
        }
      } catch {
        emailFailed++
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, failed, email_sent: emailSent, email_failed: emailFailed }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
