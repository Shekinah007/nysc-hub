/**
 * Claim flow tests (Task 14, SPEC-camps.md):
 *   - unverified email → 403 EMAIL_NOT_VERIFIED
 *   - short/long message → 400
 *   - unknown camp → 404
 *   - pending request appears in the review queue
 *   - approve → CampAdmin grant + camp status 'claimed' + audit
 *   - deny → no grant, request 'denied', audit recorded
 *   - re-request after denial resets to pending
 *   - revoke → grant revoked, camp returns to 'community' on last grant
 *   - duplicate approve is idempotent
 *
 * Guards import @/lib/auth → next/server, which vitest cannot resolve; mock
 * auth() the same way tests/identity/guards.test.ts does. registerUser does
 * not return the verification token, so it is scraped from the console
 * sender the same way tests/identity/actions.test.ts does it.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest'
import { connectTestDb, clearTestDb, disconnectTestDb } from '../db'
import { registerUser, verifyEmail } from '@/server/auth/actions'
import { User, type UserDoc } from '@/models/identity/User'
import { AuditEntry } from '@/models/identity/AuditEntry'
import { Camp } from '@/models/camps/Camp'
import { CampAdmin } from '@/models/camps/CampAdmin'
import { CampClaimRequest } from '@/models/camps/CampClaimRequest'
import { seedCamps } from '../../scripts/seed-camps'
import {
  requestClaim,
  approveClaimRequest,
  denyClaimRequest,
  listPendingClaimRequests,
  revokeCampAdmin,
} from '@/server/camps/claims'

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

/**
 * Register + verify a user, then return the persisted doc. The
 * verification token is scraped from the console email sender (the dev
 * sender logs the verification URL) — the established pattern in
 * tests/identity/actions.test.ts.
 */
async function makeVerifiedUser(email: string): Promise<UserDoc> {
  const result = await registerUser({ email, password: 'Password123!', name: 'Test Corper' })
  expect(result.ok).toBe(true)

  const calls = consoleLog?.mock.calls.map((c: unknown[]) => String(c[0] ?? '')).join('\n') ?? ''
  const match = calls.match(/token=([A-Za-z0-9_-]+)/g)?.pop()?.match(/token=([A-Za-z0-9_-]+)/)
  if (!match) throw new Error('no verification token found for ' + email)
  await verifyEmail(match[1])

  const user = await User.findOne({ email })
  if (!user) throw new Error('user not created')
  expect(user.emailVerifiedAt).toBeTruthy()
  return user
}

/** Register but never verify — the claim gate must reject this. */
async function makeUnverifiedUser(email: string): Promise<UserDoc> {
  const result = await registerUser({ email, password: 'Password123!', name: 'Unverified' })
  expect(result.ok).toBe(true)
  const user = await User.findOne({ email })
  if (!user) throw new Error('user not created')
  return user
}

/** Seed camps and grab one. */
async function grabCamp(slug = 'lagos') {
  await seedCamps()
  const camp = await Camp.findOne({ slug })
  if (!camp) throw new Error('camp not found')
  return camp
}

/** Approve a request as a freshly promoted admin; returns the result. */
async function approveAs(requestId: string, adminEmail: string) {
  const reviewer = await makeVerifiedUser(adminEmail)
  await User.findByIdAndUpdate(reviewer._id, { platformAdmin: true })
  return approveClaimRequest({ requestId, reviewer })
}

