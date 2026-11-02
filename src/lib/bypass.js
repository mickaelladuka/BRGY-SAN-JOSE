import { api } from './api'

// Local development helper ONLY. Both gates must be open:
//  - frontend: Vite dev server (import.meta.env.DEV) AND VITE_ENABLE_LOCAL_DEVICE_BYPASS=true
//  - backend: ASPNETCORE_ENVIRONMENT=Development AND EnableLocalDeviceBypass=true (validated server-side)
// In a production build import.meta.env.DEV is false, so this is always disabled.
export const bypassFeatureEnabled =
  import.meta.env.DEV === true && import.meta.env.VITE_ENABLE_LOCAL_DEVICE_BYPASS === 'true'

const KEY = 'annex6.devBypass'
const DEFAULT_TTL_MS = 30 * 60 * 1000

export function readBypass() {
  if (!bypassFeatureEnabled) return null
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    return v && v.expiresAt > Date.now() ? v : null
  } catch {
    return null
  }
}

export function clearBypass() {
  try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
}

/** The backend validates the code; the real code is never in the frontend source or returned by the API. */
export async function verifyBypassCode(code) {
  if (!bypassFeatureEnabled) throw new Error('Device bypass is not enabled.')
  const { data } = await api.post('/api/dev/device-bypass', { code })
  const parsed = data?.expiresAt ? Date.parse(data.expiresAt) : NaN
  const expiresAt = Number.isFinite(parsed) ? parsed : Date.now() + DEFAULT_TTL_MS
  const value = { expiresAt }
  sessionStorage.setItem(KEY, JSON.stringify(value))
  return value
}
