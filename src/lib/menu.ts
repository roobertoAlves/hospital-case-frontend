import {
  CalendarDays, CalendarPlus, FileCheck, Syringe, ClipboardList, FileText, FlaskConical, HeartPulse, House, IdCard, KeyRound, ListChecks,
  LifeBuoy, Search, ShieldCheck, Stethoscope, UserCircle, UserPlus, Users, UsersRound, type LucideIcon,
} from 'lucide-react'

export interface ItemMenu {
  section: string; label: string; to: string; permission: string | null; icon: LucideIcon
  groups?: string[]
  strict?: boolean
}

export const HOSPITAL_GROUPS = ['admin', 'recepcionista', 'enfermeiro', 'medico']

export const MENU: ItemMenu[] = [
  { section: '', label: 'Início', to: '/painel', permission: null, icon: House, groups: HOSPITAL_GROUPS, strict: true },
  { section: 'Cadastro e agenda', label: 'Pacientes', to: '/pacientes', permission: 'pacientes.view', icon: Users },
  { section: 'Cadastro e agenda', label: 'Agenda de consultas', to: '/agenda', permission: 'agenda.view', icon: CalendarDays },
  { section: 'Cadastro e agenda', label: 'Agenda de exames', to: '/exames', permission: 'exames.agenda.view', icon: FlaskConical },
  { section: 'Cadastro e agenda', label: 'Pedidos médicos', to: '/pedidos', permission: 'pedidos.conferir', icon: FileCheck },
  { section: 'Cadastro e agenda', label: 'Sala de vacinação', to: '/vacinas', permission: 'vacinas.agenda.view', icon: Syringe },
  { section: 'Assistência', label: 'Minha agenda', to: '/agenda', permission: 'agenda.view.propria', icon: CalendarDays },
  { section: 'Assistência', label: 'Fila de triagem', to: '/triagem', permission: 'triagem.fila', icon: HeartPulse, groups: ['enfermeiro'], strict: true },
  { section: 'Assistência', label: 'Fila de atendimento', to: '/atendimento', permission: 'atendimento.fila', icon: Stethoscope, groups: ['medico'], strict: true },
  { section: 'Administração', label: 'Usuários e permissões', to: '/admin', permission: 'usuarios.view', icon: ShieldCheck, groups: ['admin'] },
  { section: 'Administração', label: 'Profissionais', to: '/profissionais', permission: 'profissionais.manage', icon: IdCard },
  { section: 'Administração', label: 'Especialidades', to: '/especialidades', permission: 'especialidades.manage', icon: ListChecks },
  { section: 'Administração', label: 'Auditoria', to: '/auditoria', permission: 'auditoria.view', icon: FileText },
  { section: 'Conta', label: 'Equipe', to: '/equipe', permission: null, icon: UsersRound, groups: ['gerente'], strict: true },
  { section: 'Conta', label: 'Chamados de suporte', to: '/chamados', permission: null, icon: LifeBuoy },
  { section: 'Conta', label: 'Meu perfil', to: '/perfil', permission: null, icon: UserCircle },
]

export const SHORTCUTS: ItemMenu[] = [
  { section: '', label: 'Cadastrar paciente', to: '/pacientes/novo', permission: 'pacientes.create', icon: UserPlus },
  { section: '', label: 'Buscar paciente', to: '/pacientes', permission: 'pacientes.view', icon: Search },
  { section: '', label: 'Agendar consulta', to: '/agenda/nova', permission: 'consultas.agendar', icon: CalendarPlus },
  { section: '', label: 'Agendar exame', to: '/exames/novo', permission: 'exames.agendar', icon: FlaskConical },
  { section: '', label: 'Agenda do dia', to: '/agenda', permission: 'agenda.view', icon: CalendarDays },
  { section: '', label: 'Minha agenda', to: '/agenda', permission: 'agenda.view.propria', icon: CalendarDays },
  { section: '', label: 'Exames do dia', to: '/exames', permission: 'exames.agenda.view', icon: ClipboardList },
  { section: '', label: 'Fila de triagem', to: '/triagem', permission: 'triagem.fila', icon: HeartPulse, groups: ['enfermeiro'], strict: true },
  { section: '', label: 'Fila de atendimento', to: '/atendimento', permission: 'atendimento.fila', icon: Stethoscope, groups: ['medico'], strict: true },
  { section: '', label: 'Usuários e permissões', to: '/admin', permission: 'usuarios.view', icon: ShieldCheck, groups: ['admin'] },
  { section: '', label: 'Profissionais', to: '/profissionais', permission: 'profissionais.manage', icon: IdCard },
  { section: '', label: 'Auditoria', to: '/auditoria', permission: 'auditoria.view', icon: FileText },
  { section: '', label: 'Meu perfil', to: '/perfil', permission: null, icon: KeyRound },
]

export function visibleItems(items: ItemMenu[], permissions: string[], groups: string[] = []) {
  return items.filter((i) => (i.permission === null || permissions.includes(i.permission))
    && (!i.groups || (!i.strict && groups.includes('admin')) || i.groups.some((g) => groups.includes(g))))
}

export function homeFor(groups: string[]): string {
  if (HOSPITAL_GROUPS.some((g) => groups.includes(g))) return '/painel'
  if (groups.includes('gerente')) return '/equipe'
  if (groups.includes('suporte')) return '/chamados'
  return '/perfil'
}
