import { Siren } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useNotice } from '../components/notices'
import { PatientSearch, type SelectedPatient } from '../components/booking'
import { Alert, Button, ButtonLink, Field, FormSection, PageHeader, TextArea } from '../components/ui'
import { ApiError, post } from '../lib/api'

const QUICK = ['Dor no peito', 'Falta de ar', 'Desmaio', 'Febre alta', 'Sangramento', 'Crise convulsiva', 'Dor intensa', 'Queda ou trauma']

export default function EmergencyForm() {
  const navigate = useNavigate()
  const notify = useNotice()
  const [patient, setPatient] = useState<SelectedPatient | null>(null)
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const r = await post('api/appointments/emergency', { id_paciente: patient!.id_paciente, motivo: reason })
      notify(r.message ?? 'Emergência aberta.')
      navigate('/painel')
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Não foi possível abrir a emergência.', false)
    } finally { setSending(false) }
  }

  return (
    <>
      <PageHeader breadcrumb={[{ label: 'Início', to: '/painel' }, { label: 'Emergência' }]} title="Atendimento de emergência"
        subtitle="Para quem chega passando mal, sem consulta marcada. O paciente vai para o topo da fila de triagem e depois para o médico plantonista." />
      <div className="mb-5 max-w-[1100px]"><Alert tone="erro"><strong>Risco imediato de vida?</strong> Chame a enfermagem antes de terminar o cadastro: o registro pode ser feito depois.</Alert></div>
      <form onSubmit={submit} noValidate className="max-w-[1100px]">
        <FormSection title="Paciente" description="Busque por nome ou CPF. Se não tiver cadastro, cadastre só o essencial e volte aqui.">
          <div className="max-w-[540px] sm:col-span-6"><PatientSearch value={patient} onChoose={setPatient} /></div>
        </FormSection>
        <FormSection title="O que está sentindo" description="Toque nos sintomas ou descreva com as palavras do paciente.">
          <div className="flex flex-wrap gap-2 sm:col-span-6">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => setReason((r) => (r.includes(q) ? r : r ? `${r}, ${q.toLowerCase()}` : q))}
                className="rounded-full border border-control px-3 py-1.5 text-[13px] hover:border-brand-600 hover:bg-brand-50">{q}</button>
            ))}
          </div>
          <Field label="Queixa" name="motivo" required className="sm:col-span-6">
            <TextArea name="motivo" rows={3} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </FormSection>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">
          <ButtonLink to="/painel">Cancelar</ButtonLink>
          <Button type="submit" variant="primario" icon={Siren} disabled={!patient || reason.trim().length < 3} loading={sending}>Abrir emergência</Button>
        </div>
      </form>
    </>
  )
}
