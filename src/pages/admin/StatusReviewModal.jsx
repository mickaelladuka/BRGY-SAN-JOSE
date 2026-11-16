import { useEffect, useState } from 'react'
import { Alert, DetailList, Field, Modal, SkeletonList, StatusBadge, StatusTimeline } from '../../components/ui'
import { api, getErrorMessage } from '../../lib/api'

/** Loads the full record (with history), lets an admin move it to a new status with remarks. */
export default function StatusReviewModal({ endpoint, row, config, onClose, onChanged }) {
  const [rec, setRec] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [remarks, setRemarks] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState('')

  const load = () => api.get(`${endpoint}/${row.id}`).then(({ data }) => { setRec(data); setStatus(data.status) }).catch((e) => setError(getErrorMessage(e)))
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [row.id])

  const submit = async (ev) => {
    ev.preventDefault()
    setError(''); setOk('')
    if (status === rec.status && !remarks.trim()) return setError('Choose a new status or add remarks.')
    setBusy(true)
    try {
      await api.post(`${endpoint}/${row.id}/status`, {
        status,
        remarks: remarks.trim() || null,
        ...(config.publicStatusUpdates ? { publicUpdate: true } : {}),
      })
      setRemarks(''); setOk('Status updated. The resident can now see this update.'); await load(); onChanged()
    } catch (err) { setError(getErrorMessage(err)) } finally { setBusy(false) }
  }

  const viewOnly = !config.statuses || config.statuses.length === 0

  return (
    <Modal title={viewOnly ? `${config.viewTitle || 'View Resident'} #${rec?.id ?? ''}` : `Review ${rec?.referenceNumber ?? ''}`} wide onClose={onClose}>
      <Alert>{error}</Alert><Alert type="success">{ok}</Alert>
      {!rec ? <SkeletonList count={1} lines={6} /> : (
        <>
          {rec.status && <p><StatusBadge status={rec.status} /></p>}
          <DetailList rows={config.rows(rec)} />
          {rec.photoUrl && (
            <div style={{ marginTop: '1rem' }}>
              <h3>Photo</h3>
              <img src={rec.photoUrl.startsWith('http') ? rec.photoUrl : `${api.defaults?.baseURL || ''}${rec.photoUrl}`} alt="Resident" style={{ maxWidth: '200px', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }} />
            </div>
          )}
          {!viewOnly && (
            <>
              <h3>Description</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{rec.description}</p>
              <form onSubmit={submit} className="card" style={{ background: '#f8fafc', boxShadow: 'none' }}>
                <h3>Update status</h3>
                <Field label="New status" htmlFor="rv-status"><select id="rv-status" value={status} onChange={(e) => setStatus(e.target.value)}>{config.statuses.map((s) => <option key={s}>{s}</option>)}</select></Field>
                <Field label="Remarks (visible in status history)" htmlFor="rv-remarks"><textarea id="rv-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={1000} /></Field>
                <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save status'}</button>
              </form>
              <h3>Status history</h3>
              <StatusTimeline history={rec.history} />
            </>
          )}
        </>
      )}
    </Modal>
  )
}
