import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest'
import { connectTestDb, clearTestDb, disconnectTestDb } from '../db'
import { registerUser, verifyEmail } from '@/server/auth/actions'
import { User, type UserDoc } from '@/models/identity/User'
import { AuditEntry } from '@/models/identity/AuditEntry'
import {
  recordFailedLogin,
  isLoginLocked,
  remainingAttempts,
  clearFailedLogins,
  LOCKOUT,
} from '@/lib/rate-limit'
import { withAudit, writeAudit } from '@/lib/audit'

// Guards import @/lib/auth, which pulls next/server — unresolvable under
// vitest. Mock the auth() entry point so the matrix tests what the guards
// DO with a given session, not next-auth's internals.
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))
import { auth } from '@/lib/auth'
const mockedAuth = vi.mocked(auth)

let consoleLog: ReturnType<typeof vi.spyOn> | null = null

beforeAll(async () => {
  await connectTestDb()
}, 120_000)

beforeEach(() => {
  consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
  mockedAuth.mockReset()
})

afterEach(async () => {
  await clearTestDb()
  vi.restoreAllMocks()
})

afterAll(async () => {
  await disconnectTestDb()
})

/** Register + verify a user, optionally with role/status overrides. */
async function makeUser(email: string, opts: { admin?: boolean; deactivated?: boolean } = {}) {
  await registerUser({ email, password: 'password123', name: 'Matrix User' })
  const token = (consoleLog ? consoleLog.mock.calls : [])
    .map((c: unknown[]) => String(c[0] ?? ''))
    .join('\n')
    .match(/token=([A-Za-z0-9_-]+)/g)
    ?.pop()
    ?.replace('token=', '')
  if (!token) throw new Error('no token in log for ' + email)
  await verifyEmail(token)

  const user = await User.findOne({ email })
  if (!user) throw new Error('no user for ' + email)

  if (opts.admin) user.platformAdmin = true
  if (opts.deactivated) user.deactivated = true
  if (opts.admin || opts.deactivated) await user.save()
  return user
}

/** Point the mocked auth() at a user's session. */
function setSessionUser(user: UserDoc | null) {
  const impl = async () =>
    user
      ? ({ user: { id: user._id.toString(), email: user.email, name: user.name } })
      : null
  // auth() is also overloaded as NextMiddleware; cast through unknown to satisfy TS.
  mockedAuth.mockImplementation(impl as unknown as typeof mockedAuth)
}

// --- rate limit --------------------------------------------------------------
describe('login lockout', () => {
  it('locks on the 5th failure within 15 minutes', async () => {
    for (let i = 0; i < 4; i++) {
      await recordFailedLogin('lockme@example.com')
      expect(await isLoginLocked('lockme@example.com')).toBe(false)
    }
    await recordFailedLogin('lockme@example.com')
    expect(await isLoginLocked('lockme@example.com')).toBe(true)
  })

  it('reports a shrinking attempt budget', async () => {
    expect(await remainingAttempts('budget@example.com')).toBe(5)
    await recordFailedLogin('budget@example.com')
    expect(await remainingAttempts('budget@example.com')).toBe(4)
  })

  it('clears failures after a successful login', async () => {
    await recordFailedLogin('good@example.com')
    await recordFailedLogin('good@example.com')
    await clearFailedLogins('good@example.com')
    expect(await isLoginLocked('good@example.com')).toBe(false)
    expect(await remainingAttempts('good@example.com')).toBe(5)
  })

  it('exports the spec constants', () => {
    expect(LOCKOUT.MAX_FAILURES).toBe(5)
    expect(LOCKOUT.COUNT_WINDOW_MS).toBe(15 * 60 * 1000)
    expect(LOCKOUT.LOCK_MS).toBe(10 * 60 * 1000)
  })

  it('treats unknown emails identically (no enumeration)', async () => {
    for (let i = 0; i < 5; i++) await recordFailedLogin('ghost@example.com')
    expect(await isLoginLocked('ghost@example.com')).toBe(true)
  })
})

