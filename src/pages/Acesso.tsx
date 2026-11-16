import { motion } from 'motion/react'
import { CalendarCheck2, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAviso } from '../components/avisos'
import { Logo, LogoMarca } from '../components/Logo'
import { Alerta, Botao, Campo, Entrada } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { useSessao } from '../lib/sessao'

const DESTAQUES = [
  { icone: CalendarCheck2, titulo: 'Agenda sem conflito', texto: 'Horários livres por médico, remarcação ligada à consulta original e aviso por e-mail.' },
  { icone: HeartPulse, titulo: 'Triagem por prioridade', texto: 'Sinais vitais, cor de risco e fila do médico ordenada pela urgência.' },
  { icone: ShieldCheck, titulo: 'Prontuário protegido', texto: 'Acesso só com vínculo clínico, registro imutável e trilha de auditoria.' },
]

/** Moldura das telas publicas: marca a esquerda, formulario a direita. */
export function TelaPublica({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-32 -right-24 size-[460px] rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-[420px] rounded-full bg-brand-200/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <LogoMarca className="size-10" />
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
            {DESTAQUES.map((d, i) => (
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
          <h2 className="text-[26px] font-semibold tracking-tight">{titulo}</h2>
          {subtitulo && <p className="mt-1.5 text-muted">{subtitulo}</p>}
          <div className="mt-7">{children}</div>
        </motion.div>
      </section>
    </div>
  )
}

export function Login() {
  const { usuario, entrar } = useSessao()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to={usuario.primeiro_acesso ? '/trocar-senha' : '/'} replace />

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const u = await entrar(email.trim(), senha)
      navigate(u?.primeiro_acesso ? '/trocar-senha' : u?.grupos.includes('paciente') ? '/minha-saude' : '/painel', { replace: true })
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível entrar.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <TelaPublica titulo="Entrar" subtitulo="Use o e-mail e a senha cadastrados pela administração.">
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        {erro && <Alerta tom="erro">{erro}</Alerta>}
        <Campo rotulo="E-mail" nome="email">
          <Entrada name="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Campo>
        <Campo rotulo="Senha" nome="senha">
          <Entrada name="senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </Campo>
        <Botao type="submit" variante="primario" carregando={enviando} className="mt-2 h-11">Entrar</Botao>
        <Link to="/recuperar-senha" className="text-center text-[13px] text-brand-700 hover:underline">Esqueci minha senha</Link>
        <p className="border-t border-line pt-4 text-center text-[13px] text-muted">É paciente e ainda não tem conta? <Link to="/cadastro" className="font-medium text-brand-700 hover:underline">Criar conta</Link></p>
        <Link to="/" className="text-center text-[13px] text-muted hover:text-ink">Voltar ao site</Link>
      </form>
      <div className="mt-10 rounded-[var(--radius-card)] bg-raised p-4 text-[12px] leading-relaxed text-muted">
        <p className="mb-1 flex items-center gap-1.5 font-medium text-ink"><Stethoscope className="size-3.5" /> Ambiente de demonstração</p>
        Paciente: paciente@hospital.local / paciente123<br />Equipe: recepcao@, enfermeiro@, medico@, admin@hospital.local<br />Senhas: recepcao123, enfermeiro123, medico123, admin123 (dados fictícios).
      </div>
    </TelaPublica>
  )
}

export function TrocarSenha() {
  const { usuario, atualizar } = useSessao()
  const navigate = useNavigate()
  const avisar = useAviso()
  const [f, setF] = useState({ senha_atual: '', nova_senha: '', confirmar_nova_senha: '' })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  if (!usuario) return <Navigate to="/login" replace />

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const r = await post('trocar-senha', f)
      await atualizar()
      avisar(r.message ?? 'Senha alterada.')
      navigate('/', { replace: true })
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível trocar a senha.')
    } finally {
      setEnviando(false)
    }
  }
  const campo = (nome: keyof typeof f, rotulo: string, ac: string) => (
    <Campo rotulo={rotulo} nome={nome}>
      <Entrada name={nome} type="password" autoComplete={ac} value={f[nome]} onChange={(e) => setF({ ...f, [nome]: e.target.value })} required />
    </Campo>
  )
  return (
    <TelaPublica titulo="Trocar senha" subtitulo={usuario.primeiro_acesso ? 'Primeiro acesso: defina uma senha só sua antes de continuar.' : 'A nova senha vale a partir do próximo login.'}>
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        {erro && <Alerta tom="erro">{erro}</Alerta>}
        {campo('senha_atual', usuario.primeiro_acesso ? 'Senha temporária (do e-mail)' : 'Senha atual', 'current-password')}
        {campo('nova_senha', 'Nova senha', 'new-password')}
        {campo('confirmar_nova_senha', 'Confirme a nova senha', 'new-password')}
        <p className="text-[12px] text-faint">Mínimo de 8 caracteres, com letras e números.</p>
        <Botao type="submit" variante="primario" carregando={enviando} className="h-11">Salvar nova senha</Botao>
        {!usuario.primeiro_acesso && <Link to="/" className="text-center text-[13px] text-brand-700 hover:underline">Voltar ao início</Link>}
      </form>
    </TelaPublica>
  )
}

