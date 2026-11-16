import { FileText, IdCard } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Dialog, useNotice } from '../components/notices'
import { Tabs, Button, ButtonLink, PageHeader, Loading, Input, Panel, Badge, Select, Table, Td, Th, Empty, cx } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { formatDateTime, initials } from '../lib/format'
import { useSession } from '../lib/session'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
interface Matrix { groups: Row[]; permissions: Row[]; group_permissions: Record<string, number[]> }

const status = (u: Row) => (Number(u.bloqueado) === 1 ? 'bloqueado' : Number(u.status) === 1 ? 'ativo' : 'inativo')
const PILL = { ativo: ['positive', 'Ativo'], inativo: ['neutral', 'Inativo'], bloqueado: ['negative', 'Bloqueado'] } as const

function Users({ groups }: { groups: Row[] }) {
  const { user } = useSession()
  const notify = useNotice()
  const { data, loading, error, reload } = useApi<Row[]>('api/admin/usuarios')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const [checkedIds, setCheckedIds] = useState<string[]>([])

  const action = async (url: string, body: Record<string, unknown>) => {
    try { const r = await post(url, body); notify(r.message ?? 'Feito.'); reload() }
    catch (e) { notify(e instanceof ApiError ? e.message : 'Não foi possível concluir.', false) }
  }
  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message}</Empty>
  const list = data.filter((u) => {
    const t = [u.nome, u.email, u.grupos, u.profissional].join(' ').toLowerCase()
    return (!search || t.includes(search.toLowerCase())) && (!filter || status(u) === filter)
  })

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input type="search" placeholder="Nome, e-mail ou grupo" aria-label="Filtrar usuários" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[300px]" />
        <Select aria-label="Situação" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-[190px]">
          <option value="">Todas as situações</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option><option value="bloqueado">Bloqueados</option>
        </Select>
        <span className="ml-auto text-[13px] text-muted">{list.length} de {data.length}</span>
      </div>
      <p className="mb-4 text-[13px] text-muted">Contas de profissionais são criadas no <Link to="/profissionais" className="text-brand-700 hover:underline">cadastro de profissionais</Link>. O bloqueio é automático após várias senhas erradas seguidas; desbloquear fica registrado na auditoria.</p>
      <Panel noPadding delay={0}>
        <Table header={<><Th>Usuário</Th><Th>Grupos</Th><Th className="hidden lg:table-cell">Último acesso</Th><Th>Situação</Th><Th /></>}>
          {list.map((u) => {
            const s = status(u)
            const own = Number(u.id_usuario) === user?.id
            return (
              <tr key={String(u.id_usuario)}>
                <Td>
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[12px] font-semibold text-brand-900">{initials(String(u.nome))}</span>
                    <span className="min-w-0">
                      <span className="block font-medium">{String(u.nome)}{own && <span className="font-normal text-muted"> (você)</span>}</span>
                      <span className="block text-[12px] text-muted">{String(u.email)}</span>
                      {u.id_profissional ? <Link to={`/profissionais/${u.id_profissional}`} className="block text-[12px] text-brand-700 hover:underline">Profissional: {String(u.profissional)}</Link> : null}
                    </span>
                  </span>
                </Td>
                <Td><span className="flex flex-wrap gap-1">{String(u.grupos ?? '').split(',').filter(Boolean).map((g) => <Badge key={g} tone="accent">{g.trim()}</Badge>)}</span></Td>
                <Td className="num hidden lg:table-cell">{u.ultimo_login_em ? formatDateTime(u.ultimo_login_em) : <span className="text-faint">nunca</span>}</Td>
                <Td><Badge tone={PILL[s][0]}>{PILL[s][1]}</Badge></Td>
                <Td className="text-right whitespace-nowrap">
                  <Button small onClick={() => { setEditing(u); setCheckedIds(String(u.ids_grupos ?? '').split(',').filter(Boolean)) }}>Grupos</Button>
                  {s === 'bloqueado' && <Button small className="ml-1" onClick={() => action('api/admin/usuario/desbloquear', { id_usuario: u.id_usuario })}>Desbloquear</Button>}
                  {!own && (Number(u.status) === 1
                    ? <Button small variant="perigoTexto" onClick={() => action('api/admin/usuario/status', { id_usuario: u.id_usuario, status: 0 })}>Inativar</Button>
                    : <Button small variant="texto" onClick={() => action('api/admin/usuario/status', { id_usuario: u.id_usuario, status: 1 })}>Reativar</Button>)}
                </Td>
              </tr>
            )
          })}
        </Table>
      </Panel>
      <Dialog open={!!editing} onClose={() => setEditing(null)} title={`Grupos de ${editing?.nome ?? ''}`} width="max-w-lg">
        <p className="mb-3 text-[13px] text-muted">Os grupos definem o painel inicial e as permissões. Sem grupo, o usuário volta para o grupo "usuario".</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {groups.map((g) => {
            const v = String(g.id_grupo), on = checkedIds.includes(v)
            return (
              <label key={v} className={cx('flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-card)] border p-3', on ? 'border-ink' : 'border-line')}>
                <input type="checkbox" className="mt-0.5 size-4 accent-ink" checked={on} onChange={() => setCheckedIds(on ? checkedIds.filter((x) => x !== v) : [...checkedIds, v])} />
                <span><span className="block font-medium">{String(g.nome)}</span><span className="block text-[12px] text-muted">{String(g.descricao ?? '')}</span></span>
              </label>
            )
          })}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => setEditing(null)}>Voltar</Button>
          <Button variant="primario" onClick={async () => { const u = editing!; setEditing(null); await action('api/admin/usuario/grupos', { id_usuario: u.id_usuario, grupos: JSON.stringify(checkedIds.map(Number)) }) }}>Salvar grupos</Button>
        </div>
      </Dialog>
    </>
  )
}

