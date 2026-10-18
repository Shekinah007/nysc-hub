# NYSC-Hub — Task List

Derived from `tasks/plan.md` and the approved `SPEC-*.md`. Check off as completed.

## Phase 1 — Foundation (`platform`)

- [ ] **Task 1: Scaffold Next.js app skeleton**
  - Acceptance: App Router + strict TS + Tailwind + eslint/prettier + vitest configured; `src/{app,components,lib,models,config,styles}` and `scripts/`, `tests/` exist; zod env schema fails fast with a readable error; `/api/health` responds; error boundary renders.
  - Verify: `npm run build`, `npx tsc --noEmit`, `npm run lint`, `npm run test` all pass; missing env var shows a clear validation error.
  - Dependencies: None
  - Files: `package.json`, `tsconfig.json`, `src/config/env.ts`, `src/app/api/health/route.ts`, `src/app/error.tsx`
  - Scope: M (3–5 files)
  - **STATUS: DONE 2026-10-18** — Next.js 16.4.2, 6 tests green, all gates clean. See `PROGRESS.md`. Deviations: scaffold created `app/` subdirectory (create-next-app constraint); base-component showcase route belongs to Task 2.

- [ ] **Task 2: Design tokens + base UI components**
  - Acceptance: Tailwind config carries CSS-variable tokens (colors, spacing, type scale, radii); `Button`, `Input`, `Card`, `Avatar`, `Badge`, `Alert`, `Modal`, `Toast` exist in `src/components/base/` with tests; internal `/dev/components` showcase route renders all of them (noindex).
  - Verify: `npm run test -- components` passes; showcase route renders in dev; mobile-first at 360px.
  - Dependencies: Task 1
  - Files: `tailwind.config.ts`, `src/components/base/*.tsx`, `src/app/dev/components/page.tsx`
  - Scope: M

- [ ] **Task 3: CI + Vercel deploy pipeline**
  - Acceptance: GitHub Actions workflow runs typecheck + lint + test on every PR; Vercel project connected, preview deploys per PR, production on `main`; README documents commands.
  - Verify: first PR is green and produces a preview URL.
  - Dependencies: Task 1
  - Files: `.github/workflows/ci.yml`, `vercel.json`, `README.md`
  - Scope: S

### Checkpoint A — after Task 3
- [ ] All tests pass; build/lint/typecheck clean; preview deploy works
- [ ] Review with Shekinah before proceeding

## Phase 2 — Identity + camps

- [ ] **Task 4: Mongoose connection + test harness + core identity models**
  - Acceptance: `src/lib/db.ts` connects from env; mongodb-memory-server harness in `tests/setup.ts`; `User` (incl. `lifecycleStage`, `platformAdmin`, `deactivated`), `EmailToken`, `AuditEntry` models live in `src/models/identity/`; schema-shape test asserts **no NYSC identity fields exist** on User.
  - Verify: `npm run test -- identity` passes; model tests run against in-memory Mongo.
  - Dependencies: Task 1
  - Files: `src/lib/db.ts`, `tests/setup.ts`, `src/models/identity/*.ts`
  - Scope: M

- [ ] **Task 5: Registration + email verification**
  - Acceptance: `POST /api/auth/register` creates an unverified user (bcryptjs, cost ≥12) and sends a signed token email; `POST /api/auth/verify-email` marks the account verified; `/register` and `/verify-email` pages wired; tokens are hashed at rest, expire in 15 min, single-use.
  - Verify: integration test runs the full flow; dev console sender logs the link; expired and reused tokens rejected.
  - Dependencies: Task 4; **email sending domain decided here**
  - Files: `src/app/(auth)/register/page.tsx`, `src/app/api/auth/register/route.ts`, `src/lib/email.ts`, `src/models/identity/EmailToken.ts`
  - Scope: M

