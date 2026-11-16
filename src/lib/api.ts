/**
 * Cliente da API do backend (hospital-case-backend).
 *
 * - Em desenvolvimento a base e "/hospital-case-backend" e o Vite repassa para o Tomcat
 *   (mesma origem: o cookie de sessao vai sozinho). VITE_API_BASE troca a base no build.
 * - Toda requisicao que altera dados leva o token CSRF no cabecalho X-CSRF-Token; o token vem
 *   de GET /api/sessao e e renovado depois do login.
 * - Respostas seguem o JsonResponse do backend: { status, code, message, data } ou
 *   { status: false, error, message, details }.
 */
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? '/hospital-case-backend'

export class ApiError extends Error {
  status: number
  code: string
  details: Record<string, string> | undefined
  data: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details && typeof details === 'object' && !Array.isArray(details)
      ? (details as Record<string, string>) : undefined
    this.data = details
  }
}

export interface ApiResponse<T> {
  data: T
  message: string | null
}

let csrf = ''
export function setCsrf(token: string) {
  csrf = token
}

type Listener = (e: ApiError) => void
const listeners = new Set<Listener>()
/** Avisa a aplicacao de 401 (sessao expirou) e de troca de senha obrigatoria. */
export function onSessionError(fn: Listener) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** Numeros soltos viram texto: o backend le os campos como texto (como num formulario). */
function normalize(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    out[k] = typeof v === 'number' || typeof v === 'boolean' ? String(v) : v
  }
  return out
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json; charset=utf-8'
    headers['X-CSRF-Token'] = csrf
  }
  let r: Response
  try {
    r = await fetch(`${API_BASE}/${path.replace(/^\/+/, '')}`, {
      method: method,
      headers,
      credentials: 'include',
      body: method === 'POST' ? JSON.stringify(normalize(body ?? {})) : undefined,
    })
  } catch {
    throw new ApiError(0, 'ERR_REDE', 'Sem conexão com o servidor. Confira se o backend está no ar.')
  }
  let json: { status?: boolean; data?: T; message?: string; error?: string; details?: unknown } = {}
  try {
    json = await r.json()
  } catch {
    throw new ApiError(r.status, 'ERR_RESPOSTA', `Resposta inesperada do servidor (HTTP ${r.status}).`)
  }
  if (!r.ok || json.status === false) {
    const error = new ApiError(r.status, json.error ?? 'ERR', json.message ?? 'Não foi possível concluir.', json.details)
    if (r.status === 401 || error.code === 'ERR_PASSWORD_CHANGE_REQUIRED') {
      listeners.forEach((fn) => fn(error))
    }
    throw error
  }
  return { data: json.data as T, message: json.message ?? null }
}

export function get<T>(path: string, params?: Record<string, string | number | boolean | null | undefined>) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== '' && v !== false) qs.set(k, String(v))
  }
  const q = qs.toString()
  return request<T>('GET', q ? `${path}?${q}` : path)
}

/** Baixa um arquivo protegido (com o cookie da sessao) e abre numa aba nova. */
export async function openFile(path: string) {
  const r = await fetch(`${API_BASE}/${path.replace(/^\/+/, '')}`, { credentials: 'include' })
  if (!r.ok) throw new ApiError(r.status, 'ERR_ARQUIVO', 'Não foi possível abrir o arquivo.')
  const url = URL.createObjectURL(await r.blob())
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Le um arquivo escolhido pelo usuario como data URI (para enviar em JSON). */
export function readFile(f: File): Promise<string> {
  return new Promise((ok, error) => {
    const reader = new FileReader()
    reader.onload = () => ok(String(reader.result))
    reader.onerror = () => error(reader.error)
    reader.readAsDataURL(f)
  })
}

export function post<T = unknown>(path: string, body?: Record<string, unknown>) {
  return request<T>('POST', path, body)
}
