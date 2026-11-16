import { motion } from 'motion/react'
import { FileText, Search, Stethoscope } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Carregando, Pilula, Vazio, cx } from '../../components/ui'
import { agrupar, rotuloCategoria } from '../../lib/formato'
import { useSessao } from '../../lib/sessao'
import { useApi } from '../../lib/useApi'

type Linha = Record<string, unknown>
interface Catalogo { especialidades: Linha[]; exames: Linha[]; vacinas: Linha[] }
type Aba = 'consultas' | 'exames' | 'vacinas'
const TITULOS: Record<Aba, [string, string]> = {
  consultas: ['Consultas', 'Especialidades e médicos que atendem na clínica.'],
  exames: ['Exames', 'Análises clínicas, imagem, cardiologia, genética e check-ups, com preparo e local.'],
  vacinas: ['Vacinas', 'Vacinas para cada fase da vida, aplicadas na sala de vacinação.'],
}
const FAIXAS = ['Infantil', 'Adolescente', 'Adulto', 'Gestante', 'Idoso', 'Viajante']
const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function Chips({ opcoes, atual, aoTrocar, rotulo = (s: string) => s }: { opcoes: string[]; atual: string; aoTrocar: (s: string) => void; rotulo?: (s: string) => string }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
      {['', ...opcoes].map((o) => (
        <button key={o || 'todas'} onClick={() => aoTrocar(o)} aria-pressed={atual === o}
          className={cx('rounded-full border px-4 py-1.5 text-[14px] font-medium transition-colors', atual === o ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-muted hover:border-brand-200 hover:text-ink')}>
          {o ? rotulo(o) : 'Todas'}
        </button>
      ))}
    </div>
  )
}

/** Catalogo publico: qualquer pessoa ve; para agendar, entra (ou cria conta). */
export default function Catalogo() {
  const { aba: abaParam } = useParams()
  const aba: Aba = abaParam === 'exames' || abaParam === 'vacinas' ? abaParam : 'consultas'
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [cat, setCat] = useState('')
  const navigate = useNavigate()
  const { usuario } = useSessao()
  const { dados, carregando, erro } = useApi<Catalogo>('api/publico/catalogo')
  const destino = usuario ? `/minha-saude/${aba}` : '/login'
  const filtro = (...t: unknown[]) => !q.trim() || t.some((x) => sem(String(x ?? '')).includes(sem(q.trim())))
  const trocarAba = (a: Aba) => { setCat(''); navigate(`/servicos/${a}`) }

  const exames = (dados?.exames ?? []).filter((x) => (!cat || x.categoria === cat) && filtro(x.nome, x.descricao))
  const vacinas = (dados?.vacinas ?? []).filter((v) => (!cat || v.faixa === cat) && filtro(v.nome, v.descricao))
  const categorias = [...new Set((dados?.exames ?? []).map((x) => String(x.categoria)))]

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-semibold tracking-tight">{TITULOS[aba][0]}</h1>
          <p className="mt-1 text-[16px] text-muted">{TITULOS[aba][1]}</p>
        </div>
        <div className="flex gap-1 rounded-full bg-frame p-1">
          {(['consultas', 'exames', 'vacinas'] as Aba[]).map((a) => (
            <button key={a} onClick={() => trocarAba(a)} className={cx('rounded-full px-4 py-2 font-medium', a === aba ? 'bg-white shadow-sm' : 'text-muted hover:text-ink')}>{TITULOS[a][0]}</button>
          ))}
        </div>
      </div>
      <div className="relative mb-5 max-w-[480px]">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
        <label htmlFor="filtroCatalogo" className="sr-only">Filtrar</label>
        <input id="filtroCatalogo" value={q} onChange={(e) => setQ(e.target.value)} placeholder={aba === 'consultas' ? 'Especialidade ou médico' : aba === 'exames' ? 'Nome do exame. Ex.: vitamina D' : 'Nome da vacina'}
          className="h-12 w-full rounded-full border border-line bg-white pr-4 pl-11 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
      </div>
      {aba === 'exames' && <Chips opcoes={categorias} atual={cat} aoTrocar={setCat} rotulo={rotuloCategoria} />}
      {aba === 'vacinas' && <Chips opcoes={FAIXAS} atual={cat} aoTrocar={setCat} />}

      {carregando && !dados ? <Carregando /> : erro || !dados ? <Vazio>{erro?.message}</Vazio> : (
        <>
          {aba === 'consultas' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dados.especialidades.filter((e) => filtro(e.nome, ...(e.medicos as Linha[]).map((m) => m.nome))).map((e, i) => (
                <motion.div key={String(e.id_especialidade)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(i, 12) * 0.03 }}
                  className="flex flex-col rounded-[var(--radius-card)] border border-line p-5">
                  <p className="text-[18px] font-semibold">{String(e.nome)}</p>
                  {e.descricao ? <p className="mt-1 text-[14px] text-muted">{String(e.descricao)}</p> : null}
                  <ul className="mt-4 grow space-y-2">
                    {(e.medicos as Linha[]).map((m) => (
                      <li key={String(m.id_profissional)} className="flex flex-wrap items-center gap-x-2.5 text-[14px]">
                        <Stethoscope className="size-4 text-brand-600" />{String(m.nome)} <span className="text-[12px] text-faint">CRM {String(m.crm)}/{String(m.crm_uf)}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={destino} className="mt-5 rounded-full bg-brand-600 py-2.5 text-center font-medium text-white hover:bg-brand-700">Agendar consulta</Link>
                </motion.div>
              ))}
            </div>
          )}

          {aba === 'exames' && (exames.length === 0 ? <Vazio>Nenhum exame com esse nome.</Vazio> : agrupar(exames, 'categoria').map(([grupo, lista]) => (
            <section key={grupo} className="mb-10">
              <h2 className="mb-4 flex items-baseline gap-3 text-[22px] font-semibold">{rotuloCategoria(grupo)} <span className="text-[14px] font-normal text-faint">{lista.length}</span></h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {lista.map((x, i) => (
                  <motion.div key={String(x.id_tipo_exame)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.03 }}
                    className="flex flex-col rounded-[var(--radius-card)] border border-line p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[17px] font-semibold">{String(x.nome)}</p>
                      {String(x.exige_pedido) === '1' ? <Pilula tom="warning">Exige pedido</Pilula> : <Pilula tom="positive">Sem pedido</Pilula>}
                    </div>
                    {x.descricao ? <p className="mt-1 text-[14px] text-muted">{String(x.descricao)}</p> : null}
                    <p className="mt-2 text-[12px] text-faint">{String(x.local)} · {String(x.duracao_min)} min</p>
                    <p className="mt-3 grow rounded-[var(--radius-control)] bg-frame px-3 py-2.5 text-[13px]"><strong>Preparo:</strong> {String(x.preparo ?? 'Sem preparo especial.')}</p>
                    <Link to={destino} className="mt-4 rounded-full bg-brand-600 py-2.5 text-center font-medium text-white hover:bg-brand-700">Agendar exame</Link>
                  </motion.div>
                ))}
              </div>
            </section>
          )))}

          {aba === 'vacinas' && (vacinas.length === 0 ? <Vazio>Nenhuma vacina com esse filtro.</Vazio> : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vacinas.map((v, i) => (
                <motion.div key={String(v.id_vacina)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(i, 12) * 0.03 }}
                  className="flex flex-col rounded-[var(--radius-card)] border border-line p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[18px] font-semibold">{String(v.nome)}</p>
                    {v.faixa ? <Pilula tom="accent">{String(v.faixa)}</Pilula> : null}
                  </div>
                  <p className="mt-1 grow text-[14px] text-muted">{String(v.descricao ?? '')}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
                    <div className="rounded-[var(--radius-control)] bg-frame px-3 py-2"><dt className="text-faint">Doses</dt><dd className="font-medium">{String(v.doses)}{v.intervalo_dias ? ` · a cada ${v.intervalo_dias} dias` : ''}</dd></div>
                    <div className="rounded-[var(--radius-control)] bg-frame px-3 py-2"><dt className="text-faint">Público</dt><dd className="font-medium">{String(v.publico ?? '—')}</dd></div>
                  </dl>
                  <Link to={destino} className="mt-5 rounded-full bg-brand-600 py-2.5 text-center font-medium text-white hover:bg-brand-700">Agendar vacina</Link>
                </motion.div>
              ))}
            </div>
          ))}
        </>
      )}
      <p className="mt-10 flex items-center gap-2 text-[13px] text-faint"><FileText className="size-4" /> Informações de demonstração; não substituem a orientação do seu médico ou do laboratório.</p>
    </div>
  )
}
