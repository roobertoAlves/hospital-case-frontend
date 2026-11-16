import { Download, Upload } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { useNotice } from '../components/notices'
import { Badge, Button, Empty, Field, Input, Loading, Main, PageHeader, Panel, Table, Td, Th } from '../components/ui'
import { ApiError, openFile, post, readFile } from '../lib/api'
import { formatDateTime } from '../lib/format'
import { useSession } from '../lib/session'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
const MAX_FILE_BYTES = 10 * 1024 * 1024

function size(bytes: unknown) {
  const n = Number(bytes ?? 0)
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
}

/** Profile (name, password, photo) and the Base64 file upload with access control (framework examples). */
export default function Profile() {
  const notify = useNotice()
  const { user, refresh } = useSession()
  const files = useApi<Row[]>('api/files')
  const [name, setName] = useState(user?.nome ?? '')
  const [current, setCurrent] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [photo, setPhoto] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [publicFile, setPublicFile] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await post('api/profile', {
        nome: name, current_password: current, new_password: newPassword, confirm_password: confirm, photo_base64: photo,
      })
      notify(r.message ?? 'Perfil atualizado.')
      setCurrent(''); setNewPassword(''); setConfirm(''); setPhoto('')
      await refresh()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Não foi possível salvar.', false)
    } finally {
      setSaving(false)
    }
  }

  const upload = async (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_FILE_BYTES) { notify('Arquivo maior que 10 MB.', false); return }
    setUploading(true)
    try {
      const r = await post('api/files', { file_base64: await readFile(f), nome_original: f.name, public: publicFile ? '1' : '0' })
      notify(r.message ?? 'Arquivo enviado.')
      files.reload()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Não foi possível enviar.', false)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <>
      <PageHeader title="Perfil e arquivos" subtitle={`${user?.email ?? ''} · ${user?.role_label ?? ''}`} />
      <div className="grid gap-5 xl:grid-cols-[1fr_2fr]">
        <Panel title="Meus dados">
          <form onSubmit={save} className="grid gap-4">
            <Field label="Nome" name="nome" required>
              <Input name="nome" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Foto" name="foto" help="PNG, JPEG, GIF ou WEBP de até 2 MB.">
              <Input name="foto" type="file" accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={async (e) => { const f = e.target.files?.[0]; setPhoto(f ? await readFile(f) : '') }} />
            </Field>
            <p className="text-[13px] text-muted">Para trocar a senha, preencha os três campos. Deixe em branco para manter a atual.</p>
            <Field label="Senha atual" name="current_password">
              <Input name="current_password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </Field>
            <Field label="Nova senha" name="new_password" help="Mínimo de 8 caracteres, com letras e números.">
              <Input name="new_password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </Field>
            <Field label="Confirme a nova senha" name="confirm_password">
              <Input name="confirm_password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
            <Button type="submit" variant="primario" loading={saving} disabled={name.trim().length === 0}>Salvar</Button>
          </form>
        </Panel>
        <Panel title="Arquivos" meta={
          <span className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[13px] text-muted">
              <input type="checkbox" className="size-4 accent-ink" checked={publicFile} onChange={(e) => setPublicFile(e.target.checked)} /> Público
            </label>
            <input ref={fileInput} type="file" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            <Button small icon={Upload} loading={uploading} onClick={() => fileInput.current?.click()}>Enviar arquivo</Button>
          </span>
        } noPadding>
          {files.loading && !files.data ? <div className="p-5"><Loading /></div> : files.error ? <div className="p-5"><Empty>{files.error.message}</Empty></div>
            : (files.data ?? []).length === 0 ? <div className="p-5"><Empty>Nenhum arquivo enviado.</Empty></div> : (
              <Table header={<><Th>Arquivo</Th><Th className="hidden md:table-cell">Dono</Th><Th>Acesso</Th><Th /></>}>
                {(files.data ?? []).map((a) => (
                  <tr key={String(a.hash)}>
                    <Td><Main sub={`${String(a.mime_type ?? '')} · ${size(a.tamanho_bytes)} · ${formatDateTime(a.enviado_em)}`}>{String(a.nome_original)}</Main></Td>
                    <Td className="hidden md:table-cell">{String(a.nome_dono ?? '')}</Td>
                    <Td><Badge tone={String(a.publico) === '1' ? 'accent' : 'neutral'}>{String(a.publico) === '1' ? 'Público' : 'Restrito'}</Badge></Td>
                    <Td className="text-right">
                      <Button small variant="texto" icon={Download} onClick={() => openFile(`api/files/${a.hash}`).catch((e) => notify(e.message, false))}>Abrir</Button>
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
        </Panel>
      </div>
    </>
  )
}
