<script setup>
import { ref, computed } from 'vue'
import AppIcon from './AppIcon.vue'
import PlanDialog from './PlanDialog.vue'
import TaskPlanMenu from './TaskPlanMenu.vue'
import { t } from '../i18n.js'
import {
  state, actions, activeProjects, projectById,
  tasksPlannedOn, unplannedTasks, PRIORITIES,
} from '../store/store.js'
import { useViewport } from '../useViewport.js'
import {
  weekDatesISO, formatWeekRange, weekdayShort, dayNumber,
  isWeekend, todayISO, formatDue, isOverdue, formatRepeat,
} from '../utils/date.js'

const dragging = ref(null)        // { id, from: iso | null }
const dropTarget = ref(null)      // iso | 'pool'
const planDialog = ref(null)      // { date }
const search = ref('')
const extendFor = ref(null)
const { isPhone } = useViewport()
const poolOpen = ref(true)      // `${taskId}|${iso}` of the open "stretch" menu
const projectFilter = ref('all')

const week = computed(() => weekDatesISO(state.ui.anchor))
const today = computed(() => todayISO())

const pool = computed(() => {
  const query = search.value.trim().toLowerCase()
  return unplannedTasks(week.value).filter((task) => {
    if (projectFilter.value !== 'all' && task.projectId !== projectFilter.value) return false
    if (!query) return true
    return `${task.title} ${task.description} ${task.tags.join(' ')}`.toLowerCase().includes(query)
  })
})

/** How many tasks sit on each day — drawn as a small load bar in the header. */
const load = computed(() => {
  const counts = week.value.map((iso) => tasksPlannedOn(iso).filter((x) => !x.done).length)
  return { counts, max: Math.max(1, ...counts) }
})

function extendKey(taskId, iso) {
  return `${taskId}|${iso}`
}

function priorityColor(task) {
  return PRIORITIES.find((p) => p.value === task.priority)?.color
}

/* ------------------------------------------------------------- drag and drop */

function onDragStart(task, from, event) {
  dragging.value = { id: task.id, from }
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', task.id)
}
function onDragEnd() {
  dragging.value = null
  dropTarget.value = null
}
function onDragOver(target, event) {
  if (!dragging.value) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dropTarget.value = target
}
function onDrop(target) {
  const drag = dragging.value
  dropTarget.value = null
  dragging.value = null
  if (!drag) return
  if (target === 'pool') {
    if (drag.from) actions.unplanTask(drag.id, drag.from)
    return
  }
  actions.movePlanned(drag.id, drag.from, target)
}
</script>

