// Create or reset the feature flags defined in flags.ts:
//
//   pnpm flags:seed --local            the local dev flags (pnpm dev runs this)
//   pnpm flags:seed --app-id <id>      production (find the ID with
//                                      `cf flagship apps list`)
//
// Existing flags are overwritten, including any values changed by hand.
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { FLAGS, LOCAL_FLAGS_APP_ID } from "../flags.ts";

const { values } = parseArgs({
  options: { local: { type: "boolean" }, "app-id": { type: "string" } },
});
const appId = values.local ? LOCAL_FLAGS_APP_ID : values["app-id"];
if (!appId) throw new Error("Pass --local or --app-id <id>");
const local = values.local ? ["--local"] : [];

function cf(args: string[]) {
  return execFileSync("cf", ["flagship", "apps", "flags", ...args], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  });
}

const existing: { key: string }[] = JSON.parse(
  cf(["list", "--app-id", appId, ...local]),
);

for (const flag of FLAGS) {
  const body = JSON.stringify(flag);
  if (existing.some(({ key }) => key === flag.key)) {
    cf(["update", flag.key, "--app-id", appId, ...local, "--body", body]);
  } else {
    cf(["create", appId, ...local, "--body", body]);
  }
  console.error(`Seeded flag "${flag.key}"`);
}
