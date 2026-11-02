import { useEffect, useState } from "react";
import { Smartphone, Download, Share, ChevronDown, ZoomIn, X, Lock } from "lucide-react";

import androidInstall from "../../assets/images/install/android.png";
import safariInstall from "../../assets/images/install/safari.jpg";

// ==================================================
// STYLES (kept in this file, scoped under .pwg)
// Same terracotta palette as the Annex 6 BMIS landing page.
// Does not depend on Tailwind being available.
// ==================================================

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.pwg {
  --c-deep: #8C2F12;
  --c-primary: #C63F0A;
  --c-accent: #E76F32;
  --bg: #FFF8F2;
  --bg-alt: #F6EDE5;
  --card: #FFFFFF;
  --dark: #252525;
  --text: #252525;
  --text-2: #74665E;
  --border: #E8DCD2;
  --surface: #F2E6DC;
  --highlight: #F4B183;
  --ease: cubic-bezier(.22,.61,.36,1);

  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: var(--text);
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1rem;
  position: relative;
  overflow-x: clip;
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}
.pwg *, .pwg *::before, .pwg *::after { box-sizing: border-box; }
:where(.pwg) h1, :where(.pwg) h2, :where(.pwg) h3, :where(.pwg) p, :where(.pwg) ol, :where(.pwg) ul, :where(.pwg) figure { margin: 0; padding: 0; }
:where(.pwg) ol, :where(.pwg) ul { list-style: none; }
:where(.pwg) button { font-family: inherit; }
.pwg :focus-visible { outline: 3px solid var(--c-accent); outline-offset: 3px; }

