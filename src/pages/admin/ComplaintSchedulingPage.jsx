import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, EmptyState, Field, Modal, SkeletonList, StatusBadge } from '../../components/ui'
import { api, getErrorMessage, toPage } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, RefreshCw, Users } from 'lucide-react'

const TYPES = ['Investigation', 'Site Inspection', 'Mediation', 'Hearing / Conference', 'Resident Consultation', 'Follow-up', 'Document Submission', 'Other']
const STATUSES = ['Upcoming', 'Needs Attention', 'Pending Confirmation', 'Confirmed', 'Rescheduled', 'In Progress', 'Completed', 'Cancelled', 'No Show']
const TIME_ZONE = 'Asia/Manila'
const MANAGEMENT_ROLES = ['Admin', 'SuperAdmin', 'OIC', 'Secretary']

function localDateString(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function dateToUtc(date, time) {
  if (!date || !time) return ''
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute)).toISOString()
}

function shiftDate(date, days) {
  const [year, month, day] = date.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  return shifted.toISOString().slice(0, 10)
}

function fmtDateTime(value, options = {}) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: TIME_ZONE,
    ...(options.dateOnly
      ? options.weekday
        ? { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
        : { dateStyle: 'medium' }
      : { timeStyle: 'short' }),
  }).format(new Date(value))
}

function buildRange(date, view) {
  if (view === 'day') return [date, date]
  if (view === 'week') {
    const weekday = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7
    const start = shiftDate(date, -weekday)
    return [start, shiftDate(start, 6)]
  }
  if (view === 'month') {
    const first = `${date.slice(0, 7)}-01`
    const [year, month] = first.split('-').map(Number)
    const lastDate = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return [first, `${date.slice(0, 7)}-${String(lastDate).padStart(2, '0')}`]
  }
  return [date, shiftDate(date, 29)]
}

function CalendarGrid({ appointments, date, view, onSelect }) {
  const [start, end] = buildRange(date, view)
  let first = start
  let last = end
  if (view === 'month') {
    const weekday = (new Date(`${start}T12:00:00Z`).getUTCDay() + 6) % 7
    first = shiftDate(start, -weekday)
    const trailing = (7 - (new Date(`${end}T12:00:00Z`).getUTCDay() + 1)) % 7
    last = shiftDate(end, trailing)
  }
  const days = []
  for (let day = first; day <= last; day = shiftDate(day, 1)) days.push(day)
  const grouped = appointments.reduce((result, appointment) => {
    const key = localDateString(new Date(appointment.startsAt))
    result[key] = [...(result[key] ?? []), appointment]
    return result
  }, {})
  return (
    <div className={`schedule-calendar-grid ${view}`}>
      {view === 'month' && ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div className="schedule-calendar-day-label" key={day}>{day}</div>)}
      {days.map((day) => (
        <section className={`schedule-calendar-cell${day === localDateString(new Date()) ? ' today' : ''}${day.slice(0, 7) !== date.slice(0, 7) ? ' outside' : ''}`} key={day}>
          <strong>{view === 'week' ? fmtDateTime(dateToUtc(day, '12:00'), { weekday: true, dateOnly: true }) : Number(day.slice(-2))}</strong>
          {(grouped[day] ?? []).map((appointment) => (
            <button type="button" className={`schedule-calendar-event ${appointment.status.toLowerCase().replaceAll(' ', '-')}`} key={appointment.id} onClick={() => onSelect(appointment.id)}>
              <span>{fmtDateTime(appointment.startsAt)}</span>
              <strong>{appointment.title}</strong>
              <small>{appointment.complaintReferenceNumber} · {appointment.type}</small>
            </button>
          ))}
        </section>
      ))}
    </div>
  )
}

