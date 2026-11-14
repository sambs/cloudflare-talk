import { createRoot } from "react-dom/client";
import { useSeats } from "./event.ts";
import { SeatMap } from "./SeatMap.tsx";
import "./styles.css";

function Buyer() {
  const seats = useSeats();
  return (
    <main>
      <h1>Pick a seat</h1>
      <SeatMap seats={seats} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Buyer />);
