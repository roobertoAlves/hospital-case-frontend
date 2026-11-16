import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { LinhaDoDia } from '../components/LinhaDoDia'
import { Carregando, Cabecalho, Kpi, Painel as Bloco, Pilula, Prioridade, Surge, Vazio } from '../components/ui'
import { diaPorExtenso, hora, situacaoConsulta } from '../lib/formato'
import { ATALHOS, visiveis } from '../lib/menu'
import { useSessao } from '../lib/sessao'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>
interface PainelDados {
  painel: {
    hoje: string
    recepcao?: boolean; consultasDoDia?: number; chegaram?: number; aguardandoTriagem?: number; examesDoDia?: number; canceladas?: number; proximas?: Linha[]
    linhaMedicos?: Linha[]; linhaConsultas?: Linha[]
    enfermagem?: boolean; filaTriagem?: Linha[]; porPrioridade?: Linha[]
    medico?: boolean; profissional?: Linha; minhaAgenda?: Linha[]; filaMedico?: Linha[]; realizadas?: number
    admin?: boolean; pacientesAtivos?: number; profissionaisAtivos?: number; realizadasNoMes?: number; agendadasAFrente?: number; usuariosAtivos?: number; usuariosBloqueados?: number
  }
}

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function ListaConsultas({ itens, vazio, link }: { itens: Linha[]; vazio: string; link?: (c: Linha) => string }) {
  if (!itens.length) return <Vazio>{vazio}</Vazio>
  return (
    <ul className="divide-y divide-rule">
      {itens.map((c) => {
        const [rot, tom] = situacaoConsulta(c.status)
        const corpo = (
          <>
            <span className="num w-12 shrink-0 font-medium">{hora(c.hora ?? c.data_hora)}</span>
            <span className="min-w-0 grow">
              <span className="block truncate font-medium">{String(c.paciente)}</span>
              <span className="block truncate text-[12px] text-muted">{String(c.medico ?? c.especialidade ?? '')}</span>
            </span>
            {c.prioridade ? <Prioridade cor={c.cor_hex} nome={c.prioridade} /> : c.status ? <Pilula tom={tom}>{rot}</Pilula> : null}
          </>
        )
        return (
          <li key={String(c.id_consulta)}>
            {link ? <Link to={link(c)} className="flex items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-raised">{corpo}</Link>
              : <div className="flex items-center gap-3 px-1 py-2.5">{corpo}</div>}
          </li>
        )
      })}
    </ul>
  )
}

