import { useEffect, useState } from 'react'

export default function InstallHelp() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches)

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e) }
    const onInstalled = () => { setInstalled(true); setDeferred(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])

  if (installed) return null
  return (
    <section className="card" aria-labelledby="install-h">
      <h2 id="install-h">Install the app on your phone</h2>
      {deferred && (
        <button type="button" className="btn btn-primary" style={{ marginBottom: '.75rem' }}
          onClick={async () => { deferred.prompt(); await deferred.userChoice; setDeferred(null) }}>
          Install app
        </button>
      )}
      <ul className="stack" style={{ paddingLeft: '1.1rem', margin: 0 }}>
        <li><strong>Android (Chrome):</strong> tap the ⋮ menu, then <em>Install app</em> or <em>Add to Home screen</em>.</li>
        <li><strong>iPhone / iPad (Safari):</strong> tap the Share button, then <em>Add to Home Screen</em>.</li>
      </ul>
      <p className="muted" style={{ marginTop: '.5rem' }}>Installing is optional. The installed app still needs an internet connection to send or view reports.</p>
    </section>
  )
}
