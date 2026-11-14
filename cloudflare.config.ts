import { bindings, defineConfig, defineWorker, exports } from "cf/config";
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

export default defineConfig({
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
    },
  },
});
