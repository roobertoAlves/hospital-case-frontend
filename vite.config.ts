import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// In development Vite proxies /hospital-case-backend to Tomcat: the browser sees a single
// origin (no CORS), so the session cookie and the CSRF token work as in production.
// BACKEND_URL in .env.local changes the address (default: the IDE's Tomcat on port 8080).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const backend = env.BACKEND_URL || 'http://localhost:8080'
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/hospital-case-backend': { target: backend, changeOrigin: false },
      },
    },
  }
})
