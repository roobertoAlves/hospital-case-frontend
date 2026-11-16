import { FileText, Plus, Printer, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Dialog, ReasonDialog, useNotice } from '../components/notices'
import { Alert, TextArea, Button, ButtonLink, PageHeader, Field, Loading, Input, Panel, Badge, Priority, Select, Empty } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { formatDate, formatDateTime, formatTime, age, appointmentStatus } from '../lib/format'
import { useApi } from '../lib/useApi'
import { HealthBackgroundForm, HealthBackgroundView } from '../components/HealthBackground'

type Row = Record<string, unknown>
interface Data { appointment: Row; triage: Row | null; allergies: Row[]; background: Row | null; progress_notes: Row[]; versions: number; prescriptions: Row[]; exam_requests: Row[]; previous_records: Row[] }

/** Record sections in the order of the CFM model: [field, label, help, rows (0 = single line), section]. */
const MEDICAL_RECORD: [string, string, string | null, number, string][] = [
  ['queixa_principal', 'Queixa principal (QP)', 'Nas palavras do paciente.', 2, 'Anamnese'],
  ['historia_doenca_atual', 'História da doença atual (HDA)', 'Início, intensidade, frequência, o que melhora ou piora, tratamentos já tentados.', 4, 'Anamnese'],
  ['historico_relevante', 'Antecedentes relatados nesta consulta', 'O histórico fixo do paciente fica no quadro "Antecedentes e hábitos".', 2, 'Anamnese'],
  ['revisao_sistemas', 'Revisão por sistemas', 'Respiratório, cardiovascular, digestivo, urinário, neurológico...', 3, 'Anamnese'],
  ['exame_fisico', 'Exame físico', 'Achados do exame clínico. Os sinais vitais da triagem estão ao lado.', 4, 'Exame físico'],
  ['observacoes', 'Outras observações', null, 2, 'Exame físico'],
  ['hipoteses_diagnosticas', 'Hipóteses diagnósticas', null, 2, 'Diagnóstico'],
  ['diagnostico', 'Diagnóstico', null, 2, 'Diagnóstico'],
  ['cid10', 'CID-10', 'Ex.: J06.9', 0, 'Diagnóstico'],
  ['conduta', 'Plano terapêutico e orientações', 'Obrigatório para finalizar. As prescrições ficam no quadro Receitas.', 3, 'Plano'],
  ['encaminhamentos', 'Encaminhamentos', 'Especialidade e motivo.', 2, 'Plano'],
]
const EMPTY_ITEM = { medicamento: '', dosagem: '', via: '', frequencia: '', duracao: '', orientacoes: '' }
const SEX: Record<string, string> = { feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro' }

export default function EncounterScreen() {
  const { id } = useParams()
  const notify = useNotice()
  const { data, loading, error, reload } = useApi<Data>(`api/encounters/${id}`)
  const [record, setRecord] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [text, setText] = useState('')
  const [rx, setRx] = useState({ orientacoes_gerais: '', items: [{ ...EMPTY_ITEM }] })
  const [exam, setExam] = useState({ nome_exame: '', codigo: '', justificativa: '' })
  const [allergy, setAllergy] = useState({ substancia: '', reacao: '', gravidade: '' })
  const [cancel, setCancelling] = useState<{ url: string; title: string; help: string } | null>(null)

  useEffect(() => {
    if (!data) return
    const v: Record<string, string> = {}
    for (const [k] of MEDICAL_RECORD) v[k] = data.appointment[k] == null ? '' : String(data.appointment[k])
    setRecord(v)
  }, [data])

  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message ?? 'Consulta não encontrada.'}</Empty>

  const c = data.appointment
  const status = String(c.status)
  const waiting = status === 'aguardando_atendimento'
  const inEncounter = status === 'em_atendimento'
  const finished = c.status_prontuario === 'finalizado'
  const draft = c.id_prontuario != null && !finished && inEncounter
  const canPrescribe = inEncounter || status === 'realizada'
  const [statusLabel, statusTone] = appointmentStatus(status)
  const years = age(c.data_nascimento)

  const call = async (key: string, url: string, body?: Record<string, unknown>, after?: () => void) => {
    setBusy(key); setErrors({})
    try { const r = await post(url, body); notify(r.message ?? 'Feito.'); after?.(); await reload() }
    catch (e) { if (e instanceof ApiError) { if (e.details) setErrors(e.details); notify(e.message, false) } else notify('Não foi possível concluir.', false) }
    finally { setBusy('') }
  }

  const save = (e: FormEvent) => { e.preventDefault(); call('salvar', `api/encounters/${id}/record`, record) }
  const issuePrescription = (e: FormEvent) => {
    e.preventDefault()
    call('rx', `api/encounters/${id}/prescriptions`, { orientacoes_gerais: rx.orientacoes_gerais, items: rx.items.filter((i) => i.medicamento.trim()) },
      () => setRx({ orientacoes_gerais: '', items: [{ ...EMPTY_ITEM }] }))
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Fila de atendimento', to: '/atendimento' }, { label: String(c.paciente) }]}
        title={String(c.paciente)}
        subtitle={<span className="flex flex-wrap items-center gap-2">{years !== null && `${years} anos ·`} {SEX[String(c.sexo)] ?? 'Sexo não informado'} · {String(c.especialidade)} · consulta das {formatTime(c.data_hora)} <Badge tone={statusTone}>{statusLabel}</Badge></span>}
        actions={<>
          <ButtonLink to={`/pacientes/${c.id_paciente}/historico`} icon={FileText}>Histórico</ButtonLink>
          {waiting && <Button variant="primario" loading={busy === 'iniciar'} onClick={() => call('iniciar', `api/encounters/${id}/start`)}>Iniciar atendimento</Button>}
        </>}
      />
      <div className="mb-5">
        <Alert tone={data.allergies.length ? 'erro' : 'nota'}>
          <strong>Alergias:</strong>{' '}
          {data.allergies.length ? data.allergies.map((a, i) => <span key={i}>{i > 0 && ' · '}{String(a.substancia)}{a.gravidade ? ` (${a.gravidade})` : ''}{a.reacao ? `: ${a.reacao}` : ''}</span>) : 'nenhuma registrada.'}
        </Alert>
      </div>

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <div className="grid content-start gap-5">
          <Panel title="Prontuário" meta={finished ? `finalizado em ${formatDateTime(c.finalizado_em)} · não pode ser alterado`
            : c.id_prontuario != null ? `rascunho · versão ${c.versao}${data.versions > 0 ? ` · ${data.versions} anteriores guardadas` : ''}` : 'inicie o atendimento para registrar'}>
            {c.id_prontuario == null ? <Empty>O prontuário é aberto quando você inicia o atendimento. A queixa da triagem já vem preenchida.</Empty> : (
              <form onSubmit={save} noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  {MEDICAL_RECORD.map(([k, label, help, rows, section], i) => (
                    <div key={k} className="contents">
                      {(i === 0 || MEDICAL_RECORD[i - 1][4] !== section) && (
                        <h3 className="border-b border-line pb-1.5 text-[12px] font-medium tracking-wide text-muted uppercase sm:col-span-2">{section}</h3>
                      )}
                      <Field label={label} name={k} help={help ?? undefined} error={errors[k]} className={rows >= 3 ? 'sm:col-span-2' : ''}>
                        {rows === 0
                          ? <Input name={k} maxLength={10} value={record[k] ?? ''} disabled={!draft} invalid={!!errors[k]} onChange={(e) => setRecord({ ...record, [k]: e.target.value.toUpperCase() })} />
                          : <TextArea name={k} rows={rows} value={record[k] ?? ''} disabled={!draft} invalid={!!errors[k]} onChange={(e) => setRecord({ ...record, [k]: e.target.value })} />}
                      </Field>
                    </div>
                  ))}
                </div>
                {draft && (
                  <div className="mt-5 flex justify-end gap-2">
                    <Button type="submit" loading={busy === 'salvar'}>Salvar rascunho</Button>
                    <Button type="button" variant="primario" onClick={() => setConfirmFinish(true)}>Finalizar atendimento</Button>
                  </div>
                )}
              </form>
            )}
          </Panel>

          {c.id_prontuario != null && (
            <Panel title="Evoluções e adendos" meta="só inclusão · não podem ser editados" delay={0.08}>
              {data.progress_notes.length === 0 ? <p className="text-muted">Nenhum registro.</p> : (
                <ul className="divide-y divide-rule">
                  {data.progress_notes.map((e, i) => (
                    <li key={i} className="py-3 first:pt-0">
                      <p className="mb-1 text-[12px] text-muted">{e.tipo === 'adendo' ? 'Adendo' : 'Evolução'} · {String(e.autor)} · {formatDateTime(e.registrado_em)}</p>
                      <p className="whitespace-pre-wrap">{String(e.texto)}</p>
                    </li>
                  ))}
                </ul>
              )}
              {(inEncounter || finished) && (
                <form className="mt-4" onSubmit={(e) => { e.preventDefault(); call('note', `api/encounters/${id}/progress-notes`, { tipo: finished ? 'adendo' : 'evolucao', texto: text }, () => setText('')) }}>
                  <Field label={finished ? 'Novo adendo' : 'Nova evolução'} name="texto" error={errors.texto}>
                    <TextArea name="texto" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
                  </Field>
                  <div className="mt-3 flex justify-end"><Button type="submit" loading={busy === 'note'}>{finished ? 'Incluir adendo' : 'Incluir evolução'}</Button></div>
                </form>
              )}
            </Panel>
          )}

          <Panel title="Receitas" meta="emitida não muda; só pode ser cancelada" delay={0.1}>
            {data.prescriptions.length === 0 && <p className="mb-3 text-muted">Nenhuma receita nesta consulta.</p>}
            <ul className="mb-4 space-y-3">
              {data.prescriptions.map((r) => (
                <li key={String(r.id_receita)} className="rounded-[var(--radius-card)] border border-line p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <strong>Receita nº {String(r.id_receita)}</strong>
                    <span className="text-[12px] text-muted">{formatDateTime(r.emitida_em)}</span>
                    {r.status === 'cancelada' ? <Badge tone="negative">Cancelada</Badge> : <Badge tone="positive">Emitida</Badge>}
                    <span className="ml-auto flex gap-1">
                      <ButtonLink to={`/receitas/${r.id_receita}`} small icon={Printer}>Imprimir</ButtonLink>
                      {r.status !== 'cancelada' && <Button small variant="perigoTexto" onClick={() => setCancelling({ url: `api/prescriptions/${r.id_receita}/cancel`, title: `Cancelar a receita nº ${r.id_receita}`, help: 'A receita cancelada continua no histórico, marcada como cancelada.' })}>Cancelar</Button>}
                    </span>
                  </div>
                  <ol className="list-decimal space-y-1 pl-5 text-[13px]">
                    {(r.items as Row[]).map((i, k) => <li key={k}><strong>{String(i.medicamento)}</strong> {String(i.dosagem)} {i.via ? `· ${i.via}` : ''} · {String(i.frequencia)} · {String(i.duracao)}{i.orientacoes ? ` · ${i.orientacoes}` : ''}</li>)}
                  </ol>
                  {r.motivo_cancelamento ? <p className="mt-2 text-[12px] text-muted">Motivo do cancelamento: {String(r.motivo_cancelamento)}</p> : null}
                </li>
              ))}
            </ul>
            {canPrescribe && (
              <form onSubmit={issuePrescription} className="rounded-[var(--radius-card)] bg-raised p-4" noValidate>
                <p className="mb-3 font-medium">Nova receita</p>
                <div className="space-y-2">
                  {rx.items.map((it, k) => (
                    <div key={k} className="grid gap-2 sm:grid-cols-[2fr_1fr_0.8fr_1.2fr_1fr_auto]">
                      {(['medicamento', 'dosagem', 'via', 'frequencia', 'duracao'] as const).map((field) => (
                        <Input key={field} aria-label={`${field} do item ${k + 1}`} value={it[field]}
                          placeholder={{ medicamento: 'Medicamento', dosagem: '500 mg', via: 'oral', frequencia: '8 em 8 horas', duracao: '7 dias' }[field]}
                          onChange={(e) => setRx({ ...rx, items: rx.items.map((x, j) => (j === k ? { ...x, [field]: e.target.value } : x)) })} />
                      ))}
                      <Button type="button" variant="perigoTexto" aria-label="Remover item" disabled={rx.items.length === 1}
                        onClick={() => setRx({ ...rx, items: rx.items.filter((_, j) => j !== k) })}><Trash2 className="size-4" /></Button>
                    </div>
                  ))}
                </div>
                {errors.items && <p className="mt-2 text-[12px] text-negative">{errors.items}</p>}
                <Button type="button" variant="texto" small icon={Plus} className="mt-2" disabled={rx.items.length >= 20} onClick={() => setRx({ ...rx, items: [...rx.items, { ...EMPTY_ITEM }] })}>Adicionar medicamento</Button>
                <Field label="Orientações gerais" name="orientacoes_gerais" className="mt-3">
                  <TextArea name="orientacoes_gerais" rows={2} value={rx.orientacoes_gerais} onChange={(e) => setRx({ ...rx, orientacoes_gerais: e.target.value })} />
                </Field>
                <div className="mt-3 flex justify-end"><Button type="submit" variant="primario" loading={busy === 'rx'}>Emitir receita</Button></div>
              </form>
            )}
          </Panel>

          <Panel title="Exames solicitados" delay={0.12}>
            {data.exam_requests.length === 0 && <p className="mb-3 text-muted">Nenhum exame solicitado.</p>}
            <ul className="mb-4 divide-y divide-rule">
              {data.exam_requests.map((e) => (
                <li key={String(e.id_exame)} className="flex flex-wrap items-center gap-2 py-2.5">
                  <span className="grow"><span className="block font-medium">{String(e.nome_exame)}{e.codigo ? ` · ${e.codigo}` : ''}</span>
                    <span className="block text-[12px] text-muted">{formatDateTime(e.solicitado_em)}{e.justificativa ? ` · ${e.justificativa}` : ''}</span></span>
                  {e.status === 'cancelado' ? <Badge tone="negative">Cancelado</Badge>
                    : <Button small variant="perigoTexto" onClick={() => setCancelling({ url: `api/exam-requests/${e.id_exame}/cancel`, title: `Cancelar o pedido de ${e.nome_exame}`, help: 'O pedido cancelado continua no histórico.' })}>Cancelar</Button>}
                </li>
              ))}
            </ul>
            {canPrescribe && (
              <form className="grid gap-3 rounded-[var(--radius-card)] bg-raised p-4 sm:grid-cols-6" noValidate
                onSubmit={(ev) => { ev.preventDefault(); call('exam', `api/encounters/${id}/exam-requests`, exam, () => setExam({ nome_exame: '', codigo: '', justificativa: '' })) }}>
                <Field label="Exame" name="nome_exame" required error={errors.nome_exame} className="sm:col-span-4"><Input name="nome_exame" maxLength={200} value={exam.nome_exame} onChange={(e) => setExam({ ...exam, nome_exame: e.target.value })} /></Field>
                <Field label="Código" name="codigo" help="Opcional (ex.: TUSS)" className="sm:col-span-2"><Input name="codigo" maxLength={20} value={exam.codigo} onChange={(e) => setExam({ ...exam, codigo: e.target.value })} /></Field>
                <Field label="Justificativa" name="justificativa" className="sm:col-span-6"><Input name="justificativa" maxLength={500} value={exam.justificativa} onChange={(e) => setExam({ ...exam, justificativa: e.target.value })} /></Field>
                <div className="flex justify-end sm:col-span-6"><Button type="submit" loading={busy === 'exam'}>Solicitar exame</Button></div>
              </form>
            )}
          </Panel>
        </div>

        <div className="grid content-start gap-5">
          <Panel title="Triagem" delay={0.06}>
            {!data.triage ? <p className="text-muted">Sem triagem registrada.</p> : (() => {
              const t = data.triage
              const item = (r: string, v: unknown, u = '') => <div><dt className="text-[12px] text-muted">{r}</dt><dd className="num font-medium">{v == null || v === '' ? '—' : `${v}${u}`}</dd></div>
              return (
                <>
                  <p className="mb-3"><Priority color={t.cor_hex} name={t.prioridade ?? t.classificacao} /></p>
                  <dl className="grid grid-cols-2 gap-3">
                    {item('Pressão', t.pa_sistolica != null ? `${t.pa_sistolica}/${t.pa_diastolica}` : null, ' mmHg')}
                    {item('Freq. cardíaca', t.frequencia_cardiaca, ' bpm')}
                    {item('Temperatura', t.temperatura != null ? String(t.temperatura).replace('.', ',') : null, ' °C')}
                    {item('Saturação', t.saturacao_o2, '%')}
                    {item('Peso', t.peso_kg, ' kg')}
                    {item('Altura', t.altura_cm, ' cm')}
                  </dl>
                  <p className="mt-3 text-[13px]"><span className="text-muted">Queixa:</span> {String(t.queixa_principal)}</p>
                  <p className="mt-1 text-[12px] text-faint">Registrada {formatDateTime(t.registrado_em)}{t.enfermeiro ? ` por ${t.enfermeiro}` : ''}</p>
                </>
              )
            })()}
          </Panel>
          {canPrescribe && (
            <Panel title="Registrar alergia" delay={0.1}>
              <form className="grid gap-3" noValidate onSubmit={(ev) => { ev.preventDefault(); call('alergia', `api/encounters/${id}/allergies`, allergy, () => setAllergy({ substancia: '', reacao: '', gravidade: '' })) }}>
                <Field label="Substância" name="substancia" required error={errors.substancia}><Input name="substancia" maxLength={150} value={allergy.substancia} onChange={(e) => setAllergy({ ...allergy, substancia: e.target.value })} /></Field>
                <Field label="Reação" name="reacao"><Input name="reacao" maxLength={255} value={allergy.reacao} onChange={(e) => setAllergy({ ...allergy, reacao: e.target.value })} /></Field>
                <Field label="Gravidade" name="gravidade">
                  <Select name="gravidade" value={allergy.gravidade} onChange={(e) => setAllergy({ ...allergy, gravidade: e.target.value })}>
                    <option value="">Não informada</option><option value="leve">Leve</option><option value="moderada">Moderada</option><option value="grave">Grave</option>
                  </Select>
                </Field>
                <Button type="submit" loading={busy === 'alergia'}>Registrar alergia</Button>
              </form>
            </Panel>
          )}
          <Panel title="Antecedentes e hábitos" meta="valem para todos os atendimentos" delay={0.12}>
            {c.status === 'em_atendimento' || c.status === 'realizada'
              ? <HealthBackgroundForm encounterId={String(id)} background={data.background} onSaved={reload} />
              : <HealthBackgroundView background={data.background} />}
          </Panel>
          <Panel title="Atendimentos anteriores" meta={String(data.previous_records.length)} delay={0.14}>
            {data.previous_records.length === 0 ? <p className="text-muted">Primeiro atendimento finalizado deste paciente.</p> : (
              <ul className="divide-y divide-rule">
                {data.previous_records.map((a) => (
                  <li key={String(a.id_prontuario)} className="py-3 first:pt-0">
                    <p className="text-[12px] text-muted">{formatDate(a.data_hora)}{a.medico ? ` · ${a.medico}` : ''}</p>
                    <p className="font-medium">{String(a.diagnostico ?? a.hipoteses_diagnosticas ?? a.queixa_principal ?? '')}{a.cid10 ? ` · CID ${a.cid10}` : ''}</p>
                    <p className="text-[13px] text-muted">{String(a.conduta ?? '')}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link to={`/pacientes/${c.id_paciente}/historico`} className="mt-2 inline-block text-[13px] text-brand-700 hover:underline">Ver histórico completo</Link>
          </Panel>
        </div>
      </div>

      <Dialog open={confirmFinish} onClose={() => setConfirmFinish(false)} title="Finalizar atendimento?">
        <p className="text-muted">Depois de finalizado, o prontuário não pode mais ser alterado; só aceita adendos. A consulta fica como realizada.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => setConfirmFinish(false)}>Voltar</Button>
          <Button variant="primario" loading={busy === 'fim'} onClick={() => { setConfirmFinish(false); call('fim', `api/encounters/${id}/finish`, record) }}>Finalizar</Button>
        </div>
      </Dialog>
      <ReasonDialog open={!!cancel} title={cancel?.title ?? ''} help={cancel?.help} buttonLabel="Confirmar cancelamento"
        onClose={() => setCancelling(null)} onConfirm={async (reason) => { await call('cancel', cancel!.url, { reason }); setCancelling(null) }} />
    </>
  )
}
