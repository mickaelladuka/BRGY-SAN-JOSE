// Shared layout fixes for Login + Register (desktop sticky side panel, mobile stack).
// Rendered as a <style> tag so it applies no matter where CSS files live.
const css = `
/* ---------- Desktop: left panel stays in view while the form scrolls ---------- */
@media (min-width: 901px) {
  /* Page is locked to the viewport; only the right panel scrolls */
  .login-page.auth-page {
    height: 100vh;
    height: 100dvh;
    min-height: 0;
    overflow: hidden;
  }
  .login-page.auth-page .login-left {
    height: 100%;
    overflow: hidden;
  }
  .login-page.auth-page .login-right {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    padding: 2rem 1.5rem;
  }
  /* auto margins: centered when it fits, top-aligned (no clipping) when it's taller */
  .login-page.auth-page .login-card {
    margin: auto;
  }
}

/* Short desktop screens: tighten so everything fits without cutting off */
@media (min-width: 901px) and (max-height: 820px) {
  .login-page.auth-page .login-left h1 { font-size: clamp(2rem, 4.2vw, 2.8rem); }
  .login-page.auth-page .login-left ul { margin-top: 1rem !important; gap: .5rem !important; }
  .login-page.auth-page .login-left ul li { padding: .6rem .85rem !important; }
  .login-page.auth-page .login-left ul li > span:last-child > span { display: none; }
  .login-page.auth-page .login-left .login-tagline { margin-top: 1rem; }
}

/* ---------- Mobile / tablet: stacked layout ---------- */
@media (max-width: 900px) {
  .login-page.auth-page {
    display: flex;
    flex-direction: column;
    height: auto;
    min-height: 100vh;
    min-height: 100dvh;
    overflow-x: hidden;
    overflow-y: auto;
  }
  .login-page.auth-page .login-bg { position: fixed; inset: 0; }

  .login-page.auth-page .login-left {
    position: relative;
    display: flex !important;
    flex: 0 0 auto;
    width: 100%;
    height: auto;
    min-height: 0;
    padding: 1.5rem 1.25rem 1rem;
    justify-content: flex-start;
  }
  .login-page.auth-page .login-left-inner { max-width: 100%; padding: 0; }
  .login-page.auth-page .login-left h1 {
    font-size: clamp(1.6rem, 7vw, 2.1rem);
    line-height: 1.15;
    margin: .5rem 0 .6rem;
  }
  .login-page.auth-page .login-left p { font-size: .92rem; line-height: 1.5; margin: 0; }

  /* Hide the heavy decorative content on small screens */
  .login-page.auth-page .login-left ul,
  .login-page.auth-page .login-left .login-tagline,
  .login-page.auth-page .login-left .login-deco-line,
  .login-page.auth-page .login-left > span[aria-hidden] {
    display: none !important;
  }

  .login-page.auth-page .login-right {
    flex: 1 0 auto;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    width: 100%;
    padding: .5rem 1rem calc(2rem + env(safe-area-inset-bottom));
  }
  .login-page.auth-page .login-card {
    width: 100%;
    max-width: 480px !important;
    margin: 0;
    padding: 1.5rem 1.25rem;
  }

  /* Touch-friendly controls (16px prevents iOS zoom on focus) */
  .login-page.auth-page input,
  .login-page.auth-page select { font-size: 16px; min-height: 44px; }
  .login-page.auth-page .btn { min-height: 48px; }
  .login-page.auth-page .password-toggle { min-width: 44px; min-height: 44px; }
}

@media (max-width: 480px) {
  .login-page.auth-page .login-left { padding: 1.25rem 1rem .5rem; }
  .login-page.auth-page .login-right { padding: .25rem .75rem calc(1.5rem + env(safe-area-inset-bottom)); }
  .login-page.auth-page .login-card { padding: 1.25rem 1rem; }
}
`

export default function AuthStyles() {
  return <style>{css}</style>
}