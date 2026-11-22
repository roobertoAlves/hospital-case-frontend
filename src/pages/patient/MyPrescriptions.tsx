import { Pill, Printer } from 'lucide-react'
import { ButtonLink, PageHeader, Loading, Panel, Badge, Empty } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { useApi } from '../../lib/useApi'

type Row = Record<string, unknown>

export default function MyPrescriptions() {
  const { data, loading, error } = useApi<{ prescriptions: Row[] }>('api/portal/prescriptions')
  if (loading && !data) return <Loading variant="list" />
  if (error || !data) return <Empty>{error?.message}</Empty>
  return (
    <>
      <PageHeader title="Receitas" subtitle="Receitas emitidas pelos médicos da clínica. Imprima ou mostre na farmácia." />
      {data.prescriptions.length === 0 ? <Empty icon={Pill}>Nenhuma receita ainda.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.prescriptions.map((r, i) => (
            <Panel key={String(r.id_receita)} delay={0.04 * i} title={`Receita nº ${r.id_receita}`}
              meta={<span className="flex items-center gap-2">{formatDate(r.emitida_em)} {r.status === 'cancelada' && <Badge tone="negative">Cancelada</Badge>}</span>}>
              <p className="mb-3 text-[13px] text-muted">{String(r.medico)}</p>
              <ul className="space-y-2">
                {(r.items as Row[]).map((it, k) => (
                  <li key={k} className="rounded-[var(--radius-control)] bg-frame px-3 py-2.5">
                    <span className="block font-medium">{String(it.medicamento)} · {String(it.dosagem)}</span>
                    <span className="block text-[13px] text-muted">{String(it.frequencia)} · {String(it.duracao)}</span>
                  </li>
                ))}
              </ul>
              {r.status !== 'cancelada' && <div className="mt-4 flex justify-end"><ButtonLink to={`/minha-saude/receitas/${r.id_receita}`} icon={Printer} small>Ver para imprimir</ButtonLink></div>}
            </Panel>
          ))}
        </div>
      )}
    </>
  )
}
