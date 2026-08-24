<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import AppIcon from './AppIcon.vue'
import EventDialog from './EventDialog.vue'
import PlanDialog from './PlanDialog.vue'
import { t } from '../i18n.js'
import {
  state, actions, eventsOn, tasksPlannedOn, tasksDueOn, projectById,
} from '../store/store.js'
import { useViewport } from '../useViewport.js'
import {
  weekDatesISO, formatWeekRange, formatDayLong, weekdayShort, dayNumber,
  isWeekend, todayISO, timeToMinutes, minutesToTime, formatTimeRange, formatDuration,
  monthGridISO, formatMonthTitle, isSameMonth, addMonthsISO, WEEKDAY_SHORT_UK, WEEK_ORDER,
} from '../utils/date.js'

const HOUR_HEIGHT = 64          // px per hour
const UNKNOWN_MINUTES = 30      // block height used when a length is unknown
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const { isPhone } = useViewport()
const grid = ref(null)
const eventDialog = ref(null)   // { event } | { date, time }
const planDialog = ref(null)    // { date }

// A seven-column hour grid is unreadable on a phone, so week falls back to day.
const mode = computed(() =>
  isPhone.value && state.ui.calendarMode === 'week' ? 'day' : state.ui.calendarMode,
)

const days = computed(() =>
  mode.value === 'day' ? [state.ui.anchor] : weekDatesISO(state.ui.anchor),
)

/** Six weeks of the month, plus the weekday captions above them. */
const monthDays = computed(() => monthGridISO(state.ui.anchor))
const monthWeekdays = WEEK_ORDER.map((d) => WEEKDAY_SHORT_UK[d])

const heading = computed(() => {
  if (mode.value === 'day') return formatDayLong(state.ui.anchor)
  if (mode.value === 'month') return formatMonthTitle(state.ui.anchor)
  return formatWeekRange(state.ui.anchor)
})

/** One click moves a day, a week, or a whole month, depending on the mode. */
function step(direction) {
  if (mode.value === 'month') actions.setAnchor(addMonthsISO(state.ui.anchor, direction))
  else actions.shiftAnchor(direction * (mode.value === 'day' ? 1 : 7))
}

const MONTH_VISIBLE = 4   // events listed per month cell before the "+N more" link

function openDay(iso) {
  actions.setAnchor(iso)
  actions.setCalendarMode('day')
}

const today = computed(() => todayISO())

/** Red "now" line, only while today is on screen. */
const nowOffset = ref(null)
function refreshNow() {
  const d = new Date()
  nowOffset.value = ((d.getHours() * 60 + d.getMinutes()) / 60) * HOUR_HEIGHT
}
let clock = null
onMounted(() => {
  refreshNow()
  clock = setInterval(refreshNow, 60000)
  // Open on the working day, not on midnight.
  if (grid.value) grid.value.scrollTop = 7 * HOUR_HEIGHT
})
onBeforeUnmount(() => clearInterval(clock))

/**
 * Side-by-side placement for events that overlap in time,
 * the way Google Calendar splits a busy hour into columns.
 */
