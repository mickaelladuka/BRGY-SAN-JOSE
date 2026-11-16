import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Field } from '../../components/ui'
import Receipt from '../../components/Receipt'
import { useOnline } from '../../components/OfflineBanner'
import { api, getErrorMessage, getFieldErrors } from '../../lib/api'
import { REPORT_CATEGORIES } from '../../lib/format'
import { MapPin, Loader2, Trash2 } from 'lucide-react'
import { addToQueue } from '../../lib/offlineQueue'
import LocationPicker from '../../components/LocationPicker'
import { useFetch } from '../../lib/useFetch'

export default function ReportNew() {
  const online = useOnline()
  const { data: areaLocations } = useFetch('/api/area-locations/active')
  const [f, setF] = useState({
    title: '', category: '', location: '', areaLocationId: '', incidentAt: '', severity: 'Medium',
    isOngoing: false, hasRecurrence: false, description: '', latitude: null, longitude: null,
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [locating, setLocating] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [review, setReview] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [uploads, setUploads] = useState([])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const uploadEvidence = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (uploads.length + files.length > 5) return setError('Attach no more than five files.')
    setError('')
    setBusy(true)
    try {
      const staged = []
      for (const file of files) {
        const body = new FormData()
        body.append('file', file)
        const { data } = await api.post('/api/reports/evidence', body)
        staged.push({ ...data, previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null })
      }
      setUploads((current) => [...current, ...staged])
    } catch (err) {
      setError(getErrorMessage(err, 'An evidence file could not be uploaded.'))
    } finally {
      setBusy(false)
    }
  }

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
          setF((prev) => ({ ...prev, location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, latitude, longitude }))
        } finally {
          setLocating(false)
        }
      },
      () => { setError('Could not get your location. Please enter it manually.'); setLocating(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const submit = async (ev) => {
    ev.preventDefault()
    setError('')
    const e = {}
    if (!f.category) e.category = 'Choose a category.'
    if (!f.location.trim()) e.location = 'Tell us where this is happening.'
    if (f.description.trim().length < 10) e.description = 'Describe what is happening (at least 10 characters).'
    setErrors(e)
    if (Object.keys(e).length) return
    if (!review) {
      setReview(true)
      setConfirmed(false)
      return
    }
    if (!confirmed) return setError('Confirm that the report details are accurate before submitting.')
    if (!online) {
      addToQueue({ endpoint: '/api/reports', payload: {
        title: f.title.trim() || null, category: f.category, location: f.location.trim(),
        areaLocationId: f.areaLocationId ? Number(f.areaLocationId) : null,
        incidentAt: f.incidentAt || null, severity: f.severity, isOngoing: f.isOngoing,
        hasRecurrence: f.hasRecurrence, description: f.description.trim(),
        latitude: f.latitude, longitude: f.longitude,
      } })
      setDone({ referenceNumber: 'QUEUED', submittedAt: new Date().toISOString(), queued: true })
      return
    }
    setBusy(true)
    try {
      const { data } = await api.post('/api/reports', {
        title: f.title.trim() || null, category: f.category, location: f.location.trim(),
        areaLocationId: f.areaLocationId ? Number(f.areaLocationId) : null,
        incidentAt: f.incidentAt || null, severity: f.severity, isOngoing: f.isOngoing,
        hasRecurrence: f.hasRecurrence, description: f.description.trim(),
        latitude: f.latitude, longitude: f.longitude, evidenceFileIds: uploads.map((file) => file.fileId),
      })
      uploads.forEach((file) => { if (file.previewUrl) URL.revokeObjectURL(file.previewUrl) })
      setUploads([])
      setDone(data)
    } catch (err) {
      setErrors(getFieldErrors(err)); setError(getErrorMessage(err))
    } finally { setBusy(false) }
  }

  if (done) return (
    done.queued ? (
      <div className="card" style={{ textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
        <h1>Report Queued</h1>
        <p>Your report has been saved and will be submitted automatically when your connection is restored.</p>
        <Link className="btn btn-primary btn-block" to="/resident" style={{ marginTop: '1rem' }}>Go Home</Link>
      </div>
    ) : (
      <Receipt reference={done.referenceNumber} submittedAt={done.submittedAt}
        actions={<><Link className="btn btn-primary" to={`/resident/track/reports/${done.id}`}>View status</Link><Link className="btn btn-outline" to="/resident">Home</Link></>} />
    )
  )
  return (
    <>
      <header className="resident-page-heading"><span className="resident-eyebrow">COMMUNITY CONCERN</span><h1>Submit a report</h1><p>Share what you observed so barangay staff can review it.</p></header>
      <form className="card resident-submission-form" onSubmit={submit} noValidate>
        <Alert>{error}</Alert>
        {!review ? (
          <>
            <Field label="Report title" htmlFor="r-title"><input id="r-title" value={f.title} onChange={set('title')} maxLength={150} placeholder="Briefly summarize the issue" /></Field>
            <Field label="Category" htmlFor="r-cat" error={errors.category} required>
              <select id="r-cat" value={f.category} onChange={set('category')}><option value="">Select…</option>{REPORT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Area 6 location" htmlFor="r-area">
              <select id="r-area" value={f.areaLocationId} onChange={set('areaLocationId')}>
                <option value="">Choose if known</option>
                {(areaLocations || []).map((location) => <option key={location.id} value={location.id}>{location.name} ({location.boundaryStatus === 'VERIFIED' ? 'verified boundary' : 'unverified boundary'})</option>)}
              </select>
              {f.areaLocationId && <small className="muted">Area selection identifies a managed location; it does not verify the incident pin.</small>}
            </Field>
            <Field label="Date and time observed" htmlFor="r-incident"><input id="r-incident" type="datetime-local" value={f.incidentAt} onChange={set('incidentAt')} /></Field>
            <Field label="Severity" htmlFor="r-severity">
              <select id="r-severity" value={f.severity} onChange={set('severity')}>
                {['Low', 'Medium', 'High', 'Critical'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </Field>
            <div className="row" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <label><input type="checkbox" checked={f.isOngoing} onChange={(e) => setF((prev) => ({ ...prev, isOngoing: e.target.checked }))} /> Issue is ongoing</label>
              <label><input type="checkbox" checked={f.hasRecurrence} onChange={(e) => setF((prev) => ({ ...prev, hasRecurrence: e.target.checked }))} /> Issue has occurred repeatedly</label>
            </div>
            <Field label="Incident location or landmark" htmlFor="r-loc" error={errors.location} required>
          <div className="resident-location-controls" style={{ display: 'flex', gap: '.5rem' }}>
            <input id="r-loc" value={f.location} onChange={(e) => setF((prev) => ({ ...prev, location: e.target.value, latitude: null, longitude: null }))} maxLength={250} placeholder="Street, house number, landmark (editable)" style={{ flex: 1 }} />
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
                lat={f.latitude}
                lng={f.longitude}
                onChange={(addr, coords) => setF((prev) => ({ ...prev, location: addr, latitude: coords?.lat ?? prev.latitude, longitude: coords?.lng ?? prev.longitude }))}
                onClose={() => setShowMap(false)}
              />
            )}
            <Field label="What is happening?" htmlFor="r-desc" error={errors.description} required><textarea id="r-desc" value={f.description} onChange={(e) => setF((prev) => ({ ...prev, description: e.target.value }))} maxLength={1000} /></Field>
            <Field label="Supporting evidence (up to five images or PDFs)" htmlFor="r-evidence">
              <input id="r-evidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={uploadEvidence} disabled={busy || uploads.length >= 5} />
              {uploads.map((file) => <div key={file.fileId} className="resident-upload-item">
                {file.previewUrl ? <img className="resident-upload-preview" src={file.previewUrl} alt={`Preview of ${file.fileName}`} /> : <span className="resident-upload-filetype">PDF</span>}
                <span className="resident-upload-name">{file.fileName}</span>
                <button type="button" className="btn btn-outline btn-sm" aria-label={`Remove ${file.fileName}`} onClick={() => { if (file.previewUrl) URL.revokeObjectURL(file.previewUrl); setUploads((current) => current.filter((entry) => entry.fileId !== file.fileId)) }}><Trash2 size={14} /> Remove</button>
              </div>)}
              <small className="muted">Evidence is stored privately and is not publicly accessible.</small>
            </Field>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Uploading…' : 'Review report'}</button>
          </>
        ) : (
          <>
            <h2>Review your report</h2>
            <dl className="detail-list">
              <dt>Title</dt><dd>{f.title.trim() || f.category}</dd>
              <dt>Category</dt><dd>{f.category}</dd>
              <dt>Area location</dt><dd>{(areaLocations || []).find((location) => String(location.id) === f.areaLocationId)?.name || 'Not selected'}</dd>
              <dt>Incident location</dt><dd>{f.location}</dd>
              <dt>Observed</dt><dd>{f.incidentAt ? new Date(f.incidentAt).toLocaleString() : 'Not specified'}</dd>
              <dt>Severity</dt><dd>{f.severity}</dd>
              <dt>Description</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{f.description}</dd>
              <dt>Evidence</dt><dd>{uploads.length ? uploads.map((file) => file.fileName).join(', ') : 'None attached'}</dd>
            </dl>
            <label style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', margin: '1rem 0' }}>
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              <span>I confirm these details are accurate and authorize submission under my account.</span>
            </label>
            <div className="row">
              <button type="button" className="btn btn-outline" onClick={() => setReview(false)}>Edit report</button>
              <button className="btn btn-primary" disabled={busy || !confirmed}>{busy ? 'Sending…' : 'Submit report'}</button>
            </div>
          </>
        )}
      </form>
    </>
  )
}
