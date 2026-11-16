import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, FlaskConical, House, KeyRound, LogOut, Pill, Syringe } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { initials } from '../lib/format'
import { useSession } from '../lib/session'
import { Logo } from './Logo'
import { cx } from './ui'

const TABS = [
  { to: '/minha-saude', rotulo: 'Início', icone: House },
  { to: '/minha-saude/consultas', rotulo: 'Consultas', icone: CalendarDays },
  { to: '/minha-saude/exames', rotulo: 'Exames', icone: FlaskConical },
  { to: '/minha-saude/vacinas', rotulo: 'Vacinas', icone: Syringe },
  { to: '/minha-saude/receitas', rotulo: 'Receitas', icone: Pill },
]

/** Patient area: navigation at the top (bottom bar on phones), without the staff menu. */
export function PatientLayout() {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  const local = useLocation()
  const tab = ({ isActive }: { isActive: boolean }) => cx('flex items-center gap-2 rounded-full px-4 py-2 font-medium transition-colors', isActive ? 'bg-brand-50 text-brand-900' : 'text-muted hover:text-ink')
  return (
    <div className="min-h-screen bg-frame pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-4 px-4 sm:px-6">
          <NavLink to="/minha-saude" aria-label="Minha saúde"><Logo subtitle={false} /></NavLink>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Minha saúde">
            {TABS.map((a) => <NavLink key={a.to} to={a.to} end={a.to === '/minha-saude'} className={tab}><a.icone className="size-4" />{a.rotulo}</NavLink>)}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 hidden size-9 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-900 sm:flex" title={user?.nome}>{initials(user?.nome)}</span>
            <button className="rounded-lg p-2 text-muted hover:bg-raised hover:text-ink" title="Trocar senha" aria-label="Trocar senha" onClick={() => navigate('/trocar-senha')}><KeyRound className="size-5" /></button>
            <button className="rounded-lg p-2 text-muted hover:bg-raised hover:text-negative" title="Sair" aria-label="Sair" onClick={async () => { await logout(); navigate('/') }}><LogOut className="size-5" /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1120px] px-4 py-7 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div key={local.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface md:hidden" aria-label="Minha saúde">
        {TABS.map((a) => (
          <NavLink key={a.to} to={a.to} end={a.to === '/minha-saude'} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[11px]', isActive ? 'text-brand-700' : 'text-muted')}>
            <a.icone className="size-5" />{a.rotulo}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
