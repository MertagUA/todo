<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { actions, state, projectById, PRIORITIES } from '../store/store.js'
import { t } from '../i18n.js'
import { formatDue, isOverdue, daysFromToday, formatRepeat } from '../utils/date.js'

const props = defineProps({
  task: { type: Object, required: true },
  showProject: { type: Boolean, default: false },
})

const project = computed(() => projectById(props.task.projectId))
const priority = computed(() => PRIORITIES.find((p) => p.value === props.task.priority))
const selected = computed(() => state.ui.selectedTaskId === props.task.id)
const hasMeta = computed(() => {
  const t = props.task
  return !!(t.dueDate || t.description || t.repeat || t.tags?.length || (props.showProject && project.value))
})
const dueClass = computed(() => {
  if (!props.task.dueDate || props.task.done) return ''
  if (isOverdue(props.task.dueDate)) return 'chip--danger'
  return daysFromToday(props.task.dueDate) === 0 ? 'chip--accent' : ''
})
</script>

<template>
  <div
    class="task"
    :class="{ 'task--done': task.done, 'task--on': selected }"
    @click="actions.selectTask(task.id)"
  >
    <button
      class="check"
      :class="{ 'check--on': task.done }"
      :aria-label="task.done ? t.task.notDone : t.task.markDone"
      @click.stop="actions.toggleTask(task.id)"
    >
      <AppIcon v-if="task.done" name="check" :size="12" />
    </button>

    <div class="body">
      <div class="title-line">
        <span
          v-if="task.priority !== 'none'"
          class="prio"
          :style="{ background: priority.color }"
          :title="priority.label"
        />
        <span class="title">{{ task.title }}</span>
      </div>

      <div v-if="hasMeta" class="meta">
        <span v-if="showProject && project" class="chip">
          <span class="dot" :style="{ background: project.color }" />
          {{ project.emoji }} {{ project.name }}
        </span>
        <span v-if="task.dueDate" class="chip" :class="dueClass">
          <AppIcon name="calendar" :size="12" />
          {{ formatDue(task.dueDate) }}
        </span>
        <span v-if="task.repeat" class="chip" :title="formatRepeat(task.repeat)">
          <AppIcon name="repeat" :size="12" />
          {{ formatRepeat(task.repeat) }}
        </span>
        <span v-if="task.repeat && task.completions" class="chip" :title="t.task.timesDone">
          <AppIcon name="flame" :size="12" />
          {{ task.completions }}
        </span>
        <span v-for="tag in task.tags" :key="tag" class="chip">#{{ tag }}</span>
        <span v-if="task.plannedDates?.length" class="chip" :title="t.task.plan">
          <AppIcon name="board" :size="12" />
          {{ task.plannedDates.length }}
        </span>
        <span v-if="task.description" class="chip chip--note" :title="t.task.hasNote">
          <AppIcon name="edit" :size="12" />
        </span>
      </div>
    </div>

    <div class="tools" @click.stop>
      <button class="tool" :title="t.task.up" @click="actions.moveTask(task.id, -1)">
        <AppIcon name="up" :size="14" />
      </button>
      <button class="tool" :title="t.task.down" @click="actions.moveTask(task.id, 1)">
        <AppIcon name="down" :size="14" />
      </button>
      <button class="tool" :title="t.task.duplicate" @click="actions.duplicateTask(task.id)">
        <AppIcon name="copy" :size="14" />
      </button>
      <button class="tool tool--danger" :title="t.task.delete" @click="actions.requestDeleteTask(task.id)">
        <AppIcon name="trash" :size="14" />
      </button>
    </div>
  </div>
</template>


<style scoped>
.task {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 11px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: border-color 0.12s, transform 0.08s, box-shadow 0.12s;
}
.task:hover { border-color: var(--border-strong); }
.task--on { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.task--done { opacity: 0.55; }

.check {
  flex: none;
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  margin-top: 1px;
  border: 1.8px solid var(--border-strong);
  border-radius: 6px;
  background: transparent;
  color: var(--accent-fg);
  transition: background 0.12s, border-color 0.12s, transform 0.08s;
}
.check:hover { border-color: var(--accent); transform: scale(1.08); }
.check--on { background: var(--accent); border-color: var(--accent); }

.body { flex: 1; min-width: 0; }
.title-line { display: flex; align-items: center; gap: 7px; }
.prio { flex: none; width: 6px; height: 6px; border-radius: 50%; }
.title {
  min-width: 0;
  overflow-wrap: anywhere;
  font-weight: 500;
  line-height: 1.45;
}
.task--done .title { text-decoration: line-through; color: var(--fg-muted); }

.meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
.dot { width: 6px; height: 6px; border-radius: 50%; }
.chip--note { padding: 0 6px; }

.tools {
  flex: none;
  display: flex;
  gap: 1px;
  opacity: 0;
  transition: opacity 0.12s;
}
.task:hover .tools, .task--on .tools { opacity: 1; }
.tool {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--fg-subtle);
}
.tool:hover { background: var(--bg-hover); color: var(--fg); }
.tool--danger:hover { background: var(--danger-soft); color: var(--danger); }

@media (max-width: 720px), (hover: none) {
  .tools { opacity: 1; }
  .tool { width: 30px; height: 30px; }
  .task { padding: 12px; }
}
</style>
