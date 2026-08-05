// Shared puppeteer + vite plumbing for the offline capture tools.
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

export async function buildOnce() {
  await new Promise((resolve, reject) => {
    const proc = spawn('npx', ['vite', 'build'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    proc.stdout.on('data', (b) => (log += b));
    proc.stderr.on('data', (b) => (log += b));
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`vite build failed:\n${log}`))));
  });
}

import net from 'node:net';

async function freePort(start = 5200) {
  for (let port = start; port < start + 200; port++) {
    const ok = await new Promise((resolve) => {
      const srv = net.createServer();
      srv.once('error', () => resolve(false));
      srv.once('listening', () => srv.close(() => resolve(true)));
      srv.listen(port, '127.0.0.1');
    });
    if (ok) return port;
  }
  throw new Error('no free port');
}

export async function startServer({ port, mode = 'dev' } = {}) {
  if (!port) port = await freePort();
  const cmd = mode === 'dev' ? ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'] : ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
  const server = spawn('npx', cmd, { stdio: ['ignore', 'pipe', 'pipe'] });
  const baseUrl = `http://127.0.0.1:${port}`;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('vite did not start in time')), 60000);
    const onData = (buf) => {
      const text = buf.toString();
      if (text.includes('Local:') || text.includes('ready in')) {
        clearTimeout(timer);
        resolve();
      }
    };
    server.stdout.on('data', onData);
    server.stderr.on('data', (b) => process.stderr.write(`[vite] ${b}`));
    server.on('exit', (code) => reject(new Error(`vite exited early with ${code}`)));
  });
  // Give vite a beat to finish binding.
  await new Promise((r) => setTimeout(r, 500));
  return { server, baseUrl };
}

export async function launchBrowser({ width = 1600, height = 900 } = {}) {
  return puppeteer.launch({
    headless: true,
    protocolTimeout: 900000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-frame-rate-limit',
      '--disable-gpu-vsync',
      '--js-flags=--max-old-space-size=4096',
      `--window-size=${width},${height}`,
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--font-render-hinting=none',
    ],
  });
}
