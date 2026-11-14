import type { Seat } from "../shared/types.ts";

type Props = {
  seats: Seat[];
  mine?: string; // the seat this buyer is holding
  onSelect?: (seatId: string) => void; // leave out for a read-only map
};

export function SeatMap({ seats, mine, onSelect }: Props) {
  return (
    <ul className="seat-map" aria-label="Seat map">
      {seats.map((seat) => (
        <li key={seat.id}>
          <button
            className={`seat ${seat.status} ${seat.id === mine ? "mine" : ""}`}
            aria-label={`${seat.id} ${seat.status}`}
            disabled={!onSelect || seat.status !== "available"}
            onClick={() => onSelect?.(seat.id)}
          >
            {seat.id}
          </button>
        </li>
      ))}
    </ul>
  );
}
