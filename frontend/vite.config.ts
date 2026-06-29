import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this repository at /TRPGLOG/.
  // Keep dev at / so the local URL stays http://127.0.0.1:5173/.
  base: command === 'build' ? '/TRPGLOG/' : '/',
  plugins: [react()],
  server: {
    proxy: {
      // Optional local backend for future server-side features.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
}))
