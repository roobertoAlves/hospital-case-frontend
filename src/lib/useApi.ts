import { useCallback, useEffect, useState } from 'react'
import { ApiError, get } from './api'

/** Carrega uma leitura da API e recarrega quando a chave (caminho + parametros) muda. */
export function useApi<T>(path: string | null, params?: Record<string, string | number | boolean | null | undefined>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)
  const key = path === null ? null : path + JSON.stringify(params ?? {})

  const reload = useCallback(async () => {
    if (path === null) return
    setLoading(true)
    try {
      const r = await get<T>(path, params)
      setData(r.data)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'ERR', String(e)))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => { reload() }, [reload])

  return { data, error, loading, reload, setData }
}
