import { env } from "cloudflare:workers";
import { Hono } from "hono";
import type { Booking } from "../shared/types.ts";

export { EventSale } from "./event-sale.ts";
export { ReservationWorkflow } from "./reservation-workflow.ts";

// Static assets (the React pages) are served before the Worker runs,
// so the Worker only sees requests that don't match a file: the API.
const app = new Hono().basePath("/api");

// One EventSale Durable Object per event, addressed by its ID
const sale = (eventId: string) => env.EVENT_SALE.getByName(eventId);

app.post("/events/:eventId/hold", async (c) => {
  const { seatId, customer } = await c.req.json();
  if (!seatId || !customer) {
    return c.json({ error: "seatId and customer are required" }, 400);
  }
  const result = await sale(c.req.param("eventId")).hold(seatId, customer);
  return c.json(result, "error" in result ? 409 : 200);
});

app.post("/events/:eventId/reservations/:reservationId/pay", async (c) => {
  const { eventId, reservationId } = c.req.param();
  const result = await sale(eventId).pay(reservationId);
  return c.json(result, "error" in result ? 409 : 202);
});

// Confirmed bookings come from D1, the system of record
app.get("/events/:eventId/bookings", async (c) => {
  const { results } = await env.DB.prepare(
    `SELECT id, seat_id AS seatId FROM bookings
     WHERE event_id = ? AND customer = ? ORDER BY created_at`,
  )
    .bind(c.req.param("eventId"), c.req.query("customer") ?? "")
    .run<Booking>();
  return c.json(results);
});

// Tests (and later the dashboard) tune per-event settings like timeouts
app.patch("/events/:eventId/settings", async (c) => {
  await sale(c.req.param("eventId")).updateSettings(await c.req.json());
  return c.body(null, 204);
});

// Hand the WebSocket upgrade straight to the event's DO
app.get("/events/:eventId/ws", (c) =>
  sale(c.req.param("eventId")).fetch(c.req.raw),
);

export default app;
