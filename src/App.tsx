import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from 'react-router'
import { Layout } from './components/Layout'
import { PatientLayout } from './components/PatientLayout'
import { PublicLayout } from './components/PublicLayout'
import { AppShellSkeleton, PortalSkeleton, PublicSkeleton, Loading, Empty } from './components/ui'
import { homeFor } from './lib/menu'
import { useSession, type User } from './lib/session'
import { Login, ForgotPassword, ResetPassword, ChangePassword } from './pages/Access'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Patients = lazy(() => import('./pages/Patients'))
const PatientRecord = lazy(() => import('./pages/PatientRecord'))
const PatientForm = lazy(() => import('./pages/PatientForm'))
const PatientHistory = lazy(() => import('./pages/PatientHistory'))
const Appointments = lazy(() => import('./pages/Appointments'))
const AppointmentForm = lazy(() => import('./pages/AppointmentForm'))
const Exams = lazy(() => import('./pages/Exams'))
const ExamForm = lazy(() => import('./pages/ExamForm'))
const TriageQueue = lazy(() => import('./pages/TriageQueue'))
const TriageForm = lazy(() => import('./pages/TriageForm'))
const EncounterQueue = lazy(() => import('./pages/EncounterQueue'))
const EncounterScreen = lazy(() => import('./pages/EncounterScreen'))
const PrescriptionPrint = lazy(() => import('./pages/PrescriptionPrint'))
const CertificatePrint = lazy(() => import('./pages/CertificatePrint'))
const EmergencyForm = lazy(() => import('./pages/EmergencyForm'))
const ExamCatalog = lazy(() => import('./pages/ExamCatalog'))
const Professionals = lazy(() => import('./pages/Professionals'))
const ProfessionalForm = lazy(() => import('./pages/ProfessionalForm'))
const Specialties = lazy(() => import('./pages/Specialties'))
const AuditLog = lazy(() => import('./pages/AuditLog'))
const Admin = lazy(() => import('./pages/Admin'))
const MedicalOrders = lazy(() => import('./pages/MedicalOrders'))
const VaccinationRoom = lazy(() => import('./pages/VaccinationRoom'))
const Tickets = lazy(() => import('./pages/Tickets'))
const Profile = lazy(() => import('./pages/Profile'))
const Team = lazy(() => import('./pages/Team'))
const Home = lazy(() => import('./pages/public/Home'))
const Catalog = lazy(() => import('./pages/public/Catalog'))
const SignUp = lazy(() => import('./pages/public/SignUp'))
const MyHealth = lazy(() => import('./pages/patient/MyHealth'))
const MyAppointments = lazy(() => import('./pages/patient/MyAppointments'))
const MyExams = lazy(() => import('./pages/patient/MyExams'))
const MyVaccines = lazy(() => import('./pages/patient/MyVaccines'))
const MyPrescriptions = lazy(() => import('./pages/patient/MyPrescriptions'))
const MyDocuments = lazy(() => import('./pages/patient/MyDocuments'))

export const isPatient = (u: User | null) => !!u && u.groups.includes('paciente')

function Protected({ children }: { children: ReactNode }) {
  const { loading, user } = useSession()
  const local = useLocation()
  if (loading) return <AppShellSkeleton />
  if (!user) return <Navigate to="/login" replace state={{ de: local.pathname }} />
  if (user.primeiro_acesso) return <Navigate to="/trocar-senha" replace />
  if (isPatient(user)) return <Navigate to="/minha-saude" replace />
  return <>{children}</>
}

function PatientOnly({ children }: { children: ReactNode }) {
  const { loading, user } = useSession()
  if (loading) return <PortalSkeleton />
  if (!user) return <Navigate to="/login" replace />
  if (!isPatient(user)) return <Navigate to={homeFor(user.groups)} replace />
  return <>{children}</>
}

