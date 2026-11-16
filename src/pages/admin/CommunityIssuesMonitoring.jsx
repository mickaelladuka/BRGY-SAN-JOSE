import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { Alert, EmptyState, SkeletonList } from '../../components/ui'
import { api, getErrorMessage } from '../../lib/api'
import { fmtDateTime } from '../../lib/format'
import { COMPLAINT_CATEGORIES } from '../../lib/format'
import ResourcePage from './ResourcePage'
import CommunityIssueLinksModal from './CommunityIssueLinksModal'
import * as m from './modules'
import { Activity, AlertTriangle, CheckCircle2, ClipboardList, MapPin, RefreshCw, RotateCcw } from 'lucide-react'

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']
const manilaDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(date)

function dateRangeFor(preset) {
  const today = manilaDate()
  const end = new Date(`${today}T12:00:00Z`)
  const start = new Date(end)
  if (preset === 'today') return { dateFrom: today, dateTo: today }
  if (preset === 'last7') start.setUTCDate(start.getUTCDate() - 6)
  else if (preset === 'week') {
    const weekday = (start.getUTCDay() + 6) % 7
    start.setUTCDate(start.getUTCDate() - weekday)
  } else if (preset === 'month') start.setUTCDate(1)
  else if (preset === 'last30') start.setUTCDate(start.getUTCDate() - 29)
  else if (preset === 'year') start.setUTCMonth(0, 1)
  return { dateFrom: start.toISOString().slice(0, 10), dateTo: today }
}

function MonitoringMap({ points }) {
  const center = useMemo(() => {
    if (!points.length) return null
    return [
      points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
      points.reduce((sum, point) => sum + point.longitude, 0) / points.length,
    ]
  }, [points])

  if (!center) {
    return (
      <div className="community-issues-map-empty">
        <MapPin size={24} aria-hidden="true" />
        <span>No incident coordinates are available for this filter.</span>
      </div>
    )
  }

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="community-issues-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((point) => (
        <CircleMarker
          key={point.complaintId}
          center={[point.latitude, point.longitude]}
          radius={7}
          pathOptions={{ color: '#A85D08', fillColor: '#F6C453', fillOpacity: 0.8, weight: 2 }}
        >
          <Popup>
            <strong>{point.referenceNumber}</strong>
            <br />{point.category} · {point.status}
            <br />{point.location || 'Location not specified'}
            <br /><small>Submitted pin; geographic verification is not recorded.</small>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}

function AnalyticsPanel({ title, children, className = '' }) {
  return (
    <section className={`card community-issues-panel ${className}`}>
      <div className="card-head"><h2>{title}</h2></div>
      {children}
    </section>
  )
}

