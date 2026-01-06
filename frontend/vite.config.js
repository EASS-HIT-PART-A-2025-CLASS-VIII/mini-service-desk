import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// For Docker: uses backend service name (default)
// For local dev: set VITE_BACKEND_URL=http://localhost:8000
const backendUrl = process.env.VITE_BACKEND_URL || "http://backend:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": backendUrl,
    },
  },
});