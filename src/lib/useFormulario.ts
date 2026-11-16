import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAviso } from '../components/avisos'
import { ApiError, post } from './api'

/**
 * Estado de formulario + envio para a API. Erros de validacao (422) vem por campo em
 * "details" e aparecem embaixo de cada campo; o servidor e quem decide o que e valido.
 */
export function useFormulario<T extends Record<string, unknown>>(inicial: T) {
  const [valores, setValores] = useState<T>(inicial)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const avisar = useAviso()
  const navigate = useNavigate()

  const mudar = <K extends keyof T>(campo: K, valor: T[K]) => {
    setValores((v) => ({ ...v, [campo]: valor }))
    if (erros[campo as string]) setErros((e) => ({ ...e, [campo as string]: '' }))
  }

  const enviar = (caminho: string, opcoes?: { corpo?: () => Record<string, unknown>; depois?: (data: Record<string, unknown> | null) => void }) =>
    async (e?: FormEvent) => {
      e?.preventDefault()
      setEnviando(true)
      setErros({})
      try {
        const r = await post<Record<string, unknown> | null>(caminho, opcoes?.corpo ? opcoes.corpo() : valores)
        avisar(r.message ?? 'Salvo.')
        if (opcoes?.depois) opcoes.depois(r.data)
        else if (r.data && typeof r.data.redirect === 'string') navigate('/' + r.data.redirect)
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.details) setErros(err.details)
          avisar(err.message, false)
        } else avisar('Não foi possível salvar.', false)
      } finally {
        setEnviando(false)
      }
    }

  return { valores, setValores, mudar, erros, enviando, enviar }
}