<template>
  <section class="planner">
    <header class="head">
      <div class="head__title">
        <AppIcon name="board" :size="19" class="muted" />
        <h1>{{ t.planner.title }}</h1>
        <span class="range">{{ formatWeekRange(state.ui.anchor) }}</span>
      </div>

      <div class="head__tools">
        <div class="nav">
          <button class="nav__btn" :title="t.calendar.prev" @click="actions.shiftAnchor(-7)">
            <AppIcon name="left" :size="15" />
          </button>
          <button class="nav__today" @click="actions.goToToday()">{{ t.calendar.today }}</button>
          <button class="nav__btn" :title="t.calendar.next" @click="actions.shiftAnchor(7)">
            <AppIcon name="chevron" :size="15" />
          </button>
        </div>
        <button v-if="isPhone" class="pool-toggle" @click="poolOpen = !poolOpen">
          <AppIcon name="inbox" :size="14" />
          {{ t.planner.pool }} · {{ pool.length }}
          <AppIcon name="chevron" :size="13" class="caret" :class="{ 'caret--open': poolOpen }" />
        </button>
        <p v-else class="hint">{{ t.planner.poolHint }}</p>
      </div>
    </header>

    <div class="board">
      <div class="days">
        <div
          v-for="(iso, i) in week"
          :key="iso"
          class="day"
          :class="{
            'day--today': iso === today,
            'day--weekend': isWeekend(iso),
            'day--drop': dropTarget === iso,
          }"
          @dragover="onDragOver(iso, $event)"
          @dragleave="dropTarget === iso && (dropTarget = null)"
          @drop.prevent="onDrop(iso)"
        >
          <header class="day__head">
            <span class="day__dow">{{ weekdayShort(iso) }}</span>
            <span class="day__num">{{ dayNumber(iso) }}</span>
            <span class="day__load">
              <span class="day__bar" :style="{ width: `${(load.counts[i] / load.max) * 100}%` }" />
            </span>
            <button class="day__add" :title="t.planner.addToDay" @click="planDialog = { date: iso }">
              <AppIcon name="plus" :size="14" />
            </button>
          </header>

          <div class="day__list">
            <article
              v-for="task in tasksPlannedOn(iso)"
              :key="task.id"
              class="card"
              :class="{ 'card--done': task.done, 'card--dragging': dragging?.id === task.id }"
              :style="{ '--card-color': projectById(task.projectId)?.color || 'var(--accent)' }"
              draggable="true"
              @dragstart="onDragStart(task, iso, $event)"
              @dragend="onDragEnd"
              @click="actions.selectTask(task.id)"
            >
              <button
                class="card__check"
                :class="{ 'card__check--on': task.done }"
                @click.stop="actions.toggleTask(task.id)"
              >
                <AppIcon v-if="task.done" name="check" :size="11" />
              </button>

              <div class="card__body">
                <span class="card__title">{{ task.title }}</span>
                <div class="card__meta">
                  <span v-if="projectById(task.projectId)" class="tagchip">
                    {{ projectById(task.projectId).emoji }} {{ projectById(task.projectId).name }}
                  </span>
                  <span
                    v-if="task.dueDate"
                    class="tagchip"
                    :class="{ 'tagchip--danger': isOverdue(task.dueDate) && !task.done }"
                  >
                    <AppIcon name="calendar" :size="10" /> {{ formatDue(task.dueDate) }}
                  </span>
                  <span v-if="task.repeat" class="tagchip" :title="formatRepeat(task.repeat)">
                    <AppIcon name="repeat" :size="10" /> {{ formatRepeat(task.repeat) }}
                  </span>
                  <span
                    v-if="task.priority !== 'none'"
                    class="prio"
                    :style="{ background: priorityColor(task) }"
                  />
                </div>
              </div>

              <div class="card__tools" @click.stop>
                <button
                  class="card__tool"
                  :title="t.planner.moveTo"
                  @click="extendFor = extendFor === extendKey(task.id, iso) ? null : extendKey(task.id, iso)"
                >
                  <AppIcon name="dots" :size="13" />
                </button>

                <TaskPlanMenu
                  v-if="extendFor === extendKey(task.id, iso)"
                  :task-id="task.id"
                  :from="iso"
                  align="right"
                  @close="extendFor = null"
                />
              </div>
            </article>

            <p v-if="!tasksPlannedOn(iso).length" class="day__empty">{{ t.planner.dropHere }}</p>
          </div>
        </div>
      </div>

      <aside
        v-if="!isPhone || poolOpen"
        class="pool"
        :class="{ 'pool--drop': dropTarget === 'pool' }"
        @dragover="onDragOver('pool', $event)"
        @dragleave="dropTarget === 'pool' && (dropTarget = null)"
        @drop.prevent="onDrop('pool')"
      >
        <header v-if="!isPhone" class="pool__head">
          <AppIcon name="inbox" :size="15" />
          <h2>{{ t.planner.pool }}</h2>
          <span class="pool__count">{{ pool.length }}</span>
        </header>

        <input v-model="search" class="input input--sm" :placeholder="t.planner.search" />
        <select v-model="projectFilter" class="select input--sm">
          <option value="all">{{ t.planner.allProjects }}</option>
          <option v-for="p in activeProjects" :key="p.id" :value="p.id">
            {{ p.emoji }} {{ p.name }}
          </option>
        </select>

        <div class="pool__list">
          <article
            v-for="task in pool"
            :key="task.id"
            class="card card--pool"
            :class="{ 'card--dragging': dragging?.id === task.id }"
            :style="{ '--card-color': projectById(task.projectId)?.color || 'var(--accent)' }"
            draggable="true"
            @dragstart="onDragStart(task, null, $event)"
            @dragend="onDragEnd"
            @click="actions.selectTask(task.id)"
          >
            <AppIcon name="grip" :size="14" class="card__grip" />
            <div class="card__body">
              <span class="card__title">{{ task.title }}</span>
              <div class="card__meta">
                <span v-if="projectById(task.projectId)" class="tagchip">
                  {{ projectById(task.projectId).emoji }} {{ projectById(task.projectId).name }}
                </span>
                <span
                  v-if="task.dueDate"
                  class="tagchip"
                  :class="{ 'tagchip--danger': isOverdue(task.dueDate) }"
                >
                  <AppIcon name="calendar" :size="10" /> {{ formatDue(task.dueDate) }}
                </span>
              </div>
            </div>
          </article>

          <p v-if="!pool.length" class="pool__empty">{{ t.planner.poolEmpty }}</p>
        </div>
      </aside>
    </div>

    <PlanDialog v-if="planDialog" :date="planDialog.date" @close="planDialog = null" />
  </section>
