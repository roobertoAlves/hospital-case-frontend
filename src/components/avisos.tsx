import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AreaTexto, Botao, Campo } from './ui'

/* ------------------------------------------------------------------ avisos (toast) */

interface Aviso { id: number; texto: string; ok: boolean }
const AvisoCtx = createContext<(texto: string, ok?: boolean) => void>(() => undefined)

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Aviso[]>([])
  const seq = useRef(0)
  const avisar = useCallback((texto: string, ok = true) => {
    const id = ++seq.current
    setLista((l) => [...l, { id, texto, ok }])
    setTimeout(() => setLista((l) => l.filter((a) => a.id !== id)), ok ? 3500 : 6000)
  }, [])
  return (
    <AvisoCtx.Provider value={avisar}>
      {children}
      <div className="no-print pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(380px,calc(100vw-32px))] flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {lista.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="pointer-events-auto flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3.5 shadow-lg"
              role={a.ok ? 'status' : 'alert'}
            >
              {a.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-positive" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-negative" />}
              <span className="grow">{a.texto}</span>
              <button aria-label="Fechar aviso" onClick={() => setLista((l) => l.filter((x) => x.id !== a.id))} className="text-faint hover:text-ink">
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AvisoCtx.Provider>
  )
}

export const useAviso = () => useContext(AvisoCtx)

/* ------------------------------------------------------------------ dialogo */

export function Dialogo({ aberto, aoFechar, titulo, children, largura = 'max-w-md' }: {
  aberto: boolean; aoFechar: () => void; titulo: string; children: ReactNode; largura?: string
}) {
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberto, aoFechar])
  return (
    <AnimatePresence>
      {aberto && (
        <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={aoFechar}>
          <motion.div
            role="dialog" aria-modal="true" aria-label={titulo}
            className={`w-full ${largura} rounded-[var(--radius-sheet)] bg-surface p-6 shadow-2xl`}
            initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-[17px] font-semibold">{titulo}</h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Pede um motivo (cancelamentos, retificacoes). Resolve com o texto ou null se fechou. */
export function DialogoMotivo({ aberto, titulo, ajuda, botao = 'Confirmar', aoConfirmar, aoFechar }: {
  aberto: boolean; titulo: string; ajuda?: string; botao?: string; aoConfirmar: (motivo: string) => Promise<void> | void; aoFechar: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  useEffect(() => { if (aberto) { setMotivo(''); setErro('') } }, [aberto])
  return (
    <Dialogo aberto={aberto} aoFechar={aoFechar} titulo={titulo}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (motivo.trim().length < 3) { setErro('Informe o motivo.'); return }
          setEnviando(true)
          try { await aoConfirmar(motivo.trim()) } finally { setEnviando(false) }
        }}
      >
        <Campo rotulo="Motivo" nome="motivoDialogo" obrigatorio ajuda={ajuda} erro={erro}>
          <AreaTexto name="motivoDialogo" autoFocus maxLength={255} value={motivo} onChange={(e) => setMotivo(e.target.value)} invalido={!!erro} />
        </Campo>
        <div className="mt-5 flex justify-end gap-2">
          <Botao type="button" onClick={aoFechar}>Voltar</Botao>
          <Botao type="submit" variante="primario" carregando={enviando}>{botao}</Botao>
        </div>
      </form>
    </Dialogo>
  )
}
