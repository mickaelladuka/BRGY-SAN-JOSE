import { Alert, EmptyState, Spinner } from '../../components/ui'
import { useFetch } from '../../lib/useFetch'

const BROWN = '#7C2D12'
const BROWN_LIGHT = '#FDF0E8'
const CREAM = '#FDF6F0'
const MUTED = '#9CA3AF'
const INK = '#1F1F1F'
const INK_LIGHT = '#6B7280'

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

export default function PublicDepartments() {
  const depts = useFetch('/api/departments/public')

  return (
    <main className="public" style={{ padding: '1.25rem 1rem', background: CREAM, minHeight: '100vh' }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: INK, margin: '0 0 4px' }}>
          Departments & Services
        </h1>
        <p style={{ fontSize: '13px', color: MUTED, margin: 0 }}>
          Area 6 departments and their public services.
        </p>
      </div>

      {depts.loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Spinner />
        </div>
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
                      <polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                  }
                />

                <InfoRow
                  label="Contact"
                  value={dept.publicContactInfo}
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BROWN} strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.08 4.18 2 2 0 0 1 5.09 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  }
                />

                <InfoRow
                  label="Office Location"
                  value={dept.publicOfficeLocation}
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BROWN} strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  }
                />

                <InfoRow
                  label="Office Hours"
                  value={dept.publicOfficeHours}
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BROWN} strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
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
    </main>
  )
}