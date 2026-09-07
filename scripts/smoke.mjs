// Integration smoke test: load several vantage points, wait, report exceptions + console errors + counters, screenshot.
import { launchPage } from './cdp.mjs';
const base = process.argv[2] || 'http://localhost:5173/';
const views = JSON.parse(process.argv[3] || '[]');
const outDir = process.argv[4] || '/tmp/smoke';
import { mkdirSync } from 'node:fs';
mkdirSync(outDir, { recursive: true });
let bad = 0;
for (const v of views) {
  const url = base + v.q;
  const page = await launchPage(url, { width: 1280, height: 720 });
  try {
    await page.waitForGame(180000);
    await page.evaluate('game.input.locked = true; game.input.onLockChange = null; "ok"');
    await page.sleep(v.wait || 8000);
    if (v.eval) { const r = await page.evaluate(v.eval); console.log(`[${v.name}] eval:`, JSON.stringify(r).slice(0, 600)); }
    if (v.after) await page.sleep(v.after);
    const info = await page.evaluate('JSON.stringify({chunks: game.terrain.stats.chunks, meshes: game.terrain.stats.meshed, draws: game.renderer.info.render.calls, tris: game.renderer.info.render.triangles, npcs: game.npcs ? game.npcs.list.length : -1, pos: [Math.round(game.player.pos.x), Math.round(game.player.pos.y), Math.round(game.player.pos.z)], heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : -1})');
    await page.screenshot(`${outDir}/${v.name}.png`);
    const errs = page.consoleLines.filter((l) => /error|exception|failed|warn/i.test(l) && !/DevTools|GPU stall|WebGL warning.*too many/i.test(l));
    console.log(`[${v.name}] ${info}`);
    console.log(`[${v.name}] exceptions: ${page.exceptions.length}${page.exceptions.length ? '\n  ' + page.exceptions.slice(0, 5).join('\n  ') : ''}`);
    if (errs.length) console.log(`[${v.name}] console: \n  ${errs.slice(0, 12).join('\n  ')}`);
    if (page.exceptions.length) bad++;
  } catch (e) { console.log(`[${v.name}] FAILED: ${e.message}`); console.log(page.exceptions.slice(0, 5).join('\n')); console.log(page.consoleLines.slice(-15).join('\n')); bad++; }
  page.close();
}
process.exit(bad ? 1 : 0);
