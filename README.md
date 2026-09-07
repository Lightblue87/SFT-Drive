# SFT Drive

**SFT Drive** by Sportfahrer Treff — eine mobile-first Progressive Web App (PWA) zur Organisation
und Planung von gemeinsamen Sportwagen-Ausfahrten.

Die vollständige Produkt- und technische Spezifikation steht in [`CLAUDE.md`](./CLAUDE.md).

## Status

Projektbasis (Phase 1 laut CLAUDE.md §25): Frontend-Grundgerüst mit Routing, Auth-Anbindung
(Supabase Auth) und PWA-Konfiguration. Das Datenbankschema (Touren, Registrierungen, RLS, RPCs)
folgt in der nächsten Phase.

## Stack

- React + TypeScript + Vite
- React Router
- Tailwind CSS
- vite-plugin-pwa
- Supabase (Auth, Postgres, RLS) — Backend folgt

## Setup

```bash
npm install
cp .env.example .env
# .env mit Supabase-Projekt-URL und anon Key befüllen
npm run dev
```

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
Output-Verzeichnis `dist`). Umgebungsvariablen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
werden in den Cloudflare-Pages-Projekteinstellungen gesetzt.

## Kostenmodell

Das Projekt ist auf dauerhaft kostenlosen Betrieb innerhalb der Free-Tier-Grenzen von
Cloudflare Pages und Supabase ausgelegt (siehe CLAUDE.md §4).
