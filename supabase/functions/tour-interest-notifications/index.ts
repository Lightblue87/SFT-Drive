// Verbindliche Anmeldeöffnungs-Benachrichtigung für Vormerkungen (siehe
// CLAUDE.md §35.3): sobald tours.registration_open_at erreicht ist, müssen
// alle zu diesem Zeitpunkt noch vorgemerkten Nutzer automatisch
// benachrichtigt werden — In-App immer, Web Push zusätzlich, falls aktiv.
//
// Wird NICHT von der App aufgerufen, sondern per pg_cron zeitgesteuert,
// exakt nach demselben Muster wie restaurant-order-notifications: Abgleich
// gegen den service_role Key selbst als gemeinsames Geheimnis statt
// User-JWT-Prüfung, da kein Client diese Function je aufruft.
//
// Deployment: Supabase Dashboard → Edge Functions → "Deploy a new function"
// → Name exakt "tour-interest-notifications" → diesen Code einfügen.
// Braucht dieselben VAPID-Secrets wie send-push/restaurant-order-
// notifications (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT) —
// projektweite Secrets, hier ist nichts zusätzlich nötig, falls die anderen
// Functions schon eingerichtet sind.
//
// Cron-Einrichtung (einmalig, im Supabase SQL Editor — falls der
// restaurant-order-notifications-Job schon läuft, reicht ein zusätzlicher
// cron.schedule-Aufruf mit eigenem Job-Namen, pg_cron/pg_net/Vault-Secret
// sind dann schon vorhanden):
//
//   select cron.schedule(
//     'tour-interest-notifications',
//     '*/15 * * * *',
//     $$
//     select net.http_post(
//       url := 'https://<project-ref>.supabase.co/functions/v1/tour-interest-notifications',
//       headers := jsonb_build_object(
//         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
//         'Content-Type', 'application/json'
//       ),
//       body := '{}'::jsonb
//     );
//     $$
//   );

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  const hasVapid = Boolean(vapidPublicKey && vapidPrivateKey && vapidSubject)
  if (hasVapid) webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!)

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const now = new Date()

  async function sendPushToUsers(userIds: string[], title: string, body: string, targetPath: string) {
    if (!hasVapid || userIds.length === 0) return
    const { data: subs } = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', userIds)

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, target_path: targetPath }),
        )
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await adminClient.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }
  }

  // Nur veröffentlichte, nicht abgesagte Touren mit erreichter
  // registration_open_at und mindestens einer noch nicht benachrichtigten
  // Vormerkung (§35.3: "Bei einer abgesagten Tour darf keine
  // Anmeldeöffnungs-Notification versendet werden").
  const { data: interestRows } = await adminClient
    .from('tour_interests')
    .select('id, user_id, tours!inner(id, slug, title, status, registration_open_at)')
    .is('registration_open_notified_at', null)
    .eq('tours.status', 'published')
    .not('tours.registration_open_at', 'is', null)
    .lte('tours.registration_open_at', now.toISOString())

  type Row = {
    id: string
    user_id: string
    tours: { id: string; slug: string; title: string; status: string; registration_open_at: string } | null
  }

  const rows = ((interestRows ?? []) as unknown as Row[]).filter((r) => r.tours)
  const byTour = new Map<string, { title: string; slug: string; interestIds: string[]; userIds: string[] }>()

  for (const row of rows) {
    const tour = row.tours!
    const entry = byTour.get(tour.id) ?? { title: tour.title, slug: tour.slug, interestIds: [], userIds: [] }
    entry.interestIds.push(row.id)
    entry.userIds.push(row.user_id)
    byTour.set(tour.id, entry)
  }

  let notifiedTours = 0
  let notifiedUsers = 0

  for (const [tourId, entry] of byTour) {
    const userIds = [...new Set(entry.userIds)]
    const title = 'Anmeldung jetzt geöffnet'
    const body = `Die Anmeldung für „${entry.title}“ ist jetzt möglich.`
    const targetPath = `/tours/${entry.slug}`

    await adminClient.from('notifications').insert(
      userIds.map((userId) => ({
        user_id: userId,
        tour_id: tourId,
        type: 'TOUR_REGISTRATION_OPEN',
        title,
        body,
        target_path: targetPath,
      })),
    )
    await sendPushToUsers(userIds, title, body, targetPath)

    await adminClient
      .from('tour_interests')
      .update({ registration_open_notified_at: now.toISOString() })
      .in('id', entry.interestIds)

    notifiedTours++
    notifiedUsers += userIds.length
  }

  return new Response(JSON.stringify({ ok: true, notifiedTours, notifiedUsers }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
