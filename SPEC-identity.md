# Spec: identity

**Module:** `identity` · **Depends on:** `platform` · **Status:** Approved 2026-10-18

## Objective

Secure email/password authentication with email verification, database-backed revocable sessions, user profiles carrying a self-declared lifecycle stage, the platform-admin role, and the admin tooling plus shared audit log that `camps` and `camp-workspace` build on.

Who: every user of NYSC-Hub (prospective corpers, serving corpers, ex-corpers) and the platform owner administering them.

## Tech Stack

- **Auth.js (NextAuth v5)** — credentials provider (email + password). Mongoose-backed session/user storage: either the official MongoDB adapter pattern extended with our fields, or a thin custom adapter over Mongoose models — decided at implementation, verified against Auth.js v5 docs (source-driven-development).
- **bcryptjs** for password hashing (pure JS, deploys anywhere; argon2id documented as an upgrade path).
- **Database sessions, not JWT** — deactivation or role changes must kill live sessions.
- **Resend** (or equivalent) behind an `EmailSender` interface for verification and password-reset mail — swappable, no vendor lock at call sites.

## Models (Mongoose)

- **User** — email (unique, lowercased), passwordHash, name, avatarUrl, lifecycleStage: `'prospective' | 'serving' | 'finished'` (self-declared, freely editable), platformAdmin: boolean, deactivated: boolean, emailVerifiedAt, timestamps. **Schema guard: no fields for NYSC state codes, call-up numbers, or identity documents — a permanent v1 constraint.**
- **EmailToken** — userId, tokenHash (SHA-256 of the token), purpose: `'verify-email' | 'password-reset'`, expiresAt (15 minutes), usedAt.
- **AuditEntry** — actorId, action, targetType, targetId, metadata (before/after), createdAt. Written by `identity`, `camps`, and `camp-workspace` through one shared service.

## Surface

- Pages: `/register`, `/login`, `/verify-email`, `/reset-password`, `/profile`
- API: `POST /api/auth/register`, `POST /api/auth/verify-email`, `POST /api/auth/request-password-reset`, `POST /api/auth/reset-password`, the Auth.js catch-all handler, `GET/PATCH /api/profile`
- Guards (server-side only — client-side checks are cosmetic, never the enforcement): `requireUser()`, `requirePlatformAdmin()`, used by every protected route handler.
- Admin: `/admin/users` (search, filter, deactivate/activate, grant/revoke platformAdmin), `/admin/audit` (read-only viewer)
- Login rate limit: Mongo-backed counter — 5 failures per account within 15 minutes triggers a 10-minute lock.

## Commands

Platform commands plus module-scoped test selection:

```
Typecheck:  npx tsc --noEmit
Tests:      npm run test -- identity
```

## Code Style

Follows `SPEC-platform.md`. Notable: guard helpers live in `src/lib/auth-guards.ts`; every User mutation that changes `platformAdmin` or `deactivated` writes an AuditEntry in the same operation.

## Testing Strategy

- Integration tests against mongodb-memory-server: register → verification email → verify → login → session persists → logout destroys session.
- Guard matrix: anonymous / user / platformAdmin against each protected route — expected 401 / 403 / 200.
- Rate limit: lock triggers after 5 failures, clears after the window.
- Password reset: full token flow, including expired and reused tokens rejected.
- Schema-shape test: assert no NYSC identity fields exist on User.

## Boundaries

- **Always:** hash passwords with bcryptjs (cost 12 or higher); audit every platformAdmin or deactivation change; Zod-validate all inputs.
- **Ask first:** adding social login, MFA, phone-based flows, or any new auth dependency.
- **Never:** store NYSC identity data (state codes, call-up numbers, call-up letters, ID documents) anywhere; log tokens or password hashes; send marketing email.

## Success Criteria

- Fresh environment: register → verification email arrives → verify → login works; session survives refresh; logout kills the session server-side.
- Deactivating a user invalidates their live session on the next request.
- Non-admin hitting an admin route gets 403 plus an AuditEntry; platformAdmin passes.
- Password reset works end-to-end; expired and reused tokens are rejected.
- Login lockout triggers on 5 failures.
- No NYSC identity fields exist in the schema (verified by the schema-shape test).

## Open Questions

- Transactional email: which provider and sending domain (Resend free tier is likely sufficient for pilot volume; requires a domain the platform owner controls).
- First platform-admin bootstrap: interactive one-time setup route vs manual DB promotion.
