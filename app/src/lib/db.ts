import mongoose from 'mongoose'

/**
 * Singleton Mongoose connection.
 *
 * Caches the promise across hot reloads in dev and across reuse in serverless
 * invocations, so we never open more connections than needed.
 * Docs: https://mongoosejs.com/docs/connections.html
 *
 * The URI is read lazily inside dbConnect (not at module load): the test
 * harness spins up an in-memory server in `beforeAll` and points
 * MONGODB_URI at it — a module-level read would fire before that runs.
 */
function getUri(): string {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Add it to your environment — see app/.env.example.',
    )
  }
  return uri
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Augment the global so the cache survives module reloads in development.
declare global {
  var mongooseCache: MongooseCache | undefined
}

const cache: MongooseCache =
  globalThis.mongooseCache ?? (globalThis.mongooseCache = { conn: null, promise: null })

export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn

  if (!cache.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    }
    // Any rejection resets the promise so the next call retries instead of
    // hanging on a failed connection (serverless cold starts).
    cache.promise = mongoose.connect(getUri(), opts).then((m) => m)
  }

  try {
    cache.conn = await cache.promise
  } catch (err) {
    cache.promise = null
    throw err
  }

  return cache.conn
}

/**
 * Test helper: connect to the in-memory Mongo server and reset every
 * collection between tests so state never leaks across cases.
 */
export async function dbConnectForTest(uri: string) {
  const opts: mongoose.ConnectOptions = {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  }
  await mongoose.connect(uri, opts)
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase()
  }
}

export async function dbDisconnect() {
  await mongoose.disconnect()
}

export { mongoose }
