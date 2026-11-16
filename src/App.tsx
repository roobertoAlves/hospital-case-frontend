import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from 'react-router'
import { Layout } from './components/Layout'
import { LayoutPaciente } from './components/LayoutPaciente'
import { LayoutPublico } from './components/LayoutPublico'
import { Carregando, Vazio } from './components/ui'
import { useSessao, type Usuario } from './lib/sessao'
import { Login, RecuperarSenha, RedefinirSenha, TrocarSenha } from './pages/Acesso'

const Painel = lazy(() => import('./pages/Painel'))
const Pacientes = lazy(() => import('./pages/Pacientes'))
const PacienteFicha = lazy(() => import('./pages/PacienteFicha'))
const PacienteForm = lazy(() => import('./pages/PacienteForm'))
const Historico = lazy(() => import('./pages/Historico'))
const Agenda = lazy(() => import('./pages/Agenda'))
const AgendaForm = lazy(() => import('./pages/AgendaForm'))
const Exames = lazy(() => import('./pages/Exames'))
const ExameForm = lazy(() => import('./pages/ExameForm'))
const Triagem = lazy(() => import('./pages/Triagem'))
const TriagemForm = lazy(() => import('./pages/TriagemForm'))
const Atendimento = lazy(() => import('./pages/Atendimento'))
const AtendimentoTela = lazy(() => import('./pages/AtendimentoTela'))
const Receita = lazy(() => import('./pages/Receita'))
const Profissionais = lazy(() => import('./pages/Profissionais'))
const ProfissionalForm = lazy(() => import('./pages/ProfissionalForm'))
const Especialidades = lazy(() => import('./pages/Especialidades'))
const Auditoria = lazy(() => import('./pages/Auditoria'))
const Admin = lazy(() => import('./pages/Admin'))
const Pedidos = lazy(() => import('./pages/Pedidos'))
const SalaVacinas = lazy(() => import('./pages/SalaVacinas'))
// Site publico e portal do paciente
const Inicio = lazy(() => import('./pages/publico/Inicio'))
const Catalogo = lazy(() => import('./pages/publico/Catalogo'))
const Cadastro = lazy(() => import('./pages/publico/Cadastro'))
const MinhaSaude = lazy(() => import('./pages/paciente/MinhaSaude'))
const MinhasConsultas = lazy(() => import('./pages/paciente/MinhasConsultas'))
const MeusExames = lazy(() => import('./pages/paciente/MeusExames'))
const MinhasVacinas = lazy(() => import('./pages/paciente/MinhasVacinas'))
const MinhasReceitas = lazy(() => import('./pages/paciente/MinhasReceitas'))

export const ehPaciente = (u: Usuario | null) => !!u && u.grupos.includes('paciente')

/** Equipe: logado, sem senha temporaria pendente e nao paciente (o backend tambem bloqueia). */
function Protegida({ children }: { children: ReactNode }) {
  const { carregando, usuario } = useSessao()
  const local = useLocation()
  if (carregando) return <div className="p-8"><Carregando /></div>
  if (!usuario) return <Navigate to="/login" replace state={{ de: local.pathname }} />
  if (usuario.primeiro_acesso) return <Navigate to="/trocar-senha" replace />
  if (ehPaciente(usuario)) return <Navigate to="/minha-saude" replace />
  return <>{children}</>
}

function SoPaciente({ children }: { children: ReactNode }) {
  const { carregando, usuario } = useSessao()
  if (carregando) return <div className="p-8"><Carregando /></div>
  if (!usuario) return <Navigate to="/login" replace />
  if (!ehPaciente(usuario)) return <Navigate to="/painel" replace />
  return <>{children}</>
}

/** "/" : visitante ve o site; paciente vai para Minha saude; equipe para o painel. */
function Raiz() {
  const { carregando, usuario } = useSessao()
  if (carregando) return <div className="p-8"><Carregando /></div>
  if (!usuario) return <LayoutPublico><Suspense fallback={<Carregando />}><Inicio /></Suspense></LayoutPublico>
  return <Navigate to={ehPaciente(usuario) ? '/minha-saude' : '/painel'} replace />
}

const pagina = (el: ReactNode) => <Suspense fallback={<Carregando />}>{el}</Suspense>

const router = createBrowserRouter([
  { path: '/', element: <Raiz /> },
  { path: '/servicos/:aba', element: <LayoutPublico>{pagina(<Catalogo />)}</LayoutPublico> },
  { path: '/cadastro', element: pagina(<Cadastro />) },
  { path: '/login', element: <Login /> },
  { path: '/recuperar-senha', element: <RecuperarSenha /> },
  { path: '/redefinir-senha', element: <RedefinirSenha /> },
  { path: '/trocar-senha', element: <TrocarSenha /> },
  {
    path: '/minha-saude',
    element: <SoPaciente><LayoutPaciente /></SoPaciente>,
    children: [
      { index: true, element: pagina(<MinhaSaude />) },
      { path: 'consultas', element: pagina(<MinhasConsultas />) },
      { path: 'exames', element: pagina(<MeusExames />) },
      { path: 'vacinas', element: pagina(<MinhasVacinas />) },
      { path: 'receitas', element: pagina(<MinhasReceitas />) },
    ],
  },
  { path: '/minha-saude/receitas/:id', element: <SoPaciente>{pagina(<Receita portal />)}</SoPaciente> },
  {
    element: <Protegida><Layout /></Protegida>,
    children: [
      { path: 'painel', element: pagina(<Painel />) },
      { path: 'pacientes', element: pagina(<Pacientes />) },
      { path: 'pacientes/novo', element: pagina(<PacienteForm />) },
      { path: 'pacientes/:id', element: pagina(<PacienteFicha />) },
      { path: 'pacientes/:id/editar', element: pagina(<PacienteForm />) },
      { path: 'pacientes/:id/historico', element: pagina(<Historico />) },
      { path: 'agenda', element: pagina(<Agenda />) },
      { path: 'agenda/nova', element: pagina(<AgendaForm />) },
      { path: 'agenda/:id/remarcar', element: pagina(<AgendaForm />) },
      { path: 'exames', element: pagina(<Exames />) },
      { path: 'exames/novo', element: pagina(<ExameForm />) },
      { path: 'pedidos', element: pagina(<Pedidos />) },
      { path: 'vacinas', element: pagina(<SalaVacinas />) },
      { path: 'triagem', element: pagina(<Triagem />) },
      { path: 'triagem/:id', element: pagina(<TriagemForm />) },
      { path: 'atendimento', element: pagina(<Atendimento />) },
      { path: 'atendimento/:id', element: pagina(<AtendimentoTela />) },
      { path: 'profissionais', element: pagina(<Profissionais />) },
      { path: 'profissionais/novo', element: pagina(<ProfissionalForm />) },
      { path: 'profissionais/:id', element: pagina(<ProfissionalForm />) },
      { path: 'especialidades', element: pagina(<Especialidades />) },
      { path: 'auditoria', element: pagina(<Auditoria />) },
      { path: 'admin', element: pagina(<Admin />) },
      { path: '*', element: <Vazio>Página não encontrada.</Vazio> },
    ],
  },
  { path: '/receitas/:id', element: <Protegida>{pagina(<Receita />)}</Protegida> },
])

export default function App() {
  return <RouterProvider router={router} />
}
