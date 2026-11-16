import { useEffect, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAviso } from '../components/avisos'
import { Alerta, AreaTexto, Botao, BotaoLink, Cabecalho, Campo, Carregando, Entrada, SecaoForm, Vazio, cx } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { hora, idade } from '../lib/formato'
import { useApi } from '../lib/useApi'
import { useFormulario } from '../lib/useFormulario'

type Linha = Record<string, unknown>
interface Dados { consulta: Linha; triagem: Linha | null; podeRegistrar: boolean; podeRetificar: boolean; classificacoes: Linha[]; alergias: Linha[] }

const CAMPOS = ['pa_sistolica', 'pa_diastolica', 'frequencia_cardiaca', 'temperatura', 'saturacao_o2', 'peso_kg', 'altura_cm',
  'queixa_principal', 'sintomas', 'observacoes', 'id_classificacao', 'motivo_retificacao'] as const
type Valores = Record<(typeof CAMPOS)[number], string>
const vazio = Object.fromEntries(CAMPOS.map((c) => [c, ''])) as Valores

const SEXO: Record<string, string> = { feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro', nao_informado: 'Não informado' }

export default function TriagemForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const avisar = useAviso()
  const { dados, carregando, erro } = useApi<Dados>(`api/triagem/${id}`)
  const f = useFormulario<Valores>(vazio)

  useEffect(() => {
    const t = dados?.triagem
    if (!t) return
    const v = { ...vazio }
    for (const c of CAMPOS) if (t[c] != null) v[c] = String(t[c]).replace('.', ',').replace(/,0+$/, '')
    v.id_classificacao = String(t.id_classificacao ?? '')
    v.motivo_retificacao = ''
    f.setValores(v)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados])

  if (carregando && !dados) return <Carregando />
  if (erro?.code === 'ERR_ETAPA') return <Vazio>Esta triagem ainda não foi iniciada ou já não está disponível. <BotaoLink to="/triagem" variante="texto">Voltar à fila</BotaoLink></Vazio>
  if (erro || !dados) return <Vazio>{erro?.message ?? 'Consulta não encontrada.'}</Vazio>

  const c = dados.consulta
  const t = dados.triagem
  const editavel = dados.podeRegistrar || dados.podeRetificar
  const anos = idade(c.data_nascimento)

  const sinal = (campo: keyof Valores, rotulo: string, unidade: string, largura = 'sm:col-span-2', placeholder?: string) => (
    <Campo rotulo={<>{rotulo} <span className="font-normal text-faint">{unidade}</span></>} nome={campo} erro={f.erros[campo]} className={largura}>
      <Entrada name={campo} inputMode="decimal" className="num" placeholder={placeholder} value={f.valores[campo]} disabled={!editavel}
        invalido={!!f.erros[campo]} onChange={(e) => f.mudar(campo, e.target.value)} />
    </Campo>
  )

  const devolver = async () => {
    try { await post(`api/triagem/${id}/devolver`); avisar('Paciente devolvido à fila.'); navigate('/triagem') }
    catch (e) { avisar(e instanceof ApiError ? e.message : 'Não foi possível devolver.', false) }
  }

  const acao = t ? `api/triagens/${t.id_triagem}/retificar` : `api/triagem/${id}`
  const enviar = f.enviar(acao, { depois: () => navigate('/triagem') })

  const lista: ReactNode = dados.alergias.map((a, i) => <span key={i}>{i > 0 && ' · '}{String(a.substancia)}{a.gravidade ? ` (${a.gravidade})` : ''}</span>)

  return (
    <>
      <Cabecalho
        trilha={[{ rotulo: 'Fila de triagem', to: '/triagem' }, { rotulo: String(c.paciente) }]}
        titulo={String(c.paciente)}
        subtitulo={`${anos !== null ? `${anos} anos · ` : ''}${SEXO[String(c.sexo)] ?? 'Sexo não informado'} · consulta com ${c.medico} (${c.especialidade}) · chegou às ${hora(c.chegada_em)}`}
        acoes={dados.podeRegistrar && <Botao onClick={devolver}>Devolver à fila</Botao>}
      />
      <div className="mb-5">
        <Alerta tom={dados.alergias.length ? 'erro' : 'nota'}>
          <strong>Alergias:</strong> {dados.alergias.length ? lista : 'nenhuma registrada. Pergunte ao paciente e informe o médico se houver.'}
        </Alerta>
      </div>
      {t && <p className="mb-4 text-[13px] text-muted">
        Triagem registrada por {String(t.enfermeiro)} às {hora(t.registrado_em)}{Number(t.versoes) > 1 ? ` · versão ${t.versoes} (retificada)` : ''}.{' '}
        {dados.podeRetificar ? 'Para corrigir, altere os campos e informe o motivo: a versão anterior fica guardada.' : 'O atendimento terminou; a triagem não pode mais ser retificada.'}
      </p>}
      <form onSubmit={enviar} noValidate className="max-w-[1100px]">
        <SecaoForm titulo="Sinais vitais" descricao="Preencha o que foi medido. Valores fora da faixa plausível são recusados.">
          {sinal('pa_sistolica', 'PA sistólica', 'mmHg', 'sm:col-span-2', '120')}
          {sinal('pa_diastolica', 'PA diastólica', 'mmHg', 'sm:col-span-2', '80')}
          {sinal('frequencia_cardiaca', 'Freq. cardíaca', 'bpm')}
          {sinal('temperatura', 'Temperatura', '°C', 'sm:col-span-2', '36,5')}
          {sinal('saturacao_o2', 'Saturação O₂', '%')}
          {sinal('peso_kg', 'Peso', 'kg', 'sm:col-span-1')}
          {sinal('altura_cm', 'Altura', 'cm', 'sm:col-span-1')}
        </SecaoForm>
        <SecaoForm titulo="Queixa" descricao="Nas palavras do paciente. O médico vê este texto na fila de atendimento.">
          <Campo rotulo="Queixa principal" nome="queixa_principal" obrigatorio erro={f.erros.queixa_principal} className="sm:col-span-6">
            <Entrada name="queixa_principal" maxLength={500} value={f.valores.queixa_principal} disabled={!editavel} invalido={!!f.erros.queixa_principal} onChange={(e) => f.mudar('queixa_principal', e.target.value)} />
          </Campo>
          <Campo rotulo="Sintomas" nome="sintomas" className="sm:col-span-3"><AreaTexto name="sintomas" value={f.valores.sintomas} disabled={!editavel} onChange={(e) => f.mudar('sintomas', e.target.value)} /></Campo>
          <Campo rotulo="Observações" nome="observacoes" className="sm:col-span-3"><AreaTexto name="observacoes" value={f.valores.observacoes} disabled={!editavel} onChange={(e) => f.mudar('observacoes', e.target.value)} /></Campo>
        </SecaoForm>
        <SecaoForm titulo="Prioridade" descricao="Define a ordem na fila do médico. Vermelho é atendido primeiro.">
          <div className="grid gap-2 sm:col-span-6 sm:grid-cols-2 lg:grid-cols-5" role="radiogroup" aria-label="Prioridade">
            {dados.classificacoes.map((p) => {
              const marcado = f.valores.id_classificacao === String(p.id_classificacao)
              return (
                <label key={String(p.id_classificacao)} className={cx('flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border p-3 transition-all',
                  marcado ? 'border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-control', !editavel && 'cursor-default opacity-80')}>
                  <input type="radio" name="id_classificacao" className="sr-only" checked={marcado} disabled={!editavel} onChange={() => f.mudar('id_classificacao', String(p.id_classificacao))} />
                  <span className="size-4 shrink-0 rounded-full" style={{ background: String(p.cor_hex) }} />
                  <span><span className="block font-medium">{String(p.nome)}</span>
                    <span className="block text-[12px] text-muted">{Number(p.tempo_alvo_min) === 0 ? 'atendimento imediato' : `até ${p.tempo_alvo_min} min`}</span></span>
                </label>
              )
            })}
          </div>
          {f.erros.id_classificacao && <p className="text-[12px] text-negative sm:col-span-6">{f.erros.id_classificacao}</p>}
        </SecaoForm>
        {t && dados.podeRetificar && (
          <SecaoForm titulo="Retificação" descricao="Obrigatório para corrigir uma triagem já registrada.">
            <Campo rotulo="Motivo" nome="motivo_retificacao" obrigatorio erro={f.erros.motivo_retificacao} className="sm:col-span-6">
              <Entrada name="motivo_retificacao" maxLength={255} value={f.valores.motivo_retificacao} invalido={!!f.erros.motivo_retificacao} onChange={(e) => f.mudar('motivo_retificacao', e.target.value)} />
            </Campo>
          </SecaoForm>
        )}
        {f.erros.geral && <div className="mb-3"><Alerta tom="erro">{f.erros.geral}</Alerta></div>}
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <BotaoLink to="/triagem">Voltar à fila</BotaoLink>
          {dados.podeRegistrar && <Botao type="submit" variante="primario" carregando={f.enviando}>Registrar e enviar ao médico</Botao>}
          {!dados.podeRegistrar && dados.podeRetificar && <Botao type="submit" variante="primario" carregando={f.enviando}>Salvar retificação</Botao>}
        </div>
      </form>
    </>
  )
}
