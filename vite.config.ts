import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("react") || id.includes("scheduler")) {
            return "react-vendor";
          }

          if (id.includes("firebase")) {
            return "firebase-vendor";
          }

          if (id.includes("chart.js") || id.includes("react-chartjs-2")) {
            return "charts-vendor";
          }

          if (id.includes("@tanstack")) {
            return "query-vendor";
          }

          return "vendor";
        }
      }
    }
  }
});
