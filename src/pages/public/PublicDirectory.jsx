import { useState } from 'react'
import { Alert, EmptyState, Spinner, SkeletonList } from '../../components/ui'
import { useFetch } from '../../lib/useFetch'

// ─── Design tokens (brown palette from reference) ─────────────────────────────
const BROWN = '#7C2D12'
const BROWN_LIGHT = '#FDF0E8'
const CREAM = '#FDF6F0'
const MUTED = '#9CA3AF'
const INK = '#1F1F1F'
const INK_LIGHT = '#6B7280'

// ─── OfficialCard ─────────────────────────────────────────────────────────────
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
      <div style={{ width: '100%', height: '6px', background: BROWN }} />
      <div style={{ padding: '20px 18px 18px' }}>
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
        {p.showPosition !== false && (
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: INK, margin: '0 0 4px' }}>
            {p.fullName}
          </h3>
        )}
        {p.showPosition !== false && p.position && (
          <p style={{ fontSize: '12px', color: BROWN, fontWeight: 600, margin: '0 0 8px' }}>
            {p.position}
          </p>
        )}
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
        {p.showResponsibilities && p.publicResponsibilities && (
          <p style={{
            fontSize: '12px', color: INK_LIGHT,
            margin: '8px 0 0', lineHeight: 1.5,
            paddingTop: '8px', borderTop: '1px solid #F0E6DC',
          }}>
            {p.publicResponsibilities}
          </p>
        )}
        {p.showOfficialContact && p.publicContactInfo && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.08 4.18 2 2 0 0 1 5.09 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
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

// ─── PersonnelCard (for Departments tab) ──────────────────────────────────────
function PersonnelCard({ p }) {
  const initials = (p.fullName ?? '')
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      padding: '12px', background: CREAM,
      borderRadius: '12px', border: '1px solid #F0E6DC',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: BROWN, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: 800, flexShrink: 0,
      }}>
        {initials || '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {p.fullName && (
          <p style={{ fontSize: '14px', fontWeight: 700, color: INK, margin: '0 0 2px' }}>
            {p.fullName}
          </p>
        )}
        {p.position && (
          <p style={{ fontSize: '12px', color: BROWN, fontWeight: 600, margin: '0 0 4px' }}>
            {p.position}
          </p>
        )}
        {p.publicResponsibilities && (
          <p style={{ fontSize: '12px', color: INK_LIGHT, margin: '0 0 2px', lineHeight: 1.4 }}>
            {p.publicResponsibilities}
          </p>
        )}
        {p.publicContactInfo && (
          <p style={{ fontSize: '11px', color: MUTED, margin: 0 }}>
            {p.publicContactInfo}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── InfoRow (for Departments tab) ────────────────────────────────────────────
function InfoRow({ label, value, icon }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '8px',
        background: BROWN_LIGHT,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: '1px',
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '11px', fontWeight: 700, color: BROWN, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>
          {label}
        </p>
        <p style={{ fontSize: '13px', color: INK_LIGHT, margin: 0, lineHeight: 1.5 }}>
          {value}
        </p>
      </div>
    </div>
  )
}

// ─── Merged Component ──────────────────────────────────────────────────────────
export default function PublicDirectory() {
  const [activeTab, setActiveTab] = useState('departments')

  // Both fetches fire on mount so tab switching is instant
  const depts = useFetch('/api/departments/public')
  const personnel = useFetch('/api/departments/public/personnel')

  // ── Officials tab state ──
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')

  const departments = [...new Set(
    (personnel.data ?? []).map(p => p.departmentName).filter(Boolean)
  )]

  const filteredOfficials = (personnel.data ?? []).filter(p => {
    const matchSearch = !search
      || p.fullName?.toLowerCase().includes(search.toLowerCase())
      || p.position?.toLowerCase().includes(search.toLowerCase())
    const matchDept = !deptFilter || p.departmentName === deptFilter
    return matchSearch && matchDept
  })

  const tabStyle = (active) => ({
    padding: '8px 20px',
    borderRadius: '999px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
    transition: 'all 0.15s',
    background: active ? BROWN : 'transparent',
    color: active ? '#fff' : MUTED,
  })

  return (
    <main className="public" style={{ padding: '1.25rem 1rem', background: CREAM, minHeight: '100vh' }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: INK, margin: '0 0 4px' }}>
          Directory
        </h1>
        <p style={{ fontSize: '13px', color: MUTED, margin: 0 }}>
          Departments, services, and officials of Area 6.
        </p>
      </div>

      {/* TABS */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '1.25rem',
        background: '#fff',
        borderRadius: '14px',
        padding: '6px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #F0E6DC',
        width: 'fit-content',
      }}>
        <button style={tabStyle(activeTab === 'departments')} onClick={() => setActiveTab('departments')}>
          Departments
        </button>
        <button style={tabStyle(activeTab === 'officials')} onClick={() => setActiveTab('officials')}>
          Officials
        </button>
      </div>

      {/* ── DEPARTMENTS TAB ── */}
      {activeTab === 'departments' && (
        <>
          {depts.loading ? (
            <SkeletonList count={3} lines={4} />
          ) : depts.error ? (
            <Alert>{depts.error}</Alert>
          ) : (depts.data ?? []).length === 0 ? (
            <EmptyState title="No departments available" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(depts.data ?? []).map((dept) => (
                <div key={dept.id} style={{
                  background: '#fff',
                  borderRadius: '18px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                  border: '1px solid #F0E6DC',
                  overflow: 'hidden',
                }}>
                  {/* DEPT HEADER STRIP */}
                  <div style={{
                    padding: '16px 18px',
                    background: BROWN,
                    display: 'flex', alignItems: 'center', gap: '12px',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '12px',
                      background: 'rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 800, color: '#fff', flexShrink: 0,
                    }}>
                      {dept.abbreviation ?? dept.name?.charAt(0)}
                    </div>
                    <div>
                      <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: '0 0 2px' }}>
                        {dept.name}
                      </h2>
                      {dept.publicDescription && (
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                          {dept.publicDescription}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* DEPT DETAILS */}
                  <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <InfoRow
                      label="Services"
                      value={dept.publicServices}
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BROWN} strokeWidth="2">
                          <polyline points="9,11 12,14 22,4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                      }
                    />
                    <InfoRow
                      label="Contact"
                      value={dept.publicContactInfo}
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BROWN} strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.08 4.18 2 2 0 0 1 5.09 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      }
                    />
                    <InfoRow
                      label="Office Location"
                      value={dept.publicOfficeLocation}
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BROWN} strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                      }
                    />
                    <InfoRow
                      label="Office Hours"
                      value={dept.publicOfficeHours}
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BROWN} strokeWidth="2">
                          <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
                        </svg>
                      }
                    />

                    {/* PERSONNEL */}
                    {dept.personnel && dept.personnel.length > 0 && (
                      <div style={{ borderTop: '1px solid #F0E6DC', paddingTop: '14px', marginTop: '2px' }}>
                        <p style={{
                          fontSize: '11px', fontWeight: 700, color: BROWN,
                          textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px',
                        }}>
                          Personnel ({dept.personnel.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {dept.personnel.map((p) => (
                            <PersonnelCard key={p.id} p={p} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </>
    )}

      {/* ── OFFICIALS TAB ── */}
      {activeTab === 'officials' && (
        <>
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
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: BROWN, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                Search
              </label>
              <div style={{ position: 'relative' }}>
                <svg
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
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

            {!personnel.loading && (
              <p style={{ fontSize: '12px', color: MUTED, margin: 0 }}>
                {filteredOfficials.length} official{filteredOfficials.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {personnel.loading ? (
            <SkeletonList count={4} lines={2} />
          ) : personnel.error ? (
            <Alert>{personnel.error}</Alert>
          ) : filteredOfficials.length === 0 ? (
            <EmptyState title="No officials found" />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '12px',
            }}>
              {filteredOfficials.map(p => (
                <OfficialCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
