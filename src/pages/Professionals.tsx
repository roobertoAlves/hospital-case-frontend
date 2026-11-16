import { ListChecks, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, ButtonLink, PageHeader, Loading, Input, Panel, Badge, Main, Select, Table, Td, Th, Empty } from '../components/ui'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
const TYPE: Record<string, string> = { medico: 'Médico', enfermeiro: 'Enfermeiro', funcionario: 'Funcionário' }

export default function Professionals() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const type = params.get('tipo') ?? ''
  const inactive = params.get('inactive') === '1'
  const [term, setTerm] = useState(q)
  const { data, loading, error } = useApi<{ professionals: Row[] }>('api/professionals', { q, type: type, inactive: inactive ? 1 : null })
  const list = data?.professionals ?? []
  const account = (t: string) => list.filter((p) => p.tipo === t).length

  const applyFilter = (e: FormEvent) => {
    e.preventDefault()
    const n = new URLSearchParams()
    if (term.trim()) n.set('q', term.trim())
    if (type) n.set('tipo', type)
    if (inactive) n.set('inactive', '1')
    setParams(n)
  }
  const change = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n) }

  return (
    <>
      <PageHeader
        title="Profissionais"
        subtitle={data ? `${account('medico')} médicos · ${account('enfermeiro')} enfermeiros · ${account('funcionario')} funcionários${inactive ? ' (incluindo inativos)' : ''}` : ' '}
        actions={<>
          <ButtonLink to="/especialidades" icon={ListChecks}>Especialidades</ButtonLink>
          <ButtonLink to="/profissionais/novo" variant="primario" icon={Plus}>Cadastrar profissional</ButtonLink>
        </>}
      />
      <form onSubmit={applyFilter} className="mb-5 flex flex-wrap items-center gap-2" role="search">
        <label htmlFor="buscaProf" className="sr-only">Nome, CRM ou COREN</label>
        <Input id="buscaProf" type="search" placeholder="Nome, CRM ou COREN" value={term} onChange={(e) => setTerm(e.target.value)} className="max-w-[300px]" />
        <label htmlFor="tipoProf" className="sr-only">Tipo</label>
        <Select id="tipoProf" value={type} onChange={(e) => change('tipo', e.target.value)} className="w-[180px]">
          <option value="">Todos os tipos</option><option value="medico">Médicos</option><option value="enfermeiro">Enfermeiros</option><option value="funcionario">Funcionários</option>
        </Select>
        <label className="flex items-center gap-2 text-muted"><input type="checkbox" className="size-4 accent-ink" checked={inactive} onChange={(e) => change('inactive', e.target.checked ? '1' : '')} /> Incluir inativos</label>
        <Button type="submit">Filtrar</Button>
      </form>
      {loading && !data ? <Loading /> : error ? <Empty>{error.message}</Empty> : list.length === 0 ? <Empty>Nenhum profissional com esse filtro.</Empty> : (
        <Panel noPadding>
          <Table header={<><Th>Profissional</Th><Th>Tipo</Th><Th className="num">Registro</Th><Th className="hidden lg:table-cell">Acesso ao sistema</Th><Th className="hidden md:table-cell">Situação</Th><Th /></>}>
            {list.map((p) => {
              const active = String(p.ativo) === '1'
              const license = p.crm ? `CRM ${p.crm}/${p.crm_uf}` : p.coren ? `COREN ${p.coren}/${p.coren_uf}` : '—'
              const sub = p.tipo === 'medico' ? String(p.especialidades ?? 'sem especialidade') : p.tipo === 'funcionario' ? String(p.cargo ?? '') : ''
              return (
                <tr key={String(p.id_profissional)}>
                  <Td><Link to={`/profissionais/${p.id_profissional}`} className="hover:text-brand-700"><Main sub={sub || undefined}>{String(p.nome)}</Main></Link></Td>
                  <Td>{TYPE[String(p.tipo)]}</Td>
                  <Td className="num whitespace-nowrap">{license}</Td>
                  <Td className="hidden lg:table-cell">{p.usuario_email ? <>{String(p.usuario_email)}{String(p.usuario_status) === '0' && <> <Badge>usuário inativo</Badge></>}</> : <span className="text-faint">sem acesso</span>}</Td>
                  <Td className="hidden md:table-cell"><Badge tone={active ? 'positive' : 'neutral'}>{active ? 'Ativo' : 'Inativo'}</Badge></Td>
                  <Td className="text-right"><ButtonLink to={`/profissionais/${p.id_profissional}`} small>Abrir</ButtonLink></Td>
                </tr>
              )
            })}
          </Table>
        </Panel>
      )}
    </>
  )
}
