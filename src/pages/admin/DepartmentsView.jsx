import { useState, useCallback } from 'react'
import { Alert, EmptyState, Field, Modal, ConfirmDialog, SkeletonList } from '../../components/ui'
import { api, getErrorMessage, getFieldErrors } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'

const GREEN      = '#0E3B22'
const GREEN_SOFT = '#EAF3EC'
const CREAM      = '#F7F5EF'
const BORDER     = '#E5E7EB'
const MUTED      = '#9CA3AF'
const INK        = '#374151'
const INK_BOLD   = '#111827'

const checkboxStyle = {
  width: 14, height: 14,
  accentColor: GREEN,
  cursor: 'pointer',
  flexShrink: 0,
}

const emptyDept = () => ({
  name: '', abbreviation: '', description: '', areaId: 1, isActive: true, isArchived: false,
  isPubliclyVisible: false, publicDescription: '', publicServices: '', publicContactInfo: '',
  publicOfficeLocation: '', publicOfficeHours: '',
})
const emptyPerson = () => ({
  fullName: '', position: '', contactNumber: '', email: '', departmentId: 0, isActive: true,
  isPubliclyVisible: false, showProfilePhoto: false, showPosition: true, showDepartment: true,
  showResponsibilities: false, showOfficialContact: false, publicResponsibilities: '', publicContactInfo: '',
})

function IconBtn({ onClick, title, color = INK, bg = '#F3F4F6', children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 30, height: 30, borderRadius: '8px',
        background: bg, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, transition: 'opacity 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {children}
    </button>
  )
}

