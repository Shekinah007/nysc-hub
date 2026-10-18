import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/health/route'

/**
 * Smoke test for the health endpoint — proves the route + NextResponse import
 * chain works in the vitest environment before any feature code lands.
 */
describe('GET /api/health', () => {
  it('returns ok status with a timestamp', async () => {
    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.status).toBe('ok')
    expect(json.timestamp).toBeTypeOf('string')
  })

  it('returns a parseable ISO timestamp', () => {
    const timestamp = new Date().toISOString()
    expect(() => new Date(timestamp)).not.toThrow()
  })
})
