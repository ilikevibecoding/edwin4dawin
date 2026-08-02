#!/usr/bin/env node
/**
 * Screenshot the film at one or more absolute times. The fast way to iterate
 * on a scene:
 *
 *   npm run frame -- --t=12.5 --out=/tmp/f.png
 *   npm run frame -- --times=0,6,14,30,48 --dir=/tmp/title
 */
import { mkdirSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { startServer, launch, openFilm } from './browser.mjs';

const args = Object.fromEntries(process.argv.slice(2)
  .filter((a) => a.startsWith('--'))
  .map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));

const W = +(args.w || 1280), H = +(args.h || 720);
const times = (args.times ? args.times.split(',') : [args.t || '0']).map(Number);
const dir = args.dir ? resolve(args.dir) : null;
const out = args.out ? resolve(args.out) : null;

const { server, port } = await startServer();
const { browser, page } = await launch({ width: W, height: H });

let code = 0;
try {
  const t0 = Date.now();
  await openFilm(page, port, { width: W, height: H, quality: args.quality || 'high' });
  const chapters = await page.evaluate(() => window.__film.chapters());
  const dur = await page.evaluate(() => window.__film.duration);
  process.stdout.write(`film ${dur.toFixed(1)}s, built in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
  for (const c of chapters) process.stdout.write(`  ${c.id.padEnd(10)} ${c.start.toFixed(1).padStart(7)} +${c.dur.toFixed(1)}\n`);

  for (const t of times) {
    const p0 = Date.now();
    // two passes: the first settles dt-dependent state, the second is the keeper
    await page.evaluate((x) => window.__film.renderAt(Math.max(0, x - 1 / 30)), t);
    await page.evaluate((x) => window.__film.renderAt(x), t);
    const file = out && times.length === 1 ? out : join(dir || '/tmp/frames', `t${t.toFixed(2).replace('.', '_')}.png`);
    mkdirSync(dirname(file), { recursive: true });
    await page.screenshot({ path: file });
    process.stdout.write(`t=${t.toFixed(2)}s -> ${file}  (${((Date.now() - p0) / 1000).toFixed(2)}s)\n`);
  }
} catch (e) {
  code = 1;
  process.stderr.write(`FAILED: ${e.message}\n${e.stack}\n`);
} finally {
  await browser.close();
  await server.close();
  process.exit(code);
}
