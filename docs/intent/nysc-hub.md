# NYSC-Hub — Statement of Intent

**Status:** Confirmed by Shekinah, 2026-10-17
**Origin:** `interview-me` skill, interactive intent-extraction session
**Next step:** consumed by `spec-driven-development` — capability map and module specs live at the project root (`CAPABILITY-MAP.md`, `SPEC-*.md`). Approved: `platform`, `identity`, `camps` (2026-10-18).

## Outcome

A web platform covering the full NYSC corper lifecycle — prospective applicants → currently serving corpers → finished corpers — with three cores shipping **together from day one**:

1. **Information hub** — camp document requirements, expected fees, travel guidance and getting to the right camp location, relocation procedures, and pre-camp preparation generally.
2. **Community** — prospective applicants, serving corpers, and ex-corpers communicating, asking questions, and sharing information across batches and states. Community is a co-equal core, not a bolt-on.
3. **Per-camp workspaces** — each state camp runs its own individual space under the broader interconnected system: announcements, information boards, food timetables, media/OBS, in-camp competitions (pageants, marching, event nights, football) and a voting system for those competitions.

## Users

- **Primary:** prospective NYSC applicants (pre-camp: requirements, fees, travel, what to expect).
- **Primary:** currently serving corpers (community + their camp's workspace + mid-service info like relocation).
- **Real requirement, not afterthought:** ex-corpers — the platform stays useful after POP.
- **Camp workspace operators:** corper crews (media/OBS team, announcers, competition organizers) can run a camp space semi-independently; NYSC camp officials can be invited in and adopt it later. No official permission is required to start a camp space.

## Why now

Shekinah is **currently serving as a corper** — live pain, a live pilot camp, and live personal connections with camp crews and officials. That window closes at POP. The pains that motivated this project, experienced firsthand: information issues around camp document requirements, relocation, fees, travelling to camp and getting the right location, and searching for camp requirements.

## Success

- His own camp actually using it during his service year: announcements read, votes cast, food timetable checked — real usage, not just signups.
- Prospective corpers finding the information they need before camp via the info hub and community.

## Constraints

- Solo developer, bootstrapped, cost-conscious. Planned infra consistent with existing stack: Next.js/React + TypeScript + MongoDB/Mongoose (MongoDB Atlas); NestJS only if a separate backend becomes warranted.
- **No access to the official NYSC database.** Corper verification starts human/community-based: unverified users can join the public community; "verified member of Batch X, Camp Y" is a tiered trust level established via state code + call-up number checks and crew vouching — not database-backed identity.
- **Monetization is open.** Ads are the leading idea, genuinely TBD. Nigerian traffic needs serious scale for meaningful ad revenue, so this must not drive v1 design. Audience first.

## Out of scope for v1

- Official NYSC integration or anything requiring NYSC HQ sign-off
- Native mobile apps (web first; mobile-responsive)
- Database-backed identity verification against NYSC systems

## Open questions carried into the spec

1. Verification mechanism specifics — what tiers exist, who can vouch, what verification gates.
2. Camp workspace day-one scope — full feature set vs. pilot subset for his own camp.
3. How camp spaces get created and owned (37 camps: 36 states + FCT), and how to prevent squatting/impersonation of a camp before its real crew arrives.
4. Monetization model (parked; audience-first).
