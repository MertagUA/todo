/**
 * Tiny global store — plain Vue 3 reactivity, no Pinia/Vuex needed.
 *
 * `state` is one `reactive()` object shared by every component that imports it.
 * A deep `watch` mirrors it into localStorage, so a reload restores everything.
 */
import { reactive, computed, watch } from 'vue'
import { uid } from '../utils/id.js'
import { t } from '../i18n.js'
import {
  todayISO, addDaysISO, daysFromToday, isOverdue, nextOccurrence, weekdayOf, weekDatesISO,
} from '../utils/date.js'

const STORAGE_KEY = 'tasks.app.v1'

export const PRIORITIES = [
  { value: 'none', label: t.priority.none, color: 'var(--fg-muted)' },
  { value: 'low', label: t.priority.low, color: 'var(--prio-low)' },
  { value: 'medium', label: t.priority.medium, color: 'var(--prio-medium)' },
  { value: 'high', label: t.priority.high, color: 'var(--prio-high)' },
]

export const PROJECT_COLORS = [
  '#6e7bff', '#22c55e', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#a855f7', '#64748b',
]

export const SMART_VIEWS = [
  { id: 'all', name: t.views.all, icon: 'inbox' },
  { id: 'today', name: t.views.today, icon: 'sun' },
  { id: 'upcoming', name: t.views.upcoming, icon: 'calendar' },
  { id: 'overdue', name: t.views.overdue, icon: 'alert' },
  { id: 'repeating', name: t.views.repeating, icon: 'repeat' },
  { id: 'done', name: t.views.done, icon: 'check' },
]

/** One-click repeat rules offered in the UI. `null` = does not repeat. */
export const REPEAT_PRESETS = [
  { key: 'none', label: t.repeat.none, rule: null },
  { key: 'day', label: t.repeat.day, rule: { unit: 'day', interval: 1, weekdays: [] } },
  { key: 'weekday', label: t.repeat.weekday, rule: { unit: 'week', interval: 1, weekdays: [1, 2, 3, 4, 5] } },
  { key: 'week', label: t.repeat.week, rule: { unit: 'week', interval: 1, weekdays: [] } },
  { key: 'month', label: t.repeat.month, rule: { unit: 'month', interval: 1, weekdays: [] } },
  { key: 'year', label: t.repeat.year, rule: { unit: 'year', interval: 1, weekdays: [] } },
]

/**
 * "Роблю це ще й завтра, і післязавтра" — one click stretches a task
 * across the next days instead of adding each date by hand.
 */
export const EXTEND_PRESETS = [
  { key: 'd1', label: '+1 день', days: 1 },
  { key: 'd2', label: '+2 дні', days: 2 },
  { key: 'd3', label: '+3 дні', days: 3 },
  { key: 'd4', label: '+4 дні', days: 4 },
  { key: 'restWeek', label: 'До кінця тижня', untilEndOfWeek: true },
  { key: 'workdays', label: 'Будні до кінця тижня', untilEndOfWeek: true, weekdaysOnly: true },
  { key: 'w1', label: 'Тиждень', days: 7 },
  { key: 'w2', label: '2 тижні', days: 14 },
  { key: 'm1', label: 'Місяць', days: 30 },
]

/** Chips shown right away in the event dialog; `null` = length unknown. */
export const DURATION_QUICK = [null, 15, 30, 45, 60, 90, 120]

function makeProject(patch = {}) {
  return {
    id: uid('prj'),
    name: 'New project',
    emoji: '📁',
    color: PROJECT_COLORS[0],
    archived: false,
    order: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...patch,
  }
}

/** Mark an entity as changed now — the merge picks the newest version. */
function touch(entity) {
  if (entity) entity.updatedAt = Date.now()
}

/** Remember a deletion so the other device does not resurrect the row. */
function tombstone(id) {
  state.tombstones[id] = Date.now()
}

