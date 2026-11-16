import { ListChecks, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Botao, BotaoLink, Cabecalho, Carregando, Entrada, Painel, Pilula, Principal, Seletor, Tabela, Td, Th, Vazio } from '../components/ui'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>
const TIPO: Record<string, string> = { medico: 'Médico', enfermeiro: 'Enfermeiro', funcionario: 'Funcionário' }

export default function Profissionais() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const tipo = params.get('tipo') ?? ''
  const inativos = params.get('inativos') === '1'
  const [termo, setTermo] = useState(q)
  const { dados, carregando, erro } = useApi<{ profissionais: Linha[] }>('api/profissionais', { q, tipo, inativos: inativos ? 1 : null })
  const lista = dados?.profissionais ?? []
  const conta = (t: string) => lista.filter((p) => p.tipo === t).length

  const filtrar = (e: FormEvent) => {
    e.preventDefault()
    const n = new URLSearchParams()
    if (termo.trim()) n.set('q', termo.trim())
    if (tipo) n.set('tipo', tipo)
    if (inativos) n.set('inativos', '1')
    setParams(n)
  }
  const mudar = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n) }

  return (
    <>
      <Cabecalho
        titulo="Profissionais"
        subtitulo={dados ? `${conta('medico')} médicos · ${conta('enfermeiro')} enfermeiros · ${conta('funcionario')} funcionários${inativos ? ' (incluindo inativos)' : ''}` : ' '}
        acoes={<>
          <BotaoLink to="/especialidades" icone={ListChecks}>Especialidades</BotaoLink>
          <BotaoLink to="/profissionais/novo" variante="primario" icone={Plus}>Cadastrar profissional</BotaoLink>
        </>}
      />
      <form onSubmit={filtrar} className="mb-5 flex flex-wrap items-center gap-2" role="search">
        <label htmlFor="buscaProf" className="sr-only">Nome, CRM ou COREN</label>
        <Entrada id="buscaProf" type="search" placeholder="Nome, CRM ou COREN" value={termo} onChange={(e) => setTermo(e.target.value)} className="max-w-[300px]" />
        <label htmlFor="tipoProf" className="sr-only">Tipo</label>
        <Seletor id="tipoProf" value={tipo} onChange={(e) => mudar('tipo', e.target.value)} className="w-[180px]">
          <option value="">Todos os tipos</option><option value="medico">Médicos</option><option value="enfermeiro">Enfermeiros</option><option value="funcionario">Funcionários</option>
        </Seletor>
        <label className="flex items-center gap-2 text-muted"><input type="checkbox" className="size-4 accent-ink" checked={inativos} onChange={(e) => mudar('inativos', e.target.checked ? '1' : '')} /> Incluir inativos</label>
        <Botao type="submit">Filtrar</Botao>
      </form>
      {carregando && !dados ? <Carregando /> : erro ? <Vazio>{erro.message}</Vazio> : lista.length === 0 ? <Vazio>Nenhum profissional com esse filtro.</Vazio> : (
        <Painel semPadding>
          <Tabela cabecalho={<><Th>Profissional</Th><Th>Tipo</Th><Th className="num">Registro</Th><Th className="hidden lg:table-cell">Acesso ao sistema</Th><Th className="hidden md:table-cell">Situação</Th><Th /></>}>
            {lista.map((p) => {
              const ativo = String(p.ativo) === '1'
              const registro = p.crm ? `CRM ${p.crm}/${p.crm_uf}` : p.coren ? `COREN ${p.coren}/${p.coren_uf}` : '—'
              const sub = p.tipo === 'medico' ? String(p.especialidades ?? 'sem especialidade') : p.tipo === 'funcionario' ? String(p.cargo ?? '') : ''
              return (
                <tr key={String(p.id_profissional)}>
                  <Td><Link to={`/profissionais/${p.id_profissional}`} className="hover:text-brand-700"><Principal sub={sub || undefined}>{String(p.nome)}</Principal></Link></Td>
                  <Td>{TIPO[String(p.tipo)]}</Td>
                  <Td className="num whitespace-nowrap">{registro}</Td>
                  <Td className="hidden lg:table-cell">{p.usuario_email ? <>{String(p.usuario_email)}{String(p.usuario_status) === '0' && <> <Pilula>usuário inativo</Pilula></>}</> : <span className="text-faint">sem acesso</span>}</Td>
                  <Td className="hidden md:table-cell"><Pilula tom={ativo ? 'positive' : 'neutral'}>{ativo ? 'Ativo' : 'Inativo'}</Pilula></Td>
                  <Td className="text-right"><BotaoLink to={`/profissionais/${p.id_profissional}`} pequeno>Abrir</BotaoLink></Td>
                </tr>
              )
            })}
          </Tabela>
        </Painel>
      )}
    </>
  )
}
