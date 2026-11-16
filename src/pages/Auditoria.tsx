import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Abas, Botao, Cabecalho, Campo, Carregando, Entrada, Painel, Pilula, Principal, Seletor, Tabela, Td, Th, Vazio } from '../components/ui'
import { data, dataHora, ou } from '../lib/formato'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>
interface Trilha {
  filtro: { de: string; ate: string; idUsuario: number | null; modulo: string; idPaciente: number | null; pagina: number }
  resultado: { itens: Linha[]; total: number; pagina: number }
  modulos: string[]; usuarios: Linha[]
}

const POR_PAGINA = 50

function mascarar(email: unknown) {
  const e = String(email ?? '')
  const at = e.indexOf('@')
  return at <= 0 ? (e ? '***' : '') : `${e.slice(0, Math.min(2, at))}***${e.slice(at)}`
}

function TrilhaAuditoria() {
  const [params, setParams] = useSearchParams()
  const filtros = Object.fromEntries(['de', 'ate', 'usuario', 'modulo', 'paciente', 'pagina'].map((k) => [k, params.get(k) ?? '']))
  const { dados, carregando, erro } = useApi<Trilha>('api/auditoria', filtros)
  const [f, setF] = useState(filtros)
  useEffect(() => { if (dados) setF((x) => ({ ...x, de: dados.filtro.de, ate: dados.filtro.ate })) }, [dados])

  const filtrar = (e: FormEvent) => { e.preventDefault(); const n = new URLSearchParams(); Object.entries(f).forEach(([k, v]) => v && k !== 'pagina' && n.set(k, v)); setParams(n) }
  const pagina = (p: number) => { const n = new URLSearchParams(params); n.set('pagina', String(p)); setParams(n) }

  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message}</Vazio>
  const r = dados.resultado
  const total = Math.max(1, Math.ceil(r.total / POR_PAGINA))
  return (
    <>
      <form onSubmit={filtrar} className="mb-5 grid items-end gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Campo rotulo="De" nome="de"><Entrada name="de" type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} /></Campo>
        <Campo rotulo="Até" nome="ate"><Entrada name="ate" type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} /></Campo>
        <Campo rotulo="Usuário" nome="usuario">
          <Seletor name="usuario" value={f.usuario} onChange={(e) => setF({ ...f, usuario: e.target.value })}>
            <option value="">Todos</option>{dados.usuarios.map((u) => <option key={String(u.id_usuario)} value={String(u.id_usuario)}>{String(u.nome)}</option>)}
          </Seletor>
        </Campo>
        <Campo rotulo="Módulo" nome="modulo">
          <Seletor name="modulo" value={f.modulo} onChange={(e) => setF({ ...f, modulo: e.target.value })}>
            <option value="">Todos</option>{dados.modulos.map((m) => <option key={m} value={m}>{m}</option>)}
          </Seletor>
        </Campo>
        <Campo rotulo="Nº do paciente" nome="paciente"><Entrada name="paciente" inputMode="numeric" placeholder="Ex.: 7" value={f.paciente} onChange={(e) => setF({ ...f, paciente: e.target.value.replace(/\D/g, '') })} /></Campo>
        <div className="flex gap-2"><Botao type="submit" variante="primario">Filtrar</Botao><Botao type="button" variante="texto" onClick={() => { setF({ de: '', ate: '', usuario: '', modulo: '', paciente: '', pagina: '' }); setParams({}) }}>Limpar</Botao></div>
      </form>
      <p className="mb-3 text-muted">{r.total} {r.total === 1 ? 'registro' : 'registros'} de {data(dados.filtro.de)} a {data(dados.filtro.ate)}</p>
      {r.itens.length === 0 ? <Vazio>Nenhum registro com esse filtro.</Vazio> : (
        <Painel semPadding delay={0}>
          <Tabela cabecalho={<><Th>Quando</Th><Th>Ação</Th><Th>Usuário</Th><Th className="hidden md:table-cell">Paciente</Th><Th className="hidden lg:table-cell">Detalhes</Th></>}>
            {r.itens.map((a) => (
              <tr key={String(a.id_auditoria)}>
                <Td className="num whitespace-nowrap">{dataHora(a.registrado_em)}</Td>
                <Td><Principal sub={a.entidade ? `${a.entidade}${a.id_entidade != null ? ` nº ${a.id_entidade}` : ''}` : undefined}><code className="rounded bg-raised px-1.5 py-0.5 text-[12.5px]">{String(a.acao)}</code></Principal></Td>
                <Td><Principal sub={a.ip ? `IP ${a.ip}` : undefined}>{ou(a.usuario)}</Principal></Td>
                <Td className="hidden md:table-cell">{a.id_paciente != null ? <button className="text-left text-brand-700 hover:underline" onClick={() => { const n = new URLSearchParams(params); n.set('paciente', String(a.id_paciente)); n.delete('pagina'); setParams(n); setF({ ...f, paciente: String(a.id_paciente) }) }}><Principal sub={`nº ${a.id_paciente}`}>{ou(a.paciente)}</Principal></button> : '—'}</Td>
                <Td className="hidden max-w-[280px] truncate text-muted lg:table-cell">{ou(a.detalhes)}</Td>
              </tr>
            ))}
          </Tabela>
          <div className="flex items-center justify-between border-t border-rule px-4 py-3 text-[13px] text-muted">
            <span>Página {r.pagina} de {total}</span>
            <span className="flex gap-2">
              {r.pagina > 1 && <Botao pequeno onClick={() => pagina(r.pagina - 1)}>Anterior</Botao>}
              {r.pagina < total && <Botao pequeno onClick={() => pagina(r.pagina + 1)}>Próxima</Botao>}
            </span>
          </div>
        </Painel>
      )}
    </>
  )
}

