# Spec: camp-workspace

**Module:** `camp-workspace` · **Depends on:** `camps`, `identity`, `verification` · **Status:** Approved 2026-10-18

## Objective

Every camp's home base on the platform — its own space under the interconnected system, run by its crew: announcements, information boards, FAQs, daily schedules, event calendar, food timetables, department pages, photos, and discussions, with the publishing and moderation tools to keep them. This is the module that makes camp life easier and more fun for corpers and easier to manage for the camp — and the reason the platform earns its "each camp has its own system" identity.

Who: serving corpers at a camp (read everything, interact per trust tier), camp/department admins (publish and moderate within their scope), the platform owner (oversight), prospective corpers (preview camp life from the outside).

## Tech Stack

- Mongoose models + Zod validation.
- Server-rendered pages, cache-friendly for announcements and food timetable (the pages people refresh most).
- No realtime or polling in v1 — admins push, users refresh. Competitions and voting are Phase 2.
- Trust tiers consumed through `getTrustTier()` from `verification`; camp/department roles consumed through `CampAdmin` grants from `camps`.
- All admin actions write to the shared `AuditEntry`.

## Models

- **CampAnnouncement** — campId, title, body markdown, pinned, status: `'published' | 'draft' | 'archived'`, publishedAt, authorId, timestamps.
- **CampBoard** — campId, boardKey (unique per camp: `essential-info` | `faq` | `welfare` | `obs-media` …), title, description, posts: embedded list of { body markdown, authorId, pinned, timestamps }. Boards are curated lists, not open threads — that's what makes them information boards rather than duplicate discussions.
- **CampSchedule** — campId, date, slots: [{ time, activity }], notes. One per camp per date; seeded nightly from a weekly template the camp admin maintains.
- **CampEvent** — campId, title, date, startTime, endTime, venue, description, category: `'official' | 'social' | 'sports' | 'religious' | 'cultural'`, timestamps.
- **FoodTimetable** — campId, weekTemplate: [{ day: 'mon'..'sun', meals: { breakfast, lunch, dinner } }], currentWeekStart, lastUpdatedBy, timestamps. The single most-checked page in camp; designed for instant load and weekly reuse.
- **CampDepartment** — inherited from `camps` (key, name, description, status, claimedBy). This module renders the department pages and adds: headId (optional), meetingTime, notes, contentSections (markdown blocks the dept admin can edit).
- **CampPhoto** — campId, url, caption, uploadedBy, status: `'published' | 'pending' | 'rejected'`, timestamps. Uploads by vouched+ users are pending until a camp admin approves; trusted users publish directly. (Phase 2 adds full media galleries — v1 is a simple photo wall.)
- **CampDiscussion** — campId, and reuse of `community`'s Post/Comment/Vote machinery scoped by camp tag. Not a duplicate system: camp discussions are community posts with a camp filter and a home in the camp workspace.

## Surface

- Public camp home: `/camps/[slug]` — upgrades the `camps` profile page into the workspace landing: announcements feed (pinned first), essential info board, today's schedule, food timetable quick-view, department roster, photo wall, discussions. Status badge from `camps` renders throughout so community vs. authorized is always visible.
- Sections: `/camps/[slug]/announcements`, `/boards/[boardKey]`, `/schedule` (week view + day view), `/events`, `/food`, `/departments`, `/departments/[key]`, `/photos`, `/discuss` (camp-scoped)
- Camp admin: `/camps/[slug]/admin` — publish/edit/pin/announcements, edit boards, maintain schedule templates + events, edit food timetable, manage photo approval queue, scope-limited to their camp
- Department admin: same admin surface, scoped to their department's content sections only
- Platform admin: `/admin/camp-workspace` — cross-camp oversight, revocable grants, audit view

## Authorization

Scopes, enforced server-side only:

| Scope | Who | Can |
|---|---|---|
| Camp admin | holder of an active `CampAdmin` grant with scope `camp` | everything in their camp, incl. approving photos and moderating camp discussions |
| Department admin | holder of an active grant with scope `department` | edit their department page content sections and post to its board |
| Platform admin | platform owner | oversight, revoke grants, audit |
| Vouched+ users | trust tier ≥ vouched | upload photos (pending approval), participate in discussions |
| Registered | any verified account | read everything, comment and vote |
| Anonymous | — | read everything |

Camp admin grants come from the `camps` claim/authorization process — never self-serve, always revocable, always audited.

## Testing Strategy

- Integration: announcement publish/pin/archive; board post edit; schedule template → nightly seed; food timetable weekly cycle; photo approval queue (vouched upload → pending → admin approve → published; trusted upload → direct publish).
- Authorization matrix: each scope against each mutation route — cross-camp access attempts return 403 plus audit (a Kano admin touching Lagos data is the canonical attack to test).
- Integration with `community`: a camp discussion post appears both in the camp workspace and in the platform feed filtered by camp tag.
- Status badge test: every camp page renders the correct `camps` status badge.

## Boundaries

- **Always:** scope every query by campId server-side; audit all admin actions; render the camp status badge on every workspace surface; keep removed content admin-viewable.
- **Ask first:** realtime updates, push notifications, competitions and voting (Phase 2); anything that implies official NYSC endorsement of a community-managed camp space.
- **NEVER:** expose one camp's data through another camp's routes; let a department admin touch camp-wide settings; allow self-serve admin grants.

## Success criteria

- A camp admin can run the whole 3-week information flow of a camp from the admin surface: announcements, boards, schedules, food, departments, photos.
- All authorization scopes enforced server-side; cross-camp attempts blocked with audit.
- Anonymous visitors can view any camp's workspace; interaction requires an account; content contribution requires vouched+.
- Food timetable and announcements load fast on a poor camp connection (static or cached pages — measured, not assumed).
- Camp discussions appear in both the workspace and the platform feed.

## Out of scope for v1 (Phase 2/3 roadmap)

- Comments on announcements and board posts, reactions, polls
- Competitions (pageants, marching, event nights, football) and the voting system
- Media galleries (photo wall is the v1 placeholder)
- Platoon spaces, interest groups
- Realtime updates and notifications
- Marketplace, business promotion, inter-camp competitions, alumni networking

## Open questions

1. **Photo storage** — where images are hosted (Vercel Blob vs. an external image host). Bandwidth cost on a bootstrapped budget is the deciding factor; decide at implementation.
2. **Weekly schedule template UX** — whether the template editor is a grid (fast, cramped on mobile) or a list (slower, mobile-friendly). Mobile-first suggests list; needs a design pass.
3. **Camp discussion identity** — camp-scoped discussions live in `community`'s Post model with a camp tag vs. a dedicated `CampDiscussion` model with shared rendering. My read: reuse `community` (one discussion system, one moderation queue) — flag if you'd rather isolate camp content.
