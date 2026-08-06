/**
 * Frame-cost benchmark.
 *
 * Answers "what is this setting worth" on the machine that actually has to
 * render the film. Fast-forwards to a story moment without drawing, then times a
 * run of drawn frames there, once per configuration. Configurations are extra
 * query strings, so any quality setting can be probed with `q.<name>=<value>`.
 *
 *   node tools/bench.mjs --at 300 --frames 12 \
 *     --config "baseline:" \
 *     --config "no reflections:q.planarReflections=0" \
 *     --config "no rain:q.rainCount=0&q.splashCount=0"
 */
import { launch } from './shot.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const all = (k) => argv.reduce((acc, v, i) => (v === `--${k}` ? [...acc, argv[i + 1]] : acc), []);

const AT = Number(arg('at', 300));
const FRAMES = Number(arg('frames', 12));
const FPS = Number(arg('fps', 24));
const W = Number(arg('w', 960));
const H = Number(arg('h', 540));
const TIER = arg('tier', 'video');
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const configs = all('config');
if (!configs.length) configs.push('baseline:');

const browser = await launch();
const results = [];
for (const config of configs) {
  const split = config.indexOf(':');
  const label = config.slice(0, split);
  const extra = config.slice(split + 1);
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });
  const url = `${BASE}/index.html?render=1&tier=${TIER}&w=${W}&h=${H}&fps=${FPS}${extra ? `&${extra}` : ''}`;
  await page.goto(url, { waitUntil: 'load', timeout: 600000 });
  await page.waitForFunction('window.__ready === true', { timeout: 600000 });

  const target = Math.round(AT * FPS);
  for (let done = 0; done < target; done += 240) {
    await page.evaluate(async (n) => { await window.__skip(n); }, Math.min(240, target - done));
  }
  // One drawn frame first: the first draw after a fast-forward pays for shader
  // compilation and texture upload, which is not what is being measured.
  await page.evaluate(async () => { await window.__step(1); });
  const ms = await page.evaluate(async (n) => {
    const t0 = performance.now();
    await window.__step(n);
    return (performance.now() - t0) / n;
  }, FRAMES);
  results.push({ label, ms });
  console.log(`${label.padEnd(24)} ${ms.toFixed(0)} ms/frame`);
  await page.close();
}
await browser.close();

const base = results[0]?.ms ?? 0;
console.log('\nrelative to first config:');
for (const r of results) {
  const delta = base ? ((r.ms - base) / base) * 100 : 0;
  console.log(`  ${r.label.padEnd(24)} ${r.ms.toFixed(0)} ms  ${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`);
}
