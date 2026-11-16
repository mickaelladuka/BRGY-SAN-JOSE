const MANAGEMENT_ROLES = ['Admin', 'SuperAdmin', 'OIC', 'Secretary']
const APPLICATION_ROLES = [...MANAGEMENT_ROLES, 'AdminStaff']
const COMPLAINT_ROLES = [...MANAGEMENT_ROLES, 'AdminStaff']
const SCHEDULING_ROLES = [...APPLICATION_ROLES, 'SupportingStaff']

export const ADMIN_ROUTE_ACCESS = {
  dashboard: MANAGEMENT_ROLES,
  visitors: APPLICATION_ROLES,
  residents: MANAGEMENT_ROLES,
  applications: APPLICATION_ROLES,
  complaints: COMPLAINT_ROLES,
  complaintScheduling: SCHEDULING_ROLES,
  departments: MANAGEMENT_ROLES,
  officials: MANAGEMENT_ROLES,
  reports: MANAGEMENT_ROLES,
  operations: MANAGEMENT_ROLES,
  announcements: MANAGEMENT_ROLES,
  audit: ['Admin', 'SuperAdmin', 'OIC'],
  communityIssues: MANAGEMENT_ROLES,
  locationVerification: MANAGEMENT_ROLES,
  documentVerification: APPLICATION_ROLES,
  files: MANAGEMENT_ROLES,
}

export function hasAdminAccess(role, permission) {
  return ADMIN_ROUTE_ACCESS[permission]?.includes(role) ?? false
}

export function defaultAdminPath(role) {
  if (role === 'AdminStaff') return '/admin/applications'
  if (hasAdminAccess(role, 'dashboard')) return '/admin'
  return '/admin/no-access'
}
