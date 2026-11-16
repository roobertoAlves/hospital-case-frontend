import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, KeyRound, LogOut, Menu as MenuIcon, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { iniciais } from '../lib/formato'
import { MENU, visiveis } from '../lib/menu'
import { useSessao } from '../lib/sessao'
import { Logo } from './Logo'
import { cx } from './ui'

function MenuLateral({ aoNavegar }: { aoNavegar?: () => void }) {
  const { usuario, sair } = useSessao()
  const navigate = useNavigate()
  const itens = visiveis(MENU, usuario?.permissoes ?? [])
  const secoes: [string, typeof itens][] = []
  for (const i of itens) {
    const s = secoes.find(([n]) => n === i.secao)
    if (s) s[1].push(i)
    else secoes.push([i.secao, [i]])
  }
  const classe = ({ isActive }: { isActive: boolean }) => cx(
    'flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] transition-colors',
    isActive ? 'bg-active font-medium text-ink' : 'text-muted hover:bg-white/60 hover:text-ink',
  )
  return (
    <div className="flex h-full flex-col px-3 py-4">
      <NavLink to="/" className="mb-5 px-2" onClick={aoNavegar}><Logo /></NavLink>
      <p className="mb-3 px-3 text-[13px] text-muted">Olá, <strong className="text-ink">{usuario?.nome.split(' ')[0]}</strong></p>
      <nav className="flex grow flex-col gap-0.5 overflow-y-auto" aria-label="Menu principal">
        {secoes.map(([secao, lista]) => (
          <div key={secao || 'inicio'} className="mb-2">
            {secao && <p className="mt-2 mb-1 px-3 text-[11px] font-medium tracking-wide text-faint uppercase">{secao}</p>}
            {lista.map((i) => (
              <NavLink key={i.rotulo} to={i.to} end={i.to === '/'} className={classe} onClick={aoNavegar}>
                <i.icone className="size-[18px]" /> {i.rotulo}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="mt-2 flex flex-col gap-0.5 border-t border-line pt-3">
        <NavLink to="/trocar-senha" className={classe} onClick={aoNavegar}><KeyRound className="size-[18px]" /> Trocar senha</NavLink>
        <button className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-left text-muted hover:bg-white/60 hover:text-ink"
          onClick={async () => { await sair(); navigate('/login') }}>
          <LogOut className="size-[18px]" /> Sair
        </button>
      </div>
    </div>
  )
}

function MenuUsuario() {
  const { usuario, sair } = useSessao()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fora = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAberto(false)
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button className="flex items-center gap-2.5 rounded-full py-1 pr-2 pl-1 hover:bg-white/70" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} aria-label="Menu do usuário">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-900">{iniciais(usuario?.nome)}</span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[180px] truncate text-[13px] font-medium">{usuario?.nome}</span>
          <span className="block text-[11px] text-muted">{usuario?.perfil}</span>
        </span>
        <ChevronDown className="size-4 text-muted" />
      </button>
      <AnimatePresence>
        {aberto && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            className="absolute right-0 z-30 mt-2 w-52 rounded-[var(--radius-card)] border border-line bg-surface p-1.5 shadow-xl">
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-raised" onClick={() => { setAberto(false); navigate('/trocar-senha') }}>
              <KeyRound className="size-4" /> Trocar senha
            </button>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-negative hover:bg-red-50" onClick={async () => { await sair(); navigate('/login') }}>
              <LogOut className="size-4" /> Sair
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Layout() {
  const { pode } = useSessao()
  const local = useLocation()
  const navigate = useNavigate()
  const [gaveta, setGaveta] = useState(false)
  const [busca, setBusca] = useState('')
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => setGaveta(false), [local.pathname])

  const buscar = (e: FormEvent) => {
    e.preventDefault()
    navigate(`/pacientes?q=${encodeURIComponent(busca.trim())}`)
    setBusca('')
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="no-print sticky top-0 hidden h-screen lg:block"><MenuLateral /></aside>

      <AnimatePresence>
        {gaveta && (
          <motion.div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setGaveta(false)}>
            <motion.aside className="h-full w-[272px] bg-frame shadow-2xl" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }} onClick={(e) => e.stopPropagation()}>
              <button className="absolute top-4 right-4 rounded-lg p-1.5 hover:bg-white" aria-label="Fechar menu" onClick={() => setGaveta(false)}><X className="size-5" /></button>
              <MenuLateral aoNavegar={() => setGaveta(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-col lg:py-2 lg:pr-2">
        <header className="no-print flex h-14 items-center gap-3 px-4 lg:px-2">
          <button className="rounded-lg p-2 hover:bg-white/70 lg:hidden" aria-label="Abrir menu" onClick={() => setGaveta(true)}><MenuIcon className="size-5" /></button>
          {pode('pacientes.view') ? (
            <form onSubmit={buscar} role="search" className="relative w-full max-w-[520px]">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
              <label htmlFor="buscaGlobal" className="sr-only">Buscar paciente por nome ou CPF</label>
              <input id="buscaGlobal" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar paciente por nome ou CPF"
                className="h-10 w-full rounded-full border border-line bg-surface pr-4 pl-9 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </form>
          ) : <span className="grow" />}
          <span className="ml-auto hidden text-[13px] text-muted first-letter:uppercase xl:block">{hoje}</span>
          <MenuUsuario />
        </header>
        <main id="conteudo" className="min-h-[calc(100vh-72px)] grow bg-surface px-4 py-6 sm:px-7 sm:py-7 lg:rounded-[var(--radius-sheet)] lg:border lg:border-line">
          <AnimatePresence mode="wait">
            <motion.div key={local.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
