import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OfflineBanner from './OfflineBanner'
import NotificationBell from './NotificationBell'
import { api } from '../lib/api'
import { LayoutDashboard, Users, MessageSquareText, ClipboardList, Link2, CalendarDays, Megaphone, ScrollText, UserCog, FileText, ChevronDown, ChevronRight } from 'lucide-react'

const NAV = [
  { section: 'Overview', items: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  ] },
  { section: 'Management', items: [
    { to: '/admin/residents', label: 'Residents', icon: Users, hasSubmenu: true, submenu: [
      { to: '/admin/residents', label: 'All Residents', icon: Users },
      { to: '/admin/applications', label: 'Resident Applications', icon: FileText },
    ] },
    { to: '/admin/complaints', label: 'Complaints', icon: MessageSquareText },
    { to: '/admin/reports', label: 'Reports', icon: ClipboardList },
    { to: '/admin/officials', label: 'Barangay Officials', icon: UserCog },
  ] },
  { section: 'Communication', items: [
    { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  ] },
  { section: 'System', items: [
    { to: '/admin/audit-logs', label: 'Audit Trail', icon: ScrollText },
  ] },
]

export default function AdminLayout() {
  const { session, logout, bypassActive } = useAuth()
  const [open, setOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState({ Residents: true })
  const [pendingApps, setPendingApps] = useState(0)
  const initial = (session?.email?.[0] || 'A').toUpperCase()

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/api/applications?status=Pending+Verification&page=1&pageSize=1')
        setPendingApps(data?.total ?? 0)
      } catch { /* ignore */ }
    }
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const toggleMenu = (label) => {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <div className="admin-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Admin navigation">
        <Link to="/admin" className="brand" onClick={() => setOpen(false)}>
          <img src="/San_Jose_LOGO.webp" alt="Barangay San Jose logo" className="logo-blend" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          <span><strong>Annex 6 BMIS</strong><small>Barangay San Jose</small></span>
        </Link>
        <nav className="nav-scroll">
          {NAV.map((group) => (
            <div key={group.section}>
              <div className="nav-section">{group.section}</div>
              {group.items.map((item) => {
                const Icon = item.icon
                if (item.hasSubmenu) {
                  const isExpanded = expandedMenus[item.label]
                  return (
                    <div key={item.label}>
                      <button
                        type="button"
                        className="nav nav-parent"
                        onClick={() => toggleMenu(item.label)}
                        aria-expanded={isExpanded}
                      >
                        <span className="nav-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.75} /></span>
                        <span>{item.label}</span>
                        <span className="nav-chevron" aria-hidden="true">
                          {isExpanded ? <ChevronDown size={14} strokeWidth={1.75} /> : <ChevronRight size={14} strokeWidth={1.75} />}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="nav-submenu">
                          {item.submenu.map((sub) => {
                            const SubIcon = sub.icon
                            return (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                onClick={() => setOpen(false)}
                                className={({ isActive }) => `nav nav-sub${isActive ? ' active' : ''}`}
                              >
                                <span className="nav-icon" aria-hidden="true"><SubIcon size={16} strokeWidth={1.75} /></span>
                                <span>{sub.label}</span>
                                {sub.to === '/admin/applications' && pendingApps > 0 && (
                                  <span className="badge" style={{ marginLeft: 'auto', background: '#f59e0b', color: '#fff', fontSize: '.65rem', padding: '.1rem .4rem' }}>{pendingApps}</span>
                                )}
                              </NavLink>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) => `nav${isActive ? ' active' : ''}`}
                  >
                    <span className="nav-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.75} /></span>
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">Rodriguez, Rizal</div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div className="admin-body">
        <OfflineBanner />
        <header className="admin-top">
          <button type="button" className="icon-btn menu-btn" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>☰</button>
          <div className="top-spacer" />
          {bypassActive && <span className="dev-notice">Dev device bypass active</span>}
          <NotificationBell />
          <div className="user-chip">
            <span className="avatar" aria-hidden="true">{initial}</span>
            <span className="user-meta">
              <span className="user-email">{session?.email}</span>
              <span className="user-role">Administrator</span>
            </span>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={logout}>Log out</button>
        </header>
        <main className="admin-main" id="main"><Outlet /></main>
      </div>
    </div>
  )
}