import { useState } from 'react'
import { Alert, EmptyState, Spinner } from '../../components/ui'
import { useFetch } from '../../lib/useFetch'

const BROWN = '#7C2D12'
const BROWN_LIGHT = '#FDF0E8'
const CREAM = '#FDF6F0'
const MUTED = '#9CA3AF'
const INK = '#1F1F1F'
const INK_LIGHT = '#6B7280'

function OfficialCard({ p }) {
  const initials = (p.fullName ?? '')
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'

  return (
    <div style={{
      background: '#fff',
      borderRadius: '18px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      border: '1px solid #F0E6DC',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
    }}>

      {/* TOP ACCENT BAR */}
      <div style={{ width: '100%', height: '6px', background: BROWN }} />

      <div style={{ padding: '20px 18px 18px' }}>

        {/* AVATAR */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: BROWN, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', fontWeight: 800,
          margin: '0 auto 12px',
          boxShadow: '0 4px 12px rgba(124,45,18,0.25)',
        }}>
          {initials}
        </div>

        {/* NAME */}
        {p.showPosition !== false && (
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: INK, margin: '0 0 4px' }}>
            {p.fullName}
          </h3>
        )}

        {/* POSITION */}
        {p.showPosition !== false && p.position && (
          <p style={{ fontSize: '12px', color: BROWN, fontWeight: 600, margin: '0 0 8px' }}>
            {p.position}
          </p>
        )}

        {/* DEPARTMENT BADGE */}
        {p.showDepartment !== false && p.departmentName && (
          <span style={{
            display: 'inline-block',
            padding: '3px 12px', borderRadius: '999px',
            background: BROWN_LIGHT, color: BROWN,
            fontSize: '11px', fontWeight: 700,
            marginBottom: '10px',
          }}>
            {p.departmentName}
          </span>
        )}

        {/* RESPONSIBILITIES */}
        {p.showResponsibilities && p.publicResponsibilities && (
          <p style={{
            fontSize: '12px', color: INK_LIGHT,
            margin: '8px 0 0', lineHeight: 1.5,
            paddingTop: '8px', borderTop: '1px solid #F0E6DC',
          }}>
            {p.publicResponsibilities}
          </p>
        )}

        {/* CONTACT */}
        {p.showOfficialContact && p.publicContactInfo && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            marginTop: '8px',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.08 4.18 2 2 0 0 1 5.09 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <p style={{ fontSize: '11px', color: MUTED, margin: 0 }}>
              {p.publicContactInfo}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

export default function PublicOfficials() {
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')

  const personnel = useFetch('/api/departments/public/personnel')

  const departments = [...new Set(
    (personnel.data ?? []).map(p => p.departmentName).filter(Boolean)
  )]

  const filtered = (personnel.data ?? []).filter(p => {
    const matchSearch = !search
      || p.fullName?.toLowerCase().includes(search.toLowerCase())
      || p.position?.toLowerCase().includes(search.toLowerCase())
    const matchDept = !deptFilter || p.departmentName === deptFilter
    return matchSearch && matchDept
  })

  return (
    <main className="public" style={{ padding: '1.25rem 1rem', background: CREAM, minHeight: '100vh' }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: INK, margin: '0 0 4px' }}>
          Barangay Officials
        </h1>
        <p style={{ fontSize: '13px', color: MUTED, margin: 0 }}>
          Area 6 officials and their public contact information.
        </p>
      </div>

      {/* SEARCH & FILTER */}
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '14px',
        marginBottom: '16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #F0E6DC',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>

        {/* SEARCH */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: BROWN, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
            Search
          </label>
          <div style={{ position: 'relative' }}>
            <svg
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
            </svg>
            <input
              id="off-search"
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or position..."
              style={{
                width: '100%', padding: '9px 12px 9px 32px',
                borderRadius: '10px', border: '1px solid #E5D5C8',
                fontSize: '13px', color: INK, background: CREAM,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* DEPARTMENT FILTER */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: BROWN, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
            Department
          </label>
          <select
            id="off-dept"
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px',
              borderRadius: '10px', border: '1px solid #E5D5C8',
              fontSize: '13px', color: deptFilter ? INK : MUTED,
              background: CREAM, outline: 'none',
              appearance: 'none',
            }}
          >
            <option value="">All departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* RESULT COUNT */}
        {!personnel.loading && (
          <p style={{ fontSize: '12px', color: MUTED, margin: 0 }}>
            {filtered.length} official{filtered.length !== 1 ? 's' : ''} found
          </p>
        )}

      </div>

      {/* RESULTS */}
      {personnel.loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Spinner />
        </div>
      ) : personnel.error ? (
        <Alert>{personnel.error}</Alert>
      ) : filtered.length === 0 ? (
        <EmptyState title="No officials found" />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '12px',
        }}>
          {filtered.map(p => (
            <OfficialCard key={p.id} p={p} />
          ))}
        </div>
      )}

    </main>
  )
}