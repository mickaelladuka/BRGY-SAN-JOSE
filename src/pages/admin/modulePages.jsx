import ResourcePage from './ResourcePage'
import * as m from './modules'

export const ResidentsPage = () => <ResourcePage config={m.residents} />
export const ComplaintsPage = () => <ResourcePage config={m.complaints} />
export const ReportsPage = () => <ResourcePage config={m.reports} />
export const OperationsPage = () => <ResourcePage config={m.operations} />

export const AnnouncementsPage = () => <ResourcePage config={m.announcements} />
export const CommunityIssuesPage = () => <ResourcePage config={m.communityIssues} />
export const OfficialsPage = () => <ResourcePage config={m.officials} />
export const ApplicationsPage = () => <ResourcePage config={m.applications} />
export const AuditLogsPage = () => <ResourcePage config={m.auditLogs} />
