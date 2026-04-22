import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ["nms2.idn.id"],
    proxy: {
      "/api": {
        target: "http://backend:8080",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://backend:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
