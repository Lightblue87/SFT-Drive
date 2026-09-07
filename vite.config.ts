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
        'splash/startup.mp4',
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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,jpg,mp4}'],
        navigateFallback: '/offline.html',
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
