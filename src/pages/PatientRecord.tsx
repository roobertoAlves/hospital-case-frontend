import { AlertTriangle, CalendarPlus, FileText, FlaskConical, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { useNotice } from '../components/notices'
import { Button, ButtonLink, PageHeader, Loading, Input, Panel, Badge, Main, Priority, Table, Td, Th, Empty } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { formattedCpf, formatDate, formatDateTime, age, or, appointmentStatus, examStatus } from '../lib/format'
import { useSession } from '../lib/session'
import { useApi } from '../lib/useApi'
import { HealthBackgroundView } from '../components/HealthBackground'

type Row = Record<string, unknown>

const SEX: Record<string, string> = { feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro', nao_informado: 'Prefere não informar' }

const MARITAL: Record<string, string> = { solteiro: 'Solteiro(a)', casado: 'Casado(a)', uniao_estavel: 'União estável', divorciado: 'Divorciado(a)', viuvo: 'Viúvo(a)', nao_informado: 'Prefere não informar' }
const SEVERITY: Record<string, ['negative' | 'warning' | 'neutral', string]> = { grave: ['negative', 'Grave'], moderada: ['warning', 'Moderada'], leve: ['neutral', 'Leve'] }

interface RecordData {
  patient: Row
  history: Row[]
  allergies: Row[]
  vaccines: Row[]
  clinical_access: boolean
  last_triage: Row | null
  background: Row | null
}

export default function PatientRecord() {
  const { id } = useParams()
  const { can } = useSession()
  const notify = useNotice()
  const { data, loading, error, reload } = useApi<RecordData>(`api/patients/${id}`)
  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message ?? 'Paciente não encontrado.'}</Empty>
  const p = data.patient
  const active = Number(p.ativo) === 1
  const address = ['logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'].map((k) => p[k]).filter(Boolean).join(', ')
    + (p.cep ? ` · CEP ${String(p.cep).slice(0, 5)}-${String(p.cep).slice(5)}` : '')
  const t = data.last_triage
  const sus = p.cartao_sus ? String(p.cartao_sus).replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : '—'

  const toggle = async () => {
    try {
      const r = await post(`api/patients/${id}/status`, { active: active ? '0' : '1' })
      notify(r.message ?? 'Situação alterada.')
      reload()
    } catch (e) { notify(e instanceof ApiError ? e.message : 'Não foi possível alterar.', false) }
  }

  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-rule py-2.5 last:border-0">
      <dt className="text-muted">{label}</dt><dd className="min-w-0">{value}</dd>
    </div>
  )
  const vital = (label: string, value: unknown, unit: string) => (
    <div className="rounded-[var(--radius-card)] bg-frame px-3 py-2.5">
      <p className="text-[11px] tracking-wide text-muted uppercase">{label}</p>
      <p className="num text-[17px] font-semibold">{value == null || value === '' ? '—' : `${value}${unit}`}</p>
    </div>
  )

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Pacientes', to: '/pacientes' }, { label: 'Ficha' }]}
        title={String(p.nome_social || p.nome)}
        subtitle={<span className="flex flex-wrap items-center gap-2">
          {p.nome_social ? <span>Registro civil: {String(p.nome)} ·</span> : null}
          {age(p.data_nascimento)} anos · CPF {formattedCpf(p.cpf)}
          {p.tipo_sanguineo ? <Badge tone="accent">Tipo {String(p.tipo_sanguineo)}</Badge> : null}
          <Badge tone={active ? 'positive' : 'neutral'}>{active ? 'Ativo' : 'Inativo'}</Badge>
        </span>}
        actions={<>
          {can('pacientes.inativar') && <Button variant={active ? 'perigoTexto' : 'texto'} onClick={toggle}>{active ? 'Inativar' : 'Reativar'}</Button>}
          {can('historico.view') && <ButtonLink to={`/pacientes/${id}/historico`} icon={FileText}>Histórico clínico</ButtonLink>}
          {can('pacientes.edit') && <ButtonLink to={`/pacientes/${id}/editar`} icon={Pencil}>Editar cadastro</ButtonLink>}
          {active && can('exames.agendar') && <ButtonLink to={`/exames/novo?paciente=${id}`} icon={FlaskConical}>Agendar exame</ButtonLink>}
          {active && can('consultas.agendar') && <ButtonLink to={`/agenda/nova?paciente=${id}`} variant="primario" icon={CalendarPlus}>Agendar consulta</ButtonLink>}
        </>}
      />

      <div className={data.allergies.length ? 'mb-5 rounded-[var(--radius-card)] border border-red-200 bg-red-50 px-4 py-3' : 'mb-5 rounded-[var(--radius-card)] border border-line bg-frame px-4 py-3'}>
        <p className="flex items-center gap-2 font-medium"><AlertTriangle className={data.allergies.length ? 'size-4 text-negative' : 'size-4 text-muted'} />
          {data.allergies.length ? `Alergias (${data.allergies.length})` : 'Nenhuma alergia registrada'}</p>
        {data.allergies.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {data.allergies.map((a) => {
              const [tone, label] = SEVERITY[String(a.gravidade)] ?? ['neutral', 'Gravidade não informada']
              return (
                <li key={String(a.id_alergia)} className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-[13px]">
                  <span className="font-medium">{String(a.substancia)}</span> <Badge tone={tone}>{label}</Badge>
                  {a.reacao ? <span className="block text-[12px] text-muted">{String(a.reacao)}</span> : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[5fr_7fr]">
        <div className="grid content-start gap-5">
          <Panel title="Identificação" meta={`atualizado em ${formatDateTime(p.atualizado_em)}`}>
            <dl>
              {row('Nome civil', String(p.nome))}
              {p.nome_social ? row('Nome social', String(p.nome_social)) : null}
              {row('Nome da mãe', or(p.nome_mae))}
              {row('Nascimento', <span className="num">{formatDate(p.data_nascimento)} · {age(p.data_nascimento)} anos</span>)}
              {row('Sexo', SEX[String(p.sexo)] ?? '—')}
              {row('Estado civil', MARITAL[String(p.estado_civil)] ?? '—')}
              {row('Profissão', or(p.profissao))}
              {row('Naturalidade', or(p.naturalidade))}
              {row('Tipo sanguíneo', or(p.tipo_sanguineo))}
              {row('Cadastrado em', <span className="num">{formatDateTime(p.criado_em)}</span>)}
            </dl>
          </Panel>
          <Panel title="Contato e endereço" delay={0.08}>
            <dl>
              {row('Telefone', <span className="num">{or(p.telefone)}</span>)}
              {row('E-mail', or(p.email))}
              {row('Endereço', or(address))}
              {p.responsavel_nome ? row('Responsável legal', <>{String(p.responsavel_nome)}{p.responsavel_parentesco ? ` (${p.responsavel_parentesco})` : ''}<span className="num block text-[12px] text-muted">{or(p.responsavel_telefone)}</span></>) : null}
              {row('Emergência', p.contato_emergencia_nome ? <>{String(p.contato_emergencia_nome)}{p.contato_emergencia_parentesco ? ` (${p.contato_emergencia_parentesco})` : ''}<span className="num block text-[12px] text-muted">{or(p.contato_emergencia_telefone)}</span></> : '—')}
            </dl>
          </Panel>
          <Panel title="Convênio" delay={0.12}>
            <dl>
              {row('Convênio', p.convenio ? String(p.convenio) : 'Particular')}
              {row('Carteirinha', <span className="num">{or(p.numero_carteirinha)}</span>)}
              {row('Cartão SUS', <span className="num">{sus}</span>)}
            </dl>
          </Panel>
        </div>

        <div className="grid content-start gap-5">
          {data.clinical_access && (
            <Panel title="Última triagem" meta={t ? `${formatDateTime(t.registrado_em)} · ${String(t.enfermeiro ?? '')}` : undefined} delay={0.06}>
              {!t ? <Empty>O paciente ainda não passou pela triagem.</Empty> : (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-2"><Priority color={t.cor_hex} name={t.prioridade} />
                    {t.queixa_principal ? <span className="text-[13px]">Queixa: {String(t.queixa_principal)}</span> : null}</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {vital('Pressão', t.pa_sistolica ? `${t.pa_sistolica}/${t.pa_diastolica}` : null, ' mmHg')}
                    {vital('Freq. cardíaca', t.frequencia_cardiaca, ' bpm')}
                    {vital('Temperatura', t.temperatura, ' °C')}
                    {vital('Saturação', t.saturacao_o2, '%')}
                    {vital('Peso', t.peso_kg, ' kg')}
                    {vital('Altura', t.altura_cm, ' cm')}
                  </div>
                </>
              )}
            </Panel>
          )}
          {data.clinical_access && (
            <Panel title="Antecedentes e hábitos" meta="registrados pelo médico" delay={0.08}>
              <HealthBackgroundView background={data.background} />
            </Panel>
          )}
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
          <Panel title="Vacinas aplicadas" meta={`${data.vaccines.length} doses`} noPadding delay={0.14}>
            {data.vaccines.length === 0 ? <div className="p-5"><Empty>Nenhuma vacina registrada na clínica.</Empty></div> : (
              <Table header={<><Th>Data</Th><Th>Vacina</Th><Th className="hidden md:table-cell">Lote</Th></>}>
                {data.vaccines.map((v) => (
                  <tr key={String(v.id_aplicacao)}>
                    <Td className="num whitespace-nowrap">{formatDate(v.aplicada_em)}</Td>
                    <Td><Main sub={`Dose ${v.dose} de ${v.doses}`}>{String(v.vacina)}</Main></Td>
                    <Td className="num hidden md:table-cell">{String(v.lote ?? '')}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
        </div>
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
