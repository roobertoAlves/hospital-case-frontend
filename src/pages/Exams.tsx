import { FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ReasonDialog, useNotice } from '../components/notices'
import { DayNavigator } from '../components/DayNavigator'
import { Button, ButtonLink, PageHeader, Loading, Panel, Badge, Main, Table, Td, Th, Empty } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { longDate, todayIso, formatTime, examStatus } from '../lib/format'
import { useSession } from '../lib/session'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>

export default function Exams() {
  const { can } = useSession()
  const notify = useNotice()
  const [params, setParams] = useSearchParams()
  const day = params.get('data') ?? todayIso()
  const { data, loading, error, reload } = useApi<{ date: string; exams: Row[]; locations: Row[] }>('api/exames', { data: day })
  const [cancel, setCancelling] = useState<Row | null>(null)
  const canChange = can('exames.agendar')

  const action = async (url: string, body?: Record<string, unknown>) => {
    try { const r = await post(url, body); notify(r.message ?? 'Feito.'); reload() }
    catch (e) { notify(e instanceof ApiError ? e.message : 'Não foi possível concluir.', false) }
  }
  const exams = data?.exams ?? []
  const activeOnes = exams.filter((x) => x.status !== 'cancelado').length
  const done = exams.filter((x) => x.status === 'realizado').length

  return (
    <>
      <PageHeader
        title="Agenda de exames"
        subtitle={`${longDate(day)}${day === todayIso() ? ' (hoje)' : ''} · ${activeOnes} ${activeOnes === 1 ? 'exame' : 'exames'}, ${done} realizados`}
        actions={<>
          <DayNavigator date={day} onChange={(d) => setParams({ data: d })} />
          {canChange && <ButtonLink to="/exames/novo" variant="primario" icon={FlaskConical}>Agendar exame</ButtonLink>}
        </>}
      />
      {loading && !data ? <Loading /> : error ? <Empty>{error.message}</Empty> : (
        <div className="grid gap-5">
          {(data?.locations ?? []).map((l, i) => {
            const atLocation = exams.filter((x) => x.id_local === l.id_local)
            return (
              <Panel key={String(l.id_local)} title={String(l.nome)} meta={`atende ${formatTime(l.hora_inicio)}–${formatTime(l.hora_fim)} · ${atLocation.length} no dia`} noPadding delay={0.05 * i}>
                {atLocation.length === 0 ? <p className="px-5 py-4 text-muted">Nenhum exame neste local no dia.</p> : (
                  <Table header={<><Th className="w-20">Hora</Th><Th>Paciente</Th><Th>Exame</Th><Th>Situação</Th><Th /></>}>
                    {atLocation.map((x) => {
                      const [label, tone] = examStatus(x.status)
                      const id = x.id_exame_agendado
                      return (
                        <tr key={String(id)}>
                          <Td className="num text-[15px] font-semibold">{formatTime(x.data_hora)}</Td>
                          <Td>{can('pacientes.view') ? <Link to={`/pacientes/${x.id_paciente}`} className="hover:text-brand-700">{String(x.paciente)}</Link> : String(x.paciente)}</Td>
                          <Td><Main sub={`${x.duracao_min} min`}>{String(x.exame)}</Main></Td>
                          <Td><Badge tone={tone}>{label}</Badge></Td>
                          <Td className="text-right whitespace-nowrap">
                            {canChange && x.status === 'agendado' && <>
                              <Button small onClick={() => action(`api/exames-agendados/${id}/situacao`, { situacao: 'realizado' })}>Realizado</Button>
                              <Button small variant="texto" onClick={() => action(`api/exames-agendados/${id}/situacao`, { situacao: 'ausente' })}>Faltou</Button>
                              <Button small variant="perigoTexto" onClick={() => setCancelling(x)}>Cancelar</Button>
                            </>}
                          </Td>
                        </tr>
                      )
                    })}
                  </Table>
                )}
              </Panel>
            )
          })}
        </div>
      )}
      <ReasonDialog
        open={!!cancel}
        title={cancel ? `Cancelar ${cancel.exame} de ${cancel.paciente}` : ''}
        help="O motivo fica registrado. O paciente recebe um aviso por e-mail, sem o nome do exame."
        buttonLabel="Confirmar cancelamento"
        onClose={() => setCancelling(null)}
        onConfirm={async (reason) => { await action(`api/exames-agendados/${cancel!.id_exame_agendado}/cancelar`, { reason }); setCancelling(null) }}
      />
    </>
  )
}
