import { CalendarPlus, FileText, Printer } from 'lucide-react'
import { Badge, ButtonLink, Empty, Loading, PageHeader, Panel } from '../../components/ui'
import { REFERRAL_PRIORITY, REFERRAL_STATUS, certificateLabel } from '../../lib/documents'
import { formatDate } from '../../lib/format'
import { useApi } from '../../lib/useApi'

type Row = Record<string, unknown>

export default function MyDocuments() {
  const { data, loading, error } = useApi<{ certificates: Row[]; referrals: Row[] }>('api/portal/documents')
  if (loading && !data) return <Loading variant="list" />
  if (error || !data) return <Empty>{error?.message}</Empty>
  return (
    <>
      <PageHeader title="Atestados e encaminhamentos" subtitle="Documentos emitidos pelos médicos da clínica. Encaminhamentos podem ser agendados aqui mesmo." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Encaminhamentos" meta={String(data.referrals.length)}>
          {data.referrals.length === 0 ? <p className="text-muted">Nenhum encaminhamento.</p> : (
            <ul className="divide-y divide-rule">
              {data.referrals.map((r) => {
                const [pLabel, pTone] = REFERRAL_PRIORITY[String(r.prioridade)] ?? ['—', 'neutral']
                const [sLabel, sTone] = REFERRAL_STATUS[String(r.status)] ?? ['—', 'neutral']
                return (
                  <li key={String(r.id_encaminhamento)} className="py-3 first:pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="grow">{String(r.especialidade)}</strong>
                      <Badge tone={pTone}>{pLabel}</Badge><Badge tone={sTone}>{sLabel}</Badge>
                    </div>
                    <p className="mt-1 text-[13px] text-muted">{String(r.motivo)}</p>
                    <p className="text-[12px] text-faint">{String(r.medico)} · {formatDate(r.emitido_em)}{r.agendada_para ? ` · consulta em ${formatDate(r.agendada_para)}` : ''}</p>
                    {r.status === 'emitido' && <div className="mt-2"><ButtonLink small variant="primario" icon={CalendarPlus} to={`/minha-saude/consultas?especialidade=${r.id_especialidade}`}>Agendar {String(r.especialidade)}</ButtonLink></div>}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Atestados" meta={String(data.certificates.length)} delay={0.06}>
          {data.certificates.length === 0 ? <Empty icon={FileText}>Nenhum atestado.</Empty> : (
            <ul className="divide-y divide-rule">
              {data.certificates.map((a) => (
                <li key={String(a.id_atestado)} className="flex flex-wrap items-center gap-2 py-3 first:pt-0">
                  <span className="grow"><span className="block font-medium">{certificateLabel(a)}</span>
                    <span className="block text-[12px] text-muted">{String(a.medico)} · emitido em {formatDate(a.emitido_em)}</span></span>
                  {a.status === 'cancelado' ? <Badge tone="negative">Cancelado</Badge>
                    : <ButtonLink small icon={Printer} to={`/minha-saude/atestados/${a.id_atestado}`}>Ver para imprimir</ButtonLink>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}
