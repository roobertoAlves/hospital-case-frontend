import { useParams } from 'react-router'
import { Alerta, Cabecalho, Carregando, Painel, Pilula, Prioridade, Tabela, Td, Th, Vazio } from '../components/ui'
import { data, dataHora, situacaoConsulta, situacaoExame } from '../lib/formato'
import { useApi } from '../lib/useApi'

type Linha = Record<string, unknown>
interface Dados {
  paciente: Linha; nivel: 'MEDICO' | 'ENFERMAGEM' | 'ADMINISTRATIVO'
  alergias?: Linha[]; prontuarios?: Linha[]; receitas?: Linha[]; exames?: Linha[]; triagens?: Linha[]; administrativo?: Linha[]
}

const n = (v: unknown) => (v == null ? '—' : String(v).replace(/\.0+$/, '').replace('.', ','))

/** Historico filtrado por perfil (decidido no backend: HistoricoController.nivel). */
export default function Historico() {
  const { id } = useParams()
  const { dados, carregando, erro } = useApi<Dados>(`api/pacientes/${id}/historico`)
  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message ?? 'Histórico indisponível.'}</Vazio>
  const p = dados.paciente
  const medico = dados.nivel === 'MEDICO'
  const clinico = medico || dados.nivel === 'ENFERMAGEM'
  const alergias = dados.alergias ?? []

  return (
    <>
      <Cabecalho
        trilha={[{ rotulo: 'Pacientes', to: '/pacientes' }, { rotulo: String(p.nome), to: `/pacientes/${id}` }, { rotulo: 'Histórico' }]}
        titulo={`Histórico de ${p.nome}`}
        subtitulo={`${medico ? 'Visão médica: atendimentos, triagens, receitas e exames.' : clinico ? 'Visão da enfermagem: triagens e alergias.' : 'Visão administrativa: consultas e exames agendados, sem dados clínicos.'} O acesso fica registrado na auditoria.`}
      />
      {clinico && (
        <div className="mb-5">
          <Alerta tom={alergias.length ? 'erro' : 'nota'}>
            <strong>Alergias:</strong>{' '}
            {alergias.length ? alergias.map((a, i) => <span key={i}>{i > 0 && ' · '}{String(a.substancia)}{a.gravidade ? ` (${a.gravidade})` : ''}</span>) : 'nenhuma registrada.'}
          </Alerta>
        </div>
      )}
      <div className="grid gap-5">
        {medico && (
          <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
            <Painel titulo="Atendimentos" meta={`${dados.prontuarios?.length ?? 0} finalizados`}>
              {!dados.prontuarios?.length ? <p className="text-muted">Nenhum atendimento finalizado.</p> : (
                <ul className="divide-y divide-rule">
                  {dados.prontuarios.map((r, i) => (
                    <li key={i} className="py-3 first:pt-0">
                      <p className="mb-1 text-[12px] text-muted">{data(r.data_hora)} · {String(r.medico)} · {String(r.especialidade)}</p>
                      <p><strong>Queixa:</strong> {String(r.queixa_principal ?? '—')}</p>
                      <p><strong>Hipóteses:</strong> {String(r.hipoteses_diagnosticas ?? '—')}</p>
                      <p className="whitespace-pre-wrap"><strong>Conduta:</strong> {String(r.conduta ?? '—')}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Painel>
            <div className="grid content-start gap-5">
              <Painel titulo="Receitas" delay={0.08}>
                {!dados.receitas?.length ? <p className="text-muted">Nenhuma receita.</p> : (
                  <ul className="divide-y divide-rule">
                    {dados.receitas.map((r, i) => (
                      <li key={i} className="py-2.5 first:pt-0 text-[13px]">
                        <p className="text-[12px] text-muted">{data(r.emitida_em)} · {String(r.medico)}{r.status === 'cancelada' ? ' · cancelada' : ''}</p>
                        {(r.itens as Linha[]).map((it, k) => <p key={k}>{String(it.medicamento)} {String(it.dosagem)} · {String(it.frequencia)}</p>)}
                      </li>
                    ))}
                  </ul>
                )}
              </Painel>
              <Painel titulo="Exames solicitados" delay={0.12}>
                {!dados.exames?.length ? <p className="text-muted">Nenhum exame.</p> : (
                  <ul className="divide-y divide-rule">
                    {dados.exames.map((e, i) => (
                      <li key={i} className="py-2.5 first:pt-0">
                        <p className="font-medium">{String(e.nome_exame)}</p>
                        <p className="text-[12px] text-muted">{data(e.solicitado_em)} · {String(e.medico)}{e.status === 'cancelado' ? ' · cancelado' : ''}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Painel>
            </div>
          </div>
        )}
        {clinico && (
          <Painel titulo="Triagens" meta="inclui versões retificadas" semPadding delay={0.1}>
            {!dados.triagens?.length ? <div className="p-5"><Vazio>Nenhuma triagem.</Vazio></div> : (
              <Tabela cabecalho={<><Th>Data</Th><Th>Prioridade</Th><Th>PA</Th><Th className="hidden md:table-cell">FC</Th><Th className="hidden md:table-cell">Temp.</Th><Th className="hidden md:table-cell">SpO₂</Th><Th>Queixa</Th><Th className="hidden lg:table-cell">Enfermeiro</Th></>}>
                {dados.triagens.map((t, i) => (
                  <tr key={i} title={t.retifica_id ? `Retificação: ${t.motivo_retificacao}` : undefined}>
                    <Td className="num whitespace-nowrap">{dataHora(t.registrado_em)}{t.retifica_id ? <span className="block text-[12px] text-muted">retificação</span> : null}</Td>
                    <Td><Prioridade cor={t.cor_hex} nome={t.prioridade} /></Td>
                    <Td className="num">{t.pa_sistolica != null ? `${n(t.pa_sistolica)}/${n(t.pa_diastolica)}` : '—'}</Td>
                    <Td className="num hidden md:table-cell">{n(t.frequencia_cardiaca)}</Td>
                    <Td className="num hidden md:table-cell">{n(t.temperatura)}</Td>
                    <Td className="num hidden md:table-cell">{n(t.saturacao_o2)}</Td>
                    <Td>{String(t.queixa_principal)}</Td>
                    <Td className="hidden lg:table-cell">{String(t.enfermeiro)}</Td>
                  </tr>
                ))}
              </Tabela>
            )}
          </Painel>
        )}
        <Painel titulo="Consultas e exames agendados" meta="últimos 50" semPadding delay={0.14}>
          {!dados.administrativo?.length ? <div className="p-5"><Vazio>Nada agendado ainda.</Vazio></div> : (
            <Tabela cabecalho={<><Th>Data</Th><Th>Tipo</Th><Th>Descrição</Th><Th>Situação</Th></>}>
              {dados.administrativo.map((h, i) => {
                const exame = h.tipo === 'exame'
                const [rot, tom] = exame ? situacaoExame(h.status) : situacaoConsulta(h.status)
                return (
                  <tr key={i}>
                    <Td className="num whitespace-nowrap">{dataHora(h.data_hora)}</Td>
                    <Td>{exame ? 'Exame' : 'Consulta'}</Td>
                    <Td>{String(h.descricao)}{h.motivo_cancelamento ? <span className="block text-[12px] text-muted">{String(h.motivo_cancelamento)}</span> : null}</Td>
                    <Td><Pilula tom={tom}>{rot}</Pilula></Td>
                  </tr>
                )
              })}
            </Tabela>
          )}
        </Painel>
      </div>
    </>
  )
}
