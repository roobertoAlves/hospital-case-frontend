import { CalendarPlus, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Dialog, ReasonDialog, useNotice } from '../../components/notices'
import { SlotGrid, type Slot } from '../../components/booking'
import { Button, PageHeader, Field, Loading, Input, Panel, Badge, Select, Empty } from '../../components/ui'
import { ApiError, get, post } from '../../lib/api'
import { formatDate, todayIso, formatTime, appointmentStatus } from '../../lib/format'
import { useApi } from '../../lib/useApi'

type Row = Record<string, unknown>

function Scheduler({ specialties, today, fixed, onConfirm, buttonLabel }: {
  specialties: Row[]; today: string; fixed?: { specialty: string; doctor: string }; onConfirm: (v: { specialty: string; doctor: string; date: string; time: string }) => Promise<void>; buttonLabel: string
}) {
  const [specialty, setSpecialty] = useState(fixed?.specialty ?? '')
  const [doctors, setDoctors] = useState<Row[] | null>(null)
  const [doctor, setDoctor] = useState(fixed?.doctor ?? '')
  const [day, setDay] = useState(today)
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [h, setH] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!specialty) { setDoctors(null); return }
    get<Row[]>('api/appointments/doctors', { specialty: specialty }).then((r) => setDoctors(r.data)).catch(() => setDoctors([]))
  }, [specialty])
  useEffect(() => {
    setH('')
    if (!doctor || !day) { setSlots(null); return }
    setLoading(true)
    get<Slot[]>('api/appointments/slots', { doctor, date: day }).then((r) => setSlots(r.data)).catch(() => setSlots([])).finally(() => setLoading(false))
  }, [doctor, day])

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Especialidade" name="espP">
          <Select name="espP" value={specialty} disabled={!!fixed} onChange={(e) => { setSpecialty(e.target.value); setDoctor('') }}>
            <option value="">Escolha…</option>
            {specialties.map((e) => <option key={String(e.id_especialidade)} value={String(e.id_especialidade)}>{String(e.nome)}</option>)}
          </Select>
        </Field>
        <Field label="Médico" name="medP">
          <Select name="medP" value={doctor} disabled={!doctors} onChange={(e) => setDoctor(e.target.value)}>
            <option value="">{doctors ? 'Escolha…' : 'Escolha a especialidade'}</option>
            {(doctors ?? []).map((m) => <option key={String(m.id_profissional)} value={String(m.id_profissional)}>{String(m.nome)}</option>)}
          </Select>
        </Field>
        <Field label="Data" name="diaP"><Input name="diaP" type="date" min={today} value={day} onChange={(e) => setDay(e.target.value)} /></Field>
      </div>
      <SlotGrid slots={slots} loading={loading} selected={h} onChoose={setH} emptyText="O médico não atende nesse dia. Tente outra data." />
      <div className="flex justify-end">
        <Button variant="primario" disabled={!doctor || !h} loading={sending} onClick={async () => { setSending(true); try { await onConfirm({ specialty, doctor, date: day, time: h }) } finally { setSending(false) } }}>{buttonLabel}</Button>
      </div>
    </div>
  )
}

