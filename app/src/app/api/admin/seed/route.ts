/**
 * TEMPORARY one-off route to seed production camps (Task 12 acceptance).
 *
 * DELETE THIS FILE after the seed succeeds. It exists because the local
 * `vercel env pull` masks Sensitive values as [SENSITIVE], so the seed
 * script cannot run from this machine with the real connection string.
 * Running it inside the function gets the env at runtime, for free.
 *
 * Access restricted to a one-time key set as SEED_ADMIN_KEY; without it the
 * route 401s. Never makes it to the next deploy.
 */
import { NextResponse } from 'next/server'
import { connection } from 'next/server'

import { dbConnect } from '@/lib/db'
import { Camp, CampDepartment, DEFAULT_DEPARTMENTS } from '@/models/camps'
import { nyscCamps } from '@/data/camps/camps.seed'


/**
 * Idempotent upsert of all 37 camps, matching scripts/seed-camps.ts exactly.
 * See the file header: this is a one-off and gets deleted after it succeeds.
 */
async function seedCamps() {
  await dbConnect()

  let created = 0
  let depsSeeded = 0
  for (const seed of nyscCamps) {
    const slug = seed.stateCode === 'FC' ? 'fct-abuja'
      : seed.stateName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

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
    if (camp.createdAt && camp.updatedAt && camp.createdAt.getTime() === camp.updatedAt.getTime()) {
      created++
    }

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
      depsSeeded += missing.length
    }
  }

  return {
    camps: await Camp.countDocuments(),
    departments: await CampDepartment.countDocuments(),
    newlyCreated: created,
    newlySeededDepartments: depsSeeded,
  }
}

export async function GET(request: Request) {
  // GET handlers prerender under cacheComponents; opt into request time.
  await connection()
  const key = process.env.SEED_ADMIN_KEY
  if (!key) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 })
  }
  const provided = new URL(request.url).searchParams.get('key')
  if (provided !== key) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await seedCamps()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
