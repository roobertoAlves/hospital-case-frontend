import { motion } from 'motion/react'
import { CalendarDays, CheckCircle2, FlaskConical, MailCheck, Pill, Syringe } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAviso } from '../../components/avisos'
import { Alerta, Botao, Carregando, Entrada, Painel, Pilula, Surge, Vazio } from '../../components/ui'
import { ApiError, post } from '../../lib/api'
import { data, diaPorExtenso, hojeIso, hora } from '../../lib/formato'
import { useSessao } from '../../lib/sessao'
import { useApi } from '../../lib/useApi'

type Linha = Record<string, unknown>
interface Resumo {
  vinculado: boolean; email_ficha?: string | null; paciente?: Linha
  proximasConsultas?: Linha[]; proximosExames?: Linha[]; proximasVacinas?: Linha[]; receitasRecentes?: number; pedidosPendentes?: number
}

function Vincular({ email, aoVincular }: { email?: string | null; aoVincular: () => void }) {
  const avisar = useAviso()
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  if (!email) {
    return <Alerta>Sua conta ainda não está ligada a uma ficha da clínica. Leve um documento com foto à recepção e peça para ligar a conta <strong>com o seu e-mail de login</strong>.</Alerta>
  }
  const enviar = async (e: FormEvent) => {
    e.preventDefault(); setErro(''); setEnviando(true)
    try { const r = await post('api/portal/vincular', { codigo }); avisar(r.message ?? 'Conta ligada.'); aoVincular() }
    catch (err) { setErro(err instanceof ApiError ? err.message : 'Não foi possível confirmar.') }
    finally { setEnviando(false) }
  }
  return (
    <Painel className="mx-auto max-w-[520px]">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-700"><MailCheck className="size-7" /></span>
        <h1 className="text-[22px] font-semibold">Confirme que a ficha é sua</h1>
        <p className="text-muted">Enviamos um código de 6 dígitos para <strong className="text-ink">{email}</strong>, o e-mail da sua ficha na clínica.</p>
      </div>
      <form onSubmit={enviar} className="mt-6 flex flex-col gap-3">
        <label htmlFor="codigo" className="sr-only">Código</label>
        <Entrada id="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          className="num h-14 text-center text-[26px] tracking-[0.5em]" placeholder="000000" invalido={!!erro} />
        {erro && <p className="text-center text-[13px] text-negative">{erro}</p>}
        <Botao type="submit" variante="primario" className="h-11" carregando={enviando} disabled={codigo.length !== 6}>Confirmar</Botao>
        <Botao type="button" variante="texto" onClick={async () => {
          try { const r = await post('api/portal/vincular/reenviar'); avisar(r.message ?? 'Código reenviado.') }
          catch (err) { avisar(err instanceof ApiError ? err.message : 'Não foi possível reenviar.', false) }
        }}>Enviar outro código</Botao>
      </form>
    </Painel>
  )
}

