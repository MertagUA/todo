<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import BaseModal from './BaseModal.vue'
import { actions, activeProjects, DURATION_QUICK } from '../store/store.js'
import { t } from '../i18n.js'
import {
  formatTimeRange, formatDuration, todayISO, timeToMinutes, wrapMinutesToTime,
} from '../utils/date.js'

const props = defineProps({
  event: { type: Object, default: null },   // null = create mode
  date: { type: String, default: null },    // preselected day
  time: { type: String, default: null },    // preselected start
})
const emit = defineEmits(['close'])

const title = ref(props.event?.title ?? '')
const date = ref(props.event?.date ?? props.date ?? todayISO())
const time = ref(props.event?.time ?? props.time ?? '09:00')
const duration = ref(props.event?.duration ?? null)
const projectId = ref(props.event?.projectId ?? null)
const notes = ref(props.event?.notes ?? '')
const titleInput = ref(null)

const preview = computed(() => formatTimeRange(time.value, duration.value))
/** Quick chips for the usual lengths. */
const quickLabel = (value) => (value === null ? t.calendar.durationUnknown : formatDuration(value))

/**
 * Duration can be set three ways, whichever is handier: a chip, the hours and
 * minutes boxes, or simply picking the time the thing ends.
 */
const hours = computed(() => (duration.value ? Math.floor(duration.value / 60) : null))
const minutes = computed(() => (duration.value ? duration.value % 60 : null))

function setParts(h, m) {
  const total = Math.max(0, Math.min(24 * 60, (Number(h) || 0) * 60 + (Number(m) || 0)))
  duration.value = total || null
}

/** "" when the length is unknown; otherwise the clock time it ends at. */
const endTime = computed(() =>
  duration.value ? wrapMinutesToTime(timeToMinutes(time.value) + duration.value) : '',
)

function setEnd(value) {
  if (!value) {
    duration.value = null
    return
  }
  const start = timeToMinutes(time.value)
  let end = timeToMinutes(value)
  if (end <= start) end += 24 * 60      // an evening event that runs past midnight
  duration.value = end - start
}

/** True when the end time lands on the following day. */
const crossesMidnight = computed(
  () => Boolean(duration.value) && timeToMinutes(time.value) + duration.value >= 24 * 60,
)

function submit() {
  const name = title.value.trim()
  if (!name) return
  const patch = {
    title: name,
    date: date.value,
    time: time.value,
    duration: duration.value,
    projectId: projectId.value || null,
    notes: notes.value,
  }
  if (props.event) actions.updateEvent(props.event.id, patch)
  else actions.addEvent(patch)
  emit('close')
}

function remove() {
  actions.requestDeleteEvent(props.event.id)
  emit('close')
}
</script>

<template>
  <BaseModal
    :title="event ? t.calendar.editEventTitle : t.calendar.newEventTitle"
    width="440px"
    @close="emit('close')"
  >
    <form @submit.prevent="submit">
      <label class="label" for="ev-title">{{ t.calendar.eventTitle }}</label>
      <input
        id="ev-title"
        ref="titleInput"
        v-model="title"
        class="input"
        :placeholder="t.calendar.eventTitlePlaceholder"
        maxlength="80"
      />

      <div class="row">
        <div>
          <label class="label">{{ t.calendar.date }}</label>
          <input v-model="date" type="date" class="input" />
        </div>
        <div>
          <label class="label">{{ t.calendar.start }}</label>
          <input v-model="time" type="time" step="300" class="input" />
        </div>
      </div>

      <label class="label" style="margin-top: 16px">{{ t.calendar.duration }}</label>
      <div class="durations">
        <button
          v-for="d in DURATION_QUICK"
          :key="String(d)"
          type="button"
          class="mini"
          :class="{ 'mini--on': duration === d }"
          @click="duration = d"
        >
          {{ quickLabel(d) }}
        </button>
      </div>

      <div class="dur-row">
        <label class="field">
          <span class="field__label">{{ t.calendar.end }}</span>
          <input type="time" step="300" class="input" :value="endTime" @input="setEnd($event.target.value)" />
        </label>

        <span class="or">{{ t.calendar.or }}</span>

        <label class="field field--num">
          <span class="field__label">{{ t.calendar.hoursShort }}</span>
          <input
            type="number"
            class="input"
            min="0"
            max="24"
            :value="hours ?? ''"
            placeholder="0"
            @input="setParts($event.target.value, minutes)"
          />
        </label>
        <label class="field field--num">
          <span class="field__label">{{ t.calendar.minutesShort }}</span>
          <input
            type="number"
            class="input"
            min="0"
            max="59"
            step="5"
            :value="minutes ?? ''"
            placeholder="0"
            @input="setParts(hours, $event.target.value)"
          />
        </label>
      </div>

      <p class="preview">
        <span class="dot" />
        {{ preview }}
        <span v-if="duration" class="muted">· {{ formatDuration(duration) }}</span>
        <span v-else class="muted">· {{ t.calendar.noDuration }}</span>
        <span v-if="crossesMidnight" class="muted">· {{ t.calendar.nextDay }}</span>
      </p>

      <label class="label" style="margin-top: 16px">{{ t.task.project }}</label>
      <select v-model="projectId" class="select">
        <option :value="null">—</option>
        <option v-for="p in activeProjects" :key="p.id" :value="p.id">
          {{ p.emoji }} {{ p.name }}
        </option>
      </select>

      <label class="label" style="margin-top: 16px">{{ t.calendar.notes }}</label>
      <textarea v-model="notes" class="textarea" rows="3" />
    </form>

    <template #footer>
      <button v-if="event" class="btn btn--danger" @click="remove">{{ t.calendar.deleteEvent }}</button>
      <div class="spacer" />
      <button class="btn" @click="emit('close')">{{ t.confirm.cancel }}</button>
      <button class="btn btn--primary" :disabled="!title.trim()" @click="submit">
        {{ event ? t.calendar.saveEvent : t.calendar.createEvent }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
.durations { display: flex; flex-wrap: wrap; gap: 6px; }
.mini {
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--fg-muted);
  font-size: 12px;
}
.mini:hover { border-color: var(--accent); color: var(--accent); }
.mini--on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.dur-row { display: flex; align-items: flex-end; gap: 8px; margin-top: 10px; }
.field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.field--num { flex: 0 0 74px; }
.field--num .input { text-align: center; }
.field__label { color: var(--fg-muted); font-size: 11px; font-weight: 600; }
.or { padding-bottom: 9px; color: var(--fg-subtle); font-size: 12px; }

.preview {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 10px 0 0;
  color: var(--fg);
  font-size: 13px;
  font-weight: 600;
}
.preview .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.muted { color: var(--fg-muted); font-weight: 400; }
.spacer { flex: 1; }
</style>
