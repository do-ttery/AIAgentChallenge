import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SERVER_ORIGIN = 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': SERVER_ORIGIN,
      '/ingest': SERVER_ORIGIN,
    },
  },
  oxc: {
    jsx: {
      runtime: 'automatic',
      importSource: 'react',
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    environment: 'jsdom',
  },
})
