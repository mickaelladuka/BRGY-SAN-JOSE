import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OfflineBanner from './OfflineBanner'
import { Home, ClipboardList, FilePlus2, Megaphone, UserRound, WifiOff, RefreshCw, BookOpen } from 'lucide-react'
import { useOfflineSync } from '../lib/useOfflineSync'

const starts = (path, prefix) => path === prefix || path.startsWith(prefix + '/')

// "File" groups everything about submitting: the hub, classify, new complaint, new report.
// "Track" is the list/detail pages, so it must NOT light up on /complaints/new.
const items = [
  { to: '/resident', label: 'Home', Icon: Home, isActive: (p) => p === '/resident' },
  { to: '/resident/announcements', label: 'News', Icon: Megaphone, isActive: (p) => starts(p, '/resident/announcements') },
  { to: '/resident/directory', label: 'Directory', Icon: BookOpen, isActive: (p) => starts(p, '/resident/directory') || starts(p, '/resident/officials') || starts(p, '/resident/departments') },
  {
    to: '/resident/classify', label: 'File', Icon: FilePlus2,
    isActive: (p) =>
      starts(p, '/resident/file') ||
      starts(p, '/resident/classify') ||
      starts(p, '/resident/complaints/new') ||
      starts(p, '/resident/reports/new'),
  },
  {
    to: '/resident/complaints', label: 'Track', Icon: ClipboardList,
    isActive: (p) =>
      (starts(p, '/resident/complaints') && !starts(p, '/resident/complaints/new')) ||
      starts(p, '/resident/track'),
  },
  { to: '/resident/profile', label: 'Profile', Icon: UserRound, isActive: (p) => starts(p, '/resident/profile') },
]

export default function ResidentLayout() {
  const { logout, bypassActive } = useAuth()
  const { pathname } = useLocation()
  const { online, syncing, pendingCount } = useOfflineSync()
  return (
    <div className="resident-shell">
      <OfflineBanner />
      <header className="resident-top">
        <Link to="/resident" className="brand"><img src="/San_Jose_LOGO.webp" alt="Barangay San Jose logo" className="logo-blend" style={{ width: '28px', height: '28px', objectFit: 'contain' }} /> Annex 6</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          {!online && <span style={{ display: 'flex', alignItems: 'center', gap: '.25rem', fontSize: '.75rem', color: '#fbbf24' }}><WifiOff size={14} strokeWidth={1.75} /> Offline</span>}
          {syncing && <span style={{ display: 'flex', alignItems: 'center', gap: '.25rem', fontSize: '.75rem', color: '#93c5fd' }}><RefreshCw size={14} strokeWidth={1.75} style={{ animation: 'spin 1s linear infinite' }} /> Syncing…</span>}
          {pendingCount > 0 && <span className="badge" style={{ background: '#f59e0b', color: '#fff', fontSize: '.7rem' }}>{pendingCount} pending</span>}
          <button type="button" className="btn btn-sm btn-outline" style={{ background: 'transparent' }} onClick={logout}>Log out</button>
        </div>
      </header>
      {bypassActive && <div className="dev-notice" style={{ margin: '.5rem 1rem 0' }}>Development device bypass is active.</div>}
      <main className="resident-main" id="main"><Outlet /></main>
      <nav className="bottom-nav" aria-label="Resident navigation">
        <div className="bottom-nav-inner">
          {items.map(({ to, label, Icon, isActive }) => {
            const active = isActive(pathname)
            return (
              <NavLink key={to} to={to} end={to === '/resident'} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
                <span className="ico" aria-hidden="true"><Icon size={20} strokeWidth={1.75} /></span>{label}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}