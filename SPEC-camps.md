# Spec: camps

**Module:** `camps` · **Depends on:** `platform` · **Status:** Approved 2026-10-18

## Objective

The authoritative registry of all 37 NYSC orientation camps (36 states + FCT) that `info-hub`, `community`, and `camp-workspace` all reference: directory records, public profile pages, claim requests with manual review, per-camp admin assignments, and department categories (unofficial until claimed).

## Tech Stack

- Mongoose models + Zod validation.
- Public pages as server components — cache-friendly and SEO-indexable, since prospective corpers arrive via search.
- Seed script `scripts/seed-camps.ts`: idempotent upsert, run manually.

## Models

- **Camp** — slug (unique), name, state, stateCode (unique), address, city, coordinates (optional), travelInfo (markdown), description, contactPhone, contactEmail, status: `'community' | 'claimed' | 'authorized'` (default `community`), claimedBy (User), authorizedBy (User), authorizedAt, timestamps.
- **CampClaimRequest** — campId, requesterId, message, status: `'pending' | 'approved' | 'denied'`, reviewedBy, reviewedAt, reviewNote, timestamps.
- **CampAdmin** — campId, userId, scope: `'camp' | 'department'`, departmentId (when department-scoped), grantedBy, grantedAt, revokedAt. One active grant per (camp, user, scope, department).
- **CampDepartment** — campId, key, name, description, status: `'unofficial' | 'claimed' | 'authorized'`, claimedBy, timestamps. Default seeded set per camp (editable by admins): OBS/Media, Editorial & Publicity, Medical, Sports & Recreation, Man O' War, Sanitation, Religious (Christian), Religious (Muslim), Drama & Culture, Socials & Welfare.

## Surface

- Public: `/camps` (list, filter by state, search) and `/camps/[slug]` (profile: address, travel info, contact, status badge)
- Public API: `GET /api/camps`, `GET /api/camps/[slug]`
- Claim: `POST /api/camps/[slug]/claim-request` (any email-verified user)
- Admin (platformAdmin only): `/admin/camps` (CRUD directory records), `/admin/claim-requests` (review queue)
- Status badges (exact copy, used on every camp surface): **Community-managed** · **Claimed by camp crew (unofficial)** · **Authorized by camp official**

## Status semantics

- `community` — no workspace owner; content (when `camp-workspace` lands) is community-managed.
- `claimed` — a crew runs the workspace after manual claim approval. Still unofficial.
- `authorized` — granted only via the separate authorization process, confirmed through a legitimate camp official or another reliable channel. This is what distinguishes officially authorized camp spaces from community ones.

Ownership is never granted automatically. Only the platform owner creates or modifies camp directory records in v1.

## Seed data

37 camps with real names, states, and addresses. **Each address verified against public NYSC sources at implementation time (research task with citations, per source-driven-development) — never invented.** Slug format is state-based and resolved uniquely (e.g. `lagos`, `fct-abuja`).

## Testing Strategy

- Integration: seed idempotency (run twice, same 37 records), unique slug and stateCode enforcement, claim flow (request → pending → approve → CampAdmin grant + status change + audit; deny path records review).
- Guard tests: public reads return 200 for anonymous users; all mutations return 403 for non-admins plus an AuditEntry.
- Slug edge cases: FCT, states with similar names.

## Boundaries

- **Always:** audit every status transition and admin grant/revoke; render the status badge on every camp surface.
- **Ask first:** letting anyone but the platform owner mutate directory records; auto-approving claims; map embeds.
- **Never:** mark a camp `authorized` without the separate authorization process; expose claim-requester contact channels publicly.

## Success Criteria

- Seed populates exactly 37 camps, idempotently, with unique slugs.
- Public pages render for anonymous users with correct status badges.
- All mutations guarded server-side; non-admins get 403 plus audit.
- Claim flow works end-to-end with manual approval; grants are revocable.
- Departments seeded with unofficial labels.

## Open Questions

- Exact camp addresses (research task at implementation).
- Coordinates: store now if easily sourced (for future maps) and link out to external maps in v1, or defer entirely.
