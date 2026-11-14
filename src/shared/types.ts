// Types shared by the Worker and the browser client

export type SeatStatus = "available" | "held" | "sold";

export type Seat = {
  id: string;
  status: SeatStatus;
};

export type HoldResult = { reservationId: string } | { error: string };

export type PayResult = { ok: true } | { error: string };

export type Booking = { id: string; seatId: string };

// Per-event knobs: the dashboard's chaos controls, plus timings that
// tests turn down so they run fast
export type SaleSettings = {
  paymentTimeoutSeconds: number;
  outboxMaxBackoffSeconds: number; // cap on the delay between outbox retries
  declineRate: number; // 0 to 1
  failNextCharges: number; // the provider returns 503 for this many calls
  failWorkflowStarts: boolean; // creating a workflow fails while this is on
};

// What the EventSale DO pushes to every connected client on each change
export type SaleState = { seats: Seat[]; settings: SaleSettings };
