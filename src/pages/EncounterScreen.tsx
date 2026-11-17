import { FileText, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Dialog, ReasonDialog, useNotice } from '../components/notices'
import { Alert, TextArea, Button, ButtonLink, PageHeader, Field, Loading, Input, Panel, Badge, Priority, Select, Empty, Tabs } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { formatDate, formatDateTime, formatTime, age, appointmentStatus } from '../lib/format'
import { useApi } from '../lib/useApi'
import { HealthBackgroundForm, HealthBackgroundSummary } from '../components/HealthBackground'

type Row = Record<string, unknown>
interface Data { appointment: Row; triage: Row | null; allergies: Row[]; background: Row | null; progress_notes: Row[]; versions: number; prescriptions: Row[]; exam_requests: Row[]; previous_records: Row[] }

type Section = 'anamnese' | 'exame' | 'diagnostico' | 'plano'
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'anamnese', label: 'Anamnese' }, { id: 'exame', label: 'Exame físico' },
  { id: 'diagnostico', label: 'Diagnóstico' }, { id: 'plano', label: 'Plano' },
]

const MEDICAL_RECORD: [string, string, string | null, number, Section][] = [
  ['queixa_principal', 'Queixa principal (QP)', 'Nas palavras do paciente.', 2, 'anamnese'],
  ['historia_doenca_atual', 'História da doença atual (HDA)', 'Início, intensidade, frequência, o que melhora ou piora, tratamentos já tentados.', 5, 'anamnese'],
  ['historico_relevante', 'Antecedentes relatados nesta consulta', 'O histórico fixo do paciente fica no quadro "Antecedentes e hábitos".', 3, 'anamnese'],
  ['revisao_sistemas', 'Revisão por sistemas', 'Respiratório, cardiovascular, digestivo, urinário, neurológico...', 3, 'anamnese'],
  ['exame_fisico', 'Exame físico', 'Achados do exame clínico. Os sinais vitais da triagem estão no quadro Triagem.', 7, 'exame'],
  ['observacoes', 'Outras observações', null, 3, 'exame'],
  ['hipoteses_diagnosticas', 'Hipóteses diagnósticas', null, 3, 'diagnostico'],
  ['diagnostico', 'Diagnóstico', null, 3, 'diagnostico'],
  ['cid10', 'CID-10', 'Ex.: J06.9', 0, 'diagnostico'],
  ['conduta', 'Plano terapêutico e orientações', 'Obrigatório para finalizar. Os medicamentos ficam no quadro Receitas.', 6, 'plano'],
  ['encaminhamentos', 'Encaminhamentos', 'Especialidade e motivo.', 3, 'plano'],
]

const UNITS = ['mg', 'g', 'mcg', 'mL', 'gota(s)', 'comprimido(s)', 'cápsula(s)', 'UI', 'jato(s)', 'sachê(s)', 'ampola(s)',
  'adesivo(s)', 'cm (pomada)', 'aplicação(ões)', 'camada fina']
const ROUTES = ['Oral', 'Sublingual', 'Tópica (pele)', 'Oftálmica', 'Otológica', 'Nasal', 'Inalatória', 'Retal', 'Vaginal',
  'Intramuscular', 'Intravenosa', 'Subcutânea', 'Transdérmica']
const FREQUENCIES = ['1x ao dia', '2x ao dia', '3x ao dia', 'De 4 em 4 horas', 'De 6 em 6 horas', 'De 8 em 8 horas', 'De 12 em 12 horas',
  'Ao deitar', 'Em jejum', 'Se dor ou febre', 'Dose única']
