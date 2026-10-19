/**
 * scripts/seed-camps.ts — idempotent upsert of all 37 NYSC orientation camps.
 *
 * Run manually: `npm run seed:camps` (repo root). Requires MONGODB_URI.
 *
 * Behaviour (SPEC-camps.md):
 *   - upserts every camp by stateCode (stable natural key across re-runs;
 *     edits made later in the admin UI are preserved, not clobbered)
 *   - seeds the default 10 departments for every camp with `unofficial`
 *     status (idempotent by (campId, key))
 *   - never touches status, claimedBy, authorizedBy, authorizedAt —
 *     claim/authorization state is owned by the review flow, not the seed
 *   - reports a summary; exits non-zero if the final count is not 37
 *
 * Deliberately NOT wired into any CI/deploy pipeline: the platform owner
 * runs it against each environment once (SPEC-camps.md: "run manually").
 */
import mongoose from 'mongoose'

import { dbConnect } from '../src/lib/db'
import { Camp, CampDepartment, DEFAULT_DEPARTMENTS } from '../src/models/camps'
import { nyscCamps } from '../src/data/camps/camps.seed'

function campSlug(stateCode: string, stateName: string): string {
  const base = stateName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  // FCT gets an explicit disambiguator (SPEC-camps.md slug edge case).
  // Its seed stateCode is 'FC' and stateName 'FCT Abuja'.
  return stateCode === 'FC' ? 'fct-abuja' : base
}

async function seedOne(seed: (typeof nyscCamps)[number]) {
  const slug = campSlug(seed.stateCode, seed.stateName)

  // Upsert by stateCode — the stable natural key across re-runs.
  const camp = await Camp.findOneAndUpdate(
    { stateCode: seed.stateCode },
    {
      $set: {
        slug,
        name: seed.campName,
        state: seed.stateName,
        stateCode: seed.stateCode,
        address: seed.address,
        city: seed.lga,
        coordinates: { lat: seed.lat, lng: seed.lng },
        verifiedSource: seed.verifiedSource,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  )

  // Seed departments idempotently by (campId, key).
  const existing = await CampDepartment.find({ campId: camp._id }).select('key')
  const have = new Set(existing.map((d) => d.key))
  const missing = DEFAULT_DEPARTMENTS.filter((d) => !have.has(d.key))
  if (missing.length > 0) {
    await CampDepartment.insertMany(
      missing.map((d) => ({
        campId: camp._id,
        key: d.key,
        name: d.name,
        status: 'unofficial' as const,
      })),
    )
  }
  return { departments: missing.length, created: missing.length === DEFAULT_DEPARTMENTS.length }
}

/**
 * The seed runner, exportable so tests (tests/camps/seed.test.ts) can call
 * the real script against the in-memory test DB.
 */
export async function seedCamps() {
  await dbConnect()

  let createdCount = 0
  let departmentCount = 0
  for (const seed of nyscCamps) {
    const { departments, created } = await seedOne(seed)
    departmentCount += departments
    if (created) createdCount++
  }

  const total = await Camp.countDocuments()
  const depTotal = await CampDepartment.countDocuments()
  console.log(`[seed] ${nyscCamps.length} camps processed`)
  console.log(`[seed] camps in db: ${total} (${createdCount} newly created)`)
  console.log(`[seed] departments: ${depTotal} (${departmentCount} newly seeded)`)

  if (total !== nyscCamps.length) {
    throw new Error(`Expected ${nyscCamps.length} camps, found ${total}`)
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Set it and re-run.')
    process.exit(1)
  }
  try {
    await seedCamps()
    await mongoose.disconnect()
    process.exit(0)
  } catch (e) {
    console.error('[seed] failed:', e)
    try { await mongoose.disconnect() } catch {}
    process.exit(1)
  }
}

// Run directly via tsx; skip when imported (eg. by the test suite).
if (require.main === module) {
  main()
}
