import { HeartPulse } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAviso } from '../components/avisos'
import { Botao, BotaoLink, Cabecalho, Carregando, Painel, Pilula, Principal, Prioridade, Tabela, Td, Th, Vazio } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { hora, idade, situacaoConsulta } from '../lib/formato'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>

export default function Triagem() {
  const navigate = useNavigate()
  const avisar = useAviso()
  const { dados, carregando, erro, recarregar } = useApi<{ fila: Linha[]; recentes: Linha[]; classificacoes: Linha[] }>('api/triagem')
  const [iniciando, setIniciando] = useState<number | null>(null)

  const iniciar = async (id: number) => {
    setIniciando(id)
    try {
      await post(`api/triagem/${id}/iniciar`)
      navigate(`/triagem/${id}`)
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'Não foi possível iniciar.', false)
      recarregar()
    } finally { setIniciando(null) }
  }

  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message}</Vazio>
  const aguardando = dados.fila.filter((c) => c.status === 'aguardando_triagem').length

  return (
    <>
      <Cabecalho titulo="Fila de triagem" subtitulo={`${aguardando} aguardando · ${dados.fila.length - aguardando} em triagem agora · por ordem de chegada`}
        acoes={<Botao onClick={recarregar}>Atualizar</Botao>} />
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Painel titulo="Pacientes que chegaram" meta="a recepção registra a chegada" semPadding>
          {dados.fila.length === 0 ? <div className="p-5"><Vazio icone={HeartPulse}>Ninguém aguardando triagem agora.</Vazio></div> : (
            <Tabela cabecalho={<><Th className="w-20">Chegada</Th><Th>Paciente</Th><Th className="hidden md:table-cell">Consulta com</Th><Th>Situação</Th><Th /></>}>
              {dados.fila.map((c) => {
                const id = Number(c.id_consulta)
                const emTriagem = c.status === 'em_triagem'
                const [rot, tom] = situacaoConsulta(c.status)
                const anos = idade(c.data_nascimento)
                return (
                  <tr key={id}>
                    <Td className="num font-semibold">{hora(c.chegada_em)}</Td>
                    <Td><Principal sub={anos !== null ? `${anos} anos` : undefined}>{String(c.paciente)}</Principal></Td>
                    <Td className="hidden md:table-cell"><Principal sub={`${c.especialidade} · ${hora(c.data_hora)}`}>{String(c.medico)}</Principal></Td>
                    <Td><Pilula tom={tom}>{rot}</Pilula></Td>
                    <Td className="text-right">
                      {emTriagem ? <BotaoLink to={`/triagem/${id}`} pequeno>Continuar</BotaoLink>
                        : <Botao pequeno variante="primario" carregando={iniciando === id} onClick={() => iniciar(id)}>Iniciar triagem</Botao>}
                    </Td>
                  </tr>
                )
              })}
            </Tabela>
          )}
        </Painel>
        <div className="grid content-start gap-5">
          <Painel titulo="Suas triagens de hoje" meta={String(dados.recentes.length)} delay={0.1}>
            {dados.recentes.length === 0 ? <p className="text-muted">Você ainda não registrou triagens hoje.</p> : (
              <ul className="divide-y divide-rule">
                {dados.recentes.map((t, i) => (
                  <li key={i}>
                    <Link to={`/triagem/${t.id_consulta}`} className="flex items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-raised">
                      <span className="num w-12 font-medium">{hora(t.registrado_em)}</span>
                      <span className="min-w-0 grow">
                        <span className="block truncate font-medium">{String(t.paciente)}</span>
                        <span className="block text-[12px] text-muted"><Prioridade cor={t.cor_hex} nome={t.prioridade} />{String(t.retificada) !== '0' ? ' · retificada' : ''}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Painel>
          <Painel titulo="Classificação de prioridade" delay={0.15}>
            <ul className="space-y-2">
              {dados.classificacoes.map((p) => (
                <li key={String(p.id_classificacao)} className="flex items-center justify-between">
                  <Prioridade cor={p.cor_hex} nome={p.nome} />
                  <span className="text-[12px] text-muted">{Number(p.tempo_alvo_min) === 0 ? 'imediato' : `até ${p.tempo_alvo_min} min`}</span>
                </li>
              ))}
            </ul>
          </Painel>
        </div>
      </div>
    </>
  )
}
