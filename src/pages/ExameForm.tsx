import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAviso } from '../components/avisos'
import { BuscaPaciente, GradeHorarios, type Horario, type PacienteEscolhido } from '../components/agendamento'
import { Alerta, Botao, BotaoLink, Cabecalho, Campo, Carregando, Entrada, SecaoForm, Seletor, Vazio } from '../components/ui'
import { ApiError, get, post } from '../lib/api'
import { agrupar, cpfMascarado, data, rotuloCategoria } from '../lib/formato'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>

export default function ExameForm() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const avisar = useAviso()
  const { dados, carregando, erro } = useApi<{ tipos: Linha[]; hoje: string; paciente?: Linha }>('api/exames/opcoes', { paciente: params.get('paciente') })
  const [paciente, setPaciente] = useState<PacienteEscolhido | null>(null)
  const [tipo, setTipo] = useState('')
  const [dia, setDia] = useState('')
  const [horarios, setHorarios] = useState<Horario[] | null>(null)
  const [carregandoH, setCarregandoH] = useState(false)
  const [horaEscolhida, setHora] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!dados) return
    setDia(dados.hoje)
    const p = dados.paciente
    if (p) setPaciente({ id_paciente: Number(p.id_paciente), nome: String(p.nome), cpf: cpfMascarado(p.cpf) })
  }, [dados])

  useEffect(() => {
    setHora('')
    if (!tipo || !dia) { setHorarios(null); return }
    setCarregandoH(true)
    get<Horario[]>('api/exames/horarios', { tipo, data: dia }).then((r) => setHorarios(r.data)).catch(() => setHorarios([])).finally(() => setCarregandoH(false))
  }, [tipo, dia])

  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message ?? 'Não foi possível carregar.'}</Vazio>
  const t = dados.tipos.find((x) => String(x.id_tipo_exame) === tipo)
  const pronto = !!paciente && !!tipo && !!horaEscolhida

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const r = await post('api/exames-agendados', { id_paciente: paciente!.id_paciente, id_tipo_exame: tipo, data: dia, hora: horaEscolhida })
      avisar(r.message ?? 'Exame agendado.')
      navigate(`/exames?data=${dia}`)
    } catch (err) {
      avisar(err instanceof ApiError ? err.message : 'Não foi possível agendar.', false)
    } finally { setEnviando(false) }
  }

  return (
    <>
      <Cabecalho trilha={[{ rotulo: 'Agenda de exames', to: '/exames' }, { rotulo: 'Agendar' }]} titulo="Agendar exame" subtitulo="Escolha o paciente, o exame e um horário livre do local." />
      <form onSubmit={enviar} noValidate className="max-w-[1100px]">
        <SecaoForm titulo="Paciente" descricao="Busque por nome ou CPF. Só pacientes ativos aparecem.">
          <div className="max-w-[540px] sm:col-span-6"><BuscaPaciente valor={paciente} aoEscolher={setPaciente} /></div>
        </SecaoForm>
        <SecaoForm titulo="Exame" descricao="Cada exame acontece num local, com duração própria.">
          <Campo rotulo="Exame" nome="tipo" obrigatorio className="sm:col-span-4">
            <Seletor name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Escolha…</option>
              {agrupar(dados.tipos, 'categoria').map(([g, lista]) => (
                <optgroup key={g} label={rotuloCategoria(g)}>
                  {lista.map((x) => <option key={String(x.id_tipo_exame)} value={String(x.id_tipo_exame)}>{String(x.nome)} · {String(x.local)}</option>)}
                </optgroup>
              ))}
            </Seletor>
          </Campo>
          {t && <div className="sm:col-span-6"><Alerta><strong>Preparo:</strong> {String(t.preparo ?? 'Sem preparo especial.')} · duração {String(t.duracao_min)} min</Alerta></div>}
        </SecaoForm>
        <SecaoForm titulo="Data e horário" descricao="Horários do local. Riscados: ocupados ou já passados.">
          <Campo rotulo="Data" nome="dia" obrigatorio className="sm:col-span-2">
            <Entrada name="dia" type="date" min={dados.hoje} value={dia} onChange={(e) => setDia(e.target.value)} />
          </Campo>
          <div className="sm:col-span-6"><GradeHorarios horarios={horarios} carregando={carregandoH} escolhido={horaEscolhida} aoEscolher={setHora} vazio="O local não atende nesse dia." /></div>
        </SecaoForm>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">
          <span className="mr-auto text-muted">{pronto ? `${paciente!.nome} · ${t?.nome} · ${data(dia)} às ${horaEscolhida}` : ''}</span>
          <BotaoLink to="/exames">Cancelar</BotaoLink>
          <Botao type="submit" variante="primario" disabled={!pronto} carregando={enviando}>Confirmar agendamento</Botao>
        </div>
      </form>
    </>
  )
}
