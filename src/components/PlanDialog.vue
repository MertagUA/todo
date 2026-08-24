<script setup>
import { ref, computed } from 'vue'
import BaseModal from './BaseModal.vue'
import AppIcon from './AppIcon.vue'
import { state, actions, projectById } from '../store/store.js'
import { t } from '../i18n.js'
import { formatDayLong, formatDue } from '../utils/date.js'

const props = defineProps({ date: { type: String, required: true } })
const emit = defineEmits(['close'])

const search = ref('')

const candidates = computed(() => {
  const query = search.value.trim().toLowerCase()
  return state.tasks
    .filter((task) => {
      if (task.done) return false
      const project = projectById(task.projectId)
      if (project?.archived) return false
      if (!query) return true
      return `${task.title} ${task.description} ${task.tags.join(' ')}`.toLowerCase().includes(query)
    })
    .sort((a, b) => {
      const planned = Number(b.plannedDates?.includes(props.date)) - Number(a.plannedDates?.includes(props.date))
      return planned || a.order - b.order
    })
})

const isPlanned = (task) => !!task.plannedDates?.includes(props.date)
</script>

<template>
  <BaseModal :title="t.calendar.planTitle(formatDayLong(date))" width="480px" @close="emit('close')">
    <input v-model="search" class="input" :placeholder="t.calendar.planSearch" />

    <ul class="list">
      <li v-for="task in candidates" :key="task.id">
        <button
          class="item"
          :class="{ 'item--on': isPlanned(task) }"
          @click="actions.togglePlanned(task.id, date)"
        >
          <span class="check" :class="{ 'check--on': isPlanned(task) }">
            <AppIcon v-if="isPlanned(task)" name="check" :size="11" />
          </span>
          <span class="body">
            <span class="title">{{ task.title }}</span>
            <span class="meta">
              <span v-if="projectById(task.projectId)" class="chip">
                <span class="dot" :style="{ background: projectById(task.projectId).color }" />
                {{ projectById(task.projectId).emoji }} {{ projectById(task.projectId).name }}
              </span>
              <span v-if="task.dueDate" class="chip">
                <AppIcon name="calendar" :size="11" /> {{ formatDue(task.dueDate) }}
              </span>
            </span>
          </span>
        </button>
      </li>
    </ul>

    <p v-if="!candidates.length" class="empty">{{ t.planner.poolEmpty }}</p>

    <template #footer>
      <button class="btn btn--primary" @click="emit('close')">{{ t.calendar.planDone }}</button>
    </template>
  </BaseModal>
</template>

<style scoped>
.list { max-height: 46vh; margin: 12px 0 0; padding: 0; overflow-y: auto; list-style: none; }
.item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  text-align: left;
}
.item:hover { background: var(--bg-hover); }
.item--on { border-color: var(--accent); background: var(--accent-soft); }
.check {
  flex: none;
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  margin-top: 2px;
  border: 1.8px solid var(--border-strong);
  border-radius: 5px;
  color: var(--accent-fg);
}
.check--on { background: var(--accent); border-color: var(--accent); }
.body { min-width: 0; }
.title { display: block; font-weight: 500; overflow-wrap: anywhere; }
.meta { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
.dot { width: 6px; height: 6px; border-radius: 50%; }
.empty { margin: 16px 0 0; color: var(--fg-muted); text-align: center; font-size: 13px; }
</style>
