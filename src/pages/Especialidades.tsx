import { useState, type FormEvent } from 'react'
import { useAviso } from '../components/avisos'
import { AreaTexto, Botao, Cabecalho, Campo, Carregando, Entrada, Painel, Pilula, Principal, Tabela, Td, Th, Vazio } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>

export default function Especialidades() {
  const avisar = useAviso()
  const { dados, carregando, erro, recarregar } = useApi<{ especialidades: Linha[] }>('api/especialidades')
  const [editando, setEditando] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)

  const limpar = () => { setEditando(null); setNome(''); setDescricao(''); setErros({}) }
  const salvar = async (e: FormEvent) => {
    e.preventDefault(); setEnviando(true); setErros({})
    try {
      const r = await post(editando ? `api/especialidades/${editando}` : 'api/especialidades', { nome, descricao })
      avisar(r.message ?? 'Salvo.'); limpar(); recarregar()
    } catch (err) { if (err instanceof ApiError) { setErros(err.details ?? {}); avisar(err.message, false) } }
    finally { setEnviando(false) }
  }
  const situacao = async (e: Linha, ativa: boolean) => {
    try { const r = await post(`api/especialidades/${e.id_especialidade}/situacao`, { ativo: ativa ? '0' : '1' }); avisar(r.message ?? 'Feito.'); recarregar() }
    catch (err) { avisar(err instanceof ApiError ? err.message : 'Não foi possível alterar.', false) }
  }

  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message}</Vazio>
  const lista = dados.especialidades
  const ativas = lista.filter((e) => String(e.ativo) === '1').length

  return (
    <>
      <Cabecalho trilha={[{ rotulo: 'Profissionais', to: '/profissionais' }, { rotulo: 'Especialidades' }]} titulo="Especialidades"
        subtitulo={`${ativas} ativas de ${lista.length}. Inativa, a especialidade some do agendamento, mas continua no histórico.`} />
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Painel titulo="Cadastradas" semPadding>
          <Tabela cabecalho={<><Th>Especialidade</Th><Th className="num">Médicos</Th><Th className="num hidden md:table-cell">Consultas futuras</Th><Th>Situação</Th><Th /></>}>
            {lista.map((e) => {
              const ativa = String(e.ativo) === '1'
              return (
                <tr key={String(e.id_especialidade)}>
                  <Td><Principal sub={e.descricao ? String(e.descricao) : undefined}>{String(e.nome)}</Principal></Td>
                  <Td className="num">{String(e.medicos)}</Td>
                  <Td className="num hidden md:table-cell">{String(e.consultas_futuras)}</Td>
                  <Td><Pilula tom={ativa ? 'positive' : 'neutral'}>{ativa ? 'Ativa' : 'Inativa'}</Pilula></Td>
                  <Td className="text-right whitespace-nowrap">
                    <Botao pequeno variante="texto" onClick={() => { setEditando(String(e.id_especialidade)); setNome(String(e.nome)); setDescricao(String(e.descricao ?? '')); setErros({}) }}>Editar</Botao>
                    <Botao pequeno variante={ativa ? 'perigoTexto' : 'secundario'} onClick={() => situacao(e, ativa)}>{ativa ? 'Inativar' : 'Reativar'}</Botao>
                  </Td>
                </tr>
              )
            })}
          </Tabela>
        </Painel>
        <Painel titulo={editando ? 'Editar especialidade' : 'Nova especialidade'} delay={0.1} className="self-start">
          <form onSubmit={salvar} noValidate className="grid gap-3">
            <Campo rotulo="Nome" nome="nomeEsp" obrigatorio erro={erros.nome}><Entrada name="nomeEsp" maxLength={100} value={nome} onChange={(e) => setNome(e.target.value)} invalido={!!erros.nome} /></Campo>
            <Campo rotulo="Descrição" nome="descEsp" erro={erros.descricao}><AreaTexto name="descEsp" maxLength={255} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></Campo>
            <div className="flex justify-end gap-2">
              {editando && <Botao type="button" onClick={limpar}>Cancelar edição</Botao>}
              <Botao type="submit" variante="primario" carregando={enviando}>{editando ? 'Salvar alterações' : 'Cadastrar'}</Botao>
            </div>
          </form>
        </Painel>
      </div>
    </>
  )
}
