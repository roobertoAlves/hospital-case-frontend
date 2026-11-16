import { CalendarPlus, FileText, FlaskConical, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { useNotice } from '../components/notices'
import { Button, ButtonLink, PageHeader, Loading, Input, Panel, Badge, Table, Td, Th, Empty } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { formattedCpf, formatDate, formatDateTime, age, or, appointmentStatus, examStatus } from '../lib/format'
import { useSession } from '../lib/session'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>

const SEX: Record<string, string> = { feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro', nao_informado: 'Prefere não informar' }

export default function PatientRecord() {
  const { id } = useParams()
  const { can } = useSession()
  const notify = useNotice()
  const { data, loading, error, reload } = useApi<{ patient: Row; history: Row[] }>(`api/patients/${id}`)
  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message ?? 'Paciente não encontrado.'}</Empty>
  const p = data.patient
  const active = Number(p.ativo) === 1
  const endereco = ['logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'].map((k) => p[k]).filter(Boolean).join(', ')
    + (p.cep ? ` · CEP ${String(p.cep).slice(0, 5)}-${String(p.cep).slice(5)}` : '')

  const toggle = async () => {
    try {
      const r = await post(`api/patients/${id}/status`, { active: active ? '0' : '1' })
      notify(r.message ?? 'Situação alterada.')
      reload()
    } catch (e) { notify(e instanceof ApiError ? e.message : 'Não foi possível alterar.', false) }
  }

  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-rule py-2.5 last:border-0">
      <dt className="text-muted">{label}</dt><dd className="min-w-0">{value}</dd>
    </div>
  )

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Pacientes', to: '/pacientes' }, { label: 'Ficha' }]}
        title={String(p.nome)}
        subtitle={<span className="flex flex-wrap items-center gap-2">{age(p.data_nascimento)} anos · CPF {formattedCpf(p.cpf)} <Badge tone={active ? 'positive' : 'neutral'}>{active ? 'Ativo' : 'Inativo'}</Badge></span>}
        actions={<>
          {can('pacientes.inativar') && <Button variant={active ? 'perigoTexto' : 'texto'} onClick={toggle}>{active ? 'Inativar' : 'Reativar'}</Button>}
          {can('historico.view') && <ButtonLink to={`/pacientes/${id}/historico`} icon={FileText}>Histórico</ButtonLink>}
          {can('pacientes.edit') && <ButtonLink to={`/pacientes/${id}/editar`} icon={Pencil}>Editar cadastro</ButtonLink>}
          {active && can('exames.agendar') && <ButtonLink to={`/exames/novo?paciente=${id}`} icon={FlaskConical}>Agendar exame</ButtonLink>}
          {active && can('consultas.agendar') && <ButtonLink to={`/agenda/nova?paciente=${id}`} variant="primario" icon={CalendarPlus}>Agendar consulta</ButtonLink>}
        </>}
      />
      <div className="grid gap-5 xl:grid-cols-[5fr_7fr]">
        <Panel title="Dados cadastrais" meta={`atualizado em ${formatDateTime(p.atualizado_em)}`}>
          <dl>
            {row('Nascimento', <span className="num">{formatDate(p.data_nascimento)}</span>)}
            {row('Sexo', SEX[String(p.sexo)] ?? '—')}
            {row('Telefone', <span className="num">{or(p.telefone)}</span>)}
            {row('E-mail', or(p.email))}
            {row('Endereço', or(endereco))}
            {row('Emergência', p.contato_emergencia_nome ? <>{String(p.contato_emergencia_nome)}{p.contato_emergencia_parentesco ? ` (${p.contato_emergencia_parentesco})` : ''}<span className="num block text-[12px] text-muted">{or(p.contato_emergencia_telefone)}</span></> : '—')}
            {row('Cadastrado em', <span className="num">{formatDateTime(p.criado_em)}</span>)}
          </dl>
        </Panel>
        <Panel title="Consultas e exames" meta={`${data.history.length} registros · mais recentes primeiro`} noPadding delay={0.1}>
          {data.history.length === 0 ? <div className="p-5"><Empty>Nenhuma consulta ou exame agendado.</Empty></div> : (
            <Table header={<><Th>Data</Th><Th>Tipo</Th><Th>Detalhe</Th><Th>Situação</Th></>}>
              {data.history.map((h, i) => {
                const appointment = h.tipo === 'consulta'
                const [label, tone] = appointment ? appointmentStatus(h.status) : examStatus(h.status)
                return (
                  <tr key={i}>
                    <Td className="num whitespace-nowrap">{formatDateTime(h.data_hora)}</Td>
                    <Td>{appointment ? 'Consulta' : 'Exame'}</Td>
                    <Td>{String(h.descricao)}{h.motivo_cancelamento ? <span className="block text-[12px] text-muted">Motivo: {String(h.motivo_cancelamento)}</span> : null}</Td>
                    <Td><Badge tone={tone}>{label}</Badge></Td>
                  </tr>
                )
              })}
            </Table>
          )}
        </Panel>
      </div>
      <PortalAccount patientId={String(id)} hasAccount={p.id_usuario != null} hasEmail={!!p.email} onLink={reload} />
    </>
  )
}

/** Portal account status; reception links the account when the record has no e-mail. */
function PortalAccount({ patientId, hasAccount, hasEmail, onLink }: { patientId: string; hasAccount: boolean; hasEmail: boolean; onLink: () => void }) {
  const { can } = useSession()
  const notify = useNotice()
  const [email, setEmail] = useState('')
  return (
    <Panel title="Portal do paciente" className="mt-5" delay={0.12}>
      {hasAccount ? <p><Badge tone="positive">Conta ativa</Badge> <span className="ml-2 text-muted">O paciente agenda, confirma e acompanha pelo portal.</span></p> : (
        <>
          <p className="text-muted">Sem conta no portal. {hasEmail ? 'Ao se cadastrar com o CPF, o paciente recebe um código no e-mail da ficha.' : 'A ficha não tem e-mail: depois que o paciente criar a conta no portal, ligue aqui pelo e-mail de login dele (com documento em mãos).'}</p>
          {can('pacientes.vincular_conta') && (
            <form className="mt-3 flex max-w-[520px] gap-2" onSubmit={async (e) => {
              e.preventDefault()
              try { const r = await post(`api/patients/${patientId}/account`, { email }); notify(r.message ?? 'Conta ligada.'); onLink() }
              catch (err) { notify(err instanceof ApiError ? err.message : 'Não foi possível ligar.', false) }
            }}>
              <label htmlFor="emailConta" className="sr-only">E-mail da conta do portal</label>
              <Input id="emailConta" type="email" placeholder="E-mail de login do paciente no portal" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit" disabled={!email.includes('@')}>Ligar conta</Button>
            </form>
          )}
        </>
      )}
    </Panel>
  )
}
