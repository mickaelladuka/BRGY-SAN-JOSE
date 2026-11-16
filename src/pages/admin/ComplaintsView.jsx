import { useEffect, useState } from 'react'
import { Alert, EmptyState, SkeletonList } from '../../components/ui'
import { api, getErrorMessage, toPage } from '../../lib/api'
import { fmtDateTime, COMPLAINT_STATUSES, COMPLAINT_CATEGORIES, COMPLAINT_PRIORITIES } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'
import LocationPicker from '../../components/LocationPicker'
import ComplaintDocumentActions from '../../components/ComplaintDocumentActions'
import WalkInComplaintForm from '../../components/WalkInComplaintForm'
import StatusReviewModal from './StatusReviewModal'
import { ChevronDown, Filter, MapPin, Search, X, UserPlus } from 'lucide-react'
import './ComplaintsView.css'

export default function ComplaintsView() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [assignedPersonnelId, setAssignedPersonnelId] = useState('')
  const [receivedByUserId, setReceivedByUserId] = useState('')
  const [incidentLocation, setIncidentLocation] = useState('')
  const [personnel, setPersonnel] = useState([])
  const [personnelError, setPersonnelError] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [showWalkInForm, setShowWalkInForm] = useState(false)
  const [reviewing, setReviewing] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    api.get('/api/complaints/intake/personnel')
      .then(({ data }) => { if (active) { setPersonnel(Array.isArray(data) ? data : []); setPersonnelError('') } })
      .catch((err) => { if (active) { setPersonnel([]); setPersonnelError(getErrorMessage(err)) } })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const nextSearch = search.trim()
    const timer = window.setTimeout(() => {
      if (nextSearch !== submittedSearch) {
        setSubmittedSearch(nextSearch)
        setPage(1)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search, submittedSearch])

  const flushSearch = () => {
    const nextSearch = search.trim()
    const changed = nextSearch !== submittedSearch
    setSubmittedSearch(nextSearch)
    return changed
  }

  const handleSearchChange = (event) => {
    setSearch(event.target.value)
  }

  const clearSearch = () => {
    setSearch('')
    setSubmittedSearch('')
    setPage(1)
  }

  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)
  if (sourceFilter) params.set('source', sourceFilter)
  if (categoryFilter) params.set('category', categoryFilter)
  if (priorityFilter) params.set('priority', priorityFilter)
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)
  if (assignedPersonnelId) params.set('assignedPersonnelId', assignedPersonnelId)
  if (receivedByUserId) params.set('receivedByUserId', receivedByUserId)
  if (incidentLocation) params.set('incidentLocation', incidentLocation)
  params.set('sortOrder', sortOrder)
  if (submittedSearch) params.set('q', submittedSearch)
  params.set('_r', reloadKey)
  const complaints = useFetch(`/api/complaints?${params.toString()}`, { page, pageSize: 10 })
  const sourceAnalytics = useFetch(`/api/complaints/analytics/source?_r=${reloadKey}`)

  const resetFilters = () => {
    setStatusFilter('')
    setSourceFilter('')
    setCategoryFilter('')
    setPriorityFilter('')
    setDateFrom('')
    setDateTo('')
    setAssignedPersonnelId('')
    setReceivedByUserId('')
    setIncidentLocation('')
    clearSearch()
    setSortOrder('newest')
    setPage(1)
  }

  const activeAdvancedCount = [
    categoryFilter,
    priorityFilter,
    assignedPersonnelId,
    receivedByUserId,
    incidentLocation.trim(),
    dateFrom,
    dateTo,
  ].filter(Boolean).length

  const clearFilter = (setter) => () => {
    flushSearch()
    setter('')
    setPage(1)
  }

  const activeFilters = [
    ...(search.trim() ? [{ label: `Search: ${search.trim()}`, clear: clearSearch }] : []),
    ...(sourceFilter ? [{ label: `Source: ${sourceFilter === 'WALK-IN' ? 'Walk-in' : 'Online'}`, clear: clearFilter(setSourceFilter) }] : []),
    ...(statusFilter ? [{ label: `Status: ${statusFilter}`, clear: clearFilter(setStatusFilter) }] : []),
    ...(categoryFilter ? [{ label: `Category: ${categoryFilter}`, clear: clearFilter(setCategoryFilter) }] : []),
    ...(priorityFilter ? [{ label: `Priority: ${priorityFilter}`, clear: clearFilter(setPriorityFilter) }] : []),
    ...(assignedPersonnelId ? [{ label: `Assigned: ${personnel.find((person) => person.id === assignedPersonnelId)?.fullName || 'Selected'}`, clear: clearFilter(setAssignedPersonnelId) }] : []),
    ...(receivedByUserId ? [{ label: `Received by: ${personnel.find((person) => person.id === receivedByUserId)?.fullName || 'Selected'}`, clear: clearFilter(setReceivedByUserId) }] : []),
    ...(incidentLocation.trim() ? [{ label: `Location: ${incidentLocation.trim()}`, clear: clearFilter(setIncidentLocation) }] : []),
    ...(dateFrom ? [{ label: `From: ${dateFrom}`, clear: clearFilter(setDateFrom) }] : []),
    ...(dateTo ? [{ label: `Through: ${dateTo}`, clear: clearFilter(setDateTo) }] : []),
    ...(sortOrder !== 'newest' ? [{ label: 'Sort: Oldest first', clear: clearFilter(() => setSortOrder('newest')) }] : []),
  ]

  const updateFilter = (setter) => (event) => {
    flushSearch()
    setter(event.target.value)
    setPage(1)
  }

  const changePage = (nextPage) => {
    setPage(flushSearch() ? 1 : nextPage)
  }

  const openDetail = async (c) => {
    setSelected(c)
    setDetailLoading(true)
    try {
      const { data } = await api.get(`/api/complaints/${c.id}`)
      setDetail(data)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const items = [...toPage(complaints.data).items].sort((a, b) => {
    const timeA = Date.parse(a.submittedAt) || 0
    const timeB = Date.parse(b.submittedAt) || 0
    const byTime = sortOrder === 'oldest' ? timeA - timeB : timeB - timeA
    return byTime || (sortOrder === 'oldest' ? a.id - b.id : b.id - a.id)
  })

  const onWalkInCreated = async (result) => {
    setShowWalkInForm(false)
    setSourceFilter('WALK-IN')
    setStatusFilter('')
    clearSearch()
    setPage(1)
    setReloadKey((key) => key + 1)
    if (result?.id) await openDetail({ id: result.id })
  }

  return (
    <div className="complaints-view-layout">
      {/* Map + Detail */}
      <div style={{ gridArea: 'details', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Map */}
        <div className="card" style={{ flex: 1, minHeight: '300px', padding: 0, overflow: 'hidden' }}>
          <div className="card-head" style={{ padding: '.75rem 1rem', margin: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Complaint Location</h2>
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
                <div>Select a complaint to view location</div>
              </div>
            )}
          </div>
        </div>

        {/* Detail Slip */}
        {selected && (
          <div className="card" style={{ flex: 1 }}>
            <div className="card-head">
              <h2 style={{ margin: 0, fontSize: '1rem' }}>Complaint Details</h2>
              <button type="button" className="icon-btn" onClick={() => { setSelected(null); setDetail(null) }}><X size={18} strokeWidth={1.75} /></button>
            </div>
            {detailLoading ? <SkeletonList count={1} lines={6} /> : !detail ? <Alert>Could not load details.</Alert> : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem 1rem', marginBottom: '1rem' }}>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Reference</span><div style={{ fontWeight: 600 }}>{detail.referenceNumber}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Source</span><div><span className="badge" style={{ background: detail.source === 'WALK-IN' ? '#E0F2FE' : '#F3F4F6', color: detail.source === 'WALK-IN' ? '#075985' : '#4B5563' }}>{detail.source || 'ONLINE'}</span></div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Category</span><div>{detail.category}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Status</span><div>{detail.status}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Priority</span><div style={{ color: detail.priority === 'Critical' ? '#B42318' : detail.priority === 'High' ? '#EA580C' : '#A85D08', fontWeight: 600 }}>{detail.priority}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Submitted</span><div>{fmtDateTime(detail.submittedAt)}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Location</span><div>{detail.location || '—'}</div></div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <span className="muted" style={{ fontSize: '.75rem' }}>Subject</span>
                  <div style={{ fontWeight: 600 }}>{detail.subject}</div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <span className="muted" style={{ fontSize: '.75rem' }}>Description</span>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{detail.description}</div>
                </div>
                <div style={{ marginBottom: '1rem' }}><span className="muted" style={{ fontSize: '.75rem' }}>{detail.source === 'WALK-IN' ? 'Complainant' : 'Resident'}</span><div>{detail.complainantName || detail.residentName || '—'}{detail.complainantType === 'UnregisteredComplainant' ? ' (unregistered)' : ''}</div></div>
                {detail.source === 'WALK-IN' && <div style={{ marginBottom: '1rem' }}>
                  <span className="muted" style={{ fontSize: '.75rem' }}>Received by</span><div>{detail.receivingPersonnelName || 'Not recorded'}</div>
                  {detail.complainantContact && <><span className="muted" style={{ fontSize: '.75rem' }}>Complainant contact</span><div>{detail.complainantContact}</div></>}
                  {detail.residentialAddress && <><span className="muted" style={{ fontSize: '.75rem' }}>Residential address</span><div>{detail.residentialAddress}</div></>}
                  {detail.incidentAt && <><span className="muted" style={{ fontSize: '.75rem' }}>Incident time</span><div>{fmtDateTime(detail.incidentAt)}</div></>}
                  {detail.personsInvolved && <><span className="muted" style={{ fontSize: '.75rem' }}>Persons involved</span><div>{detail.personsInvolved}</div></>}
                  {detail.witnessInformation && <><span className="muted" style={{ fontSize: '.75rem' }}>Witness information</span><div>{detail.witnessInformation}</div></>}
                  <span className="muted" style={{ fontSize: '.75rem' }}>Personally narrated / details reviewed</span><div>{detail.personallyNarrated ? 'Personally narrated' : 'Not confirmed'} · {detail.reviewedWithComplainant ? 'Reviewed' : 'Not confirmed'}</div>
                  {detail.supportingDocumentsReceived && <div className="muted" style={{ fontSize: '.75rem' }}>Supporting documents marked received at intake (not uploaded as attachments).</div>}
                  {detail.immediateReferralRequired && <><span className="muted" style={{ fontSize: '.75rem' }}>Immediate referral requested</span><div>{detail.immediateReferralNotes || 'Yes'}</div></>}
                  {detail.intakeNotes && <><span className="muted" style={{ fontSize: '.75rem' }}>Internal intake notes</span><div style={{ whiteSpace: 'pre-wrap' }}>{detail.intakeNotes}</div></>}
                </div>}
                <div style={{ marginTop: '1rem' }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setReviewing(detail)}>Review / Update Status</button>
                </div>
                {detail.history && detail.history.length > 0 && (
                  <div>
                    <span className="muted" style={{ fontSize: '.75rem' }}>Status History</span>
                    <div style={{ marginTop: '.5rem' }}>
                      {detail.history.map((h, i) => (
                        <div key={i} style={{ padding: '.5rem', borderLeft: '2px solid var(--primary-surface)', marginBottom: '.5rem', paddingLeft: '.75rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{h.status}</div>
                          <div className="muted" style={{ fontSize: '.75rem' }}>{fmtDateTime(h.changedAt)}</div>
                          {h.remarks && <div style={{ fontSize: '.8rem', marginTop: '.25rem' }}>{h.remarks}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <ComplaintDocumentActions complaint={detail} mode="admin" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* LEFT: Complaints List */}
      <div className="card complaints-list-card">
        <div className="card-head">
          <h2 style={{ margin: 0 }}>Complaints</h2>
          <div className="complaint-results-actions">
            <span className="muted" style={{ fontSize: '.8rem' }}>{toPage(complaints.data).total} records</span>
            <label className="complaint-sort-control">
              <span className="sr-only">Sort complaints</span>
              <select aria-label="Sort complaints" value={sortOrder} onChange={(event) => { flushSearch(); setSortOrder(event.target.value); setPage(1) }}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowWalkInForm(true)}><UserPlus size={15} /> Register Walk-in Complaint</button>
          </div>
        </div>
        <div className="complaint-source-metrics">
          <span>Total: <strong>{sourceAnalytics.data?.total ?? '—'}</strong></span>
          <span>Online: <strong>{sourceAnalytics.data?.online ?? '—'}</strong></span>
          <span>Walk-in: <strong>{sourceAnalytics.data?.walkIn ?? '—'}</strong></span>
          <span>Walk-in today: <strong>{sourceAnalytics.data?.walkInToday ?? '—'}</strong></span>
          <span>This month: <strong>{sourceAnalytics.data?.walkInThisMonth ?? '—'}</strong></span>
        </div>
        <Alert>{sourceAnalytics.error}</Alert>
        <Alert>{personnelError}</Alert>
        <div className="complaint-filters">
          <div className="complaint-primary-filters">
            <label className="complaint-search">
              <span className="sr-only">Search complaints</span>
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                placeholder="Reference, complainant, subject, or category"
                value={search}
                onChange={handleSearchChange}
              />
            </label>
            <label className="complaint-filter-field">
              <span>Source</span>
              <select aria-label="Filter complaints by source" value={sourceFilter} onChange={updateFilter(setSourceFilter)}>
                <option value="">All</option>
                <option value="ONLINE">Online</option>
                <option value="WALK-IN">Walk-in</option>
              </select>
            </label>
            <label className="complaint-filter-field">
              <span>Status</span>
              <select aria-label="Filter complaints by status" value={statusFilter} onChange={updateFilter(setStatusFilter)}>
                <option value="">All statuses</option>
                {COMPLAINT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </div>

          <section className="complaint-advanced-filters">
            <button
              type="button"
              className="complaint-advanced-toggle"
              aria-expanded={advancedOpen}
              aria-controls="complaint-advanced-filter-panel"
              onClick={() => setAdvancedOpen((open) => !open)}
            >
              <Filter size={15} aria-hidden="true" />
              Advanced filters
              {activeAdvancedCount > 0 && <span className="complaint-filter-count">{activeAdvancedCount}</span>}
              <ChevronDown className={advancedOpen ? 'expanded' : ''} size={16} aria-hidden="true" />
            </button>

            {advancedOpen && (
              <div id="complaint-advanced-filter-panel" className="complaint-advanced-panel">
                <label className="complaint-filter-field">
                  <span>Category</span>
                  <select value={categoryFilter} onChange={updateFilter(setCategoryFilter)}>
                    <option value="">All categories</option>{COMPLAINT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label className="complaint-filter-field">
                  <span>Priority</span>
                  <select value={priorityFilter} onChange={updateFilter(setPriorityFilter)}>
                    <option value="">All priorities</option>{COMPLAINT_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
                  </select>
                </label>
                <label className="complaint-filter-field">
                  <span>Assigned personnel</span>
                  <select value={assignedPersonnelId} onChange={updateFilter(setAssignedPersonnelId)}>
                    <option value="">Anyone</option>{personnel.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
                  </select>
                </label>
                <label className="complaint-filter-field">
                  <span>Receiving staff</span>
                  <select value={receivedByUserId} onChange={updateFilter(setReceivedByUserId)}>
                    <option value="">Anyone</option>{personnel.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
                  </select>
                </label>
                <label className="complaint-filter-field">
                  <span>Incident location</span>
                  <input value={incidentLocation} onChange={updateFilter(setIncidentLocation)} placeholder="Any location" />
                </label>
                <label className="complaint-filter-field">
                  <span>Date received from</span>
                  <input type="date" value={dateFrom} onChange={updateFilter(setDateFrom)} />
                </label>
                <label className="complaint-filter-field">
                  <span>Date received through</span>
                  <input type="date" value={dateTo} onChange={updateFilter(setDateTo)} />
                </label>
              </div>
            )}
          </section>

          {activeFilters.length > 0 && (
            <div className="complaint-active-filters" aria-label="Active filters">
              {activeFilters.map((filter) => (
                <button type="button" className="complaint-filter-chip" key={filter.label} onClick={filter.clear} aria-label={`Remove ${filter.label} filter`}>
                  {filter.label}<X size={13} aria-hidden="true" />
                </button>
              ))}
              <button type="button" className="complaint-clear-filters" onClick={resetFilters}>Clear all filters</button>
            </div>
          )}
        </div>
        {complaints.loading ? <SkeletonList count={3} lines={3} /> : complaints.error ? <Alert>{complaints.error}</Alert> : items.length === 0
          ? <EmptyState title="No complaints found" />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
              {items.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openDetail(c)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', background: selected?.id === c.id ? 'var(--primary-surface)' : '#fff',
                    border: `1px solid ${selected?.id === c.id ? 'var(--primary)' : 'var(--line)'}`, borderRadius: 'var(--radius)', padding: '.85rem 1rem',
                    cursor: 'pointer', transition: 'all .18s ease', marginBottom: '.35rem',
                    boxShadow: selected?.id === c.id ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
                    <strong style={{ fontSize: '.9rem' }}>{c.subject}</strong>
                    <span className="badge" style={{ background: c.priority === 'Critical' ? '#FEE2E2' : c.priority === 'High' ? '#FFEDD5' : c.priority === 'Medium' ? '#FEF3C7' : '#D1FAE5', color: c.priority === 'Critical' ? '#B42318' : c.priority === 'High' ? '#EA580C' : c.priority === 'Medium' ? '#A85D08' : '#287A4B' }}>{c.priority}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '.75rem', fontSize: '.8rem', color: 'var(--muted-c)', flexWrap: 'wrap' }}>
                    <span>{c.referenceNumber}</span>
                    <span className={`complaint-source-tag ${c.source === 'WALK-IN' ? 'walkin' : ''}`}>{c.source || 'ONLINE'}</span>
                    <span>{c.category}</span>
                    <span>{c.status}</span>
                  </div>
                  {c.source === 'WALK-IN' && <div className="muted" style={{ fontSize: '.75rem', marginTop: '.2rem' }}>Received by {c.receivingPersonnelName || 'Not recorded'}{c.complainantName ? ` · ${c.complainantName}` : ''}</div>}
                  {c.location && <div style={{ fontSize: '.75rem', color: 'var(--muted-c)', marginTop: '.25rem', display: 'flex', alignItems: 'center', gap: '.25rem' }}><MapPin size={12} strokeWidth={1.75} /> {c.location}</div>}
                </button>
              ))}
            </div>
          )}
        <div style={{ marginTop: '1rem' }}>
          {/* Simple pagination */}
          {toPage(complaints.data).total > 10 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem' }}>
              <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => changePage(page - 1)}>Prev</button>
              <span className="muted" style={{ fontSize: '.85rem' }}>Page {page}</span>
              <button type="button" className="btn btn-outline btn-sm" disabled={items.length < 10} onClick={() => changePage(page + 1)}>Next</button>
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
          endpoint="/api/complaints"
          row={reviewing}
          config={{ statuses: COMPLAINT_STATUSES, rows: (d) => [['Reference', d.referenceNumber], ['Source', d.source || 'ONLINE'], ['Category', d.category], ['Subject', d.subject], ['Location', d.location], ['Complainant', d.complainantName || d.residentName], ['Submitted', fmtDateTime(d.submittedAt)]] }}
          onClose={() => setReviewing(null)}
          onChanged={() => { openDetail(reviewing); setReloadKey((k) => k + 1) }}
        />
      )}
      {showWalkInForm && <WalkInComplaintForm onClose={() => setShowWalkInForm(false)} onCreated={onWalkInCreated} />}
    </div>
  )
}