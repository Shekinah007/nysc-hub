import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

/**
 * Database test harness — one shared in-memory Mongo server per test file
 * that opts in via `connectTestDb()`. Collections are cleared between tests
 * so state never leaks across cases.
 *
 * Deliberately NOT registered as a global setupFile: component tests must
 * not pay the cost of a database they never touch.
 * Docs: https://github.com/nodkz/mongodb-memory-server
 */
let mongoServer: MongoMemoryServer | null = null

export async function connectTestDb() {
  mongoServer = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongoServer.getUri()

  await mongoose.connect(mongoServer.getUri(), {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  })
}

export async function clearTestDb() {
  for (const name of Object.keys(mongoose.connection.collections)) {
    await mongoose.connection.collections[name].deleteMany({})
  }
}

export async function disconnectTestDb() {
  await mongoose.disconnect()
  if (mongoServer) {
    await mongoServer.stop()
    mongoServer = null
  }
}
