import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { NoticesProvider } from './components/notices'
import './index.css'
import { SessionProvider } from './lib/session'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <NoticesProvider>
        <App />
      </NoticesProvider>
    </SessionProvider>
  </StrictMode>,
)
