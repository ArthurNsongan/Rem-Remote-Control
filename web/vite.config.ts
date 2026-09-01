import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const root = path.resolve(__dirname);
const projectRoot = path.resolve(__dirname, "..");

// Web remote client — built to web/dist, embedded & served by the Rust server.
export default defineConfig({
  root,
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
      "@shared": path.resolve(projectRoot, "./shared"),
    },
  },
  build: {
    outDir: path.resolve(root, "./dist"),
    emptyOutDir: true,
  },
  server: {
    port: 1430,
    host: true,
  },
});
