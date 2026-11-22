import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useNotice } from '../components/notices'
import { PatientSearch, SlotGrid, type Slot, type SelectedPatient } from '../components/booking'
import { SearchSelect } from '../components/SearchSelect'
import { Alert, Badge, Button, ButtonLink, PageHeader, Field, Loading, Input, FormSection, Empty } from '../components/ui'
import { REFERRAL_PRIORITY } from '../lib/documents'
import { ApiError, get, post } from '../lib/api'
import { maskedCpf, formatDate, formatTime, appointmentStatus } from '../lib/format'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
interface Options { specialties: Row[]; today: string; patient?: Row; original?: Row; open_referrals?: Row[] }

export default function AppointmentForm() {
  const { id } = useParams()
  const reschedule = !!id
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const notify = useNotice()
  const { data, loading, error } = useApi<Options>(reschedule ? `api/appointments/${id}/reschedule` : 'api/appointments/options', reschedule ? undefined : { patient: params.get('paciente') })

  const [patient, setPatient] = useState<SelectedPatient | null>(null)
  const [referrals, setReferrals] = useState<Row[]>([])
  const [specialty, setSpecialty] = useState('')
  const [doctors, setDoctors] = useState<Row[] | null>(null)
  const [doctor, setDoctor] = useState('')
  const [day, setDay] = useState('')
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [chosenTime, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!data) return
    const patientRow = data.patient
    if (patientRow) setPatient({ id_paciente: Number(patientRow.id_paciente), nome: String(patientRow.nome), cpf: maskedCpf(patientRow.cpf) })
    const o = data.original
    if (o) {
      setSpecialty(String(o.id_especialidade))
      setDoctor(String(o.id_medico))
      const d = String(o.data_hora).slice(0, 10)
      setDay(d > data.today ? d : data.today)
    } else setDay(data.today)
  }, [data])

  useEffect(() => {
    setReferrals([])
    if (!patient || reschedule) return
    get<Options>('api/appointments/options', { patient: patient.id_paciente }).then((r) => {
      const open = r.data.open_referrals ?? []
      setReferrals(open)
      if (open.length === 1) setSpecialty((s) => s || String(open[0].id_especialidade))
    }).catch(() => undefined)
  }, [patient, reschedule])

  useEffect(() => {
    if (!specialty) { setDoctors(null); return }
    get<Row[]>('api/appointments/doctors', { specialty: specialty }).then((r) => {
      setDoctors(r.data)
      setDoctor((m) => (r.data.some((x) => String(x.id_profissional) === m) ? m : r.data.length === 1 ? String(r.data[0].id_profissional) : ''))
    }).catch(() => setDoctors([]))
  }, [specialty])

  useEffect(() => {
    setTime('')
    if (!doctor || !day) { setSlots(null); return }
    setLoadingSlots(true)
    get<Slot[]>('api/appointments/slots', { doctor, date: day }).then((r) => setSlots(r.data)).catch(() => setSlots([])).finally(() => setLoadingSlots(false))
  }, [doctor, day])

  if (loading && !data) return <Loading variant="form" />
  if (error || !data) return <Empty>{error?.message ?? 'Consulta não encontrada.'}</Empty>
  const o = data.original
  const doctorName = doctors?.find((m) => String(m.id_profissional) === doctor)?.nome
  const ready = !!patient && !!doctor && !!chosenTime

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const r = reschedule
        ? await post<Row>(`api/appointments/${id}/reschedule`, { id_medico: doctor, date: day, time: chosenTime, reason })
        : await post<Row>('api/appointments', { id_paciente: patient!.id_paciente, id_especialidade: specialty, id_medico: doctor, date: day, time: chosenTime })
      notify(r.message ?? 'Consulta agendada.')
      navigate(`/agenda?data=${day}`)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Não foi possível agendar.', false)
      get<Slot[]>('api/appointments/slots', { doctor, date: day }).then((r) => setSlots(r.data)).catch(() => undefined)
    } finally { setSending(false) }
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Agenda de consultas', to: '/agenda' }, { label: reschedule ? 'Remarcar' : 'Agendar' }]}
        title={reschedule ? 'Remarcar consulta' : 'Agendar consulta'}
        subtitle={reschedule ? 'A consulta atual é cancelada e a nova fica ligada a ela. O paciente recebe o aviso do novo horário.' : 'Escolha o paciente, a especialidade e o médico; depois um horário livre.'}
      />
      {o && o.status !== 'agendada' && <div className="mb-4"><Alert tone="erro">Esta consulta não está mais agendada ({appointmentStatus(o.status)[0]}). Só consultas antes da chegada podem ser remarcadas.</Alert></div>}
      {o && <div className="mb-4"><Alert><strong>Horário atual:</strong> {formatDate(o.data_hora)} às {formatTime(o.data_hora)} · {String(o.medico)} · {String(o.especialidade)}</Alert></div>}
      <form onSubmit={submit} noValidate className="max-w-[1100px]">
        <FormSection title="Paciente" description={reschedule ? 'Na remarcação o paciente não muda.' : 'Busque por nome ou CPF. Só pacientes ativos aparecem.'}>
          <div className="max-w-[540px] sm:col-span-6"><PatientSearch value={patient} onChoose={setPatient} locked={reschedule} /></div>
        </FormSection>
        <FormSection title="Especialidade e médico" description="Só médicos ativos que atendem a especialidade.">
          {referrals.length > 0 && (
            <div className="grid gap-2 sm:col-span-6">
              <p className="text-[13px] font-medium">Encaminhamentos em aberto deste paciente</p>
              <div className="flex flex-wrap gap-2">
                {referrals.map((r) => {
                  const [label, tone] = REFERRAL_PRIORITY[String(r.prioridade)] ?? ['—', 'neutral']
                  const on = specialty === String(r.id_especialidade)
                  return (
                    <button key={String(r.id_encaminhamento)} type="button" onClick={() => setSpecialty(String(r.id_especialidade))}
                      className={`rounded-[var(--radius-card)] border px-3 py-2 text-left ${on ? 'border-ink bg-brand-50' : 'border-line hover:bg-raised'}`}>
                      <span className="flex items-center gap-2 font-medium">{String(r.especialidade)} <Badge tone={tone}>{label}</Badge></span>
                      <span className="block text-[12px] text-muted">{String(r.medico)} · {String(r.motivo).slice(0, 80)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <Field label="Especialidade" name="esp" required className="sm:col-span-3">
            <SearchSelect name="esp" value={specialty} disabled={reschedule} placeholder="Busque a especialidade"
              options={data.specialties.map((e) => ({ value: String(e.id_especialidade), label: String(e.nome) }))}
              onChange={(v) => setSpecialty(v)} />
          </Field>
          <Field label="Médico" name="med" required className="sm:col-span-3" help={doctors?.length === 1 ? 'Único médico desta especialidade: já escolhido.' : undefined}>
            <SearchSelect name="med" value={doctor} disabled={!doctors} placeholder={doctors ? 'Busque o médico' : 'Escolha a especialidade primeiro'}
              options={(doctors ?? []).map((m) => ({ value: String(m.id_profissional), label: String(m.nome), hint: `CRM ${m.crm}/${m.crm_uf}` }))}
              onChange={(v) => setDoctor(v)} />
          </Field>
        </FormSection>
        <FormSection title="Data e horário" description="Horários na grade do médico. Riscados: ocupados ou já passados.">
          <Field label="Data" name="dia" required className="sm:col-span-2">
            <Input name="dia" type="date" min={data.today} value={day} onChange={(e) => setDay(e.target.value)} />
          </Field>
          <div className="sm:col-span-6"><SlotGrid slots={slots} loading={loadingSlots} selected={chosenTime} onChoose={setTime} /></div>
        </FormSection>
        {reschedule && (
          <FormSection title="Motivo" description="Opcional. Fica no registro da consulta cancelada, não vai no e-mail.">
            <Field label="Motivo da remarcação" name="motivo" className="sm:col-span-6">
              <Input name="motivo" maxLength={200} placeholder="Ex.: pedido do paciente" value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </FormSection>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">
          <span className="mr-auto text-muted" aria-live="polite">{ready ? `${patient!.nome} · ${doctorName} · ${formatDate(day)} às ${chosenTime}` : ''}</span>
          <ButtonLink to="/agenda">Cancelar</ButtonLink>
          <Button type="submit" variant="primario" disabled={!ready} loading={sending}>{reschedule ? 'Confirmar remarcação' : 'Confirmar agendamento'}</Button>
        </div>
      </form>
    </>
  )
}
