import {
  CalendarDays, CalendarPlus, ClipboardList, FileText, FlaskConical, HeartPulse, House, IdCard, KeyRound, ListChecks,
  Search, ShieldCheck, Stethoscope, UserPlus, Users, type LucideIcon,
} from 'lucide-react'

/**
 * Menu lateral por PERMISSAO (o mesmo do utils.Menu do backend). Esconder um item nao protege
 * nada: quem decide o acesso e o backend (routes.json), que responde 403.
 */
export interface ItemMenu { secao: string; rotulo: string; to: string; permissao: string | null; icone: LucideIcon }

export const MENU: ItemMenu[] = [
  { secao: '', rotulo: 'Início', to: '/', permissao: null, icone: House },
  { secao: 'Cadastro e agenda', rotulo: 'Pacientes', to: '/pacientes', permissao: 'pacientes.view', icone: Users },
  { secao: 'Cadastro e agenda', rotulo: 'Agenda de consultas', to: '/agenda', permissao: 'agenda.view', icone: CalendarDays },
  { secao: 'Cadastro e agenda', rotulo: 'Agenda de exames', to: '/exames', permissao: 'exames.agenda.view', icone: FlaskConical },
  { secao: 'Assistência', rotulo: 'Minha agenda', to: '/agenda', permissao: 'agenda.view.propria', icone: CalendarDays },
  { secao: 'Assistência', rotulo: 'Fila de triagem', to: '/triagem', permissao: 'triagem.fila', icone: HeartPulse },
  { secao: 'Assistência', rotulo: 'Fila de atendimento', to: '/atendimento', permissao: 'atendimento.fila', icone: Stethoscope },
  { secao: 'Administração', rotulo: 'Usuários e permissões', to: '/admin', permissao: 'usuarios.view', icone: ShieldCheck },
  { secao: 'Administração', rotulo: 'Profissionais', to: '/profissionais', permissao: 'profissionais.manage', icone: IdCard },
  { secao: 'Administração', rotulo: 'Especialidades', to: '/especialidades', permissao: 'especialidades.manage', icone: ListChecks },
  { secao: 'Administração', rotulo: 'Auditoria', to: '/auditoria', permissao: 'auditoria.view', icone: FileText },
]

export const ATALHOS: ItemMenu[] = [
  { secao: '', rotulo: 'Cadastrar paciente', to: '/pacientes/novo', permissao: 'pacientes.create', icone: UserPlus },
  { secao: '', rotulo: 'Buscar paciente', to: '/pacientes', permissao: 'pacientes.view', icone: Search },
  { secao: '', rotulo: 'Agendar consulta', to: '/agenda/nova', permissao: 'consultas.agendar', icone: CalendarPlus },
  { secao: '', rotulo: 'Agendar exame', to: '/exames/novo', permissao: 'exames.agendar', icone: FlaskConical },
  { secao: '', rotulo: 'Agenda do dia', to: '/agenda', permissao: 'agenda.view', icone: CalendarDays },
  { secao: '', rotulo: 'Minha agenda', to: '/agenda', permissao: 'agenda.view.propria', icone: CalendarDays },
  { secao: '', rotulo: 'Exames do dia', to: '/exames', permissao: 'exames.agenda.view', icone: ClipboardList },
  { secao: '', rotulo: 'Fila de triagem', to: '/triagem', permissao: 'triagem.fila', icone: HeartPulse },
  { secao: '', rotulo: 'Fila de atendimento', to: '/atendimento', permissao: 'atendimento.fila', icone: Stethoscope },
  { secao: '', rotulo: 'Usuários e permissões', to: '/admin', permissao: 'usuarios.view', icone: ShieldCheck },
  { secao: '', rotulo: 'Profissionais', to: '/profissionais', permissao: 'profissionais.manage', icone: IdCard },
  { secao: '', rotulo: 'Auditoria', to: '/auditoria', permissao: 'auditoria.view', icone: FileText },
  { secao: '', rotulo: 'Trocar senha', to: '/trocar-senha', permissao: null, icone: KeyRound },
]

export function visiveis(itens: ItemMenu[], permissoes: string[]) {
  return itens.filter((i) => i.permissao === null || permissoes.includes(i.permissao))
}
