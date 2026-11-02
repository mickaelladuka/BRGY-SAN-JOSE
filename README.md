# Annex 6 BMIS – Frontend (React + Vite PWA)

Barangay San Jose Annex Area 6 management system. One PWA with two role-based interfaces:
**Residents → mobile only**, **Administrators → desktop/laptop only**, plus a public guest emergency report.

## Run locally
```bash
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
npm run dev                    # http://localhost:5173
```
Start MySQL in XAMPP and run the backend first (`dotnet run` in `Annex6-Backend`, default `http://localhost:5085`).
Needed API routes are listed in [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) (all implemented in `Annex6-Backend`).

## Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (service worker is off in dev) |
| `npm run build` | Production build + service worker |
| `npm run preview` | Serve the build at `http://localhost:4173` to test install/offline (backend CORS must allow this origin) |
| `npm run lint` | oxlint |
| `npm test` | Vitest (install first, see below) |

Test tooling is not in `package.json` yet: `npm i -D vitest jsdom @testing-library/react`.

## Environment (`VITE_*` values are public in the bundle: no secrets)
| Variable | Meaning |
|---|---|
| `VITE_API_BASE_URL` | Backend URL |
| `VITE_ENABLE_LOCAL_DEVICE_BYPASS` | `true` shows the dev bypass box. Only works under `npm run dev`; the backend must also allow it |
| `VITE_EMERGENCY_HOTLINE`, `VITE_BARANGAY_HOTLINE` | Numbers shown on emergency screens |

## Structure
```
src/lib        api (axios, errors), device detection, dev bypass, formatting
src/context    AuthContext (JWT session, expiry, logout)
src/components Guards (RequireRole), RestrictedDevice, layouts, UI kit
src/pages      public/  resident/ (mobile)  admin/ (desktop; config-driven modules in modules.jsx)
tests          device, api helpers, route guard
```

## How access control works
1. `RequireRole` blocks until the session is restored, redirects anonymous users, sends wrong-role users to their own area, and only then checks the device. Nothing from the protected page renders before all checks pass.
2. `classifyDevice` combines UA Client Hints, user agent, iPadOS detection, pointer/hover capability, and (secondary, touch-only) viewport width. It re-runs on resize/rotation. Tablets count as mobile.
3. **This is a UI restriction, not security.** The API must authorize every request by role and ownership.
4. The role comes from the signed JWT issued by the server, never from form input.

## Dev bypass (local only)
Frontend gate: `import.meta.env.DEV` **and** `VITE_ENABLE_LOCAL_DEVICE_BYPASS=true`. Backend gate: Development environment **and** `EnableLocalDeviceBypass=true`, code stored in user-secrets. The UI posts the entered code to `/api/dev/device-bypass`; success only skips the device check for a limited time in the current tab and is cleared on logout. It never changes role or skips login. Production builds contain no active bypass.

## Session storage trade-off
The JWT is kept in memory and mirrored in `sessionStorage` so a refresh does not log you out (cleared when the tab closes; never `localStorage`). `sessionStorage` is readable by injected scripts (XSS); the stricter alternative is an HttpOnly cookie + CSRF protection, which requires backend changes.

## PWA
Manifest, icons (192, 512, maskable), install help on the landing page, auto-updating service worker that precaches the **app shell only**. `/api/*` and the API origin are `NetworkOnly`: no private data is cached. Offline, the shell opens with a banner, and forms refuse to submit and say the report was **not** sent. There is no offline draft queue on purpose, so nothing can look "submitted" when it was not.

## Limitations
- Fire/emergency records are logged and tracked only; there is no dispatch integration and the UI never claims dispatch.
- The resident record has only the fields the current backend entity has (name, address, contact number).
