import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { api, getErrorMessage } from '../../lib/api'
import { Alert, Field, Spinner } from '../../components/ui'
import AuthStyles from './AuthStyles'

const SECTIONS = {
  personal: 'Personal information',
  address: 'Address',
  map: 'Map pin',
  id: 'ID details',
  documents: 'Uploaded documents',
  username: 'Account username',
}
const CORRECTION_PIN = L.divIcon({
  className: '',
  html: '<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#8C2F12;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.45)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})

function MapClicks({ onPick }) {
  useMapEvents({ click: (event) => onPick(event.latlng) })
  return null
}

function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, 16)
  }, [center, map])
  return null
}

export default function ResidentApplicationCorrection({ token }) {
  const [record, setRecord] = useState(null)
  const [fields, setFields] = useState([])
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState({})
  const [pin, setPin] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [files, setFiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true
    api.get('/api/auth/resident-correction', { params: { token } }).then(({ data }) => {
      if (!active) return
      const application = data.application || {}
      setRecord(data)
      setFields(data.fields || [])
      setForm({
        firstName: application.firstName || '',
        middleName: application.middleName || '',
        lastName: application.lastName || '',
        suffix: application.suffix || '',
        dateOfBirth: application.dateOfBirth?.slice(0, 10) || '',
        mobileNumber: application.contactNumber || '',
        email: application.email || '',
        username: application.username || '',
        areaLocationId: application.areaLocationId ? String(application.areaLocationId) : '',
        houseNumber: application.houseNumber || '',
        landmark: application.landmark || '',
        idType: application.idType || '',
        idNumber: application.idNumber || '',
      })
      if (application.latitude != null && application.longitude != null) {
        setPin({
          lat: Number(application.latitude),
          lng: Number(application.longitude),
          method: application.verificationMethod || 'MANUAL_PIN',
        })
      }
      if (data.fields?.includes(SECTIONS.address) || data.fields?.includes(SECTIONS.map)) {
        api.get('/api/area-locations/active').then(({ data: locationData }) => {
          if (active) setLocations(Array.isArray(locationData) ? locationData : locationData?.items || [])
        }).catch((err) => {
          if (active) setError(`Could not load approved locations. ${getErrorMessage(err)}`)
        })
      }
    }).catch((err) => {
      if (active) setError(getErrorMessage(err))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [token])

  const selectedLocation = useMemo(
    () => locations.find((location) => String(location.id) === String(form.areaLocationId)),
    [locations, form.areaLocationId],
  )

  const change = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))

  const chooseFile = (key) => (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Use a JPEG, PNG, or WebP file for documents.')
      event.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Each document must be 5 MB or smaller.')
      event.target.value = ''
      return
    }
    setError('')
    setFiles((previous) => ({ ...previous, [key]: file }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!fields.length) {
      setError('No correction sections were provided. Contact the Area 6 office for help.')
      return
    }
    if (fields.includes(SECTIONS.map) && (!pin || !confirmed)) {
      setError('Place your residence pin and confirm that it marks your actual home.')
      return
    }
    if (fields.includes(SECTIONS.documents) && !Object.values(files).some(Boolean)) {
      setError('Upload at least one replacement document.')
      return
    }

    setBusy(true)
    try {
      if (fields.includes(SECTIONS.map)) {
        const { data: validation } = await api.post('/api/area-locations/validate-registration-location', {
          areaLocationId: Number(form.areaLocationId),
          latitude: pin.lat,
          longitude: pin.lng,
          verificationMethod: pin.method,
        })
        if (!validation.isValid && !validation.requiresManualReview) {
          setError(validation.message || 'The selected pin does not match your residential location.')
          return
        }
      }

      const references = {}
      for (const [key, file] of Object.entries(files)) {
        if (!file) continue
        const formData = new FormData()
        formData.append('file', file)
        const { data } = await api.post('/api/upload/document', formData, { headers: { 'Content-Type': undefined } })
        references[key] = data.fileId ?? data.id
      }

      const { data } = await api.put('/api/auth/resident-correction', {
        token,
        ...form,
        areaLocationId: form.areaLocationId ? Number(form.areaLocationId) : null,
        latitude: pin?.lat ?? null,
        longitude: pin?.lng ?? null,
        verificationMethod: pin?.method ?? null,
        idFrontFileId: references.idFront ?? null,
        idBackFileId: references.idBack ?? null,
        proofOfResidencyFileId: references.proofOfResidency ?? null,
        photo2x2FileId: references.photo2x2 ?? null,
      })
      setSuccess(data.message || 'Your corrections were submitted for review.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const fileInput = (key, label) => (
    <Field key={key} label={label} htmlFor={`correction-${key}`} hint="JPEG, PNG, or WebP · up to 5 MB">
      <input id={`correction-${key}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile(key)} />
      {files[key] && <small className="muted">Selected: {files[key].name}</small>}
    </Field>
  )

  if (loading) {
    return <main className="login-page auth-page"><AuthStyles /><div className="login-right"><Spinner /></div></main>
  }

  return (
    <main className="login-page auth-page">
      <AuthStyles />
      <section className="login-left" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem' }}>
        <p className="login-eyebrow">BARANGAY SAN JOSE ANNEX · AREA 6</p>
        <h1>Resident application</h1>
        <p>Update only the information requested by the administrator.</p>
      </section>
      <section className="login-right">
        <div className="login-card" style={{ width: '100%', maxWidth: '720px', margin: 'auto', background: '#fff' }}>
          {success ? (
            <div role="status">
              <h2>Corrections submitted</h2>
              <p>{success}</p>
              <p className="muted">Your application is back in the review queue. You will receive an email after it is reviewed.</p>
              <Link to="/login" className="btn btn-primary btn-block">Return to login</Link>
            </div>
          ) : (
            <>
              <h2 style={{ marginTop: 0 }}>Requested corrections</h2>
              {error && record && <Alert>{error}</Alert>}
              {!record ? (
                <Alert>{error || 'This correction link is invalid, expired, or already used. Contact the Area 6 office for a new link.'}</Alert>
              ) : (
                <>
                  <p className="muted">Only the sections listed here can be updated. Other application information will remain unchanged.</p>
                  <div style={{ padding: '.9rem 1rem', margin: '1rem 0', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--cream, #fff8f2)' }}>
                    <strong>Administrator’s notes</strong>
                    <p style={{ margin: '.35rem 0 0', whiteSpace: 'pre-wrap' }}>{record.reason}</p>
                    <ul style={{ marginBottom: 0 }}>
                      {fields.map((field) => <li key={field}>{field}</li>)}
                    </ul>
                  </div>
                  <form onSubmit={submit}>
                    <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                      {fields.includes(SECTIONS.personal) && (
                        <section style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                          <h3>Personal information</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1rem' }}>
                            <Field label="First name" htmlFor="correction-firstName" required><input id="correction-firstName" value={form.firstName} onChange={change('firstName')} required /></Field>
                            <Field label="Middle name" htmlFor="correction-middleName" hint="Optional"><input id="correction-middleName" value={form.middleName} onChange={change('middleName')} /></Field>
                            <Field label="Last name" htmlFor="correction-lastName" required><input id="correction-lastName" value={form.lastName} onChange={change('lastName')} required /></Field>
                            <Field label="Suffix" htmlFor="correction-suffix" hint="Optional"><input id="correction-suffix" value={form.suffix} onChange={change('suffix')} /></Field>
                            <Field label="Date of birth" htmlFor="correction-dateOfBirth" required><input id="correction-dateOfBirth" type="date" value={form.dateOfBirth} onChange={change('dateOfBirth')} required /></Field>
                            <Field label="Mobile number" htmlFor="correction-mobileNumber" required><input id="correction-mobileNumber" type="tel" value={form.mobileNumber} onChange={change('mobileNumber')} required /></Field>
                          </div>
                          <Field label="Email" htmlFor="correction-email" required><input id="correction-email" type="email" value={form.email} onChange={change('email')} required /></Field>
                        </section>
                      )}

                      {fields.includes(SECTIONS.address) && (
                        <section style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                          <h3>Address</h3>
                          <Field label="Residential location" htmlFor="correction-areaLocationId" required>
                            <select id="correction-areaLocationId" value={form.areaLocationId} onChange={change('areaLocationId')} required>
                              <option value="">Select your residential location</option>
                              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                            </select>
                          </Field>
                          <Field label="House / lot number" htmlFor="correction-houseNumber" required><input id="correction-houseNumber" value={form.houseNumber} onChange={change('houseNumber')} required /></Field>
                          <Field label="Landmark" htmlFor="correction-landmark" hint="Optional"><input id="correction-landmark" value={form.landmark} onChange={change('landmark')} /></Field>
                        </section>
                      )}

                      {fields.includes(SECTIONS.map) && (
                        <section style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                          <h3>Map pin</h3>
                          <p className="muted">Click the map or drag the pin to your actual residence in {selectedLocation?.name || 'your selected location'}.</p>
                          <div style={{ height: '320px', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                            <MapContainer
                              center={pin ? [pin.lat, pin.lng] : [selectedLocation?.centerLatitude || 14.7, selectedLocation?.centerLongitude || 121.15]}
                              zoom={pin ? 17 : 13}
                              style={{ height: '100%', width: '100%' }}
                            >
                              <MapUpdater center={pin ? [pin.lat, pin.lng] : selectedLocation?.centerLatitude != null && selectedLocation?.centerLongitude != null ? [selectedLocation.centerLatitude, selectedLocation.centerLongitude] : null} />
                              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                              <MapClicks onPick={(point) => { setPin({ lat: point.lat, lng: point.lng, method: 'MANUAL_PIN' }); setConfirmed(false) }} />
                              {pin && <Marker
                                position={[pin.lat, pin.lng]}
                                icon={CORRECTION_PIN}
                                draggable
                                eventHandlers={{ dragend: (event) => {
                                  const point = event.target.getLatLng()
                                  setPin({ lat: point.lat, lng: point.lng, method: 'MANUAL_PIN' })
                                  setConfirmed(false)
                                } }}
                              />}
                            </MapContainer>
                          </div>
                          <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: '.75rem' }} onClick={() => {
                            if (!navigator.geolocation) { setError('Your device does not support location detection. Place the pin manually.'); return }
                            navigator.geolocation.getCurrentPosition(
                              ({ coords }) => { setPin({ lat: coords.latitude, lng: coords.longitude, method: 'GPS' }); setConfirmed(false); setError('') },
                              () => setError('Could not detect your location. Place the pin manually on the map.'),
                              { enableHighAccuracy: true, timeout: 15000 },
                            )
                          }}>Use my current location</button>
                          {pin && <p className="muted">Latitude {pin.lat.toFixed(6)} · Longitude {pin.lng.toFixed(6)}</p>}
                          <label style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', marginTop: '.75rem' }}>
                            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                            <span>I confirm that this pin marks my actual residential location.</span>
                          </label>
                        </section>
                      )}

                      {fields.includes(SECTIONS.id) && (
                        <section style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                          <h3>ID details</h3>
                          <Field label="ID type" htmlFor="correction-idType" required>
                            <select id="correction-idType" value={form.idType} onChange={change('idType')} required>
                              <option value="">Select an ID</option>
                              {['National ID', 'Passport', "Driver's license", 'UMID', "Voter's ID", 'Postal ID', 'Barangay ID', 'Other government-issued ID'].map((type) => <option key={type}>{type}</option>)}
                            </select>
                          </Field>
                          <Field label="ID number" htmlFor="correction-idNumber" required><input id="correction-idNumber" value={form.idNumber} onChange={change('idNumber')} required /></Field>
                        </section>
                      )}

                      {fields.includes(SECTIONS.documents) && (
                        <section style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                          <h3>Uploaded documents</h3>
                          <p className="muted">Upload at least one corrected or missing document.</p>
                          {fileInput('idFront', 'Government ID — front')}
                          {fileInput('idBack', 'Government ID — back')}
                          {fileInput('proofOfResidency', 'Proof of residency')}
                          {fileInput('photo2x2', '2×2 photo')}
                        </section>
                      )}

                      {fields.includes(SECTIONS.username) && (
                        <section style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                          <h3>Account username</h3>
                          <Field label="Requested username" htmlFor="correction-username" required hint="4–30 letters, numbers, dots, or underscores">
                            <input id="correction-username" value={form.username} onChange={change('username')} minLength={4} maxLength={30} pattern="[A-Za-z0-9._]{4,30}" required />
                          </Field>
                        </section>
                      )}
                    </fieldset>
                    <button type="submit" className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: '1rem' }}>
                      {busy ? 'Submitting corrections…' : 'Submit corrections'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}
