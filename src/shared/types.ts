// Types shared by the Worker and the browser client

export type SeatStatus = "available" | "held" | "sold";

export type Seat = {
  id: string;
  status: SeatStatus;
};
