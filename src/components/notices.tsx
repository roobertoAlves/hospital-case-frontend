import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Toaster, toast } from 'sonner'
import { TextArea, Button, Field } from './ui'

const NoticeContext = createContext<(text: string, ok?: boolean) => void>(() => undefined)

export function NoticesProvider({ children }: { children: ReactNode }) {
  const notify = useCallback((text: string, ok = true) => {
    if (ok) toast.success(text, { duration: 3500 })
    else toast.error(text, { duration: 6000 })
  }, [])
  return (
    <NoticeContext.Provider value={notify}>
      {children}
      <div className="no-print">
        <Toaster
          position="bottom-right"
          closeButton
          visibleToasts={4}
          icons={{
            success: <CheckCircle2 className="size-5 text-positive" />,
            error: <XCircle className="size-5 text-negative" />,
          }}
          toastOptions={{
            closeButtonAriaLabel: 'Fechar aviso',
            classNames: {
              toast: '!rounded-[var(--radius-card)] !border !border-line !bg-surface !text-ink !shadow-lg !font-[inherit] !text-[14px] !gap-3 !p-3.5',
              closeButton: '!bg-surface !border-line !text-faint hover:!text-ink',
            },
          }}
        />
      </div>
    </NoticeContext.Provider>
  )
}

export const useNotice = () => useContext(NoticeContext)

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
            className={`max-h-[90vh] w-full ${width} overflow-y-auto rounded-[var(--radius-sheet)] bg-surface p-6 shadow-2xl`}
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
