# SFT Drive

**SFT Drive** by Sportfahrer Treff — mobile-first Progressive Web App (PWA) zur Organisation gemeinsamer Sportwagen-Ausfahrten.

Produktive App: `https://sft-drive.pages.dev`

Die verbindliche Projekt- und Produktspezifikation steht in [`CLAUDE.md`](./CLAUDE.md). Die ausführliche gewachsene Detail-Spezifikation liegt zusätzlich in [`docs/CLAUDE_SPEC_BASELINE.md`](./docs/CLAUDE_SPEC_BASELINE.md) und wird von `CLAUDE.md` importiert.

## Status

Der Kern-MVP sowie die Erweiterungsphasen 9–11 sind umgesetzt.

- Phase 1–8: Projektbasis, Supabase, Auth, Touren, sichere Registrierung/Warteliste, Admin, PWA und Deployment ✅
- Phase 9: In-App Notifications + Web Push + Regions-Abos + Admin-Broadcast ✅
- Phase 10: generische Tour-Stopps ✅
- Phase 11: Restaurant-Speisekarte, Essensvorbestellung, Admin-Auswertung und automatische Reminder-Pushes ✅
- Persönliches Tourenarchiv ✅
- Admin-Nutzerverwaltung mit Rollenvergabe, Sperren/Entsperren und Kontolöschung ✅

## Stack

- React + TypeScript + Vite
- React Router
- Tailwind CSS
- vite-plugin-pwa mit `injectManifest`
- Supabase Auth
- Supabase PostgreSQL
- Row Level Security
- PostgreSQL RPCs
- Supabase Storage
- Supabase Edge Functions
- Cloudflare Pages

## Lokales Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Benötigte Frontend-Variablen:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_VAPID_PUBLIC_KEY   # für Web Push
```

Keine `service_role`-Credentials im Frontend oder Repository speichern.

## Build

```bash
npm run build
npm run lint
npm run preview
```

## Datenbank

Alle Schemaänderungen liegen versioniert unter:

```text
supabase/migrations/
```

Aktuell reicht die Migrationshistorie mindestens bis:

```text
20260907082300_fix_admin_list_users_email_type.sql
```

Bereits produktiv angewendete Migrationen nicht nachträglich verändern. Änderungen immer über eine neue Migration ergänzen.

## Edge Functions

Aktuell gehören zum produktiven Aufbau:

- `delete-account` — vollständige eigene Kontolöschung
- `send-push` — Web-Push-Zustellung
- `admin-manage-user` — Admin-seitiges Sperren/Entsperren/Löschen von Nutzerkonten
- `restaurant-order-notifications` — zeitgesteuerte Restaurant-Bestell-Pushes

Für Push werden serverseitig verwendet:

```text
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

Der private VAPID-Key und der Supabase `service_role` bleiben ausschließlich serverseitig.

## Restaurant-Benachrichtigungen

Die Restaurantbestellung unterstützt:

- `RESTAURANT_ORDER_OPEN`
- `RESTAURANT_ORDER_REMINDER`

Die automatische Verarbeitung läuft über `restaurant-order-notifications` und einen `pg_cron`-Job in 15-Minuten-Intervallen. `push_sent_at` und `reminder_sent_at` verhindern Doppelversand.

## PWA / Web Push

Seit Phase 9 verwendet die PWA einen eigenen Service Worker unter `src/sw.ts` und vite-plugin-pwas `injectManifest`-Strategie. Dadurch können `push`- und `notificationclick`-Events kontrolliert verarbeitet werden, während App-Shell-/Offline-Verhalten erhalten bleibt.

Push ist optional. Das In-App Notification Center unter `/notifications` funktioniert unabhängig davon, ob der User Push-Berechtigungen erteilt.

## Admin-Bereich

Zentrale Adminbereiche:

```text
/admin
/admin/tours
/admin/notifications
/admin/users
/admin/settings
```

Tourbezogen zusätzlich:

```text
/admin/tours/:id/registrations
/admin/tours/:id/stops
/admin/tours/:id/stops/:stopId
```

Archivierte Touren sind in `/admin/tours` standardmäßig ausgeblendet und können bei Bedarf eingeblendet werden.

## Deployment

Production:

```text
GitHub main
→ Cloudflare Pages
→ npm run build
→ dist
→ https://sft-drive.pages.dev
```

Supabase Auth Site-/Redirect-URLs müssen auf die produktive Cloudflare-Pages-Domain abgestimmt sein.

## Kostenmodell

Das Projekt ist weiterhin auf Betrieb innerhalb der kostenlosen Tarife von Cloudflare Pages und Supabase ausgelegt. Neue Dienste oder Funktionen mit laufenden Kosten dürfen nicht ohne ausdrückliche Entscheidung eingeführt werden.
