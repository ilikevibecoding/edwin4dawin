#!/usr/bin/env node
// Capture framed stills from shots.html for graphics review.
//   node tools/shots.mjs --out shots/round1 --shots street-wide,street-closeup
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildOnce, launchBrowser, startServer, parseArgs } from './harness.mjs';

const args = parseArgs(process.argv.slice(2));
const outDir = path.resolve(args.out ?? 'shots/latest');
const width = Number(args.w ?? 1600);
const height = Number(args.h ?? 900);
const quality = args.q ?? 'high';
const settle = args.settle ?? '1.2';
const shots = (args.shots ??
  'street-wide,street-closeup,street-two-shot,apartment-wide,apartment-closeup,interrogation-wide,interrogation-closeup,garden-wide,rooftop-standoff'
).split(',');

console.log('building...');
await buildOnce();
const { server, baseUrl } = await startServer({ mode: 'preview' });
const browser = await launchBrowser({ width, height });
await mkdir(outDir, { recursive: true });

const report = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[error] ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

  const clay = args.clay ? '&clay=1' : '';
  const url = `${baseUrl}/shots.html?shot=${shots[0]}&w=${width}&h=${height}&q=${quality}&settle=${settle}${clay}`;
  const tLoad = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction('window.__shotReady === true', { timeout: 600000, polling: 500 });
  console.log(`page ready in ${((Date.now() - tLoad) / 1000).toFixed(1)}s`);

  for (const [i, shot] of shots.entries()) {
    const before = errors.length;
    const t0 = Date.now();
    const info =
      i === 0
        ? await page.evaluate('window.__shotInfo')
        : await page.evaluate(`window.__loadShot(${JSON.stringify(shot)}, ${Number(settle)})`);
    const file = path.join(outDir, `${shot}.png`);
    await page.screenshot({ path: file, captureBeyondViewport: false });
    const frameMs = await page.evaluate(`(async () => {
      const g = window.__game;
      const gl = g.renderer.getContext();
      const px = new Uint8Array(4);
      const N = 3;
      g.frame(1 / 30);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const t0 = performance.now();
      for (let k = 0; k < N; k++) {
        g.frame(1 / 30);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      }
      return (performance.now() - t0) / N;
    })()`);
    const newErrors = errors.slice(before);
    report.push({ shot, file, ms: Date.now() - t0, frameMs: Math.round(frameMs), ...info, errors: newErrors.slice(0, 6) });
    console.log(
      `${shot.padEnd(24)} ${String(Math.round(frameMs)).padStart(5)}ms/frame  tris=${info?.triangles ?? '?'} calls=${info?.calls ?? '?'} lights=${info?.lights ?? '?'}  build=${(info?.buildSetMs ?? 0) + (info?.buildActorsMs ?? 0)}ms  total=${((Date.now() - t0) / 1000).toFixed(1)}s${newErrors.length ? `  ERR:${newErrors.length}` : ''}`,
    );
    for (const e of newErrors.slice(0, 4)) console.log(`    ${e}`);
  }
  await writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  server.kill('SIGKILL');
}
console.log(`\nwrote ${report.length} shots to ${outDir}`);
process.exit(0);
