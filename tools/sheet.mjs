#!/usr/bin/env node
/**
 * Contact sheets.
 *
 * Reviewing a five minute film one screenshot at a time is hopeless, so this
 * walks the whole timeline at a fixed interval and tiles the frames into a
 * handful of labelled sheets. It is the cheapest way to spot a camera inside a
 * wall, a blown highlight or an actor who never made it into frame.
 *
 *   npm run sheet -- --every=4 --dir=/tmp/sheet
 *   npm run sheet -- --from=80 --to=120 --every=1.5 --dir=/tmp/boarding
 */
import { mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { startServer, launch, openFilm } from './browser.mjs';

const args = Object.fromEntries(process.argv.slice(2)
  .filter((a) => a.startsWith('--'))
  .map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));

const W = +(args.w || 512), H = +(args.h || 288);
const every = +(args.every || 4);
const cols = +(args.cols || 3), rows = +(args.rows || 3);
const dir = resolve(args.dir || '/tmp/sheet');
const frames = join(dir, 'frames');

rmSync(dir, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

const { server, port } = await startServer();
const { browser, page } = await launch({ width: W, height: H });

let code = 0;
try {
  await openFilm(page, port, { width: W, height: H, quality: args.quality || 'high' });
  const duration = await page.evaluate(() => window.__film.duration);
  const from = +(args.from || 0);
  const to = Math.min(+(args.to || duration), duration - 0.05);

  const times = [];
  for (let t = from; t < to; t += every) times.push(+t.toFixed(2));
  process.stdout.write(`film ${duration.toFixed(1)}s -- ${times.length} frames every ${every}s\n`);

  const t0 = Date.now();
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    await page.evaluate((x) => window.__film.renderAt(Math.max(0, x - 1 / 30)), t);
    await page.evaluate((x) => window.__film.renderAt(x), t);
    await page.screenshot({ path: join(frames, `${String(i).padStart(3, '0')}_${t.toFixed(2)}.png`) });
    if (i % 10 === 9) {
      const per = (Date.now() - t0) / (i + 1) / 1000;
      process.stdout.write(`  ${i + 1}/${times.length}  ${per.toFixed(2)}s/frame  eta ${((times.length - i - 1) * per).toFixed(0)}s\n`);
    }
  }

  const py = spawnSync('python3', [join(import.meta.dirname, 'tile.py'), frames, dir, String(cols), String(rows)], { encoding: 'utf8' });
  process.stdout.write(py.stdout || '');
  if (py.stderr) process.stderr.write(py.stderr);
} catch (e) {
  code = 1;
  process.stderr.write(`FAILED: ${e.message}\n${e.stack}\n`);
} finally {
  await browser.close();
  await server.close();
  process.exit(code);
}
