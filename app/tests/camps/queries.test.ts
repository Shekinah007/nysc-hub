/**
 * Camp query tests (SPEC-camps.md):
 *   - every camp is readable anonymously
 *   - state filter narrows to that state only
 *   - search matches name/state/city/address
 *   - getCampBySlug: known slug, unknown slug, case-insensitivity
 *   - mapsUrl: present with coordinates, absent without
 *   - status labels are the exact spec strings (badge contract)
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { connectTestDb, disconnectTestDb } from '../db'
import { getCamps, listCampStates, getCampBySlug, mapsUrl, statusLabel } from '@/server/camps/queries'
import { seedCamps } from '../../scripts/seed-camps'

describe('camp queries', () => {
  beforeAll(async () => {
    await connectTestDb()
    await seedCamps()
  })
  afterAll(async () => {
    await disconnectTestDb()
  })
  afterEach(async () => {
    // seed once in beforeAll; tests below are read-only
  })

  it('returns all 37 camps anonymously with the list shape', async () => {
    const camps = await getCamps()
    expect(camps).toHaveLength(37)
    const first = camps[0]
    expect(first.slug).toBeTruthy()
    expect(first.name).toBeTruthy()
    expect(first.state).toBeTruthy()
    expect(first.stateCode).toBeTruthy()
    expect(first.city).toBeTruthy()
    expect(first.address).toBeTruthy()
    expect(['community', 'claimed', 'authorized']).toContain(first.status)
  })

  it('sorts camps by state name', async () => {
    const camps = await getCamps()
    const states = camps.map((c) => c.state)
    const sorted = [...states].sort()
    expect(states).toEqual(sorted)
  })

  it('filters by state', async () => {
    const lagos = await getCamps({ state: 'Lagos' })
    expect(lagos).toHaveLength(1)
    expect(lagos[0].stateCode).toBe('LA')
    // Every other state is excluded.
    const notLagos = await getCamps({ state: 'Kano' })
    expect(notLagos.every((c) => c.state === 'Kano')).toBe(true)
  })

  it('treats "All" as no filter', async () => {
    expect(await getCamps({ state: 'All' })).toHaveLength(37)
  })

  it('searches across name, state, city, and address', async () => {
    const byState = await getCamps({ search: 'Lagos' })
    expect(byState.length).toBeGreaterThan(0)
    expect(byState.every((c) => c.state === 'Lagos')).toBe(true)

    const byCity = await getCamps({ search: 'Kubwa' })
    expect(byCity).toHaveLength(1)
    expect(byCity[0].stateCode).toBe('FC')

    const byAddr = await getCamps({ search: 'Kubwa' })
    expect(byAddr[0].city).toBe('Bwari')

    const unknown = await getCamps({ search: 'zzzz-nonexistent' })
    expect(unknown).toHaveLength(0)
  })

  it('lists distinct states for the filter', async () => {
    const states = await listCampStates()
    expect(states).toHaveLength(37)
    const sorted = [...states].sort()
    expect(states).toEqual(sorted)
    expect(states).toContain('FCT Abuja')
  })

  it('resolves a camp by slug (case-insensitive) and returns the detail', async () => {
    const camp = await getCampBySlug('fct-abuja')
    expect(camp).not.toBeNull()
    expect(camp!.stateCode).toBe('FC')
    expect(camp!.coordinates).toBeDefined()
    expect(camp!.coordinates!.lat).toBe(9.148659)
    expect(camp!.verifiedSource).toBeTruthy()

    const upper = await getCampBySlug('FCT-ABUJA')
    expect(upper!._id).toBe(camp!._id)
  })

  it('returns null for an unknown slug', async () => {
    expect(await getCampBySlug('no-such-camp')).toBeNull()
  })

  it('builds a maps URL from coordinates, null without', async () => {
    const camp = await getCampBySlug('fct-abuja')
    const url = mapsUrl(camp!)
    expect(url).toBe('https://www.google.com/maps?q=9.148659,7.3164481')

    expect(mapsUrl({})).toBeNull()
  })

  it('uses the exact spec status labels', async () => {
    expect(statusLabel('community')).toBe('Community-managed')
    expect(statusLabel('claimed')).toBe('Claimed by camp crew (unofficial)')
    expect(statusLabel('authorized')).toBe('Authorized by camp official')
  })
})
