-- The system of record for confirmed bookings
CREATE TABLE bookings (
  id          TEXT PRIMARY KEY,        -- = reservationId
  event_id    TEXT NOT NULL,
  seat_id     TEXT NOT NULL,
  customer    TEXT NOT NULL,
  payment_ref TEXT NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  -- Defence in depth: even a bug in the DO can't sell a seat twice
  UNIQUE (event_id, seat_id)
);
