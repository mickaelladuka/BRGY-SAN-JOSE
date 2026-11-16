import { useState, useEffect } from 'react'
import { Alert, EmptyState, Field, Modal, SkeletonList } from '../../components/ui'
import { api, getErrorMessage, toPage } from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'
import { Users, X, Download } from 'lucide-react'

const TABS = ['Overview', 'Personal', 'Address', 'Verification', 'Documents', 'Complaints', 'Activity']
const EXPORT_COLUMNS = [
  ['residentId', 'Resident ID'], ['fullName', 'Full name'], ['contactNumber', 'Contact number'],
  ['email', 'Email'], ['address', 'Residential address'], ['location', 'Approved Area 6 location'],
  ['verificationStatus', 'Verification status'], ['registrationDate', 'Date registered'],
  ['verificationDate', 'Application approval date'], ['accountStatus', 'Account status'],
]

const formatVerificationStatus = (status) => String(status || 'Not Recorded')
  .replace(/[_-]+/g, ' ')
  .toLowerCase()
  .replace(/\b\w/g, (letter) => letter.toUpperCase())

const verificationColor = (status) => {
  const value = String(status || '').toLowerCase()
  if (value.includes('verified')) return '#287A4B'
  if (value.includes('reject')) return '#B42318'
  if (value.includes('pending') || value.includes('review') || value.includes('resubmission')) return '#A85D08'
  return '#74665E'
}

function VerificationValue({ label, status }) {
  return (
    <div>
      <div style={{ fontSize: '.75rem', color: 'var(--muted-c)' }}>{label}</div>
      <div style={{ fontWeight: 600, color: verificationColor(status) }}>{formatVerificationStatus(status)}</div>
    </div>
  )
}