describe('claim requests — submission gates', () => {
  it('rejects an unverified email with 403', async () => {
    const camp = await grabCamp()
    const user = await makeUnverifiedUser('unverified@example.com')

    const result = await requestClaim({
      campId: camp._id,
      requester: user,
      message: 'I am on the OBS crew and would run this well.',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(403)
      expect(result.code).toBe('EMAIL_NOT_VERIFIED')
    }
  })

  it('rejects a message shorter than 10 characters (boundary)', async () => {
    const camp = await grabCamp()
    const user = await makeVerifiedUser('verified@example.com')

    const result = await requestClaim({
      campId: camp._id,
      requester: user,
      message: 'too short',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(400)
      expect(result.code).toBe('MESSAGE_TOO_SHORT')
    }
  })

  it('rejects a message over 1000 characters', async () => {
    const camp = await grabCamp()
    const user = await makeVerifiedUser('long@example.com')

    const result = await requestClaim({
      campId: camp._id,
      requester: user,
      message: 'x'.repeat(1001),
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(400)
      expect(result.code).toBe('MESSAGE_TOO_LONG')
    }
  })

  it('returns 404 for an unknown camp', async () => {
    const user = await makeVerifiedUser('unknown@example.com')

    const result = await requestClaim({
      campId: '64b7f1f1f1f1f1f1f1f1f1f1',
      requester: user,
      message: 'A perfectly valid message length.',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(404)
      expect(result.code).toBe('CAMP_NOT_FOUND')
    }
  })
})

describe('claim requests — review queue', () => {
  it('lists pending requests with camp and requester context', async () => {
    const camp = await grabCamp()
    const user = await makeVerifiedUser('queue@example.com')

    const submitted = await requestClaim({
      campId: camp._id,
      requester: user,
      message: 'I am on the editorial crew of this camp.',
    })
    expect(submitted.ok).toBe(true)

    const pending = await listPendingClaimRequests()
    expect(pending).toHaveLength(1)
    expect(pending[0].camp.slug).toBe('lagos')
    expect(pending[0].requester.email).toBe('queue@example.com')
    expect(pending[0].message).toContain('editorial')
  })

  it('writes a camp.claim-request audit entry on submission', async () => {
    const camp = await grabCamp()
    const user = await makeVerifiedUser('audit@example.com')

    await requestClaim({
      campId: camp._id,
      requester: user,
      message: 'Running the OBS department here.',
    })

    const entries = await AuditEntry.find({ action: 'camp.claim-request' })
    expect(entries.length).toBeGreaterThanOrEqual(1)
    expect(entries[0]?.targetType).toBe('Camp')
  })
})

describe('claim approval', () => {
  it('grants a CampAdmin, flips the camp to claimed, and audits', async () => {
    const camp = await grabCamp()
    const user = await makeVerifiedUser('approve@example.com')

    const submitted = await requestClaim({
      campId: camp._id,
      requester: user,
      message: 'I run the drama and culture crew.',
    })
    expect(submitted.ok).toBe(true)

    const requestId = (submitted as { data: { requestId: string } }).data.requestId
    const result = await approveAs(requestId, 'reviewer@example.com')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.campStatus).toBe('claimed')
    }

    // The grant exists and is active.
    const grant = await CampAdmin.findOne({ campId: camp._id, revokedAt: null })
    expect(grant).toBeTruthy()
    expect(grant?.scope).toBe('camp')

    // Camp status persisted.
    const updated = await Camp.findById(camp._id)
    expect(updated?.status).toBe('claimed')

    // Audit entries for the approve.
    const entries = await AuditEntry.find({
      action: { $in: ['camp.claim-approve', 'camp.admin-grant'] },
    })
    expect(entries.length).toBeGreaterThanOrEqual(1)
  })

  it('is idempotent when approving the same request twice', async () => {
    const camp = await grabCamp()
    const user = await makeVerifiedUser('twice@example.com')

    const submitted = await requestClaim({
      campId: camp._id,
      requester: user,
      message: 'I am the camp sport secretary.',
    })
    const requestId = (submitted as { data: { requestId: string } }).data.requestId

    const first = await approveAs(requestId, 'reviewer2@example.com')
    const second = await approveAs(requestId, 'reviewer3@example.com')

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)

    // Still exactly one active grant, not two.
    const grants = await CampAdmin.find({ campId: camp._id, revokedAt: null })
    expect(grants).toHaveLength(1)
  })

  it('refuses to approve a denied request', async () => {
    const camp = await grabCamp()
    const user = await makeVerifiedUser('denied@example.com')

    const submitted = await requestClaim({
      campId: camp._id,
      requester: user,
      message: 'Please let me run this workspace.',
    })
    const requestId = (submitted as { data: { requestId: string } }).data.requestId

    const reviewer = await makeVerifiedUser('reviewer4@example.com')
    await User.findByIdAndUpdate(reviewer._id, { platformAdmin: true })
    const denied = await denyClaimRequest({ requestId, reviewer })
    expect(denied.ok).toBe(true)

    const result = await approveAs(requestId, 'reviewer5@example.com')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(409)
      expect(result.code).toBe('REQUEST_ALREADY_DENIED')
    }
  })
})

