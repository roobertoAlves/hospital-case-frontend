import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { DayTimeline } from '../components/DayTimeline'
import { Loading, PageHeader, Kpi, Panel, Badge, Priority, FadeIn, Empty } from '../components/ui'
import { longDate, formatTime, appointmentStatus } from '../lib/format'
import { SHORTCUTS, visibleItems } from '../lib/menu'
import { useSession } from '../lib/session'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
interface DashboardData {
    today: string
    reception?: boolean; day_appointments?: number; arrived?: number; awaiting_triage?: number; day_exams?: number; cancelled?: number; next_arrivals?: Row[]
    timeline_doctors?: Row[]; timeline_appointments?: Row[]
    nursing?: boolean; triage_queue?: Row[]; by_priority?: Row[]
    doctor?: boolean; professional?: Row; my_schedule?: Row[]; doctor_queue?: Row[]; completed?: number
    admin?: boolean; active_patients?: number; active_professionals?: number; completed_this_month?: number; scheduled_ahead?: number; active_users?: number; blocked_users?: number
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function AppointmentList({ items, empty, link }: { items: Row[]; empty: string; link?: (c: Row) => string }) {
  if (!items.length) return <Empty>{empty}</Empty>
  return (
    <ul className="divide-y divide-rule">
      {items.map((c) => {
        const [label, tone] = appointmentStatus(c.status)
        const body = (
          <>
            <span className="num w-12 shrink-0 font-medium">{formatTime(c.time ?? c.data_hora)}</span>
            <span className="min-w-0 grow">
              <span className="block truncate font-medium">{String(c.paciente)}</span>
              <span className="block truncate text-[12px] text-muted">{String(c.medico ?? c.especialidade ?? '')}</span>
            </span>
            {c.prioridade ? <Priority color={c.cor_hex} name={c.prioridade} /> : c.status ? <Badge tone={tone}>{label}</Badge> : null}
          </>
        )
        return (
          <li key={String(c.id_consulta)}>
            {link ? <Link to={link(c)} className="flex items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-raised">{body}</Link>
              : <div className="flex items-center gap-3 px-1 py-2.5">{body}</div>}
          </li>
        )
      })}
    </ul>
  )
}

export default function Dashboard() {
  const { user } = useSession()
  const { data, loading, error } = useApi<DashboardData>('api/dashboard')
  if (loading && !data) return <Loading />
  if (error) return <Empty>{error.message}</Empty>
  const p = data!
  const shortcuts = visibleItems(SHORTCUTS, user?.permissions ?? [])

  return (
    <>
      <PageHeader title={`${greeting()}, ${user?.nome.split(' ')[0]}`} subtitle={`${longDate(p.today)} · ${user?.role_label}`} />

      {p.reception && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label="Consultas hoje" value={p.day_appointments} highlight />
          <Kpi label="Já chegaram" value={p.arrived} delay={0.05} />
          <Kpi label="Aguardando triagem" value={p.awaiting_triage} delay={0.1} />
          <Kpi label="Exames hoje" value={p.day_exams} delay={0.15} />
          <Kpi label="Canceladas hoje" value={p.cancelled} delay={0.2} />
        </div>
      )}
      {p.nursing && !p.reception && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Aguardando triagem" value={p.awaiting_triage} highlight />
          {(p.by_priority ?? []).slice(0, 3).map((c, i) => <Kpi key={String(c.codigo)} label={`Triados · ${c.nome}`} value={String(c.total)} delay={0.05 * (i + 1)} />)}
        </div>
      )}
      {p.doctor && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Consultas hoje" value={p.my_schedule?.filter((c) => c.status !== 'cancelada').length} highlight note={String(p.professional?.license ?? '')} />
          <Kpi label="Aguardando você" value={p.doctor_queue?.length} delay={0.05} />
          <Kpi label="Atendidos hoje" value={p.completed} delay={0.1} />
        </div>
      )}
      {p.admin && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Pacientes ativos" value={p.active_patients} highlight />
          <Kpi label="Profissionais ativos" value={p.active_professionals} delay={0.05} />
          <Kpi label="Realizadas no mês" value={p.completed_this_month} delay={0.1} />
          <Kpi label="Agendadas à frente" value={p.scheduled_ahead} delay={0.15} />
          <Kpi label="Usuários ativos" value={p.active_users} delay={0.2} />
          <Kpi label="Bloqueados por senha" value={p.blocked_users} delay={0.25} />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        {p.reception && (
          <Panel title="Próximas chegadas" meta="ainda não chegaram" className="xl:col-span-1">
            <AppointmentList items={p.next_arrivals ?? []} empty="Ninguém mais previsto para hoje." />
          </Panel>
        )}
        {p.nursing && (
          <Panel title="Fila de triagem" meta={<Link to="/triagem" className="text-brand-700 hover:underline">abrir fila</Link>}>
            <AppointmentList items={p.triage_queue ?? []} empty="Ninguém aguardando triagem." link={() => '/triagem'} />
          </Panel>
        )}
        {p.nursing && (
          <Panel title="Triados hoje por prioridade">
            <ul className="space-y-2.5">
              {(p.by_priority ?? []).map((c) => {
                const max = Math.max(1, ...(p.by_priority ?? []).map((x) => Number(x.total)))
                return (
                  <li key={String(c.codigo)} className="grid grid-cols-[140px_1fr_32px] items-center gap-3 text-[13px]">
                    <Priority color={c.cor_hex} name={c.nome} />
                    <span className="h-2 overflow-hidden rounded-full bg-raised">
                      <motion.span className="block h-full rounded-full" style={{ background: String(c.cor_hex) }} initial={{ width: 0 }} animate={{ width: `${(Number(c.total) / max) * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                    </span>
                    <span className="num text-right">{String(c.total)}</span>
                  </li>
                )
              })}
            </ul>
          </Panel>
        )}
        {p.doctor && (
          <Panel title="Aguardando atendimento" meta="pela prioridade da triagem">
            <AppointmentList items={p.doctor_queue ?? []} empty="Ninguém aguardando você agora." link={(c) => `/atendimento/${c.id_consulta}`} />
          </Panel>
        )}
        {p.doctor && (
          <Panel title="Minha agenda de hoje" className="xl:col-span-2">
            <AppointmentList items={p.my_schedule ?? []} empty="Sem consultas hoje." />
          </Panel>
        )}
        <Panel title="Seus atalhos" className={p.doctor ? '' : 'xl:col-span-2'}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {shortcuts.map((a, i) => (
              <FadeIn key={a.label} delay={0.04 * i}>
                <Link to={a.to} className="group flex h-full items-center gap-3 rounded-[var(--radius-card)] border border-line p-3 transition-colors hover:border-brand-200 hover:bg-brand-50">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-raised text-brand-700 group-hover:bg-white"><a.icon className="size-[18px]" /></span>
                  <span className="grow text-[13px] font-medium">{a.label}</span>
                  <ArrowRight className="size-4 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </FadeIn>
            ))}
          </div>
        </Panel>
      </div>

      {p.timeline_doctors && p.timeline_doctors.length > 0 && (
        <Panel title="Linha do dia" meta={`${p.timeline_doctors.length} médicos atendendo hoje`} className="mt-5">
          <DayTimeline doctors={p.timeline_doctors} appointments={p.timeline_appointments ?? []} />
        </Panel>
      )}
    </>
  )
}
