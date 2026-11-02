import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Alert, Field, Spinner } from '../../components/ui'
import { api, getErrorMessage } from '../../lib/api'
import {
  Check, Clock, Eye, EyeOff, FileText, Landmark, LocateFixed, MapPin,
  Megaphone, MessageSquareText, ShieldAlert, ShieldCheck,
} from 'lucide-react'
import AuthStyles from './AuthStyles'

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const STEPS = ['Personal', 'Address', 'Map', 'Documents', 'Account', 'Review']
const ID_TYPES = ['National ID', 'Passport', "Driver's license", 'UMID', "Voter's ID", 'Postal ID', 'Barangay ID', 'Other government-issued ID']
const DEFAULT_LOCATION_CODE = 'PHASE_1_L2_BAGONG_BUHAY' // preselected, but residents may choose any approved Area 6 location
const MAX_MB = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const REQUIRED_DOCS = ['idFront', 'photo2x2'] // set to [] if Area 6 policy allows registration without documents
const DRAFT_KEY = 'annex6.registration.draft.v1' // sessionStorage only. Never holds passwords or files.

// No fabricated Area 6 coordinates: until the backend supplies a center/boundary the map shows the whole country.
const FALLBACK_VIEW = { center: [12.8797, 121.774], zoom: 6 }

const tint = (pct) => `color-mix(in srgb, var(--primary, #106A2E) ${pct}%, transparent)`
const leftBg = `linear-gradient(160deg, ${tint(10)} 0%, transparent 55%), radial-gradient(circle at 20% 90%, ${tint(14)} 0%, transparent 50%)`
const PRIMARY = 'var(--primary, #106A2E)'

const PERKS = [
  { icon: FileText, title: 'Request barangay services', text: 'Apply for certificates and other services without long lines.' },
  { icon: Megaphone, title: 'Stay informed', text: 'Get announcements and updates from Annex 6 in one place.' },
  { icon: MessageSquareText, title: 'Send concerns', text: 'Reach barangay officials directly and track your requests.' },
]

const EMPTY = {
  firstName: '', middleName: '', lastName: '', suffix: '', dateOfBirth: '',
  mobileNumber: '', email: '',
  areaLocationId: '', houseNumber: '', streetOrBlock: '', landmark: '',
  idType: '', idNumber: '',
  username: '', password: '', confirm: '',
}

const loadDraft = () => {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY)) || {} } catch { return {} }
}

const round6 = (n) => Math.round(n * 1e6) / 1e6

/* ------------------------------------------------------------------ */
/* Shared layout pieces (same visual language as Login)                */
/* ------------------------------------------------------------------ */
function Background() {
  return (
    <div className="login-bg" aria-hidden="true">
      <div className="login-bg-grid" />
      <div className="login-bg-glow" />
      <div className="login-bg-nodes">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="login-node" style={{ '--i': i }} />
        ))}
      </div>
    </div>
  )
}