</template>

<style scoped>
.planner { display: flex; flex-direction: column; flex: 1; min-width: 0; height: 100%; background: var(--bg); }

.head { padding: 16px 20px 12px; border-bottom: 1px solid var(--border); }
.head__title { display: flex; align-items: baseline; gap: 10px; }
.head__title h1 { margin: 0; font-size: 20px; font-weight: 680; letter-spacing: -0.02em; }
.range { color: var(--fg-muted); font-size: 13px; }
.muted { color: var(--fg-muted); align-self: center; }
.head__tools { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 12px; }
.hint { margin: 0; color: var(--fg-subtle); font-size: 12px; }

.nav { display: flex; align-items: center; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.nav__btn, .nav__today {
  height: 30px;
  padding: 0 10px;
  border: 0;
  background: var(--bg-elevated);
  color: var(--fg-muted);
  display: grid;
  place-items: center;
}
.nav__today { font-size: 13px; font-weight: 600; }
.nav__btn:hover, .nav__today:hover { background: var(--bg-hover); color: var(--fg); }

.board { display: flex; flex: 1; min-height: 0; }
.days {
  display: grid;
  grid-template-columns: repeat(7, minmax(150px, 1fr));
  flex: 1;
  min-width: 0;
  overflow-x: auto;
}

.day {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid var(--border);
  transition: background 0.12s;
}
.day--weekend { background: var(--bg-sunken); }
.day--today { background: color-mix(in srgb, var(--accent) 6%, transparent); }
.day--drop { background: var(--accent-soft); box-shadow: inset 0 0 0 2px var(--accent); }

.day__head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 10px 8px;
  border-bottom: 1px solid var(--border);
}
.day__dow { color: var(--fg-muted); font-size: 11px; font-weight: 700; text-transform: uppercase; }
.day__num { color: var(--fg); font-size: 15px; font-weight: 650; }
.day--today .day__num { color: var(--accent); }
.day__load { flex: 1; height: 3px; border-radius: 999px; background: var(--bg-hover); overflow: hidden; }
.day__bar { display: block; height: 100%; border-radius: 999px; background: var(--accent); transition: width 0.2s; }
.day__add {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--fg-subtle);
  opacity: 0;
  transition: opacity 0.12s;
}
.day:hover .day__add { opacity: 1; }
.day__add:hover { background: var(--bg-hover); color: var(--accent); }

.day__list { flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 8px; overflow-y: auto; }
.day__empty {
  margin: 8px 0 0;
  padding: 14px 6px;
  border: 1px dashed var(--border);
  border-radius: 9px;
  color: var(--fg-subtle);
  font-size: 11.5px;
  text-align: center;
}

