/**
 * Local connection diagnostic. Connects using MONGODB_URI from the env file
 * passed to node and reports ONLY the outcome + error name/code.
 *
 * It NEVER prints the URI or password, so the secret stays out of logs and
 * chat. Used to isolate whether a stored connection string is genuinely
 * invalid or is being mangled somewhere else.
 *
 * Run with the real value on a local env file (never committed):
 *   node --env-file=.env.local --import tsx scripts/check-conn.ts
 */
import mongoose from 'mongoose'

const uri = process.env.MONGODB_URI

if (!uri) {
  console.log('NO_URI: MONGODB_URI is not set in the env file')
  process.exit(2)
}

// Structural shape check (safe to report — no secrets): does it at least look
// like a Mongo URI, and does it still contain the <password> placeholder?
const scheme = uri.split(':')[0]
const hasPlaceholder = uri.includes('<password>')
const length = uri.length
// host is between the last '@' and the first '/' after it
const hostStart = uri.indexOf('@')
const hostPart = hostStart > -1 ? uri.slice(hostStart + 1).split('/')[0] : 'n/a'
const dbStart = uri.lastIndexOf('/')
const dbPart = dbStart > -1 ? uri.slice(dbStart + 1).split('?')[0] : 'n/a'

console.log('--- structural shape (no secrets) ---')
console.log('scheme:', scheme)
console.log('length:', length)
console.log('has <password> placeholder:', hasPlaceholder)
console.log('host segment:', hostPart)
console.log('db segment:', dbPart)
console.log('---')

try {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 12000,
  })
  const info = await mongoose.connection.db?.admin().command({ ping: 1 })
  console.log('RESULT: CONNECTED  (ping ok =', info?.ok === 1, ')')
  await mongoose.disconnect()
  process.exit(0)
} catch (e) {
  const name = e instanceof Error ? e.name : 'unknown'
  const code = (e as { code?: number }).code
  const msg = e instanceof Error ? e.message.split('\n')[0].slice(0, 160) : 'unknown'
  console.log('RESULT: FAILED')
  console.log('error name:', name)
  console.log('error code:', code)
  // Mongo auth/network errors are safe to surface (they never echo creds).
  console.log('message:', msg)
  process.exit(1)
}
