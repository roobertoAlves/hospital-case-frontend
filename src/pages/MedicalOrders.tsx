import { Check, FileSearch, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { ReasonDialog, useNotice } from '../components/notices'
import { Tabs, Button, PageHeader, Loading, Panel, Badge, Empty } from '../components/ui'
import { openFile, ApiError, post } from '../lib/api'
import { formatDateTime, age } from '../lib/format'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
type Status = 'pendente' | 'aprovado' | 'recusado'

/** Recepcao confere os pedidos medicos anexados pelos pacientes no portal. */
export default function MedicalOrders() {
  const notify = useNotice()
  const [status, setStatus] = useState<Status>('pendente')
  const { data, loading, error, reload } = useApi<{ orders: Row[] }>('api/medical-orders', { status })
  const [reject, setRejecting] = useState<Row | null>(null)

  const review = async (p: Row, decision: 'approve' | 'reject', reason = '') => {
    try { const r = await post(`api/medical-orders/${p.id_pedido}/review`, { decision, reason }); notify(r.message ?? 'Feito.'); reload() }
    catch (e) { notify(e instanceof ApiError ? e.message : 'Não foi possível conferir.', false) }
  }

  return (
    <>
      <PageHeader title="Pedidos médicos" subtitle="Pedidos anexados pelos pacientes no portal. Confira o arquivo: recusar cancela o exame que dependia dele e avisa o paciente." />
      <Tabs tabs={[{ id: 'pendente', label: 'Aguardando conferência' }, { id: 'aprovado', label: 'Aprovados' }, { id: 'recusado', label: 'Recusados' }]} current={status} onChange={setStatus} />
      {loading && !data ? <Loading /> : error || !data ? <Empty>{error?.message}</Empty> : data.orders.length === 0 ? (
        <Empty icon={FileSearch}>{status === 'pendente' ? 'Nenhum pedido aguardando conferência.' : 'Nada por aqui.'}</Empty>
      ) : (
        <div className="grid gap-4">
          {data.orders.map((p, i) => (
            <Panel key={String(p.id_pedido)} delay={0.03 * i}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 grow">
                  <p className="font-semibold"><Link to={`/pacientes/${p.id_paciente}`} className="hover:text-brand-700">{String(p.paciente)}</Link>
                    <span className="font-normal text-muted"> · {age(p.data_nascimento)} anos</span></p>
                  <p className="text-[13px] text-muted">Enviado em {formatDateTime(p.enviado_em)}{p.exame ? ` · para ${p.exame}` : ''}</p>
                  {p.observacao ? <p className="mt-1 text-[13px]">“{String(p.observacao)}”</p> : null}
                  {(p.bookings as Row[]).length > 0 && (
                    <p className="mt-2 text-[13px]"><strong>Exames marcados com este pedido:</strong>{' '}
                      {(p.bookings as Row[]).map((a) => `${a.exame} em ${formatDateTime(a.data_hora)} (${a.status})`).join(' · ')}</p>
                  )}
                  {p.motivo_recusa ? <p className="mt-1 text-[13px] text-negative">Recusado: {String(p.motivo_recusa)}</p> : null}
                  {p.conferido_por ? <p className="mt-1 text-[12px] text-faint">Conferido por {String(p.conferido_por)} em {formatDateTime(p.conferido_em)}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button small icon={FileSearch} onClick={() => openFile(`api/medical-orders/${p.id_pedido}/file`).catch((e) => notify(e.message, false))}>
                    {String(p.mime).includes('pdf') ? 'Abrir PDF' : 'Abrir imagem'}
                  </Button>
                  {p.status === 'pendente' ? <>
                    <Button small variant="primario" icon={Check} onClick={() => review(p, 'approve')}>Aprovar</Button>
                    <Button small variant="perigo" icon={X} onClick={() => setRejecting(p)}>Recusar</Button>
                  </> : <Badge tone={p.status === 'aprovado' ? 'positive' : 'negative'}>{p.status === 'aprovado' ? 'Aprovado' : 'Recusado'}</Badge>}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
      <ReasonDialog open={!!reject} title={`Recusar pedido de ${reject?.paciente ?? ''}`} buttonLabel="Recusar pedido"
        help="O paciente recebe o motivo por e-mail e os exames marcados com este pedido são cancelados. Ex.: ilegível, sem assinatura, vencido."
        onClose={() => setRejecting(null)} onConfirm={async (reason) => { await review(reject!, 'reject', reason); setRejecting(null) }} />
    </>
  )
}
