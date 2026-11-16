import { Stethoscope } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Alerta, Botao, Cabecalho, Carregando, Painel, Pilula, Principal, Prioridade, Tabela, Td, Th, Vazio } from '../components/ui'
import { hora, idade, situacaoConsulta } from '../lib/formato'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>

export default function Atendimento() {
  const navigate = useNavigate()
  const { dados, carregando, erro, recarregar } = useApi<{ fila: Linha[]; semCadastro?: boolean }>('api/atendimento')
  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message}</Vazio>
  const aguardando = dados.fila.filter((c) => c.status === 'aguardando_atendimento').length

  return (
    <>
      <Cabecalho titulo="Fila de atendimento" subtitulo={`${aguardando} aguardando · ordenada pela prioridade da triagem e, depois, pela chegada`}
        acoes={<Botao onClick={recarregar}>Atualizar</Botao>} />
      {dados.semCadastro && <div className="mb-4"><Alerta tom="erro">Seu usuário não está ligado a um médico ativo. Peça à administração para vincular o cadastro.</Alerta></div>}
      <Painel semPadding>
        {dados.fila.length === 0 ? <div className="p-5"><Vazio icone={Stethoscope}>Ninguém aguardando atendimento agora.</Vazio></div> : (
          <Tabela cabecalho={<><Th>Prioridade</Th><Th>Paciente</Th><Th className="hidden lg:table-cell">Queixa (triagem)</Th><Th className="hidden md:table-cell w-20">Chegada</Th><Th>Situação</Th><Th /></>}>
            {dados.fila.map((c) => {
              const [rot, tom] = situacaoConsulta(c.status)
              const anos = idade(c.data_nascimento)
              const emAtendimento = c.status === 'em_atendimento'
              return (
                <tr key={String(c.id_consulta)} className="cursor-pointer" onClick={() => navigate(`/atendimento/${c.id_consulta}`)}>
                  <Td><Prioridade cor={c.cor_hex} nome={c.prioridade} /></Td>
                  <Td><Principal sub={`${anos !== null ? `${anos} anos · ` : ''}${c.especialidade}`}>{String(c.paciente)}</Principal></Td>
                  <Td className="hidden max-w-[320px] truncate text-muted lg:table-cell">{String(c.queixa_principal ?? '')}</Td>
                  <Td className="num hidden md:table-cell">{hora(c.chegada_em)}</Td>
                  <Td><Pilula tom={tom}>{rot}</Pilula></Td>
                  <Td className="text-right"><Botao pequeno variante={emAtendimento ? 'secundario' : 'primario'}>{emAtendimento ? 'Continuar' : 'Chamar e atender'}</Botao></Td>
                </tr>
              )
            })}
          </Tabela>
        )}
      </Painel>
    </>
  )
}
