/**
 * scripts/smoke-seed.ts — one-shot end-to-end proof of the camp seed.
 *
 * Spins up an in-memory Mongo, runs the REAL seed script twice via tsx
 * (exactly as `npm run seed:camps` runs it), then verifies counts in the
 * DB. Not part of the test suite; run manually:
 *   npx tsx scripts/smoke-seed.ts
 */
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

async function main() {
  const ms = await MongoMemoryServer.create()
  process.env.MONGODB_URI = ms.getUri()

  const { execFileSync } = await import('node:child_process')
  // Windows needs the shell to resolve npx; the seed runs as a real child
  // process, exactly like `npm run seed:camps`.
  // Windows needs the shell to resolve npx. Args are compile-time literals
  // here, so the DEP0190 warning does not apply (nothing user-controlled).
  const run = () =>
    execFileSync('npx tsx scripts/seed-camps.ts', {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env },
      shell: true,
    })

  const out1 = run()
  console.log('--- run 1 ---')
  console.log(out1)

  const out2 = run()
  console.log('--- run 2 (idempotency) ---')
  console.log(out2)

  await mongoose.connect(ms.getUri())
  const { Camp } = await import("../src/models/camps/Camp")
  const { CampDepartment } = await import("../src/models/camps/CampDepartment")
  console.log('camps in db:', await Camp.countDocuments())
  console.log('departments in db:', await CampDepartment.countDocuments())
  const fct = await Camp.findOne({ stateCode: 'FC' })
  console.log('FCT slug:', fct && fct.slug)
  const dupeSlug = await Camp.aggregate([
    { $group: { _id: '$slug', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ])
  console.log('duplicate slugs:', dupeSlug.length)

  await mongoose.disconnect()
  await ms.stop()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
