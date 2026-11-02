import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Field } from '../../components/ui'
import Receipt from '../../components/Receipt'
import { useOnline } from '../../components/OfflineBanner'
import { api, getErrorMessage, getFieldErrors } from '../../lib/api'
import { COMPLAINT_CATEGORIES } from '../../lib/format'
import { addToQueue, getQueueCount } from '../../lib/offlineQueue'
import { MapPin, Loader2 } from 'lucide-react'
import LocationPicker from '../../components/LocationPicker'

export default function ComplaintNew() {
  const online = useOnline()
  const [f, setF] = useState({ category: '', subject: '', description: '', location: '', latitude: null, longitude: null })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [locating, setLocating] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          // Reverse geocode using Nominatim (free, no API key)
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`)
          const data = await res.json()
          const addr = data.address || {}
          const parts = []
          if (addr.house_number) parts.push(addr.house_number)
          if (addr.road) parts.push(addr.road)
          if (addr.suburb || addr.neighbourhood || addr.village) parts.push(addr.suburb || addr.neighbourhood || addr.village)
          if (addr.city || addr.town || addr.municipality) parts.push(addr.city || addr.town || addr.municipality)
          if (addr.state) parts.push(addr.state)
          const cleanAddr = parts.length > 0 ? parts.join(', ') : (data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
          setF((prev) => ({ ...prev, location: cleanAddr, latitude, longitude }))
        } catch {
          const { latitude, longitude } = pos.coords
          setF((prev) => ({ ...prev, location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }))
        } finally {
          setLocating(false)
        }
      },
      () => {
        setError('Could not get your location. Please enter it manually.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const submit = async (ev) => {
    ev.preventDefault()
    setError('')
    const e = {}
    if (!f.category) e.category = 'Choose a category.'
    if (f.subject.trim().length < 3) e.subject = 'Enter a short subject.'
    if (f.description.trim().length < 10) e.description = 'Describe the complaint (at least 10 characters).'
    setErrors(e)
    if (Object.keys(e).length) return
    if (!online) {
      // Queue for later submission when connection is restored
      addToQueue({ endpoint: '/api/complaints', payload: { category: f.category, subject: f.subject.trim(), description: f.description.trim(), location: f.location.trim() || null, latitude: f.latitude, longitude: f.longitude } })
      setDone({ referenceNumber: 'QUEUED', submittedAt: new Date().toISOString(), queued: true })
      return
    }
    setBusy(true)
    try {
      const { data } = await api.post('/api/complaints', { category: f.category, subject: f.subject.trim(), description: f.description.trim(), location: f.location.trim() || null, latitude: f.latitude, longitude: f.longitude })
      setDone(data)
    } catch (err) {
      setErrors(getFieldErrors(err)); setError(getErrorMessage(err))
    } finally { setBusy(false) }
  }

  if (done) return (
    done.queued ? (
      <div className="card" style={{ textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
        <h1>Complaint Queued</h1>
        <p>Your complaint has been saved and will be submitted automatically when your connection is restored.</p>
        <p className="muted">You can check the status later in "Track status".</p>
        <Link className="btn btn-primary btn-block" to="/resident" style={{ marginTop: '1rem' }}>Go Home</Link>
      </div>
    ) : (
      <Receipt kind="complaint" reference={done.referenceNumber} submittedAt={done.submittedAt}
        actions={<><Link className="btn btn-primary" to={`/resident/track/complaints/${done.id}`}>View status</Link><Link className="btn btn-outline" to="/resident">Home</Link></>} />
    )
  )
  return (
    <>
      <h1>File a complaint</h1>
      <form className="card" onSubmit={submit} noValidate>
        <Alert>{error}</Alert>
        <Field label="Category" htmlFor="c-cat" error={errors.category} required>
          <select id="c-cat" value={f.category} onChange={set('category')}><option value="">Select…</option>{COMPLAINT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label="Subject" htmlFor="c-sub" error={errors.subject} required><input id="c-sub" value={f.subject} onChange={set('subject')} maxLength={150} /></Field>
        <Field label="Location (if applicable)" htmlFor="c-loc" error={errors.location}>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <input id="c-loc" value={f.location} onChange={set('location')} maxLength={250} placeholder="Street, landmark, or area (editable)" style={{ flex: 1 }} />
            <button type="button" className="btn btn-outline btn-sm" onClick={useCurrentLocation} disabled={locating} style={{ flexShrink: 0, minWidth: 'auto' }}>
              {locating ? <Loader2 size={16} strokeWidth={1.75} style={{ animation: 'spin 1s linear infinite' }} /> : <MapPin size={16} strokeWidth={1.75} />}
              {locating ? ' Locating…' : ' My location'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowMap(true)} style={{ flexShrink: 0, minWidth: 'auto' }}>
              <MapPin size={16} strokeWidth={1.75} /> Pick on map
            </button>
          </div>
        </Field>
        {showMap && (
          <LocationPicker
            value={f.location}
            onChange={(addr, coords) => setF((prev) => ({ ...prev, location: addr, latitude: coords?.lat ?? prev.latitude, longitude: coords?.lng ?? prev.longitude }))}
            onClose={() => setShowMap(false)}
          />
        )}
        <Field label="Description" htmlFor="c-desc" error={errors.description} required><textarea id="c-desc" value={f.description} onChange={set('description')} maxLength={2000} /></Field>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Submitting…' : 'Submit complaint'}</button>
      </form>
    </>
  )
}
