import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Bell, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function NotificationBell() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const rootRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/notifications/unread-count')
      setCount(data)
    } catch { /* ignore */ }
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/notifications')
      setItems(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const refreshVisiblePage = () => {
      if (document.visibilityState === 'visible') load()
    }
    const timer = setInterval(refreshVisiblePage, 15000)
    window.addEventListener('focus', refreshVisiblePage)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refreshVisiblePage)
    }
  }, [load])

  useEffect(() => {
    if (!open) return undefined
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        load()
        loadItems()
      }
    }, 15000)
    return () => clearInterval(timer)
  }, [open, load, loadItems])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open])

  const toggle = () => {
    if (!open) loadItems()
    setOpen(!open)
  }

  const markRead = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/read`)
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
      setCount((c) => Math.max(0, c - 1))
    } catch { /* ignore */ }
  }

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/read-all')
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setCount(0)
    } catch { /* ignore */ }
  }

  const openNotification = async (notification) => {
    if (!notification.isRead) await markRead(notification.id)
    setOpen(false)
    const applicationMatch = notification.relatedRecord?.match(/^resident-application:(\d+)$/)
    if (applicationMatch) navigate(`/admin/applications/${applicationMatch[1]}`)
    else if (role === 'Resident' && notification.relatedRecord?.startsWith('RPT-')) navigate('/resident/complaints?tab=reports')
    else if (role === 'Resident' && notification.relatedRecord?.startsWith('CMP-')) navigate('/resident/complaints')
    else if (role === 'Resident' && notification.relatedRecord === 'ComplaintAppointment') navigate('/resident/complaints/schedules')
  }

  return (
    <div className="bell" ref={rootRef}>
      <button
        type="button"
        className="btn btn-outline btn-sm bell-btn"
        onClick={toggle}
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={18} strokeWidth={1.75} />{count > 0 && <span className="bell-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
      </button>
      {open && (
        <div className="bell-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="bell-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="bell-modal-head">
              <div>
                <strong>Notifications</strong>
                {count > 0 && <span className="bell-modal-sub">{count} unread</span>}
              </div>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close"><X size={20} strokeWidth={1.75} /></button>
            </div>
            <div className="bell-modal-body">
              {loading ? <div className="bell-empty">Loading…</div>
                : items.length === 0 ? <div className="bell-empty">No notifications</div>
                : items.map((n) => (
                  <button type="button" key={n.id} className={`bell-item${n.isRead ? '' : ' unread'}`} onClick={() => openNotification(n)}>
                    <div className="bell-title">{n.title}</div>
                    <div className="bell-msg">{n.message}</div>
                    {n.relatedRecord && <div className="bell-meta">{n.relatedRecord}</div>}
                    <div className="bell-meta">{new Date(n.createdAt).toLocaleString()}</div>
                  </button>
                ))}
            </div>
            {count > 0 && (
              <div className="bell-modal-foot">
                <button type="button" className="btn btn-primary btn-sm btn-block" onClick={markAllRead}>Mark all as read</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