function layoutFor(iso) {
  const items = eventsOn(iso).map((e) => {
    const start = timeToMinutes(e.time)
    return { event: e, start, end: start + (e.duration || UNKNOWN_MINUTES) }
  })
  items.sort((a, b) => a.start - b.start || a.end - b.end)

  const clusters = []
  let current = []
  let clusterEnd = -1
  for (const item of items) {
    if (current.length && item.start >= clusterEnd) {
      clusters.push(current)
      current = []
      clusterEnd = -1
    }
    current.push(item)
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  if (current.length) clusters.push(current)

  const placed = []
  for (const cluster of clusters) {
    const columnEnds = []
    for (const item of cluster) {
      let col = columnEnds.findIndex((end) => end <= item.start)
      if (col === -1) {
        col = columnEnds.length
        columnEnds.push(item.end)
      } else {
        columnEnds[col] = item.end
      }
      item.column = col
    }
    for (const item of cluster) {
      item.columns = columnEnds.length
      placed.push(item)
    }
  }
  return placed
}

function blockStyle(item) {
  // A meeting that runs past midnight stops at the bottom of the day.
  const minutes = Math.min(item.event.duration || UNKNOWN_MINUTES, 1440 - item.start)
  const project = projectById(item.event.projectId)
  const width = 100 / item.columns
  return {
    top: `${(item.start / 60) * HOUR_HEIGHT}px`,
    height: `${Math.max(22, (minutes / 60) * HOUR_HEIGHT - 2)}px`,
    left: `calc(${item.column * width}% + 2px)`,
    width: `calc(${width}% - 4px)`,
    '--event-color': project?.color || 'var(--accent)',
  }
}

/** Turn a click inside a day column into a start time, snapped to 15 minutes. */
function newEventAt(iso, event) {
  const box = event.currentTarget.getBoundingClientRect()
  const minutes = ((event.clientY - box.top) / HOUR_HEIGHT) * 60
  const snapped = Math.max(0, Math.min(23 * 60 + 45, Math.round(minutes / 15) * 15))
  eventDialog.value = { date: iso, time: minutesToTime(snapped) }
}

function openTask(id) {
  actions.selectTask(id)
}
</script>

<template>
  <section class="cal">
    <header class="cal__head">
      <div class="cal__title">
        <AppIcon name="calendar" :size="19" class="muted" />
        <h1>{{ t.calendar.title }}</h1>
        <span class="cal__range">{{ heading }}</span>
      </div>

      <div class="cal__tools">
        <div class="nav">
          <button class="nav__btn" :title="t.calendar.prev" @click="step(-1)">
            <AppIcon name="left" :size="15" />
          </button>
          <button class="nav__today" @click="actions.goToToday()">{{ t.calendar.today }}</button>
          <button class="nav__btn" :title="t.calendar.next" @click="step(1)">
            <AppIcon name="chevron" :size="15" />
          </button>
        </div>

        <div class="modes">
          <button
            class="mode"
            :class="{ 'mode--on': mode === 'month' }"
            @click="actions.setCalendarMode('month')"
          >{{ t.calendar.month }}</button>
          <button
            v-if="!isPhone"
            class="mode"
            :class="{ 'mode--on': mode === 'week' }"
            @click="actions.setCalendarMode('week')"
          >{{ t.calendar.week }}</button>
          <button
            class="mode"
            :class="{ 'mode--on': mode === 'day' }"
            @click="actions.setCalendarMode('day')"
          >{{ t.calendar.day }}</button>
        </div>

        <button class="btn btn--primary" @click="eventDialog = { date: state.ui.anchor, time: '09:00' }">
          <AppIcon name="plus" :size="14" /> {{ t.calendar.newEvent }}
        </button>
      </div>
    </header>

    <!-- month grid -->
    <div v-if="mode === 'month'" class="month">
      <div class="month__names">
        <span v-for="name in monthWeekdays" :key="name">{{ name }}</span>
      </div>
      <div class="month__grid">
        <div
          v-for="iso in monthDays"
          :key="iso"
          class="cell"
          :class="{
            'cell--today': iso === today,
            'cell--out': !isSameMonth(iso, state.ui.anchor),
            'cell--weekend': isWeekend(iso),
          }"
          @click="eventDialog = { date: iso, time: '09:00' }"
        >
          <header class="cell__head">
            <button class="cell__num" @click.stop="openDay(iso)">{{ dayNumber(iso) }}</button>
            <button class="cell__add" :title="t.planner.addToDay" @click.stop="planDialog = { date: iso }">
              <AppIcon name="plus" :size="12" />
            </button>
          </header>

          <button
            v-for="event in eventsOn(iso).slice(0, MONTH_VISIBLE)"
            :key="event.id"
            class="chipline"
            :style="{ '--chip-color': projectById(event.projectId)?.color || 'var(--accent)' }"
            :title="`${formatTimeRange(event.time, event.duration)} · ${event.title}`"
            @click.stop="eventDialog = { event }"
          >
            <span class="chipline__dot" />
            <span class="chipline__time">{{ event.time }}</span>
            <span class="chipline__title">{{ event.title }}</span>
          </button>

          <button
            v-for="task in tasksPlannedOn(iso).slice(0, MONTH_VISIBLE)"
            :key="task.id"
            class="chipline chipline--task"
            :class="{ 'chipline--done': task.done }"
            :style="{ '--chip-color': projectById(task.projectId)?.color || 'var(--accent)' }"
            :title="task.title"
            @click.stop="openTask(task.id)"
          >
            <AppIcon name="check" :size="10" />
            <span class="chipline__title">{{ task.title }}</span>
          </button>

          <button
            v-if="eventsOn(iso).length + tasksPlannedOn(iso).length > MONTH_VISIBLE * 2"
            class="cell__more"
            @click.stop="openDay(iso)"
          >
            {{ t.calendar.more(eventsOn(iso).length + tasksPlannedOn(iso).length - MONTH_VISIBLE * 2) }}
          </button>
        </div>
      </div>
    </div>

    <!-- day names + all-day tasks -->
    <div v-if="mode !== 'month'" class="cal__top" :style="{ '--cols': days.length }">
      <div class="gutter gutter--head" />
      <div
        v-for="iso in days"
        :key="iso"
        class="daycol"
        :class="{ 'daycol--today': iso === today, 'daycol--weekend': isWeekend(iso) }"
      >
        <button class="dayname" @click="actions.setAnchor(iso); actions.setCalendarMode('day')">
          <span class="dayname__dow">{{ weekdayShort(iso) }}</span>
          <span class="dayname__num">{{ dayNumber(iso) }}</span>
        </button>

        <div class="allday">
          <button
            v-for="task in tasksPlannedOn(iso)"
            :key="task.id"
            class="pill"
            :class="{ 'pill--done': task.done }"
            :style="{ '--pill-color': projectById(task.projectId)?.color || 'var(--accent)' }"
            :title="task.title"
            @click="openTask(task.id)"
          >
            <span class="pill__dot" />
            {{ task.title }}
          </button>
          <button
            v-for="task in tasksDueOn(iso)"
            :key="`due-${task.id}`"
            class="pill pill--due"
            :title="`${t.calendar.dueHere}: ${task.title}`"
            @click="openTask(task.id)"
          >
            <AppIcon name="alert" :size="11" />
            {{ task.title }}
          </button>
          <button class="allday__add" :title="t.planner.addToDay" @click="planDialog = { date: iso }">
            <AppIcon name="plus" :size="13" />
          </button>
        </div>
      </div>
    </div>

    <!-- hour grid -->
    <div v-if="mode !== 'month'" ref="grid" class="cal__grid" :style="{ '--cols': days.length, '--hour': `${HOUR_HEIGHT}px` }">
      <div class="gutter">
        <div v-for="h in HOURS" :key="h" class="gutter__hour">
          <span v-if="h">{{ String(h).padStart(2, '0') }}:00</span>
        </div>
      </div>

      <div
        v-for="iso in days"
        :key="iso"
        class="column"
        :class="{ 'column--today': iso === today, 'column--weekend': isWeekend(iso) }"
        @click="newEventAt(iso, $event)"
      >
        <div v-for="h in HOURS" :key="h" class="slot" />

        <div v-if="iso === today && nowOffset !== null" class="now" :style="{ top: `${nowOffset}px` }" />

        <button
          v-for="item in layoutFor(iso)"
          :key="item.event.id"
          class="event"
          :class="{ 'event--open': !item.event.duration, 'event--short': (item.event.duration || 30) <= 30 }"
          :style="blockStyle(item)"
          @click.stop="eventDialog = { event: item.event }"
        >
          <span class="event__time">
            {{ formatTimeRange(item.event.time, item.event.duration) }}
            <span v-if="!item.event.duration" class="event__q">?</span>
          </span>
          <span class="event__title">{{ item.event.title }}</span>
          <span v-if="item.event.duration && item.event.duration >= 60" class="event__len">
            {{ formatDuration(item.event.duration) }}
          </span>
        </button>
      </div>
    </div>

    <EventDialog
      v-if="eventDialog"
      :event="eventDialog.event || null"
      :date="eventDialog.date"
      :time="eventDialog.time"
      @close="eventDialog = null"
    />
    <PlanDialog v-if="planDialog" :date="planDialog.date" @close="planDialog = null" />
  </section>
