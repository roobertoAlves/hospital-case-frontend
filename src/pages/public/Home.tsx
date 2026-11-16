import { motion } from 'motion/react'
import { ArrowRight, CalendarCheck2, CalendarDays, FileUp, FlaskConical, Search, ShieldCheck, Syringe, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useApi } from '../../lib/useApi'

type Row = Record<string, unknown>
interface Catalog { specialties: Row[]; exams: Row[]; vaccines: Row[] }

const SERVICES = [
  { to: '/servicos/consultas', titulo: 'Consultas', texto: 'Escolha a especialidade e o médico, veja os horários livres e marque na hora.', icone: CalendarDays, cor: 'linear-gradient(137deg, #129383 0%, #9fd5ca 50%, #e8f5f2 100%)' },
  { to: '/servicos/exames', titulo: 'Exames', texto: 'Preparo de cada exame, local e duração. Anexe o pedido médico pelo portal.', icone: FlaskConical, cor: 'linear-gradient(137deg, #0b6359 0%, #7dd3c0 50%, #e0f2fe 100%)' },
  { to: '/servicos/vacinas', titulo: 'Vacinas', texto: 'Calendário de doses, agendamento na sala de vacinação e cartão digital.', icone: Syringe, cor: 'linear-gradient(137deg, #0e7c70 0%, #c7e9b0 50%, #fef9c3 100%)' },
]

const STEPS = [
  { icone: UserPlus, titulo: 'Crie sua conta', texto: 'Com CPF e e-mail. Se você já é paciente da clínica, confirmamos pelo e-mail da sua ficha.' },
  { icone: CalendarCheck2, titulo: 'Agende e confirme', texto: 'Consultas, exames e vacinas nos horários livres. Confirme a presença pelo portal.' },
  { icone: FileUp, titulo: 'Anexe e acompanhe', texto: 'Envie pedidos médicos, veja suas receitas e o cartão de vacinação.' },
]

export default function Home() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const { data } = useApi<Catalog>('api/publico/catalogo')
  const search = (e: FormEvent) => { e.preventDefault(); navigate(`/servicos/exames?q=${encodeURIComponent(q.trim())}`) }

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-surface">
        <div className="pointer-events-none absolute -top-40 right-[-10%] size-[620px] rounded-full bg-brand-200/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-brand-700 shadow-sm">
              <ShieldCheck className="size-4" /> Seus dados de saúde, só com você e a sua equipe de cuidado
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="text-[40px] leading-[1.05] font-semibold tracking-tight sm:text-[54px]">
              Consultas, exames e vacinas, <span className="text-brand-600">sem fila no balcão.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }} className="mt-5 max-w-[540px] text-[17px] leading-relaxed text-muted">
              Veja o que a clínica oferece, os médicos de cada especialidade e o preparo de cada exame. Para agendar, é só entrar na sua conta.
            </motion.p>
            <motion.form onSubmit={search} role="search" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }} className="mt-8 flex max-w-[560px] items-center gap-2 rounded-full border border-line bg-white p-1.5 pl-5 shadow-[var(--shadow-card)]">
              <Search className="size-5 shrink-0 text-faint" />
              <label htmlFor="buscaSite" className="sr-only">Buscar exames</label>
              <input id="buscaSite" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busque um exame. Ex.: hemograma" className="h-11 grow bg-transparent text-[15px] outline-none" />
              <button className="h-11 rounded-full bg-brand-600 px-6 font-medium text-white hover:bg-brand-700">Buscar</button>
            </motion.form>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/cadastro" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-medium text-white hover:bg-black">Criar conta <ArrowRight className="size-4" /></Link>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-full border border-control bg-white px-6 py-3 font-medium hover:bg-raised">Já tenho conta</Link>
            </div>
          </div>
          <div className="grid gap-4">
            {SERVICES.map((s, i) => (
              <motion.div key={s.to} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 * (i + 1) }} className="group relative">
                <div className="pointer-events-none absolute inset-2 rounded-[28px] opacity-50 blur-2xl transition-opacity group-hover:opacity-80" style={{ background: s.cor }} />
                <Link to={s.to} className="relative flex items-center gap-5 rounded-[28px] border-[3px] border-transparent p-5" style={{ background: `linear-gradient(#fff, #fff) padding-box, ${s.cor} border-box` }}>
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><s.icone className="size-7" strokeWidth={2.2} /></span>
                  <span className="grow">
                    <span className="block text-[19px] font-semibold tracking-tight">{s.titulo}</span>
                    <span className="block text-[14px] leading-relaxed text-muted">{s.texto}</span>
                  </span>
                  <ArrowRight className="size-5 shrink-0 text-faint transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <h2 className="text-[28px] font-semibold tracking-tight">Como funciona</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((p, i) => (
            <motion.div key={p.titulo} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 * i }} className="rounded-[var(--radius-card)] border border-line p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-600 text-white"><p.icone className="size-5" /></span>
              <p className="mt-4 text-[13px] font-medium text-brand-700">Passo {i + 1}</p>
              <p className="mt-1 text-[18px] font-semibold">{p.titulo}</p>
              <p className="mt-2 leading-relaxed text-muted">{p.texto}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {data && (
        <section className="mx-auto grid max-w-[1200px] gap-8 px-4 sm:px-6 lg:grid-cols-2">
          <div className="rounded-[var(--radius-sheet)] bg-frame p-7">
            <h2 className="text-[22px] font-semibold">Especialidades</h2>
            <p className="mt-1 text-muted">{data.specialties.length} especialidades com horários abertos.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {data.specialties.map((e) => (
                <Link key={String(e.id_especialidade)} to="/servicos/consultas" className="rounded-full border border-line bg-white px-4 py-2 text-[14px] hover:border-brand-200 hover:text-brand-700">{String(e.nome)}</Link>
              ))}
            </div>
          </div>
          <div className="rounded-[var(--radius-sheet)] bg-frame p-7">
            <h2 className="text-[22px] font-semibold">Exames de rotina sem pedido</h2>
            <p className="mt-1 text-muted">Agende direto pelo portal. Os demais pedem o pedido médico anexado. <Link to="/servicos/exames" className="font-medium text-brand-700 hover:underline">Ver os {data.exams.length} exames</Link></p>
            <ul className="mt-5 divide-y divide-line">
              {data.exams.filter((x) => String(x.exige_pedido) === '0' && x.categoria === 'Analises clinicas').slice(0, 8).map((x) => (
                <li key={String(x.id_tipo_exame)} className="flex items-center justify-between py-3">
                  <span><span className="block font-medium">{String(x.nome)}</span><span className="block text-[13px] text-muted">{String(x.preparo ?? '')}</span></span>
                  <span className="text-[13px] text-faint">{String(x.duracao_min)} min</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  )
}
