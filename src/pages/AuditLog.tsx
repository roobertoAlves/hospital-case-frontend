import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Tabs, Button, PageHeader, Field, Loading, Input, Panel, Badge, Main, Select, Table, Td, Th, Empty } from '../components/ui'
import { formatDate, formatDateTime, or } from '../lib/format'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
interface AuditTrail {
  filter: { from: string; to: string; userId: number | null; module: string; patientId: number | null; page: number }
  items: Row[]
  total: number
  page: number
  total_pages: number
  modules: string[]; users: Row[]
}

function mask(email: unknown) {
  const e = String(email ?? '')
  const at = e.indexOf('@')
  return at <= 0 ? (e ? '***' : '') : `${e.slice(0, Math.min(2, at))}***${e.slice(at)}`
}

function AuditTrailTab() {
  const [params, setParams] = useSearchParams()
  const filters = Object.fromEntries(['from', 'to', 'user', 'module', 'patient', 'page'].map((k) => [k, params.get(k) ?? '']))
  const { data, loading, error } = useApi<AuditTrail>('api/audit-log', filters)
  const [f, setF] = useState(filters)
  useEffect(() => { if (data) setF((x) => ({ ...x, from: data.filter.from, to: data.filter.to })) }, [data])

  const applyFilter = (e: FormEvent) => { e.preventDefault(); const n = new URLSearchParams(); Object.entries(f).forEach(([k, v]) => v && k !== 'page' && n.set(k, v)); setParams(n) }
  const page = (p: number) => { const n = new URLSearchParams(params); n.set('page', String(p)); setParams(n) }

  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message}</Empty>
  const r = data
  const total = Math.max(1, r.total_pages)
  return (
    <>
      <form onSubmit={applyFilter} className="mb-5 grid items-end gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="De" name="de"><Input name="de" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
        <Field label="Até" name="ate"><Input name="ate" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
        <Field label="Usuário" name="usuario">
          <Select name="usuario" value={f.user} onChange={(e) => setF({ ...f, user: e.target.value })}>
            <option value="">Todos</option>{data.users.map((u) => <option key={String(u.id_usuario)} value={String(u.id_usuario)}>{String(u.nome)}</option>)}
          </Select>
        </Field>
        <Field label="Módulo" name="modulo">
          <Select name="modulo" value={f.module} onChange={(e) => setF({ ...f, module: e.target.value })}>
            <option value="">Todos</option>{data.modules.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Nº do paciente" name="paciente"><Input name="paciente" inputMode="numeric" placeholder="Ex.: 7" value={f.patient} onChange={(e) => setF({ ...f, patient: e.target.value.replace(/\D/g, '') })} /></Field>
        <div className="flex gap-2"><Button type="submit" variant="primario">Filtrar</Button><Button type="button" variant="texto" onClick={() => { setF({ from: '', to: '', user: '', module: '', patient: '', page: '' }); setParams({}) }}>Limpar</Button></div>
      </form>
      <p className="mb-3 text-muted">{r.total} {r.total === 1 ? 'registro' : 'registros'} de {formatDate(data.filter.from)} a {formatDate(data.filter.to)}</p>
      {r.items.length === 0 ? <Empty>Nenhum registro com esse filtro.</Empty> : (
        <Panel noPadding delay={0}>
          <Table header={<><Th>Quando</Th><Th>Ação</Th><Th>Usuário</Th><Th className="hidden md:table-cell">Paciente</Th><Th className="hidden lg:table-cell">Detalhes</Th></>}>
            {r.items.map((a) => (
              <tr key={String(a.id_auditoria)}>
                <Td className="num whitespace-nowrap">{formatDateTime(a.registrado_em)}</Td>
                <Td><Main sub={a.entidade ? `${a.entidade}${a.id_entidade != null ? ` nº ${a.id_entidade}` : ''}` : undefined}><code className="rounded bg-raised px-1.5 py-0.5 text-[12.5px]">{String(a.acao)}</code></Main></Td>
                <Td><Main sub={a.ip ? `IP ${a.ip}` : undefined}>{or(a.usuario)}</Main></Td>
                <Td className="hidden md:table-cell">{a.id_paciente != null ? <button className="text-left text-brand-700 hover:underline" onClick={() => { const n = new URLSearchParams(params); n.set('patient', String(a.id_paciente)); n.delete('page'); setParams(n); setF({ ...f, patient: String(a.id_paciente) }) }}><Main sub={`nº ${a.id_paciente}`}>{or(a.paciente)}</Main></button> : '—'}</Td>
                <Td className="hidden max-w-[280px] truncate text-muted lg:table-cell">{or(a.detalhes)}</Td>
              </tr>
            ))}
          </Table>
          <div className="flex items-center justify-between border-t border-rule px-4 py-3 text-[13px] text-muted">
            <span>Página {r.page} de {total}</span>
            <span className="flex gap-2">
              {r.page > 1 && <Button small onClick={() => page(r.page - 1)}>Anterior</Button>}
              {r.page < total && <Button small onClick={() => page(r.page + 1)}>Próxima</Button>}
            </span>
          </div>
        </Panel>
      )}
    </>
  )
}

function Notifications() {
  const { data, loading, error } = useApi<{ notifications: Row[] }>('api/audit-log/notifications')
  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message}</Empty>
  const tone = (s: unknown) => (s === 'enviada' ? 'positive' : s === 'simulada' ? 'accent' : s === 'falhou' ? 'negative' : 'neutral') as 'positive'
  return (
    <>
      <p className="mb-3 text-[13px] text-muted">Últimos 100 avisos. O texto do e-mail não é guardado (pode ter senha temporária ou link de recuperação); em desenvolvimento, o conteúdo simulado fica no mail.log do backend.</p>
      {data.notifications.length === 0 ? <Empty>Nenhum e-mail enviado ainda.</Empty> : (
        <Panel noPadding delay={0}>
          <Table header={<><Th>Quando</Th><Th>Assunto</Th><Th className="hidden md:table-cell">Destinatário</Th><Th className="hidden lg:table-cell">Disparado por</Th><Th>Situação</Th></>}>
            {data.notifications.map((n) => (
              <tr key={String(n.id_notificacao)}>
                <Td className="num whitespace-nowrap">{formatDateTime(n.criado_em)}</Td>
                <Td><Main sub={String(n.tipo)}>{String(n.assunto)}</Main>{n.erro ? <span className="block text-[12px] text-negative">{String(n.erro)}</span> : null}</Td>
                <Td className="hidden md:table-cell">{mask(n.destinatario)}</Td>
                <Td className="hidden lg:table-cell">{or(n.usuario)}</Td>
                <Td><Badge tone={tone(n.status)}>{String(n.status).replace(/^./, (c) => c.toUpperCase())}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}
    </>
  )
}

export default function AuditLog() {
  const [tab, setTab] = useState<'trilha' | 'emails'>('trilha')
  return (
    <>
      <PageHeader title="Auditoria" subtitle="Registro somente leitura de acessos e alterações. Não guarda conteúdo clínico, senhas nem tokens. Esta consulta também fica registrada." />
      <Tabs tabs={[{ id: 'trilha', label: 'Trilha de auditoria' }, { id: 'emails', label: 'E-mails enviados' }]} current={tab} onChange={setTab} />
      {tab === 'trilha' ? <AuditTrailTab /> : <Notifications />}
    </>
  )
}
