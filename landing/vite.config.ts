import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const root = path.resolve(__dirname);
const projectRoot = path.resolve(__dirname, "..");

// Landing page marketing de Rem — build statique dans landing/dist.
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
  server: { port: 1440, host: true },
});
