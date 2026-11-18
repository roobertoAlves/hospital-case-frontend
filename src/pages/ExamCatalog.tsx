import { FlaskConical, Plus } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Dialog, useNotice } from '../components/notices'
import { SearchSelect } from '../components/SearchSelect'
import { Badge, Button, Empty, Field, Input, Loading, Main, PageHeader, Panel, Table, Td, TextArea, Th } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { categoryLabel } from '../lib/format'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
interface Data { items: Row[]; locations: Row[]; categories: Row[] }

const EMPTY = { nome: '', codigo: '', categoria: '', id_local: '', duracao_min: '15', preparo: '', descricao: '', exige_pedido: '' }

export default function ExamCatalog() {
  const notify = useNotice()
  const { data, loading, error, reload } = useApi<Data>('api/exam-catalog')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [values, setValues] = useState<Record<string, string>>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const items = useMemo(() => {
    const t = q.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    return (data?.items ?? []).filter((i) => !t || `${i.nome} ${i.codigo} ${i.categoria} ${i.local}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(t))
  }, [data, q])

  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message}</Empty>

  const nextCode = (category: string) => {
    const prefix = (data.items.find((i) => i.categoria === category)?.codigo as string | undefined)?.split('-')[0]
    if (!prefix) return ''
    const max = Math.max(0, ...data.items.filter((i) => String(i.codigo ?? '').startsWith(`${prefix}-`)).map((i) => Number(String(i.codigo).split('-')[1]) || 0))
    return `${prefix}-${String(max + 1).padStart(3, '0')}`
  }

  const open = (row?: Row) => {
    setErrors({})
    if (row) {
      const v: Record<string, string> = {}
      for (const k of Object.keys(EMPTY)) v[k] = row[k] == null ? '' : String(row[k])
      setValues(v)
      setEditing(Number(row.id_tipo_exame))
    } else {
      setValues({ ...EMPTY })
      setEditing(0)
    }
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true); setErrors({})
    try {
      const r = await post(editing ? `api/exam-catalog/${editing}` : 'api/exam-catalog', values)
      notify(r.message ?? 'Salvo.'); setEditing(null); reload()
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.details ?? {}); notify(err.message, false) }
    } finally { setSaving(false) }
  }

  const toggle = async (row: Row) => {
    try {
      const r = await post(`api/exam-catalog/${row.id_tipo_exame}/status`, { active: Number(row.ativo) ? '0' : '1' })
      notify(r.message ?? 'Feito.'); reload()
    } catch (err) { notify(err instanceof ApiError ? err.message : 'Não foi possível alterar.', false) }
  }

  const categories = data.categories.map((c) => ({ value: String(c.categoria), label: categoryLabel(c.categoria), hint: `${c.total} exames` }))
  const locations = data.locations.map((l) => ({ value: String(l.id_local), label: String(l.nome) }))
  const field = (k: string, label: string, el: ReactNode, className = '', required = false, help?: string) => (
    <Field label={label} name={k} required={required} error={errors[k]} className={className} help={help}>{el}</Field>
  )

  return (
    <>
      <PageHeader title="Catálogo de exames" subtitle="Os exames que médicos solicitam e que recepção e pacientes agendam. O código ajuda a achar o exame rápido."
        actions={<Button variant="primario" icon={Plus} onClick={() => open()}>Novo exame</Button>} />
      <div className="mb-4 max-w-[420px]"><Input name="busca" placeholder="Buscar por nome, código, categoria ou local" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Panel noPadding meta={`${items.length} de ${data.items.length}`}>
        {items.length === 0 ? <div className="p-5"><Empty icon={FlaskConical}>Nenhum exame encontrado.</Empty></div> : (
          <Table header={<><Th className="w-24">Código</Th><Th>Exame</Th><Th className="hidden md:table-cell">Local</Th><Th className="hidden lg:table-cell w-24">Duração</Th><Th>Situação</Th><Th /></>}>
            {items.map((i) => (
              <tr key={String(i.id_tipo_exame)}>
                <Td className="num font-medium text-brand-700">{String(i.codigo ?? '—')}</Td>
                <Td><Main sub={`${categoryLabel(i.categoria)}${Number(i.exige_pedido) ? ' · exige pedido' : ''}`}>{String(i.nome)}</Main></Td>
                <Td className="hidden text-muted md:table-cell">{String(i.local)}</Td>
                <Td className="num hidden lg:table-cell">{String(i.duracao_min)} min</Td>
                <Td>{Number(i.ativo) ? <Badge tone="positive">Ativo</Badge> : <Badge tone="neutral">Inativo</Badge>}</Td>
                <Td className="text-right whitespace-nowrap">
                  <Button small variant="texto" onClick={() => open(i)}>Editar</Button>
                  <Button small variant={Number(i.ativo) ? 'perigoTexto' : 'texto'} onClick={() => toggle(i)}>{Number(i.ativo) ? 'Desativar' : 'Reativar'}</Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing ? 'Editar exame' : 'Novo exame'} width="max-w-2xl">
        <form className="grid gap-4 sm:grid-cols-6" noValidate onSubmit={save}>
          {field('nome', 'Nome do exame', <Input name="nome" maxLength={150} value={values.nome} onChange={(e) => setValues({ ...values, nome: e.target.value })} />, 'sm:col-span-4', true)}
          {field('codigo', 'Código', <Input name="codigo" maxLength={20} value={values.codigo} onChange={(e) => setValues({ ...values, codigo: e.target.value.toUpperCase() })} />, 'sm:col-span-2', true, 'Ex.: LAB-049')}
          {field('categoria', 'Categoria', <SearchSelect name="categoria" options={categories} value={values.categoria} placeholder="Escolha a categoria"
            onChange={(v) => setValues({ ...values, categoria: v, codigo: values.codigo || nextCode(v) })} />, 'sm:col-span-3', true)}
          {field('id_local', 'Local', <SearchSelect name="id_local" options={locations} value={values.id_local} placeholder="Onde é feito"
            onChange={(v) => setValues({ ...values, id_local: v })} />, 'sm:col-span-3', true)}
          {field('duracao_min', 'Duração (min)', <Input type="number" min={5} max={240} name="duracao_min" value={values.duracao_min} onChange={(e) => setValues({ ...values, duracao_min: e.target.value })} />, 'sm:col-span-2', true)}
          <label className="flex items-center gap-2 self-end pb-2 text-[13px] sm:col-span-4">
            <input type="checkbox" checked={values.exige_pedido === '1'} onChange={(e) => setValues({ ...values, exige_pedido: e.target.checked ? '1' : '0' })} />
            Exige pedido médico para agendar
          </label>
          {field('preparo', 'Preparo', <TextArea name="preparo" rows={2} maxLength={500} value={values.preparo} onChange={(e) => setValues({ ...values, preparo: e.target.value })} />, 'sm:col-span-6')}
          {field('descricao', 'Descrição para o site', <TextArea name="descricao" rows={2} maxLength={300} value={values.descricao} onChange={(e) => setValues({ ...values, descricao: e.target.value })} />, 'sm:col-span-6')}
          <div className="flex justify-end gap-2 sm:col-span-6">
            <Button type="button" onClick={() => setEditing(null)}>Voltar</Button>
            <Button type="submit" variant="primario" loading={saving}>Salvar</Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
