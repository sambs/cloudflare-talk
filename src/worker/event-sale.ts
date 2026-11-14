import { DurableObject } from "cloudflare:workers";
import type { Seat } from "../shared/types.ts";

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

  seats(): Seat[] {
    return this.sql
      .exec<Seat>("SELECT id, status FROM seats ORDER BY id")
      .toArray();
  }
}
