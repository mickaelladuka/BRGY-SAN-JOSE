import { useEffect, useState } from 'react'
import { Alert, Field, SkeletonList } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { api, getErrorMessage, getFieldErrors, API_BASE_URL } from '../../lib/api'
import { KeyRound, LogOut, Mail, MapPin, Phone } from 'lucide-react'

const PUROKS = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6']

export default function Profile() {
  const { session, logout } = useAuth()
  const [f, setF] = useState({ firstName: '', lastName: '', address: '', contactNumber: '', purok: '', idType: '', idNumber: '', photoUrl: '', idPhotoUrl: '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [errors, setErrors] = useState({})
  const [missing, setMissing] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showChangePw, setShowChangePw] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  useEffect(() => {
    api.get('/api/residents/me')
      .then(({ data }) => setF({
        firstName: data.firstName ?? '', lastName: data.lastName ?? '', address: data.address ?? '',
        contactNumber: data.contactNumber ?? '', purok: data.purok ?? '', idType: data.idType ?? '', idNumber: data.idNumber ?? '',
        photoUrl: data.photoUrl ?? '', idPhotoUrl: data.idPhotoUrl ?? '',
      }))
      .catch((err) => { if (err.response?.status === 404) setMissing(true); else setError(getErrorMessage(err)) })
      .finally(() => setLoading(false))
  }, [])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setPw = (k) => (e) => setPwForm({ ...pwForm, [k]: e.target.value })

  const uploadFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const token = (await import('../../lib/api')).tokenStore.get()
    const res = await fetch(`${(await import('../../lib/api')).API_BASE_URL}/api/upload/document`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Upload failed')
    }
    const data = await res.json()
    return data.url
  }

  const save = async (ev) => {
    ev.preventDefault()
    setError(''); setOk('')
    const e = {}
    if (!f.firstName.trim()) e.firstName = 'First name is required.'
    if (!f.lastName.trim()) e.lastName = 'Last name is required.'
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      let photoUrl = f.photoUrl
      if (photoFile) {
        photoUrl = await uploadFile(photoFile)
      }
      await api.put('/api/residents/me', {
        firstName: f.firstName.trim(), lastName: f.lastName.trim(),
        address: f.address.trim() || null, contactNumber: f.contactNumber.trim() || null,
        purok: f.purok || null, photoUrl: photoUrl || null,
      })
      if (photoUrl) setF((prev) => ({ ...prev, photoUrl }))
      setPhotoFile(null)
      setOk('Profile saved.'); setMissing(false)
    } catch (err) {
      setErrors(getFieldErrors(err)); setError(getErrorMessage(err))
    } finally { setBusy(false) }
  }

  const changePassword = async (ev) => {
    ev.preventDefault()
    setPwError('')
    if (!pwForm.current || !pwForm.next) return setPwError('All fields are required.')
    if (pwForm.next.length < 8) return setPwError('New password must be at least 8 characters.')
    if (pwForm.next !== pwForm.confirm) return setPwError('Passwords do not match.')
    setPwBusy(true)
    try {
      await api.post('/api/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next })
      setPwForm({ current: '', next: '', confirm: '' })
      setShowChangePw(false)
      setOk('Password changed successfully.')
    } catch (err) {
      setPwError(getErrorMessage(err))
    } finally { setPwBusy(false) }
  }

  if (loading) return <SkeletonList count={1} lines={8} />
  const fullName = `${f.firstName} ${f.lastName}`.trim() || session.email
  const initials = fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <>
      <h1>My profile</h1>
      {missing && <Alert type="info">Your resident profile is not set up yet. Fill in your details and save.</Alert>}
      <Alert>{error}</Alert><Alert type="success">{ok}</Alert>

      {/* Profile Card */}
      <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
        {f.photoUrl ? (
          <img src={f.photoUrl.startsWith('http') ? f.photoUrl : `${API_BASE_URL}${f.photoUrl}`} alt="Profile" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto .75rem', border: '3px solid var(--line)' }} />
        ) : (
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--primary-surface)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, margin: '0 auto .75rem', border: '3px solid var(--line)' }}>
            {initials}
          </div>
        )}
        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{fullName || 'Resident'}</h2>
        <p className="muted" style={{ margin: '.25rem 0 0' }}>{f.idNumber || 'No ID number'}</p>
        <span className="badge badge-active" style={{ marginTop: '.5rem' }}>Resident</span>
      </div>

      {/* Personal Info */}
      <div className="card">
        <h2 style={{ fontSize: '1rem', marginBottom: '.75rem' }}>Personal Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem 1rem' }}>
          <div><span className="muted" style={{ fontSize: '.75rem' }}>First name</span><div style={{ fontWeight: 500 }}>{f.firstName || '—'}</div></div>
          <div><span className="muted" style={{ fontSize: '.75rem' }}>Last name</span><div style={{ fontWeight: 500 }}>{f.lastName || '—'}</div></div>
          <div><span className="muted" style={{ fontSize: '.75rem' }}>Purok</span><div style={{ fontWeight: 500 }}>{f.purok || '—'}</div></div>
          <div><span className="muted" style={{ fontSize: '.75rem' }}>ID type</span><div style={{ fontWeight: 500 }}>{f.idType || '—'}</div></div>
          <div style={{ gridColumn: '1 / -1' }}><span className="muted" style={{ fontSize: '.75rem' }}>ID number</span><div style={{ fontWeight: 500 }}>{f.idNumber || '—'}</div></div>
        </div>
      </div>

      {/* Contact */}
      <div className="card">
        <h2 style={{ fontSize: '1rem', marginBottom: '.75rem' }}>Contact</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <Mail size={16} strokeWidth={1.75} style={{ color: 'var(--muted-c)' }} />
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Email</span><div style={{ fontWeight: 500 }}>{session.email}</div></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <Phone size={16} strokeWidth={1.75} style={{ color: 'var(--muted-c)' }} />
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Contact number</span><div style={{ fontWeight: 500 }}>{f.contactNumber || '—'}</div></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <MapPin size={16} strokeWidth={1.75} style={{ color: 'var(--muted-c)' }} />
            <div><span className="muted" style={{ fontSize: '.75rem' }}>Address</span><div style={{ fontWeight: 500 }}>{f.address || '—'}</div></div>
          </div>
        </div>
      </div>

      {/* Edit Profile Button */}
      <button type="button" className="btn btn-primary btn-block" onClick={() => setShowEdit(true)} style={{ marginBottom: '1rem' }}>
        Edit profile
      </button>

      {/* Edit Profile Modal */}
      {showEdit && (
        <div className="modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Edit profile</h2>
              <button type="button" className="icon-btn" onClick={() => setShowEdit(false)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={save} noValidate>
                <Field label="Address" htmlFor="p-ad" error={errors.address}><input id="p-ad" value={f.address} onChange={set('address')} maxLength={250} /></Field>
                <Field label="Contact number" htmlFor="p-cn" error={errors.contactNumber}><input id="p-cn" type="tel" value={f.contactNumber} onChange={set('contactNumber')} maxLength={30} /></Field>
                <Field label="Purok / Sitio" htmlFor="p-purok">
                  <select id="p-purok" value={f.purok} onChange={set('purok')}>
                    <option value="">Select your purok</option>
                    {PUROKS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Profile photo (2x2, white background)" htmlFor="p-photo" hint="JPEG, PNG or WebP. Max 5MB. Formal photo with white background.">
                  <input id="p-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhotoFile(e.target.files[0])} />
                </Field>
                {photoFile && <p className="muted" style={{ fontSize: '.8rem', marginTop: '-.5rem', marginBottom: '.75rem' }}>Selected: {photoFile.name}</p>}
                <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Account Security */}
      <div className="card">
        <h2 style={{ fontSize: '1rem', marginBottom: '.75rem' }}>Account security</h2>
        <button type="button" className="btn btn-outline btn-block" onClick={() => setShowChangePw(true)} style={{ justifyContent: 'flex-start', gap: '.75rem' }}>
          <KeyRound size={16} strokeWidth={1.75} /> Change password
        </button>
      </div>

      {/* Change Password Modal */}
      {showChangePw && (
        <div className="modal-backdrop" onClick={() => setShowChangePw(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Change password</h2>
              <button type="button" className="icon-btn" onClick={() => setShowChangePw(false)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={changePassword} noValidate>
                <Field label="Current password" htmlFor="cp-cur" error={pwError && !pwForm.current ? pwError : ''}>
                  <input id="cp-cur" type="password" value={pwForm.current} onChange={setPw('current')} autoComplete="current-password" />
                </Field>
                <Field label="New password" htmlFor="cp-new">
                  <input id="cp-new" type="password" value={pwForm.next} onChange={setPw('next')} autoComplete="new-password" />
                </Field>
                <Field label="Confirm new password" htmlFor="cp-conf">
                  <input id="cp-conf" type="password" value={pwForm.confirm} onChange={setPw('confirm')} autoComplete="new-password" />
                </Field>
                {pwError && <Alert>{pwError}</Alert>}
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={pwBusy}>{pwBusy ? 'Changing…' : 'Change'}</button>
                  <button type="button" className="btn btn-outline" onClick={() => { setShowChangePw(false); setPwError('') }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <button type="button" className="btn btn-danger btn-block" onClick={logout} style={{ marginBottom: '1rem' }}>
        <LogOut size={16} strokeWidth={1.75} /> Log out
      </button>

      <p className="muted">Other changes (such as correcting your records) are handled by the barangay office.</p>
    </>
  )
}