export default function Painel() {
  const { usuario } = useSessao()
  const { dados, carregando, erro } = useApi<PainelDados>('api/painel')
  if (carregando && !dados) return <Carregando />
  if (erro) return <Vazio>{erro.message}</Vazio>
  const p = dados!.painel
  const atalhos = visiveis(ATALHOS, usuario?.permissoes ?? [])

  return (
    <>
      <Cabecalho titulo={`${saudacao()}, ${usuario?.nome.split(' ')[0]}`} subtitulo={`${diaPorExtenso(p.hoje)} · ${usuario?.perfil}`} />

      {p.recepcao && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi rotulo="Consultas hoje" valor={p.consultasDoDia} destaque />
          <Kpi rotulo="Já chegaram" valor={p.chegaram} delay={0.05} />
          <Kpi rotulo="Aguardando triagem" valor={p.aguardandoTriagem} delay={0.1} />
          <Kpi rotulo="Exames hoje" valor={p.examesDoDia} delay={0.15} />
          <Kpi rotulo="Canceladas hoje" valor={p.canceladas} delay={0.2} />
        </div>
      )}
      {p.enfermagem && !p.recepcao && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi rotulo="Aguardando triagem" valor={p.aguardandoTriagem} destaque />
          {(p.porPrioridade ?? []).slice(0, 3).map((c, i) => <Kpi key={String(c.codigo)} rotulo={`Triados · ${c.nome}`} valor={String(c.total)} delay={0.05 * (i + 1)} />)}
        </div>
      )}
      {p.medico && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi rotulo="Consultas hoje" valor={p.minhaAgenda?.filter((c) => c.status !== 'cancelada').length} destaque nota={String(p.profissional?.registro ?? '')} />
          <Kpi rotulo="Aguardando você" valor={p.filaMedico?.length} delay={0.05} />
          <Kpi rotulo="Atendidos hoje" valor={p.realizadas} delay={0.1} />
        </div>
      )}
      {p.admin && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi rotulo="Pacientes ativos" valor={p.pacientesAtivos} destaque />
          <Kpi rotulo="Profissionais ativos" valor={p.profissionaisAtivos} delay={0.05} />
          <Kpi rotulo="Realizadas no mês" valor={p.realizadasNoMes} delay={0.1} />
          <Kpi rotulo="Agendadas à frente" valor={p.agendadasAFrente} delay={0.15} />
          <Kpi rotulo="Usuários ativos" valor={p.usuariosAtivos} delay={0.2} />
          <Kpi rotulo="Bloqueados por senha" valor={p.usuariosBloqueados} delay={0.25} />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        {p.recepcao && (
          <Bloco titulo="Próximas chegadas" meta="ainda não chegaram" className="xl:col-span-1">
            <ListaConsultas itens={p.proximas ?? []} vazio="Ninguém mais previsto para hoje." />
          </Bloco>
        )}
        {p.enfermagem && (
          <Bloco titulo="Fila de triagem" meta={<Link to="/triagem" className="text-brand-700 hover:underline">abrir fila</Link>}>
            <ListaConsultas itens={p.filaTriagem ?? []} vazio="Ninguém aguardando triagem." link={() => '/triagem'} />
          </Bloco>
        )}
        {p.enfermagem && (
          <Bloco titulo="Triados hoje por prioridade">
            <ul className="space-y-2.5">
              {(p.porPrioridade ?? []).map((c) => {
                const max = Math.max(1, ...(p.porPrioridade ?? []).map((x) => Number(x.total)))
                return (
                  <li key={String(c.codigo)} className="grid grid-cols-[140px_1fr_32px] items-center gap-3 text-[13px]">
                    <Prioridade cor={c.cor_hex} nome={c.nome} />
                    <span className="h-2 overflow-hidden rounded-full bg-raised">
                      <motion.span className="block h-full rounded-full" style={{ background: String(c.cor_hex) }} initial={{ width: 0 }} animate={{ width: `${(Number(c.total) / max) * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                    </span>
                    <span className="num text-right">{String(c.total)}</span>
                  </li>
                )
              })}
            </ul>
          </Bloco>
        )}
        {p.medico && (
          <Bloco titulo="Aguardando atendimento" meta="pela prioridade da triagem">
            <ListaConsultas itens={p.filaMedico ?? []} vazio="Ninguém aguardando você agora." link={(c) => `/atendimento/${c.id_consulta}`} />
          </Bloco>
        )}
        {p.medico && (
          <Bloco titulo="Minha agenda de hoje" className="xl:col-span-2">
            <ListaConsultas itens={p.minhaAgenda ?? []} vazio="Sem consultas hoje." />
          </Bloco>
        )}
        <Bloco titulo="Seus atalhos" className={p.medico ? '' : 'xl:col-span-2'}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {atalhos.map((a, i) => (
              <Surge key={a.rotulo} delay={0.04 * i}>
                <Link to={a.to} className="group flex h-full items-center gap-3 rounded-[var(--radius-card)] border border-line p-3 transition-colors hover:border-brand-200 hover:bg-brand-50">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-raised text-brand-700 group-hover:bg-white"><a.icone className="size-[18px]" /></span>
                  <span className="grow text-[13px] font-medium">{a.rotulo}</span>
                  <ArrowRight className="size-4 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </Surge>
            ))}
          </div>
        </Bloco>
      </div>

      {p.linhaMedicos && p.linhaMedicos.length > 0 && (
        <Bloco titulo="Linha do dia" meta={`${p.linhaMedicos.length} médicos atendendo hoje`} className="mt-5">
          <LinhaDoDia medicos={p.linhaMedicos} consultas={p.linhaConsultas ?? []} />
        </Bloco>
      )}
    </>
  )
}
