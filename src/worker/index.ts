import { env } from "cloudflare:workers";
import { Hono } from "hono";

export { EventSale } from "./event-sale.ts";

// Static assets (the React pages) are served before the Worker runs,
// so the Worker only sees requests that don't match a file: the API.
const app = new Hono().basePath("/api");

app.get("/events/:eventId/seats", async (c) => {
  const sale = env.EVENT_SALE.getByName(c.req.param("eventId"));
  return c.json(await sale.seats());
});

export default app;
