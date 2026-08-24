<script setup>
import { ref, onMounted, nextTick } from 'vue'
import BaseModal from './BaseModal.vue'
import { t } from '../i18n.js'

defineProps({
  title: { type: String, default: 'Точно?' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Так' },
  danger: { type: Boolean, default: false },
})
const emit = defineEmits(['confirm', 'cancel'])

// Focus the confirm button so Enter accepts and Esc (handled by BaseModal) cancels.
const confirmBtn = ref(null)
onMounted(async () => {
  await nextTick()
  confirmBtn.value?.focus()
})
</script>

<template>
  <BaseModal :title="title" width="400px" @close="emit('cancel')">
    <p class="msg">{{ message }}</p>
    <template #footer>
      <button class="btn" @click="emit('cancel')">{{ t.confirm.cancel }}</button>
      <button
        ref="confirmBtn"
        class="btn btn--primary"
        :style="danger ? { background: 'var(--danger)', color: '#fff' } : null"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.msg { margin: 0; color: var(--fg-muted); line-height: 1.6; }
</style>
