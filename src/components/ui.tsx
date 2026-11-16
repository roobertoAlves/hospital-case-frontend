import { motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ComponentType, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router'
import type { Tom } from '../lib/formato'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export { cx }

/* ------------------------------------------------------------------ animacao de entrada */

/** Entrada suave (sobe e aparece), como os cards do prompt de referencia, mas curta para uso diario. */
export function Surge({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ botoes */

type Variante = 'primario' | 'secundario' | 'texto' | 'perigo' | 'perigoTexto'
const VAR: Record<Variante, string> = {
  primario: 'bg-ink text-white hover:bg-black shadow-sm',
  secundario: 'bg-surface border border-control text-ink hover:bg-raised',
  texto: 'text-brand-700 hover:bg-brand-50',
  perigo: 'bg-surface border border-red-200 text-negative hover:bg-red-50',
  perigoTexto: 'text-negative hover:bg-red-50',
}

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  pequeno?: boolean
  carregando?: boolean
  icone?: ComponentType<{ className?: string }>
}

export function Botao({ variante = 'secundario', pequeno, carregando, icone: Icone, className, children, disabled, ...r }: BotaoProps) {
  return (
    <button
      {...r}
      disabled={disabled || carregando}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium whitespace-nowrap transition-colors disabled:opacity-55 disabled:cursor-not-allowed',
        pequeno ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-[14px]',
        VAR[variante],
        className,
      )}
    >
      {carregando ? <Loader2 className="size-4 animate-spin" /> : Icone ? <Icone className="size-4" /> : null}
      {children}
    </button>
  )
}

export function BotaoLink({ to, variante = 'secundario', pequeno, icone: Icone, children, className }: {
  to: string; variante?: Variante; pequeno?: boolean; icone?: ComponentType<{ className?: string }>; children: ReactNode; className?: string
}) {
  return (
    <Link
      to={to}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium whitespace-nowrap transition-colors',
        pequeno ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-[14px]',
        VAR[variante],
        className,
      )}
    >
      {Icone && <Icone className="size-4" />}
      {children}
    </Link>
  )
}

/* ------------------------------------------------------------------ cabecalho da pagina */

