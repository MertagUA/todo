<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import AppIcon from './AppIcon.vue'
import {
  state, actions, activeProjects, PRIORITIES, REPEAT_PRESETS, EXTEND_PRESETS,
} from '../store/store.js'
import { t } from '../i18n.js'
import {
  todayISO, addDaysISO, formatDateTime, formatDue,
  formatRepeat, formatFullDate, nextOccurrence, weekdayShort,
} from '../utils/date.js'

const props = defineProps({ task: { type: Object, required: true } })

const tagDraft = ref('')
const titleEl = ref(null)

/** Grow the title box with its content (works without CSS field-sizing). */
function autogrow() {
  const el = titleEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
onMounted(autogrow)

/** Every field writes straight back into the store — no save button needed. */
function set(patch) {
  actions.updateTask(props.task.id, patch)
}

const projectOptions = computed(() => {
  const list = activeProjects.value.slice()
  const own = state.projects.find((p) => p.id === props.task.projectId)
  if (own && own.archived) list.unshift(own)
  return list
})

/* ---------------------------------------------------------------- recurrence */

const WEEKDAYS = [
  { value: 1, label: 'Пн' }, { value: 2, label: 'Вт' }, { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' }, { value: 5, label: 'Пт' }, { value: 6, label: 'Сб' },
  { value: 0, label: 'Нд' },
]

/* --------------------------------------------------------------- work days */

const planDraft = ref('')

function addPlanned(iso) {
  if (!iso) return
  actions.planTask(props.task.id, iso)
  planDraft.value = ''
}

/** Stretching starts from the last day already planned, or from today. */
const extendFrom = computed(() => {
  const days = props.task.plannedDates || []
  return days.length ? days[days.length - 1] : todayISO()
})

function extend(preset) {
  actions.extendPlan(props.task.id, extendFrom.value, preset)
}

const repeat = computed(() => props.task.repeat)

/** Which preset button looks active — 'custom' when the rule matches none of them. */
const presetKey = computed(() => {
  const r = repeat.value
  if (!r) return 'none'
  const hit = REPEAT_PRESETS.find(
    (p) =>
      p.rule &&
      p.rule.unit === r.unit &&
      (p.rule.interval || 1) === (r.interval || 1) &&
      [...(p.rule.weekdays || [])].sort().join() === [...(r.weekdays || [])].sort().join(),
  )
  return hit ? hit.key : 'custom'
})

const nextDate = computed(() =>
  repeat.value ? nextOccurrence(props.task.dueDate, repeat.value) : null,
)

function applyPreset(preset) {
  actions.setRepeat(props.task.id, preset.rule)
}
function setUnit(unit) {
  actions.setRepeat(props.task.id, { ...repeat.value, unit, weekdays: unit === 'week' ? repeat.value.weekdays : [] })
}
function setInterval_(value) {
  const n = Math.min(365, Math.max(1, Number(value) || 1))
  actions.setRepeat(props.task.id, { ...repeat.value, interval: n })
}
function toggleWeekday(day) {
  const days = repeat.value.weekdays || []
  const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
  actions.setRepeat(props.task.id, { ...repeat.value, weekdays: next })
}

function addTag() {
  const tag = tagDraft.value.trim().replace(/^#/, '').toLowerCase()
  if (!tag) return
  if (!props.task.tags.includes(tag)) set({ tags: [...props.task.tags, tag] })
  tagDraft.value = ''
}
function removeTag(tag) {
  set({ tags: props.task.tags.filter((t) => t !== tag) })
}

watch(
  () => props.task.id,
  async () => {
    tagDraft.value = ''
    await nextTick()
    autogrow()
  },
)
</script>

<template>
  <aside class="detail">
    <header class="head">
      <button
        class="btn"
        :class="task.done ? 'btn--primary' : ''"
        @click="actions.toggleTask(task.id)"
      >
        <AppIcon name="check" :size="14" />
        {{ task.done ? t.task.done : t.task.markDone }}
      </button>
      <div class="spacer" />
      <button class="btn btn--ghost btn--icon" :title="t.task.duplicate" @click="actions.duplicateTask(task.id)">
        <AppIcon name="copy" />
      </button>
      <button class="btn btn--ghost btn--icon" :title="t.task.delete" @click="actions.requestDeleteTask(task.id)">
        <AppIcon name="trash" />
      </button>
      <button class="btn btn--ghost btn--icon" :title="t.task.close" @click="actions.closeTask()">
        <AppIcon name="close" />
      </button>
    </header>

    <div class="scroll">
      <textarea
        ref="titleEl"
        class="title-input"
        :value="task.title"
        rows="1"
        :placeholder="t.task.title"
        @input="set({ title: $event.target.value }); autogrow()"
      />

      <label class="label">{{ t.task.description }}</label>
      <textarea
        class="textarea"
        :value="task.description"
        :placeholder="t.task.descriptionPlaceholder"
        @input="set({ description: $event.target.value })"
      />

      <label class="label" style="margin-top: 18px">{{ t.task.project }}</label>
      <select class="select" :value="task.projectId" @change="set({ projectId: $event.target.value })">
        <option v-for="p in projectOptions" :key="p.id" :value="p.id">
          {{ p.emoji }} {{ p.name }}{{ p.archived ? ' (архів)' : '' }}
        </option>
      </select>

      <label class="label" style="margin-top: 18px">{{ t.task.deadline }}</label>
      <input
        type="date"
        class="input"
        :value="task.dueDate || ''"
        @input="set({ dueDate: $event.target.value || null })"
      />
      <div class="quick">
        <button class="mini" @click="set({ dueDate: todayISO() })">{{ t.task.today }}</button>
        <button class="mini" @click="set({ dueDate: addDaysISO(todayISO(), 1) })">{{ t.task.tomorrow }}</button>
        <button class="mini" @click="set({ dueDate: addDaysISO(todayISO(), 7) })">{{ t.task.plusWeek }}</button>
        <button v-if="task.dueDate" class="mini mini--clear" @click="set({ dueDate: null })">{{ t.task.clear }}</button>
      </div>
      <p v-if="task.dueDate" class="due-note">{{ formatDue(task.dueDate) }}</p>

      <label class="label" style="margin-top: 18px">{{ t.task.plan }}</label>
      <p class="plan-hint">{{ t.task.planHint }}</p>
      <div v-if="task.plannedDates?.length" class="plan-days">
        <span v-for="iso in task.plannedDates" :key="iso" class="chip chip--accent">
          {{ weekdayShort(iso) }}, {{ formatDue(iso) }}
          <button class="tag-x" @click="actions.unplanTask(task.id, iso)">
            <AppIcon name="close" :size="11" />
          </button>
        </span>
      </div>
      <div class="plan-add">
        <input v-model="planDraft" type="date" class="input" @change="addPlanned(planDraft)" />
        <button class="mini" @click="addPlanned(todayISO())">{{ t.task.today }}</button>
        <button class="mini" @click="addPlanned(addDaysISO(todayISO(), 1))">{{ t.task.tomorrow }}</button>
      </div>

      <p class="plan-sub">
        {{ t.planner.extendTitle }} <strong>{{ weekdayShort(extendFrom) }}, {{ formatDue(extendFrom) }}</strong>
      </p>
      <div class="plan-extend">
        <button v-for="preset in EXTEND_PRESETS" :key="preset.key" class="mini" @click="extend(preset)">
          {{ preset.label }}
        </button>
        <button
          v-if="task.plannedDates?.length"
          class="mini mini--clear"
          @click="actions.clearPlan(task.id)"
        >
          {{ t.planner.clearPlan }}
        </button>
      </div>

      <label class="label" style="margin-top: 18px">{{ t.task.repeat }}</label>
      <div class="presets">
        <button
          v-for="preset in REPEAT_PRESETS"
          :key="preset.key"
          class="mini"
          :class="{ 'mini--on': presetKey === preset.key }"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </button>
        <span v-if="presetKey === 'custom'" class="mini mini--on">{{ t.repeat.custom }}</span>
      </div>

      <div v-if="repeat" class="rules">
        <div class="every">
          <span>{{ t.task.repeatEvery }}</span>
          <input
            type="number"
            class="input input--num"
            min="1"
            max="365"
            :value="repeat.interval"
            @input="setInterval_($event.target.value)"
          />
          <select class="select select--inline" :value="repeat.unit" @change="setUnit($event.target.value)">
            <option value="day">{{ t.task.unitDay }}</option>
            <option value="week">{{ t.task.unitWeek }}</option>
            <option value="month">{{ t.task.unitMonth }}</option>
            <option value="year">{{ t.task.unitYear }}</option>
          </select>
        </div>

        <div v-if="repeat.unit === 'week'" class="days">
          <button
            v-for="d in WEEKDAYS"
            :key="d.value"
            class="day"
            :class="{ 'day--on': repeat.weekdays?.includes(d.value) }"
            :title="t.task.repeat"
            @click="toggleWeekday(d.value)"
          >
            {{ d.label }}
          </button>
        </div>

        <p class="repeat-note">
          <AppIcon name="repeat" :size="12" />
          {{ formatRepeat(repeat) }} · {{ t.task.repeatMovesTo }}
          <strong>{{ formatFullDate(nextDate) }}</strong>
        </p>
        <p v-if="task.completions" class="repeat-note">
          <AppIcon name="flame" :size="12" />
          {{ t.task.completedTimes(task.completions) }}{{ task.lastCompletedAt ? `, ${t.task.lastTime} ${formatDateTime(task.lastCompletedAt)}` : '' }}
        </p>
      </div>

      <label class="label" style="margin-top: 18px">{{ t.task.priority }}</label>
      <div class="segmented">
        <button
          v-for="p in PRIORITIES"
          :key="p.value"
          class="seg"
          :class="{ 'seg--on': task.priority === p.value }"
          @click="set({ priority: p.value })"
        >
          <span v-if="p.value !== 'none'" class="seg__dot" :style="{ background: p.color }" />
          {{ p.label }}
        </button>
      </div>

      <label class="label" style="margin-top: 18px">{{ t.task.tags }}</label>
      <div class="tags">
        <span v-for="tag in task.tags" :key="tag" class="chip">
          #{{ tag }}
          <button class="tag-x" @click="removeTag(tag)"><AppIcon name="close" :size="11" /></button>
        </span>
      </div>
      <input
        v-model="tagDraft"
        class="input"
        :placeholder="t.task.tagPlaceholder"
        @keydown.enter.prevent="addTag"
        @blur="addTag"
      />

      <dl class="stamps">
        <div><dt>{{ t.task.created }}</dt><dd>{{ formatDateTime(task.createdAt) }}</dd></div>
        <div v-if="task.completedAt"><dt>{{ t.task.completedAt }}</dt><dd>{{ formatDateTime(task.completedAt) }}</dd></div>
      </dl>
    </div>
  </aside>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  width: 340px;
  height: 100%;
  border-left: 1px solid var(--border);
  background: var(--bg);
}
.head {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px;
  border-bottom: 1px solid var(--border);
}
.spacer { flex: 1; }
.scroll { flex: 1; padding: 16px; overflow-y: auto; }

.title-input {
  width: 100%;
  min-height: 30px;
  overflow: hidden;
  margin-bottom: 18px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--fg);
  font-size: 18px;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: -0.01em;
  resize: none;
}
.title-input:focus { outline: none; }
.title-input::placeholder { color: var(--fg-subtle); }

.quick { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.mini {
  padding: 4px 9px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--fg-muted);
  font-size: 12px;
}
.mini:hover { border-color: var(--accent); color: var(--accent); }
.mini--clear:hover { border-color: var(--danger); color: var(--danger); }
.due-note { margin: 8px 0 0; color: var(--fg-muted); font-size: 12px; }

.presets { display: flex; flex-wrap: wrap; gap: 6px; }
.plan-hint { margin: -2px 0 8px; color: var(--fg-subtle); font-size: 11.5px; line-height: 1.45; }
.plan-days { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.plan-add { display: flex; align-items: center; gap: 6px; }
.plan-sub { margin: 12px 0 6px; color: var(--fg-subtle); font-size: 11.5px; }
.plan-sub strong { color: var(--fg-muted); font-weight: 600; }
.plan-extend { display: flex; flex-wrap: wrap; gap: 6px; }
.plan-add .input { flex: 1; }
.mini--on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 600; }

.rules {
  margin-top: 10px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-sunken);
}
.every { display: flex; align-items: center; gap: 8px; color: var(--fg-muted); font-size: 13px; }
.input--num { width: 64px; text-align: center; }
.select--inline { width: auto; flex: 1; }

