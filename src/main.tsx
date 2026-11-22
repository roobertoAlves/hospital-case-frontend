import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { NoticesProvider } from './components/notices'
import './index.css'
import { queryClient } from './lib/queryClient'
import { SessionProvider } from './lib/session'

const Devtools = import.meta.env.DEV
  ? lazy(() => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })))
  : () => null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <NoticesProvider>
          <App />
        </NoticesProvider>
      </SessionProvider>
      <Suspense fallback={null}><Devtools buttonPosition="bottom-left" /></Suspense>
    </QueryClientProvider>
  </StrictMode>,
)
