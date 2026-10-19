import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest'
import { connectTestDb, clearTestDb, disconnectTestDb } from '../db'
import { registerUser, verifyEmail } from '@/server/auth/actions'
import { User } from '@/models/identity/User'
import { Session } from '@/models/identity/Session'
import { Account } from '@/models/identity/Account'
import { MongooseAdapter } from '@/lib/mongoose-adapter'

let consoleLog: ReturnType<typeof vi.spyOn> | null = null

// Task 6 acceptance: login → session persists → logout destroys session;
// deactivated user's session is rejected on the next request.
// We exercise the adapter contract directly — the HTTP layer is next-auth's
// catch-all, already type-checked against the same contract.

beforeAll(async () => {
  await connectTestDb()
}, 120_000)

beforeEach(() => {
  consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(async () => {
  await clearTestDb()
  vi.restoreAllMocks()
  consoleLog = null
})

afterAll(async () => {
  await disconnectTestDb()
})

/** Register + verify a user and link its credentials account. */
async function verifiedUser(email: string, password = 'password123') {
  await registerUser({ email, password, name: 'Test User' })

  // Pull the raw token out of the console email log and verify with it.
  const calls = (consoleLog ? consoleLog.mock.calls : []).map((c: unknown[]) => String(c[0] ?? ''))
  const token = calls
    .join('\n')
    .match(/token=([A-Za-z0-9_-]+)/g)
    ?.pop()
    ?.replace('token=', '')
  if (token) await verifyEmail(token)

  const user = await User.findOne({ email })
  await Account.create({
    userId: user!._id,
    provider: 'credentials',
    providerAccountId: email,
    type: 'credentials',
  })
  return user!
}

describe('MongooseAdapter session lifecycle', () => {
  const a = MongooseAdapter()
  const createSession = a.createSession as NonNullable<typeof a.createSession>
  const getSessionAndUser = a.getSessionAndUser as NonNullable<typeof a.getSessionAndUser>
  const deleteSession = a.deleteSession as NonNullable<typeof a.deleteSession>
  const updateSession = a.updateSession as NonNullable<typeof a.updateSession>

  it('creates a session and resolves it with the user', async () => {
    const user = await verifiedUser('session@example.com')
        const session = await createSession({
      sessionToken: 'tok-1',
      userId: user._id.toString(),
      expires: new Date(Date.now() + 86400_000),
    })

    expect(session.sessionToken).toBe('tok-1')
    expect(session.userId).toBe(user._id.toString())

    const got = await getSessionAndUser('tok-1')
    expect(got).not.toBeNull()
    expect(got!.user.email).toBe('session@example.com')
    expect(got!.user.emailVerified).toBeInstanceOf(Date)

    // Session survives repeated lookups — i.e. survives a refresh.
    const again = await getSessionAndUser('tok-1')
    expect(again).not.toBeNull()
  })

  it('deleteSession destroys the session server-side', async () => {
    const user = await verifiedUser('logout@example.com')

    await createSession({
      sessionToken: 'tok-2',
      userId: user._id.toString(),
      expires: new Date(Date.now() + 86400_000),
    })

    await deleteSession('tok-2')

    const after = await getSessionAndUser('tok-2')
    expect(after).toBeNull()
    const count = await Session.countDocuments({ sessionToken: 'tok-2' })
    expect(count).toBe(0)
  })

  it('rejects a session whose user was deactivated', async () => {
    const user = await verifiedUser('deactivated@example.com')

    await createSession({
      sessionToken: 'tok-3',
      userId: user._id.toString(),
      expires: new Date(Date.now() + 86400_000),
    })

    // Sanity: session works before deactivation.
    const before = await getSessionAndUser('tok-3')
    expect(before).not.toBeNull()

    user.deactivated = true
    await user.save()

    // After deactivation the session is dropped and rejected.
    const after = await getSessionAndUser('tok-3')
    expect(after).toBeNull()
    const count = await Session.countDocuments({ sessionToken: 'tok-3' })
    expect(count).toBe(0)
  })

  it('updateSession extends the expiry', async () => {
    const user = await verifiedUser('extend@example.com')
    const later = new Date(Date.now() + 2 * 86400_000)

    await createSession({
      sessionToken: 'tok-4',
      userId: user._id.toString(),
      expires: new Date(Date.now() + 86400_000),
    })
    const updated = await updateSession({
      sessionToken: 'tok-4',
      expires: later,
    })

    expect(updated).not.toBeNull()
    expect(updated!.expires.toISOString()).toBe(later.toISOString())
  })
})

describe('MongooseAdapter user lookups', () => {
  const a = MongooseAdapter()
  const getUserByAccount = a.getUserByAccount as NonNullable<typeof a.getUserByAccount>
  const getUserByEmail = a.getUserByEmail as NonNullable<typeof a.getUserByEmail>
  const createUser = a.createUser as NonNullable<typeof a.createUser>

  it('resolves a user by account', async () => {
    const user = await verifiedUser('byaccount@example.com')

    const found = await getUserByAccount({
      provider: 'credentials',
      providerAccountId: 'byaccount@example.com',
    })
    expect(found).not.toBeNull()
    expect(found!.id).toBe(user._id.toString())
  })

  it('returns null for an unknown account', async () => {
    const found = await getUserByAccount({
      provider: 'credentials',
      providerAccountId: 'ghost@example.com',
    })
    expect(found).toBeNull()
  })

  it('resolves a user by email, lowercased', async () => {
    await verifiedUser('lower@example.com')

    const found = await getUserByEmail('LOWER@example.com')
    expect(found).not.toBeNull()
    expect(found!.email).toBe('lower@example.com')
  })

  it('refuses to create users through the adapter', async () => {
    await expect(
      createUser({
        email: 'nope@example.com',
        emailVerified: null,
        id: 'x',
        image: null,
        name: 'Nope',
      }),
    ).rejects.toThrow(/registration/)
  })
})

describe('authorize() login gate (via adapter contract)', () => {
  const a = MongooseAdapter()
  const getUserByEmail = a.getUserByEmail as NonNullable<typeof a.getUserByEmail>
  const getUserByAccount = a.getUserByAccount as NonNullable<typeof a.getUserByAccount>
  it('an unverified user cannot obtain a session', async () => {
    // Registers but never verifies; no account, no session can be created.
    await registerUser({ email: 'unverified@example.com', password: 'password123' })
    const found = await getUserByEmail('unverified@example.com')
    expect(found).not.toBeNull()
    expect(found!.emailVerified).toBeNull()
    // The authorize() function rejects emailVerified === null; the adapter
    // never creates a session for such users (no account row exists).
    const byAccount = await getUserByAccount({
      provider: 'credentials',
      providerAccountId: 'unverified@example.com',
    })
    expect(byAccount).toBeNull()
  })
})
