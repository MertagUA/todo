<script setup>
import { ref, computed, nextTick } from 'vue'
import AppIcon from './AppIcon.vue'
import TaskRow from './TaskRow.vue'
import { state, actions, currentView, visibleTasks } from '../store/store.js'
import { t } from '../i18n.js'
import { todayISO, addDaysISO } from '../utils/date.js'

const draft = ref('')
const quickInput = ref(null)
const searchInput = ref(null)

const view = currentView
const showProjectChip = computed(() => view.value.kind === 'smart')

const stats = computed(() => {
  const all = state.tasks.filter((t) =>
    view.value.kind === 'project' ? t.projectId === view.value.id : true,
  )
  const done = all.filter((t) => t.done).length
  return { total: all.length, done, percent: all.length ? Math.round((done / all.length) * 100) : 0 }
})

const REPEAT_WORDS = {
  daily: { unit: 'day', interval: 1, weekdays: [] },
  weekly: { unit: 'week', interval: 1, weekdays: [] },
  monthly: { unit: 'month', interval: 1, weekdays: [] },
  yearly: { unit: 'year', interval: 1, weekdays: [] },
  weekdays: { unit: 'week', interval: 1, weekdays: [1, 2, 3, 4, 5] },
  // Ukrainian aliases
  щодня: { unit: 'day', interval: 1, weekdays: [] },
  щотижня: { unit: 'week', interval: 1, weekdays: [] },
  щомісяця: { unit: 'month', interval: 1, weekdays: [] },
  щороку: { unit: 'year', interval: 1, weekdays: [] },
  будні: { unit: 'week', interval: 1, weekdays: [1, 2, 3, 4, 5] },
}
const PRIORITY_WORDS = {
  high: 'high', medium: 'medium', med: 'medium', low: 'low',
  високий: 'high', середній: 'medium', низький: 'low',
}
const REPEAT_UNITS = {
  d: 'day', w: 'week', m: 'month', y: 'year',
  д: 'day', т: 'week', м: 'month', р: 'year',
}

/**
 * Quick-add mini syntax: "Water plants #home !low @today *daily"
 *   #tag  → tag                          !high|!medium|!low → priority
 *   @today | @tomorrow | @+3 | @2026-09-01 → deadline
 *   *daily | *weekly | *monthly | *yearly | *weekdays | *3d | *2w → repeat
 */
