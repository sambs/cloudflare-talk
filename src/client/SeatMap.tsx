import type { Seat } from "../shared/types.ts";

export function SeatMap({ seats }: { seats: Seat[] }) {
  return (
    <ul className="seat-map" aria-label="Seat map">
      {seats.map((seat) => (
        <li
          key={seat.id}
          className={`seat ${seat.status}`}
          aria-label={`${seat.id} ${seat.status}`}
        >
          {seat.id}
        </li>
      ))}
    </ul>
  );
}
