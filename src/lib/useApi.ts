import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { ApiError, get } from './api'
import { queryClient } from './queryClient'

type Params = Record<string, string | number | boolean | null | undefined>

export function useApi<T>(path: string | null, params?: Params) {
  const queryKey = ['api', path, params ?? {}] as const
  const query = useQuery<T, ApiError>({
    queryKey,
    enabled: path !== null,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      try {
        return (await get<T>(path as string, params, signal)).data
      } catch (e) {
        throw e instanceof ApiError ? e : new ApiError(0, 'ERR', String(e))
      }
    },
  })

  const { refetch } = query
  const reload = useCallback(async () => { await refetch() }, [refetch])
  const setData = useCallback((value: T | null) => {
    queryClient.setQueryData(queryKey, value ?? undefined)
  }, [JSON.stringify(queryKey)])

  return {
    data: query.data ?? null,
    error: query.error ?? null,
    loading: query.isPending || query.isFetching,
    reload,
    setData,
  }
}
