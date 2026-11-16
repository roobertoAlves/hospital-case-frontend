import { FileText, IdCard } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Dialogo, useAviso } from '../components/avisos'
import { Abas, Botao, BotaoLink, Cabecalho, Carregando, Entrada, Painel, Pilula, Seletor, Tabela, Td, Th, Vazio, cx } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { dataHora, iniciais } from '../lib/formato'
import { useSessao } from '../lib/sessao'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>
interface Matriz { grupos: Linha[]; permissoes: Linha[]; grupo_permissoes: Record<string, number[]> }

const situacao = (u: Linha) => (Number(u.bloqueado) === 1 ? 'bloqueado' : Number(u.status) === 1 ? 'ativo' : 'inativo')
const PILULA = { ativo: ['positive', 'Ativo'], inativo: ['neutral', 'Inativo'], bloqueado: ['negative', 'Bloqueado'] } as const

function Usuarios({ grupos }: { grupos: Linha[] }) {
  const { usuario } = useSessao()
  const avisar = useAviso()
  const { dados, carregando, erro, recarregar } = useApi<Linha[]>('api/admin/usuarios')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('')
  const [editando, setEditando] = useState<Linha | null>(null)
  const [marcados, setMarcados] = useState<string[]>([])

  const acao = async (url: string, corpo: Record<string, unknown>) => {
    try { const r = await post(url, corpo); avisar(r.message ?? 'Feito.'); recarregar() }
    catch (e) { avisar(e instanceof ApiError ? e.message : 'Não foi possível concluir.', false) }
  }
  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message}</Vazio>
  const lista = dados.filter((u) => {
    const t = [u.nome, u.email, u.grupos, u.profissional].join(' ').toLowerCase()
    return (!busca || t.includes(busca.toLowerCase())) && (!filtro || situacao(u) === filtro)
  })

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Entrada type="search" placeholder="Nome, e-mail ou grupo" aria-label="Filtrar usuários" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-[300px]" />
        <Seletor aria-label="Situação" value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-[190px]">
          <option value="">Todas as situações</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option><option value="bloqueado">Bloqueados</option>
        </Seletor>
        <span className="ml-auto text-[13px] text-muted">{lista.length} de {dados.length}</span>
      </div>
      <p className="mb-4 text-[13px] text-muted">Contas de profissionais são criadas no <Link to="/profissionais" className="text-brand-700 hover:underline">cadastro de profissionais</Link>. O bloqueio é automático após várias senhas erradas seguidas; desbloquear fica registrado na auditoria.</p>
      <Painel semPadding delay={0}>
        <Tabela cabecalho={<><Th>Usuário</Th><Th>Grupos</Th><Th className="hidden lg:table-cell">Último acesso</Th><Th>Situação</Th><Th /></>}>
          {lista.map((u) => {
            const s = situacao(u)
            const proprio = Number(u.id_usuario) === usuario?.id
            return (
              <tr key={String(u.id_usuario)}>
                <Td>
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[12px] font-semibold text-brand-900">{iniciais(String(u.nome))}</span>
                    <span className="min-w-0">
                      <span className="block font-medium">{String(u.nome)}{proprio && <span className="font-normal text-muted"> (você)</span>}</span>
                      <span className="block text-[12px] text-muted">{String(u.email)}</span>
                      {u.id_profissional ? <Link to={`/profissionais/${u.id_profissional}`} className="block text-[12px] text-brand-700 hover:underline">Profissional: {String(u.profissional)}</Link> : null}
                    </span>
                  </span>
                </Td>
                <Td><span className="flex flex-wrap gap-1">{String(u.grupos ?? '').split(',').filter(Boolean).map((g) => <Pilula key={g} tom="accent">{g.trim()}</Pilula>)}</span></Td>
                <Td className="num hidden lg:table-cell">{u.ultimo_login_em ? dataHora(u.ultimo_login_em) : <span className="text-faint">nunca</span>}</Td>
                <Td><Pilula tom={PILULA[s][0]}>{PILULA[s][1]}</Pilula></Td>
                <Td className="text-right whitespace-nowrap">
                  <Botao pequeno onClick={() => { setEditando(u); setMarcados(String(u.ids_grupos ?? '').split(',').filter(Boolean)) }}>Grupos</Botao>
                  {s === 'bloqueado' && <Botao pequeno className="ml-1" onClick={() => acao('api/admin/usuario/desbloquear', { id_usuario: u.id_usuario })}>Desbloquear</Botao>}
                  {!proprio && (Number(u.status) === 1
                    ? <Botao pequeno variante="perigoTexto" onClick={() => acao('api/admin/usuario/status', { id_usuario: u.id_usuario, status: 0 })}>Inativar</Botao>
                    : <Botao pequeno variante="texto" onClick={() => acao('api/admin/usuario/status', { id_usuario: u.id_usuario, status: 1 })}>Reativar</Botao>)}
                </Td>
              </tr>
            )
          })}
        </Tabela>
      </Painel>
      <Dialogo aberto={!!editando} aoFechar={() => setEditando(null)} titulo={`Grupos de ${editando?.nome ?? ''}`} largura="max-w-lg">
        <p className="mb-3 text-[13px] text-muted">Os grupos definem o painel inicial e as permissões. Sem grupo, o usuário volta para o grupo "usuario".</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {grupos.map((g) => {
            const v = String(g.id_grupo), on = marcados.includes(v)
            return (
              <label key={v} className={cx('flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-card)] border p-3', on ? 'border-ink' : 'border-line')}>
                <input type="checkbox" className="mt-0.5 size-4 accent-ink" checked={on} onChange={() => setMarcados(on ? marcados.filter((x) => x !== v) : [...marcados, v])} />
                <span><span className="block font-medium">{String(g.nome)}</span><span className="block text-[12px] text-muted">{String(g.descricao ?? '')}</span></span>
              </label>
            )
          })}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Botao onClick={() => setEditando(null)}>Voltar</Botao>
          <Botao variante="primario" onClick={async () => { const u = editando!; setEditando(null); await acao('api/admin/usuario/grupos', { id_usuario: u.id_usuario, grupos: JSON.stringify(marcados.map(Number)) }) }}>Salvar grupos</Botao>
        </div>
      </Dialogo>
    </>
  )
}

