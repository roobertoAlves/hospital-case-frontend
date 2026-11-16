import { motion } from 'motion/react'
import { CalendarCheck2, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useNotice } from '../components/notices'
import { Logo, LogoMark } from '../components/Logo'
import { Alert, Button, Field, Input } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { useSession } from '../lib/session'

const HIGHLIGHTS = [
  { icone: CalendarCheck2, titulo: 'Agenda sem conflito', texto: 'Horários livres por médico, remarcação ligada à consulta original e aviso por e-mail.' },
  { icone: HeartPulse, titulo: 'Triagem por prioridade', texto: 'Sinais vitais, cor de risco e fila do médico ordenada pela urgência.' },
  { icone: ShieldCheck, titulo: 'Prontuário protegido', texto: 'Acesso só com vínculo clínico, registro imutável e trilha de auditoria.' },
]

/** Moldura das telas publicas: marca a esquerda, formulario a direita. */
export function PublicScreen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-32 -right-24 size-[460px] rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-[420px] rounded-full bg-brand-200/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <LogoMark className="size-10" />
          <span className="text-[22px] font-semibold tracking-tight">Asklep</span>
        </div>
        <div className="relative mt-auto max-w-[520px]">
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-[40px] leading-[1.1] font-semibold tracking-tight">
            Da chegada à receita,<br />um só prontuário.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            className="mt-4 text-[15px] leading-relaxed text-brand-100">
            Recepção, enfermagem e médicos trabalhando sobre o mesmo registro, cada um vendo só o que o seu papel permite.
          </motion.p>
          <div className="mt-10 grid gap-3">
            {HIGHLIGHTS.map((d, i) => (
              <motion.div key={d.titulo} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 + i * 0.1 }}
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"><d.icone className="size-5" strokeWidth={2.2} /></span>
                <span>
                  <span className="block font-medium">{d.titulo}</span>
                  <span className="block text-[13px] leading-relaxed text-brand-100">{d.texto}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </div>
        <p className="relative mt-10 text-[12px] text-brand-200">O nome vem de Asclépio, o deus grego da medicina, cujo bastão com uma serpente virou símbolo da profissão.</p>
      </section>
      <section className="flex items-center justify-center bg-surface px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="w-full max-w-[380px]">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="text-[26px] font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </motion.div>
      </section>
    </div>
  )
}

export function Login() {
  const { user, login } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  if (user) return <Navigate to={user.primeiro_acesso ? '/trocar-senha' : '/'} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const u = await login(email.trim(), password)
      navigate(u?.primeiro_acesso ? '/trocar-senha' : u?.groups.includes('paciente') ? '/minha-saude' : '/painel', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar.')
    } finally {
      setSending(false)
    }
  }

  return (
    <PublicScreen title="Entrar" subtitle="Use o e-mail e a senha cadastrados pela administração.">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <Alert tone="erro">{error}</Alert>}
        <Field label="E-mail" name="email">
          <Input name="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        <Field label="Senha" name="senha">
          <Input name="senha" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" variant="primario" loading={sending} className="mt-2 h-11">Entrar</Button>
        <Link to="/recuperar-senha" className="text-center text-[13px] text-brand-700 hover:underline">Esqueci minha senha</Link>
        <p className="border-t border-line pt-4 text-center text-[13px] text-muted">É paciente e ainda não tem conta? <Link to="/cadastro" className="font-medium text-brand-700 hover:underline">Criar conta</Link></p>
        <Link to="/" className="text-center text-[13px] text-muted hover:text-ink">Voltar ao site</Link>
      </form>
      <div className="mt-10 rounded-[var(--radius-card)] bg-raised p-4 text-[12px] leading-relaxed text-muted">
        <p className="mb-1 flex items-center gap-1.5 font-medium text-ink"><Stethoscope className="size-3.5" /> Ambiente de demonstração</p>
        Paciente: paciente@hospital.local / paciente123<br />Equipe: recepcao@, enfermeiro@, medico@, admin@hospital.local<br />Senhas: recepcao123, enfermeiro123, medico123, admin123 (dados fictícios).
      </div>
    </PublicScreen>
  )
}

