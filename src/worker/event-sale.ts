import { DurableObject } from "cloudflare:workers";
import type { HoldResult, Seat, ServerMessage } from "../shared/types.ts";

const ROWS = ["A", "B", "C", "D"];
const SEATS_PER_ROW = 8;

// One instance per event: owns the live seat map for that sale
export class EventSale extends DurableObject {
  sql = this.ctx.storage.sql;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS seats (
        id             TEXT PRIMARY KEY,
        status         TEXT NOT NULL CHECK (status IN ('available', 'held', 'sold')),
        reservation_id TEXT,
        held_at        INTEGER
      )
    `);
    const { count } = this.sql
      .exec<{ count: number }>("SELECT COUNT(*) AS count FROM seats")
      .one();
    if (count === 0) {
      for (const row of ROWS) {
        for (let n = 1; n <= SEATS_PER_ROW; n++) {
          this.sql.exec(
            "INSERT INTO seats (id, status) VALUES (?, 'available')",
            `${row}${n}`,
          );
        }
      }
    }
  }

  // The DO handles one request at a time, so two holds on the same seat
  // can never race. No locks needed.
  hold(seatId: string, customer: string): HoldResult {
    const reservationId = crypto.randomUUID();
    const { rowsWritten } = this.sql.exec(
      `UPDATE seats SET status = 'held', reservation_id = ?, held_at = ?
       WHERE id = ? AND status = 'available'`,
      reservationId,
      Date.now(),
      seatId,
    );
    if (rowsWritten === 0) return { error: "Seat not available" };

    console.log(`${customer} is holding ${seatId} (${reservationId})`);
    this.broadcast();
    return { reservationId };
  }

  // Each browser keeps a WebSocket open to the DO for live updates.
  // acceptWebSocket lets the DO hibernate while the sockets stay connected.
  async fetch(request: Request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket", { status: 426 });
    }
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.send(this.seatsMessage());
    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcast() {
    const message = this.seatsMessage();
    for (const ws of this.ctx.getWebSockets()) ws.send(message);
  }

  private seatsMessage() {
    const seats = this.sql
      .exec<Seat>("SELECT id, status FROM seats ORDER BY id")
      .toArray();
    return JSON.stringify({ type: "seats", seats } satisfies ServerMessage);
  }
}
