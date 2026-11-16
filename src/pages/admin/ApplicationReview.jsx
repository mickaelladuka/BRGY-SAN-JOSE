import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Alert, EmptyState, Field, SkeletonList } from '../../components/ui'
import { API_BASE_URL, api, getErrorMessage } from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/format'
import { Check, MapPin } from 'lucide-react'
import LocationPicker from '../../components/LocationPicker'
import { useAuth } from '../../context/AuthContext'

const TABS = ['Review', 'Personal', 'Address', 'Geographic', 'Documents', 'Account']
const CORRECTION_OPTIONS = ['Personal information', 'Address', 'Map pin', 'ID details', 'Uploaded documents', 'Account username']

const fileUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `${API_BASE_URL}${value.startsWith('/') ? value : `/uploads/${value}`}`
}

const displayName = (doc) => ({
  ID_FRONT: 'Government ID — front',
  ID_BACK: 'Government ID — back',
  PROOF_OF_RESIDENCY: 'Proof of residency',
  PHOTO_2X2: '2×2 photo',
  ID_PHOTO: 'ID photo',
}[doc.documentType] || doc.documentType || 'Uploaded document')

async function fetchApplicationReview(id) {
  const previewUrls = []
  try {
    const [{ data }, { data: docs }] = await Promise.all([
      api.get(`/api/admin/resident-registrations/${id}`),
      api.get(`/api/admin/resident-registrations/${id}/documents`),
    ])
    const loadedDocuments = []
    for (const doc of Array.isArray(docs) ? docs : []) {
      const { data: file } = await api.get(doc.url, { responseType: 'blob' })
      const previewUrl = URL.createObjectURL(file)
      previewUrls.push(previewUrl)
      loadedDocuments.push({ ...doc, previewUrl })
    }
    return { data, loadedDocuments, previewUrls }
  } catch (err) {
    previewUrls.forEach((url) => URL.revokeObjectURL(url))
    throw err
  }
}

function Detail({ label, value }) {
  return (
    <div className="application-review-detail">
      <span className="muted" style={{ fontSize: '.75rem' }}>{label}</span>
      <div style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{value == null || value === '' ? '—' : value}</div>
    </div>
  )
}

