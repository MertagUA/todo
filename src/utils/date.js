/**
 * All dates are stored as plain "YYYY-MM-DD" strings and times as "HH:MM" —
 * no timezone surprises. Labels are Ukrainian.
 */
import { LOCALE, plural, t } from '../i18n.js'

export const WEEKDAY_SHORT_UK = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
/** Monday-first order, the way Ukrainian calendars are drawn. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO() {
  return toISO(new Date())
}

export function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

/** Adds months, clamping the day: Jan 31 + 1 month = Feb 28 (or 29). */
export function addMonthsISO(iso, months) {
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1 + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(d, lastDay))
  return toISO(target)
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(iso) {
  return new Date(`${iso}T00:00:00`).getDay()
}

/** Whole days from today: -1 = yesterday, 0 = today, 1 = tomorrow. */
export function daysFromToday(iso) {
  if (!iso) return null
  const a = new Date(`${todayISO()}T00:00:00`)
  const b = new Date(`${iso}T00:00:00`)
  return Math.round((b - a) / 86400000)
}

export function isOverdue(iso) {
  const d = daysFromToday(iso)
  return d !== null && d < 0
}

/* ------------------------------------------------------------------ recurrence */

/** One step forward from `iso` according to the repeat rule. */
function step(iso, repeat) {
  const n = Math.max(1, Number(repeat.interval) || 1)
  switch (repeat.unit) {
    case 'day':
      return addDaysISO(iso, n)
    case 'week': {
      const days = repeat.weekdays || []
      if (days.length) {
        // Walk forward to the next selected weekday (crossing weeks if interval > 1).
        for (let i = 1; i <= 7 * n + 7; i++) {
          const cand = addDaysISO(iso, i)
          if (days.includes(weekdayOf(cand))) return cand
        }
      }
      return addDaysISO(iso, 7 * n)
    }
    case 'month':
      return addMonthsISO(iso, n)
    case 'year':
      return addMonthsISO(iso, 12 * n)
    default:
      return addDaysISO(iso, n)
  }
}

/**
 * The next due date after finishing an occurrence.
 * Skips past any missed occurrences, so a daily task you ignored for a week
 * comes back tomorrow — not seven times.
 */
export function nextOccurrence(dueISO, repeat, from = todayISO()) {
  if (!repeat) return null
  let next = step(dueISO || from, repeat)
  let guard = 0
  while (next <= from && guard++ < 1000) next = step(next, repeat)
  return next
}

const UNIT_FORMS = {
  day: ['день', 'дні', 'днів'],
  week: ['тиждень', 'тижні', 'тижнів'],
  month: ['місяць', 'місяці', 'місяців'],
  year: ['рік', 'роки', 'років'],
}

/** "Щодня", "Кожні 2 тижні", "Щотижня у Пн, Чт", "Щороку". */
export function formatRepeat(repeat) {
  if (!repeat) return ''
  const n = Math.max(1, Number(repeat.interval) || 1)
  const simple = {
    day: t.repeat.daily,
    week: t.repeat.weekly,
    month: t.repeat.monthly,
    year: t.repeat.yearly,
  }
  let label = n === 1 ? simple[repeat.unit] : t.repeat.everyN(n, plural(n, UNIT_FORMS[repeat.unit]))
  if (repeat.unit === 'week' && repeat.weekdays?.length) {
    const names = WEEK_ORDER.filter((d) => repeat.weekdays.includes(d))
      .map((d) => WEEKDAY_SHORT_UK[d])
      .join(', ')
    label += ` ${t.repeat.onDays} ${names}`
  }
  return label
}