function makeEvent(patch = {}) {
  return {
    id: uid('evt'),
    title: '',
    date: todayISO(),        // "YYYY-MM-DD"
    time: '09:00',           // "HH:MM"
    duration: null,          // minutes, or null when the length is unknown
    projectId: null,
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...patch,
  }
}

function makeTask(patch = {}) {
  return {
    id: uid('tsk'),
    projectId: null,
    title: '',
    description: '',
    done: false,
    dueDate: null,        // "YYYY-MM-DD" or null — the deadline
    /** Days you actually plan to work on it, independent of the deadline. */
    plannedDates: [],
    priority: 'none',
    tags: [],
    /** null, or { unit: 'day'|'week'|'month'|'year', interval: n, weekdays: [0-6] } */
    repeat: null,
    completions: 0,
    lastCompletedAt: null,
    createdAt: Date.now(),
    completedAt: null,
    order: Date.now(),    // smaller = higher in the list
    updatedAt: Date.now(),
    ...patch,
  }
}

function seed() {
  const life = makeProject({ name: 'Життя', emoji: '🌱', color: '#22c55e' })
  const job = makeProject({ name: 'Робота', emoji: '💼', color: '#6e7bff' })
  const study = makeProject({ name: 'Навчання', emoji: '📚', color: '#a855f7' })
  const today = todayISO()
  return {
    version: 2,
    projects: [life, job, study],
    tasks: [
      makeTask({
        projectId: job.id,
        title: 'Спробувати застосунок один справжній день',
        description: 'Додавай усе, що спадає на думку. Обовʼязкова лише назва.',
        dueDate: today,
        plannedDates: [today],
        priority: 'high',
        tags: ['старт'],
        order: 1,
      }),
      makeTask({
        projectId: study.id,
        title: 'Почитати документацію Vue 3',
        description: 'https://vuejs.org/guide/introduction.html',
        dueDate: addDaysISO(today, 3),
        plannedDates: [addDaysISO(today, 1), addDaysISO(today, 2)],
        priority: 'medium',
        order: 2,
      }),
      makeTask({
        projectId: life.id,
        title: 'Полити квіти',
        priority: 'low',
        dueDate: today,
        repeat: { unit: 'day', interval: 1, weekdays: [] },
        order: 3,
      }),
      makeTask({
        projectId: life.id,
        title: 'День народження мами',
        description: 'Повторюється щороку — познач виконаним, і воно перескочить на наступний рік.',
        dueDate: addDaysISO(today, 30),
        repeat: { unit: 'year', interval: 1, weekdays: [] },
        tags: ['дн'],
        order: 4,
      }),
    ],
    events: [
      makeEvent({
        title: 'Щоденний созвон',
        date: today,
        time: '10:00',
        duration: 30,
        projectId: job.id,
      }),
      makeEvent({
        title: 'Зустріч із замовником',
        date: today,
        time: '15:00',
        duration: 90,
        projectId: job.id,
        notes: 'Обговорити правки по макету.',
      }),
      makeEvent({
        title: 'Спортзал',
        date: addDaysISO(today, 1),
        time: '19:00',
        duration: null,
        projectId: life.id,
      }),
    ],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed()
    const data = JSON.parse(raw)
    // Fill in fields added by later versions of the app.
    data.projects = (data.projects || []).map((p) => ({ ...makeProject(), ...p }))
    data.tasks = (data.tasks || []).map((task) => ({ ...makeTask(), ...task }))
    data.events = (data.events || []).map((e) => ({ ...makeEvent(), ...e }))
    // Deletions older than two months no longer need to be remembered.
    const cutoff = Date.now() - 60 * 24 * 3600 * 1000
    data.tombstones = Object.fromEntries(
      Object.entries(data.tombstones || {}).filter(([, ts]) => ts > cutoff),
    )
    return data
  } catch (err) {
    console.warn('Could not read saved data, starting fresh.', err)
    return seed()
  }
}

const persisted = load()

