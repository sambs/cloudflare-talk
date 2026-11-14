// Types shared by the Worker and the browser client

export type SeatStatus = "available" | "held" | "sold";

export type Seat = {
  id: string;
  status: SeatStatus;
};

export type HoldResult = { reservationId: string } | { error: string };

// Per-event knobs. Tests turn the timeouts down so they run fast.
export type SaleSettings = {
  paymentTimeoutSeconds: number;
};

// Messages the EventSale DO pushes to every connected client
export type ServerMessage = { type: "seats"; seats: Seat[] };
