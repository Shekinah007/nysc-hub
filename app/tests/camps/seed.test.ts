/**
 * Seed idempotency test (SPEC-camps.md success criteria):
 *   - run the seed twice, end with exactly 37 camps with unique slugs
 *   - every camp has the 10 default departments, all `unofficial`
 *   - re-running seeds no additional departments
 *
 * Runs the real seed script entrypoint against the in-memory test DB, so the
 * test proves the script itself works, not a re-implementation of it.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { connectTestDb, clearTestDb, disconnectTestDb } from '../db'
import mongoose from 'mongoose'
import { Camp, CampDepartment } from '@/models/camps'
import { nyscCamps } from '@/data/camps/camps.seed'
import { seedCamps } from '../../scripts/seed-camps'



describe('camp seed idempotency', () => {
  beforeAll(async () => {
    await connectTestDb()
  })
  afterAll(async () => {
    await disconnectTestDb()
  })

  it('seeds exactly 37 camps with unique slugs and 10 departments each', async () => {
    await clearTestDb()
    await seedCamps()

    const camps = await Camp.find().sort('stateCode')
    expect(camps).toHaveLength(37)

    const slugs = camps.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(37)

    // FCT slug edge case (SPEC-camps.md): seed uses stateCode 'FC'.
    const fct = camps.find((c) => c.stateCode === 'FC')
    expect(fct?.slug).toBe('fct-abuja')

    for (const camp of camps) {
      const deps = await CampDepartment.find({ campId: camp._id })
      expect(deps).toHaveLength(10)
      expect(deps.every((d) => d.status === 'unofficial')).toBe(true)
      expect(camp.status).toBe('community')
      expect(camp.verifiedSource).toBeTruthy()
    }
  })

  it('is idempotent: a second run adds no camps and no departments', async () => {
    await seedCamps()
    await seedCamps()

    expect(await Camp.countDocuments()).toBe(37)
    expect(await CampDepartment.countDocuments()).toBe(37 * 10)

    // Departments stay unofficial — the seed never claims anything.
    const official = await CampDepartment.countDocuments({ status: { $ne: 'unofficial' } })
    expect(official).toBe(0)
  })

  it('preserves claim state: the seed never overwrites status/claimedBy', async () => {
    await seedCamps()
    const lagos = await Camp.findOne({ stateCode: 'LA' })
    if (!lagos) throw new Error('lagos camp missing')

    lagos.status = 'claimed'
    lagos.claimedBy = new mongoose.Types.ObjectId()
    await lagos.save()

    await seedCamps()

    const after = await Camp.findOne({ stateCode: 'LA' })
    expect(after?.status).toBe('claimed')
    expect(after?.claimedBy).toBeTruthy()
  })

  it('covers all 37 seeded state codes', async () => {
    const codes = (await Camp.find().select('stateCode')).map((c) => c.stateCode)
    expect(codes.sort()).toEqual(nyscCamps.map((c) => c.stateCode).sort())
  })
})
