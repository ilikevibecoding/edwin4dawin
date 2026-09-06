import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// Build stamp shown in the F3 overlay and the admin panel header, so a player can tell which commit a hosted
// bundle came from (CDN caches can lag a branch by hours).
function buildStamp() {
  let hash = 'dev';
  try { hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { /* not a git checkout */ }
  const d = new Date();
  const day = d.toISOString().slice(0, 10), hm = d.toISOString().slice(11, 16);
  return `${hash} ${day} ${hm} UTC`;
}

export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(buildStamp()) },
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  build: { target: 'es2020', sourcemap: false },
});
