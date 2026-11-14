import { useEffect, useState } from "react";
import type { HoldResult, Seat, ServerMessage } from "../shared/types.ts";

// Each event has its own EventSale Durable Object. Pick one with ?event=
export const eventId =
  new URLSearchParams(location.search).get("event") ?? "demo";

// Live seat map, pushed by the DO over a WebSocket
export function useSeats() {
  const [seats, setSeats] = useState<Seat[]>([]);

  useEffect(() => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${protocol}//${location.host}/api/events/${eventId}/ws`,
    );
    ws.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      if (message.type === "seats") setSeats(message.seats);
    };
    return () => ws.close();
  }, []);

  return seats;
}

export async function holdSeat(
  seatId: string,
  customer: string,
): Promise<HoldResult> {
  const res = await fetch(`/api/events/${eventId}/hold`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seatId, customer }),
  });
  return res.json();
}