function AppointmentForm({ onClose, onCreated, canManage }) {
  const [complaintQuery, setComplaintQuery] = useState('')
  const [complaints, setComplaints] = useState([])
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [personnel, setPersonnel] = useState([])
  const [values, setValues] = useState({
    type: 'Investigation', title: '', description: '', date: '', startTime: '', endTime: '',
    locationType: 'Barangay Office', locationDescription: '', assignedPersonnelId: '',
    residentInstructions: '', internalNotes: '',
  })
  const [availability, setAvailability] = useState(null)
  const [loadingLists, setLoadingLists] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoadingLists(true)
    Promise.all([
      api.get('/api/admin/complaint-appointments/complaints', { params: { page: 1, pageSize: 50, q: complaintQuery || undefined }, signal: controller.signal }),
      api.get('/api/admin/complaint-appointments/personnel', { signal: controller.signal }),
    ]).then(([complaintResponse, staffResponse]) => {
      const list = toPage(complaintResponse.data).items
      setComplaints(list)
      setPersonnel(staffResponse.data)
    }).catch((err) => {
      if (err.code !== 'ERR_CANCELED') setError(getErrorMessage(err))
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingLists(false)
    })
    return () => controller.abort()
  }, [complaintQuery])

  const startUtc = dateToUtc(values.date, values.startTime)
  const endUtc = dateToUtc(values.date, values.endTime)
  useEffect(() => {
    if (!values.assignedPersonnelId || !startUtc || !endUtc || endUtc <= startUtc) {
      setAvailability(null)
      return undefined
    }
    const controller = new AbortController()
    api.get('/api/admin/complaint-appointments/availability', {
      params: { assignedPersonnelId: values.assignedPersonnelId, startsAt: startUtc, endsAt: endUtc },
      signal: controller.signal,
    }).then(({ data }) => setAvailability(data))
      .catch((err) => { if (err.code !== 'ERR_CANCELED') setError(getErrorMessage(err)) })
    return () => controller.abort()
  }, [values.assignedPersonnelId, startUtc, endUtc])

  const change = (field, value) => setValues((current) => ({ ...current, [field]: value }))
  const submit = async (event) => {
    event.preventDefault()
    if (!selectedComplaint) return setError('Select an existing complaint first.')
    setError('')
    setSaving(true)
    try {
      await api.post('/api/admin/complaint-appointments', {
        complaintId: selectedComplaint.id,
        type: values.type,
        title: values.title.trim(),
        description: values.description.trim() || null,
        startsAt: startUtc,
        endsAt: endUtc,
        locationType: values.locationType,
        locationDescription: values.locationType === 'Other' ? values.locationDescription.trim() : null,
        assignedPersonnelId: values.assignedPersonnelId,
        residentInstructions: values.residentInstructions.trim() || null,
        internalNotes: values.internalNotes.trim() || null,
      })
      onCreated()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Create Complaint Appointment" wide onClose={() => !saving && onClose()}>
      <Alert>{error}</Alert>
      <form className="appointment-form" onSubmit={submit}>
        <section>
          <h3>Complaint</h3>
          <Field label="Search eligible complaint" htmlFor="appointment-complaint-search" required>
            <input id="appointment-complaint-search" type="search" value={complaintQuery} onChange={(event) => setComplaintQuery(event.target.value)} placeholder="Reference number, subject, or category" />
          </Field>
          <Field label="Select complaint" htmlFor="appointment-complaint" required>
            <select id="appointment-complaint" value={selectedComplaint?.id ?? ''} onChange={(event) => setSelectedComplaint(complaints.find((complaint) => String(complaint.id) === event.target.value) ?? null)} required>
              <option value="">Choose an eligible complaint…</option>
              {complaints.map((complaint) => <option key={complaint.id} value={complaint.id}>{complaint.referenceNumber} · {complaint.category} · {complaint.subject}</option>)}
            </select>
          </Field>
          {selectedComplaint && <p className="appointment-selected-complaint">{selectedComplaint.status} · Incident location: {selectedComplaint.location || 'Not specified'}</p>}
          {loadingLists && <p className="muted">Loading complaints and authorized staff…</p>}
        </section>

        <section>
          <h3>Appointment Information</h3>
          <div className="appointment-form-grid">
            <Field label="Appointment type" htmlFor="appointment-type" required>
              <select id="appointment-type" value={values.type} onChange={(event) => change('type', event.target.value)}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select>
            </Field>
            <Field label="Title" htmlFor="appointment-title" required>
              <input id="appointment-title" maxLength={150} required value={values.title} onChange={(event) => change('title', event.target.value)} />
            </Field>
            <Field label="Date" htmlFor="appointment-date" required>
              <input id="appointment-date" type="date" min={localDateString(new Date())} required value={values.date} onChange={(event) => change('date', event.target.value)} />
            </Field>
            <div className="appointment-time-pair">
              <Field label="Start time" htmlFor="appointment-start" required><input id="appointment-start" type="time" required value={values.startTime} onChange={(event) => change('startTime', event.target.value)} /></Field>
              <Field label="End time" htmlFor="appointment-end" required><input id="appointment-end" type="time" required value={values.endTime} onChange={(event) => change('endTime', event.target.value)} /></Field>
            </div>
            <Field label="Appointment location" htmlFor="appointment-location-type" required>
              <select id="appointment-location-type" value={values.locationType} onChange={(event) => change('locationType', event.target.value)}>
                <option>Barangay Office</option><option>Incident Location</option><option>Other</option>
              </select>
            </Field>
            {values.locationType === 'Incident Location' && <p className="appointment-selected-complaint">Uses only the incident location submitted with the selected complaint; no resident home address is used.</p>}
            {values.locationType === 'Other' && <Field label="Location details" htmlFor="appointment-location-details" required><input id="appointment-location-details" maxLength={250} required value={values.locationDescription} onChange={(event) => change('locationDescription', event.target.value)} /></Field>}
            <Field label="Assigned personnel" htmlFor="appointment-staff" required>
              <select id="appointment-staff" required value={values.assignedPersonnelId} onChange={(event) => change('assignedPersonnelId', event.target.value)}>
                <option value="">Select authorized staff…</option>
                {personnel.map((staff) => <option key={staff.id} value={staff.id}>{staff.name} · {staff.role}</option>)}
              </select>
            </Field>
            <Field label="Description" htmlFor="appointment-description"><textarea id="appointment-description" maxLength={2000} value={values.description} onChange={(event) => change('description', event.target.value)} /></Field>
            <Field label="Instructions for resident" htmlFor="appointment-instructions"><textarea id="appointment-instructions" maxLength={1500} value={values.residentInstructions} onChange={(event) => change('residentInstructions', event.target.value)} /></Field>
            {canManage && <Field label="Internal notes (staff only)" htmlFor="appointment-internal-notes"><textarea id="appointment-internal-notes" maxLength={2000} value={values.internalNotes} onChange={(event) => change('internalNotes', event.target.value)} /></Field>}
          </div>
          {availability && (
            <div className={`appointment-availability${availability.conflicts.length ? ' conflict' : ''}`} role="status">
              <strong>{availability.conflicts.length ? 'Recorded conflict' : 'No recorded conflict'}</strong>
              <span>{availability.availabilityNote}</span>
              {availability.conflicts.map((item) => <span key={item.referenceNumber}>{item.referenceNumber} · {item.title} · {fmtDateTime(item.startsAt)}</span>)}
            </div>
          )}
        </section>
        <div className="appointment-form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !startUtc || !endUtc || !values.assignedPersonnelId}>{saving ? 'Saving…' : 'Create Pending Appointment'}</button>
        </div>
      </form>
    </Modal>
  )
}

