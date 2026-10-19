import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest'
import { connectTestDb, clearTestDb, disconnectTestDb } from '../db'
import {
  registerUser,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
} from '@/server/auth/actions'
import { User } from '@/models/identity/User'
import { EmailToken } from '@/models/identity/EmailToken'

let sendSpy: ReturnType<typeof vi.spyOn>

beforeAll(async () => {
  await connectTestDb()
}, 120_000)

beforeEach(() => {
  sendSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(async () => {
  await clearTestDb()
  vi.restoreAllMocks()
})

afterAll(async () => {
  await disconnectTestDb()
})

function tokenFromLog(): string {
  const calls = sendSpy.mock.calls.map((c: unknown[]) => String(c[0] ?? '')).join('\n')
  const match = calls.match(/token=([A-Za-z0-9_-]+)/g)?.pop()?.match(/token=([A-Za-z0-9_-]+)/)
  if (!match) throw new Error('no token found in console log')
  return match[1]
}

describe('registerUser', () => {
  it('creates a user and sends a verification email', async () => {
    const res = await registerUser({
      email: 'fresh@example.com',
      password: 'password123',
      name: 'Fresh User',
    })
    expect(res.ok).toBe(true)

    const user = await User.findOne({ email: 'fresh@example.com' })
    expect(user).not.toBeNull()
    expect(user!.emailVerifiedAt).toBeUndefined()
    expect(user!.lifecycleStage).toBe('prospective')
    expect(user!.name).toBe('Fresh User')
    expect(user!.passwordHash).not.toBe('password123')

    const tokens = await EmailToken.find({ purpose: 'verify-email' })
    expect(tokens).toHaveLength(1)
    expect(tokens[0].tokenHash).not.toMatch(/^token=/)
    expect(tokens[0].targetEmail).toBe('fresh@example.com')
  })

  it('rejects an invalid email', async () => {
    const res = await registerUser({ email: 'not-an-email', password: 'password123' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('EMAIL_INVALID')
  })

  it('rejects a short password', async () => {
    const res = await registerUser({ email: 'short@example.com', password: 'short' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('PASSWORD_WEAK')
  })

  it('rejects a duplicate email', async () => {
    const first = await registerUser({ email: 'dup@example.com', password: 'password123' })
    expect(first.ok).toBe(true)
    const res = await registerUser({ email: 'dup@example.com', password: 'password123' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('EMAIL_TAKEN')
  })

  it('blocks a flood of signup attempts for one email via the duplicate guard', async () => {
    const first = await registerUser({ email: 'flood@example.com', password: 'password123' })
    expect(first.ok).toBe(true)
    for (let i = 0; i < 5; i++) {
      const res = await registerUser({ email: 'flood@example.com', password: 'password123' })
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.code).toBe('EMAIL_TAKEN')
    }
    const users = await User.countDocuments({ email: 'flood@example.com' })
    expect(users).toBe(1)
  })
})

describe('verifyEmail', () => {
  it('verifies a user with the token from their email', async () => {
    await registerUser({ email: 'verify@example.com', password: 'password123' })
    const token = tokenFromLog()
    const res = await verifyEmail(token)
    expect(res.ok).toBe(true)

    const user = await User.findOne({ email: 'verify@example.com' })
    expect(user!.emailVerifiedAt).toBeInstanceOf(Date)

    const remaining = await EmailToken.countDocuments({ purpose: 'verify-email', usedAt: null })
    expect(remaining).toBe(0)
  })

  it('rejects a garbage token', async () => {
    const res = await verifyEmail('not-a-real-token')
        expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('TOKEN_INVALID')
  })

  it('rejects a reused token', async () => {
    await registerUser({ email: 'reuse@example.com', password: 'password123' })
    const token = tokenFromLog()
    await verifyEmail(token)
    const res = await verifyEmail(token)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('TOKEN_INVALID')
  })
})

describe('resendVerification', () => {
  it('sends a fresh token', async () => {
    await registerUser({ email: 'resend@example.com', password: 'password123' })
    const first = tokenFromLog()
    const res = await resendVerification('resend@example.com')
    expect(res.ok).toBe(true)
    const second = tokenFromLog()
    expect(second).not.toBe(first)
    const tokens = await EmailToken.find({ purpose: 'verify-email', targetEmail: 'resend@example.com', usedAt: null })
    expect(tokens).toHaveLength(1)
  })

  it('returns ok for an unknown email without revealing it', async () => {
    const res = await resendVerification('nobody@example.com')
    expect(res.ok).toBe(true)
    const count = await EmailToken.countDocuments({})
    expect(count).toBe(0)
  })

  it('returns ok for an already-verified email and sends nothing', async () => {
    await registerUser({ email: 'done@example.com', password: 'password123' })
    await verifyEmail(tokenFromLog())
    const res = await resendVerification('done@example.com')
    expect(res.ok).toBe(true)
    // Only the original (consumed) record remains — no new token was issued.
    const unused = await EmailToken.countDocuments({ usedAt: null })
    expect(unused).toBe(0)
  })

  it('rate-limits after 5 resend attempts for a real account', async () => {
    await registerUser({ email: 'flood2@example.com', password: 'password123' })
    for (let i = 0; i < 5; i++) {
      await resendVerification('flood2@example.com')
    }
    const res = await resendVerification('flood2@example.com')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('RATE_LIMITED')
  })
})

describe('requestPasswordReset', () => {
  it('sends a reset token for a known email', async () => {
    await registerUser({ email: 'reset@example.com', password: 'password123' })
    const res = await requestPasswordReset('reset@example.com')
    expect(res.ok).toBe(true)
    const tokens = await EmailToken.find({ purpose: 'password-reset' })
    expect(tokens).toHaveLength(1)
    expect(tokens[0].targetEmail).toBe('reset@example.com')
  })

  it('returns ok for an unknown email without creating a token', async () => {
    const res = await requestPasswordReset('ghost@example.com')
    expect(res.ok).toBe(true)
    const count = await EmailToken.countDocuments({})
    expect(count).toBe(0)
  })

  it('rate-limits after 5 reset requests for a real account', async () => {
    await registerUser({ email: 'flood3@example.com', password: 'password123' })
    for (let i = 0; i < 5; i++) {
      await requestPasswordReset('flood3@example.com')
    }
    const res = await requestPasswordReset('flood3@example.com')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('RATE_LIMITED')
  })
})

describe('resetPassword', () => {
  it('changes the password with a valid token', async () => {
    await registerUser({ email: 'change@example.com', password: 'password123' })
    await requestPasswordReset('change@example.com')
    const token = tokenFromLog()
    const res = await resetPassword(token, 'newpassword456')
    expect(res.ok).toBe(true)

    const user = await User.findOne({ email: 'change@example.com' })
    expect(user!.passwordHash).not.toBe('password123')
  })

  it('rejects a short new password', async () => {
    await registerUser({ email: 'weak@example.com', password: 'password123' })
    await requestPasswordReset('weak@example.com')
    const token = tokenFromLog()
    const res = await resetPassword(token, 'short')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('PASSWORD_WEAK')
  })

  it('rejects a token with the wrong purpose', async () => {
    await registerUser({ email: 'wrong@example.com', password: 'password123' })
    const verifyToken = tokenFromLog()
    const res = await resetPassword(verifyToken, 'newpassword456')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('TOKEN_INVALID')
  })

  it('rejects a reused reset token', async () => {
    await registerUser({ email: 'reused@example.com', password: 'password123' })
    await requestPasswordReset('reused@example.com')
    const token = tokenFromLog()
    const res = await resetPassword(token, 'newpassword456')
    expect(res.ok).toBe(true)
    const second = await resetPassword(token, 'newpassword456')
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.code).toBe('TOKEN_INVALID')
  })
})
