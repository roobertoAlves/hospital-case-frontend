import { useEffect } from 'react'
import { useParams } from 'react-router'
import { ButtonLink, Button, PageHeader, Field, Loading, Input, FormSection, Select, Empty } from '../components/ui'
import { formattedCpf } from '../lib/format'
import { maskCep, maskCpf, maskPhone } from '../lib/masks'
import { useApi } from '../lib/useApi'
import { useForm } from '../lib/useForm'

const FIELDS = ['nome', 'cpf', 'data_nascimento', 'sexo', 'telefone', 'email', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
  'contato_emergencia_nome', 'contato_emergencia_telefone', 'contato_emergencia_parentesco'] as const
type Values = Record<(typeof FIELDS)[number], string>
const empty = Object.fromEntries(FIELDS.map((c) => [c, ''])) as Values

export default function PatientForm() {
  const { id } = useParams()
  const editing = !!id
  const { data, loading, error } = useApi<{ patient: Record<string, unknown> }>(editing ? `api/pacientes/${id}` : null)
  const f = useForm<Values>(empty)

  useEffect(() => {
    if (!data) return
    const p = data.patient
    const v = { ...empty }
    for (const c of FIELDS) v[c] = p[c] == null ? '' : String(p[c])
    v.cpf = formattedCpf(v.cpf)
    v.cep = maskCep(v.cep)
    f.setValues(v)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  if (editing && loading && !data) return <Loading />
  if (editing && error) return <Empty>{error.message}</Empty>

  const input = (field: keyof Values, label: string, props: { required?: boolean; width?: string; inputType?: string; mask?: (v: string) => string; help?: string; max?: number } = {}) => (
    <Field label={label} name={field} required={props.required} error={f.errors[field]} help={props.help} className={props.width ?? 'sm:col-span-3'}>
      <Input name={field} type={props.inputType ?? 'text'} value={f.values[field]} maxLength={props.max} invalid={!!f.errors[field]}
        onChange={(e) => f.change(field, props.mask ? props.mask(e.target.value) : e.target.value)} />
    </Field>
  )

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Pacientes', to: '/pacientes' }, ...(editing ? [{ label: String(data?.patient.nome ?? ''), to: `/pacientes/${id}` }, { label: 'Editar' }] : [{ label: 'Novo' }])]}
        title={editing ? 'Editar cadastro' : 'Cadastrar paciente'}
        subtitle="Campos com * são obrigatórios. O CPF não pode se repetir."
      />
      <form onSubmit={f.submit(editing ? `api/pacientes/${id}` : 'api/pacientes')} noValidate className="max-w-[1100px]">
        <FormSection title="Identificação" description="Como o paciente aparece na agenda, nas filas e nos documentos.">
          {input('nome', 'Nome completo', { required: true, width: 'sm:col-span-4', max: 150 })}
          {input('cpf', 'CPF', { required: true, width: 'sm:col-span-2', mask: maskCpf })}
          {input('data_nascimento', 'Data de nascimento', { required: true, width: 'sm:col-span-2', inputType: 'date' })}
          <Field label="Sexo" name="sexo" error={f.errors.sexo} help="Só quando necessário ao atendimento." className="sm:col-span-2">
            <Select name="sexo" value={f.values.sexo} onChange={(e) => f.change('sexo', e.target.value)}>
              <option value="">Não informar</option><option value="feminino">Feminino</option><option value="masculino">Masculino</option>
              <option value="outro">Outro</option><option value="nao_informado">Prefere não informar</option>
            </Select>
          </Field>
        </FormSection>
        <FormSection title="Contato" description="Usado para confirmar, remarcar e avisar sobre consultas e exames.">
          {input('telefone', 'Telefone', { mask: maskPhone })}
          {input('email', 'E-mail', { inputType: 'email', help: 'Recebe os avisos de agendamento, sem dados clínicos.', max: 150 })}
        </FormSection>
        <FormSection title="Endereço" description="Opcional.">
          {input('cep', 'CEP', { width: 'sm:col-span-2', mask: maskCep })}
          {input('logradouro', 'Logradouro', { width: 'sm:col-span-4', max: 150 })}
          {input('numero', 'Número', { width: 'sm:col-span-1', max: 10 })}
          {input('complemento', 'Complemento', { width: 'sm:col-span-2', max: 60 })}
          {input('bairro', 'Bairro', { width: 'sm:col-span-3', max: 80 })}
          {input('cidade', 'Cidade', { width: 'sm:col-span-4', max: 80 })}
          {input('uf', 'UF', { width: 'sm:col-span-2', mask: (v) => v.toUpperCase().slice(0, 2) })}
        </FormSection>
        <FormSection title="Contato de emergência" description="Quem avisar se algo acontecer durante o atendimento.">
          {input('contato_emergencia_nome', 'Nome', { width: 'sm:col-span-2', max: 150 })}
          {input('contato_emergencia_parentesco', 'Parentesco', { width: 'sm:col-span-2', max: 40 })}
          {input('contato_emergencia_telefone', 'Telefone', { width: 'sm:col-span-2', mask: maskPhone })}
        </FormSection>
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <ButtonLink to={editing ? `/pacientes/${id}` : '/pacientes'}>Cancelar</ButtonLink>
          <Button type="submit" variant="primario" loading={f.sending}>{editing ? 'Salvar alterações' : 'Cadastrar paciente'}</Button>
        </div>
      </form>
    </>
  )
}
