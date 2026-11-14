// The D1 database, shared by cloudflare.config.ts and scripts/db-migrate.ts

export const DB_NAME = "tickets";

// `cf d1 migrations apply --local` only takes an ID, so the local database
// gets a fixed one. In production the database is found by name instead.
export const LOCAL_DB_ID = "00000000-0000-4000-8000-000000000000";
