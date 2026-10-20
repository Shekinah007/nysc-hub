import { NextResponse } from 'next/server'
import { connection } from 'next/server'

import { publishArticle, unpublishArticle } from '@/server/info/mutations'
import { requirePlatformAdmin } from '@/lib/auth-guards'

/**
 * POST /api/admin/info/[slug]/publish and /unpublish — the status
 * transitions (admin only). Publishing is deliberately separate from
 * editing: it stamps reviewedAt and refuses an article with no sources.
 */
async function transition(
  request: Request,
  slug: string,
  action: 'publish' | 'unpublish',
) {
  await connection()

  const guard = await requirePlatformAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.code }, { status: guard.status })
  }

  const fn = action === 'publish' ? publishArticle : unpublishArticle
  const result = await fn(slug, guard.user)

  if (!result.ok) {
    const payload: Record<string, unknown> = { error: result.code }
    if ('fieldErrors' in result) payload.fieldErrors = result.fieldErrors
    return NextResponse.json(payload, { status: result.status })
  }

  return NextResponse.json({ ok: true })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const url = new URL(request.url).pathname
  const action = url.endsWith('/unpublish') ? 'unpublish' : 'publish'
  return transition(request, slug, action)
}