export default function ResidentsView() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [archivedFilter, setArchivedFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('Overview')
  const [documents, setDocuments] = useState([])
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [verificationError, setVerificationError] = useState('')
  const [complaints, setComplaints] = useState([])
  const [activity, setActivity] = useState([])
  const [showExport, setShowExport] = useState(false)
  const [exportForm, setExportForm] = useState({ format: 'xlsx', dateFrom: '', dateTo: '' })
  const [exportCount, setExportCount] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState('')

  const params = new URLSearchParams()
  if (search) params.set('q', search)
  if (archivedFilter) params.set('archived', archivedFilter)
  const residents = useFetch(`/api/residents?${params.toString()}`, { page, pageSize: 10 })

  const openDetail = async (r) => {
    setSelected(r)
    setVerificationStatus(null)
    setVerificationError('')
    setDetailLoading(true)
    setActiveTab('Overview')
    try {
      const { data } = await api.get(`/api/residents/${r.id}`)
      setDetail(data)
      // Load documents
      try {
        const { data: docs } = await api.get(`/api/residents/${r.id}/documents`)
        setDocuments(toPage(docs).items || [])
      } catch { setDocuments([]) }
      try {
        const { data: status } = await api.get(`/api/residents/${r.id}/verification-status`)
        setVerificationStatus(status)
      } catch (err) {
        setVerificationStatus(null)
        setVerificationError(err.response?.status === 404
          ? 'The verification status endpoint is not available in the running backend. Restart the backend API, then reopen this resident.'
          : getErrorMessage(err, 'Could not load verification status.'))
      }
      // Load complaints (filtered by resident)
      try {
        const { data: comp } = await api.get(`/api/complaints?residentId=${r.id}`)
        setComplaints(toPage(comp).items || [])
      } catch { setComplaints([]) }
      // Load activity
      try {
        const { data: act } = await api.get(`/api/audit-logs?q=Resident+${r.id}`)
        setActivity(toPage(act).items || [])
      } catch { setActivity([]) }
    } catch (err) {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const items = toPage(residents.data).items
  const documentStatus = verificationStatus?.documents || (documents.length === 0
    ? 'Not Submitted'
    : documents.every((doc) => String(doc.status || '').toUpperCase() === 'VERIFIED')
      ? 'Verified'
      : documents.some((doc) => String(doc.status || '').toUpperCase() === 'REJECTED')
        ? 'Rejected'
        : 'Pending')
  const residentVerificationValue = (key) => verificationStatus?.[key] || (verificationError ? 'Unavailable' : 'Not Recorded')

  const exportParams = () => ({ dateFrom: exportForm.dateFrom || undefined, dateTo: exportForm.dateTo || undefined })

  const openExport = async () => {
    setExportError('')
    setExportCount(null)
    setShowExport(true)
  }

  useEffect(() => {
    if (!showExport) return undefined
    let active = true
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true)
      setExportError('')
      try {
        const { data } = await api.get('/api/residents/export/preview', { params: exportParams() })
        if (!active) return
        setExportCount(data.total)
      } catch (err) {
        if (active) setExportError(getErrorMessage(err, 'Could not preview eligible residents.'))
      } finally {
        if (active) setPreviewLoading(false)
      }
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [showExport, exportForm.dateFrom, exportForm.dateTo])

  const downloadResidents = async () => {
    setExportLoading(true)
    setExportError('')
    try {
      const { data } = await api.get('/api/residents/export', { params: { ...exportParams(), format: exportForm.format }, responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `Annex6_Verified_Residents.${exportForm.format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setShowExport(false)
    } catch (err) {
      setExportError(getErrorMessage(err, 'Could not export verified residents.'))
    } finally {
      setExportLoading(false)
    }
  }

  const statusColor = (s) => s === 'Verified' ? '#287A4B' : s === 'Rejected' ? '#B42318' : s === 'Pending' ? '#A85D08' : '#78716C'

  return (
    <div className="residents-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', minHeight: 'calc(100vh - 120px)', minWidth: 0, maxWidth: '100%' }}>
      {/* LEFT: Resident List */}
      <div className="card" style={{ overflow: 'auto', minWidth: 0 }}>
        <div className="card-head">
          <h2 style={{ margin: 0 }}>Residents</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span className="muted" style={{ fontSize: '.8rem' }}>{toPage(residents.data).total} records</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={openExport}><Download size={14} /> Export Residents</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.75rem', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search residents..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            style={{ flex: 1, minWidth: '150px', padding: '.5rem .75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', fontSize: '.85rem' }}
          />
          <select value={archivedFilter} onChange={(e) => { setArchivedFilter(e.target.value); setPage(1) }} style={{ padding: '.5rem .75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', fontSize: '.85rem' }}>
            <option value="">All</option>
            <option value="false">Active</option>
            <option value="true">Archived</option>
          </select>
        </div>
        {residents.loading ? <SkeletonList count={3} lines={3} /> : residents.error ? <Alert>{residents.error}</Alert> : items.length === 0
          ? <EmptyState title="No residents found" />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
              {items.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openDetail(r)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', background: selected?.id === r.id ? 'var(--primary-surface)' : '#fff',
                    border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '.75rem 1rem',
                    cursor: 'pointer', transition: 'all .15s', marginBottom: '.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
                    <strong style={{ fontSize: '.9rem' }}>{r.lastName}, {r.firstName}</strong>
                    <span className="badge" style={{ background: r.isArchived ? '#FEE2E2' : '#D1FAE5', color: r.isArchived ? '#991B1B' : '#166534' }}>{r.isArchived ? 'Archived' : 'Active'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '.75rem', fontSize: '.8rem', color: 'var(--muted-c)', flexWrap: 'wrap' }}>
                    <span>{r.address || 'No address'}</span>
                    <span>{r.contactNumber || 'No contact'}</span>
                  </div>
                  {r.email && <div style={{ fontSize: '.75rem', color: 'var(--muted-c)', marginTop: '.25rem' }}>{r.email}</div>}
                </button>
              ))}
            </div>
          )}
        {toPage(residents.data).total > 10 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
            <span className="muted" style={{ fontSize: '.85rem' }}>Page {page}</span>
            <button type="button" className="btn btn-outline btn-sm" disabled={items.length < 10} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </div>

      {showExport && (
        <Modal title="Export Verified Residents" subtitle="Only approved applications linked to resident records are eligible." wide onClose={() => !exportLoading && setShowExport(false)} footer={(
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowExport(false)} disabled={exportLoading}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={downloadResidents} disabled={exportLoading || previewLoading || exportCount === null || exportCount === 0}>
              <Download size={15} /> {exportLoading ? 'Preparing…' : 'Export all matching residents'}
            </button>
          </>
        )}>
          {exportError && <Alert>{exportError}</Alert>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem' }}>
            <Field label="Format" htmlFor="resident-export-format"><select id="resident-export-format" value={exportForm.format} onChange={(e) => setExportForm((f) => ({ ...f, format: e.target.value }))}><option value="xlsx">Excel (.xlsx)</option><option value="pdf">PDF (.pdf)</option><option value="csv">CSV (.csv)</option></select></Field>
            <Field label="Registered from" htmlFor="resident-export-from"><input id="resident-export-from" type="date" value={exportForm.dateFrom} onChange={(e) => setExportForm((f) => ({ ...f, dateFrom: e.target.value }))} /></Field>
            <Field label="Registered through" htmlFor="resident-export-to"><input id="resident-export-to" type="date" value={exportForm.dateTo} onChange={(e) => setExportForm((f) => ({ ...f, dateTo: e.target.value }))} /></Field>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <strong style={{ fontSize: '.9rem' }}>Included resident list fields</strong>
            <div className="muted" style={{ marginTop: '.35rem', lineHeight: 1.7 }}>{EXPORT_COLUMNS.map(([, label]) => label).join(' · ')}</div>
          </div>
          <div style={{ marginTop: '1rem', padding: '.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--cream)', border: '1px solid var(--line)' }}>
            <div style={{ fontWeight: 700 }}>VERIFIED RESIDENTS MASTERLIST</div>
            <div className="muted" style={{ marginTop: '.25rem' }}>{previewLoading ? 'Counting eligible residents…' : `${exportCount ?? '—'} eligible residents`} · all matching pages included</div>
            <div className="muted" style={{ fontSize: '.8rem', marginTop: '.25rem' }}>Exports the complete verified residents list within the selected registration date range, regardless of the table search or current page.</div>
          </div>
          {exportCount === 0 && !previewLoading && <EmptyState title="No eligible residents match these filters" />}
        </Modal>
      )}

      {/* RIGHT: Resident Details */}
      <div className="card" style={{ overflow: 'auto', minWidth: 0 }}>
        <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Resident Details</h2>
          {selected && (
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button type="button" className="icon-btn" onClick={() => { setSelected(null); setDetail(null) }}><X size={18} strokeWidth={1.75} /></button>
            </div>
          )}
        </div>
        {!selected ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted-c)' }}>
            <Users size={48} strokeWidth={1.5} style={{ marginBottom: '1rem', opacity: .4 }} />
            <div>Select a resident to view details</div>
          </div>
        ) : detailLoading ? (
          <SkeletonList count={1} lines={6} />
        ) : !detail ? (
          <Alert>Could not load resident details.</Alert>
        ) : (
          <div>
            {/* Tabs - horizontally scrollable */}
            <div style={{ overflowX: 'auto', marginBottom: '1rem', WebkitOverflowScrolling: 'touch' }}>
              <div className="tabs" style={{ display: 'flex', flexWrap: 'nowrap', minWidth: 'max-content' }}>
                {TABS.map((tab) => (
                  <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>{tab}</button>
                ))}
              </div>
            </div>

            {/* Photos Row */}
            {(activeTab === 'Overview' || activeTab === 'Personal') && (
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '.75rem', color: 'var(--muted-c)', marginBottom: '.5rem', fontWeight: 600 }}>Profile Photo (2x2)</div>
                  {detail.photoUrl ? (
                    <img src={detail.photoUrl.startsWith('http') ? detail.photoUrl : `${api.defaults?.baseURL || ''}${detail.photoUrl}`} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--line)' }} />
                  ) : (
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary-surface)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 700, border: '3px solid var(--line)' }}>
                      {`${detail.lastName?.[0] || ''}${detail.firstName?.[0] || ''}`.toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '.75rem', color: 'var(--muted-c)', marginBottom: '.5rem', fontWeight: 600 }}>ID Photo (Verification)</div>
                  {detail.idPhotoUrl ? (
                    <img src={detail.idPhotoUrl.startsWith('http') ? detail.idPhotoUrl : `${api.defaults?.baseURL || ''}${detail.idPhotoUrl}`} alt="ID" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: 'var(--radius)', border: '1px solid var(--line)', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ padding: '2rem', color: 'var(--muted-c)', fontSize: '.8rem', border: '1px dashed var(--line)', borderRadius: 'var(--radius)' }}>No ID photo uploaded</div>
                  )}
                </div>
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'Overview' && (
              <div>
                {verificationError && <Alert>{verificationError}</Alert>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem 1rem', marginBottom: '1rem' }}>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Full name</span><div style={{ fontWeight: 500 }}>{detail.lastName}, {detail.firstName}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Resident ID</span><div style={{ fontWeight: 500 }}>#{detail.id}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Username</span><div style={{ fontWeight: 500 }}>{detail.email || '—'}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Contact</span><div style={{ fontWeight: 500 }}>{detail.contactNumber || '—'}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Registration date</span><div style={{ fontWeight: 500 }}>{fmtDate(detail.createdAt)}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Account status</span><div style={{ fontWeight: 500 }}>{detail.isArchived ? 'Archived' : 'Active'}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Residential location</span><div style={{ fontWeight: 500 }}>{detail.purok || '—'}</div></div>
                </div>
                <h3 style={{ fontSize: '.9rem', marginBottom: '.5rem' }}>Verification Status</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                  <div style={{ padding: '.5rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                    <VerificationValue label="Identity" status={residentVerificationValue('identity')} />
                  </div>
                  <div style={{ padding: '.5rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                    <VerificationValue label="Documents" status={documentStatus} />
                  </div>
                  <div style={{ padding: '.5rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                    <VerificationValue label="Address" status={residentVerificationValue('address')} />
                  </div>
                  <div style={{ padding: '.5rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                    <VerificationValue label="Geographic" status={residentVerificationValue('geographic')} />
                  </div>
                </div>
              </div>
            )}

            {/* Personal Info Tab */}
            {activeTab === 'Personal' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem 1rem' }}>
                <div><span className="muted" style={{ fontSize: '.75rem' }}>First name</span><div style={{ fontWeight: 500 }}>{detail.firstName || '—'}</div></div>
                <div><span className="muted" style={{ fontSize: '.75rem' }}>Last name</span><div style={{ fontWeight: 500 }}>{detail.lastName || '—'}</div></div>
                <div><span className="muted" style={{ fontSize: '.75rem' }}>Contact number</span><div style={{ fontWeight: 500 }}>{detail.contactNumber || '—'}</div></div>
                <div><span className="muted" style={{ fontSize: '.75rem' }}>Email</span><div style={{ fontWeight: 500 }}>{detail.email || '—'}</div></div>
                <div><span className="muted" style={{ fontSize: '.75rem' }}>Purok</span><div style={{ fontWeight: 500 }}>{detail.purok || '—'}</div></div>
                <div><span className="muted" style={{ fontSize: '.75rem' }}>ID type</span><div style={{ fontWeight: 500 }}>{detail.idType || '—'}</div></div>
                <div><span className="muted" style={{ fontSize: '.75rem' }}>ID number</span><div style={{ fontWeight: 500 }}>{detail.idNumber || '—'}</div></div>
                <div><span className="muted" style={{ fontSize: '.75rem' }}>Created</span><div style={{ fontWeight: 500 }}>{fmtDate(detail.createdAt)}</div></div>
                <div><span className="muted" style={{ fontSize: '.75rem' }}>Updated</span><div style={{ fontWeight: 500 }}>{detail.updatedAt ? fmtDateTime(detail.updatedAt) : '—'}</div></div>
              </div>
            )}

            {/* Address Tab */}
            {activeTab === 'Address' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem 1rem' }}>
                <div><span className="muted" style={{ fontSize: '.75rem' }}>Area</span><div style={{ fontWeight: 500 }}>Area 6</div></div>
                <div><span className="muted" style={{ fontSize: '.75rem' }}>Residential location</span><div style={{ fontWeight: 500 }}>{detail.purok || '—'}</div></div>
                <div style={{ gridColumn: '1 / -1' }}><span className="muted" style={{ fontSize: '.75rem' }}>Address</span><div style={{ fontWeight: 500 }}>{detail.address || '—'}</div></div>
                <div><span className="muted" style={{ fontSize: '.75rem' }}>Contact</span><div style={{ fontWeight: 500 }}>{detail.contactNumber || '—'}</div></div>
              </div>
            )}

            {/* Verification Tab */}
            {activeTab === 'Verification' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {verificationError && <Alert>{verificationError}</Alert>}
                <div style={{ padding: '.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Identity Verification</div>
                  <div style={{ fontSize: '.85rem', color: 'var(--muted-c)' }}>Status: <span style={{ color: verificationColor(residentVerificationValue('identity')), fontWeight: 600 }}>{formatVerificationStatus(residentVerificationValue('identity'))}</span></div>
                </div>
                <div style={{ padding: '.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Document Verification</div>
                  <div style={{ fontSize: '.85rem', color: 'var(--muted-c)' }}>Status: <span style={{ color: verificationColor(documentStatus), fontWeight: 600 }}>{formatVerificationStatus(documentStatus)}</span></div>
                </div>
                <div style={{ padding: '.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Residential Address Verification</div>
                  <div style={{ fontSize: '.85rem', color: 'var(--muted-c)' }}>Status: <span style={{ color: verificationColor(residentVerificationValue('address')), fontWeight: 600 }}>{formatVerificationStatus(residentVerificationValue('address'))}</span></div>
                </div>
                <div style={{ padding: '.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Geographic Verification</div>
                  <div style={{ fontSize: '.85rem', color: 'var(--muted-c)' }}>Status: <span style={{ color: verificationColor(residentVerificationValue('geographic')), fontWeight: 600 }}>{formatVerificationStatus(residentVerificationValue('geographic'))}</span></div>
                  <div className="muted" style={{ fontSize: '.75rem', marginTop: '.25rem' }}>Boundary status: {formatVerificationStatus(residentVerificationValue('boundary'))}</div>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'Documents' && (
              <div>
                {documents.length === 0 ? (
                  <EmptyState title="No documents uploaded" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {documents.map((doc) => (
                      <div key={doc.id} style={{ padding: '.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                        <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>{doc.documentType}</div>
                        <div className="muted" style={{ fontSize: '.8rem' }}>{doc.originalFileName} · {doc.status}</div>
                        <div className="muted" style={{ fontSize: '.75rem' }}>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Complaints Tab */}
            {activeTab === 'Complaints' && (
              <div>
                {complaints.length === 0 ? (
                  <EmptyState title="No complaints filed" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {complaints.map((c) => (
                      <div key={c.id} style={{ padding: '.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
                          <strong style={{ fontSize: '.85rem' }}>{c.subject}</strong>
                          <span className="badge">{c.status}</span>
                        </div>
                        <div className="muted" style={{ fontSize: '.75rem' }}>{c.referenceNumber} · {c.category} · {fmtDate(c.submittedAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'Activity' && (
              <div>
                {activity.length === 0 ? (
                  <EmptyState title="No activity recorded" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {activity.map((a) => (
                      <div key={a.id} style={{ padding: '.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                        <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{a.action}</div>
                        <div className="muted" style={{ fontSize: '.75rem' }}>{fmtDateTime(a.timestamp)} · {a.userName ?? a.userId ?? 'system'}</div>
                        {a.affectedRecord && <div className="muted" style={{ fontSize: '.75rem' }}>Record: {a.affectedRecord}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
