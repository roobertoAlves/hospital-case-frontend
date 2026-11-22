import { ArrowLeft, Printer } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { LogoMark } from '../components/Logo'
import { Button, Loading, Empty } from '../components/ui'
import { formattedCpf, formatDate } from '../lib/format'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>

const hour = (v: unknown) => String(v ?? '').slice(0, 5)

function body(a: Row) {
  const patient = <strong>{String(a.paciente)}</strong>
  const cpf = `CPF ${formattedCpf(a.cpf)}`
  if (a.tipo === 'afastamento') {
    const days = Number(a.dias)
    return <>Atesto, para os devidos fins, que {patient}, {cpf}, foi atendido(a) nesta data e necessita de <strong>{days} ({days === 1 ? 'um' : days}) {days === 1 ? 'dia' : 'dias'}</strong> de afastamento de suas atividades a partir de {formatDate(a.data_inicio)}.</>
  }
  if (a.tipo === 'acompanhante') {
    return <>Declaro, para os devidos fins, que <strong>{String(a.acompanhante_nome)}</strong> esteve nesta unidade em {formatDate(a.data_inicio)}, das {hour(a.hora_inicio)} às {hour(a.hora_fim)}, acompanhando o(a) paciente {patient}, {cpf}.</>
  }
  return <>Declaro, para os devidos fins, que {patient}, {cpf}, esteve nesta unidade em {formatDate(a.data_inicio)}, das {hour(a.hora_inicio)} às {hour(a.hora_fim)}, para atendimento médico.</>
}

export default function CertificatePrint({ portal = false }: { portal?: boolean }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, loading, error } = useApi<{ certificate: Row }>(portal ? `api/portal/certificates/${id}` : `api/certificates/${id}`)
  if (loading && !data) return <div className="p-8"><Loading variant="document" /></div>
  if (error || !data) return <div className="p-8"><Empty>{error?.message ?? 'Atestado não encontrado.'}</Empty></div>
  const a = data.certificate
  const cancelled = a.status === 'cancelado'
  const title = a.tipo === 'afastamento' ? 'Atestado médico' : 'Declaração de comparecimento'

  return (
    <div className="min-h-screen bg-frame py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[760px] justify-between px-4">
        <Button icon={ArrowLeft} onClick={() => navigate(-1)}>Voltar</Button>
        <Button variant="primario" icon={Printer} onClick={() => window.print()} disabled={cancelled}>Imprimir</Button>
      </div>
      <article className="relative mx-auto max-w-[760px] bg-white p-10 shadow-[var(--shadow-card)] print:max-w-none print:p-0 print:shadow-none">
        {cancelled && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[64px] font-bold tracking-widest text-red-200 [transform:rotate(-20deg)]">CANCELADO</div>}
        <header className="flex items-start justify-between border-b-2 border-ink pb-4">
          <div className="flex items-center gap-3">
            <LogoMark className="size-10" />
            <div>
              <p className="text-[18px] font-semibold">Asklep · Clínica unidade central</p>
              <p className="text-[12px] text-muted">Documento de demonstração</p>
            </div>
          </div>
          <div className="text-right text-[13px]">
            <p className="font-semibold">Nº {String(a.id_atestado)}</p>
            <p className="text-muted">{formatDate(a.emitido_em)}</p>
          </div>
        </header>
        <h1 className="mt-10 text-center text-[22px] font-semibold tracking-wide uppercase">{title}</h1>
        <p className="mt-10 text-[16px] leading-8">{body(a)}</p>
        {a.cid10 ? <p className="mt-6 text-[15px]">CID-10: <strong>{String(a.cid10)}</strong> <span className="text-[12px] text-muted">(informado com autorização do paciente)</span></p> : null}
        {a.observacoes ? <p className="mt-4 whitespace-pre-wrap text-[15px]">{String(a.observacoes)}</p> : null}
        <p className="mt-12 text-[15px]">São Paulo, {new Date(`${String(a.emitido_em).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
        <footer className="mt-24 flex justify-end">
          <div className="w-72 border-t border-ink pt-2 text-center text-[13px]">
            <p className="font-semibold">{String(a.medico)}</p>
            <p>CRM {String(a.crm)}/{String(a.crm_uf)}</p>
          </div>
        </footer>
      </article>
    </div>
  )
}
