import { Link, useParams } from 'react-router-dom'
import { Alert, DetailList, SkeletonList, StatusBadge, StatusTimeline } from '../../components/ui'
import { fmtDateTime } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'

export default function TrackDetail() {
  const { kind, id } = useParams()
  const valid = kind === 'complaints' || kind === 'reports'
  // Ownership is enforced by the API (it returns 403/404 for someone else's record); the UI just reports that.
  const { data: d, loading, error } = useFetch(valid && /^\d+$/.test(id) ? `/api/${kind}/${id}` : null)

  if (!valid || !/^\d+$/.test(id)) return <Alert>That record could not be found.</Alert>
  if (loading) return <SkeletonList count={1} lines={8} />
  if (error) return <><Alert>{error}</Alert><Link to="/resident/complaints">Back to my requests</Link></>
  if (!d) return null

  const rows = kind === 'complaints'
    ? [['Reference', d.referenceNumber], ['Category', d.category], ['Subject', d.subject], ['Location', d.location], ['Submitted', fmtDateTime(d.submittedAt)], ['Last update', fmtDateTime(d.updatedAt)]]
    : [['Reference', d.referenceNumber], ['Category', d.category], ['Location', d.location], ['Submitted', fmtDateTime(d.submittedAt)], ['Last update', fmtDateTime(d.updatedAt)]]

  return (
    <>
      <Link to={`/resident/complaints${kind === 'reports' ? '?tab=reports' : ''}`}>← Back</Link>
      <div className="card" style={{ marginTop: '.75rem' }}>
        <div className="card-head"><h1 style={{ margin: 0 }}>{kind === 'complaints' ? 'Complaint' : 'Report'}</h1><StatusBadge status={d.status} /></div>
        <DetailList rows={rows} />
        <h3>Description</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{d.description}</p>
      </div>
      <div className="card"><h2>Status history</h2><StatusTimeline history={d.history} /></div>
    </>
  )
}
