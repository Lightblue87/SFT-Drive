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
      // injectManifest statt generateSW: für Web Push (§27.10-§27.17) braucht der
      // Service Worker eigene 'push'/'notificationclick'-Listener, die sich in
      // generateSW's rein deklarativer Konfiguration nicht unterbringen lassen.
      // Precaching, SPA-Navigate-Fallback (index.html, /admin+/api ausgenommen)
      // und der bewusste Ausschluss des Splash-Videos aus dem Precache (iOS-
      // Safari-Range-Request-Problem, siehe frühere Historie) sind jetzt in
      // src/sw.ts nachgebaut statt über die workbox-Optionen hier.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,jpg}'],
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
