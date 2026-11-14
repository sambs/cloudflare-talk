# Cloudflare Workers Talk: Ticket Booking Demo

Demo app for a meet-up talk on Cloudflare Workers: a ticket booking app built on a Worker, a Durable Object, a Workflow and D1.

## Getting started

### Prerequisites

You need the Node and pnpm versions pinned in [mise.toml](mise.toml).

[mise](https://mise.jdx.dev/) is the recommended way to get them. From the project root, run:

```sh
mise install
```

mise also puts `node_modules/.bin` on your `PATH`, so installed tools like `cf` can be run directly. Without mise, run installed tools through pnpm, for example `pnpm exec cf`.

### Install and run

```sh
pnpm install
pnpm dev
```

The dev server runs the Worker locally, and the Durable Objects, Workflows, D1 and Flagship feature flags are emulated locally too. Open the URL it prints (usually <http://localhost:5173>) for the buyer page, and `/dashboard.html` for the projector dashboard. Add `?event=<id>` to either page to choose an event.

### Feature flags

Chaos settings such as the payment decline rate are [Flagship](https://developers.cloudflare.com/flagship/) feature flags, defined in [flags.ts](flags.ts). `pnpm dev` resets them to those definitions. Change one while the app runs, and the next payment uses the new value:

```sh
cf flagship apps flags patch decline-rate --app-id local-tickets --local --default-variation high
```

The Local Explorer at <http://localhost:5173/cdn-cgi/local/explorer> can also edit them. In production, change flags in the Cloudflare dashboard (Compute > Flagship). Changes can take up to 30 seconds to reach every location.

### Tests

End-to-end tests use Playwright against the local dev server. On the first run, install the browser:

```sh
pnpm exec playwright install chromium
pnpm test
```

`pnpm test` starts the dev server itself, or reuses one that's already running.

### Deployment

- Sign in to Cloudflare
- Create a new account (recommended)
- `cf auth login`
- `pnpm run deploy`
- Answer yes when prompted whether to create a subdomain
- The first deploy creates a Flagship app. To seed its flags, find its ID with `cf flagship apps list`, then run `pnpm flags:seed --app-id <id>`. Until then, the code's default values apply.

## Commands

| Command           | What it does                                                                |
| ----------------- | --------------------------------------------------------------------------- |
| `pnpm dev`        | Local dev server                                                            |
| `pnpm flags:seed` | Reset feature flags to `flags.ts` (`--local`, or `--app-id <id>`)           |
| `pnpm test`       | Run the Playwright tests                                                    |
| `pnpm typecheck`  | Generate Worker types, then run `tsc`                                       |
| `pnpm format`     | Format the code with Prettier                                               |
| `pnpm run deploy` | Apply D1 migrations, then deploy to Cloudflare (needs a Cloudflare account) |