function Root() {
  const { loading, user } = useSession()
  if (loading) return <PublicSkeleton />
  if (!user) return <Suspense fallback={<PublicSkeleton />}><PublicLayout><Home /></PublicLayout></Suspense>
  return <Navigate to={isPatient(user) ? '/minha-saude' : homeFor(user.groups)} replace />
}

const page = (el: ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>

const router = createBrowserRouter([
  { path: '/', element: <Root /> },
  { path: '/servicos/:aba', element: <PublicLayout>{page(<Catalog />)}</PublicLayout> },
  { path: '/cadastro', element: page(<SignUp />) },
  { path: '/login', element: <Login /> },
  { path: '/recuperar-senha', element: <ForgotPassword /> },
  { path: '/redefinir-senha', element: <ResetPassword /> },
  { path: '/trocar-senha', element: <ChangePassword /> },
  {
    path: '/minha-saude',
    element: <PatientOnly><PatientLayout /></PatientOnly>,
    children: [
      { index: true, element: page(<MyHealth />) },
      { path: 'consultas', element: page(<MyAppointments />) },
      { path: 'exames', element: page(<MyExams />) },
      { path: 'vacinas', element: page(<MyVaccines />) },
      { path: 'receitas', element: page(<MyPrescriptions />) },
      { path: 'documentos', element: page(<MyDocuments />) },
    ],
  },
  { path: '/minha-saude/receitas/:id', element: <PatientOnly>{page(<PrescriptionPrint portal />)}</PatientOnly> },
  { path: '/minha-saude/atestados/:id', element: <PatientOnly>{page(<CertificatePrint portal />)}</PatientOnly> },
  {
    element: <Protected><Layout /></Protected>,
    children: [
      { path: 'painel', element: page(<Dashboard />) },
      { path: 'pacientes', element: page(<Patients />) },
      { path: 'pacientes/novo', element: page(<PatientForm />) },
      { path: 'pacientes/:id', element: page(<PatientRecord />) },
      { path: 'pacientes/:id/editar', element: page(<PatientForm />) },
      { path: 'pacientes/:id/historico', element: page(<PatientHistory />) },
      { path: 'agenda', element: page(<Appointments />) },
      { path: 'agenda/nova', element: page(<AppointmentForm />) },
      { path: 'agenda/:id/remarcar', element: page(<AppointmentForm />) },
      { path: 'exames', element: page(<Exams />) },
      { path: 'exames/novo', element: page(<ExamForm />) },
      { path: 'emergencia', element: page(<EmergencyForm />) },
      { path: 'catalogo-exames', element: page(<ExamCatalog />) },
      { path: 'pedidos', element: page(<MedicalOrders />) },
      { path: 'vacinas', element: page(<VaccinationRoom />) },
      { path: 'triagem', element: page(<TriageQueue />) },
      { path: 'triagem/:id', element: page(<TriageForm />) },
      { path: 'atendimento', element: page(<EncounterQueue />) },
      { path: 'atendimento/:id', element: page(<EncounterScreen />) },
      { path: 'profissionais', element: page(<Professionals />) },
      { path: 'profissionais/novo', element: page(<ProfessionalForm />) },
      { path: 'profissionais/:id', element: page(<ProfessionalForm />) },
      { path: 'especialidades', element: page(<Specialties />) },
      { path: 'auditoria', element: page(<AuditLog />) },
      { path: 'admin', element: page(<Admin />) },
      { path: 'chamados', element: page(<Tickets />) },
      { path: 'perfil', element: page(<Profile />) },
      { path: 'equipe', element: page(<Team />) },
      { path: '*', element: <Empty>Página não encontrada.</Empty> },
    ],
  },
  { path: '/receitas/:id', element: <Protected>{page(<PrescriptionPrint />)}</Protected> },
  { path: '/atestados/:id', element: <Protected>{page(<CertificatePrint />)}</Protected> },
])

export default function App() {
  return <RouterProvider router={router} />
}
