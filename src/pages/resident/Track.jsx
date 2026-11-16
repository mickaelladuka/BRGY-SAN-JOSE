import { Link, useSearchParams } from 'react-router-dom'
import { Alert, EmptyState, Pagination, SkeletonList, StatusBadge } from '../../components/ui'
import { toPage } from '../../lib/api'
import { fmtDate, REPORT_CATEGORIES, REPORT_STATUSES } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'
import { useState } from 'react'

const PAGE_SIZE = 10
export default function Track() {
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') === 'reports' ? 'reports' : 'complaints'
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const params = tab === 'reports'
    ? { page, pageSize: PAGE_SIZE, q: search || undefined, status: status || undefined, category: category || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, sortOrder }
    : { page, pageSize: PAGE_SIZE }
  const { data, loading, error } = useFetch(`/api/${tab}/mine`, params)
  const summary = useFetch(tab === 'reports' ? '/api/reports/mine/summary' : null)
  const { items, total } = toPage(data)
  const resetFilters = () => { setSearch(''); setStatus(''); setCategory(''); setDateFrom(''); setDateTo(''); setSortOrder('newest'); setPage(1) }
  const switchTab = (t) => { setPage(1); resetFilters(); setSp(t === 'reports' ? { tab: 'reports' } : {}) }

  return (
    <div className="resident-track">
      <header className="resident-page-heading"><span className="resident-eyebrow">YOUR SERVICE HISTORY</span><h1>Track your requests</h1><p>Follow updates from the barangay on your complaints and community reports.</p></header>
      <div className="tabs resident-request-tabs" role="tablist" aria-label="Request type">
        <button role="tab" aria-selected={tab === 'complaints'} onClick={() => switchTab('complaints')}>Complaints</button>
        <button role="tab" aria-selected={tab === 'reports'} onClick={() => switchTab('reports')}>Reports</button>
      </div>
      <div className="row resident-track-actions">
        <Link className="btn btn-primary btn-sm" to="/resident/complaints/new">New complaint</Link>
        {tab === 'complaints' && <Link className="btn btn-outline btn-sm" to="/resident/complaints/schedules">My appointments</Link>}
        <Link className="btn btn-outline btn-sm" to="/resident/reports/new">New report</Link>
      </div>
      {tab === 'reports' && (
        <>
          <div className="resident-report-summary">
            {[
              ['Total reports', summary.data?.total],
              ['Pending review', summary.data?.pendingReview],
              ['Under verification', summary.data?.underVerification],
              ['Verified', summary.data?.verified],
              ['In progress', summary.data?.inProgress],
              ['Resolved', summary.data?.resolved],
              ['Needs your information', summary.data?.requiresAdditionalInformation],
            ].map(([label, count]) => (
              <div className="card" key={label} style={{ padding: '.8rem 1rem' }}>
                <div className="muted" style={{ fontSize: '.8rem' }}>{label}</div>
                <strong style={{ fontSize: '1.25rem' }}>{count ?? '—'}</strong>
              </div>
            ))}
          </div>
          <div className="card resident-report-filters">
            <div className="resident-filter-grid">
              <label>Search reports<input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Reference, title, or keyword" /></label>
              <label>Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="">All statuses</option>{REPORT_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label>Category<select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}><option value="">All categories</option>{REPORT_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label>From<input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} /></label>
              <label>Through<input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} /></label>
              <label>Sort<select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value); setPage(1) }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
            </div>
            <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: '.75rem' }} onClick={resetFilters}>Clear filters</button>
          </div>
        </>
      )}
      {loading ? <SkeletonList count={3} lines={3} /> : error ? <Alert>{error}</Alert> : items.length === 0
        ? <EmptyState title={`No ${tab} yet`}>Things you submit will show up here with their latest status.</EmptyState>
        : (
          <div className="card resident-request-list">
            {items.map((x) => (
              <Link key={x.id} className="list-item resident-request-card" to={`/resident/track/${tab}/${x.id}`}>
                <div className="top"><strong>{tab === 'complaints' ? x.subject : x.title || x.category}</strong><StatusBadge status={x.status} /></div>
                {tab === 'reports' && x.location && <small className="resident-request-location">{x.location}</small>}
                <span className="muted">{x.referenceNumber} · {fmtDate(x.submittedAt)}</span>
              </Link>
            ))}
          </div>
        )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
    </div>
  )
}
