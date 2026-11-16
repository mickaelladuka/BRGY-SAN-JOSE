import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { getErrorMessage, getFieldErrors, setApiErrorNotifier, setApiSuccessNotifier } from '../lib/api'

const NotificationContext = createContext(null)
const durations = { success: 4000, info: 5000, warning: 8000, error: 0, validation: 0 }
const icons = { success: CheckCircle2, info: Info, warning: AlertTriangle, error: AlertCircle, validation: AlertTriangle }

function fieldLabel(control) {
  const id = control.id
  const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null
  return label?.textContent?.replace('*', '').trim() || control.getAttribute('aria-label') || control.name || 'This field'
}

function collectNativeErrors(form) {
  return Array.from(form?.elements || []).filter((el) => el.willValidate && !el.validity.valid).map((el) => ({
    message: `${fieldLabel(el)}: ${el.validationMessage || 'Please check this field.'}`,
    field: el,
  }))
}

function collectRenderedErrors(form) {
  if (!form) return []
  const controls = Array.from(form.querySelectorAll('[aria-invalid="true"]'))
  const fields = Array.from(form.querySelectorAll('.field.has-error'))
  const found = new Map()
  for (const control of controls) {
    const text = control.getAttribute('data-error') || control.closest('.field')?.querySelector('.error-text')?.textContent
    found.set(control, { field: control, message: `${fieldLabel(control)}: ${text || 'Please check this field.'}` })
  }
  for (const wrapper of fields) {
    const control = wrapper.querySelector('input,select,textarea,button,[tabindex]')
    const text = wrapper.querySelector('.error-text')?.textContent?.trim()
    if (control) {
      const normalized = (text || '').toLowerCase()
      const value = control.type === 'checkbox' || control.type === 'radio' ? control.checked : String(control.value || '').trim()
      const minimum = normalized.match(/at least\s+(\d+)\s+characters?/)
      const hasLengthIssue = minimum && String(control.value || '').trim().length < Number(minimum[1])
      const isRequiredIssue = /required|choose|select|enter/.test(normalized) && !value
      const unresolved = control.getAttribute('aria-invalid') === 'true' || (control.validity && !control.validity.valid) || hasLengthIssue || isRequiredIssue || !value
      if (unresolved) found.set(control, { field: control, message: `${fieldLabel(control)}: ${text || 'Please check this field.'}` })
    }
    else found.set(wrapper, { field: wrapper, message: text || 'Please review this section.' })
  }
  return [...found.values()]
}

