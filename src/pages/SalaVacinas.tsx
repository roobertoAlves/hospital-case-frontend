import { Syringe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Dialogo, DialogoMotivo, useAviso } from '../components/avisos'
import { BuscaPaciente, GradeHorarios, type Horario, type PacienteEscolhido } from '../components/agendamento'
import { NavegarDia } from '../components/NavegarDia'
import { Botao, Cabecalho, Campo, Carregando, Entrada, Painel, Pilula, Principal, Seletor, Tabela, Td, Th, Vazio } from '../components/ui'
import { ApiError, get, post } from '../lib/api'
import { diaPorExtenso, hojeIso, hora, idade } from '../lib/formato'
import { useSessao } from '../lib/sessao'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>
const SITUACAO: Record<string, ['neutral' | 'positive' | 'negative', string]> = {
  agendada: ['neutral', 'Agendada'], aplicada: ['positive', 'Aplicada'], cancelada: ['negative', 'Cancelada'], ausente: ['neutral', 'Faltou'],
}

/** Sala de vacinacao: agenda do dia, aplicacao (enfermagem) e agendamento pela recepcao. */
export default function SalaVacinas() {
  const { pode } = useSessao()
  const avisar = useAviso()
  const [params, setParams] = useSearchParams()
  const dia = params.get('data') ?? hojeIso()
  const { dados, carregando, erro, recarregar } = useApi<{ agendamentos: Linha[]; vacinas: Linha[] }>('api/vacinas', { data: dia })
  const [aplicar, setAplicar] = useState<Linha | null>(null)
  const [lote, setLote] = useState({ lote: '', fabricante: '', observacoes: '' })
  const [erros, setErros] = useState<Record<string, string>>({})
  const [cancelar, setCancelar] = useState<Linha | null>(null)
  const [novo, setNovo] = useState(false)

  const chamar = async (url: string, corpo?: Record<string, unknown>) => {
    try { const r = await post(url, corpo); avisar(r.message ?? 'Feito.'); recarregar(); return true }
    catch (e) { if (e instanceof ApiError) { setErros(e.details ?? {}); avisar(e.message, false) } return false }
  }
  const lista = dados?.agendamentos ?? []
  const ehHoje = dia === hojeIso()

  return (
    <>
      <Cabecalho titulo="Sala de vacinação" subtitulo={`${diaPorExtenso(dia)}${ehHoje ? ' (hoje)' : ''} · ${lista.filter((a) => a.status === 'agendada').length} aguardando, ${lista.filter((a) => a.status === 'aplicada').length} aplicadas`}
        acoes={<>
          <NavegarDia dia={dia} aoTrocar={(d) => setParams({ data: d })} />
          {pode('vacinas.agendar') && <Botao variante="primario" icone={Syringe} onClick={() => setNovo((n) => !n)}>Agendar vacina</Botao>}
        </>} />
      {novo && dados && <NovoAgendamento vacinas={dados.vacinas} aoAgendar={() => { setNovo(false); recarregar() }} />}
      {carregando && !dados ? <Carregando /> : erro ? <Vazio>{erro.message}</Vazio> : lista.length === 0 ? <Vazio icone={Syringe}>Nenhuma vacina agendada neste dia.</Vazio> : (
        <Painel semPadding>
          <Tabela cabecalho={<><Th className="w-20">Hora</Th><Th>Paciente</Th><Th>Vacina</Th><Th className="hidden md:table-cell">Origem</Th><Th>Situação</Th><Th /></>}>
            {lista.map((a) => (
              <tr key={String(a.id_agendamento)}>
                <Td className="num text-[15px] font-semibold">{hora(a.data_hora)}</Td>
                <Td><Link to={`/pacientes/${a.id_paciente}`} className="hover:text-brand-700"><Principal sub={`${idade(a.data_nascimento)} anos`}>{String(a.paciente)}</Principal></Link></Td>
                <Td><Principal sub={`dose ${a.dose} de ${a.doses}`}>{String(a.vacina)}</Principal></Td>
                <Td className="hidden md:table-cell text-muted">{a.origem === 'portal' ? 'Portal' : 'Recepção'}</Td>
                <Td><Pilula tom={SITUACAO[String(a.status)][0]}>{SITUACAO[String(a.status)][1]}</Pilula></Td>
                <Td className="text-right whitespace-nowrap">
                  {a.status === 'agendada' && <>
                    {pode('vacinas.aplicar') && ehHoje && <Botao pequeno variante="primario" onClick={() => { setAplicar(a); setLote({ lote: '', fabricante: '', observacoes: '' }); setErros({}) }}>Registrar aplicação</Botao>}
                    {pode('vacinas.aplicar') && <Botao pequeno variante="texto" onClick={() => chamar(`api/vacinas/agendamentos/${a.id_agendamento}/ausente`)}>Faltou</Botao>}
                    {pode('vacinas.agendar') && <Botao pequeno variante="perigoTexto" onClick={() => setCancelar(a)}>Cancelar</Botao>}
                  </>}
                </Td>
              </tr>
            ))}
          </Tabela>
        </Painel>
      )}
      <Dialogo aberto={!!aplicar} aoFechar={() => setAplicar(null)} titulo={`Aplicar ${aplicar?.vacina ?? ''} · dose ${aplicar?.dose ?? ''}`}>
        <p className="mb-4 text-[13px] text-muted">{String(aplicar?.paciente ?? '')}. O registro vai para o cartão de vacinação e não pode ser alterado depois.</p>
        <form className="grid gap-3" onSubmit={async (e) => { e.preventDefault(); if (await chamar(`api/vacinas/agendamentos/${aplicar!.id_agendamento}/aplicar`, lote)) setAplicar(null) }}>
          <Campo rotulo="Lote" nome="lote" obrigatorio erro={erros.lote}><Entrada name="lote" maxLength={40} value={lote.lote} onChange={(e) => setLote({ ...lote, lote: e.target.value })} autoFocus /></Campo>
          <Campo rotulo="Fabricante" nome="fabricante" erro={erros.fabricante}><Entrada name="fabricante" maxLength={80} value={lote.fabricante} onChange={(e) => setLote({ ...lote, fabricante: e.target.value })} /></Campo>
          <Campo rotulo="Observações" nome="observacoes" erro={erros.observacoes}><Entrada name="observacoes" maxLength={255} value={lote.observacoes} onChange={(e) => setLote({ ...lote, observacoes: e.target.value })} /></Campo>
          <div className="mt-2 flex justify-end gap-2"><Botao type="button" onClick={() => setAplicar(null)}>Voltar</Botao><Botao type="submit" variante="primario">Registrar</Botao></div>
        </form>
      </Dialogo>
      <DialogoMotivo aberto={!!cancelar} titulo={`Cancelar vacina de ${cancelar?.paciente ?? ''}`} botao="Cancelar agendamento" aoFechar={() => setCancelar(null)}
        aoConfirmar={async (motivo) => { await chamar(`api/vacinas/agendamentos/${cancelar!.id_agendamento}/cancelar`, { motivo }); setCancelar(null) }} />
    </>
  )
}

