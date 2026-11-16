import { motion } from 'motion/react'
import { CalendarDays, CheckCircle2, FlaskConical, MailCheck, Pill, Syringe } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useNotice } from '../../components/notices'
import { Alert, Button, Loading, Input, Panel, Badge, FadeIn, Empty } from '../../components/ui'
import { ApiError, post } from '../../lib/api'
import { formatDate, longDate, todayIso, formatTime } from '../../lib/format'
import { useSession } from '../../lib/session'
import { useApi } from '../../lib/useApi'

type Row = Record<string, unknown>
interface Summary {
  linked: boolean; record_email?: string | null; patient?: Row
  next_appointments?: Row[]; next_exams?: Row[]; next_vaccines?: Row[]; recent_prescriptions?: number; pending_orders?: number
}

function LinkAccount({ email, onLink }: { email?: string | null; onLink: () => void }) {
  const notify = useNotice()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  if (!email) {
    return <Alert>Sua conta ainda não está ligada a uma ficha da clínica. Leve um documento com foto à recepção e peça para ligar a conta <strong>com o seu e-mail de login</strong>.</Alert>
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setSending(true)
    try { const r = await post('api/portal/link', { code: code }); notify(r.message ?? 'Conta ligada.'); onLink() }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Não foi possível confirmar.') }
    finally { setSending(false) }
  }
  return (
    <Panel className="mx-auto max-w-[520px]">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-700"><MailCheck className="size-7" /></span>
        <h1 className="text-[22px] font-semibold">Confirme que a ficha é sua</h1>
        <p className="text-muted">Enviamos um código de 6 dígitos para <strong className="text-ink">{email}</strong>, o e-mail da sua ficha na clínica.</p>
      </div>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <label htmlFor="codigo" className="sr-only">Código</label>
        <Input id="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="num h-14 text-center text-[26px] tracking-[0.5em]" placeholder="000000" invalid={!!error} />
        {error && <p className="text-center text-[13px] text-negative">{error}</p>}
        <Button type="submit" variant="primario" className="h-11" loading={sending} disabled={code.length !== 6}>Confirmar</Button>
        <Button type="button" variant="texto" onClick={async () => {
          try { const r = await post('api/portal/link/resend'); notify(r.message ?? 'Código reenviado.') }
          catch (err) { notify(err instanceof ApiError ? err.message : 'Não foi possível reenviar.', false) }
        }}>Enviar outro código</Button>
      </form>
    </Panel>
  )
}

export default function MyHealth() {
  const { user } = useSession()
  const { data, loading, error, reload } = useApi<Summary>('api/portal/summary')
  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message}</Empty>
  if (!data.linked) return <LinkAccount email={data.record_email} onLink={reload} />

  const shortcuts = [
    { to: '/minha-saude/consultas', rotulo: 'Marcar consulta', icone: CalendarDays },
    { to: '/minha-saude/exames', rotulo: 'Marcar exame', icone: FlaskConical },
    { to: '/minha-saude/vacinas', rotulo: 'Vacinas', icone: Syringe },
    { to: '/minha-saude/receitas', rotulo: 'Receitas', icone: Pill },
  ]
  const appointments = data.next_appointments ?? [], exams = data.next_exams ?? [], vaccines = data.next_vaccines ?? []

  return (
    <>
      <FadeIn className="mb-7">
        <h1 className="text-[28px] font-semibold tracking-tight">Olá, {user?.nome.split(' ')[0]}</h1>
        <p className="mt-1 text-muted">{longDate(todayIso())}</p>
      </FadeIn>
      <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4">
        {shortcuts.map((a, i) => (
          <motion.div key={a.to} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 * i }}>
            <Link to={a.to} className="group flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 hover:border-brand-200 hover:bg-brand-50">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white"><a.icone className="size-5" /></span>
              <span className="font-medium">{a.rotulo}</span>
            </Link>
          </motion.div>
        ))}
      </div>
      {(data.pending_orders ?? 0) > 0 && <div className="mb-5"><Alert>{data.pending_orders} pedido(s) médico(s) aguardando conferência da recepção.</Alert></div>}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Próximas consultas" meta={<Link to="/minha-saude/consultas" className="text-brand-700 hover:underline">ver todas</Link>}>
          {appointments.length === 0 ? <p className="text-muted">Nenhuma consulta marcada.</p> : (
            <ul className="divide-y divide-rule">
              {appointments.map((c) => (
                <li key={String(c.id_consulta)} className="py-3 first:pt-0">
                  <p className="font-medium">{String(c.especialidade)}</p>
                  <p className="text-[13px] text-muted">{formatDate(c.data_hora)} às {formatTime(c.data_hora)} · {String(c.medico)}</p>
                  {c.confirmada_em ? <span className="mt-1 inline-flex items-center gap-1 text-[12px] text-positive"><CheckCircle2 className="size-3.5" /> presença confirmada</span>
                    : c.status === 'agendada' ? <Link to="/minha-saude/consultas" className="mt-1 inline-block text-[12px] font-medium text-brand-700">Confirmar presença</Link> : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Próximos exames" meta={<Link to="/minha-saude/exames" className="text-brand-700 hover:underline">ver todos</Link>} delay={0.08}>
          {exams.length === 0 ? <p className="text-muted">Nenhum exame marcado.</p> : (
            <ul className="divide-y divide-rule">
              {exams.map((x) => (
                <li key={String(x.id_exame_agendado)} className="py-3 first:pt-0">
                  <p className="font-medium">{String(x.exame)}</p>
                  <p className="text-[13px] text-muted">{formatDate(x.data_hora)} às {formatTime(x.data_hora)} · {String(x.local)}</p>
                  {x.preparo ? <p className="mt-1 text-[12px]"><strong>Preparo:</strong> {String(x.preparo)}</p> : null}
                  {x.pedido_status === 'pendente' && <Badge tone="warning">pedido em conferência</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Vacinas" meta={<Link to="/minha-saude/vacinas" className="text-brand-700 hover:underline">cartão</Link>} delay={0.12}>
          {vaccines.length === 0 ? <p className="text-muted">Nenhuma vacina agendada.</p> : (
            <ul className="divide-y divide-rule">
              {vaccines.map((v) => (
                <li key={String(v.id_agendamento)} className="py-3 first:pt-0">
                  <p className="font-medium">{String(v.vacina)} · dose {String(v.dose)}</p>
                  <p className="text-[13px] text-muted">{formatDate(v.data_hora)} às {formatTime(v.data_hora)}</p>
                </li>
              ))}
            </ul>
          )}
          {(data.recent_prescriptions ?? 0) > 0 && <Link to="/minha-saude/receitas" className="mt-4 block rounded-[var(--radius-control)] bg-brand-50 px-3 py-2.5 text-[13px] text-brand-900">{data.recent_prescriptions} receita(s) nos últimos 90 dias</Link>}
        </Panel>
      </div>
    </>
  )
}
