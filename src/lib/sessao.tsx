import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { aoErroDeSessao, definirCsrf, get, post } from './api'

export interface Usuario {
  id: number
  nome: string
  email: string
  grupos: string[]
  permissoes: string[]
  perfil: string
  primeiro_acesso: boolean
}

interface SessaoApi {
  csrf: string
  autenticado: boolean
  usuario?: Usuario
}

interface SessaoCtx {
  carregando: boolean
  usuario: Usuario | null
  pode: (permissao: string) => boolean
  noGrupo: (grupo: string) => boolean
  atualizar: () => Promise<Usuario | null>
  entrar: (email: string, senha: string) => Promise<Usuario | null>
  sair: () => Promise<void>
}

const Ctx = createContext<SessaoCtx | null>(null)

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  const atualizar = useCallback(async () => {
    const { data } = await get<SessaoApi>('api/sessao')
    definirCsrf(data.csrf)
    const u = data.autenticado && data.usuario ? data.usuario : null
    setUsuario(u)
    return u
  }, [])

  useEffect(() => {
    atualizar().catch(() => setUsuario(null)).finally(() => setCarregando(false))
    return aoErroDeSessao((e) => {
      if (e.status === 401) setUsuario(null)
      else atualizar().catch(() => undefined)
    })
  }, [atualizar])

  const entrar = useCallback(async (email: string, senha: string) => {
    await post('login', { email, senha })
    return atualizar() // o login gira o token CSRF e carrega permissoes
  }, [atualizar])

  const sair = useCallback(async () => {
    try {
      await post('api/sair')
    } finally {
      setUsuario(null)
      await atualizar().catch(() => undefined)
    }
  }, [atualizar])

  const valor = useMemo<SessaoCtx>(() => ({
    carregando,
    usuario,
    pode: (p) => !!usuario && usuario.permissoes.includes(p),
    noGrupo: (g) => !!usuario && usuario.grupos.includes(g),
    atualizar,
    entrar,
    sair,
  }), [carregando, usuario, atualizar, entrar, sair])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useSessao() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSessao fora do SessaoProvider')
  return c
}
