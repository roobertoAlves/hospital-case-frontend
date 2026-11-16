import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { TextArea, Button, Field } from './ui'

/* ------------------------------------------------------------------ notices (toast) */

interface Notice { id: number; text: string; ok: boolean }
const NoticeContext = createContext<(text: string, ok?: boolean) => void>(() => undefined)

export function NoticesProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Notice[]>([])
  const seq = useRef(0)
  const notify = useCallback((text: string, ok = true) => {
    const id = ++seq.current
    setList((l) => [...l, { id, text, ok }])
    setTimeout(() => setList((l) => l.filter((a) => a.id !== id)), ok ? 3500 : 6000)
  }, [])
  return (
    <NoticeContext.Provider value={notify}>
      {children}
      <div className="no-print pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(380px,calc(100vw-32px))] flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {list.map((a) => (
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
              <span className="grow">{a.text}</span>
              <button aria-label="Fechar aviso" onClick={() => setList((l) => l.filter((x) => x.id !== a.id))} className="text-faint hover:text-ink">
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NoticeContext.Provider>
  )
}

export const useNotice = () => useContext(NoticeContext)

/* ------------------------------------------------------------------ dialog */

export function Dialog({ open, onClose, title, children, width = 'max-w-md' }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string
}) {
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            className={`w-full ${width} rounded-[var(--radius-sheet)] bg-surface p-6 shadow-2xl`}
            initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-[17px] font-semibold">{title}</h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Asks for a reason (cancellations, amendments). Resolves with the text, or null when closed. */
export function ReasonDialog({ open, title, help, buttonLabel = 'Confirmar', onConfirm, onClose }: {
  open: boolean; title: string; help?: string; buttonLabel?: string; onConfirm: (reason: string) => Promise<void> | void; onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  useEffect(() => { if (open) { setReason(''); setError('') } }, [open])
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (reason.trim().length < 3) { setError('Informe o motivo.'); return }
          setSending(true)
          try { await onConfirm(reason.trim()) } finally { setSending(false) }
        }}
      >
        <Field label="Motivo" name="motivoDialogo" required help={help} error={error}>
          <TextArea name="motivoDialogo" autoFocus maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} invalid={!!error} />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>Voltar</Button>
          <Button type="submit" variant="primario" loading={sending}>{buttonLabel}</Button>
        </div>
      </form>
    </Dialog>
  )
}
