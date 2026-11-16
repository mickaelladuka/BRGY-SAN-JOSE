import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, EmptyState, SkeletonList, StatusBadge } from '../../components/ui'
import { api, getErrorMessage } from '../../lib/api'
import { CalendarClock, MapPin } from 'lucide-react'

const formatTime = (value) => new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

export default function ResidentComplaintAppointments() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api.get('/api/resident/complaint-appointments', { signal: controller.signal })
      .then(({ data }) => setAppointments(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const { upcoming, history } = useMemo(() => {
    const now = Date.now()
    const future = appointments.filter((item) => new Date(item.endsAt).getTime() >= now && !['Cancelled', 'Completed', 'No Show'].includes(item.status))
    const previous = appointments.filter((item) => !future.includes(item))
    return { upcoming: future, history: previous }
  }, [appointments])

  return (
    <div className="resident-appointments">
      <div className="resident-appointments-back"><Link to="/resident/complaints">← Back to my requests</Link></div>
      <header className="resident-appointments-header">
        <span className="resident-appointments-icon"><CalendarClock size={23} /></span>
        <div><h1>My Complaint Appointments</h1><p>Appointments for your own complaint records. Times are shown in Asia/Manila.</p></div>
      </header>
      <Alert>{error}</Alert>
      {loading ? <SkeletonList count={2} lines={3} /> : (
        <>
          <section className="resident-appointment-section">
            <h2>Upcoming Appointments</h2>
            {upcoming.length ? <div className="resident-appointment-list">
              {upcoming.map((item) => <article className="resident-appointment-card" key={item.id}>
                <div className="resident-appointment-card-head"><strong>{item.title}</strong><StatusBadge status={item.status} /></div>
                <p>{item.type} · Complaint {item.complaintReferenceNumber}</p>
                <div className="resident-appointment-meta"><CalendarClock size={15} /><span>{formatTime(item.startsAt)} – {new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', timeStyle: 'short' }).format(new Date(item.endsAt))}</span></div>
                <div className="resident-appointment-meta"><MapPin size={15} /><span>{item.location || 'Location to be confirmed'}</span></div>
                {item.residentInstructions && <p className="resident-appointment-instructions"><strong>Instructions:</strong> {item.residentInstructions}</p>}
              </article>)}
            </div> : <EmptyState title="No upcoming appointments">When an appointment is arranged for one of your complaints, it will appear here.</EmptyState>}
          </section>
          {history.length > 0 && <section className="resident-appointment-section">
            <h2>Appointment History</h2>
            <div className="resident-appointment-list">
              {history.map((item) => <article className="resident-appointment-card past" key={item.id}>
                <div className="resident-appointment-card-head"><strong>{item.title}</strong><StatusBadge status={item.status} /></div>
                <p>{item.type} · Complaint {item.complaintReferenceNumber}</p>
                <div className="resident-appointment-meta"><CalendarClock size={15} /><span>{formatTime(item.startsAt)} – {new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', timeStyle: 'short' }).format(new Date(item.endsAt))}</span></div>
                <div className="resident-appointment-meta"><MapPin size={15} /><span>{item.location || 'Location to be confirmed'}</span></div>
                {item.residentInstructions && <p className="resident-appointment-instructions"><strong>Instructions:</strong> {item.residentInstructions}</p>}
              </article>)}
            </div>
          </section>}
        </>
      )}
    </div>
  )
}
