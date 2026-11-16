import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, post } from '../lib/api'
import { formatDateTime } from '../lib/format'
import { useNotice } from './notices'
import { Button, Field, Select, TextArea } from './ui'

type Row = Record<string, unknown>

const SMOKING: Record<string, string> = { nunca: 'Nunca fumou', ex_fumante: 'Ex-fumante', fumante: 'Fumante' }
const ALCOHOL: Record<string, string> = { nao: 'Não consome', social: 'Social', frequente: 'Frequente' }
const ACTIVITY: Record<string, string> = { sedentario: 'Sedentário', ate_2x_semana: 'Até 2x por semana', '3x_ou_mais': '3x por semana ou mais' }

const TEXTS: [string, string][] = [
  ['doencas_preexistentes', 'Doenças pré-existentes'],
  ['cirurgias', 'Cirurgias anteriores'],
  ['internacoes', 'Internações'],
  ['medicamentos_uso_continuo', 'Medicamentos de uso contínuo'],
]

/** Read-only health background (personal history, lifestyle habits and family history). */
export function HealthBackgroundView({ background }: { background: Row | null }) {
  if (!background) return <p className="text-muted">Antecedentes ainda não registrados pelo médico.</p>
  const b = background
  const item = (label: string, value: unknown) => (
    <div className="grid grid-cols-[170px_1fr] gap-3 border-b border-rule py-2 last:border-0">
      <dt className="text-muted">{label}</dt><dd className="min-w-0 whitespace-pre-wrap">{value == null || value === '' ? '—' : String(value)}</dd>
    </div>
  )
  return (
    <div className="grid gap-4">
      <div>
        <p className="mb-1 text-[12px] font-medium tracking-wide text-muted uppercase">Antecedentes pessoais</p>
        <dl>{TEXTS.map(([k, l]) => <div key={k}>{item(l, b[k])}</div>)}</dl>
      </div>
      <div>
        <p className="mb-1 text-[12px] font-medium tracking-wide text-muted uppercase">Hábitos de vida</p>
        <dl>
          {item('Tabagismo', SMOKING[String(b.tabagismo)])}
          {item('Álcool', ALCOHOL[String(b.etilismo)])}
          {item('Atividade física', ACTIVITY[String(b.atividade_fisica)])}
          {item('Sono', b.sono)}
          {item('Alimentação', b.alimentacao)}
        </dl>
      </div>
      <div>
        <p className="mb-1 text-[12px] font-medium tracking-wide text-muted uppercase">História familiar</p>
        <p className="whitespace-pre-wrap">{b.historia_familiar ? String(b.historia_familiar) : '—'}</p>
      </div>
      <p className="text-[12px] text-faint">Atualizado em {formatDateTime(b.atualizado_em)}{b.atualizado_por_nome ? ` por ${b.atualizado_por_nome}` : ''}</p>
    </div>
  )
}

/** Editable health background, saved through the encounter (doctor with a care link). */
export function HealthBackgroundForm({ encounterId, background, onSaved }: { encounterId: string; background: Row | null; onSaved: () => void }) {
  const notify = useNotice()
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const v: Record<string, string> = {}
    for (const k of ['doencas_preexistentes', 'cirurgias', 'internacoes', 'medicamentos_uso_continuo', 'tabagismo', 'etilismo',
      'atividade_fisica', 'sono', 'alimentacao', 'historia_familiar']) v[k] = background?.[k] == null ? '' : String(background[k])
    setValues(v)
  }, [background])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const r = await post(`api/encounters/${encounterId}/background`, values)
      notify(r.message ?? 'Antecedentes atualizados.')
      onSaved()
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.details ?? {}); notify(err.message, false) }
    } finally {
      setSaving(false)
    }
  }

  const text = (k: string, label: string, rows = 2) => (
    <Field key={k} label={label} name={k} error={errors[k]} className="sm:col-span-2">
      <TextArea name={k} rows={rows} value={values[k] ?? ''} onChange={(e) => setValues({ ...values, [k]: e.target.value })} />
    </Field>
  )
  const choice = (k: string, label: string, options: Record<string, string>) => (
    <Field key={k} label={label} name={k} error={errors[k]}>
      <Select name={k} value={values[k] ?? ''} onChange={(e) => setValues({ ...values, [k]: e.target.value })}>
        <option value="">Não informado</option>
        {Object.entries(options).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
    </Field>
  )

  return (
    <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
      {TEXTS.map(([k, l]) => text(k, l))}
      {choice('tabagismo', 'Tabagismo', SMOKING)}
      {choice('etilismo', 'Álcool', ALCOHOL)}
      {choice('atividade_fisica', 'Atividade física', ACTIVITY)}
      <div />
      {text('sono', 'Sono', 1)}
      {text('alimentacao', 'Alimentação', 1)}
      {text('historia_familiar', 'História familiar', 3)}
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" loading={saving}>Salvar antecedentes</Button>
      </div>
    </form>
  )
}
