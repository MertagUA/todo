<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import TaskList from './components/TaskList.vue'
import CalendarView from './components/CalendarView.vue'
import PlannerView from './components/PlannerView.vue'
import TaskDetail from './components/TaskDetail.vue'
import AppIcon from './components/AppIcon.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import { state, actions, selectedTask } from './store/store.js'
import { formatDue } from './utils/date.js'
import { t } from './i18n.js'

const listRef = ref(null)
const narrow = ref(window.innerWidth < 900)

const sidebarVisible = computed(() => state.ui.sidebarOpen || !narrow.value)

// A repeating task that rolls forward announces itself for a few seconds.
let rollTimer = null
watch(
  () => state.ui.rolled,
  (rolled) => {
    clearTimeout(rollTimer)
    if (rolled) rollTimer = setTimeout(() => actions.dismissRoll(), 7000)
  },
)

/** Wording for whichever destructive action is waiting for an OK. */
const confirmCopy = computed(() => {
  const c = state.ui.confirm
  if (!c) return null
  if (c.kind === 'task') {
    return { title: t.confirm.taskTitle, message: t.confirm.taskText(c.title), label: t.confirm.taskLabel }
  }
  if (c.kind === 'project') {
    return {
      title: t.confirm.projectTitle,
      message: t.confirm.projectText(c.title, c.count),
      label: t.confirm.projectLabel,
    }
  }
  if (c.kind === 'event') {
    return { title: t.confirm.eventTitle, message: t.confirm.eventText(c.title), label: t.confirm.eventLabel }
  }
  return {
    title: t.confirm.clearTitle,
    message: t.confirm.clearText(c.count),
    label: t.confirm.clearLabel(c.count),
  }
})

function onResize() {
  narrow.value = window.innerWidth < 900
}

function onKey(e) {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
  if (e.key === 'Escape') {
    if (typing) e.target.blur()
    else actions.closeTask()
    return
  }
  if (typing) return
  if (e.key === 'n') {
    e.preventDefault()
    listRef.value?.focusQuickAdd()
  }
  if (e.key === '/') {
    e.preventDefault()
    listRef.value?.focusSearch()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="app" :class="{ 'app--narrow': narrow }">
    <Transition name="fade">
      <div v-if="narrow && state.ui.sidebarOpen" class="scrim" @click="state.ui.sidebarOpen = false" />
    </Transition>

    <div v-show="sidebarVisible" class="app__side">
      <AppSidebar />
    </div>

    <div class="app__center">
      <button v-if="narrow" class="burger btn btn--ghost btn--icon" @click="state.ui.sidebarOpen = !state.ui.sidebarOpen">
        <AppIcon name="menu" />
      </button>
      <CalendarView v-if="state.ui.view.kind === 'calendar'" />
      <PlannerView v-else-if="state.ui.view.kind === 'planner'" />
      <TaskList v-else ref="listRef" />
    </div>

    <ConfirmDialog
      v-if="confirmCopy"
      :title="confirmCopy.title"
      :message="confirmCopy.message"
      :confirm-label="confirmCopy.label"
      danger
      @confirm="actions.confirmPending()"
      @cancel="actions.cancelPending()"
    />

    <Transition name="toast">
      <div v-if="state.ui.rolled" class="toast">
        <AppIcon name="repeat" :size="15" />
        <span class="toast__text">
          {{ t.toast.rolled(state.ui.rolled.title, formatDue(state.ui.rolled.nextDate).toLowerCase()) }}
        </span>
        <button class="toast__btn" @click="actions.undoRoll()">
          <AppIcon name="undo" :size="13" /> {{ t.toast.undo }}
        </button>
        <button class="toast__x" @click="actions.dismissRoll()" :aria-label="t.toast.dismiss">
          <AppIcon name="close" :size="13" />
        </button>
      </div>
    </Transition>

    <Transition name="slide">
      <TaskDetail v-if="selectedTask" :key="selectedTask.id" :task="selectedTask" class="app__detail" />
    </Transition>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  height: 100%;
  overflow: hidden;
}
.app__side { flex: none; height: 100%; }
.app__center { position: relative; display: flex; flex: 1; min-width: 0; }

.burger {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 5;
}

.toast {
  position: fixed;
  bottom: 22px;
  left: 50%;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(460px, calc(100vw - 32px));
  padding: 10px 10px 10px 14px;
  transform: translateX(-50%);
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md);
  color: var(--fg-muted);
  font-size: 13px;
}
.toast__text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.toast__text strong { color: var(--fg); font-weight: 600; }
.toast__btn {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: none;
  padding: 5px 11px;
  border: 0;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
}
.toast__btn:hover { filter: brightness(1.06); }
.toast__x {
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--fg-subtle);
}
.toast__x:hover { background: var(--bg-hover); color: var(--fg); }

.toast-enter-active, .toast-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }

.scrim {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(6, 8, 14, 0.5);
}

.app--narrow .app__side {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 31;
  box-shadow: var(--shadow-lg);
}
.app--narrow .app__detail {
  position: fixed;
  inset: 0 0 0 auto;
  z-index: 32;
  width: min(360px, 100%);
  box-shadow: var(--shadow-lg);
}
</style>
