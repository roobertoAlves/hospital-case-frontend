import { Pill, Printer } from 'lucide-react'
import { BotaoLink, Cabecalho, Carregando, Painel, Pilula, Vazio } from '../../components/ui'
import { data } from '../../lib/formato'
import { useApi } from '../../lib/useApi'

type Linha = Record<string, unknown>

export default function MinhasReceitas() {
  const { dados, carregando, erro } = useApi<{ receitas: Linha[] }>('api/portal/receitas')
  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message}</Vazio>
  return (
    <>
      <Cabecalho titulo="Receitas" subtitulo="Receitas emitidas pelos médicos da clínica. Imprima ou mostre na farmácia." />
      {dados.receitas.length === 0 ? <Vazio icone={Pill}>Nenhuma receita ainda.</Vazio> : (
        <div className="grid gap-4 md:grid-cols-2">
          {dados.receitas.map((r, i) => (
            <Painel key={String(r.id_receita)} delay={0.04 * i} titulo={`Receita nº ${r.id_receita}`}
              meta={<span className="flex items-center gap-2">{data(r.emitida_em)} {r.status === 'cancelada' && <Pilula tom="negative">Cancelada</Pilula>}</span>}>
              <p className="mb-3 text-[13px] text-muted">{String(r.medico)}</p>
              <ul className="space-y-2">
                {(r.itens as Linha[]).map((it, k) => (
                  <li key={k} className="rounded-[var(--radius-control)] bg-frame px-3 py-2.5">
                    <span className="block font-medium">{String(it.medicamento)} · {String(it.dosagem)}</span>
                    <span className="block text-[13px] text-muted">{String(it.frequencia)} · {String(it.duracao)}</span>
                  </li>
                ))}
              </ul>
              {r.status !== 'cancelada' && <div className="mt-4 flex justify-end"><BotaoLink to={`/minha-saude/receitas/${r.id_receita}`} icone={Printer} pequeno>Ver para imprimir</BotaoLink></div>}
            </Painel>
          ))}
        </div>
      )}
    </>
  )
}
