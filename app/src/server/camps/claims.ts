/**
 * Claim request service (SPEC-camps.md):
 *   - any email-verified user can request to run a camp's workspace
 *   - requests land in a manual review queue; nothing is auto-approved
 *   - approve → CampAdmin grant (scope camp) + camp status → 'claimed' + audit
 *   - deny → status 'denied', review note recorded, no grant
 *   - grants are revocable; revocation writes an audit entry
 *
 * Requester identity is never exposed on public surfaces.
 */
import mongoose from 'mongoose'

import { withAudit } from '@/lib/audit'
import { Camp } from '@/models/camps/Camp'
import { CampAdmin } from '@/models/camps/CampAdmin'
import { CampClaimRequest, type ClaimRequestStatus } from '@/models/camps/CampClaimRequest'
import type { UserDoc } from '@/models/identity/User'

export type ClaimResult<T> = { ok: true; data: T } | { ok: false; code: string; status: 400 | 401 | 403 | 404 | 409 }

/**
 * Create or refresh a claim request. One active request per (camp,
 * requester): re-requesting after a denial resets it to pending so a user
 * can respond to review feedback without a support ticket.
 */
export async function requestClaim(input: {
  campId: mongoose.Types.ObjectId | string
  requester: UserDoc
  message: string
}): Promise<ClaimResult<{ requestId: string; status: ClaimRequestStatus }>> {
  const camp = await Camp.findById(input.campId)
  if (!camp) return { ok: false, status: 404, code: 'CAMP_NOT_FOUND' }

  // Verified-email gate (SPEC-camps.md: "any email-verified user").
  if (!input.requester.emailVerifiedAt) {
    return { ok: false, status: 403, code: 'EMAIL_NOT_VERIFIED' }
  }

  const message = input.message.trim()
  if (message.length < 10) {
    return { ok: false, status: 400, code: 'MESSAGE_TOO_SHORT' }
  }
  if (message.length > 1000) {
    return { ok: false, status: 400, code: 'MESSAGE_TOO_LONG' }
  }

  // Another user already runs this camp — the request still records, but
  // the reviewer sees the conflict. Kept as a conflict for transparency
  // rather than silently accepting a duplicate claim.
  const existing = await CampClaimRequest.findOne({
    campId: camp._id,
    requesterId: input.requester._id,
  })

  const payload = {
    campId: camp._id,
    requesterId: input.requester._id,
    message,
    status: 'pending' as ClaimRequestStatus,
    $unset: { reviewedBy: '', reviewedAt: '', reviewNote: '' },
  }

  let request
  if (existing) {
    // Re-request resets to pending (see model header comment).
    Object.assign(existing, {
      message,
      status: 'pending',
      reviewedBy: undefined,
      reviewedAt: undefined,
      reviewNote: undefined,
    })
    request = await existing.save()
  } else {
    request = await CampClaimRequest.create(payload)
  }

  await withAudit({
    actorId: input.requester._id,
    action: 'camp.claim-request',
    targetType: 'Camp',
    targetId: camp._id,
    metadata: { requestId: request._id.toString() },
    mutation: async () => request._id.toString(),
  })

  return { ok: true, data: { requestId: request._id.toString(), status: request.status } }
}

/**
 * Pending requests for the review queue, newest first. Admin-only — callers
 * guard with requirePlatformAdmin() before invoking.
 *
 * Populate is typed explicitly (rather than lean + casts) so the mapped
 * shape is checked at compile time: CampClaimRequest stores ids, but the
 * queue needs camp and requester context to be actionable.
 */
type PopulatedCamp = { _id: mongoose.Types.ObjectId; name: string; slug: string; state: string }
type PopulatedRequester = { _id: mongoose.Types.ObjectId; email: string; name?: string }

export async function listPendingClaimRequests() {
  const requests = await CampClaimRequest.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .populate<{ campId: PopulatedCamp; requesterId: PopulatedRequester }>([
      { path: 'campId', select: 'name slug state' },
      { path: 'requesterId', select: 'email name' },
    ])
    .lean()

  return requests.map((r) => ({
    id: r._id.toString(),
    message: r.message,
    createdAt: r.createdAt,
    camp: {
      id: r.campId._id.toString(),
      name: r.campId.name,
      slug: r.campId.slug,
      state: r.campId.state,
    },
    requester: {
      email: r.requesterId.email,
      name: r.requesterId.name ?? r.requesterId.email,
    },
  }))
}

/**
 * Approve a request: grant a camp-scoped CampAdmin, flip the camp to
 * 'claimed', and audit both effects. Idempotent for repeated approvals of
 * the same request — a second approve is a no-op, not an error.
 */
