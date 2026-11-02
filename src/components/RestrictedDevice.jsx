import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'
import { Field } from './ui'

export default function RestrictedDevice({ role }) {
  const { logout, bypassEnabled, activateBypass } = useAuth()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const message = role === 'Admin'
    ? 'Administrative access is available on desktop or laptop devices only. Please use a computer to access the administrative dashboard.'
    : 'Resident access is available on mobile devices only. Please open this application on your mobile phone.'

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await activateBypass(code)
      setCode('')
    } catch (err) {
      setError(getErrorMessage(err, 'The development code was not accepted.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="fullpage">
      <div className="card restricted">
        <div className="restricted-icon" aria-hidden="true">{role === 'Admin' ? '🖥️' : '📱'}</div>
        <h1>Device not supported</h1>
        <p>{message}</p>
        <button type="button" className="btn btn-outline" onClick={logout}>Log out / return to login</button>

        {bypassEnabled && (
          <form className="dev-bypass" onSubmit={submit}>
            <p className="dev-notice"><strong>Development only.</strong> This option is visible because the local device bypass is enabled. It is never available in production builds.</p>
            <Field label="Development bypass code" htmlFor="bypass-code" error={error}>
              <input id="bypass-code" type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} required />
            </Field>
            <button type="submit" className="btn btn-primary" disabled={busy || !code}>{busy ? 'Checking…' : 'Unlock for this dev session'}</button>
            <small className="hint">Only skips the device check for a limited time. You still need the correct role.</small>
          </form>
        )}
      </div>
    </main>
  )
}
