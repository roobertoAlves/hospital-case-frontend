import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, KeyRound, LogOut, Menu as MenuIcon, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { initials } from '../lib/format'
import { MENU, visibleItems } from '../lib/menu'
import { useSession } from '../lib/session'
import { Logo } from './Logo'
import { cx } from './ui'

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  const items = visibleItems(MENU, user?.permissions ?? [], user?.groups ?? [])
  const sections: [string, typeof items][] = []
  for (const i of items) {
    const s = sections.find(([n]) => n === i.section)
    if (s) s[1].push(i)
    else sections.push([i.section, [i]])
  }
  const wrapperClass = ({ isActive }: { isActive: boolean }) => cx(
    'flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] transition-colors',
    isActive ? 'bg-active font-medium text-ink' : 'text-muted hover:bg-white/60 hover:text-ink',
  )
  return (
    <div className="flex h-full flex-col px-3 py-4">
      <NavLink to="/painel" className="mb-5 px-2" onClick={onNavigate}><Logo /></NavLink>
      <p className="mb-3 px-3 text-[13px] text-muted">Olá, <strong className="text-ink">{user?.nome.split(' ')[0]}</strong></p>
      <nav className="flex grow flex-col gap-0.5 overflow-y-auto" aria-label="Menu principal">
        {sections.map(([section, list]) => (
          <div key={section || 'inicio'} className="mb-2">
            {section && <p className="mt-2 mb-1 px-3 text-[11px] font-medium tracking-wide text-faint uppercase">{section}</p>}
            {list.map((i) => (
              <NavLink key={i.label} to={i.to} end={i.to === '/painel'} className={wrapperClass} onClick={onNavigate}>
                <i.icon className="size-[18px]" /> {i.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="mt-2 flex flex-col gap-0.5 border-t border-line pt-3">
        <NavLink to="/trocar-senha" className={wrapperClass} onClick={onNavigate}><KeyRound className="size-[18px]" /> Trocar senha</NavLink>
        <button className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-left text-muted hover:bg-white/60 hover:text-ink"
          onClick={async () => { await logout(); navigate('/login') }}>
          <LogOut className="size-[18px]" /> Sair
        </button>
      </div>
    </div>
  )
}

function UserMenu() {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const outside = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button className="flex items-center gap-2.5 rounded-full py-1 pr-2 pl-1 hover:bg-white/70" onClick={() => setOpen((a) => !a)} aria-expanded={open} aria-label="Menu do usuário">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-900">{initials(user?.nome)}</span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[180px] truncate text-[13px] font-medium">{user?.nome}</span>
          <span className="block text-[11px] text-muted">{user?.role_label}</span>
        </span>
        <ChevronDown className="size-4 text-muted" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            className="absolute right-0 z-30 mt-2 w-52 rounded-[var(--radius-card)] border border-line bg-surface p-1.5 shadow-xl">
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-raised" onClick={() => { setOpen(false); navigate('/trocar-senha') }}>
              <KeyRound className="size-4" /> Trocar senha
            </button>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-negative hover:bg-red-50" onClick={async () => { await logout(); navigate('/login') }}>
              <LogOut className="size-4" /> Sair
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Layout() {
  const { can } = useSession()
  const local = useLocation()
  const navigate = useNavigate()
  const [drawer, setDrawer] = useState(false)
  const [query, setQuery] = useState('')
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => setDrawer(false), [local.pathname])

  const search = (e: FormEvent) => {
    e.preventDefault()
    navigate(`/pacientes?q=${encodeURIComponent(query.trim())}`)
    setQuery('')
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="no-print sticky top-0 hidden h-screen lg:block"><Sidebar /></aside>

      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)}>
            <motion.aside className="h-full w-[272px] bg-frame shadow-2xl" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }} onClick={(e) => e.stopPropagation()}>
              <button className="absolute top-4 right-4 rounded-lg p-1.5 hover:bg-white" aria-label="Fechar menu" onClick={() => setDrawer(false)}><X className="size-5" /></button>
              <Sidebar onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-col lg:py-2 lg:pr-2">
        <header className="no-print flex h-14 items-center gap-3 px-4 lg:px-2">
          <button className="rounded-lg p-2 hover:bg-white/70 lg:hidden" aria-label="Abrir menu" onClick={() => setDrawer(true)}><MenuIcon className="size-5" /></button>
          {can('pacientes.view') ? (
            <form onSubmit={search} role="search" className="relative w-full max-w-[520px]">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
              <label htmlFor="buscaGlobal" className="sr-only">Buscar paciente por nome ou CPF</label>
              <input id="buscaGlobal" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar paciente por nome ou CPF"
                className="h-10 w-full rounded-full border border-line bg-surface pr-4 pl-9 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </form>
          ) : <span className="grow" />}
          <span className="ml-auto hidden text-[13px] text-muted first-letter:uppercase xl:block">{today}</span>
          <UserMenu />
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
