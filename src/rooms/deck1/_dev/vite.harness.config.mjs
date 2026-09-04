// DEV ONLY (Agent B). Vite config for screenshot-harness servers: the file watcher stays on (so the next page load
// gets fresh modules after an edit) but HMR is off, so saves by other agents in the shared working tree can never
// full-reload the harness page mid-run.
//   npx vite --config src/rooms/deck1/_dev/vite.harness.config.mjs --host 127.0.0.1 --port 51xx --strictPort
import { defineConfig } from "vite";

export default defineConfig({
  root: process.cwd(),
  base: "./",
  server: {
    host: "127.0.0.1",
    strictPort: true,
    hmr: false,
  },
});
