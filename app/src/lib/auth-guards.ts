import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { User } from '@/models/identity/User'
import { writeAudit } from '@/lib/audit'
import type { UserDoc } from '@/models/identity/User'

/**
 * Server-side guards. Client-side checks are cosmetic — every protected
 * route handler enforces through here (SPEC-identity.md).
 *
 * Guards re-read the user from the database at check time rather than
 * trusting the session: a revoked admin is blocked on the very next
 * request, not at session expiry. Sessions are also killed on rejection
 * where the offense warrants it (defense in depth).
 */

export type GuardResult<T extends UserDoc = UserDoc> =
  | { ok: true; user: T }
  | { ok: false; status: 401 | 403; code: string }

/** Resolve the current user from the session, fresh from the database. */
export async function getCurrentUser(): Promise<UserDoc | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await User.findById(session.user.id)
  if (!user) return null
  if (user.deactivated) return null
  return user
}

/** Require any authenticated, verified, active user. */
export async function requireUser(): Promise<GuardResult> {
  const user = await getCurrentUser()
  if (!user) {
    return { ok: false, status: 401, code: 'UNAUTHENTICATED' }
  }
  return { ok: true, user }
}

/** Require the platform-admin role. Denials are audited. */
export async function requirePlatformAdmin(): Promise<GuardResult> {
  const user = await getCurrentUser()
  if (!user) {
    return { ok: false, status: 401, code: 'UNAUTHENTICATED' }
  }

  if (!user.platformAdmin) {
    // SPEC-identity.md success criteria: 403 plus an AuditEntry.
    await writeAudit({
      actorId: user._id,
      action: 'admin.access-denied',
      targetType: 'User',
      targetId: user._id,
      metadata: { attempted: 'requirePlatformAdmin' },
    })
    return { ok: false, status: 403, code: 'FORBIDDEN' }
  }

  return { ok: true, user }
}

/** Require a specific user to be acting on their own resource. */
export async function requireSelfOrPlatformAdmin(
  targetUserId: mongoose.Types.ObjectId | string,
): Promise<GuardResult> {
  const user = await getCurrentUser()
  if (!user) {
    return { ok: false, status: 401, code: 'UNAUTHENTICATED' }
  }

  const isSelf = user._id.toString() === targetUserId.toString()
  if (isSelf) return { ok: true, user }

  if (user.platformAdmin) return { ok: true, user }

  return { ok: false, status: 403, code: 'FORBIDDEN' }
}
