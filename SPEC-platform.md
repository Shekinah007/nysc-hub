# Spec: platform

**Module:** `platform` · **Depends on:** — · **Status:** Approved 2026-10-18

## Objective

The production-ready foundation every other NYSC-Hub module builds on: a Next.js (App Router) + TypeScript project with a design token system, base UI components, validated environment config, lint/format/typecheck/test tooling, CI, and a Vercel deploy pipeline. No feature code (auth, database, content) lives here.

Who benefits: every downstream module, and the solo developer — one consistent set of primitives and conventions, no re-litigating basics per module.

## Tech Stack

- **Next.js, App Router** — latest stable major at scaffold time; pin the exact version in `package.json` and record it here once scaffolded (verify the current major against official Next.js docs at implementation time, per source-driven-development).
- **TypeScript**, strict mode.
- **Tailwind CSS** with CSS-variable design tokens (colors, spacing, type scale, radii).
- **Zod** for environment and input validation.
- **Vitest + React Testing Library** for unit and integration tests.
- **Vercel** for hosting: preview deploy per PR, production on `main`.
- Deliberately NOT installed here: Auth.js, Mongoose, email SDK — those arrive with `identity` and `camps`.

## Commands

```
Dev:        npm run dev
Build:      npm run build
Test:       npm run test              # vitest run
Coverage:   npm run test -- --coverage
Typecheck:  npx tsc --noEmit
Lint:       npm run lint
Format:     npx prettier --write .
```

## Project Structure

```
nysc-hub/
├─ src/
│  ├─ app/                  # Routes: pages, layouts, route handlers
│  ├─ components/
│  │  ├─ base/              # Button, Input, Card, Avatar, Badge, Alert, Modal, Toast
│  │  └─ [module]/          # Module-scoped components as modules land
│  ├─ lib/                  # db connection, auth guards, validation, utils
│  ├─ models/               # Mongoose models, one folder per module
│  ├─ config/               # env.ts (zod-validated), site.ts, tokens
│  └─ styles/               # globals.css, Tailwind entry
├─ scripts/                 # Seed and maintenance scripts (camps seed lands with `camps`)
├─ tests/                   # Test setup + cross-module integration tests
├─ docs/                    # intent + project docs (module specs live at root)
├─ CAPABILITY-MAP.md        # Approved capability map — the index of what exists
├─ SPEC-*.md                # One spec per module id
└─ package.json, tsconfig.json, eslint config, prettier config, vercel.json
```

## Code Style

One real snippet beats three paragraphs. The house style:

```tsx
// src/components/base/Badge.tsx
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type BadgeProps = {
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
  children: ReactNode
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={cn(badgeBase, badgeTone[tone])}>{children}</span>
}
```

- Named exports for components and lib functions; default exports only where Next.js requires them (pages, layouts).
- Server components by default; `'use client'` only for interactivity.
- No trailing semicolons, single quotes, 2-space indent (Prettier enforced).
- All external input validated with Zod at the boundary (route handlers, server actions, env).
- Mobile-first: every layout and component is designed at 360px width first.

## Testing Strategy

- **Vitest + React Testing Library** for base components and utils.
- Database-backed tests arrive with `identity` and `camps` (mongodb-memory-server) — platform-level testing is components and config only.
- CI gate: typecheck + lint + test must pass before merge.

## Boundaries

- **Always:** run typecheck, lint, and test before commits; strict TypeScript; Zod-validate all inputs; mobile-first layouts.
- **Ask first:** any dependency beyond the scaffold set listed above; CI changes; design-token changes (they ripple into every module).
- **Never:** commit `.env` or secrets; globally disable lint rules; add PWA, native-mobile, or offline features in v1.

## Success Criteria

- `npm run build` passes clean on a fresh clone with only the required env vars set.
- CI green on the first PR; Vercel preview deploys per PR; production deploys on merge to `main`.
- Env validation fails fast with a readable error when a variable is missing.
- Base components render correctly in an internal `/dev/components` showcase route (noindex) — Storybook optional, not required.
- Error boundary and `/api/health` route respond correctly.

## Open Questions

- Exact Next.js major to pin (verify at scaffold time).
- Storybook: nice-to-have, decided after `platform` lands — the showcase route may be enough.
