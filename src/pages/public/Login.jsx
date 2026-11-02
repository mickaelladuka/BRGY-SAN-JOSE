import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Field } from '../../components/ui'
import { homeFor, useAuth } from '../../context/AuthContext'
import { getErrorMessage } from '../../lib/api'
import { Check, Copy, Eye, EyeOff, FileText, Megaphone, MessageSquareText, Phone } from 'lucide-react'
import AuthStyles from './AuthStyles'

const tint = (pct) => `color-mix(in srgb, var(--primary, #2f7d5b) ${pct}%, transparent)`
const leftBg = `linear-gradient(160deg, ${tint(10)} 0%, transparent 55%), radial-gradient(circle at 20% 90%, ${tint(14)} 0%, transparent 50%)`

const PERKS = [
  { icon: FileText, title: 'Request barangay services', text: 'Apply for certificates and other services without long lines.' },
  { icon: Megaphone, title: 'Stay informed', text: 'Get announcements and updates from Annex 6 in one place.' },
  { icon: MessageSquareText, title: 'Send concerns', text: 'Reach barangay officials directly and track your requests.' },
]

const HOTLINES = [
  {
    group: 'Area 6',
    items: [
      { name: 'Area 6 (Sub-Urban / Metro Manila Hills)', numbers: ['0970-5593995'] },
      { name: 'Area 6', numbers: ['0963-1644355'] },
    ],
  },
  {
    group: 'Emergency & Local Services',
    items: [
      { name: 'Philippine National Police (PNP)', numbers: ['(02) 633-9263', '0999-1955988'] },
      { name: 'Rodriguez Fire Station', numbers: ['(02) 8-584-3498', '0966-3263209'] },
      { name: 'Barangay Anti-Drug Abuse Council (BADAC)', numbers: ['0907-9390706'] },
      { name: 'Violence Against Women & Children (VAWC)', numbers: ['0936-5755123'] },
      { name: 'COMPAC 6', numbers: ['0966-338-82-87'] },
      { name: 'BDR', numbers: ['0951-188-78-78'] },
      { name: 'MDR', numbers: ['0919-058-33-33', '0969-614-48-25'] },
    ],
  },
]

const telHref = (n) => `tel:${n.replace(/[^\d+]/g, '')}`

