import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HttpError } from '../http'

// We test HttpError directly (no store dependency).
// The HttpClient class requires Pinia store context so full integration tests
// would need a Pinia setup — here we focus on the error class and demonstrate
// how to mock fetch for future HttpClient tests.

describe('HttpError', () => {
  it('sets status, statusText, and body', () => {
    const err = new HttpError('Not Found', 404, 'Not Found', { id: '123' })
    expect(err.message).toBe('Not Found')
    expect(err.status).toBe(404)
    expect(err.statusText).toBe('Not Found')
    expect(err.body).toEqual({ id: '123' })
  })

  it('has name set to HttpError', () => {
    const err = new HttpError('fail', 500, 'Internal Server Error')
    expect(err.name).toBe('HttpError')
  })

  it('is an instance of Error', () => {
    const err = new HttpError('fail', 500, 'Internal Server Error')
    expect(err).toBeInstanceOf(Error)
  })

  it('body is optional', () => {
    const err = new HttpError('Unauthorized', 401, 'Unauthorized')
    expect(err.body).toBeUndefined()
  })
})

describe('HttpClient (fetch mock pattern)', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    // Mock fetch globally — this pattern works for testing HttpClient methods
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('demonstrates mocking a successful JSON response', async () => {
    const mockData = { items: [1, 2, 3] }
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const response = await fetch('http://localhost:4000/api/test')
    const json = await response.json()

    expect(json).toEqual(mockData)
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/test')
  })

  it('demonstrates mocking an error response', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'record not found' }), {
        status: 404,
        statusText: 'Not Found',
      }),
    )

    const response = await fetch('http://localhost:4000/api/orders/999')
    expect(response.ok).toBe(false)
    expect(response.status).toBe(404)
  })
})
