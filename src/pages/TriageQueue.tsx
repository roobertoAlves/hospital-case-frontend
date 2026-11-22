import { HeartPulse } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useNotice } from '../components/notices'
import { Button, ButtonLink, PageHeader, Loading, Panel, Badge, Main, Priority, Table, Td, Th, Empty } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { formatTime, age, appointmentStatus } from '../lib/format'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>

export default function TriageQueue() {
  const navigate = useNavigate()
  const notify = useNotice()
  const { data, loading, error, reload } = useApi<{ queue: Row[]; recent: Row[]; classifications: Row[] }>('api/triage')
  const [starting, setStarting] = useState<number | null>(null)

  const start = async (id: number) => {
    setStarting(id)
    try {
      await post(`api/triage/${id}/start`)
      navigate(`/triagem/${id}`)
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Não foi possível iniciar.', false)
      reload()
    } finally { setStarting(null) }
  }

  if (loading && !data) return <Loading variant="table" />
  if (error || !data) return <Empty>{error?.message}</Empty>
  const waiting = data.queue.filter((c) => c.status === 'aguardando_triagem').length

  return (
    <>
      <PageHeader title="Fila de triagem" subtitle={`${waiting} aguardando · ${data.queue.length - waiting} em triagem agora · emergências primeiro, depois por ordem de chegada`}
        actions={<Button onClick={reload}>Atualizar</Button>} />
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Panel title="Pacientes que chegaram" meta="a recepção registra a chegada" noPadding>
          {data.queue.length === 0 ? <div className="p-5"><Empty icon={HeartPulse}>Ninguém aguardando triagem agora.</Empty></div> : (
            <Table header={<><Th className="w-20">Chegada</Th><Th>Paciente</Th><Th className="hidden md:table-cell">Consulta com</Th><Th>Situação</Th><Th /></>}>
              {data.queue.map((c) => {
                const id = Number(c.id_consulta)
                const inTriage = c.status === 'em_triagem'
                const [label, tone] = appointmentStatus(c.status)
                const years = age(c.data_nascimento)
                return (
                  <tr key={id}>
                    <Td className="num font-semibold">{formatTime(c.chegada_em)}</Td>
                    <Td><Main sub={c.tipo === 'emergencia' ? String(c.motivo_emergencia ?? '') : years !== null ? `${years} anos` : undefined}>
                      <span className="inline-flex flex-wrap items-center gap-2">{String(c.paciente)}{c.tipo === 'emergencia' && <Badge tone="negative">Emergência</Badge>}</span></Main></Td>
                    <Td className="hidden md:table-cell">{c.tipo === 'emergencia' ? <Main sub="médico plantonista">Pronto atendimento</Main>
                      : <Main sub={`${c.especialidade} · ${formatTime(c.data_hora)}`}>{String(c.medico)}</Main>}</Td>
                    <Td><Badge tone={tone}>{label}</Badge></Td>
                    <Td className="text-right">
                      {inTriage ? <ButtonLink to={`/triagem/${id}`} small>Continuar</ButtonLink>
                        : <Button small variant="primario" loading={starting === id} onClick={() => start(id)}>Iniciar triagem</Button>}
                    </Td>
                  </tr>
                )
              })}
            </Table>
          )}
        </Panel>
        <div className="grid content-start gap-5">
          <Panel title="Suas triagens de hoje" meta={String(data.recent.length)} delay={0.1}>
            {data.recent.length === 0 ? <p className="text-muted">Você ainda não registrou triagens hoje.</p> : (
              <ul className="divide-y divide-rule">
                {data.recent.map((t, i) => (
                  <li key={i}>
                    <Link to={`/triagem/${t.id_consulta}`} className="flex items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-raised">
                      <span className="num w-12 font-medium">{formatTime(t.registrado_em)}</span>
                      <span className="min-w-0 grow">
                        <span className="block truncate font-medium">{String(t.paciente)}</span>
                        <span className="block text-[12px] text-muted"><Priority color={t.cor_hex} name={t.prioridade} />{String(t.retificada) !== '0' ? ' · retificada' : ''}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Classificação de prioridade" delay={0.15}>
            <ul className="space-y-2">
              {data.classifications.map((p) => (
                <li key={String(p.id_classificacao)} className="flex items-center justify-between">
                  <Priority color={p.cor_hex} name={p.nome} />
                  <span className="text-[12px] text-muted">{Number(p.tempo_alvo_min) === 0 ? 'imediato' : `até ${p.tempo_alvo_min} min`}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}