- [ ] **Task 6: Login + logout with database sessions**
  - Acceptance: Auth.js v5 credentials provider with Mongoose-backed sessions; session survives refresh; logout invalidates the session server-side; unverified accounts cannot log in.
  - Verify: integration test covers login → refresh → logout; deactivated user's session is rejected on next request.
  - Dependencies: Task 5
  - Files: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/(auth)/login/page.tsx`
  - Scope: M

- [ ] **Task 7: Password reset flow**
  - Acceptance: request-reset sends a token email; reset with a valid token sets a new password; expired and reused tokens rejected.
  - Verify: integration test covers the full flow including failure paths.
  - Dependencies: Task 5
  - Files: `src/app/(auth)/reset-password/page.tsx`, `src/app/api/auth/request-password-reset/route.ts`, `src/app/api/auth/reset-password/route.ts`
  - Scope: M

- [ ] **Task 8: Profile + lifecycle stage**
  - Acceptance: `GET/PATCH /api/profile` returns and updates name, avatarUrl, self-declared `lifecycleStage`; Zod-validated.
  - Verify: API tests pass; invalid payloads rejected with field errors.
  - Dependencies: Task 6
  - Files: `src/app/profile/page.tsx`, `src/app/api/profile/route.ts`
  - Scope: S

- [ ] **Task 9: Guards + login rate limit + audit**
  - Acceptance: `requireUser()` / `requirePlatformAdmin()` guards in `src/lib/auth-guards.ts`; every `platformAdmin` or `deactivated` change writes an `AuditEntry` in the same operation; 5 failed logins in 15 min trigger a 10-min lock.
  - Verify: guard-matrix test (anonymous / user / admin → 401/403/200); lockout triggers on the 5th failure.
  - Dependencies: Task 6
  - Files: `src/lib/auth-guards.ts`, `src/lib/rate-limit.ts`, `src/lib/audit.ts`
  - Scope: M

- [ ] **Task 10: Admin users + audit viewer**
  - Acceptance: `/admin/users` lists, searches, filters; deactivate/activate and grant/revoke `platformAdmin` take effect; `/admin/audit` renders the audit log read-only.
  - Verify: guard tests prove non-admins get 403 + audit entry; actions appear in `/admin/audit`.
  - Dependencies: Task 9
  - Files: `src/app/admin/users/page.tsx`, `src/app/admin/audit/page.tsx`, `src/app/api/admin/users/route.ts`
  - Scope: M

- [ ] **Task 11: Camp directory research (37 camps, cited)**
  - Acceptance: A data file or doc lists all 36 state camps + FCT with name, state, address, and a public source for each; nothing invented. Coordinates where easily sourced.
  - Verify: Shekinah reviews the sources before seeding; spot-check of 5 camps passes.
  - Dependencies: None (research; can run during Phase 1)
  - Files: `scripts/camp-data.ts` (or a research doc feeding it)
  - Scope: M

- [ ] **Task 12: Camp models + seed script**
  - Acceptance: `Camp`, `CampClaimRequest`, `CampAdmin`, `CampDepartment` models in `src/models/camps/`; `scripts/seed-camps.ts` idempotently upserts the 37 camps with unique slugs/stateCodes and the default department set (unofficial status); status transitions and admin grants write audit entries.
  - Verify: run seed twice → exactly 37 records, no duplicates; model tests pass.
  - Dependencies: Task 4, Task 11
  - Files: `src/models/camps/*.ts`, `scripts/seed-camps.ts`
  - Scope: M

- [ ] **Task 13: Public camp pages**
  - Acceptance: `/camps` (list, state filter, search) and `/camps/[slug]` (profile: address, travel info, contact, status badge — **Community-managed / Claimed by camp crew (unofficial) / Authorized by camp official**) render for anonymous users; `GET /api/camps` + `/api/camps/[slug]` work.
  - Verify: pages render for anonymous users; SEO meta present; unique slugs enforced in tests.
  - Dependencies: Task 12
  - Files: `src/app/camps/page.tsx`, `src/app/camps/[slug]/page.tsx`, `src/app/api/camps/route.ts`
  - Scope: M

- [ ] **Task 14: Claim requests + admin review**
  - Acceptance: any email-verified user can `POST /api/camps/[slug]/claim-request`; `/admin/claim-requests` review queue lets the platform owner approve (→ `CampAdmin` grant, camp → `claimed`, audited) or deny (recorded); grants are revocable.
  - Verify: full flow tested including deny path and revocation; non-admin mutations get 403 + audit.
  - Dependencies: Task 9, Task 12
  - Files: `src/app/api/camps/[slug]/claim-request/route.ts`, `src/app/admin/claim-requests/page.tsx`
  - Scope: M

### Checkpoint B — after Task 14
- [ ] Register → verify → login → browse camps → request a claim works end-to-end
- [ ] Admin guards verified; review with Shekinah

## Phase 3 — Info hub + community + verification

- [ ] **Task 15: InfoArticle model + admin markdown editor**
  - Acceptance: `InfoArticle` model (slug, category, body, tags, campIds, sources, status, publishedAt, reviewedAt); `/admin/info` editor with live markdown preview, publish/unpublish, category + camp tagging; markdown render is sanitized.
  - Verify: CRUD tests pass; `<script>` in body does not survive render (**confirm the launch article list here**).
  - Dependencies: Task 9, Task 12
  - Files: `src/models/info-hub/InfoArticle.ts`, `src/app/admin/info/page.tsx`, `src/lib/markdown.ts`
  - Scope: M

- [ ] **Task 16: Public article pages + search + camp embedding**
  - Acceptance: `/info`, `/info/[category]`, `/info/[category]/[slug]` render published articles with last-reviewed date and sources; header search hits title/body/tags; `/camps/[slug]` shows a related-info section.
  - Verify: search tests return expected articles; drafts invisible publicly; camp page embeds linked articles.
  - Dependencies: Task 15
  - Files: `src/app/info/[category]/[slug]/page.tsx`, `src/lib/search.ts`, `src/components/camps/RelatedInfo.tsx`
  - Scope: M

- [ ] **Task 17: TrustProfile + getTrustTier + vouch APIs**
  - Acceptance: `TrustProfile` model; `getTrustTier(userId)` cached per-request; `POST /api/vouch` (trusted/admin vouchers only) promotes Registered → Vouched with audit; caps enforced (max 3 active vouches per voucher, once per 90 days per user); `POST /api/vouch/[id]/revoke` demotes correctly; schema-shape test asserts no NYSC identity fields.
  - Verify: cap, cooldown, and revocation tests pass; all transitions audited.
  - Dependencies: Task 9, Task 12
  - Files: `src/models/verification/TrustProfile.ts`, `src/lib/trust.ts`, `src/app/api/vouch/route.ts`
  - Scope: M

- [ ] **Task 18: Trust badge UI + /admin/trust**
  - Acceptance: badge on profiles and post author chips carries the honest-copy tooltip ("community trust level… not NYSC membership verification"); `/admin/trust` shows the promotion queue, vouch graph, and manual promote/demote.
  - Verify: badge copy reviewed by Shekinah; admin actions audited.
  - Dependencies: Task 17 (**decide Trusted-seed count here**)
  - Files: `src/components/identity/TrustBadge.tsx`, `src/app/admin/trust/page.tsx`
  - Scope: S

- [ ] **Task 19: Community models + feeds**
  - Acceptance: `Post`, `Comment` (depth 1), `Vote`, `Report` models; `/discuss`, `/discuss/questions`, `/discuss/tips` render feeds sorted recent/top with cursor pagination; tag-filtered views per camp/state/batch.
  - Verify: feed and pagination tests pass; anonymous users read everything.
  - Dependencies: Task 9, Task 12
  - Files: `src/models/community/*.ts`, `src/app/discuss/page.tsx`, `src/lib/feed.ts`
  - Scope: M

- [ ] **Task 20: Tier-gated interactions (stub resolver)**
  - Acceptance: `POST /api/posts`, `/api/posts/[id]/comments`, `/api/vote`, `/api/reports` enforce the tier matrix (registered: comment+vote only; vouched: +posts) against the stub `getTrustTier`; per-tier rate limits applied.
  - Verify: guard matrix test — anonymous/registered/vouched/trusted against each route returns the spec'd 401/403/200; 6th vouched post in a day → 429.
  - Dependencies: Task 19
  - Files: `src/app/api/posts/route.ts`, `src/app/api/vote/route.ts`, `src/lib/tier-gates.ts`
  - Scope: M

- [ ] **Task 21: Moderation queue + actions**
  - Acceptance: `/admin/moderation` lists reports; remove post/comment, warn, ban each write an `AuditEntry`, keep content admin-viewable, and trigger a verification demotion review (via interface hook).
  - Verify: moderation flow tested end-to-end; reporter identity never exposed to the reported user.
  - Dependencies: Task 20
  - Files: `src/app/admin/moderation/page.tsx`, `src/app/api/admin/moderate/route.ts`
  - Scope: M

- [ ] **Task 22: Wire community to the real getTrustTier**
  - Acceptance: stub resolver replaced by `verification`'s real `getTrustTier`; existing community tests unchanged and green; a vouched user can post, a registered user cannot.
  - Verify: full tier-matrix suite passes against the real resolver.
  - Dependencies: Task 17, Task 20
  - Files: `src/lib/trust.ts` (resolver swap), tests
  - Scope: S

### Checkpoint C — after Task 22
- [ ] Community + verification end-to-end; vouched user posts, registered cannot, moderation demotes
- [ ] Review with Shekinah

## Phase 4 — Camp workspace

- [ ] **Task 23: Camp workspace scaffolding + announcements**
  - Acceptance: `CampAnnouncement` model; `/camps/[slug]` upgrades to the workspace landing (announcements feed, pinned first); camp admin can publish/edit/pin/archive within their camp; every surface renders the camp status badge; all queries scoped by campId.
  - Verify: cross-camp access attempt (Kano admin touching Lagos) → 403 + audit; cached page loads measured on a throttled connection.
  - Dependencies: Task 14, Task 22
  - Files: `src/models/camp-workspace/CampAnnouncement.ts`, `src/app/camps/[slug]/page.tsx`, `src/lib/camp-scopes.ts`
  - Scope: M

- [ ] **Task 24: Information boards + FAQs**
  - Acceptance: `CampBoard` curated-list model with seeded board keys (`essential-info`, `faq`, `welfare`, `obs-media`); camp admins edit board posts; boards render on the camp workspace.
  - Verify: board edit flow tested; curated-list semantics (not open threads) hold.
  - Dependencies: Task 23
  - Files: `src/models/camp-workspace/CampBoard.ts`, `src/app/camps/[slug]/boards/[boardKey]/page.tsx`
  - Scope: M

- [ ] **Task 25: Daily schedule + weekly template**
  - Acceptance: `CampSchedule` / `CampEvent` models; camp admin maintains a weekly template; nightly seed generates per-date schedules; `/schedule` shows week + day views; events calendar renders by category. (Design pass on grid vs list mobile UX first.)
  - Verify: template → seed → day view tested; template editor usable at 360px.
  - Dependencies: Task 23
  - Files: `src/models/camp-workspace/CampSchedule.ts`, `src/app/camps/[slug]/schedule/page.tsx`, `scripts/seed-nightly.ts`
  - Scope: M

- [ ] **Task 26: Food timetable**
  - Acceptance: `FoodTimetable` weekly-template model; `/food` renders the current week with instant load (static or cached); admins edit the template; lastUpdatedBy audited.
  - Verify: weekly cycle renders correctly; page load measured on throttled connection.
  - Dependencies: Task 23
  - Files: `src/models/camp-workspace/FoodTimetable.ts`, `src/app/camps/[slug]/food/page.tsx`
  - Scope: M

- [ ] **Task 27: Department pages**
  - Acceptance: `CampDepartment` pages render with `unofficial` / `claimed` / `authorized` labels; department admins edit their own content sections only; scope guard prevents dept admins touching camp-wide settings.
  - Verify: dept-admin scope matrix tested; labels correct per `camps` status.
  - Dependencies: Task 23, Task 14
  - Files: `src/app/camps/[slug]/departments/[key]/page.tsx`, `src/lib/dept-scopes.ts`
  - Scope: M

- [ ] **Task 28: Photo wall + approval queue**
  - Acceptance: `CampPhoto` model; vouched+ uploads land `pending`, trusted publish directly; camp admins approve/reject; photo wall renders on the workspace. (**Hosting decision here** — Vercel Blob vs external.)
  - Verify: approval queue flow tested; dept/camp scope rules hold.
  - Dependencies: Task 23
  - Files: `src/models/camp-workspace/CampPhoto.ts`, `src/app/camps/[slug]/photos/page.tsx`, `src/app/api/camps/[slug]/photos/route.ts`
  - Scope: M

- [ ] **Task 29: Camp discussions integration**
  - Acceptance: camp-scoped discussions reuse `community`'s Post/Comment/Vote with a camp tag; `/camps/[slug]/discuss` renders them; they also appear in the platform feed filtered by camp.
  - Verify: a post made in the camp workspace appears in the platform feed with the camp filter and vice versa.
  - Dependencies: Task 23, Task 22
  - Files: `src/app/camps/[slug]/discuss/page.tsx`, `src/lib/camp-discussions.ts`
  - Scope: M

- [ ] **Task 30: Camp admin surface + scope hardening**
  - Acceptance: `/camps/[slug]/admin` dashboard (announcements, boards, schedule, food, departments, photo queue); full authorization matrix tested for every scope against every mutation route; platform admin oversight + revocation view.
  - Verify: the authorization matrix from `SPEC-camp-workspace.md` passes as automated tests; cross-camp attempts blocked with audit.
  - Dependencies: Tasks 23–29
  - Files: `src/app/camps/[slug]/admin/page.tsx`, `src/lib/camp-auth.ts`
  - Scope: M

### Checkpoint D — after Task 30
- [ ] A camp admin can run the full information flow of a camp
- [ ] Authorization matrix green; review with Shekinah

## Phase 5 — Pilot prep

- [ ] **Task 31: Pilot camp content + dry run**
  - Acceptance: Shekinah's own camp seeded with real announcements, timetable, schedule, departments; the core crew has accounts with the right roles; every pilot flow dry-run end-to-end (register → vouch → post → admin publish → anonymous read).
  - Verify: dry-run checklist completed with the crew; issues logged as follow-up tasks.
  - Dependencies: Task 30, Task 18 (Trusted seeds)
  - Files: seed scripts, `docs/pilot-runbook.md`
  - Scope: M

### Checkpoint E — pilot ready
- [ ] Real content seeded, flows dry-run, crew onboarded
- [ ] Go/no-go with Shekinah
