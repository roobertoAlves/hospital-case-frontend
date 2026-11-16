import { useCallback, useEffect, useState } from 'react'
import { ApiError, get } from './api'

/** Carrega uma leitura da API e recarrega quando a chave (caminho + parametros) muda. */
export function useApi<T>(caminho: string | null, params?: Record<string, string | number | boolean | null | undefined>) {
  const [dados, setDados] = useState<T | null>(null)
  const [erro, setErro] = useState<ApiError | null>(null)
  const [carregando, setCarregando] = useState(true)
  const chave = caminho === null ? null : caminho + JSON.stringify(params ?? {})

  const recarregar = useCallback(async () => {
    if (caminho === null) return
    setCarregando(true)
    try {
      const r = await get<T>(caminho, params)
      setDados(r.data)
      setErro(null)
    } catch (e) {
      setErro(e instanceof ApiError ? e : new ApiError(0, 'ERR', String(e)))
    } finally {
      setCarregando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  useEffect(() => { recarregar() }, [recarregar])

  return { dados, erro, carregando, recarregar, setDados }
}
