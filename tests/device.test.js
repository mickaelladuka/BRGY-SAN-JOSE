import { describe, expect, it } from 'vitest'
import { classifyDevice, requiredDeviceFor } from '../src/lib/device'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36'
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

describe('classifyDevice', () => {
  it('detects phones from the user agent', () => {
    expect(classifyDevice({ userAgent: IPHONE })).toBe('mobile')
    expect(classifyDevice({ userAgent: ANDROID })).toBe('mobile')
  })
  it('detects mobile from UA client hints', () => {
    expect(classifyDevice({ userAgent: WINDOWS, uaMobile: true })).toBe('mobile')
  })
  it('treats iPadOS (Mac user agent + touch) as mobile', () => {
    expect(classifyDevice({ userAgent: MAC, maxTouchPoints: 5 })).toBe('mobile')
  })
  it('detects a phone using "desktop site" via touch-first input', () => {
    expect(classifyDevice({ userAgent: WINDOWS, coarsePointer: true, canHover: false, maxTouchPoints: 5, width: 980 })).toBe('mobile')
  })
  it('keeps desktop browsers as desktop, even in a narrow window', () => {
    expect(classifyDevice({ userAgent: WINDOWS, uaMobile: false, width: 400 })).toBe('desktop')
    expect(classifyDevice({ userAgent: WINDOWS, width: 400 })).toBe('desktop')
    expect(classifyDevice({ userAgent: MAC, width: 1440 })).toBe('desktop')
  })
  it('does not treat touch-screen laptops with a mouse as mobile', () => {
    expect(classifyDevice({ userAgent: WINDOWS, maxTouchPoints: 10, coarsePointer: false, canHover: true, width: 1366 })).toBe('desktop')
  })
  it('uses width only as a secondary signal together with touch', () => {
    expect(classifyDevice({ userAgent: WINDOWS, maxTouchPoints: 5, width: 500 })).toBe('mobile')
  })
})

describe('requiredDeviceFor', () => {
  it('maps roles to the device class they may use', () => {
    expect(requiredDeviceFor('Resident')).toBe('mobile')
    expect(requiredDeviceFor('Admin')).toBe('desktop')
  })
})
