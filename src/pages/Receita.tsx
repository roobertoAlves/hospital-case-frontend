import { ArrowLeft, Printer } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { LogoMarca } from '../components/Logo'
import { Botao, Carregando, Vazio } from '../components/ui'
import { cpfFormatado, data, idade } from '../lib/formato'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>

/** Receita para impressao (fora do layout): o medico autor ou, no portal, o proprio paciente (o backend devolve 404 para os outros). */
export default function Receita({ portal = false }: { portal?: boolean }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { dados, carregando, erro } = useApi<{ receita: Linha }>(portal ? `api/portal/receitas/${id}` : `api/receitas/${id}`)
  if (carregando && !dados) return <div className="p-8"><Carregando /></div>
  if (erro || !dados) return <div className="p-8"><Vazio>{erro?.message ?? 'Receita não encontrada.'}</Vazio></div>
  const r = dados.receita
  const cancelada = r.status === 'cancelada'
  const endereco = [r.logradouro, r.numero, r.cidade, r.uf].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-frame py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[760px] justify-between px-4">
        <Botao icone={ArrowLeft} onClick={() => navigate(-1)}>Voltar</Botao>
        <Botao variante="primario" icone={Printer} onClick={() => window.print()} disabled={cancelada}>Imprimir</Botao>
      </div>
      <article className="relative mx-auto max-w-[760px] bg-white p-10 shadow-[var(--shadow-card)] print:max-w-none print:p-0 print:shadow-none">
        {cancelada && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[64px] font-bold tracking-widest text-red-200 [transform:rotate(-20deg)]">CANCELADA</div>}
        <header className="flex items-start justify-between border-b-2 border-ink pb-4">
          <div className="flex items-center gap-3">
            <LogoMarca className="size-10" />
            <div>
              <p className="text-[18px] font-semibold">Asklep · Clínica unidade central</p>
              <p className="text-[12px] text-muted">Documento de demonstração (dados fictícios)</p>
            </div>
          </div>
          <div className="text-right text-[13px]">
            <p className="font-semibold">Receita nº {String(r.id_receita)}</p>
            <p className="text-muted">{data(r.emitida_em)}</p>
          </div>
        </header>
        <section className="mt-6 text-[14px]">
          <p><span className="text-muted">Paciente:</span> <strong>{String(r.paciente)}</strong> · {idade(r.data_nascimento)} anos · CPF {cpfFormatado(r.cpf)}</p>
          {endereco && <p><span className="text-muted">Endereço:</span> {endereco}</p>}
        </section>
        <h1 className="mt-8 mb-4 text-[20px] font-semibold">Prescrição</h1>
        <ol className="space-y-4">
          {(r.itens as Linha[]).map((i, k) => (
            <li key={k} className="grid grid-cols-[28px_1fr] gap-2">
              <span className="font-semibold">{k + 1}.</span>
              <span>
                <span className="block text-[16px] font-semibold">{String(i.medicamento)} — {String(i.dosagem)}</span>
                <span className="block">{i.via ? `Via ${i.via} · ` : ''}{String(i.frequencia)} · por {String(i.duracao)}</span>
                {i.orientacoes ? <span className="block text-muted">{String(i.orientacoes)}</span> : null}
              </span>
            </li>
          ))}
        </ol>
        {r.orientacoes_gerais ? <p className="mt-8 whitespace-pre-wrap"><strong>Orientações:</strong> {String(r.orientacoes_gerais)}</p> : null}
        <footer className="mt-24 flex justify-end">
          <div className="w-72 border-t border-ink pt-2 text-center text-[13px]">
            <p className="font-semibold">{String(r.medico)}</p>
            <p>CRM {String(r.crm)}/{String(r.crm_uf)}</p>
          </div>
        </footer>
      </article>
    </div>
  )
}
