import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import InstallHelp from '../../components/InstallHelp'
import OfflineBanner from '../../components/OfflineBanner'
import { useAuth } from '../../context/AuthContext'
import {
  MessageSquareText, ClipboardList, Users, Building2, Megaphone, UserRound,
  ArrowRight, Menu, X, ChevronDown, Smartphone, Phone, Mail,
  Accessibility, Eye, FolderCheck, Network,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* PUBLIC DATA ENDPOINTS                                               */
/* These are the only three places the page reads backend data from.   */
/* If your existing public endpoints use different paths, change them  */
/* here. The backend must return only approved / published records.    */
/* ------------------------------------------------------------------ */
const API_BASE = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5085').replace(/\/$/, '')
const ENDPOINTS = {
  officials: `${API_BASE}/api/departments/public/officials`,
  departments: `${API_BASE}/api/departments/public`,
  announcements: `${API_BASE}/api/announcements/public`,
}

const NAV = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'how', label: 'How It Works' },
  { id: 'community', label: 'Know Your Community' },
  { id: 'faq', label: 'FAQ' },
]

const OBJECTIVES = [
  { icon: Accessibility, title: 'Accessible Complaint Reporting', text: 'Provide residents with a convenient digital channel for submitting community concerns.' },
  { icon: FolderCheck, title: 'Organized Complaint Management', text: 'Support authorized barangay personnel in reviewing, organizing, assigning, and monitoring submitted complaints.' },
  { icon: Eye, title: 'Complaint Transparency', text: 'Allow residents to monitor the progress and status of their submitted concerns.' },
  { icon: Users, title: 'Accessible Community Information', text: 'Help residents identify the officials, departments, and available public information relevant to Area 6.' },
  { icon: Network, title: 'Better Community Coordination', text: 'Support organized communication between residents and authorized barangay personnel.' },
]

const STEPS = [
  { title: 'Register Your Account', text: 'Residents create an account and submit the required registration information.' },
  { title: 'Access the Platform', text: 'After completing the applicable account verification process, residents can access their available services.' },
  { title: 'Submit a Complaint', text: 'Residents submit a community concern using the complaint reporting feature.' },
  { title: 'Track Your Complaint', text: 'Residents monitor the progress and status of their submitted complaints.' },
  { title: 'Stay Informed', text: 'Residents access relevant announcements and available updates.' },
]

const FAQS = [
  { q: 'What is Annex 6 BMIS?', a: 'Annex 6 BMIS is the digital platform of Barangay San Jose – Annex Area 6. It is designed to streamline community complaint reporting, resident record management, and barangay operations, while giving residents a way to submit and track their concerns.' },
  { q: 'Who can use the system?', a: 'Residents of Area 6 can create a resident account to use the complaint and community features. Anyone can view the public information on this page, including the officials and departments.' },
  { q: 'How can residents register?', a: 'Select “Register” and complete the required registration information. After the applicable account verification process, you can access your available services.' },
  { q: 'How can I submit a complaint?', a: 'Log in to your resident account and open the complaint submission feature. Choose the category that fits your concern and submit it for barangay review and handling.' },
  { q: 'How can I track my complaint?', a: 'Once logged in, open your complaints list to see the status and progress of each concern you submitted.' },
  { q: 'Can I access the system on my mobile phone?', a: 'Yes. The resident-facing application is designed for mobile use, and it can optionally be added to your phone’s home screen. See the installation steps in the access section of this page.' },
  { q: 'Where can I view Barangay Officials?', a: 'The officials serving Area 6 are listed in the “Know Your Community” section of this page, and in the complete public directory.' },
  { q: 'Where can I find Area 6 departments?', a: 'Departments and their publicly approved services appear in the “Know Your Community” section and in the complete public directory.' },
  { q: 'How can I receive community announcements?', a: 'Published community announcements appear in the announcements preview on this page, and registered residents can read them in the announcements area after logging in.' },
  { q: 'What should I do if I encounter an account or access problem?', a: 'Please contact Barangay San Jose – Annex Area 6 personnel using the approved contact information in the public directory, or visit the barangay office.' },
]

