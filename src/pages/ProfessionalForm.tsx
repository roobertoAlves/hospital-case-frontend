import { IdCard, HeartPulse, Plus, Stethoscope } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useNotice } from '../components/notices'
import { Alert, Button, ButtonLink, PageHeader, Field, Loading, Input, Panel, FormSection, Select, Empty, cx } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { WEEKDAYS } from '../lib/format'
import { maskPhone } from '../lib/masks'
import { useSession } from '../lib/session'
import { useApi } from '../lib/useApi'
import { useForm } from '../lib/useForm'

type Row = Record<string, unknown>
interface Data { professional: Row; specialties: Row[]; users: Row[] }
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')
const FIELDS = ['tipo', 'nome', 'email', 'telefone', 'crm', 'crm_uf', 'duracao_consulta_min', 'coren', 'coren_uf', 'cargo', 'id_usuario', 'create_access'] as const
type Values = Record<(typeof FIELDS)[number], string>
interface Range { dia_semana: string; hora_inicio: string; hora_fim: string }

export default function ProfessionalForm() {
  const { id } = useParams()
  const editing = !!id
  const [params] = useSearchParams()
  const { can } = useSession()
  const notify = useNotice()
  const { data, loading, error, reload } = useApi<Data>(editing ? `api/professionals/${id}` : 'api/professionals/options', editing ? undefined : { type: params.get('tipo') })
  const f = useForm<Values>(Object.fromEntries(FIELDS.map((c) => [c, ''])) as Values)
  const [specialtyIds, setSpecialtyIds] = useState<string[]>([])
  const [ranges, setRanges] = useState<Range[]>([])
  const [rangeErrors, setRangeErrors] = useState<Record<string, string>>({})
  const [savingRanges, setSavingRanges] = useState(false)

  useEffect(() => {
    if (!data) return
    const p = data.professional
    const v = Object.fromEntries(FIELDS.map((c) => [c, p[c] == null ? '' : String(p[c])])) as Values
    v.duracao_consulta_min = v.duracao_consulta_min || '30'
    v.create_access = ''
    f.setValues(v)
    setSpecialtyIds(((p.specialty_ids as unknown[]) ?? []).map(String))
    setRanges(((p.availability as Row[]) ?? []).map((x) => ({ dia_semana: String(x.dia_semana), hora_inicio: String(x.hora_inicio), hora_fim: String(x.hora_fim) })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message ?? 'Profissional não encontrado.'}</Empty>
  const p = data.professional
  const type = f.values.tipo || 'medico'
  const doctor = type === 'medico', nurse = type === 'enfermeiro'
  const active = !editing || String(p.ativo) === '1'
  const upcoming = Number(p.consultas_futuras ?? 0)

  const status = async () => {
    try { const r = await post(`api/professionals/${id}/status`, { active: active ? '0' : '1' }); notify(r.message ?? 'Feito.'); reload() }
    catch (e) { notify(e instanceof ApiError ? e.message : 'Não foi possível alterar.', false) }
  }
  const saveRanges = async () => {
    setSavingRanges(true); setRangeErrors({})
    try { const r = await post(`api/professionals/${id}/availability`, { ranges }); notify(r.message ?? 'Disponibilidade salva.') }
    catch (e) { if (e instanceof ApiError) { setRangeErrors(e.details ?? {}); notify(e.message, false) } }
    finally { setSavingRanges(false) }
  }

  const field = (c: keyof Values, label: string, opts: { width?: string; required?: boolean; max?: number; inputType?: string; help?: string; mask?: (v: string) => string } = {}) => (
    <Field label={label} name={c} required={opts.required} error={f.errors[c]} help={opts.help} className={opts.width ?? 'sm:col-span-3'}>
      <Input name={c} type={opts.inputType ?? 'text'} maxLength={opts.max} value={f.values[c]} invalid={!!f.errors[c]}
        onChange={(e) => f.change(c, opts.mask ? opts.mask(e.target.value) : e.target.value)} />
    </Field>
  )
  const uf = (c: 'crm_uf' | 'coren_uf') => (
    <Field label="UF" name={c} required error={f.errors[c]} className="sm:col-span-1">
      <Select name={c} value={f.values[c]} invalid={!!f.errors[c]} onChange={(e) => f.change(c, e.target.value)}>
        <option value="">UF</option>{UFS.map((u) => <option key={u}>{u}</option>)}
      </Select>
    </Field>
  )
  const TYPES = [{ id: 'medico', rotulo: 'Médico', icone: Stethoscope }, { id: 'enfermeiro', rotulo: 'Enfermeiro', icone: HeartPulse }, { id: 'funcionario', rotulo: 'Funcionário (recepção)', icone: IdCard }]

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Profissionais', to: '/profissionais' }, { label: editing ? String(p.nome) : 'Novo' }]}
        title={editing ? String(p.nome) : 'Cadastrar profissional'}
        subtitle={editing ? `${doctor ? 'Médico' : nurse ? 'Enfermeiro' : 'Funcionário'} · ${active ? 'ativo' : 'inativo'}` : 'Campos com * são obrigatórios.'}
        actions={editing && <Button variant={active ? 'perigo' : 'secundario'} onClick={status}>{active ? 'Inativar' : 'Reativar'}</Button>}
      />
      {editing && !active && <div className="mb-4"><Alert>Profissional inativo: não aparece no agendamento nem nas filas, e o acesso dele não abre telas clínicas.</Alert></div>}
      <form noValidate className="max-w-[1100px]" onSubmit={f.submit(editing ? `api/professionals/${id}` : 'api/professionals', { body: () => ({ ...f.values, tipo: type, specialty_ids: specialtyIds.join(',') }), redirectTo: (d) => `/profissionais/${editing ? id : d?.id_profissional}` })}>
        <FormSection title="Tipo" description={editing ? 'O tipo não muda depois do cadastro.' : 'Define o registro profissional e o perfil de acesso.'}>
          {editing ? <p className="font-medium sm:col-span-6">{doctor ? 'Médico' : nurse ? 'Enfermeiro' : 'Funcionário'}</p> : (
            <div className="grid gap-2 sm:col-span-6 sm:grid-cols-3" role="radiogroup" aria-label="Tipo de profissional">
              {TYPES.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={type === t.id} onClick={() => f.change('tipo', t.id)}
                  className={cx('flex items-center gap-3 rounded-[var(--radius-card)] border p-3.5 text-left transition-all', type === t.id ? 'border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-control')}>
                  <t.icone className="size-5 text-brand-700" /> <span className="font-medium">{t.rotulo}</span>
                </button>
              ))}
            </div>
          )}
        </FormSection>
        <FormSection title="Identificação e contato" description="Nome como aparece na agenda, nas filas e nas receitas.">
          {field('nome', 'Nome completo', { width: 'sm:col-span-4', required: true, max: 150 })}
          {field('telefone', 'Telefone', { width: 'sm:col-span-2', mask: maskPhone })}
          {field('email', 'E-mail', { width: 'sm:col-span-4', max: 150, inputType: 'email', help: 'Obrigatório se for criar o acesso ao sistema.' })}
        </FormSection>
        <FormSection title={doctor ? 'Registro e especialidades' : nurse ? 'Registro profissional' : 'Cargo'} description={doctor ? 'CRM e UF não se repetem. Só especialidades ativas aparecem.' : nurse ? 'COREN e UF não se repetem.' : 'Função do funcionário na unidade.'}>
          {doctor && <>
            {field('crm', 'CRM', { width: 'sm:col-span-2', required: true, max: 10 })}
            {uf('crm_uf')}
            <Field label="Duração da consulta" name="duracao_consulta_min" required error={f.errors.duracao_consulta_min} help="Define a grade de horários do agendamento." className="sm:col-span-2">
              <Select name="duracao_consulta_min" value={f.values.duracao_consulta_min} onChange={(e) => f.change('duracao_consulta_min', e.target.value)}>
                {[...new Set([15, 20, 30, 40, 45, 60, Number(f.values.duracao_consulta_min) || 30])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m} minutos</option>)}
              </Select>
            </Field>
            <fieldset className="sm:col-span-6">
              <legend className="mb-2 text-[13px] font-medium">Especialidades <span className="text-negative">*</span></legend>
              <div className="flex flex-wrap gap-2">
                {data.specialties.map((e) => {
                  const v = String(e.id_especialidade), on = specialtyIds.includes(v)
                  return (
                    <button key={v} type="button" role="checkbox" aria-checked={on} onClick={() => setSpecialtyIds(on ? specialtyIds.filter((x) => x !== v) : [...specialtyIds, v])}
                      className={cx('rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors', on ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-line hover:border-control')}>
                      {String(e.nome)}
                    </button>
                  )
                })}
              </div>
              {f.errors.specialty_ids && <p className="mt-1.5 text-[12px] text-negative">{f.errors.specialty_ids}</p>}
              <Link to="/especialidades" className="mt-2 inline-block text-[12px] text-brand-700 hover:underline">Gerenciar especialidades</Link>
            </fieldset>
          </>}
          {nurse && <>{field('coren', 'COREN', { width: 'sm:col-span-2', required: true, max: 12 })}{uf('coren_uf')}</>}
          {!doctor && !nurse && field('cargo', 'Cargo', { required: true, max: 80 })}
        </FormSection>
        <FormSection title="Acesso ao sistema" description={`Perfil ${doctor ? 'Médico' : nurse ? 'Enfermagem' : 'Recepção'}. Um usuário só se vincula a um profissional.`}>
          <Field label="Usuário vinculado" name="id_usuario" error={f.errors.id_usuario} help="Só usuários ativos ainda sem profissional." className="sm:col-span-4">
            <Select name="id_usuario" value={f.values.id_usuario} onChange={(e) => f.change('id_usuario', e.target.value)}>
              <option value="">Sem usuário vinculado</option>
              {data.users.map((u) => <option key={String(u.id_usuario)} value={String(u.id_usuario)}>{String(u.nome)} · {String(u.email)}</option>)}
            </Select>
          </Field>
          {!editing && (
            <label className="flex items-start gap-2.5 sm:col-span-6">
              <input type="checkbox" className="mt-0.5 size-4 accent-ink" checked={f.values.create_access === '1'} onChange={(e) => f.change('create_access', e.target.checked ? '1' : '')} />
              <span>Criar um acesso novo com o e-mail acima
                <span className="block text-[12px] text-faint">O usuário recebe uma senha temporária por e-mail e troca no primeiro login. A senha não aparece nesta tela.</span></span>
            </label>
          )}
        </FormSection>
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <ButtonLink to="/profissionais">Voltar</ButtonLink>
          <Button type="submit" variant="primario" loading={f.sending}>{editing ? 'Salvar alterações' : 'Cadastrar profissional'}</Button>
        </div>
      </form>

      {editing && doctor && (
        <Panel title="Disponibilidade semanal" meta={`${upcoming} ${upcoming === 1 ? 'consulta agendada' : 'consultas agendadas'} daqui para frente`} className="mt-8 max-w-[1100px]">
          <p className="mb-4 text-[13px] text-muted">O agendamento só oferece horários dentro destas faixas. Consultas já marcadas fora da nova grade continuam valendo.</p>
          {ranges.length === 0 && <p className="mb-3 text-muted">Sem faixas: o médico não recebe agendamentos.</p>}
          <div className="space-y-2">
            {ranges.map((fx, i) => (
              <div key={i}>
                <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                  <Select aria-label="Dia da semana" disabled={!can('agenda.disponibilidade.manage')} value={fx.dia_semana} onChange={(e) => setRanges(ranges.map((x, j) => (j === i ? { ...x, dia_semana: e.target.value } : x)))}>
                    {WEEKDAYS.map((d, k) => <option key={d} value={k + 1}>{d}</option>)}
                  </Select>
                  <Input aria-label="Início" type="time" step={300} value={fx.hora_inicio} onChange={(e) => setRanges(ranges.map((x, j) => (j === i ? { ...x, hora_inicio: e.target.value } : x)))} />
                  <Input aria-label="Fim" type="time" step={300} value={fx.hora_fim} onChange={(e) => setRanges(ranges.map((x, j) => (j === i ? { ...x, hora_fim: e.target.value } : x)))} />
                  <Button variant="perigoTexto" onClick={() => setRanges(ranges.filter((_, j) => j !== i))}>Remover</Button>
                </div>
                {rangeErrors[`range_${i}`] && <p className="mt-1 text-[12px] text-negative">{rangeErrors[`range_${i}`]}</p>}
              </div>
            ))}
          </div>
          {can('agenda.disponibilidade.manage') && (
            <div className="mt-4 flex gap-2">
              <Button icon={Plus} onClick={() => setRanges([...ranges, { dia_semana: '1', hora_inicio: '08:00', hora_fim: '12:00' }])}>Adicionar faixa</Button>
              <Button variant="primario" loading={savingRanges} onClick={saveRanges}>Salvar disponibilidade</Button>
            </div>
          )}
        </Panel>
      )}
    </>
  )
}
