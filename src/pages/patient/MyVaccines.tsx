import { ShieldCheck, Syringe } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { ReasonDialog, useNotice } from '../../components/notices'
import { SlotGrid, type Slot } from '../../components/booking'
import { Button, PageHeader, Field, Loading, Input, Panel, Badge, Select, Empty } from '../../components/ui'
import { ApiError, get, post } from '../../lib/api'
import { formatDate, formatTime } from '../../lib/format'
import { useApi } from '../../lib/useApi'

type Row = Record<string, unknown>
interface Data { administered: Row[]; scheduled: Row[]; catalog: Row[]; today: string }

export default function MyVaccines() {
  const notify = useNotice()
  const { data, loading, error, reload } = useApi<Data>('api/portal/vaccines')
  const [vaccine, setVaccine] = useState('')
  const [day, setDay] = useState('')
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [h, setH] = useState('')
  const [sending, setSending] = useState(false)
  const [cancel, setCancelling] = useState<Row | null>(null)

  useEffect(() => { if (data && !day) setDay(data.today) }, [data, day])
  useEffect(() => {
    setH('')
    if (!day || !vaccine) { setSlots(null); return }
    setLoadingSlots(true)
    get<Slot[]>('api/vaccines/slots', { date: day }).then((r) => setSlots(r.data)).catch(() => setSlots([])).finally(() => setLoadingSlots(false))
  }, [day, vaccine])

  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message}</Empty>

  // Cartao: doses aplicadas por vacina, no esquema de cada uma.
  const byVaccine = data.catalog.map((v) => ({ v, doses: data.administered.filter((a) => a.id_vacina === v.id_vacina) })).filter((x) => x.doses.length > 0)
  const pendingOnes = data.scheduled.filter((a) => a.status === 'agendada')

  return (
    <>
      <PageHeader title="Vacinas" subtitle="Seu cartão de vacinação e os agendamentos na sala de vacinação." />
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Panel title="Cartão de vacinação" meta={<span className="inline-flex items-center gap-1"><ShieldCheck className="size-3.5" /> registrado pela enfermagem</span>}>
          {byVaccine.length === 0 ? <p className="text-muted">Nenhuma vacina registrada na clínica.</p> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {byVaccine.map(({ v, doses }, i) => (
                <motion.div key={String(v.id_vacina)} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-[var(--radius-card)] border border-line p-4">
                  <p className="font-semibold">{String(v.nome)}</p>
                  <div className="mt-2 flex gap-1.5" aria-label={`${doses.length} de ${v.doses} doses`}>
                    {Array.from({ length: Number(v.doses) }, (_, k) => <span key={k} className={`h-2 grow rounded-full ${k < doses.length ? 'bg-brand-500' : 'bg-rule'}`} />)}
                  </div>
                  <ul className="mt-3 space-y-1.5 text-[13px]">
                    {doses.map((d) => (
                      <li key={String(d.id_aplicacao)} className="flex justify-between gap-2">
                        <span>Dose {String(d.dose)} · {formatDate(d.aplicada_em)}</span>
                        <span className="text-faint">lote {String(d.lote)}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          )}
        </Panel>
        <div className="grid content-start gap-5">
          <Panel title="Agendar vacina" delay={0.06}>
            <div className="grid gap-3">
              <Field label="Vacina" name="vacinaP">
                <Select name="vacinaP" value={vaccine} onChange={(e) => setVaccine(e.target.value)}>
                  <option value="">Escolha…</option>
                  {data.catalog.map((v) => <option key={String(v.id_vacina)} value={String(v.id_vacina)}>{String(v.nome)}</option>)}
                </Select>
              </Field>
              <Field label="Data" name="diaVacina"><Input name="diaVacina" type="date" min={data.today} value={day} onChange={(e) => setDay(e.target.value)} /></Field>
              {vaccine && <SlotGrid slots={slots} loading={loadingSlots} selected={h} onChoose={setH} emptyText="A sala de vacinação abre de segunda a sexta." />}
              <Button variant="primario" icon={Syringe} disabled={!vaccine || !h} loading={sending} onClick={async () => {
                setSending(true)
                try { const r = await post('api/portal/vaccines', { id_vacina: vaccine, date: day, time: h }); notify(r.message ?? 'Agendada.'); setVaccine(''); reload() }
                catch (e) { notify(e instanceof ApiError ? e.message : 'Não foi possível agendar.', false) }
                finally { setSending(false) }
              }}>Agendar</Button>
              <p className="text-[12px] text-faint">A dose é calculada pelo seu cartão e respeita o intervalo mínimo entre doses.</p>
            </div>
          </Panel>
          <Panel title="Agendamentos" delay={0.1}>
            {data.scheduled.length === 0 ? <p className="text-muted">Nenhum agendamento.</p> : (
              <ul className="divide-y divide-rule">
                {data.scheduled.map((a) => (
                  <li key={String(a.id_agendamento)} className="flex items-center gap-2 py-2.5 first:pt-0">
                    <span className="grow"><span className="block font-medium">{String(a.vacina)} · dose {String(a.dose)}</span>
                      <span className="block text-[12px] text-muted">{formatDate(a.data_hora)} às {formatTime(a.data_hora)}</span></span>
                    {a.status === 'agendada' ? <Button small variant="perigoTexto" onClick={() => setCancelling(a)}>Cancelar</Button>
                      : <Badge tone={a.status === 'ausente' ? 'neutral' : 'negative'}>{a.status === 'ausente' ? 'Faltou' : 'Cancelada'}</Badge>}
                  </li>
                ))}
              </ul>
            )}
            {pendingOnes.length > 0 && <p className="mt-3 text-[12px] text-faint">Leve um documento com foto e, se tiver, a caderneta de vacinação.</p>}
          </Panel>
        </div>
      </div>
      <ReasonDialog open={!!cancel} title="Cancelar vacina" buttonLabel="Cancelar agendamento" onClose={() => setCancelling(null)}
        onConfirm={async (reason) => {
          try { const r = await post(`api/portal/vaccines/${cancel!.id_agendamento}/cancel`, { reason }); notify(r.message ?? 'Cancelado.'); reload() }
          catch (e) { notify(e instanceof ApiError ? e.message : 'Não foi possível cancelar.', false) }
          setCancelling(null)
        }} />
    </>
  )
}
