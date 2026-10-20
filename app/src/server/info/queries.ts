/**
 * Info-hub queries (SPEC-info-hub.md).
 *
 * Read paths only return `published` articles — drafts and archived
 * articles never appear on public routes, enforced here rather than in
 * each route handler. Mutations are admin-only and go through the
 * mutations file; this module owns the read shapes.
 */
import mongoose from 'mongoose'

import { InfoArticle, type ArticleCategory, type ArticleStatus } from '@/models/info-hub/InfoArticle'

export type ArticleListItem = {
  _id: string
  slug: string
  title: string
  category: ArticleCategory
  tags: string[]
  publishedAt?: Date
  reviewedAt?: Date
  excerpt: string
}

export type ArticleDetail = ArticleListItem & {
  body: string
  sources: { title: string; url: string; checkedAt?: Date }[]
  campIds: string[]
}

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  documents: 'Documents',
  fees: 'Fees',
  travel: 'Travel',
  relocation: 'Relocation',
  general: 'General',
}

/** Build a plain-text excerpt from markdown for list and search views. */
function excerpt(body: string, length = 140): string {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~\[\\]()!|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > length ? text.slice(0, length).trimEnd() + '…' : text
}

/** All published articles in a category, newest first. */
export async function getPublishedByCategory(category: ArticleCategory): Promise<ArticleListItem[]> {
  const articles = await InfoArticle.find({ category, status: 'published' })
    .sort({ publishedAt: -1, createdAt: -1 })
    .lean()
  return articles.map(toListItem)
}

/** One published article by slug, or null for drafts/unknown slugs. */
export async function getPublishedBySlug(
  slug: string,
): Promise<ArticleDetail | null> {
  const article = await InfoArticle.findOne({ slug, status: 'published' }).lean()
  if (!article) return null
  return toDetail(article)
}

/** Published articles linked to a camp (the camp-page "Related info" section). */
export async function getRelatedForCamp(
  campId: mongoose.Types.ObjectId | string,
): Promise<ArticleListItem[]> {
  const articles = await InfoArticle.find({
    campIds: campId,
    status: 'published',
  })
    .sort({ publishedAt: -1 })
    .limit(5)
    .lean()
  return articles.map(toListItem)
}

/**
 * Site-wide search over title + body + tags (text index). Public results
 * are published-only, so draft content never surfaces in header search.
 */
export async function searchArticles(query: string): Promise<ArticleListItem[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const articles = await InfoArticle.find(
    { $text: { $search: trimmed }, status: 'published' },
    // Text search relevance score for ranking.
    { score: { $meta: 'textScore' } },
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(10)
    .lean()
  return articles.map(toListItem)
}

/** Admin list: every article regardless of status (queue sees drafts). */
export async function listAllArticles(): Promise<ArticleListItem[]> {
  const articles = await InfoArticle.find({})
    .sort({ updatedAt: -1 })
    .lean()
  return articles.map(toListItem)
}

/** Admin detail: any status, for the editor. */
export async function getArticleForAdmin(
  slug: string,
): Promise<(ArticleDetail & { status: ArticleStatus }) | null> {
  const article = await InfoArticle.findOne({ slug }).lean()
  if (!article) return null
  const detail = toDetail(article)
  return { ...detail, status: article.status }
}

/* ---------- shape mappers ---------- */

type LeanArticle = {
  _id: mongoose.Types.ObjectId
  slug: string
  title: string
  category: ArticleCategory
  body: string
  tags: string[]
  campIds: mongoose.Types.ObjectId[]
  sources: { title: string; url: string; checkedAt?: Date }[]
  status: ArticleStatus
  publishedAt?: Date
  reviewedAt?: Date
  createdAt: Date
  updatedAt: Date
}

function toListItem(a: LeanArticle): ArticleListItem {
  return {
    _id: a._id.toString(),
    slug: a.slug,
    title: a.title,
    category: a.category,
    tags: a.tags,
    publishedAt: a.publishedAt,
    reviewedAt: a.reviewedAt,
    excerpt: excerpt(a.body),
  }
}

function toDetail(a: LeanArticle): ArticleDetail {
  return {
    ...toListItem(a),
    body: a.body,
    sources: a.sources,
    campIds: a.campIds.map((id) => id.toString()),
  }
}
// Keep ArticleStatus used in the admin return type above.
export type { ArticleStatus }
