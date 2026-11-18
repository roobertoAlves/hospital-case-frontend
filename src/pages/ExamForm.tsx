import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useNotice } from '../components/notices'
import { PatientSearch, SlotGrid, type Slot, type SelectedPatient } from '../components/booking'
import { SearchSelect } from '../components/SearchSelect'
import { Alert, Button, ButtonLink, PageHeader, Field, Loading, Input, FormSection, Empty, cx } from '../components/ui'
import { ApiError, get, post } from '../lib/api'
import { maskedCpf, formatDate, categoryLabel } from '../lib/format'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>

export default function ExamForm() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const notify = useNotice()
  const { data, loading, error } = useApi<{ types: Row[]; today: string; patient?: Row }>('api/exams/options', { patient: params.get('paciente') })
  const [patient, setPatient] = useState<SelectedPatient | null>(null)
  const [requests, setRequests] = useState<Row[]>([])
  const [requestId, setRequestId] = useState('')
  const [type, setType] = useState('')
  const [day, setDay] = useState('')
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [chosenTime, setTime] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!data) return
    setDay(data.today)
    const p = data.patient
    if (p) setPatient({ id_paciente: Number(p.id_paciente), nome: String(p.nome), cpf: maskedCpf(p.cpf) })
  }, [data])

  useEffect(() => {
    setRequests([]); setRequestId('')
    if (!patient) return
    get<{ open_requests: Row[] }>('api/exams/options', { patient: patient.id_paciente }).then((r) => {
      const open = r.data.open_requests ?? []
      setRequests(open)
      const linked = open.filter((o) => o.id_tipo_exame)
      if (linked.length === 1) { setRequestId(String(linked[0].id_exame)); setType(String(linked[0].id_tipo_exame)) }
    }).catch(() => undefined)
  }, [patient])

  useEffect(() => {
    setTime('')
    if (!type || !day) { setSlots(null); return }
    setLoadingSlots(true)
    get<Slot[]>('api/exams/slots', { type: type, date: day }).then((r) => setSlots(r.data)).catch(() => setSlots([])).finally(() => setLoadingSlots(false))
  }, [type, day])

  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message ?? 'Não foi possível carregar.'}</Empty>
  const t = data.types.find((x) => String(x.id_tipo_exame) === type)
  const ready = !!patient && !!type && !!chosenTime

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const r = await post('api/exams', { id_paciente: patient!.id_paciente, id_tipo_exame: type, date: day, time: chosenTime, id_solicitacao: requestId })
      notify(r.message ?? 'Exame agendado.')
      navigate(`/exames?data=${day}`)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Não foi possível agendar.', false)
    } finally { setSending(false) }
  }

  return (
    <>
      <PageHeader breadcrumb={[{ label: 'Agenda de exames', to: '/exames' }, { label: 'Agendar' }]} title="Agendar exame" subtitle="Escolha o paciente, o exame e um horário livre do local." />
      <form onSubmit={submit} noValidate className="max-w-[1100px]">
        <FormSection title="Paciente" description="Busque por nome ou CPF. Só pacientes ativos aparecem.">
          <div className="max-w-[540px] sm:col-span-6"><PatientSearch value={patient} onChoose={setPatient} /></div>
        </FormSection>
        <FormSection title="Exame" description="Cada exame acontece num local, com duração própria.">
          {requests.length > 0 && (
            <fieldset className="grid gap-2 sm:col-span-6">
              <legend className="mb-1 text-[13px] font-medium">Pedidos do médico em aberto</legend>
              {requests.map((r) => {
                const active = requestId === String(r.id_exame)
                return (
                  <label key={String(r.id_exame)} className={cx('flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border p-3', active ? 'border-ink' : 'border-line hover:bg-raised')}>
                    <input type="radio" name="pedido" checked={active} onChange={() => { setRequestId(String(r.id_exame)); if (r.id_tipo_exame) setType(String(r.id_tipo_exame)) }} />
                    <span className="grow"><span className="block font-medium">{r.codigo ? <span className="num mr-1.5 text-brand-700">{String(r.codigo)}</span> : null}{String(r.nome_exame)}</span>
                      <span className="block text-[12px] text-muted">{String(r.medico)} · {formatDate(r.solicitado_em)}{r.justificativa ? ` · ${r.justificativa}` : ''}</span></span>
                  </label>
                )
              })}
              <label className={cx('flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border border-dashed p-3', !requestId ? 'border-ink' : 'border-control')}>
                <input type="radio" name="pedido" checked={!requestId} onChange={() => setRequestId('')} />
                <span>Outro exame, sem pedido do sistema</span>
              </label>
            </fieldset>
          )}
          <Field label="Exame" name="tipo" required className="sm:col-span-4" help="Busque pelo nome ou pelo código.">
            <SearchSelect name="tipo" value={type} placeholder="Nome ou código do exame"
              options={data.types.map((x) => ({ value: String(x.id_tipo_exame), label: String(x.nome), code: x.codigo ? String(x.codigo) : undefined, group: categoryLabel(x.categoria), hint: String(x.local) }))}
              onChange={(v) => { setType(v); if (requestId && !requests.some((r) => String(r.id_exame) === requestId && String(r.id_tipo_exame) === v)) setRequestId('') }} />
          </Field>
          {t && <div className="sm:col-span-6"><Alert><strong>Preparo:</strong> {String(t.preparo ?? 'Sem preparo especial.')} · duração {String(t.duracao_min)} min</Alert></div>}
        </FormSection>
        <FormSection title="Data e horário" description="Horários do local. Riscados: ocupados ou já passados.">
          <Field label="Data" name="dia" required className="sm:col-span-2">
            <Input name="dia" type="date" min={data.today} value={day} onChange={(e) => setDay(e.target.value)} />
          </Field>
          <div className="sm:col-span-6"><SlotGrid slots={slots} loading={loadingSlots} selected={chosenTime} onChoose={setTime} emptyText="O local não atende nesse dia." /></div>
        </FormSection>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">
          <span className="mr-auto text-muted">{ready ? `${patient!.nome} · ${t?.nome} · ${formatDate(day)} às ${chosenTime}` : ''}</span>
          <ButtonLink to="/exames">Cancelar</ButtonLink>
          <Button type="submit" variant="primario" disabled={!ready} loading={sending}>Confirmar agendamento</Button>
        </div>
      </form>
    </>
  )
}
