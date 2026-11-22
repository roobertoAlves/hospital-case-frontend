import axios, { isCancel, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { queryClient } from './queryClient'

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

type Params = Record<string, string | number | boolean | null | undefined>

interface Envelope<T> {
  status?: boolean
  data?: T
  message?: string
  error?: string
  details?: unknown
}

let csrf = ''
export function setCsrf(token: string) {
  csrf = token
}

export const http = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 60_000,
  validateStatus: () => true,
  headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
})

http.interceptors.request.use((config) => {
  if (config.method && config.method.toLowerCase() !== 'get') {
    config.headers.set('X-CSRF-Token', csrf)
  }
  return config
})

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

function cleanParams(params?: Params) {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== '' && v !== false) out[k] = String(v)
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

class Cancelled extends Error {}

async function sendWaking<R>(config: AxiosRequestConfig, retryOn: number[]): Promise<AxiosResponse<R>> {
  const started = Date.now()
  let wait = 2000
  let flagged = false
  try {
    for (;;) {
      let r: AxiosResponse<R> | null = null
      try {
        r = await http.request<R>(config)
      } catch (e) {
        if (isCancel(e) || config.signal?.aborted) throw new Cancelled()
        r = null
      }
      if (r && !retryOn.includes(r.status)) return r
      if (Date.now() - started > WAKE_LIMIT_MS) {
        if (r) return r
        throw new TypeError('network')
      }
      if (!flagged) { flagged = true; setWaking(1) }
      await new Promise((ok) => setTimeout(ok, wait))
      if (config.signal?.aborted) throw new Cancelled()
      wait = Math.min(wait + 1500, 6000)
    }
  } finally {
    if (flagged) setWaking(-1)
  }
}

async function request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  const isGet = (config.method ?? 'get') === 'get'
  let r: AxiosResponse<Envelope<T> | string>
  try {
    r = await sendWaking<Envelope<T> | string>(config, isGet ? WAKE_STATUS : [502, 503])
  } catch (e) {
    if (e instanceof Cancelled) throw new ApiError(0, 'ERR_CANCELADO', 'Requisição cancelada.')
    throw new ApiError(0, 'ERR_REDE', 'Sem conexão com o servidor. Confira se o backend está no ar.')
  }
  const json = r.data
  if (!json || typeof json !== 'object') {
    throw new ApiError(r.status, 'ERR_RESPOSTA', WAKE_STATUS.includes(r.status)
      ? 'O servidor demorou para responder. Tente de novo em alguns segundos.'
      : `Resposta inesperada do servidor (HTTP ${r.status}).`)
  }
  const ok = r.status >= 200 && r.status < 300
  if (!ok || json.status === false) {
    const error = new ApiError(r.status, json.error ?? 'ERR', json.message ?? 'Não foi possível concluir.', json.details)
    if (r.status === 401 || error.code === 'ERR_PASSWORD_CHANGE_REQUIRED') {
      listeners.forEach((fn) => fn(error))
    }
    throw error
  }
  return { data: json.data as T, message: json.message ?? null }
}

const clean = (path: string) => path.replace(/^\/+/, '')

export function get<T>(path: string, params?: Params, signal?: AbortSignal) {
  return request<T>({ method: 'get', url: clean(path), params: cleanParams(params), signal })
}

export async function post<T = unknown>(path: string, body?: Record<string, unknown>) {
  const r = await request<T>({
    method: 'post',
    url: clean(path),
    data: normalize(body ?? {}),
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
  queryClient.invalidateQueries({ queryKey: ['api'] })
  return r
}

export async function openFile(path: string) {
  let r: AxiosResponse<Blob>
  try {
    r = await http.get<Blob>(clean(path), { responseType: 'blob' })
  } catch {
    throw new ApiError(0, 'ERR_REDE', 'Sem conexão com o servidor.')
  }
  if (r.status < 200 || r.status >= 300) throw new ApiError(r.status, 'ERR_ARQUIVO', 'Não foi possível abrir o arquivo.')
  const url = URL.createObjectURL(r.data)
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
