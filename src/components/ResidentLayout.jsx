import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OfflineBanner from './OfflineBanner'
import NotificationBell from './NotificationBell'
import { Home, ClipboardList, FilePlus2, Megaphone, UserRound, WifiOff, RefreshCw, LogOut } from 'lucide-react'
import { useOfflineSync } from '../lib/useOfflineSync'
import './ResidentMobile.css'

const starts = (path, prefix) => path === prefix || path.startsWith(prefix + '/')

const items = [
  { to: '/resident', label: 'Home', Icon: Home, isActive: (path) => path === '/resident' },
  { to: '/resident/complaints', label: 'Track', Icon: ClipboardList, isActive: (path) => (starts(path, '/resident/complaints') && !starts(path, '/resident/complaints/new')) || starts(path, '/resident/track') },
  {
    to: '/resident/classify', label: 'File', Icon: FilePlus2,
    isActive: (path) => starts(path, '/resident/file') || starts(path, '/resident/classify') || starts(path, '/resident/complaints/new') || starts(path, '/resident/reports/new'),
  },
  { to: '/resident/announcements', label: 'News', Icon: Megaphone, isActive: (path) => starts(path, '/resident/announcements') },
  { to: '/resident/profile', label: 'Profile', Icon: UserRound, isActive: (path) => starts(path, '/resident/profile') },
]

export default function ResidentLayout() {
  const { session, logout, bypassActive } = useAuth()
  const { pathname } = useLocation()
  const { online, syncing, pendingCount } = useOfflineSync()
  const name = session?.fullName || session?.email || 'Resident'
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  return (
    <div className="resident-shell">
      <OfflineBanner />
      <header className="resident-top">
        <Link to="/resident" className="resident-brand" aria-label="Annex 6 home">
          <img src="/San_Jose_LOGO.webp" alt="" className="logo-blend" />
          <span><strong>Annex 6 BMIS</strong><small>Barangay San Jose</small></span>
        </Link>
        <div className="resident-header-actions">
          {(!online || syncing || pendingCount > 0) && (
            <span className={`resident-sync-state${!online ? ' is-offline' : ''}`} role="status">
              {!online ? <><WifiOff size={14} /> Offline</> : syncing ? <><RefreshCw size={14} className="resident-spin" /> Syncing</> : <>{pendingCount} pending</>}
            </span>
          )}
          <NotificationBell />
          <Link to="/resident/profile" className="resident-profile-shortcut" aria-label={`Profile: ${name}`}>{initials || 'R'}</Link>
          <button type="button" className="resident-logout" onClick={logout} aria-label="Log out" title="Log out"><LogOut size={17} /></button>
        </div>
      </header>
      {bypassActive && <div className="dev-notice resident-dev-notice">Development device bypass is active.</div>}
      <main className="resident-main" id="main"><Outlet /></main>
      <nav className="bottom-nav" aria-label="Resident navigation">
        <div className="bottom-nav-inner">
          {items.map(({ to, label, Icon, isActive }) => {
            const active = isActive(pathname)
            return (
              <NavLink key={to} to={to} end={to === '/resident'} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
                <span className="ico" aria-hidden="true"><Icon size={20} strokeWidth={1.75} /></span><span>{label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
