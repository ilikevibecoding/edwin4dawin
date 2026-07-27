// Spot-check `QAMode.probeView` at the checkpoints that fooled it.  (owner: opus4)
//
// A full `tools/audit.mjs` run costs about fourteen minutes, which is too slow a
// loop for verifying a change to the probe itself. This runs the probe at the
// handful of checkpoints where it was wrong — the courtyard and the extraction
// garage, where snow and an invisible scrim intercepted every ray — plus a
// couple that were always right, so a fix that breaks the working case shows up.
//
//   node tools/probecheck.mjs

import { parseArgs, startServer, openGame } from './lib/session.mjs';

const args = parseArgs();
const log = (...p) => process.stdout.write(`${p.join(' ')}\n`);

const CHECKPOINTS = ['insertion', 'garage', 'extraction', 'openoffice', 'archive', 'weststair', 'lobby'];

const main = async () => {
  const server = args.url
    ? { url: String(args.url), stop: async () => {}, reused: true }
    : await startServer({ port: Number(args.port ?? 5184) });
  const g = await openGame({
    url: server.url, width: 640, height: 360, quality: 'medium', resolutionScale: 0.5,
  });

  try {
    await g.qa('forcePlay', { difficulty: 'operator' });
    await g.page.waitForFunction(() => window.__NORTHSTAR__.state === 'playing', null, { timeout: 60_000 });
    await g.advance(700);

    for (const checkpoint of CHECKPOINTS) {
      await g.qa('teleport', checkpoint);
      await g.advance(350);
      const p = await g.qa('probeView');
      const names = p.visible.map((v) => `${v.id}x${v.rays}`).join(' ');
      log(`[probecheck] ${checkpoint.padEnd(11)} hits=${String(p.hits).padStart(2)} `
        + `untagged=${String(p.untagged).padStart(2)} misses=${String(p.misses).padStart(2)} `
        + `overlay=${String(p.overlayHits ?? '-').padStart(2)} `
        + `depth=${p.nearest}–${p.farthest} m`);
      log(`[probecheck]   ${names || '(nothing named)'}`);
    }
  } finally {
    await g.close();
    await server.stop();
  }
};

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
