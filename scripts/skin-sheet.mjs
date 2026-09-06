// W9 contact sheets through CDP (scripts/cdp.mjs) against a running dev server:
//
//   node scripts/skin-sheet.mjs [--url http://localhost:5218] [--out /opt/cursor/artifacts] [--prefix skins]
//                              [--sheets faces,species,outfits,eyes] [--cols N] [--zoom N] [--scale N]
//
// Opens /src/npc/appearance/sheet.html once (one headless Chrome), renders each sheet with the browser's real 2D
// canvas and writes <out>/<prefix>_<sheet>_sheet.png. Faces: 100 canonical human faces at 8x. Species: every
// species full body front + side. Outfits: every outfit front + back with colourway swatches and wear levels.
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchPage } from './cdp.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const url = opt('url', 'http://localhost:5218').replace(/\/$/, '');
const out = opt('out', '/opt/cursor/artifacts');
const prefix = opt('prefix', 'skins');
const sheets = opt('sheets', 'faces,species,outfits').split(',').map((s) => s.trim()).filter(Boolean);
const extra = {};
for (const k of ['cols', 'zoom', 'count']) if (opt(k, null) !== null) extra[k] = parseFloat(opt(k));
if (opt('scale', null) !== null) extra.S = parseFloat(opt('scale'));
if (opt('crop', null) !== null) extra.crop = opt('crop').split(',').map((v) => parseInt(v, 10)); // x,y,w,h of the sheet to save (inspection)
mkdirSync(out, { recursive: true });

const first = sheets[0];
const page = await launchPage(`${url}/src/npc/appearance/sheet.html?sheet=${first}`, { width: 1400, height: 900 });
const t0 = Date.now();
try {
  // wait for the page module to mount the first sheet
  let ready = false;
  for (let i = 0; i < 150 && !ready; i++) {
    ready = await page.evaluate('!!(window.__sheet && window.__sheet.kind)').catch(() => false);
    if (!ready) await page.sleep(200);
  }
  if (!ready) throw new Error('sheet page did not mount (' + page.exceptions.slice(0, 2).join(' | ') + ')');
  const results = [];
  for (const kind of sheets) {
    const expr = `JSON.stringify(window.__renderSheet(${JSON.stringify(kind)}, ${JSON.stringify(extra)}))`;
    let res = await page.evaluate(expr);
    if (typeof res !== 'string') { await page.sleep(500); res = await page.evaluate(expr); } // one retry: CDP can drop a large returnByValue
    if (typeof res !== 'string') throw new Error(`no result for sheet ${kind}: ${page.exceptions.slice(0, 2).join(' | ') || 'no page exceptions'}`);
    const { ms, width, height, dataURL } = JSON.parse(res);
    const path = `${out}/${prefix}_${kind}_sheet.png`;
    writeFileSync(path, Buffer.from(dataURL.split(',')[1], 'base64'));
    results.push({ kind, path, ms: Math.round(ms), width, height });
    console.log(`wrote ${path} ${width}x${height} (${Math.round(ms)} ms render)`);
  }
  const log = page.consoleLines.filter((l) => l.includes('[appearance]'));
  if (log.length) console.log(log.join('\n'));
  if (page.exceptions.length) { console.log('page exceptions:', page.exceptions.slice(0, 3).join('\n')); process.exitCode = 1; }
  console.log(`${results.length} sheet(s) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} finally { page.close(); }
