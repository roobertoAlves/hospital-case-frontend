import { Stethoscope } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Alert, Button, PageHeader, Loading, Panel, Badge, Main, Priority, Table, Td, Th, Empty } from '../components/ui'
import { formatTime, age, appointmentStatus } from '../lib/format'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>

export default function EncounterQueue() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApi<{ queue: Row[]; no_professional_record?: boolean }>('api/encounters')
  if (loading && !data) return <Loading variant="table" />
  if (error || !data) return <Empty>{error?.message}</Empty>
  const waiting = data.queue.filter((c) => c.status === 'aguardando_atendimento').length

  return (
    <>
      <PageHeader title="Fila de atendimento" subtitle={`${waiting} aguardando · ordenada pela prioridade da triagem e, depois, pela chegada`}
        actions={<Button onClick={reload}>Atualizar</Button>} />
      {data.no_professional_record && <div className="mb-4"><Alert tone="erro">Seu usuário não está ligado a um médico ativo. Peça à administração para vincular o cadastro.</Alert></div>}
      <Panel noPadding>
        {data.queue.length === 0 ? <div className="p-5"><Empty icon={Stethoscope}>Ninguém aguardando atendimento agora.</Empty></div> : (
          <Table header={<><Th>Prioridade</Th><Th>Paciente</Th><Th className="hidden lg:table-cell">Queixa (triagem)</Th><Th className="hidden md:table-cell w-20">Chegada</Th><Th>Situação</Th><Th /></>}>
            {data.queue.map((c) => {
              const [label, tone] = appointmentStatus(c.status)
              const years = age(c.data_nascimento)
              const inEncounter = c.status === 'em_atendimento'
              return (
                <tr key={String(c.id_consulta)} className="cursor-pointer" onClick={() => navigate(`/atendimento/${c.id_consulta}`)}>
                  <Td>{c.prioridade ? <Priority color={c.cor_hex} name={c.prioridade} /> : <span className="text-faint">—</span>}</Td>
                  <Td><Main sub={`${years !== null ? `${years} anos · ` : ''}${c.especialidade}${c.medico_original ? ` · tirado da agenda de ${c.medico_original}` : ''}`}>
                    <span className="inline-flex flex-wrap items-center gap-2">{String(c.paciente)}{c.tipo === 'emergencia' && <Badge tone="negative">Emergência</Badge>}</span></Main></Td>
                  <Td className="hidden max-w-[320px] truncate text-muted lg:table-cell">{String(c.queixa_principal ?? c.motivo_emergencia ?? '')}</Td>
                  <Td className="num hidden md:table-cell">{formatTime(c.chegada_em)}</Td>
                  <Td><Badge tone={tone}>{label}</Badge></Td>
                  <Td className="text-right"><Button small variant={inEncounter ? 'secundario' : 'primario'}>{inEncounter ? 'Continuar' : 'Chamar e atender'}</Button></Td>
                </tr>
              )
            })}
          </Table>
        )}
      </Panel>
    </>
  )
}
