import { createRoot } from "react-dom/client";
import type { SaleSettings } from "../shared/types.ts";
import { eventId, updateSettings, useSale } from "./event.ts";
import { SeatMap } from "./SeatMap.tsx";
import "./styles.css";

function Dashboard() {
  const sale = useSale();
  return (
    <main>
      <h1>Dashboard: {eventId}</h1>
      {sale && (
        <>
          <SeatMap seats={sale.seats} />
          <ChaosControls settings={sale.settings} />
        </>
      )}
    </main>
  );
}

// Each control just sends a change. The DO saves it and pushes the new
// settings back, so the read-outs show what the system is actually using.
function ChaosControls({ settings }: { settings: SaleSettings }) {
  return (
    <section className="chaos">
      <h2>Chaos</h2>

      <label>
        Decline rate
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          defaultValue={settings.declineRate}
          onChange={(e) =>
            updateSettings({ declineRate: Number(e.target.value) })
          }
        />
      </label>
      <output aria-label="Decline rate">
        {Math.round(settings.declineRate * 100)}%
      </output>

      {/* Two failures in a row is always within the charge step's retries */}
      <button
        onClick={() =>
          updateSettings({ failNextCharges: settings.failNextCharges + 2 })
        }
      >
        Fail next 2 charges
      </button>
      <output aria-label="Charges left to fail">
        {settings.failNextCharges} to fail
      </output>

      <label>
        <input
          type="checkbox"
          role="switch"
          defaultChecked={settings.blockOutbox}
          onChange={(e) => updateSettings({ blockOutbox: e.target.checked })}
        />
        Break outbox
      </label>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<Dashboard />);