export function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  return (
    <TelaPublica titulo="Recuperar senha" subtitulo="Enviamos um link de uso único para o e-mail cadastrado.">
      <form className="flex flex-col gap-4" noValidate onSubmit={async (e) => {
        e.preventDefault(); setErro(''); setEnviando(true)
        try { const r = await post('recuperar-senha', { email: email.trim() }); setMsg(r.message ?? 'Se o e-mail estiver cadastrado, você receberá o link.') }
        catch (err) { setErro(err instanceof ApiError ? err.message : 'Não foi possível enviar.') }
        finally { setEnviando(false) }
      }}>
        {msg && <Alerta tom="ok">{msg}</Alerta>}
        {erro && <Alerta tom="erro">{erro}</Alerta>}
        <Campo rotulo="E-mail" nome="email"><Entrada name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></Campo>
        <Botao type="submit" variante="primario" carregando={enviando} className="h-11">Enviar link</Botao>
        <Link to="/login" className="text-center text-[13px] text-brand-700 hover:underline">Voltar ao login</Link>
      </form>
    </TelaPublica>
  )
}

export function RedefinirSenha() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const avisar = useAviso()
  const [f, setF] = useState({ nova_senha: '', confirmar_nova_senha: '' })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const token = params.get('token') ?? ''
  return (
    <TelaPublica titulo="Nova senha" subtitulo="Defina a nova senha. O link vale uma vez só.">
      <form className="flex flex-col gap-4" noValidate onSubmit={async (e) => {
        e.preventDefault(); setErro(''); setEnviando(true)
        try { const r = await post('redefinir-senha', { token, ...f }); avisar(r.message ?? 'Senha redefinida.'); navigate('/login') }
        catch (err) { setErro(err instanceof ApiError ? err.message : 'Não foi possível redefinir.') }
        finally { setEnviando(false) }
      }}>
        {!token && <Alerta tom="erro">Link sem token. Peça um novo em “Esqueci minha senha”.</Alerta>}
        {erro && <Alerta tom="erro">{erro}</Alerta>}
        <Campo rotulo="Nova senha" nome="nova_senha"><Entrada name="nova_senha" type="password" autoComplete="new-password" value={f.nova_senha} onChange={(e) => setF({ ...f, nova_senha: e.target.value })} /></Campo>
        <Campo rotulo="Confirme a nova senha" nome="confirmar_nova_senha"><Entrada name="confirmar_nova_senha" type="password" autoComplete="new-password" value={f.confirmar_nova_senha} onChange={(e) => setF({ ...f, confirmar_nova_senha: e.target.value })} /></Campo>
        <Botao type="submit" variante="primario" carregando={enviando} disabled={!token} className="h-11">Redefinir senha</Botao>
      </form>
    </TelaPublica>
  )
}
