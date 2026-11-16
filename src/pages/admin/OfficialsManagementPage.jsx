import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, Eye, Mail, Phone, Pencil, Plus, Search, UserCheck, Users, UserX, X } from 'lucide-react'
import { Alert, EmptyState, Field, Modal, SkeletonList, StatusBadge } from '../../components/ui'
import { api, getErrorMessage } from '../../lib/api'
import { fmtDateTime } from '../../lib/format'

const emptyOfficial = {
  fullName: '',
  position: '',
  contactNumber: '',
  email: '',
  photoUrl: '',
  displayOrder: '0',
  isActive: 'true',
}

const editableFields = [
  { name: 'fullName', label: 'Full name', required: true, maxLength: 150 },
  { name: 'position', label: 'Position', required: true, maxLength: 100 },
  { name: 'contactNumber', label: 'Contact number', type: 'tel', maxLength: 30 },
  { name: 'email', label: 'Email', type: 'email', maxLength: 256 },
  { name: 'photoUrl', label: 'Photo URL', maxLength: 500, full: true },
  { name: 'displayOrder', label: 'Display order', type: 'number', min: 0 },
]

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'BO'
}

function OfficialAvatar({ official, large = false }) {
  const [imageFailed, setImageFailed] = useState(false)
  const imageUrl = official.photoUrl
    ? (official.photoUrl.startsWith('http')
      ? official.photoUrl
      : `${api.defaults.baseURL}${official.photoUrl.startsWith('/') ? '' : '/'}${official.photoUrl}`)
    : ''

  return (
    <span className={`official-avatar${large ? ' large' : ''}`} aria-hidden="true">
      {imageUrl && !imageFailed
        ? <img src={imageUrl} alt="" onError={() => setImageFailed(true)} />
        : initials(official.fullName)}
    </span>
  )
}

function OfficialForm({ form, onChange, onSubmit, onCancel, saving, error }) {
  return (
    <Modal
      title={form.mode === 'create' ? 'Add New Official' : 'Edit Official'}
      wide
      onClose={onCancel}
      footer={(
        <>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" form="official-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : form.mode === 'create' ? 'Add Official' : 'Save Changes'}
          </button>
        </>
      )}
    >
      <Alert>{error}</Alert>
      <form id="official-form" onSubmit={onSubmit}>
        <div className="official-form-grid">
          {editableFields.map((field) => (
            <div className={field.full ? 'full' : ''} key={field.name}>
              <Field label={field.label} htmlFor={`official-${field.name}`} required={field.required}>
                <input
                  id={`official-${field.name}`}
                  name={field.name}
                  type={field.type || 'text'}
                  min={field.min}
                  maxLength={field.maxLength}
                  required={field.required}
                  value={form.values[field.name] ?? ''}
                  onChange={(event) => onChange(field.name, event.target.value)}
                />
              </Field>
            </div>
          ))}
          <Field label="Status" htmlFor="official-isActive">
            <select id="official-isActive" value={form.values.isActive} onChange={(event) => onChange('isActive', event.target.value)}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </Field>
        </div>
      </form>
    </Modal>
  )
}

function OfficialDetails({ official, onClose, onEdit }) {
  return (
    <Modal title="Official Details" onClose={onClose}>
      <div className="official-detail-heading">
        <OfficialAvatar official={official} large />
        <div><h3>{official.fullName}</h3><p>{official.position}</p><StatusBadge status={official.isActive ? 'Active' : 'Inactive'} /></div>
      </div>
      <dl className="official-detail-list">
        <div><dt>Contact number</dt><dd>{official.contactNumber || '—'}</dd></div>
        <div><dt>Email</dt><dd>{official.email || '—'}</dd></div>
        <div><dt>Display order</dt><dd>{official.displayOrder}</dd></div>
        <div><dt>Created</dt><dd>{fmtDateTime(official.createdAt)}</dd></div>
        <div><dt>Last updated</dt><dd>{fmtDateTime(official.updatedAt)}</dd></div>
      </dl>
      <div className="official-detail-actions">
        <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
        <button type="button" className="btn btn-primary" onClick={onEdit}>Edit Official</button>
      </div>
    </Modal>
  )
}