// --- audit -------------------------------------------------------------------
describe('audit service', () => {
  it('writes a single entry', async () => {
    const user = await makeUser('audited@example.com')
    // makeUser already wrote user.register + user.verify-email entries.
    await writeAudit({
      actorId: user._id,
      action: 'user.deactivate',
      targetType: 'User',
      targetId: user._id,
    })
    const entries = await AuditEntry.find({
      targetId: user._id,
      action: 'user.deactivate',
    })
    expect(entries).toHaveLength(1)
    expect(entries?.[0]?.actorId?.toString()).toBe(user._id.toString())
  })

  it('withAudit runs the mutation and records the action', async () => {
    const actor = await makeUser('actor@example.com')
    const target = await makeUser('target@example.com')

    const outcome = await withAudit({
      actorId: actor._id,
      action: 'user.grant-platform-admin',
      targetType: 'User',
      targetId: target._id,
      mutation: async () => {
        target.platformAdmin = true
        await target.save()
        return target.platformAdmin
      },
    })

    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.result).toBe(true)
    const entries = await AuditEntry.find({
      targetId: target._id,
      action: 'user.grant-platform-admin',
    })
    expect(entries).toHaveLength(1)
    expect(entries?.[0]?.actorId?.toString()).toBe(actor._id.toString())
  })

  it('withAudit surfaces mutation failure and does not audit', async () => {
    const actor = await makeUser('actor2@example.com')
    const target = await makeUser('target2@example.com')

    const outcome = await withAudit({
      actorId: actor._id,
      action: 'user.deactivate',
      targetType: 'User',
      targetId: target._id,
      mutation: async () => {
        throw new Error('db exploded')
      },
    })

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toContain('db exploded')
    const entries = await AuditEntry.find({
      targetId: target._id,
      action: 'user.deactivate',
    })
    expect(entries).toHaveLength(0)
  })

  it('withAudit reports whether the write was atomic', async () => {
    const actor = await makeUser('actor3@example.com')
    const target = await makeUser('target3@example.com')

    const outcome = await withAudit({
      actorId: actor._id,
      action: 'user.deactivate',
      targetType: 'User',
      targetId: target._id,
      mutation: async () => 'done',
    })

    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      // mongodb-memory-server standalone has no replica set → sequential.
      // Atlas (replica set) will flip this to true; both are acceptable,
      // the point is the caller is told which it got.
      expect(typeof outcome.atomic).toBe('boolean')
    }
  })
})

// --- guard matrix ------------------------------------------------------------
describe('guard matrix', () => {
  it('rejects an anonymous user with 401', async () => {
    setSessionUser(null)
    const { requireUser, requirePlatformAdmin } = await import('@/lib/auth-guards')

    const u = await requireUser()
    expect(u.ok).toBe(false)
    if (!u.ok) expect(u.status).toBe(401)

    const a = await requirePlatformAdmin()
    expect(a.ok).toBe(false)
    if (!a.ok) expect(a.status).toBe(401)
  })

  it('admits a verified user via requireUser', async () => {
    const user = await makeUser('plain@example.com')
    setSessionUser(user)
    const { requireUser } = await import('@/lib/auth-guards')

    const u = await requireUser()
    expect(u.ok).toBe(true)
    if (u.ok) expect(u.user._id.toString()).toBe(user._id.toString())
  })

  it('denies a non-admin via requirePlatformAdmin with 403 + audit', async () => {
    const user = await makeUser('notadmin@example.com')
    setSessionUser(user)
    const { requirePlatformAdmin } = await import('@/lib/auth-guards')

    const a = await requirePlatformAdmin()
    expect(a.ok).toBe(false)
    if (!a.ok) expect(a.status).toBe(403)

    // SPEC: non-admin hitting an admin route gets 403 plus an AuditEntry.
    const denied = await AuditEntry.find({
      actorId: user._id,
      action: 'admin.access-denied',
    })
    expect(denied).toHaveLength(1)
    expect(denied![0].targetType).toBe('User')
  })

  it('admits a platform admin via requirePlatformAdmin', async () => {
    const user = await makeUser('theadmin@example.com', { admin: true })
    setSessionUser(user)
    const { requirePlatformAdmin } = await import('@/lib/auth-guards')

    const a = await requirePlatformAdmin()
    expect(a.ok).toBe(true)
    if (a.ok) expect(a.user.platformAdmin).toBe(true)
  })

  it('rejects a deactivated user despite a live session', async () => {
    const user = await makeUser('gone@example.com', { deactivated: true })
    setSessionUser(user)
    const { requireUser } = await import('@/lib/auth-guards')

    // Deactivated users are null in getCurrentUser — role/status re-read
    // from the DB at check time, not trusted from the session.
    const u = await requireUser()
    expect(u.ok).toBe(false)
    if (!u.ok) expect(u.status).toBe(401)
  })

  it('requireSelfOrPlatformAdmin allows self and admin, blocks others', async () => {
    const owner = await makeUser('owner@example.com')
    const other = await makeUser('other@example.com')
    const admin = await makeUser('root@example.com', { admin: true })
    const { requireSelfOrPlatformAdmin } = await import('@/lib/auth-guards')

    setSessionUser(owner)
    const self = await requireSelfOrPlatformAdmin(owner._id)
    expect(self.ok).toBe(true)

    setSessionUser(other)
    const stranger = await requireSelfOrPlatformAdmin(owner._id)
    expect(stranger.ok).toBe(false)
    if (!stranger.ok) expect(stranger.status).toBe(403)

    setSessionUser(admin)
    const asAdmin = await requireSelfOrPlatformAdmin(owner._id)
    expect(asAdmin.ok).toBe(true)
  })
})
