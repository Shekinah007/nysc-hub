import { FailedLogin } from '@/models/identity/FailedLogin'

/**
 * Mongo-backed login rate limit (SPEC-identity.md):
 * 5 failures per email within 15 minutes triggers a 10-minute lock.
 *
 * Failures are recorded even for emails with no account, so lockout cannot
 * be used to enumerate which addresses are registered.
 */

const MAX_FAILURES = 5
const COUNT_WINDOW_MS = 15 * 60 * 1000
const LOCK_MS = 10 * 60 * 1000

/** Record a failed attempt. Call for every failed login, known or unknown. */
export async function recordFailedLogin(email: string) {
  await FailedLogin.create({ email: email.trim().toLowerCase() })
}

/** True when the account is currently locked (>= MAX_FAILURES in window). */
export async function isLoginLocked(email: string): Promise<boolean> {
  const since = new Date(Date.now() - COUNT_WINDOW_MS)
  const count = await FailedLogin.countDocuments({
    email: email.trim().toLowerCase(),
    createdAt: { $gte: since },
  })
  return count >= MAX_FAILURES
}

/** Remaining failed-attempt budget before the lock engages. */
export async function remainingAttempts(email: string): Promise<number> {
  const locked = await isLoginLocked(email)
  if (locked) return 0
  const since = new Date(Date.now() - COUNT_WINDOW_MS)
  const count = await FailedLogin.countDocuments({
    email: email.trim().toLowerCase(),
    createdAt: { $gte: since },
  })
  return Math.max(0, MAX_FAILURES - count)
}

/** Clear a user's failures after a successful login. */
export async function clearFailedLogins(email: string) {
  await FailedLogin.deleteMany({ email: email.trim().toLowerCase() })
}

/** When the current lock (if any) expires — for UI display. */
export function lockExpiresAt(firstFailureAt: Date): Date {
  return new Date(firstFailureAt.getTime() + LOCK_MS)
}

export const LOCKOUT = { MAX_FAILURES, COUNT_WINDOW_MS, LOCK_MS }