function WelcomePanel() {
  return (
    <div className="login-left" style={{ position: 'relative', overflow: 'hidden', background: leftBg }}>
      <span aria-hidden="true" style={{ position: 'absolute', top: '-120px', right: '-100px', width: '340px', height: '340px', borderRadius: '50%', background: tint(18), filter: 'blur(2px)' }} />
      <span aria-hidden="true" style={{ position: 'absolute', bottom: '-140px', left: '-90px', width: '380px', height: '380px', borderRadius: '50%', background: tint(12) }} />
      <span aria-hidden="true" style={{ position: 'absolute', bottom: '18%', right: '8%', width: '90px', height: '90px', borderRadius: '50%', border: `2px dashed ${tint(40)}` }} />
      <div className="login-left-inner" style={{ position: 'relative', zIndex: 1 }}>
        <div className="login-eyebrow animate-in" style={{ '--delay': '0ms' }}>BARANGAY SAN JOSE ANNEX · AREA 6</div>
        <h1 className="animate-in" style={{ '--delay': '150ms' }}>
          Your Community.
          <br />
          <span className="login-highlight">Your Connection.</span>
        </h1>
        <p className="animate-in" style={{ '--delay': '300ms' }}>
          Welcome to a simpler way to connect with your community, access barangay services, and stay informed about what matters in Annex 6.
        </p>
        <ul className="animate-in" style={{ '--delay': '400ms', listStyle: 'none', margin: '1.75rem 0 0', padding: 0, display: 'grid', gap: '.75rem', maxWidth: '440px' }}>
          {PERKS.map(({ icon: Icon, title, text }) => (
            <li key={title} style={{ display: 'flex', gap: '.85rem', alignItems: 'flex-start', padding: '.85rem 1rem', borderRadius: '14px', background: 'rgba(255,255,255,.65)', border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 4px 14px rgba(0,0,0,.04)', backdropFilter: 'blur(6px)' }}>
              <span style={{ flex: '0 0 auto', width: '38px', height: '38px', borderRadius: '10px', display: 'grid', placeItems: 'center', background: tint(16), color: 'var(--primary-dark)' }}>
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <span>
                <strong style={{ display: 'block', fontSize: '.95rem', color: 'var(--primary-dark)' }}>{title}</strong>
                <span style={{ fontSize: '.85rem', color: 'var(--ink-light)' }}>{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="login-tagline animate-in" style={{ '--delay': '550ms' }}>Connecting residents. Strengthening community service.</div>
        <div className="login-deco-line animate-in" style={{ '--delay': '600ms' }} />
      </div>
    </div>
  )
}

function Stepper({ step }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.9rem' }}>
        <span aria-hidden="true" style={{ flex: '0 0 auto', width: '44px', height: '44px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: PRIMARY, color: '#fff' }}>
          <Landmark size={22} strokeWidth={1.75} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: 'block', letterSpacing: '.04em', fontSize: '.9rem' }}>AREA 6 PORTAL</strong>
          <span className="muted" style={{ fontSize: '.8rem' }}>Resident Registration</span>
        </div>
        <span style={{ flex: '0 0 auto', padding: '.2rem .6rem', borderRadius: '999px', background: tint(14), color: 'var(--primary-dark)', fontWeight: 600, fontSize: '.75rem', whiteSpace: 'nowrap' }}>
          Step {step + 1} of {STEPS.length}
        </span>
      </div>
      <ol aria-label="Registration progress" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`, gap: '.35rem' }}>
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? 'step' : undefined} style={{ minWidth: 0 }}>
            <div style={{ height: '5px', borderRadius: '999px', background: i <= step ? PRIMARY : 'rgba(0,0,0,.1)' }} />
            <span style={{ display: 'block', marginTop: '.3rem', fontSize: '.68rem', color: i === step ? 'var(--primary-dark)' : 'var(--muted-c)', fontWeight: i === step ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {i < step ? '✓ ' : ''}{label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Notice({ tone = 'info', icon: Icon, title, children }) {
  const tones = {
    info: { bg: 'rgba(0,0,0,.04)', bd: 'rgba(0,0,0,.08)', fg: 'inherit' },
    warn: { bg: 'rgba(244,211,94,.22)', bd: 'rgba(244,211,94,.7)', fg: 'inherit' },
    ok: { bg: tint(10), bd: tint(35), fg: 'inherit' },
    bad: { bg: 'rgba(200,40,40,.08)', bd: 'rgba(200,40,40,.35)', fg: 'inherit' },
  }
  const t = tones[tone]
  return (
    <div role={tone === 'bad' ? 'alert' : 'status'} style={{ display: 'flex', gap: '.7rem', padding: '.8rem .9rem', borderRadius: '12px', background: t.bg, border: `1px solid ${t.bd}`, color: t.fg, fontSize: '.85rem', margin: '.75rem 0' }}>
      {Icon && <Icon size={20} strokeWidth={1.75} aria-hidden="true" style={{ flex: '0 0 auto', marginTop: '2px' }} />}
      <div>
        {title && <strong style={{ display: 'block', marginBottom: '.15rem' }}>{title}</strong>}
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Leaflet map (OpenStreetMap). No Google Maps.                        */
/* ------------------------------------------------------------------ */
function MapPicker({ center, boundary, pin, onPick }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const boundaryRef = useRef(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    const map = L.map(elRef.current).setView(FALLBACK_VIEW.center, FALLBACK_VIEW.zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    map.on('click', (e) => onPickRef.current(e.latlng.lat, e.latlng.lng))
    mapRef.current = map
    const t = setTimeout(() => map.invalidateSize(), 350)
    return () => {
      clearTimeout(t)
      map.remove()
      mapRef.current = null
      markerRef.current = null
      boundaryRef.current = null
    }
  }, [])

  // Center on the location only if the backend provided one and nothing is pinned yet
  useEffect(() => {
    if (mapRef.current && center && !pin) mapRef.current.setView([center.lat, center.lng], 17)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lng])

  // Verified boundary polygon (never drawn unless the backend returns one)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (boundaryRef.current) { boundaryRef.current.remove(); boundaryRef.current = null }
    if (!boundary) return
    try {
      const layer = L.geoJSON(boundary, { style: { color: '#106A2E', weight: 3, fillColor: '#106A2E', fillOpacity: 0.12 } }).addTo(map)
      boundaryRef.current = layer
      if (!pin) map.fitBounds(layer.getBounds(), { padding: [20, 20] })
    } catch { /* invalid geometry: ignore, backend remains the authority */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundary])

  // Marker
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!pin) {
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null }
      return
    }
    if (!markerRef.current) {
      const icon = L.divIcon({
        className: '',
        html: '<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#106A2E;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.45)"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      })
      const m = L.marker([pin.lat, pin.lng], { draggable: true, icon, keyboard: true, title: 'Your residence' }).addTo(map)
      m.on('dragend', () => { const p = m.getLatLng(); onPickRef.current(p.lat, p.lng) })
      markerRef.current = m
    } else {
      markerRef.current.setLatLng([pin.lat, pin.lng])
    }
    if (pin.method === 'GPS') map.setView([pin.lat, pin.lng], 18)
  }, [pin])

  return (
    <div style={{ isolation: 'isolate' }}>
      <div
        ref={elRef}
        role="application"
        aria-label="Map. Click or tap to place your residence pin, or drag the pin to adjust."
        style={{ height: '320px', width: '100%', borderRadius: '12px', border: '1px solid var(--line)', overflow: 'hidden' }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function Register() {
  const draft = useMemo(loadDraft, [])
  const [step, setStep] = useState(Math.min(draft.step ?? 0, STEPS.length - 1))
  const [f, setF] = useState({ ...EMPTY, ...(draft.f || {}), password: '', confirm: '' })
  const [pin, setPin] = useState(draft.pin || null) // { lat, lng, method: 'GPS' | 'MANUAL_PIN' }
  const [files, setFiles] = useState({ idFront: null, idBack: null, proofOfResidency: null, photo2x2: null })
  const [fileErrors, setFileErrors] = useState({})
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [consent, setConsent] = useState(false)
  const [confirmPin, setConfirmPin] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [locations, setLocations] = useState([])
  const [locState, setLocState] = useState('loading') // loading | ready | error
  const [boundary, setBoundary] = useState(null)
  const [gps, setGps] = useState('idle') // idle | requesting | ok | denied | unavailable
  const [geo, setGeo] = useState(null) // backend validation result
  const [geoBusy, setGeoBusy] = useState(false)

  const cardRef = useRef(null)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  // Draft persistence: non-sensitive fields only
  useEffect(() => {
    try {
      // eslint-disable-next-line no-unused-vars
      const { password, confirm, ...safe } = f
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ f: safe, step, pin }))
    } catch { /* storage unavailable */ }
  }, [f, step, pin])

  // Approved Area 6 locations come from the backend, never hardcoded here
  const loadLocations = async () => {
    setLocState('loading')
    try {
      const { data } = await api.get('/api/area-locations/active')
      const list = Array.isArray(data) ? data : data?.items || []
      setLocations(list)
      setLocState('ready')
      setF((p) => {
        if (p.areaLocationId && list.some((l) => String(l.id) === String(p.areaLocationId))) return p
        const def = list.find((l) => l.code === DEFAULT_LOCATION_CODE) || list[0]
        return { ...p, areaLocationId: def ? String(def.id) : '' }
      })
    } catch {
      setLocState('error')
    }
  }
  useEffect(() => { loadLocations() }, [])

  const location = locations.find((l) => String(l.id) === String(f.areaLocationId)) || null
  const boundaryStatus = location?.boundaryStatus || 'UNVERIFIED'
  const center = location?.centerLatitude != null && location?.centerLongitude != null
    ? { lat: location.centerLatitude, lng: location.centerLongitude }
    : null

  // Verified boundary polygon (only requested when the backend says it is verified)
  useEffect(() => {
    setBoundary(null)
    if (!location || boundaryStatus !== 'VERIFIED') return
    let cancelled = false
    api.get(`/api/area-locations/${location.id}/boundary`)
      .then(({ data }) => { if (!cancelled) setBoundary(data?.geoJson || data?.boundaryGeoJson || data || null) })
      .catch(() => { if (!cancelled) setBoundary(null) })
    return () => { cancelled = true }
  }, [location?.id, boundaryStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  // Any change to the pin or location invalidates a previous backend check
  useEffect(() => { setGeo(null); setConfirmPin(false) }, [pin?.lat, pin?.lng, f.areaLocationId])

  const addressPreview = [
    f.houseNumber.trim(),
    f.streetOrBlock.trim(),
    location?.name,
    'Area 6',
    'Barangay San Jose, Rodriguez, Rizal',
  ].filter(Boolean).join(', ')

  /* ---------------- map / GPS ---------------- */
  const pickPoint = (lat, lng) => setPin({ lat: round6(lat), lng: round6(lng), method: 'MANUAL_PIN' })

  const locate = () => {
    if (!navigator.geolocation) { setGps('unavailable'); return }
    setGps('requesting')
    navigator.geolocation.getCurrentPosition(
      (p) => { setPin({ lat: round6(p.coords.latitude), lng: round6(p.coords.longitude), method: 'GPS' }); setGps('ok') },
      (err) => setGps(err.code === 1 ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  // Backend is the authority. This only asks it for a result.
  const checkLocation = async () => {
    setGeoBusy(true)
    try {
      const { data } = await api.post('/api/residents/validate-registration-location', {
        areaLocationId: f.areaLocationId,
        latitude: pin.lat,
        longitude: pin.lng,
        verificationMethod: pin.method,
      })
      setGeo(data)
      return !!(data.isValid || data.requiresManualReview)
    } catch (err) {
      setErrors((p) => ({ ...p, location: getErrorMessage(err) }))
      return false
    } finally {
      setGeoBusy(false)
    }
  }

  /* ---------------- validation ---------------- */
  const validators = [
    () => {
      const e = {}
      if (!f.firstName.trim()) e.firstName = 'First name is required.'
      if (!f.lastName.trim()) e.lastName = 'Last name is required.'
      const dob = new Date(f.dateOfBirth)
      if (!f.dateOfBirth || Number.isNaN(dob.getTime())) e.dateOfBirth = 'Enter your date of birth.'
      else if (dob > new Date() || dob < new Date('1900-01-01')) e.dateOfBirth = 'Enter a valid date of birth.'
      if (!/^09\d{9}$|^\+639\d{9}$/.test(f.mobileNumber.trim().replace(/\s/g, ''))) e.mobileNumber = 'Enter a valid mobile number (09XXXXXXXXX).'
      if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address.'
      return e
    },
    () => {
      const e = {}
      if (!f.areaLocationId) e.areaLocationId = 'Select your residential location.'
      if (!f.houseNumber.trim()) e.houseNumber = 'House / lot number is required.'
      return e
    },
    () => {
      const e = {}
      if (!pin) e.location = 'Place a pin on the map to mark your residence.'
      else if (!confirmPin) e.location = 'Please confirm that the pin marks your actual residence.'
      return e
    },
    () => {
      const e = {}
      if (!f.idType) e.idType = 'Select an ID type.'
      if (!f.idNumber.trim()) e.idNumber = 'ID number is required.'
      REQUIRED_DOCS.forEach((k) => { if (!files[k]) e[k] = 'This document is required.' })
      if (Object.values(fileErrors).some(Boolean)) e.files = 'Fix the highlighted files before continuing.'
      return e
    },
    () => {
      const e = {}
      if (!/^[A-Za-z0-9._]{4,30}$/.test(f.username.trim())) e.username = '4-30 characters: letters, numbers, dot or underscore.'
      if (f.password.length < 8 || !/[a-z]/.test(f.password) || !/[A-Z]/.test(f.password) || !/\d/.test(f.password))
        e.password = 'Use at least 8 characters with an uppercase letter, a lowercase letter, and a number.'
      if (f.confirm !== f.password) e.confirm = 'Passwords do not match.'
      return e
    },
    () => (consent ? {} : { consent: 'You must accept the privacy notice to submit.' }),
  ]

  const goTo = (n) => {
    setStep(n)
    setError('')
    setErrors({})
    setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  const next = async () => {
    setError('')
    const e = validators[step]()
    setErrors(e)
    if (Object.keys(e).length) return
    if (step === 2 && !(geo && (geo.isValid || geo.requiresManualReview))) {
      const ok = await checkLocation()
      if (!ok) return
    }
    goTo(step + 1)
  }

  const onFile = (key) => (e) => {
    const file = e.target.files?.[0] || null
    let msg = ''
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) msg = 'Use a JPEG, PNG or WebP image.'
      else if (file.size > MAX_MB * 1024 * 1024) msg = `File is larger than ${MAX_MB}MB.`
    }
    setFileErrors((p) => ({ ...p, [key]: msg }))
    setFiles((p) => ({ ...p, [key]: msg ? null : file }))
  }

  /* ---------------- submit ---------------- */
  const uploadFile = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/api/upload/document', fd, { headers: { 'Content-Type': undefined } })
    return data.fileId ?? data.id ?? data.url // backend returns a private file reference
  }

  const submit = async () => {
    setError('')
    // re-run every step so nothing slips through via the Review screen
    for (let i = 0; i < validators.length; i += 1) {
      const e = validators[i]()
      if (Object.keys(e).length) { setErrors(e); goTo(i); setErrors(e); return }
    }
    setBusy(true)
    try {
      setUploading(true)
      const refs = {}
      for (const k of Object.keys(files)) refs[k] = files[k] ? await uploadFile(files[k]) : null
      setUploading(false)

      const { data } = await api.post('/api/auth/register-resident', {
        firstName: f.firstName.trim(),
        middleName: f.middleName.trim() || null,
        lastName: f.lastName.trim(),
        suffix: f.suffix.trim() || null,
        dateOfBirth: f.dateOfBirth,
        mobileNumber: f.mobileNumber.trim().replace(/\s/g, ''),
        email: f.email.trim(),
        username: f.username.trim(),
        password: f.password,
        areaLocationId: f.areaLocationId,
        houseNumber: f.houseNumber.trim(),
        streetOrBlock: f.streetOrBlock.trim() || null,
        landmark: f.landmark.trim() || null,
        latitude: pin.lat,
        longitude: pin.lng,
        verificationMethod: pin.method,
        idType: f.idType,
        idNumber: f.idNumber.trim(),
        idFrontFileId: refs.idFront,
        idBackFileId: refs.idBack,
        proofOfResidencyFileId: refs.proofOfResidency,
        photo2x2FileId: refs.photo2x2,
        consentAccepted: true,
      })
      try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      setResult(data || {})
    } catch (err) {
      const code = err.response?.data?.code
      setError(getErrorMessage(err))
      if (code === 'LOCATION_MISMATCH') { setGeo(null); goTo(2); setError(getErrorMessage(err)) }
    } finally {
      setBusy(false)
      setUploading(false)
    }
  }

  /* ---------------- result screen ---------------- */
  if (result) {
    const approved = result.registrationStatus === 'APPROVED'
    const geoPending = ['PENDING_REVIEW', 'NEEDS_REVIEW'].includes(result.geographicVerificationStatus)
    const Icon = approved ? ShieldCheck : Clock
    return (
      <main className="login-page auth-page">
        <AuthStyles />
        <Background />
        <WelcomePanel />
        <div className="login-right">
          <div className="login-card animate-in" style={{ '--delay': '200ms', textAlign: 'center', maxWidth: '560px' }}>
            <span aria-hidden="true" style={{ display: 'inline-grid', placeItems: 'center', width: '64px', height: '64px', borderRadius: '50%', background: approved ? tint(16) : 'rgba(244,211,94,.35)', color: 'var(--primary-dark)', marginBottom: '.75rem' }}>
              <Icon size={30} strokeWidth={1.75} />
            </span>
            <h2>{approved ? 'Registration approved' : 'Application submitted for review'}</h2>
            <p>
              {result.message
                || (geoPending
                  ? `Your registration has been submitted. The residential boundary for ${location?.name || 'your location'} is still being verified. Your application will undergo manual review by authorized Area 6 personnel.`
                  : 'Your resident application has been submitted. Please wait for admin approval before you can log in.')}
            </p>
            <p className="muted">You will be notified once your application has been reviewed. You cannot log in until it is approved.</p>
            <Link to="/login" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>Go to Login</Link>
          </div>
        </div>
      </main>
    )
  }

  /* ---------------- step bodies ---------------- */
  const two = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0 1rem' }

  const FileField = ({ k, label, hint, required }) => (
    <Field label={label} htmlFor={k} error={errors[k] || fileErrors[k]} hint={hint} required={required}>
      <input id={k} type="file" accept={ALLOWED_TYPES.join(',')} onChange={onFile(k)} disabled={busy} />
      {files[k] && <span className="muted" style={{ fontSize: '.8rem' }}>Selected: {files[k].name}</span>}
    </Field>
  )

  const passwordToggle = (shown, setShown) => (
    <button type="button" onClick={() => setShown(!shown)} aria-label={shown ? 'Hide password' : 'Show password'} className="password-toggle">
      {shown ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
    </button>
  )

  const gpsMessage = {
    requesting: 'Requesting your location…',
    denied: 'Location access was not granted. You can manually place the map pin on your residence. (Hindi pinayagan ang location access; ilagay na lang ang pin sa mapa.)',
    unavailable: 'Your device could not determine your location. Please place the pin manually on the map.',
    ok: 'Location detected. Drag the pin if it needs adjusting.',
  }[gps]

  const body = [
    /* STEP 1 */
    <>
      <h2 style={{ marginTop: 0 }}>Personal information</h2>
      <p className="muted">Enter your details exactly as they appear on your valid ID.</p>
      <div style={two}>
        <Field label="First name" htmlFor="firstName" error={errors.firstName} required>
          <input id="firstName" autoComplete="given-name" value={f.firstName} onChange={set('firstName')} placeholder="Juan" />
        </Field>
        <Field label="Middle name" htmlFor="middleName" hint="Optional">
          <input id="middleName" autoComplete="additional-name" value={f.middleName} onChange={set('middleName')} />
        </Field>
        <Field label="Last name" htmlFor="lastName" error={errors.lastName} required>
          <input id="lastName" autoComplete="family-name" value={f.lastName} onChange={set('lastName')} placeholder="Dela Cruz" />
        </Field>
        <Field label="Suffix" htmlFor="suffix" hint="Optional (Jr., Sr., III)">
          <input id="suffix" autoComplete="honorific-suffix" value={f.suffix} onChange={set('suffix')} />
        </Field>
        <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth} required>
          <input id="dateOfBirth" type="date" autoComplete="bday" value={f.dateOfBirth} onChange={set('dateOfBirth')} max={new Date().toISOString().slice(0, 10)} />
        </Field>
        <Field label="Mobile number" htmlFor="mobileNumber" error={errors.mobileNumber} required>
          <input id="mobileNumber" type="tel" autoComplete="tel" value={f.mobileNumber} onChange={set('mobileNumber')} placeholder="09XX XXX XXXX" />
        </Field>
      </div>
      <Field label="Email" htmlFor="email" error={errors.email} required>
        <input id="email" type="email" autoComplete="email" autoCapitalize="none" value={f.email} onChange={set('email')} placeholder="name@example.com" />
      </Field>
    </>,

    /* STEP 2 */
    <>
      <h2 style={{ marginTop: 0 }}>Where do you live?</h2>
      <p className="muted">Provide your residential address within the approved Area 6 coverage.</p>
      <Field label="Area" htmlFor="area">
        <input id="area" value="AREA 6" readOnly aria-readonly="true" style={{ fontWeight: 600, background: 'rgba(0,0,0,.04)' }} />
        <span className="muted" style={{ fontSize: '.8rem' }}>Your registration is limited to Area 6.</span>
      </Field>

      <Field label="Residential location" htmlFor="areaLocationId" error={errors.areaLocationId} required>
        {locState === 'loading' ? <Spinner /> : locState === 'error' ? (
          <div>
            <Alert>We could not load the approved locations.</Alert>
            <button type="button" className="btn btn-outline btn-sm" onClick={loadLocations}>Try again</button>
          </div>
        ) : (
          <select id="areaLocationId" value={f.areaLocationId} onChange={set('areaLocationId')}>
            <option value="">Select your residential location</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        <span className="muted" style={{ fontSize: '.8rem' }}>Preselected as the demonstration location. You may choose another approved Area 6 location.</span>
      </Field>

      <div style={two}>
        <Field label="House / lot number" htmlFor="houseNumber" error={errors.houseNumber} required>
          <input id="houseNumber" value={f.houseNumber} onChange={set('houseNumber')} placeholder="e.g. Block 1 Lot 5" />
        </Field>
        <Field label="Street / block" htmlFor="streetOrBlock" hint="Optional">
          <input id="streetOrBlock" autoComplete="address-line2" value={f.streetOrBlock} onChange={set('streetOrBlock')} placeholder="Street, block or phase" />
        </Field>
      </div>
      <Field label="Landmark" htmlFor="landmark" hint="Optional">
        <input id="landmark" value={f.landmark} onChange={set('landmark')} placeholder="Near the chapel, basketball court, etc." />
      </Field>
      <Field label="Complete address (preview)" htmlFor="preview">
        <textarea id="preview" readOnly rows={2} value={addressPreview} style={{ background: 'rgba(0,0,0,.04)', resize: 'none' }} />
      </Field>
    </>,

    /* STEP 3 */
    <>
      <h2 style={{ marginTop: 0 }}>Pinpoint your residence</h2>
      <p className="muted">
        Selected location: <strong>{location?.name || '—'}</strong>
      </p>
      <ol className="muted" style={{ margin: '0 0 .75rem', paddingLeft: '1.2rem', fontSize: '.85rem' }}>
        <li>Allow location access when prompted, or place the pin yourself.</li>
        <li>Click or tap the map, and drag the pin onto your actual home.</li>
        <li>Confirm the pin, then continue for verification.</li>
      </ol>

      {boundaryStatus === 'VERIFIED' ? (
        <Notice tone="ok" icon={ShieldCheck} title="Boundary verified">
          The highlighted area is the officially verified boundary. Your pin must fall inside it.
        </Notice>
      ) : (
        <Notice tone="warn" icon={ShieldAlert} title="Boundary not yet verified">
          The geographic boundary of this residential location is still undergoing verification. Your registration will be reviewed by the Area 6 administrator.
        </Notice>
      )}

      <MapPicker center={center} boundary={boundaryStatus === 'VERIFIED' ? boundary : null} pin={pin} onPick={pickPoint} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', alignItems: 'center', margin: '.75rem 0' }}>
        <button type="button" className="btn btn-outline" onClick={locate} disabled={gps === 'requesting'} style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', minHeight: '44px' }}>
          {gps === 'requesting' ? <span className="btn-spinner" /> : <LocateFixed size={18} strokeWidth={1.75} />} Use my current location
        </button>
        {pin && (
          <button type="button" className="btn btn-sm btn-outline" onClick={() => { setPin(null); setGps('idle') }}>Clear pin</button>
        )}
      </div>

      {gpsMessage && <p className="muted" style={{ fontSize: '.85rem' }} role="status">{gpsMessage}</p>}

      <div style={{ padding: '.75rem .9rem', borderRadius: '12px', border: '1px solid var(--line)', fontSize: '.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontWeight: 600, marginBottom: '.25rem' }}>
          <MapPin size={16} strokeWidth={1.75} aria-hidden="true" /> Selected pin
        </div>
        {pin ? (
          <>
            <div>Latitude: <strong>{pin.lat}</strong></div>
            <div>Longitude: <strong>{pin.lng}</strong></div>
            <div className="muted">Method: {pin.method === 'GPS' ? 'Device location (GPS)' : 'Manual pin'}</div>
          </>
        ) : <span className="muted">No pin placed yet.</span>}
      </div>

      <label style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start', margin: '.9rem 0 .25rem', fontSize: '.9rem' }}>
        <input type="checkbox" checked={confirmPin} disabled={!pin} onChange={(e) => setConfirmPin(e.target.checked)} style={{ marginTop: '.2rem' }} />
        <span>I confirm that this pin marks my actual residential location.</span>
      </label>
      {errors.location && <p role="alert" style={{ color: '#b42318', fontSize: '.85rem', margin: '.25rem 0' }}>{errors.location}</p>}

      {geoBusy && <p className="muted" role="status"><span className="btn-spinner" /> Checking your location…</p>}

      {geo && !geo.isValid && !geo.requiresManualReview && (
        <Notice tone="bad" icon={ShieldAlert} title="Location does not match">
          {geo.message || `The selected map location does not match the verified boundary of ${location?.name}. Please check your residential location and map pin.`}
        </Notice>
      )}
      {geo && geo.requiresManualReview && (
        <Notice tone="warn" icon={Clock} title="Administrative review required">
          {geo.message || 'The official boundary of this location is still being verified. Your registration will require administrative review.'}
        </Notice>
      )}
      {geo && geo.isValid && (
        <Notice tone="ok" icon={ShieldCheck} title="Location matches">
          {geo.message || 'Your pin is inside the verified boundary.'}
        </Notice>
      )}
    </>,

    /* STEP 4 */
    <>
      <h2 style={{ marginTop: 0 }}>Identity and residency documents</h2>
      <p className="muted">Upload clear photos. JPEG, PNG or WebP, up to {MAX_MB}MB each. Documents are reviewed only by authorized staff.</p>
      <div style={two}>
        <Field label="Valid ID type" htmlFor="idType" error={errors.idType} required>
          <select id="idType" value={f.idType} onChange={set('idType')}>
            <option value="">Select an ID</option>
            {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="ID number" htmlFor="idNumber" error={errors.idNumber} required>
          <input id="idNumber" value={f.idNumber} onChange={set('idNumber')} placeholder="Enter your ID number" />
        </Field>
      </div>
      <FileField k="idFront" label="ID front photo" required={REQUIRED_DOCS.includes('idFront')} hint="Or the photo page if using a passport." />
      <FileField k="idBack" label="ID back photo" hint="Optional for passports." />
      <FileField k="proofOfResidency" label="Proof of residency" hint="Optional. Billing statement or HOA-signed certification." />
      <FileField k="photo2x2" label="2x2 profile photo" required={REQUIRED_DOCS.includes('photo2x2')} hint="Formal picture with white background. This will be your profile picture." />
      {errors.files && <p role="alert" style={{ color: '#b42318', fontSize: '.85rem' }}>{errors.files}</p>}
    </>,

    /* STEP 5 */
    <>
      <h2 style={{ marginTop: 0 }}>Account credentials</h2>
      <p className="muted">You will use these to log in once your application is approved.</p>
      <Field label="Username" htmlFor="username" error={errors.username} required>
        <input id="username" autoComplete="username" autoCapitalize="none" value={f.username} onChange={set('username')} placeholder="juandelacruz" />
      </Field>
      <div style={two}>
        <Field label="Password" htmlFor="pw" error={errors.password} required>
          <div style={{ position: 'relative' }}>
            <input id="pw" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={f.password} onChange={set('password')} placeholder="At least 8 characters" style={{ paddingRight: '3rem' }} />
            {passwordToggle(showPassword, setShowPassword)}
          </div>
        </Field>
        <Field label="Confirm password" htmlFor="pw2" error={errors.confirm} required>
          <div style={{ position: 'relative' }}>
            <input id="pw2" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={f.confirm} onChange={set('confirm')} placeholder="Enter it again" style={{ paddingRight: '3rem' }} />
            {passwordToggle(showConfirm, setShowConfirm)}
          </div>
        </Field>
      </div>
    </>,

    /* STEP 6 */
    <>
      <h2 style={{ marginTop: 0 }}>Review and submit</h2>
      <p className="muted">Check your details before submitting.</p>
      {[
        {
          title: 'Personal information', to: 0, rows: [
            ['Name', [f.firstName, f.middleName, f.lastName, f.suffix].filter((s) => s.trim()).join(' ')],
            ['Date of birth', f.dateOfBirth],
            ['Mobile', f.mobileNumber],
            ['Email', f.email],
          ],
        },
        {
          title: 'Residential address', to: 1, rows: [
            ['Area', 'Area 6'],
            ['Location', location?.name || '—'],
            ['House / lot', f.houseNumber],
            ['Street / block', f.streetOrBlock || '—'],
            ['Landmark', f.landmark || '—'],
          ],
        },
        {
          title: 'Map location', to: 2, rows: [
            ['Latitude', pin?.lat ?? '—'],
            ['Longitude', pin?.lng ?? '—'],
            ['Boundary', boundaryStatus === 'VERIFIED' ? 'Verified' : 'Not yet verified'],
            ['Location check', geo ? (geo.isValid ? 'Inside verified boundary' : geo.requiresManualReview ? 'Pending administrator review' : 'Does not match') : 'Not checked'],
          ],
        },
        {
          title: 'Documents', to: 3, rows: [
            ['ID', `${f.idType || '—'} · ${f.idNumber || '—'}`],
            ['ID front', files.idFront?.name || 'Not uploaded'],
            ['ID back', files.idBack?.name || 'Not uploaded'],
            ['Proof of residency', files.proofOfResidency?.name || 'Not uploaded'],
            ['2x2 photo', files.photo2x2?.name || 'Not uploaded'],
            ['Review status', 'Pending (after submission)'],
          ],
        },
        { title: 'Account', to: 4, rows: [['Username', f.username]] },
      ].map(({ title, to, rows }) => (
        <section key={title} style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '.75rem .9rem', margin: '.6rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.35rem' }}>
            <strong style={{ fontSize: '.9rem' }}>{title}</strong>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => goTo(to)}>Edit</button>
          </div>
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(100px, 35%) 1fr', gap: '.2rem .75rem', fontSize: '.85rem' }}>
            {rows.map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt className="muted">{k}</dt>
                <dd style={{ margin: 0, wordBreak: 'break-word' }}>{String(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <Notice tone="info" title="Privacy notice">
        Barangay San Jose Annex Area 6 collects your personal information, residential address, map location and documents only to verify your residency and process your account, in line with the Data Privacy Act of 2012. Access is limited to authorized personnel, and your exact location is never shown publicly.
      </Notice>
      <label style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start', fontSize: '.9rem' }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: '.2rem' }} />
        <span>I have read the privacy notice, consent to the processing of my data, and confirm that the information I provided is true and correct.</span>
      </label>
      {errors.consent && <p role="alert" style={{ color: '#b42318', fontSize: '.85rem' }}>{errors.consent}</p>}
    </>,
  ]

  const last = step === STEPS.length - 1

  return (
    <main className="login-page auth-page">
      <AuthStyles />
      <Background />
      <WelcomePanel />

      <div className="login-right">
        <div ref={cardRef} className="login-card animate-in" style={{ '--delay': '200ms', maxWidth: '680px', background: '#fff' }}>
          <Stepper step={step} />

          {error && <Alert>{error}</Alert>}

          <form onSubmit={(e) => { e.preventDefault(); if (last) submit(); else next() }} noValidate>
            <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              {body[step]}
            </fieldset>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => goTo(step - 1)} disabled={step === 0 || busy} style={{ minHeight: '48px', visibility: step === 0 ? 'hidden' : 'visible' }}>
                Back
              </button>
              <button type="submit" className="btn btn-primary login-btn" disabled={busy || geoBusy || (last && !consent)} style={{ minHeight: '48px', flex: 1, maxWidth: '280px' }}>
                {busy
                  ? <><span className="btn-spinner" /> {uploading ? 'Uploading documents…' : 'Submitting…'}</>
                  : geoBusy
                    ? <><span className="btn-spinner" /> Checking location…</>
                    : last ? 'Submit registration' : 'Continue'}
              </button>
            </div>
          </form>

          <p className="muted" style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            Already registered? <Link to="/login">Log in</Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.7rem', color: 'var(--muted-c)' }}>
            Barangay San Jose Annex Area 6 Management Information System
          </p>
        </div>
      </div>
    </main>
  )
}