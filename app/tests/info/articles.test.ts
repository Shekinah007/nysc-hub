/**
 * Info-hub query + mutation tests (SPEC-info-hub.md):
 *   - drafts are invisible on public read paths
 *   - category listing, article by slug, related-for-camp
 *   - search hits title, body, and tag
 *   - create/update validation rejects bad input
 *   - publish requires at least one source; unpublish returns to draft
 *   - camp-linked article appears in that camp's related-info section
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { connectTestDb, clearTestDb, disconnectTestDb } from '../db'
import { User, type UserDoc } from '@/models/identity/User'
import { Camp } from '@/models/camps/Camp'
import { InfoArticle } from '@/models/info-hub/InfoArticle'
import { seedCamps } from '../../scripts/seed-camps'
import {
  getPublishedByCategory,
  getPublishedBySlug,
  getRelatedForCamp,
  searchArticles,
  listAllArticles,
} from '@/server/info/queries'
import {
  createArticle,
  updateArticle,
  publishArticle,
  unpublishArticle,
  articleInputSchema,
} from '@/server/info/mutations'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

beforeAll(async () => {
  await connectTestDb()
}, 120_000)

afterEach(async () => {
  await clearTestDb()
  vi.restoreAllMocks()
})

afterAll(async () => {
  await disconnectTestDb()
})

/**
 * Cached admin per test. Many tests need two admin users (author +
 * reviewer), and creating fresh users with a fixed email collides the
 * unique index inside a single test.
 */
let admin: UserDoc

async function makeAdmin(): Promise<UserDoc> {
  if (admin) return admin
  admin = await User.create({
    email: 'admin@example.com',
    passwordHash: 'x',
    name: 'Admin',
    platformAdmin: true,
  })
  return admin
}

/** A minimal valid input for create/update. */
function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Camp documents checklist',
    category: 'documents' as const,
    body: 'Bring your call-up letter, statement of result, and medical fitness certificate.',
    tags: ['camp', 'documents'],
    campIds: [] as string[],
    sources: [{ title: 'NYSC FAQs', url: 'https://www.nysc.gov.ng/faq.html' }],
    ...overrides,
  }
}


async function seedCamp() {
  await seedCamps()
  const camp = await Camp.findOne({ slug: 'lagos' })
  if (!camp) throw new Error('camp not found')
  return camp
}

describe('public read paths hide drafts', () => {
  it('getPublishedByCategory lists only published articles', async () => {
    await createArticle(baseInput({ title: 'Published one' }), await makeAdmin())
    await createArticle(
      baseInput({ title: 'Draft one', body: 'Another valid body for the draft article.' }),
      await makeAdmin(),
    )

    // Publish the first, leave the second a draft.
    await publishArticle('published-one', await makeAdmin())

    const list = await getPublishedByCategory('documents')
    expect(list).toHaveLength(1)
    expect(list[0].title).toBe('Published one')
    expect(list[0].excerpt).toBeTruthy()
  })

  it('getPublishedBySlug returns null for a draft', async () => {
    await createArticle(baseInput({ title: 'Never published' }), await makeAdmin())
    const article = await getPublishedBySlug('never-published')
    expect(article).toBeNull()
  })

  it('getPublishedBySlug returns the full body and sources for published', async () => {
    await createArticle(baseInput({ title: 'Public article' }), await makeAdmin())
    await publishArticle('public-article', await makeAdmin())

    const article = await getPublishedBySlug('public-article')
    expect(article).not.toBeNull()
    expect(article?.body).toContain('call-up letter')
    expect(article?.sources).toHaveLength(1)
    expect(article?.sources[0].url).toContain('nysc.gov.ng')
    expect(article?.reviewedAt).toBeTruthy()
  })
})

describe('search', () => {
  it('matches by title', async () => {
    await createArticle(baseInput({ title: 'Relocation grounds explained' }), await makeAdmin())
    await publishArticle('relocation-grounds-explained', await makeAdmin())

    const results = await searchArticles('relocation')
    expect(results.some((r) => r.slug === 'relocation-grounds-explained')).toBe(true)
  })

  it('matches by body content', async () => {
    await createArticle(
      baseInput({ title: 'Fees breakdown', body: 'The portal subscription is three thousand naira.' }),
      await makeAdmin(),
    )
    await publishArticle('fees-breakdown', await makeAdmin())

    const results = await searchArticles('subscription')
    expect(results.some((r) => r.slug === 'fees-breakdown')).toBe(true)
  })

  it('matches by tag', async () => {
    await createArticle(
      baseInput({ title: 'Travel notes', tags: ['journey', 'transport'] }),
      await makeAdmin(),
    )
    await publishArticle('travel-notes', await makeAdmin())

    const results = await searchArticles('transport')
    expect(results.some((r) => r.slug === 'travel-notes')).toBe(true)
  })

  it('never returns drafts', async () => {
    await createArticle(baseInput({ title: 'Secret draft material' }), await makeAdmin())
    const results = await searchArticles('secret')
    expect(results).toHaveLength(0)
  })

  it('ignores queries shorter than two characters', async () => {
    expect(await searchArticles('a')).toHaveLength(0)
  })
})

