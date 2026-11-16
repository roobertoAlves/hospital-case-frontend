import { FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { DialogoMotivo, useAviso } from '../components/avisos'
import { NavegarDia } from '../components/NavegarDia'
import { Botao, BotaoLink, Cabecalho, Carregando, Painel, Pilula, Principal, Tabela, Td, Th, Vazio } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { diaPorExtenso, hojeIso, hora, situacaoExame } from '../lib/formato'
import { useSessao } from '../lib/sessao'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>

export default function Exames() {
  const { pode } = useSessao()
  const avisar = useAviso()
  const [params, setParams] = useSearchParams()
  const dia = params.get('data') ?? hojeIso()
  const { dados, carregando, erro, recarregar } = useApi<{ dia: string; exames: Linha[]; locais: Linha[] }>('api/exames', { data: dia })
  const [cancelar, setCancelar] = useState<Linha | null>(null)
  const podeAlterar = pode('exames.agendar')

  const acao = async (url: string, corpo?: Record<string, unknown>) => {
    try { const r = await post(url, corpo); avisar(r.message ?? 'Feito.'); recarregar() }
    catch (e) { avisar(e instanceof ApiError ? e.message : 'Não foi possível concluir.', false) }
  }
  const exames = dados?.exames ?? []
  const ativos = exames.filter((x) => x.status !== 'cancelado').length
  const realizados = exames.filter((x) => x.status === 'realizado').length

  return (
    <>
      <Cabecalho
        titulo="Agenda de exames"
        subtitulo={`${diaPorExtenso(dia)}${dia === hojeIso() ? ' (hoje)' : ''} · ${ativos} ${ativos === 1 ? 'exame' : 'exames'}, ${realizados} realizados`}
        acoes={<>
          <NavegarDia dia={dia} aoTrocar={(d) => setParams({ data: d })} />
          {podeAlterar && <BotaoLink to="/exames/novo" variante="primario" icone={FlaskConical}>Agendar exame</BotaoLink>}
        </>}
      />
      {carregando && !dados ? <Carregando /> : erro ? <Vazio>{erro.message}</Vazio> : (
        <div className="grid gap-5">
          {(dados?.locais ?? []).map((l, i) => {
            const doLocal = exames.filter((x) => x.id_local === l.id_local)
            return (
              <Painel key={String(l.id_local)} titulo={String(l.nome)} meta={`atende ${hora(l.hora_inicio)}–${hora(l.hora_fim)} · ${doLocal.length} no dia`} semPadding delay={0.05 * i}>
                {doLocal.length === 0 ? <p className="px-5 py-4 text-muted">Nenhum exame neste local no dia.</p> : (
                  <Tabela cabecalho={<><Th className="w-20">Hora</Th><Th>Paciente</Th><Th>Exame</Th><Th>Situação</Th><Th /></>}>
                    {doLocal.map((x) => {
                      const [rot, tom] = situacaoExame(x.status)
                      const id = x.id_exame_agendado
                      return (
                        <tr key={String(id)}>
                          <Td className="num text-[15px] font-semibold">{hora(x.data_hora)}</Td>
                          <Td>{pode('pacientes.view') ? <Link to={`/pacientes/${x.id_paciente}`} className="hover:text-brand-700">{String(x.paciente)}</Link> : String(x.paciente)}</Td>
                          <Td><Principal sub={`${x.duracao_min} min`}>{String(x.exame)}</Principal></Td>
                          <Td><Pilula tom={tom}>{rot}</Pilula></Td>
                          <Td className="text-right whitespace-nowrap">
                            {podeAlterar && x.status === 'agendado' && <>
                              <Botao pequeno onClick={() => acao(`api/exames-agendados/${id}/situacao`, { situacao: 'realizado' })}>Realizado</Botao>
                              <Botao pequeno variante="texto" onClick={() => acao(`api/exames-agendados/${id}/situacao`, { situacao: 'ausente' })}>Faltou</Botao>
                              <Botao pequeno variante="perigoTexto" onClick={() => setCancelar(x)}>Cancelar</Botao>
                            </>}
                          </Td>
                        </tr>
                      )
                    })}
                  </Tabela>
                )}
              </Painel>
            )
          })}
        </div>
      )}
      <DialogoMotivo
        aberto={!!cancelar}
        titulo={cancelar ? `Cancelar ${cancelar.exame} de ${cancelar.paciente}` : ''}
        ajuda="O motivo fica registrado. O paciente recebe um aviso por e-mail, sem o nome do exame."
        botao="Confirmar cancelamento"
        aoFechar={() => setCancelar(null)}
        aoConfirmar={async (motivo) => { await acao(`api/exames-agendados/${cancelar!.id_exame_agendado}/cancelar`, { motivo }); setCancelar(null) }}
      />
    </>
  )
}
