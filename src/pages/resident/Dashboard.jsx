import { Link } from 'react-router-dom'
import { Alert, EmptyState, SkeletonList, StatusBadge } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useFetch } from '../../lib/useFetch'
import { toPage } from '../../lib/api'
import { fmtDate } from '../../lib/format'
import { HelpCircle, MessageSquareText, Megaphone, ClipboardList, UserRound, FileText } from 'lucide-react'

const services = [
  { to: '/resident/classify', Icon: HelpCircle, label: 'What type?' },
  { to: '/resident/complaints/new', Icon: MessageSquareText, label: 'File complaint' },
  { to: '/resident/reports/new', Icon: FileText, label: 'File report' },
  { to: '/resident/complaints', Icon: ClipboardList, label: 'Track status' },
  { to: '/resident/announcements', Icon: Megaphone, label: 'Announcements' },
  { to: '/resident/profile', Icon: UserRound, label: 'My profile' },
]

export default function Dashboard() {
  const { session } = useAuth()
  const me = useFetch('/api/residents/me')
  const complaints = useFetch('/api/complaints/mine', { page: 1, pageSize: 3 })
  const reports = useFetch('/api/reports/mine', { page: 1, pageSize: 3 })
  const news = useFetch('/api/announcements', { page: 1, pageSize: 3 })

  const name = me.data?.firstName || session.email.split('@')[0]
  const section = (title, to, q, render, empty) => (
    <section className="card">
      <div className="card-head"><h2>{title}</h2><Link to={to}>See all</Link></div>
      {q.loading ? <SkeletonList count={3} lines={3} /> : q.error ? <Alert>{q.error}</Alert> : toPage(q.data).items.length === 0
        ? <EmptyState title={empty} />
        : toPage(q.data).items.map(render)}
    </section>
  )

  return (
    <>
      <h1>Hello, {name}!</h1>
      <p className="muted">What would you like to do today?</p>
      <div className="services">
        {services.map(({ to, Icon, label }) => (
          <Link key={to} to={to} className="service">
            <span className="ico" aria-hidden="true"><Icon size={24} strokeWidth={1.75} /></span>
            {label}
          </Link>
        ))}
      </div>

      {section('Recent complaints', '/resident/complaints', complaints, (c) => (
        <Link key={c.id} className="list-item" to={`/resident/track/complaints/${c.id}`}>
          <div className="top"><strong>{c.subject}</strong><StatusBadge status={c.status} /></div>
          <span className="muted">{c.referenceNumber} · {fmtDate(c.submittedAt)}</span>
        </Link>
      ), 'No complaints yet')}

      {section('Recent reports', '/resident/complaints?tab=reports', reports, (r) => (
        <Link key={r.id} className="list-item" to={`/resident/track/reports/${r.id}`}>
          <div className="top"><strong>{r.category}</strong><StatusBadge status={r.status} /></div>
          <span className="muted">{r.referenceNumber} · {fmtDate(r.submittedAt)}</span>
        </Link>
      ), 'No reports yet')}

      {section('Announcements', '/resident/announcements', news, (a) => (
        <div key={a.id} className="list-item">
          <div className="top"><strong>{a.title}</strong>{a.category && <span className="badge">{a.category}</span>}</div>
          <span className="muted">{fmtDate(a.publishedAt)}</span>
        </div>
      ), 'No announcements right now')}
    </>
  )
}