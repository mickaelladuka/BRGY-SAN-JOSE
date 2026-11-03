import { useState, useEffect } from 'react'
import { Alert, EmptyState, Field, Modal, SkeletonList } from '../../components/ui'
import { api, getErrorMessage, toPage } from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'
import { Users, MapPin, Phone, Mail, FileText, X, Pencil, ShieldOff, Eye } from 'lucide-react'

const PUROKS = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6']
const TABS = ['Overview', 'Personal', 'Address', 'Verification', 'Documents', 'Complaints', 'Activity']

export default function ResidentsView() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [archivedFilter, setArchivedFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [activeTab, setActiveTab] = useState('Overview')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [editPhoto, setEditPhoto] = useState(null)
  const [verificationHistory, setVerificationHistory] = useState([])
  const [documents, setDocuments] = useState([])
  const [complaints, setComplaints] = useState([])
  const [activity, setActivity] = useState([])

  const params = new URLSearchParams()
  if (search) params.set('q', search)
  if (archivedFilter) params.set('archived', archivedFilter)
  params.set('_r', reloadKey)
  const residents = useFetch(`/api/residents?${params.toString()}`, { page, pageSize: 10 })

  const openDetail = async (r) => {
    setSelected(r)
    setDetailLoading(true)
    setActiveTab('Overview')
    try {
      const { data } = await api.get(`/api/residents/${r.id}`)
      setDetail(data)
      // Load verification history
      try {
        const { data: vh } = await api.get(`/api/residents/${r.id}/verification-history`)
        setVerificationHistory(vh || [])
      } catch { setVerificationHistory([]) }
      // Load documents
      try {
        const { data: docs } = await api.get(`/api/residents/${r.id}/documents`)
        setDocuments(toPage(docs).items || [])
      } catch { setDocuments([]) }
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

  const startEdit = () => {
    setEditForm({
      firstName: detail.firstName || '',
      lastName: detail.lastName || '',
      address: detail.address || '',
      contactNumber: detail.contactNumber || '',
      purok: detail.purok || '',
    })
    setEditPhoto(null)
    setEditError('')
    setEditing(true)
  }

  const uploadFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('http://localhost:5085/api/upload/document', {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Upload failed')
    }
    const data = await res.json()
    return data.url
  }

  const saveEdit = async (ev) => {
    ev.preventDefault()
    setEditBusy(true)
    setEditError('')
    try {
      let photoUrl = detail.photoUrl
      if (editPhoto) {
        photoUrl = await uploadFile(editPhoto)
      }
      const { data } = await api.put(`/api/residents/${detail.id}`, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        address: editForm.address.trim() || null,
        contactNumber: editForm.contactNumber.trim() || null,
        purok: editForm.purok || null,
        photoUrl: photoUrl || null,
      })
      setDetail(data)
      setSelected({ ...selected, ...data })
      setEditing(false)
      setEditPhoto(null)
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update resident')
    } finally {
      setEditBusy(false)
    }
  }

  const items = toPage(residents.data).items

  const statusColor = (s) => s === 'Verified' ? '#287A4B' : s === 'Rejected' ? '#B42318' : s === 'Pending' ? '#A85D08' : '#78716C'

  return (
    <div className="residents-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', minHeight: 'calc(100vh - 120px)', minWidth: 0, maxWidth: '100%' }}>
      {/* LEFT: Resident List */}
      <div className="card" style={{ overflow: 'auto', minWidth: 0 }}>
        <div className="card-head">
          <h2 style={{ margin: 0 }}>Residents</h2>
          <span className="muted" style={{ fontSize: '.8rem' }}>{toPage(residents.data).total} records</span>
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

      {/* RIGHT: Resident Details */}
      <div className="card" style={{ overflow: 'auto', minWidth: 0 }}>
        <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Resident Details</h2>
          {selected && (
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={startEdit}>
                <Pencil size={14} strokeWidth={1.75} /> Edit
              </button>
              <button type="button" className={`btn btn-sm ${detail?.isArchived ? 'btn-primary' : 'btn-danger'}`} onClick={async () => {
                if (detail?.isArchived) {
                  alert('Unarchive not yet implemented')
                } else {
                  if (!confirm(`Archive ${detail?.firstName} ${detail?.lastName}?`)) return
                  try {
                    await api.delete(`/api/residents/${detail.id}`)
                    setDetail({ ...detail, isArchived: true })
                    setSelected({ ...selected, isArchived: true })
                    setReloadKey((k) => k + 1)
                  } catch (err) {
                    alert('Failed to archive resident')
                  }
                }
              }}>
                <ShieldOff size={14} strokeWidth={1.75} /> {detail?.isArchived ? 'Archived' : 'Archive'}
              </button>
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
                    <div style={{ fontSize: '.75rem', color: 'var(--muted-c)' }}>Identity</div>
                    <div style={{ fontWeight: 600, color: '#287A4B' }}>Verified</div>
                  </div>
                  <div style={{ padding: '.5rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                    <div style={{ fontSize: '.75rem', color: 'var(--muted-c)' }}>Documents</div>
                    <div style={{ fontWeight: 600, color: '#A85D08' }}>Pending</div>
                  </div>
                  <div style={{ padding: '.5rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                    <div style={{ fontSize: '.75rem', color: 'var(--muted-c)' }}>Address</div>
                    <div style={{ fontWeight: 600, color: '#287A4B' }}>Verified</div>
                  </div>
                  <div style={{ padding: '.5rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                    <div style={{ fontSize: '.75rem', color: 'var(--muted-c)' }}>Geographic</div>
                    <div style={{ fontWeight: 600, color: '#A85D08' }}>Pending Review</div>
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
                <div style={{ padding: '.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Identity Verification</div>
                  <div style={{ fontSize: '.85rem', color: 'var(--muted-c)' }}>Status: <span style={{ color: '#287A4B', fontWeight: 600 }}>Verified</span></div>
                </div>
                <div style={{ padding: '.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Document Verification</div>
                  <div style={{ fontSize: '.85rem', color: 'var(--muted-c)' }}>Status: <span style={{ color: '#A85D08', fontWeight: 600 }}>Pending</span></div>
                </div>
                <div style={{ padding: '.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Residential Address Verification</div>
                  <div style={{ fontSize: '.85rem', color: 'var(--muted-c)' }}>Status: <span style={{ color: '#287A4B', fontWeight: 600 }}>Verified</span></div>
                </div>
                <div style={{ padding: '.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Geographic Verification</div>
                  <div style={{ fontSize: '.85rem', color: 'var(--muted-c)' }}>Status: <span style={{ color: '#A85D08', fontWeight: 600 }}>Pending Review</span></div>
                  <div className="muted" style={{ fontSize: '.75rem', marginTop: '.25rem' }}>Boundary status: UNVERIFIED — manual review required</div>
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