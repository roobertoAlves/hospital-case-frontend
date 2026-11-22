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
export function onSessionError(fn: Listener) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

function normalize(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    out[k] = typeof v === 'number' || typeof v === 'boolean' ? String(v) : v
  }
  return out
}

const WAKE_STATUS = [502, 503, 504]
const WAKE_LIMIT_MS = 120_000
let waking = 0
const wakeListeners = new Set<(on: boolean) => void>()
export function onWaking(fn: (on: boolean) => void) {
  wakeListeners.add(fn)
  return () => { wakeListeners.delete(fn) }
}
function setWaking(delta: number) {
  const before = waking > 0
  waking = Math.max(0, waking + delta)
  if (before !== waking > 0) wakeListeners.forEach((fn) => fn(waking > 0))
}

async function fetchWaking(url: string, init: RequestInit, retryOn: number[]): Promise<Response> {
  const started = Date.now()
  let wait = 2000
  let flagged = false
  try {
    for (;;) {
      let r: Response | null = null
      try { r = await fetch(url, init) } catch { r = null }
      if (r && !retryOn.includes(r.status)) return r
      if (Date.now() - started > WAKE_LIMIT_MS) {
        if (r) return r
        throw new TypeError('network')
      }
      if (!flagged) { flagged = true; setWaking(1) }
      await new Promise((ok) => setTimeout(ok, wait))
      wait = Math.min(wait + 1500, 6000)
    }
  } finally {
    if (flagged) setWaking(-1)
  }
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json; charset=utf-8'
    headers['X-CSRF-Token'] = csrf
  }
  let r: Response
  try {
    r = await fetchWaking(`${API_BASE}/${path.replace(/^\/+/, '')}`, {
      method: method,
      headers,
      credentials: 'include',
      body: method === 'POST' ? JSON.stringify(normalize(body ?? {})) : undefined,
    }, method === 'GET' ? WAKE_STATUS : [502, 503])
  } catch {
    throw new ApiError(0, 'ERR_REDE', 'Sem conexão com o servidor. Confira se o backend está no ar.')
  }
  let json: { status?: boolean; data?: T; message?: string; error?: string; details?: unknown } = {}
  try {
    json = await r.json()
  } catch {
    throw new ApiError(r.status, 'ERR_RESPOSTA', WAKE_STATUS.includes(r.status)
      ? 'O servidor demorou para responder. Tente de novo em alguns segundos.'
      : `Resposta inesperada do servidor (HTTP ${r.status}).`)
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

export async function openFile(path: string) {
  const r = await fetch(`${API_BASE}/${path.replace(/^\/+/, '')}`, { credentials: 'include' })
  if (!r.ok) throw new ApiError(r.status, 'ERR_ARQUIVO', 'Não foi possível abrir o arquivo.')
  const url = URL.createObjectURL(await r.blob())
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

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