export function Cabecalho({ titulo, subtitulo, acoes, trilha }: {
  titulo: ReactNode; subtitulo?: ReactNode; acoes?: ReactNode; trilha?: { rotulo: string; to?: string }[]
}) {
  return (
    <Surge className="mb-6">
      {trilha && (
        <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted" aria-label="Trilha">
          {trilha.map((t, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              {t.to ? <Link to={t.to} className="hover:text-brand-700">{t.rotulo}</Link> : <span>{t.rotulo}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-tight">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-muted">{subtitulo}</p>}
        </div>
        {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
      </div>
    </Surge>
  )
}

/* ------------------------------------------------------------------ paineis */

export function Painel({ titulo, meta, acoes, children, className, delay = 0.05, semPadding }: {
  titulo?: ReactNode; meta?: ReactNode; acoes?: ReactNode; children: ReactNode; className?: string; delay?: number; semPadding?: boolean
}) {
  return (
    <Surge delay={delay} className={cx('rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]', className)}>
      {(titulo || meta || acoes) && (
        <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{titulo}</h2>
          <div className="flex items-center gap-2 text-[12px] text-muted">{meta}{acoes}</div>
        </div>
      )}
      <div className={semPadding ? '' : 'p-5'}>{children}</div>
    </Surge>
  )
}

export function Kpi({ rotulo, valor, nota, destaque, delay = 0 }: { rotulo: string; valor: ReactNode; nota?: ReactNode; destaque?: boolean; delay?: number }) {
  return (
    <Surge delay={delay} className={cx('rounded-[var(--radius-card)] border p-4', destaque ? 'border-brand-200 bg-brand-50' : 'border-line bg-surface')}>
      <p className="text-[12px] text-muted">{rotulo}</p>
      <p className={cx('num mt-1 text-[28px] font-semibold leading-none', destaque && 'text-brand-700')}>{valor}</p>
      {nota && <p className="mt-2 text-[12px] text-faint">{nota}</p>}
    </Surge>
  )
}

/* ------------------------------------------------------------------ pilulas */

const TOM: Record<Tom, string> = {
  neutral: 'bg-[#ebeeed] text-[#353a39]',
  positive: 'bg-[#dcfae5] text-[#04250e]',
  negative: 'bg-[#ffedea] text-[#831c1e]',
  warning: 'bg-[#fff6dd] text-[#7a3a0c]',
  accent: 'bg-brand-50 text-brand-900',
}

export function Pilula({ tom = 'neutral', children }: { tom?: Tom; children: ReactNode }) {
  return <span className={cx('inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap', TOM[tom])}>{children}</span>
}

export function Prioridade({ cor, nome }: { cor?: unknown; nome?: unknown }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="size-2.5 rounded-full ring-2 ring-white" style={{ background: String(cor ?? '#999') }} />
      {String(nome ?? '')}
    </span>
  )
}

/* ------------------------------------------------------------------ formulario */

export function Campo({ rotulo, nome, obrigatorio, ajuda, erro, children, className }: {
  rotulo: ReactNode; nome?: string; obrigatorio?: boolean; ajuda?: ReactNode; erro?: string; children: ReactNode; className?: string
}) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={nome} className="text-[13px] font-medium">
        {rotulo} {obrigatorio && <span className="text-negative">*</span>}
      </label>
      {children}
      {ajuda && !erro && <span className="text-[12px] text-faint">{ajuda}</span>}
      {erro && <span className="text-[12px] text-negative" role="alert">{erro}</span>}
    </div>
  )
}

export function Entrada({ invalido, className, ...r }: InputHTMLAttributes<HTMLInputElement> & { invalido?: boolean }) {
  return <input {...r} id={r.id ?? r.name} aria-invalid={invalido || undefined} className={cx('field-input', className)} />
}

export function Seletor({ invalido, className, children, ...r }: SelectHTMLAttributes<HTMLSelectElement> & { invalido?: boolean }) {
  return <select {...r} id={r.id ?? r.name} aria-invalid={invalido || undefined} className={cx('field-input pr-8', className)}>{children}</select>
}

export function AreaTexto({ invalido, className, ...r }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalido?: boolean }) {
  return <textarea {...r} id={r.id ?? r.name} aria-invalid={invalido || undefined} className={cx('field-input', className)} />
}

/** Bloco de formulario em duas colunas (titulo + explicacao | campos), como no backend. */
export function SecaoForm({ titulo, descricao, children }: { titulo: string; descricao?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-5 border-b border-rule py-6 first:pt-0 last:border-0 md:grid-cols-[260px_1fr]">
      <div>
        <h2 className="text-[15px] font-semibold">{titulo}</h2>
        {descricao && <p className="mt-1 text-[13px] text-muted">{descricao}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-6">{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ estados */

export function Vazio({ children, icone: Icone }: { children: ReactNode; icone?: ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-control px-6 py-10 text-center text-muted">
      {Icone && <Icone className="size-6 text-faint" />}
      <div>{children}</div>
    </div>
  )
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-muted" role="status">
      <Loader2 className="size-4 animate-spin" /> {texto}
    </div>
  )
}

export function Alerta({ tom = 'nota', children }: { tom?: 'nota' | 'erro' | 'ok'; children: ReactNode }) {
  const c = tom === 'erro' ? 'border-red-200 bg-red-50 text-[#831c1e]' : tom === 'ok' ? 'border-green-200 bg-green-50 text-[#04250e]' : 'border-amber-200 bg-amber-50 text-[#5c3a07]'
  return <div className={cx('rounded-[var(--radius-card)] border px-4 py-3 text-[13px]', c)} role={tom === 'erro' ? 'alert' : 'status'}>{children}</div>
}

/* ------------------------------------------------------------------ tabela */

export function Tabela({ cabecalho, children }: { cabecalho: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead className="text-[12px] font-medium text-muted">
          <tr className="border-b border-line">{cabecalho}</tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-rule [&>tr:last-child]:border-0 [&>tr:hover]:bg-raised/60">{children}</tbody>
      </table>
    </div>
  )
}

export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => <th className={cx('px-3 py-2.5 font-medium', className)}>{children}</th>
export const Td = ({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) => <td colSpan={colSpan} className={cx('px-3 py-3 align-middle', className)}>{children}</td>

export function Principal({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <span className="block min-w-0">
      <span className="block font-medium">{children}</span>
      {sub && <span className="block text-[12px] text-muted">{sub}</span>}
    </span>
  )
}

/* ------------------------------------------------------------------ abas */

export function Abas<T extends string>({ abas, atual, aoTrocar }: { abas: { id: T; rotulo: string }[]; atual: T; aoTrocar: (id: T) => void }) {
  return (
    <div className="mb-5 flex gap-1 border-b border-line" role="tablist">
      {abas.map((a) => (
        <button
          key={a.id}
          role="tab"
          aria-selected={a.id === atual}
          onClick={() => aoTrocar(a.id)}
          className={cx('-mb-px border-b-2 px-3.5 py-2.5 font-medium transition-colors', a.id === atual ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink')}
        >
          {a.rotulo}
        </button>
      ))}
    </div>
  )
}
