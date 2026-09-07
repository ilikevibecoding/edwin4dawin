// Offline triangle / draw-call accounting for the aircraft model: bundles `src/plane/model.ts` with esbuild, runs it
// in node with a no-op 2D canvas (the textures are painted into fakes; only the geometry matters here) and prints the
// per-mesh triangle table the same way the gated still session does, so the budget can be checked every round
// without a Chrome slot.  node bench/reports/accockpit/tools/tricount.mjs [--json out.json] [--grep name]
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(new URL('.', import.meta.url).pathname, '../../../..');
const out = '/tmp/accockpit/model-bundle.mjs';
fs.mkdirSync(path.dirname(out), { recursive: true });
await build({ entryPoints: [path.join(root, 'src/plane/model.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', target: 'node22' });

// ---- DOM stand-ins: a canvas whose 2D context swallows every call
const gradient = { addColorStop() {} };
const ctx2d = (canvas) => new Proxy({}, {
  get(_, key) {
    if (key === 'canvas') return canvas;
    if (key === 'getImageData' || key === 'createImageData') return (a, b, c, d) => { const w = typeof c === 'number' ? c : a, h = typeof d === 'number' ? d : b; return { width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }; };
    if (key === 'measureText') return () => ({ width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
    if (key === 'createLinearGradient' || key === 'createRadialGradient' || key === 'createConicGradient') return () => gradient;
    if (key === 'createPattern') return () => ({});
    if (key === 'isPointInPath') return () => false;
    return () => {};
  },
  set() { return true; },
});
const makeCanvas = () => { const c = { width: 300, height: 150, style: {}, toDataURL: () => '', getContext() { return ctx2d(c); }, addEventListener() {}, removeEventListener() {} }; return c; };
globalThis.document = { createElement: (tag) => tag === 'canvas' ? makeCanvas() : { style: {}, appendChild() {}, setAttribute() {} }, createElementNS: () => makeCanvas(), body: { appendChild() {} } };
globalThis.window = globalThis; globalThis.self = globalThis;
globalThis.navigator ??= { userAgent: 'node' };
globalThis.requestAnimationFrame = (f) => setTimeout(f, 16);
globalThis.ImageData = class { constructor(a, b, c) { if (a instanceof Uint8ClampedArray) { this.data = a; this.width = b; this.height = c ?? a.length / 4 / b; } else { this.width = a; this.height = b; this.data = new Uint8ClampedArray(a * b * 4); } } };
globalThis.OffscreenCanvas = class { constructor(w, h) { const c = makeCanvas(); c.width = w; c.height = h; return c; } };
globalThis.Image = class { constructor() { this.width = 1; this.height = 1; } };

const { PlaneModel } = await import(pathToFileURL(out).href);
const model = new PlaneModel();
const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const grep = args.includes('--grep') ? new RegExp(args[args.indexOf('--grep') + 1]) : null;

// the model does not name its meshes: label them from the public fields (animated parts) and, for the rest, from
// the material and the order of creation (the merged batches are the last meshes made)
const label = new Map();
for (const [k, v] of Object.entries(model)) {
  if (k === 'root') continue;
  if (v && v.isObject3D) v.traverse((o) => { if (o.isMesh && !label.has(o)) label.set(o, k); });
  if (Array.isArray(v)) v.forEach((e, i) => { if (e && e.isObject3D && k !== 'exteriorMeshes' && k !== 'interiorMeshes') e.traverse((o) => { if (o.isMesh && !label.has(o)) label.set(o, `${k}[${i}]`); }); });
}
const matIndex = new Map(model.materials.map((m, i) => [m, i]));
const matName = new Map();
for (const [k, v] of Object.entries(model)) if (v && v.isMaterial) matName.set(v, k);
const rows = [];
let unnamed = 0;
model.root.traverse((o) => {
  if (!o.isMesh) return;
  const g = o.geometry;
  const tris = Math.round((g.index ? g.index.count : g.getAttribute('position').count) / 3);
  let vis = true, p = o;
  while (p) { if (!p.visible) vis = false; p = p.parent; }
  rows.push({ name: o.name || label.get(o) || `#${unnamed++}`, mat: matIndex.get(o.material) ?? -1, matType: o.material.type, matName: matName.get(o.material) || o.material.name || '', tris, visible: vis, exterior: model.exteriorMeshes.includes(o), renderOrder: o.renderOrder, transparent: !!o.material.transparent });
});
const sum = (f) => rows.filter(f).reduce((a, r) => a + r.tris, 0);
const summary = {
  meshes: rows.length, meshesVisible: rows.filter((r) => r.visible).length,
  exteriorMeshes: rows.filter((r) => r.exterior).length, interiorMeshes: rows.filter((r) => !r.exterior).length,
  trisAll: sum(() => true), trisVisible: sum((r) => r.visible), trisExterior: sum((r) => r.exterior), trisInterior: sum((r) => !r.exterior),
  materials: model.materials.length,
};
console.log(JSON.stringify(summary));
const shown = rows.filter((r) => !grep || grep.test(r.name) || grep.test(r.matType) || grep.test(r.matName));
for (const r of shown) console.log(`${String(r.tris).padStart(7)}  ${r.visible ? 'vis' : 'hid'}  ${r.exterior ? 'ext' : 'int'}  mat${String(r.mat).padStart(2)} ${(r.matName || r.matType).padEnd(14)} ro=${String(r.renderOrder).padStart(2)} ${r.transparent ? 'T' : ' '}  ${r.name}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ summary, rows }, null, 1));
