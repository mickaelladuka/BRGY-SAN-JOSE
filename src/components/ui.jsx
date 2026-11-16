import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, AlertTriangle, Info, Inbox } from 'lucide-react'
import { fmtDateTime } from '../lib/format'

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function Skeleton({ width = '100%', height = '16px', radius = '8px', style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="skeleton-card" style={{
      background: '#fff', borderRadius: '18px', padding: '20px',
      border: '1px solid #F0E6DC', boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    }}>
      <Skeleton width="60%" height="20px" style={{ marginBottom: '12px' }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '40%' : '100%'} height="12px" style={{ marginBottom: '8px' }} />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 3, lines = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  )
}
export const FullPageSpinner = ({ label }) => (
  <div className="fullpage"><Spinner label={label} /></div>
)

const ALERT_ICON = { error: AlertCircle, success: CheckCircle2, warning: AlertTriangle, info: Info }
export function Alert({ type = 'error', children, onClose }) {
  if (!children) return null
  const Icon = ALERT_ICON[type] ?? Info
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', marginRight: '.25rem' }}><Icon size={16} strokeWidth={1.75} /></span>
      <div style={{ flex: 1 }}>{children}</div>
      {onClose && <button type="button" className="alert-close" onClick={onClose} aria-label="Dismiss">×</button>}
    </div>
  )
}

export function EmptyState({ title, children, icon }) {
  const Icon = icon || Inbox
  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden="true"><Icon size={32} strokeWidth={1.5} /></span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  )
}

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')
export function StatusBadge({ status }) {
  return <span className={`badge badge-${slug(status) || 'neutral'}`}>{status || '—'}</span>
}

export function Field({ label, error, hint, required, children, htmlFor }) {
  const errorId = useId()
  const wrapperRef = useRef(null)
  const [dismissedError, setDismissedError] = useState(null)
  const visibleError = error && dismissedError !== error ? error : ''
  useEffect(() => {
    const form = wrapperRef.current?.closest('form')
    if (!form) return undefined
    const resetForSubmit = () => setDismissedError(null)
    form.addEventListener('submit', resetForSubmit, true)
    return () => form.removeEventListener('submit', resetForSubmit, true)
  }, [error])
  const associateError = (node) => {
    if (!isValidElement(node)) return node
    if (typeof node.type === 'string' && ['input', 'select', 'textarea'].includes(node.type)) {
      const describedBy = [node.props['aria-describedby'], visibleError ? errorId : null].filter(Boolean).join(' ')
      const originalChange = node.props.onChange
      return cloneElement(node, {
        'aria-invalid': visibleError ? 'true' : undefined,
        'aria-describedby': describedBy || undefined,
        onChange: (event) => {
          originalChange?.(event)
          if (!visibleError) return
          const control = event.currentTarget
          const value = control.type === 'checkbox' || control.type === 'radio' ? control.checked : String(control.value || '').trim()
          const minimum = visibleError.toLowerCase().match(/at least\s+(\d+)\s+characters?/)
          const enoughCharacters = !minimum || String(control.value || '').trim().length >= Number(minimum[1])
          const validEmail = !/email|e-mail/.test(visibleError.toLowerCase()) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(control.value || '').trim())
          if (value && enoughCharacters && validEmail && (!control.validity || control.validity.valid)) setDismissedError(error)
        },
      })
    }
    if (node.props.children) return cloneElement(node, {}, Children.map(node.props.children, associateError))
    return node
  }
  return (
    <div ref={wrapperRef} className={`field${visibleError ? ' has-error' : ''}`}>
      <label htmlFor={htmlFor}>{label}{required && <span aria-hidden="true" className="req"> *</span>}</label>
      {Children.map(children, associateError)}
      {hint && !visibleError && <small className="hint">{hint}</small>}
      {visibleError && <small id={errorId} className="error-text" role="alert">{visibleError}</small>}
    </div>
  )
}

export function Modal({ title, subtitle, onClose, children, wide, footer, className = '' }) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  const titleId = useId()
  // Keep the latest onClose without re-running the focus effect on every parent render
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => {
    const prev = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const focusable = ref.current?.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) {
        e.preventDefault()
        ref.current?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prev?.focus?.()
    }
  }, [])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' modal-wide' : ''}${className ? ` ${className}` : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <div className="modal-title-group">
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title = 'Please confirm', message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel} footer={
      <>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </>
    }>
      <p>{message}</p>
    </Modal>
  )
}

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(Math.ceil(total / pageSize), 1)
  if (total <= pageSize) return null
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span>Page {page} of {pages} · {total} records</span>
      <button type="button" className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  )
}

export function StatusTimeline({ history = [] }) {
  if (!history.length) return <p className="muted">No status updates yet.</p>
  const rows = [...history].sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
  return (
    <ol className="timeline">
      {rows.map((h, i) => (
        <li key={h.id ?? i}>
          <div><StatusBadge status={h.status} /> <time className="muted">{fmtDateTime(h.changedAt)}</time></div>
          {h.remarks && <p>{h.remarks}</p>}
        </li>
      ))}
    </ol>
  )
}

export const DetailList = ({ rows }) => (
  <dl className="detail-list">
    {rows.map(([k, v]) => (
      <div key={k}><dt>{k}</dt><dd>{v ?? '—'}</dd></div>
    ))}
  </dl>
)
