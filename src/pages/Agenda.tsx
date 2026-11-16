import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { DialogoMotivo, useAviso } from '../components/avisos'
import { LinhaDoDia } from '../components/LinhaDoDia'
import { NavegarDia } from '../components/NavegarDia'
import { Botao, BotaoLink, Cabecalho, Carregando, Painel, Pilula, Principal, Tabela, Td, Th, Vazio } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { diaPorExtenso, hojeIso, hora, situacaoConsulta } from '../lib/formato'
import { useSessao } from '../lib/sessao'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>
interface Dados { dia: string; consultas: Linha[]; medicos: Linha[]; agendaPropria: boolean }

export default function Agenda() {
  const { pode } = useSessao()
  const avisar = useAviso()
  const [params, setParams] = useSearchParams()
  const dia = params.get('data') ?? hojeIso()
  const { dados, carregando, erro, recarregar } = useApi<Dados>('api/agenda', { data: dia })
  const [cancelar, setCancelar] = useState<Linha | null>(null)
  const [ocupado, setOcupado] = useState<number | null>(null)

  const acao = async (url: string, corpo?: Record<string, unknown>) => {
    try { const r = await post(url, corpo); avisar(r.message ?? 'Feito.'); recarregar() }
    catch (e) { avisar(e instanceof ApiError ? e.message : 'Não foi possível concluir.', false) }
  }

  const consultas = dados?.consultas ?? []
  const ativas = consultas.filter((c) => c.status !== 'cancelada').length
  const chegaram = consultas.filter((c) => !['agendada', 'cancelada', 'ausente'].includes(String(c.status))).length
  const ehHoje = dia === hojeIso()

  return (
    <>
      <Cabecalho
        titulo={dados?.agendaPropria ? 'Minha agenda' : 'Agenda de consultas'}
        subtitulo={`${diaPorExtenso(dia)}${ehHoje ? ' (hoje)' : ''} · ${ativas} ${ativas === 1 ? 'consulta' : 'consultas'}, ${chegaram} já na unidade`}
        acoes={<>
          <NavegarDia dia={dia} aoTrocar={(d) => setParams({ data: d })} />
          {pode('consultas.agendar') && <BotaoLink to="/agenda/nova" variante="primario" icone={CalendarPlus}>Agendar consulta</BotaoLink>}
        </>}
      />
      {carregando && !dados ? <Carregando /> : erro ? <Vazio>{erro.message}</Vazio> : dados && (
        <div className="grid gap-5">
          {dados.medicos.length > 0 && (
            <Painel titulo="Linha do dia" meta="uma linha por médico">
              <LinhaDoDia medicos={dados.medicos} consultas={consultas} mostrarAgora={ehHoje} />
            </Painel>
          )}
          <Painel titulo="Consultas do dia" meta={`${consultas.length} no total`} semPadding delay={0.1}>
            {consultas.length === 0 ? <div className="p-5"><Vazio>Nenhuma consulta neste dia.</Vazio></div> : (
              <Tabela cabecalho={<><Th className="w-20">Hora</Th><Th>Paciente</Th><Th className="hidden md:table-cell">Médico</Th><Th>Situação</Th><Th /></>}>
                {consultas.map((c) => {
                  const st = String(c.status)
                  const [rot, tom] = situacaoConsulta(st)
                  const id = Number(c.id_consulta)
                  return (
                    <tr key={id}>
                      <Td className="num text-[15px] font-semibold">{hora(c.data_hora)}</Td>
                      <Td>
                        <Principal sub={`${c.tipo === 'encaixe' ? 'Encaixe · ' : ''}${c.especialidade}`}>
                          {pode('pacientes.view') ? <Link to={`/pacientes/${c.id_paciente}`} className="hover:text-brand-700">{String(c.paciente)}</Link> : String(c.paciente)}
                        </Principal>
                      </Td>
                      <Td className="hidden md:table-cell">{String(c.medico)}</Td>
                      <Td><Pilula tom={tom}>{rot}</Pilula></Td>
                      <Td className="text-right whitespace-nowrap">
                        {pode('consultas.chegada') && ehHoje && st === 'agendada' && (
                          <Botao pequeno carregando={ocupado === id} onClick={async () => { setOcupado(id); await acao(`api/consultas/${id}/chegada`); setOcupado(null) }}>Registrar chegada</Botao>
                        )}
                        {pode('consultas.remarcar') && st === 'agendada' && <BotaoLink to={`/agenda/${id}/remarcar`} variante="texto" pequeno>Remarcar</BotaoLink>}
                        {pode('consultas.cancelar') && (st === 'agendada' || st === 'aguardando_triagem') && (
                          <Botao variante="perigoTexto" pequeno onClick={() => setCancelar(c)}>Cancelar</Botao>
                        )}
                      </Td>
                    </tr>
                  )
                })}
              </Tabela>
            )}
          </Painel>
        </div>
      )}
      <DialogoMotivo
        aberto={!!cancelar}
        titulo={cancelar ? `Cancelar consulta das ${hora(cancelar.data_hora)} de ${cancelar.paciente}` : ''}
        ajuda="O motivo fica registrado no histórico. O paciente recebe um aviso por e-mail, sem detalhes clínicos."
        botao="Confirmar cancelamento"
        aoFechar={() => setCancelar(null)}
        aoConfirmar={async (motivo) => { await acao(`api/consultas/${cancelar!.id_consulta}/cancelar`, { motivo }); setCancelar(null) }}
      />
    </>
  )
}
