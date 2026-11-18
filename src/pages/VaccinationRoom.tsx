import { Syringe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Dialog, ReasonDialog, useNotice } from '../components/notices'
import { PatientSearch, SlotGrid, type Slot, type SelectedPatient } from '../components/booking'
import { DayNavigator } from '../components/DayNavigator'
import { Button, PageHeader, Field, Loading, Input, Panel, Badge, Main, Select, Table, Td, Th, Empty } from '../components/ui'
import { ApiError, get, post } from '../lib/api'
import { longDate, todayIso, formatTime, age } from '../lib/format'
import { useSession } from '../lib/session'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
const STATUS: Record<string, ['neutral' | 'positive' | 'negative', string]> = {
  agendada: ['neutral', 'Agendada'], aplicada: ['positive', 'Aplicada'], cancelada: ['negative', 'Cancelada'], ausente: ['neutral', 'Faltou'],
}

export default function VaccinationRoom() {
  const { can } = useSession()
  const notify = useNotice()
  const [params, setParams] = useSearchParams()
  const day = params.get('data') ?? todayIso()
  const { data, loading, error, reload } = useApi<{ appointments: Row[]; vaccines: Row[] }>('api/vaccines', { date: day })
  const [administer, setAdminister] = useState<Row | null>(null)
  const [batch, setBatch] = useState({ lote: '', fabricante: '', observacoes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [cancel, setCancelling] = useState<Row | null>(null)
  const [isNew, setIsNew] = useState(false)

  const call = async (url: string, body?: Record<string, unknown>) => {
    try { const r = await post(url, body); notify(r.message ?? 'Feito.'); reload(); return true }
    catch (e) { if (e instanceof ApiError) { setErrors(e.details ?? {}); notify(e.message, false) } return false }
  }
  const list = data?.appointments ?? []
  const isToday = day === todayIso()

  return (
    <>
      <PageHeader title="Sala de vacinação" subtitle={`${longDate(day)}${isToday ? ' (hoje)' : ''} · ${list.filter((a) => a.status === 'agendada').length} aguardando, ${list.filter((a) => a.status === 'aplicada').length} aplicadas`}
        actions={<>
          <DayNavigator date={day} onChange={(d) => setParams({ data: d })} />
          {can('vacinas.agendar') && <Button variant="primario" icon={Syringe} onClick={() => setIsNew((n) => !n)}>Agendar vacina</Button>}
        </>} />
      {isNew && data && <NewBooking vaccines={data.vaccines} onBook={() => { setIsNew(false); reload() }} />}
      {loading && !data ? <Loading /> : error ? <Empty>{error.message}</Empty> : list.length === 0 ? <Empty icon={Syringe}>Nenhuma vacina agendada neste dia.</Empty> : (
        <Panel noPadding>
          <Table header={<><Th className="w-20">Hora</Th><Th>Paciente</Th><Th>Vacina</Th><Th className="hidden md:table-cell">Origem</Th><Th>Situação</Th><Th /></>}>
            {list.map((a) => (
              <tr key={String(a.id_agendamento)}>
                <Td className="num text-[15px] font-semibold">{formatTime(a.data_hora)}</Td>
                <Td><Link to={`/pacientes/${a.id_paciente}`} className="hover:text-brand-700"><Main sub={`${age(a.data_nascimento)} anos`}>{String(a.paciente)}</Main></Link></Td>
                <Td><Main sub={`dose ${a.dose} de ${a.doses}`}>{String(a.vacina)}</Main></Td>
                <Td className="hidden md:table-cell text-muted">{a.origem === 'portal' ? 'Portal' : 'Recepção'}</Td>
                <Td><Badge tone={STATUS[String(a.status)][0]}>{STATUS[String(a.status)][1]}</Badge></Td>
                <Td className="text-right whitespace-nowrap">
                  {a.status === 'agendada' && <>
                    {can('vacinas.aplicar') && isToday && <Button small variant="primario" onClick={() => { setAdminister(a); setBatch({ lote: '', fabricante: '', observacoes: '' }); setErrors({}) }}>Registrar aplicação</Button>}
                    {can('vacinas.aplicar') && <Button small variant="texto" onClick={() => call(`api/vaccines/appointments/${a.id_agendamento}/no-show`)}>Faltou</Button>}
                    {can('vacinas.agendar') && <Button small variant="perigoTexto" onClick={() => setCancelling(a)}>Cancelar</Button>}
                  </>}
                </Td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}
      <Dialog open={!!administer} onClose={() => setAdminister(null)} title={`Aplicar ${administer?.vacina ?? ''} · dose ${administer?.dose ?? ''}`}>
        <p className="mb-4 text-[13px] text-muted">{String(administer?.paciente ?? '')}. O registro vai para o cartão de vacinação e não pode ser alterado depois.</p>
        <form className="grid gap-3" onSubmit={async (e) => { e.preventDefault(); if (await call(`api/vaccines/appointments/${administer!.id_agendamento}/administer`, batch)) setAdminister(null) }}>
          <Field label="Lote" name="lote" required error={errors.lote}><Input name="lote" maxLength={40} value={batch.lote} onChange={(e) => setBatch({ ...batch, lote: e.target.value })} autoFocus /></Field>
          <Field label="Fabricante" name="fabricante" error={errors.fabricante}><Input name="fabricante" maxLength={80} value={batch.fabricante} onChange={(e) => setBatch({ ...batch, fabricante: e.target.value })} /></Field>
          <Field label="Observações" name="observacoes" error={errors.observacoes}><Input name="observacoes" maxLength={255} value={batch.observacoes} onChange={(e) => setBatch({ ...batch, observacoes: e.target.value })} /></Field>
          <div className="mt-2 flex justify-end gap-2"><Button type="button" onClick={() => setAdminister(null)}>Voltar</Button><Button type="submit" variant="primario">Registrar</Button></div>
        </form>
      </Dialog>
      <ReasonDialog open={!!cancel} title={`Cancelar vacina de ${cancel?.paciente ?? ''}`} buttonLabel="Cancelar agendamento" onClose={() => setCancelling(null)}
        onConfirm={async (reason) => { await call(`api/vaccines/appointments/${cancel!.id_agendamento}/cancel`, { reason }); setCancelling(null) }} />
    </>
  )
}

function NewBooking({ vaccines, onBook }: { vaccines: Row[]; onBook: () => void }) {
  const notify = useNotice()
  const [patient, setPatient] = useState<SelectedPatient | null>(null)
  const [vaccine, setVaccine] = useState('')
  const [day, setDay] = useState(todayIso())
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [h, setH] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setH('')
    if (!day) return
    setLoading(true)
    get<Slot[]>('api/vaccines/slots', { date: day }).then((r) => setSlots(r.data)).catch(() => setSlots([])).finally(() => setLoading(false))
  }, [day])
  return (
    <Panel title="Agendar vacina" className="mb-5">
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[2fr_1.4fr_1fr]">
          <Field label="Paciente" name="pacVac"><PatientSearch value={patient} onChoose={setPatient} /></Field>
          <Field label="Vacina" name="vacinaR">
            <Select name="vacinaR" value={vaccine} onChange={(e) => setVaccine(e.target.value)}>
              <option value="">Escolha…</option>{vaccines.map((v) => <option key={String(v.id_vacina)} value={String(v.id_vacina)}>{String(v.nome)}</option>)}
            </Select>
          </Field>
          <Field label="Data" name="diaVacR"><Input name="diaVacR" type="date" min={todayIso()} value={day} onChange={(e) => setDay(e.target.value)} /></Field>
        </div>
        <SlotGrid slots={slots} loading={loading} selected={h} onChoose={setH} emptyText="A sala de vacinação abre de segunda a sexta." />
        <div className="flex justify-end">
          <Button variant="primario" disabled={!patient || !vaccine || !h} onClick={async () => {
            try { const r = await post('api/vaccines/appointments', { id_paciente: patient!.id_paciente, id_vacina: vaccine, date: day, time: h }); notify(r.message ?? 'Agendada.'); onBook() }
            catch (e) { notify(e instanceof ApiError ? e.message : 'Não foi possível agendar.', false) }
          }}>Confirmar</Button>
        </div>
      </div>
    </Panel>
  )
}