function parseDraft(text) {
  const tags = []
  let priority = 'none'
  let dueDate = null
  let repeat = null

  const title = text
    .replace(/(^|\s)#([\w-]+)/g, (_, s, tag) => (tags.push(tag.toLowerCase()), s))
    .replace(/(^|\s)!([\p{L}]+)/giu, (whole, s, word) => {
      const hit = PRIORITY_WORDS[word.toLowerCase()]
      if (!hit) return whole
      priority = hit
      return s
    })
    .replace(/(^|\s)@(today|tomorrow|сьогодні|завтра|\+\d+|\d{4}-\d{2}-\d{2})/giu, (_, s, raw) => {
      const v = raw.toLowerCase()
      if (v === 'today' || v === 'сьогодні') dueDate = todayISO()
      else if (v === 'tomorrow' || v === 'завтра') dueDate = addDaysISO(todayISO(), 1)
      else if (v.startsWith('+')) dueDate = addDaysISO(todayISO(), Number(v.slice(1)))
      else dueDate = v
      return s
    })
    .replace(/(^|\s)\*([\p{L}]+|\d+[dwmyдтмр])/giu, (whole, s, raw) => {
      const v = raw.toLowerCase()
      if (REPEAT_WORDS[v]) {
        repeat = { ...REPEAT_WORDS[v] }
      } else if (/^\d+[dwmyдтмр]$/.test(v)) {
        repeat = { unit: REPEAT_UNITS[v.slice(-1)], interval: Number(v.slice(0, -1)) || 1, weekdays: [] }
      } else {
        return whole
      }
      return s
    })
    .replace(/\s+/g, ' ')
    .trim()

  return { title, tags, priority, dueDate, repeat }
}

async function submit() {
  const parsed = parseDraft(draft.value)
  if (!parsed.title) return
  const patch = { title: parsed.title, tags: parsed.tags, priority: parsed.priority }
  if (parsed.dueDate) patch.dueDate = parsed.dueDate
  if (parsed.repeat) {
    patch.repeat = parsed.repeat
    if (!patch.dueDate) patch.dueDate = todayISO()   // a repeat needs a date to repeat from
  }
  actions.addTask(patch)
  draft.value = ''
  await nextTick()
  quickInput.value?.focus()
}

defineExpose({
  focusQuickAdd: () => quickInput.value?.focus(),
  focusSearch: () => searchInput.value?.focus(),
})
</script>

<template>
  <section class="main">
    <header class="head">
      <div class="head__title">
        <span v-if="view.kind === 'project'" class="head__emoji">{{ view.emoji }}</span>
        <AppIcon v-else :name="view.icon" :size="19" class="head__icon" />
        <h1>{{ view.name }}</h1>
        <span v-if="view.archived" class="chip">{{ t.list.archivedBadge }}</span>
        <span class="head__count">{{ visibleTasks.length }}</span>
      </div>

      <div class="head__tools">
        <div class="search">
          <AppIcon name="search" :size="15" />
          <input ref="searchInput" v-model="state.ui.search" :placeholder="t.list.search" />
          <button v-if="state.ui.search" class="clear" @click="state.ui.search = ''">
            <AppIcon name="close" :size="13" />
          </button>
        </div>

        <select v-model="state.ui.sort" class="select select--compact" :title="t.list.sort">
          <option value="manual">{{ t.list.sortManual }}</option>
          <option value="due">{{ t.list.sortDue }}</option>
          <option value="priority">{{ t.list.sortPriority }}</option>
          <option value="created">{{ t.list.sortCreated }}</option>
          <option value="alpha">{{ t.list.sortAlpha }}</option>
        </select>

        <button
          class="btn btn--ghost"
          :class="{ 'btn--on': !state.ui.hideDone }"
          @click="state.ui.hideDone = !state.ui.hideDone"
        >
          <AppIcon name="check" :size="14" />
          {{ state.ui.hideDone ? t.list.showDone : t.list.hideDone }}
        </button>
      </div>

      <div v-if="stats.total" class="progress">
        <div class="progress__bar"><div class="progress__fill" :style="{ width: stats.percent + '%' }" /></div>
        <span>{{ t.list.doneOf(stats.done, stats.total) }}</span>
        <button
          v-if="stats.done"
          class="link"
          @click="actions.requestClearCompleted(view.kind === 'project' ? view.id : null)"
        >
          {{ t.list.clearCompleted }}
        </button>
      </div>
    </header>

    <div class="quickadd">
      <AppIcon name="plus" :size="17" class="quickadd__icon" />
      <input
        ref="quickInput"
        v-model="draft"
        :placeholder="t.list.addPlaceholder"
        @keydown.enter="submit"
      />
      <button class="btn btn--primary" :disabled="!draft.trim()" @click="submit">{{ t.list.add }}</button>
    </div>
    <p class="syntax">
      {{ t.list.hints }} <code>#тег</code> · <code>!високий</code> <code>!низький</code> ·
      <code>@сьогодні</code> <code>@завтра</code> <code>@+3</code> <code>@2026-12-01</code> ·
      <code>*щодня</code> <code>*щотижня</code> <code>*щороку</code> <code>*будні</code> <code>*3д</code>
    </p>

    <div class="list-scroll">
      <TransitionGroup name="list" tag="div" class="list">
        <TaskRow
          v-for="task in visibleTasks"
          :key="task.id"
          :task="task"
          :show-project="showProjectChip"
        />
      </TransitionGroup>

      <div v-if="!visibleTasks.length" class="empty">
        <div class="empty__art">{{ state.ui.search ? '🔍' : '🌤️' }}</div>
        <h3>{{ state.ui.search ? t.list.emptySearchTitle : t.list.emptyTitle }}</h3>
        <p>{{ state.ui.search ? t.list.emptySearchText : t.list.emptyText }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: 100%;
  background: var(--bg);
}

.head {
  padding: 18px 24px 14px;
  border-bottom: 1px solid var(--border);
}
.head__title { display: flex; align-items: center; gap: 10px; }
.head__title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 680;
  letter-spacing: -0.02em;
}
.head__emoji { font-size: 20px; line-height: 1; }
.head__icon { color: var(--fg-muted); }
.head__count {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--bg-hover);
  color: var(--fg-muted);
  font-size: 12px;
  font-weight: 600;
}

.head__tools { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }

.search {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  min-width: 180px;
  max-width: 340px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-sunken);
  color: var(--fg-subtle);
  transition: border-color 0.12s, box-shadow 0.12s;
}
.search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.search input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--fg);
}
.search input:focus { outline: none; }
.clear { display: grid; place-items: center; border: 0; background: none; color: inherit; padding: 0; }

.select--compact { width: auto; height: 32px; padding: 0 8px; background: var(--bg-elevated); }
.btn--on { background: var(--accent-soft); color: var(--accent); }

.progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  color: var(--fg-muted);
  font-size: 12px;
}
.progress__bar {
  flex: 1;
  max-width: 260px;
  height: 5px;
  border-radius: 999px;
  background: var(--bg-hover);
  overflow: hidden;
}
.progress__fill {
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
  transition: width 0.25s ease;
}
.link {
  border: 0;
  background: none;
  color: var(--fg-muted);
  font-size: 12px;
  text-decoration: underline;
  padding: 0;
}
.link:hover { color: var(--danger); }

.quickadd {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 24px 0;
  padding: 6px 6px 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-sm);
  transition: border-color 0.12s, box-shadow 0.12s;
}
.quickadd:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.quickadd__icon { color: var(--fg-subtle); flex: none; }
.quickadd input {
  flex: 1;
  min-width: 0;
  height: 32px;
  border: 0;
  background: transparent;
  color: var(--fg);
  font-size: 14px;
}
.quickadd input:focus { outline: none; }

.syntax {
  margin: 8px 24px 0;
  color: var(--fg-subtle);
  font-size: 11.5px;
}
.syntax code {
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--bg-hover);
  font-size: 11px;
}

.list-scroll { flex: 1; padding: 14px 24px 32px; overflow-y: auto; }
.list { position: relative; display: flex; flex-direction: column; gap: 8px; }

.empty {
  margin-top: 40px;
  text-align: center;
  color: var(--fg-muted);
}
.empty__art { font-size: 40px; }
.empty h3 { margin: 12px 0 4px; color: var(--fg); font-size: 15px; }
.empty p { margin: 0; font-size: 13px; }
</style>
