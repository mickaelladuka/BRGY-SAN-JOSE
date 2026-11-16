import { useCallback, useEffect, useState } from 'react'
import { Alert, Modal } from './ui'
import { api, getErrorMessage } from '../lib/api'
import { Download, FileText, Printer, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './ComplaintDocumentPrint.css'

const dateTime = (value) => value
  ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(value))
  : '—'

export default function ComplaintDocumentActions({ complaint, mode = 'resident' }) {
  const isAdmin = mode === 'admin'
  const { session } = useAuth()
  const canIssue = session?.role === 'OIC' || session?.role === 'Secretary'
  const [documents, setDocuments] = useState([])
  const [requests, setRequests] = useState([])
  const [preview, setPreview] = useState(null)
  const [requestReason, setRequestReason] = useState('')
  const [requestFields, setRequestFields] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const complaintId = complaint?.id

  const refresh = useCallback(async () => {
    if (!complaintId) return
    try {
      if (isAdmin) {
        const [documentResult, requestResult] = await Promise.all([
          api.get(`/api/complaint-documents/complaints/${complaintId}`),
          api.get('/api/complaint-documents/requests', { params: { complaintId } }),
        ])
        setDocuments(Array.isArray(documentResult.data) ? documentResult.data : [])
        const nextRequests = Array.isArray(requestResult.data) ? requestResult.data : []
        setRequests(nextRequests)
        setRequestFields((current) => {
          const next = { ...current }
          nextRequests.forEach((request) => {
            if (!next[request.id]) next[request.id] = {
              reviewReason: '',
              releasedNarrative: request.complaintNarrative || '',
              releasedLocation: request.complaintLocation || '',
            }
          })
          return next
        })
      } else {
        const [documentResult, requestResult] = await Promise.all([
          api.get(`/api/resident/complaints/${complaintId}/documents`),
          api.get(`/api/resident/complaints/${complaintId}/documents/requests`),
        ])
        setDocuments(Array.isArray(documentResult.data) ? documentResult.data : [])
        setRequests(Array.isArray(requestResult.data) ? requestResult.data : [])
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [complaintId, isAdmin])

  useEffect(() => { refresh() }, [refresh])

  const run = async (operation, successMessage) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await operation()
      if (successMessage) setNotice(successMessage)
      return result
    } catch (err) {
      setError(getErrorMessage(err))
      return null
    } finally {
      setBusy(false)
    }
  }

  const generateReceipt = () => run(async () => {
    const url = isAdmin
      ? `/api/complaint-documents/complaints/${complaintId}/receipt`
      : `/api/resident/complaints/${complaintId}/documents/receipt`
    const { data } = await api.post(url)
    setPreview(data)
    await refresh()
    return data
  })

  const requestCaseCopy = async (event) => {
    event.preventDefault()
    const result = await run(
      () => api.post(`/api/resident/complaints/${complaintId}/documents/case-copy-requests`, { reason: requestReason }),
      'Your case-copy request was sent for review.',
    )
    if (result) {
      setRequestReason('')
      await refresh()
    }
  }

  const decideRequest = async (request, decision) => {
    const fields = requestFields[request.id] || {}
    if ((fields.reviewReason || '').trim().length < 5) {
      setError('Enter a review reason of at least 5 characters.')
      return
    }
    const result = await run(() => api.post(
      `/api/complaint-documents/requests/${request.id}/decision`,
      {
        decision,
        reason: fields.reviewReason,
        releasedNarrative: decision === 'Approved' ? fields.releasedNarrative : null,
        releasedLocation: decision === 'Approved' ? fields.releasedLocation : null,
      },
    ), `Request ${decision.toLowerCase()}.`)
    if (result) await refresh()
  }

  const generateCaseCopy = async (request) => {
    const result = await run(async () => {
      const { data } = await api.post(
        `/api/complaint-documents/complaints/${complaintId}/case-copy`,
        { requestId: request.id },
      )
      setPreview(data)
      return data
    })
    if (result) await refresh()
  }

  const openDocument = (document) => run(async () => {
    const { data } = await api.get(`/api/complaint-documents/${document.id}`)
    setPreview(data)
  })

  const issueDocument = async (document) => {
    const result = await run(async () => {
      const { data } = await api.post(`/api/complaint-documents/${document.id}/issue`)
      setPreview(data)
      return data
    }, 'The case record copy is now marked as officially issued.')
    if (result) await refresh()
  }

  const printDocument = () => window.print()
  const downloadPdf = () => run(async () => {
    await api.post(`/api/complaint-documents/${preview.id}/download`)
    window.print()
  })

  const setRequestField = (id, field, value) => setRequestFields((current) => ({
    ...current,
    [id]: { ...current[id], [field]: value },
  }))

  const pendingRequest = requests.some((request) => request.status === 'Pending Review')

  return (
    <section className="card complaint-document-actions">
      <div className="card-head">
        <h2><FileText size={18} aria-hidden="true" /> Complaint documents</h2>
        <span className="muted">{isAdmin ? 'Authorized staff' : 'Your complaint record'}</span>
      </div>
      <p className="muted">
        Documents are saved as dated snapshots. System-generated copies are not certified true copies.
      </p>
      <Alert>{error}</Alert>
      {notice && <p className="complaint-doc-notice" role="status">{notice}</p>}

      <div className="complaint-doc-actions-row">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={generateReceipt}>
          <FileText size={15} /> Generate complaint receipt
        </button>
      </div>

      {!isAdmin && (
        <form className="complaint-doc-request" onSubmit={requestCaseCopy}>
          <label htmlFor={`case-copy-reason-${complaintId}`}>Request a comprehensive case record copy</label>
          <textarea
            id={`case-copy-reason-${complaintId}`}
            value={requestReason}
            onChange={(event) => setRequestReason(event.target.value)}
            maxLength={1000}
            minLength={10}
            required
            placeholder="Explain why you need a copy (10–1000 characters)."
          />
          <button type="submit" className="btn btn-outline btn-sm" disabled={busy || pendingRequest}>
            {pendingRequest ? 'Request pending review' : 'Request case record copy'}
          </button>
        </form>
      )}

      {requests.length > 0 && (
        <div className="complaint-doc-request-list">
          <h3>Case-copy requests</h3>
          {requests.map((request) => (
            <article key={request.id} className="complaint-doc-request-item">
              <div className="complaint-doc-row-head">
                <strong>{request.status}</strong>
                <span>{dateTime(request.requestedAt)}</span>
              </div>
              <p><strong>Resident reason:</strong> {request.reason}</p>
              {request.reviewReason && <p><strong>Review note:</strong> {request.reviewReason}</p>}
              {isAdmin && request.status === 'Pending Review' && (
                <div className="complaint-doc-review-fields">
                  <label>
                    Incident location for release (edit or clear if it should be withheld)
                    <input
                      value={requestFields[request.id]?.releasedLocation ?? request.complaintLocation ?? ''}
                      maxLength={250}
                      onChange={(event) => setRequestField(request.id, 'releasedLocation', event.target.value)}
                    />
                  </label>
                  <label>
                    Narrative for release (edit to redact personal or sensitive details)
                    <textarea
                      value={requestFields[request.id]?.releasedNarrative ?? request.complaintNarrative ?? ''}
                      maxLength={8000}
                      onChange={(event) => setRequestField(request.id, 'releasedNarrative', event.target.value)}
                    />
                  </label>
                  <label>
                    Review reason
                    <textarea
                      value={requestFields[request.id]?.reviewReason || ''}
                      maxLength={1000}
                      minLength={5}
                      onChange={(event) => setRequestField(request.id, 'reviewReason', event.target.value)}
                    />
                  </label>
                  <div className="complaint-doc-actions-row">
                    <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => decideRequest(request, 'Approved')}>Approve release</button>
                    <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => decideRequest(request, 'Rejected')}>Reject request</button>
                  </div>
                </div>
              )}
              {isAdmin && request.status === 'Approved' && (
                <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => generateCaseCopy(request)}>
                  Generate approved case copy
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <div className="complaint-doc-list">
          <h3>Generated document history</h3>
          {documents.map((document) => (
            <div className="complaint-doc-row" key={document.id}>
              <div>
                <strong>{document.type === 'Receipt' ? 'Complaint filing receipt' : 'Case record copy'}</strong>
                <span>{document.documentNumber} · v{document.version} · {document.issuanceStatus === 'OfficiallyIssued' ? 'Officially issued' : 'Ordinary system-generated copy'}</span>
              </div>
              <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => openDocument(document)}>Preview</button>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <Modal
          title="Document preview"
          subtitle={`${preview.documentNumber} · Version ${preview.version} · ${preview.issuanceStatus === 'OfficiallyIssued' ? 'Officially issued copy' : 'Ordinary system-generated copy'}`}
          onClose={() => setPreview(null)}
          wide
          className="complaint-document-preview-modal"
          footer={(
            <>
              {canIssue && preview.type === 'CaseRecordCopy' && preview.issuanceStatus !== 'OfficiallyIssued' && (
                <button type="button" className="btn btn-outline" disabled={busy} onClick={() => issueDocument(preview)}>
                  <ShieldCheck size={16} /> Issue official copy
                </button>
              )}
              <button type="button" className="btn btn-outline" onClick={printDocument}><Printer size={16} /> Print</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={downloadPdf}>
                <Download size={16} /> Save as PDF
              </button>
            </>
          )}
        >
          <article className="complaint-document-print-root">
            <div className="complaint-doc-running-header">
              <span>{preview.snapshot.complaintReferenceNumber}</span>
              <span>Generated {dateTime(preview.generatedAt)}</span>
            </div>
            <header className="complaint-doc-letterhead">
              <img src="/San_Jose_LOGO.webp" alt="Barangay San Jose logo" />
              <div>
                <div>{preview.snapshot.republicHeader}</div>
                <div>{preview.snapshot.province}</div>
                <div>{preview.snapshot.municipality}</div>
                <strong>Barangay San Jose – Annex Area 6</strong>
              </div>
            </header>
            <div className="complaint-doc-classification">
              {preview.type === 'CaseRecordCopy' ? 'CONFIDENTIAL — RELEASED CASE RECORD' : 'SYSTEM-GENERATED RECEIPT'}
            </div>
            <h1>{preview.snapshot.documentTitle}</h1>
            <div className="complaint-doc-meta">
              <span><strong>Document no.:</strong> {preview.documentNumber}</span>
              <span><strong>Complaint ref.:</strong> {preview.snapshot.complaintReferenceNumber}</span>
              <span><strong>Copy status:</strong> {preview.issuanceStatus === 'OfficiallyIssued' ? 'Officially issued copy' : 'Ordinary system-generated copy'}</span>
              <span><strong>Generated:</strong> {dateTime(preview.generatedAt)}</span>
            </div>

            {preview.type === 'Receipt' ? (
              <>
                <p className="complaint-doc-receipt-intro">This acknowledges receipt and recording of the complaint identified below.</p>
                <dl className="complaint-doc-fields">
                  <div><dt>Received</dt><dd>{dateTime(preview.snapshot.receivedAt)}</dd></div>
                  <div><dt>Complaint source</dt><dd>{preview.snapshot.complaintSource || 'ONLINE'}</dd></div>
                  <div><dt>Complainant</dt><dd>{preview.snapshot.complainantName || '—'}</dd></div>
                  <div><dt>Category</dt><dd>{preview.snapshot.category || '—'}</dd></div>
                  <div><dt>Incident location</dt><dd>{preview.snapshot.incidentLocation || 'Not provided'}</dd></div>
                  <div><dt>Subject</dt><dd>{preview.snapshot.subject || '—'}</dd></div>
                  <div><dt>Status at generation</dt><dd>{preview.snapshot.status || '—'}</dd></div>
                  <div><dt>Receipt generated by</dt><dd>{preview.snapshot.generatedByName || '—'}</dd></div>
                  <div><dt>Receiving staff role</dt><dd>{preview.snapshot.generatedByPosition || '—'}</dd></div>
                </dl>
                <p className="complaint-doc-disclaimer">{preview.snapshot.disclaimer}</p>
                <div className="complaint-doc-signature">
                  <span>Signature of authorized receiving personnel</span>
                  <span>Leave blank for the authorized receiving personnel to sign</span>
                </div>
              </>
            ) : (
              <>
                <section className="complaint-doc-section">
                  <h2>Complaint information</h2>
                  <dl className="complaint-doc-fields">
                    <div><dt>Complaint reference</dt><dd>{preview.snapshot.complaintReferenceNumber}</dd></div>
                    <div><dt>Complaint source</dt><dd>{preview.snapshot.complaintSource || 'ONLINE'}</dd></div>
                    <div><dt>Date and time filed</dt><dd>{dateTime(preview.snapshot.receivedAt)}</dd></div>
                    <div><dt>Category</dt><dd>{preview.snapshot.category || '—'}</dd></div>
                    <div><dt>Priority</dt><dd>{preview.snapshot.priority || '—'}</dd></div>
                    <div><dt>Current status</dt><dd>{preview.snapshot.status || '—'}</dd></div>
                    <div><dt>Complainant</dt><dd>{preview.snapshot.complainantName || '—'}</dd></div>
                    <div><dt>Incident location</dt><dd>{preview.snapshot.incidentLocation || 'Not provided'}</dd></div>
                    <div><dt>Subject</dt><dd>{preview.snapshot.subject || '—'}</dd></div>
                  </dl>
                </section>
                <section className="complaint-doc-section">
                  <h2>Incident narrative released for this copy</h2>
                  <p className="complaint-doc-narrative">{preview.snapshot.narrative || 'No narrative was included in this release.'}</p>
                </section>
                <section className="complaint-doc-section">
                  <h2>Processing and status history</h2>
                  {preview.snapshot.processingHistory?.length ? (
                    <table className="complaint-doc-history-table">
                      <thead><tr><th>Status / action</th><th>Date and time</th></tr></thead>
                      <tbody>{preview.snapshot.processingHistory.map((entry, index) => (
                        <tr key={`${entry.status}-${entry.changedAt}-${index}`}><td>{entry.status}</td><td>{dateTime(entry.changedAt)}</td></tr>
                      ))}</tbody>
                    </table>
                  ) : <p>No status history is available.</p>}
                </section>
                <section className="complaint-doc-section">
                  <h2>Certification</h2>
                  <p>This is not a certified true copy. Certification is a separate process requiring an authorized official.</p>
                  {preview.snapshot.issuedAt && <p>Officially issued by {preview.snapshot.issuedByName} ({preview.snapshot.issuedByPosition}) on {dateTime(preview.snapshot.issuedAt)}.</p>}
                  <div className="complaint-doc-signature">
                    <span>Authorized official / signature</span>
                    <span>Certification date and control no. (if separately assigned)</span>
                  </div>
                </section>
              </>
            )}
            <footer className="complaint-doc-footer">
              <span>Certification status: {preview.snapshot.certificationStatus}</span>
              <span>Complaint reference: {preview.snapshot.complaintReferenceNumber}</span>
            </footer>
          </article>
        </Modal>
      )}
    </section>
  )
}