</template>

<style scoped>
.cal {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: 100%;
  background: var(--bg);
}

.cal__head { padding: 16px 20px 12px; border-bottom: 1px solid var(--border); }
.cal__title { display: flex; align-items: baseline; gap: 10px; }
.cal__title h1 { margin: 0; font-size: 22px; font-weight: 680; letter-spacing: -0.02em; }
.cal__range { color: var(--fg-muted); font-size: 14.5px; }
.muted { color: var(--fg-muted); align-self: center; }

.cal__tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
.nav { display: flex; align-items: center; gap: 2px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.nav__btn, .nav__today {
  height: 30px;
  padding: 0 10px;
  border: 0;
  background: var(--bg-elevated);
  color: var(--fg-muted);
  display: grid;
  place-items: center;
}
.nav__today { font-size: 14px; font-weight: 600; }
.nav__btn:hover, .nav__today:hover { background: var(--bg-hover); color: var(--fg); }

.modes { display: flex; padding: 2px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-sunken); }
.mode {
  height: 30px;
  padding: 0 14px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--fg-muted);
  font-size: 14px;
}
.mode--on { background: var(--bg-elevated); color: var(--fg); font-weight: 600; box-shadow: var(--shadow-sm); }

/* --- day header + all-day strip --- */
.cal__top {
  display: grid;
  grid-template-columns: 68px repeat(var(--cols), minmax(0, 1fr));
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}
.gutter--head { border-right: 1px solid var(--border); }
.daycol { min-width: 0; border-right: 1px solid var(--border); padding: 6px 6px 8px; }
.daycol--weekend { background: var(--bg-sunken); }
.daycol--today { background: var(--accent-soft); }

