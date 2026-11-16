import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useNotice } from '../components/notices'
import { PatientSearch, SlotGrid, type Slot, type SelectedPatient } from '../components/booking'
import { Alert, Button, ButtonLink, PageHeader, Field, Loading, Input, FormSection, Select, Empty } from '../components/ui'
import { ApiError, get, post } from '../lib/api'
import { maskedCpf, formatDate, formatTime, appointmentStatus } from '../lib/format'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
interface Options { specialties: Row[]; today: string; patient?: Row; original?: Row }

/** Agendar consulta (/agenda/nova) ou remarcar (/agenda/:id/remarcar). */
export default function AppointmentForm() {
  const { id } = useParams()
  const reschedule = !!id
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const notify = useNotice()
  const { data, loading, error } = useApi<Options>(reschedule ? `api/consultas/${id}/remarcar` : 'api/agenda/opcoes', reschedule ? undefined : { paciente: params.get('paciente') })

  const [patient, setPatient] = useState<SelectedPatient | null>(null)
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
    if (!specialty) { setDoctors(null); return }
    get<Row[]>('api/agenda/medicos', { especialidade: specialty }).then((r) => {
      setDoctors(r.data)
      setDoctor((m) => (r.data.some((x) => String(x.id_profissional) === m) ? m : ''))
    }).catch(() => setDoctors([]))
  }, [specialty])

  useEffect(() => {
    setTime('')
    if (!doctor || !day) { setSlots(null); return }
    setLoadingSlots(true)
    get<Slot[]>('api/agenda/horarios', { doctor, data: day }).then((r) => setSlots(r.data)).catch(() => setSlots([])).finally(() => setLoadingSlots(false))
  }, [doctor, day])

  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message ?? 'Consulta não encontrada.'}</Empty>
  const o = data.original
  const doctorName = doctors?.find((m) => String(m.id_profissional) === doctor)?.nome
  const ready = !!patient && !!doctor && !!chosenTime

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const r = reschedule
        ? await post<Row>(`api/consultas/${id}/remarcar`, { id_medico: doctor, data: day, hora: chosenTime, reason })
        : await post<Row>('api/consultas', { id_paciente: patient!.id_paciente, id_especialidade: specialty, id_medico: doctor, data: day, hora: chosenTime })
      notify(r.message ?? 'Consulta agendada.')
      navigate(`/agenda?data=${day}`)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Não foi possível agendar.', false)
      get<Slot[]>('api/agenda/horarios', { doctor, data: day }).then((r) => setSlots(r.data)).catch(() => undefined)
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
          <Field label="Especialidade" name="esp" required className="sm:col-span-3">
            <Select name="esp" value={specialty} onChange={(e) => setSpecialty(e.target.value)} disabled={reschedule}>
              <option value="">Escolha…</option>
              {data.specialties.map((e) => <option key={String(e.id_especialidade)} value={String(e.id_especialidade)}>{String(e.nome)}</option>)}
            </Select>
          </Field>
          <Field label="Médico" name="med" required className="sm:col-span-3">
            <Select name="med" value={doctor} onChange={(e) => setDoctor(e.target.value)} disabled={!doctors}>
              <option value="">{doctors ? 'Escolha…' : 'Escolha a especialidade primeiro'}</option>
              {(doctors ?? []).map((m) => <option key={String(m.id_profissional)} value={String(m.id_profissional)}>{String(m.nome)} · CRM {String(m.crm)}/{String(m.crm_uf)}</option>)}
            </Select>
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
