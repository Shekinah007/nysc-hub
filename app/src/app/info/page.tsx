import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { getPublishedByCategory, CATEGORY_LABELS } from '@/server/info/queries'
import type { ArticleCategory } from '@/models/info-hub/InfoArticle'

export const metadata: Metadata = {
  title: 'NYSC Info Hub | NYSC-Hub',
  description:
    'Documents, fees, travel, and relocation — plain, sourced answers for prospective and serving corps members.',
}

/**
 * /info — the info-hub landing page. Every category with at least one
 * published article shows its list; empty categories are hidden rather
 * than advertised (nothing is worse than a section of zero results).
 *
 * Blocking route: the category lists hit the database, so there is no
 * shell worth streaming.
 */
export const instant = false

export default async function InfoHubPage() {
  // DB-backed content: opt into request time rather than prerendering.
  await connection()
  const categories: ArticleCategory[] = ['documents', 'fees', 'travel', 'relocation', 'general']

  const sections = await Promise.all(
    categories.map(async (category) => ({
      category,
      articles: await getPublishedByCategory(category),
    })),
  )
  const visible = sections.filter((s) => s.articles.length > 0)

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">NYSC Info Hub</h1>
        <p className="mt-2 text-sm text-muted">
          What to bring, what it costs, how to get there, and how relocation works —
          every article cites its sources and shows its last-reviewed date.
        </p>
      </header>

      {visible.length === 0 ? (
        <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">
          Articles are being written. Check back soon.
        </p>
      ) : (
        visible.map(({ category, articles }) => (
          <section key={category} aria-labelledby={`category-${category}`}>
            <h2
              id={`category-${category}`}
              className="mb-3 text-lg font-semibold text-foreground"
            >
              {CATEGORY_LABELS[category]}
            </h2>
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
          </section>
        ))
      )}
    </div>
  )
}