function NovoAgendamento({ vacinas, aoAgendar }: { vacinas: Linha[]; aoAgendar: () => void }) {
  const avisar = useAviso()
  const [paciente, setPaciente] = useState<PacienteEscolhido | null>(null)
  const [vacina, setVacina] = useState('')
  const [dia, setDia] = useState(hojeIso())
  const [horarios, setHorarios] = useState<Horario[] | null>(null)
  const [h, setH] = useState('')
  const [carregando, setCarregando] = useState(false)
  useEffect(() => {
    setH('')
    if (!dia) return
    setCarregando(true)
    get<Horario[]>('api/vacinas/horarios', { data: dia }).then((r) => setHorarios(r.data)).catch(() => setHorarios([])).finally(() => setCarregando(false))
  }, [dia])
  return (
    <Painel titulo="Agendar vacina" className="mb-5">
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[2fr_1.4fr_1fr]">
          <Campo rotulo="Paciente" nome="pacVac"><BuscaPaciente valor={paciente} aoEscolher={setPaciente} /></Campo>
          <Campo rotulo="Vacina" nome="vacinaR">
            <Seletor name="vacinaR" value={vacina} onChange={(e) => setVacina(e.target.value)}>
              <option value="">Escolha…</option>{vacinas.map((v) => <option key={String(v.id_vacina)} value={String(v.id_vacina)}>{String(v.nome)}</option>)}
            </Seletor>
          </Campo>
          <Campo rotulo="Data" nome="diaVacR"><Entrada name="diaVacR" type="date" min={hojeIso()} value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
        </div>
        <GradeHorarios horarios={horarios} carregando={carregando} escolhido={h} aoEscolher={setH} vazio="A sala de vacinação abre de segunda a sexta." />
        <div className="flex justify-end">
          <Botao variante="primario" disabled={!paciente || !vacina || !h} onClick={async () => {
            try { const r = await post('api/vacinas/agendamentos', { id_paciente: paciente!.id_paciente, id_vacina: vacina, data: dia, hora: h }); avisar(r.message ?? 'Agendada.'); aoAgendar() }
            catch (e) { avisar(e instanceof ApiError ? e.message : 'Não foi possível agendar.', false) }
          }}>Confirmar</Botao>
        </div>
      </div>
    </Painel>
  )
}
