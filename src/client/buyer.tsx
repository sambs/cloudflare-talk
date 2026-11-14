import { useState } from "react";
import { createRoot } from "react-dom/client";
import { holdSeat, useSeats } from "./event.ts";
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

function SeatPicker({ nickname }: { nickname: string }) {
  const seats = useSeats();
  const [held, setHeld] = useState<string>();
  const [error, setError] = useState<string>();

  async function pick(seatId: string) {
    setError(undefined);
    const result = await holdSeat(seatId, nickname);
    if ("error" in result) setError(result.error);
    else setHeld(seatId);
  }

  return (
    <main>
      <h1>Pick a seat, {nickname}</h1>
      {held && <p>You're holding {held}</p>}
      {error && <p role="alert">{error}</p>}
      {/* One seat per buyer: the map goes read-only once you hold a seat */}
      <SeatMap seats={seats} mine={held} onSelect={held ? undefined : pick} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Buyer />);
