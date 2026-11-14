import { bindings, defineConfig, defineWorker, exports } from "cf/config";
import * as entrypoint from "./src/worker/index.ts" with { type: "cf-worker" };

// `cf d1 migrations apply --local` needs a database ID, so give the local
// database a fixed one. In production `cf deploy` creates "tickets" by name.
export const LOCAL_DB_ID = "00000000-0000-4000-8000-000000000000";

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
      DB: bindings.d1({
        name: "tickets",
        id: mode === "development" ? LOCAL_DB_ID : undefined,
      }),
    },
  },
}));