.dayname {
  display: flex;
  align-items: baseline;
  gap: 6px;
  width: 100%;
  padding: 2px 4px 6px;
  border: 0;
  background: none;
  color: var(--fg-muted);
}
.dayname__dow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.dayname__num { color: var(--fg); font-size: 19px; font-weight: 680; }
.daycol--today .dayname__num { color: var(--accent); }

.allday { display: flex; flex-direction: column; gap: 3px; min-height: 26px; }
.pill {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 3px 7px;
  border: 0;
  border-left: 3px solid var(--pill-color, var(--accent));
  border-radius: 5px;
  background: var(--bg-hover);
  color: var(--fg);
  font-size: 12.5px;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pill:hover { background: var(--bg-active); }
.pill--done { opacity: 0.5; text-decoration: line-through; }
.pill--due { border-left-color: var(--danger); color: var(--danger); background: var(--danger-soft); }
.pill__dot { flex: none; width: 5px; height: 5px; border-radius: 50%; background: var(--pill-color); }
.allday__add {
  align-self: flex-start;
  display: grid;
  place-items: center;
  width: 22px;
  height: 20px;
  border: 1px dashed var(--border-strong);
  border-radius: 5px;
  background: transparent;
  color: var(--fg-subtle);
  opacity: 0;
  transition: opacity 0.12s;
}
.daycol:hover .allday__add { opacity: 1; }
.allday__add:hover { border-color: var(--accent); color: var(--accent); }

/* --- hour grid --- */
.cal__grid {
  position: relative;
  display: grid;
  grid-template-columns: 68px repeat(var(--cols), minmax(0, 1fr));
  flex: 1;
  overflow-y: auto;
}
.gutter { border-right: 1px solid var(--border); }
.gutter__hour {
  position: relative;
  height: var(--hour);
  padding-right: 8px;
  color: var(--fg-muted);
  font-size: 12px;
  text-align: right;
}
.gutter__hour span { position: relative; top: -6px; }

.column { position: relative; min-width: 0; border-right: 1px solid var(--border); }
.column--weekend { background: var(--bg-sunken); }
.column--today { background: color-mix(in srgb, var(--accent) 5%, transparent); }
.slot { height: var(--hour); border-bottom: 1px solid var(--border); }
.slot:nth-child(odd) { border-bottom-color: color-mix(in srgb, var(--border) 60%, transparent); }

.now {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--danger);
  z-index: 3;
  pointer-events: none;
}
.now::before {
  content: '';
  position: absolute;
  left: -4px;
  top: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--danger);
}