export default function Login() {
  const { login, notice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showHotlines, setShowHotlines] = useState(false)
  const [copied, setCopied] = useState('')

  const copyNumber = async (n) => {
    try {
      await navigator.clipboard.writeText(n)
    } catch {
      const t = document.createElement('textarea')
      t.value = n
      t.style.position = 'fixed'
      t.style.opacity = '0'
      document.body.appendChild(t)
      t.select()
      try { document.execCommand('copy') } catch { /* ignore */ }
      document.body.removeChild(t)
    }
    setCopied(n)
    setTimeout(() => setCopied((c) => (c === n ? '' : c)), 1500)
  }

  useEffect(() => {
    if (!showHotlines) return
    const onKey = (e) => e.key === 'Escape' && setShowHotlines(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showHotlines])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !password) return setError('Enter your email or username and your password.')
    setBusy(true)
    try {
      const s = await login(identifier, password)
      const from = location.state?.from
      const allowed = from && from.startsWith(homeFor(s.role))
      navigate(allowed ? from : homeFor(s.role), { replace: true })
    } catch (err) {
      setError(err.response?.status === 401 ? 'Invalid email/username or password.' : getErrorMessage(err, err.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page auth-page">
      <AuthStyles />
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-grid" />
        <div className="login-bg-glow" />
        <div className="login-bg-nodes">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="login-node" style={{ '--i': i }} />
          ))}
        </div>
      </div>

      {/* LEFT: Welcome panel */}
      <div className="login-left" style={{ position: 'relative', overflow: 'hidden', background: leftBg }}>
        {/* Decorative soft shapes */}
        <span aria-hidden="true" style={{ position: 'absolute', top: '-120px', right: '-100px', width: '340px', height: '340px', borderRadius: '50%', background: tint(18), filter: 'blur(2px)' }} />
        <span aria-hidden="true" style={{ position: 'absolute', bottom: '-140px', left: '-90px', width: '380px', height: '380px', borderRadius: '50%', background: tint(12) }} />
        <span aria-hidden="true" style={{ position: 'absolute', bottom: '18%', right: '8%', width: '90px', height: '90px', borderRadius: '50%', border: `2px dashed ${tint(40)}` }} />

        <div className="login-left-inner" style={{ position: 'relative', zIndex: 1 }}>
          <div className="login-eyebrow animate-in" style={{ '--delay': '0ms' }}>
            BARANGAY SAN JOSE ANNEX · AREA 6
          </div>
          <h1 className="animate-in" style={{ '--delay': '150ms' }}>
            Your Community.
            <br />
            <span className="login-highlight">Your Connection.</span>
          </h1>
          <p className="animate-in" style={{ '--delay': '300ms' }}>
            Welcome to a simpler way to connect with your community, access barangay services, and stay informed about what matters in Annex 6.
          </p>

          <ul className="animate-in" style={{ '--delay': '400ms', listStyle: 'none', margin: '1.75rem 0 0', padding: 0, display: 'grid', gap: '.75rem', maxWidth: '440px' }}>
            {PERKS.map(({ icon: Icon, title, text }) => (
              <li key={title} style={{ display: 'flex', gap: '.85rem', alignItems: 'flex-start', padding: '.85rem 1rem', borderRadius: '14px', background: 'rgba(255,255,255,.65)', border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 4px 14px rgba(0,0,0,.04)', backdropFilter: 'blur(6px)' }}>
                <span style={{ flex: '0 0 auto', width: '38px', height: '38px', borderRadius: '10px', display: 'grid', placeItems: 'center', background: tint(16), color: 'var(--primary-dark)' }}>
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <span>
                  <strong style={{ display: 'block', fontSize: '.95rem', color: 'var(--primary-dark)' }}>{title}</strong>
                  <span style={{ fontSize: '.85rem', color: 'var(--ink-light)' }}>{text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="login-tagline animate-in" style={{ '--delay': '550ms' }}>
            Connecting residents. Strengthening community service.
          </div>
          <div className="login-deco-line animate-in" style={{ '--delay': '600ms' }} />
        </div>
      </div>

      {/* RIGHT: Logo + Login form */}
      <div className="login-right">
        <div className="login-card animate-in" style={{ '--delay': '200ms' }}>
          <div className="login-logo-wrap animate-in" style={{ '--delay': '300ms' }}>
            <img src="/San_Jose_LOGO.webp" alt="Barangay San Jose logo" className="logo-blend" />
          </div>
          <div className="login-brand-text animate-in" style={{ '--delay': '350ms' }}>ANNEX 6 BMIS</div>
          <h2 className="animate-in" style={{ '--delay': '400ms' }}>Welcome back</h2>
          <p className="muted animate-in" style={{ '--delay': '450ms' }}>Sign in to access your account.</p>

          {location.state?.registered && <Alert type="success">Account created. You can log in now.</Alert>}
          {notice && <Alert type="info">{notice}</Alert>}
          {error && <Alert className="animate-in">{error}</Alert>}

          <form onSubmit={submit} noValidate>
            <div className="animate-in" style={{ '--delay': '500ms' }}>
              <Field label="Email or username" htmlFor="identifier" required>
                <input
                  id="identifier"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoCapitalize="none"
                  placeholder="Enter your email or username"
                  disabled={busy}
                />
              </Field>
            </div>

            <div className="animate-in" style={{ '--delay': '550ms' }}>
              <Field label="Password" htmlFor="password" required>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={busy}
                    style={{ paddingRight: '3rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="password-toggle"
                  >
                    {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
                  </button>
                </div>
              </Field>
            </div>

            <div className="animate-in" style={{ '--delay': '600ms' }}>
              <button type="submit" className="btn btn-primary btn-block login-btn" disabled={busy}>
                {busy ? (
                  <><span className="btn-spinner" /> Signing in…</>
                ) : 'Sign In'}
              </button>
            </div>
          </form>

          <p className="muted animate-in" style={{ '--delay': '650ms', textAlign: 'center', marginTop: '1.25rem' }}>
            New resident? <Link to="/register">Create an account</Link>
          </p>

          <div className="animate-in" style={{ '--delay': '700ms', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setShowHotlines(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', padding: '.7rem 1rem', minHeight: '44px', borderRadius: '12px', border: `1px solid ${tint(35)}`, background: tint(8), color: 'var(--primary-dark)', fontWeight: 600, fontSize: '.9rem', cursor: 'pointer' }}
            >
              <Phone size={18} strokeWidth={1.75} /> Emergency hotlines
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '.7rem', color: 'var(--muted-c)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Barangay San Jose Annex Area 6 Management Information System
          </p>
        </div>
      </div>

      {showHotlines && (
        <div
          role="presentation"
          onClick={() => setShowHotlines(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, .55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hotlines-title"
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', background: '#fff', fontSize: '.9rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
              <h2 id="hotlines-title" style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <Phone size={20} strokeWidth={1.75} /> Emergency hotlines
              </h2>
              <button type="button" className="icon-btn" onClick={() => setShowHotlines(false)} aria-label="Close">✕</button>
            </div>
            <p className="muted" style={{ marginBottom: '1rem' }}>Tap a number to call from your phone.</p>

            {HOTLINES.map(({ group, items }) => (
              <section key={group} style={{ marginBottom: '1rem' }}>
                <strong style={{ display: 'block', margin: '0 0 .4rem', fontSize: '.75rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--primary-dark)' }}>{group}</strong>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '.5rem' }}>
                  {items.map(({ name, numbers }) => (
                    <li key={name} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '.35rem 1rem', padding: '.65rem .85rem', borderRadius: '12px', border: '1px solid var(--line)', background: tint(5) }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{name}</span>
                      <span style={{ display: 'flex', flexWrap: 'wrap', gap: '.25rem .85rem' }}>
                        {numbers.map((n) => (
                          <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', whiteSpace: 'nowrap' }}>
                            <a href={telHref(n)} style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{n}</a>
                            <button
                              type="button"
                              onClick={() => copyNumber(n)}
                              aria-label={copied === n ? `Copied ${n}` : `Copy ${n}`}
                              title={copied === n ? 'Copied!' : 'Copy number'}
                              style={{ display: 'inline-grid', placeItems: 'center', width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--line)', background: copied === n ? tint(18) : '#fff', color: 'var(--primary-dark)', cursor: 'pointer', padding: 0 }}
                            >
                              {copied === n ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={1.75} />}
                            </button>
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <button type="button" className="btn btn-primary btn-block" onClick={() => setShowHotlines(false)} autoFocus>
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  )
}