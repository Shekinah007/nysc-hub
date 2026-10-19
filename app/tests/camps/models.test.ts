import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { connectTestDb, clearTestDb, disconnectTestDb } from '../db'
import mongoose from 'mongoose'
import {
  Camp,
  CampDepartment,
  CampAdmin,
  CampClaimRequest,
  DEFAULT_DEPARTMENTS,
} from '@/models/camps'

describe('camp models shape and index behavior', () => {
  beforeAll(async () => {
    await connectTestDb()
  })
  afterAll(async () => {
    await disconnectTestDb()
  })
  afterEach(async () => {
    await clearTestDb()
  })

  it('creates a camp with default community status', async () => {
    const c = await Camp.create({
      slug: 'fct-abuja',
      name: 'NYSC FCT Orientation Camp',
      state: 'FCT',
      stateCode: 'FCT',
      address: 'Kubwa, Abuja',
      city: 'Abuja',
    })
    expect(c.status).toBe('community')
    expect(c.slug).toBe('fct-abuja')
    // Mongoose returns the (empty) subdocument shape, not undefined.
    expect(c.coordinates?.lat).toBeUndefined()
  })

  it('enforces unique slug and stateCode', async () => {
    const base = { name: 'X', state: 'Lagos', stateCode: 'LAG', address: 'a', city: 'b' }
    await Camp.create({ ...base, slug: 'lagos' })
    await expect(Camp.create({ ...base, slug: 'lagos' })).rejects.toThrow()
    // stateCode clash on a different slug also rejects.
    await expect(Camp.create({ ...base, slug: 'lagos-2' })).rejects.toThrow()
    // Both unique keys differ -> creates fine.
    await Camp.create({ ...base, slug: 'lagos-2', stateCode: 'LAG2' })
    const all = await Camp.find()
    expect(all).toHaveLength(2)
  })

  it('seeds the default 10 departments per camp with unofficial status', async () => {
    const c = await Camp.create({
      slug: 'lag',
      name: 'L',
      state: 'Lagos',
      stateCode: 'LAG',
      address: 'a',
      city: 'b',
    })
    await CampDepartment.insertMany(
      DEFAULT_DEPARTMENTS.map((d) => ({ campId: c._id, key: d.key, name: d.name })),
    )
    const deps = await CampDepartment.find({ campId: c._id }).sort('key')
    expect(deps).toHaveLength(10)
    expect(deps.every((d) => d.status === 'unofficial')).toBe(true)
    expect(deps.map((d) => d.key)).toContain('man-o-war')
  })

  it('enforces one active CampAdmin grant per camp/user/scope/department', async () => {
    const c = await Camp.create({
      slug: 'lag',
      name: 'L',
      state: 'Lagos',
      stateCode: 'LAG',
      address: 'a',
      city: 'b',
    })
    const u1 = new mongoose.Types.ObjectId()
    const u2 = new mongoose.Types.ObjectId()
    const grant = {
      campId: c._id,
      userId: u1,
      scope: 'camp' as const,
      grantedBy: u2,
    }
    await CampAdmin.create(grant)
    await expect(CampAdmin.create(grant)).rejects.toThrow()
    // Same user, different scope, is a distinct grant.
    await CampAdmin.create({ ...grant, scope: 'department' as const })
    // Revoking frees the slot: re-grant succeeds.
    const existing = await CampAdmin.findOne({ campId: c._id, userId: u1, scope: 'camp' })
    expect(existing).not.toBeNull()
    existing!.revokedAt = new Date()
    await existing!.save()
    await CampAdmin.create(grant)
    const active = await CampAdmin.find({ campId: c._id, revokedAt: null })
    expect(active).toHaveLength(2)
  })

  it('enforces unique pending claim request per camp/requester', async () => {
    const c = await Camp.create({
      slug: 'lag',
      name: 'L',
      state: 'Lagos',
      stateCode: 'LAG',
      address: 'a',
      city: 'b',
    })
    const u1 = new mongoose.Types.ObjectId()
    const u2 = new mongoose.Types.ObjectId()
    const req = { campId: c._id, requesterId: u1, message: 'I run OBS here.' }
    await CampClaimRequest.create(req)
    await expect(CampClaimRequest.create(req)).rejects.toThrow()
    // A different user may also request the same camp.
    await CampClaimRequest.create({ ...req, requesterId: u2 })
    const count = await CampClaimRequest.countDocuments({ campId: c._id })
    expect(count).toBe(2)
  })
})
