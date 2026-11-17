import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onSessionError, setCsrf, get, post } from './api'

export interface User {
  id: number
  nome: string
  email: string
  foto?: string | null
  groups: string[]
  permissions: string[]
  role_label: string
  primeiro_acesso: boolean
}

interface SessionApi {
  csrf: string
  authenticated: boolean
  user?: User
}

interface SessionContextValue {
  loading: boolean
  user: User | null
  can: (permission: string) => boolean
  inGroup: (group: string) => boolean
  refresh: () => Promise<User | null>
  login: (email: string, password: string) => Promise<User | null>
  logout: () => Promise<void>
}

const Ctx = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  const refresh = useCallback(async () => {
    const { data } = await get<SessionApi>('api/auth/session')
    setCsrf(data.csrf)
    const u = data.authenticated && data.user ? data.user : null
    setUser(u)
    return u
  }, [])

  useEffect(() => {
    refresh().catch(() => setUser(null)).finally(() => setLoading(false))
    return onSessionError((e) => {
      if (e.status === 401) setUser(null)
      else refresh().catch(() => undefined)
    })
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    await post('api/auth/login', { email, password })
    return refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    try {
      await post('api/auth/logout')
    } finally {
      setUser(null)
      await refresh().catch(() => undefined)
    }
  }, [refresh])

  const value = useMemo<SessionContextValue>(() => ({
    loading,
    user,
    can: (p) => !!user && user.permissions.includes(p),
    inGroup: (g) => !!user && user.groups.includes(g),
    refresh,
    login,
    logout,
  }), [loading, user, refresh, login, logout])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSessao fora do SessaoProvider')
  return c
}
