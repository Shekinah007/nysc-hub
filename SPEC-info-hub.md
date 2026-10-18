# Spec: info-hub

**Module:** `info-hub` · **Depends on:** `camps` · **Status:** Approved 2026-10-18

## Objective

The content layer prospective corpers arrive via Google for: what documents to bring, what fees to expect, how to get to each camp, how relocation works — authoritative, well-written, and search-indexed. This is the top-of-funnel value for the audience that hasn't served yet, and it stands entirely on public information.

Who: primarily prospective applicants; serving corpers for relocation and mid-service procedures.

## Tech Stack

- Mongoose models + Zod validation.
- Public article pages as server components — statically generated where possible, cache-friendly, SEO-indexable.
- Markdown authoring with a live-preview editor (no rich-text library, no headless CMS — markdown text + server-side rendering; chose this deliberately to avoid CMS vendor cost on a bootstrapped project).
- Content **researched and verified against public NYSC sources at implementation time**, citations stored in a `sources` field per article — never invented or guessed. Fees and procedures change; accuracy is the trust motor of this module.

## Models

- **InfoArticle** — slug (unique), title, category: `'documents' | 'fees' | 'travel' | 'relocation' | 'general'`, body markdown, tags, campIds (links to `camps`), sources (array of citations), status: `'draft' | 'published' | 'archived'`, publishedAt, reviewedAt, updatedBy, timestamps.

## Surface

- Public: `/info` (category landing), `/info/[category]`, `/info/[category]/[slug]` (article)
- Search: text index over title + body + tags, available site-wide in the header
- Camp pages (`/camps/[slug]`) embed a "Related info" section pulling articles linked to that camp — implemented as part of this module
- Editor: `/admin/info` (platform-admin only in v1) — markdown editor with live preview, publish/unpublish, category and camp tagging

## Commands

Platform commands plus module-scoped test selection:

```
Tests:  npm run test -- info-hub
```

## Code Style

Follows `SPEC-platform.md`. Markdown is rendered through a sanitized renderer (allow basic formatting, links, lists, headings; strip scripts and event handlers).

## Testing Strategy

- Integration: article CRUD, publish/unpublish transitions, draft hidden from public routes.
- Search tests: query by title, body, and tag returns the right articles.
- Sanitization test: injected script tags in markdown body do not survive render.
- Camp-linkage test: article linked to camp renders in that camp's related-info section.

## Boundaries

- **Always:** show "last reviewed" date on published articles; cite sources for factual claims; sanitize markdown before render.
- **Ask first:** publishing any article without a verifiable public source; changing category taxonomy.
- **Never:** invent fees, dates, or procedures; publish user-submitted content directly.

## Success Criteria

- Article CRUD + publish/unpublish work; drafts are invisible publicly.
- Search returns relevant results by title/body/tags.
- Camp pages embed their linked articles.
- Every published article shows a last-reviewed date and citations.
- Markdown renders and is sanitized (verified by test).

## Out of scope for v1 — deferred to v2 (explicitly planned, not permanent exclusions)

- **Community-contributed wiki editing** — vouched/trusted users propose edits to articles, with admin review before publish (builds on `verification` trust tiers).
- **Versioned article revisions** — full revision history with diffs and restore, replacing the plain `updatedAt`/`reviewedAt` audit fields.
- **Video content** — embedded video in articles; hosting/bandwidth decisions deferred.

## Open Questions

- Exact article list for launch (proposed initial set: "Documents required for camp", "What fees to budget for camp", "How to get to your camp", "Relocation: how it works", "What to pack") — confirm before implementation.
- Hosting of any images referenced in articles (Vercel asset hosting vs. external URLs).
