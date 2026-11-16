import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useNotice } from '../components/notices'
import { ApiError, post } from './api'

/**
 * Form state + submission to the API. Validation errors (422) come per field in "details" and are
 * shown under each field; the server decides what is valid.
 */
export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const notify = useNotice()
  const navigate = useNavigate()

  const change = <K extends keyof T>(field: K, value: T[K]) => {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field as string]) setErrors((e) => ({ ...e, [field as string]: '' }))
  }

  const submit = (path: string, options?: { body?: () => Record<string, unknown>; after?: (data: Record<string, unknown> | null) => void; redirectTo?: (data: Record<string, unknown> | null) => string }) =>
    async (e?: FormEvent) => {
      e?.preventDefault()
      setSending(true)
      setErrors({})
      try {
        const r = await post<Record<string, unknown> | null>(path, options?.body ? options.body() : values)
        notify(r.message ?? 'Salvo.')
        if (options?.after) options.after(r.data)
        else if (options?.redirectTo) navigate(options.redirectTo(r.data))
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.details) setErrors(err.details)
          notify(err.message, false)
        } else notify('Não foi possível salvar.', false)
      } finally {
        setSending(false)
      }
    }

  return { values, setValues, change, errors, sending, submit }
}
