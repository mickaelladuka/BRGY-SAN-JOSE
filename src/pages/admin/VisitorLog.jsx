import { useEffect, useState } from 'react'
import { api, toPage, getErrorMessage } from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/format'
import { Alert, EmptyState, Field, Modal, Pagination, SkeletonList } from '../../components/ui'
import { Users, ClipboardList, LogIn, LogOut, Search } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const TYPES = ['Resident', 'Non-Resident', 'Government Personnel', 'Organization Representative', 'Service Provider / Contractor', 'Other']
const PURPOSES = ['Inquiry / General Assistance', 'Complaint-Related Consultation', 'Document Request', 'Certificate or Clearance-Related Transaction', 'Department Consultation', 'Follow-Up Transaction', 'Meeting / Appointment', 'Official Government Business', 'Delivery / Service', 'Other']

export default function VisitorLog() {
  const [tab, setTab] = useState('overview')
  const [dashboard, setDashboard] = useState(null)
  const [analytics, setAnalytics] = useState([])
  const [records, setRecords] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({ visitorType: '', status: '', departmentId: '', purpose: '', dateFrom: '', dateTo: '' })
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  const [showCheckIn, setShowCheckIn] = useState(false)
  const [form, setForm] = useState({ visitorName: '', visitorType: 'Resident', residentId: '', contactNumber: '', address: '', purposeOfVisit: PURPOSES[0], departmentId: '', personToVisitId: '', numberOfCompanions: 0, notes: '' })
  const [saving, setSaving] = useState(false)
  const [departments, setDepartments] = useState([])
  const [officials, setOfficials] = useState([])

  const loadDashboard = async () => {
    try { const { data } = await api.get('/api/admin/visitors/dashboard'); setDashboard(data) } catch (e) { /* ignore */ }
    try { const { data } = await api.get('/api/admin/visitors/analytics'); setAnalytics(Array.isArray(data) ? data : []) } catch (e) { /* ignore */ }
  }

  const loadRecords = async () => {
    setLoading(true); setError('')
    try {
      const params = { page, pageSize, q: q || undefined, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')) }
      const { data } = await api.get('/api/admin/visitors', { params })
      setRecords(toPage(data))
    } catch (e) { setError(getErrorMessage(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadDashboard() }, [])
  useEffect(() => { if (tab === 'records' || tab === 'active') loadRecords() }, [tab, page, q, filters])

  useEffect(() => {
    api.get('/api/departments').then(({ data }) => setDepartments(toPage(data).items || [])).catch(() => {})
    api.get('/api/officials').then(({ data }) => setOfficials(toPage(data).items || [])).catch(() => {})
  }, [])

  const handleCheckIn = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.post('/api/admin/visitors', {
        visitorName: form.visitorName,
        visitorType: form.visitorType,
        residentId: form.residentId ? Number(form.residentId) : null,
        contactNumber: form.contactNumber || null,
        address: form.address || null,
        purposeOfVisit: form.purposeOfVisit,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        personToVisitId: form.personToVisitId ? Number(form.personToVisitId) : null,
        numberOfCompanions: Number(form.numberOfCompanions) || 0,
        notes: form.notes || null,
      })
      setFlash('Visitor checked in.')
      setShowCheckIn(false)
      setForm({ visitorName: '', visitorType: 'Resident', residentId: '', contactNumber: '', address: '', purposeOfVisit: PURPOSES[0], departmentId: '', personToVisitId: '', numberOfCompanions: 0, notes: '' })
      loadDashboard(); loadRecords()
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  const handleCheckOut = async (id) => {
    if (!window.confirm('Check out this visitor?')) return
    try {
      await api.post(`/api/admin/visitors/${id}/check-out`, {})
      setFlash('Visitor checked out.')
      loadDashboard(); loadRecords()
    } catch (err) { setError(getErrorMessage(err)) }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this visit?')) return
    try {
      await api.post(`/api/admin/visitors/${id}/cancel`, {})
      setFlash('Visit cancelled.')
      loadDashboard(); loadRecords()
    } catch (err) { setError(getErrorMessage(err)) }
  }

  const handleCorrect = async (id) => {
    const reason = window.prompt('Reason for correction:')
    if (!reason) return
    const time = window.prompt('Actual departure time (ISO, e.g. 2026-11-03T10:30:00Z):')
    if (!time) return
    try {
      await api.post(`/api/admin/visitors/${id}/correct-check-out`, { timeOut: time, reason })
      setFlash('Check-out corrected.')
      loadDashboard(); loadRecords()
    } catch (err) { setError(getErrorMessage(err)) }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Visitor's Log</h1>
        <button type="button" className="btn btn-primary" onClick={() => setShowCheckIn(true)}>Register Visitor / Check In</button>
      </div>

      <Alert type="success" onClose={() => setFlash('')}>{flash}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['overview', 'records', 'active', 'completed'].map((t) => (
          <button key={t} type="button" className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>{t === 'overview' ? 'Overview' : t === 'records' ? 'Visitor Records' : t === 'active' ? 'Active Visitors' : 'Completed Visits'}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div className="card"><div className="muted" style={{ fontSize: '.75rem' }}>Total Today</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{dashboard?.totalToday ?? 0}</div></div>
            <div className="card"><div className="muted" style={{ fontSize: '.75rem' }}>Currently Inside</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{dashboard?.currentlyInside ?? 0}</div></div>
            <div className="card"><div className="muted" style={{ fontSize: '.75rem' }}>Completed Today</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{dashboard?.completedToday ?? 0}</div></div>
            <div className="card"><div className="muted" style={{ fontSize: '.75rem' }}>Total This Month</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{dashboard?.totalThisMonth ?? 0}</div></div>
            <div className="card"><div className="muted" style={{ fontSize: '.75rem' }}>Pending Attention</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{dashboard?.pendingAttention ?? 0}</div></div>
          </div>
          <div className="card" style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#C63F0A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {(tab === 'records' || tab === 'active' || tab === 'completed') && (
        <div>
          <div className="toolbar" role="search" style={{ marginBottom: '1rem' }}>
            <div className="field grow"><label htmlFor="vq">Search</label><input id="vq" type="search" value={q} placeholder="Code, name, contact, purpose" onChange={(e) => { setQ(e.target.value); setPage(1) }} /></div>
            <div className="field"><label>Type</label><select value={filters.visitorType} onChange={(e) => { setFilters({ ...filters, visitorType: e.target.value }); setPage(1) }}><option value="">All</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label>Status</label><select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1) }}><option value="">All</option><option>INSIDE</option><option>COMPLETED</option><option>CANCELLED</option></select></div>
            <div className="field"><label>Purpose</label><select value={filters.purpose} onChange={(e) => { setFilters({ ...filters, purpose: e.target.value }); setPage(1) }}><option value="">All</option>{PURPOSES.map((p) => <option key={p}>{p}</option>)}</select></div>
            <div className="field"><label>From</label><input type="date" value={filters.dateFrom} onChange={(e) => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(1) }} /></div>
            <div className="field"><label>To</label><input type="date" value={filters.dateTo} onChange={(e) => { setFilters({ ...filters, dateTo: e.target.value }); setPage(1) }} /></div>
            {(q || Object.values(filters).some(Boolean)) && <button type="button" className="btn btn-outline btn-sm" onClick={() => { setQ(''); setFilters({ visitorType: '', status: '', departmentId: '', purpose: '', dateFrom: '', dateTo: '' }) }}>Clear</button>}
          </div>

          {loading ? <SkeletonList count={3} lines={3} /> : records.items.length === 0 ? (
            <div className="card"><EmptyState title="No visitor records found" /></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Purpose</th><th>Dept</th><th>Time In</th><th>Time Out</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {records.items.filter((r) => tab === 'active' ? r.status === 'INSIDE' : tab === 'completed' ? r.status === 'COMPLETED' : true).map((r) => (
                    <tr key={r.id}>
                      <td>{r.visitorCode}</td>
                      <td>{r.visitorName}</td>
                      <td>{r.visitorType}</td>
                      <td>{r.purposeOfVisit}</td>
                      <td>{r.departmentName || '-'}</td>
                      <td>{fmtDateTime(r.timeIn)}</td>
                      <td>{r.timeOut ? fmtDateTime(r.timeOut) : '-'}</td>
                      <td><span className="badge">{r.status}</span></td>
                      <td className="actions">
                        <div className="row" style={{ gap: '.4rem' }}>
                          {r.status === 'INSIDE' && <button type="button" className="btn btn-primary btn-sm" onClick={() => handleCheckOut(r.id)}>Check Out</button>}
                          {r.status === 'INSIDE' && <button type="button" className="btn btn-outline btn-sm" onClick={() => handleCancel(r.id)}>Cancel</button>}
                          {r.status === 'COMPLETED' && <button type="button" className="btn btn-outline btn-sm" onClick={() => handleCorrect(r.id)}>Correct</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} pageSize={pageSize} total={records.total} onChange={setPage} />
        </div>
      )}

      {showCheckIn && (
        <Modal title="Register Visitor / Check In" wide onClose={() => setShowCheckIn(false)} footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowCheckIn(false)} disabled={saving}>Cancel</button>
            <button type="submit" form="visitor-checkin-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Check In'}</button>
          </>
        }>
          <form id="visitor-checkin-form" onSubmit={handleCheckIn}>
            <Alert>{error}</Alert>
            <div className="form-grid">
              <div><Field label="Visitor Name" htmlFor="vn" required><input id="vn" value={form.visitorName} onChange={(e) => setForm({ ...form, visitorName: e.target.value })} required /></Field></div>
              <div><Field label="Visitor Type" htmlFor="vt" required><select id="vt" value={form.visitorType} onChange={(e) => setForm({ ...form, visitorType: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field></div>
              <div><Field label="Contact Number" htmlFor="vc"><input id="vc" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} /></Field></div>
              <div><Field label="Address" htmlFor="va"><input id="va" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div>
              <div><Field label="Purpose of Visit" htmlFor="vp" required><select id="vp" value={form.purposeOfVisit} onChange={(e) => setForm({ ...form, purposeOfVisit: e.target.value })}>{PURPOSES.map((p) => <option key={p}>{p}</option>)}</select></Field></div>
              <div><Field label="Department" htmlFor="vd"><select id="vd" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><option value="">Not Specified</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field></div>
              <div><Field label="Person to Visit" htmlFor="vptv"><select id="vptv" value={form.personToVisitId} onChange={(e) => setForm({ ...form, personToVisitId: e.target.value })}><option value="">Not Specified</option>{officials.map((o) => <option key={o.id} value={o.id}>{o.fullName}</option>)}</select></Field></div>
              <div><Field label="Companions" htmlFor="vcomp"><input id="vcomp" type="number" min="0" value={form.numberOfCompanions} onChange={(e) => setForm({ ...form, numberOfCompanions: e.target.value })} /></Field></div>
              <div className="full"><Field label="Notes" htmlFor="vnotes"><textarea id="vnotes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}