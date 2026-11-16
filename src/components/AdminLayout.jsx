import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OfflineBanner from './OfflineBanner'
import NotificationBell from './NotificationBell'
import { api } from '../lib/api'
import { LayoutDashboard, Users, MessageSquareText, ClipboardList, Megaphone, ScrollText, UserCog, FileText, Building2, ChevronDown, ChevronRight, LogOut } from 'lucide-react'

const NAV = [
  { section: 'Overview', items: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  ] },
  { section: 'Management', items: [
    { to: '/admin/visitors', label: "Visitor's Log", icon: ClipboardList },
    { to: '/admin/residents', label: 'Residents', icon: Users, hasSubmenu: true, submenu: [
      { to: '/admin/residents', label: 'All Residents', icon: Users },
      { to: '/admin/applications', label: 'Resident Applications', icon: FileText },
    ] },
    { to: '/admin/complaints', label: 'Complaints', icon: MessageSquareText, hasSubmenu: true, submenu: [
      { to: '/admin/complaints', label: 'Complaint Records', icon: MessageSquareText, end: true },
      { to: '/admin/complaints/scheduling', label: 'Complaint Scheduling', icon: ClipboardList },
    ] },
    { to: '/admin/departments', label: 'Department Management', icon: Building2, hasSubmenu: true, submenu: [
      { to: '/admin/departments', label: 'Departments', icon: Building2 },
      { to: '/admin/officials', label: 'Officials', icon: UserCog },
    ] },
    { to: '/admin/reports', label: 'Reports', icon: ClipboardList },
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
  const [expandedMenus, setExpandedMenus] = useState({ Residents: true, Complaints: true })
  const [pendingApps, setPendingApps] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)
  const avatarName = session?.fullName || session?.email || 'Administrator'
  const initials = avatarName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const roleLabel = {
    Admin: 'Administrator',
    SuperAdmin: 'Super Administrator',
    OIC: 'Office In Charge',
    Secretary: 'Secretary',
    AdminStaff: 'Admin Staff',
    SupportingStaff: 'Supporting Staff',
  }[session?.role] || 'Administrator'

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/api/applications?status=Pending+Review&page=1&pageSize=1')
        setPendingApps(data?.total ?? 0)
      } catch {
        setPendingApps(0)
      }
    }
    load()
    const refreshVisiblePage = () => {
      if (document.visibilityState === 'visible') load()
    }
    const t = setInterval(refreshVisiblePage, 15000)
    window.addEventListener('focus', refreshVisiblePage)
    return () => {
      clearInterval(t)
      window.removeEventListener('focus', refreshVisiblePage)
    }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!profileOpen) return undefined
    const closeOnOutsideClick = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false)
    }
    const closeOnEscape = (event) => event.key === 'Escape' && setProfileOpen(false)
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [profileOpen])

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
                                end={sub.end}
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
        <div className="sidebar-bottom">
          <button type="button" className="sidebar-logout" onClick={() => { setOpen(false); logout() }}>
            <LogOut size={17} strokeWidth={1.8} />
            <span>Log out</span>
          </button>
          <div className="sidebar-foot">Rodriguez, Rizal</div>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div className="admin-body">
        <OfflineBanner />
        <header className="admin-top">
          <button type="button" className="icon-btn menu-btn" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>☰</button>
          <div className="top-spacer" />
          {bypassActive && <span className="dev-notice">Dev device bypass active</span>}
          <NotificationBell />
          <div className="admin-profile" ref={profileRef}>
            <button type="button" className="user-chip" aria-expanded={profileOpen} aria-haspopup="menu" onClick={() => setProfileOpen((value) => !value)}>
              <span className="avatar" aria-hidden="true">{initials || 'A'}</span>
              <span className="user-meta">
                <span className="user-email">{session?.email}</span>
                <span className="user-role">{roleLabel}</span>
              </span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>
            {profileOpen && (
              <div className="admin-profile-menu" role="menu">
                <div className="admin-profile-menu-identity">
                  <strong>{avatarName}</strong>
                  <span>{session?.email}</span>
                  <small>{roleLabel}</small>
                </div>
                <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); logout() }}>
                  <LogOut size={16} aria-hidden="true" /> Log out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="admin-main" id="main"><Outlet /></main>
      </div>
    </div>
  )
}
