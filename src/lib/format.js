const dtf = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
const df = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' })

const parse = (v) => {
  if (!v) return null
  // The API stores UTC; ASP.NET may omit the trailing "Z", so treat zone-less timestamps as UTC.
  const s = typeof v === 'string' && /T/.test(v) && !/(Z|[+-]\d\d:?\d\d)$/.test(v) ? `${v}Z` : v
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}
export const fmtDateTime = (v) => (parse(v) ? dtf.format(parse(v)) : '—')
export const fmtDate = (v) => (parse(v) ? df.format(parse(v)) : '—')

/** ISO string -> value for <input type="datetime-local"> / <input type="date"> (local time). */
export const toDateTimeInput = (v) => {
  const d = parse(v)
  if (!d) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
export const toDateInput = (v) => toDateTimeInput(v).slice(0, 10)
export const nowInput = () => toDateTimeInput(new Date().toISOString())

export const COMPLAINT_STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Rejected', 'Reopened']
export const COMPLAINT_PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
export const REPORT_STATUSES = COMPLAINT_STATUSES
export const REPORT_SEVERITIES = COMPLAINT_PRIORITIES
export const REPORT_VERIFICATION_STATUSES = ['Pending', 'Under Verification', 'Verified', 'Invalid', 'Duplicate']
export const FIRE_STATUSES = ['Reported', 'Responding', 'Contained', 'Resolved', 'Closed']
export const COMPLAINT_CATEGORIES = ['Noise', 'Garbage / Waste', 'Infrastructure', 'Peace and Order', 'Neighbor Dispute', 'Public Safety', 'Other']
export const REPORT_CATEGORIES = ['Public Disturbance', 'Hazard / Risk', 'Road / Infrastructure', 'Lost and Found', 'Other']
export const FIRE_CATEGORIES = ['Structure Fire', 'Vehicle Fire', 'Grass / Trash Fire', 'Electrical Fire', 'Rescue', 'Medical Assistance', 'Flood Response', 'Other Response']
export const isFireRelated = (category) => /fire/i.test(category || '')

export const EMERGENCY_HOTLINE = import.meta.env.VITE_EMERGENCY_HOTLINE || '911'
export const BARANGAY_HOTLINE = import.meta.env.VITE_BARANGAY_HOTLINE || ''
