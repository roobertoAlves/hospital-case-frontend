import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Em desenvolvimento o Vite repassa /hospital-case-backend para o Tomcat: o navegador ve uma
// origem so (sem CORS), e o cookie de sessao e o token CSRF funcionam como no backend.
// BACKEND_URL no .env.local troca o endereco (padrao: Tomcat do Eclipse/IntelliJ na 8080).
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
