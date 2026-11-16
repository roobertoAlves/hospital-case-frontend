import { ChevronLeft, ChevronRight, UserPlus, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, ButtonLink, PageHeader, Loading, Input, Panel, Badge, Main, Table, Td, Th, Empty } from '../components/ui'
import { maskedCpf, formatDate, age, or } from '../lib/format'
import { useSession } from '../lib/session'
import { useApi } from '../lib/useApi'

interface PatientList {
  q: string
  inativos: boolean
  resultado: { itens: Record<string, unknown>[]; total: number; pagina: number; porPagina: number }
}

export default function Patients() {
  const { can } = useSession()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const inactive = params.get('inativos') === '1'
  const page = Number(params.get('pagina') ?? 1)
  const [term, setTerm] = useState(q)
  const { data, loading, error } = useApi<PatientList>('api/pacientes', { q, inativos: inactive ? 1 : null, page })

  const search = (e: FormEvent) => {
    e.preventDefault()
    const n = new URLSearchParams()
    if (term.trim()) n.set('q', term.trim())
    if (inactive) n.set('inativos', '1')
    setParams(n)
  }
  const goTo = (p: number) => { const n = new URLSearchParams(params); n.set('pagina', String(p)); setParams(n) }

  const r = data?.resultado
  const totalPages = r ? Math.max(1, Math.ceil(r.total / r.porPagina)) : 1

  return (
    <>
      <PageHeader
        title="Pacientes"
        subtitle={r ? `${r.total} ${r.total === 1 ? 'paciente' : 'pacientes'}${q ? ` encontrados para “${q}”` : ''}${inactive ? ' (incluindo inativos)' : ''}` : ' '}
        actions={can('pacientes.create') && <ButtonLink to="/pacientes/novo" variant="primario" icon={UserPlus}>Cadastrar paciente</ButtonLink>}
      />
      <form onSubmit={search} className="mb-5 flex flex-wrap items-center gap-2" role="search">
        <label htmlFor="buscaLista" className="sr-only">Nome ou CPF</label>
        <Input id="buscaLista" type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Nome ou CPF" className="max-w-[340px]" />
        <label className="flex items-center gap-2 text-muted">
          <input type="checkbox" checked={inactive} onChange={(e) => { const n = new URLSearchParams(params); if (e.target.checked) n.set('inativos', '1'); else n.delete('inativos'); n.delete('pagina'); setParams(n) }} className="size-4 accent-ink" />
          Incluir inativos
        </label>
        <Button type="submit">Buscar</Button>
        {(q || inactive) && <ButtonLink to="/pacientes" variant="texto">Limpar</ButtonLink>}
      </form>

      {loading && !data ? <Loading /> : error ? <Empty>{error.message}</Empty> : r && r.itens.length === 0 ? (
        <Empty icon={Users}>{q ? 'Nenhum paciente com esse nome ou CPF.' : 'Nenhum paciente cadastrado ainda.'}</Empty>
      ) : r && (
        <Panel noPadding>
          <Table header={<><Th>Paciente</Th><Th className="num">CPF</Th><Th className="hidden md:table-cell">Idade</Th><Th className="hidden md:table-cell">Telefone</Th><Th className="hidden sm:table-cell">Situação</Th><Th /></>}>
            {r.itens.map((p) => {
              const active = Number(p.ativo) === 1
              return (
                <tr key={String(p.id_paciente)}>
                  <Td><Link to={`/pacientes/${p.id_paciente}`} className="hover:text-brand-700"><Main sub={`Nasc. ${formatDate(p.data_nascimento)}`}>{String(p.nome)}</Main></Link></Td>
                  <Td className="num">{maskedCpf(p.cpf)}</Td>
                  <Td className="num hidden md:table-cell">{age(p.data_nascimento)} anos</Td>
                  <Td className="num hidden md:table-cell">{or(p.telefone)}</Td>
                  <Td className="hidden sm:table-cell"><Badge tone={active ? 'positive' : 'neutral'}>{active ? 'Ativo' : 'Inativo'}</Badge></Td>
                  <Td className="text-right whitespace-nowrap">
                    {active && can('consultas.agendar') && <ButtonLink to={`/agenda/nova?paciente=${p.id_paciente}`} variant="texto" small>Agendar</ButtonLink>}
                    <ButtonLink to={`/pacientes/${p.id_paciente}`} small>Ver ficha</ButtonLink>
                  </Td>
                </tr>
              )
            })}
          </Table>
          <div className="flex items-center justify-between border-t border-rule px-4 py-3 text-[13px] text-muted">
            <span>Página {r.pagina} de {totalPages}</span>
            <span className="flex gap-2">
              {r.pagina > 1 && <Button small icon={ChevronLeft} onClick={() => goTo(r.pagina - 1)}>Anterior</Button>}
              {r.pagina < totalPages && <Button small onClick={() => goTo(r.pagina + 1)}>Próxima <ChevronRight className="size-4" /></Button>}
            </span>
          </div>
        </Panel>
      )}
    </>
  )
}
