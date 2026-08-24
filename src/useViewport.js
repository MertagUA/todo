import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/**
 * One shared source of truth for screen size, so components do not each
 * register their own resize listener.
 */
const width = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
let listeners = 0
let handler = null

export function useViewport() {
  onMounted(() => {
    if (listeners === 0) {
      handler = () => { width.value = window.innerWidth }
      window.addEventListener('resize', handler)
      handler()
    }
    listeners += 1
  })
  onBeforeUnmount(() => {
    listeners -= 1
    if (listeners === 0 && handler) {
      window.removeEventListener('resize', handler)
      handler = null
    }
  })

  return {
    width,
    isPhone: computed(() => width.value <= 700),
    isNarrow: computed(() => width.value <= 980),
  }
}