describe('claim denial', () => {
  it('records the denial without granting anything', async () => {
    const camp = await grabCamp()
    const user = await makeVerifiedUser('denyflow@example.com')

    const submitted = await requestClaim({
      campId: camp._id,
      requester: user,
      message: 'I would like to manage the camp boards.',
    })
    const requestId = (submitted as { data: { requestId: string } }).data.requestId

    const reviewer = await makeVerifiedUser('reviewer6@example.com')
    await User.findByIdAndUpdate(reviewer._id, { platformAdmin: true })
    const result = await denyClaimRequest({ requestId, reviewer, reviewNote: 'Not enough detail' })
    expect(result.ok).toBe(true)

    // No grant was ever created.
    const grants = await CampAdmin.find({ campId: camp._id })
    expect(grants).toHaveLength(0)

    // Camp untouched.
    const campAfter = await Camp.findById(camp._id)
    expect(campAfter?.status).toBe('community')

    // Denial audited and the note recorded.
    const entries = await AuditEntry.find({ action: 'camp.claim-deny' })
    expect(entries).toHaveLength(1)

    const request = await CampClaimRequest.findById(requestId)
    expect(request?.status).toBe('denied')
    expect(request?.reviewNote).toBe('Not enough detail')
  })

  it('refuses to deny a request that is not pending', async () => {
    const camp = await grabCamp()
    const user = await makeVerifiedUser('double@example.com')

    const submitted = await requestClaim({
      campId: camp._id,
      requester: user,
      message: 'Another attempt at the claim.',
    })
    const requestId = (submitted as { data: { requestId: string } }).data.requestId

    const reviewer = await makeVerifiedUser('reviewer7@example.com')
    await User.findByIdAndUpdate(reviewer._id, { platformAdmin: true })
    const first = await denyClaimRequest({ requestId, reviewer })
    expect(first.ok).toBe(true)

    const second = await denyClaimRequest({ requestId, reviewer })
    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.status).toBe(409)
      expect(second.code).toBe('REQUEST_NOT_PENDING')
    }
  })
})

describe('grant revocation', () => {
  it('revokes the grant and returns the camp to community', async () => {
    const camp = await grabCamp()
    const user = await makeVerifiedUser('revoke@example.com')

    const submitted = await requestClaim({
      campId: camp._id,
      requester: user,
      message: 'Temporarily running this workspace.',
    })
    const requestId = (submitted as { data: { requestId: string } }).data.requestId

    const approved = await approveAs(requestId, 'reviewer8@example.com')
    expect(approved.ok).toBe(true)
    const grantId = (approved as { data: { grantId: string } }).data.grantId

    const reviewer = await User.findOne({ email: 'reviewer8@example.com' })
    if (!reviewer) throw new Error('reviewer missing')
    const result = await revokeCampAdmin({ grantId, reviewer })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.campStatus).toBe('community')
    }

    const grant = await CampAdmin.findById(grantId)
    expect(grant?.revokedAt).toBeTruthy()

    const campAfter = await Camp.findById(camp._id)
    expect(campAfter?.status).toBe('community')

    const entries = await AuditEntry.find({ action: 'camp.admin-revoke' })
    expect(entries).toHaveLength(1)
  })

  it('refuses to revoke an already-revoked grant', async () => {
    const camp = await grabCamp()
    const user = await makeVerifiedUser('again@example.com')

    const submitted = await requestClaim({
      campId: camp._id,
      requester: user,
      message: 'Will run the workspace for a while.',
    })
    const requestId = (submitted as { data: { requestId: string } }).data.requestId

    const approved = await approveAs(requestId, 'reviewer9@example.com')
    const grantId = (approved as { data: { grantId: string } }).data.grantId

    const reviewer = await User.findOne({ email: 'reviewer9@example.com' })
    if (!reviewer) throw new Error('reviewer missing')
    await revokeCampAdmin({ grantId, reviewer })
    const second = await revokeCampAdmin({ grantId, reviewer })

    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.status).toBe(409)
      expect(second.code).toBe('ALREADY_REVOKED')
    }
  })
})

describe('re-request after denial', () => {
  it('resets a denied request back to pending', async () => {
    const camp = await grabCamp()
    const user = await makeVerifiedUser('retry@example.com')

    const first = await requestClaim({
      campId: camp._id,
      requester: user,
      message: 'First attempt at claiming the camp.',
    })
    expect(first.ok).toBe(true)
    const requestId = (first as { data: { requestId: string } }).data.requestId

    const reviewer = await makeVerifiedUser('reviewer10@example.com')
    await User.findByIdAndUpdate(reviewer._id, { platformAdmin: true })
    await denyClaimRequest({ requestId, reviewer })

    // Re-request resets to pending instead of erroring.
    const again = await requestClaim({
      campId: camp._id,
      requester: user,
      message: 'Second attempt with more detail this time.',
    })
    expect(again.ok).toBe(true)

    const pending = await listPendingClaimRequests()
    expect(pending).toHaveLength(1)
    expect(pending[0].message).toContain('Second attempt')

    // One request record, not two (unique (camp, requester)).
    const requests = await CampClaimRequest.find({ campId: camp._id, requesterId: user._id })
    expect(requests).toHaveLength(1)
  })
})
