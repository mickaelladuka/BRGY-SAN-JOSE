import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Field } from '../../components/ui'
import { HotlineNotice } from '../../components/Receipt'
import Receipt from '../../components/Receipt'
import { useOnline } from '../../components/OfflineBanner'
import { api, getErrorMessage, getFieldErrors } from '../../lib/api'
import { EMERGENCY_CATEGORIES } from '../../lib/format'

const COOLDOWN_KEY = 'annex6.guestLastSubmit'
const COOLDOWN_MS = 60_000

export default function GuestEmergency() {
  const navigate = useNavigate()
  const online = useOnline()
  const [f, setF] = useState({ guestName: '', guestContact: '', category: '', location: '', description: '', website: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (ev) => {
    ev.preventDefault()
    setError('')
    const e = {}
    if (!f.guestName.trim()) e.guestName = 'Please tell us your name.'
    if (!/^[+\d][\d\s()-]{6,}$/.test(f.guestContact.trim())) e.guestContact = 'Enter a phone number we can reach you on.'
    if (!f.category) e.category = 'Choose the type of emergency.'
    if (!f.location.trim()) e.location = 'Where is the emergency? Include a landmark if you can.'
    if (f.description.trim().length < 10) e.description = 'Describe what is happening (at least 10 characters).'
    setErrors(e)
    if (Object.keys(e).length) return
    if (!online) return setError('You are offline. Your report has NOT been sent. Call the emergency hotline, or try again when you are back online.')
    const last = Number(sessionStorage.getItem(COOLDOWN_KEY) || 0)
    if (Date.now() - last < COOLDOWN_MS) return setError('You just sent a report. Please wait a minute before sending another.')

    setBusy(true)
    try {
      const { data } = await api.post('/api/reports/guest', {
        guestName: f.guestName.trim(), guestContact: f.guestContact.trim(), category: f.category,
        location: f.location.trim(), description: f.description.trim(),
        website: f.website, // honeypot: real people leave this empty
      })
      sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()))
      navigate('/emergency/submitted', { replace: true, state: { reference: data.referenceNumber, submittedAt: data.submittedAt } })
    } catch (err) {
      setErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Your report could not be sent. Please call the emergency hotline if you need help now.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="public">
      <Link to="/" className="brand" style={{ marginBottom: '1rem' }}><img src="/favicon.svg" alt="" /> Annex 6 BMIS</Link>
      <h1>Report an emergency</h1>
      <HotlineNotice />
      <form className="card" onSubmit={submit} noValidate>
        <Alert>{error}</Alert>
        <Field label="Your name" htmlFor="g-name" error={errors.guestName} required><input id="g-name" autoComplete="name" value={f.guestName} onChange={set('guestName')} maxLength={100} /></Field>
        <Field label="Contact number" htmlFor="g-contact" error={errors.guestContact} required><input id="g-contact" type="tel" autoComplete="tel" value={f.guestContact} onChange={set('guestContact')} maxLength={30} /></Field>
        <Field label="Type of emergency" htmlFor="g-cat" error={errors.category} required>
          <select id="g-cat" value={f.category} onChange={set('category')}>
            <option value="">Select…</option>
            {EMERGENCY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Location" htmlFor="g-loc" error={errors.location} required><input id="g-loc" value={f.location} onChange={set('location')} maxLength={250} placeholder="Street, house number, landmark" /></Field>
        <Field label="What is happening?" htmlFor="g-desc" error={errors.description} required><textarea id="g-desc" value={f.description} onChange={set('description')} maxLength={1000} /></Field>
        <div className="hp" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label></div>
        <button type="submit" className="btn btn-emergency btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send emergency report'}</button>
        <p className="muted" style={{ marginTop: '.75rem' }}>We only ask for what is needed to follow up on your report.</p>
      </form>
    </main>
  )
}

export function GuestSubmitted() {
  const { state } = useLocation()
  if (!state?.reference) return <Navigate to="/emergency" replace />
  return (
    <main className="public">
      <Receipt reference={state.reference} submittedAt={state.submittedAt} emergency />
    </main>
  )
}
