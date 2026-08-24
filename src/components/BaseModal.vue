<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import AppIcon from './AppIcon.vue'

defineProps({
  title: { type: String, default: '' },
  width: { type: String, default: '420px' },
})
const emit = defineEmits(['close'])

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="overlay" @mousedown.self="emit('close')">
    <div class="modal" :style="{ width }" role="dialog" aria-modal="true">
      <header class="modal__head">
        <h2>{{ title }}</h2>
        <button class="btn btn--ghost btn--icon" @click="emit('close')" aria-label="Закрити">
          <AppIcon name="close" />
        </button>
      </header>
      <div class="modal__body"><slot /></div>
      <footer v-if="$slots.footer" class="modal__foot"><slot name="footer" /></footer>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(6, 8, 14, 0.55);
  backdrop-filter: blur(3px);
  animation: fade 0.14s ease;
}
.modal {
  max-width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-lg);
  animation: pop 0.16s ease;
}
.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 12px 20px;
}
.modal__head h2 { margin: 0; font-size: 15px; font-weight: 650; }
.modal__body { padding: 4px 20px 20px; overflow: auto; }
.modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
}
@keyframes fade { from { opacity: 0 } }
@keyframes pop { from { opacity: 0; transform: translateY(8px) scale(0.98) } }
</style>
