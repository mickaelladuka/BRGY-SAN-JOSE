import { useState } from 'react'
import { Alert, EmptyState, SkeletonList } from '../../components/ui'
import { api, toPage } from '../../lib/api'
import { fmtDateTime, REPORT_CATEGORIES, REPORT_SEVERITIES, REPORT_STATUSES, REPORT_VERIFICATION_STATUSES } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'
import LocationPicker from '../../components/LocationPicker'
import StatusReviewModal from './StatusReviewModal'
import ReportWorkflowModal from './ReportWorkflowModal'
import { ArrowDown, ArrowUp, MapPin, Search, X } from 'lucide-react'
import './ReportsView.css'

export default function ReportsView() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [personnelFilter, setPersonnelFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [verificationFilter, setVerificationFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [reviewing, setReviewing] = useState(null)
  const [workflowAction, setWorkflowAction] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [exportError, setExportError] = useState('')

  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)
  params.set('sortOrder', sortOrder)
  if (search) params.set('q', search)
  if (categoryFilter) params.set('category', categoryFilter)
  if (sourceFilter) params.set('source', sourceFilter)
  if (locationFilter) params.set('location', locationFilter)
  if (departmentFilter) params.set('departmentId', departmentFilter)
  if (personnelFilter) params.set('assignedPersonnelId', personnelFilter)
  if (severityFilter) params.set('severity', severityFilter)
  if (verificationFilter) params.set('verificationStatus', verificationFilter)
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)
  params.set('_r', reloadKey)
  const reports = useFetch(`/api/reports?${params.toString()}`, { page, pageSize: 10 })
  const analytics = useFetch('/api/reports/analytics', {})
  const options = useFetch('/api/reports/assignment-options', {})

  const openDetail = async (report) => {
    setSelected(report)
    setDetail(null)
    setDetailLoading(true)
    try {
      const { data } = await api.get(`/api/reports/${report.id}`)
      setDetail(data)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const items = [...toPage(reports.data).items].sort((a, b) => {
    const timeA = Date.parse(a.submittedAt) || 0
    const timeB = Date.parse(b.submittedAt) || 0
    const byTime = sortOrder === 'oldest' ? timeA - timeB : timeB - timeA
    return byTime || (sortOrder === 'oldest' ? a.id - b.id : b.id - a.id)
  })
  const activeAdvancedCount = [categoryFilter, sourceFilter, locationFilter, departmentFilter, personnelFilter, severityFilter, verificationFilter, dateFrom, dateTo].filter(Boolean).length
  const clearFilters = () => {
    setPage(1); setSearch(''); setStatusFilter(''); setCategoryFilter(''); setSourceFilter('')
    setLocationFilter(''); setDepartmentFilter(''); setPersonnelFilter(''); setSeverityFilter('')
    setVerificationFilter(''); setDateFrom(''); setDateTo(''); setSortOrder('newest')
  }
  const exportReports = async (format) => {
    setExportError('')
    try {
      const { data } = await api.get('/api/reports/export', {
        params: { ...Object.fromEntries(params.entries()), format },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `Annex6_Reports.${format}`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setExportError('Could not export the filtered reports.')
    }
  }

  const downloadAttachment = async (attachment) => {
    try {
      const { data } = await api.get(`/api/reports/${detail.id}/attachments/${attachment.id}`, { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.fileName
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setExportError('Could not download the report evidence.')
    }
  }

  return (
    <div className="reports-view-layout">
      <div style={{ gridArea: 'details', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="card" style={{ flex: 1, minHeight: '300px', padding: 0, overflow: 'hidden' }}>
          <div className="card-head" style={{ padding: '.75rem 1rem', margin: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Report Location</h2>
            {detail?.location && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowMap(true)}>
                <MapPin size={14} strokeWidth={1.75} /> View on map
              </button>
            )}
          </div>
          <div style={{ height: '250px', background: 'var(--cream)', display: 'grid', placeItems: 'center', color: 'var(--muted-c)' }}>
            {detail?.location ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <MapPin size={32} strokeWidth={1.5} style={{ color: 'var(--primary)', marginBottom: '.5rem' }} />
                <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>{detail.location}</div>
                <div className="muted" style={{ fontSize: '.8rem' }}>Click "View on map" to see on interactive map</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <MapPin size={32} strokeWidth={1.5} style={{ color: 'var(--muted-c)', marginBottom: '.5rem' }} />
                <div>Select a report to view location</div>
              </div>
            )}
          </div>
        </div>

        {selected && (
          <div className="card" style={{ flex: 1 }}>
            <div className="card-head">
              <h2 style={{ margin: 0, fontSize: '1rem' }}>Report Details</h2>
              <button type="button" className="icon-btn" onClick={() => { setSelected(null); setDetail(null) }} aria-label="Close report details"><X size={18} strokeWidth={1.75} /></button>
            </div>
            {detailLoading ? <SkeletonList count={1} lines={6} /> : !detail ? <Alert>Could not load details.</Alert> : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem 1rem', marginBottom: '1rem' }}>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Reference</span><div style={{ fontWeight: 600 }}>{detail.referenceNumber}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Title</span><div>{detail.title || detail.category}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Category</span><div>{detail.category}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Status</span><div>{detail.status}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Verification</span><div>{detail.verificationStatus}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Source</span><div>{detail.isGuest ? 'Guest' : 'Resident'}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Severity</span><div>{detail.severity}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Observed</span><div>{fmtDateTime(detail.incidentAt)}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Submitted</span><div>{fmtDateTime(detail.submittedAt)}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Location</span><div>{detail.location || '—'}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Area 6 location</span><div>{detail.areaLocationName || 'Unverified / not selected'}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Assigned department</span><div>{detail.assignedDepartmentName || 'Unassigned'}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Assigned personnel</span><div>{detail.assignedToUserName || 'Unassigned'}</div></div>
                  {detail.dueDate && <div><span className="muted" style={{ fontSize: '.75rem' }}>Due date</span><div>{fmtDateTime(detail.dueDate)}</div></div>}
                  {detail.latitude != null && detail.longitude != null && <div><span className="muted" style={{ fontSize: '.75rem' }}>Pinned coordinates</span><div>{Number(detail.latitude).toFixed(6)}, {Number(detail.longitude).toFixed(6)}</div></div>}
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Reporter</span><div>{detail.isGuest ? detail.guestName || '—' : detail.residentName || '—'}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Contact</span><div>{detail.isGuest ? detail.guestContact || '—' : detail.contactNumber || '—'}</div></div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <span className="muted" style={{ fontSize: '.75rem' }}>Description</span>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{detail.description}</div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setReviewing(detail)}>Update status</button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setWorkflowAction('verify')}>Verify</button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setWorkflowAction('assign')} disabled={detail.verificationStatus !== 'Verified'}>Assign</button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setWorkflowAction('information')}>Request information</button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setWorkflowAction('log')}>Record action</button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setWorkflowAction('resolve')} disabled={['Resolved', 'Closed'].includes(detail.status)}>Resolve</button>
                    {['Resolved', 'Closed'].includes(detail.status) && <button type="button" className="btn btn-outline btn-sm" onClick={() => setWorkflowAction('reopen')}>Reopen</button>}
                    {!detail.convertedComplaintId && <button type="button" className="btn btn-outline btn-sm" onClick={() => setWorkflowAction('convert')}>Convert to complaint</button>}
                  </div>
                </div>
                {detail.attachments?.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Evidence</strong>
                    {detail.attachments.map((attachment) => <div key={attachment.id} className="row" style={{ justifyContent: 'space-between', marginTop: '.4rem' }}>
                      <span>{attachment.fileName}</span>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => downloadAttachment(attachment)}>Download</button>
                    </div>)}
                  </div>
                )}
                {detail.history && detail.history.length > 0 && (
                  <div>
                    <span className="muted" style={{ fontSize: '.75rem' }}>Status History</span>
                    <div style={{ marginTop: '.5rem' }}>
                      {detail.history.map((entry, i) => (
                        <div key={entry.id ?? i} style={{ padding: '.5rem', borderLeft: '2px solid var(--primary-surface)', marginBottom: '.5rem', paddingLeft: '.75rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{entry.status}</div>
                          <div className="muted" style={{ fontSize: '.75rem' }}>{fmtDateTime(entry.changedAt)}</div>
                          {entry.remarks && <div style={{ fontSize: '.8rem', marginTop: '.25rem' }}>{entry.remarks}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {detail.actions?.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Action history</strong>
                    {detail.actions.map((action) => <div key={action.id} className="list-item">
                      <div className="top"><strong>{action.actionType}</strong><span className="muted">{fmtDateTime(action.occurredAt)}</span></div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{action.details}</div>
                      <small className="muted">{action.isPublic ? 'Resident-visible update' : 'Internal note'}</small>
                    </div>)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ gridArea: 'list', overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '.5rem', marginBottom: '1rem' }}>
          {[
            ['Total', analytics.data?.total],
            ['Pending verification', analytics.data?.pendingVerification],
            ['Verified', analytics.data?.verified],
            ['Assigned', analytics.data?.assigned],
            ['In progress', analytics.data?.inProgress],
            ['Resolved', analytics.data?.resolved],
            ['Immediate attention', analytics.data?.immediateAttention],
            ['Unassigned', analytics.data?.unassigned],
          ].map(([label, count]) => <div key={label} style={{ padding: '.6rem .7rem', background: 'var(--cream)', borderRadius: 'var(--radius)' }}>
            <div className="muted" style={{ fontSize: '.7rem' }}>{label}</div><strong>{count ?? '—'}</strong>
          </div>)}
        </div>
        <div className="card-head">
          <h2 style={{ margin: 0 }}>Reports</h2>
          <div className="row" style={{ gap: '.5rem' }}>
            <span className="muted" style={{ fontSize: '.8rem' }}>{toPage(reports.data).total} records</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { setSortOrder((current) => current === 'newest' ? 'oldest' : 'newest'); setPage(1) }}>
              {sortOrder === 'newest' ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
              {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
            </button>
          </div>
        </div>
        <div className="reports-view-primary-filters">
          <label style={{ position: 'relative', display: 'block' }}>
            <Search size={17} aria-hidden="true" style={{ position: 'absolute', left: '.85rem', bottom: '.9rem', color: 'var(--muted-c)' }} />
            <input
              type="search"
              aria-label="Search reports"
              placeholder="Search reference, title, reporter, or keywords"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              style={{ minWidth: 0, padding: '.65rem .85rem .65rem 2.5rem', background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', fontSize: '.9rem' }}
            />
          </label>
          <label>
            <select aria-label="Filter reports by status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} style={{ minHeight: 36, padding: '.35rem .5rem', background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', fontSize: '.85rem' }}>
              <option value="">All statuses</option>
              {REPORT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
        <details style={{ marginBottom: '.75rem' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--muted-c)', fontSize: '.85rem' }}>Advanced filters {activeAdvancedCount > 0 && <span className="badge">{activeAdvancedCount} active</span>}</summary>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '.65rem', padding: '.75rem 0' }}>
            <label>Category<select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}><option value="">All categories</option>{REPORT_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Source<select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }}><option value="">All sources</option><option value="resident">Resident</option><option value="guest">Guest</option></select></label>
            <label>Severity<select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1) }}><option value="">All severities</option>{REPORT_SEVERITIES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Verification<select value={verificationFilter} onChange={(e) => { setVerificationFilter(e.target.value); setPage(1) }}><option value="">All verification states</option>{REPORT_VERIFICATION_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Incident location<input value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setPage(1) }} placeholder="Search location" /></label>
            <label>Department<select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1) }}><option value="">All departments</option>{(options.data?.departments || []).map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
            <label>Assigned personnel<select value={personnelFilter} onChange={(e) => { setPersonnelFilter(e.target.value); setPage(1) }}><option value="">All personnel</option>{(options.data?.users || []).map((value) => <option key={value.id} value={value.id}>{value.fullName}</option>)}</select></label>
            <label>Received from<input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} /></label>
            <label>Received through<input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} /></label>
          </div>
        </details>
        {(search || statusFilter || activeAdvancedCount > 0) && <div className="row" style={{ flexWrap: 'wrap', gap: '.4rem', marginBottom: '.75rem' }}>
          {search && <button type="button" className="badge" onClick={() => { setSearch(''); setPage(1) }}>Search: {search} ×</button>}
          {statusFilter && <button type="button" className="badge" onClick={() => { setStatusFilter(''); setPage(1) }}>Status: {statusFilter} ×</button>}
          {categoryFilter && <button type="button" className="badge" onClick={() => { setCategoryFilter(''); setPage(1) }}>Category: {categoryFilter} ×</button>}
          {sourceFilter && <button type="button" className="badge" onClick={() => { setSourceFilter(''); setPage(1) }}>Source: {sourceFilter} ×</button>}
          {locationFilter && <button type="button" className="badge" onClick={() => { setLocationFilter(''); setPage(1) }}>Location: {locationFilter} ×</button>}
          {departmentFilter && <button type="button" className="badge" onClick={() => { setDepartmentFilter(''); setPage(1) }}>Department ×</button>}
          {personnelFilter && <button type="button" className="badge" onClick={() => { setPersonnelFilter(''); setPage(1) }}>Personnel ×</button>}
          {severityFilter && <button type="button" className="badge" onClick={() => { setSeverityFilter(''); setPage(1) }}>Severity: {severityFilter} ×</button>}
          {verificationFilter && <button type="button" className="badge" onClick={() => { setVerificationFilter(''); setPage(1) }}>Verification: {verificationFilter} ×</button>}
          {dateFrom && <button type="button" className="badge" onClick={() => { setDateFrom(''); setPage(1) }}>From: {dateFrom} ×</button>}
          {dateTo && <button type="button" className="badge" onClick={() => { setDateTo(''); setPage(1) }}>Through: {dateTo} ×</button>}
          <button type="button" className="btn btn-outline btn-sm" onClick={clearFilters}>Clear all</button>
        </div>}
        <div className="row" style={{ flexWrap: 'wrap', gap: '.5rem', marginBottom: '.75rem' }}>
          {['csv', 'xlsx', 'pdf'].map((format) => <button key={format} type="button" className="btn btn-outline btn-sm" onClick={() => exportReports(format)}>Export {format.toUpperCase()}</button>)}
        </div>
        <Alert>{exportError}</Alert>
        {reports.loading ? <SkeletonList count={3} lines={3} /> : reports.error ? <Alert>{reports.error}</Alert> : items.length === 0
          ? <EmptyState title="No reports found" />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
              {items.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => openDetail(report)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', background: selected?.id === report.id ? 'var(--primary-surface)' : '#fff',
                    border: `1px solid ${selected?.id === report.id ? 'var(--primary)' : 'var(--line)'}`, borderRadius: 'var(--radius)', padding: '.85rem 1rem',
                    cursor: 'pointer', transition: 'all .18s ease', marginBottom: '.35rem',
                    boxShadow: selected?.id === report.id ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
                    <strong style={{ fontSize: '.9rem' }}>{report.title || report.category}</strong>
                    <span className="badge">{report.isGuest ? 'Guest' : 'Resident'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '.75rem', fontSize: '.8rem', color: 'var(--muted-c)', flexWrap: 'wrap' }}>
                    <span>{report.referenceNumber}</span>
                    <span>{report.status}</span>
                    <span>{report.verificationStatus}</span>
                    <span>{report.severity}</span>
                    <span>{fmtDateTime(report.submittedAt)}</span>
                  </div>
                  {report.location && <div style={{ fontSize: '.75rem', color: 'var(--muted-c)', marginTop: '.25rem', display: 'flex', alignItems: 'center', gap: '.25rem' }}><MapPin size={12} strokeWidth={1.75} /> {report.location}</div>}
                  {(report.assignedDepartmentName || report.assignedToUserName) && <div className="muted" style={{ fontSize: '.75rem', marginTop: '.25rem' }}>{report.assignedDepartmentName || 'Department unassigned'} · {report.assignedToUserName || 'Personnel unassigned'}</div>}
                </button>
              ))}
            </div>
          )}
        <div style={{ marginTop: '1rem' }}>
          {toPage(reports.data).total > 10 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem' }}>
              <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
              <span className="muted" style={{ fontSize: '.85rem' }}>Page {page}</span>
              <button type="button" className="btn btn-outline btn-sm" disabled={items.length < 10} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </div>
      </div>

      {showMap && detail?.location && (
        <LocationPicker
          value={detail.location}
          lat={detail.latitude}
          lng={detail.longitude}
          onChange={() => {}}
          onClose={() => setShowMap(false)}
        />
      )}

      {reviewing && (
        <StatusReviewModal
          endpoint="/api/reports"
          row={reviewing}
          config={{
            statuses: REPORT_STATUSES.filter((status) => status !== 'Resolved' && status !== 'Closed'),
            publicStatusUpdates: true,
            rows: (report) => [
              ['Reference', report.referenceNumber],
              ['Category', report.category],
              ['Location', report.location],
              ['Source', report.isGuest ? 'Guest' : 'Resident'],
              ['Reporter', report.isGuest ? report.guestName : report.residentName],
              ['Contact', report.isGuest ? report.guestContact : report.contactNumber],
              ['Submitted', fmtDateTime(report.submittedAt)],
            ],
          }}
          onClose={() => setReviewing(null)}
          onChanged={() => { openDetail(reviewing); setReloadKey((key) => key + 1) }}
        />
      )}
      {workflowAction && detail && (
        <ReportWorkflowModal
          report={detail}
          action={workflowAction}
          options={options.data}
          onClose={() => setWorkflowAction('')}
          onChanged={() => {
            openDetail(detail)
            setReloadKey((key) => key + 1)
            analytics.reload()
          }}
        />
      )}
    </div>
  )
}