export default function MinhaSaude() {
  const { usuario } = useSessao()
  const { dados, carregando, erro, recarregar } = useApi<Resumo>('api/portal/resumo')
  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message}</Vazio>
  if (!dados.vinculado) return <Vincular email={dados.email_ficha} aoVincular={recarregar} />

  const atalhos = [
    { to: '/minha-saude/consultas', rotulo: 'Marcar consulta', icone: CalendarDays },
    { to: '/minha-saude/exames', rotulo: 'Marcar exame', icone: FlaskConical },
    { to: '/minha-saude/vacinas', rotulo: 'Vacinas', icone: Syringe },
    { to: '/minha-saude/receitas', rotulo: 'Receitas', icone: Pill },
  ]
  const consultas = dados.proximasConsultas ?? [], exames = dados.proximosExames ?? [], vacinas = dados.proximasVacinas ?? []

  return (
    <>
      <Surge className="mb-7">
        <h1 className="text-[28px] font-semibold tracking-tight">Olá, {usuario?.nome.split(' ')[0]}</h1>
        <p className="mt-1 text-muted">{diaPorExtenso(hojeIso())}</p>
      </Surge>
      <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4">
        {atalhos.map((a, i) => (
          <motion.div key={a.to} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 * i }}>
            <Link to={a.to} className="group flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 hover:border-brand-200 hover:bg-brand-50">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white"><a.icone className="size-5" /></span>
              <span className="font-medium">{a.rotulo}</span>
            </Link>
          </motion.div>
        ))}
      </div>
      {(dados.pedidosPendentes ?? 0) > 0 && <div className="mb-5"><Alerta>{dados.pedidosPendentes} pedido(s) médico(s) aguardando conferência da recepção.</Alerta></div>}
      <div className="grid gap-5 lg:grid-cols-3">
        <Painel titulo="Próximas consultas" meta={<Link to="/minha-saude/consultas" className="text-brand-700 hover:underline">ver todas</Link>}>
          {consultas.length === 0 ? <p className="text-muted">Nenhuma consulta marcada.</p> : (
            <ul className="divide-y divide-rule">
              {consultas.map((c) => (
                <li key={String(c.id_consulta)} className="py-3 first:pt-0">
                  <p className="font-medium">{String(c.especialidade)}</p>
                  <p className="text-[13px] text-muted">{data(c.data_hora)} às {hora(c.data_hora)} · {String(c.medico)}</p>
                  {c.confirmada_em ? <span className="mt-1 inline-flex items-center gap-1 text-[12px] text-positive"><CheckCircle2 className="size-3.5" /> presença confirmada</span>
                    : c.status === 'agendada' ? <Link to="/minha-saude/consultas" className="mt-1 inline-block text-[12px] font-medium text-brand-700">Confirmar presença</Link> : null}
                </li>
              ))}
            </ul>
          )}
        </Painel>
        <Painel titulo="Próximos exames" meta={<Link to="/minha-saude/exames" className="text-brand-700 hover:underline">ver todos</Link>} delay={0.08}>
          {exames.length === 0 ? <p className="text-muted">Nenhum exame marcado.</p> : (
            <ul className="divide-y divide-rule">
              {exames.map((x) => (
                <li key={String(x.id_exame_agendado)} className="py-3 first:pt-0">
                  <p className="font-medium">{String(x.exame)}</p>
                  <p className="text-[13px] text-muted">{data(x.data_hora)} às {hora(x.data_hora)} · {String(x.local)}</p>
                  {x.preparo ? <p className="mt-1 text-[12px]"><strong>Preparo:</strong> {String(x.preparo)}</p> : null}
                  {x.pedido_status === 'pendente' && <Pilula tom="warning">pedido em conferência</Pilula>}
                </li>
              ))}
            </ul>
          )}
        </Painel>
        <Painel titulo="Vacinas" meta={<Link to="/minha-saude/vacinas" className="text-brand-700 hover:underline">cartão</Link>} delay={0.12}>
          {vacinas.length === 0 ? <p className="text-muted">Nenhuma vacina agendada.</p> : (
            <ul className="divide-y divide-rule">
              {vacinas.map((v) => (
                <li key={String(v.id_agendamento)} className="py-3 first:pt-0">
                  <p className="font-medium">{String(v.vacina)} · dose {String(v.dose)}</p>
                  <p className="text-[13px] text-muted">{data(v.data_hora)} às {hora(v.data_hora)}</p>
                </li>
              ))}
            </ul>
          )}
          {(dados.receitasRecentes ?? 0) > 0 && <Link to="/minha-saude/receitas" className="mt-4 block rounded-[var(--radius-control)] bg-brand-50 px-3 py-2.5 text-[13px] text-brand-900">{dados.receitasRecentes} receita(s) nos últimos 90 dias</Link>}
        </Painel>
      </div>
    </>
  )
}