/* ---------------------------- styles (kept in this file) ---------------------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* ============ DESIGN TOKENS (the only place colors are defined) ============ */
.lp {
  /* primary */
  --c-deep: #8C2F12;
  --c-primary: #C63F0A;
  --c-accent: #E76F32;
  /* backgrounds */
  --bg: #FFF8F2;
  --bg-alt: #F6EDE5;
  --card: #FFFFFF;
  --dark: #252525;
  /* text */
  --text: #252525;
  --text-2: #74665E;
  --text-muted: #89796F;
  --on-dark: #FFFFFF;
  --on-dark-2: #D8CEC6;
  /* supporting */
  --border: #E8DCD2;
  --surface: #F2E6DC;
  --highlight: #F4B183;

  --font: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --r-sm: 10px;
  --r-md: 14px;
  --header-h: 72px;
  --ease: cubic-bezier(.22,.61,.36,1);

  font-family: var(--font);
  color: var(--text);
  background: var(--bg);
  overflow-x: clip;
  -webkit-font-smoothing: antialiased;
}
.lp *, .lp *::before, .lp *::after { box-sizing: border-box; }
/* Resets use :where() so they have zero specificity and never override component classes */
:where(.lp) img { max-width: 100%; height: auto; display: block; }
:where(.lp) ul, :where(.lp) ol { list-style: none; margin: 0; padding: 0; }
:where(.lp) h1, :where(.lp) h2, :where(.lp) h3, :where(.lp) h4, :where(.lp) p { margin: 0; }
:where(.lp) button { font-family: inherit; }
:where(.lp) a { color: inherit; }
.lp :focus-visible { outline: 3px solid var(--accent-ring, #E76F32); outline-offset: 3px; border-radius: 4px; }
.lp-container { width: 100%; max-width: 1180px; margin: 0 auto; padding: 0 1.5rem; }

.lp-skip { position: absolute; left: -999px; top: 0; z-index: 100; background: #fff; color: var(--c-deep); padding: .6rem 1rem; font-weight: 700; }
.lp-skip:focus { left: .5rem; top: .5rem; }

/* ============ BUTTONS ============ */
.lp-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
  min-height: 48px; padding: 0 1.5rem; border-radius: var(--r-sm);
  font-weight: 700; font-size: .95rem; line-height: 1; text-decoration: none; cursor: pointer;
  border: 1.5px solid transparent; transition: background-color .2s var(--ease), color .2s var(--ease), border-color .2s var(--ease), transform .2s var(--ease), box-shadow .2s var(--ease);
}
.lp-btn svg { transition: transform .2s var(--ease); }
.lp-btn:hover svg { transform: translateX(3px); }
.lp-btn:active { transform: translateY(1px); }
.lp-btn-sm { min-height: 40px; padding: 0 1.1rem; font-size: .875rem; }
.lp-btn-primary { background: var(--c-primary); color: #fff; }
.lp-btn-primary:hover { background: var(--c-deep); box-shadow: 0 6px 16px rgba(140,47,18,.25); }
.lp-btn-outline { background: transparent; color: var(--c-deep); border-color: var(--c-deep); }
.lp-btn-outline:hover { background: var(--surface); }
.lp-btn-light { background: #fff; color: var(--c-deep); }
.lp-btn-light:hover { background: var(--surface); box-shadow: 0 6px 16px rgba(0,0,0,.18); }
.lp-btn-outline-light { background: transparent; color: #fff; border-color: rgba(255,255,255,.65); }
.lp-btn-outline-light:hover { background: rgba(255,255,255,.12); border-color: #fff; }

/* ============ HEADER ============ */
.lp-header {
  position: sticky; top: 0; z-index: 50;
  background: var(--bg); border-bottom: 1px solid transparent;
  transition: box-shadow .25s var(--ease), border-color .25s var(--ease), background-color .25s var(--ease);
}
.lp-header.is-scrolled { border-bottom-color: var(--border); box-shadow: 0 6px 20px rgba(37,37,37,.06); }
.lp-header-inner { display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; min-height: var(--header-h); transition: min-height .25s var(--ease); }
.lp-header.is-scrolled .lp-header-inner { min-height: 62px; }
.lp-brand { display: inline-flex; align-items: center; gap: .65rem; font-weight: 800; font-size: 1.05rem; letter-spacing: -.01em; color: var(--c-deep); text-decoration: none; }
.lp-brand img { width: 42px; height: 42px; object-fit: contain; }
.lp-nav { display: flex; align-items: center; gap: 1.75rem; }
.lp-nav ul { display: flex; gap: 1.5rem; }
.lp-nav a:not(.lp-btn) { position: relative; color: var(--text); text-decoration: none; font-size: .875rem; font-weight: 600; padding: .5rem 0; transition: color .2s var(--ease); }
.lp-nav a:not(.lp-btn)::after { content: ''; position: absolute; left: 0; right: 0; bottom: .1rem; height: 2px; background: var(--c-primary); transform: scaleX(0); transform-origin: left; transition: transform .25s var(--ease); }
.lp-nav a:not(.lp-btn):hover, .lp-nav a.is-active { color: var(--c-deep); }
.lp-nav a:not(.lp-btn):hover::after, .lp-nav a.is-active::after { transform: scaleX(1); }
.lp-nav-actions { display: flex; gap: .6rem; }
.lp-menu-btn { display: none; background: transparent; border: 1px solid var(--border); border-radius: var(--r-sm); width: 44px; height: 44px; color: var(--c-deep); cursor: pointer; align-items: center; justify-content: center; }

@media (max-width: 1040px) {
  .lp-menu-btn { display: inline-flex; }
  .lp-nav {
    position: absolute; top: 100%; left: 0; right: 0; background: var(--bg);
    flex-direction: column; align-items: stretch; gap: 1rem; padding: .75rem 1.5rem 1.5rem;
    border-bottom: 1px solid var(--border); box-shadow: 0 16px 28px rgba(37,37,37,.1);
    opacity: 0; visibility: hidden; transform: translateY(-8px);
    transition: opacity .22s var(--ease), transform .22s var(--ease), visibility .22s;
  }
  .lp-nav.is-open { opacity: 1; visibility: visible; transform: none; }
  .lp-nav ul { flex-direction: column; gap: 0; }
  .lp-nav li a:not(.lp-btn) { display: block; padding: .95rem 0; border-bottom: 1px solid var(--border); font-size: 1rem; }
  .lp-nav li a:not(.lp-btn)::after { display: none; }
  .lp-nav-actions .lp-btn { flex: 1; }
}

/* ============ HERO ============ */
.lp-hero { position: relative; isolation: isolate; color: var(--on-dark); background: var(--dark); padding: clamp(4rem, 10vw, 7.5rem) 0; scroll-margin-top: var(--header-h); overflow: hidden; }
.lp-hero::before {
  content: ''; position: absolute; inset: 0; z-index: -2;
  background: url(/Home_Banner.webp) center / cover no-repeat;
}
.lp-hero::after {
  content: ''; position: absolute; inset: 0; z-index: -1;
  background: linear-gradient(100deg, rgba(37,37,37,.94) 0%, rgba(37,37,37,.84) 45%, rgba(110,38,15,.62) 100%);
}
.lp-hero-grid { display: grid; gap: 3.5rem; align-items: center; grid-template-columns: 1fr; }
@media (min-width: 980px) { .lp-hero-grid { grid-template-columns: 1.2fr .8fr; gap: 4rem; } }
.lp-hero-kicker { display: inline-flex; align-items: center; gap: .75rem; font-size: .8rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--highlight); margin-bottom: 1.25rem; }
.lp-hero-kicker::before { content: ''; width: 28px; height: 2px; background: var(--highlight); }
.lp-hero h1 { color: var(--on-dark); font-size: clamp(2.25rem, 5.4vw, 4rem); font-weight: 800; line-height: 1.06; letter-spacing: -.03em; max-width: 17ch; margin-bottom: 1.4rem; }
.lp-hero-text { font-size: clamp(1rem, 1.6vw, 1.15rem); line-height: 1.7; max-width: 56ch; color: var(--on-dark-2); margin-bottom: 2.1rem; }
.lp-hero-actions { display: flex; flex-wrap: wrap; gap: .85rem; align-items: center; }

.lp-hero-visual { display: flex; flex-direction: column; align-items: center; gap: 1.75rem; }
.lp-seal { width: min(230px, 56vw); aspect-ratio: 1; border-radius: 50%; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18); display: grid; place-items: center; padding: 16px; }
.lp-seal img { width: 100%; height: 100%; object-fit: contain; }
.lp-highlights { width: 100%; max-width: 380px; border-top: 1px solid rgba(255,255,255,.2); }
.lp-highlights li { display: flex; align-items: center; gap: .9rem; padding: .95rem .25rem; border-bottom: 1px solid rgba(255,255,255,.2); font-weight: 600; font-size: .95rem; color: var(--on-dark); }
.lp-highlights svg { flex-shrink: 0; color: var(--highlight); }

/* ============ SECTIONS ============ */
.lp-section { padding: clamp(4rem, 9vw, 6.5rem) 0; scroll-margin-top: var(--header-h); background: var(--bg); }
.lp-alt { background: var(--bg-alt); }
.lp-dark { background: var(--dark); color: var(--on-dark); }
.lp-head { max-width: 720px; margin: 0 0 3rem; }
.lp-label { display: flex; align-items: center; gap: .75rem; font-size: .78rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--c-deep); margin-bottom: 1rem; }
.lp-label::before { content: ''; width: 24px; height: 2px; background: currentColor; }
.lp-dark .lp-label { color: var(--highlight); }
.lp h2 { font-size: clamp(1.75rem, 3.6vw, 2.65rem); font-weight: 800; line-height: 1.12; letter-spacing: -.025em; color: var(--text); }
.lp-dark h2 { color: var(--on-dark); }
.lp h3 { font-size: 1.05rem; font-weight: 700; letter-spacing: -.01em; color: var(--text); line-height: 1.3; }
.lp-lead { color: var(--text-2); line-height: 1.8; margin-top: 1.1rem; font-size: 1.02rem; }
.lp-dark .lp-lead { color: var(--on-dark-2); }
.lp-icon { display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: var(--r-sm); flex: none; background: var(--surface); color: var(--c-primary); }
.lp-center { text-align: center; margin-top: 2.5rem; }

/* About: editorial two-column */
.lp-about { display: grid; gap: 3rem; grid-template-columns: 1fr; align-items: start; }
@media (min-width: 960px) { .lp-about { grid-template-columns: 1fr 1.05fr; gap: 5rem; } .lp-about .lp-head { position: sticky; top: calc(var(--header-h) + 2rem); margin: 0; } }
.lp-objectives li { display: flex; gap: 1.1rem; align-items: flex-start; padding: 1.4rem 0; border-top: 1px solid var(--border); }
.lp-objectives li:last-child { border-bottom: 1px solid var(--border); }
.lp-objectives p { color: var(--text-2); font-size: .95rem; line-height: 1.65; margin-top: .3rem; }

/* Services */
.lp-services { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.lp-service {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--r-md); padding: 1.75rem;
  display: flex; flex-direction: column; align-items: flex-start; gap: .75rem;
  transition: transform .25s var(--ease), box-shadow .25s var(--ease), border-color .25s var(--ease);
}
.lp-service:hover { transform: translateY(-4px); border-color: var(--highlight); box-shadow: 0 14px 30px rgba(140,47,18,.1); }
.lp-service p { color: var(--text-2); font-size: .94rem; line-height: 1.7; flex: 1; }
.lp-service .lp-icon { transition: background-color .25s var(--ease), color .25s var(--ease); }
.lp-service:hover .lp-icon { background: var(--c-primary); color: #fff; }
.lp-service--feature { background: var(--dark); border-color: var(--dark); }
.lp-service--feature h3 { color: var(--on-dark); }
.lp-service--feature p { color: var(--on-dark-2); }
.lp-service--feature .lp-icon { background: rgba(255,255,255,.1); color: var(--highlight); }
.lp-service--feature:hover { border-color: var(--c-accent); box-shadow: 0 14px 30px rgba(37,37,37,.25); }
.lp-service--feature:hover .lp-icon { background: var(--c-primary); color: #fff; }
.lp-service--feature .lp-more { color: var(--highlight); }
.lp-more { display: inline-flex; align-items: center; gap: .4rem; font-weight: 700; font-size: .9rem; color: var(--c-primary); text-decoration: none; margin-top: .35rem; }
.lp-more svg { transition: transform .2s var(--ease); }
.lp-more:hover svg { transform: translateX(4px); }
.lp-more:hover { text-decoration: underline; text-underline-offset: 4px; }

/* How it works */
.lp-steps { --gap: 1.5rem; display: grid; gap: 2.25rem var(--gap); grid-template-columns: 1fr; counter-reset: none; }
.lp-steps li { position: relative; padding-left: 4.25rem; }
.lp-steps p { color: var(--text-2); font-size: .94rem; line-height: 1.65; margin-top: .4rem; }
.lp-step-num { position: absolute; left: 0; top: 0; width: 48px; height: 48px; border-radius: 50%; background: var(--c-deep); color: #fff; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; font-size: 1.05rem; box-shadow: 0 0 0 6px var(--bg); }
.lp-steps li:not(:last-child)::after { content: ''; position: absolute; left: 23px; top: 54px; bottom: -2rem; width: 2px; background: var(--border); }
@media (min-width: 980px) {
  .lp-steps { grid-template-columns: repeat(5, 1fr); }
  .lp-steps li { padding: 4.25rem 0 0; }
  .lp-steps li:not(:last-child)::after { left: 62px; right: calc(12px - var(--gap)); top: 23px; bottom: auto; width: auto; height: 2px; }
}

/* Community */
.lp-block { margin-bottom: 3.5rem; }
.lp-block-title { display: flex; align-items: center; gap: 1rem; font-size: 1.15rem; margin-bottom: 1.5rem; }
.lp-block-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.lp-people-grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
.lp-person { background: var(--card); border: 1px solid var(--border); border-radius: var(--r-md); overflow: hidden; display: flex; flex-direction: column; transition: transform .25s var(--ease), box-shadow .25s var(--ease), border-color .25s var(--ease); }
.lp-person:hover { transform: translateY(-4px); border-color: var(--highlight); box-shadow: 0 14px 30px rgba(140,47,18,.1); }
.lp-person-photo { aspect-ratio: 4 / 5; background: var(--surface); overflow: hidden; }
.lp-person-photo img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s var(--ease); }
.lp-person:hover .lp-person-photo img { transform: scale(1.04); }
.lp-avatar { width: 100%; height: 100%; display: grid; place-items: center; color: var(--c-deep); font-weight: 800; font-size: 2.4rem; letter-spacing: -.02em; }
.lp-person-body { padding: 1.1rem 1.1rem 1.3rem; display: flex; flex-direction: column; gap: .3rem; }
.lp-person h4 { font-size: 1rem; font-weight: 700; color: var(--text); line-height: 1.3; }
.lp-person-role { color: var(--c-deep); font-weight: 600; font-size: .85rem; }
.lp-person-text { color: var(--text-2); font-size: .85rem; line-height: 1.55; margin-top: .2rem; }
.lp-contact { display: flex; align-items: center; gap: .45rem; color: var(--text-2); font-size: .85rem; margin-top: .3rem; word-break: break-word; }
.lp-contact svg { flex-shrink: 0; color: var(--c-primary); }
.lp-dept-grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.lp-dept { background: var(--card); border: 1px solid var(--border); border-top: 3px solid var(--c-primary); border-radius: var(--r-md); padding: 1.5rem; display: flex; flex-direction: column; gap: .4rem; transition: transform .25s var(--ease), box-shadow .25s var(--ease); }
.lp-dept:hover { transform: translateY(-4px); box-shadow: 0 14px 30px rgba(140,47,18,.1); }
.lp-dept h4 { font-size: 1.08rem; font-weight: 700; color: var(--text); }
.lp-dept-text { color: var(--text-2); font-size: .92rem; line-height: 1.65; }
.lp-dept-label { font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--c-deep); margin-top: .75rem; }
.lp-dept-list { list-style: disc; padding-left: 1.15rem; color: var(--text-2); font-size: .92rem; line-height: 1.65; }
.lp-dept-list li::marker { color: var(--c-primary); }
.lp-dept-people { color: var(--text); font-size: .92rem; line-height: 1.5; }
.lp-empty { color: var(--text-2); padding: 1.5rem; background: var(--card); border: 1px dashed var(--border); border-radius: var(--r-md); line-height: 1.6; }
.lp-empty a { color: var(--c-deep); font-weight: 700; }
.lp-skeleton { height: 190px; border-radius: var(--r-md); background: linear-gradient(90deg, var(--surface) 25%, var(--bg-alt) 50%, var(--surface) 75%); background-size: 200% 100%; }

/* Announcements */
.lp-ann-grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
@media (min-width: 900px) { .lp-ann-grid.is-multi { grid-template-columns: 1.35fr 1fr; } .lp-ann-grid.is-multi .lp-ann.is-feature { grid-row: span 2; } }
.lp-ann { background: var(--card); border: 1px solid var(--border); border-radius: var(--r-md); overflow: hidden; display: flex; flex-direction: column; transition: transform .25s var(--ease), box-shadow .25s var(--ease), border-color .25s var(--ease); }
.lp-ann:hover { transform: translateY(-4px); border-color: var(--highlight); box-shadow: 0 14px 30px rgba(140,47,18,.1); }
.lp-ann-img { aspect-ratio: 16 / 9; overflow: hidden; background: var(--surface); }
.lp-ann-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s var(--ease); }
.lp-ann:hover .lp-ann-img img { transform: scale(1.04); }
.lp-ann-body { padding: 1.4rem; display: flex; flex-direction: column; gap: .5rem; }
.lp-ann time { color: var(--c-deep); font-size: .8rem; font-weight: 700; }
.lp-ann h3 { font-size: 1.1rem; }
.lp-ann.is-feature h3 { font-size: 1.45rem; letter-spacing: -.02em; }
.lp-ann p { color: var(--text-2); font-size: .94rem; line-height: 1.7; }

/* Access (dark band) */
.lp-access { display: grid; gap: 2.5rem; align-items: center; grid-template-columns: 1fr; }
@media (min-width: 920px) { .lp-access { grid-template-columns: 1fr 1fr; gap: 5rem; } }
.lp-access-note { display: inline-flex; align-items: center; gap: .6rem; margin-top: 1.4rem; font-weight: 600; color: var(--highlight); }
.lp-install { min-width: 0; border-radius: var(--r-md); overflow: hidden; background: var(--card); color: var(--text); }
.lp-install h1, .lp-install h2, .lp-install h3, .lp-install h4 { color: var(--c-deep); font-size: 1.1rem; font-weight: 800; letter-spacing: -.01em; line-height: 1.3; }
.lp-install ul { list-style: disc; padding-left: 1.25rem; }
.lp-install li { margin: .4rem 0; line-height: 1.6; }
.lp-install p { color: var(--text-2); }

/* FAQ */
.lp-faq { max-width: 860px; }
.lp-faq .lp-head { margin-bottom: 2rem; }
.lp-faq-item { border-bottom: 1px solid var(--border); }
.lp-faq-item:first-child { border-top: 1px solid var(--border); }
.lp-faq-item button { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 1.25rem; text-align: left; background: none; border: 0; padding: 1.3rem .25rem; font-size: 1.02rem; font-weight: 700; color: var(--text); cursor: pointer; transition: color .2s var(--ease); letter-spacing: -.01em; }
.lp-faq-item button:hover, .lp-faq-item.is-open button { color: var(--c-deep); }
.lp-faq-item svg { flex-shrink: 0; color: var(--c-primary); transition: transform .3s var(--ease); }
.lp-faq-item.is-open svg { transform: rotate(180deg); }
.lp-faq-panel { display: grid; grid-template-rows: 0fr; visibility: hidden; transition: grid-template-rows .3s var(--ease), visibility .3s; }
.lp-faq-item.is-open .lp-faq-panel { grid-template-rows: 1fr; visibility: visible; }
.lp-faq-panel > div { overflow: hidden; min-height: 0; }
.lp-faq-panel p { color: var(--text-2); line-height: 1.75; padding: 0 .25rem 1.4rem; max-width: 70ch; }

/* Final CTA */
.lp-cta { position: relative; overflow: hidden; isolation: isolate; background: var(--c-deep); color: var(--on-dark); padding: clamp(4rem, 9vw, 6.5rem) 0; }
.lp-cta::before { content: ''; position: absolute; z-index: -1; width: 560px; height: 560px; border-radius: 50%; right: -160px; top: -240px; border: 70px solid rgba(255,255,255,.05); }
.lp-cta-inner { display: flex; flex-direction: column; align-items: flex-start; gap: 1.25rem; }
.lp-cta h2 { color: #fff; max-width: 20ch; }
.lp-cta p { max-width: 58ch; line-height: 1.75; color: #F6E6DC; font-size: 1.05rem; }
.lp-cta .lp-hero-actions { margin-top: .75rem; gap: 1.5rem; }
.lp-link-light { color: #fff; font-weight: 700; text-decoration: underline; text-underline-offset: 5px; text-decoration-color: rgba(255,255,255,.5); transition: text-decoration-color .2s var(--ease); }
.lp-link-light:hover { text-decoration-color: #fff; }

/* Footer */
.lp-footer { background: var(--dark); color: var(--on-dark-2); padding-top: 4rem; }
.lp-footer-grid { display: grid; gap: 2.5rem; grid-template-columns: 1fr; padding-bottom: 3rem; }
@media (min-width: 780px) { .lp-footer-grid { grid-template-columns: 1.6fr 1fr 1fr 1fr; } }
.lp-footer h3 { color: var(--on-dark); font-size: .8rem; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 1rem; }
.lp-footer p { font-size: .92rem; line-height: 1.7; color: var(--on-dark-2); max-width: 40ch; }
.lp-footer li { margin-bottom: .6rem; }
.lp-footer a:not(.lp-brand) { color: var(--on-dark-2); text-decoration: none; font-size: .92rem; transition: color .2s var(--ease); }
.lp-footer a:not(.lp-brand):hover { color: #fff; text-decoration: underline; text-underline-offset: 4px; }
.lp-brand-footer { color: #fff; margin-bottom: 1rem; }
.lp-copy { border-top: 1px solid rgba(255,255,255,.14); padding-top: 1.25rem; padding-bottom: 1.75rem; font-size: .82rem; }
.lp-copy p { max-width: none; color: #B9AEA5; }

/* ============ MOTION (transform + opacity only) ============ */
@media (prefers-reduced-motion: no-preference) {
  .lp-hero::before { animation: lp-bg 1.4s var(--ease) both; }
  @keyframes lp-bg { from { opacity: 0; transform: scale(1.06); } to { opacity: 1; transform: none; } }
  .lp-in { animation: lp-rise .7s var(--ease) both; animation-delay: calc(var(--i, 0) * 110ms + 150ms); }
  @keyframes lp-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }

  .lp.is-motion [data-reveal] { opacity: 0; transform: translateY(22px); transition: opacity .7s var(--ease), transform .7s var(--ease); transition-delay: calc(min(var(--d, 0), 5) * 80ms); }
  .lp.is-motion [data-reveal].is-in { opacity: 1; transform: none; }
  /* after reveal, hover transforms must stay snappy */
  .lp.is-motion [data-reveal].is-in { transition-delay: 0ms; }

  .lp-skeleton { animation: lp-shimmer 1.4s infinite linear; }
  @keyframes lp-shimmer { to { background-position: -200% 0; } }
}
@media (prefers-reduced-motion: reduce) {
  .lp *, .lp *::before, .lp *::after { transition-duration: .01ms !important; animation: none !important; scroll-behavior: auto !important; }
}
`

/* ---------------------------- helpers ---------------------------- */
function scrollToSection(e, id, after) {
  e.preventDefault()
  const el = document.getElementById(id)
  if (el) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }
  if (after) after()
}

// Marks an element for the one-time scroll reveal; --d staggers siblings.
const rv = (i = 0) => ({ 'data-reveal': '', style: { '--d': i } })

const asList = (r) => (Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : Array.isArray(r?.items) ? r.items : [])
const isVisible = (o) =>
  o && o.is_public !== false && o.public !== false && o.published !== false &&
  (!o.status || String(o.status).toLowerCase() === 'published' || String(o.status).toLowerCase() === 'active')

function usePublicList(url) {
  const [state, setState] = useState({ loading: true, error: false, items: [] })
  useEffect(() => {
    const ctrl = new AbortController()
    fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then((json) => setState({ loading: false, error: false, items: asList(json).filter(isVisible) }))
      .catch((err) => { if (err.name !== 'AbortError') setState({ loading: false, error: true, items: [] }) })
    return () => ctrl.abort()
  }, [url])
  return state
}

const fullName = (o) => o.fullName || o.name || o.full_name || [o.first_name, o.middle_name, o.last_name].filter(Boolean).join(' ')
const pickPhoto = (o) => o.photo_url || o.photo || o.image_url || o.image || o.avatar || null
const pickContact = (o) => o.contact_number || o.contact || o.phone || o.mobile || null
const pickEmail = (o) => o.email || o.contact_email || null
const toArray = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v.trim() ? v.split(/\n|;|•/).map((s) => s.trim()).filter(Boolean) : [])
const initials = (n) => (n || '?').split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

/* ---------------------------- sub-components ---------------------------- */
function Skeletons({ n = 3 }) {
  return Array.from({ length: n }).map((_, i) => <div key={i} className="lp-skeleton" aria-hidden="true" />)
}

function OfficialCard({ o, i }) {
  const name = fullName(o)
  const photo = pickPhoto(o)
  const position = o.position || o.title || o.role
  const duties = o.responsibilities || o.description
  const phone = pickContact(o)
  const email = pickEmail(o)
  return (
    <li className="lp-person" {...rv(i)}>
      <div className="lp-person-photo">
        {photo
          ? <img src={photo} alt={`Portrait of ${name}`} loading="lazy" width="240" height="300" />
          : <span className="lp-avatar" aria-hidden="true">{initials(name)}</span>}
      </div>
      <div className="lp-person-body">
        <h4>{name}</h4>
        {position && <p className="lp-person-role">{position}</p>}
        {duties && <p className="lp-person-text">{duties}</p>}
        {phone && <p className="lp-contact"><Phone size={14} aria-hidden="true" /> {phone}</p>}
        {email && <p className="lp-contact"><Mail size={14} aria-hidden="true" /> {email}</p>}
      </div>
    </li>
  )
}

function DepartmentCard({ d, i }) {
  const services = toArray(d.publicServices || d.public_services || d.services)
  const people = toArray(d.personnel || d.members || d.staff).map((p) => (typeof p === 'string' ? p : (p.fullName || fullName(p)))).filter(Boolean)
  const phone = pickContact(d)
  const email = pickEmail(d)
  return (
    <li className="lp-dept" {...rv(i)}>
      <h4>{d.name || d.title}</h4>
      {(d.publicDescription || d.description) && <p className="lp-dept-text">{d.publicDescription || d.description}</p>}
      {services.length > 0 && (
        <>
          <p className="lp-dept-label">Available services</p>
          <ul className="lp-dept-list">{services.map((s) => <li key={s}>{s}</li>)}</ul>
        </>
      )}
      {people.length > 0 && (
        <>
          <p className="lp-dept-label">Assigned personnel</p>
          <p className="lp-dept-people">{people.join(', ')}</p>
        </>
      )}
      {phone && <p className="lp-contact"><Phone size={14} aria-hidden="true" /> {phone}</p>}
      {email && <p className="lp-contact"><Mail size={14} aria-hidden="true" /> {email}</p>}
    </li>
  )
}

function Faq({ item, open, onToggle, index }) {
  const id = `faq-${index}`
  return (
    <div className={`lp-faq-item ${open ? 'is-open' : ''}`}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={`${id}-panel`} id={`${id}-btn`} onClick={onToggle}>
          <span>{item.q}</span>
          <ChevronDown size={20} aria-hidden="true" />
        </button>
      </h3>
      <div id={`${id}-panel`} className="lp-faq-panel" role="region" aria-labelledby={`${id}-btn`}>
        <div><p>{item.a}</p></div>
      </div>
    </div>
  )
}

/* ---------------------------- page ---------------------------- */
export default function Landing() {
  const { session } = useAuth()
  const rootRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('home')
  const [openFaq, setOpenFaq] = useState(0)
  const sectionsObserved = useRef(false)

  const officials = usePublicList(ENDPOINTS.officials)
  const departments = usePublicList(ENDPOINTS.departments)
  const announcements = usePublicList(ENDPOINTS.announcements)

  // Resident features keep their existing routes. Visitors who are not logged in go to /login first.
  const gate = (path) => (session ? path : '/login')
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    const updateActive = () => {
      const offset = window.innerHeight * 0.35
      let current = 'home'
      for (const n of NAV) {
        const el = document.getElementById(n.id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.top <= offset) current = n.id
        else break
      }
      setActive(current)
    }
    updateActive()
    window.addEventListener('scroll', updateActive, { passive: true })
    window.addEventListener('resize', updateActive)
    return () => {
      window.removeEventListener('scroll', updateActive)
      window.removeEventListener('resize', updateActive)
    }
  }, [])

  // One-time scroll reveal. Elements animate in once and are then left alone.
  // Skipped entirely when the user prefers reduced motion (content stays visible).
  useEffect(() => {
    const root = rootRef.current
    if (!root || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    root.classList.add('is-motion')
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target) }
      }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    )
    root.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [officials.loading, departments.loading, announcements.loading])

  const SERVICES = [
    {
      icon: MessageSquareText, title: 'File a Complaint', featured: true,
      text: 'Submit community concerns through the digital complaint reporting process. Supported categories include noise, waste-related, infrastructure, and other community issues.',
      cta: { label: 'Get Started', to: gate('/resident/complaints/new') },
    },
    {
      icon: ClipboardList, title: 'Complaint Status Tracking',
      text: 'Monitor the status and progress of the complaints you have submitted, all in one place.',
      cta: { label: 'Learn More', to: gate('/resident/complaints') },
    },
    {
      icon: Users, title: 'Barangay Officials',
      text: 'Identify the officials and authorized personnel serving Area 6, based on publicly approved information.',
      anchor: 'officials',
    },
    {
      icon: Building2, title: 'Departments & Services',
      text: 'Discover the departments serving Area 6 and their publicly approved services.',
      anchor: 'departments',
    },
    {
      icon: Megaphone, title: 'Community Announcements',
      text: 'Read published community announcements and notices from Barangay San Jose – Annex Area 6.',
      cta: { label: 'Read Announcements', to: gate('/resident/announcements') },
    },
    {
      icon: UserRound, title: 'Resident Profile',
      text: 'Registered residents can manage their resident information and account details through their profile.',
      cta: { label: 'My Account', to: gate('/resident/profile') },
    },
  ]

  const annItems = announcements.items.slice(0, 3)

  return (
    <>
      <OfflineBanner />
      <div className="lp" ref={rootRef}>
        <style>{CSS}</style>
        <a className="lp-skip" href="#main-content" onClick={(e) => scrollToSection(e, 'main-content')}>Skip to content</a>

        {/* HEADER */}
        <header className={`lp-header ${scrolled ? 'is-scrolled' : ''}`}>
          <div className="lp-container lp-header-inner">
            <a href="#home" className="lp-brand" onClick={(e) => scrollToSection(e, 'home', closeMenu)}>
              <img src="/San_Jose_LOGO.webp" alt="Barangay San Jose logo" width="42" height="42" />
              <span>Annex 6 BMIS</span>
            </a>

            <nav id="lp-nav" className={`lp-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Primary">
              <ul>
                {NAV.map((n) => (
                  <li key={n.id}>
                    <a href={`#${n.id}`} aria-current={active === n.id ? 'true' : undefined} className={active === n.id ? 'is-active' : ''}
                      onClick={(e) => scrollToSection(e, n.id, closeMenu)}>{n.label}</a>
                  </li>
                ))}
              </ul>
              <div className="lp-nav-actions">
                <Link className="lp-btn lp-btn-outline lp-btn-sm" to="/login" onClick={closeMenu}>Log In</Link>
                <Link className="lp-btn lp-btn-primary lp-btn-sm" to="/register" onClick={closeMenu}>Register</Link>
              </div>
            </nav>

            <button type="button" className="lp-menu-btn" aria-expanded={menuOpen} aria-controls="lp-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((v) => !v)}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </header>

        <main id="main-content">
          {/* HERO */}
          <section id="home" className="lp-hero" aria-labelledby="hero-title">
            <div className="lp-container lp-hero-grid">
              <div className="lp-hero-copy">
                <p className="lp-hero-kicker lp-in" style={{ '--i': 0 }}>Barangay San Jose – Annex Area 6</p>
                <h1 id="hero-title" className="lp-in" style={{ '--i': 1 }}>Your Voice Matters. Your Community Moves Forward.</h1>
                <p className="lp-hero-text lp-in" style={{ '--i': 2 }}>
                  Introducing Annex 6 BMIS, a digital platform designed to make community complaint reporting, complaint monitoring, and access to barangay information more organized and accessible.
                </p>
                <div className="lp-hero-actions lp-in" style={{ '--i': 3 }}>
                  <Link className="lp-btn lp-btn-primary" to="/register">Get Started <ArrowRight size={17} aria-hidden="true" /></Link>
                  <a className="lp-btn lp-btn-outline-light" href="#services" onClick={(e) => scrollToSection(e, 'services')}>Explore Our Services</a>
                </div>
              </div>

              <div className="lp-hero-visual lp-in" style={{ '--i': 4 }} aria-label="Platform highlights">
                <div className="lp-seal">
                  <img src="/San_Jose_LOGO.webp" alt="Barangay San Jose seal" width="220" height="220" />
                </div>
                <ul className="lp-highlights">
                  <li><MessageSquareText size={20} aria-hidden="true" /> Digital Complaint Reporting</li>
                  <li><ClipboardList size={20} aria-hidden="true" /> Complaint Status Monitoring</li>
                  <li><Users size={20} aria-hidden="true" /> Community Information Access</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ABOUT */}
          <section id="about" className="lp-section" aria-labelledby="about-title">
            <div className="lp-container lp-about">
              <div className="lp-head" {...rv(0)}>
                <p className="lp-label">About the platform</p>
                <h2 id="about-title">Connecting Area 6 Through Better Digital Community Services</h2>
                <p className="lp-lead">
                  The Barangay San Jose Annex Area 6 Management System is a digital platform designed to streamline community complaint reporting, resident record management, and barangay operations. It provides residents with an easy way to submit and track concerns while enabling barangay personnel to efficiently manage and resolve community issues.
                </p>
              </div>
              <ul className="lp-objectives">
                {OBJECTIVES.map(({ icon: Icon, title, text }, i) => (
                  <li key={title} {...rv(i)}>
                    <span className="lp-icon" aria-hidden="true"><Icon size={22} strokeWidth={1.75} /></span>
                    <div><h3>{title}</h3><p>{text}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* SERVICES */}
          <section id="services" className="lp-section lp-alt" aria-labelledby="services-title">
            <div className="lp-container">
              <div className="lp-head" {...rv(0)}>
                <p className="lp-label">Our digital services</p>
                <h2 id="services-title">Explore the Services Available Through Annex 6 BMIS</h2>
              </div>
              <ul className="lp-services">
                {SERVICES.map(({ icon: Icon, title, text, cta, anchor, featured }, i) => (
                  <li key={title} className={`lp-service ${featured ? 'lp-service--feature' : ''}`} {...rv(i % 3)}>
                    <span className="lp-icon" aria-hidden="true"><Icon size={22} strokeWidth={1.75} /></span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    {cta && <Link className="lp-more" to={cta.to}>{cta.label} <ArrowRight size={15} aria-hidden="true" /></Link>}
                    {anchor && <a className="lp-more" href={`#${anchor}`} onClick={(e) => scrollToSection(e, anchor)}>See who’s listed <ArrowRight size={15} aria-hidden="true" /></a>}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section id="how-it-works" className="lp-section" aria-labelledby="how-title">
            <div className="lp-container">
              <div className="lp-head" {...rv(0)}>
                <p className="lp-label">How it works</p>
                <h2 id="how-title">Getting Started with Annex 6 BMIS Is Simple</h2>
              </div>
              <ol className="lp-steps">
                {STEPS.map((s, i) => (
                  <li key={s.title} {...rv(i)}>
                    <span className="lp-step-num" aria-hidden="true">{i + 1}</span>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* KNOW YOUR COMMUNITY */}
          <section id="community" className="lp-section lp-alt" aria-labelledby="community-title">
            <div className="lp-container">
              <div className="lp-head" {...rv(0)}>
                <p className="lp-label">Know your community</p>
                <h2 id="community-title">Meet the People and Departments Serving Area 6</h2>
              </div>

              <div id="officials" className="lp-block">
                <h3 className="lp-block-title">Barangay Officials</h3>
                {officials.loading ? (
                  <div className="lp-people-grid"><Skeletons n={5} /></div>
                ) : officials.items.length > 0 ? (
                  <ul className="lp-people-grid">{officials.items.map((o, i) => <OfficialCard key={o.id ?? i} o={o} i={i % 5} />)}</ul>
                ) : (
                  <p className="lp-empty">Official information is not available right now. Please check the <Link to="/directory">public directory</Link>.</p>
                )}
              </div>

              <div id="departments" className="lp-block">
                <h3 className="lp-block-title">Departments &amp; Services</h3>
                {departments.loading ? (
                  <div className="lp-dept-grid"><Skeletons n={6} /></div>
                ) : departments.items.length > 0 ? (
                  <ul className="lp-dept-grid">{departments.items.map((d, i) => <DepartmentCard key={d.id ?? i} d={d} i={i % 3} />)}</ul>
                ) : (
                  <p className="lp-empty">Department information is not available right now. Please check the <Link to="/directory">public directory</Link>.</p>
                )}
              </div>

              <p className="lp-center" style={{ marginTop: 0 }}>
                <Link className="lp-btn lp-btn-primary" to="/directory">View Complete Directory <ArrowRight size={17} aria-hidden="true" /></Link>
              </p>
            </div>
          </section>

          {/* ANNOUNCEMENTS */}
          <section id="announcements" className="lp-section" aria-labelledby="ann-title">
            <div className="lp-container">
              <div className="lp-head" {...rv(0)}>
                <p className="lp-label">Announcements</p>
                <h2 id="ann-title">Stay Connected with Your Community</h2>
              </div>
              {announcements.loading ? (
                <div className="lp-ann-grid"><Skeletons n={3} /></div>
              ) : annItems.length > 0 ? (
                <ul className={`lp-ann-grid ${annItems.length > 1 ? 'is-multi' : ''}`}>
                  {annItems.map((a, i) => {
                    const img = pickPhoto(a)
                    const date = fmtDate(a.published_at || a.publication_date || a.created_at)
                    const body = a.summary || a.description || a.content || ''
                    return (
                      <li key={a.id ?? i} className={`lp-ann ${i === 0 && annItems.length > 1 ? 'is-feature' : ''}`} {...rv(i)}>
                        {img && <div className="lp-ann-img"><img src={img} alt="" loading="lazy" /></div>}
                        <div className="lp-ann-body">
                          {date && <time dateTime={a.published_at || a.created_at}>{date}</time>}
                          <h3>{a.title}</h3>
                          {body && <p>{body.length > 160 ? `${body.slice(0, 157)}…` : body}</p>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="lp-empty">No announcements have been published yet. Please check back soon.</p>
              )}
              <p className="lp-center">
                <Link className="lp-btn lp-btn-outline" to={gate('/resident/announcements')}>View All Announcements</Link>
              </p>
            </div>
          </section>

          {/* ACCESS ON YOUR DEVICE */}
          <section id="access" className="lp-section lp-dark" aria-labelledby="access-title">
            <div className="lp-container lp-access">
              <div {...rv(0)}>
                <p className="lp-label">Access</p>
                <h2 id="access-title">Use Annex 6 BMIS on Your Phone</h2>
                <p className="lp-lead">
                  Residents access the platform through the resident-facing mobile experience. You can open it in your phone’s browser, and you may also add it to your home screen for quicker access.
                </p>
                <p className="lp-access-note"><Smartphone size={18} aria-hidden="true" /> Designed for residents on mobile.</p>
              </div>
              <div className="lp-install" {...rv(1)}><InstallHelp /></div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="lp-section" aria-labelledby="faq-title">
            <div className="lp-container lp-faq">
              <div className="lp-head" {...rv(0)}>
                <p className="lp-label">FAQ</p>
                <h2 id="faq-title">Frequently Asked Questions</h2>
              </div>
              <div {...rv(1)}>
                {FAQS.map((f, i) => (
                  <Faq key={f.q} item={f} index={i} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
                ))}
              </div>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className="lp-cta" aria-labelledby="cta-title">
            <div className="lp-container lp-cta-inner" {...rv(0)}>
              <h2 id="cta-title">Your Community. Your Voice. Our Shared Responsibility.</h2>
              <p>Be part of a more connected and informed community. Access Annex 6 BMIS and use its digital services to communicate your concerns and stay informed about your community.</p>
              <div className="lp-hero-actions">
                <Link className="lp-btn lp-btn-light" to="/register">Create Your Resident Account <ArrowRight size={17} aria-hidden="true" /></Link>
                <Link className="lp-link-light" to="/login">Already Registered? Log In</Link>
              </div>
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="lp-container lp-footer-grid">
            <div>
              <div className="lp-brand lp-brand-footer">
                <img src="/San_Jose_LOGO.webp" alt="Barangay San Jose logo" width="44" height="44" loading="lazy" />
                <span>Annex 6 BMIS</span>
              </div>
              <p>A digital platform for complaint reporting, complaint monitoring, and community information for Barangay San Jose – Annex Area 6.</p>
            </div>
            <nav aria-label="Footer navigation">
              <h3>Navigate</h3>
              <ul>
                {NAV.map((n) => <li key={n.id}><a href={`#${n.id}`} onClick={(e) => scrollToSection(e, n.id)}>{n.label}</a></li>)}
              </ul>
            </nav>
            <nav aria-label="Footer services">
              <h3>Services</h3>
              <ul>
                <li><Link to={gate('/resident/complaints/new')}>File a Complaint</Link></li>
                <li><Link to={gate('/resident/complaints')}>Track Status</Link></li>
                <li><Link to={gate('/resident/announcements')}>Announcements</Link></li>
                <li><Link to={gate('/resident/profile')}>My Profile</Link></li>
                <li><Link to="/directory">Officials &amp; Departments</Link></li>
              </ul>
            </nav>
            <nav aria-label="Account">
              <h3>Account</h3>
              <ul>
                <li><Link to="/login">Log In</Link></li>
                <li><Link to="/register">Register</Link></li>
              </ul>
            </nav>
          </div>
          <div className="lp-container lp-copy">
            <p>© {new Date().getFullYear()} Barangay San Jose – Annex Area 6. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  )
}