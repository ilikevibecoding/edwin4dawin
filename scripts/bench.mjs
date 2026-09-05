// Headless performance benchmark. Samples game.perf every second and writes a JSON report.
//   node scripts/bench.mjs --url "http://localhost:5173/?x=-8&z=2&time=0.45" --seconds 30 --label town --out bench/town.json
//   optional: --steps '[{"at":5,"eval":"game.disasters.command({type:\"start\",disaster:\"tornado\"})"}]'   --walk (player walks east)
// Per-sample frame/js/gpu numbers are windowed (frames since the previous 1 s sample); the report's averages
// are the mean of those windows and the max is the worst window, so startup frames do not dominate.
// Note: in this VM Chrome renders with SwiftShader (software GL), so FPS/GPU numbers are far below a real
// GPU; the CPU-side metrics (js ms, long tasks, memory, draw calls, entity counts) are the comparable ones.
import { launchPage } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const url = args.url || 'http://localhost:5173/';
const seconds = parseInt(args.seconds || '30', 10);
const label = args.label || 'run';
const out = args.out || `bench/${label}.json`;
const steps = args.steps ? JSON.parse(args.steps) : [];
const width = parseInt(args.width || '1280', 10), height = parseInt(args.height || '800', 10);
// --walk: hold W from t=2s until 2s before the end (headless Chrome drops the pointer lock, so key state
// and the lock flag are overridden for the duration of the walk)
if (args.walk) {
  steps.push({ at: 2, eval: 'game.player.yaw = -Math.PI / 2; game.input.isDown = (c) => c === "KeyW" || game.input.keys.has(c); Object.defineProperty(game.input, "locked", { get: () => true, set: () => {} }); "walk"' });
  steps.push({ at: Math.max(3, seconds - 2), eval: 'game.input.isDown = (c) => game.input.keys.has(c); "stop"' });
}

const page = await launchPage(url, { width, height });
const t0 = Date.now();
await page.waitForGame();
const loadWall = Date.now() - t0;
await page.evaluate('game.input.locked = true; game.input.onLockChange = null; "ok"');
const samples = [];
const done = new Set();
const start = Date.now();
while (Date.now() - start < seconds * 1000) {
  const elapsed = (Date.now() - start) / 1000;
  for (let i = 0; i < steps.length; i++) {
    if (!done.has(i) && elapsed >= steps[i].at) { done.add(i); try { const r = await page.evaluate(steps[i].eval); console.log(`[step ${i} @${elapsed.toFixed(1)}s]`, typeof r === 'string' ? r : JSON.stringify(r)); } catch (e) { console.log(`[step ${i}] ERROR`, e.message); } }
  }
  await page.sleep(1000);
  try {
    const s = await page.evaluate('JSON.stringify(game.perf.snapshot())');
    const o = JSON.parse(s); o.elapsed = +((Date.now() - start) / 1000).toFixed(1);
    samples.push(o);
  } catch (e) { console.log('sample failed', e.message); }
}
const shotPath = out.replace(/\.json$/, '.png');
mkdirSync(dirname(out), { recursive: true });
await page.screenshot(shotPath);
const avg = (k) => { const v = samples.slice(2).map((s) => s[k]).filter((x) => typeof x === 'number'); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : null; }; // skip the first 2 s (startup)
const max = (k) => { const v = samples.map((s) => s[k]).filter((x) => typeof x === 'number'); return v.length ? Math.max(...v) : null; };
const last = samples[samples.length - 1] || {};
const report = {
  label, url, seconds, date: new Date().toISOString(), loadWallMs: loadWall, loadTimeMs: last.loadTimeMs,
  fpsAvg: avg('fps'), frameAvgMs: avg('frameAvg'), frameP95Ms: avg('frameP95'), frameMaxMs: max('frameMax'),
  jsAvgMs: avg('jsAvg'), jsP95Ms: avg('jsP95'), jsMaxMs: max('jsMax'), gpuAvgMs: avg('gpuAvg'),
  drawCallsAvg: avg('drawCalls'), drawCallsMax: max('drawCalls'), trianglesAvg: avg('triangles'),
  memMBAvg: avg('memMB'), memMBMax: max('memMB'), longTasks: last.longTasks, longTaskMs: last.longTaskMs,
  entities: { npcs: last.npcs, animals: last.animals, particlesMax: max('particles'), debrisMax: max('debris'), drops: last.drops, chunks: last.chunks, meshes: last.meshes },
  net: last.net, exceptions: page.exceptions, samples,
};
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`\n== ${label} ==  (${seconds}s, load ${loadWall} ms wall / ${last.loadTimeMs} ms in-page)`);
console.log(`fps ${report.fpsAvg}  frame ${report.frameAvgMs} ms (p95 ${report.frameP95Ms}, max ${report.frameMaxMs})  js ${report.jsAvgMs} ms (p95 ${report.jsP95Ms}, max ${report.jsMaxMs})  gpu ${report.gpuAvgMs ?? 'n/a'}`);
console.log(`draw calls ${report.drawCallsAvg} (max ${report.drawCallsMax})  tris ${report.trianglesAvg}  mem ${report.memMBAvg} MB (max ${report.memMBMax})  long tasks ${report.longTasks} (${report.longTaskMs} ms)`);
console.log(`entities ${JSON.stringify(report.entities)}  net ${JSON.stringify(report.net)}  exceptions ${page.exceptions.length}`);
if (page.exceptions.length) console.log(page.exceptions.slice(0, 3).join('\n'));
console.log(`report: ${out}  screenshot: ${shotPath}`);
page.close();
process.exit(0);
