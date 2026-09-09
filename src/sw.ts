/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

// Ohne diese beiden Zeilen bleibt ein neu deployter Service Worker nach dem
// Standard-Lifecycle im "waiting"-Zustand hängen, bis der Nutzer wirklich alle
// Tabs/Instanzen der App schließt — bei einer installierten Standalone-PWA
// passiert das oft nie durch bloßes Wechseln/Zurückkehren zur App. Neue
// Deployments (Bugfixes!) wurden dadurch faktisch nie aktiv. `skipWaiting()`
// aktiviert einen neuen Service Worker sofort nach der Installation,
// `clients.claim()` übernimmt zusätzlich bereits offene Seiten ohne Reload.
// Zusammen mit `registerType: 'autoUpdate'` und `registerSW({ immediate: true })`
// in main.tsx ist das die vom `injectManifest`-Modus erwartete Update-Strategie
// (vite-plugin-pwa baut das bei `generateSW` automatisch ein, bei einem
// selbst geschriebenen Service Worker wie hier nicht).
self.skipWaiting()
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// App-Shell und statische Assets cachen (injiziert von vite-plugin-pwa beim Build).
// Das Splash-Video wird bewusst NICHT precacht: iOS Safari braucht für die
// Video-Wiedergabe HTTP-Range-Requests, ein precachter Eintrag liefert aber immer
// die komplette Datei als eine Antwort ohne Range-Unterstützung zurück — das ließ
// Safari die Autoplay-Wiedergabe verweigern (siehe vite.config.ts globPatterns).
precacheAndRoute(self.__WB_MANIFEST)

// SPA-Shell-Fallback für jede Navigation, die nicht exakt im Precache liegt
// (Deep Links, der Supabase-E-Mail-Bestätigungslink mit Query-/Hash-Parametern
// etc.) — unabhängig vom Online-Status, siehe die ausführliche Begründung in
// vite.config.ts. /admin und /api bewusst ausgenommen.
const navigationRoute = new NavigationRoute(createHandlerBoundToURL('/index.html'), {
  denylist: [/^\/admin/, /^\/api/],
})
registerRoute(navigationRoute)

// Web Push (siehe CLAUDE.md §27.10-§27.17): zeigt eine Benachrichtigung an,
// sobald ein Push vom Server eintrifft — auch wenn die App gerade nicht offen
// ist. Push ist nie Voraussetzung für die App-Nutzung (§27.16); schlägt das
// Parsen fehl, wird trotzdem eine generische Benachrichtigung gezeigt, statt
// den Push stillschweigend zu verschlucken.
self.addEventListener('push', (event) => {
  let payload: { title?: string; body?: string; target_path?: string } = {}
  try {
    if (event.data) payload = event.data.json()
  } catch {
    // Payload nicht parsebar — generische Benachrichtigung unten zeigen.
  }

  const title = payload.title || 'SFT Drive'
  const options: NotificationOptions = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { target_path: payload.target_path || '/notifications' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Tap auf die Benachrichtigung: bestehendes App-Fenster fokussieren und dorthin
// navigieren, sonst ein neues Fenster öffnen (Deep Link, siehe §27.12).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetPath = (event.notification.data as { target_path?: string } | undefined)?.target_path || '/'

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            await (client as WindowClient).navigate(targetPath)
          }
          return
        }
      }
      await self.clients.openWindow(targetPath)
    })(),
  )
})
