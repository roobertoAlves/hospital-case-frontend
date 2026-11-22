import { FileUp, FlaskConical, Paperclip } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ReasonDialog, useNotice } from '../../components/notices'
import { SlotGrid, type Slot } from '../../components/booking'
import { SearchSelect } from '../../components/SearchSelect'
import { Alert, Button, PageHeader, Field, Loading, Input, Panel, Badge, Empty, cx } from '../../components/ui'
import { examRequestStatus } from '../../lib/documents'
import { openFile, ApiError, get, readFile, post } from '../../lib/api'
import { formatDate, formatDateTime, formatTime, categoryLabel, examStatus } from '../../lib/format'
import { useApi } from '../../lib/useApi'

type Row = Record<string, unknown>
interface Data { exams: Row[]; exam_requests: Row[]; all_requests: Row[]; medical_orders: Row[]; types: Row[]; today: string }

const ORDER: Record<string, ['warning' | 'positive' | 'negative', string]> = {
  pendente: ['warning', 'Em conferência'], aprovado: ['positive', 'Aprovado'], recusado: ['negative', 'Recusado'],
}

export default function MyExams() {
  const notify = useNotice()
  const { data, loading, error, reload } = useApi<Data>('api/portal/exams')
  const [mark, setMark] = useState(false)
  const [type, setType] = useState('')
  const [origin, setOrigin] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [day, setDay] = useState('')
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [h, setH] = useState('')
  const [sending, setSending] = useState(false)
  const [cancel, setCancelling] = useState<Row | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { if (data && !day) setDay(data.today) }, [data, day])
  useEffect(() => {
    setH('')
    if (!type || !day) { setSlots(null); return }
    setLoadingSlots(true)
    get<Slot[]>('api/exams/slots', { type: type, date: day }).then((r) => setSlots(r.data)).catch(() => setSlots([])).finally(() => setLoadingSlots(false))
  }, [type, day])

  if (loading && !data) return <Loading variant="list" />
  if (error || !data) return <Empty>{error?.message}</Empty>
  const t = data.types.find((x) => String(x.id_tipo_exame) === type)
  const requires = String(t?.exige_pedido) === '1'
  const validOrders = data.medical_orders.filter((p) => p.status !== 'recusado')
  const ready = !!type && !!h && (!requires || (origin && (origin !== 'new' || file)))

  const confirm = async () => {
    setSending(true)
    try {
      let orderId = origin.startsWith('p:') ? origin.slice(2) : ''
      if (requires && origin === 'new' && file) {
        if (file.size > 5 * 1024 * 1024) { notify('Arquivo maior que 5 MB.', false); return }
        const env = await post<{ id_pedido: number }>('api/portal/medical-orders', { file_name: file.name, content: await readFile(file), id_tipo_exame: type })
        orderId = String(env.data.id_pedido)
      }
      const r = await post('api/portal/exams', { id_tipo_exame: type, date: day, time: h, id_solicitacao: origin.startsWith('s:') ? origin.slice(2) : '', id_pedido: orderId })
      notify(r.message ?? 'Exame marcado.')
      setMark(false); setType(''); setOrigin(''); setFile(null)
      reload()
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Não foi possível marcar.', false)
      reload()
    } finally { setSending(false) }
  }

  return (
    <>
      <PageHeader title="Meus exames" subtitle="Exames de rotina você marca direto. Os demais pedem o pedido médico anexado (a recepção confere)."
        actions={<Button variant="primario" icon={FlaskConical} onClick={() => setMark((m) => !m)}>Marcar exame</Button>} />

      {mark && (
        <Panel title="Marcar exame" className="mb-5">
          <div className="grid gap-4">
            <Field label="Exame" name="tipoExame">
              <SearchSelect name="tipoExame" value={type} placeholder="Nome ou código do exame"
                options={data.types.map((x) => ({ value: String(x.id_tipo_exame), label: String(x.nome), code: x.codigo ? String(x.codigo) : undefined,
                  group: categoryLabel(x.categoria), hint: String(x.exige_pedido) === '1' ? 'exige pedido médico' : 'sem pedido' }))}
                onChange={(v) => {
                  setType(v)
                  const fromDoctor = data.exam_requests.find((s) => String(s.id_tipo_exame) === v)
                  setOrigin(fromDoctor ? `s:${fromDoctor.id_exame}` : '')
                }} />
            </Field>
            {t && <Alert><strong>Preparo:</strong> {String(t.preparo ?? 'Sem preparo especial.')} · {String(t.local)} · {String(t.duracao_min)} min</Alert>}
            {requires && (
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-[13px] font-medium">Pedido médico <span className="text-negative">*</span></legend>
                {data.exam_requests.map((s) => (
                  <label key={`s${s.id_exame}`} className={cx('flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border p-3', origin === `s:${s.id_exame}` ? 'border-ink' : 'border-line')}>
                    <input type="radio" name="origem" className="accent-ink" checked={origin === `s:${s.id_exame}`} onChange={() => setOrigin(`s:${s.id_exame}`)} />
                    <span><span className="block font-medium">{String(s.nome_exame)}</span><span className="block text-[12px] text-muted">Pedido de {String(s.medico)} em {formatDate(s.solicitado_em)} (no sistema, dispensa anexo)</span></span>
                  </label>
                ))}
                {validOrders.map((p) => (
                  <label key={`p${p.id_pedido}`} className={cx('flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border p-3', origin === `p:${p.id_pedido}` ? 'border-ink' : 'border-line')}>
                    <input type="radio" name="origem" className="accent-ink" checked={origin === `p:${p.id_pedido}`} onChange={() => setOrigin(`p:${p.id_pedido}`)} />
                    <Paperclip className="size-4 text-faint" />
                    <span className="grow"><span className="block font-medium">{String(p.nome_original)}</span><span className="block text-[12px] text-muted">Enviado em {formatDateTime(p.enviado_em)}</span></span>
                    <Badge tone={ORDER[String(p.status)][0]}>{ORDER[String(p.status)][1]}</Badge>
                  </label>
                ))}
                <label className={cx('flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border border-dashed p-3', origin === 'new' ? 'border-ink' : 'border-control')}>
                  <input type="radio" name="origem" className="accent-ink" checked={origin === 'new'} onChange={() => { setOrigin('new'); input.current?.click() }} />
                  <FileUp className="size-4 text-brand-700" />
                  <span className="grow">{file ? <><strong>{file.name}</strong> <span className="text-[12px] text-muted">({Math.ceil(file.size / 1024)} KB)</span></> : 'Anexar pedido agora (PDF, JPG ou PNG, até 5 MB)'}</span>
                  <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setOrigin('new') }} />
                </label>
              </fieldset>
            )}
            <Field label="Data" name="diaExame" className="max-w-[220px]"><Input name="diaExame" type="date" min={data.today} value={day} onChange={(e) => setDay(e.target.value)} /></Field>
            <SlotGrid slots={slots} loading={loadingSlots} selected={h} onChoose={setH} emptyText="O local não atende nesse dia." />
            <div className="flex justify-end"><Button variant="primario" disabled={!ready} loading={sending} onClick={confirm}>Confirmar exame</Button></div>
          </div>
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Panel title="Agendamentos" meta={String(data.exams.length)}>
          {data.exams.length === 0 ? <p className="text-muted">Nenhum exame marcado.</p> : (
            <ul className="divide-y divide-rule">
              {data.exams.map((x) => {
                const [label, tone] = examStatus(x.status)
                return (
                  <li key={String(x.id_exame_agendado)} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
                    <span className="min-w-0 grow">
                      <span className="block font-medium">{String(x.exame)}</span>
                      <span className="block text-[13px] text-muted">{formatDate(x.data_hora)} às {formatTime(x.data_hora)} · {String(x.local)}</span>
                      {x.status === 'agendado' && x.preparo ? <span className="block text-[12px]"><strong>Preparo:</strong> {String(x.preparo)}</span> : null}
                      {x.motivo_cancelamento ? <span className="block text-[12px] text-faint">{String(x.motivo_cancelamento)}</span> : null}
                    </span>
                    {x.pedido_status && x.status === 'agendado' ? <Badge tone={ORDER[String(x.pedido_status)][0]}>Pedido: {ORDER[String(x.pedido_status)][1].toLowerCase()}</Badge> : null}
                    <Badge tone={tone}>{label}</Badge>
                    {x.status === 'agendado' && <Button small variant="perigoTexto" onClick={() => setCancelling(x)}>Cancelar</Button>}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
        <div className="grid content-start gap-5">
          <Panel title="Exames pedidos pelo médico" meta={String(data.all_requests.length)} delay={0.06}>
            {data.all_requests.length === 0 ? <p className="text-muted">Nenhum exame pedido pelos médicos da clínica.</p> : (
              <ul className="divide-y divide-rule">
                {data.all_requests.map((s) => {
                  const [label, tone] = examRequestStatus(s)
                  const open = s.status === 'solicitado' && !s.agendado_para && !!s.id_tipo_exame
                  return (
                    <li key={String(s.id_exame)} className="py-2.5 first:pt-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="grow font-medium">{s.codigo ? <span className="num mr-1.5 text-brand-700">{String(s.codigo)}</span> : null}{String(s.nome_exame)}</span>
                        <Badge tone={tone}>{label}</Badge>
                      </div>
                      <p className="text-[12px] text-muted">{String(s.medico)} · {formatDate(s.solicitado_em)}{s.justificativa ? ` · ${s.justificativa}` : ''}</p>
                      {open && <button type="button" className="mt-1 text-[13px] font-medium text-brand-700 hover:underline" onClick={() => { setMark(true); setType(String(s.id_tipo_exame)); setOrigin(`s:${s.id_exame}`); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Marcar este exame</button>}
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="mt-3 text-[12px] text-faint">Pedidos feitos no sistema dispensam anexar papel.</p>
          </Panel>
          <Panel title="Pedidos anexados" delay={0.1}>
            {data.medical_orders.length === 0 ? <p className="text-muted">Nenhum pedido enviado.</p> : (
              <ul className="divide-y divide-rule">
                {data.medical_orders.map((p) => (
                  <li key={String(p.id_pedido)} className="py-2.5 first:pt-0">
                    <div className="flex items-center gap-2">
                      <button className="grow truncate text-left font-medium text-brand-700 hover:underline" onClick={() => openFile(`api/portal/medical-orders/${p.id_pedido}/file`).catch((e) => notify(e.message, false))}>{String(p.nome_original)}</button>
                      <Badge tone={ORDER[String(p.status)][0]}>{ORDER[String(p.status)][1]}</Badge>
                    </div>
                    <p className="text-[12px] text-muted">{formatDateTime(p.enviado_em)}{p.exame ? ` · ${p.exame}` : ''}</p>
                    {p.motivo_recusa ? <p className="text-[12px] text-negative">{String(p.motivo_recusa)}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
      <ReasonDialog open={!!cancel} title={`Cancelar ${cancel?.exame ?? 'exame'}`} buttonLabel="Cancelar exame" onClose={() => setCancelling(null)}
        onConfirm={async (reason) => {
          try { const r = await post(`api/portal/exams/${cancel!.id_exame_agendado}/cancel`, { reason }); notify(r.message ?? 'Exame cancelado.'); reload() }
          catch (e) { notify(e instanceof ApiError ? e.message : 'Não foi possível cancelar.', false) }
          setCancelling(null)
        }} />
    </>
  )
}
