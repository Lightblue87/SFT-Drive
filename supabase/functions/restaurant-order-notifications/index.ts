// Zeitgesteuerte Restaurant-Bestell-Benachrichtigungen (siehe CLAUDE.md
// §27.10, §27.20 "noch offen"): RESTAURANT_ORDER_OPEN, sobald das
// Bestellfenster eines Restaurant-Stopps beginnt, und
// RESTAURANT_ORDER_REMINDER kurz vor Ablauf der Bestellfrist an alle
// bestätigten Teilnehmer, die noch nicht bestellt haben.
//
// Wird NICHT von der App aufgerufen, sondern per pg_cron zeitgesteuert
// (siehe Setup-Anleitung unten) — deshalb keine User-JWT-Prüfung wie bei
// send-push/delete-account, sondern ein Abgleich gegen den service_role Key
// selbst als gemeinsames Geheimnis. Das ist sicher, weil der Wert
// ausschließlich serverseitig kursiert: als Umgebungsvariable dieser
// Funktion und (über Supabase Vault) im pg_cron-Job, der sie aufruft —
// niemals im Client.
//
// Deployment: Supabase Dashboard → Edge Functions → "Deploy a new function"
// → Name exakt "restaurant-order-notifications" → diesen Code einfügen.
// Braucht dieselben VAPID-Secrets wie send-push (VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT) — projektweite Secrets werden von allen
// Functions gemeinsam genutzt, hier ist nichts zusätzlich nötig, falls
// send-push schon eingerichtet ist.
//
// Cron-Einrichtung (einmalig, im Supabase SQL Editor):
//
//   -- 1) Extensions aktivieren (falls noch nicht geschehen)
//   create extension if not exists pg_cron with schema extensions;
//   create extension if not exists pg_net with schema extensions;
//
//   -- 2) Service-Role-Key sicher in Vault ablegen (NICHT in einer Migration
//   --    committen — das ist ein echtes Geheimnis, einmalig manuell einfügen)
//   select vault.create_secret('<dein-service-role-key>', 'service_role_key');
//
//   -- 3) Alle 15 Minuten aufrufen
//   select cron.schedule(
//     'restaurant-order-notifications',
//     '*/15 * * * *',
//     $$
//     select net.http_post(
//       url := 'https://<project-ref>.supabase.co/functions/v1/restaurant-order-notifications',
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

const REMINDER_WINDOW_HOURS = 24

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

  async function sendPushToUsers(userIds: string[], title: string, body: string) {
    if (!hasVapid || userIds.length === 0) return
    const { data: subs } = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', userIds)

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, target_path: '/notifications' }),
        )
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await adminClient.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }
  }

  let opened = 0
  let reminded = 0

  // --- RESTAURANT_ORDER_OPEN --------------------------------------------
  const { data: openingStops } = await adminClient
    .from('restaurant_stop_settings')
    .select('tour_stop_id, ordering_open_at, tour_stops(tour_id, title, tours(slug))')
    .eq('ordering_enabled', true)
    .is('push_sent_at', null)
    .not('ordering_open_at', 'is', null)
    .lte('ordering_open_at', now.toISOString())

  for (const stop of (openingStops ?? []) as unknown as {
    tour_stop_id: string
    tour_stops: { tour_id: string; title: string; tours: { slug: string } | null } | null
  }[]) {
    const tourId = stop.tour_stops?.tour_id
    const slug = stop.tour_stops?.tours?.slug
    if (!tourId) continue

    const { data: registrations } = await adminClient
      .from('tour_registrations')
      .select('user_id')
      .eq('tour_id', tourId)
      .eq('status', 'confirmed')

    const userIds = [...new Set((registrations ?? []).map((r) => r.user_id as string))]

    if (userIds.length > 0) {
      const title = 'Essensbestellung geöffnet'
      const body = `${stop.tour_stops?.title ?? 'Restaurant-Stopp'} — jetzt vorbestellen.`
      await adminClient.from('notifications').insert(
        userIds.map((userId) => ({
          user_id: userId,
          tour_id: tourId,
          type: 'RESTAURANT_ORDER_OPEN',
          title,
          body,
          target_path: slug ? `/tours/${slug}` : null,
        })),
      )
      await sendPushToUsers(userIds, title, body)
    }

    await adminClient
      .from('restaurant_stop_settings')
      .update({ push_sent_at: now.toISOString() })
      .eq('tour_stop_id', stop.tour_stop_id)
    opened++
  }

  // --- RESTAURANT_ORDER_REMINDER ------------------------------------------
  const reminderWindowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000)

  const { data: deadlineStops } = await adminClient
    .from('restaurant_stop_settings')
    .select('tour_stop_id, ordering_deadline_at, tour_stops(tour_id, title, tours(slug))')
    .eq('ordering_enabled', true)
    .is('reminder_sent_at', null)
    .not('ordering_deadline_at', 'is', null)
    .gt('ordering_deadline_at', now.toISOString())
    .lte('ordering_deadline_at', reminderWindowEnd.toISOString())

  for (const stop of (deadlineStops ?? []) as unknown as {
    tour_stop_id: string
    tour_stops: { tour_id: string; title: string; tours: { slug: string } | null } | null
  }[]) {
    const tourId = stop.tour_stops?.tour_id
    const slug = stop.tour_stops?.tours?.slug
    if (!tourId) continue

    const { data: registrations } = await adminClient
      .from('tour_registrations')
      .select('id, user_id')
      .eq('tour_id', tourId)
      .eq('status', 'confirmed')

    const regs = registrations ?? []
    const { data: submittedOrders } = await adminClient
      .from('meal_orders')
      .select('registration_id')
      .eq('restaurant_stop_id', stop.tour_stop_id)
      .eq('status', 'submitted')

    const submittedRegIds = new Set((submittedOrders ?? []).map((o) => o.registration_id as string))
    const userIdsWithoutOrder = [...new Set(regs.filter((r) => !submittedRegIds.has(r.id)).map((r) => r.user_id as string))]

    if (userIdsWithoutOrder.length > 0) {
      const title = 'Erinnerung: Essensbestellung'
      const body = `Die Bestellfrist für ${stop.tour_stops?.title ?? 'einen Restaurant-Stopp'} läuft bald ab.`
      await adminClient.from('notifications').insert(
        userIdsWithoutOrder.map((userId) => ({
          user_id: userId,
          tour_id: tourId,
          type: 'RESTAURANT_ORDER_REMINDER',
          title,
          body,
          target_path: slug ? `/tours/${slug}` : null,
        })),
      )
      await sendPushToUsers(userIdsWithoutOrder, title, body)
    }

    await adminClient
      .from('restaurant_stop_settings')
      .update({ reminder_sent_at: now.toISOString() })
      .eq('tour_stop_id', stop.tour_stop_id)
    reminded++
  }

  return new Response(JSON.stringify({ ok: true, opened, reminded }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
