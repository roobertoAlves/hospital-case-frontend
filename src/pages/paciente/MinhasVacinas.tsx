import { ShieldCheck, Syringe } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { DialogoMotivo, useAviso } from '../../components/avisos'
import { GradeHorarios, type Horario } from '../../components/agendamento'
import { Botao, Cabecalho, Campo, Carregando, Entrada, Painel, Pilula, Seletor, Vazio } from '../../components/ui'
import { ApiError, get, post } from '../../lib/api'
import { data, hora } from '../../lib/formato'
import { useApi } from '../../lib/useApi'

type Linha = Record<string, unknown>
interface Dados { aplicadas: Linha[]; agendadas: Linha[]; catalogo: Linha[]; hoje: string }

export default function MinhasVacinas() {
  const avisar = useAviso()
  const { dados, carregando, erro, recarregar } = useApi<Dados>('api/portal/vacinas')
  const [vacina, setVacina] = useState('')
  const [dia, setDia] = useState('')
  const [horarios, setHorarios] = useState<Horario[] | null>(null)
  const [carregandoH, setCarregandoH] = useState(false)
  const [h, setH] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cancelar, setCancelar] = useState<Linha | null>(null)

  useEffect(() => { if (dados && !dia) setDia(dados.hoje) }, [dados, dia])
  useEffect(() => {
    setH('')
    if (!dia || !vacina) { setHorarios(null); return }
    setCarregandoH(true)
    get<Horario[]>('api/vacinas/horarios', { data: dia }).then((r) => setHorarios(r.data)).catch(() => setHorarios([])).finally(() => setCarregandoH(false))
  }, [dia, vacina])

  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message}</Vazio>

  // Cartao: doses aplicadas por vacina, no esquema de cada uma.
  const porVacina = dados.catalogo.map((v) => ({ v, doses: dados.aplicadas.filter((a) => a.id_vacina === v.id_vacina) })).filter((x) => x.doses.length > 0)
  const pendentes = dados.agendadas.filter((a) => a.status === 'agendada')

  return (
    <>
      <Cabecalho titulo="Vacinas" subtitulo="Seu cartão de vacinação e os agendamentos na sala de vacinação." />
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Painel titulo="Cartão de vacinação" meta={<span className="inline-flex items-center gap-1"><ShieldCheck className="size-3.5" /> registrado pela enfermagem</span>}>
          {porVacina.length === 0 ? <p className="text-muted">Nenhuma vacina registrada na clínica.</p> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {porVacina.map(({ v, doses }, i) => (
                <motion.div key={String(v.id_vacina)} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-[var(--radius-card)] border border-line p-4">
                  <p className="font-semibold">{String(v.nome)}</p>
                  <div className="mt-2 flex gap-1.5" aria-label={`${doses.length} de ${v.doses} doses`}>
                    {Array.from({ length: Number(v.doses) }, (_, k) => <span key={k} className={`h-2 grow rounded-full ${k < doses.length ? 'bg-brand-500' : 'bg-rule'}`} />)}
                  </div>
                  <ul className="mt-3 space-y-1.5 text-[13px]">
                    {doses.map((d) => (
                      <li key={String(d.id_aplicacao)} className="flex justify-between gap-2">
                        <span>Dose {String(d.dose)} · {data(d.aplicada_em)}</span>
                        <span className="text-faint">lote {String(d.lote)}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          )}
        </Painel>
        <div className="grid content-start gap-5">
          <Painel titulo="Agendar vacina" delay={0.06}>
            <div className="grid gap-3">
              <Campo rotulo="Vacina" nome="vacinaP">
                <Seletor name="vacinaP" value={vacina} onChange={(e) => setVacina(e.target.value)}>
                  <option value="">Escolha…</option>
                  {dados.catalogo.map((v) => <option key={String(v.id_vacina)} value={String(v.id_vacina)}>{String(v.nome)}</option>)}
                </Seletor>
              </Campo>
              <Campo rotulo="Data" nome="diaVacina"><Entrada name="diaVacina" type="date" min={dados.hoje} value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
              {vacina && <GradeHorarios horarios={horarios} carregando={carregandoH} escolhido={h} aoEscolher={setH} vazio="A sala de vacinação abre de segunda a sexta." />}
              <Botao variante="primario" icone={Syringe} disabled={!vacina || !h} carregando={enviando} onClick={async () => {
                setEnviando(true)
                try { const r = await post('api/portal/vacinas', { id_vacina: vacina, data: dia, hora: h }); avisar(r.message ?? 'Agendada.'); setVacina(''); recarregar() }
                catch (e) { avisar(e instanceof ApiError ? e.message : 'Não foi possível agendar.', false) }
                finally { setEnviando(false) }
              }}>Agendar</Botao>
              <p className="text-[12px] text-faint">A dose é calculada pelo seu cartão e respeita o intervalo mínimo entre doses.</p>
            </div>
          </Painel>
          <Painel titulo="Agendamentos" delay={0.1}>
            {dados.agendadas.length === 0 ? <p className="text-muted">Nenhum agendamento.</p> : (
              <ul className="divide-y divide-rule">
                {dados.agendadas.map((a) => (
                  <li key={String(a.id_agendamento)} className="flex items-center gap-2 py-2.5 first:pt-0">
                    <span className="grow"><span className="block font-medium">{String(a.vacina)} · dose {String(a.dose)}</span>
                      <span className="block text-[12px] text-muted">{data(a.data_hora)} às {hora(a.data_hora)}</span></span>
                    {a.status === 'agendada' ? <Botao pequeno variante="perigoTexto" onClick={() => setCancelar(a)}>Cancelar</Botao>
                      : <Pilula tom={a.status === 'ausente' ? 'neutral' : 'negative'}>{a.status === 'ausente' ? 'Faltou' : 'Cancelada'}</Pilula>}
                  </li>
                ))}
              </ul>
            )}
            {pendentes.length > 0 && <p className="mt-3 text-[12px] text-faint">Leve um documento com foto e, se tiver, a caderneta de vacinação.</p>}
          </Painel>
        </div>
      </div>
      <DialogoMotivo aberto={!!cancelar} titulo="Cancelar vacina" botao="Cancelar agendamento" aoFechar={() => setCancelar(null)}
        aoConfirmar={async (motivo) => {
          try { const r = await post(`api/portal/vacinas/${cancelar!.id_agendamento}/cancelar`, { motivo }); avisar(r.message ?? 'Cancelado.'); recarregar() }
          catch (e) { avisar(e instanceof ApiError ? e.message : 'Não foi possível cancelar.', false) }
          setCancelar(null)
        }} />
    </>
  )
}
