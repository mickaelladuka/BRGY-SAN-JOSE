import { Link } from 'react-router-dom'
import { Alert, EmptyState, SkeletonList, StatusBadge } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useFetch } from '../../lib/useFetch'
import { toPage } from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/format'
import { HelpCircle, MessageSquareText, Megaphone, ClipboardList, UserRound, FileText, ChevronRight, MapPinned, ArrowUpRight } from 'lucide-react'

const services = [
  { to: '/resident/complaints/new', Icon: MessageSquareText, label: 'File a complaint', note: 'Submit a formal concern', tone: 'terracotta' },
  { to: '/resident/reports/new', Icon: FileText, label: 'Submit a report', note: 'Tell us about a community issue', tone: 'orange' },
  { to: '/resident/classify', Icon: HelpCircle, label: 'Choose the right service', note: 'Report or complaint?', tone: 'neutral' },
  { to: '/resident/directory', Icon: MapPinned, label: 'Barangay directory', note: 'Departments and services', tone: 'neutral' },
]

export default function Dashboard() {
  const { session } = useAuth()
  const me = useFetch('/api/residents/me')
  const complaints = useFetch('/api/complaints/mine', { page: 1, pageSize: 3, sortOrder: 'newest' })
  const reports = useFetch('/api/reports/mine', { page: 1, pageSize: 3, sortOrder: 'newest' })
  const reportSummary = useFetch('/api/reports/mine/summary')
  const news = useFetch('/api/announcements', { page: 1, pageSize: 3 })
  const firstName = me.data?.firstName || session?.fullName?.split(/\s+/)[0] || session?.email?.split('@')[0] || 'Resident'
  const complaintPage = toPage(complaints.data)
  const reportPage = toPage(reports.data)

  return (
    <div className="resident-dashboard">
      <section className="resident-welcome">
        <div className="resident-welcome-copy">
          <span className="resident-eyebrow">BARANGAY SAN JOSE · ANNEX AREA 6</span>
          <h1>Magandang araw, {firstName}.</h1>
          <p>How can we help you today?</p>
        </div>
        <span className="resident-welcome-mark" aria-hidden="true"><img src="/San_Jose_LOGO.webp" alt="" /></span>
      </section>

      <section className="resident-overview" aria-label="Your activity">
        <Link to="/resident/complaints" className="resident-overview-card">
          <span className="resident-overview-icon"><ClipboardList size={18} /></span>
          <span><small>My complaints</small><strong>{complaints.loading ? '—' : complaintPage.total}</strong></span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <Link to="/resident/complaints?tab=reports" className="resident-overview-card">
          <span className="resident-overview-icon warm"><FileText size={18} /></span>
          <span><small>My reports</small><strong>{reportSummary.loading ? '—' : reportSummary.data?.total ?? reportPage.total}</strong></span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        {(reportSummary.data?.requiresAdditionalInformation ?? 0) > 0 && (
          <Link to="/resident/complaints?tab=reports" className="resident-pending-callout">
            <span><strong>Action needed</strong><small>You have a report that needs more information.</small></span><ChevronRight size={18} />
          </Link>
        )}
      </section>

      <section className="resident-home-section">
        <div className="resident-section-heading"><div><span className="resident-eyebrow">GET STARTED</span><h2>Quick actions</h2></div></div>
        <div className="resident-service-grid">
          {services.map(({ to, Icon, label, note, tone }) => (
            <Link key={to} to={to} className={`resident-service-card ${tone}`}>
              <span className="resident-service-icon"><Icon size={21} strokeWidth={1.8} /></span>
              <span className="resident-service-copy"><strong>{label}</strong><small>{note}</small></span>
              <ChevronRight size={17} className="resident-service-arrow" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="resident-home-section resident-activity-section">
        <div className="resident-section-heading">
          <div><span className="resident-eyebrow">YOUR REQUESTS</span><h2>Recent activity</h2></div>
          <Link to="/resident/complaints" className="resident-text-link">View all</Link>
        </div>
        <div className="resident-home-card">
          <div className="resident-list-section-heading"><h3>Complaints</h3><Link to="/resident/complaints">See all</Link></div>
          {complaints.loading ? <SkeletonList count={2} lines={2} /> : complaints.error ? <Alert>{complaints.error}</Alert> : complaintPage.items.length === 0
            ? <EmptyState title="No complaints yet">Submitted complaints will appear here.</EmptyState>
            : complaintPage.items.map((item) => (
              <Link key={item.id} className="resident-activity-row" to={`/resident/track/complaints/${item.id}`}>
                <span className="resident-activity-icon"><MessageSquareText size={17} /></span>
                <span className="resident-activity-copy"><strong>{item.subject}</strong><small>{item.referenceNumber} · {fmtDate(item.submittedAt)}</small></span>
                <StatusBadge status={item.status} /><ChevronRight size={16} className="resident-row-chevron" />
              </Link>
            ))}
          <div className="resident-list-section-heading report-heading"><h3>Reports</h3><Link to="/resident/complaints?tab=reports">See all</Link></div>
          {reports.loading ? <SkeletonList count={2} lines={2} /> : reports.error ? <Alert>{reports.error}</Alert> : reportPage.items.length === 0
            ? <EmptyState title="No reports yet">Community reports you submit will appear here.</EmptyState>
            : reportPage.items.map((item) => (
              <Link key={item.id} className="resident-activity-row" to={`/resident/track/reports/${item.id}`}>
                <span className="resident-activity-icon warm"><FileText size={17} /></span>
                <span className="resident-activity-copy"><strong>{item.title || item.category}</strong><small>{item.referenceNumber} · {fmtDate(item.submittedAt)}</small></span>
                <StatusBadge status={item.status} /><ChevronRight size={16} className="resident-row-chevron" />
              </Link>
            ))}
        </div>
      </section>

      <section className="resident-home-section">
        <div className="resident-section-heading">
          <div><span className="resident-eyebrow">BARANGAY UPDATES</span><h2>Announcements</h2></div>
          <Link to="/resident/announcements" className="resident-text-link">View all</Link>
        </div>
        <div className="resident-home-card resident-announcement-preview">
          {news.loading ? <SkeletonList count={2} lines={2} /> : news.error ? <Alert>{news.error}</Alert> : toPage(news.data).items.length === 0
            ? <EmptyState title="No announcements right now" />
            : toPage(news.data).items.map((item) => (
              <article className="resident-announcement-row" key={item.id}>
                <span className="resident-announcement-icon"><Megaphone size={17} /></span>
                <div><strong>{item.title}</strong><small>{item.category ? `${item.category} · ` : ''}{fmtDateTime(item.publishedAt)}</small><p>{item.content}</p></div>
              </article>
            ))}
        </div>
      </section>

      <Link to="/resident/profile" className="resident-profile-prompt"><UserRound size={18} /><span>Keep your contact details up to date</span><ChevronRight size={17} /></Link>
    </div>
  )
}
