#!/usr/bin/env node
// Sample representative frames across the whole story for graphics review.
//   node tools/review.mjs --out shots/review1 --w 1280 --h 720
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildOnce, launchBrowser, startServer, parseArgs } from './harness.mjs';

const args = parseArgs(process.argv.slice(2));
const outDir = path.resolve(args.out ?? 'shots/review');
const width = Number(args.w ?? 1280);
const height = Number(args.h ?? 720);
const quality = args.q ?? 'high';
const dt = Number(args.dt ?? 1 / 12);

// label, settle seconds, then extra seconds between the two grabs
const SAMPLES = (args.samples ?? [
  'ch1.merge:2.0:2.5',
  'ch2.kneel:2.0:3.0',
  'ch2.name:2.0:3.0',
  'ch3.empathy:2.0:3.0',
  'ch3.hold:2.0:4.0',
  'ch4.start:3.0:4.0',
  'ch4.reveal:2.0:3.0',
  'ch5.warn:2.0:3.5',
  'epi.free:2.0:3.0',
].join(',')).split(',');

console.log('building...');
await buildOnce();
const { server, baseUrl } = await startServer({ mode: 'preview' });
const browser = await launchBrowser({ width, height });
await mkdir(outDir, { recursive: true });

const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

const t0 = Date.now();
await page.goto(`${baseUrl}/index.html?capture=1&w=${width}&h=${height}&q=${quality}`, {
  waitUntil: 'domcontentloaded',
  timeout: 300000,
});
await page.waitForFunction('window.__ready === true', { timeout: 900000, polling: 500 });
console.log(`page ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const report = [];
for (const sample of SAMPLES) {
  const [label, settleStr, extraStr] = sample.split(':');
  const settle = Number(settleStr ?? 2);
  const extra = Number(extraStr ?? 3);
  const t1 = Date.now();
  await page.evaluate(`window.__capture.jump(${JSON.stringify(label)})`);
  const step = async (seconds) => {
    const n = Math.max(1, Math.round(seconds / dt));
    await page.evaluate(`(() => { for (let i = 0; i < ${n}; i++) window.__capture.frame(${dt}); })()`);
  };
  await step(settle);
  const fileA = path.join(outDir, `${label}-a.png`);
  await page.screenshot({ path: fileA });
  const probe = await page.evaluate('window.__capture.probe()');
  await step(extra);
  const fileB = path.join(outDir, `${label}-b.png`);
  await page.screenshot({ path: fileB });
  console.log(
    `${label.padEnd(14)} ${((Date.now() - t1) / 1000).toFixed(1)}s  hdr mean=${probe.mean.toFixed(3)} p50=${probe.p50.toFixed(3)} p95=${probe.p95.toFixed(3)} max=${probe.max.toFixed(2)}${errors.length ? ` ERR:${errors.length}` : ''}`,
  );
  if (errors.length) console.log(`   ${errors[errors.length - 1]}`);
  errors.length = 0;
  report.push({ label, fileA, fileB, probe });
}
await writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
await browser.close();
server.kill('SIGKILL');
console.log(`\nwrote ${report.length * 2} frames to ${outDir}`);
process.exit(0);
