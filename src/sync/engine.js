/**
 * Sync engine: keeps the local store and one Supabase row in step.
 *
 * Flow: pull remote -> merge with local -> apply merged locally -> push merged.
 * It runs on sign-in, on every local change (debounced), when the tab regains
 * focus, on a slow timer, and whenever Supabase pushes a realtime change.
 */
import { reactive, watch } from 'vue'
import { getClient, isConfigured, TABLE } from './client.js'
import { mergeSnapshots, snapshotSignature } from './merge.js'
import { state, actions } from '../store/store.js'

export const sync = reactive({
  configured: isConfigured,
  user: null,                 // { id, email } once signed in
  status: 'idle',             // idle | syncing | synced | error | offline
  lastSyncedAt: null,
  error: null,
  busy: false,                // an auth request is in flight
})

let supabase = null           // resolved lazily by startSync()
let applying = false          // guards the watcher while remote data lands
let pushTimer = null
let lastPushed = ''
let channel = null

function fail(error) {
  sync.status = navigator.onLine === false ? 'offline' : 'error'
  sync.error = error?.message || String(error)
}

async function pull() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('user_id', sync.user.id)
    .maybeSingle()
  if (error) throw error
  return data?.data || null
}

async function push(snapshot) {
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: sync.user.id,
      data: snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error
}

/** One full round trip. Safe to call as often as you like. */
export async function syncNow() {
  if (!isConfigured || !sync.user || sync.status === 'syncing') return
  sync.status = 'syncing'
  sync.error = null
  try {
    const remote = await pull()
    const local = actions.snapshot()
    const merged = remote ? mergeSnapshots(local, remote) : local

    const signature = snapshotSignature(merged)
    if (signature !== snapshotSignature(local)) {
      applying = true
      actions.applySnapshot(merged)
      applying = false
    }
    if (!remote || signature !== snapshotSignature(remote)) {
      await push(merged)
    }
    lastPushed = signature
    sync.lastSyncedAt = Date.now()
    sync.status = 'synced'
  } catch (error) {
    applying = false
    fail(error)
  }
}

function schedulePush() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    if (snapshotSignature(actions.snapshot()) !== lastPushed) syncNow()
  }, 2000)
}

function listenRealtime() {
  if (channel) supabase.removeChannel(channel)
  if (!sync.user) return
  channel = supabase
    .channel(`app_state:${sync.user.id}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${sync.user.id}` },
      () => syncNow(),
    )
    .subscribe()
}

/* ------------------------------------------------------------------- auth */

export async function signIn(email, password) {
  sync.busy = true
  sync.error = null
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  } catch (error) {
    sync.error = error?.message || String(error)
  } finally {
    sync.busy = false
  }
}

export async function signUp(email, password) {
  sync.busy = true
  sync.error = null
  try {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  } catch (error) {
    sync.error = error?.message || String(error)
  } finally {
    sync.busy = false
  }
}

export async function signOut() {
  await supabase.auth.signOut()
  sync.user = null
  sync.status = 'idle'
  sync.lastSyncedAt = null
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
}

/* ------------------------------------------------------------------ start */

export async function startSync() {
  if (!isConfigured) return
  supabase = await getClient()

  supabase.auth.getSession().then(({ data }) => setUser(data.session?.user))
  supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user))

  function setUser(user) {
    sync.user = user ? { id: user.id, email: user.email } : null
    if (!user) return
    listenRealtime()
    syncNow()
  }

  // local edits -> remote
  watch(
    () => [state.projects, state.tasks, state.events, state.tombstones],
    () => {
      if (!applying && sync.user) schedulePush()
    },
    { deep: true },
  )

  window.addEventListener('online', () => sync.user && syncNow())
  window.addEventListener('offline', () => {
    if (sync.user) sync.status = 'offline'
  })
  window.addEventListener('focus', () => sync.user && syncNow())
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && sync.user) syncNow()
  })
  setInterval(() => sync.user && syncNow(), 60000)
}
