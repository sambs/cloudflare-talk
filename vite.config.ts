import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), cloudflare()],
  environments: {
    client: {
      build: {
        // Two pages: the buyer UI (phones) and the dashboard (projector)
        rolldownOptions: {
          input: ["index.html", "dashboard.html"],
        },
      },
    },
  },
});
