import { useEffect, useState } from 'react'
import { StatusBadge } from '../../components/ui'
import { api } from '../../lib/api'
import {
  COMPLAINT_STATUSES, REPORT_STATUSES,
  fmtDate, fmtDateTime, toDateInput,
} from '../../lib/format'

const status = (r) => <StatusBadge status={r.status} />

export const residents = {
  title: 'Resident Records', endpoint: '/api/residents', searchPlaceholder: 'Search name, address or contact number',
  allowCreate: true, allowEdit: true,
  filters: [{ name: 'archived', label: 'Record state', options: [{ value: 'false', label: 'Active' }, { value: 'true', label: 'Archived' }] }],
  columns: [
    { key: 'name', label: 'Name', render: (r) => `${r.lastName}, ${r.firstName}` },
    { key: 'address', label: 'Address' }, { key: 'contactNumber', label: 'Contact' },
    { key: 'photoUrl', label: 'Photo', render: (r) => r.photoUrl ? 'Yes' : '—' },
    { key: 'isArchived', label: 'State', render: (r) => <StatusBadge status={r.isArchived ? 'Archived' : 'Active'} /> },
    { key: 'createdAt', label: 'Added', render: (r) => fmtDate(r.createdAt) },
  ],
  fields: [
    { name: 'firstName', label: 'First name', required: true, maxLength: 100 },
    { name: 'lastName', label: 'Last name', required: true, maxLength: 100 },
    { name: 'address', label: 'Address', maxLength: 250, full: true },
    { name: 'contactNumber', label: 'Contact number', type: 'tel', maxLength: 30 },
    { name: 'purok', label: 'Purok / Sitio', type: 'select', options: ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6'], full: true },
    { name: 'idType', label: 'Valid ID type', type: 'select', options: ['National ID', 'Passport', "Driver's license", 'UMID', "Voter's ID", 'Postal ID', 'Other government-issued ID'] },
    { name: 'idNumber', label: 'ID number', maxLength: 120 },
    { name: 'email', label: 'Login email (optional)', type: 'email', maxLength: 256, full: true, hint: 'If provided with password, creates a resident login account' },
    { name: 'password', label: 'Login password (optional)', type: 'password', maxLength: 128, hint: 'Min 8 chars, uppercase, lowercase, digit' },
  ],
  toForm: (r) => ({ ...r, purok: r.purok ?? '', idType: r.idType ?? '', idNumber: r.idNumber ?? '', email: '', password: '' }),
  toPayload: (v) => ({
    firstName: v.firstName.trim(), lastName: v.lastName.trim(),
    address: v.address?.trim() || null, contactNumber: v.contactNumber?.trim() || null,
    purok: v.purok || null, idType: v.idType || null, idNumber: v.idNumber?.trim() || null,
    email: v.email?.trim() || null, password: v.password || null,
  }),
  rowActions: [
    { label: 'Archive', danger: true, show: (r) => !r.isArchived, confirm: (r) => `Archive ${r.firstName} ${r.lastName}? Archived residents are hidden from active lists but their records are kept.`, success: 'Resident archived.', run: (r) => api.delete(`/api/residents/${r.id}`) },
  ],
  review: {
    statuses: [],
    rows: (d) => [
      ['Reference', `#${d.id}`],
      ['Full name', `${d.lastName}, ${d.firstName}`],
      ['Address', d.address || '—'],
      ['Contact number', d.contactNumber || '—'],
      ['Purok', d.purok || '—'],
      ['ID type', d.idType || '—'],
      ['ID number', d.idNumber || '—'],
      ['Photo', d.photoUrl ? 'Uploaded' : 'None'],
      ['Status', d.isArchived ? 'Archived' : 'Active'],
      ['Created', fmtDate(d.createdAt)],
      ['Updated', d.updatedAt ? fmtDateTime(d.updatedAt) : '—'],
    ],
  },
}

export const complaints = {
  title: 'Complaints', endpoint: '/api/complaints', searchPlaceholder: 'Search reference number, subject or category',
  filters: [
    { name: 'status', label: 'Status', options: COMPLAINT_STATUSES },
    { name: 'dateFrom', label: 'From' }, { name: 'dateTo', label: 'To' },
  ],
  columns: [
    { key: 'referenceNumber', label: 'Reference' }, { key: 'category', label: 'Category' }, { key: 'subject', label: 'Subject' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status', render: status }, { key: 'submittedAt', label: 'Submitted', render: (r) => fmtDateTime(r.submittedAt) },
  ],
  review: {
    statuses: COMPLAINT_STATUSES,
    rows: (d) => [['Reference', d.referenceNumber], ['Category', d.category], ['Subject', d.subject], ['Location', d.location], ['Resident', d.residentName], ['Submitted', fmtDateTime(d.submittedAt)]],
  },
}

export const reports = {
  title: 'Reports', endpoint: '/api/reports', searchPlaceholder: 'Search reference number, category or location',
  filters: [
    { name: 'source', label: 'Source', options: [{ value: 'guest', label: 'Guest' }, { value: 'resident', label: 'Resident' }] },
    { name: 'status', label: 'Status', options: REPORT_STATUSES },
    { name: 'dateFrom', label: 'From' }, { name: 'dateTo', label: 'To' },
  ],
  columns: [
    { key: 'referenceNumber', label: 'Reference' },
    { key: 'category', label: 'Category' }, { key: 'location', label: 'Location' },
    { key: 'isGuest', label: 'Source', render: (r) => (r.isGuest ? 'Guest' : 'Resident') },
    { key: 'status', label: 'Status', render: status }, { key: 'submittedAt', label: 'Submitted', render: (r) => fmtDateTime(r.submittedAt) },
  ],
  review: {
    statuses: REPORT_STATUSES,
    rows: (d) => [['Reference', d.referenceNumber], ['Category', d.category], ['Location', d.location],
      ['Source', d.isGuest ? 'Guest' : 'Resident'], ['Reporter', d.isGuest ? d.guestName : d.residentName], ['Contact', d.guestContact ?? d.contactNumber], ['Submitted', fmtDateTime(d.submittedAt)]],
  },
}

export const operations = {
  title: 'Daily Operations', endpoint: '/api/operations', searchPlaceholder: 'Search title, description or personnel',
  allowCreate: true, allowEdit: true,
  filters: [{ name: 'dateFrom', label: 'From' }, { name: 'dateTo', label: 'To' }],
  columns: [
    { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'title', label: 'Activity' },
    { key: 'responsiblePersonnel', label: 'Personnel' }, { key: 'remarks', label: 'Remarks' },
    { key: 'updatedAt', label: 'Last updated', render: (r) => fmtDateTime(r.updatedAt ?? r.createdAt) },
  ],
  fields: [
    { name: 'title', label: 'Activity title', required: true, maxLength: 150 },
    { name: 'date', label: 'Date', type: 'date', required: true, default: toDateInput(new Date().toISOString()) },
    { name: 'responsiblePersonnel', label: 'Responsible personnel', maxLength: 150 },
    { name: 'description', label: 'Description', type: 'textarea', required: true, full: true, maxLength: 2000 },
    { name: 'remarks', label: 'Remarks', type: 'textarea', full: true, maxLength: 1000 },
  ],
  toForm: (r) => ({ ...r, date: toDateInput(r.date) }),
}

const annState = (a) => (a.isArchived ? 'Archived' : a.isPublished ? 'Published' : 'Draft')
export const announcements = {
  title: 'Announcements', endpoint: '/api/announcements/manage', createEndpoint: '/api/announcements', updateEndpoint: '/api/announcements', searchPlaceholder: 'Search title, content or category',
  allowCreate: true, allowEdit: true,
  filters: [{ name: 'state', label: 'State', options: [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }, { value: 'archived', label: 'Archived' }] }],
  columns: [
    { key: 'title', label: 'Title' }, { key: 'category', label: 'Category' },
    { key: 'state', label: 'State', render: (a) => <StatusBadge status={annState(a)} /> },
    { key: 'publishedAt', label: 'Published', render: (a) => fmtDate(a.publishedAt) },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, full: true, maxLength: 150 },
    { name: 'category', label: 'Category', maxLength: 50 },
    { name: 'content', label: 'Content', type: 'textarea', required: true, full: true, maxLength: 4000 },
  ],
  rowActions: [
    { label: 'Publish', show: (a) => !a.isPublished && !a.isArchived, confirm: (a) => `Publish “${a.title}”? Residents will be able to see it immediately.`, success: 'Announcement published.', run: (a) => api.post(`/api/announcements/${a.id}/publish`) },
    { label: 'Archive', danger: true, show: (a) => !a.isArchived, confirm: (a) => `Archive “${a.title}”? It will no longer be shown to residents.`, success: 'Announcement archived.', run: (a) => api.post(`/api/announcements/${a.id}/archive`) },
  ],
}

