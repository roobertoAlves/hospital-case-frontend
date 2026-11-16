import { CalendarPlus, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Dialogo, DialogoMotivo, useAviso } from '../../components/avisos'
import { GradeHorarios, type Horario } from '../../components/agendamento'
import { Botao, Cabecalho, Campo, Carregando, Entrada, Painel, Pilula, Seletor, Vazio } from '../../components/ui'
import { ApiError, get, post } from '../../lib/api'
import { data, hojeIso, hora, situacaoConsulta } from '../../lib/formato'
import { useApi } from '../../lib/useApi'

type Linha = Record<string, unknown>

/** Escolhe especialidade, medico, data e horario (marcar ou remarcar). */
function Agendador({ especialidades, hoje, fixa, aoConfirmar, botao }: {
  especialidades: Linha[]; hoje: string; fixa?: { esp: string; medico: string }; aoConfirmar: (v: { esp: string; medico: string; dia: string; hora: string }) => Promise<void>; botao: string
}) {
  const [esp, setEsp] = useState(fixa?.esp ?? '')
  const [medicos, setMedicos] = useState<Linha[] | null>(null)
  const [medico, setMedico] = useState(fixa?.medico ?? '')
  const [dia, setDia] = useState(hoje)
  const [horarios, setHorarios] = useState<Horario[] | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [h, setH] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!esp) { setMedicos(null); return }
    get<Linha[]>('api/agenda/medicos', { especialidade: esp }).then((r) => setMedicos(r.data)).catch(() => setMedicos([]))
  }, [esp])
  useEffect(() => {
    setH('')
    if (!medico || !dia) { setHorarios(null); return }
    setCarregando(true)
    get<Horario[]>('api/agenda/horarios', { medico, data: dia }).then((r) => setHorarios(r.data)).catch(() => setHorarios([])).finally(() => setCarregando(false))
  }, [medico, dia])

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo="Especialidade" nome="espP">
          <Seletor name="espP" value={esp} disabled={!!fixa} onChange={(e) => { setEsp(e.target.value); setMedico('') }}>
            <option value="">Escolha…</option>
            {especialidades.map((e) => <option key={String(e.id_especialidade)} value={String(e.id_especialidade)}>{String(e.nome)}</option>)}
          </Seletor>
        </Campo>
        <Campo rotulo="Médico" nome="medP">
          <Seletor name="medP" value={medico} disabled={!medicos} onChange={(e) => setMedico(e.target.value)}>
            <option value="">{medicos ? 'Escolha…' : 'Escolha a especialidade'}</option>
            {(medicos ?? []).map((m) => <option key={String(m.id_profissional)} value={String(m.id_profissional)}>{String(m.nome)}</option>)}
          </Seletor>
        </Campo>
        <Campo rotulo="Data" nome="diaP"><Entrada name="diaP" type="date" min={hoje} value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
      </div>
      <GradeHorarios horarios={horarios} carregando={carregando} escolhido={h} aoEscolher={setH} vazio="O médico não atende nesse dia. Tente outra data." />
      <div className="flex justify-end">
        <Botao variante="primario" disabled={!medico || !h} carregando={enviando} onClick={async () => { setEnviando(true); try { await aoConfirmar({ esp, medico, dia, hora: h }) } finally { setEnviando(false) } }}>{botao}</Botao>
      </div>
    </div>
  )
}

