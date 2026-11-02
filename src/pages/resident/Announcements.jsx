import { useState } from 'react'
import { Alert, EmptyState, Pagination, SkeletonList } from '../../components/ui'
import { toPage } from '../../lib/api'
import { fmtDate } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'

const PAGE_SIZE = 10
export default function Announcements() {
  const [page, setPage] = useState(1)
  const { data, loading, error } = useFetch('/api/announcements', { page, pageSize: PAGE_SIZE })
  const { items, total } = toPage(data)
  return (
    <>
      <h1>Announcements</h1>
      {loading ? <SkeletonList count={3} lines={3} /> : error ? <Alert>{error}</Alert> : items.length === 0
        ? <EmptyState title="No announcements right now" />
        : items.map((a) => (
          <article key={a.id} className="card">
            <div className="card-head"><h2 style={{ margin: 0 }}>{a.title}</h2>{a.category && <span className="badge">{a.category}</span>}</div>
            <p className="muted">Published {fmtDate(a.publishedAt)}</p>
            <p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{a.content}</p>
          </article>
        ))}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
    </>
  )
}
