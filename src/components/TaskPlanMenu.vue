<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import AppIcon from './AppIcon.vue'
import { actions, EXTEND_PRESETS } from '../store/store.js'
import { t } from '../i18n.js'
import { weekDatesISO, weekdayShort, dayNumber, todayISO } from '../utils/date.js'

const props = defineProps({
  taskId: { type: String, required: true },
  from: { type: String, required: true },      // the day this card sits on
  align: { type: String, default: 'right' },   // 'left' | 'right'
})
const emit = defineEmits(['close'])

/** Moving works by touch too, where HTML5 drag-and-drop does not exist. */
const week = weekDatesISO(props.from)
const today = todayISO()

function moveTo(iso) {
  actions.movePlanned(props.taskId, props.from, iso)
  emit('close')
}
function extend(preset) {
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
    <p class="menu__head">{{ t.planner.moveTitle }}</p>
    <div class="days">
      <button
        v-for="iso in week"
        :key="iso"
        class="day"
        :class="{ 'day--on': iso === from, 'day--today': iso === today }"
        @click="moveTo(iso)"
      >
        <span class="day__dow">{{ weekdayShort(iso) }}</span>
        <span class="day__num">{{ dayNumber(iso) }}</span>
      </button>
    </div>

    <p class="menu__head">{{ t.planner.extendTitle }}</p>
    <button v-for="preset in EXTEND_PRESETS" :key="preset.key" class="menu__item" @click="extend(preset)">
      <AppIcon name="right" :size="13" />
      {{ preset.label }}
    </button>

    <div class="menu__sep" />
    <button class="menu__item menu__item--muted" @click="actions.unplanTask(taskId, from); emit('close')">
      <AppIcon name="close" :size="13" />
      {{ t.planner.removeFromDay }}
    </button>
    <button class="menu__item menu__item--muted" @click="actions.clearPlan(taskId); emit('close')">
      <AppIcon name="trash" :size="13" />
      {{ t.planner.clearPlan }}
    </button>
  </div>
</template>

<style scoped>
.menu {
  position: absolute;
  top: calc(100% + 4px);
  z-index: 30;
  width: 214px;
  max-height: 62vh;
  padding: 5px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md);
  overflow-y: auto;
  cursor: default;
}
.menu--left { left: 0; }
.menu--right { right: 0; }

.menu__head {
  margin: 4px 8px 5px;
  color: var(--fg-subtle);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; margin-bottom: 8px; }
.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 5px 0;
  border: 1px solid transparent;
  border-radius: 7px;
  background: var(--bg-hover);
  color: var(--fg-muted);
}
.day:hover { background: var(--bg-active); color: var(--fg); }
.day--today { color: var(--accent); }
.day--on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.day__dow { font-size: 9px; font-weight: 700; text-transform: uppercase; }
.day__num { font-size: 12px; font-weight: 650; }

.menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
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