/** Short human label: "Сьогодні", "Завтра", "3 дні тому", "14 бер.". */
export function formatDue(iso) {
  const diff = daysFromToday(iso)
  if (diff === null) return ''
  if (diff === 0) return 'Сьогодні'
  if (diff === 1) return 'Завтра'
  if (diff === 2) return 'Післязавтра'
  if (diff === -1) return 'Учора'
  if (diff < 0) {
    const n = Math.abs(diff)
    return `${n} ${plural(n, ['день', 'дні', 'днів'])} тому`
  }
  if (diff <= 7) return `через ${diff} ${plural(diff, ['день', 'дні', 'днів'])}`
  const d = new Date(`${iso}T00:00:00`)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(LOCALE, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
}

/** "пн, 14 бер. 2027 р." — used where the exact date matters. */
export function formatFullDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString(LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString(LOCALE, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* -------------------------------------------------------------------- calendar */

/** Monday of the week that `iso` belongs to. */
export function startOfWeekISO(iso) {
  const day = weekdayOf(iso)
  const back = (day + 6) % 7        // Monday = 0 steps back
  return addDaysISO(iso, -back)
}

/** The seven ISO dates of that week, Monday first. */
export function weekDatesISO(iso) {
  const monday = startOfWeekISO(iso)
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i))
}

/** "18–24 серпня 2026" or "30 берез. – 5 квіт. 2026" when the month changes. */
export function formatWeekRange(iso) {
  const days = weekDatesISO(iso)
  const a = new Date(`${days[0]}T00:00:00`)
  const b = new Date(`${days[6]}T00:00:00`)
  const sameMonth = a.getMonth() === b.getMonth()
  const left = a.toLocaleDateString(LOCALE, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' })
  const right = b.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })
  return `${left} – ${right}`
}

/** "Серпень 2026" with a capital first letter. */
export function formatMonthTitle(iso) {
  const date = new Date(`${iso}T00:00:00`)
  const month = date.toLocaleDateString(LOCALE, { month: 'long' })
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`
}

/**
 * Monday-first weeks covering the month `iso` belongs to — four, five or six
 * rows, never a whole trailing week that belongs to the next month.
 */
export function monthGridISO(iso) {
  const first = `${iso.slice(0, 8)}01`
  const start = startOfWeekISO(first)

  const firstOfNext = addMonthsISO(first, 1)
  const lastOfMonth = addDaysISO(firstOfNext, -1)

  const days = []
  let cursor = start
  do {
    for (let i = 0; i < 7; i++) {
      days.push(cursor)
      cursor = addDaysISO(cursor, 1)
    }
  } while (days[days.length - 1] < lastOfMonth)

  return days
}

export function isSameMonth(a, b) {
  return a.slice(0, 7) === b.slice(0, 7)
}

/** "понеділок, 18 серпня" */
export function formatDayLong(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function dayNumber(iso) {
  return Number(iso.slice(8, 10))
}

export function weekdayShort(iso) {
  return WEEKDAY_SHORT_UK[weekdayOf(iso)]
}

export function isWeekend(iso) {
  const d = weekdayOf(iso)
  return d === 0 || d === 6
}

/* ------------------------------------------------------------------------ time */

/** "15:30" -> 930 minutes since midnight. */
export function timeToMinutes(time) {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function minutesToTime(minutes) {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)))
  const h = String(Math.floor(clamped / 60)).padStart(2, '0')
  const m = String(clamped % 60).padStart(2, '0')
  return `${h}:${m}`
}

/** 90 -> "1 год 30 хв"; null -> "". */
export function formatDuration(minutes) {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h} год ${m} хв`
  if (h) return `${h} ${plural(h, ['година', 'години', 'годин'])}`
  return `${m} хв`
}

/** Same clock, next day: 23:30 + 60 хв -> "00:30". */
export function wrapMinutesToTime(minutes) {
  return minutesToTime(((minutes % 1440) + 1440) % 1440)
}

/** "15:00 – 16:30", or just "15:00" when the length is unknown. */
export function formatTimeRange(time, duration) {
  if (!duration) return time
  return `${time} – ${wrapMinutesToTime(timeToMinutes(time) + duration)}`
}
