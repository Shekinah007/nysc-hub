# Capability Map: NYSC-Hub

**Status:** Approved by Shekinah 2026-10-18 (module boundaries, dependency direction, build order).
**Amendment 2026-10-18:** `community` gains a read-only interface dependency on `verification` (trust-tier privilege gating). Parallel build order is preserved: `community` ships with a tier stub until `verification` lands.

| Module id | Responsibility | Depends on |
|---|---|---|
| `platform` | App skeleton, design system, config, deploy pipeline | — |
| `identity` | Accounts, auth, sessions, profiles, lifecycle stage, roles | `platform` |
| `camps` | Registry of the 37 camps (36 states + FCT): directory records, claim requests, per-camp admin assignments, department categories | `platform` |
| `info-hub` | Requirements, fees, travel guidance, relocation content + search | `camps` |
| `community` | Platform-wide feed, posts, Q&A, comments, tags by camp/batch/state; moderation | `identity`, `camps`, `verification` (interface only) |
| `verification` | Community trust tiers: Registered, Community Vouched, Trusted Community Member; vouching with rate limits and abuse controls | `identity`, `camps` |
| `camp-workspace` | Per-camp spaces: announcements, boards, FAQs, schedules, calendar, food timetables, departments, photos, discussions, admin tools (Phase 1) | `camps`, `identity`, `verification` |

**Build order:** `platform` → `identity` + `camps` (parallel) → `info-hub` + `community` + `verification` (parallel) → `camp-workspace`

## Approved decisions

1. **Camp-workspace phases.** Architecture accommodates all phases; only Phase 1 is implemented initially. Department categories exist from the beginning; until authorized representatives claim them, department pages are clearly labelled unofficial or community-managed.
   - **Phase 1:** camp announcements, information boards, FAQs, daily schedules, event calendar, food timetables, basic department pages, photo posts, community discussions, essential administrative tools for publishing, editing, pinning, and moderating content.
   - **Phase 2:** comments (on content items), reactions, polls, interest groups, platoon spaces, media galleries, competitions, voting, advanced moderation.
   - **Phase 3:** private messaging, group chat, marketplace, business promotion, inter-camp competitions, alumni networking.
2. **Camp-space creation and ownership.** The platform is seeded with a directory of the 37 NYSC orientation camps. Only the platform owner creates or modifies camp directory records in v1. Users can request to claim a camp workspace, but ownership is never granted automatically — the platform owner manually reviews requests. Official status requires a separate authorization process, ideally confirmed through a legitimate camp official or another reliable channel. Approved camp administrators manage their own camp; department administrators manage only their assigned departments. Server-side authorization, audited administrative actions, revocable access. Community spaces are distinguishable from officially authorized camp spaces.
3. **Verification tiers = community trust, not NYSC identity.**
   - **Registered:** email-authenticated account with standard community access.
   - **Community Vouched:** an established member vouches for the user, subject to rate limits and abuse controls.
   - **Trusted Community Member:** earned through account standing, history, and moderation criteria; may unlock additional community privileges.
   - **Authorized Representative:** a separate administrative designation (implemented as identity/camps roles granted via the claim/authorization process), NOT a community trust tier.
   - Vouching is never presented as proof of NYSC membership. v1 collects and stores no state codes, call-up numbers, call-up letters, or identity documents. No claims of verifying NYSC status without an approved verification channel. Camp administration authorization stays separate from community trust.
4. **Implementation principle.** v1 stays achievable for a solo developer: a secure, useful, mobile-first pilot. Build expansion points without implementing future features upfront. Value before official integration — public camp info, community interaction, schedules, department updates, and networking all provide value independently. Official authorization and trust labels are introduced carefully as the project grows.
5. **info-hub v2 deferrals (2026-10-18).** Community-contributed wiki editing, versioned article revisions, and video content are deferred to v2 — explicitly planned, not permanently excluded. The v1 data model (`updatedAt` / `reviewedAt` audit fields) is chosen so the v2 revision history can layer on without a migration.