export function ChangePassword() {
  const { user, refresh } = useSession()
  const navigate = useNavigate()
  const notify = useNotice()
  const [f, setF] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  if (!user) return <Navigate to="/login" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const r = await post('api/auth/change-password', f)
      await refresh()
      notify(r.message ?? 'Senha alterada.')
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível trocar a senha.')
    } finally {
      setSending(false)
    }
  }
  const field = (name: keyof typeof f, label: string, ac: string) => (
    <Field label={label} name={name}>
      <Input name={name} type="password" autoComplete={ac} value={f[name]} onChange={(e) => setF({ ...f, [name]: e.target.value })} required />
    </Field>
  )
  return (
    <PublicScreen title="Trocar senha" subtitle={user.primeiro_acesso ? 'Primeiro acesso: defina uma senha só sua antes de continuar.' : 'A nova senha vale a partir do próximo login.'}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <Alert tone="erro">{error}</Alert>}
        {field('current_password', user.primeiro_acesso ? 'Senha temporária (do e-mail)' : 'Senha atual', 'current-password')}
        {field('new_password', 'Nova senha', 'new-password')}
        {field('confirm_password', 'Confirme a nova senha', 'new-password')}
        <p className="text-[12px] text-faint">Mínimo de 8 caracteres, com letras e números.</p>
        <Button type="submit" variant="primario" loading={sending} className="h-11">Salvar nova senha</Button>
        {!user.primeiro_acesso && <Link to="/" className="text-center text-[13px] text-brand-700 hover:underline">Voltar ao início</Link>}
      </form>
    </PublicScreen>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  return (
    <PublicScreen title="Recuperar senha" subtitle="Enviamos um link de uso único para o e-mail cadastrado.">
      <form className="flex flex-col gap-4" noValidate onSubmit={async (e) => {
        e.preventDefault(); setError(''); setSending(true)
        try { const r = await post('api/auth/forgot-password', { email: email.trim() }); setMsg(r.message ?? 'Se o e-mail estiver cadastrado, você receberá o link.') }
        catch (err) { setError(err instanceof ApiError ? err.message : 'Não foi possível enviar.') }
        finally { setSending(false) }
      }}>
        {msg && <Alert tone="ok">{msg}</Alert>}
        {error && <Alert tone="erro">{error}</Alert>}
        <Field label="E-mail" name="email"><Input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></Field>
        <Button type="submit" variant="primario" loading={sending} className="h-11">Enviar link</Button>
        <Link to="/login" className="text-center text-[13px] text-brand-700 hover:underline">Voltar ao login</Link>
      </form>
    </PublicScreen>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const notify = useNotice()
  const [f, setF] = useState({ new_password: '', confirm_password: '' })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const token = params.get('token') ?? ''
  return (
    <PublicScreen title="Nova senha" subtitle="Defina a nova senha. O link vale uma vez só.">
      <form className="flex flex-col gap-4" noValidate onSubmit={async (e) => {
        e.preventDefault(); setError(''); setSending(true)
        try { const r = await post('api/auth/reset-password', { token, ...f }); notify(r.message ?? 'Senha redefinida.'); navigate('/login') }
        catch (err) { setError(err instanceof ApiError ? err.message : 'Não foi possível redefinir.') }
        finally { setSending(false) }
      }}>
        {!token && <Alert tone="erro">Link sem token. Peça um novo em “Esqueci minha senha”.</Alert>}
        {error && <Alert tone="erro">{error}</Alert>}
        <Field label="Nova senha" name="new_password"><Input name="new_password" type="password" autoComplete="new-password" value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} /></Field>
        <Field label="Confirme a nova senha" name="confirm_password"><Input name="confirm_password" type="password" autoComplete="new-password" value={f.confirm_password} onChange={(e) => setF({ ...f, confirm_password: e.target.value })} /></Field>
        <Button type="submit" variant="primario" loading={sending} disabled={!token} className="h-11">Redefinir senha</Button>
      </form>
    </PublicScreen>
  )
}