export const communityIssues = {
  title: 'Community Issues', endpoint: '/api/community-issues', searchPlaceholder: 'Search title, summary or location',
  allowCreate: true, allowEdit: true,
  filters: [{ name: 'status', label: 'Status', options: [{ value: 'Open', label: 'Open' }, { value: 'In Progress', label: 'In Progress' }, { value: 'Resolved', label: 'Resolved' }, { value: 'Closed', label: 'Closed' }] }],
  columns: [
    { key: 'title', label: 'Title' }, { key: 'location', label: 'Location' },
    { key: 'relatedComplaintCount', label: 'Related Complaints' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', label: 'Created', render: (r) => fmtDate(r.createdAt) },
  ],
  fields: [
    { name: 'title', label: 'Issue title', required: true, full: true, maxLength: 150 },
    { name: 'summary', label: 'Summary', type: 'textarea', required: true, full: true, maxLength: 2000 },
    { name: 'location', label: 'Affected area', maxLength: 250, full: true },
    { name: 'assignedToUserId', label: 'Assigned to (user ID)', maxLength: 450 },
  ],
  toForm: (r) => ({ title: r.title, summary: r.summary, location: r.location ?? '', assignedToUserId: r.assignedToUserId ?? '' }),
  toPayload: (v) => ({ title: v.title.trim(), summary: v.summary.trim(), location: v.location?.trim() || null, assignedToUserId: v.assignedToUserId?.trim() || null }),
}

export const officials = {
  title: 'Barangay Officials', endpoint: '/api/officials/all', searchPlaceholder: 'Search name or position',
  allowCreate: true, allowEdit: true,
  columns: [
    { key: 'fullName', label: 'Name' }, { key: 'position', label: 'Position' },
    { key: 'contactNumber', label: 'Contact' }, { key: 'email', label: 'Email' },
    { key: 'displayOrder', label: 'Order' },
    { key: 'isActive', label: 'Status', render: (r) => <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} /> },
  ],
  fields: [
    { name: 'fullName', label: 'Full name', required: true, maxLength: 150 },
    { name: 'position', label: 'Position', required: true, maxLength: 100 },
    { name: 'contactNumber', label: 'Contact number', type: 'tel', maxLength: 30 },
    { name: 'email', label: 'Email', type: 'email', maxLength: 256 },
    { name: 'photoUrl', label: 'Photo URL', maxLength: 500, full: true },
    { name: 'displayOrder', label: 'Display order', type: 'number', default: '0' },
    { name: 'isActive', label: 'Active', type: 'select', options: ['true', 'false'], default: 'true' },
  ],
  toForm: (r) => ({ ...r, isActive: String(r.isActive), displayOrder: String(r.displayOrder) }),
  toPayload: (v) => ({
    fullName: v.fullName.trim(), position: v.position.trim(),
    contactNumber: v.contactNumber?.trim() || null, email: v.email?.trim() || null,
    photoUrl: v.photoUrl?.trim() || null, displayOrder: Number(v.displayOrder) || 0,
    isActive: v.isActive === 'true',
  }),
}