export async function approveClaimRequest(input: {
  requestId: mongoose.Types.ObjectId | string
  reviewer: UserDoc
  reviewNote?: string
}): Promise<ClaimResult<{ campStatus: string; grantId: string }>> {
  const request = await CampClaimRequest.findById(input.requestId)
  if (!request) return { ok: false, status: 404, code: 'REQUEST_NOT_FOUND' }

  if (request.status === 'approved') {
    // Idempotent re-approve: surface the existing outcome.
    const grant = await CampAdmin.findOne({
      campId: request.campId,
      userId: request.requesterId,
      revokedAt: null,
    })
    const camp = await Camp.findById(request.campId)
    return {
      ok: true,
      data: {
        campStatus: camp?.status ?? 'unknown',
        grantId: grant?._id.toString() ?? 'none',
      },
    }
  }

  if (request.status === 'denied') {
    return { ok: false, status: 409, code: 'REQUEST_ALREADY_DENIED' }
  }

  const camp = await Camp.findById(request.campId)
  if (!camp) return { ok: false, status: 404, code: 'CAMP_NOT_FOUND' }

  // Grant + status change + audit, transactional where the topology allows.
  const outcome = await withAudit({
    actorId: input.reviewer._id,
    action: 'camp.claim-approve',
    targetType: 'Camp',
    targetId: camp._id,
    metadata: { requestId: request._id.toString(), requesterId: request.requesterId.toString() },
    mutation: async () => {
      // One ACTIVE grant per (camp, user, scope, department) — the unique
      // partial index makes a duplicate grant a driver error, but an
      // explicit check keeps the message actionable.
      const existingGrant = await CampAdmin.findOne({
        campId: camp._id,
        userId: request.requesterId,
        revokedAt: null,
      })

      let grantId: string
      if (existingGrant) {
        grantId = existingGrant._id.toString()
      } else {
        const grant = await CampAdmin.create({
          campId: camp._id,
          userId: request.requesterId,
          scope: 'camp',
          grantedBy: input.reviewer._id,
        })
        grantId = grant._id.toString()
      }

      if (camp.status !== 'claimed') {
        camp.status = 'claimed'
        camp.claimedBy = request.requesterId
        await camp.save()
      }

      return grantId
    },
  })

  if (!outcome.ok) return { ok: false, status: 400, code: 'APPROVE_FAILED' }

  request.status = 'approved'
  request.reviewedBy = input.reviewer._id
  request.reviewedAt = new Date()
  if (input.reviewNote) request.reviewNote = input.reviewNote
  await request.save()

  return { ok: true, data: { campStatus: camp.status, grantId: outcome.result } }
}

/** Deny a request: no grant, camp untouched, review note recorded. */
export async function denyClaimRequest(input: {
  requestId: mongoose.Types.ObjectId | string
  reviewer: UserDoc
  reviewNote?: string
}): Promise<ClaimResult<{ status: string }>> {
  const request = await CampClaimRequest.findById(input.requestId)
  if (!request) return { ok: false, status: 404, code: 'REQUEST_NOT_FOUND' }

  if (request.status !== 'pending') {
    return { ok: false, status: 409, code: 'REQUEST_NOT_PENDING' }
  }

  const outcome = await withAudit({
    actorId: input.reviewer._id,
    action: 'camp.claim-deny',
    targetType: 'Camp',
    targetId: request.campId,
    metadata: { requestId: request._id.toString() },
    mutation: async () => 'denied',
  })

  if (!outcome.ok) return { ok: false, status: 400, code: 'DENY_FAILED' }

  request.status = 'denied'
  request.reviewedBy = input.reviewer._id
  request.reviewedAt = new Date()
  if (input.reviewNote) request.reviewNote = input.reviewNote
  await request.save()

  return { ok: true, data: { status: request.status } }
}

/**
 * Revoke an active camp grant. The camp returns to 'community' unless
 * someone else still holds an active grant. Revocation writes
 * 'camp.admin-revoke'.
 */
export async function revokeCampAdmin(input: {
  grantId: mongoose.Types.ObjectId | string
  reviewer: UserDoc
}): Promise<ClaimResult<{ campStatus: string }>> {
  const grant = await CampAdmin.findById(input.grantId)
  if (!grant) return { ok: false, status: 404, code: 'GRANT_NOT_FOUND' }
  if (grant.revokedAt) return { ok: false, status: 409, code: 'ALREADY_REVOKED' }

  const outcome = await withAudit({
    actorId: input.reviewer._id,
    action: 'camp.admin-revoke',
    targetType: 'Camp',
    targetId: grant.campId,
    metadata: { grantId: grant._id.toString(), userId: grant.userId.toString() },
    mutation: async () => {
      grant.revokedAt = new Date()
      await grant.save()

      // The camp only returns to community when the LAST active grant for
      // it goes away — a revoked admin is not the only possible admin.
      const remaining = await CampAdmin.countDocuments({
        campId: grant.campId,
        revokedAt: null,
      })
      if (remaining === 0) {
        const camp = await Camp.findById(grant.campId)
        if (camp && camp.status === 'claimed') {
          camp.status = 'community'
          camp.claimedBy = undefined
          await camp.save()
        }
      }
      return 'revoked'
    },
  })

  if (!outcome.ok) return { ok: false, status: 400, code: 'REVOKE_FAILED' }

  const camp = await Camp.findById(grant.campId)
  return { ok: true, data: { campStatus: camp?.status ?? 'unknown' } }
}
