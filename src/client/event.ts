import { useEffect, useState } from "react";
import type {
  Booking,
  HoldResult,
  PayResult,
  SaleSettings,
  SaleState,
} from "../shared/types.ts";

// Each event has its own EventSale Durable Object. Pick one with ?event=
export const eventId =
  new URLSearchParams(location.search).get("event") ?? "demo";

// Live seat map and settings, pushed by the DO over a WebSocket.
// Undefined until the first message arrives.
export function useSale() {
  const [state, setState] = useState<SaleState>();

  useEffect(() => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${protocol}//${location.host}/api/events/${eventId}/ws`,
    );
    ws.onmessage = (event) => setState(JSON.parse(event.data));
    return () => ws.close();
  }, []);

  return state;
}

// The DO pushes the new settings to every client once they're saved
export async function updateSettings(changes: Partial<SaleSettings>) {
  await fetch(`/api/events/${eventId}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
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

export async function paySeat(reservationId: string): Promise<PayResult> {
  const res = await fetch(
    `/api/events/${eventId}/reservations/${reservationId}/pay`,
    { method: "POST" },
  );
  return res.json();
}

// Confirmed bookings from D1. Pass a changing `refresh` value to reload.
export function useBookings(customer: string, refresh: unknown) {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const query = new URLSearchParams({ customer });
    fetch(`/api/events/${eventId}/bookings?${query}`)
      .then((res) => res.json())
      .then(setBookings);
  }, [customer, refresh]);

  return bookings;
}
