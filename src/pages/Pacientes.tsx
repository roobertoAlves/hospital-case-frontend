import { ChevronLeft, ChevronRight, UserPlus, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Botao, BotaoLink, Cabecalho, Carregando, Entrada, Painel, Pilula, Principal, Tabela, Td, Th, Vazio } from '../components/ui'
import { cpfMascarado, data, idade, ou } from '../lib/formato'
import { useSessao } from '../lib/sessao'
import { useApi } from '../lib/useApi'

interface Lista {
  q: string
  inativos: boolean
  resultado: { itens: Record<string, unknown>[]; total: number; pagina: number; porPagina: number }
}

export default function Pacientes() {
  const { pode } = useSessao()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const inativos = params.get('inativos') === '1'
  const pagina = Number(params.get('pagina') ?? 1)
  const [termo, setTermo] = useState(q)
  const { dados, carregando, erro } = useApi<Lista>('api/pacientes', { q, inativos: inativos ? 1 : null, pagina })

  const buscar = (e: FormEvent) => {
    e.preventDefault()
    const n = new URLSearchParams()
    if (termo.trim()) n.set('q', termo.trim())
    if (inativos) n.set('inativos', '1')
    setParams(n)
  }
  const irPara = (p: number) => { const n = new URLSearchParams(params); n.set('pagina', String(p)); setParams(n) }

  const r = dados?.resultado
  const totalPaginas = r ? Math.max(1, Math.ceil(r.total / r.porPagina)) : 1

  return (
    <>
      <Cabecalho
        titulo="Pacientes"
        subtitulo={r ? `${r.total} ${r.total === 1 ? 'paciente' : 'pacientes'}${q ? ` encontrados para “${q}”` : ''}${inativos ? ' (incluindo inativos)' : ''}` : ' '}
        acoes={pode('pacientes.create') && <BotaoLink to="/pacientes/novo" variante="primario" icone={UserPlus}>Cadastrar paciente</BotaoLink>}
      />
      <form onSubmit={buscar} className="mb-5 flex flex-wrap items-center gap-2" role="search">
        <label htmlFor="buscaLista" className="sr-only">Nome ou CPF</label>
        <Entrada id="buscaLista" type="search" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Nome ou CPF" className="max-w-[340px]" />
        <label className="flex items-center gap-2 text-muted">
          <input type="checkbox" checked={inativos} onChange={(e) => { const n = new URLSearchParams(params); if (e.target.checked) n.set('inativos', '1'); else n.delete('inativos'); n.delete('pagina'); setParams(n) }} className="size-4 accent-ink" />
          Incluir inativos
        </label>
        <Botao type="submit">Buscar</Botao>
        {(q || inativos) && <BotaoLink to="/pacientes" variante="texto">Limpar</BotaoLink>}
      </form>

      {carregando && !dados ? <Carregando /> : erro ? <Vazio>{erro.message}</Vazio> : r && r.itens.length === 0 ? (
        <Vazio icone={Users}>{q ? 'Nenhum paciente com esse nome ou CPF.' : 'Nenhum paciente cadastrado ainda.'}</Vazio>
      ) : r && (
        <Painel semPadding>
          <Tabela cabecalho={<><Th>Paciente</Th><Th className="num">CPF</Th><Th className="hidden md:table-cell">Idade</Th><Th className="hidden md:table-cell">Telefone</Th><Th className="hidden sm:table-cell">Situação</Th><Th /></>}>
            {r.itens.map((p) => {
              const ativo = Number(p.ativo) === 1
              return (
                <tr key={String(p.id_paciente)}>
                  <Td><Link to={`/pacientes/${p.id_paciente}`} className="hover:text-brand-700"><Principal sub={`Nasc. ${data(p.data_nascimento)}`}>{String(p.nome)}</Principal></Link></Td>
                  <Td className="num">{cpfMascarado(p.cpf)}</Td>
                  <Td className="num hidden md:table-cell">{idade(p.data_nascimento)} anos</Td>
                  <Td className="num hidden md:table-cell">{ou(p.telefone)}</Td>
                  <Td className="hidden sm:table-cell"><Pilula tom={ativo ? 'positive' : 'neutral'}>{ativo ? 'Ativo' : 'Inativo'}</Pilula></Td>
                  <Td className="text-right whitespace-nowrap">
                    {ativo && pode('consultas.agendar') && <BotaoLink to={`/agenda/nova?paciente=${p.id_paciente}`} variante="texto" pequeno>Agendar</BotaoLink>}
                    <BotaoLink to={`/pacientes/${p.id_paciente}`} pequeno>Ver ficha</BotaoLink>
                  </Td>
                </tr>
              )
            })}
          </Tabela>
          <div className="flex items-center justify-between border-t border-rule px-4 py-3 text-[13px] text-muted">
            <span>Página {r.pagina} de {totalPaginas}</span>
            <span className="flex gap-2">
              {r.pagina > 1 && <Botao pequeno icone={ChevronLeft} onClick={() => irPara(r.pagina - 1)}>Anterior</Botao>}
              {r.pagina < totalPaginas && <Botao pequeno onClick={() => irPara(r.pagina + 1)}>Próxima <ChevronRight className="size-4" /></Botao>}
            </span>
          </div>
        </Painel>
      )}
    </>
  )
}
