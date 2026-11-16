import { motion } from 'motion/react'
import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { get } from '../lib/api'
import { cpfMascarado } from '../lib/formato'
import { cx } from './ui'

export interface PacienteEscolhido { id_paciente: number; nome: string; cpf: string }

/** Busca de paciente com sugestoes (GET api/pacientes/busca); so pacientes ativos. */
export function BuscaPaciente({ valor, aoEscolher, bloqueado }: { valor: PacienteEscolhido | null; aoEscolher: (p: PacienteEscolhido | null) => void; bloqueado?: boolean }) {
  const [q, setQ] = useState('')
  const [lista, setLista] = useState<PacienteEscolhido[] | null>(null)
  const [ativo, setAtivo] = useState(0)
  const timer = useRef<number>(undefined)

  useEffect(() => {
    window.clearTimeout(timer.current)
    if (q.trim().length < 2) { setLista(null); return }
    timer.current = window.setTimeout(async () => {
      try { const r = await get<PacienteEscolhido[]>('api/pacientes/busca', { q: q.trim() }); setLista(r.data ?? []); setAtivo(0) } catch { setLista([]) }
    }, 250)
  }, [q])

  if (valor) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-brand-200 bg-brand-50 px-4 py-3">
        <span className="grow">
          <span className="block font-medium">{valor.nome}</span>
          <span className="block text-[12px] text-muted">CPF {valor.cpf.includes('*') ? valor.cpf : cpfMascarado(valor.cpf)}</span>
        </span>
        {!bloqueado && <button type="button" onClick={() => aoEscolher(null)} className="rounded-lg p-1.5 text-muted hover:bg-white" aria-label="Trocar paciente"><X className="size-4" /></button>}
      </div>
    )
  }

  const escolher = (p: PacienteEscolhido) => { aoEscolher(p); setQ(''); setLista(null) }
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-3 left-3 size-4 text-faint" />
      <input
        className="field-input pl-9" placeholder="Nome ou CPF" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
        role="combobox" aria-expanded={!!lista} aria-controls="sugestoesPaciente" aria-label="Buscar paciente"
        onKeyDown={(e) => {
          if (!lista?.length) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((a) => Math.min(a + 1, lista.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)) }
          if (e.key === 'Enter') { e.preventDefault(); escolher(lista[ativo]) }
        }}
      />
      {lista && (
        <ul id="sugestoesPaciente" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-[var(--radius-card)] border border-line bg-surface p-1 shadow-xl">
          {lista.length === 0 && <li className="px-3 py-3 text-muted">Nenhum paciente ativo encontrado. <Link to="/pacientes/novo" className="text-brand-700 underline">Cadastrar paciente</Link></li>}
          {lista.map((p, i) => (
            <li key={p.id_paciente} role="option" aria-selected={i === ativo} onMouseDown={() => escolher(p)}
              className={cx('cursor-pointer rounded-lg px-3 py-2', i === ativo ? 'bg-brand-50' : 'hover:bg-raised')}>
              <span className="block font-medium">{p.nome}</span>
              <span className="block text-[12px] text-muted">CPF {p.cpf}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export interface Horario { hora: string; livre: boolean }

/** Grade de horarios: livres para clicar, ocupados riscados. */
export function GradeHorarios({ horarios, carregando, escolhido, aoEscolher, vazio }: {
  horarios: Horario[] | null; carregando: boolean; escolhido: string; aoEscolher: (h: string) => void; vazio?: string
}) {
  if (carregando) return <p className="text-muted">Carregando horários…</p>
  if (!horarios) return <p className="text-muted">Escolha as opções acima e a data.</p>
  if (!horarios.length) return <p className="rounded-[var(--radius-card)] border border-dashed border-control px-4 py-3 text-muted">{vazio ?? 'Sem atendimento nesse dia. Escolha outra data.'}</p>
  const livres = horarios.filter((h) => h.livre).length
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Horários">
        {horarios.map((h, i) => (
          <motion.button
            key={h.hora} type="button" disabled={!h.livre} aria-pressed={escolhido === h.hora} onClick={() => aoEscolher(h.hora)}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.015 }}
            className={cx('num h-9 min-w-[68px] rounded-[var(--radius-control)] border px-3 text-[13px] font-medium transition-colors',
              !h.livre ? 'cursor-not-allowed border-dashed border-line bg-raised text-faint line-through'
                : escolhido === h.hora ? 'border-ink bg-ink text-white' : 'border-control bg-surface hover:border-brand-600 hover:bg-brand-50')}
          >
            {h.hora}
          </motion.button>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-faint">{livres} de {horarios.length} horários livres</p>
    </div>
  )
}
