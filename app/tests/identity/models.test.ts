import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import mongoose from 'mongoose'
import {
  connectTestDb,
  clearTestDb,
  disconnectTestDb,
} from '../db'
import { User } from '@/models/identity/User'
import { EmailToken } from '@/models/identity/EmailToken'
import { AuditEntry } from '@/models/identity/AuditEntry'

/**
 * Database-backed suite: one in-memory Mongo server for this file, cleared
 * between tests.
 */
beforeAll(async () => {
  await connectTestDb()
}, 120_000)

afterEach(async () => {
  await clearTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

/**
 * Schema-shape test — the permanent v1 constraint from SPEC-identity.md and
 * SPEC-verification.md: the User schema must NEVER contain NYSC identity
 * fields (state codes, call-up numbers, call-up letters, ID documents).
 * If someone adds one, this test fails the build.
 */
describe('User schema shape (permanent v1 constraint)', () => {
  const forbiddenSubstrings = [
    'statecode',
    'state_code',
    'callup',
    'call_up',
    'callupnumber',
    'callupletter',
    'nyscid',
    'iddocument',
  ]

  it('has no NYSC identity fields in its schema paths', () => {
    const paths = Object.keys(User.schema.paths)
    const offenders = paths.filter((path) =>
      forbiddenSubstrings.some((sub) => path.toLowerCase().includes(sub)),
    )
    expect(
      offenders,
      `NYSC identity fields found: ${offenders.join(', ')}`,
    ).toEqual([])
  })

  it('has no virtuals leaking identity data', () => {
    const virtuals = Object.keys(User.schema.virtuals)
    const offenders = virtuals.filter((v) =>
      forbiddenSubstrings.some((sub) => v.toLowerCase().includes(sub)),
    )
    expect(offenders).toEqual([])
  })
})

describe('User model', () => {
  it('creates a user with default lifecycle stage and flags', async () => {
    const user = await User.create({
      email: 'corper@example.com',
      passwordHash: 'hashed-secret',
      name: 'Ada Obi',
    })

    expect(user.lifecycleStage).toBe('prospective')
    expect(user.platformAdmin).toBe(false)
    expect(user.deactivated).toBe(false)
    expect(user.emailVerifiedAt).toBeUndefined()
    expect(user.createdAt).toBeInstanceOf(Date)
  })

  it('lowercases and unique-indexes email', async () => {
    await User.create({
      email: 'MIXED@Example.COM',
      passwordHash: 'hashed-secret',
      name: 'Mixed Case',
    })

    const found = await User.findOne({ email: 'mixed@example.com' })
    expect(found).not.toBeNull()
    expect(found!.email).toBe('mixed@example.com')

    await expect(
      User.create({
        email: 'MIXED@example.com',
        passwordHash: 'hashed-secret',
        name: 'Dup',
      }),
    ).rejects.toThrow()
  })

  it('requires email, passwordHash, and name', async () => {
    await expect(User.create({})).rejects.toThrow()
    await expect(
      User.create({ email: 'a@b.com', passwordHash: 'x' }),
    ).rejects.toThrow()
  })

  it('reports isActive correctly for deactivated accounts', async () => {
    const user = await User.create({
      email: 'deactivated@example.com',
      passwordHash: 'hashed-secret',
      name: 'Gone',
    })
    expect(user.get('isActive')).toBe(true)

    user.deactivated = true
    await user.save()
    expect(user.get('isActive')).toBe(false)
  })
})

describe('EmailToken model', () => {
  it('creates a token with purpose and expiry', async () => {
    const user = await User.create({
      email: 'token@example.com',
      passwordHash: 'hashed-secret',
      name: 'Token User',
    })
    const token = await EmailToken.create({
      userId: user._id,
      tokenHash: 'hash-value',
      purpose: 'verify-email',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    })

    expect(token.purpose).toBe('verify-email')
    expect(token.usedAt).toBeUndefined()
    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('enforces a unique tokenHash', async () => {
    await EmailToken.create({
      userId: new mongoose.Types.ObjectId(),
      tokenHash: 'duplicate-hash',
      purpose: 'password-reset',
      expiresAt: new Date(),
    })
    await expect(
      EmailToken.create({
        userId: new mongoose.Types.ObjectId(),
        tokenHash: 'duplicate-hash',
        purpose: 'verify-email',
        expiresAt: new Date(),
      }),
    ).rejects.toThrow()
  })
})

describe('AuditEntry model', () => {
  it('creates an entry with a null actor for system events', async () => {
    const entry = await AuditEntry.create({
      actorId: null,
      action: 'user.register',
      targetType: 'User',
      targetId: new mongoose.Types.ObjectId(),
    })

    expect(entry.actorId).toBeNull()
    expect(entry.action).toBe('user.register')
    expect(entry.metadata).toBeUndefined()
  })

  it('stores before/after metadata for admin changes', async () => {
    const actor = await User.create({
      email: 'admin@example.com',
      passwordHash: 'hashed-secret',
      name: 'Admin',
    })
    const target = await User.create({
      email: 'target@example.com',
      passwordHash: 'hashed-secret',
      name: 'Target',
    })

    const entry = await AuditEntry.create({
      actorId: actor._id,
      action: 'user.grant-platform-admin',
      targetType: 'User',
      targetId: target._id,
      metadata: {
        before: { platformAdmin: false },
        after: { platformAdmin: true },
      },
    })

    expect(entry.actorId!.toString()).toBe(actor._id.toString())
    expect(entry.metadata).toMatchObject({
      before: { platformAdmin: false },
      after: { platformAdmin: true },
    })
  })
})