.event {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px 6px;
  border: 0;
  border-left: 3px solid var(--event-color);
  border-radius: 6px;
  background: color-mix(in srgb, var(--event-color) 20%, var(--bg-elevated));
  color: var(--fg);
  text-align: left;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: filter 0.12s, transform 0.06s;
}
.event:hover { filter: brightness(1.08); }
.event:active { transform: scale(0.995); }
.event--open {
  border-left-style: dashed;
  border-bottom: 2px dashed var(--event-color);
  background: color-mix(in srgb, var(--event-color) 12%, var(--bg-elevated));
}
.event--short { flex-direction: row; align-items: center; gap: 6px; }
.event__time { color: var(--fg-muted); font-size: 12px; font-weight: 600; white-space: nowrap; }
.event__q {
  margin-left: 2px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--bg-hover);
}
.event__title {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event__len { margin-top: auto; color: var(--fg-muted); font-size: 12px; }

.month { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.month__names {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border-bottom: 1px solid var(--border);
}
.month__names span {
  padding: 9px 12px;
  color: var(--fg-muted);
  font-size: 12.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.month__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-auto-rows: minmax(124px, 1fr);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 6px 7px 8px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.12s;
}
.cell:hover { background: var(--bg-hover); }
.cell--weekend { background: var(--bg-sunken); }
.cell--today { background: color-mix(in srgb, var(--accent) 7%, transparent); }
.cell--out { opacity: 0.45; }

.cell__head { display: flex; align-items: center; justify-content: space-between; }
.cell__num {
  min-width: 27px;
  height: 27px;
  padding: 0 6px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--fg);
  font-size: 15px;
  font-weight: 650;
}
.cell__num:hover { background: var(--bg-active); }
.cell--today .cell__num { background: var(--accent); color: var(--accent-fg); }
.cell__add {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--fg-subtle);
  opacity: 0;
  transition: opacity 0.12s;
}
.cell:hover .cell__add { opacity: 1; }
.cell__add:hover { background: var(--bg-active); color: var(--accent); }

.chipline {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 4px 7px;
  border: 0;
  border-radius: 6px;
  background: color-mix(in srgb, var(--chip-color) 18%, transparent);
  color: var(--fg);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  overflow: hidden;
}
.chipline:hover { background: color-mix(in srgb, var(--chip-color) 32%, transparent); }
.chipline--task { background: var(--bg-hover); color: var(--fg-muted); }
.chipline--done { opacity: 0.5; text-decoration: line-through; }
.chipline__dot { flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--chip-color); }
.chipline__time { flex: none; color: var(--fg-muted); font-variant-numeric: tabular-nums; }
.chipline__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell__more {
  align-self: flex-start;
  padding: 2px 5px;
  border: 0;
  background: none;
  color: var(--fg-muted);
  font-size: 12px;
  font-weight: 500;
  text-decoration: underline;
}
.cell__more:hover { color: var(--accent); }

@media (max-width: 860px) {
  .cal__top, .cal__grid { grid-template-columns: 44px repeat(var(--cols), minmax(64px, 1fr)); }
}

@media (max-width: 700px) {
  .cal__head { padding: 12px 14px 10px; }
  .cal__title h1 { font-size: 17px; }
  .cal__range { font-size: 12px; }
  .cal__tools { gap: 6px; }
  .nav__btn, .nav__today, .mode { height: 32px; }
  .month__grid { grid-auto-rows: minmax(92px, 1fr); }
  .month__names span { padding: 7px 5px; font-size: 11.5px; }
  .cell { padding: 3px; }
  .cell__num { min-width: 24px; height: 24px; font-size: 13.5px; }
  .cell__add { opacity: 1; }
  .chipline { font-size: 11.5px; gap: 4px; padding: 2px 5px; }
  .chipline__time { display: none; }
  .allday__add { opacity: 1; }
  .daycol { padding: 5px 4px 6px; }
  .event { padding: 3px 5px; }
  .event__title { font-size: 12.5px; }
}
</style>
