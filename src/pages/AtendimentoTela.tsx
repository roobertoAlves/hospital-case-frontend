import { FileText, Plus, Printer, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Dialogo, DialogoMotivo, useAviso } from '../components/avisos'
import { Alerta, AreaTexto, Botao, BotaoLink, Cabecalho, Campo, Carregando, Entrada, Painel, Pilula, Prioridade, Seletor, Vazio } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { data, dataHora, hora, idade, situacaoConsulta } from '../lib/formato'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>
interface Dados { consulta: Linha; triagem: Linha | null; alergias: Linha[]; evolucoes: Linha[]; versoes: number; receitas: Linha[]; exames: Linha[]; anteriores: Linha[] }

const PRONTUARIO: [string, string, string | null, number][] = [
  ['queixa_principal', 'Queixa principal', null, 2],
  ['historia_doenca_atual', 'História da doença atual', null, 4],
  ['historico_relevante', 'Antecedentes relevantes', 'Doenças prévias, cirurgias, medicamentos em uso.', 3],
  ['observacoes', 'Exame físico e observações', null, 3],
  ['hipoteses_diagnosticas', 'Hipóteses diagnósticas', null, 2],
  ['conduta', 'Conduta', 'Obrigatória para finalizar.', 3],
]
const ITEM_VAZIO = { medicamento: '', dosagem: '', via: '', frequencia: '', duracao: '', orientacoes: '' }
const SEXO: Record<string, string> = { feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro' }

export default function AtendimentoTela() {
  const { id } = useParams()
  const avisar = useAviso()
  const { dados, carregando, erro, recarregar } = useApi<Dados>(`api/atendimento/${id}`)
  const [pront, setPront] = useState<Record<string, string>>({})
  const [erros, setErros] = useState<Record<string, string>>({})
  const [ocupado, setOcupado] = useState('')
  const [confirmarFim, setConfirmarFim] = useState(false)
  const [texto, setTexto] = useState('')
  const [rx, setRx] = useState({ orientacoes_gerais: '', itens: [{ ...ITEM_VAZIO }] })
  const [exame, setExame] = useState({ nome_exame: '', codigo: '', justificativa: '' })
  const [alergia, setAlergia] = useState({ substancia: '', reacao: '', gravidade: '' })
  const [cancelar, setCancelar] = useState<{ url: string; titulo: string; ajuda: string } | null>(null)

  useEffect(() => {
    if (!dados) return
    const v: Record<string, string> = {}
    for (const [k] of PRONTUARIO) v[k] = dados.consulta[k] == null ? '' : String(dados.consulta[k])
    setPront(v)
  }, [dados])

  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message ?? 'Consulta não encontrada.'}</Vazio>

  const c = dados.consulta
  const status = String(c.status)
  const aguardando = status === 'aguardando_atendimento'
  const emAtendimento = status === 'em_atendimento'
  const finalizado = c.status_prontuario === 'finalizado'
  const rascunho = c.id_prontuario != null && !finalizado && emAtendimento
  const podeReceitar = emAtendimento || status === 'realizada'
  const [rotSt, tomSt] = situacaoConsulta(status)
  const anos = idade(c.data_nascimento)

  const chamar = async (chave: string, url: string, corpo?: Record<string, unknown>, depois?: () => void) => {
    setOcupado(chave); setErros({})
    try { const r = await post(url, corpo); avisar(r.message ?? 'Feito.'); depois?.(); await recarregar() }
    catch (e) { if (e instanceof ApiError) { if (e.details) setErros(e.details); avisar(e.message, false) } else avisar('Não foi possível concluir.', false) }
    finally { setOcupado('') }
  }

  const salvar = (e: FormEvent) => { e.preventDefault(); chamar('salvar', `api/atendimento/${id}/prontuario`, pront) }
  const emitirReceita = (e: FormEvent) => {
    e.preventDefault()
    chamar('rx', `api/atendimento/${id}/receitas`, { orientacoes_gerais: rx.orientacoes_gerais, itens: rx.itens.filter((i) => i.medicamento.trim()) },
      () => setRx({ orientacoes_gerais: '', itens: [{ ...ITEM_VAZIO }] }))
  }

  return (
    <>
      <Cabecalho
        trilha={[{ rotulo: 'Fila de atendimento', to: '/atendimento' }, { rotulo: String(c.paciente) }]}
        titulo={String(c.paciente)}
        subtitulo={<span className="flex flex-wrap items-center gap-2">{anos !== null && `${anos} anos ·`} {SEXO[String(c.sexo)] ?? 'Sexo não informado'} · {String(c.especialidade)} · consulta das {hora(c.data_hora)} <Pilula tom={tomSt}>{rotSt}</Pilula></span>}
        acoes={<>
          <BotaoLink to={`/pacientes/${c.id_paciente}/historico`} icone={FileText}>Histórico</BotaoLink>
          {aguardando && <Botao variante="primario" carregando={ocupado === 'iniciar'} onClick={() => chamar('iniciar', `api/atendimento/${id}/iniciar`)}>Iniciar atendimento</Botao>}
        </>}
      />
      <div className="mb-5">
        <Alerta tom={dados.alergias.length ? 'erro' : 'nota'}>
          <strong>Alergias:</strong>{' '}
          {dados.alergias.length ? dados.alergias.map((a, i) => <span key={i}>{i > 0 && ' · '}{String(a.substancia)}{a.gravidade ? ` (${a.gravidade})` : ''}{a.reacao ? `: ${a.reacao}` : ''}</span>) : 'nenhuma registrada.'}
        </Alerta>
      </div>

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <div className="grid content-start gap-5">
          <Painel titulo="Prontuário" meta={finalizado ? `finalizado em ${dataHora(c.finalizado_em)} · não pode ser alterado`
            : c.id_prontuario != null ? `rascunho · versão ${c.versao}${dados.versoes > 0 ? ` · ${dados.versoes} anteriores guardadas` : ''}` : 'inicie o atendimento para registrar'}>
            {c.id_prontuario == null ? <Vazio>O prontuário é aberto quando você inicia o atendimento. A queixa da triagem já vem preenchida.</Vazio> : (
              <form onSubmit={salvar} noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  {PRONTUARIO.map(([k, rot, ajuda, linhas]) => (
                    <Campo key={k} rotulo={rot} nome={k} ajuda={ajuda ?? undefined} erro={erros[k]} className={linhas >= 3 ? 'sm:col-span-2' : ''}>
                      <AreaTexto name={k} rows={linhas} value={pront[k] ?? ''} disabled={!rascunho} invalido={!!erros[k]} onChange={(e) => setPront({ ...pront, [k]: e.target.value })} />
                    </Campo>
                  ))}
                </div>
                {rascunho && (
                  <div className="mt-5 flex justify-end gap-2">
                    <Botao type="submit" carregando={ocupado === 'salvar'}>Salvar rascunho</Botao>
                    <Botao type="button" variante="primario" onClick={() => setConfirmarFim(true)}>Finalizar atendimento</Botao>
                  </div>
                )}
              </form>
            )}
          </Painel>

          {c.id_prontuario != null && (
            <Painel titulo="Evoluções e adendos" meta="só inclusão · não podem ser editados" delay={0.08}>
              {dados.evolucoes.length === 0 ? <p className="text-muted">Nenhum registro.</p> : (
                <ul className="divide-y divide-rule">
                  {dados.evolucoes.map((e, i) => (
                    <li key={i} className="py-3 first:pt-0">
                      <p className="mb-1 text-[12px] text-muted">{e.tipo === 'adendo' ? 'Adendo' : 'Evolução'} · {String(e.autor)} · {dataHora(e.registrado_em)}</p>
                      <p className="whitespace-pre-wrap">{String(e.texto)}</p>
                    </li>
                  ))}
                </ul>
              )}
              {(emAtendimento || finalizado) && (
                <form className="mt-4" onSubmit={(e) => { e.preventDefault(); chamar('evol', `api/atendimento/${id}/evolucoes`, { tipo: finalizado ? 'adendo' : 'evolucao', texto }, () => setTexto('')) }}>
                  <Campo rotulo={finalizado ? 'Novo adendo' : 'Nova evolução'} nome="texto" erro={erros.texto}>
                    <AreaTexto name="texto" rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} />
                  </Campo>
                  <div className="mt-3 flex justify-end"><Botao type="submit" carregando={ocupado === 'evol'}>{finalizado ? 'Incluir adendo' : 'Incluir evolução'}</Botao></div>
                </form>
              )}
            </Painel>
          )}

          <Painel titulo="Receitas" meta="emitida não muda; só pode ser cancelada" delay={0.1}>
            {dados.receitas.length === 0 && <p className="mb-3 text-muted">Nenhuma receita nesta consulta.</p>}
            <ul className="mb-4 space-y-3">
              {dados.receitas.map((r) => (
                <li key={String(r.id_receita)} className="rounded-[var(--radius-card)] border border-line p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <strong>Receita nº {String(r.id_receita)}</strong>
                    <span className="text-[12px] text-muted">{dataHora(r.emitida_em)}</span>
                    {r.status === 'cancelada' ? <Pilula tom="negative">Cancelada</Pilula> : <Pilula tom="positive">Emitida</Pilula>}
                    <span className="ml-auto flex gap-1">
                      <BotaoLink to={`/receitas/${r.id_receita}`} pequeno icone={Printer}>Imprimir</BotaoLink>
                      {r.status !== 'cancelada' && <Botao pequeno variante="perigoTexto" onClick={() => setCancelar({ url: `api/receitas/${r.id_receita}/cancelar`, titulo: `Cancelar a receita nº ${r.id_receita}`, ajuda: 'A receita cancelada continua no histórico, marcada como cancelada.' })}>Cancelar</Botao>}
                    </span>
                  </div>
                  <ol className="list-decimal space-y-1 pl-5 text-[13px]">
                    {(r.itens as Linha[]).map((i, k) => <li key={k}><strong>{String(i.medicamento)}</strong> {String(i.dosagem)} {i.via ? `· ${i.via}` : ''} · {String(i.frequencia)} · {String(i.duracao)}{i.orientacoes ? ` · ${i.orientacoes}` : ''}</li>)}
                  </ol>
                  {r.motivo_cancelamento ? <p className="mt-2 text-[12px] text-muted">Motivo do cancelamento: {String(r.motivo_cancelamento)}</p> : null}
                </li>
              ))}
            </ul>
            {podeReceitar && (
              <form onSubmit={emitirReceita} className="rounded-[var(--radius-card)] bg-raised p-4" noValidate>
                <p className="mb-3 font-medium">Nova receita</p>
                <div className="space-y-2">
                  {rx.itens.map((it, k) => (
                    <div key={k} className="grid gap-2 sm:grid-cols-[2fr_1fr_0.8fr_1.2fr_1fr_auto]">
                      {(['medicamento', 'dosagem', 'via', 'frequencia', 'duracao'] as const).map((campo) => (
                        <Entrada key={campo} aria-label={`${campo} do item ${k + 1}`} value={it[campo]}
                          placeholder={{ medicamento: 'Medicamento', dosagem: '500 mg', via: 'oral', frequencia: '8 em 8 horas', duracao: '7 dias' }[campo]}
                          onChange={(e) => setRx({ ...rx, itens: rx.itens.map((x, j) => (j === k ? { ...x, [campo]: e.target.value } : x)) })} />
                      ))}
                      <Botao type="button" variante="perigoTexto" aria-label="Remover item" disabled={rx.itens.length === 1}
                        onClick={() => setRx({ ...rx, itens: rx.itens.filter((_, j) => j !== k) })}><Trash2 className="size-4" /></Botao>
                    </div>
                  ))}
                </div>
                {erros.itens && <p className="mt-2 text-[12px] text-negative">{erros.itens}</p>}
                <Botao type="button" variante="texto" pequeno icone={Plus} className="mt-2" disabled={rx.itens.length >= 20} onClick={() => setRx({ ...rx, itens: [...rx.itens, { ...ITEM_VAZIO }] })}>Adicionar medicamento</Botao>
                <Campo rotulo="Orientações gerais" nome="orientacoes_gerais" className="mt-3">
                  <AreaTexto name="orientacoes_gerais" rows={2} value={rx.orientacoes_gerais} onChange={(e) => setRx({ ...rx, orientacoes_gerais: e.target.value })} />
                </Campo>
                <div className="mt-3 flex justify-end"><Botao type="submit" variante="primario" carregando={ocupado === 'rx'}>Emitir receita</Botao></div>
              </form>
            )}
          </Painel>

          <Painel titulo="Exames solicitados" delay={0.12}>
            {dados.exames.length === 0 && <p className="mb-3 text-muted">Nenhum exame solicitado.</p>}
            <ul className="mb-4 divide-y divide-rule">
              {dados.exames.map((e) => (
                <li key={String(e.id_exame)} className="flex flex-wrap items-center gap-2 py-2.5">
                  <span className="grow"><span className="block font-medium">{String(e.nome_exame)}{e.codigo ? ` · ${e.codigo}` : ''}</span>
                    <span className="block text-[12px] text-muted">{dataHora(e.solicitado_em)}{e.justificativa ? ` · ${e.justificativa}` : ''}</span></span>
                  {e.status === 'cancelado' ? <Pilula tom="negative">Cancelado</Pilula>
                    : <Botao pequeno variante="perigoTexto" onClick={() => setCancelar({ url: `api/solicitacoes-exame/${e.id_exame}/cancelar`, titulo: `Cancelar o pedido de ${e.nome_exame}`, ajuda: 'O pedido cancelado continua no histórico.' })}>Cancelar</Botao>}
                </li>
              ))}
            </ul>
            {podeReceitar && (
              <form className="grid gap-3 rounded-[var(--radius-card)] bg-raised p-4 sm:grid-cols-6" noValidate
                onSubmit={(ev) => { ev.preventDefault(); chamar('exame', `api/atendimento/${id}/exames`, exame, () => setExame({ nome_exame: '', codigo: '', justificativa: '' })) }}>
                <Campo rotulo="Exame" nome="nome_exame" obrigatorio erro={erros.nome_exame} className="sm:col-span-4"><Entrada name="nome_exame" maxLength={200} value={exame.nome_exame} onChange={(e) => setExame({ ...exame, nome_exame: e.target.value })} /></Campo>
                <Campo rotulo="Código" nome="codigo" ajuda="Opcional (ex.: TUSS)" className="sm:col-span-2"><Entrada name="codigo" maxLength={20} value={exame.codigo} onChange={(e) => setExame({ ...exame, codigo: e.target.value })} /></Campo>
                <Campo rotulo="Justificativa" nome="justificativa" className="sm:col-span-6"><Entrada name="justificativa" maxLength={500} value={exame.justificativa} onChange={(e) => setExame({ ...exame, justificativa: e.target.value })} /></Campo>
                <div className="flex justify-end sm:col-span-6"><Botao type="submit" carregando={ocupado === 'exame'}>Solicitar exame</Botao></div>
              </form>
            )}
          </Painel>
        </div>

        <div className="grid content-start gap-5">
          <Painel titulo="Triagem" delay={0.06}>
            {!dados.triagem ? <p className="text-muted">Sem triagem registrada.</p> : (() => {
              const t = dados.triagem
              const item = (r: string, v: unknown, u = '') => <div><dt className="text-[12px] text-muted">{r}</dt><dd className="num font-medium">{v == null || v === '' ? '—' : `${v}${u}`}</dd></div>
              return (
                <>
                  <p className="mb-3"><Prioridade cor={t.cor_hex} nome={t.prioridade ?? t.classificacao} /></p>
                  <dl className="grid grid-cols-2 gap-3">
                    {item('Pressão', t.pa_sistolica != null ? `${t.pa_sistolica}/${t.pa_diastolica}` : null, ' mmHg')}
                    {item('Freq. cardíaca', t.frequencia_cardiaca, ' bpm')}
                    {item('Temperatura', t.temperatura != null ? String(t.temperatura).replace('.', ',') : null, ' °C')}
                    {item('Saturação', t.saturacao_o2, '%')}
                    {item('Peso', t.peso_kg, ' kg')}
                    {item('Altura', t.altura_cm, ' cm')}
                  </dl>
                  <p className="mt-3 text-[13px]"><span className="text-muted">Queixa:</span> {String(t.queixa_principal)}</p>
                  <p className="mt-1 text-[12px] text-faint">Registrada {dataHora(t.registrado_em)}{t.enfermeiro ? ` por ${t.enfermeiro}` : ''}</p>
                </>
              )
            })()}
          </Painel>
          {podeReceitar && (
            <Painel titulo="Registrar alergia" delay={0.1}>
              <form className="grid gap-3" noValidate onSubmit={(ev) => { ev.preventDefault(); chamar('alergia', `api/atendimento/${id}/alergias`, alergia, () => setAlergia({ substancia: '', reacao: '', gravidade: '' })) }}>
                <Campo rotulo="Substância" nome="substancia" obrigatorio erro={erros.substancia}><Entrada name="substancia" maxLength={150} value={alergia.substancia} onChange={(e) => setAlergia({ ...alergia, substancia: e.target.value })} /></Campo>
                <Campo rotulo="Reação" nome="reacao"><Entrada name="reacao" maxLength={255} value={alergia.reacao} onChange={(e) => setAlergia({ ...alergia, reacao: e.target.value })} /></Campo>
                <Campo rotulo="Gravidade" nome="gravidade">
                  <Seletor name="gravidade" value={alergia.gravidade} onChange={(e) => setAlergia({ ...alergia, gravidade: e.target.value })}>
                    <option value="">Não informada</option><option value="leve">Leve</option><option value="moderada">Moderada</option><option value="grave">Grave</option>
                  </Seletor>
                </Campo>
                <Botao type="submit" carregando={ocupado === 'alergia'}>Registrar alergia</Botao>
              </form>
            </Painel>
          )}
          <Painel titulo="Atendimentos anteriores" meta={String(dados.anteriores.length)} delay={0.14}>
            {dados.anteriores.length === 0 ? <p className="text-muted">Primeiro atendimento finalizado deste paciente.</p> : (
              <ul className="divide-y divide-rule">
                {dados.anteriores.map((a) => (
                  <li key={String(a.id_prontuario)} className="py-3 first:pt-0">
                    <p className="text-[12px] text-muted">{data(a.data_hora)}{a.medico ? ` · ${a.medico}` : ''}</p>
                    <p className="font-medium">{String(a.hipoteses_diagnosticas ?? a.queixa_principal ?? '')}</p>
                    <p className="text-[13px] text-muted">{String(a.conduta ?? '')}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link to={`/pacientes/${c.id_paciente}/historico`} className="mt-2 inline-block text-[13px] text-brand-700 hover:underline">Ver histórico completo</Link>
          </Painel>
        </div>
      </div>

      <Dialogo aberto={confirmarFim} aoFechar={() => setConfirmarFim(false)} titulo="Finalizar atendimento?">
        <p className="text-muted">Depois de finalizado, o prontuário não pode mais ser alterado; só aceita adendos. A consulta fica como realizada.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Botao onClick={() => setConfirmarFim(false)}>Voltar</Botao>
          <Botao variante="primario" carregando={ocupado === 'fim'} onClick={() => { setConfirmarFim(false); chamar('fim', `api/atendimento/${id}/finalizar`, pront) }}>Finalizar</Botao>
        </div>
      </Dialogo>
      <DialogoMotivo aberto={!!cancelar} titulo={cancelar?.titulo ?? ''} ajuda={cancelar?.ajuda} botao="Confirmar cancelamento"
        aoFechar={() => setCancelar(null)} aoConfirmar={async (motivo) => { await chamar('cancelar', cancelar!.url, { motivo }); setCancelar(null) }} />
    </>
  )
}
