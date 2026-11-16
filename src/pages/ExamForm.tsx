import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useNotice } from '../components/notices'
import { PatientSearch, SlotGrid, type Slot, type SelectedPatient } from '../components/booking'
import { Alert, Button, ButtonLink, PageHeader, Field, Loading, Input, FormSection, Select, Empty } from '../components/ui'
import { ApiError, get, post } from '../lib/api'
import { groupBy, maskedCpf, formatDate, categoryLabel } from '../lib/format'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>

export default function ExamForm() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const notify = useNotice()
  const { data, loading, error } = useApi<{ types: Row[]; today: string; patient?: Row }>('api/exames/opcoes', { paciente: params.get('paciente') })
  const [patient, setPatient] = useState<SelectedPatient | null>(null)
  const [tipo, setTipo] = useState('')
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
    setTime('')
    if (!tipo || !day) { setSlots(null); return }
    setLoadingSlots(true)
    get<Slot[]>('api/exames/horarios', { tipo, data: day }).then((r) => setSlots(r.data)).catch(() => setSlots([])).finally(() => setLoadingSlots(false))
  }, [tipo, day])

  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message ?? 'Não foi possível carregar.'}</Empty>
  const t = data.types.find((x) => String(x.id_tipo_exame) === tipo)
  const ready = !!patient && !!tipo && !!chosenTime

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const r = await post('api/exames-agendados', { id_paciente: patient!.id_paciente, id_tipo_exame: tipo, data: day, hora: chosenTime })
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
          <Field label="Exame" name="tipo" required className="sm:col-span-4">
            <Select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Escolha…</option>
              {groupBy(data.types, 'categoria').map(([g, list]) => (
                <optgroup key={g} label={categoryLabel(g)}>
                  {list.map((x) => <option key={String(x.id_tipo_exame)} value={String(x.id_tipo_exame)}>{String(x.nome)} · {String(x.local)}</option>)}
                </optgroup>
              ))}
            </Select>
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
