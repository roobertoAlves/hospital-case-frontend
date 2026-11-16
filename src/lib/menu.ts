import {
  CalendarDays, CalendarPlus, FileCheck, Syringe, ClipboardList, FileText, FlaskConical, HeartPulse, House, IdCard, KeyRound, ListChecks,
  Search, ShieldCheck, Stethoscope, UserPlus, Users, type LucideIcon,
} from 'lucide-react'

/**
 * Menu lateral por PERMISSAO (o mesmo do utils.Menu do backend). Esconder um item nao protege
 * nada: quem decide o acesso e o backend (routes.json), que responde 403.
 */
export interface ItemMenu { section: string; label: string; to: string; permission: string | null; icon: LucideIcon }

export const MENU: ItemMenu[] = [
  { section: '', label: 'Início', to: '/painel', permission: null, icon: House },
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

export function visibleItems(items: ItemMenu[], permissions: string[]) {
  return items.filter((i) => i.permission === null || permissions.includes(i.permission))
}
