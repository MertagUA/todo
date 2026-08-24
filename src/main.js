import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { startSync } from './sync/engine.js'

createApp(App).mount('#app')

// Cross-device sync, if Supabase keys were provided at build time.
startSync()

// Offline support for the hosted version; the local launcher does not need it.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}

/**
 * Heartbeat for the desktop launcher: while this page is open the local server
 * keeps running; once the window closes the pings stop and the server exits.
 * Harmless (and ignored) under `npm run dev`.
 */
setInterval(() => {
  fetch('/__alive', { cache: 'no-store' }).catch(() => {})
}, 20000)
