import { motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ComponentType, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router'
import type { Tone } from '../lib/format'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export { cx }

/* ------------------------------------------------------------------ entrance animation */

/** Soft entrance (rises and fades in), short enough for daily use. */
export function FadeIn({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
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

/* ------------------------------------------------------------------ buttons */

type Variant = 'primario' | 'secundario' | 'texto' | 'perigo' | 'perigoTexto'
const VAR: Record<Variant, string> = {
  primario: 'bg-ink text-white hover:bg-black shadow-sm',
  secundario: 'bg-surface border border-control text-ink hover:bg-raised',
  texto: 'text-brand-700 hover:bg-brand-50',
  perigo: 'bg-surface border border-red-200 text-negative hover:bg-red-50',
  perigoTexto: 'text-negative hover:bg-red-50',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  small?: boolean
  loading?: boolean
  icon?: ComponentType<{ className?: string }>
}

export function Button({ variant = 'secundario', small, loading, icon: Icon, className, children, disabled, ...r }: ButtonProps) {
  return (
    <button
      {...r}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium whitespace-nowrap transition-colors disabled:opacity-55 disabled:cursor-not-allowed',
        small ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-[14px]',
        VAR[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4" /> : null}
      {children}
    </button>
  )
}

export function ButtonLink({ to, variant = 'secundario', small, icon: Icon, children, className }: {
  to: string; variant?: Variant; small?: boolean; icon?: ComponentType<{ className?: string }>; children: ReactNode; className?: string
}) {
  return (
    <Link
      to={to}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium whitespace-nowrap transition-colors',
        small ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-[14px]',
        VAR[variant],
        className,
      )}
    >
      {Icon && <Icon className="size-4" />}
      {children}
    </Link>
  )
}

/* ------------------------------------------------------------------ page header */

export function PageHeader({ title, subtitle, actions, breadcrumb }: {
  title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; breadcrumb?: { label: string; to?: string }[]
}) {
  return (
    <FadeIn className="mb-6">
      {breadcrumb && (
        <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted" aria-label="Trilha">
          {breadcrumb.map((t, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              {t.to ? <Link to={t.to} className="hover:text-brand-700">{t.label}</Link> : <span>{t.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </FadeIn>
  )
}

/* ------------------------------------------------------------------ panels */

export function Panel({ title, meta, actions, children, className, delay = 0.05, noPadding }: {
  title?: ReactNode; meta?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; delay?: number; noPadding?: boolean
}) {
  return (
    <FadeIn delay={delay} className={cx('rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]', className)}>
      {(title || meta || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <div className="flex items-center gap-2 text-[12px] text-muted">{meta}{actions}</div>
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </FadeIn>
  )
}

export function Kpi({ label, value, note, highlight, delay = 0 }: { label: string; value: ReactNode; note?: ReactNode; highlight?: boolean; delay?: number }) {
  return (
    <FadeIn delay={delay} className={cx('rounded-[var(--radius-card)] border p-4', highlight ? 'border-brand-200 bg-brand-50' : 'border-line bg-surface')}>
      <p className="text-[12px] text-muted">{label}</p>
      <p className={cx('num mt-1 text-[28px] font-semibold leading-none', highlight && 'text-brand-700')}>{value}</p>
      {note && <p className="mt-2 text-[12px] text-faint">{note}</p>}
    </FadeIn>
  )
}

/* ------------------------------------------------------------------ badges */

const TONE: Record<Tone, string> = {
  neutral: 'bg-[#ebeeed] text-[#353a39]',
  positive: 'bg-[#dcfae5] text-[#04250e]',
  negative: 'bg-[#ffedea] text-[#831c1e]',
  warning: 'bg-[#fff6dd] text-[#7a3a0c]',
  accent: 'bg-brand-50 text-brand-900',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx('inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap', TONE[tone])}>{children}</span>
}

export function Priority({ color, name }: { color?: unknown; name?: unknown }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="size-2.5 rounded-full ring-2 ring-white" style={{ background: String(color ?? '#999') }} />
      {String(name ?? '')}
    </span>
  )
}

/* ------------------------------------------------------------------ forms */

export function Field({ label, name, required, help, error, children, className }: {
  label: ReactNode; name?: string; required?: boolean; help?: ReactNode; error?: string; children: ReactNode; className?: string
}) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={name} className="text-[13px] font-medium">
        {label} {required && <span className="text-negative">*</span>}
      </label>
      {children}
      {help && !error && <span className="text-[12px] text-faint">{help}</span>}
      {error && <span className="text-[12px] text-negative" role="alert">{error}</span>}
    </div>
  )
}

export function Input({ invalid, className, ...r }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...r} id={r.id ?? r.name} aria-invalid={invalid || undefined} className={cx('field-input', className)} />
}

export function Select({ invalid, className, children, ...r }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select {...r} id={r.id ?? r.name} aria-invalid={invalid || undefined} className={cx('field-input pr-8', className)}>{children}</select>
}

export function TextArea({ invalid, className, ...r }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea {...r} id={r.id ?? r.name} aria-invalid={invalid || undefined} className={cx('field-input', className)} />
}

/** Two-column form block (title + explanation | fields). */
export function FormSection({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-5 border-b border-rule py-6 first:pt-0 last:border-0 md:grid-cols-[260px_1fr]">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-6">{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ states */

export function Empty({ children, icon: Icon }: { children: ReactNode; icon?: ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-control px-6 py-10 text-center text-muted">
      {Icon && <Icon className="size-6 text-faint" />}
      <div>{children}</div>
    </div>
  )
}

export function Loading({ text = 'Carregando…' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-muted" role="status">
      <Loader2 className="size-4 animate-spin" /> {text}
    </div>
  )
}

export function Alert({ tone = 'nota', children }: { tone?: 'nota' | 'erro' | 'ok'; children: ReactNode }) {
  const c = tone === 'erro' ? 'border-red-200 bg-red-50 text-[#831c1e]' : tone === 'ok' ? 'border-green-200 bg-green-50 text-[#04250e]' : 'border-amber-200 bg-amber-50 text-[#5c3a07]'
  return <div className={cx('rounded-[var(--radius-card)] border px-4 py-3 text-[13px]', c)} role={tone === 'erro' ? 'alert' : 'status'}>{children}</div>
}

/* ------------------------------------------------------------------ table */

export function Table({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead className="text-[12px] font-medium text-muted">
          <tr className="border-b border-line">{header}</tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-rule [&>tr:last-child]:border-0 [&>tr:hover]:bg-raised/60">{children}</tbody>
      </table>
    </div>
  )
}

export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => <th className={cx('px-3 py-2.5 font-medium', className)}>{children}</th>
export const Td = ({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) => <td colSpan={colSpan} className={cx('px-3 py-3 align-middle', className)}>{children}</td>

export function Main({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <span className="block min-w-0">
      <span className="block font-medium">{children}</span>
      {sub && <span className="block text-[12px] text-muted">{sub}</span>}
    </span>
  )
}

/* ------------------------------------------------------------------ tabs */

export function Tabs<T extends string>({ tabs, current, onChange }: { tabs: { id: T; label: string }[]; current: T; onChange: (id: T) => void }) {
  return (
    <div className="mb-5 flex gap-1 border-b border-line" role="tablist">
      {tabs.map((a) => (
        <button
          key={a.id}
          role="tab"
          aria-selected={a.id === current}
          onClick={() => onChange(a.id)}
          className={cx('-mb-px border-b-2 px-3.5 py-2.5 font-medium transition-colors', a.id === current ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink')}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}
