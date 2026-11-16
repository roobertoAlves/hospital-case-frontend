import { useState, type FormEvent } from 'react'
import { useNotice } from '../components/notices'
import { Badge, Button, Empty, Field, Input, Kpi, Loading, Main, PageHeader, Panel, Select, Table, Td, TextArea, Th } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { formatDateTime } from '../lib/format'
import { useSession } from '../lib/session'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
interface TicketList {
  tickets: Row[]
  counts: { total: number; open: number; in_progress: number; closed: number }
}

const STATUS: Record<string, [string, 'warning' | 'accent' | 'positive']> = {
  aberto: ['Aberto', 'warning'],
  em_andamento: ['Em andamento', 'accent'],
  fechado: ['Fechado', 'positive'],
}

/** Support tickets (framework example): everyone opens tickets; the support group moves them along. */
export default function Tickets() {
  const notify = useNotice()
  const { inGroup } = useSession()
  const { data, loading, error, reload } = useApi<TicketList>('api/tickets')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const support = inGroup('suporte') || inGroup('admin')

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const r = await post('api/tickets', { titulo: title, descricao: description })
      notify(r.message ?? 'Chamado registrado.')
      setTitle('')
      setDescription('')
      reload()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Não foi possível registrar.', false)
    } finally {
      setSending(false)
    }
  }

  const changeStatus = async (t: Row, status: string) => {
    try {
      const r = await post('api/tickets/status', { id_chamado: t.id_chamado, status })
      notify(r.message ?? 'Status atualizado.')
      reload()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Não foi possível atualizar.', false)
    }
  }

  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message}</Empty>
  const c = data.counts

  return (
    <>
      <PageHeader title="Chamados de suporte" subtitle="Abra um chamado para a equipe de suporte e acompanhe o andamento." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Abertos" value={c.open} highlight />
        <Kpi label="Em andamento" value={c.in_progress} delay={0.05} />
        <Kpi label="Fechados" value={c.closed} delay={0.1} />
        <Kpi label="Total" value={c.total} delay={0.15} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Panel title="Chamados" noPadding>
          {data.tickets.length === 0 ? <div className="p-5"><Empty>Nenhum chamado registrado.</Empty></div> : (
            <Table header={<><Th>Chamado</Th><Th className="hidden md:table-cell">Solicitante</Th><Th>Situação</Th>{support && <Th />}</>}>
              {data.tickets.map((t) => {
                const [label, tone] = STATUS[String(t.status)] ?? [String(t.status), 'accent']
                return (
                  <tr key={String(t.id_chamado)}>
                    <Td><Main sub={`nº ${t.id_chamado} · ${formatDateTime(t.aberto_em)}`}>{String(t.titulo)}</Main>
                      {t.descricao ? <p className="mt-1 text-[13px] text-muted">{String(t.descricao)}</p> : null}</Td>
                    <Td className="hidden md:table-cell"><Main sub={String(t.email_solicitante ?? '')}>{String(t.solicitante ?? '')}</Main></Td>
                    <Td><Badge tone={tone}>{label}</Badge></Td>
                    {support && (
                      <Td className="text-right">
                        <Select aria-label="Alterar situação" value={String(t.status)} onChange={(e) => changeStatus(t, e.target.value)}>
                          {Object.entries(STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}
                        </Select>
                      </Td>
                    )}
                  </tr>
                )
              })}
            </Table>
          )}
        </Panel>
        <Panel title="Novo chamado">
          <form onSubmit={create} className="grid gap-4">
            <Field label="Título" name="titulo" required>
              <Input name="titulo" maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Descrição" name="descricao">
              <TextArea name="descricao" rows={5} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Button type="submit" variant="primario" loading={sending} disabled={title.trim().length === 0}>Registrar chamado</Button>
          </form>
        </Panel>
      </div>
    </>
  )
}
