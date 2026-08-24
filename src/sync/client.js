/**
 * Supabase keys are build-time values. The anon key is meant to be public —
 * row level security is what keeps one account from reading another's rows.
 * Put them in `.env.local` (see .env.example) before `npm run deploy`.
 *
 * The library itself is imported on demand, so a build without keys — or a
 * visitor who never opens the sync dialog — never downloads it.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)
export const TABLE = 'app_state'

let clientPromise = null

export function getClient() {
  if (!isConfigured) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }),
    )
  }
  return clientPromise
}
