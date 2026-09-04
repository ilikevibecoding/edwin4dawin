// DEV ONLY (Agent B). Vite config for screenshot-harness servers: no HMR and no file watching, so edits by
// other subagents in the shared working tree cannot full-reload the harness page mid-run.
//   npx vite --config src/rooms/deck1/_dev/vite.harness.config.mjs --host 127.0.0.1 --port 51xx --strictPort
import { defineConfig } from "vite";

export default defineConfig({
  root: process.cwd(),
  base: "./",
  server: {
    host: "127.0.0.1",
    strictPort: true,
    hmr: false,
    watch: null,
  },
});
