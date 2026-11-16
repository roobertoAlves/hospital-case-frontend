import { useState, type FormEvent } from 'react'
import { useNotice } from '../components/notices'
import { TextArea, Button, PageHeader, Field, Loading, Input, Panel, Badge, Main, Table, Td, Th, Empty } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>

export default function Specialties() {
  const notify = useNotice()
  const { data, loading, error, reload } = useApi<{ specialties: Row[] }>('api/especialidades')
  const [editing, setEditing] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)

  const clear = () => { setEditing(null); setNome(''); setDescricao(''); setErrors({}) }
  const save = async (e: FormEvent) => {
    e.preventDefault(); setSending(true); setErrors({})
    try {
      const r = await post(editing ? `api/especialidades/${editing}` : 'api/especialidades', { nome, descricao })
      notify(r.message ?? 'Salvo.'); clear(); reload()
    } catch (err) { if (err instanceof ApiError) { setErrors(err.details ?? {}); notify(err.message, false) } }
    finally { setSending(false) }
  }
  const status = async (e: Row, active: boolean) => {
    try { const r = await post(`api/especialidades/${e.id_especialidade}/situacao`, { ativo: active ? '0' : '1' }); notify(r.message ?? 'Feito.'); reload() }
    catch (err) { notify(err instanceof ApiError ? err.message : 'Não foi possível alterar.', false) }
  }

  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message}</Empty>
  const list = data.specialties
  const activeOnes = list.filter((e) => String(e.ativo) === '1').length

  return (
    <>
      <PageHeader breadcrumb={[{ label: 'Profissionais', to: '/profissionais' }, { label: 'Especialidades' }]} title="Especialidades"
        subtitle={`${activeOnes} ativas de ${list.length}. Inativa, a especialidade some do agendamento, mas continua no histórico.`} />
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Panel title="Cadastradas" noPadding>
          <Table header={<><Th>Especialidade</Th><Th className="num">Médicos</Th><Th className="num hidden md:table-cell">Consultas futuras</Th><Th>Situação</Th><Th /></>}>
            {list.map((e) => {
              const active = String(e.ativo) === '1'
              return (
                <tr key={String(e.id_especialidade)}>
                  <Td><Main sub={e.descricao ? String(e.descricao) : undefined}>{String(e.nome)}</Main></Td>
                  <Td className="num">{String(e.medicos)}</Td>
                  <Td className="num hidden md:table-cell">{String(e.consultas_futuras)}</Td>
                  <Td><Badge tone={active ? 'positive' : 'neutral'}>{active ? 'Ativa' : 'Inativa'}</Badge></Td>
                  <Td className="text-right whitespace-nowrap">
                    <Button small variant="texto" onClick={() => { setEditing(String(e.id_especialidade)); setNome(String(e.nome)); setDescricao(String(e.descricao ?? '')); setErrors({}) }}>Editar</Button>
                    <Button small variant={active ? 'perigoTexto' : 'secundario'} onClick={() => status(e, active)}>{active ? 'Inativar' : 'Reativar'}</Button>
                  </Td>
                </tr>
              )
            })}
          </Table>
        </Panel>
        <Panel title={editing ? 'Editar especialidade' : 'Nova especialidade'} delay={0.1} className="self-start">
          <form onSubmit={save} noValidate className="grid gap-3">
            <Field label="Nome" name="nomeEsp" required error={errors.nome}><Input name="nomeEsp" maxLength={100} value={nome} onChange={(e) => setNome(e.target.value)} invalid={!!errors.nome} /></Field>
            <Field label="Descrição" name="descEsp" error={errors.descricao}><TextArea name="descEsp" maxLength={255} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></Field>
            <div className="flex justify-end gap-2">
              {editing && <Button type="button" onClick={clear}>Cancelar edição</Button>}
              <Button type="submit" variant="primario" loading={sending}>{editing ? 'Salvar alterações' : 'Cadastrar'}</Button>
            </div>
          </form>
        </Panel>
      </div>
    </>
  )
}
