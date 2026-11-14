import {
  env,
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";

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
    const { reservationId, eventId, paymentTimeoutSeconds } = event.payload;

    // Durable wait: survives restarts. Timing out means the buyer gave up.
    // (Paying comes next; until then every hold times out.)
    await step
      .waitForEvent("payment submitted", {
        type: "pay",
        timeout: `${paymentTimeoutSeconds} seconds` as const,
      })
      .catch(() => null);

    await step.do("release seat", () =>
      env.EVENT_SALE.getByName(eventId).settle(reservationId, false),
    );
  }
}

// Called by the DO's outbox. The instance ID is the reservationId, so a
// retry can never start a second workflow for the same hold.
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