export default function ApplicationReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadedId, setLoadedId] = useState(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewMsg, setReviewMsg] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')
  const [correctionFields, setCorrectionFields] = useState([])
  const [showMap, setShowMap] = useState(false)
  const [documents, setDocuments] = useState([])
  const documentPreviewUrls = useRef([])

  const loadApp = useCallback(async () => {
    try {
      const { data, loadedDocuments, previewUrls } = await fetchApplicationReview(id)
      documentPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url))
      documentPreviewUrls.current = previewUrls
      setApp(data)
      setDocuments(loadedDocuments)
      setReviewNotes(data.status === 'Additional Information Required' ? data.correctionReason || '' : '')
      setCorrectionFields(data.status === 'Additional Information Required' ? data.correctionFields || [] : [])
      setError('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoadedId(id)
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let active = true
    const fetchApplication = async () => {
      try {
        const { data, loadedDocuments, previewUrls } = await fetchApplicationReview(id)
        if (!active) {
          previewUrls.forEach((url) => URL.revokeObjectURL(url))
          return
        }
        documentPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url))
        documentPreviewUrls.current = previewUrls
        setApp(data)
        setDocuments(loadedDocuments)
        setReviewNotes(data.status === 'Additional Information Required' ? data.correctionReason || '' : '')
        setCorrectionFields(data.status === 'Additional Information Required' ? data.correctionFields || [] : [])
        setError('')
      } catch (err) {
        if (active) {
          setApp(null)
          setDocuments([])
          setError(getErrorMessage(err))
        }
      } finally {
        if (active) {
          setLoadedId(id)
          setLoading(false)
        }
      }
    }
    fetchApplication()
    return () => { active = false }
  }, [id])

  useEffect(() => () => {
    documentPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const selectTab = (tab) => {
    setActiveTab(tab)
  }

  const handleAction = async (action) => {
    if (['approve', 'reject'].includes(action) && ['verified', 'rejected'].includes(String(app?.status || '').trim().toLowerCase())) return
    setReviewBusy(true)
    setReviewMsg('')
    setError('')
    try {
      if (action === 'approve') {
        await api.post(`/api/admin/resident-registrations/${id}/review`, { status: 'Verified', remarks: reviewNotes.trim() || null })
        setReviewMsg('Application approved. Resident account created.')
      } else if (action === 'reject') {
        if (!reviewNotes.trim()) {
          setError('A rejection reason is required.')
          return
        }
        if (!window.confirm('Reject this entire application? This decision applies to the complete resident application.')) return
        await api.post(`/api/admin/resident-registrations/${id}/review`, { status: 'Rejected', remarks: reviewNotes.trim() })
        setReviewMsg('Application rejected.')
      } else if (action === 'request-correction') {
        if (!reviewNotes.trim()) {
          setError('A correction reason is required.')
          return
        }
        if (correctionFields.length === 0) {
          setError('Select at least one section that needs correction.')
          return
        }
        const { data } = await api.post(`/api/admin/resident-registrations/${id}/request-correction`, {
          reason: reviewNotes.trim(),
          fields: correctionFields,
        })
        setReviewMsg(data.message || 'Correction request recorded.')
      }
      await loadApp()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setReviewBusy(false)
    }
  }

  if (loading || loadedId !== id) return <SkeletonList count={1} lines={8} />
  if (error && !app) return <><Alert>{error}</Alert><button className="btn btn-outline" onClick={() => navigate('/admin/applications')}>Back</button></>
  if (!app) return <EmptyState title="Application not found" />

  const statusColor = app.status === 'Verified' ? '#287A4B' : app.status === 'Rejected' ? '#B42318' : app.status === 'Additional Information Required' ? '#A85D08' : app.status === 'Correction Resubmitted' ? '#8C2F12' : '#C63F0A'
  const canReject = !['verified', 'rejected'].includes(String(app.status || '').trim().toLowerCase())
  const allDocuments = documents.length > 0 ? documents : [
    ['ID_FRONT', app.idFrontUrl],
    ['ID_BACK', app.idBackUrl],
    ['PROOF_OF_RESIDENCY', app.proofOfResidencyUrl],
    ['PHOTO_2X2', app.photo2x2Url],
  ].filter(([, url]) => url).map(([documentType, storedFileName]) => ({ documentType, storedFileName }))
  const hasDocument = (type, legacyUrl) => Boolean(
    legacyUrl || allDocuments.some((document) => document.documentType === type),
  )
  const missingItems = [
    !app.firstName && { section: 'Personal', label: 'First name' },
    !app.lastName && { section: 'Personal', label: 'Last name' },
    !app.dateOfBirth && { section: 'Personal', label: 'Date of birth' },
    !app.contactNumber && { section: 'Personal', label: 'Mobile number' },
    !app.email && { section: 'Personal', label: 'Email' },
    !app.username && { section: 'Account', label: 'Requested username' },
    !app.areaLocationId && { section: 'Address', label: 'Residential location' },
    !app.houseNumber && { section: 'Address', label: 'House / lot number' },
    (app.latitude == null || app.longitude == null || !app.verificationMethod)
      && { section: 'Geographic', label: 'Residential map pin' },
    !app.consentAccepted && { section: 'Review', label: 'Privacy consent' },
    !app.idType && { section: 'Documents', label: 'ID type' },
    !app.idNumber && { section: 'Documents', label: 'ID number' },
    !hasDocument('ID_FRONT', app.idFrontUrl) && { section: 'Documents', label: 'Government ID — front' },
    !hasDocument('PHOTO_2X2', app.photo2x2Url) && { section: 'Documents', label: '2×2 photo' },
  ].filter(Boolean)
  const applicationComplete = missingItems.length === 0
  const sectionMissingCounts = Object.fromEntries(TABS.map((tab) => [
    tab,
    missingItems.filter((item) => item.section === tab).length,
  ]))
  const activeTabIndex = TABS.indexOf(activeTab)
  const canApprove = applicationComplete
  const canDecide = role !== 'AdminStaff'
  const hasCorrectionResubmission = (app.correctionHistory || []).some((entry) => entry.resubmittedAt)

  const toggleCorrectionField = (field) => setCorrectionFields((prev) => (
    prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field]
  ))

  return (
    <div className="application-review">
      <div className="page-head application-review-head">
        <div>
          <h1>Resident Application Review</h1>
          <p className="muted">Application #{app.id} — {app.fullName}</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate('/admin/applications')}>← Back</button>
      </div>

      {reviewMsg && <Alert type="success">{reviewMsg}</Alert>}
      {error && <Alert>{error}</Alert>}

      <div className="card application-review-overview">
        <div className="application-review-overview-grid">
          <Detail label="Applicant" value={app.fullName} />
          <Detail label="Email" value={app.email} />
          <Detail label="Mobile number" value={app.contactNumber} />
          <div className="application-review-detail"><span className="muted" style={{ fontSize: '.75rem' }}>Status</span><div><span className="badge application-review-status" style={{ background: `${statusColor}20`, color: statusColor }}>{app.status}</span></div></div>
          <Detail label="Submitted" value={fmtDateTime(app.lastSubmittedAt || app.createdAt)} />
          <Detail label="Last reviewed by" value={app.reviewedByUserName} />
        </div>
      </div>

      <div className="application-review-stepper-wrap">
        <div className="tabs application-review-stepper" role="tablist" aria-label="Application sections">
          {TABS.map((tab, index) => {
            const needsAttention = sectionMissingCounts[tab] > 0
            const active = activeTab === tab
            return (
              <button key={tab} type="button" role="tab" aria-selected={active} onClick={() => selectTab(tab)} className="application-review-step">
                <span className={`application-review-step-marker${needsAttention ? ' needs-attention' : ''}${!needsAttention ? ' complete' : ''}`}>
                  {needsAttention ? index + 1 : <Check size={14} strokeWidth={2.5} />}
                </span>
                <span className="application-review-step-label">{tab}</span>
                <span className="sr-only">{needsAttention ? `${sectionMissingCounts[tab]} items need attention` : 'Complete'}</span>
              </button>
            )
          })}
        </div>
        <div className="application-review-step-meta muted">
          <span>Section {activeTabIndex + 1} of {TABS.length}</span>
          <span>{missingItems.length ? `${missingItems.length} required item${missingItems.length === 1 ? '' : 's'} to check` : 'Required information complete'}</span>
        </div>
      </div>

      <div className="application-review-workspace">
        <section className="application-review-main" aria-label={`${activeTab} application details`}>
        <div className="card application-review-section">
        {activeTab === 'Personal' && (
          <div className="application-review-fields">
            <Detail label="First name" value={app.firstName} />
            <Detail label="Middle name" value={app.middleName} />
            <Detail label="Last name" value={app.lastName} />
            <Detail label="Suffix" value={app.suffix} />
            <Detail label="Date of birth" value={app.dateOfBirth ? fmtDate(app.dateOfBirth) : null} />
            <Detail label="Mobile number" value={app.contactNumber} />
            <Detail label="Email" value={app.email} />
          </div>
        )}

        {activeTab === 'Address' && (
          <div className="application-review-fields">
            <Detail label="Area" value="Area 6" />
            <Detail label="Residential location" value={app.areaLocationName} />
            <Detail label="Location code" value={app.areaLocationCode} />
            <Detail label="House / lot number" value={app.houseNumber} />
            <Detail label="Landmark" value={app.landmark} />
            <Detail label="Complete address" value={app.address} />
          </div>
        )}

        {activeTab === 'Geographic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <div className="application-review-fields">
              <Detail label="Verification status" value={app.geographicVerificationStatus} />
              <Detail label="Boundary status" value={app.boundaryStatus} />
              <Detail label="Pin method" value={app.verificationMethod} />
              <Detail label="Manual review required" value={app.requiresManualReview ? 'Yes' : 'No'} />
              <Detail label="Latitude" value={app.latitude} />
              <Detail label="Longitude" value={app.longitude} />
            </div>
            {app.latitude != null && app.longitude != null ? (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowMap(true)}>
                <MapPin size={14} strokeWidth={1.75} /> View submitted pin
              </button>
            ) : <Alert>No map pin was saved with this application.</Alert>}
          </div>
        )}

        {activeTab === 'Documents' && (
          allDocuments.length === 0 ? <EmptyState title="No documents uploaded" /> : (
            <div className="application-review-document-grid">
              {allDocuments.map((doc, index) => {
                const url = doc.previewUrl || fileUrl(doc.url || doc.storedFileName)
                return (
                  <article key={doc.id || `${doc.documentType}-${index}`} className="application-review-document">
                    <a className="application-review-document-preview" href={url || undefined} target={url ? '_blank' : undefined} rel={url ? 'noreferrer' : undefined} aria-label={url ? `Preview ${displayName(doc)}` : undefined}>
                      {url
                        ? <img src={url} alt={displayName(doc)} />
                        : <span className="application-review-document-placeholder">{displayName(doc)}</span>}
                      <span className="application-review-document-badge">{doc.status || 'Submitted'}</span>
                    </a>
                    <div className="application-review-document-info">
                      <strong>{displayName(doc)}</strong>
                      <div className="muted application-review-document-filename">{doc.originalFileName || doc.storedFileName}</div>
                      <div className="muted application-review-document-date">{doc.uploadedAt ? fmtDateTime(doc.uploadedAt) : 'Submitted'}</div>
                    </div>
                  </article>
                )
              })}
            </div>
          )
        )}

        {activeTab === 'Account' && (
          <div className="application-review-fields">
            <Detail label="Requested username" value={app.username} />
            <Detail label="Account status" value={app.status === 'Verified' ? 'Approved' : 'Created only after approval'} />
            <p className="muted" style={{ gridColumn: '1 / -1', margin: 0 }}>The registration password is never stored or shown in the review. A temporary password is created only after approval.</p>
          </div>
        )}

        {activeTab === 'Review' && (
          <div style={{ display: 'grid', gap: '.75rem' }}>
            <Detail label="Privacy consent" value={app.consentAccepted ? 'Accepted' : 'Not recorded'} />
            <Detail label="Consent timestamp" value={app.consentAcceptedAt ? fmtDateTime(app.consentAcceptedAt) : null} />
            <Detail label="Application submitted" value={fmtDateTime(app.createdAt)} />
            {hasCorrectionResubmission && app.lastSubmittedAt && (
              <Detail label="Latest correction resubmission" value={fmtDateTime(app.lastSubmittedAt)} />
            )}
            {(app.correctionHistory || []).map((entry, index) => (
              <section key={`${entry.requestedAt}-${index}`} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '.9rem', background: 'var(--cream)' }}>
                <strong>Correction round {index + 1}</strong>
                <div className="muted" style={{ fontSize: '.8rem', marginTop: '.2rem' }}>
                  Requested {fmtDateTime(entry.requestedAt)}
                  {entry.resubmittedAt ? ` · Resubmitted ${fmtDateTime(entry.resubmittedAt)}` : ' · Awaiting resident submission'}
                </div>
                <Detail label="Administrator's reason" value={entry.reason} />
                <Detail label="Sections requested" value={(entry.fields || []).join(', ')} />
                {Object.keys(entry.changes || {}).length > 0 && (
                  <div style={{ display: 'grid', gap: '.45rem', marginTop: '.7rem' }}>
                    <strong style={{ fontSize: '.85rem' }}>Previous and updated values</strong>
                    {Object.entries(entry.changes).map(([field, change]) => (
                      <div key={field} className="correction-change-row">
                        <strong style={{ fontSize: '.82rem' }}>{field}</strong>
                        <div><span className="muted" style={{ fontSize: '.72rem' }}>Previous</span><div style={{ overflowWrap: 'anywhere' }}>{change.previousValue || '—'}</div></div>
                        <div><span className="muted" style={{ fontSize: '.72rem' }}>Updated</span><div style={{ overflowWrap: 'anywhere' }}>{change.updatedValue || '—'}</div></div>
                      </div>
                    ))}
                  </div>
                )}
                {(entry.newDocuments || []).length > 0 && (
                  <div style={{ marginTop: '.7rem' }}>
                    <strong style={{ fontSize: '.85rem' }}>Newly uploaded documents</strong>
                    {(entry.newDocuments || []).map((file) => {
                      const uploaded = documents.find((doc) => doc.id === file.fileId)
                      return (
                        <div key={file.fileId} className="muted" style={{ fontSize: '.8rem', marginTop: '.3rem' }}>
                          {uploaded?.previewUrl
                            ? <a href={uploaded.previewUrl} target="_blank" rel="noreferrer">{file.fileName}</a>
                            : file.fileName}
                          {' · '}{displayName({ documentType: file.documentType })} · {fmtDateTime(file.uploadedAt)}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            ))}
            <section style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '.9rem' }}>
              <strong>Review history</strong>
              {(app.reviewHistory || []).length === 0 ? <p className="muted" style={{ marginBottom: 0 }}>No review events recorded.</p> : (
                <div style={{ display: 'grid', gap: '.65rem', marginTop: '.65rem' }}>
                  {app.reviewHistory.map((event, index) => (
                    <div key={`${event.timestamp}-${index}`} style={{ borderTop: '1px solid var(--line)', paddingTop: '.55rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.6rem', flexWrap: 'wrap' }}>
                        <strong>{event.action}</strong><span className="muted" style={{ fontSize: '.8rem' }}>{fmtDateTime(event.timestamp)}</span>
                      </div>
                      <div className="muted" style={{ fontSize: '.8rem' }}>{event.actorName || 'System'}{event.details ? ` · ${event.details}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '.9rem', background: 'var(--cream)' }}>
              <strong>{applicationComplete ? 'Ready for decision' : `${missingItems.length} required item${missingItems.length === 1 ? '' : 's'} need attention`}</strong>
              {applicationComplete ? (
                <p className="muted" style={{ margin: '.35rem 0 0' }}>All required registration fields and documents are present. Optional fields, including landmark, may be left blank.</p>
              ) : (
                <div style={{ display: 'grid', gap: '.45rem', marginTop: '.65rem' }}>
                  {missingItems.map((item) => (
                    <div key={`${item.section}-${item.label}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                      <span>{item.label}</span>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => selectTab(item.section)}>Review {item.section}</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', marginTop: '1.25rem', paddingTop: '.85rem', borderTop: '1px solid var(--line)' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => selectTab(TABS[activeTabIndex - 1])} disabled={activeTabIndex === 0}>Previous section</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => selectTab(TABS[activeTabIndex + 1])} disabled={activeTabIndex === TABS.length - 1}>Next section</button>
              </div>
            </div>
          </div>
        )}
        </div>
        </section>

      <aside className="card application-review-actions">
        <div className="card-head"><h2>Review Actions</h2></div>
        <p className="muted" style={{ fontSize: '.8rem', marginBottom: '.75rem' }}>
          Check the section indicators above. Required information must be complete before approval; landmark is optional.
        </p>
        <div style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--line)', borderRadius: 'var(--radius)', background: 'var(--off-white)' }}>
          <Field label="Review notes or reason" htmlFor="review-notes">
            <textarea id="review-notes" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Explain what needs to be corrected, or why the application is rejected..." maxLength={800} rows={3} style={{ minHeight: '96px', resize: 'vertical' }} />
            <span className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem' }}>
              <span>A reason is required when requesting corrections or rejecting.</span>
              <span>{reviewNotes.length}/800</span>
            </span>
          </Field>
          <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <legend style={{ width: '100%', fontWeight: 600, fontSize: '.9rem', marginBottom: '.2rem' }}>
              Sections needing correction
            </legend>
            <p className="muted" style={{ fontSize: '.78rem', marginBottom: '.65rem' }}>
              Select the parts the resident should update{correctionFields.length ? ` · ${correctionFields.length} selected` : ''}.
            </p>
            <div className="application-review-correction-options">
            {CORRECTION_OPTIONS.map((field) => (
                <label key={field} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.65rem',
                  minHeight: '44px',
                  padding: '.55rem .7rem',
                  border: `1px solid ${correctionFields.includes(field) ? 'var(--primary)' : 'var(--line)'}`,
                  borderRadius: 'var(--radius-sm)',
                  background: correctionFields.includes(field) ? 'var(--primary-surface)' : '#fff',
                  cursor: 'pointer',
                  fontSize: '.84rem',
                  lineHeight: 1.3,
                  transition: 'background .15s, border-color .15s',
                }}>
                  <input
                    type="checkbox"
                    checked={correctionFields.includes(field)}
                    onChange={() => toggleCorrectionField(field)}
                    style={{
                      width: '18px',
                      height: '18px',
                      minHeight: '18px',
                      flex: '0 0 18px',
                      margin: 0,
                      padding: 0,
                      accentColor: 'var(--primary)',
                      cursor: 'pointer',
                    }}
                  />
                  <span>{field}</span>
                </label>
            ))}
            </div>
          </fieldset>
        </div>
        <div className="application-review-action-footer">
          <span className="muted" style={{ fontSize: '.78rem' }}>
            {reviewBusy ? 'Saving your decision…' : applicationComplete ? 'Required details are complete.' : 'Approval is unavailable until required details are complete.'}
          </span>
          <div className="application-review-action-buttons">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => handleAction('request-correction')} disabled={reviewBusy}>Request correction</button>
            {canDecide && (
              <>
                {canReject && <button type="button" className="btn btn-danger btn-sm" onClick={() => handleAction('reject')} disabled={reviewBusy}>Reject application</button>}
                {canReject && <button type="button" className="btn btn-primary btn-sm" onClick={() => handleAction('approve')} disabled={reviewBusy || !canApprove} title={!applicationComplete ? 'Review the required items listed in the Review section' : ''}>Approve application</button>}
              </>
            )}
          </div>
        </div>
      </aside>
      </div>

      {showMap && (
        <LocationPicker
          value={app.address || ''}
          lat={Number(app.latitude)}
          lng={Number(app.longitude)}
          onChange={() => {}}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  )
}
