import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export default defineConfig({
  worker: {
    name: "app",
    compatibilityDate: "2026-11-10",
    entrypoint,
    env: {
      WORLD: bindings.text("World"),
    },
  },
});
