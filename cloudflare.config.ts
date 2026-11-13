import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export default defineConfig({
  worker: {
    name: "www",
    compatibilityDate: "2026-11-10",
    entrypoint,
    env: {
      WORLD: bindings.text("World"),
    },
  },
});