export const state = reactive({
  projects: persisted.projects,
  tasks: persisted.tasks,
  events: persisted.events || [],
  /** id -> deletion timestamp, so a delete survives a merge with another device. */
  tombstones: persisted.tombstones || {},
  ui: {
    view: { kind: 'smart', id: 'all' },  // kind: 'smart' | 'project' | 'calendar' | 'planner'
    calendarMode: 'week',                // 'week' | 'day' inside the calendar
    anchor: todayISO(),                  // which week/day the calendar and planner show
    selectedTaskId: null,
    selectedEventId: null,
    search: '',
    sort: 'manual',                      // manual | due | priority | created | alpha
    hideDone: true,
    showArchived: false,
    sidebarOpen: true,
    rolled: null,                        // toast after a repeating task rolls forward
    confirm: null,                       // pending destructive action awaiting an OK
    theme: localStorage.getItem('tasks.app.theme') || 'dark',
  },
})

/* ---------------------------------------------------------------- persistence */

let saveTimer = null
watch(
  () => ({
    projects: state.projects,
    tasks: state.tasks,
    events: state.events,
    tombstones: state.tombstones,
  }),
  (data) => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, ...data }))
    }, 150)
  },
  { deep: true },
)

watch(
  () => state.ui.theme,
  (theme) => {
    localStorage.setItem('tasks.app.theme', theme)
    document.documentElement.dataset.theme = theme
  },
  { immediate: true },
)

/* -------------------------------------------------------------------- getters */

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0)

export const activeProjects = computed(() =>
  state.projects.filter((p) => !p.archived).sort(byOrder),
)
export const archivedProjects = computed(() =>
  state.projects.filter((p) => p.archived).sort(byOrder),
)

export function projectById(id) {
  return state.projects.find((p) => p.id === id) || null
}

/** Open (not done) task count for a project — the number in the sidebar. */
export function openCount(projectId) {
  return state.tasks.filter((t) => t.projectId === projectId && !t.done).length
}

export const smartCounts = computed(() => {
  const live = state.tasks.filter((t) => !isArchivedTask(t))
  return {
    all: live.filter((t) => !t.done).length,
    today: live.filter(
      (t) => !t.done && (daysFromToday(t.dueDate) === 0 || t.plannedDates?.includes(todayISO())),
    ).length,
    upcoming: live.filter((t) => !t.done && daysFromToday(t.dueDate) > 0).length,
    overdue: live.filter((t) => !t.done && isOverdue(t.dueDate)).length,
    repeating: live.filter((t) => t.repeat).length,
    done: live.filter((t) => t.done).length,
  }
})

function isArchivedTask(task) {
  const p = projectById(task.projectId)
  return !!p && p.archived
}

export const currentView = computed(() => {
  const { kind, id } = state.ui.view
  if (kind === 'calendar') return { kind, id: 'calendar', name: t.calendar.title, icon: 'calendar' }
  if (kind === 'planner') return { kind, id: 'planner', name: t.views.planner, icon: 'board' }
  if (kind === 'project') {
    const p = projectById(id)
    return p
      ? { kind, id, name: p.name, emoji: p.emoji, color: p.color, archived: p.archived }
      : { kind: 'smart', id: 'all', name: 'All tasks', icon: 'inbox' }
  }
  const v = SMART_VIEWS.find((s) => s.id === id) || SMART_VIEWS[0]
  return { kind: 'smart', id: v.id, name: v.name, icon: v.icon }
})

const PRIORITY_RANK = { high: 0, medium: 1, low: 2, none: 3 }

