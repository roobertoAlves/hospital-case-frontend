import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from 'react-router'
import { Layout } from './components/Layout'
import { Carregando, Vazio } from './components/ui'
import { useSessao } from './lib/sessao'
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

/** So entra logado; com senha temporaria, so a troca de senha (o backend tambem bloqueia). */
function Protegida({ children }: { children: ReactNode }) {
  const { carregando, usuario } = useSessao()
  const local = useLocation()
  if (carregando) return <div className="p-8"><Carregando /></div>
  if (!usuario) return <Navigate to="/login" replace state={{ de: local.pathname }} />
  if (usuario.primeiro_acesso) return <Navigate to="/trocar-senha" replace />
  return <>{children}</>
}

const pagina = (el: ReactNode) => <Suspense fallback={<Carregando />}>{el}</Suspense>

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/recuperar-senha', element: <RecuperarSenha /> },
  { path: '/redefinir-senha', element: <RedefinirSenha /> },
  { path: '/trocar-senha', element: <TrocarSenha /> },
  {
    path: '/',
    element: <Protegida><Layout /></Protegida>,
    children: [
      { index: true, element: pagina(<Painel />) },
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
