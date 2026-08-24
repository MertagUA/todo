<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import AppIcon from './AppIcon.vue'
import { actions, EXTEND_PRESETS } from '../store/store.js'
import { t } from '../i18n.js'

const props = defineProps({
  taskId: { type: String, required: true },
  from: { type: String, required: true },   // the day the stretch starts from
  align: { type: String, default: 'left' }, // 'left' | 'right'
})
const emit = defineEmits(['close'])

function apply(preset) {
  actions.extendPlan(props.taskId, props.from, preset)
  emit('close')
}

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="menu" :class="`menu--${align}`" @click.stop>
    <p class="menu__head">{{ t.planner.extendTitle }}</p>
    <button v-for="preset in EXTEND_PRESETS" :key="preset.key" class="menu__item" @click="apply(preset)">
      <AppIcon name="right" :size="13" />
      {{ preset.label }}
    </button>
    <div class="menu__sep" />
    <button class="menu__item menu__item--muted" @click="actions.clearPlan(taskId); emit('close')">
      <AppIcon name="close" :size="13" />
      {{ t.planner.clearPlan }}
    </button>
  </div>
</template>

<style scoped>
.menu {
  position: absolute;
  top: calc(100% + 4px);
  z-index: 30;
  width: 196px;
  padding: 5px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md);
  cursor: default;
}
.menu--left { left: 0; }
.menu--right { right: 0; }
.menu__head {
  margin: 3px 8px 5px;
  color: var(--fg-subtle);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--fg);
  font-size: 12.5px;
  text-align: left;
}
.menu__item:hover { background: var(--bg-hover); }
.menu__item--muted { color: var(--fg-muted); }
.menu__sep { height: 1px; margin: 4px 0; background: var(--border); }
</style>