function AppointmentDetail({ appointment, onClose, onChanged, canManage, userId }) {
  const [action, setAction] = useState('')
  const [reason, setReason] = useState('')
  const [outcome, setOutcome] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const canAct = canManage || appointment.assignedPersonnelId === userId

  const submitAction = async (requestedAction = action) => {
    setError('')
    setBusy(true)
    try {
      if (requestedAction === 'confirm') await api.post(`/api/admin/complaint-appointments/${appointment.id}/confirm`)
      else if (requestedAction === 'start') await api.post(`/api/admin/complaint-appointments/${appointment.id}/start`)
      else if (requestedAction === 'cancel') await api.post(`/api/admin/complaint-appointments/${appointment.id}/cancel`, { reason })
      else if (requestedAction === 'no-show') await api.post(`/api/admin/complaint-appointments/${appointment.id}/no-show`, { reason })
      else if (requestedAction === 'complete') await api.post(`/api/admin/complaint-appointments/${appointment.id}/complete`, { outcome })
      else if (requestedAction === 'reschedule') await api.post(`/api/admin/complaint-appointments/${appointment.id}/reschedule`, {
        startsAt: dateToUtc(newDate, newStart),
        endsAt: dateToUtc(newDate, newEnd),
        reason,
      })
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const actionForm = action && action !== 'confirm' && action !== 'start'
  const reasonNeeded = ['cancel', 'no-show', 'reschedule'].includes(action)
  const canSubmit = !busy && ((!reasonNeeded || reason.trim().length >= 3)
    && (action !== 'complete' || outcome.trim().length >= 3)
    && (action !== 'reschedule' || (newDate && newStart && newEnd && dateToUtc(newEnd ? newDate : '', newEnd) > dateToUtc(newDate, newStart))))

  return (
    <Modal title={`Appointment ${appointment.referenceNumber}`} wide onClose={() => !busy && onClose()}>
      <Alert>{error}</Alert>
      <div className="appointment-detail-grid">
        <div><span>Complaint</span><strong>{appointment.complaintReferenceNumber} · {appointment.complaintSubject}</strong></div>
        <div><span>Type</span><strong>{appointment.type}</strong></div>
        <div><span>Status</span><StatusBadge status={appointment.status} /></div>
        <div><span>Date & time</span><strong>{fmtDateTime(appointment.startsAt)} – {fmtDateTime(appointment.endsAt)}</strong></div>
        <div><span>Assigned personnel</span><strong>{appointment.assignedPersonnelName} · {appointment.assignedPersonnelRole}</strong></div>
        <div><span>Location</span><strong>{appointment.locationDescription || appointment.locationType}</strong></div>
        <div className="full"><span>Resident instructions</span><strong>{appointment.residentInstructions || 'No instructions provided.'}</strong></div>
        {canManage && <div className="full"><span>Internal notes</span><strong>{appointment.internalNotes || 'No internal notes.'}</strong></div>}
        {appointment.outcome && <div className="full"><span>Activity outcome</span><strong className="appointment-preline">{appointment.outcome}</strong></div>}
        {appointment.cancellationReason && <div className="full"><span>Cancellation reason</span><strong>{appointment.cancellationReason}</strong></div>}
      </div>

      {appointment.history?.length > 0 && (
        <section className="appointment-history">
          <h3>Schedule History</h3>
          {appointment.history.map((item, index) => <div key={`${item.action}-${item.performedAt}-${index}`}><strong>{item.action}</strong><span>{fmtDateTime(item.performedAt)} · {item.performedByName}</span>{item.reason && <p>{item.reason}</p>}</div>)}
        </section>
      )}

      {actionForm && (
        <div className="appointment-action-form">
          {action === 'reschedule' && <div className="appointment-time-pair">
            <Field label="New date" htmlFor="reschedule-date"><input id="reschedule-date" type="date" min={localDateString(new Date())} value={newDate} onChange={(event) => setNewDate(event.target.value)} /></Field>
            <Field label="New start time" htmlFor="reschedule-start"><input id="reschedule-start" type="time" value={newStart} onChange={(event) => setNewStart(event.target.value)} /></Field>
            <Field label="New end time" htmlFor="reschedule-end"><input id="reschedule-end" type="time" value={newEnd} onChange={(event) => setNewEnd(event.target.value)} /></Field>
          </div>}
          {reasonNeeded && <Field label={action === 'cancel' ? 'Cancellation reason' : action === 'no-show' ? 'No-show note' : 'Rescheduling reason'} htmlFor="appointment-reason" required><textarea id="appointment-reason" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></Field>}
          {action === 'complete' && <Field label="Activity outcome" htmlFor="appointment-outcome" required><textarea id="appointment-outcome" maxLength={4000} value={outcome} onChange={(event) => setOutcome(event.target.value)} /></Field>}
          <div className="row">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAction('')} disabled={busy}>Back</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={submitAction} disabled={!canSubmit}>{busy ? 'Saving…' : 'Save update'}</button>
          </div>
        </div>
      )}

      {!action && canAct && (
        <div className="appointment-detail-actions">
          {canManage && appointment.status === 'Pending Confirmation' && <button className="btn btn-primary btn-sm" onClick={() => void submitAction('confirm')} disabled={busy}>Confirm appointment</button>}
          {['Confirmed', 'Rescheduled'].includes(appointment.status) && <button className="btn btn-outline btn-sm" onClick={() => void submitAction('start')} disabled={busy}>Start activity</button>}
          {appointment.status === 'In Progress' && <button className="btn btn-primary btn-sm" onClick={() => setAction('complete')}>Record outcome & complete</button>}
          {canManage && !['Cancelled', 'Completed', 'No Show'].includes(appointment.status) && <>
            <button className="btn btn-outline btn-sm" onClick={() => setAction('reschedule')}>Reschedule</button>
            <button className="btn btn-danger btn-sm" onClick={() => setAction('cancel')}>Cancel appointment</button>
          </>}
          {canManage && ['Confirmed', 'Rescheduled'].includes(appointment.status) && <button className="btn btn-outline btn-sm" onClick={() => setAction('no-show')}>Mark no-show</button>}
        </div>
      )}
    </Modal>
  )
}

export default function ComplaintSchedulingPage() {
  const { session } = useAuth()
  const canManage = MANAGEMENT_ROLES.includes(session?.role) || session?.role === 'AdminStaff'
  const isManager = MANAGEMENT_ROLES.includes(session?.role)
  const [dashboard, setDashboard] = useState(null)
  const [data, setData] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [view, setView] = useState('agenda')
  const [date, setDate] = useState(localDateString(new Date()))
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')

  const range = useMemo(() => buildRange(date, view), [date, view])
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: '1', pageSize: '100', sortBy: 'soonest' })
    if (range[0]) params.set('dateFrom', `${range[0]}T00:00:00+08:00`)
    if (range[1]) params.set('dateTo', `${shiftDate(range[1], 1)}T00:00:00+08:00`)
    if (status) params.set('status', status)
    if (type) params.set('type', type)
    if (search.trim()) params.set('q', search.trim())
    return params.toString()
  }, [range, status, type, search])

  const reload = useCallback(() => setReloadKey((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    Promise.all([
      api.get(`/api/admin/complaint-appointments?${query}`, { signal: controller.signal }),
      api.get('/api/admin/complaint-appointments/dashboard', { signal: controller.signal }),
    ]).then(([appointmentsResponse, dashboardResponse]) => {
      setData(toPage(appointmentsResponse.data))
      setDashboard(dashboardResponse.data)
    }).catch((err) => {
      if (err.code !== 'ERR_CANCELED') setError(getErrorMessage(err))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [query, reloadKey])

  useEffect(() => {
    const timer = window.setInterval(reload, 60000)
    return () => window.clearInterval(timer)
  }, [reload])

  const appointments = data.items
  const selectedAppointment = appointments.find((item) => item.id === selectedId)
  const stats = [
    { label: 'Upcoming Appointments', value: dashboard?.upcoming ?? 0, filter: 'Upcoming' },
    { label: "Today's Appointments", value: dashboard?.today ?? 0, filter: 'Today' },
    { label: 'Pending Confirmation', value: dashboard?.pendingConfirmation ?? 0, filter: 'Pending Confirmation' },
    { label: 'In Progress', value: dashboard?.inProgress ?? 0, filter: 'In Progress' },
    { label: 'Completed This Month', value: dashboard?.completedThisMonth ?? 0, filter: 'Completed This Month' },
    { label: 'Needs Attention', value: dashboard?.needsAttention ?? 0, filter: 'Needs Attention' },
  ]

  const stepDate = (direction) => {
    if (view === 'month') {
      const [year, month] = date.split('-').map(Number)
      setDate(new Date(Date.UTC(year, month - 1 + direction, 1)).toISOString().slice(0, 10))
    } else setDate((current) => shiftDate(current, direction * (view === 'week' ? 7 : view === 'agenda' ? 30 : 1)))
  }
  const chooseStat = (filter) => {
    if (filter === 'Today') {
      setDate(localDateString(new Date()))
      setView('day')
      setStatus('')
    } else if (filter === 'Completed This Month') {
      setDate(`${localDateString(new Date()).slice(0, 7)}-01`)
      setView('month')
      setStatus('Completed')
    } else setStatus((current) => current === filter ? '' : filter)
  }

  return (
    <div className="complaint-scheduling">
      <header className="scheduling-header">
        <div><span className="scheduling-eyebrow">Complaints</span><h1>Complaint Scheduling</h1><p>Manage complaint-related inspections, mediations, hearings, and follow-up appointments.</p><small>Today · {fmtDateTime(new Date(), { dateOnly: true })} · All schedule times use Asia/Manila.</small></div>
        <div className="scheduling-header-actions">
          <button type="button" className="btn btn-outline" onClick={reload} disabled={loading}><RefreshCw size={16} /> Refresh</button>
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)} disabled={!canManage}><Plus size={17} /> Create Appointment</button>
        </div>
      </header>

      <Alert>{error}</Alert>
      <section className="scheduling-stats" aria-label="Appointment overview">
        {stats.map((item) => <button key={item.label} type="button" className="scheduling-stat" onClick={() => chooseStat(item.filter)} aria-pressed={status === item.filter && Boolean(item.filter)}>
          <span>{item.label}</span><strong>{loading && !dashboard ? '—' : item.value}</strong>
        </button>)}
      </section>

      <section className="scheduling-calendar-card">
        <div className="scheduling-toolbar">
          <div className="scheduling-view-switch" role="group" aria-label="Calendar view">
            {['day', 'week', 'month', 'agenda'].map((option) => <button key={option} type="button" className={view === option ? 'active' : ''} onClick={() => setView(option)}>{option[0].toUpperCase() + option.slice(1)}</button>)}
          </div>
          <div className="scheduling-calendar-nav">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setDate(localDateString(new Date()))}>Today</button>
            <button type="button" className="icon-btn" aria-label="Previous period" onClick={() => stepDate(-1)}><ChevronLeft size={18} /></button>
            <strong>{fmtDateTime(dateToUtc(date, '12:00'), { dateOnly: true })}</strong>
            <button type="button" className="icon-btn" aria-label="Next period" onClick={() => stepDate(1)}><ChevronRight size={18} /></button>
          </div>
          {canManage && <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}><Plus size={15} /> New</button>}
        </div>

        <div className="scheduling-filters">
          <Field label="Search appointment or complaint reference" htmlFor="schedule-search"><input id="schedule-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference, complaint, or title" /></Field>
          <Field label="Appointment status" htmlFor="schedule-status"><select id="schedule-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Appointment type" htmlFor="schedule-type"><select id="schedule-type" value={type} onChange={(event) => setType(event.target.value)}><option value="">All types</option>{TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Date" htmlFor="schedule-date"><input id="schedule-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
        </div>

        {loading ? <SkeletonList count={2} lines={3} /> : !appointments.length ? <EmptyState title="No appointments in this period">Change the date or filters, or create an appointment linked to an eligible complaint.</EmptyState> : view === 'month' || view === 'week' ? (
          <CalendarGrid appointments={appointments} date={date} view={view} onSelect={setSelectedId} />
        ) : (
          <div className="scheduling-appointment-list">
            {appointments.map((appointment) => <button type="button" className="scheduling-appointment" key={appointment.id} onClick={() => setSelectedId(appointment.id)}>
              <span className="scheduling-appointment-time"><strong>{fmtDateTime(appointment.startsAt)}</strong><small>{fmtDateTime(appointment.endsAt)}</small></span>
              <span className="scheduling-appointment-main"><strong>{appointment.title}</strong><small>{appointment.referenceNumber} · Complaint {appointment.complaintReferenceNumber} · {appointment.type}</small><small><Users size={13} /> {appointment.assignedPersonnelName} · {appointment.locationDescription || appointment.locationType}</small></span>
              <StatusBadge status={appointment.status} />
            </button>)}
          </div>
        )}
        <p className="scheduling-refreshed"><CalendarDays size={14} /> Refreshed {fmtDateTime(new Date())} · {data.total} appointments</p>
        {!isManager && session?.role === 'SupportingStaff' && <p className="scheduling-notice">You can see appointments assigned to you only. Staff working hours are not configured; displayed availability means only that no recorded appointment conflict was found.</p>}
      </section>

      {createOpen && <AppointmentForm canManage={isManager} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); reload() }} />}
      {selectedAppointment && <AppointmentDetail appointment={selectedAppointment} onClose={() => setSelectedId(null)} onChanged={() => { setSelectedId(null); reload() }} canManage={isManager} userId={session?.userId || session?.id} />}
    </div>
  )
}
