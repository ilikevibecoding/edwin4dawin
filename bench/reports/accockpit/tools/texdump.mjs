// Renders the procedural cockpit / propeller textures offline (node + @napi-rs/canvas, installed outside the repo in
// /tmp/accockpit/nodecanvas) and writes them as PNGs, so the 2D artwork (dial faces, radios, placards, checklist,
// blur maps) can be inspected at texel resolution without a Chrome slot.
//   node bench/reports/accockpit/tools/texdump.mjs <outDir> [name ...]     (names: panel, panelEmissive, inst, prop, glass)
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire('/tmp/accockpit/nodecanvas/package.json');
const { createCanvas, ImageData: NImageData } = require('@napi-rs/canvas');
const root = path.resolve(new URL('.', import.meta.url).pathname, '../../../..');
const entry = '/tmp/accockpit/textures-entry.ts';
fs.writeFileSync(entry, `export * from '${path.join(root, 'src/plane/textures')}';\n`);
const out = '/tmp/accockpit/textures-bundle.mjs';
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', target: 'node22' });

globalThis.document = { createElement: (tag) => { if (tag !== 'canvas') throw new Error(tag); const c = createCanvas(300, 150); return c; } };
globalThis.window = globalThis; globalThis.self = globalThis;
globalThis.ImageData = NImageData;

const T = await import(pathToFileURL(out).href);
const [outDir, ...names] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const want = (n) => names.length === 0 || names.includes(n);
const save = (name, tex) => {
  const c = tex.image;
  fs.writeFileSync(path.join(outDir, `${name}.png`), c.toBuffer('image/png'));
  console.log(`${name}: ${c.width}x${c.height}`);
};
if (want('panel') || want('panelEmissive')) {
  const p = T.panelTexture();
  if (want('panel')) save('panel', p.map);
  if (want('panelEmissive')) save('panelEmissive', p.emissive);
}
if (want('inst')) save('inst', T.instrumentAtlas());
if (want('prop')) {
  const m = T.propBlurMaps(0.16 * 0.6, 1.49, 0.16, 1.32, 0.17, 0.10, 0.17);
  for (const [k, v] of Object.entries(m)) if (v && v.isTexture) save(`prop_${k}`, v);
}
if (want('glass')) save('glass_dirt', T.glassDirtTexture());
if (want('gps')) {
  const g = new T.GpsScreen();
  if (g.update) g.update({ airspeed: 58, groundSpeed: 60, altitude: 320, agl: 300, verticalSpeed: 1, heading: 342 * Math.PI / 180, alpha: 0, beta: 0, stalled: false, onWater: false, onGround: false, rpm: 0.7, gForce: 1, gearDown: true, shake: 0, buffet: 0, gustLevel: 0, bank: 0, pitchAngle: 0, crashed: false, wrecked: false }, 0, 0);
  save('gps', g.texture);
}
