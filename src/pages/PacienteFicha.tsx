import { CalendarPlus, FileText, FlaskConical, Pencil } from 'lucide-react'
import { useParams } from 'react-router'
import { useAviso } from '../components/avisos'
import { Botao, BotaoLink, Cabecalho, Carregando, Painel, Pilula, Tabela, Td, Th, Vazio } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { cpfFormatado, data, dataHora, idade, ou, situacaoConsulta, situacaoExame } from '../lib/formato'
import { useSessao } from '../lib/sessao'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>

const SEXO: Record<string, string> = { feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro', nao_informado: 'Prefere não informar' }

export default function PacienteFicha() {
  const { id } = useParams()
  const { pode } = useSessao()
  const avisar = useAviso()
  const { dados, carregando, erro, recarregar } = useApi<{ paciente: Linha; historico: Linha[] }>(`api/pacientes/${id}`)
  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message ?? 'Paciente não encontrado.'}</Vazio>
  const p = dados.paciente
  const ativo = Number(p.ativo) === 1
  const endereco = ['logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'].map((k) => p[k]).filter(Boolean).join(', ')
    + (p.cep ? ` · CEP ${String(p.cep).slice(0, 5)}-${String(p.cep).slice(5)}` : '')

  const alternar = async () => {
    try {
      const r = await post(`api/pacientes/${id}/situacao`, { ativo: ativo ? '0' : '1' })
      avisar(r.message ?? 'Situação alterada.')
      recarregar()
    } catch (e) { avisar(e instanceof ApiError ? e.message : 'Não foi possível alterar.', false) }
  }

  const linha = (rotulo: string, valor: React.ReactNode) => (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-rule py-2.5 last:border-0">
      <dt className="text-muted">{rotulo}</dt><dd className="min-w-0">{valor}</dd>
    </div>
  )

  return (
    <>
      <Cabecalho
        trilha={[{ rotulo: 'Pacientes', to: '/pacientes' }, { rotulo: 'Ficha' }]}
        titulo={String(p.nome)}
        subtitulo={<span className="flex flex-wrap items-center gap-2">{idade(p.data_nascimento)} anos · CPF {cpfFormatado(p.cpf)} <Pilula tom={ativo ? 'positive' : 'neutral'}>{ativo ? 'Ativo' : 'Inativo'}</Pilula></span>}
        acoes={<>
          {pode('pacientes.inativar') && <Botao variante={ativo ? 'perigoTexto' : 'texto'} onClick={alternar}>{ativo ? 'Inativar' : 'Reativar'}</Botao>}
          {pode('historico.view') && <BotaoLink to={`/pacientes/${id}/historico`} icone={FileText}>Histórico</BotaoLink>}
          {pode('pacientes.edit') && <BotaoLink to={`/pacientes/${id}/editar`} icone={Pencil}>Editar cadastro</BotaoLink>}
          {ativo && pode('exames.agendar') && <BotaoLink to={`/exames/novo?paciente=${id}`} icone={FlaskConical}>Agendar exame</BotaoLink>}
          {ativo && pode('consultas.agendar') && <BotaoLink to={`/agenda/nova?paciente=${id}`} variante="primario" icone={CalendarPlus}>Agendar consulta</BotaoLink>}
        </>}
      />
      <div className="grid gap-5 xl:grid-cols-[5fr_7fr]">
        <Painel titulo="Dados cadastrais" meta={`atualizado em ${dataHora(p.atualizado_em)}`}>
          <dl>
            {linha('Nascimento', <span className="num">{data(p.data_nascimento)}</span>)}
            {linha('Sexo', SEXO[String(p.sexo)] ?? '—')}
            {linha('Telefone', <span className="num">{ou(p.telefone)}</span>)}
            {linha('E-mail', ou(p.email))}
            {linha('Endereço', ou(endereco))}
            {linha('Emergência', p.contato_emergencia_nome ? <>{String(p.contato_emergencia_nome)}{p.contato_emergencia_parentesco ? ` (${p.contato_emergencia_parentesco})` : ''}<span className="num block text-[12px] text-muted">{ou(p.contato_emergencia_telefone)}</span></> : '—')}
            {linha('Cadastrado em', <span className="num">{dataHora(p.criado_em)}</span>)}
          </dl>
        </Painel>
        <Painel titulo="Consultas e exames" meta={`${dados.historico.length} registros · mais recentes primeiro`} semPadding delay={0.1}>
          {dados.historico.length === 0 ? <div className="p-5"><Vazio>Nenhuma consulta ou exame agendado.</Vazio></div> : (
            <Tabela cabecalho={<><Th>Data</Th><Th>Tipo</Th><Th>Detalhe</Th><Th>Situação</Th></>}>
              {dados.historico.map((h, i) => {
                const consulta = h.tipo === 'consulta'
                const [rot, tom] = consulta ? situacaoConsulta(h.status) : situacaoExame(h.status)
                return (
                  <tr key={i}>
                    <Td className="num whitespace-nowrap">{dataHora(h.data_hora)}</Td>
                    <Td>{consulta ? 'Consulta' : 'Exame'}</Td>
                    <Td>{String(h.descricao)}{h.motivo_cancelamento ? <span className="block text-[12px] text-muted">Motivo: {String(h.motivo_cancelamento)}</span> : null}</Td>
                    <Td><Pilula tom={tom}>{rot}</Pilula></Td>
                  </tr>
                )
              })}
            </Tabela>
          )}
        </Painel>
      </div>
    </>
  )
}