function PersonnelRow({ p, onEdit, onToggle }) {
  const initials = (p.fullName ?? '')
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 14px', background: '#fff',
        borderRadius: '12px', border: `1px solid ${BORDER}`,
        transition: 'box-shadow 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: GREEN, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: 800, flexShrink: 0,
      }}>
        {initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: INK_BOLD, margin: '0 0 1px' }}>
          {p.fullName}
        </p>
        <p style={{ fontSize: '12px', color: MUTED, margin: 0 }}>
          {p.position}
        </p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '2px', flexWrap: 'wrap' }}>
          {p.email && (
            <span style={{ fontSize: '11px', color: MUTED, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              {p.email}
            </span>
          )}
          {p.contactNumber && (
            <span style={{ fontSize: '11px', color: MUTED, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.08 4.18 2 2 0 0 1 5.09 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              {p.contactNumber}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{
          padding: '3px 10px', borderRadius: '999px',
          fontSize: '11px', fontWeight: 700,
          background: p.isActive ? '#D1FAE5' : '#FEE2E2',
          color: p.isActive ? '#065F46' : '#991B1B',
        }}>
          {p.isActive ? 'Active' : 'Inactive'}
        </span>

        <IconBtn title="Edit" onClick={() => onEdit(p)} bg={GREEN_SOFT} color={GREEN}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </IconBtn>

        <IconBtn
          title={p.isActive ? 'Deactivate' : 'Activate'}
          onClick={() => onToggle(p)}
          bg={p.isActive ? '#FEE2E2' : '#D1FAE5'}
          color={p.isActive ? '#991B1B' : '#065F46'}
        >
          {p.isActive ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          )}
        </IconBtn>
      </div>
    </div>
  )
}

export default function DepartmentsView() {
  const [showArchived, setShowArchived] = useState(false)
  const depts = useFetch(`/api/departments${showArchived ? '?archived=true' : ''}`)
  const [selectedId, setSelectedId] = useState(null)

  const [deptForm,    setDeptForm]    = useState(null)
  const [deptErrors,  setDeptErrors]  = useState({})
  const [deptError,   setDeptError]   = useState('')
  const [deptSaving,  setDeptSaving]  = useState(false)

  const [personForm,   setPersonForm]   = useState(null)
  const [personErrors, setPersonErrors] = useState({})
  const [personError,  setPersonError]  = useState('')
  const [personSaving, setPersonSaving] = useState(false)

  const [confirm, setConfirm] = useState(null)
  const [busy,    setBusy]    = useState(false)
  const [flash,   setFlash]   = useState('')
  const [error,   setError]   = useState('')

  const list           = depts.data ?? []
  const selected       = list.find(d => d.id === selectedId) ?? (list.length ? list[0] : null)
  const activeSelected = selectedId ?? selected?.id ?? null

  const totalDepts     = list.length
  const totalPersonnel = list.reduce((acc, d) => acc + (d.personnel?.length ?? 0), 0)
  const totalActive    = list.reduce((acc, d) => acc + (d.personnel ?? []).filter(p => p.isActive).length, 0)
  const activeCount    = (selected?.personnel ?? []).filter(p => p.isActive).length
  const inactiveCount  = (selected?.personnel ?? []).length - activeCount

  const reload = useCallback(() => { depts.reload() }, [depts])

  const openDeptForm = (row) => {
    setDeptErrors({}); setDeptError('')
    if (row) {
      setDeptForm({ mode: 'edit', id: row.id, values: {
        name: row.name ?? '', abbreviation: row.abbreviation ?? '',
        description: row.description ?? '', areaId: row.areaId ?? 1,
        isActive: row.isActive ?? true, isArchived: row.isArchived ?? false,
        isPubliclyVisible: row.isPubliclyVisible ?? false,
        publicDescription: row.publicDescription ?? '',
        publicServices: row.publicServices ?? '',
        publicContactInfo: row.publicContactInfo ?? '',
        publicOfficeLocation: row.publicOfficeLocation ?? '',
        publicOfficeHours: row.publicOfficeHours ?? '',
      }})
    } else {
      setDeptForm({ mode: 'create', values: emptyDept() })
    }
  }

  const saveDept = async (ev) => {
    ev.preventDefault()
    const v = deptForm.values
    const errs = {}
    if (!v.name?.trim()) errs.name = 'Name is required.'
    setDeptErrors(errs); setDeptError('')
    if (Object.keys(errs).length) return
    const payload = {
      name: v.name.trim(), abbreviation: v.abbreviation?.trim() || null,
      description: v.description?.trim() || null, areaId: Number(v.areaId) || 1,
      isActive: !!v.isActive, isArchived: !!v.isArchived,
      isPubliclyVisible: !!v.isPubliclyVisible,
      publicDescription: v.publicDescription?.trim() || null,
      publicServices: v.publicServices?.trim() || null,
      publicContactInfo: v.publicContactInfo?.trim() || null,
      publicOfficeLocation: v.publicOfficeLocation?.trim() || null,
      publicOfficeHours: v.publicOfficeHours?.trim() || null,
    }
    setDeptSaving(true)
    try {
      if (deptForm.mode === 'edit') await api.put(`/api/departments/${deptForm.id}`, payload)
      else await api.post('/api/departments', payload)
      setDeptForm(null)
      setFlash(deptForm.mode === 'edit' ? 'Department saved.' : 'Department created.')
      reload()
    } catch (err) {
      setDeptErrors(getFieldErrors(err)); setDeptError(getErrorMessage(err))
    } finally { setDeptSaving(false) }
  }

  const openPersonForm = (dept, person) => {
    setPersonErrors({}); setPersonError('')
    if (person) {
      setPersonForm({ mode: 'edit', id: person.id, values: {
        fullName: person.fullName ?? '', position: person.position ?? '',
        contactNumber: person.contactNumber ?? '', email: person.email ?? '',
        departmentId: person.departmentId ?? dept.id, isActive: person.isActive ?? true,
        isPubliclyVisible: person.isPubliclyVisible ?? false,
        showProfilePhoto: person.showProfilePhoto ?? false,
        showPosition: person.showPosition ?? true,
        showDepartment: person.showDepartment ?? true,
        showResponsibilities: person.showResponsibilities ?? false,
        showOfficialContact: person.showOfficialContact ?? false,
        publicResponsibilities: person.publicResponsibilities ?? '',
        publicContactInfo: person.publicContactInfo ?? '',
      }})
    } else {
      setPersonForm({ mode: 'create', values: { ...emptyPerson(), departmentId: dept.id } })
    }
  }

  const savePerson = async (ev) => {
    ev.preventDefault()
    const v = personForm.values
    const errs = {}
    if (!v.fullName?.trim()) errs.fullName = 'Name is required.'
    if (!v.position?.trim()) errs.position = 'Position is required.'
    setPersonErrors(errs); setPersonError('')
    if (Object.keys(errs).length) return
    const payload = {
      fullName: v.fullName.trim(), position: v.position.trim(),
      contactNumber: v.contactNumber?.trim() || null,
      email: v.email?.trim() || null,
      departmentId: Number(v.departmentId) || selected.id,
      isActive: !!v.isActive, isPubliclyVisible: !!v.isPubliclyVisible,
      showProfilePhoto: !!v.showProfilePhoto, showPosition: !!v.showPosition,
      showDepartment: !!v.showDepartment, showResponsibilities: !!v.showResponsibilities,
      showOfficialContact: !!v.showOfficialContact,
      publicResponsibilities: v.publicResponsibilities?.trim() || null,
      publicContactInfo: v.publicContactInfo?.trim() || null,
    }
    setPersonSaving(true)
    try {
      if (personForm.mode === 'edit') await api.put(`/api/departments/personnel/${personForm.id}`, payload)
      else await api.post('/api/departments/personnel', payload)
      setPersonForm(null)
      setFlash(personForm.mode === 'edit' ? 'Personnel saved.' : 'Personnel added.')
      reload()
    } catch (err) {
      setPersonErrors(getFieldErrors(err)); setPersonError(getErrorMessage(err))
    } finally { setPersonSaving(false) }
  }

  const togglePerson = async (p) => {
    try {
      await api.put(`/api/departments/personnel/${p.id}`, {
        fullName: p.fullName, position: p.position, contactNumber: p.contactNumber,
        email: p.email, departmentId: p.departmentId, isActive: !p.isActive,
        isPubliclyVisible: p.isPubliclyVisible, showProfilePhoto: p.showProfilePhoto,
        showPosition: p.showPosition, showDepartment: p.showDepartment,
        showResponsibilities: p.showResponsibilities, showOfficialContact: p.showOfficialContact,
        publicResponsibilities: p.publicResponsibilities, publicContactInfo: p.publicContactInfo,
      })
      setFlash(p.isActive ? 'Personnel deactivated.' : 'Personnel activated.')
      reload()
    } catch (err) { setError(getErrorMessage(err)) }
  }

  const toggleDeptActive = async (d) => {
    try {
      await api.put(`/api/departments/${d.id}`, {
        name: d.name, abbreviation: d.abbreviation, description: d.description,
        areaId: d.areaId, isActive: !d.isActive, isArchived: d.isArchived ?? false,
        isPubliclyVisible: d.isPubliclyVisible ?? false,
        publicDescription: d.publicDescription, publicServices: d.publicServices,
        publicContactInfo: d.publicContactInfo, publicOfficeLocation: d.publicOfficeLocation,
        publicOfficeHours: d.publicOfficeHours,
      })
      setFlash(d.isActive ? 'Department deactivated.' : 'Department activated.')
      reload()
    } catch (err) { setError(getErrorMessage(err)) }
  }

  const archiveDept = async (d) => {
    setBusy(true)
    try {
      await api.post(`/api/departments/${d.id}/archive`)
      setFlash('Department archived.'); setConfirm(null); reload()
    } catch (err) { setError(getErrorMessage(err)); setConfirm(null) }
    finally { setBusy(false) }
  }

  const restoreDept = async (d) => {
    setBusy(true)
    try {
      await api.post(`/api/departments/${d.id}/restore`)
      setFlash('Department restored.'); setConfirm(null); reload()
    } catch (err) { setError(getErrorMessage(err)); setConfirm(null) }
    finally { setBusy(false) }
  }

  // ── helpers ──────────────────────────────────────────────
  const setDV = (k, v) => setDeptForm(f => ({ ...f, values: { ...f.values, [k]: v } }))
  const setPV = (k, v) => setPersonForm(f => ({ ...f, values: { ...f.values, [k]: v } }))

  return (
    <div style={{ padding: '1.5rem 2rem', width: '100%' }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: INK_BOLD, margin: '0 0 4px' }}>
            Barangay Officials & Departments
          </h1>
          <p style={{ fontSize: '13px', color: MUTED, margin: 0 }}>
            Area 6 organizational structure and department directory
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: MUTED, cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={checkboxStyle}
              checked={showArchived}
              onChange={e => { setShowArchived(e.target.checked); setSelectedId(null) }}
            />
            Show archived
          </label>
          <button
            type="button"
            onClick={() => openDeptForm(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '10px',
              background: GREEN, color: '#fff',
              fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Department
          </button>
        </div>
      </div>

      <Alert type="success" onClose={() => setFlash('')}>{flash}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      {/* SUMMARY STRIP */}
      {!depts.loading && !depts.error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
          {[
            { label: 'Departments',     value: totalDepts,     color: GREEN },
            { label: 'Total Personnel', value: totalPersonnel, color: '#1D4ED8' },
            { label: 'Active Staff',    value: totalActive,    color: '#065F46' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: '#fff', borderRadius: '14px', padding: '14px 18px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              border: `1px solid ${BORDER}`, borderLeft: `4px solid ${color}`,
            }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
                {label}
              </p>
              <strong style={{ fontSize: '1.75rem', fontWeight: 800, color, lineHeight: 1 }}>
                {value}
              </strong>
            </div>
          ))}
        </div>
      )}

      {/* MAIN CONTENT */}
      {depts.loading ? (
        <SkeletonList count={4} lines={3} />
      ) : depts.error ? (
        <Alert>{depts.error}</Alert>
      ) : list.length === 0 ? (
        <EmptyState title="No departments found" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px', alignItems: 'start' }}>

          {/* LEFT — DEPT LIST */}
          <div style={{ background: '#fff', borderRadius: '16px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, background: CREAM }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Departments ({totalDepts})
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {list.map((dept, i) => {
                const isActive = dept.id === activeSelected
                const count    = dept.personnel?.length ?? 0
                return (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedId(dept.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '13px 16px',
                      background: isActive ? GREEN_SOFT : '#fff',
                      borderBottom: i < list.length - 1 ? `1px solid ${BORDER}` : 'none',
                      border: 'none',
                      borderLeft: isActive ? `3px solid ${GREEN}` : '3px solid transparent',
                      cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '10px',
                      background: isActive ? GREEN : '#F3F4F6',
                      color: isActive ? '#fff' : MUTED,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 800, flexShrink: 0,
                      opacity: dept.isArchived ? 0.5 : 1,
                      transition: 'all 0.12s',
                    }}>
                      {dept.abbreviation ?? dept.name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '13px', fontWeight: isActive ? 700 : 600,
                        color: isActive ? GREEN : INK,
                        margin: '0 0 2px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {dept.name}
                        {dept.isArchived && (
                          <span style={{ fontSize: '10px', color: MUTED, fontWeight: 400, marginLeft: '4px' }}>
                            (Archived)
                          </span>
                        )}
                      </p>
                      <p style={{ fontSize: '11px', color: MUTED, margin: 0 }}>
                        {count} staff
                      </p>
                    </div>
                    {isActive && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5">
                        <polyline points="9,18 15,12 9,6"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* RIGHT — PERSONNEL PANEL */}
          <div style={{ background: '#fff', borderRadius: '16px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {selected ? (
              <>
                {/* DEPT HEADER */}
                <div style={{ padding: '20px 24px', background: GREEN, display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: '14px',
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}>
                    {selected.abbreviation ?? selected.name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: '0 0 3px' }}>
                      {selected.name}
                    </h2>
                    {selected.description && (
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', margin: 0 }}>
                        {selected.description}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '26px', fontWeight: 800, color: '#fff', margin: '0 0 2px', lineHeight: 1 }}>
                      {selected.personnel?.length ?? 0}
                    </p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                      total staff
                    </p>
                  </div>
                </div>

                {/* ACTION BAR */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', borderBottom: `1px solid ${BORDER}`,
                  background: CREAM, flexWrap: 'wrap',
                }}>
                  <span style={{ padding: '4px 12px', borderRadius: '999px', background: '#D1FAE5', color: '#065F46', fontSize: '12px', fontWeight: 700 }}>
                    {activeCount} Active
                  </span>
                  <span style={{ padding: '4px 12px', borderRadius: '999px', background: '#FEE2E2', color: '#991B1B', fontSize: '12px', fontWeight: 700 }}>
                    {inactiveCount} Inactive
                  </span>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button type="button" onClick={() => openDeptForm(selected)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', background: '#fff', border: `1px solid ${BORDER}`, fontSize: '12px', fontWeight: 600, color: INK, cursor: 'pointer' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>
                    <button type="button" onClick={() => toggleDeptActive(selected)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', background: selected.isActive ? '#FEF3C7' : GREEN_SOFT, border: `1px solid ${selected.isActive ? '#FDE68A' : '#A7F3D0'}`, fontSize: '12px', fontWeight: 600, color: selected.isActive ? '#92400E' : '#065F46', cursor: 'pointer' }}>
                      {selected.isActive
                        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                      }
                      {selected.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    {selected.isArchived ? (
                      <button type="button" onClick={() => setConfirm({ type: 'restore', row: selected })} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', background: GREEN_SOFT, border: '1px solid #A7F3D0', fontSize: '12px', fontWeight: 600, color: '#065F46', cursor: 'pointer' }}>
                        Restore
                      </button>
                    ) : (
                      <button type="button" onClick={() => setConfirm({ type: 'archive', row: selected })} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FEE2E2', fontSize: '12px', fontWeight: 600, color: '#991B1B', cursor: 'pointer' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                        Archive
                      </button>
                    )}
                    <button type="button" onClick={() => openPersonForm(selected, null)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', background: GREEN, border: 'none', fontSize: '12px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Personnel
                    </button>
                  </div>
                </div>

                {/* PERSONNEL LIST */}
                <div style={{ padding: '16px 24px' }}>
                  {(selected.personnel ?? []).length === 0 ? (
                    <EmptyState title="No personnel assigned" />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(selected.personnel ?? []).map(p => (
                        <PersonnelRow
                          key={p.id} p={p}
                          onEdit={pp => openPersonForm(selected, pp)}
                          onToggle={togglePerson}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ padding: '4rem', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '16px', background: GREEN_SOFT, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.8">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  </svg>
                </div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: INK, margin: '0 0 4px' }}>No department selected</p>
                <p style={{ fontSize: '12px', color: MUTED, margin: 0 }}>Select a department from the list to view its personnel.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* DEPT MODAL */}
      {deptForm && (
        <Modal
          title={`${deptForm.mode === 'edit' ? 'Edit' : 'New'} Department`}
          wide
          onClose={() => !deptSaving && setDeptForm(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setDeptForm(null)} disabled={deptSaving}>Cancel</button>
              <button type="submit" form="dept-form" className="btn btn-primary" disabled={deptSaving}>{deptSaving ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          <form id="dept-form" onSubmit={saveDept} noValidate>
            <Alert>{deptError}</Alert>
            <div className="form-grid">
              <div>
                <Field label="Name" htmlFor="d-name" error={deptErrors.name} required>
                  <input id="d-name" value={deptForm.values.name} onChange={e => setDV('name', e.target.value)} />
                </Field>
              </div>
              <div>
                <Field label="Abbreviation" htmlFor="d-abbr">
                  <input id="d-abbr" value={deptForm.values.abbreviation} onChange={e => setDV('abbreviation', e.target.value)} />
                </Field>
              </div>
              <div className="full">
                <Field label="Description" htmlFor="d-desc">
                  <textarea id="d-desc" value={deptForm.values.description} onChange={e => setDV('description', e.target.value)} />
                </Field>
              </div>
              <div>
                <Field label="Area ID" htmlFor="d-area">
                  <input id="d-area" type="number" value={deptForm.values.areaId} onChange={e => setDV('areaId', e.target.value)} />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: '20px', paddingTop: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: INK, cursor: 'pointer' }}>
                  <input type="checkbox" style={checkboxStyle} checked={deptForm.values.isActive} onChange={e => setDV('isActive', e.target.checked)} />
                  Active
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: INK, cursor: 'pointer' }}>
                  <input type="checkbox" style={checkboxStyle} checked={deptForm.values.isArchived} onChange={e => setDV('isArchived', e.target.checked)} />
                  Archived
                </label>
              </div>
            </div>

            <h3 style={{ fontSize: '12px', fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '1.25rem 0 .75rem', borderTop: `1px solid ${BORDER}`, paddingTop: '1rem' }}>
              Public Visibility
            </h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: INK, marginBottom: '1rem', cursor: 'pointer' }}>
              <input type="checkbox" style={checkboxStyle} checked={deptForm.values.isPubliclyVisible} onChange={e => setDV('isPubliclyVisible', e.target.checked)} />
              Publicly Visible
            </label>
            <div className="form-grid">
              <div className="full">
                <Field label="Public Description" htmlFor="d-pdesc">
                  <textarea id="d-pdesc" value={deptForm.values.publicDescription} onChange={e => setDV('publicDescription', e.target.value)} />
                </Field>
              </div>
              <div className="full">
                <Field label="Public Services" htmlFor="d-psvc">
                  <textarea id="d-psvc" value={deptForm.values.publicServices} onChange={e => setDV('publicServices', e.target.value)} />
                </Field>
              </div>
              <div>
                <Field label="Public Contact Info" htmlFor="d-pcontact">
                  <input id="d-pcontact" value={deptForm.values.publicContactInfo} onChange={e => setDV('publicContactInfo', e.target.value)} />
                </Field>
              </div>
              <div>
                <Field label="Public Office Location" htmlFor="d-ploc">
                  <input id="d-ploc" value={deptForm.values.publicOfficeLocation} onChange={e => setDV('publicOfficeLocation', e.target.value)} />
                </Field>
              </div>
              <div className="full">
                <Field label="Public Office Hours" htmlFor="d-phours">
                  <input id="d-phours" value={deptForm.values.publicOfficeHours} onChange={e => setDV('publicOfficeHours', e.target.value)} />
                </Field>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* PERSON MODAL */}
      {personForm && (
        <Modal
          title={`${personForm.mode === 'edit' ? 'Edit' : 'New'} Personnel`}
          wide
          onClose={() => !personSaving && setPersonForm(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setPersonForm(null)} disabled={personSaving}>Cancel</button>
              <button type="submit" form="person-form" className="btn btn-primary" disabled={personSaving}>{personSaving ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          <form id="person-form" onSubmit={savePerson} noValidate>
            <Alert>{personError}</Alert>
            <div className="form-grid">
              <div>
                <Field label="Full Name" htmlFor="p-name" error={personErrors.fullName} required>
                  <input id="p-name" value={personForm.values.fullName} onChange={e => setPV('fullName', e.target.value)} />
                </Field>
              </div>
              <div>
                <Field label="Position" htmlFor="p-pos" error={personErrors.position} required>
                  <input id="p-pos" value={personForm.values.position} onChange={e => setPV('position', e.target.value)} />
                </Field>
              </div>
              <div>
                <Field label="Contact Number" htmlFor="p-contact">
                  <input id="p-contact" value={personForm.values.contactNumber} onChange={e => setPV('contactNumber', e.target.value)} />
                </Field>
              </div>
              <div>
                <Field label="Email" htmlFor="p-email">
                  <input id="p-email" type="email" value={personForm.values.email} onChange={e => setPV('email', e.target.value)} />
                </Field>
              </div>
              <div>
                <Field label="Department" htmlFor="p-dept">
                  <select id="p-dept" value={personForm.values.departmentId} onChange={e => setPV('departmentId', e.target.value)}>
                    {list.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ paddingTop: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: INK, cursor: 'pointer' }}>
                  <input type="checkbox" style={checkboxStyle} checked={personForm.values.isActive} onChange={e => setPV('isActive', e.target.checked)} />
                  Active
                </label>
              </div>
            </div>

            <h3 style={{ fontSize: '12px', fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '1.25rem 0 .75rem', borderTop: `1px solid ${BORDER}`, paddingTop: '1rem' }}>
              Public Visibility
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
              {[
                ['isPubliclyVisible',   'Publicly Visible'],
                ['showProfilePhoto',    'Show Photo'],
                ['showPosition',        'Show Position'],
                ['showDepartment',      'Show Department'],
                ['showResponsibilities','Show Responsibilities'],
                ['showOfficialContact', 'Show Official Contact'],
              ].map(([key, label]) => (
                <label
                  key={key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '13px', color: INK,
                    background: CREAM, padding: '6px 12px',
                    borderRadius: '8px', border: `1px solid ${BORDER}`,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    style={checkboxStyle}
                    checked={!!personForm.values[key]}
                    onChange={e => setPV(key, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="form-grid">
              <div className="full">
                <Field label="Public Responsibilities" htmlFor="p-presp">
                  <textarea id="p-presp" value={personForm.values.publicResponsibilities} onChange={e => setPV('publicResponsibilities', e.target.value)} />
                </Field>
              </div>
              <div className="full">
                <Field label="Public Contact Info" htmlFor="p-pcontact">
                  <input id="p-pcontact" value={personForm.values.publicContactInfo} onChange={e => setPV('publicContactInfo', e.target.value)} />
                </Field>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRM */}
      {confirm && (
        <ConfirmDialog
          title={confirm.type === 'archive' ? 'Archive department' : 'Restore department'}
          message={confirm.type === 'archive'
            ? `Archive "${confirm.row.name}"? It will be hidden from active lists but records are kept.`
            : `Restore "${confirm.row.name}"?`}
          confirmLabel={confirm.type === 'archive' ? 'Archive' : 'Restore'}
          danger={confirm.type === 'archive'}
          busy={busy}
          onConfirm={() => confirm.type === 'archive' ? archiveDept(confirm.row) : restoreDept(confirm.row)}
          onCancel={() => setConfirm(null)}
        />
      )}

    </div>
  )
}