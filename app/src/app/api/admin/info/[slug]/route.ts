import { NextResponse } from 'next/server'
import { connection } from 'next/server'

import { updateArticle } from '@/server/info/mutations'
import { requirePlatformAdmin } from '@/lib/auth-guards'

/**
 * PATCH /api/admin/info/[slug] — update an article's content (admin only).
 * Status is untouched here: publish/unpublish are separate deliberate
 * actions with their own routes and audit entries.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await connection()

  const guard = await requirePlatformAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.code }, { status: guard.status })
  }

  const { slug } = await params

  let body: {
    title?: unknown
    category?: unknown
    body?: unknown
    tags?: unknown
    sources?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  const tags =
    typeof body.tags === 'string'
      ? body.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : Array.isArray(body.tags)
        ? body.tags
        : []

  const sources = parseSources(body.sources)

  const result = await updateArticle(
    slug,
    {
      title: typeof body.title === 'string' ? body.title : '',
      category: typeof body.category === 'string' ? (body.category as never) : 'general',
      body: typeof body.body === 'string' ? body.body : '',
      tags,
      campIds: [],
      sources,
    },
    guard.user,
  )

  if (!result.ok) {
    return NextResponse.json(
      { error: result.code, fieldErrors: result.fieldErrors },
      { status: result.status },
    )
  }

  return NextResponse.json({ ok: true })
}

/** Parse "Title — URL" lines into structured sources (same as POST route). */
function parseSources(raw: unknown): { title: string; url: string }[] {
  if (typeof raw !== 'string') return []
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => splitSourceLine(line))
    .filter((s): s is { title: string; url: string } => s !== null)
}

function splitSourceLine(line: string): { title: string; url: string } | null {
  const separator = line.indexOf('—')
  if (separator === -1) return null
  const title = line.slice(0, separator).trim()
  const url = line.slice(separator + 1).trim()
  if (!title || !url) return null
  return { title, url }
}
