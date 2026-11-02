import { Link } from 'react-router-dom'
import { HelpCircle, MessageSquareText, FileText, ChevronRight } from 'lucide-react'

const options = [
  {
    to: '/resident/classify',
    Icon: HelpCircle,
    title: 'Not sure? Find out',
    text: 'Answer a few questions and we will tell you whether to file a complaint or a report.',
  },
  {
    to: '/resident/complaints/new',
    Icon: MessageSquareText,
    title: 'File a complaint',
    text: 'Raise a concern or grievance that needs the barangay to look into and act on.',
  },
  {
    to: '/resident/reports/new',
    Icon: FileText,
    title: 'File a report',
    text: 'Report an incident or issue in your community so the barangay is informed.',
  },
]

export default function FileHub() {
  return (
    <>
      <h1>What would you like to file?</h1>
      <p className="muted">Choose an option below. You can track everything under the Track tab.</p>

      <div style={{ display: 'grid', gap: '.75rem', marginTop: '1rem' }}>
        {options.map(({ to, Icon, title, text }) => (
          <Link
            key={to}
            to={to}
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: '.9rem', textDecoration: 'none', color: 'inherit', minHeight: '72px' }}
          >
            <span
              className="ico"
              aria-hidden="true"
              style={{ flex: '0 0 auto', width: '44px', height: '44px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'var(--primary-surface)', color: 'var(--primary-dark)' }}
            >
              <Icon size={24} strokeWidth={1.75} />
            </span>
            <span style={{ flex: 1 }}>
              <strong style={{ display: 'block', color: 'var(--primary-dark)' }}>{title}</strong>
              <span className="muted" style={{ fontSize: '.85rem' }}>{text}</span>
            </span>
            <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" style={{ flex: '0 0 auto', opacity: .5 }} />
          </Link>
        ))}
      </div>
    </>
  )
}