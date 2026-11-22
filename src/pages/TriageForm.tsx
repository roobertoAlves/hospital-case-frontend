import { useEffect, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useNotice } from '../components/notices'
import { Alert, TextArea, Button, ButtonLink, PageHeader, Field, Loading, Input, FormSection, Empty, cx } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { formatTime, age } from '../lib/format'
import { useApi } from '../lib/useApi'
import { useForm } from '../lib/useForm'

type Row = Record<string, unknown>
interface Data { appointment: Row; triage: Row | null; can_record: boolean; can_amend: boolean; classifications: Row[]; allergies: Row[] }

const FIELDS = ['pa_sistolica', 'pa_diastolica', 'frequencia_cardiaca', 'temperatura', 'saturacao_o2', 'peso_kg', 'altura_cm',
  'queixa_principal', 'sintomas', 'observacoes', 'id_classificacao', 'motivo_retificacao', 'encaminhar_emergencia'] as const
type Values = Record<(typeof FIELDS)[number], string>
const empty = Object.fromEntries(FIELDS.map((c) => [c, ''])) as Values

const SEX: Record<string, string> = { feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro', nao_informado: 'Não informado' }

export default function TriageForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notify = useNotice()
  const { data, loading, error } = useApi<Data>(`api/triage/${id}`)
  const f = useForm<Values>(empty)

  useEffect(() => {
    const t = data?.triage
    if (!t) return
    const v = { ...empty }
    for (const c of FIELDS) if (t[c] != null) v[c] = String(t[c]).replace('.', ',').replace(/,0+$/, '')
    v.id_classificacao = String(t.id_classificacao ?? '')
    v.motivo_retificacao = ''
    f.setValues(v)
  }, [data])

  if (loading && !data) return <Loading variant="form" />
  if (error?.code === 'ERR_ETAPA') return <Empty>Esta triagem ainda não foi iniciada ou já não está disponível. <ButtonLink to="/triagem" variant="texto">Voltar à fila</ButtonLink></Empty>
  if (error || !data) return <Empty>{error?.message ?? 'Consulta não encontrada.'}</Empty>

  const c = data.appointment
  const t = data.triage
  const editable = data.can_record || data.can_amend
  const years = age(c.data_nascimento)

  const sign = (field: keyof Values, label: string, unidade: string, width = 'sm:col-span-2', placeholder?: string) => (
    <Field label={<>{label} <span className="font-normal text-faint">{unidade}</span></>} name={field} error={f.errors[field]} className={width}>
      <Input name={field} inputMode="decimal" className="num" placeholder={placeholder} value={f.values[field]} disabled={!editable}
        invalid={!!f.errors[field]} onChange={(e) => f.change(field, e.target.value)} />
    </Field>
  )

  const sendBack = async () => {
    try { await post(`api/triage/${id}/send-back`); notify('Paciente devolvido à fila.'); navigate('/triagem') }
    catch (e) { notify(e instanceof ApiError ? e.message : 'Não foi possível devolver.', false) }
  }

  const action = t ? `api/triages/${t.id_triagem}/amend` : `api/triage/${id}`
  const submit = f.submit(action, { after: () => navigate('/triagem') })

  const list: ReactNode = data.allergies.map((a, i) => <span key={i}>{i > 0 && ' · '}{String(a.substancia)}{a.gravidade ? ` (${a.gravidade})` : ''}</span>)

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Fila de triagem', to: '/triagem' }, { label: String(c.paciente) }]}
        title={String(c.paciente)}
        subtitle={`${years !== null ? `${years} anos · ` : ''}${SEX[String(c.sexo)] ?? 'Sexo não informado'} · consulta com ${c.medico} (${c.especialidade}) · chegou às ${formatTime(c.chegada_em)}`}
        actions={data.can_record && <Button onClick={sendBack}>Devolver à fila</Button>}
      />
      <div className="mb-5">
        <Alert tone={data.allergies.length ? 'erro' : 'nota'}>
          <strong>Alergias:</strong> {data.allergies.length ? list : 'nenhuma registrada. Pergunte ao paciente e informe o médico se houver.'}
        </Alert>
      </div>
      {t && <p className="mb-4 text-[13px] text-muted">
        Triagem registrada por {String(t.enfermeiro)} às {formatTime(t.registrado_em)}{Number(t.versoes) > 1 ? ` · versão ${t.versoes} (retificada)` : ''}.{' '}
        {data.can_amend ? 'Para corrigir, altere os campos e informe o motivo: a versão anterior fica guardada.' : 'O atendimento terminou; a triagem não pode mais ser retificada.'}
      </p>}
      <form onSubmit={submit} noValidate className="max-w-[1100px]">
        <FormSection title="Sinais vitais" description="Preencha o que foi medido. Valores fora da faixa plausível são recusados.">
          {sign('pa_sistolica', 'PA sistólica', 'mmHg', 'sm:col-span-2', '120')}
          {sign('pa_diastolica', 'PA diastólica', 'mmHg', 'sm:col-span-2', '80')}
          {sign('frequencia_cardiaca', 'Freq. cardíaca', 'bpm')}
          {sign('temperatura', 'Temperatura', '°C', 'sm:col-span-2', '36,5')}
          {sign('saturacao_o2', 'Saturação O₂', '%')}
          {sign('peso_kg', 'Peso', 'kg', 'sm:col-span-1')}
          {sign('altura_cm', 'Altura', 'cm', 'sm:col-span-1')}
        </FormSection>
        <FormSection title="Queixa" description="Nas palavras do paciente. O médico vê este texto na fila de atendimento.">
          <Field label="Queixa principal" name="queixa_principal" required error={f.errors.queixa_principal} className="sm:col-span-6">
            <Input name="queixa_principal" maxLength={500} value={f.values.queixa_principal} disabled={!editable} invalid={!!f.errors.queixa_principal} onChange={(e) => f.change('queixa_principal', e.target.value)} />
          </Field>
          <Field label="Sintomas" name="sintomas" className="sm:col-span-3"><TextArea name="sintomas" value={f.values.sintomas} disabled={!editable} onChange={(e) => f.change('sintomas', e.target.value)} /></Field>
          <Field label="Observações" name="observacoes" className="sm:col-span-3"><TextArea name="observacoes" value={f.values.observacoes} disabled={!editable} onChange={(e) => f.change('observacoes', e.target.value)} /></Field>
        </FormSection>
        <FormSection title="Prioridade" description="Define a ordem na fila do médico. Vermelho é atendido primeiro.">
          <div className="grid gap-2 sm:col-span-6 sm:grid-cols-2 lg:grid-cols-5" role="radiogroup" aria-label="Prioridade">
            {data.classifications.map((p) => {
              const checked = f.values.id_classificacao === String(p.id_classificacao)
              return (
                <label key={String(p.id_classificacao)} className={cx('flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border p-3 transition-all',
                  checked ? 'border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-control', !editable && 'cursor-default opacity-80')}>
                  <input type="radio" name="id_classificacao" className="sr-only" checked={checked} disabled={!editable} onChange={() => f.change('id_classificacao', String(p.id_classificacao))} />
                  <span className="size-4 shrink-0 rounded-full" style={{ background: String(p.cor_hex) }} />
                  <span><span className="block font-medium">{String(p.nome)}</span>
                    <span className="block text-[12px] text-muted">{Number(p.tempo_alvo_min) === 0 ? 'atendimento imediato' : `até ${p.tempo_alvo_min} min`}</span></span>
                </label>
              )
            })}
          </div>
          {f.errors.id_classificacao && <p className="text-[12px] text-negative sm:col-span-6">{f.errors.id_classificacao}</p>}
          {editable && (() => {
            const chosen = data.classifications.find((p) => String(p.id_classificacao) === f.values.id_classificacao)
            const critical = !!chosen && Number(chosen.ordem) <= 2
            if (c.tipo === 'emergencia') return <p className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-900 sm:col-span-6"><strong>Entrada pela emergência:</strong> {String(c.motivo_emergencia ?? '')}. Depois da triagem, vai para o médico plantonista.</p>
            if (critical) return <p className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-900 sm:col-span-6"><strong>{String(chosen!.nome)}:</strong> o paciente sai da agenda de {String(c.medico)} e vai direto para o médico plantonista do pronto atendimento.</p>
            return (
              <label className="flex items-start gap-2 rounded-[var(--radius-card)] border border-line px-3 py-2 text-[13px] sm:col-span-6">
                <input type="checkbox" className="mt-0.5" checked={f.values.encaminhar_emergencia === '1'} onChange={(e) => f.change('encaminhar_emergencia', e.target.checked ? '1' : '')} />
                <span><strong>Paciente passando mal:</strong> encaminhar ao pronto atendimento (médico plantonista) em vez de aguardar {String(c.medico)}.</span>
              </label>
            )
          })()}
        </FormSection>
        {t && data.can_amend && (
          <FormSection title="Retificação" description="Obrigatório para corrigir uma triagem já registrada.">
            <Field label="Motivo" name="motivo_retificacao" required error={f.errors.motivo_retificacao} className="sm:col-span-6">
              <Input name="motivo_retificacao" maxLength={255} value={f.values.motivo_retificacao} invalid={!!f.errors.motivo_retificacao} onChange={(e) => f.change('motivo_retificacao', e.target.value)} />
            </Field>
          </FormSection>
        )}
        {f.errors.general && <div className="mb-3"><Alert tone="erro">{f.errors.general}</Alert></div>}
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <ButtonLink to="/triagem">Voltar à fila</ButtonLink>
          {data.can_record && <Button type="submit" variant="primario" loading={f.sending}>Registrar e enviar ao médico</Button>}
          {!data.can_record && data.can_amend && <Button type="submit" variant="primario" loading={f.sending}>Salvar retificação</Button>}
        </div>
      </form>
    </>
  )
}
