import { FileUp, FlaskConical, Paperclip } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DialogoMotivo, useAviso } from '../../components/avisos'
import { GradeHorarios, type Horario } from '../../components/agendamento'
import { Alerta, Botao, Cabecalho, Campo, Carregando, Entrada, Painel, Pilula, Seletor, Vazio, cx } from '../../components/ui'
import { abrirArquivo, ApiError, get, lerArquivo, post } from '../../lib/api'
import { agrupar, data, dataHora, hora, rotuloCategoria, situacaoExame } from '../../lib/formato'
import { useApi } from '../../lib/useApi'

type Linha = Record<string, unknown>
interface Dados { exames: Linha[]; solicitacoes: Linha[]; pedidos: Linha[]; tipos: Linha[]; hoje: string }

const PEDIDO: Record<string, ['warning' | 'positive' | 'negative', string]> = {
  pendente: ['warning', 'Em conferência'], aprovado: ['positive', 'Aprovado'], recusado: ['negative', 'Recusado'],
}

export default function MeusExames() {
  const avisar = useAviso()
  const { dados, carregando, erro, recarregar } = useApi<Dados>('api/portal/exames')
  const [marcar, setMarcar] = useState(false)
  const [tipo, setTipo] = useState('')
  const [origem, setOrigem] = useState('')           // "s:ID" (solicitacao) | "p:ID" (pedido) | "novo"
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [dia, setDia] = useState('')
  const [horarios, setHorarios] = useState<Horario[] | null>(null)
  const [carregandoH, setCarregandoH] = useState(false)
  const [h, setH] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cancelar, setCancelar] = useState<Linha | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { if (dados && !dia) setDia(dados.hoje) }, [dados, dia])
  useEffect(() => {
    setH('')
    if (!tipo || !dia) { setHorarios(null); return }
    setCarregandoH(true)
    get<Horario[]>('api/exames/horarios', { tipo, data: dia }).then((r) => setHorarios(r.data)).catch(() => setHorarios([])).finally(() => setCarregandoH(false))
  }, [tipo, dia])

  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message}</Vazio>
  const t = dados.tipos.find((x) => String(x.id_tipo_exame) === tipo)
  const exige = String(t?.exige_pedido) === '1'
  const pedidosValidos = dados.pedidos.filter((p) => p.status !== 'recusado')
  const pronto = !!tipo && !!h && (!exige || (origem && (origem !== 'novo' || arquivo)))

  const confirmar = async () => {
    setEnviando(true)
    try {
      let idPedido = origem.startsWith('p:') ? origem.slice(2) : ''
      if (exige && origem === 'novo' && arquivo) {
        if (arquivo.size > 5 * 1024 * 1024) { avisar('Arquivo maior que 5 MB.', false); return }
        const env = await post<{ id_pedido: number }>('api/portal/pedidos', { nome_arquivo: arquivo.name, conteudo: await lerArquivo(arquivo), id_tipo_exame: tipo })
        idPedido = String(env.data.id_pedido)
      }
      const r = await post('api/portal/exames', { id_tipo_exame: tipo, data: dia, hora: h, id_solicitacao: origem.startsWith('s:') ? origem.slice(2) : '', id_pedido: idPedido })
      avisar(r.message ?? 'Exame marcado.')
      setMarcar(false); setTipo(''); setOrigem(''); setArquivo(null)
      recarregar()
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'Não foi possível marcar.', false)
      recarregar()
    } finally { setEnviando(false) }
  }

  return (
    <>
      <Cabecalho titulo="Meus exames" subtitulo="Exames de rotina você marca direto. Os demais pedem o pedido médico anexado (a recepção confere)."
        acoes={<Botao variante="primario" icone={FlaskConical} onClick={() => setMarcar((m) => !m)}>Marcar exame</Botao>} />

      {marcar && (
        <Painel titulo="Marcar exame" className="mb-5">
          <div className="grid gap-4">
            <Campo rotulo="Exame" nome="tipoExame">
              <Seletor name="tipoExame" value={tipo} onChange={(e) => { setTipo(e.target.value); setOrigem('') }}>
                <option value="">Escolha…</option>
                {agrupar(dados.tipos, 'categoria').map(([g, lista]) => (
                  <optgroup key={g} label={rotuloCategoria(g)}>
                    {lista.map((x) => <option key={String(x.id_tipo_exame)} value={String(x.id_tipo_exame)}>{String(x.nome)}{String(x.exige_pedido) === '1' ? ' (exige pedido)' : ''}</option>)}
                  </optgroup>
                ))}
              </Seletor>
            </Campo>
            {t && <Alerta><strong>Preparo:</strong> {String(t.preparo ?? 'Sem preparo especial.')} · {String(t.local)} · {String(t.duracao_min)} min</Alerta>}
            {exige && (
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-[13px] font-medium">Pedido médico <span className="text-negative">*</span></legend>
                {dados.solicitacoes.map((s) => (
                  <label key={`s${s.id_exame}`} className={cx('flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border p-3', origem === `s:${s.id_exame}` ? 'border-ink' : 'border-line')}>
                    <input type="radio" name="origem" className="accent-ink" checked={origem === `s:${s.id_exame}`} onChange={() => setOrigem(`s:${s.id_exame}`)} />
                    <span><span className="block font-medium">{String(s.nome_exame)}</span><span className="block text-[12px] text-muted">Pedido de {String(s.medico)} em {data(s.solicitado_em)} (no sistema, dispensa anexo)</span></span>
                  </label>
                ))}
                {pedidosValidos.map((p) => (
                  <label key={`p${p.id_pedido}`} className={cx('flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border p-3', origem === `p:${p.id_pedido}` ? 'border-ink' : 'border-line')}>
                    <input type="radio" name="origem" className="accent-ink" checked={origem === `p:${p.id_pedido}`} onChange={() => setOrigem(`p:${p.id_pedido}`)} />
                    <Paperclip className="size-4 text-faint" />
                    <span className="grow"><span className="block font-medium">{String(p.nome_original)}</span><span className="block text-[12px] text-muted">Enviado em {dataHora(p.enviado_em)}</span></span>
                    <Pilula tom={PEDIDO[String(p.status)][0]}>{PEDIDO[String(p.status)][1]}</Pilula>
                  </label>
                ))}
                <label className={cx('flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border border-dashed p-3', origem === 'novo' ? 'border-ink' : 'border-control')}>
                  <input type="radio" name="origem" className="accent-ink" checked={origem === 'novo'} onChange={() => { setOrigem('novo'); input.current?.click() }} />
                  <FileUp className="size-4 text-brand-700" />
                  <span className="grow">{arquivo ? <><strong>{arquivo.name}</strong> <span className="text-[12px] text-muted">({Math.ceil(arquivo.size / 1024)} KB)</span></> : 'Anexar pedido agora (PDF, JPG ou PNG, até 5 MB)'}</span>
                  <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => { setArquivo(e.target.files?.[0] ?? null); setOrigem('novo') }} />
                </label>
              </fieldset>
            )}
            <Campo rotulo="Data" nome="diaExame" className="max-w-[220px]"><Entrada name="diaExame" type="date" min={dados.hoje} value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
            <GradeHorarios horarios={horarios} carregando={carregandoH} escolhido={h} aoEscolher={setH} vazio="O local não atende nesse dia." />
            <div className="flex justify-end"><Botao variante="primario" disabled={!pronto} carregando={enviando} onClick={confirmar}>Confirmar exame</Botao></div>
          </div>
        </Painel>
      )}

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Painel titulo="Agendamentos" meta={String(dados.exames.length)}>
          {dados.exames.length === 0 ? <p className="text-muted">Nenhum exame marcado.</p> : (
            <ul className="divide-y divide-rule">
              {dados.exames.map((x) => {
                const [rot, tom] = situacaoExame(x.status)
                return (
                  <li key={String(x.id_exame_agendado)} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
                    <span className="min-w-0 grow">
                      <span className="block font-medium">{String(x.exame)}</span>
                      <span className="block text-[13px] text-muted">{data(x.data_hora)} às {hora(x.data_hora)} · {String(x.local)}</span>
                      {x.status === 'agendado' && x.preparo ? <span className="block text-[12px]"><strong>Preparo:</strong> {String(x.preparo)}</span> : null}
                      {x.motivo_cancelamento ? <span className="block text-[12px] text-faint">{String(x.motivo_cancelamento)}</span> : null}
                    </span>
                    {x.pedido_status && x.status === 'agendado' ? <Pilula tom={PEDIDO[String(x.pedido_status)][0]}>Pedido: {PEDIDO[String(x.pedido_status)][1].toLowerCase()}</Pilula> : null}
                    <Pilula tom={tom}>{rot}</Pilula>
                    {x.status === 'agendado' && <Botao pequeno variante="perigoTexto" onClick={() => setCancelar(x)}>Cancelar</Botao>}
                  </li>
                )
              })}
            </ul>
          )}
        </Painel>
        <div className="grid content-start gap-5">
          {dados.solicitacoes.length > 0 && (
            <Painel titulo="Pedidos do seu médico" delay={0.06}>
              <ul className="space-y-2 text-[14px]">{dados.solicitacoes.map((s) => <li key={String(s.id_exame)}><strong>{String(s.nome_exame)}</strong> <span className="text-muted">· {String(s.medico)}</span></li>)}</ul>
              <p className="mt-3 text-[12px] text-faint">Já estão no sistema: ao marcar o exame, escolha o pedido e não precisa anexar.</p>
            </Painel>
          )}
          <Painel titulo="Pedidos anexados" delay={0.1}>
            {dados.pedidos.length === 0 ? <p className="text-muted">Nenhum pedido enviado.</p> : (
              <ul className="divide-y divide-rule">
                {dados.pedidos.map((p) => (
                  <li key={String(p.id_pedido)} className="py-2.5 first:pt-0">
                    <div className="flex items-center gap-2">
                      <button className="grow truncate text-left font-medium text-brand-700 hover:underline" onClick={() => abrirArquivo(`api/portal/pedidos/${p.id_pedido}/arquivo`).catch((e) => avisar(e.message, false))}>{String(p.nome_original)}</button>
                      <Pilula tom={PEDIDO[String(p.status)][0]}>{PEDIDO[String(p.status)][1]}</Pilula>
                    </div>
                    <p className="text-[12px] text-muted">{dataHora(p.enviado_em)}{p.exame ? ` · ${p.exame}` : ''}</p>
                    {p.motivo_recusa ? <p className="text-[12px] text-negative">{String(p.motivo_recusa)}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Painel>
        </div>
      </div>
      <DialogoMotivo aberto={!!cancelar} titulo={`Cancelar ${cancelar?.exame ?? 'exame'}`} botao="Cancelar exame" aoFechar={() => setCancelar(null)}
        aoConfirmar={async (motivo) => {
          try { const r = await post(`api/portal/exames/${cancelar!.id_exame_agendado}/cancelar`, { motivo }); avisar(r.message ?? 'Exame cancelado.'); recarregar() }
          catch (e) { avisar(e instanceof ApiError ? e.message : 'Não foi possível cancelar.', false) }
          setCancelar(null)
        }} />
    </>
  )
}
