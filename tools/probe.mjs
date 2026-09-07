#!/usr/bin/env node
import { chromium } from 'playwright';

// Dump scene-graph diagnostics from a live page. `node tools/probe.mjs` prints
// mesh counts per group; pass --eval "<expr>" to run something ad hoc.

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5173/');
const expr = arg('eval', null);

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('console', (m) => console.log(`[page:${m.type()}]`, m.text()));
page.on('pageerror', (e) => console.error('[pageerror]', e.stack || e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });

if (expr) {
  console.log(JSON.stringify(await page.evaluate(expr), null, 2));
} else {
  const info = await page.evaluate(() => {
    const { scene, vehicle } = window.debugAPI.objects;
    const walk = (o, depth = 0, out = []) => {
      const g = o.geometry;
      out.push({
        d: depth,
        name: o.name || o.type,
        type: o.type,
        mat: o.material?.name || o.material?.type || '',
        tris: g ? (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3 : 0,
        count: o.count ?? undefined,
        visible: o.visible,
      });
      for (const c of o.children) walk(c, depth + 1, out);
      return out;
    };
    return {
      scene: walk(scene),
      truck: walk(vehicle.root),
      stats: window.debugAPI.stats(),
    };
  });
  const fmt = (rows) =>
    rows
      .map((r) => `${'  '.repeat(r.d)}${r.name} [${r.type}] ${r.mat} tris=${Math.round(r.tris)}${r.count !== undefined ? ` n=${r.count}` : ''}`)
      .join('\n');
  console.log('--- scene ---\n' + fmt(info.scene));
  console.log('\n--- truck ---\n' + fmt(info.truck));
  console.log('\n--- stats ---\n' + JSON.stringify(info.stats));
}

await browser.close();
