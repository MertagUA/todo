<script setup>
/** Tiny inline SVG icon set — no icon library dependency. */
const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 16 },
})

const paths = {
  inbox: 'M4 4h16v10h-5a3 3 0 0 1-6 0H4z M4 14v6h16v-6',
  sun: 'M12 4v2 M12 18v2 M4 12h2 M18 12h2 M6.3 6.3l1.4 1.4 M16.3 16.3l1.4 1.4 M17.7 6.3l-1.4 1.4 M7.7 16.3l-1.4 1.4 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  alert: 'M12 4l9 16H3z M12 10v4 M12 17.2v.1',
  check: 'M4 12.5l5 5L20 6',
  plus: 'M12 5v14 M5 12h14',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M16.5 16.5L21 21',
  close: 'M6 6l12 12 M18 6L6 18',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  archive: 'M3 5h18v4H3z M5 9v11h14V9 M10 13h4',
  restore: 'M4 10a8 8 0 1 1 1.6 6 M4 5v5h5',
  chevron: 'M9 6l6 6-6 6',
  up: 'M12 19V5 M6 11l6-6 6 6',
  down: 'M12 5v14 M6 13l6 6 6-6',
  copy: 'M9 9h11v11H9z M5 15V4h11',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
  sidebar: 'M3 5h18v14H3z M9 5v14',
  edit: 'M4 20h4L19 9l-4-4L4 16z',
  dots: 'M12 6.5v.1 M12 12v.1 M12 17.5v.1',
  flag: 'M6 21V4h12l-2.5 4L18 12H6',
  tag: 'M4 4h7l9 9-7 7-9-9z M8.5 8.5v.1',
  download: 'M12 4v11 M7 11l5 5 5-5 M5 20h14',
  upload: 'M12 20V9 M7 13l5-5 5 5 M5 4h14',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  repeat: 'M3.5 12a8.5 8.5 0 0 1 14.6-5.9 M20.5 3.5v5h-5 M20.5 12a8.5 8.5 0 0 1-14.6 5.9 M3.5 20.5v-5h5',
  undo: 'M9 14l-5-5 5-5 M4 9h9a6 6 0 0 1 0 12H8',
  left: 'M15 6l-6 6 6 6',
  right: 'M5 12h13 M13 7l5 5-5 5',
  board: 'M3 4h18v16H3z M9 4v16 M15 4v16',
  clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M12 7.5V12l3 2',
  grip: 'M9 6.5v.1 M9 12v.1 M9 17.5v.1 M15 6.5v.1 M15 12v.1 M15 17.5v.1',
  flame: 'M12 3c3 3.5 5 6 5 9a5 5 0 0 1-10 0c0-1.6.7-3 2-4.5 0 1.6.8 2.5 2 2.5 1.4 0 1.8-1.4 1-7z',
}
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, i) in (paths[props.name] || '').split(' M').map((s, idx) => (idx ? 'M' + s : s))" :key="i" :d="d" />
  </svg>
</template>
