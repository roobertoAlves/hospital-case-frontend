import { Check, FileSearch, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { DialogoMotivo, useAviso } from '../components/avisos'
import { Abas, Botao, Cabecalho, Carregando, Painel, Pilula, Vazio } from '../components/ui'
import { abrirArquivo, ApiError, post } from '../lib/api'
import { dataHora, idade } from '../lib/formato'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>
type Status = 'pendente' | 'aprovado' | 'recusado'

/** Recepcao confere os pedidos medicos anexados pelos pacientes no portal. */
export default function Pedidos() {
  const avisar = useAviso()
  const [status, setStatus] = useState<Status>('pendente')
  const { dados, carregando, erro, recarregar } = useApi<{ pedidos: Linha[] }>('api/pedidos', { status })
  const [recusar, setRecusar] = useState<Linha | null>(null)

  const conferir = async (p: Linha, decisao: 'aprovar' | 'recusar', motivo = '') => {
    try { const r = await post(`api/pedidos/${p.id_pedido}/conferir`, { decisao, motivo }); avisar(r.message ?? 'Feito.'); recarregar() }
    catch (e) { avisar(e instanceof ApiError ? e.message : 'Não foi possível conferir.', false) }
  }

  return (
    <>
      <Cabecalho titulo="Pedidos médicos" subtitulo="Pedidos anexados pelos pacientes no portal. Confira o arquivo: recusar cancela o exame que dependia dele e avisa o paciente." />
      <Abas abas={[{ id: 'pendente', rotulo: 'Aguardando conferência' }, { id: 'aprovado', rotulo: 'Aprovados' }, { id: 'recusado', rotulo: 'Recusados' }]} atual={status} aoTrocar={setStatus} />
      {carregando && !dados ? <Carregando /> : erro || !dados ? <Vazio>{erro?.message}</Vazio> : dados.pedidos.length === 0 ? (
        <Vazio icone={FileSearch}>{status === 'pendente' ? 'Nenhum pedido aguardando conferência.' : 'Nada por aqui.'}</Vazio>
      ) : (
        <div className="grid gap-4">
          {dados.pedidos.map((p, i) => (
            <Painel key={String(p.id_pedido)} delay={0.03 * i}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 grow">
                  <p className="font-semibold"><Link to={`/pacientes/${p.id_paciente}`} className="hover:text-brand-700">{String(p.paciente)}</Link>
                    <span className="font-normal text-muted"> · {idade(p.data_nascimento)} anos</span></p>
                  <p className="text-[13px] text-muted">Enviado em {dataHora(p.enviado_em)}{p.exame ? ` · para ${p.exame}` : ''}</p>
                  {p.observacao ? <p className="mt-1 text-[13px]">“{String(p.observacao)}”</p> : null}
                  {(p.agendamentos as Linha[]).length > 0 && (
                    <p className="mt-2 text-[13px]"><strong>Exames marcados com este pedido:</strong>{' '}
                      {(p.agendamentos as Linha[]).map((a) => `${a.exame} em ${dataHora(a.data_hora)} (${a.status})`).join(' · ')}</p>
                  )}
                  {p.motivo_recusa ? <p className="mt-1 text-[13px] text-negative">Recusado: {String(p.motivo_recusa)}</p> : null}
                  {p.conferido_por ? <p className="mt-1 text-[12px] text-faint">Conferido por {String(p.conferido_por)} em {dataHora(p.conferido_em)}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Botao pequeno icone={FileSearch} onClick={() => abrirArquivo(`api/pedidos/${p.id_pedido}/arquivo`).catch((e) => avisar(e.message, false))}>
                    {String(p.mime).includes('pdf') ? 'Abrir PDF' : 'Abrir imagem'}
                  </Botao>
                  {p.status === 'pendente' ? <>
                    <Botao pequeno variante="primario" icone={Check} onClick={() => conferir(p, 'aprovar')}>Aprovar</Botao>
                    <Botao pequeno variante="perigo" icone={X} onClick={() => setRecusar(p)}>Recusar</Botao>
                  </> : <Pilula tom={p.status === 'aprovado' ? 'positive' : 'negative'}>{p.status === 'aprovado' ? 'Aprovado' : 'Recusado'}</Pilula>}
                </div>
              </div>
            </Painel>
          ))}
        </div>
      )}
      <DialogoMotivo aberto={!!recusar} titulo={`Recusar pedido de ${recusar?.paciente ?? ''}`} botao="Recusar pedido"
        ajuda="O paciente recebe o motivo por e-mail e os exames marcados com este pedido são cancelados. Ex.: ilegível, sem assinatura, vencido."
        aoFechar={() => setRecusar(null)} aoConfirmar={async (motivo) => { await conferir(recusar!, 'recusar', motivo); setRecusar(null) }} />
    </>
  )
}
