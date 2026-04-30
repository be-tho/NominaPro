/**
 * API PHP + sesiones. Vacío = mismo origen (p. ej. proxy Vite → servidor local).
 */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export function apiUrl(route: string, query?: Record<string, string>): string {
  const params = new URLSearchParams({ route })
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      params.set(k, v)
    }
  }
  const path = `/api/index.php?${params.toString()}`
  if (!API_BASE) return path
  return `${API_BASE}${path}`
}

export interface ApiEnvelopeOk<T> {
  ok: true
  data: T
}

export interface ApiEnvelopeErr {
  ok: false
  error: string
}

type ApiInit = RequestInit & { query?: Record<string, string> }

export async function apiFetch<T>(route: string, init?: ApiInit): Promise<T> {
  const { query, ...fetchInit } = init ?? {}
  const res = await fetch(apiUrl(route, query), {
    ...fetchInit,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(fetchInit.headers ?? {}),
    },
  })

  const json = (await res.json().catch(() => null)) as ApiEnvelopeOk<T> | ApiEnvelopeErr | null
  if (!json || typeof json !== 'object' || !('ok' in json)) {
    throw new Error('Respuesta inválida del servidor')
  }
  if (!json.ok) {
    throw new Error(json.error || `Error HTTP ${res.status}`)
  }
  return json.data
}