const EMPTY_ITEM = { medicamento: '', quantidade: '', unidade: 'mg', via: 'Oral', frequencia: '', duracao: '', orientacoes: '' }
type Item = typeof EMPTY_ITEM
const dose = (i: Item) => (i.unidade === 'camada fina' && !i.quantidade.trim() ? 'Camada fina' : `${i.quantidade.trim()} ${i.unidade}`.trim())
const SEX: Record<string, string> = { feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro' }
const SEVERITY: Record<string, ['negative' | 'warning' | 'neutral', string]> = { grave: ['negative', 'Grave'], moderada: ['warning', 'Moderada'], leve: ['neutral', 'Leve'] }

export default function EncounterScreen() {
  const { id } = useParams()
  const notify = useNotice()
  const { data, loading, error, reload } = useApi<Data>(`api/encounters/${id}`)
  const [record, setRecord] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [text, setText] = useState('')
  const [rx, setRx] = useState<{ orientacoes_gerais: string; items: Item[] }>({ orientacoes_gerais: '', items: [{ ...EMPTY_ITEM }] })
  const [section, setSection] = useState<Section>('anamnese')
  const [allergyOpen, setAllergyOpen] = useState(false)
  const [backgroundOpen, setBackgroundOpen] = useState(false)
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
    const items = rx.items.filter((i) => i.medicamento.trim()).map((i) => ({
      medicamento: i.medicamento, dosagem: dose(i), via: i.via, frequencia: i.frequencia, duracao: i.duracao, orientacoes: i.orientacoes,
    }))
    call('rx', `api/encounters/${id}/prescriptions`, { orientacoes_gerais: rx.orientacoes_gerais, items },
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
                <Tabs tabs={SECTIONS.map((t) => ({ id: t.id, label: `${t.label}${MEDICAL_RECORD.some(([k, , , , sec]) => sec === t.id && record[k]?.trim()) ? ' ✓' : ''}` }))}
                  current={section} onChange={setSection} />
                <div className="mt-4 grid gap-4">
                  {MEDICAL_RECORD.filter(([, , , , sec]) => sec === section).map(([k, label, help, rows]) => (
                    <Field key={k} label={label} name={k} help={help ?? undefined} error={errors[k]} className={rows === 0 ? 'max-w-[180px]' : ''}>
                      {rows === 0
                        ? <Input name={k} maxLength={10} value={record[k] ?? ''} disabled={!draft} invalid={!!errors[k]} onChange={(e) => setRecord({ ...record, [k]: e.target.value.toUpperCase() })} />
                        : <TextArea name={k} rows={rows} value={record[k] ?? ''} disabled={!draft} invalid={!!errors[k]} onChange={(e) => setRecord({ ...record, [k]: e.target.value })} />}
                    </Field>
                  ))}
                </div>
                {draft && (
                  <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
                    <span className="mr-auto text-[12px] text-muted">O rascunho guarda todas as abas de uma vez.</span>
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
                <datalist id="frequencias">{FREQUENCIES.map((f) => <option key={f} value={f} />)}</datalist>
                <div className="space-y-3">
                  {rx.items.map((it, k) => {
                    const set = (field: keyof Item, value: string) => setRx({ ...rx, items: rx.items.map((x, j) => (j === k ? { ...x, [field]: value } : x)) })
                    return (
                      <div key={k} className="rounded-[var(--radius-card)] border border-line bg-surface p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[12px] font-medium text-muted">Medicamento {k + 1}</span>
                          <Button type="button" small variant="perigoTexto" aria-label="Remover item" disabled={rx.items.length === 1}
                            onClick={() => setRx({ ...rx, items: rx.items.filter((_, j) => j !== k) })}><Trash2 className="size-4" /></Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-6">
                          <Field label="Medicamento e apresentação" name={`med${k}`} className="sm:col-span-6">
                            <Input name={`med${k}`} maxLength={200} placeholder="Ex.: Amoxicilina 500 mg cápsula, Dexametasona creme 0,1%" value={it.medicamento} onChange={(e) => set('medicamento', e.target.value)} />
                          </Field>
                          <Field label="Quantidade" name={`qtd${k}`} className="sm:col-span-1">
                            <Input name={`qtd${k}`} inputMode="decimal" maxLength={10} placeholder={it.unidade === 'camada fina' ? '—' : 'Ex.: 1'} value={it.quantidade}
                              onChange={(e) => set('quantidade', e.target.value.replace(/[^\d.,/]/g, ''))} />
                          </Field>
                          <Field label="Unidade" name={`un${k}`} className="sm:col-span-2">
                            <Select name={`un${k}`} value={it.unidade} onChange={(e) => set('unidade', e.target.value)}>
                              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                            </Select>
                          </Field>
                          <Field label="Via" name={`via${k}`} className="sm:col-span-3">
                            <Select name={`via${k}`} value={it.via} onChange={(e) => set('via', e.target.value)}>
                              {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </Select>
                          </Field>
                          <Field label="Frequência" name={`freq${k}`} className="sm:col-span-3">
                            <Input name={`freq${k}`} list="frequencias" maxLength={100} placeholder="Ex.: De 8 em 8 horas" value={it.frequencia} onChange={(e) => set('frequencia', e.target.value)} />
                          </Field>
                          <Field label="Duração" name={`dur${k}`} className="sm:col-span-3">
                            <Input name={`dur${k}`} maxLength={100} placeholder="Ex.: 7 dias, uso contínuo" value={it.duracao} onChange={(e) => set('duracao', e.target.value)} />
                          </Field>
                          <Field label="Orientações deste item" name={`ori${k}`} className="sm:col-span-6">
                            <Input name={`ori${k}`} maxLength={500} placeholder="Ex.: aplicar na lesão após o banho" value={it.orientacoes} onChange={(e) => set('orientacoes', e.target.value)} />
                          </Field>
                        </div>
                      </div>
                    )
                  })}
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
          <Panel title="Alergias" meta={data.allergies.length ? `${data.allergies.length} registradas` : undefined} delay={0.1}
            actions={canPrescribe ? <Button small variant="texto" icon={Plus} onClick={() => setAllergyOpen(true)}>Registrar</Button> : undefined}>
            {data.allergies.length === 0 ? <p className="text-muted">Nenhuma alergia registrada.</p> : (
              <ul className="space-y-2">
                {data.allergies.map((a) => {
                  const [tone, label] = SEVERITY[String(a.gravidade)] ?? ['neutral', 'Sem gravidade']
                  return (
                    <li key={String(a.id_alergia)} className="flex items-start justify-between gap-2 rounded-lg border border-line px-3 py-2">
                      <span><span className="font-medium">{String(a.substancia)}</span>{a.reacao ? <span className="block text-[12px] text-muted">{String(a.reacao)}</span> : null}</span>
                      <Badge tone={tone}>{label}</Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
          <Dialog open={allergyOpen} onClose={() => setAllergyOpen(false)} title="Registrar alergia">
              <form className="grid gap-3" noValidate onSubmit={(ev) => { ev.preventDefault(); call('alergia', `api/encounters/${id}/allergies`, allergy, () => { setAllergy({ substancia: '', reacao: '', gravidade: '' }); setAllergyOpen(false) }) }}>
                <Field label="Substância" name="substancia" required error={errors.substancia}><Input name="substancia" maxLength={150} value={allergy.substancia} onChange={(e) => setAllergy({ ...allergy, substancia: e.target.value })} /></Field>
                <Field label="Reação" name="reacao"><Input name="reacao" maxLength={255} value={allergy.reacao} onChange={(e) => setAllergy({ ...allergy, reacao: e.target.value })} /></Field>
                <Field label="Gravidade" name="gravidade">
                  <Select name="gravidade" value={allergy.gravidade} onChange={(e) => setAllergy({ ...allergy, gravidade: e.target.value })}>
                    <option value="">Não informada</option><option value="leve">Leve</option><option value="moderada">Moderada</option><option value="grave">Grave</option>
                  </Select>
                </Field>
                <div className="mt-2 flex justify-end gap-2">
                  <Button type="button" onClick={() => setAllergyOpen(false)}>Voltar</Button>
                  <Button type="submit" variant="primario" loading={busy === 'alergia'}>Registrar alergia</Button>
                </div>
              </form>
          </Dialog>
          <Panel title="Antecedentes e hábitos" meta="valem para todos os atendimentos" delay={0.12}
            actions={canPrescribe ? <Button small variant="texto" icon={Pencil} onClick={() => setBackgroundOpen(true)}>Editar</Button> : undefined}>
            <HealthBackgroundSummary background={data.background} />
          </Panel>
          <Dialog open={backgroundOpen} onClose={() => setBackgroundOpen(false)} title="Antecedentes e hábitos" width="max-w-3xl">
            <HealthBackgroundForm encounterId={String(id)} background={data.background} onSaved={() => { setBackgroundOpen(false); reload() }} />
          </Dialog>
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
