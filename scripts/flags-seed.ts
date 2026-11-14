// Create or reset the feature flags defined in flags.ts. Like `pnpm
// db:migrate`, it targets production unless you pass --local:
//
//   pnpm flags:seed           production (pnpm run deploy runs this)
//   pnpm flags:seed --local   the local dev flags (pnpm dev runs this)
//
// Existing flags are overwritten, including any values changed by hand.
import { execFileSync } from "node:child_process";
import { FLAGS, FLAGS_APP_NAME, LOCAL_FLAGS_APP_ID } from "../flags.ts";

function cf(args: string[]) {
  return execFileSync("cf", ["flagship", "apps", ...args], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  });
}

// Unlike D1, a Flagship binding can't be found by name, so `cf deploy`
// creates the app rather than this script. Here we just look it up.
function remoteAppId(): string {
  const apps: { id: string; name: string }[] = JSON.parse(cf(["list"]));
  const app = apps.find((app) => app.name === FLAGS_APP_NAME);
  if (!app) {
    throw new Error(
      `No Flagship app named "${FLAGS_APP_NAME}". Deploy first: it creates the app.`,
    );
  }
  return app.id;
}

const local = process.argv.includes("--local") ? ["--local"] : [];
const appId = local.length > 0 ? LOCAL_FLAGS_APP_ID : remoteAppId();

const existing: { key: string }[] = JSON.parse(
  cf(["flags", "list", "--app-id", appId, ...local]),
);

for (const flag of FLAGS) {
  const command = existing.some(({ key }) => key === flag.key)
    ? ["update", flag.key, "--app-id", appId]
    : ["create", appId];
  cf(["flags", ...command, ...local, "--body", JSON.stringify(flag)]);
  console.error(`Seeded flag "${flag.key}"`);
}