export default function MinhasConsultas() {
  const avisar = useAviso()
  const { dados, carregando, erro, recarregar } = useApi<{ consultas: Linha[]; especialidades: Linha[]; hoje: string }>('api/portal/consultas')
  const [marcar, setMarcar] = useState(false)
  const [remarcar, setRemarcar] = useState<Linha | null>(null)
  const [cancelar, setCancelar] = useState<Linha | null>(null)

  const chamar = async (url: string, corpo?: Record<string, unknown>) => {
    try { const r = await post(url, corpo); avisar(r.message ?? 'Feito.'); await recarregar(); return true }
    catch (e) { avisar(e instanceof ApiError ? e.message : 'Não foi possível concluir.', false); return false }
  }

  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message}</Vazio>
  const n = new Date()
  const agora = `${hojeIso()}T${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
  const proximas = dados.consultas.filter((c) => String(c.data_hora) >= agora && !['cancelada', 'ausente', 'realizada'].includes(String(c.status))).reverse()
  const anteriores = dados.consultas.filter((c) => !proximas.includes(c))

  return (
    <>
      <Cabecalho titulo="Minhas consultas" subtitulo="Marque, confirme a presença, remarque ou cancele." acoes={<Botao variante="primario" icone={CalendarPlus} onClick={() => setMarcar((m) => !m)}>Marcar consulta</Botao>} />
      {marcar && (
        <Painel titulo="Marcar consulta" className="mb-5">
          <Agendador especialidades={dados.especialidades} hoje={dados.hoje} botao="Confirmar consulta"
            aoConfirmar={async (v) => { if (await chamar('api/portal/consultas', { id_especialidade: v.esp, id_medico: v.medico, data: v.dia, hora: v.hora })) setMarcar(false) }} />
        </Painel>
      )}
      <Painel titulo="Próximas" meta={String(proximas.length)} className="mb-5">
        {proximas.length === 0 ? <p className="text-muted">Nenhuma consulta marcada.</p> : (
          <ul className="divide-y divide-rule">
            {proximas.map((c) => {
              const [rot, tom] = situacaoConsulta(c.status)
              return (
                <li key={String(c.id_consulta)} className="flex flex-wrap items-center gap-3 py-3.5 first:pt-0">
                  <span className="flex w-16 flex-col items-center rounded-xl bg-brand-50 py-2 text-brand-900">
                    <span className="text-[20px] leading-none font-semibold">{String(c.data_hora).slice(8, 10)}</span>
                    <span className="text-[11px] uppercase">{new Date(String(c.data_hora)).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                  </span>
                  <span className="min-w-0 grow">
                    <span className="block font-medium">{String(c.especialidade)} · {hora(c.data_hora)}</span>
                    <span className="block text-[13px] text-muted">{String(c.medico)}</span>
                    {c.confirmada_em ? <span className="mt-1 inline-flex items-center gap-1 text-[12px] text-positive"><CheckCircle2 className="size-3.5" /> presença confirmada</span> : <Pilula tom={tom}>{rot}</Pilula>}
                  </span>
                  {c.status === 'agendada' && (
                    <span className="flex flex-wrap gap-1">
                      {!c.confirmada_em && <Botao pequeno variante="primario" onClick={() => chamar(`api/portal/consultas/${c.id_consulta}/confirmar`)}>Confirmar presença</Botao>}
                      <Botao pequeno onClick={() => setRemarcar(c)}>Remarcar</Botao>
                      <Botao pequeno variante="perigoTexto" onClick={() => setCancelar(c)}>Cancelar</Botao>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Painel>
      <Painel titulo="Histórico" meta={String(anteriores.length)} delay={0.08}>
        {anteriores.length === 0 ? <p className="text-muted">Nada por aqui ainda.</p> : (
          <ul className="divide-y divide-rule">
            {anteriores.map((c) => {
              const [rot, tom] = situacaoConsulta(c.status)
              return (
                <li key={String(c.id_consulta)} className="flex items-center gap-3 py-3 first:pt-0">
                  <span className="grow"><span className="block font-medium">{String(c.especialidade)}</span>
                    <span className="block text-[13px] text-muted">{data(c.data_hora)} às {hora(c.data_hora)} · {String(c.medico)}</span>
                    {c.motivo_cancelamento ? <span className="block text-[12px] text-faint">{String(c.motivo_cancelamento)}</span> : null}</span>
                  <Pilula tom={tom}>{rot}</Pilula>
                </li>
              )
            })}
          </ul>
        )}
      </Painel>
      <Dialogo aberto={!!remarcar} aoFechar={() => setRemarcar(null)} titulo="Remarcar consulta" largura="max-w-2xl">
        {remarcar && <Agendador especialidades={dados.especialidades} hoje={dados.hoje} fixa={{ esp: String(remarcar.id_especialidade), medico: String(remarcar.id_medico) }} botao="Confirmar novo horário"
          aoConfirmar={async (v) => { if (await chamar(`api/portal/consultas/${remarcar.id_consulta}/remarcar`, { id_medico: v.medico, data: v.dia, hora: v.hora, motivo: 'pelo portal' })) setRemarcar(null) }} />}
      </Dialogo>
      <DialogoMotivo aberto={!!cancelar} titulo="Cancelar consulta" ajuda="O horário fica livre para outra pessoa. Você recebe a confirmação por e-mail." botao="Cancelar consulta"
        aoFechar={() => setCancelar(null)} aoConfirmar={async (motivo) => { await chamar(`api/portal/consultas/${cancelar!.id_consulta}/cancelar`, { motivo }); setCancelar(null) }} />
    </>
  )
}
