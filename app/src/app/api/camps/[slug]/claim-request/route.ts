import { NextResponse } from 'next/server'
import { connection } from 'next/server'

import { requestClaim } from '@/server/camps/claims'
import { getCampBySlug } from '@/server/camps/queries'
import { requireUser } from '@/lib/auth-guards'

/**
 * POST /api/camps/[slug]/claim-request
 * Any email-verified user may request to run a camp's workspace. Requests
 * are never auto-approved — they land in the platform owner's review queue
 * (SPEC-camps.md).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await connection()

  const { slug } = await params
  const camp = await getCampBySlug(slug)
  if (!camp) {
    return NextResponse.json({ error: 'camp not found' }, { status: 404 })
  }

  const guard = await requireUser()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.code }, { status: guard.status })
  }

  let body: { message?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message : ''
  const result = await requestClaim({
    campId: camp._id,
    requester: guard.user,
    message,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.code }, { status: result.status })
  }

  return NextResponse.json(
    { ok: true, requestId: result.data.requestId, status: result.data.status },
    { status: 201 },
  )
}
