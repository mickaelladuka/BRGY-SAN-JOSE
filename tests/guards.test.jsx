import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireRole } from '../src/components/Guards'

const auth = vi.hoisted(() => ({ value: {} }))
const device = vi.hoisted(() => ({ value: 'desktop' }))
vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => auth.value,
  homeFor: (r) => (r === 'Admin' ? '/admin' : '/resident'),
}))
vi.mock('../src/lib/device', async (orig) => ({ ...(await orig()), useDeviceType: () => device.value }))

const renderAt = (path, role) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/login" element={<p>LOGIN PAGE</p>} />
      <Route path="/admin" element={<RequireRole role="Admin"><p>SECRET ADMIN</p></RequireRole>} />
      <Route path="/resident" element={<RequireRole role="Resident"><p>SECRET RESIDENT</p></RequireRole>} />
    </Routes>
  </MemoryRouter>,
)

describe('RequireRole', () => {
  beforeEach(() => { auth.value = { loading: false, session: null, bypassActive: false, bypassEnabled: false, logout: vi.fn() }; device.value = 'desktop' })

  it('shows a loader and no content while auth loads', () => {
    auth.value = { ...auth.value, loading: true }
    renderAt('/admin')
    expect(screen.queryByText('SECRET ADMIN')).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
  })
  it('redirects anonymous users to login', () => {
    renderAt('/admin')
    expect(screen.getByText('LOGIN PAGE')).toBeTruthy()
  })
  it('lets an admin on desktop in', () => {
    auth.value = { ...auth.value, session: { role: 'Admin' } }
    renderAt('/admin')
    expect(screen.getByText('SECRET ADMIN')).toBeTruthy()
  })
  it('blocks an admin on mobile with the friendly message and no dashboard content', () => {
    auth.value = { ...auth.value, session: { role: 'Admin' } }; device.value = 'mobile'
    renderAt('/admin')
    expect(screen.queryByText('SECRET ADMIN')).toBeNull()
    expect(screen.getByText(/Administrative access is available on desktop or laptop devices only/)).toBeTruthy()
  })
  it('blocks a resident on desktop with the friendly message', () => {
    auth.value = { ...auth.value, session: { role: 'Resident' } }
    renderAt('/resident')
    expect(screen.queryByText('SECRET RESIDENT')).toBeNull()
    expect(screen.getByText(/Resident access is available on mobile devices only/)).toBeTruthy()
  })
  it('allows a resident on mobile', () => {
    auth.value = { ...auth.value, session: { role: 'Resident' } }; device.value = 'mobile'
    renderAt('/resident')
    expect(screen.getByText('SECRET RESIDENT')).toBeTruthy()
  })
  it('does not let a resident open the admin area (role mismatch)', () => {
    auth.value = { ...auth.value, session: { role: 'Resident' } }; device.value = 'mobile'
    renderAt('/admin')
    expect(screen.queryByText('SECRET ADMIN')).toBeNull()
    expect(screen.getByText('SECRET RESIDENT')).toBeTruthy()
  })
  it('honours an active dev bypass only for the device check', () => {
    auth.value = { ...auth.value, session: { role: 'Admin' }, bypassActive: true }; device.value = 'mobile'
    renderAt('/admin')
    expect(screen.getByText('SECRET ADMIN')).toBeTruthy()
  })
})
