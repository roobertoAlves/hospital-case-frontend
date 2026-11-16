import {
  CalendarDays, CalendarPlus, FileCheck, Syringe, ClipboardList, FileText, FlaskConical, HeartPulse, House, IdCard, KeyRound, ListChecks,
  LifeBuoy, Search, ShieldCheck, Stethoscope, UserCircle, UserPlus, Users, UsersRound, type LucideIcon,
} from 'lucide-react'

/**
 * Sidebar by PERMISSION. Hiding an item protects nothing: the backend (routes.json) decides access
 * and answers 403.
 */
export interface ItemMenu {
  section: string; label: string; to: string; permission: string | null; icon: LucideIcon
  /** When set, only members of one of these groups (or admins) see the item. */
  groups?: string[]
}

/** Groups that work in the hospital screens (the others only use the framework examples). */
export const HOSPITAL_GROUPS = ['admin', 'recepcionista', 'enfermeiro', 'medico']

export const MENU: ItemMenu[] = [
  { section: '', label: 'Início', to: '/painel', permission: null, icon: House, groups: HOSPITAL_GROUPS },
  { section: 'Cadastro e agenda', label: 'Pacientes', to: '/pacientes', permission: 'pacientes.view', icon: Users },
  { section: 'Cadastro e agenda', label: 'Agenda de consultas', to: '/agenda', permission: 'agenda.view', icon: CalendarDays },
  { section: 'Cadastro e agenda', label: 'Agenda de exames', to: '/exames', permission: 'exames.agenda.view', icon: FlaskConical },
  { section: 'Cadastro e agenda', label: 'Pedidos médicos', to: '/pedidos', permission: 'pedidos.conferir', icon: FileCheck },
  { section: 'Cadastro e agenda', label: 'Sala de vacinação', to: '/vacinas', permission: 'vacinas.agenda.view', icon: Syringe },
  { section: 'Assistência', label: 'Minha agenda', to: '/agenda', permission: 'agenda.view.propria', icon: CalendarDays },
  { section: 'Assistência', label: 'Fila de triagem', to: '/triagem', permission: 'triagem.fila', icon: HeartPulse },
  { section: 'Assistência', label: 'Fila de atendimento', to: '/atendimento', permission: 'atendimento.fila', icon: Stethoscope },
  { section: 'Administração', label: 'Usuários e permissões', to: '/admin', permission: 'usuarios.view', icon: ShieldCheck },
  { section: 'Administração', label: 'Profissionais', to: '/profissionais', permission: 'profissionais.manage', icon: IdCard },
  { section: 'Administração', label: 'Especialidades', to: '/especialidades', permission: 'especialidades.manage', icon: ListChecks },
  { section: 'Administração', label: 'Auditoria', to: '/auditoria', permission: 'auditoria.view', icon: FileText },
  { section: 'Conta', label: 'Equipe', to: '/equipe', permission: null, icon: UsersRound, groups: ['gerente'] },
  { section: 'Conta', label: 'Chamados de suporte', to: '/chamados', permission: null, icon: LifeBuoy },
  { section: 'Conta', label: 'Perfil e arquivos', to: '/perfil', permission: null, icon: UserCircle },
]

export const SHORTCUTS: ItemMenu[] = [
  { section: '', label: 'Cadastrar paciente', to: '/pacientes/novo', permission: 'pacientes.create', icon: UserPlus },
  { section: '', label: 'Buscar paciente', to: '/pacientes', permission: 'pacientes.view', icon: Search },
  { section: '', label: 'Agendar consulta', to: '/agenda/nova', permission: 'consultas.agendar', icon: CalendarPlus },
  { section: '', label: 'Agendar exame', to: '/exames/novo', permission: 'exames.agendar', icon: FlaskConical },
  { section: '', label: 'Agenda do dia', to: '/agenda', permission: 'agenda.view', icon: CalendarDays },
  { section: '', label: 'Minha agenda', to: '/agenda', permission: 'agenda.view.propria', icon: CalendarDays },
  { section: '', label: 'Exames do dia', to: '/exames', permission: 'exames.agenda.view', icon: ClipboardList },
  { section: '', label: 'Fila de triagem', to: '/triagem', permission: 'triagem.fila', icon: HeartPulse },
  { section: '', label: 'Fila de atendimento', to: '/atendimento', permission: 'atendimento.fila', icon: Stethoscope },
  { section: '', label: 'Usuários e permissões', to: '/admin', permission: 'usuarios.view', icon: ShieldCheck },
  { section: '', label: 'Profissionais', to: '/profissionais', permission: 'profissionais.manage', icon: IdCard },
  { section: '', label: 'Auditoria', to: '/auditoria', permission: 'auditoria.view', icon: FileText },
  { section: '', label: 'Trocar senha', to: '/trocar-senha', permission: null, icon: KeyRound },
]

export function visibleItems(items: ItemMenu[], permissions: string[], groups: string[] = []) {
  return items.filter((i) => (i.permission === null || permissions.includes(i.permission))
    && (!i.groups || groups.includes('admin') || i.groups.some((g) => groups.includes(g))))
}

/** Where a signed-in staff user lands: the hospital dashboard, or the first example screen of their group. */
export function homeFor(groups: string[]): string {
  if (HOSPITAL_GROUPS.some((g) => groups.includes(g))) return '/painel'
  if (groups.includes('gerente')) return '/equipe'
  if (groups.includes('suporte')) return '/chamados'
  return '/perfil'
}
