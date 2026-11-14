import { DurableObject } from "cloudflare:workers";
import type {
  HoldResult,
  SaleSettings,
  SaleState,
  Seat,
} from "../shared/types.ts";
import {
  startReservation,
  type ReservationParams,
} from "./reservation-workflow.ts";

const ROWS = ["A", "B", "C", "D"];
const SEATS_PER_ROW = 8;
const DEFAULT_SETTINGS: SaleSettings = {
  paymentTimeoutSeconds: 90,
  outboxRetrySeconds: 5,
  declineRate: 0,
  failNextCharges: 0,
  failWorkflowStarts: false,
};

type OutboxEntry = { id: number; params: string };

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
      -- Workflows still to start. A row is deleted once its workflow starts.
      CREATE TABLE IF NOT EXISTS outbox (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        params TEXT NOT NULL
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
      paymentTimeoutSeconds: this.settings().paymentTimeoutSeconds,
    };

    this.scheduleRetry();
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
      this.sql.exec(
        "INSERT INTO outbox (params) VALUES (?)",
        JSON.stringify(params),
      );
      return true;
    });
    if (!held) return { error: "Seat not available" };

    this.nudge();
    this.broadcast();
    return { reservationId: params.reservationId };
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

  // Set the alarm *before* writing to the outbox. If this object dies in
  // between, the worst case is an alarm that finds nothing to do.
  private scheduleRetry() {
    const delay = this.settings().outboxRetrySeconds * 1000;
    this.ctx.storage.setAlarm(Date.now() + delay);
  }

  // Try to deliver right away. If that fails, or this instance is evicted
  // first, the alarm picks it up.
  private nudge() {
    this.ctx.waitUntil(this.dispatchOutbox());
  }

  private async dispatchOutbox() {
    const pending = this.sql
      .exec<OutboxEntry>("SELECT id, params FROM outbox ORDER BY id")
      .toArray();

    for (const entry of pending) {
      try {
        await startReservation(JSON.parse(entry.params), {
          unavailable: this.settings().failWorkflowStarts,
        });
      } catch {
        // Workflows is either up or down, so don't bother with the rest.
        // The alarm retries the whole outbox later.
        this.scheduleRetry();
        return;
      }
      this.sql.exec("DELETE FROM outbox WHERE id = ?", entry.id);
    }
  }

  settings(): SaleSettings {
    const saved = this.ctx.storage.kv.get<Partial<SaleSettings>>("settings");
    return { ...DEFAULT_SETTINGS, ...saved };
  }

  updateSettings(changes: Partial<SaleSettings>) {
    this.ctx.storage.kv.put("settings", { ...this.settings(), ...changes });
    this.broadcast();
  }

  // Asked by the fake payment provider on every charge attempt.
  // Each call uses up one of the "fail the next N charges".
  paymentChaos() {
    const { declineRate, failNextCharges } = this.settings();
    if (failNextCharges > 0) {
      this.updateSettings({ failNextCharges: failNextCharges - 1 });
    }
    return { declineRate, unavailable: failNextCharges > 0 };
  }

  // Each browser keeps a WebSocket open to the DO for live updates.
  // acceptWebSocket lets the DO hibernate while the sockets stay connected.
  async fetch(request: Request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket", { status: 426 });
    }
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.send(this.stateMessage());
    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcast() {
    const message = this.stateMessage();
    for (const ws of this.ctx.getWebSockets()) ws.send(message);
  }

  private stateMessage() {
    const seats = this.sql
      .exec<Seat>("SELECT id, status FROM seats ORDER BY id")
      .toArray();
    const state: SaleState = { seats, settings: this.settings() };
    return JSON.stringify(state);
  }
}