export const applications = {
  title: 'Resident Applications', endpoint: '/api/applications', searchPlaceholder: 'Search name, email or contact',
  allowCreate: false, allowEdit: false,
  filters: [{ name: 'status', label: 'Status', options: [{ value: 'Pending Verification', label: 'Pending' }, { value: 'Under Review', label: 'Under Review' }, { value: 'Verified', label: 'Verified' }, { value: 'Rejected', label: 'Rejected' }] }],
  columns: [
    { key: 'fullName', label: 'Name' }, { key: 'email', label: 'Email' },
    { key: 'contactNumber', label: 'Contact' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', label: 'Submitted', render: (r) => fmtDateTime(r.createdAt) },
  ],
  rowActions: [
    { label: 'Review', show: () => true, navigate: (r) => `/admin/applications/${r.id}` },
    { label: 'Verify', show: (r) => r.status !== 'Verified', confirm: (r) => `Verify ${r.fullName}?`, success: 'Application verified.', run: (r) => api.put(`/api/applications/${r.id}/review`, { status: 'Verified', remarks: 'Verified by admin' }) },
    { label: 'Reject', danger: true, show: (r) => r.status !== 'Rejected', confirm: (r) => `Reject ${r.fullName}?`, success: 'Application rejected.', run: (r) => api.put(`/api/applications/${r.id}/review`, { status: 'Rejected', remarks: 'Rejected by admin' }) },
  ],
}

export const auditLogs = {
  title: 'Audit Trail', endpoint: '/api/audit-logs', searchPlaceholder: 'Search action, record or user', pageSize: 20,
  filters: [{ name: 'dateFrom', label: 'From' }, { name: 'dateTo', label: 'To' }],
  columns: [
    { key: 'timestamp', label: 'When', render: (r) => fmtDateTime(r.timestamp) }, { key: 'userName', label: 'User', render: (r) => r.userName ?? r.userId ?? '—' },
    { key: 'action', label: 'Action' }, { key: 'affectedRecord', label: 'Record' }, { key: 'details', label: 'Details' },
  ],
}
