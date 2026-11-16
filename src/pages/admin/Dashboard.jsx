import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Alert, EmptyState, Spinner } from '../../components/ui'
import { toPage } from '../../lib/api'
import { fmtDateTime } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'

function priorityColor(p) {
    return p === 'Critical' ? '#B42318'
        : p === 'High' ? '#EA580C'
        : p === 'Medium' ? '#A85D08'
        : '#287A4B'
}

const PriorityBadge = ({ priority }) => (
    <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        background: priorityColor(priority) + '20',
        color: priorityColor(priority),
    }}>
        {priority}
    </span>
)

const StatCard = ({ label, value, color, to, icon }) => (
    <Link
        to={to}
        style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#fff',
            borderRadius: '16px',
            padding: '20px',
            borderLeft: `4px solid ${color}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            border: `1px solid #F0EDE8`,
            borderLeft: `4px solid ${color}`,
            textDecoration: 'none',
            transition: 'box-shadow 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
    >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </span>
            <div style={{
                width: 32, height: 32, borderRadius: '10px',
                background: color + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {icon}
            </div>
        </div>
        <strong style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>
            {value}
        </strong>
    </Link>
)

const SectionCard = ({ title, action, children, style = {} }) => (
    <div style={{
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #F0EDE8',
        overflow: 'hidden',
        ...style,
    }}>
        {(title || action) && (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #F0EDE8',
            }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', margin: 0 }}>
                    {title}
                </h2>
                {action}
            </div>
        )}
        <div style={{ padding: '16px 20px' }}>
            {children}
        </div>
    </div>
)

const ViewAllLink = ({ to }) => (
    <Link
        to={to}
        style={{ fontSize: '12px', fontWeight: 600, color: '#287A4B', textDecoration: 'none' }}
    >
        View all →
    </Link>
)

export default function Dashboard() {
    const summary  = useFetch('/api/dashboard/summary')
    const activity = useFetch('/api/audit-logs', { page: 1, pageSize: 10 })
    const byStatus = useFetch('/api/dashboard/complaints-by-status')
    const byPriority = useFetch('/api/dashboard/complaints-by-priority')
    const sourceAnalytics = useFetch('/api/complaints/analytics/source')
    const emerging = useFetch('/api/dashboard/emerging-issues')
    const perf     = useFetch('/api/dashboard/resolution-performance')
    const aging    = useFetch('/api/dashboard/aging-complaints')
    const attention = useFetch('/api/dashboard/attention-today')

    const pulseLevel = useMemo(() => {
        const o = summary.data?.overdueComplaints ?? 0
        const c = summary.data?.complaints ?? 0
        if (o > 5 || (c > 0 && o / c > 0.3))
            return { level: 'Critical', color: '#B42318', bg: '#FEF2F2', dot: '#B42318' }
        if (o > 2 || (c > 0 && o / c > 0.15))
            return { level: 'Needs Attention', color: '#A85D08', bg: '#FFFBEB', dot: '#A85D08' }
        return { level: 'Stable', color: '#287A4B', bg: '#F0FDF4', dot: '#287A4B' }
    }, [summary.data])

    const resolvedCount = summary.data?.resolvedComplaints ?? 0
    const totalCount    = summary.data?.complaints ?? 0
    const avgResTime    = perf.data?.AvgResolutionHours ?? 0
    const successRate   = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0

    const statCards = [
        {
            id: 'residents', label: 'Registered Residents',
            value: summary.data?.residents ?? 0,
            color: '#287A4B', to: '/admin/residents',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#287A4B" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
        },
        {
            id: 'complaints', label: 'Total Complaints',
            value: summary.data?.complaints ?? 0,
            color: '#C63F0A', to: '/admin/complaints',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C63F0A" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
        },
        {
            id: 'pendingReports', label: 'Pending Complaints',
            value: summary.data?.pendingReports ?? 0,
            color: '#A85D08', to: '/admin/complaints',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A85D08" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
        },
        {
            id: 'resolvedComplaints', label: 'Resolved Complaints',
            value: summary.data?.resolvedComplaints ?? 0,
            color: '#287A4B', to: '/admin/complaints',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#287A4B" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>,
        },
        {
            id: 'overdueComplaints', label: 'Overdue Complaints',
            value: summary.data?.overdueComplaints ?? 0,
            color: '#B42318', to: '/admin/complaints',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B42318" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
        },
        {
            id: 'communityIssues', label: 'Active Community Issues',
            value: summary.data?.communityIssues ?? 0,
            color: '#C63F0A', to: '/admin/community-issues',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C63F0A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
        },
        {
            id: 'pendingApplications', label: 'Pending Applications',
            value: summary.data?.pendingApplications ?? 0,
            color: '#A85D08', to: '/admin/applications',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A85D08" strokeWidth="2"><rect x="9" y="2" width="6" height="6"/><path d="M17 22H7a2 2 0 0 1-2-2V9h14v11a2 2 0 0 1-2 2z"/></svg>,
        },
    ]

    const modules = [
        ['Residents', 'residents'], ['Complaints', 'complaints'],
        ['Reports', 'reports'], ['Daily Operations', 'operations'],
        ['Announcements', 'announcements'], ['Community Issues', 'community-issues'],
        ['Barangay Officials', 'officials'], ['Resident Applications', 'applications'],
        ['Audit Trail', 'audit-logs'],
    ]

    const tooltipStyle = {
        contentStyle: {
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }
    }

    return (
        <div className="admin-main" style={{ padding: '1.5rem 2rem', maxWidth: 'none', width: '100%' }}>

            {/* HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1F1F1F', margin: 0 }}>
                        Dashboard
                    </h1>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                        Barangay San Jose Annex Area 6 — Complaint Management System
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 16px', borderRadius: '10px',
                        background: '#fff', border: '1px solid #E5E7EB',
                        fontSize: '13px', fontWeight: 600, color: '#374151',
                        cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="23,4 23,11 16,11"/><polyline points="1,20 1,13 8,13"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 11M1 13l4.64 5.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Refresh
                </button>
            </div>

            {/* COMMUNITY PULSE */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                padding: '14px 20px', borderRadius: '14px', marginBottom: '1.25rem',
                background: pulseLevel.bg, border: `1px solid ${pulseLevel.color}30`,
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 16px', borderRadius: '10px',
                    background: pulseLevel.color, color: '#fff',
                    fontWeight: 700, fontSize: '13px', flexShrink: 0,
                }}>
                    <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#fff', opacity: 0.8, display: 'inline-block'
                    }} />
                    Community Pulse: {pulseLevel.level}
                </div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#4B5563' }}>
                    <span><strong style={{ color: '#111827' }}>{summary.data?.overdueComplaints ?? 0}</strong> overdue</span>
                    <span style={{ color: '#D1D5DB' }}>·</span>
                    <span><strong style={{ color: '#111827' }}>{summary.data?.complaints ?? 0}</strong> total</span>
                    <span style={{ color: '#D1D5DB' }}>·</span>
                    <span><strong style={{ color: '#111827' }}>{summary.data?.resolvedComplaints ?? 0}</strong> resolved</span>
                </div>
            </div>

            {/* STAT CARDS */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '14px',
                marginBottom: '1.5rem',
            }}>
                {statCards.map(card => (
                    <StatCard key={card.id} {...card} />
                ))}
            </div>

            {/* TWO COLUMN */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>

                {/* LEFT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    <SectionCard title="What Needs Attention Today" action={<ViewAllLink to="/admin/complaints" />}>
                        {attention.loading ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner /></div>
                        ) : attention.error ? (
                            <Alert>{attention.error}</Alert>
                        ) : (attention.data ?? []).length === 0 ? (
                            <EmptyState title="No urgent complaints" />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(attention.data ?? []).map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => { window.location.href = `/admin/complaints#${c.id}` }}
                                        style={{
                                            display: 'flex', alignItems: 'flex-start', gap: '10px',
                                            padding: '10px 12px', borderRadius: '10px',
                                            border: '1px solid #F0EDE8',
                                            borderLeft: `3px solid ${priorityColor(c.priority)}`,
                                            cursor: 'pointer', background: '#FAFAFA',
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
                                                <strong style={{ fontSize: '13px', color: '#1F1F1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {c.subject}
                                                </strong>
                                                <PriorityBadge priority={c.priority} />
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: '#9CA3AF', flexWrap: 'wrap' }}>
                                                <span>{c.referenceNumber}</span>
                                                <span>·</span>
                                                <span>{c.category}</span>
                                                <span>·</span>
                                                <span>{c.status}</span>
                                                {c.dueDate && new Date(c.dueDate) < new Date() && (
                                                    <span style={{ color: '#B42318', fontWeight: 700 }}>Overdue</span>
                                                )}
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '11px', color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                            {fmtDateTime(c.submittedAt)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard title="Recent Activity" action={<ViewAllLink to="/admin/audit-logs" />}>
                        {activity.loading ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner /></div>
                        ) : activity.error ? (
                            <Alert>{activity.error}</Alert>
                        ) : toPage(activity.data).items.length === 0 ? (
                            <EmptyState title="No activity recorded yet" />
                        ) : (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {toPage(activity.data).items.map((a, i, arr) => (
                                    <li key={a.id} style={{
                                        padding: '10px 0',
                                        borderBottom: i < arr.length - 1 ? '1px solid #F3F0EC' : 'none',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <div>
                                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1F1F1F', margin: '0 0 2px' }}>
                                                    {a.action}
                                                    {a.affectedRecord && (
                                                        <span style={{ color: '#9CA3AF', fontWeight: 400 }}> · {a.affectedRecord}</span>
                                                    )}
                                                </p>
                                                <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>
                                                    {a.userName || a.userId || 'system'}
                                                </p>
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                {fmtDateTime(a.timestamp)}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SectionCard>

                </div>

                {/* RIGHT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* CHARTS */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

                        <SectionCard title="Complaints by Status">
                            {byStatus.loading ? (
                                <div style={{ textAlign: 'center', padding: '1rem' }}><Spinner /></div>
                            ) : byStatus.error ? (
                                <Alert>{byStatus.error}</Alert>
                            ) : Object.keys(byStatus.data ?? {}).length === 0 ? (
                                <EmptyState title="No complaints yet" />
                            ) : (
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart
                                        data={Object.entries(byStatus.data ?? {}).map(([name, value]) => ({ name, value }))}
                                        margin={{ top: 5, right: 5, bottom: 24, left: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" />
                                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9CA3AF' }} angle={-30} textAnchor="end" height={50} />
                                        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
                                        <Tooltip {...tooltipStyle} />
                                        <Bar dataKey="value" fill="#C63F0A" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </SectionCard>

                        <SectionCard title="Complaints by Priority">
                            {byPriority.loading ? (
                                <div style={{ textAlign: 'center', padding: '1rem' }}><Spinner /></div>
                            ) : byPriority.error ? (
                                <Alert>{byPriority.error}</Alert>
                            ) : Object.keys(byPriority.data ?? {}).length === 0 ? (
                                <EmptyState title="No complaints yet" />
                            ) : (
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie
                                            data={Object.entries(byPriority.data ?? {}).map(([name, value]) => ({ name, value }))}
                                            cx="50%" cy="50%"
                                            innerRadius={45} outerRadius={70}
                                            paddingAngle={3} dataKey="value"
                                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {Object.entries(byPriority.data ?? {}).map(([name], i) => (
                                                <Cell key={i} fill={priorityColor(name)} />
                                            ))}
                                        </Pie>
                                        <Tooltip {...tooltipStyle} />
                                        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </SectionCard>

                    </div>

                    <SectionCard title="Complaint Sources and Walk-in Intake">
                        {sourceAnalytics.loading ? (
                            <div style={{ textAlign: 'center', padding: '1rem' }}><Spinner /></div>
                        ) : sourceAnalytics.error ? (
                            <Alert>{sourceAnalytics.error}</Alert>
                        ) : (
                            <>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                                    {[
                                        ['Total complaints', sourceAnalytics.data?.total],
                                        ['Online', sourceAnalytics.data?.online],
                                        ['Walk-in', sourceAnalytics.data?.walkIn],
                                        ['Walk-in today', sourceAnalytics.data?.walkInToday],
                                        ['Walk-in this month', sourceAnalytics.data?.walkInThisMonth],
                                    ].map(([label, count]) => (
                                        <div key={label} style={{ border: '1px solid #E8E3DB', borderRadius: '999px', padding: '6px 10px', fontSize: '12px', color: '#6B7280' }}>
                                            {label}: <strong style={{ color: '#111827' }}>{count ?? 0}</strong>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
                                    {[
                                        ['Walk-ins by category', sourceAnalytics.data?.walkInsByCategory],
                                        ['Walk-ins by status', sourceAnalytics.data?.walkInsByStatus],
                                        ['Walk-ins by location', sourceAnalytics.data?.walkInsByLocation],
                                        ['Walk-ins by receiving personnel', sourceAnalytics.data?.walkInsByReceivingPersonnel],
                                    ].map(([title, rows]) => (
                                        <div key={title}>
                                            <strong style={{ display: 'block', marginBottom: '6px', fontSize: '12px' }}>{title}</strong>
                                            {rows?.length
                                                ? rows.slice(0, 5).map((row) => (
                                                    <div key={row.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '3px 0', fontSize: '12px', color: '#6B7280' }}>
                                                        <span style={{ overflowWrap: 'anywhere' }}>{row.name}</span><strong style={{ color: '#111827' }}>{row.count}</strong>
                                                    </div>
                                                ))
                                                : <span style={{ color: '#9CA3AF', fontSize: '12px' }}>No walk-in complaints</span>}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </SectionCard>

                    {/* RESOLUTION PERFORMANCE */}
                    <SectionCard title="Resolution Performance">
                        {perf.loading ? (
                            <div style={{ textAlign: 'center', padding: '1rem' }}><Spinner /></div>
                        ) : perf.error ? (
                            <Alert>{perf.error}</Alert>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                {[
                                    { label: 'Avg Resolution', value: `${avgResTime}h` },
                                    { label: 'Resolved', value: resolvedCount },
                                    { label: 'Success Rate', value: `${successRate}%` },
                                    { label: 'Reopened', value: perf.data?.ReopenedCount ?? 0 },
                                ].map(({ label, value }) => (
                                    <div key={label} style={{
                                        background: '#F9F7F4', borderRadius: '12px',
                                        padding: '12px', textAlign: 'center',
                                    }}>
                                        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 4px', fontWeight: 600 }}>
                                            {label}
                                        </p>
                                        <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1F1F1F', margin: 0 }}>
                                            {value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    {/* EMERGING ISSUES */}
                    <SectionCard title="Emerging Issues Detection">
                        {emerging.loading ? (
                            <div style={{ textAlign: 'center', padding: '1rem' }}><Spinner /></div>
                        ) : emerging.error ? (
                            <Alert>{emerging.error}</Alert>
                        ) : (emerging.data ?? []).length === 0 ? (
                            <EmptyState title="No recurring patterns detected" />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(emerging.data ?? []).map((issue, i) => (
                                    <div key={i} style={{
                                        padding: '10px 12px', borderRadius: '10px',
                                        background: '#FEF2F2', border: '1px solid #FEE2E2',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <strong style={{ fontSize: '13px', color: '#1F1F1F' }}>{issue.category}</strong>
                                            <span style={{
                                                fontSize: '11px', fontWeight: 700,
                                                background: '#FEE2E2', color: '#991B1B',
                                                padding: '2px 10px', borderRadius: '999px',
                                            }}>
                                                {issue.count} reports
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 2px' }}>
                                            {issue.location} · Latest: {new Date(issue.latestDate).toLocaleDateString()}
                                        </p>
                                        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>
                                            Statuses: {(issue.statuses ?? []).join(', ')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    {/* AGING COMPLAINTS */}
                    <SectionCard title="Complaint Aging (7+ days)" action={<ViewAllLink to="/admin/complaints" />}>
                        {aging.loading ? (
                            <div style={{ textAlign: 'center', padding: '1rem' }}><Spinner /></div>
                        ) : aging.error ? (
                            <Alert>{aging.error}</Alert>
                        ) : (aging.data ?? []).length === 0 ? (
                            <EmptyState title="No aging complaints" />
                        ) : (
                            <div style={{ overflowX: 'auto', margin: '0 -20px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: '#F9F7F4', borderTop: '1px solid #F0EDE8', borderBottom: '1px solid #F0EDE8' }}>
                                            {['Reference', 'Subject', 'Priority', 'Status', 'Days Open'].map(h => (
                                                <th key={h} style={{
                                                    padding: '10px 16px', textAlign: 'left',
                                                    fontSize: '11px', fontWeight: 700,
                                                    color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em',
                                                }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(aging.data ?? []).map((c, i, arr) => (
                                            <tr key={c.id} style={{
                                                borderBottom: i < arr.length - 1 ? '1px solid #F0EDE8' : 'none',
                                            }}>
                                                <td style={{ padding: '10px 16px', fontSize: '12px', color: '#6B7280', fontFamily: 'monospace' }}>
                                                    {c.referenceNumber}
                                                </td>
                                                <td style={{ padding: '10px 16px', color: '#374151', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {c.subject}
                                                </td>
                                                <td style={{ padding: '10px 16px' }}>
                                                    <PriorityBadge priority={c.priority} />
                                                </td>
                                                <td style={{ padding: '10px 16px', fontSize: '12px', color: '#6B7280' }}>
                                                    {c.status}
                                                </td>
                                                <td style={{ padding: '10px 16px' }}>
                                                    <strong style={{ color: '#B42318', fontSize: '13px' }}>
                                                        {Math.floor((new Date().getTime() - new Date(c.submittedAt).getTime()) / 86400000)}d
                                                    </strong>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>

                </div>

            </div>

            {/* MODULES */}
            <SectionCard title="Quick Access — Modules" style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {modules.map(([label, path]) => (
                        <Link
                            key={path}
                            to={`/admin/${path}`}
                            style={{
                                padding: '7px 16px', borderRadius: '10px',
                                fontSize: '13px', fontWeight: 600,
                                background: '#F3F0EC', color: '#374151',
                                textDecoration: 'none', border: '1px solid transparent',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = '#ECFDF5'
                                e.currentTarget.style.color = '#065F46'
                                e.currentTarget.style.borderColor = '#A7F3D0'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = '#F3F0EC'
                                e.currentTarget.style.color = '#374151'
                                e.currentTarget.style.borderColor = 'transparent'
                            }}
                        >
                            {label}
                        </Link>
                    ))}
                </div>
            </SectionCard>

        </div>
    )
}