function MatrizPermissoes({ matriz, aoSalvar }: { matriz: Matriz; aoSalvar: () => void }) {
  const avisar = useAviso()
  const [mapa, setMapa] = useState<Record<string, number[]>>({})
  const [alterados, setAlterados] = useState<Set<string>>(new Set())
  const [salvando, setSalvando] = useState(false)
  useEffect(() => { setMapa(matriz.grupo_permissoes); setAlterados(new Set()) }, [matriz])
  const modulos = useMemo(() => {
    const m: Record<string, Linha[]> = {}
    for (const p of matriz.permissoes) (m[String(p.codigo).split('.')[0]] ??= []).push(p)
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b))
  }, [matriz])

  const alternar = (g: string, p: number) => {
    setMapa((m) => ({ ...m, [g]: (m[g] ?? []).includes(p) ? m[g].filter((x) => x !== p) : [...(m[g] ?? []), p] }))
    setAlterados((s) => new Set(s).add(g))
  }
  const salvar = async () => {
    setSalvando(true)
    try {
      await Promise.all([...alterados].map((g) => post('api/admin/grupo/permissoes', { id_grupo: g, permissoes: JSON.stringify(mapa[g] ?? []) })))
      avisar('Permissões atualizadas.'); aoSalvar()
    } catch (e) { avisar(e instanceof ApiError ? e.message : 'Não foi possível salvar.', false) }
    finally { setSalvando(false) }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[720px] text-[13px] text-muted">Marque o que cada grupo pode fazer. Telas clínicas exigem também o grupo clínico (o administrador não entra nelas, mesmo marcando aqui).</p>
        <Botao variante="primario" disabled={!alterados.size} carregando={salvando} onClick={salvar}>
          {alterados.size ? `Salvar alterações (${alterados.size} ${alterados.size === 1 ? 'grupo' : 'grupos'})` : 'Salvar alterações'}
        </Botao>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-[var(--radius-card)] border border-line">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-raised">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">Permissão</th>
              {matriz.grupos.map((g) => <th key={String(g.id_grupo)} className="px-2 py-2.5 text-center font-medium whitespace-nowrap">{String(g.nome)}</th>)}
            </tr>
          </thead>
          <tbody>
            {modulos.map(([mod, perms]) => (
              <>
                <tr key={mod} className="bg-frame"><td colSpan={matriz.grupos.length + 1} className="px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">{mod}</td></tr>
                {perms.map((p) => (
                  <tr key={String(p.id_permissao)} className="border-b border-rule hover:bg-raised/60">
                    <td className="px-3 py-2"><code className="text-[12.5px]">{String(p.codigo)}</code><span className="block text-[12px] text-muted">{String(p.descricao ?? '')}</span></td>
                    {matriz.grupos.map((g) => {
                      const gid = String(g.id_grupo), pid = Number(p.id_permissao)
                      return (
                        <td key={gid} className="px-2 py-2 text-center">
                          <input type="checkbox" className="size-4 accent-ink" aria-label={`${g.nome}: ${p.codigo}`} checked={(mapa[gid] ?? []).includes(pid)} onChange={() => alternar(gid, pid)} />
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
  const [aba, setAba] = useState<'usuarios' | 'permissoes'>('usuarios')
  const { dados, carregando, erro, recarregar } = useApi<Matriz>('api/admin/grupos')
  return (
    <>
      <Cabecalho titulo="Usuários e permissões" subtitulo="Grupos, situação das contas e matriz de permissões."
        acoes={<><BotaoLink to="/profissionais" icone={IdCard}>Profissionais</BotaoLink><BotaoLink to="/auditoria" icone={FileText}>Auditoria</BotaoLink></>} />
      <Abas abas={[{ id: 'usuarios', rotulo: 'Usuários' }, { id: 'permissoes', rotulo: 'Permissões por grupo' }]} atual={aba} aoTrocar={setAba} />
      {carregando && !dados ? <Carregando /> : erro || !dados ? <Vazio>{erro?.message}</Vazio>
        : aba === 'usuarios' ? <Usuarios grupos={dados.grupos} /> : <MatrizPermissoes matriz={dados} aoSalvar={recarregar} />}
    </>
  )
}
