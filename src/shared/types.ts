// Types shared by the Worker and the browser client

export type SeatStatus = "available" | "held" | "sold";

export type Seat = {
  id: string;
  status: SeatStatus;
};

export type HoldResult = { reservationId: string } | { error: string };

// Messages the EventSale DO pushes to every connected client
export type ServerMessage = { type: "seats"; seats: Seat[] };
