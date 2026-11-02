import axios from 'axios'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5085').replace(/\/$/, '')
export const UNAUTHORIZED_EVENT = 'annex6:unauthorized'

// The access token lives in module memory (and, for page refreshes, in sessionStorage via AuthContext).
// It is never written to localStorage and never cached by the service worker.
let accessToken = null
export const tokenStore = {
  get: () => accessToken,
  set: (t) => { accessToken = t },
  clear: () => { accessToken = null },
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((cfg) => {
  const t = tokenStore.get()
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // A 401 while holding a token means it expired or was revoked: tell the auth layer to sign out.
    if (err.response?.status === 401 && tokenStore.get()) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(err)
  },
)

/** Turn any axios/ASP.NET error into a short, safe, human-readable message. */
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback
  if (err.code === 'ERR_CANCELED') return ''
  if (!err.response) {
    return typeof navigator !== 'undefined' && navigator.onLine === false
      ? 'You appear to be offline. Check your connection and try again.'
      : 'Cannot reach the server. Please check your connection or try again later.'
  }
  const { status, data } = err.response
  if (status === 429) return 'Too many requests. Please wait a moment before trying again.'
  if (status === 403) return 'You do not have permission to do that.'
  if (status === 401) return data?.message || 'Your session is not valid. Please log in again.'
  if (status === 404) return data?.message || 'The requested record was not found.'
  if (Array.isArray(data)) {
    // ASP.NET Identity errors: [{ code, description }]
    const msg = data.map((e) => e.description || e.message).filter(Boolean).join(' ')
    if (msg) return msg
  }
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat().filter(Boolean)
    if (first.length) return first.join(' ')
  }
  if (typeof data?.message === 'string' && data.message) return data.message
  if (status >= 500) return 'The server ran into a problem. Please try again later.'
  return fallback
}

/** ASP.NET ProblemDetails validation errors -> { fieldName: message } (camelCased keys). */
export function getFieldErrors(err) {
  const errors = err?.response?.data?.errors
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return {}
  const out = {}
  for (const [k, v] of Object.entries(errors)) {
    const key = k.replace(/^\$\./, '').replace(/^./, (c) => c.toLowerCase())
    out[key] = [].concat(v).join(' ')
  }
  return out
}

/** Accept either a plain array or a paged envelope { items|data, total|totalCount }. */
export function toPage(data) {
  if (Array.isArray(data)) return { items: data, total: data.length }
  const items = data?.items ?? data?.data ?? data?.results ?? []
  return { items, total: data?.total ?? data?.totalCount ?? items.length }
}
