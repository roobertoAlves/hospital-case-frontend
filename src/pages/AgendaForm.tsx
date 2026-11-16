import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useAviso } from '../components/avisos'
import { BuscaPaciente, GradeHorarios, type Horario, type PacienteEscolhido } from '../components/agendamento'
import { Alerta, Botao, BotaoLink, Cabecalho, Campo, Carregando, Entrada, SecaoForm, Seletor, Vazio } from '../components/ui'
import { ApiError, get, post } from '../lib/api'
import { cpfMascarado, data, hora, situacaoConsulta } from '../lib/formato'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>
interface Opcoes { especialidades: Linha[]; hoje: string; paciente?: Linha; original?: Linha }

/** Agendar consulta (/agenda/nova) ou remarcar (/agenda/:id/remarcar). */
export default function AgendaForm() {
  const { id } = useParams()
  const remarcar = !!id
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const avisar = useAviso()
  const { dados, carregando, erro } = useApi<Opcoes>(remarcar ? `api/consultas/${id}/remarcar` : 'api/agenda/opcoes', remarcar ? undefined : { paciente: params.get('paciente') })

  const [paciente, setPaciente] = useState<PacienteEscolhido | null>(null)
  const [esp, setEsp] = useState('')
  const [medicos, setMedicos] = useState<Linha[] | null>(null)
  const [medico, setMedico] = useState('')
  const [dia, setDia] = useState('')
  const [horarios, setHorarios] = useState<Horario[] | null>(null)
  const [carregandoH, setCarregandoH] = useState(false)
  const [horaEscolhida, setHora] = useState('')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!dados) return
    const pac = dados.paciente
    if (pac) setPaciente({ id_paciente: Number(pac.id_paciente), nome: String(pac.nome), cpf: cpfMascarado(pac.cpf) })
    const o = dados.original
    if (o) {
      setEsp(String(o.id_especialidade))
      setMedico(String(o.id_medico))
      const d = String(o.data_hora).slice(0, 10)
      setDia(d > dados.hoje ? d : dados.hoje)
    } else setDia(dados.hoje)
  }, [dados])

  useEffect(() => {
    if (!esp) { setMedicos(null); return }
    get<Linha[]>('api/agenda/medicos', { especialidade: esp }).then((r) => {
      setMedicos(r.data)
      setMedico((m) => (r.data.some((x) => String(x.id_profissional) === m) ? m : ''))
    }).catch(() => setMedicos([]))
  }, [esp])

  useEffect(() => {
    setHora('')
    if (!medico || !dia) { setHorarios(null); return }
    setCarregandoH(true)
    get<Horario[]>('api/agenda/horarios', { medico, data: dia }).then((r) => setHorarios(r.data)).catch(() => setHorarios([])).finally(() => setCarregandoH(false))
  }, [medico, dia])

  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message ?? 'Consulta não encontrada.'}</Vazio>
  const o = dados.original
  const nomeMedico = medicos?.find((m) => String(m.id_profissional) === medico)?.nome
  const pronto = !!paciente && !!medico && !!horaEscolhida

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const r = remarcar
        ? await post<Linha>(`api/consultas/${id}/remarcar`, { id_medico: medico, data: dia, hora: horaEscolhida, motivo })
        : await post<Linha>('api/consultas', { id_paciente: paciente!.id_paciente, id_especialidade: esp, id_medico: medico, data: dia, hora: horaEscolhida })
      avisar(r.message ?? 'Consulta agendada.')
      navigate(`/agenda?data=${dia}`)
    } catch (err) {
      avisar(err instanceof ApiError ? err.message : 'Não foi possível agendar.', false)
      get<Horario[]>('api/agenda/horarios', { medico, data: dia }).then((r) => setHorarios(r.data)).catch(() => undefined)
    } finally { setEnviando(false) }
  }

  return (
    <>
      <Cabecalho
        trilha={[{ rotulo: 'Agenda de consultas', to: '/agenda' }, { rotulo: remarcar ? 'Remarcar' : 'Agendar' }]}
        titulo={remarcar ? 'Remarcar consulta' : 'Agendar consulta'}
        subtitulo={remarcar ? 'A consulta atual é cancelada e a nova fica ligada a ela. O paciente recebe o aviso do novo horário.' : 'Escolha o paciente, a especialidade e o médico; depois um horário livre.'}
      />
      {o && o.status !== 'agendada' && <div className="mb-4"><Alerta tom="erro">Esta consulta não está mais agendada ({situacaoConsulta(o.status)[0]}). Só consultas antes da chegada podem ser remarcadas.</Alerta></div>}
      {o && <div className="mb-4"><Alerta><strong>Horário atual:</strong> {data(o.data_hora)} às {hora(o.data_hora)} · {String(o.medico)} · {String(o.especialidade)}</Alerta></div>}
      <form onSubmit={enviar} noValidate className="max-w-[1100px]">
        <SecaoForm titulo="Paciente" descricao={remarcar ? 'Na remarcação o paciente não muda.' : 'Busque por nome ou CPF. Só pacientes ativos aparecem.'}>
          <div className="max-w-[540px] sm:col-span-6"><BuscaPaciente valor={paciente} aoEscolher={setPaciente} bloqueado={remarcar} /></div>
        </SecaoForm>
        <SecaoForm titulo="Especialidade e médico" descricao="Só médicos ativos que atendem a especialidade.">
          <Campo rotulo="Especialidade" nome="esp" obrigatorio className="sm:col-span-3">
            <Seletor name="esp" value={esp} onChange={(e) => setEsp(e.target.value)} disabled={remarcar}>
              <option value="">Escolha…</option>
              {dados.especialidades.map((e) => <option key={String(e.id_especialidade)} value={String(e.id_especialidade)}>{String(e.nome)}</option>)}
            </Seletor>
          </Campo>
          <Campo rotulo="Médico" nome="med" obrigatorio className="sm:col-span-3">
            <Seletor name="med" value={medico} onChange={(e) => setMedico(e.target.value)} disabled={!medicos}>
              <option value="">{medicos ? 'Escolha…' : 'Escolha a especialidade primeiro'}</option>
              {(medicos ?? []).map((m) => <option key={String(m.id_profissional)} value={String(m.id_profissional)}>{String(m.nome)} · CRM {String(m.crm)}/{String(m.crm_uf)}</option>)}
            </Seletor>
          </Campo>
        </SecaoForm>
        <SecaoForm titulo="Data e horário" descricao="Horários na grade do médico. Riscados: ocupados ou já passados.">
          <Campo rotulo="Data" nome="dia" obrigatorio className="sm:col-span-2">
            <Entrada name="dia" type="date" min={dados.hoje} value={dia} onChange={(e) => setDia(e.target.value)} />
          </Campo>
          <div className="sm:col-span-6"><GradeHorarios horarios={horarios} carregando={carregandoH} escolhido={horaEscolhida} aoEscolher={setHora} /></div>
        </SecaoForm>
        {remarcar && (
          <SecaoForm titulo="Motivo" descricao="Opcional. Fica no registro da consulta cancelada, não vai no e-mail.">
            <Campo rotulo="Motivo da remarcação" nome="motivo" className="sm:col-span-6">
              <Entrada name="motivo" maxLength={200} placeholder="Ex.: pedido do paciente" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </Campo>
          </SecaoForm>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">
          <span className="mr-auto text-muted" aria-live="polite">{pronto ? `${paciente!.nome} · ${nomeMedico} · ${data(dia)} às ${horaEscolhida}` : ''}</span>
          <BotaoLink to="/agenda">Cancelar</BotaoLink>
          <Botao type="submit" variante="primario" disabled={!pronto} carregando={enviando}>{remarcar ? 'Confirmar remarcação' : 'Confirmar agendamento'}</Botao>
        </div>
      </form>
    </>
  )
}
