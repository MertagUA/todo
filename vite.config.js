import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // Relative paths, so one build works from localhost, a folder, or /repo/ on Pages.
  base: './',
  plugins: [vue()],
  server: { port: 5173, open: true },
})
