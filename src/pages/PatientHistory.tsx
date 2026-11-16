import { useParams } from 'react-router'
import { Alert, PageHeader, Loading, Panel, Badge, Priority, Table, Td, Th, Empty } from '../components/ui'
import { formatDate, formatDateTime, appointmentStatus, examStatus } from '../lib/format'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
interface Data {
  patient: Row; level: 'MEDICO' | 'ENFERMAGEM' | 'ADMINISTRATIVO'
  allergies?: Row[]; medical_records?: Row[]; prescriptions?: Row[]; exam_requests?: Row[]; triages?: Row[]; administrative?: Row[]
}

const n = (v: unknown) => (v == null ? '—' : String(v).replace(/\.0+$/, '').replace('.', ','))

/** Historico filtrado por perfil (decidido no backend: HistoricoController.nivel). */
export default function PatientHistory() {
  const { id } = useParams()
  const { data, loading, error } = useApi<Data>(`api/pacientes/${id}/historico`)
  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message ?? 'Histórico indisponível.'}</Empty>
  const p = data.patient
  const doctor = data.level === 'MEDICO'
  const clinical = doctor || data.level === 'ENFERMAGEM'
  const allergies = data.allergies ?? []

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Pacientes', to: '/pacientes' }, { label: String(p.nome), to: `/pacientes/${id}` }, { label: 'Histórico' }]}
        title={`Histórico de ${p.nome}`}
        subtitle={`${doctor ? 'Visão médica: atendimentos, triagens, receitas e exames.' : clinical ? 'Visão da enfermagem: triagens e alergias.' : 'Visão administrativa: consultas e exames agendados, sem dados clínicos.'} O acesso fica registrado na auditoria.`}
      />
      {clinical && (
        <div className="mb-5">
          <Alert tone={allergies.length ? 'erro' : 'nota'}>
            <strong>Alergias:</strong>{' '}
            {allergies.length ? allergies.map((a, i) => <span key={i}>{i > 0 && ' · '}{String(a.substancia)}{a.gravidade ? ` (${a.gravidade})` : ''}</span>) : 'nenhuma registrada.'}
          </Alert>
        </div>
      )}
      <div className="grid gap-5">
        {doctor && (
          <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
            <Panel title="Atendimentos" meta={`${data.medical_records?.length ?? 0} finalizados`}>
              {!data.medical_records?.length ? <p className="text-muted">Nenhum atendimento finalizado.</p> : (
                <ul className="divide-y divide-rule">
                  {data.medical_records.map((r, i) => (
                    <li key={i} className="py-3 first:pt-0">
                      <p className="mb-1 text-[12px] text-muted">{formatDate(r.data_hora)} · {String(r.medico)} · {String(r.especialidade)}</p>
                      <p><strong>Queixa:</strong> {String(r.queixa_principal ?? '—')}</p>
                      <p><strong>Hipóteses:</strong> {String(r.hipoteses_diagnosticas ?? '—')}</p>
                      <p className="whitespace-pre-wrap"><strong>Conduta:</strong> {String(r.conduta ?? '—')}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <div className="grid content-start gap-5">
              <Panel title="Receitas" delay={0.08}>
                {!data.prescriptions?.length ? <p className="text-muted">Nenhuma receita.</p> : (
                  <ul className="divide-y divide-rule">
                    {data.prescriptions.map((r, i) => (
                      <li key={i} className="py-2.5 first:pt-0 text-[13px]">
                        <p className="text-[12px] text-muted">{formatDate(r.emitida_em)} · {String(r.medico)}{r.status === 'cancelada' ? ' · cancelada' : ''}</p>
                        {(r.itens as Row[]).map((it, k) => <p key={k}>{String(it.medicamento)} {String(it.dosagem)} · {String(it.frequencia)}</p>)}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel title="Exames solicitados" delay={0.12}>
                {!data.exam_requests?.length ? <p className="text-muted">Nenhum exame.</p> : (
                  <ul className="divide-y divide-rule">
                    {data.exam_requests.map((e, i) => (
                      <li key={i} className="py-2.5 first:pt-0">
                        <p className="font-medium">{String(e.nome_exame)}</p>
                        <p className="text-[12px] text-muted">{formatDate(e.solicitado_em)} · {String(e.medico)}{e.status === 'cancelado' ? ' · cancelado' : ''}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        )}
        {clinical && (
          <Panel title="Triagens" meta="inclui versões retificadas" noPadding delay={0.1}>
            {!data.triages?.length ? <div className="p-5"><Empty>Nenhuma triagem.</Empty></div> : (
              <Table header={<><Th>Data</Th><Th>Prioridade</Th><Th>PA</Th><Th className="hidden md:table-cell">FC</Th><Th className="hidden md:table-cell">Temp.</Th><Th className="hidden md:table-cell">SpO₂</Th><Th>Queixa</Th><Th className="hidden lg:table-cell">Enfermeiro</Th></>}>
                {data.triages.map((t, i) => (
                  <tr key={i} title={t.retifica_id ? `Retificação: ${t.motivo_retificacao}` : undefined}>
                    <Td className="num whitespace-nowrap">{formatDateTime(t.registrado_em)}{t.retifica_id ? <span className="block text-[12px] text-muted">retificação</span> : null}</Td>
                    <Td><Priority color={t.cor_hex} name={t.prioridade} /></Td>
                    <Td className="num">{t.pa_sistolica != null ? `${n(t.pa_sistolica)}/${n(t.pa_diastolica)}` : '—'}</Td>
                    <Td className="num hidden md:table-cell">{n(t.frequencia_cardiaca)}</Td>
                    <Td className="num hidden md:table-cell">{n(t.temperatura)}</Td>
                    <Td className="num hidden md:table-cell">{n(t.saturacao_o2)}</Td>
                    <Td>{String(t.queixa_principal)}</Td>
                    <Td className="hidden lg:table-cell">{String(t.enfermeiro)}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
        )}
        <Panel title="Consultas e exames agendados" meta="últimos 50" noPadding delay={0.14}>
          {!data.administrative?.length ? <div className="p-5"><Empty>Nada agendado ainda.</Empty></div> : (
            <Table header={<><Th>Data</Th><Th>Tipo</Th><Th>Descrição</Th><Th>Situação</Th></>}>
              {data.administrative.map((h, i) => {
                const exam = h.tipo === 'exame'
                const [label, tone] = exam ? examStatus(h.status) : appointmentStatus(h.status)
                return (
                  <tr key={i}>
                    <Td className="num whitespace-nowrap">{formatDateTime(h.data_hora)}</Td>
                    <Td>{exam ? 'Exame' : 'Consulta'}</Td>
                    <Td>{String(h.descricao)}{h.motivo_cancelamento ? <span className="block text-[12px] text-muted">{String(h.motivo_cancelamento)}</span> : null}</Td>
                    <Td><Badge tone={tone}>{label}</Badge></Td>
                  </tr>
                )
              })}
            </Table>
          )}
        </Panel>
      </div>
    </>
  )
}
