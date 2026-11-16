import { MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAviso } from '../../components/avisos'
import { Alerta, Botao, Campo, Entrada } from '../../components/ui'
import { ApiError, post } from '../../lib/api'
import { mascaraCpf, mascaraTelefone } from '../../lib/mascaras'
import { useSessao } from '../../lib/sessao'
import { TelaPublica } from '../Acesso'

const VAZIO = { nome: '', cpf: '', data_nascimento: '', email: '', telefone: '', senha: '', confirmar_senha: '', aceite: '' }

/** Cadastro do paciente pelo portal. CPF ja cadastrado na clinica: codigo no e-mail da ficha. */
export default function Cadastro() {
  const { entrar } = useSessao()
  const navigate = useNavigate()
  const avisar = useAviso()
  const [f, setF] = useState(VAZIO)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [pendente, setPendente] = useState<string | null>(null)

  const mudar = (k: keyof typeof VAZIO, v: string) => { setF({ ...f, [k]: v }); if (erros[k]) setErros({ ...erros, [k]: '' }) }
  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true); setErros({})
    try {
      const r = await post<{ vinculo_pendente: boolean; email_ficha?: string }>('api/portal/cadastro', f)
      await entrar(f.email.trim().toLowerCase(), f.senha)
      if (r.data.vinculo_pendente) { setPendente(r.data.email_ficha ?? 'o e-mail da sua ficha'); return }
      avisar('Conta criada. Bem-vindo(a)!')
      navigate('/minha-saude', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) { setErros(err.details ?? {}); avisar(err.message, false) }
    } finally { setEnviando(false) }
  }

  if (pendente) {
    return (
      <TelaPublica titulo="Confirme pelo e-mail" subtitulo="Seu CPF já tinha cadastro na clínica.">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-700"><MailCheck className="size-7" /></span>
          <p>Enviamos um código de 6 dígitos para <strong>{pendente}</strong>, o e-mail que está na sua ficha.</p>
          <p className="text-[13px] text-muted">Assim ninguém consegue acessar seus dados só sabendo o seu CPF. Se esse e-mail não é mais seu, procure a recepção.</p>
          <Botao variante="primario" className="mt-2 h-11 w-full" onClick={() => navigate('/minha-saude', { replace: true })}>Digitar o código</Botao>
        </div>
      </TelaPublica>
    )
  }

  const campo = (k: keyof typeof VAZIO, rotulo: string, props: { tipo?: string; mascara?: (v: string) => string; ac?: string; ajuda?: string; classe?: string } = {}) => (
    <Campo rotulo={rotulo} nome={k} obrigatorio={k !== 'telefone'} erro={erros[k]} ajuda={props.ajuda} className={props.classe}>
      <Entrada name={k} type={props.tipo ?? 'text'} autoComplete={props.ac} value={f[k]} invalido={!!erros[k]}
        onChange={(e) => mudar(k, props.mascara ? props.mascara(e.target.value) : e.target.value)} />
    </Campo>
  )

  return (
    <TelaPublica titulo="Criar conta" subtitulo="Para agendar consultas, exames e vacinas e ver suas receitas.">
      <form onSubmit={enviar} noValidate className="grid gap-4 sm:grid-cols-2">
        {campo('nome', 'Nome completo', { ac: 'name', classe: 'sm:col-span-2' })}
        {campo('cpf', 'CPF', { mascara: mascaraCpf })}
        {campo('data_nascimento', 'Nascimento', { tipo: 'date', ac: 'bday' })}
        {campo('email', 'E-mail', { tipo: 'email', ac: 'email', classe: 'sm:col-span-2', ajuda: 'Será o seu login.' })}
        {campo('telefone', 'Celular', { mascara: mascaraTelefone, ac: 'tel', classe: 'sm:col-span-2' })}
        {campo('senha', 'Senha', { tipo: 'password', ac: 'new-password', ajuda: 'Mínimo de 8 caracteres, com letras e números.' })}
        {campo('confirmar_senha', 'Confirme a senha', { tipo: 'password', ac: 'new-password' })}
        <label className="flex items-start gap-2.5 text-[13px] sm:col-span-2">
          <input type="checkbox" className="mt-0.5 size-4 accent-ink" checked={f.aceite === '1'} onChange={(e) => mudar('aceite', e.target.checked ? '1' : '')} />
          <span>Autorizo o uso dos meus dados para agendamento e atendimento na clínica, conforme a LGPD. Os dados de saúde só são vistos pela equipe que me atende.</span>
        </label>
        {erros.aceite && <p className="-mt-2 text-[12px] text-negative sm:col-span-2">{erros.aceite}</p>}
        {erros.cpf?.includes('recepção') && <div className="sm:col-span-2"><Alerta>{erros.cpf}</Alerta></div>}
        <Botao type="submit" variante="primario" carregando={enviando} className="h-11 sm:col-span-2">Criar conta</Botao>
        <p className="text-center text-[13px] text-muted sm:col-span-2">Já tem conta? <Link to="/login" className="font-medium text-brand-700 hover:underline">Entrar</Link></p>
      </form>
    </TelaPublica>
  )
}
