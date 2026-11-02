import { useState } from 'react'
import { Alert, EmptyState, SkeletonList } from '../../components/ui'
import { api, toPage } from '../../lib/api'
import { fmtDateTime, COMPLAINT_STATUSES } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'
import LocationPicker from '../../components/LocationPicker'
import StatusReviewModal from './StatusReviewModal'
import { MapPin, X } from 'lucide-react'

export default function ComplaintsView() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [reviewing, setReviewing] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)
  if (search) params.set('q', search)
  params.set('_r', reloadKey)
  const complaints = useFetch(`/api/complaints?${params.toString()}`, { page, pageSize: 10 })

  const openDetail = async (c) => {
    setSelected(c)
    setDetailLoading(true)
    try {
      const { data } = await api.get(`/api/complaints/${c.id}`)
      setDetail(data)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const items = toPage(complaints.data).items

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', minHeight: 'calc(100vh - 120px)' }}>
      {/* LEFT: Map + Detail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Map */}
        <div className="card" style={{ flex: 1, minHeight: '300px', padding: 0, overflow: 'hidden' }}>
          <div className="card-head" style={{ padding: '.75rem 1rem', margin: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Complaint Location</h2>
            {detail?.location && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowMap(true)}>
                <MapPin size={14} strokeWidth={1.75} /> View on map
              </button>
            )}
          </div>
          <div style={{ height: '250px', background: 'var(--cream)', display: 'grid', placeItems: 'center', color: 'var(--muted-c)' }}>
            {detail?.location ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <MapPin size={32} strokeWidth={1.5} style={{ color: 'var(--primary)', marginBottom: '.5rem' }} />
                <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>{detail.location}</div>
                <div className="muted" style={{ fontSize: '.8rem' }}>Click "View on map" to see on interactive map</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <MapPin size={32} strokeWidth={1.5} style={{ color: 'var(--muted-c)', marginBottom: '.5rem' }} />
                <div>Select a complaint to view location</div>
              </div>
            )}
          </div>
        </div>

        {/* Detail Slip */}
        {selected && (
          <div className="card" style={{ flex: 1 }}>
            <div className="card-head">
              <h2 style={{ margin: 0, fontSize: '1rem' }}>Complaint Details</h2>
              <button type="button" className="icon-btn" onClick={() => { setSelected(null); setDetail(null) }}><X size={18} strokeWidth={1.75} /></button>
            </div>
            {detailLoading ? <SkeletonList count={1} lines={6} /> : !detail ? <Alert>Could not load details.</Alert> : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem 1rem', marginBottom: '1rem' }}>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Reference</span><div style={{ fontWeight: 600 }}>{detail.referenceNumber}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Category</span><div>{detail.category}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Status</span><div>{detail.status}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Priority</span><div style={{ color: detail.priority === 'Critical' ? '#B42318' : detail.priority === 'High' ? '#EA580C' : '#A85D08', fontWeight: 600 }}>{detail.priority}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Submitted</span><div>{fmtDateTime(detail.submittedAt)}</div></div>
                  <div><span className="muted" style={{ fontSize: '.75rem' }}>Location</span><div>{detail.location || '—'}</div></div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <span className="muted" style={{ fontSize: '.75rem' }}>Subject</span>
                  <div style={{ fontWeight: 600 }}>{detail.subject}</div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <span className="muted" style={{ fontSize: '.75rem' }}>Description</span>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{detail.description}</div>
                </div>
                {detail.residentName && <div style={{ marginBottom: '1rem' }}><span className="muted" style={{ fontSize: '.75rem' }}>Resident</span><div>{detail.residentName}</div></div>}
                <div style={{ marginTop: '1rem' }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setReviewing(detail)}>Review / Update Status</button>
                </div>
                {detail.history && detail.history.length > 0 && (
                  <div>
                    <span className="muted" style={{ fontSize: '.75rem' }}>Status History</span>
                    <div style={{ marginTop: '.5rem' }}>
                      {detail.history.map((h, i) => (
                        <div key={i} style={{ padding: '.5rem', borderLeft: '2px solid var(--primary-surface)', marginBottom: '.5rem', paddingLeft: '.75rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{h.status}</div>
                          <div className="muted" style={{ fontSize: '.75rem' }}>{fmtDateTime(h.changedAt)}</div>
                          {h.remarks && <div style={{ fontSize: '.8rem', marginTop: '.25rem' }}>{h.remarks}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Complaints List */}
      <div className="card" style={{ overflow: 'auto' }}>
        <div className="card-head">
          <h2 style={{ margin: 0 }}>Complaints</h2>
          <span className="muted" style={{ fontSize: '.8rem' }}>{toPage(complaints.data).total} records</span>
        </div>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.75rem', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search complaints..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            style={{ flex: 1, minWidth: '150px', padding: '.5rem .75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', fontSize: '.85rem' }}
          />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} style={{ padding: '.5rem .75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', fontSize: '.85rem' }}>
            <option value="">All statuses</option>
            {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {complaints.loading ? <SkeletonList count={3} lines={3} /> : complaints.error ? <Alert>{complaints.error}</Alert> : items.length === 0
          ? <EmptyState title="No complaints found" />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
              {items.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openDetail(c)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', background: selected?.id === c.id ? 'var(--primary-surface)' : '#fff',
                    border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '.75rem 1rem',
                    cursor: 'pointer', transition: 'all .15s', marginBottom: '.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
                    <strong style={{ fontSize: '.9rem' }}>{c.subject}</strong>
                    <span className="badge" style={{ background: c.priority === 'Critical' ? '#FEE2E2' : c.priority === 'High' ? '#FFEDD5' : c.priority === 'Medium' ? '#FEF3C7' : '#D1FAE5', color: c.priority === 'Critical' ? '#B42318' : c.priority === 'High' ? '#EA580C' : c.priority === 'Medium' ? '#A85D08' : '#287A4B' }}>{c.priority}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '.75rem', fontSize: '.8rem', color: 'var(--muted-c)', flexWrap: 'wrap' }}>
                    <span>{c.referenceNumber}</span>
                    <span>{c.category}</span>
                    <span>{c.status}</span>
                  </div>
                  {c.location && <div style={{ fontSize: '.75rem', color: 'var(--muted-c)', marginTop: '.25rem', display: 'flex', alignItems: 'center', gap: '.25rem' }}><MapPin size={12} strokeWidth={1.75} /> {c.location}</div>}
                </button>
              ))}
            </div>
          )}
        <div style={{ marginTop: '1rem' }}>
          {/* Simple pagination */}
          {toPage(complaints.data).total > 10 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem' }}>
              <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
              <span className="muted" style={{ fontSize: '.85rem' }}>Page {page}</span>
              <button type="button" className="btn btn-outline btn-sm" disabled={items.length < 10} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </div>
      </div>

      {showMap && detail?.location && (
        <LocationPicker
          value={detail.location}
          lat={detail.latitude}
          lng={detail.longitude}
          onChange={() => {}}
          onClose={() => setShowMap(false)}
        />
      )}

      {reviewing && (
        <StatusReviewModal
          endpoint="/api/complaints"
          row={reviewing}
          config={{ statuses: COMPLAINT_STATUSES, rows: (d) => [['Reference', d.referenceNumber], ['Category', d.category], ['Subject', d.subject], ['Location', d.location], ['Resident', d.residentName], ['Submitted', fmtDateTime(d.submittedAt)]] }}
          onClose={() => setReviewing(null)}
          onChanged={() => { openDetail(reviewing); setReloadKey((k) => k + 1) }}
        />
      )}
    </div>
  )
}