export function GlobalNotificationsProvider({ children }) {
  const [items, setItems] = useState([])
  const timers = useRef(new Map())
  const recent = useRef(new Map())
  const validationRef = useRef(null)
  const latestItems = useRef(items)
  useEffect(() => { latestItems.current = items }, [items])

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    for (const [key, value] of recent.current) if (value === id) recent.current.delete(key)
    setItems((current) => current.filter((item) => item.id !== id))
    if (validationRef.current?.id === id) validationRef.current = null
  }, [])

  const notify = useCallback((type, message, options = {}) => {
    if (!message) return null
    const text = String(message)
    const persistent = options.persistent ?? (type === 'error' || type === 'validation')
    const existing = latestItems.current.find((item) => item.message === text)
    if (existing) return existing.id
    const fingerprint = text
    const recentId = recent.current.get(fingerprint)
    if (recentId) return recentId
    const id = options.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    recent.current.set(fingerprint, id)
    const item = { id, type, message: text, errors: options.errors || [], onReview: options.onReview, persistent }
    setItems((current) => [...current.slice(-3), item])
    const duration = options.duration ?? (persistent ? 0 : durations[type] ?? durations.info)
    if (duration > 0) timers.current.set(id, setTimeout(() => dismiss(id), duration))
    return id
  }, [dismiss])

  const showValidationErrors = useCallback((errors, options = {}) => {
    const normalized = (Array.isArray(errors) ? errors : Object.entries(errors || {}).flatMap(([field, value]) => [].concat(value).map((message) => ({ field, message: String(message) }))))
      .filter(Boolean).map((error) => typeof error === 'string' ? { message: error } : error)
    if (!normalized.length) return null
    const existing = validationRef.current
    const id = existing?.id || `validation-${Date.now()}`
    const message = `${normalized.length} ${normalized.length === 1 ? 'item needs' : 'items need'} your attention. Review the highlighted fields.`
    validationRef.current = { id, form: options.form || existing?.form || null, errors: normalized }
    setItems((current) => {
      const rest = current.filter((item) => item.id !== id && item.type !== 'validation')
      return [...rest, { id, type: 'validation', message, errors: normalized, persistent: true, onReview: options.onReview }]
    })
    return id
  }, [])

  const reviewError = useCallback((error) => {
    const field = error.field
    if (typeof field === 'string') {
      const form = validationRef.current?.form
      const control = form?.elements?.namedItem(field) || document.getElementById(field) || document.querySelector(`[name="${CSS.escape(field)}"]`)
      if (control) {
        control.scrollIntoView({ behavior: 'smooth', block: 'center' })
        control.focus?.({ preventScroll: true })
      }
      return
    }
    if (field?.scrollIntoView) {
      field.scrollIntoView({ behavior: 'smooth', block: 'center' })
      field.focus?.({ preventScroll: true })
    }
  }, [])

  const showApiError = useCallback((err) => {
    const status = err?.response?.status
    if (err?.code === 'ERR_CANCELED') return
    if (status === 401) {
      if (err.config?.headers?.Authorization) notify('info', 'Your session expired. Please sign in again.')
      return
    }
    const fieldErrors = getFieldErrors(err)
    if (Object.keys(fieldErrors).length) {
      showValidationErrors(Object.entries(fieldErrors).flatMap(([field, value]) => [].concat(value).map((message) => ({ field, message }))))
      return
    }
    let message = status === 400
      ? getErrorMessage(err, 'The request could not be completed. Check the information and try again.')
      : status === 409
        ? getErrorMessage(err, 'This conflicts with an existing record.')
        : getErrorMessage(err)
    if (/exception|stack trace|mysql|sql syntax|database error|invalidoperationexception|\bat\s+\w+\./i.test(message)) {
      message = status >= 500 ? 'The server ran into a problem. Please try again later.' : 'The request could not be completed. Please review the information and try again.'
    }
    notify(status === 400 ? 'warning' : 'error', message, { persistent: status === 400 })
  }, [notify, showValidationErrors])

  const showApiSuccess = useCallback((message) => notify('success', message), [notify])

  useEffect(() => {
    setApiErrorNotifier(showApiError)
    setApiSuccessNotifier(showApiSuccess)
    return () => {
      setApiErrorNotifier(null)
      setApiSuccessNotifier(null)
    }
  }, [showApiError, showApiSuccess])

  useEffect(() => {
    const onInvalid = (event) => {
      const form = event.target?.form
      if (!form) return
      requestAnimationFrame(() => {
        const errors = collectNativeErrors(form)
        if (errors.length) showValidationErrors(errors, { form })
      })
    }
    const inspectSubmission = (event) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement)) return
      setTimeout(() => {
        const errors = [...collectNativeErrors(form), ...collectRenderedErrors(form)]
        const unique = [...new Map(errors.map((error) => [error.field, error])).values()]
        if (unique.length) showValidationErrors(unique, { form })
        else {
          const alertScope = form.closest('[role="dialog"]') || form.parentElement
          const inlineAlert = alertScope?.querySelector('.alert-error')
          const message = inlineAlert?.textContent?.replace(/^[×✕]\s*/, '').trim()
          if (message) {
            const emptyFields = Array.from(form.elements).filter((control) =>
              control.matches?.('input:not([type="hidden"]),select,textarea') &&
              !String(control.value || '').trim() && control.type !== 'checkbox' && control.type !== 'radio'
            )
            if (emptyFields.length && /required|enter|complete|missing/i.test(message)) {
              showValidationErrors(emptyFields.map((field) => ({ field, message: `${fieldLabel(field)} is required.` })), { form })
            } else notify('error', message)
          }
        }
      }, 60)
    }
    const refresh = () => setTimeout(() => {
      const active = validationRef.current
      if (!active?.form) return
      const errors = [...collectNativeErrors(active.form), ...collectRenderedErrors(active.form)]
      const unique = [...new Map(errors.map((error) => [error.field, error])).values()]
      if (unique.length) showValidationErrors(unique, { form: active.form })
      else dismiss(active.id)
    }, 0)
    document.addEventListener('invalid', onInvalid, true)
    document.addEventListener('submit', inspectSubmission)
    document.addEventListener('input', refresh)
    document.addEventListener('change', refresh)
    return () => {
      document.removeEventListener('invalid', onInvalid, true)
      document.removeEventListener('submit', inspectSubmission)
      document.removeEventListener('input', refresh)
      document.removeEventListener('change', refresh)
    }
  }, [dismiss, notify, showValidationErrors])

  useEffect(() => {
    const onRuntimeError = () => notify('error', 'An unexpected application error occurred. Please try again.')
    const onUnhandledRejection = () => notify('error', 'An unexpected operation failed. Please try again.')
    window.addEventListener('error', onRuntimeError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    return () => {
      window.removeEventListener('error', onRuntimeError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [notify])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const value = useMemo(() => ({
    notify,
    success: (message, options) => notify('success', message, options),
    error: (message, options) => notify('error', message, options),
    warning: (message, options) => notify('warning', message, options),
    info: (message, options) => notify('info', message, options),
    showValidationErrors,
    dismiss,
    clear: () => {
      timers.current.forEach(clearTimeout)
      timers.current.clear()
      recent.current.clear()
      validationRef.current = null
      setItems([])
    },
  }), [dismiss, notify, showValidationErrors])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="global-notifications" aria-label="System notifications">
        {items.map((item) => {
          const Icon = icons[item.type] || Info
          const urgent = item.type === 'error' || item.type === 'validation'
          return (
            <section key={item.id} className={`global-toast global-toast-${item.type}`} role={urgent ? 'alert' : 'status'} aria-live={urgent ? 'assertive' : 'polite'}>
              <Icon className="global-toast-icon" size={20} aria-hidden="true" />
              <div className="global-toast-content">
                <strong>{item.type === 'validation' ? 'Please review your form' : item.type[0].toUpperCase() + item.type.slice(1)}</strong>
                <p>{item.message}</p>
                {item.errors?.length > 0 && <ul className="global-toast-errors">
                  {item.errors.slice(0, 5).map((error, index) => <li key={`${item.id}-${index}`}>
                    <button type="button" onClick={() => { item.onReview?.(error); reviewError(error) }}>{error.message}</button>
                  </li>)}
                  {item.errors.length > 5 && <li>And {item.errors.length - 5} more…</li>}
                </ul>}
                {item.type === 'validation' && item.errors?.length > 0 && <button type="button" className="global-toast-review" onClick={() => reviewError(item.errors[0])}>Review Errors</button>}
              </div>
              <button type="button" className="global-toast-close" aria-label="Dismiss notification" onClick={() => dismiss(item.id)}><X size={18} /></button>
            </section>
          )
        })}
      </div>
    </NotificationContext.Provider>
  )
}

export function useGlobalNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useGlobalNotifications must be used within GlobalNotificationsProvider')
  return context
}
