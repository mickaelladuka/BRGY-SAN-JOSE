import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive, CalendarDays, FileText, Megaphone, Pencil, Plus, RotateCw, Search, Send, Tag, X,
} from 'lucide-react'
import { Alert, ConfirmDialog, EmptyState, Field, Modal, Pagination, SkeletonList, StatusBadge } from '../../components/ui'
import { api, getErrorMessage, getFieldErrors, toPage } from '../../lib/api'
import { fmtDateTime } from '../../lib/format'

const PAGE_SIZE = 8
const FILTER_CARDS = [
  { key: '', label: 'Total Announcements', icon: FileText, color: 'neutral' },
  { key: 'published', label: 'Published', icon: Send, color: 'published' },
  { key: 'draft', label: 'Drafts', icon: Pencil, color: 'draft' },
  { key: 'archived', label: 'Archived', icon: Archive, color: 'archived' },
]
const EMPTY_FORM = { title: '', category: '', content: '' }

const announcementState = (item) => (
  item.isArchived ? 'Archived' : item.isPublished ? 'Published' : 'Draft'
)

function SummaryCard({ item, count, active, onClick }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      className={`announcement-summary-card announcement-summary-${item.color}${active ? ' is-active' : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="announcement-summary-icon"><Icon size={18} strokeWidth={1.8} /></span>
      <span className="announcement-summary-copy">
        <span>{item.label}</span>
        <strong>{count}</strong>
      </span>
    </button>
  )
}

export default function AnnouncementsPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [state, setState] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [page, setPage] = useState(1)
  const [list, setList] = useState({ items: [], total: 0 })
  const [summary, setSummary] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [summaryError, setSummaryError] = useState('')
  const [error, setError] = useState('')
  const [listError, setListError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [form, setForm] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [action, setAction] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const previewRef = useRef(null)

  const selected = list.items.find((item) => item.id === selectedId) || list.items[0] || null
  const formDirty = Boolean(form && (
    form.values.title !== form.initial.title
    || form.values.category !== form.initial.category
    || form.values.content !== form.initial.content
  ))

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const paramsKey = useMemo(() => JSON.stringify({
    page,
    pageSize: PAGE_SIZE,
    ...(debouncedQuery ? { q: debouncedQuery } : {}),
    ...(state ? { state } : {}),
    ...(category ? { category } : {}),
  }), [page, debouncedQuery, state, category])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setListError('')
    setError('')
    api.get('/api/announcements/manage', { params: JSON.parse(paramsKey), signal: controller.signal })
      .then(({ data }) => {
        const nextList = toPage(data)
        setList(nextList)
        setSelectedId((current) => nextList.items.some((item) => item.id === current)
          ? current
          : nextList.items[0]?.id ?? null)
      })
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setListError(getErrorMessage(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [paramsKey, reloadKey])

  useEffect(() => {
    const controller = new AbortController()
    api.get('/api/announcements/manage/summary', { signal: controller.signal })
      .then(({ data }) => {
        setSummary(data)
        setSummaryError('')
      })
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setSummaryError(getErrorMessage(err))
      })
    return () => controller.abort()
  }, [reloadKey])

  useEffect(() => {
    const controller = new AbortController()
    api.get('/api/announcements/manage/categories', { signal: controller.signal })
      .then(({ data }) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError(getErrorMessage(err))
      })
    return () => controller.abort()
  }, [reloadKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  const requestCloseForm = useCallback(() => {
    if (saving) return
    if (formDirty && !window.confirm('Discard your unsaved announcement changes?')) return
    setForm(null)
    setFormErrors({})
    setFormError('')
  }, [formDirty, saving])

  const openForm = (item = null) => {
    const values = item
      ? { title: item.title || '', category: item.category || '', content: item.content || '' }
      : { ...EMPTY_FORM }
    setForm({
      mode: item ? 'edit' : 'create',
      id: item?.id,
      values,
      initial: { ...values },
    })
    setFormErrors({})
    setFormError('')
  }

  const save = async (event) => {
    event.preventDefault()
    if (!form) return
    const validation = {}
    if (form.values.title.trim().length < 3) validation.title = 'Enter a title with at least 3 characters.'
    if (form.values.content.trim().length < 10) validation.content = 'Enter announcement content with at least 10 characters.'
    if (form.values.title.length > 150) validation.title = 'Title must be 150 characters or fewer.'
    if (form.values.category.length > 50) validation.category = 'Category must be 50 characters or fewer.'
    if (form.values.content.length > 4000) validation.content = 'Content must be 4,000 characters or fewer.'
    setFormErrors(validation)
    setFormError('')
    if (Object.keys(validation).length) return

    setSaving(true)
    try {
      const payload = {
        title: form.values.title.trim(),
        category: form.values.category.trim() || null,
        content: form.values.content.trim(),
      }
      if (form.mode === 'edit') await api.put(`/api/announcements/${form.id}`, payload)
      else await api.post('/api/announcements', payload)
      setNotice(form.mode === 'edit' ? 'Announcement changes saved.' : 'Announcement created as a draft.')
      setForm(null)
      setFormErrors({})
      reload()
    } catch (err) {
      setFormErrors(getFieldErrors(err))
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const performAction = async () => {
    if (!action) return
    setActionBusy(true)
    try {
      await api.post(`/api/announcements/${action.item.id}/${action.type}`)
      setNotice(action.type === 'publish' ? 'Announcement published.' : 'Announcement archived.')
      setAction(null)
      reload()
    } catch (err) {
      setError(getErrorMessage(err))
      setAction(null)
    } finally {
      setActionBusy(false)
    }
  }

  const selectItem = (item) => {
    setSelectedId(item.id)
    if (window.matchMedia?.('(max-width: 760px)').matches) {
      window.setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
    }
  }

  const clearFilters = () => {
    setQuery('')
    setDebouncedQuery('')
    setState('')
    setCategory('')
    setPage(1)
  }
  const filtersActive = Boolean(query || state || category)

  return (
    <main className="announcement-page">
      <header className="announcement-page-head">
        <div>
          <div className="announcement-eyebrow"><Megaphone size={15} /> COMMUNITY COMMUNICATIONS</div>
          <h1>Announcements</h1>
          <p>Manage, publish, and organize important community announcements for Barangay San Jose – Annex Area 6.</p>
        </div>
        <button type="button" className="btn btn-primary announcement-create-button" onClick={() => openForm()}>
          <Plus size={18} /> Create Announcement
        </button>
      </header>

      {notice && <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {summaryError && <Alert type="warning" onClose={() => setSummaryError('')}>Announcement totals could not be loaded: {summaryError}</Alert>}

      <section className="announcement-summary" aria-label="Announcement totals">
        {FILTER_CARDS.map((item) => (
          <SummaryCard
            key={item.key || 'total'}
            item={item}
            count={summary?.[item.key || 'total'] ?? '—'}
            active={item.key ? state === item.key : !state && !category && !debouncedQuery}
            onClick={() => { setState(item.key); setPage(1) }}
          />
        ))}
      </section>

      <section className="announcement-filters" aria-label="Search and filter announcements">
        <div className="announcement-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search announcements"
            placeholder="Search title, content, or category"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <label className="announcement-filter-control">
          <span>Status</span>
          <select value={state} onChange={(event) => { setState(event.target.value); setPage(1) }}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="announcement-filter-control">
          <span>Category</span>
          <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1) }}>
            <option value="">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        {filtersActive && (
          <button type="button" className="btn btn-outline btn-sm announcement-clear-button" onClick={clearFilters}>
            <X size={15} /> Clear filters
          </button>
        )}
      </section>

      {loading ? (
        <SkeletonList count={3} lines={2} />
      ) : listError ? (
        <div className="card announcement-empty-card">
          <div className="announcement-error-state" role="alert">
            <Alert>{listError}</Alert>
            <button type="button" className="btn btn-outline btn-sm" onClick={reload}>
              <RotateCw size={15} /> Try again
            </button>
          </div>
        </div>
      ) : list.items.length === 0 ? (
        <div className="card announcement-empty-card">
          <EmptyState title={filtersActive ? 'No matching announcements' : 'No announcements yet'}>
            {filtersActive ? 'Try another search or clear the selected filters.' : 'Create an announcement to share important updates with the community.'}
          </EmptyState>
        </div>
      ) : (
        <section className="announcement-workspace" aria-label="Announcement workspace">
          <div className="announcement-list-card">
            <div className="announcement-list-head">
              <div><h2>Announcement list</h2><span>{list.total} {list.total === 1 ? 'announcement' : 'announcements'}</span></div>
              <Megaphone size={18} aria-hidden="true" />
            </div>
            <div className="announcement-list">
              {list.items.map((item) => {
                const active = selected?.id === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`announcement-list-item${active ? ' is-selected' : ''}`}
                    aria-pressed={active}
                    onClick={() => selectItem(item)}
                  >
                    <span className="announcement-item-topline">
                      <span className="announcement-item-title">{item.title}</span>
                      <StatusBadge status={announcementState(item)} />
                    </span>
                    <span className="announcement-item-meta">
                      <span><Tag size={13} /> {item.category || 'General'}</span>
                      <span><CalendarDays size={13} /> {fmtDateTime(item.publishedAt || item.createdAt)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <article className="announcement-preview-card" aria-label="Announcement details preview" ref={previewRef}>
            {selected ? (
              <>
                <div className="announcement-preview-top">
                  <div className="announcement-preview-label"><span /> ANNOUNCEMENT PREVIEW</div>
                  <StatusBadge status={announcementState(selected)} />
                </div>
                <h2 className="announcement-preview-title">{selected.title}</h2>
                <div className="announcement-preview-meta">
                  {selected.category && <span className="announcement-category"><Tag size={14} /> {selected.category}</span>}
                  <span><CalendarDays size={14} /> {selected.isPublished && selected.publishedAt ? 'Published' : 'Created'} {fmtDateTime(selected.publishedAt || selected.createdAt)}</span>
                </div>
                <div className="announcement-preview-content">{selected.content || 'No announcement content.'}</div>
                <div className="announcement-preview-actions">
                  {!selected.isArchived && (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => openForm(selected)}>
                      <Pencil size={15} /> Edit
                    </button>
                  )}
                  {!selected.isPublished && !selected.isArchived && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setAction({ type: 'publish', item: selected })}>
                      <Send size={15} /> Publish
                    </button>
                  )}
                  {!selected.isArchived && (
                    <button type="button" className="btn btn-outline btn-sm announcement-archive-action" onClick={() => setAction({ type: 'archive', item: selected })}>
                      <Archive size={15} /> Archive
                    </button>
                  )}
                </div>
              </>
            ) : <EmptyState title="Select an announcement">Select an item from the list to see its preview.</EmptyState>}
          </article>
        </section>
      )}

      {!loading && list.items.length > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={list.total} onChange={setPage} />
      )}

      {form && (
        <Modal
          title={form.mode === 'edit' ? 'Edit Announcement' : 'Create Announcement'}
          subtitle="Share important updates and information with the Area 6 community."
          className="announcement-form-modal"
          wide
          onClose={requestCloseForm}
          footer={(
            <div className="announcement-modal-footer">
              <button type="button" className="btn btn-outline" onClick={requestCloseForm} disabled={saving}>Cancel</button>
              <button type="submit" form="announcement-form" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : form.mode === 'edit' ? 'Save Changes' : 'Save Announcement'}
              </button>
            </div>
          )}
        >
          <form id="announcement-form" onSubmit={save} noValidate>
            {formError && <Alert>{formError}</Alert>}
            <div className="announcement-form-intro">
              <span><Megaphone size={17} /></span>
              <div><strong>Announcement details</strong><small>Fields marked with * are required.</small></div>
            </div>
            <Field label="Announcement Title" htmlFor="announcement-title" required error={formErrors.title}>
              <input
                id="announcement-title"
                value={form.values.title}
                onChange={(event) => setForm((current) => ({ ...current, values: { ...current.values, title: event.target.value } }))}
                placeholder="Enter a clear and descriptive announcement title"
                maxLength={150}
              />
              <small className="announcement-character-count">{form.values.title.length}/150</small>
            </Field>
            <Field label="Category" htmlFor="announcement-category" error={formErrors.category} hint="Optional. Choose an existing category or enter a new one.">
              <input
                id="announcement-category"
                list="announcement-category-options"
                value={form.values.category}
                onChange={(event) => setForm((current) => ({ ...current, values: { ...current.values, category: event.target.value } }))}
                placeholder="e.g. Community Update"
                maxLength={50}
              />
              <datalist id="announcement-category-options">
                {categories.map((item) => <option key={item} value={item} />)}
              </datalist>
              <small className="announcement-character-count">{form.values.category.length}/50</small>
            </Field>
            <Field label="Announcement Content" htmlFor="announcement-content" required error={formErrors.content}>
              <textarea
                id="announcement-content"
                value={form.values.content}
                onChange={(event) => setForm((current) => ({ ...current, values: { ...current.values, content: event.target.value } }))}
                placeholder="Write the announcement details here..."
                maxLength={4000}
                rows={9}
                className="announcement-content-input"
              />
              <small className="announcement-character-count">{form.values.content.length}/4,000</small>
            </Field>
            <div className="announcement-publication-note">
              <FileText size={16} />
              <span>New announcements are saved as drafts. Publish them from the preview when they are ready.</span>
            </div>
          </form>
        </Modal>
      )}

      {action && (
        <ConfirmDialog
          title={action.type === 'publish' ? 'Publish announcement?' : 'Archive announcement?'}
          message={action.type === 'publish'
            ? `“${action.item.title}” will become visible to residents.`
            : `“${action.item.title}” will be archived and no longer shown to residents.`}
          confirmLabel={action.type === 'publish' ? 'Publish' : 'Archive'}
          danger={action.type === 'archive'}
          busy={actionBusy}
          onConfirm={performAction}
          onCancel={() => !actionBusy && setAction(null)}
        />
      )}
    </main>
  )
}
