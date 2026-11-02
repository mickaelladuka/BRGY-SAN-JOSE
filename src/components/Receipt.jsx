import { Link } from 'react-router-dom'
import { BARANGAY_HOTLINE, EMERGENCY_HOTLINE, fmtDateTime } from '../lib/format'

export function HotlineNotice({ compact }) {
  return (
    <div className="hotline" role="note">
      <strong>In immediate danger? Call {EMERGENCY_HOTLINE} now.</strong>
      {BARANGAY_HOTLINE && <> Barangay hotline: <strong>{BARANGAY_HOTLINE}</strong>.</>}
      {!compact && <p style={{ margin: '.4rem 0 0' }}>Submitting a report through this app does not guarantee an immediate response and does not dispatch emergency services by itself. Always contact the hotline directly when help is needed right away.</p>}
    </div>
  )
}

export default function Receipt({ reference, submittedAt, kind = 'report', emergency, actions }) {
  return (
    <div className="card receipt">
      <h1>{kind === 'complaint' ? 'Complaint submitted' : emergency ? 'Emergency report received' : 'Report submitted'}</h1>
      <p>Your reference number is:</p>
      <div className="ref" aria-live="polite">{reference}</div>
      {submittedAt && <p className="muted">Submitted {fmtDateTime(submittedAt)}</p>}
      <p>Please keep this number so you can follow up with the barangay. The report has been recorded and is waiting for barangay review. It has not been confirmed as dispatched.</p>
      {emergency && <HotlineNotice />}
      <div className="row" style={{ justifyContent: 'center' }}>{actions ?? <Link className="btn btn-primary" to="/">Back to home</Link>}</div>
    </div>
  )
}
