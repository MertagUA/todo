<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AppIcon from './AppIcon.vue'
import ProjectDialog from './ProjectDialog.vue'
import {
  state, actions, activeProjects, archivedProjects,
  smartCounts, openCount, SMART_VIEWS,
} from '../store/store.js'
import { t } from '../i18n.js'

const dialog = ref(null)        // null | { mode: 'create' } | { mode: 'edit', project }
const menuFor = ref(null)       // project id whose "…" menu is open
const showArchived = ref(false)
const fileInput = ref(null)

function isCurrent(kind, id) {
  return state.ui.view.kind === kind && state.ui.view.id === id
}

function saveProject(patch) {
  if (dialog.value?.mode === 'edit') actions.updateProject(dialog.value.project.id, patch)
  else actions.addProject(patch)
  dialog.value = null
}

function toggleMenu(id) {
  menuFor.value = menuFor.value === id ? null : id
}
function closeMenus() {
  menuFor.value = null
}
onMounted(() => document.addEventListener('click', closeMenus))
onBeforeUnmount(() => document.removeEventListener('click', closeMenus))

function exportData() {
  const blob = new Blob([actions.exportJSON()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `tasks-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

async function importData(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    actions.importJSON(await file.text())
  } catch (err) {
    alert(`${t.sidebar.importFailed} ${err.message}`)
  }
  event.target.value = ''
}
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <span class="brand__mark">✓</span>
      <span class="brand__name">{{ t.app.name }}</span>
    </div>

    <nav class="section">
      <button
        class="row"
        :class="{ 'row--on': state.ui.view.kind === 'calendar' }"
        @click="actions.selectCalendar()"
      >
        <AppIcon name="calendar" class="row__icon" />
        <span class="row__label">{{ t.views.calendar }}</span>
      </button>
      <button
        class="row"
        :class="{ 'row--on': state.ui.view.kind === 'planner' }"
        @click="actions.selectPlanner()"
      >
        <AppIcon name="board" class="row__icon" />
        <span class="row__label">{{ t.views.planner }}</span>
      </button>
    </nav>

    <nav class="section">
      <button
        v-for="v in SMART_VIEWS"
        :key="v.id"
        class="row"
        :class="{ 'row--on': isCurrent('smart', v.id) }"
        @click="actions.selectSmart(v.id)"
      >
        <AppIcon :name="v.icon" class="row__icon" />
        <span class="row__label">{{ v.name }}</span>
        <span v-if="smartCounts[v.id]" class="row__count">{{ smartCounts[v.id] }}</span>
      </button>
    </nav>

    <div class="section">
      <div class="section__head">
        <span>{{ t.sidebar.projects }}</span>
        <button class="btn btn--ghost btn--icon" :title="t.sidebar.newProject" @click="dialog = { mode: 'create' }">
          <AppIcon name="plus" :size="15" />
        </button>
      </div>

      <p v-if="!activeProjects.length" class="hint">{{ t.sidebar.noProjects }}</p>

      <div
        v-for="(p, i) in activeProjects"
        :key="p.id"
        class="row-wrap"
      >
        <button
          class="row"
          :class="{ 'row--on': isCurrent('project', p.id) }"
          @click="actions.selectProject(p.id)"
        >
          <span class="row__dot" :style="{ background: p.color }" />
          <span class="row__emoji">{{ p.emoji }}</span>
          <span class="row__label">{{ p.name }}</span>
          <span v-if="openCount(p.id)" class="row__count">{{ openCount(p.id) }}</span>
        </button>

        <button class="row__more" :title="t.sidebar.actions" @click.stop="toggleMenu(p.id)">
          <AppIcon name="dots" :size="15" />
        </button>

        <div v-if="menuFor === p.id" class="menu" @click.stop>
          <button class="menu__item" @click="dialog = { mode: 'edit', project: p }; closeMenus()">
            <AppIcon name="edit" :size="14" /> {{ t.sidebar.edit }}
          </button>
          <button class="menu__item" :disabled="i === 0" @click="actions.moveProject(p.id, -1)">
            <AppIcon name="up" :size="14" /> {{ t.sidebar.moveUp }}
          </button>
          <button
            class="menu__item"
            :disabled="i === activeProjects.length - 1"
            @click="actions.moveProject(p.id, 1)"
          >
            <AppIcon name="down" :size="14" /> {{ t.sidebar.moveDown }}
          </button>
          <button class="menu__item" @click="actions.archiveProject(p.id, true); closeMenus()">
            <AppIcon name="archive" :size="14" /> {{ t.sidebar.archive }}
          </button>
          <div class="menu__sep" />
          <button class="menu__item menu__item--danger" @click="actions.requestDeleteProject(p.id); closeMenus()">
            <AppIcon name="trash" :size="14" /> {{ t.sidebar.delete }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="archivedProjects.length" class="section">
      <button class="section__head section__head--btn" @click="showArchived = !showArchived">
        <AppIcon name="chevron" :size="13" class="caret" :class="{ 'caret--open': showArchived }" />
        <span>{{ t.sidebar.archived }} ({{ archivedProjects.length }})</span>
      </button>
      <template v-if="showArchived">
        <div v-for="p in archivedProjects" :key="p.id" class="row-wrap">
          <button
            class="row row--muted"
            :class="{ 'row--on': isCurrent('project', p.id) }"
            @click="actions.selectProject(p.id)"
          >
            <span class="row__dot" :style="{ background: p.color }" />
            <span class="row__emoji">{{ p.emoji }}</span>
            <span class="row__label">{{ p.name }}</span>
          </button>
          <button class="row__more" :title="t.sidebar.restore" @click.stop="actions.archiveProject(p.id, false)">
            <AppIcon name="restore" :size="14" />
          </button>
        </div>
      </template>
    </div>

    <footer class="foot">
      <button
        class="btn btn--ghost btn--icon"
        :title="state.ui.theme === 'dark' ? t.sidebar.themeToLight : t.sidebar.themeToDark"
        @click="actions.toggleTheme()"
      >
        <AppIcon :name="state.ui.theme === 'dark' ? 'sun' : 'moon'" />
      </button>
      <button class="btn btn--ghost btn--icon" :title="t.sidebar.export" @click="exportData">
        <AppIcon name="download" />
      </button>
      <button class="btn btn--ghost btn--icon" :title="t.sidebar.import" @click="fileInput.click()">
        <AppIcon name="upload" />
      </button>
      <input ref="fileInput" type="file" accept="application/json" hidden @change="importData" />
    </footer>

    <ProjectDialog
      v-if="dialog"
      :project="dialog.mode === 'edit' ? dialog.project : null"
      @save="saveProject"
      @close="dialog = null"
    />
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: var(--sidebar-w);
  height: 100%;
  padding: 14px 10px 10px;
  border-right: 1px solid var(--border);
  background: var(--bg-sunken);
  overflow-y: auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 2px 8px 0;
}
.brand__mark {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--accent);
  color: var(--accent-fg);
  font-size: 13px;
  font-weight: 700;
}
.brand__name { font-size: 15px; font-weight: 650; letter-spacing: -0.01em; }

.section { display: flex; flex-direction: column; gap: 1px; }
.section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 4px;
  padding: 0 6px 0 10px;
  color: var(--fg-subtle);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.section__head--btn {
  border: 0;
  background: none;
  justify-content: flex-start;
  padding: 4px 10px;
}
.caret { transition: transform 0.15s; }
.caret--open { transform: rotate(90deg); }

.row-wrap { position: relative; display: flex; align-items: center; }

.row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  padding: 7px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--fg-muted);
  text-align: left;
  transition: background 0.1s, color 0.1s;
}
.row:hover { background: var(--bg-hover); color: var(--fg); }
.row--on { background: var(--bg-active); color: var(--fg); font-weight: 600; }
.row--muted { opacity: 0.65; }
.row__icon { flex: none; opacity: 0.85; }
.row__dot { flex: none; width: 7px; height: 7px; border-radius: 50%; }
.row__emoji { flex: none; font-size: 14px; line-height: 1; }
.row__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row__count {
  flex: none;
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--bg-hover);
  color: var(--fg-muted);
  font-size: 11px;
  font-weight: 600;
  text-align: center;
}
.row--on .row__count { background: var(--accent); color: var(--accent-fg); }

.row__more {
  position: absolute;
  right: 4px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--fg-subtle);
  opacity: 0;
  transition: opacity 0.1s, background 0.1s;
}
.row-wrap:hover .row__more { opacity: 1; }
.row__more:hover { background: var(--border); color: var(--fg); }

.menu {
  position: absolute;
  top: calc(100% + 2px);
  right: 0;
  z-index: 20;
  width: 176px;
  padding: 5px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md);
}
.menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--fg);
  font-size: 13px;
  text-align: left;
}
.menu__item:hover:not(:disabled) { background: var(--bg-hover); }
.menu__item:disabled { opacity: 0.35; cursor: not-allowed; }
.menu__item--danger { color: var(--danger); }
.menu__item--danger:hover { background: var(--danger-soft); }
.menu__sep { height: 1px; margin: 4px 0; background: var(--border); }

.hint {
  margin: 2px 10px 6px;
  color: var(--fg-subtle);
  font-size: 12px;
  line-height: 1.5;
}

.foot {
  display: flex;
  gap: 2px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
</style>
