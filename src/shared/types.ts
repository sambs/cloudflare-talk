// Types shared by the Worker and the browser client

export type SeatStatus = "available" | "held" | "sold";

export type Seat = {
  id: string;
  status: SeatStatus;
};

export type HoldResult = { reservationId: string } | { error: string };

export type PayResult = { ok: true } | { error: string };

export type Booking = { id: string; seatId: string };

// Per-event knobs. Tests turn the timeouts down so they run fast.
export type SaleSettings = {
  paymentTimeoutSeconds: number;
  declineRate: number; // 0 to 1
};

// Messages the EventSale DO pushes to every connected client
export type ServerMessage = { type: "seats"; seats: Seat[] };
