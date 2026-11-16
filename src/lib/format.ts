/** Display formatting (pt-BR). The backend sends ISO dates: "2026-11-16" or "2026-11-16T10:30". */

export type Tone = 'neutral' | 'positive' | 'negative' | 'warning' | 'accent'

const APPOINTMENT: Record<string, [string, Tone]> = {
  agendada: ['Agendada', 'neutral'],
  aguardando_triagem: ['Aguardando triagem', 'warning'],
  em_triagem: ['Em triagem', 'warning'],
  aguardando_atendimento: ['Aguardando médico', 'accent'],
  em_atendimento: ['Em atendimento', 'accent'],
  realizada: ['Realizada', 'positive'],
  cancelada: ['Cancelada', 'negative'],
  ausente: ['Faltou', 'neutral'],
}

const EXAM: Record<string, [string, Tone]> = {
  agendado: ['Agendado', 'neutral'],
  realizado: ['Realizado', 'positive'],
  cancelado: ['Cancelado', 'negative'],
  ausente: ['Faltou', 'neutral'],
}

export const appointmentStatus = (s: unknown): [string, Tone] => APPOINTMENT[String(s)] ?? [String(s ?? '—'), 'neutral']
export const examStatus = (s: unknown): [string, Tone] => EXAM[String(s)] ?? [String(s ?? '—'), 'neutral']

function parts(v: unknown): Date | null {
  if (!v) return null
  const s = String(v)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0)
}

export function formatDate(v: unknown): string {
  const d = parts(v)
  return d ? d.toLocaleDateString('pt-BR') : '—'
}

export function formatTime(v: unknown): string {
  if (!v) return '—'
  const s = String(v)
  const m = s.match(/(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : '—'
}

export function formatDateTime(v: unknown): string {
  const d = parts(v)
  return d ? `${d.toLocaleDateString('pt-BR')} ${formatTime(v)}` : '—'
}

export function longDate(iso: string): string {
  const d = parts(iso)
  if (!d) return iso
  const t = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDays(iso: string, days: number): string {
  const d = parts(iso) ?? new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function age(birth: unknown): number | null {
  const d = parts(birth)
  if (!d) return null
  const h = new Date()
  let a = h.getFullYear() - d.getFullYear()
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) a--
  return a
}

/** CPF with its middle hidden: ***.456.789-** */
export function maskedCpf(cpf: unknown): string {
  const d = String(cpf ?? '').replace(/\D/g, '')
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : '—'
}

export function formattedCpf(cpf: unknown): string {
  const d = String(cpf ?? '').replace(/\D/g, '')
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : String(cpf ?? '')
}

export const or = (v: unknown) => (v === null || v === undefined || String(v).trim() === '' ? '—' : String(v))

export function initials(name: string | undefined): string {
  const p = (name ?? '?').replace(/\(.*?\)/g, '').trim().split(/\s+/)
  return ((p[0]?.[0] ?? '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

/** Exam categories come from the database without accents; this is the display label. */
const CATEGORIES: Record<string, string> = {
  'Analises clinicas': 'Análises clínicas', Genetica: 'Genética', Respiratorio: 'Respiratório',
}
export const categoryLabel = (c: unknown) => CATEGORIES[String(c)] ?? String(c ?? 'Outros')

/** Groups rows by a field, keeping the order in which the groups appear. */
export function groupBy<T extends Record<string, unknown>>(rows: T[], field: string): [string, T[]][] {
  const groups: [string, T[]][] = []
  for (const l of rows) {
    const k = String(l[field] ?? 'Outros')
    const g = groups.find(([n]) => n === k)
    if (g) g[1].push(l)
    else groups.push([k, [l]])
  }
  return groups
}

export const WEEKDAYS =['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
