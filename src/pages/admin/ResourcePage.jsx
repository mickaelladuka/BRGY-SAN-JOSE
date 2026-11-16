import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, ConfirmDialog, EmptyState, Field, Modal, Pagination, SkeletonList } from '../../components/ui'
import { api, getErrorMessage, getFieldErrors, toPage } from '../../lib/api'
import StatusReviewModal from './StatusReviewModal'

const emptyForm = (fields) => Object.fromEntries(fields.map((f) => [f.name, f.default ?? '']))

function FieldInput({ f, value, onChange, id }) {
  const common = { id, value: value ?? '', onChange: (e) => onChange(e.target.value), required: false, maxLength: f.maxLength }
  if (f.type === 'textarea') return <textarea {...common} />
  if (f.type === 'select') return (
    <select {...common}><option value="">Select…</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
  )
  return <input {...common} type={f.type || 'text'} />
}

/**
 * Config-driven list + create/edit + row actions + optional review modal (status history + status update).
 * See modules.js for the per-module configuration.
 */
export default function ResourcePage({ config }) {
  const navigate = useNavigate()
  const { title, endpoint, createEndpoint, updateEndpoint, columns, fields = [], filters = [], searchPlaceholder = 'Search…', allowCreate, allowEdit, rowActions = [], review, header, pageSize = 10, toForm, toPayload, refreshInterval, rowClassName } = config
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [fv, setFv] = useState(() => config.initialFilters ?? (config.initialStatus ? { status: config.initialStatus } : {}))
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [form, setForm] = useState(null) // { mode, id, values }
  const [formErrors, setFormErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [reviewing, setReviewing] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => { const t = setTimeout(() => { setDebouncedQ(q); setPage(1) }, 350); return () => clearTimeout(t) }, [q])

  const params = { page, pageSize, ...(debouncedQ ? { q: debouncedQ } : {}), ...Object.fromEntries(Object.entries(fv).filter(([, v]) => v !== '' && v != null)) }
  const key = JSON.stringify(params)
  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true); setError('')
    api.get(endpoint, { params: JSON.parse(key), signal: ctrl.signal })
      .then((r) => setData(toPage(r.data)))
      .catch((err) => { if (err.code !== 'ERR_CANCELED') setError(getErrorMessage(err)) })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    return () => ctrl.abort()
  }, [endpoint, key, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!refreshInterval) return undefined
    const refreshVisiblePage = () => {
      if (document.visibilityState === 'visible') reload()
    }
    const timer = window.setInterval(refreshVisiblePage, refreshInterval)
    window.addEventListener('focus', refreshVisiblePage)
    document.addEventListener('visibilitychange', refreshVisiblePage)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshVisiblePage)
      document.removeEventListener('visibilitychange', refreshVisiblePage)
    }
  }, [refreshInterval, reload])

  const openForm = (row) => {
    setFormErrors({}); setFormError('')
    setForm(row
      ? { mode: 'edit', id: row.id, values: { ...emptyForm(fields), ...(toForm ? toForm(row) : row) } }
      : { mode: 'create', values: emptyForm(fields) })
  }

  const save = async (ev) => {
    ev.preventDefault()
    const errs = {}
    fields.forEach((f) => { if (f.required && !String(form.values[f.name] ?? '').trim()) errs[f.name] = `${f.label} is required.` })
    setFormErrors(errs); setFormError('')
    if (Object.keys(errs).length) return
    const payload = toPayload ? toPayload(form.values) : Object.fromEntries(fields.map((f) => {
      const v = form.values[f.name]
      return [f.name, v === '' || v == null ? null : typeof v === 'string' ? v.trim() : v]
    }))
    setSaving(true)
    try {
      if (form.mode === 'edit') await api.put(`${(updateEndpoint || endpoint)}/${form.id}`, payload)
      else await api.post(createEndpoint || endpoint, payload)
      setForm(null); setFlash(form.mode === 'edit' ? 'Changes saved.' : 'Record created.'); reload()
    } catch (err) {
      setFormErrors(getFieldErrors(err)); setFormError(getErrorMessage(err))
    } finally { setSaving(false) }
  }

  const runAction = async () => {
    setBusy(true)
    try { await confirm.action.run(confirm.row); setFlash(confirm.action.success || 'Done.'); setConfirm(null); reload() }
    catch (err) { setError(getErrorMessage(err)); setConfirm(null) }
    finally { setBusy(false) }
  }

  const onAction = (action, row) => {
    if (action.onClick) {
      action.onClick(row)
      return
    }
    if (action.navigate) {
      navigate(action.navigate(row))
      return
    }
    if (action.confirm) {
      setConfirm({ action, row })
    } else {
      action.run(row).then(() => { setFlash(action.success || 'Done.'); reload() }).catch((e) => setError(getErrorMessage(e)))
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
        {allowCreate && <button type="button" className="btn btn-primary" onClick={() => openForm(null)}>+ New</button>}
      </div>
      {header}
      <Alert type="success" onClose={() => setFlash('')}>{flash}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="toolbar" role="search">
        <div className="field grow"><label htmlFor="rp-q">Search</label><input id="rp-q" type="search" value={q} placeholder={searchPlaceholder} onChange={(e) => setQ(e.target.value)} /></div>
        {filters.map((f) => (
          <div className="field" key={f.name}>
            <label htmlFor={`flt-${f.name}`}>{f.label}</label>
            {f.options
              ? <select id={`flt-${f.name}`} value={fv[f.name] ?? ''} onChange={(e) => { setFv({ ...fv, [f.name]: e.target.value }); setPage(1) }}><option value="">All</option>{f.options.map((o) => (typeof o === 'string' ? <option key={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}</select>
              : <input id={`flt-${f.name}`} type="date" value={fv[f.name] ?? ''} onChange={(e) => { setFv({ ...fv, [f.name]: e.target.value }); setPage(1) }} />}
          </div>
        ))}
        {(q || Object.values(fv).some(Boolean)) && <button type="button" className="btn btn-outline btn-sm" onClick={() => { setQ(''); setFv({}) }}>Clear</button>}
      </div>

      {loading ? <SkeletonList count={3} lines={3} /> : data.items.length === 0 ? (
        <div className="card"><EmptyState title="No records found">{q || Object.values(fv).some(Boolean) ? 'Try a different search or filter.' : allowCreate ? 'Create the first record with the “New” button.' : 'Nothing to show yet.'}</EmptyState></div>
      ) : (
        <div className="table-wrap">
          <table aria-label={title}>
            <thead><tr>{columns.map((c) => <th key={c.key} scope="col">{c.label}</th>)}{(review || allowEdit || rowActions.length > 0) && <th scope="col">Actions</th>}</tr></thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id} className={rowClassName?.(row) || undefined}>
                  {columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : (row[c.key] ?? '—')}</td>)}
                  {(review || allowEdit || rowActions.length > 0) && (
                    <td className="actions">
                      <div className="row" style={{ gap: '.4rem' }}>
                        {review && <button type="button" className="btn btn-outline btn-sm" onClick={() => setReviewing(row)}>Review</button>}
                        {allowEdit && <button type="button" className="btn btn-outline btn-sm" onClick={() => openForm(row)}>Edit</button>}
                        {rowActions.filter((a) => !a.show || a.show(row)).map((a) => (
                          <button key={a.label} type="button" className={`btn btn-sm ${a.danger ? 'btn-danger' : 'btn-outline'}`} onClick={() => onAction(a, row)}>{a.label}</button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageSize={pageSize} total={data.total} onChange={setPage} />

      {form && (
        <Modal title={`${form.mode === 'edit' ? 'Edit' : 'New'} – ${title}`} wide onClose={() => !saving && setForm(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setForm(null)} disabled={saving}>Cancel</button><button type="submit" form="rp-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
          <form id="rp-form" onSubmit={save} noValidate>
            <Alert>{formError}</Alert>
            <div className="form-grid">
              {fields.map((f) => (
                <div key={f.name} className={f.full ? 'full' : ''}>
                  <Field label={f.label} htmlFor={`f-${f.name}`} error={formErrors[f.name]} required={f.required} hint={f.hint}>
                    <FieldInput id={`f-${f.name}`} f={f} value={form.values[f.name]} onChange={(v) => setForm({ ...form, values: { ...form.values, [f.name]: v } })} />
                  </Field>
                </div>
              ))}
            </div>
          </form>
        </Modal>
      )}
      {confirm && <ConfirmDialog title={confirm.action.label} message={confirm.action.confirm(confirm.row)} confirmLabel={confirm.action.label} danger={confirm.action.danger} busy={busy} onConfirm={runAction} onCancel={() => setConfirm(null)} />}
      {reviewing && <StatusReviewModal endpoint={endpoint} row={reviewing} config={review} onClose={() => setReviewing(null)} onChanged={reload} />}
    </>
  )
}
