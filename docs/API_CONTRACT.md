# API contract expected by the frontend

Base URL: `VITE_API_BASE_URL` (default `http://localhost:5085`). JSON, camelCase. Auth: `Authorization: Bearer <jwt>`.
Roles are `Resident` and `Admin`. **Every rule below must be enforced by the API**; the UI only mirrors it.
List endpoints accept `page`, `pageSize`, `q` plus the filters shown, and return `{ "items": [...], "total": n }` (a bare array also works).

Status: every route below is now implemented in `Annex6-Backend` (written, not yet compiled/run: see the backend README).

## Auth
| | Method & route | Notes |
|---|---|---|
| ✅ | `POST /api/auth/login` `{email, password}` | Returns `{token, role, email}`. `email` field also accepts a username. JWT must contain `exp` and the role claim. |
| ✅ | `POST /api/auth/register-resident` `{email, password, fullName}` | Public, residents only. Errors = Identity error array. |
| ✅ | `POST /api/auth/logout` | Frontend calls it best-effort, then signs out locally. Useful for the audit log. |

## Dev-only
| | Route | Notes |
|---|---|---|
| ✅ | `POST /api/dev/device-bypass` `{code}` → `{expiresAt}` | Map **only** when `IsDevelopment()` **and** `EnableLocalDeviceBypass=true`; otherwise 404. Compare against a user-secret with a constant-time compare, rate-limit attempts (return 429), never echo the code. Grants nothing except the UI device check; require a valid JWT. |

## Public (no login)
| | Route | Notes |
|---|---|---|
| ✅ | `POST /api/reports/guest` `{guestName, guestContact, category, location, description, website}` → `{id?, referenceNumber, submittedAt}` | Rate-limit per IP, reject when `website` (honeypot) is non-empty, validate lengths, return no other data. Creates `Report{IsGuest=true, IsEmergency=true}`. |

## Resident (role `Resident`, own data only)
| | Route | Notes |
|---|---|---|
| ✅ | `GET /api/residents/me`, `PUT /api/residents/me` `{firstName,lastName,address,contactNumber}` | PUT creates the `Resident` row (linked by `UserId`) if missing; GET returns 404 if none. |
| ✅ | `GET /api/complaints/mine`, `GET /api/complaints/{id}`, `POST /api/complaints` | `{category, subject, description, location}` → `{id, referenceNumber, submittedAt}`. `{id}` must 404/403 unless owned. Detail includes `history:[{id,status,remarks,changedAt}]`. |
| ✅ | `GET /api/reports/mine`, `GET /api/reports/{id}`, `POST /api/reports` | `{isEmergency, category, location, description}` → `{id, referenceNumber, submittedAt}`. Same ownership rule. |
| ✅ | `GET /api/announcements` | Published and not archived only. Items: `{id,title,content,category,publishedAt}`. |

## Admin (role `Admin`)
| | Route | Notes |
|---|---|---|
| ✅ | `GET /api/dashboard/summary` | `{residents, complaints, pendingReports, emergencyReports, announcements}` from real counts. |
| ✅ | `/api/residents` GET (`q`, `archived`), POST, PUT `/{id}`, DELETE `/{id}` | DELETE = archive (`IsArchived=true`). Reject duplicates. |
| ✅ | `GET /api/complaints` (`q`, `status`, `dateFrom`, `dateTo`), `GET /{id}`, `POST /{id}/status` `{status, remarks}` | Status change writes `ComplaintStatusHistory` + audit log in one transaction. Detail adds `residentName`. |
| ✅ | `GET /api/reports` (`q`, `type`=emergency\|non-emergency, `source`=guest\|resident, `status`, dates), `GET /{id}`, `POST /{id}/status` | Detail adds `residentName`, `guestName`, `guestContact`. |
| ✅ | `/api/operations` GET (`q`, dates), POST, PUT `/{id}` | `{title, date, responsiblePersonnel, description, remarks}` |
| ✅ | `/api/fire-rescue` GET (`q`, `fireRelated`, `status`, dates), POST, PUT `/{id}`; `GET /api/fire-rescue/summary` | `summary` → `{total, fireRelated, otherResponse, active, resolved}` (optional; hidden if missing). POST generates `referenceNumber`. |
| ✅ | `GET /api/announcements/manage` (`q`, `state`=draft\|published\|archived), POST, PUT `/{id}`, `POST /{id}/publish`, `POST /{id}/archive` | |
| ✅ | `GET /api/audit-logs` (`q`, dates) | Items: `{id, timestamp, userId, userName?, action, affectedRecord, details}`. Never log passwords/tokens. |

## CORS
Allow `http://localhost:5173` (Vite dev) **and `http://localhost:4173`** (`npm run preview`, needed to test the service worker/PWA).

## Behaviours the frontend relies on
- A resident must save their profile (`PUT /api/residents/me`) before filing a complaint or report; otherwise the API answers `409` with a clear message.
- Another resident's record id returns `404` (not `403`) so ids cannot be probed.
- `POST /api/dev/device-bypass` answers a wrong code with `400` (a `401` would make the frontend sign the user out).
- `POST /api/reports/guest` returns only `{referenceNumber, submittedAt}`.
