# Implementation Plan: NYSC-Hub

## Overview

Build the approved 7-module spec set (`SPEC-*.md`) as a single Next.js full-stack app on MongoDB Atlas: platform foundation → identity + camps in parallel → info-hub + community + verification in parallel → camp-workspace. Each task is a vertical slice (schema + API + UI) that leaves the system working, sized S/M so it fits one focused session. The pilot target is Shekinah's own camp during his service year.

## Architecture decisions

- **Single Next.js App Router app**, no separate backend in v1. Server components + route handlers; client islands only where interactivity demands.
- **Mongoose on MongoDB Atlas**, mongodb-memory-server for integration tests. Connection lib + models per module folder.
- **Auth.js v5 with database sessions** (revocable when a user is deactivated). If the official Mongoose adapter fights us, fall back to a thin custom adapter — decided at implementation, verified against Auth.js v5 docs (source-driven-development).
- **`getTrustTier()` as an interface** between community and verification, so community ships with a stub and parallel build order survives.
- **Camp discussions reuse `community`'s Post model** with a camp tag — one discussion system, one moderation queue (approved decision; revisit if camp content needs isolation).
- **Static/cached pages for announcements and food timetable** — camp connectivity is poor; these are the most-refreshed pages and must be cache-friendly without realtime.

## Phases and build order

### Phase 1 — Foundation (`platform`)
Tasks 1–3. Sequential; everything else builds on this.

### Phase 2 — Identity + camps (parallel-safe)
Tasks 4–10 (identity), 11–14 (camps). Two developers could take a stream each; solo, do identity first (auth guards unblock everything).

### Phase 3 — Info hub + community + verification (parallel-safe)
Tasks 15–22. `community` uses the tier stub until Task 22 swaps in the real resolver.

### Phase 4 — Camp workspace
Tasks 23–31. The biggest module; each content type is its own vertical slice.

### Phase 5 — Pilot prep
Task 32. Seed real content for the pilot camp, dry-run the flows, hand to the camp crew.

## Checkpoints

- **Checkpoint A (after Task 3):** build, lint, typecheck, tests green; Vercel preview deploys on PR.
- **Checkpoint B (after Task 14):** auth + camps end-to-end; register → login → see camp profiles; admin guard works.
- **Checkpoint C (after Task 22):** community + verification wired; vouched user can post, registered cannot.
- **Checkpoint D (after Task 31):** a camp admin can run announcements, boards, schedule, food, departments, photos.
- **Checkpoint E (after Task 32):** pilot-ready — real content seeded, flows dry-run in the pilot camp.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Camp address/details research inaccurate | High — trust motor of the directory | Task 11 is a cited research task; nothing is seeded without sources; reviewed before seed runs |
| Auth.js v5 + Mongoose adapter friction | Medium | Verify against official docs at implementation; custom-adapter fallback documented in `SPEC-identity.md` |
| Email deliverability for verification | High — blocks signup | Resend + a domain the owner controls; console sender in dev; Task 5 confirms flow before dependent work |
| Photo hosting bandwidth cost | Medium | Decide at Task 29 (Vercel Blob vs external host); bandwidth cost decides, not convenience |
| Poor camp connectivity degrades experience | High — pilot fails on this | Static/cached pages for the most-refreshed content; measured at Task 23/26, not assumed |
| Pilot window closes at POP | High | Phase order front-loads the camp-critical path; pilot prep is a task, not an afterthought |
| Solo-dev scope creep | Medium | Out-of-scope lists in every spec; Phase 2/3 features rejected against the capability map |

## Open questions (need input before or during implementation)

1. Launch article list for `info-hub` (proposed set in `SPEC-info-hub.md`) — confirm at Task 15.
2. Transactional email sending domain — needed by Task 5.
3. Photo hosting decision — Task 29.
4. How many Trusted members to seed from your camp connections before public launch — Task 18/32.

## Parallelization

With additional agents/sessions: identity ∥ camps after Phase 1; info-hub ∥ community ∥ verification after Phase 2. Camp-workspace content types (announcements, boards, schedule, food, events, departments, photos) can interleave once their shared camp-context + admin-scope scaffolding (Task 23) exists. Sequential: everything touching the `User`/`Camp` schemas, and all schema migrations.
