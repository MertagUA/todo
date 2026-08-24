<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import BaseModal from './BaseModal.vue'
import { actions, activeProjects, DURATION_QUICK, DURATION_OPTIONS } from '../store/store.js'
import { t } from '../i18n.js'
import { formatTimeRange, formatDuration, todayISO, timeToMinutes, minutesToTime } from '../utils/date.js'

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
const endsAt = computed(() =>
  duration.value ? minutesToTime(timeToMinutes(time.value) + duration.value) : null,
)

/** Quick chips plus a dropdown that covers 5 хв … 12 год, and any custom value. */
const quickLabel = (value) => (value === null ? t.calendar.durationUnknown : formatDuration(value))

const dropdownOptions = computed(() => {
  const list = [...DURATION_OPTIONS]
  if (duration.value && !list.includes(duration.value)) list.push(duration.value)
  return list.sort((a, b) => a - b)
})

const selectValue = computed(() => (duration.value === null ? 'none' : String(duration.value)))

function onSelect(raw) {
  duration.value = raw === 'none' ? null : Number(raw)
}
function onCustomMinutes(raw) {
  const n = Number(raw)
  duration.value = Number.isFinite(n) && n > 0 ? Math.min(1440, Math.round(n)) : null
}

onMounted(async () => {
  await nextTick()
  titleInput.value?.focus()
})

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
        <select class="select" :value="selectValue" @change="onSelect($event.target.value)">
          <option value="none">{{ t.calendar.durationUnknown }}</option>
          <option v-for="m in dropdownOptions" :key="m" :value="String(m)">{{ formatDuration(m) }}</option>
        </select>
        <label class="custom">
          <input
            type="number"
            class="input input--num"
            min="1"
            max="1440"
            step="5"
            :value="duration ?? ''"
            :placeholder="t.calendar.durationCustom"
            @input="onCustomMinutes($event.target.value)"
          />
          <span>{{ t.calendar.minutes }}</span>
        </label>
      </div>

      <p class="preview">
        <span class="dot" />
        {{ preview }}
        <span v-if="duration" class="muted">· {{ t.calendar.endsAt }} {{ endsAt }}</span>
        <span v-else class="muted">· {{ t.calendar.noDuration }}</span>
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
.dur-row { display: flex; gap: 8px; margin-top: 8px; }
.dur-row .select { flex: 1; }
.custom { display: flex; align-items: center; gap: 6px; color: var(--fg-muted); font-size: 12px; }
.input--num { width: 74px; text-align: center; }

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