/** Tasks for the current view, after search / filter / sort. */
export const visibleTasks = computed(() => {
  const view = currentView.value
  let list = state.tasks.slice()

  if (view.kind === 'project') {
    list = list.filter((t) => t.projectId === view.id)
  } else {
    list = list.filter((t) => !isArchivedTask(t))
    if (view.id === 'today') {
      const today = todayISO()
      list = list.filter(
        (t) => !t.done && (daysFromToday(t.dueDate) === 0 || t.plannedDates?.includes(today)),
      )
    }
    if (view.id === 'upcoming') list = list.filter((t) => daysFromToday(t.dueDate) > 0 && !t.done)
    if (view.id === 'overdue') list = list.filter((t) => isOverdue(t.dueDate) && !t.done)
    if (view.id === 'repeating') list = list.filter((t) => t.repeat)
    if (view.id === 'done') list = list.filter((t) => t.done)
  }

  const isDoneView = view.kind === 'smart' && view.id === 'done'
  if (state.ui.hideDone && !isDoneView) list = list.filter((t) => !t.done)

  const q = state.ui.search.trim().toLowerCase()
  if (q) {
    list = list.filter((t) =>
      [t.title, t.description, ...(t.tags || [])].join(' ').toLowerCase().includes(q),
    )
  }

  const sort = state.ui.sort
  list.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (sort === 'due') {
      if (!a.dueDate && !b.dueDate) return a.order - b.order
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    }
    if (sort === 'priority') {
      const d = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      return d !== 0 ? d : a.order - b.order
    }
    if (sort === 'created') return b.createdAt - a.createdAt
    if (sort === 'alpha') return a.title.localeCompare(b.title)
    return a.order - b.order
  })

  return list
})

/* ------------------------------------------------------ calendar & planner data */

/** Events of one day, earliest first. */
export function eventsOn(iso) {
  return state.events
    .filter((e) => e.date === iso)
    .sort((a, b) => a.time.localeCompare(b.time))
}

/** Tasks you planned to work on that day. */
export function tasksPlannedOn(iso) {
  return state.tasks
    .filter((t) => t.plannedDates?.includes(iso) && !isArchivedTask(t))
    .sort((a, b) => (a.done === b.done ? a.order - b.order : a.done ? 1 : -1))
}

/** Tasks whose deadline is that day (and that you did not already plan there). */
export function tasksDueOn(iso) {
  return state.tasks.filter(
    (t) => t.dueDate === iso && !t.done && !t.plannedDates?.includes(iso) && !isArchivedTask(t),
  )
}

/** Open tasks not yet placed anywhere in the shown week — the planner's pool. */
export function unplannedTasks(weekDates) {
  return state.tasks
    .filter(
      (t) =>
        !t.done &&
        !isArchivedTask(t) &&
        !(t.plannedDates || []).some((d) => weekDates.includes(d)),
    )
    .sort((a, b) => a.order - b.order)
}

export const selectedEvent = computed(
  () => state.events.find((e) => e.id === state.ui.selectedEventId) || null,
)

export const selectedTask = computed(
  () => state.tasks.find((t) => t.id === state.ui.selectedTaskId) || null,
)

/* -------------------------------------------------------------------- actions */