describe('camp linkage', () => {
  it('getRelatedForCamp returns published articles linked to that camp', async () => {
    const camp = await seedCamp()
    await createArticle(
      baseInput({ title: 'Lagos camp travel guide', campIds: [camp._id.toString()] }),
      await makeAdmin(),
    )
    await publishArticle('lagos-camp-travel-guide', await makeAdmin())

    // A draft linked to the same camp must not appear.
    await createArticle(
      baseInput({ title: 'Lagos draft guide', campIds: [camp._id.toString()] }),
      await makeAdmin(),
    )

    const related = await getRelatedForCamp(camp._id)
    expect(related).toHaveLength(1)
    expect(related[0].slug).toBe('lagos-camp-travel-guide')
  })
})

describe('create and update validation', () => {
  it('rejects a title shorter than three characters', async () => {
    const result = await createArticle(baseInput({ title: 'ab' }), await makeAdmin())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(400)
      expect(result.code).toBe('INVALID_INPUT')
      expect(result.fieldErrors?.title).toBeTruthy()
    }
  })

  it('rejects an invalid source URL', async () => {
    const result = await createArticle(
      baseInput({ sources: [{ title: 'Bad', url: 'not a url' }] }),
      await makeAdmin(),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INVALID_INPUT')
      expect(result.fieldErrors?.sources).toBeTruthy()
    }
  })

  it('deduplicates slugs on identical titles', async () => {
    await createArticle(baseInput({ title: 'Same title' }), await makeAdmin())
    await createArticle(
      baseInput({ title: 'Same title', body: 'A second article with the same heading.' }),
      await makeAdmin(),
    )

    const articles = await InfoArticle.find({}).sort({ createdAt: 1 })
    expect(articles).toHaveLength(2)
    expect(articles[0].slug).toBe('same-title')
    expect(articles[1].slug).toBe('same-title-2')
  })

  it('updateArticle changes the body and keeps the slug', async () => {
    await createArticle(baseInput(), await makeAdmin())
    const result = await updateArticle(
      'camp-documents-checklist',
      baseInput({ body: 'Updated body: bring two photocopies of everything.' }),
      await makeAdmin(),
    )
    expect(result.ok).toBe(true)

    const article = await InfoArticle.findOne({ slug: 'camp-documents-checklist' })
    expect(article?.body).toContain('Updated body')
  })

  it('updateArticle 404s for an unknown slug', async () => {
    const result = await updateArticle('no-such-article', baseInput(), await makeAdmin())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(404)
      expect(result.code).toBe('NOT_FOUND')
    }
  })
})

describe('publish and unpublish', () => {
  it('publish refuses an article with no sources', async () => {
    await createArticle(
      baseInput({ title: 'Uncited claims', sources: [] }),
      await makeAdmin(),
    )
    const result = await publishArticle('uncited-claims', await makeAdmin())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(400)
      expect(result.code).toBe('NO_SOURCES')
    }

    // Still a draft — the rejection did not half-publish it.
    const article = await InfoArticle.findOne({ slug: 'uncited-claims' })
    expect(article?.status).toBe('draft')
  })

  it('publish stamps publishedAt on first publish only', async () => {
    await createArticle(baseInput({ title: 'Date keeper' }), await makeAdmin())
    await publishArticle('date-keeper', await makeAdmin())
    const first = await InfoArticle.findOne({ slug: 'date-keeper' })
    const firstDate = first?.publishedAt
    expect(firstDate).toBeTruthy()
    expect(first?.reviewedAt).toBeTruthy()

    // Unpublish and republish: publishedAt is preserved, reviewedAt refreshes.
    await unpublishArticle('date-keeper', await makeAdmin())
    await publishArticle('date-keeper', await makeAdmin())
    const second = await InfoArticle.findOne({ slug: 'date-keeper' })
    expect(second?.publishedAt?.toISOString()).toBe(firstDate?.toISOString())
    expect(second?.reviewedAt?.toISOString()).not.toBe(first?.reviewedAt?.toISOString())
  })

  it('unpublish returns a published article to draft', async () => {
    await createArticle(baseInput({ title: 'Temporary publish' }), await makeAdmin())
    await publishArticle('temporary-publish', await makeAdmin())
    await unpublishArticle('temporary-publish', await makeAdmin())

    const article = await InfoArticle.findOne({ slug: 'temporary-publish' })
    expect(article?.status).toBe('draft')

    // And the public route stops serving it.
    expect(await getPublishedBySlug('temporary-publish')).toBeNull()
  })

  it('publish 404s for an unknown slug', async () => {
    const result = await publishArticle('ghost-article', await makeAdmin())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(404)
  })
})

describe('admin views', () => {
  it('listAllArticles includes drafts', async () => {
    await createArticle(baseInput({ title: 'Admin sees drafts' }), await makeAdmin())
    const list = await listAllArticles()
    expect(list).toHaveLength(1)
    expect(list[0].title).toBe('Admin sees drafts')
  })
})

describe('zod schema edge cases', () => {
  it('accepts the base input', () => {
    const parsed = articleInputSchema.safeParse(baseInput())
    expect(parsed.success).toBe(true)
  })

  it('rejects more than 37 camp links', () => {
    const campIds = Array.from({ length: 38 }, () => '64b7f1f1f1f1f1f1f1f1f1f1')
    const parsed = articleInputSchema.safeParse(baseInput({ campIds }))
    expect(parsed.success).toBe(false)
  })

  it('lowercases and trims tags', () => {
    const parsed = articleInputSchema.safeParse(baseInput({ tags: ['  Documents  '] }))
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.tags).toEqual(['documents'])
    }
  })
})