.days { display: flex; gap: 5px; margin-top: 10px; }
.day {
  flex: 1;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--bg);
  color: var(--fg-muted);
  font-size: 12px;
}
.day:hover { border-color: var(--border-strong); color: var(--fg); }
.day--on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 700; }

.repeat-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0 0;
  color: var(--fg-muted);
  font-size: 12px;
  line-height: 1.5;
}
.repeat-note strong { color: var(--fg); font-weight: 600; }

.segmented {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.seg {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--fg-muted);
  font-size: 13px;
}
.seg:hover { border-color: var(--border-strong); color: var(--fg); }
.seg--on { border-color: var(--accent); background: var(--accent-soft); color: var(--fg); font-weight: 600; }
.seg__dot { width: 7px; height: 7px; border-radius: 50%; }

.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.tag-x {
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  padding: 0;
}
.tag-x:hover { opacity: 1; }

.stamps {
  margin: 22px 0 0;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  color: var(--fg-subtle);
  font-size: 12px;
}
.stamps div { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
.stamps dt, .stamps dd { margin: 0; }

@media (max-width: 700px) {
  .detail { width: 100%; }
  .head { padding: 10px 12px; }
  .scroll { padding: 14px; }
  .mini { padding: 7px 12px; font-size: 13px; }
  .day { height: 34px; }
  .seg { padding: 9px 10px; }
}
</style>