export const actions = {
  /* -- navigation -- */
  selectSmart(id) {
    state.ui.view = { kind: 'smart', id }
    state.ui.selectedTaskId = null
  },
  selectProject(id) {
    state.ui.view = { kind: 'project', id }
    state.ui.selectedTaskId = null
  },
  selectCalendar() {
    state.ui.view = { kind: 'calendar', id: 'calendar' }
    state.ui.selectedTaskId = null
  },
  selectPlanner() {
    state.ui.view = { kind: 'planner', id: 'planner' }
    state.ui.selectedTaskId = null
  },
  setCalendarMode(mode) {
    state.ui.calendarMode = mode
  },
  setAnchor(iso) {
    state.ui.anchor = iso
  },
  shiftAnchor(days) {
    state.ui.anchor = addDaysISO(state.ui.anchor, days)
  },
  goToToday() {
    state.ui.anchor = todayISO()
  },

  /* -- planning: which days you actually work on a task -- */

  planTask(taskId, iso) {
    const t = state.tasks.find((x) => x.id === taskId)
    if (!t || !iso) return
    if (!t.plannedDates) t.plannedDates = []
    if (!t.plannedDates.includes(iso)) {
      t.plannedDates = [...t.plannedDates, iso].sort()
      touch(t)
    }
  },
  unplanTask(taskId, iso) {
    const t = state.tasks.find((x) => x.id === taskId)
    if (!t) return
    t.plannedDates = (t.plannedDates || []).filter((d) => d !== iso)
    touch(t)
  },
  togglePlanned(taskId, iso) {
    const t = state.tasks.find((x) => x.id === taskId)
    if (!t) return
    if (t.plannedDates?.includes(iso)) actions.unplanTask(taskId, iso)
    else actions.planTask(taskId, iso)
  },
  /**
   * Stretch a task over the following days: `{ days }` adds that many days after
   * `from`, `{ untilEndOfWeek }` fills up to Sunday, `weekdaysOnly` skips Sat/Sun.
   */
  extendPlan(taskId, fromISO, preset) {
    const task = state.tasks.find((x) => x.id === taskId)
    if (!task || !fromISO || !preset) return
    const start = fromISO

    let count = preset.days ?? 0
    if (preset.untilEndOfWeek) {
      const week = weekDatesISO(start)
      const left = week.filter((d) => d > start)
      count = left.length
    }
    count = Math.min(count, 366)

    const added = []
    for (let i = 1; i <= count; i++) {
      const iso = addDaysISO(start, i)
      if (preset.weekdaysOnly) {
        const day = weekdayOf(iso)
        if (day === 0 || day === 6) continue
      }
      added.push(iso)
    }
    task.plannedDates = [...new Set([start, ...(task.plannedDates || []), ...added])].sort()
    touch(task)
  },
  clearPlan(taskId) {
    const task = state.tasks.find((x) => x.id === taskId)
    if (!task) return
    task.plannedDates = []
    touch(task)
  },

  /** Drag a task card from one day to another. */
  movePlanned(taskId, fromISO, toISO) {
    if (fromISO === toISO) return
    if (fromISO) actions.unplanTask(taskId, fromISO)
    actions.planTask(taskId, toISO)
  },

  /* -- calendar events -- */

  addEvent(patch = {}) {
    const event = makeEvent(patch)
    state.events.push(event)
    return event
  },
  updateEvent(id, patch) {
    const e = state.events.find((x) => x.id === id)
    if (!e) return
    Object.assign(e, patch)
    touch(e)
  },
  deleteEvent(id) {
    tombstone(id)
    state.events = state.events.filter((e) => e.id !== id)
  },
  requestDeleteEvent(id) {
    const e = state.events.find((x) => x.id === id)
    if (!e) return
    state.ui.confirm = { kind: 'event', id, title: e.title || t.calendar.newEventTitle }
  },
  selectTask(id) {
    state.ui.selectedTaskId = id
  },
  closeTask() {
    state.ui.selectedTaskId = null
  },
  toggleTheme() {
    state.ui.theme = state.ui.theme === 'dark' ? 'light' : 'dark'
  },

  /* -- projects -- */
  addProject(patch) {
    const project = makeProject(patch)
    state.projects.push(project)
    actions.selectProject(project.id)
    return project
  },
  updateProject(id, patch) {
    const p = projectById(id)
    if (!p) return
    Object.assign(p, patch)
    touch(p)
  },
  archiveProject(id, archived = true) {
    actions.updateProject(id, { archived })
    if (archived && state.ui.view.kind === 'project' && state.ui.view.id === id) {
      actions.selectSmart('all')
    }
  },
  deleteProject(id) {
    state.tasks.filter((t) => t.projectId === id).forEach((t) => tombstone(t.id))
    tombstone(id)
    state.tasks = state.tasks.filter((t) => t.projectId !== id)
    state.projects = state.projects.filter((p) => p.id !== id)
    if (state.ui.view.kind === 'project' && state.ui.view.id === id) actions.selectSmart('all')
  },
  moveProject(id, delta) {
    const list = activeProjects.value
    const i = list.findIndex((p) => p.id === id)
    const j = i + delta
    if (i < 0 || j < 0 || j >= list.length) return
    const a = list[i]
    const b = list[j]
    const tmp = a.order
    a.order = b.order
    b.order = tmp
    touch(a)
    touch(b)
  },

  /* -- tasks -- */
  addTask(patch = {}) {
    const view = currentView.value
    const defaults = {}
    if (view.kind === 'project') defaults.projectId = view.id
    else if (view.id === 'today') defaults.dueDate = todayISO()
    else if (view.id === 'upcoming') defaults.dueDate = addDaysISO(todayISO(), 1)

    const first = state.tasks.reduce((min, t) => Math.min(min, t.order), 0)
    const task = makeTask({ ...defaults, order: first - 1, ...patch })
    if (!task.projectId) task.projectId = activeProjects.value[0]?.id ?? null
    state.tasks.unshift(task)
    return task
  },
  updateTask(id, patch) {
    const t = state.tasks.find((x) => x.id === id)
    if (!t) return
    Object.assign(t, patch)
    touch(t)
  },
  /**
   * Ticking a repeating task does not close it — it records the completion and
   * moves the task to its next occurrence. The toast offers an undo.
   */
  toggleTask(id) {
    const t = state.tasks.find((x) => x.id === id)
    if (!t) return

    if (t.repeat && !t.done) {
      const before = {
        dueDate: t.dueDate,
        plannedDates: [...(t.plannedDates || [])],
        completions: t.completions,
        lastCompletedAt: t.lastCompletedAt,
      }
      const today = todayISO()
      t.dueDate = nextOccurrence(t.dueDate, t.repeat)
      // A day you already worked through should not stay on the board forever:
      // planned days in the past move along with the task.
      if (before.plannedDates.some((d) => d <= today)) {
        const future = before.plannedDates.filter((d) => d > today)
        t.plannedDates = [...new Set([...future, t.dueDate])].sort()
      }
      t.completions = (t.completions || 0) + 1
      t.lastCompletedAt = Date.now()
      touch(t)
      state.ui.rolled = { taskId: id, title: t.title, nextDate: t.dueDate, before }
      return
    }

    t.done = !t.done
    t.completedAt = t.done ? Date.now() : null
    touch(t)
  },
  undoRoll() {
    const rolled = state.ui.rolled
    if (!rolled) return
    const t = state.tasks.find((x) => x.id === rolled.taskId)
    if (t) {
      Object.assign(t, rolled.before)
      touch(t)
    }
    state.ui.rolled = null
  },
  dismissRoll() {
    state.ui.rolled = null
  },
  /** Set or clear a repeat rule. A repeating task always needs a date to repeat from. */
  setRepeat(id, rule) {
    const t = state.tasks.find((x) => x.id === id)
    if (!t) return
    t.repeat = rule ? { unit: rule.unit, interval: rule.interval || 1, weekdays: [...(rule.weekdays || [])] } : null
    if (t.repeat && !t.dueDate) t.dueDate = todayISO()
    if (t.repeat && t.done) {
      t.done = false
      t.completedAt = null
    }
    touch(t)
  },
  deleteTask(id) {
    tombstone(id)
    state.tasks = state.tasks.filter((t) => t.id !== id)
    if (state.ui.selectedTaskId === id) state.ui.selectedTaskId = null
  },

  /* -- destructive actions go through a confirmation step -- */

  /** Ask before deleting a task; the dialog lives in App.vue. */
  requestDeleteTask(id) {
    const t = state.tasks.find((x) => x.id === id)
    if (!t) return
    state.ui.confirm = { kind: 'task', id, title: t.title || 'Untitled task' }
  },
  requestClearCompleted(projectId = null) {
    const count = state.tasks.filter(
      (t) => t.done && (!projectId || t.projectId === projectId),
    ).length
    if (!count) return
    state.ui.confirm = { kind: 'clearCompleted', projectId, count }
  },
  requestDeleteProject(id) {
    const p = projectById(id)
    if (!p) return
    const count = state.tasks.filter((t) => t.projectId === id).length
    state.ui.confirm = { kind: 'project', id, title: p.name, count }
  },
  confirmPending() {
    const pending = state.ui.confirm
    if (!pending) return
    if (pending.kind === 'task') actions.deleteTask(pending.id)
    if (pending.kind === 'project') actions.deleteProject(pending.id)
    if (pending.kind === 'clearCompleted') actions.clearCompleted(pending.projectId)
    if (pending.kind === 'event') actions.deleteEvent(pending.id)
    state.ui.confirm = null
  },
  cancelPending() {
    state.ui.confirm = null
  },
  duplicateTask(id) {
    const t = state.tasks.find((x) => x.id === id)
    if (!t) return
    const copy = makeTask({
      ...t,
      id: uid('tsk'),
      title: `${t.title} (copy)`,
      done: false,
      completedAt: null,
      createdAt: Date.now(),
      order: t.order - 0.5,
    })
    state.tasks.unshift(copy)
  },
  /** Move a task one slot up/down inside the currently visible list. */
  moveTask(id, delta) {
    const list = visibleTasks.value
    const i = list.findIndex((t) => t.id === id)
    const j = i + delta
    if (i < 0 || j < 0 || j >= list.length) return
    const a = list[i]
    const b = list[j]
    const tmp = a.order
    a.order = b.order
    b.order = tmp
    touch(a)
    touch(b)
    if (state.ui.sort !== 'manual') state.ui.sort = 'manual'
  },
  clearCompleted(projectId = null) {
    state.tasks
      .filter((t) => t.done && (!projectId || t.projectId === projectId))
      .forEach((t) => tombstone(t.id))
    state.tasks = state.tasks.filter(
      (t) => !t.done || (projectId && t.projectId !== projectId),
    )
  },

  /* -- sync plumbing -- */

  /** Everything worth syncing, as a plain object. */
  snapshot() {
    return {
      projects: JSON.parse(JSON.stringify(state.projects)),
      tasks: JSON.parse(JSON.stringify(state.tasks)),
      events: JSON.parse(JSON.stringify(state.events)),
      tombstones: { ...state.tombstones },
    }
  },
  /** Replace local data with a merged result coming from the sync engine. */
  applySnapshot(data) {
    state.projects = (data.projects || []).map((p) => ({ ...makeProject(), ...p }))
    state.tasks = (data.tasks || []).map((task) => ({ ...makeTask(), ...task }))
    state.events = (data.events || []).map((e) => ({ ...makeEvent(), ...e }))
    state.tombstones = { ...(data.tombstones || {}) }
    if (state.ui.selectedTaskId && !state.tasks.some((x) => x.id === state.ui.selectedTaskId)) {
      state.ui.selectedTaskId = null
    }
  },

  /* -- data -- */
  exportJSON() {
    return JSON.stringify(
      { version: 2, projects: state.projects, tasks: state.tasks, events: state.events },
      null,
      2,
    )
  },
  importJSON(text) {
    const data = JSON.parse(text)
    if (!Array.isArray(data.projects) || !Array.isArray(data.tasks)) {
      throw new Error('File must contain "projects" and "tasks" arrays.')
    }
    state.projects = data.projects.map((p) => ({ ...makeProject(), ...p }))
    state.tasks = data.tasks.map((task) => ({ ...makeTask(), ...task }))
    state.events = (data.events || []).map((e) => ({ ...makeEvent(), ...e }))
    actions.selectSmart('all')
  },
  resetAll() {
    const fresh = seed()
    state.projects = fresh.projects
    state.tasks = fresh.tasks
    state.events = fresh.events
    actions.selectSmart('all')
  },
}
