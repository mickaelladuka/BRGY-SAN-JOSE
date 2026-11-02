import { Link, useSearchParams } from 'react-router-dom'
import { Alert, EmptyState, Pagination, SkeletonList, StatusBadge } from '../../components/ui'
import { toPage } from '../../lib/api'
import { fmtDate } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'
import { useState } from 'react'

const PAGE_SIZE = 10
export default function Track() {
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') === 'reports' ? 'reports' : 'complaints'
  const [page, setPage] = useState(1)
  const { data, loading, error } = useFetch(`/api/${tab}/mine`, { page, pageSize: PAGE_SIZE })
  const { items, total } = toPage(data)
  const switchTab = (t) => { setPage(1); setSp(t === 'reports' ? { tab: 'reports' } : {}) }

  return (
    <>
      <h1>Track my requests</h1>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'complaints'} onClick={() => switchTab('complaints')}>Complaints</button>
        <button role="tab" aria-selected={tab === 'reports'} onClick={() => switchTab('reports')}>Reports</button>
      </div>
      <div className="row" style={{ marginBottom: '1rem' }}>
        <Link className="btn btn-primary btn-sm" to="/resident/complaints/new">New complaint</Link>
        <Link className="btn btn-outline btn-sm" to="/resident/reports/new">New report</Link>
      </div>
      {loading ? <SkeletonList count={3} lines={3} /> : error ? <Alert>{error}</Alert> : items.length === 0
        ? <EmptyState title={`No ${tab} yet`}>Things you submit will show up here with their latest status.</EmptyState>
        : (
          <div className="card">
            {items.map((x) => (
              <Link key={x.id} className="list-item" to={`/resident/track/${tab}/${x.id}`}>
                <div className="top"><strong>{tab === 'complaints' ? x.subject : x.category}</strong><StatusBadge status={x.status} /></div>
                <span className="muted">{x.referenceNumber} · {fmtDate(x.submittedAt)}</span>
              </Link>
            ))}
          </div>
        )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
    </>
  )
}
