import { DurableObject } from "cloudflare:workers";
import type {
  HoldResult,
  PayResult,
  Seat,
  ServerMessage,
} from "../shared/types.ts";
import {
  deliverPayment,
  startReservation,
  type ReservationParams,
} from "./reservation-workflow.ts";

const ROWS = ["A", "B", "C", "D"];
const SEATS_PER_ROW = 8;

// If the nudge doesn't deliver an outbox entry, the alarm retries it
const ALARM_SAFETY_NET_MS = 5_000;

// What each kind of outbox entry does when it's delivered
const deliver = {
  "start-reservation": startReservation,
  "deliver-pay-event": deliverPayment,
};

type OutboxEntry = {
  id: number;
  type: keyof typeof deliver;
  payload: string;
  attempts: number;
};

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
      );
      CREATE TABLE IF NOT EXISTS outbox (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        type         TEXT NOT NULL,
        payload      TEXT NOT NULL,
        status       TEXT NOT NULL DEFAULT 'pending',
        attempts     INTEGER NOT NULL DEFAULT 0,
        next_attempt INTEGER NOT NULL,
        last_error   TEXT
      );
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
    const params: ReservationParams = {
      reservationId: crypto.randomUUID(),
      eventId: this.ctx.id.name!,
      seatId,
      customer,
    };

    // Transactional outbox: the hold and the intent to start its workflow
    // are committed together, or not at all
    const held = this.ctx.storage.transactionSync(() => {
      const { rowsWritten } = this.sql.exec(
        `UPDATE seats SET status = 'held', reservation_id = ?, held_at = ?
         WHERE id = ? AND status = 'available'`,
        params.reservationId,
        Date.now(),
        seatId,
      );
      if (rowsWritten === 0) return false;
      this.enqueue("start-reservation", params);
      return true;
    });
    if (!held) return { error: "Seat not available" };

    this.nudge();
    this.broadcast();
    return { reservationId: params.reservationId };
  }

  // Same pattern again: record the intent to tell the workflow, then
  // let the outbox deliver it
  pay(reservationId: string): PayResult {
    const [seat] = this.sql
      .exec(
        "SELECT id FROM seats WHERE reservation_id = ? AND status = 'held'",
        reservationId,
      )
      .toArray();
    if (!seat) return { error: "Your hold has expired" };

    this.enqueue("deliver-pay-event", { reservationId });
    this.nudge();
    return { ok: true };
  }

  // Called by the workflow. Only touches a seat still held by this
  // reservation, so a retried step is harmless.
  settle(reservationId: string, sold: boolean) {
    const { rowsWritten } = this.sql.exec(
      sold
        ? `UPDATE seats SET status = 'sold'
           WHERE reservation_id = ? AND status = 'held'`
        : `UPDATE seats SET status = 'available', reservation_id = NULL, held_at = NULL
           WHERE reservation_id = ? AND status = 'held'`,
      reservationId,
    );
    if (rowsWritten > 0) this.broadcast();
  }

  async alarm() {
    await this.dispatchOutbox();
  }

  private enqueue(type: OutboxEntry["type"], payload: object) {
    this.sql.exec(
      "INSERT INTO outbox (type, payload, next_attempt) VALUES (?, ?, ?)",
      type,
      JSON.stringify(payload),
      Date.now(),
    );
  }

  // Try to deliver right away. If that fails, or this instance is evicted
  // first, the alarm picks it up.
  private nudge() {
    this.ctx.storage.setAlarm(Date.now() + ALARM_SAFETY_NET_MS);
    this.ctx.waitUntil(this.dispatchOutbox());
  }

  private async dispatchOutbox() {
    const due = this.sql
      .exec<OutboxEntry>(
        `SELECT id, type, payload, attempts FROM outbox
         WHERE status = 'pending' AND next_attempt <= ?
         ORDER BY id`,
        Date.now(),
      )
      .toArray();

    for (const entry of due) {
      try {
        await deliver[entry.type](JSON.parse(entry.payload));
        this.sql.exec(
          "UPDATE outbox SET status = 'done' WHERE id = ?",
          entry.id,
        );
      } catch (err) {
        const delay = Math.min(30_000, 500 * 2 ** entry.attempts);
        this.sql.exec(
          `UPDATE outbox SET attempts = attempts + 1, next_attempt = ?, last_error = ?
           WHERE id = ?`,
          Date.now() + delay,
          String(err),
          entry.id,
        );
      }
    }

    // Wake up again for the next pending entry, if there is one
    const { next } = this.sql
      .exec<{ next: number | null }>(
        "SELECT MIN(next_attempt) AS next FROM outbox WHERE status = 'pending'",
      )
      .one();
    if (next === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(next);
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
