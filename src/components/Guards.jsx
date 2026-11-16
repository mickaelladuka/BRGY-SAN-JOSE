import { Navigate, useLocation } from 'react-router-dom'
import { homeFor, useAuth } from '../context/AuthContext'
import { requiredDeviceFor, useDeviceType } from '../lib/device'
import { FullPageSpinner } from './ui'
import RestrictedDevice from './RestrictedDevice'
import { hasAdminAccess } from '../lib/adminNavigation'

/**
 * Order of checks (nothing from `children` renders until all pass):
 *  1. auth still loading            -> spinner
 *  2. not signed in                 -> /login
 *  3. wrong role for this area      -> own home
 *  4. device not allowed for role   -> friendly restriction screen (dev bypass optional)
 * This is a UI restriction only. The API enforces roles independently.
 */
const STAFF_ROLES = ['Admin', 'SuperAdmin', 'OIC', 'Secretary', 'AdminStaff', 'SupportingStaff']

export function RequireRole({ role, allowStaff, children }) {
  const { session, loading, bypassActive } = useAuth()
  const device = useDeviceType()
  const location = useLocation()

  if (loading) return <FullPageSpinner label="Checking your session…" />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (allowStaff && STAFF_ROLES.includes(session.role)) {
    // Allow any staff role
  } else if (session.role !== role) {
    return <Navigate to={homeFor(session.role)} replace />
  }
  if (device !== requiredDeviceFor(role) && !bypassActive) return <RestrictedDevice role={role} />
  return children
}

/** Login/register pages bounce signed-in users to their own area. */
export function PublicOnly({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <FullPageSpinner label="Loading…" />
  if (session) return <Navigate to={homeFor(session.role)} replace />
  return children
}

export function RequireAdminPermission({ permission, children }) {
  const { session } = useAuth()
  if (!hasAdminAccess(session?.role, permission)) {
    return (
      <section className="card" role="status" style={{ maxWidth: '640px', margin: '2rem auto' }}>
        <h1 style={{ marginTop: 0 }}>Access unavailable</h1>
        <p className="muted" style={{ marginBottom: 0 }}>
          Your account does not have permission to view this administrative module. Contact the OIC if you need access.
        </p>
      </section>
    )
  }
  return children
}
