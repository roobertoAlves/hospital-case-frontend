import { Menu as MenuIcon, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { Logo } from './Logo'
import { cx } from './ui'

const LINKS = [
  { to: '/servicos/consultas', rotulo: 'Consultas' },
  { to: '/servicos/exames', rotulo: 'Exames' },
  { to: '/servicos/vacinas', rotulo: 'Vacinas' },
]

/** Site publico (sem login): barra superior no estilo nav.dasa, conteudo e rodape. */
export function PublicLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const link = ({ isActive }: { isActive: boolean }) => cx('rounded-full px-4 py-2 text-[15px] font-medium transition-colors', isActive ? 'bg-brand-50 text-brand-900' : 'text-muted hover:text-ink')
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
          <Link to="/" aria-label="Asklep, início"><Logo subtitle={false} /></Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Serviços">
            {LINKS.map((l) => <NavLink key={l.to} to={l.to} className={link}>{l.rotulo}</NavLink>)}
          </nav>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <Link to="/login" className="rounded-full px-4 py-2 font-medium text-ink hover:bg-raised">Entrar</Link>
            <Link to="/cadastro" className="rounded-full bg-brand-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-brand-700">Criar conta</Link>
          </div>
          <button className="ml-auto rounded-lg p-2 md:hidden" aria-label="Abrir menu" onClick={() => setOpen((a) => !a)}>{open ? <X className="size-5" /> : <MenuIcon className="size-5" />}</button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-line md:hidden">
              <div className="flex flex-col gap-1 p-4">
                {LINKS.map((l) => <NavLink key={l.to} to={l.to} className={link} onClick={() => setOpen(false)}>{l.rotulo}</NavLink>)}
                <Link to="/login" className="rounded-full px-4 py-2 font-medium">Entrar</Link>
                <Link to="/cadastro" className="rounded-full bg-brand-600 px-4 py-2.5 text-center font-medium text-white">Criar conta</Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
      <main>{children}</main>
      <footer className="mt-20 border-t border-line bg-frame">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-[420px] text-[13px] leading-relaxed text-muted">
              Clínica unidade central (fictícia). Projeto acadêmico: todos os nomes, médicos e pacientes são dados de demonstração.
            </p>
          </div>
          <div>
            <p className="mb-3 font-semibold">Serviços</p>
            <ul className="space-y-2 text-[14px] text-muted">{LINKS.map((l) => <li key={l.to}><Link to={l.to} className="hover:text-ink">{l.rotulo}</Link></li>)}</ul>
          </div>
          <div>
            <p className="mb-3 font-semibold">Sua conta</p>
            <ul className="space-y-2 text-[14px] text-muted">
              <li><Link to="/cadastro" className="hover:text-ink">Criar conta</Link></li>
              <li><Link to="/login" className="hover:text-ink">Entrar</Link></li>
              <li><Link to="/recuperar-senha" className="hover:text-ink">Esqueci minha senha</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}
