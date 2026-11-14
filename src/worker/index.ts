import { env } from "cloudflare:workers";
import { Hono } from "hono";

export { EventSale } from "./event-sale.ts";

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

// Hand the WebSocket upgrade straight to the event's DO
app.get("/events/:eventId/ws", (c) =>
  sale(c.req.param("eventId")).fetch(c.req.raw),
);

export default app;