function PermissionMatrix({ matrix, onSave }: { matrix: Matrix; onSave: () => void }) {
  const notify = useNotice()
  const [map, setMap] = useState<Record<string, number[]>>({})
  const [changed, setChanged] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  useEffect(() => { setMap(matrix.group_permissions); setChanged(new Set()) }, [matrix])
  const modules = useMemo(() => {
    const m: Record<string, Row[]> = {}
    for (const p of matrix.permissions) (m[String(p.codigo).split('.')[0]] ??= []).push(p)
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b))
  }, [matrix])

  const toggle = (g: string, p: number) => {
    setMap((m) => ({ ...m, [g]: (m[g] ?? []).includes(p) ? m[g].filter((x) => x !== p) : [...(m[g] ?? []), p] }))
    setChanged((s) => new Set(s).add(g))
  }
  const save = async () => {
    setSaving(true)
    try {
      await Promise.all([...changed].map((g) => post('api/admin/grupo/permissoes', { id_grupo: g, permissoes: JSON.stringify(map[g] ?? []) })))
      notify('Permissões atualizadas.'); onSave()
    } catch (e) { notify(e instanceof ApiError ? e.message : 'Não foi possível salvar.', false) }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[720px] text-[13px] text-muted">Marque o que cada grupo pode fazer. Telas clínicas exigem também o grupo clínico (o administrador não entra nelas, mesmo marcando aqui).</p>
        <Button variant="primario" disabled={!changed.size} loading={saving} onClick={save}>
          {changed.size ? `Salvar alterações (${changed.size} ${changed.size === 1 ? 'grupo' : 'grupos'})` : 'Salvar alterações'}
        </Button>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-[var(--radius-card)] border border-line">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-raised">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">Permissão</th>
              {matrix.groups.map((g) => <th key={String(g.id_grupo)} className="px-2 py-2.5 text-center font-medium whitespace-nowrap">{String(g.nome)}</th>)}
            </tr>
          </thead>
          <tbody>
            {modules.map(([mod, perms]) => (
              <>
                <tr key={mod} className="bg-frame"><td colSpan={matrix.groups.length + 1} className="px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">{mod}</td></tr>
                {perms.map((p) => (
                  <tr key={String(p.id_permissao)} className="border-b border-rule hover:bg-raised/60">
                    <td className="px-3 py-2"><code className="text-[12.5px]">{String(p.codigo)}</code><span className="block text-[12px] text-muted">{String(p.descricao ?? '')}</span></td>
                    {matrix.groups.map((g) => {
                      const gid = String(g.id_grupo), pid = Number(p.id_permissao)
                      return (
                        <td key={gid} className="px-2 py-2 text-center">
                          <input type="checkbox" className="size-4 accent-ink" aria-label={`${g.nome}: ${p.codigo}`} checked={(map[gid] ?? []).includes(pid)} onChange={() => toggle(gid, pid)} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function Admin() {
  const [tab, setTab] = useState<'usuarios' | 'permissoes'>('usuarios')
  const { data, loading, error, reload } = useApi<Matrix>('api/admin/grupos')
  return (
    <>
      <PageHeader title="Usuários e permissões" subtitle="Grupos, situação das contas e matriz de permissões."
        actions={<><ButtonLink to="/profissionais" icon={IdCard}>Profissionais</ButtonLink><ButtonLink to="/auditoria" icon={FileText}>Auditoria</ButtonLink></>} />
      <Tabs tabs={[{ id: 'usuarios', label: 'Usuários' }, { id: 'permissoes', label: 'Permissões por grupo' }]} current={tab} onChange={setTab} />
      {loading && !data ? <Loading /> : error || !data ? <Empty>{error?.message}</Empty>
        : tab === 'usuarios' ? <Users groups={data.groups} /> : <PermissionMatrix matrix={data} onSave={reload} />}
    </>
  )
}
