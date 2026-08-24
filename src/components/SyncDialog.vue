<script setup>
import { ref, computed } from 'vue'
import BaseModal from './BaseModal.vue'
import AppIcon from './AppIcon.vue'
import { sync, signIn, signUp, signOut, syncNow } from '../sync/engine.js'
import { t } from '../i18n.js'
import { formatDateTime } from '../utils/date.js'

const emit = defineEmits(['close'])

const email = ref('')
const password = ref('')
const mode = ref('signIn')      // signIn | signUp
const notice = ref('')

const statusLabel = computed(() => {
  const map = {
    idle: t.sync.statusIdle,
    syncing: t.sync.statusSyncing,
    synced: t.sync.statusSynced,
    error: t.sync.statusError,
    offline: t.sync.statusOffline,
  }
  return map[sync.status] || sync.status
})

async function submit() {
  notice.value = ''
  const address = email.value.trim()
  if (!address || password.value.length < 6) return
  if (mode.value === 'signUp') {
    await signUp(address, password.value)
    if (!sync.error) notice.value = t.sync.checkEmail
  } else {
    await signIn(address, password.value)
  }
  if (!sync.error) password.value = ''
}
</script>

<template>
  <BaseModal :title="t.sync.title" width="420px" @close="emit('close')">
    <!-- keys were never provided at build time -->
    <template v-if="!sync.configured">
      <p class="lead">{{ t.sync.notConfigured }}</p>
      <p class="hint">{{ t.sync.setupHint }}</p>
    </template>

    <!-- signed in -->
    <template v-else-if="sync.user">
      <div class="status" :class="`status--${sync.status}`">
        <span class="dot" />
        <span>{{ statusLabel }}</span>
        <span class="status__time">
          {{ t.sync.lastSync }}:
          {{ sync.lastSyncedAt ? formatDateTime(sync.lastSyncedAt) : t.sync.never }}
        </span>
      </div>

      <p class="lead">{{ t.sync.signedInAs }} <strong>{{ sync.user.email }}</strong></p>
      <p v-if="sync.error" class="error">{{ sync.error }}</p>
      <p class="hint">{{ t.sync.explain }}</p>

      <div class="row">
        <button class="btn btn--primary" @click="syncNow()">
          <AppIcon name="refresh" :size="14" /> {{ t.sync.syncNow }}
        </button>
        <button class="btn" @click="signOut()">{{ t.sync.signOut }}</button>
      </div>
    </template>

    <!-- signed out -->
    <template v-else>
      <p class="hint">{{ t.sync.explain }}</p>
      <form @submit.prevent="submit">
        <label class="label" for="sync-email">{{ t.sync.email }}</label>
        <input id="sync-email" v-model="email" class="input" type="email" autocomplete="email" />

        <label class="label" style="margin-top: 14px" for="sync-pass">{{ t.sync.password }}</label>
        <input
          id="sync-pass"
          v-model="password"
          class="input"
          type="password"
          autocomplete="current-password"
          :placeholder="t.sync.passwordHint"
        />

        <p v-if="sync.error" class="error">{{ sync.error }}</p>
        <p v-if="notice" class="notice">{{ notice }}</p>

        <div class="row" style="margin-top: 16px">
          <button
            class="btn btn--primary"
            type="submit"
            :disabled="sync.busy || !email.trim() || password.length < 6"
          >
            {{ mode === 'signUp' ? t.sync.signUp : t.sync.signIn }}
          </button>
          <button class="btn btn--ghost" type="button" @click="mode = mode === 'signUp' ? 'signIn' : 'signUp'">
            {{ mode === 'signUp' ? t.sync.haveAccount : t.sync.noAccount }}
          </button>
        </div>
      </form>
    </template>
  </BaseModal>
</template>

<style scoped>
.lead { margin: 0 0 10px; }
.hint { margin: 0 0 14px; color: var(--fg-muted); font-size: 12.5px; line-height: 1.55; }
.row { display: flex; flex-wrap: wrap; gap: 8px; }

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--bg-sunken);
  font-size: 12.5px;
  font-weight: 600;
}
.status .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--fg-subtle); }
.status--synced .dot { background: #22c55e; }
.status--syncing .dot { background: var(--accent); }
.status--error .dot { background: var(--danger); }
.status--offline .dot { background: var(--prio-medium); }
.status__time { margin-left: auto; color: var(--fg-muted); font-weight: 400; }

.error {
  margin: 12px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 12.5px;
}
.notice {
  margin: 12px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12.5px;
}
</style>
