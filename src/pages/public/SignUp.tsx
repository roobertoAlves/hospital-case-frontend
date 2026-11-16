import { MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useNotice } from '../../components/notices'
import { Alert, Button, Field, Input } from '../../components/ui'
import { ApiError, post } from '../../lib/api'
import { maskCpf, maskPhone } from '../../lib/masks'
import { useSession } from '../../lib/session'
import { PublicScreen } from '../Access'

const EMPTY = { nome: '', cpf: '', data_nascimento: '', email: '', telefone: '', password: '', confirm_password: '', accept_terms: '' }

/** Patient sign-up in the portal. A CPF already registered at the clinic gets a code at the record's e-mail. */
export default function SignUp() {
  const { login } = useSession()
  const navigate = useNavigate()
  const notify = useNotice()
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<string | null>(null)

  const change = (k: keyof typeof EMPTY, v: string) => { setF({ ...f, [k]: v }); if (errors[k]) setErrors({ ...errors, [k]: '' }) }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true); setErrors({})
    try {
      const r = await post<{ link_pending: boolean; record_email?: string }>('api/portal/register', f)
      await login(f.email.trim().toLowerCase(), f.password)
      if (r.data.link_pending) { setPending(r.data.record_email ?? 'o e-mail da sua ficha'); return }
      notify('Conta criada. Bem-vindo(a)!')
      navigate('/minha-saude', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.details ?? {}); notify(err.message, false) }
    } finally { setSending(false) }
  }

  if (pending) {
    return (
      <PublicScreen title="Confirme pelo e-mail" subtitle="Seu CPF já tinha cadastro na clínica.">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-700"><MailCheck className="size-7" /></span>
          <p>Enviamos um código de 6 dígitos para <strong>{pending}</strong>, o e-mail que está na sua ficha.</p>
          <p className="text-[13px] text-muted">Assim ninguém consegue acessar seus dados só sabendo o seu CPF. Se esse e-mail não é mais seu, procure a recepção.</p>
          <Button variant="primario" className="mt-2 h-11 w-full" onClick={() => navigate('/minha-saude', { replace: true })}>Digitar o código</Button>
        </div>
      </PublicScreen>
    )
  }

  const field = (k: keyof typeof EMPTY, label: string, props: { inputType?: string; mask?: (v: string) => string; ac?: string; help?: string; wrapperClass?: string } = {}) => (
    <Field label={label} name={k} required={k !== 'telefone'} error={errors[k]} help={props.help} className={props.wrapperClass}>
      <Input name={k} type={props.inputType ?? 'text'} autoComplete={props.ac} value={f[k]} invalid={!!errors[k]}
        onChange={(e) => change(k, props.mask ? props.mask(e.target.value) : e.target.value)} />
    </Field>
  )

  return (
    <PublicScreen title="Criar conta" subtitle="Para agendar consultas, exames e vacinas e ver suas receitas.">
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {field('nome', 'Nome completo', { ac: 'name', wrapperClass: 'sm:col-span-2' })}
        {field('cpf', 'CPF', { mask: maskCpf })}
        {field('data_nascimento', 'Nascimento', { inputType: 'date', ac: 'bday' })}
        {field('email', 'E-mail', { inputType: 'email', ac: 'email', wrapperClass: 'sm:col-span-2', help: 'Será o seu login.' })}
        {field('telefone', 'Celular', { mask: maskPhone, ac: 'tel', wrapperClass: 'sm:col-span-2' })}
        {field('password', 'Senha', { inputType: 'password', ac: 'new-password', help: 'Mínimo de 8 caracteres, com letras e números.' })}
        {field('confirm_password', 'Confirme a senha', { inputType: 'password', ac: 'new-password' })}
        <label className="flex items-start gap-2.5 text-[13px] sm:col-span-2">
          <input type="checkbox" className="mt-0.5 size-4 accent-ink" checked={f.accept_terms === '1'} onChange={(e) => change('accept_terms', e.target.checked ? '1' : '')} />
          <span>Autorizo o uso dos meus dados para agendamento e atendimento na clínica, conforme a LGPD. Os dados de saúde só são vistos pela equipe que me atende.</span>
        </label>
        {errors.accept_terms && <p className="-mt-2 text-[12px] text-negative sm:col-span-2">{errors.accept_terms}</p>}
        {errors.cpf?.includes('recepção') && <div className="sm:col-span-2"><Alert>{errors.cpf}</Alert></div>}
        <Button type="submit" variant="primario" loading={sending} className="h-11 sm:col-span-2">Criar conta</Button>
        <p className="text-center text-[13px] text-muted sm:col-span-2">Já tem conta? <Link to="/login" className="font-medium text-brand-700 hover:underline">Entrar</Link></p>
      </form>
    </PublicScreen>
  )
}
