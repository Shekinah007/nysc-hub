import mongoose from 'mongoose'
import { AuditEntry, type AuditAction } from '@/models/identity/AuditEntry'

/**
 * Shared audit service. `camps` and `camp-workspace` write through here too,
 * so the log stays one collection and one shape across modules.
 *
 * SPEC-identity.md: mutations that change platformAdmin or deactivated
 * status must write an AuditEntry in the same operation. `withAudit`
 * wraps the mutation and the audit write in a Mongo transaction when a
 * session is available; when it is not (single-node Mongo without replica
 * set support) it falls back to a sequential write and returns the result —
 * deliberately not silent, so callers can see which guarantee they got.
 */

export type AuditOutcome<T> =
  | { ok: true; result: T; atomic: boolean }
  | { ok: false; error: string }

/**
 * Transactions need a replica set or mongos; a standalone Mongo (what
 * mongodb-memory-server runs by default) rejects them. Probe the actual
 * server topology rather than assuming.
 */
async function supportsTransactions(): Promise<boolean> {
  try {
    const admin = mongoose.connection.db?.admin()
    if (!admin) return false
    const hello = await admin.command({ hello: 1 })
    return Boolean(hello?.setName || hello?.hosts)
  } catch {
    return false
  }
}

/** Write a single audit entry. */
export async function writeAudit(input: {
  actorId: mongoose.Types.ObjectId | null
  action: AuditAction
  targetType: string
  targetId: mongoose.Types.ObjectId
  metadata?: Record<string, unknown>
}) {
  await AuditEntry.create({
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata,
  })
}

/**
 * Run `mutation` and audit it. Prefers a transaction when the server
 * supports it; otherwise a sequential write with `atomic: false` — the
 * caller always knows which guarantee it actually got.
 */
export async function withAudit<T>(input: {
  actorId: mongoose.Types.ObjectId | null
  action: AuditAction
  targetType: string
  targetId: mongoose.Types.ObjectId
  metadata?: Record<string, unknown>
  mutation: () => Promise<T>
}): Promise<AuditOutcome<T>> {
  const { mutation, action, actorId, targetType, targetId, metadata } = input

  if (await supportsTransactions()) {
    const session = await mongoose.connection.startSession()
    try {
      let result: T | undefined
      await session.withTransaction(async () => {
        result = await mutation()
        await AuditEntry.create(
          [{ actorId, action, targetType, targetId, metadata }],
          { session },
        )
      })
      await session.endSession()
      return { ok: true, result: result as T, atomic: true }
    } catch (e) {
      await session.endSession()
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  // No transaction support: sequential write, weaker guarantee, still honest.
  try {
    const result = await mutation()
    await writeAudit({ actorId, action, targetType, targetId, metadata })
    return { ok: true, result, atomic: false }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
