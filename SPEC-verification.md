# Spec: verification

**Module:** `verification` · **Depends on:** `identity`, `camps` · **Status:** Approved 2026-10-18

## Objective

The community trust ladder that gates community privileges — Registered → Community Vouched → Trusted Community Member — with vouching, rate limits, and abuse controls. This is explicitly **community trust, not NYSC identity verification**: vouching is never presented as proof of NYSC membership, v1 collects no NYSC identity data whatsoever, and every user-facing label says so plainly.

Who: all registered users; admins managing the trust ladder.

## Tech Stack

- Mongoose models + Zod validation.
- Exports `getTrustTier(userId): Promise<Tier>` — the single interface `community` and `camp-workspace` consume.
- All trust transitions write to the shared `AuditEntry`.

## Models

- **TrustProfile** — userId (unique), tier: `'registered' | 'vouched' | 'trusted'`, activeVouches (array of Vouch records: voucherId, vouchedAt, revokedAt?), tierHistory (array of { tier, changedAt, reason }), standingFlags (e.g. `recentModStrike`), timestamps.

## Tier semantics

- **Registered** — email-authenticated account, standard community access. Every account starts here.
- **Community Vouched** — a Trusted Community Member (or platformAdmin) vouched for them. Unlocks post creation.
- **Trusted Community Member** — earned through account standing, history, and moderation criteria; reviewed and promoted by a platformAdmin. Unlocks elevated rate limits and elevated report weight.
- **Authorized Representative** — deliberately NOT a trust tier. It is a separate administrative designation: the camp-admin / dept-admin roles from the `camps` claim and authorization process. Camp administration authorization stays separate from community trust at all times.

## Vouching mechanics

- Who can vouch: **Trusted Community Members and platformAdmins**.
- Rate limits and abuse controls: a voucher may hold max **3 active vouches** at a time; a user may be vouched max **once per 90 days** (re-vouch allowed after that window).
- Revocation: the voucher or an admin can revoke a vouch at any time; revoking the vouch that promoted a user demotes them back to registered (only if no other active vouch exists).
- Automatic demotion: any moderation strike demotes the user one tier, pending admin review.
- Admin tooling: `/admin/trust` — promotion review queue, vouch graph viewer, manual promote/demote.

## Honest-copy requirement

Every badge and label must state plainly what it is and is not. Working copy (final-reviewed at implementation):

> "Community trust level — vouched for by a trusted community member. This is not NYSC membership verification."

The badge tooltip, the trust page, and any onboarding text all carry equivalent language. No label, badge, or copy may imply official NYSC verification.

## Surface

- Public: trust badge on user profiles and post author chips (with the honest tooltip)
- API: `POST /api/vouch` (voucher action), `POST /api/vouch/[id]/revoke`
- Admin: `/admin/trust`
- Lib: `getTrustTier(userId)` — cached per-request

## Commands

```
Tests:  npm run test -- verification
```

## Code Style

Follows `SPEC-platform.md`. Tier transitions are a single service function: `setTrustTier(userId, tier, reason)` — writes TrustProfile, appends tierHistory, writes AuditEntry, and (if applicable) invalidates cached gates.

## Testing Strategy

- Integration: vouch flow Registered → Vouched (writes audit, enforces the 3-active-vouch cap), vouch cooldown (second vouch within 90 days rejected), revocation demotes correctly.
- Demotion-on-strike: a moderation strike from `community` demotes one tier; re-promotion requires admin action.
- Interface test: `getTrustTier` returns correct tier for each profile state, including cached resolution within a request.
- Schema-shape test: assert no fields exist anywhere in this module for NYSC state codes, call-up numbers, call-up letters, or identity documents.

## Boundaries

- **Always:** audit every tier transition; render honest-copy alongside every trust badge; enforce vouch rate limits server-side.
- **Ask first:** changing tier semantics, voucher caps, or cooldowns; any future NYSC-database integration.
- **Never:** collect or store state codes, call-up numbers, call-up letters, or identity documents (v1 constraint, permanent until an approved verification channel exists); present vouching as proof of NYSC membership; conflate trust tiers with the Authorized Representative designation.

## Success Criteria

- Vouch flow promotes Registered → Vouched with audit; caps and cooldown enforced server-side.
- Revocation and demotion paths work and are audited.
- Honest-copy badge renders on profiles and author chips.
- `getTrustTier()` returns correct values across all three tiers.
- No code path anywhere in the module collects or displays NYSC identity data.

## Open Questions

- Bootstrap: the platform owner is Trusted by seed; the first wave of Trusted members needs a manual promotion path (already in `/admin/trust`) — worth deciding how many Trusted members to seed from your own camp connections before public launch.
- Whether Trusted promotion should require a minimum account age or activity threshold (proposed: yes — 30 days + 10 constructive posts; tuned at implementation).
