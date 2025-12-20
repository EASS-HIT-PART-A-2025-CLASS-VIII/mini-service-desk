import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: inside Docker, 127.0.0.1 points to the frontend container.
// "backend" is the docker-compose service name for the backend container.
const backendUrl = process.env.VITE_BACKEND_URL || "http://backend:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": backendUrl,
    },
  },
});