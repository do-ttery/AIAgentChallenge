import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SERVER_ORIGIN = 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // LAN 노출 (폰 접속용, 실매장 검증 T-23)
    allowedHosts: ['.trycloudflare.com'], // cloudflared 퀵터널 HTTPS → 폰 Web Push 보안 컨텍스트 확보
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
