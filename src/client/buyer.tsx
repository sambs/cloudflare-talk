import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { holdSeat, paySeat, useBookings, useSeats } from "./event.ts";
import { SeatMap } from "./SeatMap.tsx";
import "./styles.css";

function Buyer() {
  // No accounts: buyers pick a nickname, remembered on this device
  const [nickname, setNickname] = useState(localStorage.getItem("nickname"));

  if (!nickname) {
    return (
      <NicknameForm
        onSave={(name) => {
          localStorage.setItem("nickname", name);
          setNickname(name);
        }}
      />
    );
  }
  return <SeatPicker nickname={nickname} />;
}

function NicknameForm({ onSave }: { onSave: (name: string) => void }) {
  return (
    <main>
      <h1>Choose a nickname</h1>
      <form action={(data) => onSave(String(data.get("nickname")).trim())}>
        <input
          name="nickname"
          aria-label="Nickname"
          required
          maxLength={20}
          autoFocus
        />
        <button>Continue</button>
      </form>
    </main>
  );
}

type Hold = { seatId: string; reservationId: string; paying: boolean };

function SeatPicker({ nickname }: { nickname: string }) {
  const seats = useSeats();
  const [hold, setHold] = useState<Hold>();
  const [booked, setBooked] = useState<string>();
  const [error, setError] = useState<string>();

  // The workflow decides what happens to our seat: sold, or released if
  // payment is declined or we don't pay in time. Only count a release
  // once we've seen the seat held: the hold response can beat the
  // WebSocket update, so the map may still say "available" at first.
  const status = seats.find((seat) => seat.id === hold?.seatId)?.status;
  const seenHeld = useRef(false);
  useEffect(() => {
    if (!hold) return;
    if (status === "held") {
      seenHeld.current = true;
    } else if (status === "sold") {
      setBooked(hold.seatId);
      setHold(undefined);
    } else if (status === "available" && seenHeld.current) {
      setError(
        hold.paying
          ? `Payment for ${hold.seatId} was declined`
          : `Your hold on ${hold.seatId} expired`,
      );
      setHold(undefined);
    }
  }, [status]);

  async function pick(seatId: string) {
    setError(undefined);
    setBooked(undefined);
    seenHeld.current = false;
    const result = await holdSeat(seatId, nickname);
    if ("error" in result) setError(result.error);
    else
      setHold({ seatId, reservationId: result.reservationId, paying: false });
  }

  async function pay(hold: Hold) {
    const result = await paySeat(hold.reservationId);
    if ("error" in result) setError(result.error);
    else setHold({ ...hold, paying: true });
  }

  return (
    <main>
      <h1>Pick a seat, {nickname}</h1>
      {hold && (
        <p>
          You're holding {hold.seatId}.{" "}
          {hold.paying ? (
            "Processing payment…"
          ) : (
            <button onClick={() => pay(hold)}>Pay</button>
          )}
        </p>
      )}
      {booked && <p role="status">You're booked into {booked}</p>}
      {error && <p role="alert">{error}</p>}
      {/* One seat at a time: the map goes read-only while you hold one */}
      <SeatMap
        seats={seats}
        mine={hold?.seatId}
        onSelect={hold ? undefined : pick}
      />
      <MyBookings nickname={nickname} refresh={booked} />
    </main>
  );
}

function MyBookings({
  nickname,
  refresh,
}: {
  nickname: string;
  refresh: unknown;
}) {
  const bookings = useBookings(nickname, refresh);
  if (bookings.length === 0) return null;
  return (
    <section>
      <h2>My bookings</h2>
      <ul aria-label="My bookings">
        {bookings.map((booking) => (
          <li key={booking.id}>{booking.seatId}</li>
        ))}
      </ul>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<Buyer />);
