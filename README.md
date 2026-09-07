# SFT Drive

**SFT Drive** by Sportfahrer Treff — eine mobile-first Progressive Web App (PWA) zur Organisation
und Planung von gemeinsamen Sportwagen-Ausfahrten.

Die vollständige Produkt- und technische Spezifikation steht in [`CLAUDE.md`](./CLAUDE.md).

## Status

- Phase 1 (CLAUDE.md §25): Frontend-Grundgerüst mit Routing, Auth-Anbindung (Supabase Auth) und
  PWA-Konfiguration. ✅
- Phase 2: Datenbankschema, RLS und die sicherheitskritischen RPCs für Touranmeldung/Warteliste
  (CLAUDE.md §8, §9). ✅ Migrationen liegen in [`supabase/migrations/`](./supabase/migrations),
  gegen ein lokales Postgres validiert (Schema-Aufbau, Anmeldung, Kapazitätsprüfung unter
  parallelen Requests, Stornierung/Nachrücken, Altersprüfung — siehe Kommentare in den Dateien).
  Noch nicht gegen ein echtes Supabase-Projekt angewendet/getestet.
- Noch offen: Admin-UI und Public-Tour-UI an das Schema anbinden (aktuell Platzhalter).

## Stack

- React + TypeScript + Vite
- React Router
- Tailwind CSS
- vite-plugin-pwa
- Supabase (Auth, Postgres, RLS)

## Setup

```bash
npm install
cp .env.example .env
# .env mit Supabase-Projekt-URL und anon Key befüllen
npm run dev
```

## Datenbank einrichten

1. Supabase-Projekt anlegen (siehe [supabase.com](https://supabase.com), Region z. B.
   Frankfurt/`eu-central-1` für EU-Datenhaltung).
2. Migrationen anwenden — entweder mit der [Supabase CLI](https://supabase.com/docs/guides/cli):
   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```
   oder manuell: die Dateien in [`supabase/migrations/`](./supabase/migrations) in
   **aufsteigender Dateinamen-Reihenfolge** im SQL-Editor des Supabase-Dashboards ausführen.
3. Ersten Admin setzen (es gibt bewusst keinen "Make me admin"-Mechanismus im Frontend, siehe
   CLAUDE.md §8.2):
   ```sql
   insert into public.user_roles (user_id, role)
   values ('<auth.users.id des gewünschten Admins>', 'admin');
   ```
4. `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` (Project Settings → Data API) in `.env` eintragen.

## Build

```bash
npm run build
npm run preview
```

## Umgebungsvariablen

Siehe [`.env.example`](./.env.example). Es wird ausschließlich der öffentliche
Supabase anon/publishable Key im Frontend verwendet — niemals der `service_role` Key.

## Deployment

Vorgesehen: GitHub → Cloudflare Pages (automatisches Deployment, Build-Kommando `npm run build`,
Output-Verzeichnis `dist`). Umgebungsvariablen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
optional `VITE_VAPID_PUBLIC_KEY` für Web Push) werden in den Cloudflare-Pages-Projekteinstellungen
gesetzt.

## Web Push (optional)

Für Push-Benachrichtigungen (siehe CLAUDE.md §27.10-§27.17) zusätzlich nötig:

1. Ein VAPID-Schlüsselpaar generieren (kostenlos, rein kryptografisch — z. B. via
   `npx web-push generate-vapid-keys`).
2. `VITE_VAPID_PUBLIC_KEY` (öffentlicher Schlüssel) in Cloudflare Pages setzen.
3. Die Supabase Edge Function `supabase/functions/send-push` deployen (Dashboard →
   Edge Functions → "Deploy a new function" → Name exakt `send-push`).
4. Als Edge-Function-Secrets (projektweit) hinterlegen: `VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (z. B. `mailto:admin@example.de`).

Ohne diese Konfiguration funktioniert die App unverändert — Push ist rein optional,
das In-App-Notification-Center (`/notifications`) funktioniert davon unabhängig.

## Kostenmodell

Das Projekt ist auf dauerhaft kostenlosen Betrieb innerhalb der Free-Tier-Grenzen von
Cloudflare Pages und Supabase ausgelegt (siehe CLAUDE.md §4).
