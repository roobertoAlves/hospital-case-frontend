import { IdCard, HeartPulse, Plus, Stethoscope } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useAviso } from '../components/avisos'
import { Alerta, Botao, BotaoLink, Cabecalho, Campo, Carregando, Entrada, Painel, SecaoForm, Seletor, Vazio, cx } from '../components/ui'
import { ApiError, post } from '../lib/api'
import { DIAS_SEMANA } from '../lib/formato'
import { mascaraTelefone } from '../lib/mascaras'
import { useSessao } from '../lib/sessao'
import { useApi } from '../lib/useApi'
import { useFormulario } from '../lib/useFormulario'

type Linha = Record<string, unknown>
interface Dados { profissional: Linha; especialidades: Linha[]; usuarios: Linha[] }
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')
const CAMPOS = ['tipo', 'nome', 'email', 'telefone', 'crm', 'crm_uf', 'duracao_consulta_min', 'coren', 'coren_uf', 'cargo', 'id_usuario', 'criar_acesso'] as const
type Valores = Record<(typeof CAMPOS)[number], string>
interface Faixa { dia_semana: string; hora_inicio: string; hora_fim: string }

export default function ProfissionalForm() {
  const { id } = useParams()
  const edicao = !!id
  const [params] = useSearchParams()
  const { pode } = useSessao()
  const avisar = useAviso()
  const { dados, carregando, erro, recarregar } = useApi<Dados>(edicao ? `api/profissionais/${id}` : 'api/profissionais/opcoes', edicao ? undefined : { tipo: params.get('tipo') })
  const f = useFormulario<Valores>(Object.fromEntries(CAMPOS.map((c) => [c, ''])) as Valores)
  const [esp, setEsp] = useState<string[]>([])
  const [faixas, setFaixas] = useState<Faixa[]>([])
  const [errosFaixa, setErrosFaixa] = useState<Record<string, string>>({})
  const [salvandoFaixas, setSalvandoFaixas] = useState(false)

  useEffect(() => {
    if (!dados) return
    const p = dados.profissional
    const v = Object.fromEntries(CAMPOS.map((c) => [c, p[c] == null ? '' : String(p[c])])) as Valores
    v.duracao_consulta_min = v.duracao_consulta_min || '30'
    v.criar_acesso = ''
    f.setValores(v)
    setEsp(((p.ids_especialidades as unknown[]) ?? []).map(String))
    setFaixas(((p.disponibilidades as Linha[]) ?? []).map((x) => ({ dia_semana: String(x.dia_semana), hora_inicio: String(x.hora_inicio), hora_fim: String(x.hora_fim) })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados])

  if (carregando && !dados) return <Carregando />
  if (erro || !dados) return <Vazio>{erro?.message ?? 'Profissional não encontrado.'}</Vazio>
  const p = dados.profissional
  const tipo = f.valores.tipo || 'medico'
  const medico = tipo === 'medico', enfermeiro = tipo === 'enfermeiro'
  const ativo = !edicao || String(p.ativo) === '1'
  const futuras = Number(p.consultas_futuras ?? 0)

  const situacao = async () => {
    try { const r = await post(`api/profissionais/${id}/situacao`, { ativo: ativo ? '0' : '1' }); avisar(r.message ?? 'Feito.'); recarregar() }
    catch (e) { avisar(e instanceof ApiError ? e.message : 'Não foi possível alterar.', false) }
  }
  const salvarFaixas = async () => {
    setSalvandoFaixas(true); setErrosFaixa({})
    try { const r = await post(`api/profissionais/${id}/disponibilidade`, { faixas }); avisar(r.message ?? 'Disponibilidade salva.') }
    catch (e) { if (e instanceof ApiError) { setErrosFaixa(e.details ?? {}); avisar(e.message, false) } }
    finally { setSalvandoFaixas(false) }
  }

  const campo = (c: keyof Valores, rotulo: string, opts: { largura?: string; obrigatorio?: boolean; max?: number; tipoInput?: string; ajuda?: string; mascara?: (v: string) => string } = {}) => (
    <Campo rotulo={rotulo} nome={c} obrigatorio={opts.obrigatorio} erro={f.erros[c]} ajuda={opts.ajuda} className={opts.largura ?? 'sm:col-span-3'}>
      <Entrada name={c} type={opts.tipoInput ?? 'text'} maxLength={opts.max} value={f.valores[c]} invalido={!!f.erros[c]}
        onChange={(e) => f.mudar(c, opts.mascara ? opts.mascara(e.target.value) : e.target.value)} />
    </Campo>
  )
  const uf = (c: 'crm_uf' | 'coren_uf') => (
    <Campo rotulo="UF" nome={c} obrigatorio erro={f.erros[c]} className="sm:col-span-1">
      <Seletor name={c} value={f.valores[c]} invalido={!!f.erros[c]} onChange={(e) => f.mudar(c, e.target.value)}>
        <option value="">UF</option>{UFS.map((u) => <option key={u}>{u}</option>)}
      </Seletor>
    </Campo>
  )
  const TIPOS = [{ id: 'medico', rotulo: 'Médico', icone: Stethoscope }, { id: 'enfermeiro', rotulo: 'Enfermeiro', icone: HeartPulse }, { id: 'funcionario', rotulo: 'Funcionário (recepção)', icone: IdCard }]

  return (
    <>
      <Cabecalho
        trilha={[{ rotulo: 'Profissionais', to: '/profissionais' }, { rotulo: edicao ? String(p.nome) : 'Novo' }]}
        titulo={edicao ? String(p.nome) : 'Cadastrar profissional'}
        subtitulo={edicao ? `${medico ? 'Médico' : enfermeiro ? 'Enfermeiro' : 'Funcionário'} · ${ativo ? 'ativo' : 'inativo'}` : 'Campos com * são obrigatórios.'}
        acoes={edicao && <Botao variante={ativo ? 'perigo' : 'secundario'} onClick={situacao}>{ativo ? 'Inativar' : 'Reativar'}</Botao>}
      />
      {edicao && !ativo && <div className="mb-4"><Alerta>Profissional inativo: não aparece no agendamento nem nas filas, e o acesso dele não abre telas clínicas.</Alerta></div>}
      <form noValidate className="max-w-[1100px]" onSubmit={f.enviar(edicao ? `api/profissionais/${id}` : 'api/profissionais', { corpo: () => ({ ...f.valores, tipo, especialidades: esp.join(',') }) })}>
        <SecaoForm titulo="Tipo" descricao={edicao ? 'O tipo não muda depois do cadastro.' : 'Define o registro profissional e o perfil de acesso.'}>
          {edicao ? <p className="font-medium sm:col-span-6">{medico ? 'Médico' : enfermeiro ? 'Enfermeiro' : 'Funcionário'}</p> : (
            <div className="grid gap-2 sm:col-span-6 sm:grid-cols-3" role="radiogroup" aria-label="Tipo de profissional">
              {TIPOS.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={tipo === t.id} onClick={() => f.mudar('tipo', t.id)}
                  className={cx('flex items-center gap-3 rounded-[var(--radius-card)] border p-3.5 text-left transition-all', tipo === t.id ? 'border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-control')}>
                  <t.icone className="size-5 text-brand-700" /> <span className="font-medium">{t.rotulo}</span>
                </button>
              ))}
            </div>
          )}
        </SecaoForm>
        <SecaoForm titulo="Identificação e contato" descricao="Nome como aparece na agenda, nas filas e nas receitas.">
          {campo('nome', 'Nome completo', { largura: 'sm:col-span-4', obrigatorio: true, max: 150 })}
          {campo('telefone', 'Telefone', { largura: 'sm:col-span-2', mascara: mascaraTelefone })}
          {campo('email', 'E-mail', { largura: 'sm:col-span-4', max: 150, tipoInput: 'email', ajuda: 'Obrigatório se for criar o acesso ao sistema.' })}
        </SecaoForm>
        <SecaoForm titulo={medico ? 'Registro e especialidades' : enfermeiro ? 'Registro profissional' : 'Cargo'} descricao={medico ? 'CRM e UF não se repetem. Só especialidades ativas aparecem.' : enfermeiro ? 'COREN e UF não se repetem.' : 'Função do funcionário na unidade.'}>
          {medico && <>
            {campo('crm', 'CRM', { largura: 'sm:col-span-2', obrigatorio: true, max: 10 })}
            {uf('crm_uf')}
            <Campo rotulo="Duração da consulta" nome="duracao_consulta_min" obrigatorio erro={f.erros.duracao_consulta_min} ajuda="Define a grade de horários do agendamento." className="sm:col-span-2">
              <Seletor name="duracao_consulta_min" value={f.valores.duracao_consulta_min} onChange={(e) => f.mudar('duracao_consulta_min', e.target.value)}>
                {[...new Set([15, 20, 30, 40, 45, 60, Number(f.valores.duracao_consulta_min) || 30])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m} minutos</option>)}
              </Seletor>
            </Campo>
            <fieldset className="sm:col-span-6">
              <legend className="mb-2 text-[13px] font-medium">Especialidades <span className="text-negative">*</span></legend>
              <div className="flex flex-wrap gap-2">
                {dados.especialidades.map((e) => {
                  const v = String(e.id_especialidade), on = esp.includes(v)
                  return (
                    <button key={v} type="button" role="checkbox" aria-checked={on} onClick={() => setEsp(on ? esp.filter((x) => x !== v) : [...esp, v])}
                      className={cx('rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors', on ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-line hover:border-control')}>
                      {String(e.nome)}
                    </button>
                  )
                })}
              </div>
              {f.erros.especialidades && <p className="mt-1.5 text-[12px] text-negative">{f.erros.especialidades}</p>}
              <Link to="/especialidades" className="mt-2 inline-block text-[12px] text-brand-700 hover:underline">Gerenciar especialidades</Link>
            </fieldset>
          </>}
          {enfermeiro && <>{campo('coren', 'COREN', { largura: 'sm:col-span-2', obrigatorio: true, max: 12 })}{uf('coren_uf')}</>}
          {!medico && !enfermeiro && campo('cargo', 'Cargo', { obrigatorio: true, max: 80 })}
        </SecaoForm>
        <SecaoForm titulo="Acesso ao sistema" descricao={`Perfil ${medico ? 'Médico' : enfermeiro ? 'Enfermagem' : 'Recepção'}. Um usuário só se vincula a um profissional.`}>
          <Campo rotulo="Usuário vinculado" nome="id_usuario" erro={f.erros.id_usuario} ajuda="Só usuários ativos ainda sem profissional." className="sm:col-span-4">
            <Seletor name="id_usuario" value={f.valores.id_usuario} onChange={(e) => f.mudar('id_usuario', e.target.value)}>
              <option value="">Sem usuário vinculado</option>
              {dados.usuarios.map((u) => <option key={String(u.id_usuario)} value={String(u.id_usuario)}>{String(u.nome)} · {String(u.email)}</option>)}
            </Seletor>
          </Campo>
          {!edicao && (
            <label className="flex items-start gap-2.5 sm:col-span-6">
              <input type="checkbox" className="mt-0.5 size-4 accent-ink" checked={f.valores.criar_acesso === '1'} onChange={(e) => f.mudar('criar_acesso', e.target.checked ? '1' : '')} />
              <span>Criar um acesso novo com o e-mail acima
                <span className="block text-[12px] text-faint">O usuário recebe uma senha temporária por e-mail e troca no primeiro login. A senha não aparece nesta tela.</span></span>
            </label>
          )}
        </SecaoForm>
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <BotaoLink to="/profissionais">Voltar</BotaoLink>
          <Botao type="submit" variante="primario" carregando={f.enviando}>{edicao ? 'Salvar alterações' : 'Cadastrar profissional'}</Botao>
        </div>
      </form>

      {edicao && medico && (
        <Painel titulo="Disponibilidade semanal" meta={`${futuras} ${futuras === 1 ? 'consulta agendada' : 'consultas agendadas'} daqui para frente`} className="mt-8 max-w-[1100px]">
          <p className="mb-4 text-[13px] text-muted">O agendamento só oferece horários dentro destas faixas. Consultas já marcadas fora da nova grade continuam valendo.</p>
          {faixas.length === 0 && <p className="mb-3 text-muted">Sem faixas: o médico não recebe agendamentos.</p>}
          <div className="space-y-2">
            {faixas.map((fx, i) => (
              <div key={i}>
                <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                  <Seletor aria-label="Dia da semana" disabled={!pode('agenda.disponibilidade.manage')} value={fx.dia_semana} onChange={(e) => setFaixas(faixas.map((x, j) => (j === i ? { ...x, dia_semana: e.target.value } : x)))}>
                    {DIAS_SEMANA.map((d, k) => <option key={d} value={k + 1}>{d}</option>)}
                  </Seletor>
                  <Entrada aria-label="Início" type="time" step={300} value={fx.hora_inicio} onChange={(e) => setFaixas(faixas.map((x, j) => (j === i ? { ...x, hora_inicio: e.target.value } : x)))} />
                  <Entrada aria-label="Fim" type="time" step={300} value={fx.hora_fim} onChange={(e) => setFaixas(faixas.map((x, j) => (j === i ? { ...x, hora_fim: e.target.value } : x)))} />
                  <Botao variante="perigoTexto" onClick={() => setFaixas(faixas.filter((_, j) => j !== i))}>Remover</Botao>
                </div>
                {errosFaixa[`faixa_${i}`] && <p className="mt-1 text-[12px] text-negative">{errosFaixa[`faixa_${i}`]}</p>}
              </div>
            ))}
          </div>
          {pode('agenda.disponibilidade.manage') && (
            <div className="mt-4 flex gap-2">
              <Botao icone={Plus} onClick={() => setFaixas([...faixas, { dia_semana: '1', hora_inicio: '08:00', hora_fim: '12:00' }])}>Adicionar faixa</Botao>
              <Botao variante="primario" carregando={salvandoFaixas} onClick={salvarFaixas}>Salvar disponibilidade</Botao>
            </div>
          )}
        </Painel>
      )}
    </>
  )
}
