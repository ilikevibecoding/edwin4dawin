// Dev-server config for the live preview that is exposed through a public tunnel (see tools/live.sh).
// Runs on its own port so the screenshot harness on 5173 keeps its default HMR wiring; the HMR
// client here is told to talk to the tunnel's TLS port instead of the local Vite port.
import { defineConfig, mergeConfig } from "vite";
import base from "../vite.config.js";

export default mergeConfig(
  base,
  defineConfig({
    // own dependency cache: the workstream worktrees symlink node_modules and run their own Vite servers,
    // which would otherwise fight over the same .vite/deps directory (stale "Outdated Optimize Dep" 504s,
    // duplicate three.js instances)
    cacheDir: "node_modules/.vite-live",
    server: {
      host: "127.0.0.1",
      port: 5174,
      strictPort: true,
      allowedHosts: true,
      hmr: { protocol: "wss", clientPort: 443 },
    },
  }),
);
