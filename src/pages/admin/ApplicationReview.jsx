import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Alert, EmptyState, Field, Modal, SkeletonList } from '../../components/ui'
import { api, getErrorMessage, toPage } from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'
import { MapPin, FileText, User, Home, ShieldCheck, Clock, CheckCircle2, XCircle, ArrowRight, AlertTriangle } from 'lucide-react'
import LocationPicker from '../../components/LocationPicker'

export default function ApplicationReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [openedTabs, setOpenedTabs] = useState(() => new Set(['Overview']))
  const [reviewMsg, setReviewMsg] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')
  const [showCorrection, setShowCorrection] = useState(false)
  const [correctionFields, setCorrectionFields] = useState([])
  const [showMap, setShowMap] = useState(false)
  const [documents, setDocuments] = useState([])

  const TABS = ['Overview', 'Personal', 'Address', 'Documents', 'Geographic', 'History']

  const loadApp = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/api/admin/resident-registrations/${id}`)
      setApp(data)
      // Load documents
      try {
        const { data: docs } = await api.get(`/api/admin/resident-registrations/${id}/documents`)
        setDocuments(toPage(docs).items || [])
      } catch { setDocuments([]) }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadApp() }, [id])
  useEffect(() => { setOpenedTabs((prev) => { const next = new Set(prev); next.add(activeTab); return next }) }, [activeTab])

  const handleAction = async (action) => {
    setReviewBusy(true)
    setReviewMsg('')
    try {
      if (action === 'approve') {
        await api.post(`/api/admin/resident-registrations/${id}/review`, { status: 'Verified', remarks: reviewNotes.trim() || null })
        setReviewMsg('Application approved. Resident account created.')
      } else if (action === 'reject') {
        if (!reviewNotes.trim()) {
          setError('A rejection reason is required.')
          setReviewBusy(false)
          return
        }
        if (!window.confirm('Reject this entire application? This decision applies to the complete resident application.')) {
          setReviewBusy(false)
          return
        }
        await api.post(`/api/admin/resident-registrations/${id}/review`, { status: 'Rejected', remarks: reviewNotes.trim() })
        setReviewMsg('Application rejected.')
      } else if (action === 'request-correction') {
        if (!reviewNotes.trim()) {
          setError('A correction reason is required.')
          setReviewBusy(false)
          return
        }
        await api.post(`/api/admin/resident-registrations/${id}/request-correction`, { notes: reviewNotes.trim() })
        setReviewMsg('Correction requested. Resident will be notified.')
      }
      await loadApp()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setReviewBusy(false)
    }
  }

  if (loading) return <SkeletonList count={1} lines={8} />
  if (error) return <><Alert>{error}</Alert><button className="btn btn-outline" onClick={() => navigate('/admin/applications')}>Back</button></>
  if (!app) return <EmptyState title="Application not found" />

  const statusColor = (s) => s === 'Verified' ? '#287A4B' : s === 'Rejected' ? '#B42318' : s === 'Additional Information Required' ? '#A85D08' : '#C63F0A'

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Application Review</h1>
          <p className="muted">Application #{app.id} — {app.fullName}</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate('/admin/applications')}>← Back</button>
      </div>

      {reviewMsg && <Alert type="success">{reviewMsg}</Alert>}
      {error && <Alert>{error}</Alert>}

      {/* Header Info */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.5rem 1rem' }}>
          <div><span className="muted" style={{ fontSize: '.75rem' }}>Full Name</span><div style={{ fontWeight: 600 }}>{app.fullName}</div></div>
          <div><span className="muted" style={{ fontSize: '.75rem' }}>Email</span><div>{app.email}</div></div>
          <div><span className="muted" style={{ fontSize: '.75rem' }}>Contact</span><div>{app.contactNumber || '—'}</div></div>
          <div><span className="muted" style={{ fontSize: '.75rem' }}>Status</span><div><span className="badge" style={{ background: `${statusColor(app.status)}20`, color: statusColor(app.status) }}>{app.status}</span></div></div>
          <div><span className="muted" style={{ fontSize: '.75rem' }}>Submitted</span><div>{fmtDate(app.createdAt)}</div></div>
          <div><span className="muted" style={{ fontSize: '.75rem' }}>Reviewer</span><div>{app.reviewedByUserName || '—'}</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
        <div className="tabs" style={{ display: 'flex', flexWrap: 'nowrap', minWidth: 'max-content' }}>
          {TABS.map((tab) => (
            <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>{tab}</button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'Overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem 1rem' }}>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Full Name</span><div style={{ fontWeight: 500 }}>{app.fullName}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Email</span><div style={{ fontWeight: 500 }}>{app.email}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Contact Number</span><div style={{ fontWeight: 500 }}>{app.contactNumber || '—'}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Address</span><div style={{ fontWeight: 500 }}>{app.address || '—'}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Purok</span><div style={{ fontWeight: 500 }}>{app.purok || '—'}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>ID Type</span><div style={{ fontWeight: 500 }}>{app.idType || '—'}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>ID Number</span><div style={{ fontWeight: 500 }}>{app.idNumber || '—'}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Submitted</span><div style={{ fontWeight: 500 }}>{fmtDate(app.createdAt)}</div></div>
          </div>
        )}

        {activeTab === 'Personal' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem 1rem' }}>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Full Name</span><div style={{ fontWeight: 500 }}>{app.fullName}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Email</span><div style={{ fontWeight: 500 }}>{app.email}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Contact Number</span><div style={{ fontWeight: 500 }}>{app.contactNumber || '—'}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Address</span><div style={{ fontWeight: 500 }}>{app.address || '—'}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Purok</span><div style={{ fontWeight: 500 }}>{app.purok || '—'}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>ID Type</span><div style={{ fontWeight: 500 }}>{app.idType || '—'}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>ID Number</span><div style={{ fontWeight: 500 }}>{app.idNumber || '—'}</div></div>
          </div>
        )}

        {activeTab === 'Address' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem 1rem' }}>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Area</span><div style={{ fontWeight: 500 }}>Area 6</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Address</span><div style={{ fontWeight: 500 }}>{app.address || '—'}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Purok</span><div style={{ fontWeight: 500 }}>{app.purok || '—'}</div></div>
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Status</span><div style={{ fontWeight: 500 }}>{app.status}</div></div>
          </div>
        )}

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
            {(app.idFrontUrl || app.idBackUrl || app.idPhotoUrl || app.photo2x2Url) && (
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '.5rem' }}>Uploaded Files</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {app.idFrontUrl && <div style={{ textAlign: 'center' }}><div className="muted" style={{ fontSize: '.75rem' }}>ID Front</div><img src={app.idFrontUrl.startsWith('http') ? app.idFrontUrl : `${api.defaults?.baseURL || ''}${app.idFrontUrl}`} alt="ID Front" style={{ maxWidth: '150px', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }} /></div>}
                  {app.idBackUrl && <div style={{ textAlign: 'center' }}><div className="muted" style={{ fontSize: '.75rem' }}>ID Back</div><img src={app.idBackUrl.startsWith('http') ? app.idBackUrl : `${api.defaults?.baseURL || ''}${app.idBackUrl}`} alt="ID Back" style={{ maxWidth: '150px', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }} /></div>}
                  {app.idPhotoUrl && <div style={{ textAlign: 'center' }}><div className="muted" style={{ fontSize: '.75rem' }}>ID Photo</div><img src={app.idPhotoUrl.startsWith('http') ? app.idPhotoUrl : `${api.defaults?.baseURL || ''}${app.idPhotoUrl}`} alt="ID Photo" style={{ maxWidth: '150px', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }} /></div>}
                  {app.photo2x2Url && <div style={{ textAlign: 'center' }}><div className="muted" style={{ fontSize: '.75rem' }}>2x2 Photo</div><img src={app.photo2x2Url.startsWith('http') ? app.photo2x2Url : `${api.defaults?.baseURL || ''}${app.photo2x2Url}`} alt="2x2" style={{ maxWidth: '100px', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }} /></div>}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Geographic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <div style={{ padding: '.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
              <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Geographic Verification</div>
              <div style={{ fontSize: '.85rem', color: 'var(--muted-c)' }}>Status: <span style={{ color: '#A85D08', fontWeight: 600 }}>Pending Review</span></div>
              <div className="muted" style={{ fontSize: '.75rem', marginTop: '.25rem' }}>Boundary status: UNVERIFIED — manual review required</div>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowMap(true)}>
              <MapPin size={14} strokeWidth={1.75} /> View on map
            </button>
          </div>
        )}

        {activeTab === 'History' && (
          <div>
            <EmptyState title="No review history yet" />
          </div>
        )}
      </div>

      {/* Review Actions */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-head"><h2>Review Actions</h2></div>
        <p className="muted" style={{ fontSize: '.8rem', marginBottom: '.75rem' }}>
          Review all six sections first. The Approve button becomes available only after every section has been opened. Approve and Reject apply to the complete application.
        </p>
        <Field label="Notes" htmlFor="review-notes">
          <textarea id="review-notes" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Add review notes..." maxLength={1000} />
        </Field>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => handleAction('request-correction')} disabled={reviewBusy}>Request Correction</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => handleAction('approve')} disabled={reviewBusy || openedTabs.size < TABS.length} title={openedTabs.size < TABS.length ? 'Review all sections first' : ''}>Approve</button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => handleAction('reject')} disabled={reviewBusy}>Reject</button>
        </div>
      </div>

      {showMap && app && (
        <LocationPicker
          value={app.address || ''}
          lat={app.latitude}
          lng={app.longitude}
          onChange={() => {}}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  )
}