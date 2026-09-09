import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from '@/App'
import '@/index.css'

// `immediate: true` registriert sofort statt erst beim `load`-Event und prüft
// von da an periodisch auf ein neues Deployment; zusammen mit `skipWaiting()`/
// `clients.claim()` in src/sw.ts (siehe dortiger Kommentar) übernimmt ein neuer
// Service Worker automatisch, ohne dass der Nutzer die App manuell komplett
// schließen und neu öffnen muss.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
