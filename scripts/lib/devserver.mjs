/**
 * Shared dev/preview server control for the QA harnesses.
 *
 * `npm run preview` is a wrapper: signalling it leaves the vite process it
 * spawned holding port 4173, so the next harness run silently attaches to a
 * server it did not start and never shuts down. Starting the wrapper in its own
 * process group and signalling the group instead takes the whole tree down.
 */

import { spawn } from 'node:child_process';

export function startServer({ root, preview = false, quiet = false } = {}) {
  const child = spawn('npm', ['run', preview ? 'preview' : 'dev'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  if (!quiet) {
    child.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
    child.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  } else {
    child.stdout.resume();
    child.stderr.resume();
  }
  return child;
}

export async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  const signal = (sig) => {
    try {
      process.kill(-child.pid, sig);
    } catch {
      try {
        child.kill(sig);
      } catch {
        /* already gone */
      }
    }
  };
  signal('SIGTERM');
  await new Promise((r) => setTimeout(r, 700));
  if (child.exitCode === null) signal('SIGKILL');
}

export async function waitForServer(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server did not start at ${url}`);
}
