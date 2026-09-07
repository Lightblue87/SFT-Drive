import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'splash/startup-poster.jpg',
      ],
      manifest: {
        name: 'SFT Drive',
        short_name: 'SFT Drive',
        description: 'SFT Drive by Sportfahrer Treff — gemeinsame Sportwagen-Ausfahrten organisieren.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App-Shell und statische Assets cachen. Dynamische Supabase-/Auth-Antworten
        // bewusst nicht persistent im Service Worker cachen (siehe CLAUDE.md §16).
        //
        // Das Splash-Video (mp4) bewusst NICHT precachen: iOS Safari verlangt für die
        // Video-Wiedergabe HTTP-Range-Requests (byte-weises Nachladen), ein von Workbox
        // precachter Eintrag liefert aber immer die komplette Datei als eine Antwort ohne
        // Range-Unterstützung zurück. Das ließ Safari die Autoplay-Wiedergabe verweigern
        // und stattdessen nur das Poster-Bild mit Play-Button anzeigen. Ohne Precache-
        // Eintrag geht die Anfrage direkt ans Netzwerk/den normalen HTTP-Cache des
        // Browsers, der Range-Requests korrekt unterstützt.
        //
        // navigateFallback muss die SPA-Shell (index.html) sein, nicht offline.html:
        // Workbox verwendet dieses Ziel für JEDE Navigation, deren URL nicht exakt
        // im Precache liegt (z. B. /tours/irgendein-slug oder der
        // Supabase-E-Mail-Bestätigungslink mit Query-/Hash-Parametern) — unabhängig
        // vom tatsächlichen Online-Status. Mit offline.html als Ziel wurde dadurch
        // bei jedem Deep Link fälschlich "Keine Internetverbindung" angezeigt, obwohl
        // eine Verbindung bestand. Echter Offline-Zustand wird stattdessen über einen
        // Banner in der App selbst kommuniziert (navigator.onLine, siehe AppLayout).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,jpg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/admin/, /^\/api/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
