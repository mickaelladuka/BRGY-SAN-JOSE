import { useCallback, useEffect, useState } from 'react'
import { Alert, Field, Modal, SkeletonList, StatusBadge } from '../../components/ui'
import { api, getErrorMessage } from '../../lib/api'
import { fmtDateTime } from '../../lib/format'

export default function CommunityIssueLinksModal({ issueId, onClose, onChanged }) {
  const [issue, setIssue] = useState(null)
  const [available, setAvailable] = useState([])
  const [search, setSearch] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState('')
  const [reasons, setReasons] = useState({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const loadIssue = useCallback(async () => {
    const { data } = await api.get(`/api/community-issues/${issueId}`)
    setIssue(data)
  }, [issueId])

  const loadAvailable = useCallback(async () => {
    const { data } = await api.get(`/api/community-issues/${issueId}/available-complaints`, {
      params: { q: search || undefined, page: 1, pageSize: 50 },
    })
    setAvailable(data.items ?? [])
  }, [issueId, search])

  useEffect(() => {
    setError('')
    Promise.all([loadIssue(), loadAvailable()]).catch((err) => setError(getErrorMessage(err)))
  }, [loadIssue, loadAvailable])

  const linkComplaint = async (event) => {
    event.preventDefault()
    if (!selectedComplaint) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await api.post(`/api/community-issues/${issueId}/link-complaint/${selectedComplaint}`)
      setSelectedComplaint('')
      setNotice('Complaint linked to this monitored issue.')
      await Promise.all([loadIssue(), loadAvailable()])
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const unlinkComplaint = async (complaintId) => {
    const reason = reasons[complaintId]?.trim() ?? ''
    if (reason.length < 3) {
      setError('Enter a reason of at least 3 characters before removing this association.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await api.post(`/api/community-issues/${issueId}/unlink-complaint/${complaintId}`, { reason })
      setReasons((current) => ({ ...current, [complaintId]: '' }))
      setNotice('Complaint association removed.')
      await Promise.all([loadIssue(), loadAvailable()])
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={`Manage Complaint Links${issue ? ` · ${issue.title}` : ''}`} wide onClose={onClose}>
      <Alert>{error}</Alert>
      <Alert type="success">{notice}</Alert>
      {!issue ? <SkeletonList count={1} lines={4} /> : (
        <div className="community-issue-links">
          <p>Associate existing complaint records with this monitored issue. A complaint can be linked to only one issue.</p>
          <section className="community-issue-linked">
            <h3>Linked complaints ({issue.complaints?.length ?? 0})</h3>
            {issue.complaints?.length ? issue.complaints.map((complaint) => (
              <article className="community-issue-linked-item" key={complaint.id}>
                <div>
                  <strong>{complaint.referenceNumber}</strong>
                  <span>{complaint.category} · {complaint.location || 'Location not specified'}</span>
                  <span>{fmtDateTime(complaint.submittedAt)} · <StatusBadge status={complaint.status} /></span>
                </div>
                <Field label={`Reason for removing ${complaint.referenceNumber}`} htmlFor={`unlink-reason-${complaint.id}`} hint="At least 3 characters; recorded in the audit trail.">
                  <textarea
                    id={`unlink-reason-${complaint.id}`}
                    value={reasons[complaint.id] ?? ''}
                    maxLength={500}
                    onChange={(event) => setReasons((current) => ({ ...current, [complaint.id]: event.target.value }))}
                  />
                </Field>
                <button type="button" className="btn btn-outline btn-sm" disabled={busy || (reasons[complaint.id]?.trim().length ?? 0) < 3} onClick={() => unlinkComplaint(complaint.id)}>
                  Remove association
                </button>
              </article>
            )) : <p className="muted">No complaint records are linked to this issue yet.</p>}
          </section>

          <form className="community-issue-link-form" onSubmit={linkComplaint}>
            <h3>Link a complaint</h3>
            <Field label="Find unlinked complaints" htmlFor="community-issue-complaint-search">
              <input id="community-issue-complaint-search" type="search" value={search} placeholder="Search reference, category, or location" onChange={(event) => setSearch(event.target.value)} />
            </Field>
            <Field label="Available complaint" htmlFor="community-issue-complaint-select">
              <select id="community-issue-complaint-select" value={selectedComplaint} onChange={(event) => setSelectedComplaint(event.target.value)}>
                <option value="">Select a complaint…</option>
                {available.map((complaint) => (
                  <option key={complaint.id} value={complaint.id}>
                    {complaint.referenceNumber} · {complaint.category} · {fmtDateTime(complaint.submittedAt)}
                  </option>
                ))}
              </select>
            </Field>
            {!available.length && <p className="muted">No unlinked complaints match this search.</p>}
            <button type="submit" className="btn btn-primary" disabled={busy || !selectedComplaint}>
              {busy ? 'Saving…' : 'Link complaint'}
            </button>
          </form>
        </div>
      )}
    </Modal>
  )
}
