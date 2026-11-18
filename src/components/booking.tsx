import { motion } from 'motion/react'
import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { get } from '../lib/api'
import { maskedCpf } from '../lib/format'
import { cx } from './ui'

export interface SelectedPatient { id_paciente: number; nome: string; cpf: string }

export function PatientSearch({ value, onChoose, locked }: { value: SelectedPatient | null; onChoose: (p: SelectedPatient | null) => void; locked?: boolean }) {
  const [q, setQ] = useState('')
  const [list, setList] = useState<SelectedPatient[] | null>(null)
  const [active, setActive] = useState(0)
  const timer = useRef<number>(undefined)

  useEffect(() => {
    window.clearTimeout(timer.current)
    if (q.trim().length < 2) { setList(null); return }
    timer.current = window.setTimeout(async () => {
      try { const r = await get<SelectedPatient[]>('api/patients/search', { q: q.trim() }); setList(r.data ?? []); setActive(0) } catch { setList([]) }
    }, 250)
  }, [q])

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-brand-200 bg-brand-50 px-4 py-3">
        <span className="grow">
          <span className="block font-medium">{value.nome}</span>
          <span className="block text-[12px] text-muted">CPF {value.cpf.includes('*') ? value.cpf : maskedCpf(value.cpf)}</span>
        </span>
        {!locked && <button type="button" onClick={() => onChoose(null)} className="rounded-lg p-1.5 text-muted hover:bg-white" aria-label="Trocar paciente"><X className="size-4" /></button>}
      </div>
    )
  }

  const choose = (p: SelectedPatient) => { onChoose(p); setQ(''); setList(null) }
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-3 left-3 size-4 text-faint" />
      <input
        className="field-input pl-9" placeholder="Nome ou CPF" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
        role="combobox" aria-expanded={!!list} aria-controls="sugestoesPaciente" aria-label="Buscar paciente"
        onKeyDown={(e) => {
          if (!list?.length) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          if (e.key === 'Enter') { e.preventDefault(); choose(list[active]) }
        }}
      />
      {list && (
        <ul id="sugestoesPaciente" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-[var(--radius-card)] border border-line bg-surface p-1 shadow-xl">
          {list.length === 0 && <li className="px-3 py-3 text-muted">Nenhum paciente ativo encontrado. <Link to="/pacientes/novo" className="text-brand-700 underline">Cadastrar paciente</Link></li>}
          {list.map((p, i) => (
            <li key={p.id_paciente} role="option" aria-selected={i === active} onMouseDown={() => choose(p)}
              className={cx('cursor-pointer rounded-lg px-3 py-2', i === active ? 'bg-brand-50' : 'hover:bg-raised')}>
              <span className="block font-medium">{p.nome}</span>
              <span className="block text-[12px] text-muted">CPF {p.cpf}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export interface Slot { time: string; free: boolean }

export function SlotGrid({ slots, loading, selected, onChoose, emptyText }: {
  slots: Slot[] | null; loading: boolean; selected: string; onChoose: (h: string) => void; emptyText?: string
}) {
  if (loading) return <p className="text-muted">Carregando horários…</p>
  if (!slots) return <p className="text-muted">Escolha as opções acima e a data.</p>
  if (!slots.length) return <p className="rounded-[var(--radius-card)] border border-dashed border-control px-4 py-3 text-muted">{emptyText ?? 'Sem atendimento nesse dia. Escolha outra data.'}</p>
  const freeSlots = slots.filter((h) => h.free).length
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Horários">
        {slots.map((h, i) => (
          <motion.button
            key={h.time} type="button" disabled={!h.free} aria-pressed={selected === h.time} onClick={() => onChoose(h.time)}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.015 }}
            className={cx('num h-9 min-w-[68px] rounded-[var(--radius-control)] border px-3 text-[13px] font-medium transition-colors',
              !h.free ? 'cursor-not-allowed border-dashed border-line bg-raised text-faint line-through'
                : selected === h.time ? 'border-ink bg-ink text-white' : 'border-control bg-surface hover:border-brand-600 hover:bg-brand-50')}
          >
            {h.time}
          </motion.button>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-faint">{freeSlots} de {slots.length} horários livres</p>
    </div>
  )
}