.card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 9px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--card-color);
  border-radius: 9px;
  background: var(--bg-elevated);
  box-shadow: var(--shadow-sm);
  cursor: grab;
  transition: border-color 0.12s, transform 0.08s, opacity 0.12s;
}
.card:hover { border-color: var(--border-strong); }
.card:active { cursor: grabbing; }
.card--dragging { opacity: 0.4; transform: scale(0.98); }
.card--done { opacity: 0.5; }
.card--done .card__title { text-decoration: line-through; }

.card__check {
  flex: 0 0 16px;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  min-width: 16px;
  padding: 0;
  margin-top: 1px;
  border: 1.6px solid var(--border-strong);
  border-radius: 5px;
  background: transparent;
  color: var(--accent-fg);
  line-height: 0;
}
.card__check--on { background: var(--accent); border-color: var(--accent); }
.card__grip { flex: none; margin-top: 1px; color: var(--fg-subtle); }
.card--pool .card__body { padding-right: 0; }

.card__body { flex: 1; min-width: 0; padding-right: 22px; }
.card__title { display: block; font-size: 12.5px; font-weight: 550; line-height: 1.35; overflow-wrap: anywhere; }
.card__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 5px; }
.tagchip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--bg-hover);
  color: var(--fg-muted);
  font-size: 10.5px;
  white-space: nowrap;
}
.tagchip--danger { background: var(--danger-soft); color: var(--danger); }
.prio { width: 6px; height: 6px; border-radius: 50%; }

.card__tools {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 1px;
}
.card__tool {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--fg-subtle);
  opacity: 0;
  transition: opacity 0.12s;
}
.card:hover .card__tool, .card__tools:has(.menu) .card__tool { opacity: 1; }
.card__tool:hover { background: var(--bg-hover); color: var(--accent); }
.card__tool--danger:hover { background: var(--danger-soft); color: var(--danger); }

@media (hover: none) {
  .card__tool { opacity: 1; }
}

.pool {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 268px;
  flex: none;
  padding: 12px;
  border-left: 1px solid var(--border);
  background: var(--bg-sunken);
  transition: background 0.12s;
}
.pool--drop { background: var(--accent-soft); box-shadow: inset 0 0 0 2px var(--accent); }
.pool__head { display: flex; align-items: center; gap: 8px; color: var(--fg-muted); }
.pool__head h2 { margin: 0; font-size: 13px; font-weight: 650; color: var(--fg); }
.pool__count {
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--bg-hover);
  font-size: 11px;
  font-weight: 600;
}
.input--sm { height: 30px; padding: 0 8px; font-size: 12.5px; }
.pool__list { flex: 1; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; }
.pool__empty { margin: 20px 0; color: var(--fg-subtle); font-size: 12px; text-align: center; }

@media (max-width: 1100px) {
  .board { flex-direction: column; }
  .pool { width: auto; border-left: 0; border-top: 1px solid var(--border); max-height: 40%; }
  .days { grid-template-columns: repeat(7, minmax(140px, 1fr)); }
}

/* --- phone: one day fills the screen, swipe sideways --- */
.pool-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--fg-muted);
  font-size: 12.5px;
  font-weight: 600;
}
.caret { transition: transform 0.15s; }
.caret--open { transform: rotate(90deg); }

@media (max-width: 700px) {
  .head { padding: 12px 14px 10px; }
  .head__title h1 { font-size: 17px; }
  .days {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: 84vw;
    scroll-snap-type: x mandatory;
    overscroll-behavior-x: contain;
  }
  .day { scroll-snap-align: start; }
  .day__add { opacity: 1; }
  .card { padding: 10px; }
  .card__title { font-size: 13.5px; }
  .card__tool { opacity: 1; width: 26px; height: 26px; }
  .card__body { padding-right: 28px; }
  .pool { max-height: 46vh; }
}
</style>
