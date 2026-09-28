import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // /api へのリクエストをバックエンドに転送する(同一オリジン扱いになり Cookie が使える)
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
