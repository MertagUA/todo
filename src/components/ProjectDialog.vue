<script setup>
import { ref, nextTick, onMounted } from 'vue'
import BaseModal from './BaseModal.vue'
import { PROJECT_COLORS } from '../store/store.js'
import { t } from '../i18n.js'

const props = defineProps({
  project: { type: Object, default: null }, // null = create mode
})
const emit = defineEmits(['save', 'close'])

const EMOJIS = ['📁', '🌱', '💼', '📚', '💍', '🏠', '🏋️', '✈️', '🎨', '🎮', '💰', '🩺', '🛒', '🐾', '🎯', '🔥']

const name = ref(props.project?.name ?? '')
const emoji = ref(props.project?.emoji ?? '📁')
const color = ref(props.project?.color ?? PROJECT_COLORS[0])
const nameInput = ref(null)

onMounted(async () => {
  await nextTick()
  nameInput.value?.focus()
})

function submit() {
  const trimmed = name.value.trim()
  if (!trimmed) return
  emit('save', { name: trimmed, emoji: emoji.value, color: color.value })
}
</script>

<template>
  <BaseModal :title="project ? t.project.editTitle : t.project.newTitle" width="440px" @close="emit('close')">
    <form @submit.prevent="submit">
      <label class="label" for="prj-name">{{ t.project.name }}</label>
      <input
        id="prj-name"
        ref="nameInput"
        v-model="name"
        class="input"
        :placeholder="t.project.namePlaceholder"
        maxlength="40"
      />

      <label class="label" style="margin-top: 18px">{{ t.project.icon }}</label>
      <div class="grid">
        <button
          v-for="e in EMOJIS"
          :key="e"
          type="button"
          class="emoji"
          :class="{ 'emoji--on': emoji === e }"
          @click="emoji = e"
        >
          {{ e }}
        </button>
      </div>

      <label class="label" style="margin-top: 18px">{{ t.project.color }}</label>
      <div class="colors">
        <button
          v-for="c in PROJECT_COLORS"
          :key="c"
          type="button"
          class="swatch"
          :class="{ 'swatch--on': color === c }"
          :style="{ '--c': c }"
          :aria-label="c"
          @click="color = c"
        />
      </div>

      <div class="preview">
        <span class="dot" :style="{ background: color }" />
        <span class="pv-emoji">{{ emoji }}</span>
        <span class="pv-name">{{ name || t.project.preview }}</span>
      </div>
    </form>

    <template #footer>
      <button class="btn" @click="emit('close')">{{ t.confirm.cancel }}</button>
      <button class="btn btn--primary" :disabled="!name.trim()" @click="submit">
        {{ project ? t.project.save : t.project.create }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}
.emoji {
  aspect-ratio: 1;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--bg-hover);
  font-size: 17px;
  line-height: 1;
  transition: transform 0.1s, border-color 0.1s;
}
.emoji:hover { transform: scale(1.12); }
.emoji--on { border-color: var(--accent); background: var(--accent-soft); }

.colors { display: flex; flex-wrap: wrap; gap: 8px; }
.swatch {
  width: 26px;
  height: 26px;
  border: 2px solid transparent;
  border-radius: 50%;
  background: var(--c);
  box-shadow: inset 0 0 0 2px var(--bg-elevated);
  transition: transform 0.1s;
}
.swatch:hover { transform: scale(1.12); }
.swatch--on { border-color: var(--c); }

.preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  padding: 10px 12px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  color: var(--fg-muted);
}
.dot { width: 8px; height: 8px; border-radius: 50%; }
.pv-emoji { font-size: 15px; }
.pv-name { color: var(--fg); font-weight: 550; }
</style>
