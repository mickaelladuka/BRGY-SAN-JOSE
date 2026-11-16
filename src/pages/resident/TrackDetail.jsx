import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, DetailList, Field, SkeletonList, StatusBadge, StatusTimeline } from '../../components/ui'
import { api, getErrorMessage } from '../../lib/api'
import { fmtDateTime } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'
import ComplaintDocumentActions from '../../components/ComplaintDocumentActions'

export default function TrackDetail() {
  const { kind, id } = useParams()
  const [responseText, setResponseText] = useState('')
  const [uploads, setUploads] = useState([])
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const valid = kind === 'complaints' || kind === 'reports'
  // Ownership is enforced by the API (it returns 403/404 for someone else's record); the UI just reports that.
  const { data: d, loading, error, reload } = useFetch(valid && /^\d+$/.test(id) ? `/api/${kind}/${id}` : null)

  const actions = d?.actions || []
  const lastRequest = [...actions].reverse().find((action) => action.actionType === 'Additional information requested')
  const lastResponse = [...actions].reverse().find((action) => action.actionType === 'Additional information response')
  const needsInformation = lastRequest && (!lastResponse || Date.parse(lastResponse.occurredAt) < Date.parse(lastRequest.occurredAt))

  const stageEvidence = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (uploads.length + files.length > 5) return setActionError('Attach no more than five files.')
    setActionError('')
    setBusy(true)
    try {
      const staged = []
      for (const file of files) {
        const body = new FormData()
        body.append('file', file)
        const { data } = await api.post('/api/reports/evidence', body)
        staged.push(data)
      }
      setUploads((current) => [...current, ...staged])
    } catch (err) {
      setActionError(getErrorMessage(err, 'An evidence file could not be uploaded.'))
    } finally { setBusy(false) }
  }

  const submitInformation = async (event) => {
    event.preventDefault()
    if (responseText.trim().length < 3) return setActionError('Enter at least three characters of additional information.')
    setActionError('')
    setBusy(true)
    try {
      await api.post(`/api/reports/${id}/additional-information`, {
        details: responseText.trim(),
        evidenceFileIds: uploads.map((file) => file.fileId),
      })
      setResponseText('')
      setUploads([])
      reload()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Your information could not be submitted.'))
    } finally { setBusy(false) }
  }

  const downloadAttachment = async (attachment) => {
    try {
      const { data } = await api.get(`/api/reports/${id}/attachments/${attachment.id}`, { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.fileName
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setActionError(getErrorMessage(err, 'The evidence file could not be downloaded.'))
    }
  }

  if (!valid || !/^\d+$/.test(id)) return <Alert>That record could not be found.</Alert>
  if (loading) return <SkeletonList count={1} lines={8} />
  if (error) return <><Alert>{error}</Alert><Link to="/resident/complaints">Back to my requests</Link></>
  if (!d) return null

  const rows = kind === 'complaints'
    ? [['Reference', d.referenceNumber], ['Category', d.category], ['Subject', d.subject], ['Location', d.location], ['Submitted', fmtDateTime(d.submittedAt)], ['Last update', fmtDateTime(d.updatedAt)]]
    : [['Reference', d.referenceNumber], ['Title', d.title], ['Category', d.category], ['Location', d.location], ['Observed', fmtDateTime(d.incidentAt)], ['Severity', d.severity], ['Submitted', fmtDateTime(d.submittedAt)], ['Last update', fmtDateTime(d.updatedAt)]]

  return (
    <>
      <Link to={`/resident/complaints${kind === 'reports' ? '?tab=reports' : ''}`}>← Back</Link>
      <div className="card resident-detail-card" style={{ marginTop: '.75rem' }}>
        <div className="card-head"><h1 style={{ margin: 0 }}>{kind === 'complaints' ? 'Complaint' : 'Report'}</h1><StatusBadge status={d.status} /></div>
        <DetailList rows={rows} />
        <h3>Description</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{d.description}</p>
      </div>
      {kind === 'reports' && d.attachments?.length > 0 && (
        <div className="card">
          <h2>Submitted evidence</h2>
          {d.attachments.map((attachment) => (
            <div key={attachment.id} className="list-item">
              <span>{attachment.fileName}</span>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => downloadAttachment(attachment)}>Download</button>
            </div>
          ))}
        </div>
      )}
      {kind === 'reports' && d.actions?.length > 0 && (
        <div className="card">
          <h2>Updates</h2>
          {d.actions.map((action) => <div key={action.id} className="list-item">
            <strong>{action.actionType}</strong><span>{action.details}</span><small className="muted">{fmtDateTime(action.occurredAt)}</small>
          </div>)}
        </div>
      )}
      <div className="card"><h2>Status history</h2><StatusTimeline history={d.history} /></div>
      {kind === 'reports' && needsInformation && (
        <form className="card" onSubmit={submitInformation}>
          <h2>Additional information requested</h2>
          <p>{lastRequest.details}</p>
          <Alert>{actionError}</Alert>
          <Field label="Your response" htmlFor="report-response" required>
            <textarea id="report-response" value={responseText} onChange={(event) => setResponseText(event.target.value)} maxLength={2000} />
          </Field>
          <Field label="Additional evidence (up to five images or PDFs)" htmlFor="report-response-files">
            <input id="report-response-files" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={stageEvidence} disabled={busy || uploads.length >= 5} />
            {uploads.map((file) => <div key={file.fileId} className="row" style={{ justifyContent: 'space-between', marginTop: '.4rem' }}>
              <span>{file.fileName}</span>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setUploads((current) => current.filter((entry) => entry.fileId !== file.fileId))}>Remove</button>
            </div>)}
          </Field>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit additional information'}</button>
        </form>
      )}
      {kind === 'complaints' && <ComplaintDocumentActions complaint={d} mode="resident" />}
    </>
  )
}
