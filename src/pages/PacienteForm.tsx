import { useEffect } from 'react'
import { useParams } from 'react-router'
import { BotaoLink, Botao, Cabecalho, Campo, Carregando, Entrada, SecaoForm, Seletor, Vazio } from '../components/ui'
import { cpfFormatado } from '../lib/formato'
import { mascaraCep, mascaraCpf, mascaraTelefone } from '../lib/mascaras'
import { useApi } from '../lib/useApi'
import { useFormulario } from '../lib/useFormulario'

const CAMPOS = ['nome', 'cpf', 'data_nascimento', 'sexo', 'telefone', 'email', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
  'contato_emergencia_nome', 'contato_emergencia_telefone', 'contato_emergencia_parentesco'] as const
type Valores = Record<(typeof CAMPOS)[number], string>
const vazio = Object.fromEntries(CAMPOS.map((c) => [c, ''])) as Valores

export default function PacienteForm() {
  const { id } = useParams()
  const edicao = !!id
  const { dados, carregando, erro } = useApi<{ paciente: Record<string, unknown> }>(edicao ? `api/pacientes/${id}` : null)
  const f = useFormulario<Valores>(vazio)

  useEffect(() => {
    if (!dados) return
    const p = dados.paciente
    const v = { ...vazio }
    for (const c of CAMPOS) v[c] = p[c] == null ? '' : String(p[c])
    v.cpf = cpfFormatado(v.cpf)
    v.cep = mascaraCep(v.cep)
    f.setValores(v)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados])

  if (edicao && carregando && !dados) return <Carregando />
  if (edicao && erro) return <Vazio>{erro.message}</Vazio>

  const entrada = (campo: keyof Valores, rotulo: string, props: { obrigatorio?: boolean; largura?: string; tipo?: string; mascara?: (v: string) => string; ajuda?: string; max?: number } = {}) => (
    <Campo rotulo={rotulo} nome={campo} obrigatorio={props.obrigatorio} erro={f.erros[campo]} ajuda={props.ajuda} className={props.largura ?? 'sm:col-span-3'}>
      <Entrada name={campo} type={props.tipo ?? 'text'} value={f.valores[campo]} maxLength={props.max} invalido={!!f.erros[campo]}
        onChange={(e) => f.mudar(campo, props.mascara ? props.mascara(e.target.value) : e.target.value)} />
    </Campo>
  )

  return (
    <>
      <Cabecalho
        trilha={[{ rotulo: 'Pacientes', to: '/pacientes' }, ...(edicao ? [{ rotulo: String(dados?.paciente.nome ?? ''), to: `/pacientes/${id}` }, { rotulo: 'Editar' }] : [{ rotulo: 'Novo' }])]}
        titulo={edicao ? 'Editar cadastro' : 'Cadastrar paciente'}
        subtitulo="Campos com * são obrigatórios. O CPF não pode se repetir."
      />
      <form onSubmit={f.enviar(edicao ? `api/pacientes/${id}` : 'api/pacientes')} noValidate className="max-w-[1100px]">
        <SecaoForm titulo="Identificação" descricao="Como o paciente aparece na agenda, nas filas e nos documentos.">
          {entrada('nome', 'Nome completo', { obrigatorio: true, largura: 'sm:col-span-4', max: 150 })}
          {entrada('cpf', 'CPF', { obrigatorio: true, largura: 'sm:col-span-2', mascara: mascaraCpf })}
          {entrada('data_nascimento', 'Data de nascimento', { obrigatorio: true, largura: 'sm:col-span-2', tipo: 'date' })}
          <Campo rotulo="Sexo" nome="sexo" erro={f.erros.sexo} ajuda="Só quando necessário ao atendimento." className="sm:col-span-2">
            <Seletor name="sexo" value={f.valores.sexo} onChange={(e) => f.mudar('sexo', e.target.value)}>
              <option value="">Não informar</option><option value="feminino">Feminino</option><option value="masculino">Masculino</option>
              <option value="outro">Outro</option><option value="nao_informado">Prefere não informar</option>
            </Seletor>
          </Campo>
        </SecaoForm>
        <SecaoForm titulo="Contato" descricao="Usado para confirmar, remarcar e avisar sobre consultas e exames.">
          {entrada('telefone', 'Telefone', { mascara: mascaraTelefone })}
          {entrada('email', 'E-mail', { tipo: 'email', ajuda: 'Recebe os avisos de agendamento, sem dados clínicos.', max: 150 })}
        </SecaoForm>
        <SecaoForm titulo="Endereço" descricao="Opcional.">
          {entrada('cep', 'CEP', { largura: 'sm:col-span-2', mascara: mascaraCep })}
          {entrada('logradouro', 'Logradouro', { largura: 'sm:col-span-4', max: 150 })}
          {entrada('numero', 'Número', { largura: 'sm:col-span-1', max: 10 })}
          {entrada('complemento', 'Complemento', { largura: 'sm:col-span-2', max: 60 })}
          {entrada('bairro', 'Bairro', { largura: 'sm:col-span-3', max: 80 })}
          {entrada('cidade', 'Cidade', { largura: 'sm:col-span-4', max: 80 })}
          {entrada('uf', 'UF', { largura: 'sm:col-span-2', mascara: (v) => v.toUpperCase().slice(0, 2) })}
        </SecaoForm>
        <SecaoForm titulo="Contato de emergência" descricao="Quem avisar se algo acontecer durante o atendimento.">
          {entrada('contato_emergencia_nome', 'Nome', { largura: 'sm:col-span-2', max: 150 })}
          {entrada('contato_emergencia_parentesco', 'Parentesco', { largura: 'sm:col-span-2', max: 40 })}
          {entrada('contato_emergencia_telefone', 'Telefone', { largura: 'sm:col-span-2', mascara: mascaraTelefone })}
        </SecaoForm>
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <BotaoLink to={edicao ? `/pacientes/${id}` : '/pacientes'}>Cancelar</BotaoLink>
          <Botao type="submit" variante="primario" carregando={f.enviando}>{edicao ? 'Salvar alterações' : 'Cadastrar paciente'}</Botao>
        </div>
      </form>
    </>
  )
}
