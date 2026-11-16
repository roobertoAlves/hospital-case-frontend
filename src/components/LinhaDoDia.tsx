import { motion } from 'motion/react'
import { hora, situacaoConsulta } from '../lib/formato'
import { cx } from './ui'

type Linha = Record<string, unknown>

const COR_STATUS: Record<string, string> = {
  realizada: 'bg-[#bfe9cf]', cancelada: 'bg-[#f6cfcb]', ausente: 'bg-[#dfe3e2]', agendada: 'bg-brand-100',
  aguardando_triagem: 'bg-[#ffe3a6]', em_triagem: 'bg-[#ffe3a6]', aguardando_atendimento: 'bg-brand-200', em_atendimento: 'bg-brand-500',
}

/** Linha do dia: uma faixa por medico (7h-19h) com as consultas posicionadas pelo horario. */
export function LinhaDoDia({ medicos, consultas, mostrarAgora = true }: { medicos: Linha[]; consultas: Linha[]; mostrarAgora?: boolean }) {
  const ini = 7 * 60, fim = 19 * 60
  const pos = (min: number) => `${((min - ini) / (fim - ini)) * 100}%`
  const minutos = (v: unknown) => { const m = String(v ?? '').match(/T?(\d{2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : 0 }
  const agora = mostrarAgora ? new Date().getHours() * 60 + new Date().getMinutes() : -1
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="ml-[180px] flex justify-between pb-2 text-[11px] text-faint">
          {Array.from({ length: 13 }, (_, i) => <span key={i} className="num w-0">{String(7 + i).padStart(2, '0')}h</span>)}
        </div>
        {medicos.map((m, i) => (
          <div key={String(m.id_profissional)} className="flex items-center border-t border-rule py-1.5">
            <div className="w-[180px] shrink-0 pr-3">
              <p className="truncate text-[13px] font-medium">{String(m.nome)}</p>
              <p className="truncate text-[11px] text-faint">{String(m.especialidades ?? '')}</p>
            </div>
            <div className="relative h-8 grow rounded-md bg-raised">
              {agora > ini && agora < fim && <span className="absolute top-0 bottom-0 z-10 w-px bg-negative" style={{ left: pos(agora) }} />}
              {consultas.filter((c) => c.id_medico === m.id_profissional).map((c) => {
                const ini2 = minutos(c.data_hora)
                return (
                  <motion.span key={String(c.id_consulta)} title={`${hora(c.data_hora)} · ${c.paciente} · ${situacaoConsulta(c.status)[0]}`}
                    initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.4, delay: 0.1 + i * 0.03 }}
                    className={cx('absolute top-1 bottom-1 origin-left rounded-[4px] border border-white', COR_STATUS[String(c.status)] ?? 'bg-control')}
                    style={{ left: pos(ini2), width: `calc(${(Number(c.duracao_min ?? 30) / (fim - ini)) * 100}% - 2px)` }} />
                )
              })}
            </div>
          </div>
        ))}
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted">
          {[['agendada', 'Agendada'], ['aguardando_triagem', 'Na triagem'], ['aguardando_atendimento', 'Aguardando médico'], ['realizada', 'Realizada'], ['cancelada', 'Cancelada']].map(([k, r]) => (
            <span key={k} className="flex items-center gap-1.5"><span className={cx('size-2.5 rounded-sm', COR_STATUS[k])} />{r}</span>
          ))}
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-px bg-negative" />Agora</span>
        </div>
      </div>
    </div>
  )
}

