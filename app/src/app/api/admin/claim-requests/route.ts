import { NextResponse } from 'next/server'
import { connection } from 'next/server'

import {
  approveClaimRequest,
  denyClaimRequest,
  listPendingClaimRequests,
  revokeCampAdmin,
} from '@/server/camps/claims'
import { requirePlatformAdmin } from '@/lib/auth-guards'

/**
 * GET /api/admin/claim-requests — the platform owner's review queue.
 * POST /api/admin/claim-requests — approve / deny / revoke (admin only).
 *
 * Every decision writes an AuditEntry; denials from non-admins are
 * audited as admin.access-denied by the guard itself (SPEC-camps.md).
 */
export async function GET() {
  await connection()

  const guard = await requirePlatformAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.code }, { status: guard.status })
  }

  const requests = await listPendingClaimRequests()
  return NextResponse.json({ requests })
}

export async function POST(request: Request) {
  await connection()

  const guard = await requirePlatformAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.code }, { status: guard.status })
  }

  let body: { action?: unknown; requestId?: unknown; reviewNote?: unknown; grantId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  const action = typeof body.action === 'string' ? body.action : ''
  const requestId = typeof body.requestId === 'string' ? body.requestId : ''
  const reviewNote = typeof body.reviewNote === 'string' ? body.reviewNote : undefined
  const grantId = typeof body.grantId === 'string' ? body.grantId : ''

  if (!['approve', 'deny', 'revoke'].includes(action)) {
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }

  if (action === 'revoke') {
    if (!grantId) {
      return NextResponse.json({ error: 'grantId required' }, { status: 400 })
    }
    const result = await revokeCampAdmin({ grantId, reviewer: guard.user })
    if (!result.ok) {
      return NextResponse.json({ error: result.code }, { status: result.status })
    }
    return NextResponse.json({ ok: true, campStatus: result.data.campStatus })
  }

  if (!requestId) {
    return NextResponse.json({ error: 'requestId required' }, { status: 400 })
  }

  if (action === 'approve') {
    const result = await approveClaimRequest({ requestId, reviewer: guard.user, reviewNote })
    if (!result.ok) {
      return NextResponse.json({ error: result.code }, { status: result.status })
    }
    return NextResponse.json({
      ok: true,
      campStatus: result.data.campStatus,
      grantId: result.data.grantId,
    })
  }

  const result = await denyClaimRequest({ requestId, reviewer: guard.user, reviewNote })
  if (!result.ok) {
    return NextResponse.json({ error: result.code }, { status: result.status })
  }
  return NextResponse.json({ ok: true, status: result.data.status })
}
