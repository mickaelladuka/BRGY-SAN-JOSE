import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { Bell, X } from 'lucide-react'

export default function NotificationBell() {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const rootRef = useRef(null)

  const load = async () => {
    try {
      const { data } = await api.get('/api/notifications/unread-count')
      setCount(data)
    } catch { /* ignore */ }
  }

  const loadItems = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/notifications')
      setItems(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [])

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
                  <button type="button" key={n.id} className={`bell-item${n.isRead ? '' : ' unread'}`} onClick={() => !n.isRead && markRead(n.id)}>
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