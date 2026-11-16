import { useEffect, useRef, useState } from 'react'
import { Alert, Modal } from './ui'
import { api, getErrorMessage } from '../lib/api'
import { COMPLAINT_CATEGORIES, COMPLAINT_PRIORITIES } from '../lib/format'
import './WalkInComplaintForm.css'

const STEPS = ['Complainant', 'Incident', 'Intake', 'Review']
const INITIAL = {
  residentId: null,
  identityVerified: false,
  complainantName: '',
  contactNumber: '',
  residentialAddress: '',
  category: '',
  subject: '',
  narrative: '',
  incidentAt: '',
  incidentLocation: '',
  incidentAreaLocationId: '',
  incidentLocationClassification: 'OtherUnverified',
  personsInvolved: '',
  witnessInformation: '',
  priority: 'Medium',
  intakeNotes: '',
  personallyNarrated: false,
  reviewedWithComplainant: false,
  supportingDocumentsReceived: false,
  immediateReferralRequired: false,
  immediateReferralNotes: '',
}

export default function WalkInComplaintForm({ onClose, onCreated }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(INITIAL)
  const [residentSearch, setResidentSearch] = useState('')
  const [residents, setResidents] = useState([])
  const [lookupLoading, setLookupLoading] = useState(false)
  const [selectedResident, setSelectedResident] = useState(null)
  const [locations, setLocations] = useState([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const searchTimer = useRef(null)
  const searchSequence = useRef(0)

  useEffect(() => {
    let active = true
    api.get('/api/area-locations/active')
      .then(({ data }) => { if (active) setLocations(Array.isArray(data) ? data : []) })
      .catch((err) => { if (active) setError(`Could not load active Area 6 locations. ${getErrorMessage(err)}`) })
      .finally(() => { if (active) setLoadingLocations(false) })
    return () => { active = false }
  }, [])

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const searchResidents = (value) => {
    setResidentSearch(value)
    window.clearTimeout(searchTimer.current)
    if (value.trim().length < 2) {
      searchSequence.current += 1
      setResidents([])
      setLookupLoading(false)
      return
    }
    const sequence = ++searchSequence.current
    setLookupLoading(true)
    searchTimer.current = window.setTimeout(async () => {
      try {
        const { data } = await api.get('/api/complaints/intake/residents', { params: { q: value.trim() } })
        if (sequence === searchSequence.current) setResidents(Array.isArray(data) ? data : [])
      } catch (err) {
        if (sequence === searchSequence.current) setError(getErrorMessage(err))
      } finally {
        if (sequence === searchSequence.current) setLookupLoading(false)
      }
    }, 250)
  }

  const chooseResident = (resident) => {
    window.clearTimeout(searchTimer.current)
    searchSequence.current += 1
    setLookupLoading(false)
    setSelectedResident(resident)
    setForm((current) => ({
      ...current,
      residentId: resident.id,
      identityVerified: false,
      complainantName: resident.fullName,
      contactNumber: resident.contactNumber || '',
      residentialAddress: resident.residentialAddress || '',
    }))
    setResidents([])
    setResidentSearch('')
  }

  const useUnregisteredComplainant = () => {
    setSelectedResident(null)
    setForm((current) => ({
      ...current,
      residentId: null,
      identityVerified: false,
      complainantName: '',
      contactNumber: '',
      residentialAddress: '',
    }))
  }

  const validateStep = () => {
    setError('')
    if (step === 0) {
      if (selectedResident && !form.identityVerified) return 'Confirm that the selected resident’s identity was checked before linking.'
      if (!selectedResident && form.complainantName.trim().length < 2) return 'Enter the complainant’s full name.'
      return ''
    }
    if (step === 1) {
      if (!form.category) return 'Choose a complaint category.'
      if (form.subject.trim().length < 3) return 'Enter a subject of at least 3 characters.'
      if (form.narrative.trim().length < 10) return 'Enter the complainant’s narrative (at least 10 characters).'
      if (form.incidentLocationClassification === 'ApprovedArea6Location'
          && (!form.incidentAreaLocationId || !form.incidentLocation.trim())) return 'Choose an Area 6 location and enter the specific place.'
      if (form.incidentLocationClassification === 'OtherUnverified' && !form.incidentLocation.trim()) return 'Enter the unverified incident location.'
      return ''
    }
    if (step === 2) {
      if (form.immediateReferralRequired && form.immediateReferralNotes.trim().length < 3)
        return 'Describe the immediate referral or escalation needed.'
      return ''
    }
    if (!form.reviewedWithComplainant) return 'Confirm that the encoded complaint was reviewed with the complainant.'
    return ''
  }

  const next = () => {
    const message = validateStep()
    if (message) {
      setError(message)
      return
    }
    setError('')
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  const submit = async () => {
    const message = validateStep()
    if (message) {
      setError(message)
      return
    }
    setBusy(true)
    setError('')
    const payload = {
      ...form,
      incidentAreaLocationId: form.incidentLocationClassification === 'ApprovedArea6Location' ? Number(form.incidentAreaLocationId) : null,
      incidentAt: form.incidentAt ? new Date(form.incidentAt).toISOString() : null,
      incidentLocation: form.incidentLocation.trim(),
    }
    try {
      const { data } = await api.post('/api/complaints/walk-in', payload)
      onCreated(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setBusy(false)
    }
  }

  const summaryValue = (value) => value || 'Not provided'
  const selectedLocationName = locations.find((location) => String(location.id) === String(form.incidentAreaLocationId))?.name

  return (
    <Modal
      title="Register Walk-in Complaint"
      subtitle={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
      onClose={onClose}
      wide
      footer={(
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          {step > 0 && <button type="button" className="btn btn-outline" onClick={() => { setError(''); setStep((current) => current - 1) }} disabled={busy}>Previous</button>}
          {step < STEPS.length - 1
            ? <button type="button" className="btn btn-primary" onClick={next}>Continue</button>
            : <button type="button" className="btn btn-primary" onClick={submit} disabled={busy || loadingLocations}>{busy ? 'Registering…' : 'Confirm and register complaint'}</button>}
        </>
      )}
    >
      <Alert>{error}</Alert>
      <div className="walkin-stepper" aria-label="Complaint registration steps">
        {STEPS.map((label, index) => <span className={index === step ? 'active' : index < step ? 'complete' : ''} key={label}>{index + 1}. {label}</span>)}
      </div>

      {step === 0 && (
        <div className="walkin-form-grid">
          <div className="walkin-field walkin-full">
            <label htmlFor="walkin-resident-search">Find an existing approved resident account</label>
            <input id="walkin-resident-search" value={residentSearch} onChange={(event) => searchResidents(event.target.value)} placeholder="Search by full name or contact number" autoComplete="off" />
            {lookupLoading && <small>Searching approved resident accounts…</small>}
            {!lookupLoading && residentSearch.trim().length >= 2 && residents.length === 0 && <small>No matching approved resident accounts found.</small>}
            {residents.length > 0 && <div className="walkin-resident-results" role="listbox" aria-label="Matching residents">
              {residents.map((resident) => <button type="button" key={resident.id} onClick={() => chooseResident(resident)}>
                <strong>{resident.fullName}</strong><span>{resident.contactNumber || 'No contact on file'} · {resident.location || resident.residentialAddress || 'Address not recorded'}</span>
              </button>)}
            </div>}
            <small>Only active, approved resident accounts are returned. This lookup never creates or edits a resident record.</small>
          </div>

          <div className="walkin-full walkin-selected-resident">
            {selectedResident ? (
              <>
                <div><strong>Linked complainant:</strong> {selectedResident.fullName}</div>
                <div className="walkin-muted">{selectedResident.contactNumber || 'No contact on file'} · {selectedResident.residentialAddress || selectedResident.location || 'Address not recorded'}</div>
                <button type="button" className="btn btn-outline btn-sm" onClick={useUnregisteredComplainant}>Use an unregistered complainant instead</button>
                <label className="walkin-checkbox">
                  <input type="checkbox" checked={form.identityVerified} onChange={(event) => setField('identityVerified', event.target.checked)} />
                  I verified this person’s identity before linking the resident account.
                </label>
              </>
            ) : (
              <>
                <div><strong>No account selected.</strong> Encode the walk-in complainant without creating an account.</div>
                <small>Search for an approved resident account above, or continue with an unregistered complainant.</small>
              </>
            )}
          </div>

          {!selectedResident && <>
            <label>Complainant full name<input value={form.complainantName} maxLength={150} onChange={(event) => setField('complainantName', event.target.value)} /></label>
            <label>Contact number (optional)<input type="tel" value={form.contactNumber} maxLength={30} onChange={(event) => setField('contactNumber', event.target.value)} /></label>
            <label className="walkin-full">Residential address (optional; separate from incident location)<input value={form.residentialAddress} maxLength={250} onChange={(event) => setField('residentialAddress', event.target.value)} /></label>
            <p className="walkin-muted walkin-full">The complainant is recorded as unregistered/unverified for account purposes. No resident profile or login account is created.</p>
          </>}
        </div>
      )}

      {step === 1 && (
        <div className="walkin-form-grid">
          <label>Complaint category<select value={form.category} onChange={(event) => setField('category', event.target.value)}><option value="">Select category</option>{COMPLAINT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Priority<select value={form.priority} onChange={(event) => setField('priority', event.target.value)}>{COMPLAINT_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
          <label className="walkin-full">Subject<input value={form.subject} maxLength={150} onChange={(event) => setField('subject', event.target.value)} /></label>
          <label className="walkin-full">Complainant’s narrative<textarea value={form.narrative} minLength={10} maxLength={2000} onChange={(event) => setField('narrative', event.target.value)} placeholder="Record the complainant’s statement as provided. Keep staff observations in intake notes." /></label>
          <label>Incident date/time (optional)<input type="datetime-local" value={form.incidentAt} onChange={(event) => setField('incidentAt', event.target.value)} /></label>
          <label>Incident location classification<select value={form.incidentLocationClassification} onChange={(event) => setForm((current) => ({ ...current, incidentLocationClassification: event.target.value, incidentAreaLocationId: '' }))}><option value="ApprovedArea6Location">Existing Area 6 location</option><option value="OtherUnverified">Other / unverified location</option></select></label>
          {form.incidentLocationClassification === 'ApprovedArea6Location' && (
            <label>Area 6 location<select value={form.incidentAreaLocationId} onChange={(event) => setField('incidentAreaLocationId', event.target.value)} disabled={loadingLocations}><option value="">Select active location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          )}
          <label className="walkin-full">Specific incident location<input value={form.incidentLocation} maxLength={250} onChange={(event) => setField('incidentLocation', event.target.value)} placeholder={form.incidentLocationClassification === 'ApprovedArea6Location' ? 'Street, landmark, or specific place' : 'Describe location; it will remain marked unverified'} /></label>
          <label>Persons involved (optional)<textarea value={form.personsInvolved} maxLength={1000} onChange={(event) => setField('personsInvolved', event.target.value)} /></label>
          <label>Witness information (optional)<textarea value={form.witnessInformation} maxLength={1000} onChange={(event) => setField('witnessInformation', event.target.value)} /></label>
          <label className="walkin-checkbox walkin-full"><input type="checkbox" checked={form.supportingDocumentsReceived} onChange={(event) => setField('supportingDocumentsReceived', event.target.checked)} /> Supporting documents were physically presented/received</label>
          <p className="walkin-muted walkin-full">This flag records intake only. Complaint attachment storage is not available in the existing system; no files are uploaded by this form.</p>
        </div>
      )}

      {step === 2 && (
        <div className="walkin-form-grid">
          <div className="walkin-field walkin-full">
            <strong>Intake metadata</strong>
            <div className="walkin-muted">Received time and authenticated receiving staff account are recorded by the server when you submit.</div>
          </div>
          <label className="walkin-checkbox walkin-full"><input type="checkbox" checked={form.personallyNarrated} onChange={(event) => setField('personallyNarrated', event.target.checked)} /> Complaint was personally narrated by the complainant</label>
          <label className="walkin-checkbox walkin-full"><input type="checkbox" checked={form.reviewedWithComplainant} onChange={(event) => setField('reviewedWithComplainant', event.target.checked)} /> Encoded complaint details were reviewed with the complainant</label>
          <label className="walkin-full">Internal intake notes (staff only)<textarea value={form.intakeNotes} maxLength={2000} onChange={(event) => setField('intakeNotes', event.target.value)} placeholder="Keep staff notes separate from the complainant’s narrative." /></label>
          <label className="walkin-checkbox walkin-full"><input type="checkbox" checked={form.immediateReferralRequired} onChange={(event) => setField('immediateReferralRequired', event.target.checked)} /> Immediate referral or escalation is required</label>
          {form.immediateReferralRequired && <label className="walkin-full">Immediate action requested<textarea value={form.immediateReferralNotes} maxLength={1000} onChange={(event) => setField('immediateReferralNotes', event.target.value)} placeholder="Record the requested urgency for authorized follow-up; this does not create a department referral." /></label>}
          <p className="walkin-muted walkin-full">No signature is recorded by this form. Referral is recorded as an intake flag only because the current complaint system has no department-referral workflow.</p>
        </div>
      )}

      {step === 3 && (
        <div className="walkin-review-summary">
          <h3>Review this complaint before submission</h3>
          <div><strong>Complainant:</strong> {selectedResident?.fullName || summaryValue(form.complainantName)} {selectedResident ? '(existing account linked; identity checked)' : '(no account created)'}</div>
          <div><strong>Contact:</strong> {summaryValue(selectedResident?.contactNumber || form.contactNumber)}</div>
          <div><strong>Residential address:</strong> {summaryValue(selectedResident?.residentialAddress || form.residentialAddress)}</div>
          <div><strong>Category / priority:</strong> {summaryValue(form.category)} / {form.priority}</div>
          <div><strong>Subject:</strong> {summaryValue(form.subject)}</div>
          <div><strong>Narrative:</strong><p>{summaryValue(form.narrative)}</p></div>
          <div><strong>Incident date/time:</strong> {summaryValue(form.incidentAt)}</div>
          <div><strong>Incident location ({form.incidentLocationClassification}):</strong> {summaryValue(selectedLocationName ? `${selectedLocationName} — ${form.incidentLocation}` : form.incidentLocation)}</div>
          <div><strong>Persons involved:</strong> {summaryValue(form.personsInvolved)}</div>
          <div><strong>Witness information:</strong> {summaryValue(form.witnessInformation)}</div>
          <div><strong>Personally narrated:</strong> {form.personallyNarrated ? 'Yes' : 'No'} · <strong>Reviewed with complainant:</strong> {form.reviewedWithComplainant ? 'Yes' : 'No'}</div>
          <div><strong>Supporting documents received:</strong> {form.supportingDocumentsReceived ? 'Yes (intake flag only)' : 'No'}</div>
          <div><strong>Immediate referral required:</strong> {form.immediateReferralRequired ? `Yes — ${form.immediateReferralNotes}` : 'No'}</div>
          <div><strong>Internal intake notes:</strong> {summaryValue(form.intakeNotes)}</div>
          <div><strong>Receiving staff:</strong> Authenticated staff account (recorded by the server)</div>
          <p className="walkin-review-warning">The reference number and received timestamp will be assigned by the existing complaint workflow when submitted. This form does not record a complainant signature.</p>
        </div>
      )}
    </Modal>
  )
}
