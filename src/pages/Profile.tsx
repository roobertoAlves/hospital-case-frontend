import { AnimatePresence, motion } from 'motion/react'
import { Camera, Download, KeyRound, Upload } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { useNotice } from '../components/notices'
import { Avatar, Badge, Button, Empty, Field, Input, Loading, Main, PageHeader, Panel, Table, Td, Th } from '../components/ui'
import { ApiError, openFile, post, readFile } from '../lib/api'
import { formatDateTime } from '../lib/format'
import { useSession } from '../lib/session'
import { useApi } from '../lib/useApi'

type Row = Record<string, unknown>
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

function size(bytes: unknown) {
  const n = Number(bytes ?? 0)
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
}

/** Profile (name, photo and password) and the Base64 file upload with access control. */
export default function Profile() {
  const notify = useNotice()
  const { user, refresh } = useSession()
  const files = useApi<Row[]>('api/files')
  const [name, setName] = useState(user?.nome ?? '')
  const [photo, setPhoto] = useState('')
  const [changePassword, setChangePassword] = useState(false)
  const [current, setCurrent] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [publicFile, setPublicFile] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return
    if (!/^image\/(png|jpeg|gif|webp)$/.test(f.type)) { notify('Escolha uma imagem PNG, JPEG, GIF ou WEBP.', false); return }
    if (f.size > MAX_PHOTO_BYTES) { notify('A foto deve ter até 2 MB.', false); return }
    setPhoto(await readFile(f))
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await post('api/profile', {
        nome: name, photo_base64: photo,
        ...(changePassword ? { current_password: current, new_password: newPassword, confirm_password: confirm } : {}),
      })
      notify(r.message ?? 'Perfil atualizado.')
      setPhoto(''); setCurrent(''); setNewPassword(''); setConfirm(''); setChangePassword(false)
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

  const passwordReady = !changePassword || (current && newPassword && confirm)

  return (
    <>
      <PageHeader title="Meu perfil" subtitle="Seus dados de acesso, sua foto e os arquivos que você enviou." />
      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Panel title="Dados pessoais">
          <form onSubmit={save} className="grid gap-5">
            <div className="flex items-center gap-4 rounded-[var(--radius-card)] bg-frame p-4">
              <div className="relative">
                <Avatar name={name || user?.nome} photo={photo || user?.foto} size="size-20" className="text-2xl" />
                <button type="button" onClick={() => photoInput.current?.click()} aria-label="Trocar foto"
                  className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm hover:bg-raised">
                  <Camera className="size-4" />
                </button>
                <input ref={photoInput} type="file" className="sr-only" accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = '' }} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[17px] font-semibold">{user?.nome}</p>
                <p className="truncate text-[13px] text-muted">{user?.email}</p>
                <div className="mt-1.5"><Badge tone="accent">{user?.role_label}</Badge></div>
                {photo && <p className="mt-1.5 text-[12px] text-faint">Nova foto escolhida: salve para aplicar.</p>}
              </div>
            </div>

            <Field label="Nome completo" name="nome" required>
              <Input name="nome" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="E-mail de acesso" name="email" help="O e-mail não pode ser alterado por aqui; fale com a administração.">
              <Input name="email" value={user?.email ?? ''} disabled />
            </Field>

            <div className="rounded-[var(--radius-card)] border border-line">
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
                <input type="checkbox" className="size-4 accent-ink" checked={changePassword} onChange={(e) => setChangePassword(e.target.checked)} />
                <KeyRound className="size-4 text-muted" />
                <span className="font-medium">Alterar senha</span>
              </label>
              <AnimatePresence initial={false}>
                {changePassword && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="grid gap-4 border-t border-line px-4 py-4">
                      <Field label="Senha atual" name="current_password" required>
                        <Input name="current_password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
                      </Field>
                      <Field label="Nova senha" name="new_password" required help="Mínimo de 8 caracteres, com letras e números.">
                        <Input name="new_password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                      </Field>
                      <Field label="Confirme a nova senha" name="confirm_password" required>
                        <Input name="confirm_password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                      </Field>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primario" loading={saving} disabled={name.trim().length === 0 || !passwordReady}>Salvar alterações</Button>
            </div>
          </form>
        </Panel>

        <Panel title="Meus arquivos" meta={
          <span className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[13px] text-muted">
              <input type="checkbox" className="size-4 accent-ink" checked={publicFile} onChange={(e) => setPublicFile(e.target.checked)} /> Visível para todos
            </label>
            <input ref={fileInput} type="file" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            <Button small icon={Upload} loading={uploading} onClick={() => fileInput.current?.click()}>Enviar arquivo</Button>
          </span>
        } noPadding>
          {files.loading && !files.data ? <div className="p-5"><Loading /></div> : files.error ? <div className="p-5"><Empty>{files.error.message}</Empty></div>
            : (files.data ?? []).length === 0 ? <div className="p-5"><Empty>Nenhum arquivo enviado.</Empty></div> : (
              <Table header={<><Th>Arquivo</Th><Th className="hidden md:table-cell">Enviado por</Th><Th>Acesso</Th><Th /></>}>
                {(files.data ?? []).map((a) => (
                  <tr key={String(a.hash)}>
                    <Td><Main sub={`${size(a.tamanho_bytes)} · ${formatDateTime(a.enviado_em)}`}>{String(a.nome_original)}</Main></Td>
                    <Td className="hidden md:table-cell">{String(a.nome_dono ?? '')}</Td>
                    <Td><Badge tone={String(a.publico) === '1' ? 'accent' : 'neutral'}>{String(a.publico) === '1' ? 'Todos' : 'Restrito'}</Badge></Td>
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
