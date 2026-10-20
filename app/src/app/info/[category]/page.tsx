import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'

import { getPublishedByCategory, CATEGORY_LABELS } from '@/server/info/queries'
import { ARTICLE_CATEGORIES, type ArticleCategory } from '@/models/info-hub/InfoArticle'

type Params = Promise<{ category: string }>

/** Category pages are SEO-indexable per topic. */
export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const { category } = await params
  const label = CATEGORY_LABELS[category as ArticleCategory] ?? category
  return {
    title: `${label} | NYSC-Hub Info Hub`,
    description: `NYSC ${label.toLowerCase()} articles, each citing its sources.`,
  }
}

/**
 * /info/[category] — all published articles in one category. Unknown
 * categories 404 rather than rendering an empty shell. Blocking route:
 * the article list hits the database, so there is no shell to stream.
 */
export const instant = false

export default async function CategoryPage({
  params,
}: {
  params: Params
}) {
  const { category: raw } = await params
  await connection()

  if (!ARTICLE_CATEGORIES.includes(raw as ArticleCategory)) {
    notFound()
  }
  const category = raw as ArticleCategory

  const articles = await getPublishedByCategory(category)

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/info" className="text-primary underline">
          Info Hub
        </Link>{' '}
        / {CATEGORY_LABELS[category]}
      </nav>

      <header>
        <h1 className="text-2xl font-bold text-foreground">
          {CATEGORY_LABELS[category]}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {articles.length} article{articles.length === 1 ? '' : 's'}
        </p>
      </header>

      {articles.length === 0 ? (
        <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">
          Nothing published in this category yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {articles.map((article) => (
            <li
              key={article.slug}
              className="rounded-md border border-border bg-surface p-4"
            >
              <Link
                href={`/info/${category}/${article.slug}`}
                className="font-medium text-primary underline"
              >
                {article.title}
              </Link>
              <p className="mt-1 text-sm text-muted">{article.excerpt}</p>
              {article.reviewedAt && (
                <p className="mt-2 text-xs text-muted">
                  Last reviewed {article.reviewedAt.toLocaleDateString('en-GB')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
