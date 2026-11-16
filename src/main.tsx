import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AvisosProvider } from './components/avisos'
import './index.css'
import { SessaoProvider } from './lib/sessao'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessaoProvider>
      <AvisosProvider>
        <App />
      </AvisosProvider>
    </SessaoProvider>
  </StrictMode>,
)
