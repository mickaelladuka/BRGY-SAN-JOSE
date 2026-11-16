import { useCallback, useEffect, useState } from 'react'
import { Alert } from '../../components/ui'
import { api, getErrorMessage } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { ClipboardCheck, FileText, MessageSquareWarning, RotateCcw } from 'lucide-react'
import ResourcePage from './ResourcePage'
import ReportsView from './ReportsView'
import AnnouncementsPage from './AnnouncementsPage'
import CommunityIssuesMonitoring from './CommunityIssuesMonitoring'
import OfficialsManagementPage from './OfficialsManagementPage'
import * as m from './modules'

export const ResidentsPage = () => <ResourcePage config={m.residents} />
export const ComplaintsPage = () => <ResourcePage config={m.complaints} />
export const ReportsPage = () => <ReportsView />
export const OperationsPage = () => <ResourcePage config={m.operations} />

export { AnnouncementsPage }
export const CommunityIssuesPage = () => <CommunityIssuesMonitoring />
export const OfficialsPage = () => <OfficialsManagementPage />
const APPLICATION_FILTERS = [
  { label: 'All applications', status: '', count: 'totalApplications', icon: FileText },
  { label: 'Pending review', status: 'Pending Review', count: 'pendingReviewApplications', icon: ClipboardCheck },
  { label: 'Correction resubmitted', status: 'Correction Resubmitted', count: 'correctionResubmittedApplications', icon: RotateCcw },
  { label: 'Needs correction', status: 'Additional Information Required', count: 'needsCorrection', icon: MessageSquareWarning },
]

function ApplicationOverview({ selectedStatus, onSelect }) {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  const loadSummary = useCallback(async () => {
    try {
      const { data } = await api.get('/api/admin/resident-registrations/summary')
      setSummary(data)
      setError('')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    loadSummary()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadSummary()
    }, 15000)
    window.addEventListener('focus', loadSummary)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', loadSummary)
    }
  }, [loadSummary])

  return (
    <>
      {error && <Alert>{error}</Alert>}
      <div className="application-overview" aria-label="Resident application overview">
        {APPLICATION_FILTERS.map(({ label, status, count, icon: Icon }) => (
          <button
            type="button"
            key={label}
            className={`application-overview-card${selectedStatus === status ? ' selected' : ''}`}
            onClick={() => onSelect(status)}
            aria-pressed={selectedStatus === status}
          >
            <span className="application-overview-icon"><Icon size={18} /></span>
            <span className="application-overview-label">{label}</span>
            <strong>{summary ? (summary[count] ?? 0).toLocaleString() : '—'}</strong>
          </button>
        ))}
      </div>
    </>
  )
}

export function ApplicationsPage() {
  const [selectedStatus, setSelectedStatus] = useState('')
  const { role } = useAuth()
  const header = <ApplicationOverview selectedStatus={selectedStatus} onSelect={setSelectedStatus} />
  const rowActions = role === 'AdminStaff'
    ? m.applications.rowActions.filter((action) => action.label !== 'Reject')
    : m.applications.rowActions
  const config = { ...m.applications, rowActions, header, initialStatus: selectedStatus }
  return <ResourcePage key={selectedStatus} config={config} />
}
export const AuditLogsPage = () => <ResourcePage config={m.auditLogs} />