function Notificacoes() {
  const { dados, carregando, erro } = useApi<{ notificacoes: Linha[] }>('api/auditoria', { aba: 'notificacoes' })
  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message}</Vazio>
  const tom = (s: unknown) => (s === 'enviada' ? 'positive' : s === 'simulada' ? 'accent' : s === 'falhou' ? 'negative' : 'neutral') as 'positive'
  return (
    <>
      <p className="mb-3 text-[13px] text-muted">Últimos 100 avisos. O texto do e-mail não é guardado (pode ter senha temporária ou link de recuperação); em desenvolvimento, o conteúdo simulado fica no mail.log do backend.</p>
      {dados.notificacoes.length === 0 ? <Vazio>Nenhum e-mail enviado ainda.</Vazio> : (
        <Painel semPadding delay={0}>
          <Tabela cabecalho={<><Th>Quando</Th><Th>Assunto</Th><Th className="hidden md:table-cell">Destinatário</Th><Th className="hidden lg:table-cell">Disparado por</Th><Th>Situação</Th></>}>
            {dados.notificacoes.map((n) => (
              <tr key={String(n.id_notificacao)}>
                <Td className="num whitespace-nowrap">{dataHora(n.criado_em)}</Td>
                <Td><Principal sub={String(n.tipo)}>{String(n.assunto)}</Principal>{n.erro ? <span className="block text-[12px] text-negative">{String(n.erro)}</span> : null}</Td>
                <Td className="hidden md:table-cell">{mascarar(n.destinatario)}</Td>
                <Td className="hidden lg:table-cell">{ou(n.usuario)}</Td>
                <Td><Pilula tom={tom(n.status)}>{String(n.status).replace(/^./, (c) => c.toUpperCase())}</Pilula></Td>
              </tr>
            ))}
          </Tabela>
        </Painel>
      )}
    </>
  )
}

export default function Auditoria() {
  const [aba, setAba] = useState<'trilha' | 'emails'>('trilha')
  return (
    <>
      <Cabecalho titulo="Auditoria" subtitulo="Registro somente leitura de acessos e alterações. Não guarda conteúdo clínico, senhas nem tokens. Esta consulta também fica registrada." />
      <Abas abas={[{ id: 'trilha', rotulo: 'Trilha de auditoria' }, { id: 'emails', rotulo: 'E-mails enviados' }]} atual={aba} aoTrocar={setAba} />
      {aba === 'trilha' ? <TrilhaAuditoria /> : <Notificacoes />}
    </>
  )
}
