# nysc-hub — status

**Project repo root.** The Next.js app lives in `app/` (created by `create-next-app` with `--src-dir`).

## Progress

- [x] Intent confirmed → `docs/intent/nysc-hub.md`
- [x] Capability map approved → `CAPABILITY-MAP.md`
- [x] 7 module specs approved → `SPEC-*.md`
- [x] Implementation plan + 31 tasks → `tasks/plan.md`, `tasks/todo.md`
- [x] **Task 1 (scaffold)** — Next.js 16.4.2 App Router + TS strict + Tailwind 4 + ESLint + Turbopack; zod env validation; `/api/health`; root error boundary; vitest + RTL harness; 6 tests green; build/typecheck/lint clean
- [ ] Task 2 — design tokens + base UI components
- [ ] Task 3 — CI + Vercel deploy pipeline
- [ ] Tasks 4–31 — see `tasks/todo.md`

## Environment gotcha (this machine)

`npm install` requires `--ignore-scripts` (global npmrc sets `allow-scripts=node-pty`), and a cold install takes several minutes — always run it in the background with a long timeout. Exit+verified via `node_modules/.bin/next` presence and `npm run build`.
