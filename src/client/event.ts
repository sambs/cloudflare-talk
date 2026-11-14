import { useEffect, useState } from "react";
import type { Seat } from "../shared/types.ts";

// Each event has its own EventSale Durable Object. Pick one with ?event=
export const eventId =
  new URLSearchParams(location.search).get("event") ?? "demo";

export function useSeats() {
  const [seats, setSeats] = useState<Seat[]>([]);

  useEffect(() => {
    fetch(`/api/events/${eventId}/seats`)
      .then((res) => res.json())
      .then(setSeats);
  }, []);

  return seats;
}