export default function OfficialsManagementPage() {
  const [officials, setOfficials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [form, setForm] = useState(null)
  const [details, setDetails] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api.get('/api/officials/all', { signal: controller.signal })
      .then(({ data }) => {
        setOfficials(Array.isArray(data) ? data : [])
        setError('')
      })
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const positions = useMemo(
    () => [...new Set(officials.map((official) => official.position).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [officials],
  )
  const filteredOfficials = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    return officials.filter((official) => {
      if (statusFilter && String(official.isActive) !== statusFilter) return false
      if (positionFilter && official.position !== positionFilter) return false
      if (!term) return true
      return [official.fullName, official.position, official.contactNumber, official.email]
        .some((value) => value?.toLocaleLowerCase().includes(term))
    })
  }, [officials, search, statusFilter, positionFilter])

  const activeCount = officials.filter((official) => official.isActive).length
  const inactiveCount = officials.length - activeCount

  const startCreate = () => {
    setError('')
    setForm({ mode: 'create', values: { ...emptyOfficial } })
  }
  const startEdit = (official) => {
    setDetails(null)
    setError('')
    setForm({
      mode: 'edit',
      id: official.id,
      values: {
        fullName: official.fullName ?? '',
        position: official.position ?? '',
        contactNumber: official.contactNumber ?? '',
        email: official.email ?? '',
        photoUrl: official.photoUrl ?? '',
        displayOrder: String(official.displayOrder ?? 0),
        isActive: String(official.isActive),
      },
    })
  }

  const saveOfficial = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const payload = {
      fullName: form.values.fullName.trim(),
      position: form.values.position.trim(),
      contactNumber: form.values.contactNumber.trim() || null,
      email: form.values.email.trim() || null,
      photoUrl: form.values.photoUrl.trim() || null,
      displayOrder: Number(form.values.displayOrder) || 0,
      isActive: form.values.isActive === 'true',
    }
    try {
      if (form.mode === 'edit') await api.put(`/api/officials/${form.id}`, payload)
      else await api.post('/api/officials', payload)
      const { data } = await api.get('/api/officials/all')
      setOfficials(data)
      setForm(null)
      setNotice(form.mode === 'edit' ? 'Official details updated.' : 'Official added successfully.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const archiveOfficial = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const official = archiveTarget
      await api.put(`/api/officials/${official.id}`, {
        fullName: official.fullName,
        position: official.position,
        contactNumber: official.contactNumber || null,
        email: official.email || null,
        photoUrl: official.photoUrl || null,
        displayOrder: official.displayOrder,
        isActive: false,
      })
      const { data } = await api.get('/api/officials/all')
      setOfficials(data)
      setArchiveTarget(null)
      setNotice(`${official.fullName} was set to inactive. Their record was kept.`)
    } catch (err) {
      setError(getErrorMessage(err))
      setArchiveTarget(null)
    } finally {
      setSaving(false)
    }
  }

  const updateForm = (name, value) => setForm((current) => ({ ...current, values: { ...current.values, [name]: value } }))

  return (
    <div className="officials-page">
      <div className="officials-breadcrumb" aria-label="Breadcrumb">
        <Link to="/admin">Dashboard</Link><span aria-hidden="true">/</span><span>Officials</span>
      </div>
      <header className="officials-page-header">
        <div>
          <span className="officials-eyebrow">Department Management</span>
          <h1>Barangay Officials</h1>
          <p>Manage official profiles, roles, and active status.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={startCreate}><Plus size={17} /> Add New Official</button>
      </header>

      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <section className="officials-metrics" aria-label="Officials summary">
        <article className="officials-metric">
          <span className="officials-metric-icon total"><Users size={19} /></span>
          <span className="officials-metric-label">Total Officials</span>
          <strong>{loading ? '—' : officials.length}</strong>
          <small>All listed personnel</small>
        </article>
        <article className="officials-metric">
          <span className="officials-metric-icon active"><UserCheck size={19} /></span>
          <span className="officials-metric-label">Active Personnel</span>
          <strong>{loading ? '—' : activeCount}</strong>
          <small>Currently active</small>
        </article>
        <article className="officials-metric">
          <span className="officials-metric-icon inactive"><UserX size={19} /></span>
          <span className="officials-metric-label">Inactive Personnel</span>
          <strong>{loading ? '—' : inactiveCount}</strong>
          <small>Archived or inactive records</small>
        </article>
      </section>

      <section className="officials-list-card">
        <div className="officials-list-heading">
          <div><h2>Officials Directory</h2><p>{filteredOfficials.length} {filteredOfficials.length === 1 ? 'official' : 'officials'}</p></div>
        </div>
        <div className="officials-toolbar" role="search">
          <label className="officials-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search officials</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, position, or contact..." type="search" />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')}><X size={16} /></button>}
          </label>
          <label className="officials-filter">
            <span className="sr-only">Filter by status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option>
            </select>
          </label>
          <label className="officials-filter">
            <span className="sr-only">Filter by position</span>
            <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)}>
              <option value="">All positions</option>
              {positions.map((position) => <option key={position} value={position}>{position}</option>)}
            </select>
          </label>
        </div>

        {loading ? <SkeletonList count={2} lines={3} /> : filteredOfficials.length === 0 ? (
          <EmptyState title={officials.length ? 'No officials match these filters' : 'No officials added yet'}>
            {officials.length ? 'Adjust your search or filters to view the directory.' : 'Add an official to start building the directory.'}
          </EmptyState>
        ) : (
          <div className="officials-table-wrap">
            <table className="officials-table">
              <thead><tr><th scope="col">Official</th><th scope="col">Contact</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
              <tbody>
                {filteredOfficials.map((official) => (
                  <tr key={official.id}>
                    <td>
                      <div className="officials-name-cell">
                        <OfficialAvatar official={official} />
                        <div><strong>{official.fullName}</strong><span>{official.position}</span></div>
                      </div>
                    </td>
                    <td>
                      <div className="officials-contact">
                        {official.contactNumber && <span><Phone size={14} />{official.contactNumber}</span>}
                        {official.email && <span><Mail size={14} />{official.email}</span>}
                        {!official.contactNumber && !official.email && <span className="officials-no-contact">No contact details</span>}
                      </div>
                    </td>
                    <td><StatusBadge status={official.isActive ? 'Active' : 'Inactive'} /></td>
                    <td>
                      <div className="officials-actions">
                        <button type="button" className="officials-icon-action" title="View details" aria-label={`View details for ${official.fullName}`} onClick={() => setDetails(official)}><Eye size={17} /></button>
                        <button type="button" className="officials-icon-action" title="Edit official" aria-label={`Edit ${official.fullName}`} onClick={() => startEdit(official)}><Pencil size={17} /></button>
                        {official.isActive && <button type="button" className="officials-icon-action archive" title="Set inactive" aria-label={`Set ${official.fullName} inactive`} onClick={() => setArchiveTarget(official)}><Archive size={17} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {form && <OfficialForm form={form} onChange={updateForm} onSubmit={saveOfficial} onCancel={() => !saving && setForm(null)} saving={saving} error={error} />}
      {details && <OfficialDetails official={details} onClose={() => setDetails(null)} onEdit={() => startEdit(details)} />}
      {archiveTarget && (
        <Modal title="Set official inactive?" onClose={() => !saving && setArchiveTarget(null)} footer={(
          <>
            <button type="button" className="btn btn-outline" onClick={() => setArchiveTarget(null)} disabled={saving}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={archiveOfficial} disabled={saving}>{saving ? 'Saving…' : 'Set inactive'}</button>
          </>
        )}>
          <p><strong>{archiveTarget.fullName}</strong> will be marked inactive. Their profile will remain available in the directory.</p>
        </Modal>
      )}
    </div>
  )
}
