/** Formatacao para exibicao (pt-BR). O backend manda datas em ISO: "2026-11-16" ou "2026-11-16T10:30". */

export type Tom = 'neutral' | 'positive' | 'negative' | 'warning' | 'accent'

const CONSULTA: Record<string, [string, Tom]> = {
  agendada: ['Agendada', 'neutral'],
  aguardando_triagem: ['Aguardando triagem', 'warning'],
  em_triagem: ['Em triagem', 'warning'],
  aguardando_atendimento: ['Aguardando médico', 'accent'],
  em_atendimento: ['Em atendimento', 'accent'],
  realizada: ['Realizada', 'positive'],
  cancelada: ['Cancelada', 'negative'],
  ausente: ['Faltou', 'neutral'],
}

const EXAME: Record<string, [string, Tom]> = {
  agendado: ['Agendado', 'neutral'],
  realizado: ['Realizado', 'positive'],
  cancelado: ['Cancelado', 'negative'],
  ausente: ['Faltou', 'neutral'],
}

export const situacaoConsulta = (s: unknown): [string, Tom] => CONSULTA[String(s)] ?? [String(s ?? '—'), 'neutral']
export const situacaoExame = (s: unknown): [string, Tom] => EXAME[String(s)] ?? [String(s ?? '—'), 'neutral']

function partes(v: unknown): Date | null {
  if (!v) return null
  const s = String(v)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0)
}

export function data(v: unknown): string {
  const d = partes(v)
  return d ? d.toLocaleDateString('pt-BR') : '—'
}

export function hora(v: unknown): string {
  if (!v) return '—'
  const s = String(v)
  const m = s.match(/(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : '—'
}

export function dataHora(v: unknown): string {
  const d = partes(v)
  return d ? `${d.toLocaleDateString('pt-BR')} ${hora(v)}` : '—'
}

export function diaPorExtenso(iso: string): string {
  const d = partes(iso)
  if (!d) return iso
  const t = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function hojeIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function somarDias(iso: string, dias: number): string {
  const d = partes(iso) ?? new Date()
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function idade(nasc: unknown): number | null {
  const d = partes(nasc)
  if (!d) return null
  const h = new Date()
  let a = h.getFullYear() - d.getFullYear()
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) a--
  return a
}

/** CPF com miolo escondido: ***.456.789-** (como a ficha do backend). */
export function cpfMascarado(cpf: unknown): string {
  const d = String(cpf ?? '').replace(/\D/g, '')
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : '—'
}

export function cpfFormatado(cpf: unknown): string {
  const d = String(cpf ?? '').replace(/\D/g, '')
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : String(cpf ?? '')
}

export const ou = (v: unknown) => (v === null || v === undefined || String(v).trim() === '' ? '—' : String(v))

export function iniciais(nome: string | undefined): string {
  const p = (nome ?? '?').replace(/\(.*?\)/g, '').trim().split(/\s+/)
  return ((p[0]?.[0] ?? '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

/** Categorias de exame vem sem acento do banco; aqui o rotulo de exibicao. */
const CATEGORIAS: Record<string, string> = {
  'Analises clinicas': 'Análises clínicas', Genetica: 'Genética', Respiratorio: 'Respiratório',
}
export const rotuloCategoria = (c: unknown) => CATEGORIAS[String(c)] ?? String(c ?? 'Outros')

/** Agrupa linhas por um campo, mantendo a ordem em que os grupos aparecem. */
export function agrupar<T extends Record<string, unknown>>(linhas: T[], campo: string): [string, T[]][] {
  const grupos: [string, T[]][] = []
  for (const l of linhas) {
    const k = String(l[campo] ?? 'Outros')
    const g = grupos.find(([n]) => n === k)
    if (g) g[1].push(l)
    else grupos.push([k, [l]])
  }
  return grupos
}

export const DIAS_SEMANA =['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
