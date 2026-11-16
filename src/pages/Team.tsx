import { Badge, Empty, Kpi, Loading, Main, PageHeader, Panel, Table, Td, Th } from '../components/ui'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
interface TeamData { users: number; open_tickets: number; files: number; members: Row[] }

/** Manager's team overview (framework example): user, ticket and file counts plus the member list. */
export default function Team() {
  const { data, loading, error } = useApi<TeamData>('api/dashboard/team')
  if (loading && !data) return <Loading />
  if (error || !data) return <Empty>{error?.message}</Empty>
  return (
    <>
      <PageHeader title="Equipe" subtitle="Visão geral de usuários, chamados e documentos." />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Usuários" value={data.users} highlight />
        <Kpi label="Chamados em aberto" value={data.open_tickets} delay={0.05} />
        <Kpi label="Documentos enviados" value={data.files} delay={0.1} />
      </div>
      <Panel title="Integrantes" noPadding>
        <Table header={<><Th>Nome</Th><Th className="hidden md:table-cell">E-mail</Th><Th>Situação</Th></>}>
          {data.members.map((m) => (
            <tr key={String(m.id_usuario)}>
              <Td><Main>{String(m.nome)}</Main></Td>
              <Td className="hidden md:table-cell">{String(m.email)}</Td>
              <Td><Badge tone={String(m.status) === '1' ? 'positive' : 'neutral'}>{String(m.status) === '1' ? 'Ativo' : 'Inativo'}</Badge></Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  )
}
