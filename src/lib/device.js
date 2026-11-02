import { useEffect, useState } from 'react'

const PHONE_RE = /Android.+Mobile|iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile|webOS|Mobile Safari/i
const TABLET_RE = /iPad|Tablet|Kindle|Silk|Android(?!.*Mobile)/i

/**
 * Pure classifier (easy to unit test). Order matters:
 *  1. explicit "mobile" signals (UA Client Hints, UA string, iPadOS-as-Mac)
 *  2. input-capability signals (primary pointer is coarse and cannot hover = touch-first device,
 *     which also catches "Request desktop site" on phones)
 *  3. explicit "not mobile" hint
 *  4. viewport width, used ONLY as a secondary signal together with touch support, so a narrow
 *     desktop browser window is never mistaken for a phone.
 * Tablets are classed as "mobile" (touch-first); this means tablets use the resident app, not the admin app.
 */
export function classifyDevice({
  userAgent = '',
  uaMobile,
  maxTouchPoints = 0,
  coarsePointer = false,
  canHover = true,
  width = 1280,
} = {}) {
  const ipadOs = /Macintosh/i.test(userAgent) && maxTouchPoints > 1
  if (uaMobile === true) return 'mobile'
  if (PHONE_RE.test(userAgent) || TABLET_RE.test(userAgent) || ipadOs) return 'mobile'
  if (coarsePointer && !canHover) return 'mobile'
  if (uaMobile === false) return 'desktop'
  if (maxTouchPoints > 0 && width < 768) return 'mobile'
  return 'desktop'
}

export function readDeviceSignals(win = window) {
  const nav = win.navigator || {}
  const mm = (q) => (typeof win.matchMedia === 'function' ? win.matchMedia(q).matches : false)
  return {
    userAgent: nav.userAgent || '',
    uaMobile: typeof nav.userAgentData?.mobile === 'boolean' ? nav.userAgentData.mobile : undefined,
    maxTouchPoints: nav.maxTouchPoints || 0,
    coarsePointer: mm('(pointer: coarse)'),
    canHover: typeof win.matchMedia === 'function' ? mm('(hover: hover)') : true,
    width: win.innerWidth || 1280,
  }
}

export const detectDevice = (win = window) => classifyDevice(readDeviceSignals(win))

/** Re-evaluates on resize, rotation, and pointer-capability changes. */
export function useDeviceType() {
  const [device, setDevice] = useState(() => detectDevice())
  useEffect(() => {
    const update = () => setDevice(detectDevice())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    const queries = ['(pointer: coarse)', '(hover: hover)'].map((q) => window.matchMedia?.(q)).filter(Boolean)
    queries.forEach((m) => m.addEventListener?.('change', update))
    update()
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      queries.forEach((m) => m.removeEventListener?.('change', update))
    }
  }, [])
  return device
}

const STAFF_ROLES = ['Admin', 'SuperAdmin', 'OIC', 'Secretary', 'AdminStaff', 'SupportingStaff']
export const requiredDeviceFor = (role) => (STAFF_ROLES.includes(role) ? 'desktop' : 'mobile')
