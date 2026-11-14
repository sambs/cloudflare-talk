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

The dev server runs the Worker locally, and the Durable Objects, Workflows and D1 are emulated locally too. Open the URL it prints (usually <http://localhost:5173>) for the buyer page, and `/dashboard.html` for the projector dashboard. Add `?event=<id>` to either page to choose an event.

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

## Commands

| Command           | What it does                                                                |
| ----------------- | --------------------------------------------------------------------------- |
| `pnpm dev`        | Local dev server                                                            |
| `pnpm test`       | Run the Playwright tests                                                    |
| `pnpm typecheck`  | Generate Worker types, then run `tsc`                                       |
| `pnpm format`     | Format the code with Prettier                                               |
| `pnpm run deploy` | Apply D1 migrations, then deploy to Cloudflare (needs a Cloudflare account) |