export default function MyAppointments() {
  const notify = useNotice()
  const { data, loading, error, reload } = useApi<{ appointments: Row[]; specialties: Row[]; today: string }>('api/portal/appointments')
  const [mark, setMark] = useState(false)
  const [reschedule, setRescheduling] = useState<Row | null>(null)
  const [cancel, setCancelling] = useState<Row | null>(null)

  const call = async (url: string, body?: Record<string, unknown>) => {
    try { const r = await post(url, body); notify(r.message ?? 'Feito.'); await reload(); return true }
    catch (e) { notify(e instanceof ApiError ? e.message : 'Não foi possível concluir.', false); return false }
  }

  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message}</Empty>
  const n = new Date()
  const now = `${todayIso()}T${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
  const upcoming = data.appointments.filter((c) => String(c.data_hora) >= now && !['cancelada', 'ausente', 'realizada'].includes(String(c.status))).reverse()
  const previous = data.appointments.filter((c) => !upcoming.includes(c))

  return (
    <>
      <PageHeader title="Minhas consultas" subtitle="Marque, confirme a presença, remarque ou cancele." actions={<Button variant="primario" icon={CalendarPlus} onClick={() => setMark((m) => !m)}>Marcar consulta</Button>} />
      {mark && (
        <Panel title="Marcar consulta" className="mb-5">
          <Scheduler specialties={data.specialties} today={data.today} buttonLabel="Confirmar consulta"
            onConfirm={async (v) => { if (await call('api/portal/appointments', { id_especialidade: v.specialty, id_medico: v.doctor, date: v.date, time: v.time })) setMark(false) }} />
        </Panel>
      )}
      <Panel title="Próximas" meta={String(upcoming.length)} className="mb-5">
        {upcoming.length === 0 ? <p className="text-muted">Nenhuma consulta marcada.</p> : (
          <ul className="divide-y divide-rule">
            {upcoming.map((c) => {
              const [label, tone] = appointmentStatus(c.status)
              return (
                <li key={String(c.id_consulta)} className="flex flex-wrap items-center gap-3 py-3.5 first:pt-0">
                  <span className="flex w-16 flex-col items-center rounded-xl bg-brand-50 py-2 text-brand-900">
                    <span className="text-[20px] leading-none font-semibold">{String(c.data_hora).slice(8, 10)}</span>
                    <span className="text-[11px] uppercase">{new Date(String(c.data_hora)).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                  </span>
                  <span className="min-w-0 grow">
                    <span className="block font-medium">{String(c.especialidade)} · {formatTime(c.data_hora)}</span>
                    <span className="block text-[13px] text-muted">{String(c.medico)}</span>
                    {c.confirmada_em ? <span className="mt-1 inline-flex items-center gap-1 text-[12px] text-positive"><CheckCircle2 className="size-3.5" /> presença confirmada</span> : <Badge tone={tone}>{label}</Badge>}
                  </span>
                  {c.status === 'agendada' && (
                    <span className="flex flex-wrap gap-1">
                      {!c.confirmada_em && <Button small variant="primario" onClick={() => call(`api/portal/appointments/${c.id_consulta}/confirm`)}>Confirmar presença</Button>}
                      <Button small onClick={() => setRescheduling(c)}>Remarcar</Button>
                      <Button small variant="perigoTexto" onClick={() => setCancelling(c)}>Cancelar</Button>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
      <Panel title="Histórico" meta={String(previous.length)} delay={0.08}>
        {previous.length === 0 ? <p className="text-muted">Nada por aqui ainda.</p> : (
          <ul className="divide-y divide-rule">
            {previous.map((c) => {
              const rescheduled = !!c.remarcada_para
              const [label, tone] = rescheduled ? ['Remarcada', 'accent' as const] : appointmentStatus(c.status)
              const reason = String(c.motivo_cancelamento ?? '').replace(/^Remarcada para [^·]*·?\s*/, '')
              return (
                <li key={String(c.id_consulta)} className="flex items-center gap-3 py-3 first:pt-0">
                  <span className="grow"><span className="block font-medium">{String(c.especialidade)}</span>
                    <span className="block text-[13px] text-muted">{formatDate(c.data_hora)} às {formatTime(c.data_hora)} · {String(c.medico)}</span>
                    {rescheduled && <span className="block text-[12px] text-brand-700">Novo horário: {formatDate(c.remarcada_para)} às {formatTime(c.remarcada_para)}{reason ? ` · ${reason}` : ''}</span>}
                    {!rescheduled && c.motivo_cancelamento ? <span className="block text-[12px] text-faint">{String(c.motivo_cancelamento)}</span> : null}</span>
                  <Badge tone={tone}>{label}</Badge>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
      <Dialog open={!!reschedule} onClose={() => setRescheduling(null)} title="Remarcar consulta" width="max-w-2xl">
        {reschedule && <Scheduler specialties={data.specialties} today={data.today} fixed={{ specialty: String(reschedule.id_especialidade), doctor: String(reschedule.id_medico) }} buttonLabel="Confirmar novo horário"
          onConfirm={async (v) => { if (await call(`api/portal/appointments/${reschedule.id_consulta}/reschedule`, { id_medico: v.doctor, date: v.date, time: v.time, reason: 'pelo portal' })) setRescheduling(null) }} />}
      </Dialog>
      <ReasonDialog open={!!cancel} title="Cancelar consulta" help="O horário fica livre para outra pessoa. Você recebe a confirmação por e-mail." buttonLabel="Cancelar consulta"
        onClose={() => setCancelling(null)} onConfirm={async (reason) => { await call(`api/portal/appointments/${cancel!.id_consulta}/cancel`, { reason }); setCancelling(null) }} />
    </>
  )
}
