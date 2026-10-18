# Spec: community

**Module:** `community` · **Depends on:** `identity`, `camps`, `verification` (interface only) · **Status:** Approved 2026-10-18

## Objective

The connective tissue of NYSC-Hub: posts, questions, tips, and discussions across all users — prospective, serving, and finished — taggable by camp, state, and batch, with posting privileges gated by community trust tier. This is the module that makes the platform sticky across the full corper lifecycle instead of only useful three weeks a year.

Who: every registered user; anonymous users read everything.

## Tech Stack

- Mongoose models + Zod validation.
- Server-rendered feeds with client-side pagination (no realtime/polling in v1).
- Trust-tier gating through an interface only — `getTrustTier(userId)` from `verification`; ships with a stub resolver returning `registered` until `verification` lands, then swaps in the real one.
- Moderation queue and actions write to the shared `AuditEntry` model owned by `identity`.

## Models

- **Post** — authorId, type: `'question' | 'discussion' | 'tip'`, title (required for questions), body markdown, tags: { campId?, state?, batch?, freeform[] }, score, answerCount, status: `'visible' | 'removed' | 'locked'`, timestamps.
- **Comment** — postId, authorId, parentCommentId (one level of nesting — depth 1 only), body markdown, score, status, timestamps.
- **Vote** — target (postId or commentId), userId — one upvote per user per target, toggleable.
- **Report** — targetType, targetId, reporterId, reason: `'spam' | 'harassment' | 'misinformation' | 'other'`, status: `'open' | 'actioned' | 'dismissed'`, timestamps.

## Surface

- Public: `/discuss` (all posts), `/discuss/questions`, `/discuss/tips`, tag-filtered views (per camp: `/camps/[slug]/discuss`, per state, per batch)
- API: `POST /api/posts`, `POST /api/posts/[id]/comments`, `POST /api/vote` (posts and comments), `POST /api/reports`
- Moderation: `/admin/moderation` (report queue), actions: remove post/comment, warn user, ban user — each writes an AuditEntry and, on a strike, triggers `verification` demotion review
- Feeds sort: recent / top; pagination cursor-based

## Trust-tier privilege gates

Enforced server-side only — client UI just reflects what's allowed.

| Tier | Read | Comment | Vote | Create posts | Report weight |
|---|---|---|---|---|---|
| Anonymous | ✅ | ❌ | ❌ | ❌ | n/a |
| Registered | ✅ | ✅ | ✅ | ❌ | standard |
| Community Vouched | ✅ | ✅ | ✅ | ✅ | standard |
| Trusted Community Member | ✅ | ✅ | ✅ | ✅ | elevated |

Rate limits (exact numbers tuned at implementation): post creation throttled per tier — registered n/a (no posting), vouched ~5/day, trusted ~15/day.

## Commands

```
Tests:  npm run test -- community
```

## Code Style

Follows `SPEC-platform.md`. Guard helpers compose: `requireUser()` from identity plus `requireTier('vouched')` once `verification` lands.

## Testing Strategy

- Integration: create post / comment / vote / report flows end-to-end against mongodb-memory-server.
- Guard matrix: anonymous / registered / vouched / trusted against each mutation route — 401 / 403 / 200 as per the table above; the stub tier resolver is used in these tests and the real one in `verification`'s own tests.
- Vote idempotency: toggling a vote twice returns to the original score.
- Moderation: removing a post writes an audit entry and hides it from public feeds but preserves it for admin view.
- Rate-limit test: 6th post in a day by a vouched user is rejected with 429.

## Boundaries

- **Always:** enforce tier gates server-side; audit moderation actions; keep removed content viewable to admins (never hard-delete on strike).
- **Ask first:** adding DMs, follows, notifications, reactions, or polls (these are Phase 2/3 roadmap items).
- **Never:** expose reporter identity to the reported user; allow anonymous posting; downvotes in v1.

## Success Criteria

- Post/comment/vote/report flows work end-to-end for the tiers in the matrix.
- Tier gates enforced server-side — a registered user cannot create a post (403 plus audit if attempted with any client spoofing).
- Moderation queue lists reports; actions are audited; a moderation strike triggers trust demotion review via `verification`.
- Tag filtering works per camp, state, batch.
- Anonymous users read everything, gated only from interacting.

## Out of scope for v1

- Reactions/emoji, polls, downvotes, DMs, follows, notifications (Phase 2/3 roadmap).
- Community guidelines UI beyond a simple posting-rules page (content written at implementation).

## Open Questions

- Length limits on post body and comments (proposed: posts 20k chars max, comments 4k).
- Whether questions marked "answered" need an accepted-answer concept in v1, or answerCount + top-sort suffices (my read: suffices; accepted answers are a v2 nicety).
