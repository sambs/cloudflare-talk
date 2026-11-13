# CLAUDE.md

Demo app for a short meet-up talk on Cloudflare Workers: a ticket booking app built on a Worker, a Durable Object (`EventSale`), a Workflow (`ReservationWorkflow`) and D1. `plan.md` holds the design (architecture, reservation flow, reliability layers, data model, demo script). Read it before making changes. `talk.md` holds key facts that will be expanded to speaker notes.

## Tooling

- Uses the new `cf` CLI (<https://developers.cloudflare.com/cf/>), which replaces `wrangler`. Config lives in `cloudflare.config.ts` (bindings via `bindings.*` from `cf/config`), not `wrangler.jsonc`. The config sketch in `plan.md` uses wrangler syntax, so translate it.
- Node and pnpm versions are pinned in `mise.toml`, which also puts `node_modules/.bin` on `PATH`.
- TypeScript, built with Vite and `@cloudflare/vite-plugin`. Access bindings with `import { env } from "cloudflare:workers"`.

## Commands

- `pnpm dev`: local dev server (DOs, Workflows and D1 all run locally)
- `pnpm typecheck`: generate Worker types, then run `tsc`
- `pnpm format`: run Prettier (also runs on staged files via a husky pre-commit hook)
- `pnpm deploy`: deploy to Cloudflare

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
