/**
 * Info-hub mutations (SPEC-info-hub.md) — admin-only content operations.
 *
 * Every create/update/publish/unpublish writes an AuditEntry, because the
 * spec's trust motor is accountability for what the platform presents as
 * fact. Validation lives here (not only in forms) so the API routes are a
 * thin shell.
 */
import mongoose from 'mongoose'
import { z } from 'zod'

import { withAudit } from '@/lib/audit'
import { InfoArticle } from '@/models/info-hub/InfoArticle'
import type { UserDoc } from '@/models/identity/User'

export const articleInputSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(160),
  category: z.enum(['documents', 'fees', 'travel', 'relocation', 'general']),
  body: z.string().trim().min(10, 'Body must be at least 10 characters'),
  tags: z.array(z.string().trim().toLowerCase()).max(20).optional().default([]),
  campIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).max(37).optional().default([]),
  sources: z
    .array(
      z.object({
        title: z.string().trim().min(3).max(160),
        url: z.string().url('Sources must be valid URLs'),
        checkedAt: z.coerce.date().optional(),
      }),
    )
    .max(20)
    .optional()
    .default([]),
})

export type ArticleInput = z.infer<typeof articleInputSchema>

export type MutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 401 | 403 | 404 | 409; code: string; fieldErrors?: Record<string, string[]> }

/** Turn a title into a URL-safe slug, deduplicated on collision. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function createArticle(input: ArticleInput, author: UserDoc) {
  const parsed = articleInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400 as const,
      code: 'INVALID_INPUT',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  let slug = slugify(data.title)
  // Dewy-colon dedupe: same-title articles get -2, -3…
  let suffix = 1
  while (await InfoArticle.exists({ slug })) {
    suffix += 1
    slug = `${slugify(data.title)}-${suffix}`
  }

  const outcome = await withAudit({
    actorId: author._id,
    action: 'info.article-create',
    targetType: 'InfoArticle',
    targetId: new mongoose.Types.ObjectId(),
    metadata: { slug, title: data.title },
    mutation: async () => {
      const article = await InfoArticle.create({
        slug,
        title: data.title,
        category: data.category,
        body: data.body,
        tags: data.tags,
        campIds: data.campIds.map((id) => new mongoose.Types.ObjectId(id)),
        sources: data.sources,
        status: 'draft',
        updatedBy: author._id,
      })
      return { slug: article.slug, _id: article._id.toString() }
    },
  })

  if (!outcome.ok) return { ok: false as const, status: 400 as const, code: 'CREATE_FAILED' }
  return { ok: true as const, data: outcome.result }
}

export async function updateArticle(
  slug: string,
  input: ArticleInput,
  editor: UserDoc,
) {
  const parsed = articleInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400 as const,
      code: 'INVALID_INPUT',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  const article = await InfoArticle.findOne({ slug })
  if (!article) return { ok: false as const, status: 404 as const, code: 'NOT_FOUND' }

  const outcome = await withAudit({
    actorId: editor._id,
    action: 'info.article-update',
    targetType: 'InfoArticle',
    targetId: article._id,
    metadata: { slug, title: data.title },
    mutation: async () => {
      article.title = data.title
      article.category = data.category
      article.body = data.body
      article.tags = data.tags
      article.campIds = data.campIds.map((id) => new mongoose.Types.ObjectId(id))
      article.sources = data.sources
      article.updatedBy = editor._id
      await article.save()
      return { slug: article.slug }
    },
  })

  if (!outcome.ok) return { ok: false as const, status: 400 as const, code: 'UPDATE_FAILED' }
  return { ok: true as const, data: outcome.result }
}

/**
 * Publish: sets status + publishedAt (on first publish only — a republish
 * after unpublish keeps the original date) and stamps reviewedAt, the
 * "last reviewed" date the spec requires on every published article.
 */
export async function publishArticle(slug: string, reviewer: UserDoc) {
  const article = await InfoArticle.findOne({ slug })
  if (!article) return { ok: false as const, status: 404 as const, code: 'NOT_FOUND' }

  // SPEC boundary: never publish without at least one source to cite.
  if (article.sources.length === 0) {
    return {
      ok: false as const,
      status: 400 as const,
      code: 'NO_SOURCES',
      fieldErrors: { sources: ['Every published article needs at least one cited source'] },
    }
  }

  const outcome = await withAudit({
    actorId: reviewer._id,
    action: 'info.article-publish',
    targetType: 'InfoArticle',
    targetId: article._id,
    metadata: { slug },
    mutation: async () => {
      article.status = 'published'
      article.publishedAt = article.publishedAt ?? new Date()
      article.reviewedAt = new Date()
      article.updatedBy = reviewer._id
      await article.save()
      return { slug: article.slug, publishedAt: article.publishedAt }
    },
  })

  if (!outcome.ok) return { ok: false as const, status: 400 as const, code: 'PUBLISH_FAILED' }
  return { ok: true as const, data: outcome.result }
}

/** Unpublish back to draft — public routes stop serving it immediately. */
export async function unpublishArticle(slug: string, reviewer: UserDoc) {
  const article = await InfoArticle.findOne({ slug })
  if (!article) return { ok: false as const, status: 404 as const, code: 'NOT_FOUND' }

  const outcome = await withAudit({
    actorId: reviewer._id,
    action: 'info.article-unpublish',
    targetType: 'InfoArticle',
    targetId: article._id,
    metadata: { slug },
    mutation: async () => {
      article.status = 'draft'
      article.updatedBy = reviewer._id
      await article.save()
      return { slug: article.slug }
    },
  })

  if (!outcome.ok) return { ok: false as const, status: 400 as const, code: 'UNPUBLISH_FAILED' }
  return { ok: true as const, data: outcome.result }
}
