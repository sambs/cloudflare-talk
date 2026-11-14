import {
  env,
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import type { PayResult } from "../shared/types.ts";
import { charge, type ChargeResult } from "./payments.ts";

export type ReservationParams = {
  reservationId: string;
  eventId: string;
  seatId: string;
  customer: string;
  paymentTimeoutSeconds: number;
};

// One instance per reservation. It owns the hold from here on:
// only the workflow ever releases (or sells) the seat.
export class ReservationWorkflow extends WorkflowEntrypoint<
  Env,
  ReservationParams
> {
  async run(event: WorkflowEvent<ReservationParams>, step: WorkflowStep) {
    const { reservationId, eventId, seatId, customer, paymentTimeoutSeconds } =
      event.payload;
    const sale = env.EVENT_SALE.getByName(eventId);

    // Durable wait: survives restarts. Timing out means the buyer gave up.
    const paid = await step
      .waitForEvent("payment submitted", {
        type: "pay",
        timeout: `${paymentTimeoutSeconds} seconds` as const,
      })
      .then(
        () => true,
        () => false,
      );

    // Retried on transient errors (the idempotency key makes that safe).
    // Once it succeeds, the result is saved and never re-run.
    const result: ChargeResult = paid
      ? await step.do(
          "charge",
          { retries: { limit: 3, delay: "1 second", backoff: "exponential" } },
          async () =>
            charge({
              idempotencyKey: reservationId,
              ...(await sale.paymentChaos()),
            }),
        )
      : { ok: false, reason: "timeout" };

    // Record the booking before marking the seat sold. If we stall in
    // between, the buyer still has their booking.
    if (result.ok) {
      await step.do("record booking", async () => {
        await env.DB.prepare(
          `INSERT INTO bookings (id, event_id, seat_id, customer, payment_ref)
           VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
        )
          .bind(reservationId, eventId, seatId, customer, result.ref)
          .run();
      });
    }

    await step.do(result.ok ? "mark sold" : "release seat", () =>
      sale.settle(reservationId, result.ok),
    );
  }
}

// Called by the DO's outbox, which retries it until it succeeds.
// The instance ID is the reservationId, so a retry can never start a
// second workflow for the same hold.
export async function startReservation(params: ReservationParams) {
  const { errors } = await env.RESERVATION.createBatch({
    instances: [{ id: params.reservationId, params }],
  });
  // 10405: an instance with this ID already exists, so an earlier
  // attempt got through. That counts as success.
  if (errors.length > 0 && errors[0].code !== 10405) {
    throw new Error(errors[0].message);
  }
}

// Paying needs no coordination, so it skips the DO and asks the workflow,
// which owns the hold. If the workflow isn't waiting yet, the event is
// buffered until it is.
export async function submitPayment(reservationId: string): Promise<PayResult> {
  let instance: WorkflowInstance;
  try {
    instance = await env.RESERVATION.get(reservationId);
  } catch {
    // The outbox hasn't started this reservation's workflow yet
    return { error: "Payment isn't ready yet, try again" };
  }
  const { status } = await instance.status();
  if (["complete", "errored", "terminated"].includes(status)) {
    return { error: "Your hold has expired" };
  }
  await instance.sendEvent({ type: "pay", payload: {} });
  return { ok: true };
}
