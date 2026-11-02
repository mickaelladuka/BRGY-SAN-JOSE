import { describe, expect, it } from 'vitest'
import { getErrorMessage, getFieldErrors, toPage } from '../src/lib/api'

const res = (status, data) => ({ response: { status, data } })

describe('getErrorMessage', () => {
  it('explains network failures', () => expect(getErrorMessage({})).toMatch(/server|offline/i))
  it('never leaks server internals on 500', () => expect(getErrorMessage(res(500, { detail: 'SqlException at ...' }))).not.toMatch(/Sql/))
  it('reads Identity error arrays', () => expect(getErrorMessage(res(400, [{ code: 'x', description: 'Passwords must have a digit.' }]))).toBe('Passwords must have a digit.'))
  it('reads the API message', () => expect(getErrorMessage(res(401, { message: 'Invalid credentials' }))).toBe('Invalid credentials'))
  it('handles 403 and 429', () => {
    expect(getErrorMessage(res(403, {}))).toMatch(/permission/)
    expect(getErrorMessage(res(429, {}))).toMatch(/Too many/)
  })
})
describe('getFieldErrors', () => {
  it('camel-cases ProblemDetails keys', () => expect(getFieldErrors(res(400, { errors: { Subject: ['Required'] } }))).toEqual({ subject: 'Required' }))
})
describe('toPage', () => {
  it('accepts arrays and envelopes', () => {
    expect(toPage([1, 2])).toEqual({ items: [1, 2], total: 2 })
    expect(toPage({ items: [1], total: 9 })).toEqual({ items: [1], total: 9 })
  })
})
