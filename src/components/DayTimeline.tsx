import { motion } from 'motion/react'
import { formatTime, appointmentStatus } from '../lib/format'
import { cx } from './ui'

type Row = Record<string, unknown>

const STATUS_COLOR: Record<string, string> = {
  realizada: 'bg-[#bfe9cf]', cancelada: 'bg-[#f6cfcb]', ausente: 'bg-[#dde2ea]', agendada: 'bg-brand-100',
  aguardando_triagem: 'bg-[#ffe3a6]', em_triagem: 'bg-[#ffe3a6]', aguardando_atendimento: 'bg-brand-200', em_atendimento: 'bg-brand-500',
}

export function DayTimeline({ doctors, appointments, showNow = true }: { doctors: Row[]; appointments: Row[]; showNow?: boolean }) {
  const start = 7 * 60, end = 19 * 60
  const pos = (min: number) => `${((min - start) / (end - start)) * 100}%`
  const minutes = (v: unknown) => { const m = String(v ?? '').match(/T?(\d{2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : 0 }
  const now = showNow ? new Date().getHours() * 60 + new Date().getMinutes() : -1
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="ml-[180px] flex justify-between pb-2 text-[11px] text-faint">
          {Array.from({ length: 13 }, (_, i) => <span key={i} className="num w-0">{String(7 + i).padStart(2, '0')}h</span>)}
        </div>
        {doctors.map((m, i) => (
          <div key={String(m.id_profissional)} className="flex items-center border-t border-rule py-1.5">
            <div className="w-[180px] shrink-0 pr-3">
              <p className="truncate text-[13px] font-medium">{String(m.nome)}</p>
              <p className="truncate text-[11px] text-faint">{String(m.especialidades ?? '')}</p>
            </div>
            <div className="relative h-8 grow rounded-md bg-raised">
              {now > start && now < end && <span className="absolute top-0 bottom-0 z-10 w-px bg-negative" style={{ left: pos(now) }} />}
              {appointments.filter((c) => c.id_medico === m.id_profissional).map((c) => {
                const start2 = minutes(c.data_hora)
                return (
                  <motion.span key={String(c.id_consulta)} title={`${formatTime(c.data_hora)} · ${c.paciente} · ${appointmentStatus(c.status)[0]}`}
                    initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.4, delay: 0.1 + i * 0.03 }}
                    className={cx('absolute top-1 bottom-1 origin-left rounded-[4px] border border-white', STATUS_COLOR[String(c.status)] ?? 'bg-control')}
                    style={{ left: pos(start2), width: `calc(${(Number(c.duracao_min ?? 30) / (end - start)) * 100}% - 2px)` }} />
                )
              })}
            </div>
          </div>
        ))}
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted">
          {[['agendada', 'Agendada'], ['aguardando_triagem', 'Na triagem'], ['aguardando_atendimento', 'Aguardando médico'], ['realizada', 'Realizada'], ['cancelada', 'Cancelada']].map(([k, r]) => (
            <span key={k} className="flex items-center gap-1.5"><span className={cx('size-2.5 rounded-sm', STATUS_COLOR[k])} />{r}</span>
          ))}
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-px bg-negative" />Agora</span>
        </div>
      </div>
    </div>
  )
}

