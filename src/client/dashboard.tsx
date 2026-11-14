import { createRoot } from "react-dom/client";
import { eventId, useSeats } from "./event.ts";
import { SeatMap } from "./SeatMap.tsx";
import "./styles.css";

function Dashboard() {
  const seats = useSeats();
  return (
    <main>
      <h1>Dashboard: {eventId}</h1>
      <SeatMap seats={seats} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Dashboard />);
