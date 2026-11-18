import { formatDate, type Tone } from './format'

type Row = Record<string, unknown>

const hour = (v: unknown) => String(v ?? '').slice(0, 5)

export function certificateLabel(a: Row): string {
  if (a.tipo === 'afastamento') {
    const d = Number(a.dias)
    return `Afastamento de ${d} ${d === 1 ? 'dia' : 'dias'} a partir de ${formatDate(a.data_inicio)}`
  }
  if (a.tipo === 'acompanhante') return `Acompanhante (${String(a.acompanhante_nome ?? '')}) em ${formatDate(a.data_inicio)}, das ${hour(a.hora_inicio)} às ${hour(a.hora_fim)}`
  return `Comparecimento em ${formatDate(a.data_inicio)}, das ${hour(a.hora_inicio)} às ${hour(a.hora_fim)}`
}

export const CERTIFICATE_TYPES: [string, string, string][] = [
  ['afastamento', 'Afastamento', 'Dias de repouso ou afastamento do trabalho ou escola'],
  ['comparecimento', 'Comparecimento', 'Declara que o paciente esteve na consulta em um horário'],
  ['acompanhante', 'Acompanhante', 'Declara que alguém acompanhou o paciente'],
]

export const REFERRAL_PRIORITY: Record<string, [string, Tone]> = {
  eletivo: ['Eletivo', 'neutral'], prioritario: ['Prioritário', 'warning'], urgente: ['Urgente', 'negative'],
}

export const REFERRAL_STATUS: Record<string, [string, Tone]> = {
  emitido: ['Aguardando agendamento', 'accent'], agendado: ['Agendado', 'positive'], cancelado: ['Cancelado', 'negative'],
}

export function examRequestStatus(e: Row): [string, Tone] {
  if (e.status === 'cancelado') return ['Cancelado', 'negative']
  if (e.status_agendamento === 'realizado') return ['Realizado', 'positive']
  if (e.status_agendamento === 'ausente') return ['Paciente faltou', 'warning']
  if (e.agendado_para) return [`Agendado para ${formatDate(e.agendado_para)}`, 'positive']
  return ['Aguardando agendamento', 'accent']
}
