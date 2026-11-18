import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ReasonDialog, useNotice } from '../components/notices'
import { DayTimeline } from '../components/DayTimeline'
import { DayNavigator } from '../components/DayNavigator'
import { Button, ButtonLink, PageHeader, Loading, Panel, Badge, Main, Table, Td, Th, Empty } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { longDate, todayIso, formatTime, appointmentStatus } from '../lib/format'
import { useSession } from '../lib/session'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
interface Data { date: string; appointments: Row[]; doctors: Row[]; own_schedule: boolean }

export default function Appointments() {
  const { can } = useSession()
  const notify = useNotice()
  const [params, setParams] = useSearchParams()
  const day = params.get('data') ?? todayIso()
  const { data, loading, error, reload } = useApi<Data>('api/appointments', { date: day })
  const [cancel, setCancelling] = useState<Row | null>(null)
  const [busy, setBusy] = useState<number | null>(null)

  const action = async (url: string, body?: Record<string, unknown>) => {
    try { const r = await post(url, body); notify(r.message ?? 'Feito.'); reload() }
    catch (e) { notify(e instanceof ApiError ? e.message : 'Não foi possível concluir.', false) }
  }

  const appointments = data?.appointments ?? []
  const activeOnes = appointments.filter((c) => c.status !== 'cancelada').length
  const arrived = appointments.filter((c) => !['agendada', 'cancelada', 'ausente'].includes(String(c.status))).length
  const isToday = day === todayIso()

  return (
    <>
      <PageHeader
        title={data?.own_schedule ? 'Minha agenda' : 'Agenda de consultas'}
        subtitle={`${longDate(day)}${isToday ? ' (hoje)' : ''} · ${activeOnes} ${activeOnes === 1 ? 'consulta' : 'consultas'}, ${arrived} já na unidade`}
        actions={<>
          <DayNavigator date={day} onChange={(d) => setParams({ data: d })} />
          {can('consultas.agendar') && <ButtonLink to="/agenda/nova" variant="primario" icon={CalendarPlus}>Agendar consulta</ButtonLink>}
        </>}
      />
      {loading && !data ? <Loading /> : error ? <Empty>{error.message}</Empty> : data && (
        <div className="grid gap-5">
          {data.doctors.length > 0 && (
            <Panel title="Linha do dia" meta="uma linha por médico">
              <DayTimeline doctors={data.doctors} appointments={appointments} showNow={isToday} />
            </Panel>
          )}
          <Panel title="Consultas do dia" meta={`${appointments.length} no total`} noPadding delay={0.1}>
            {appointments.length === 0 ? <div className="p-5"><Empty>Nenhuma consulta neste dia.</Empty></div> : (
              <Table header={<><Th className="w-20">Hora</Th><Th>Paciente</Th><Th className="hidden md:table-cell">Médico</Th><Th>Situação</Th><Th /></>}>
                {appointments.map((c) => {
                  const st = String(c.status)
                  const [label, tone] = appointmentStatus(st)
                  const id = Number(c.id_consulta)
                  return (
                    <tr key={id}>
                      <Td className="num text-[15px] font-semibold">{formatTime(c.data_hora)}</Td>
                      <Td>
                        <Main sub={`${c.tipo === 'encaixe' ? 'Encaixe · ' : c.tipo === 'emergencia' ? 'Emergência · ' : ''}${c.especialidade}`}>
                          {can('pacientes.view') ? <Link to={`/pacientes/${c.id_paciente}`} className="hover:text-brand-700">{String(c.paciente)}</Link> : String(c.paciente)}
                        </Main>
                      </Td>
                      <Td className="hidden md:table-cell">{String(c.medico)}</Td>
                      <Td><Badge tone={tone}>{label}</Badge></Td>
                      <Td className="text-right whitespace-nowrap">
                        {can('consultas.chegada') && isToday && st === 'agendada' && (
                          <Button small loading={busy === id} onClick={async () => { setBusy(id); await action(`api/appointments/${id}/check-in`); setBusy(null) }}>Registrar chegada</Button>
                        )}
                        {can('consultas.remarcar') && st === 'agendada' && <ButtonLink to={`/agenda/${id}/remarcar`} variant="texto" small>Remarcar</ButtonLink>}
                        {can('consultas.cancelar') && (st === 'agendada' || st === 'aguardando_triagem') && (
                          <Button variant="perigoTexto" small onClick={() => setCancelling(c)}>Cancelar</Button>
                        )}
                      </Td>
                    </tr>
                  )
                })}
              </Table>
            )}
          </Panel>
        </div>
      )}
      <ReasonDialog
        open={!!cancel}
        title={cancel ? `Cancelar consulta das ${formatTime(cancel.data_hora)} de ${cancel.paciente}` : ''}
        help="O motivo fica registrado no histórico. O paciente recebe um aviso por e-mail, sem detalhes clínicos."
        buttonLabel="Confirmar cancelamento"
        onClose={() => setCancelling(null)}
        onConfirm={async (reason) => { await action(`api/appointments/${cancel!.id_consulta}/cancel`, { reason }); setCancelling(null) }}
      />
    </>
  )
}