export default function CommunityIssuesMonitoring() {
  const [rangePreset, setRangePreset] = useState('last30')
  const [range, setRange] = useState(() => dateRangeFor('last30'))
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [listReloadKey, setListReloadKey] = useState(0)
  const [issueForLinks, setIssueForLinks] = useState(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (range.dateFrom) params.set('dateFrom', range.dateFrom)
    if (range.dateTo) params.set('dateTo', range.dateTo)
    if (category) params.set('category', category)
    if (location) params.set('location', location)
    return params.toString()
  }, [range, category, location])
  const invalidDateRange = Boolean(range.dateFrom && range.dateTo && range.dateFrom > range.dateTo)

  useEffect(() => {
    if (invalidDateRange) {
      setDashboard(null)
      setError('The start date must be on or before the end date.')
      setLoading(false)
      return undefined
    }
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api.get(`/api/community-issues/dashboard?${query}`, { signal: controller.signal })
      .then(({ data }) => setDashboard(data))
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [query, reloadKey, invalidDateRange])

  const locations = dashboard?.locations?.filter((item) => item.location !== 'Location not specified') ?? []
  const maxCategory = Math.max(1, ...(dashboard?.categories ?? []).map((item) => item.count))
  const maxLocation = Math.max(1, ...locations.map((item) => item.count))
  const maxTrend = Math.max(1, ...(dashboard?.trends ?? []).map((item) => item.count))
  const issueStatuses = dashboard?.issueStatuses ?? {}
  const recurringNote = 'Existing monitored issues with at least two linked complaints in the selected period.'
  const listConfig = {
    ...m.communityIssues,
    rowActions: [{ label: 'Manage links', onClick: (row) => setIssueForLinks(row.id) }],
    initialFilters: {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      category,
      location,
      status: selectedStatus,
    },
    filters: [{ name: 'status', label: 'Monitoring status', options: STATUSES }],
  }
  const statCards = [
    { title: 'Total Reported Concerns', value: dashboard?.totalReportedConcerns, detail: 'Existing complaint records · counted once', icon: ClipboardList, tone: 'terracotta', status: '' },
    { title: 'Recurring Community Issues', value: dashboard?.recurringCommunityIssues, detail: 'At least 2 linked complaints', icon: RotateCcw, tone: 'amber', status: '' },
    { title: 'Open Community Issues', value: issueStatuses.Open ?? 0, detail: 'Current monitoring status: Open', icon: AlertTriangle, tone: 'blue', status: 'Open' },
    { title: 'In Progress', value: issueStatuses['In Progress'] ?? 0, detail: 'Current monitoring status: In Progress', icon: Activity, tone: 'purple', status: 'In Progress' },
    { title: 'Resolved / Closed', value: (issueStatuses.Resolved ?? 0) + (issueStatuses.Closed ?? 0), detail: 'Existing issue records', icon: CheckCircle2, tone: 'green', status: 'Resolved' },
  ]

  return (
    <div className="community-issues-dashboard">
      <header className="community-issues-header">
        <div>
          <p className="community-issues-eyebrow">Area 6 · Monitoring</p>
          <h1>Community Issues Monitoring</h1>
          <p className="muted">Monitor recurring community concerns and complaint patterns across Area 6.</p>
          {dashboard && <span className="community-issues-refreshed">Data refreshed {fmtDateTime(dashboard.refreshedAt)}</span>}
        </div>
        <button type="button" className="btn btn-outline" onClick={() => setReloadKey((value) => value + 1)} disabled={loading}>
          <RefreshCw size={16} aria-hidden="true" /> Refresh
        </button>
      </header>

      <section className="card community-issues-toolbar" aria-label="Community issue filters">
        <div className="community-issues-presets" aria-label="Date range presets">
          {[
            ['today', 'Today'], ['last7', 'Last 7 days'], ['week', 'This week'],
            ['month', 'This month'], ['last30', 'Last 30 days'], ['year', 'This year'],
          ].map(([value, label]) => (
            <button key={value} type="button" className={`btn btn-sm ${rangePreset === value ? 'btn-primary' : 'btn-outline'}`} onClick={() => {
              setRangePreset(value)
              setRange(dateRangeFor(value))
            }}>{label}</button>
          ))}
        </div>
        <div className="community-issues-date-range">
          <label className="field">
            <span>From</span>
            <input type="date" max={range.dateTo || undefined} value={range.dateFrom} onChange={(event) => {
              setRangePreset('custom')
              setRange((current) => ({ ...current, dateFrom: event.target.value }))
            }} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" min={range.dateFrom || undefined} value={range.dateTo} onChange={(event) => {
              setRangePreset('custom')
              setRange((current) => ({ ...current, dateTo: event.target.value }))
            }} />
          </label>
        </div>
        <div className="community-issues-select-filters">
          <label className="field">
            <span>Complaint category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {COMPLAINT_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Reported location text</span>
            <select value={location} onChange={(event) => setLocation(event.target.value)}>
              <option value="">All reported locations</option>
              {locations.map((item) => <option key={item.location} value={item.location}>{item.location}</option>)}
            </select>
          </label>
        </div>
        <p className="community-issues-filter-note">Date filters use Asia/Manila calendar days. Complaint locations are the original submitted text and are not verified Area 6 location assignments.</p>
      </section>

      {error && <Alert>{error}</Alert>}
      {loading && !dashboard ? <SkeletonList count={2} lines={2} /> : dashboard && (
        <>
          <section className="community-issues-stats" aria-label="Monitoring summary">
            {statCards.map(({ title, value, detail, icon: Icon, tone, status }) => {
              const Element = status ? 'button' : 'div'
              return <Element
                type={status ? 'button' : undefined}
                key={title}
                className={`community-issues-stat ${tone}`}
                title={title === 'Recurring Community Issues' ? recurringNote : undefined}
                onClick={status ? () => setSelectedStatus(status) : undefined}
              >
                <span className="community-issues-stat-icon"><Icon size={18} aria-hidden="true" /></span>
                <span className="community-issues-stat-title">{title}</span>
                <strong>{loading ? '…' : (value ?? 0).toLocaleString()}</strong>
                <span className="community-issues-stat-detail">{detail}</span>
              </Element>
            })}
          </section>

          <div className="community-issues-analytics-grid">
            <AnalyticsPanel title="Complaint incident pins">
              <p className="community-issues-chart-note">Pins reflect submitted complaint coordinates. They are not verified boundary or coverage determinations.</p>
              {dashboard.mapPoints?.length ? (
                <div className="community-issues-map-wrap"><MonitoringMap points={dashboard.mapPoints} /></div>
              ) : (
                <div className="community-issues-map-empty"><MapPin size={24} /><span>No incident coordinate data available for this filter or role.</span></div>
              )}
            </AnalyticsPanel>

            <AnalyticsPanel title="Concerns by complaint category">
              {dashboard.categories.length === 0 ? <EmptyState title="No complaint data for this period" /> : (
                <div className="community-issues-bars">
                  {dashboard.categories.map((item) => (
                    <div className="community-issues-bar-row" key={item.category}>
                      <span title={item.category}>{item.category}</span>
                      <div className="community-issues-bar-track"><span style={{ width: `${Math.max(3, item.count / maxCategory * 100)}%` }} /></div>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              )}
            </AnalyticsPanel>

            <AnalyticsPanel title="Reported location text">
              <p className="community-issues-chart-note">These are submitted incident-location descriptions, not assigned subdivision boundaries.</p>
              {locations.length === 0 ? <EmptyState title="No reported locations for this period" /> : (
                <div className="community-issues-bars">
                  {locations.slice(0, 8).map((item) => (
                    <div className="community-issues-bar-row" key={item.location}>
                      <span title={item.location}>{item.location}</span>
                      <div className="community-issues-bar-track"><span style={{ width: `${Math.max(3, item.count / maxLocation * 100)}%` }} /></div>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                  {(dashboard.locations.find((item) => item.location === 'Location not specified')?.count ?? 0) > 0 && (
                    <p className="muted">Location not specified: {dashboard.locations.find((item) => item.location === 'Location not specified').count}</p>
                  )}
                </div>
              )}
            </AnalyticsPanel>

            <AnalyticsPanel title="Monthly reported concerns">
              {dashboard.trends.length === 0 ? <EmptyState title="No trend data for this period" /> : (
                <div className="community-issues-trend">
                  {dashboard.trends.map((item) => (
                    <div className="community-issues-trend-item" key={`${item.year}-${item.month}`} title={`${item.count} complaint records`}>
                      <span className="community-issues-trend-bar" style={{ height: `${Math.max(5, item.count / maxTrend * 100)}%` }} />
                      <strong>{item.count}</strong>
                      <small>{new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(item.year, item.month - 1, 1))}<br />{item.year}</small>
                    </div>
                  ))}
                </div>
              )}
            </AnalyticsPanel>
          </div>

          {selectedStatus && <button type="button" className="btn btn-outline btn-sm community-issues-clear-status" onClick={() => setSelectedStatus('')}>Clear status filter</button>}
          <p className="community-issues-list-note">These issue records are separate from formal complaints and link back to original complaint references.</p>
          <ResourcePage key={`${selectedStatus}-${category}-${location}-${range.dateFrom}-${range.dateTo}-${listReloadKey}`} config={listConfig} />
          {dashboard.recurringCommunityIssues > 0 && <p className="community-issues-method-note">{recurringNote} A repeated count is a review signal only; it does not automatically verify or merge an issue.</p>}
        </>
      )}
      {issueForLinks && (
        <CommunityIssueLinksModal
          issueId={issueForLinks}
          onClose={() => setIssueForLinks(null)}
          onChanged={() => {
            setReloadKey((value) => value + 1)
            setListReloadKey((value) => value + 1)
          }}
        />
      )}
    </div>
  )
}
