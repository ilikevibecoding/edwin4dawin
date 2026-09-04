import { defineConfig } from "vite";

const stamp = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

export default defineConfig({
  base: "./",
  define: {
    __BUILD_TIME__: JSON.stringify(stamp),
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
  },
});
