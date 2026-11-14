// Apply D1 migrations by database name. Like `cf d1 migrations apply`, it
// targets production unless you pass --local:
//
//   pnpm db:migrate           production (creates the database if needed)
//   pnpm db:migrate --local   the local dev database
//
// Other flags (e.g. --dry-run) are passed through to cf.
import { execFileSync } from "node:child_process";
import { DB_NAME, LOCAL_DB_ID } from "../database.ts";

function cf(args: string[]) {
  return execFileSync("cf", args, {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  });
}

function findDatabaseId(): string | undefined {
  const databases: { uuid: string; name: string }[] = JSON.parse(
    cf(["d1", "list", "--name", DB_NAME]),
  );
  return databases.find((db) => db.name === DB_NAME)?.uuid;
}

function remoteDatabaseId(): string {
  const id = findDatabaseId();
  if (id) return id;

  console.error(`Creating D1 database "${DB_NAME}"`);
  cf(["d1", "create", "--name", DB_NAME]);
  return findDatabaseId()!;
}

const args = process.argv.slice(2);
// Locally we can't look the ID up: `cf d1 list --local` returns [] (cf
// 1.0.0-beta.31), even while the dev server is running. So the local
// database has a fixed ID instead.
const id = args.includes("--local") ? LOCAL_DB_ID : remoteDatabaseId();

execFileSync("cf", ["d1", "migrations", "apply", id, ...args], {
  stdio: "inherit",
});
