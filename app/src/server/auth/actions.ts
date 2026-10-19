import { genSaltSync, hashSync } from 'bcryptjs'
import mongoose from 'mongoose'
import { EmailToken, type EmailTokenDoc } from '@/models/identity/EmailToken'
import { User } from '@/models/identity/User'
import { AuditEntry } from '@/models/identity/AuditEntry'
import { emailSender, verificationUrl } from '@/lib/email'
import { generateToken, hashToken, tokenExpiry } from '@/lib/tokens'

// Auth actions: registration, email verification, password reset.
// Discriminated results, never thrown, so handlers map to HTTP statuses.
// Failures consume rate-limit attempts so probes cannot enumerate accounts.

export type AuthResult =
  | { ok: true }
  | { ok: false; code: string; message: string }

const RESULT = {
  ok: { ok: true } as AuthResult,
  fail: (code: string, message: string): AuthResult => ({ ok: false, code, message }),
}

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

async function attemptAllowed(filter: Record<string, unknown>) {
  const count = await EmailToken.countDocuments({
    ...filter,
    createdAt: { $gte: new Date(Date.now() - WINDOW_MS) },
  })
  return count < MAX_ATTEMPTS
}

type AuthAuditAction = 'user.register' | 'user.verify-email' | 'user.password-reset'

async function audit(action: AuthAuditAction, actorId: mongoose.Types.ObjectId, targetId: mongoose.Types.ObjectId) {
  await AuditEntry.create({ actorId, action, targetType: 'User', targetId })
}

async function sendVerificationEmail(userId: string, email: string) {
  // A fresh link supersedes any earlier unused ones. Records are never
  // deleted: they are the rate-limit attempt trail.
  await EmailToken.updateMany(
    { userId, purpose: 'verify-email', usedAt: null },
    { usedAt: new Date() },
  )
  const raw = generateToken()
  await EmailToken.create({
    userId,
    targetEmail: email,
    tokenHash: hashToken(raw),
    purpose: 'verify-email',
    expiresAt: tokenExpiry(),
  })
  const link = verificationUrl(raw)
  await emailSender.send({
    to: email,
    subject: 'Verify your NYSC-Hub account',
    text: `Welcome to NYSC-Hub. Verify your email: ${link}`,
    html: `<p>Welcome to NYSC-Hub.</p><p><a href="${link}">Verify your email</a></p>`,
  })
}

export async function registerUser(input: {
  email: string
  password: string
  name?: string
}): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return RESULT.fail('EMAIL_INVALID', 'Enter a valid email address.')
  }
  if (input.password.length < 8) {
    return RESULT.fail('PASSWORD_WEAK', 'Password must be at least 8 characters.')
  }

  if (!(await attemptAllowed({ purpose: 'verify-email', targetEmail: email }))) {
    return RESULT.fail('RATE_LIMITED', 'Too many attempts. Try again in 15 minutes.')
  }

  const existing = await User.findOne({ email }).lean()
  if (existing) {
    return RESULT.fail('EMAIL_TAKEN', 'An account with this email already exists.')
  }

  const name = input.name?.trim()
  const user = await User.create({
    email,
    passwordHash: hashSync(input.password, genSaltSync(10)),
    name: name && name.length > 0 ? name : email.split('@')[0],
    lifecycleStage: 'prospective',
  })

  await sendVerificationEmail(user._id.toString(), email)
  await audit('user.register', user._id, user._id)
  return RESULT.ok
}

export async function verifyEmail(token: string): Promise<AuthResult> {
  const record = await EmailToken.findOne({
    tokenHash: hashToken(token),
    purpose: 'verify-email',
    usedAt: null,
  })

  if (!record || record.expiresAt < new Date()) {
    return RESULT.fail('TOKEN_INVALID', 'This link is invalid or has expired.')
  }

  const user = await User.findById(record.userId)
  if (!user) {
    return RESULT.fail('TOKEN_INVALID', 'This link is invalid or has expired.')
  }

  user.emailVerifiedAt = new Date()
  await user.save()

  await consumeToken(record)
  await audit('user.verify-email', user._id, user._id)
  return RESULT.ok
}

export async function resendVerification(email: string): Promise<AuthResult> {
  const normalized = email.trim().toLowerCase()

  if (!(await attemptAllowed({ purpose: 'verify-email', targetEmail: normalized }))) {
    return RESULT.fail('RATE_LIMITED', 'Too many attempts. Try again in 15 minutes.')
  }

  // Always respond identically, whether or not the email exists.
  const user = await User.findOne({ email: normalized })
  if (!user || user.emailVerifiedAt) return RESULT.ok

  await sendVerificationEmail(user._id.toString(), normalized)
  return RESULT.ok
}

async function consumeToken(record: EmailTokenDoc) {
  // Mark used, never delete: the record is the rate-limit attempt trail.
  // Single-use is enforced by lookups filtering on usedAt: null.
  record.usedAt = new Date()
  await record.save()
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const normalized = email.trim().toLowerCase()

  if (!(await attemptAllowed({ purpose: 'password-reset', targetEmail: normalized }))) {
    return RESULT.fail('RATE_LIMITED', 'Too many attempts. Try again in 15 minutes.')
  }

  // Always ok, never reveal whether the email has an account.
  const user = await User.findOne({ email: normalized })
  if (!user) return RESULT.ok

  // A fresh link supersedes any earlier unused ones (single active link).
  await EmailToken.updateMany(
    { userId: user._id, purpose: 'password-reset', usedAt: null },
    { usedAt: new Date() },
  )
  const raw = generateToken()
  await EmailToken.create({
    userId: user._id,
    targetEmail: normalized,
    tokenHash: hashToken(raw),
    purpose: 'password-reset',
    expiresAt: tokenExpiry(),
  })
  const link = verificationUrl(raw)
  await emailSender.send({
    to: normalized,
    subject: 'Reset your NYSC-Hub password',
    text: `Reset your password: ${link}`,
    html: `<p><a href="${link}">Reset your password</a></p>`,
  })
  return RESULT.ok
}

export async function resetPassword(token: string, newPassword: string): Promise<AuthResult> {
  if (newPassword.length < 8) {
    return RESULT.fail('PASSWORD_WEAK', 'Password must be at least 8 characters.')
  }

  const record = await EmailToken.findOne({
    tokenHash: hashToken(token),
    purpose: 'password-reset',
    usedAt: null,
  })

  if (!record || record.expiresAt < new Date()) {
    return RESULT.fail('TOKEN_INVALID', 'This link is invalid or has expired.')
  }

  const user = await User.findById(record.userId)
  if (!user || user.deactivated) {
    return RESULT.fail('TOKEN_INVALID', 'This link is invalid or has expired.')
  }

  user.passwordHash = hashSync(newPassword, genSaltSync(10))
  await user.save()

  await consumeToken(record)
  await audit('user.password-reset', user._id, user._id)
  return RESULT.ok
}
