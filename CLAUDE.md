# CLAUDE.md

Demo app for a short meet-up talk on Cloudflare Workers: a ticket booking app built on a Worker, a Durable Object (`EventSale`), a Workflow (`ReservationWorkflow`) and D1. `plan.md` holds the design (architecture, reservation flow, reliability layers, data model, demo script). Read it before making changes. `talk.md` holds key facts that will be expanded to speaker notes.

## Tooling

- Uses the new `cf` CLI (<https://developers.cloudflare.com/cf/>), which replaces `wrangler`. Config lives in `cloudflare.config.ts` (bindings via `bindings.*` from `cf/config`), not `wrangler.jsonc`. The config sketch in `plan.md` uses wrangler syntax, so translate it.
- Node and pnpm versions are pinned in `mise.toml`, which also puts `node_modules/.bin` on `PATH`.
- TypeScript, built with Vite and `@cloudflare/vite-plugin`. Access bindings with `import { env } from "cloudflare:workers"`.

## Layout

No SSR framework: the front end is a client-only React app served as static assets, and the Worker is a Hono app that only handles `/api/*`.

- `src/worker/`: Hono routes (`index.ts`), the `EventSale` DO, `ReservationWorkflow` and the fake payment provider (`payments.ts`). Type-checked with Workers runtime types (root `tsconfig.json`).
- `src/client/`: React. Two pages, `index.html` (buyer, phones) and `dashboard.html` (projector), each its own Vite entry. It has its own `tsconfig.json` with DOM types, because DOM types and Workers types conflict.
- `migrations/`: D1 schema, applied by `scripts/db-migrate.ts` (`pnpm db:migrate`). `cf d1 migrations apply` only accepts a database ID, so the script looks up the production database by name (creating it if needed). Locally the D1 binding gets a fixed ID, `LOCAL_DB_ID` in `database.ts`.
- `scripts/`: Node scripts, with their own `tsconfig.json` and Node types.
- `src/shared/`: plain types used by both. It must not import from `cloudflare:workers` or the DOM.
- Pick an event with `?event=<id>` (default `demo`). Each event ID is its own DO.

## Commands

- `pnpm dev`: apply D1 migrations locally, then start the local dev server (DOs, Workflows and D1 all run locally)
- `pnpm db:migrate`: apply D1 migrations to production, creating the database if needed. Add `--local` for the local database.
- `pnpm typecheck`: generate Worker types, then run `tsc`
- `pnpm format`: run Prettier (also runs on staged files via a husky pre-commit hook)
- `pnpm run deploy`: apply D1 migrations to production, then deploy to Cloudflare (plain `pnpm deploy` is pnpm's built-in workspace deploy, not this script)

## Testing

End-to-end tests only, using Playwright against the local dev server. Showing off local emulation is part of the talk, so test the real system instead of mocks.

- Test contention with several browser contexts at once (e.g. two buyers holding the same seat).
- Use the chaos controls to drive failures, so the tests double as demo rehearsals. Keep chaos deterministic in tests: decline rates of 0% or 100%, and "fail the next N calls" instead of random failures.
- Make timeouts and backoff (payment wait, outbox retry) configurable so tests use short values.
- Use a fresh event ID per test so each test gets its own DO and D1 rows.
- Assert on what's visible (seat map, dashboard panels, my bookings) rather than on internals.

## Guidelines

- This is demo code for a projector, so keep it short and readable. Clarity beats abstraction.
- Keep the reliability rules in `plan.md` §5: use `reservationId` as the idempotency key at every boundary, let the workflow own the hold's lifetime, and write to D1 before marking a seat sold.
- `cf` is in beta, so check the current docs for APIs instead of relying on memory.
