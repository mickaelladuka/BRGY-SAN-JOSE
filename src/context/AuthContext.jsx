import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, tokenStore, UNAUTHORIZED_EVENT } from '../lib/api'
import { clearBypass, readBypass, verifyBypassCode, bypassFeatureEnabled } from '../lib/bypass'

const SESSION_KEY = 'annex6.session'
const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'

export function decodeJwt(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(part).split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

export const normalizeRole = (r) => {
  const v = String(Array.isArray(r) ? r[0] : r || '').toLowerCase()
  if (v === 'admin' || v === 'superadmin' || v === 'oic' || v === 'secretary' || v === 'adminstaff' || v === 'supportingstaff') {
    return v === 'superadmin' ? 'SuperAdmin' : v === 'oic' ? 'OIC' : v === 'secretary' ? 'Secretary' : v === 'adminstaff' ? 'AdminStaff' : v === 'supportingstaff' ? 'SupportingStaff' : 'Admin'
  }
  return v === 'resident' ? 'Resident' : null
}
export const homeFor = (role) => {
  if (role === 'Resident') return '/resident'
  if (role === 'SuperAdmin' || role === 'OIC' || role === 'Secretary' || role === 'AdminStaff' || role === 'SupportingStaff' || role === 'Admin') return '/admin'
  return '/'
}

function buildSession(token, fallbackRole, email) {
  const claims = decodeJwt(token)
  if (!claims?.exp) return null
  // The role is taken from the signed token (issued by the server), not from anything the UI typed.
  const role = normalizeRole(claims[ROLE_CLAIM] ?? claims.role ?? fallbackRole)
  if (!role) return null
  return { token, role, email: email || claims.email || '', exp: claims.exp * 1000 }
}

function readStoredSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
    return s && s.token && s.exp > Date.now() ? s : null
  } catch {
    return null
  }
}

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [bypass, setBypass] = useState(() => readBypass())
  const sessionRef = useRef(null)
  sessionRef.current = session

  const clear = useCallback((msg = '') => {
    tokenStore.clear()
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    clearBypass()
    setBypass(null)
    setSession(null)
    setNotice(msg)
  }, [])

  // Restore a still-valid session after a page refresh (before any protected UI renders).
  useEffect(() => {
    const s = readStoredSession()
    if (s) {
      tokenStore.set(s.token)
      setSession(s)
    }
    setLoading(false)
  }, [])

  // Server says the token is no longer valid.
  useEffect(() => {
    const onUnauthorized = () => clear('Your session has ended. Please log in again.')
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [clear])

  // Automatic expiry.
  useEffect(() => {
    if (!session) return undefined
    const ms = Math.max(session.exp - Date.now(), 0)
    const t = setTimeout(() => clear('Your session has expired. Please log in again.'), Math.min(ms, 2 ** 31 - 1))
    return () => clearTimeout(t)
  }, [session, clear])

  // Bypass expiry.
  useEffect(() => {
    if (!bypass) return undefined
    const t = setTimeout(() => setBypass(null), Math.max(bypass.expiresAt - Date.now(), 0))
    return () => clearTimeout(t)
  }, [bypass])

  const login = useCallback(async (identifier, password) => {
    const { data } = await api.post('/api/auth/login', { email: identifier.trim(), password })
    const s = buildSession(data?.token, data?.role, data?.email)
    if (!s) throw new Error('The server returned an invalid session. Please contact the administrator.')
    tokenStore.set(s.token)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
    setNotice('')
    setSession(s)
    return s
  }, [])

  const logout = useCallback(async () => {
    // Best effort: the API may or may not expose a logout/audit endpoint. Local sign-out always happens.
    try { if (sessionRef.current) await api.post('/api/auth/logout') } catch { /* ignore */ }
    clear('')
  }, [clear])

  const activateBypass = useCallback(async (code) => {
    const v = await verifyBypassCode(code)
    setBypass(v)
  }, [])

  const value = useMemo(
    () => ({
      session, loading, notice, login, logout,
      isAuthenticated: !!session,
      role: session?.role ?? null,
      bypassEnabled: bypassFeatureEnabled,
      bypassActive: !!bypass,
      activateBypass,
    }),
    [session, loading, notice, login, logout, bypass, activateBypass],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
