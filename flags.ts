// Feature flags (Cloudflare Flagship), seeded by scripts/flags-seed.ts.
// Change them while the app runs: in the Cloudflare dashboard in production,
// or with `cf flagship apps flags patch --local` in local dev.

// In production `cf deploy` creates the Flagship app the first time, naming
// it "<worker>-<binding>". The seed script finds it by that name.
export const FLAGS_APP_NAME = "www-flags";

// Locally we can't look the app up: `cf flagship apps list --local` returns
// [] (cf 1.0.0-beta.31), even once it has flags. So the local binding gets a
// fixed ID instead. Any ID works locally.
export const LOCAL_FLAGS_APP_ID = "local-tickets";

type Flag = {
  key: string;
  description: string;
  enabled: boolean;
  variations: Record<string, number>;
  default_variation: string;
  rules: {
    priority: number;
    conditions: { attribute: string; operator: string; value: string }[];
    serve_variation: string;
  }[];
};

// Each flag is evaluated with the event ID as context, so a rule can serve
// one event a different value. The tests use this: an event ID containing
// ".declines" always declines, so they don't affect each other.
const forEventsTagged = (tag: string, serve_variation: string) => ({
  priority: 1,
  conditions: [{ attribute: "eventId", operator: "contains", value: tag }],
  serve_variation,
});

export const FLAGS: Flag[] = [
  {
    key: "decline-rate",
    description: "Share of payments the fake provider declines",
    enabled: true,
    variations: { off: 0, low: 0.1, high: 0.5, all: 1 },
    default_variation: "off",
    rules: [forEventsTagged(".declines", "all")],
  },
  {
    key: "payment-timeout-seconds",
    description: "How long a buyer has to pay before their hold is released",
    enabled: true,
    variations: { normal: 90, short: 2 },
    default_variation: "normal",
    rules: [forEventsTagged(".short-hold", "short")],
  },
];
