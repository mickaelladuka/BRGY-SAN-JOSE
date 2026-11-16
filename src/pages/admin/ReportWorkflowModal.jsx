import { useEffect, useState } from 'react'
import { Alert, Field, Modal } from '../../components/ui'
import { api, getErrorMessage } from '../../lib/api'
import { fmtDateTime } from '../../lib/format'

const ACTION_TYPES = ['Inspection', 'Site visit', 'Verification', 'Department coordination', 'Corrective action', 'Follow-up', 'Resident communication', 'Other']

export default function ReportWorkflowModal({ report, action, options, onClose, onChanged }) {
  const [mode, setMode] = useState(action)
  const [verificationStatus, setVerificationStatus] = useState(report.verificationStatus || 'Pending')
  const [departmentId, setDepartmentId] = useState(report.assignedDepartmentId || '')
  const [assignedToUserId, setAssignedToUserId] = useState(report.assignedToUserId || '')
  const [actionType, setActionType] = useState(ACTION_TYPES[0])
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [publicUpdate, setPublicUpdate] = useState(false)
  const [notifyResident, setNotifyResident] = useState(true)
  const [duplicateId, setDuplicateId] = useState('')
  const [matches, setMatches] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (mode !== 'verify' || verificationStatus !== 'Duplicate') return
    api.get(`/api/reports/${report.id}/possible-duplicates`)
      .then(({ data }) => setMatches(data))
      .catch((err) => setError(getErrorMessage(err)))
  }, [mode, report.id, verificationStatus])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'verify') {
        await api.post(`/api/reports/${report.id}/verification`, {
          verificationStatus, reason: reason.trim(), duplicateOfReportId: duplicateId ? Number(duplicateId) : null,
        })
      } else if (mode === 'assign') {
        await api.post(`/api/reports/${report.id}/assignment`, {
          departmentId: departmentId ? Number(departmentId) : null,
          assignedToUserId: assignedToUserId || null,
          reason: reason.trim(),
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        })
      } else if (mode === 'information') {
        await api.post(`/api/reports/${report.id}/request-information`, { details: details.trim() })
      } else if (mode === 'log') {
        await api.post(`/api/reports/${report.id}/actions`, { actionType, details: details.trim(), isPublic: publicUpdate })
      } else if (mode === 'resolve') {
        await api.post(`/api/reports/${report.id}/resolve`, {
          resolutionDescription: details.trim(), finalRemarks: reason.trim(), notifyResident,
        })
      } else if (mode === 'reopen') {
        await api.post(`/api/reports/${report.id}/reopen`, { remarks: reason.trim() })
      } else if (mode === 'convert') {
        if (!window.confirm(`Convert ${report.referenceNumber} into a formal complaint? The report and its evidence will remain intact.`)) {
          setBusy(false)
          return
        }
        await api.post(`/api/reports/${report.id}/convert-to-complaint`, { reason: reason.trim() })
      }
      onChanged()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'The report action could not be completed.'))
    } finally {
      setBusy(false)
    }
  }

  const titles = {
    verify: 'Verify report',
    assign: 'Assign report',
    information: 'Request additional information',
    log: 'Record report action',
    resolve: 'Resolve report',
    reopen: 'Reopen report',
    convert: 'Convert to complaint',
  }

  return (
    <Modal title={`${titles[mode]} · ${report.referenceNumber}`} wide onClose={onClose}>
      <Alert>{error}</Alert>
      <p className="muted">{report.title || report.category} · {report.location || 'Location not specified'}</p>
      {mode === 'convert' && (
        <div className="card" style={{ background: 'var(--cream)', boxShadow: 'none' }}>
          <strong>Conversion preview</strong>
          <p>Original report ID, submission history, and evidence remain on the report. The complaint will carry its description, category, incident location, coordinates, and resident link where available.</p>
          <p>Reporter: {report.isGuest ? report.guestName || 'Guest reporter' : report.residentName || 'Registered resident'}</p>
          {report.convertedComplaintId && <p>Already linked to complaint #{report.convertedComplaintId}</p>}
        </div>
      )}
      <form onSubmit={submit}>
        {mode === 'verify' && (
          <>
            <Field label="Verification" htmlFor="report-verification"><select id="report-verification" value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value)}>{['Pending', 'Under Verification', 'Verified', 'Invalid', 'Duplicate'].map((value) => <option key={value}>{value}</option>)}</select></Field>
            {verificationStatus === 'Duplicate' && <Field label="Possible original report" htmlFor="report-duplicate"><select id="report-duplicate" value={duplicateId} onChange={(event) => setDuplicateId(event.target.value)}><option value="">Select a related report</option>{matches.map((match) => <option value={match.id} key={match.id}>{match.referenceNumber} · {match.title} · {fmtDateTime(match.submittedAt)}</option>)}</select></Field>}
          </>
        )}
        {mode === 'assign' && (
          <>
            <Field label="Department" htmlFor="report-department"><select id="report-department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}><option value="">No department</option>{(options?.departments || []).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></Field>
            <Field label="Assigned personnel" htmlFor="report-personnel"><select id="report-personnel" value={assignedToUserId} onChange={(event) => setAssignedToUserId(event.target.value)}><option value="">Unassigned</option>{(options?.users || []).map((user) => <option key={user.id} value={user.id}>{user.fullName} · {user.role}</option>)}</select></Field>
            <Field label="Due date (optional)" htmlFor="report-due"><input id="report-due" type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field>
          </>
        )}
        {mode === 'log' && <>
          <Field label="Action type" htmlFor="report-action-type"><select id="report-action-type" value={actionType} onChange={(event) => setActionType(event.target.value)}>{ACTION_TYPES.map((value) => <option key={value}>{value}</option>)}</select></Field>
          <label style={{ display: 'flex', gap: '.5rem', marginBottom: '.75rem' }}><input type="checkbox" checked={publicUpdate} onChange={(event) => setPublicUpdate(event.target.checked)} /> Share this update with the resident</label>
        </>}
        {(mode === 'information' || mode === 'log' || mode === 'resolve') && <Field label={mode === 'resolve' ? 'Resolution description' : 'Details'} htmlFor="report-details" required><textarea id="report-details" value={details} onChange={(event) => setDetails(event.target.value)} maxLength={2000} /></Field>}
        {(mode === 'verify' || mode === 'assign' || mode === 'resolve' || mode === 'reopen' || mode === 'convert') && <Field label={mode === 'resolve' ? 'Final remarks' : 'Reason'} htmlFor="report-reason" required><textarea id="report-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} /></Field>}
        {mode === 'resolve' && <label style={{ display: 'flex', gap: '.5rem', marginBottom: '.75rem' }}><input type="checkbox" checked={notifyResident} onChange={(event) => setNotifyResident(event.target.checked)} /> Notify the resident</label>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || (mode === 'convert' && Boolean(report.convertedComplaintId))}>{busy ? 'Saving…' : 'Confirm'}</button>
        </div>
      </form>
    </Modal>
  )
}