/* quiet background decoration */
.pwg-bg { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
.pwg-bg::before {
  content: ''; position: absolute; width: 640px; height: 640px; border-radius: 50%;
  right: -220px; top: -260px; border: 80px solid rgba(198,63,10,.06);
}
.pwg-bg::after {
  content: ''; position: absolute; width: 520px; height: 520px; border-radius: 50%;
  left: -260px; bottom: -280px; background: radial-gradient(circle, rgba(244,177,131,.35), rgba(244,177,131,0) 70%);
}

/* ============ CARD ============ */
.pwg-card {
  position: relative; z-index: 1; width: 100%; max-width: 440px;
  background: var(--card); border: 1px solid var(--border); border-radius: 24px;
  padding: clamp(1.5rem, 4vw, 2.25rem); text-align: center;
  box-shadow: 0 24px 60px rgba(140,47,18,.12), 0 2px 6px rgba(37,37,37,.04);
  transition: max-width .35s var(--ease);
}
.pwg-card.is-open { max-width: 760px; }

.pwg-seal { width: 84px; height: 84px; margin: 0 auto 1.25rem; border-radius: 50%; background: var(--bg); border: 1px solid var(--border); display: grid; place-items: center; padding: 6px; }
.pwg-seal img { width: 100%; height: 100%; object-fit: contain; }

.pwg h1 { font-size: clamp(1.6rem, 4.5vw, 2rem); font-weight: 800; letter-spacing: -.025em; line-height: 1.1; color: var(--text); }
.pwg-sub { margin-top: .6rem; font-size: .95rem; line-height: 1.65; color: var(--text-2); }

.pwg-notice {
  display: flex; gap: .9rem; align-items: flex-start; text-align: left;
  margin-top: 1.5rem; padding: 1rem 1.1rem; border-radius: 14px;
  background: var(--bg-alt); border: 1px solid var(--border); border-left: 4px solid var(--c-primary);
}
.pwg-notice-icon { flex: none; width: 38px; height: 38px; border-radius: 10px; background: var(--c-deep); color: #fff; display: inline-flex; align-items: center; justify-content: center; }
.pwg-notice strong { display: block; font-size: .95rem; color: var(--c-deep); }
.pwg-notice p { margin-top: .2rem; font-size: .85rem; line-height: 1.55; color: var(--text-2); }

/* ============ BUTTON ============ */
.pwg-btn {
  margin-top: 1.5rem; width: 100%; min-height: 52px; padding: 0 1.5rem;
  display: inline-flex; align-items: center; justify-content: center; gap: .6rem;
  border: 0; border-radius: 12px; cursor: pointer;
  background: var(--c-primary); color: #fff; font-size: .98rem; font-weight: 700;
  transition: background-color .2s var(--ease), box-shadow .2s var(--ease), transform .2s var(--ease);
}
.pwg-btn:hover { background: var(--c-deep); box-shadow: 0 8px 20px rgba(140,47,18,.28); }
.pwg-btn:active { transform: translateY(1px); }
.pwg-btn svg { transition: transform .25s var(--ease); }
.pwg-btn[aria-expanded='true'] svg { transform: rotate(180deg); }

/* ============ GALLERY ============ */
.pwg-gallery { display: grid; grid-template-columns: 1fr; gap: 1.1rem; margin-top: 1.5rem; text-align: left; }
@media (min-width: 640px) { .pwg-gallery { grid-template-columns: 1fr 1fr; } }

.pwg-step { background: var(--bg); border: 1px solid var(--border); border-radius: 18px; padding: 1.1rem; display: flex; flex-direction: column; gap: .9rem; }
.pwg-step-head { display: flex; align-items: center; gap: .65rem; }
.pwg-step-head .pwg-badge { flex: none; width: 38px; height: 38px; border-radius: 10px; background: var(--surface); color: var(--c-primary); display: inline-flex; align-items: center; justify-content: center; }
.pwg-step h2 { font-size: 1.02rem; font-weight: 800; letter-spacing: -.01em; color: var(--text); line-height: 1.2; }
.pwg-step-browser { display: block; font-size: .78rem; font-weight: 600; color: var(--text-2); margin-top: .1rem; }

.pwg-steps-list { display: grid; gap: .6rem; }
.pwg-steps-list li { display: flex; gap: .7rem; align-items: flex-start; font-size: .87rem; line-height: 1.5; color: var(--text); }
.pwg-steps-list .n { flex: none; width: 24px; height: 24px; border-radius: 50%; background: var(--c-deep); color: #fff; font-size: .72rem; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; margin-top: .05rem; }
.pwg-chip { display: inline-block; padding: .05rem .5rem; border-radius: 6px; background: var(--surface); border: 1px solid var(--border); color: var(--c-deep); font-weight: 700; font-size: .92em; white-space: nowrap; }

.pwg-phone { width: min(210px, 100%); margin: .25rem auto 0; padding: 8px; border-radius: 30px; background: var(--dark); box-shadow: 0 14px 30px rgba(37,37,37,.25); }
.pwg-phone-screen { position: relative; display: block; width: 100%; padding: 0; border: 0; border-radius: 23px; overflow: hidden; background: #fff; cursor: zoom-in; }
.pwg-phone-screen img { display: block; width: 100%; height: auto; max-height: 380px; object-fit: contain; background: #fff; transition: transform .4s var(--ease); }
.pwg-phone-screen:hover img { transform: scale(1.03); }
.pwg-zoom { position: absolute; right: 8px; bottom: 8px; display: inline-flex; align-items: center; gap: .3rem; padding: .3rem .6rem; border-radius: 999px; background: rgba(37,37,37,.85); color: #fff; font-size: .68rem; font-weight: 600; pointer-events: none; }

.pwg-help { margin-top: 1.25rem; font-size: .82rem; line-height: 1.6; color: var(--text-2); }

/* ============ LIGHTBOX ============ */
.pwg-lightbox { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .75rem; padding: 1rem; background: rgba(20,20,20,.9); }
.pwg-lightbox img { max-height: 85vh; max-width: 100%; border-radius: 14px; background: #fff; object-fit: contain; }
.pwg-lightbox p { color: #fff; font-weight: 600; font-size: .9rem; }
.pwg-lightbox-close { position: absolute; top: 1rem; right: 1rem; width: 44px; height: 44px; border: 0; border-radius: 50%; background: rgba(255,255,255,.16); color: #fff; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color .2s var(--ease); }
.pwg-lightbox-close:hover { background: rgba(255,255,255,.28); }

/* ============ LOADING ============ */
.pwg-loading { position: relative; z-index: 1; text-align: center; }
.pwg-spinner { width: 44px; height: 44px; margin: 0 auto 1rem; border-radius: 50%; border: 4px solid var(--surface); border-top-color: var(--c-primary); }
.pwg-loading p { font-size: .9rem; font-weight: 600; color: var(--text-2); }

/* ============ MOTION ============ */
@media (prefers-reduced-motion: no-preference) {
  .pwg-card { animation: pwg-rise .6s var(--ease) both; }
  .pwg-gallery { animation: pwg-rise .45s var(--ease) both; }
  .pwg-spinner { animation: pwg-spin .8s linear infinite; }
  @keyframes pwg-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
  @keyframes pwg-spin { to { transform: rotate(360deg); } }
}
@media (prefers-reduced-motion: reduce) {
  .pwg *, .pwg *::before, .pwg *::after { transition-duration: .01ms !important; animation: none !important; }
}
`;

export default function PWAInstallGuard({
    children,
}) {

    // ==========================================
    // DEVELOPMENT MODE
    // ==========================================
    // Kapag localhost / npm run dev:
    // bypass muna ang PWA installation requirement
    // para ma-test ang Student/Admin features
    // gamit ang desktop browser. Nasa initial
    // state ito (hindi sa effect) para hindi
    // mag-set ng state habang nagre-render.
    // ==========================================

    const isDev = import.meta.env.DEV;

    const [isInstalled, setIsInstalled] =
        useState(isDev);

    const [checking, setChecking] =
        useState(!isDev);

    useEffect(() => {

        if (isDev) {
            console.log(
                "PWAInstallGuard: Development mode - bypass enabled"
            );

            return;
        }

        // ==========================================
        // PRODUCTION PWA CHECK
        // ==========================================

        const checkPWA = () => {

            const standalone =
                window.matchMedia(
                    "(display-mode: standalone)"
                ).matches;

            const fullscreen =
                window.matchMedia(
                    "(display-mode: fullscreen)"
                ).matches;

            const minimalUI =
                window.matchMedia(
                    "(display-mode: minimal-ui)"
                ).matches;

            const iosStandalone =
                window.navigator.standalone === true;

            const installed =
                standalone ||
                fullscreen ||
                minimalUI ||
                iosStandalone;

            setIsInstalled(installed);
            setChecking(false);
        };

        checkPWA();

        // ==========================================
        // DISPLAY MODE CHANGES
        // ==========================================

        const mediaQuery =
            window.matchMedia(
                "(display-mode: standalone)"
            );

        mediaQuery.addEventListener(
            "change",
            checkPWA
        );

        // ==========================================
        // PWA INSTALLED EVENT
        // ==========================================

        window.addEventListener(
            "appinstalled",
            checkPWA
        );

        // ==========================================
        // CLEANUP
        // ==========================================

        return () => {

            mediaQuery.removeEventListener(
                "change",
                checkPWA
            );

            window.removeEventListener(
                "appinstalled",
                checkPWA
            );
        };

        // isDev is a build-time constant -
        // it cannot change, so it is not a
        // real dependency.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==========================================
    // CHECKING
    // ==========================================

    if (checking) {
        return (
            <div className="pwg" role="status" aria-live="polite">
                <style>{CSS}</style>
                <div className="pwg-bg" aria-hidden="true" />

                <div className="pwg-loading">
                    <div className="pwg-spinner" aria-hidden="true" />
                    <p>Loading Annex 6 BMIS...</p>
                </div>
            </div>
        );
    }

    // ==========================================
    // PRODUCTION:
    // PWA INSTALLATION REQUIRED
    // ==========================================

    if (!isInstalled) {
        return <InstallRequired />;
    }

    // ==========================================
    // ALLOWED
    // ==========================================

    return children;
}


// ==================================================
// INSTALL REQUIRED SCREEN
// ==================================================

function InstallRequired() {

    // The step-by-step gallery stays
    // hidden until asked for: the
    // screen stays compact, and the
    // screenshots are only fetched
    // once the applicant opens it.
    const [showSteps, setShowSteps] = useState(false);

    // The screenshot currently shown full
    // screen, or null. Tapping a card opens
    // it so the on-screen steps are readable
    // on a phone, whatever the orientation.
    const [zoomed, setZoomed] = useState(null);

    // Escape closes the enlarged screenshot.
    useEffect(() => {
        if (!zoomed) return undefined;

        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                setZoomed(null);
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () =>
            window.removeEventListener("keydown", onKeyDown);
    }, [zoomed]);

    return (
        <div className="pwg">
            <style>{CSS}</style>

            {/* BACKGROUND */}
            <div className="pwg-bg" aria-hidden="true" />

            {/* INSTALL CARD */}
            {/* The card widens once the gallery is open,
                so the screenshots get real room instead of
                being squeezed into the compact card. */}
            <main className={`pwg-card ${showSteps ? "is-open" : ""}`}>

                {/* LOGO */}
                <div className="pwg-seal">
                    <img
                        src="/San_Jose_LOGO.webp"
                        alt="Barangay San Jose logo"
                        width="72"
                        height="72"
                    />
                </div>

                {/* TITLE */}
                <h1>Annex 6 BMIS</h1>

                {/* DESCRIPTION */}
                <p className="pwg-sub">
                    Annex 6 BMIS is available as an
                    installed application.
                </p>

                {/* INFORMATION */}
                <div className="pwg-notice" role="note">
                    <span className="pwg-notice-icon" aria-hidden="true">
                        <Lock size={18} />
                    </span>

                    <div>
                        <strong>Install the app to continue</strong>

                        <p>
                            This system cannot be accessed
                            directly from a normal browser
                            window.
                        </p>
                    </div>
                </div>

                {/* HOW TO INSTALL BUTTON */}
                <button
                    type="button"
                    className="pwg-btn"
                    onClick={() => setShowSteps((v) => !v)}
                    aria-expanded={showSteps}
                    aria-controls="pwg-gallery"
                >
                    How to Install
                    <ChevronDown size={18} aria-hidden="true" />
                </button>

                {/* STEP-BY-STEP GALLERY */}
                {/* Mobile install steps only: the two portrait screenshots
                    sit side by side on wider screens and stack on a phone. */}
                {showSteps && (
                    <div className="pwg-gallery" id="pwg-gallery">
                        <InstallStep
                            image={androidInstall}
                            platform="Android"
                            browser="Chrome"
                            icon={<Download size={18} />}
                            steps={[
                                <>Tap the <span className="pwg-chip">⋮ menu</span> in Chrome.</>,
                                <>Tap <span className="pwg-chip">Install app</span> or <span className="pwg-chip">Add to Home screen</span>.</>,
                                <>Open Annex 6 BMIS from your Home Screen.</>,
                            ]}
                            onZoom={setZoomed}
                        />

                        <InstallStep
                            image={safariInstall}
                            platform="iPhone / iPad"
                            browser="Safari"
                            icon={<Share size={18} />}
                            steps={[
                                <>Tap the <span className="pwg-chip">Share</span> button in Safari.</>,
                                <>Tap <span className="pwg-chip">Add to Home Screen</span>.</>,
                                <>Open Annex 6 BMIS from your Home Screen.</>,
                            ]}
                            onZoom={setZoomed}
                        />
                    </div>
                )}

                {/* HELP TEXT */}
                <p className="pwg-help">
                    Once installed, open Annex 6 BMIS
                    from the Home Screen.
                </p>

            </main>


            {/* ENLARGED SCREENSHOT */}
            {zoomed && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Install guide for ${zoomed.platform}`}
                    onClick={() => setZoomed(null)}
                    className="pwg-lightbox"
                >
                    <button
                        type="button"
                        onClick={() => setZoomed(null)}
                        aria-label="Close"
                        className="pwg-lightbox-close"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>

                    <img
                        src={zoomed.image}
                        alt={`How to install Annex 6 BMIS on ${zoomed.platform}`}
                        onClick={(e) => e.stopPropagation()}
                    />

                    <p>{zoomed.platform}</p>
                </div>
            )}

        </div>
    );
}


// ==================================================
// ONE INSTALL STEP
// ==================================================
// A platform card: short numbered steps and the
// real screenshot inside a phone frame. The image
// is never cropped (object-contain). Tapping the
// screenshot opens it full screen.

function InstallStep({
    image,
    platform,
    browser,
    icon,
    steps,
    onZoom,
}) {
    return (
        <section className="pwg-step">

            <div className="pwg-step-head">
                <span className="pwg-badge" aria-hidden="true">
                    {icon ?? <Smartphone size={18} />}
                </span>

                <h2>
                    {platform}
                    <span className="pwg-step-browser">{browser}</span>
                </h2>
            </div>

            <ol className="pwg-steps-list">
                {steps.map((s, i) => (
                    <li key={i}>
                        <span className="n" aria-hidden="true">{i + 1}</span>
                        <span>{s}</span>
                    </li>
                ))}
            </ol>

            <div className="pwg-phone">
                <button
                    type="button"
                    className="pwg-phone-screen"
                    onClick={() => onZoom?.({ image, platform })}
                    aria-label={`Enlarge the ${platform} install guide`}
                >
                    <img
                        src={image}
                        alt={`How to install Annex 6 BMIS on ${platform}`}
                        loading="lazy"
                    />

                    <span className="pwg-zoom">
                        <ZoomIn size={12} aria-hidden="true" /> Tap to enlarge
                    </span>
                </button>
            </div>

        </section>
    );
}