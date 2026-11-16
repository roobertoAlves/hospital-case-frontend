import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Tabs, Button, PageHeader, Field, Loading, Input, Panel, Badge, Main, Select, Table, Td, Th, Empty } from '../components/ui'
import { formatDate, formatDateTime, or } from '../lib/format'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
interface AuditTrail {
  filtro: { de: string; ate: string; idUsuario: number | null; modulo: string; idPaciente: number | null; pagina: number }
  resultado: { itens: Row[]; total: number; pagina: number }
  modulos: string[]; usuarios: Row[]
}

const PER_PAGE = 50

function mask(email: unknown) {
  const e = String(email ?? '')
  const at = e.indexOf('@')
  return at <= 0 ? (e ? '***' : '') : `${e.slice(0, Math.min(2, at))}***${e.slice(at)}`
}

function AuditTrailTab() {
  const [params, setParams] = useSearchParams()
  const filters = Object.fromEntries(['de', 'ate', 'usuario', 'modulo', 'paciente', 'pagina'].map((k) => [k, params.get(k) ?? '']))
  const { data, loading, error } = useApi<AuditTrail>('api/auditoria', filters)
  const [f, setF] = useState(filters)
  useEffect(() => { if (data) setF((x) => ({ ...x, de: data.filtro.de, ate: data.filtro.ate })) }, [data])

  const applyFilter = (e: FormEvent) => { e.preventDefault(); const n = new URLSearchParams(); Object.entries(f).forEach(([k, v]) => v && k !== 'pagina' && n.set(k, v)); setParams(n) }
  const page = (p: number) => { const n = new URLSearchParams(params); n.set('pagina', String(p)); setParams(n) }

  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message}</Empty>
  const r = data.resultado
  const total = Math.max(1, Math.ceil(r.total / PER_PAGE))
  return (
    <>
      <form onSubmit={applyFilter} className="mb-5 grid items-end gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="De" name="de"><Input name="de" type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} /></Field>
        <Field label="Até" name="ate"><Input name="ate" type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} /></Field>
        <Field label="Usuário" name="usuario">
          <Select name="usuario" value={f.usuario} onChange={(e) => setF({ ...f, usuario: e.target.value })}>
            <option value="">Todos</option>{data.usuarios.map((u) => <option key={String(u.id_usuario)} value={String(u.id_usuario)}>{String(u.nome)}</option>)}
          </Select>
        </Field>
        <Field label="Módulo" name="modulo">
          <Select name="modulo" value={f.modulo} onChange={(e) => setF({ ...f, modulo: e.target.value })}>
            <option value="">Todos</option>{data.modulos.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Nº do paciente" name="paciente"><Input name="paciente" inputMode="numeric" placeholder="Ex.: 7" value={f.paciente} onChange={(e) => setF({ ...f, paciente: e.target.value.replace(/\D/g, '') })} /></Field>
        <div className="flex gap-2"><Button type="submit" variant="primario">Filtrar</Button><Button type="button" variant="texto" onClick={() => { setF({ de: '', ate: '', usuario: '', modulo: '', paciente: '', pagina: '' }); setParams({}) }}>Limpar</Button></div>
      </form>
      <p className="mb-3 text-muted">{r.total} {r.total === 1 ? 'registro' : 'registros'} de {formatDate(data.filtro.de)} a {formatDate(data.filtro.ate)}</p>
      {r.itens.length === 0 ? <Empty>Nenhum registro com esse filtro.</Empty> : (
        <Panel noPadding delay={0}>
          <Table header={<><Th>Quando</Th><Th>Ação</Th><Th>Usuário</Th><Th className="hidden md:table-cell">Paciente</Th><Th className="hidden lg:table-cell">Detalhes</Th></>}>
            {r.itens.map((a) => (
              <tr key={String(a.id_auditoria)}>
                <Td className="num whitespace-nowrap">{formatDateTime(a.registrado_em)}</Td>
                <Td><Main sub={a.entidade ? `${a.entidade}${a.id_entidade != null ? ` nº ${a.id_entidade}` : ''}` : undefined}><code className="rounded bg-raised px-1.5 py-0.5 text-[12.5px]">{String(a.acao)}</code></Main></Td>
                <Td><Main sub={a.ip ? `IP ${a.ip}` : undefined}>{or(a.usuario)}</Main></Td>
                <Td className="hidden md:table-cell">{a.id_paciente != null ? <button className="text-left text-brand-700 hover:underline" onClick={() => { const n = new URLSearchParams(params); n.set('paciente', String(a.id_paciente)); n.delete('pagina'); setParams(n); setF({ ...f, paciente: String(a.id_paciente) }) }}><Main sub={`nº ${a.id_paciente}`}>{or(a.paciente)}</Main></button> : '—'}</Td>
                <Td className="hidden max-w-[280px] truncate text-muted lg:table-cell">{or(a.detalhes)}</Td>
              </tr>
            ))}
          </Table>
          <div className="flex items-center justify-between border-t border-rule px-4 py-3 text-[13px] text-muted">
            <span>Página {r.pagina} de {total}</span>
            <span className="flex gap-2">
              {r.pagina > 1 && <Button small onClick={() => page(r.pagina - 1)}>Anterior</Button>}
              {r.pagina < total && <Button small onClick={() => page(r.pagina + 1)}>Próxima</Button>}
            </span>
          </div>
        </Panel>
      )}
    </>
  )
}

function Notifications() {
  const { data, loading, error } = useApi<{ notifications: Row[] }>('api/auditoria', { aba: 'notificacoes' })
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
