import { useEffect } from 'react'
import { useParams } from 'react-router'
import { ButtonLink, Button, PageHeader, Field, Loading, Input, FormSection, Select, Empty } from '../components/ui'
import { formattedCpf } from '../lib/format'
import { maskCep, maskCpf, maskPhone } from '../lib/masks'
import { useApi } from '../lib/useApi'
import { useForm } from '../lib/useForm'

const FIELDS = ['nome', 'nome_social', 'nome_mae', 'cpf', 'data_nascimento', 'sexo', 'estado_civil', 'profissao', 'naturalidade', 'tipo_sanguineo',
  'telefone', 'email', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'contato_emergencia_nome', 'contato_emergencia_telefone',
  'contato_emergencia_parentesco', 'responsavel_nome', 'responsavel_parentesco', 'responsavel_telefone', 'convenio', 'numero_carteirinha', 'cartao_sus'] as const
const MARITAL = [['solteiro', 'Solteiro(a)'], ['casado', 'Casado(a)'], ['uniao_estavel', 'União estável'], ['divorciado', 'Divorciado(a)'], ['viuvo', 'Viúvo(a)'], ['nao_informado', 'Prefere não informar']]
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
type Values = Record<(typeof FIELDS)[number], string>
const empty = Object.fromEntries(FIELDS.map((c) => [c, ''])) as Values

export default function PatientForm() {
  const { id } = useParams()
  const editing = !!id
  const { data, loading, error } = useApi<{ patient: Record<string, unknown> }>(editing ? `api/patients/${id}` : null)
  const f = useForm<Values>(empty)

  useEffect(() => {
    if (!data) return
    const p = data.patient
    const v = { ...empty }
    for (const c of FIELDS) v[c] = p[c] == null ? '' : String(p[c])
    v.cpf = formattedCpf(v.cpf)
    v.cep = maskCep(v.cep)
    f.setValues(v)
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
      <form onSubmit={f.submit(editing ? `api/patients/${id}` : 'api/patients', { redirectTo: (d) => `/pacientes/${editing ? id : d?.id_paciente}` })} noValidate className="max-w-[1100px]">
        <FormSection title="Identificação" description="Como o paciente aparece na agenda, nas filas e nos documentos.">
          {input('nome', 'Nome completo', { required: true, width: 'sm:col-span-4', max: 150 })}
          {input('cpf', 'CPF', { required: true, width: 'sm:col-span-2', mask: maskCpf })}
          {input('nome_social', 'Nome social', { width: 'sm:col-span-3', max: 150, help: 'Como a pessoa prefere ser chamada.' })}
          {input('nome_mae', 'Nome da mãe', { width: 'sm:col-span-3', max: 150 })}
          {input('data_nascimento', 'Data de nascimento', { required: true, width: 'sm:col-span-2', inputType: 'date' })}
          <Field label="Sexo" name="sexo" error={f.errors.sexo} help="Só quando necessário ao atendimento." className="sm:col-span-2">
            <Select name="sexo" value={f.values.sexo} onChange={(e) => f.change('sexo', e.target.value)}>
              <option value="">Não informar</option><option value="feminino">Feminino</option><option value="masculino">Masculino</option>
              <option value="outro">Outro</option><option value="nao_informado">Prefere não informar</option>
            </Select>
          </Field>
          <Field label="Estado civil" name="estado_civil" error={f.errors.estado_civil} className="sm:col-span-2">
            <Select name="estado_civil" value={f.values.estado_civil} onChange={(e) => f.change('estado_civil', e.target.value)}>
              <option value="">Não informar</option>
              {MARITAL.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          {input('profissao', 'Profissão', { width: 'sm:col-span-2', max: 80 })}
          {input('naturalidade', 'Naturalidade', { width: 'sm:col-span-2', max: 80, help: 'Cidade/UF de nascimento.' })}
          <Field label="Tipo sanguíneo" name="tipo_sanguineo" error={f.errors.tipo_sanguineo} className="sm:col-span-2">
            <Select name="tipo_sanguineo" value={f.values.tipo_sanguineo} onChange={(e) => f.change('tipo_sanguineo', e.target.value)}>
              <option value="">Não sabe</option>
              {BLOOD.map((b) => <option key={b} value={b}>{b}</option>)}
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
        <FormSection title="Responsável legal" description="Obrigatório para menores de idade e pessoas sob tutela.">
          {input('responsavel_nome', 'Nome', { width: 'sm:col-span-2', max: 150 })}
          {input('responsavel_parentesco', 'Parentesco', { width: 'sm:col-span-2', max: 40 })}
          {input('responsavel_telefone', 'Telefone', { width: 'sm:col-span-2', mask: maskPhone })}
        </FormSection>
        <FormSection title="Convênio" description="Deixe em branco para atendimento particular.">
          {input('convenio', 'Convênio', { width: 'sm:col-span-2', max: 80 })}
          {input('numero_carteirinha', 'Nº da carteirinha', { width: 'sm:col-span-2', max: 30 })}
          {input('cartao_sus', 'Cartão SUS', { width: 'sm:col-span-2', mask: (v) => v.replace(/\D/g, '').slice(0, 15), help: '15 dígitos.' })}
        </FormSection>
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <ButtonLink to={editing ? `/pacientes/${id}` : '/pacientes'}>Cancelar</ButtonLink>
          <Button type="submit" variant="primario" loading={f.sending}>{editing ? 'Salvar alterações' : 'Cadastrar paciente'}</Button>
        </div>
      </form>
    </>
  )
}
