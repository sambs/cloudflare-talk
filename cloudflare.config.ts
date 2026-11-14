import { bindings, defineConfig, defineWorker, exports } from "cf/config";
import { DB_NAME, LOCAL_DB_ID } from "./database.ts";
import * as entrypoint from "./src/worker/index.ts" with { type: "cf-worker" };

const worker = defineWorker({
  name: "www",
  compatibilityDate: "2026-11-10",
  entrypoint,
  exports: {
    EventSale: exports.durableObject({ storage: "sqlite" }),
    ReservationWorkflow: exports.workflow({ name: "reservation" }),
  },
});

export default defineConfig(({ mode }) => ({
  worker: {
    ...worker,
    env: {
      // Passing the Worker definition (not just its name) types these bindings
      EVENT_SALE: bindings.durableObject({ worker, exportName: "EventSale" }),
      RESERVATION: bindings.workflow({
        name: "reservation",
        worker,
        exportName: "ReservationWorkflow",
      }),
      // Found by name in production. Locally it needs a fixed ID so that
      // `pnpm db:migrate --local` can target it.
      DB: bindings.d1({
        name: DB_NAME,
        id: mode === "development" ? LOCAL_DB_ID : undefined,
      }),
    },
  },
}));
