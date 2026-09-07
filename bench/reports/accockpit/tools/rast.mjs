// Geometry preview without a browser: builds the aircraft model in node (same bundle as tricount) and rasterises it
// with a tiny z-buffered software renderer (flat Lambert shading of the tagged per-vertex colours, no textures, no
// glass) from cameras given in BODY space (+X nose, +Y up, +Z starboard). Enough to judge proportions, placement,
// intersections and silhouettes of the pilot, the hands, the panel relief and the blades while the Chrome gate is
// busy; the real stills remain the verdict on materials and light.
//   node rast.mjs <out.png> <w> <h> <fovDeg> <camX,camY,camZ> <lookX,lookY,lookZ> [sunX,sunY,sunZ] [--hide name,..]
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire('/tmp/accockpit/nodecanvas/package.json');
const { createCanvas } = require('@napi-rs/canvas');

const gradient = { addColorStop() {} };
const ctx2d = (canvas) => new Proxy({}, { get(_, key) {
  if (key === 'canvas') return canvas;
  if (key === 'getImageData' || key === 'createImageData') return (a, b, c, d) => { const w = typeof c === 'number' ? c : a, h = typeof d === 'number' ? d : b; return { width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }; };
  if (key === 'measureText') return () => ({ width: 10 });
  if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
  return () => {};
}, set() { return true; } });
const makeCanvas = () => { const c = { width: 300, height: 150, style: {}, getContext() { return ctx2d(c); } }; return c; };
globalThis.document = { createElement: () => makeCanvas() };
globalThis.window = globalThis; globalThis.self = globalThis;
globalThis.ImageData = class { constructor(a, b, c) { this.data = a; this.width = b; this.height = c; } };

const args = process.argv.slice(2);
const hideIdx = args.indexOf('--hide');
const hide = hideIdx >= 0 ? new Set(args.splice(hideIdx, 2)[1].split(',')) : new Set();
const [out, W, H, FOV, camS, lookS, sunS = '0.5,0.8,-0.3'] = args;
const w = Number(W), h = Number(H), fov = Number(FOV) * Math.PI / 180;
const cam = camS.split(',').map(Number), look = lookS.split(',').map(Number), sunV = sunS.split(',').map(Number);

const { PlaneModel } = await import(pathToFileURL('/tmp/accockpit/model-bundle.mjs').href);
const model = new PlaneModel();
model.root.updateMatrixWorld(true);
const label = new Map();
for (const [k, v] of Object.entries(model)) { if (k === 'root') continue; if (v && v.isObject3D) v.traverse((o) => { if (o.isMesh && !label.has(o)) label.set(o, k); }); }

// camera basis (right-handed, looking down -z in view space)
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const fwd = norm(sub(look, cam));
let upHint = Math.abs(fwd[1]) > 0.99 ? [1, 0, 0] : [0, 1, 0];
const right = norm(cross(fwd, upHint)), up = cross(right, fwd);
const f = 1 / Math.tan(fov / 2), aspect = w / h, near = 0.05;
const sun = norm(sunV);

const color = new Float32Array(w * h * 3), depth = new Float32Array(w * h).fill(Infinity);
// sky / ground backdrop
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = (y * w + x) * 3; const t = y / h; color[k] = 0.35 + 0.2 * t; color[k + 1] = 0.5 + 0.15 * t; color[k + 2] = 0.75; }

const toView = (p) => { const d = sub(p, cam); return [dot(d, right), dot(d, up), -dot(d, fwd)]; };
let tris = 0, drawn = 0;
model.root.traverse((o) => {
  if (!o.isMesh) return;
  let vis = true, p = o; while (p) { if (!p.visible) vis = false; p = p.parent; }
  const name = label.get(o) || '';
  if (!vis || hide.has(name)) return;
  const m = o.material;
  if (m === model.glassMaterial) return;
  if (m.transparent && m.opacity < 0.999) return;
  if (m.blending !== undefined && m.blending !== 1) return; // NormalBlending only
  // the motion-blur streaks / disc are alpha-driven by a uniform (0 at rest): not drawable here
  if (m.customProgramCacheKey && String(m.customProgramCacheKey()).startsWith('prop-blur')) return;
  const g = o.geometry, pos = g.getAttribute('position'), col = g.getAttribute('color'), idx = g.index;
  const e = o.matrixWorld.elements;
  const n = pos.count, wp = new Float32Array(n * 3), vp = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14];
    wp[i * 3] = X; wp[i * 3 + 1] = Y; wp[i * 3 + 2] = Z;
    const v = toView([X, Y, Z]); vp[i * 3] = v[0]; vp[i * 3 + 1] = v[1]; vp[i * 3 + 2] = v[2];
  }
  const base = m.color ? [m.color.r, m.color.g, m.color.b] : [0.7, 0.7, 0.7];
  const hasCol = !!col;
  const sideBoth = m.side === 2, sideBack = m.side === 1;
  const count = idx ? idx.count : n;
  const I = (k) => idx ? idx.getX(k) : k;
  for (let t = 0; t < count; t += 3) {
    const a = I(t), b = I(t + 1), c = I(t + 2);
    tris++;
    const za = vp[a * 3 + 2], zb = vp[b * 3 + 2], zc = vp[c * 3 + 2];
    if (za > -near || zb > -near || zc > -near) continue; // behind / straddling the near plane: dropped
    // world-space face normal for the light
    const ab = [wp[b * 3] - wp[a * 3], wp[b * 3 + 1] - wp[a * 3 + 1], wp[b * 3 + 2] - wp[a * 3 + 2]];
    const ac = [wp[c * 3] - wp[a * 3], wp[c * 3 + 1] - wp[a * 3 + 1], wp[c * 3 + 2] - wp[a * 3 + 2]];
    let fn = norm(cross(ab, ac));
    // project
    const px = (i) => (vp[i * 3] / -vp[i * 3 + 2]) * f / aspect, py = (i) => (vp[i * 3 + 1] / -vp[i * 3 + 2]) * f;
    const ax = (px(a) * 0.5 + 0.5) * w, ay = (0.5 - py(a) * 0.5) * h;
    const bx = (px(b) * 0.5 + 0.5) * w, by = (0.5 - py(b) * 0.5) * h;
    const cx = (px(c) * 0.5 + 0.5) * w, cy = (0.5 - py(c) * 0.5) * h;
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (area === 0) continue;
    const front = area < 0; // screen y is down: a CCW triangle in NDC has negative area here
    if (!sideBoth && (sideBack ? front : !front)) continue;
    if (!front) fn = [-fn[0], -fn[1], -fn[2]];
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by, cy)));
    if (x1 < x0 || y1 < y0) continue;
    const lam = Math.max(0, dot(fn, sun));
    const shade = 0.30 + 0.75 * lam;
    const cr = hasCol ? (col.getX(a) + col.getX(b) + col.getX(c)) / 3 : 1, cg = hasCol ? (col.getY(a) + col.getY(b) + col.getY(c)) / 3 : 1, cb = hasCol ? (col.getZ(a) + col.getZ(b) + col.getZ(c)) / 3 : 1;
    const R = base[0] * cr * shade, G = base[1] * cg * shade, B = base[2] * cb * shade;
    const iza = 1 / -za, izb = 1 / -zb, izc = 1 / -zc;
    drawn++;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const qx = x + 0.5, qy = y + 0.5;
      let w0 = ((bx - qx) * (cy - qy) - (by - qy) * (cx - qx)) / area;
      let w1 = ((cx - qx) * (ay - qy) - (cy - qy) * (ax - qx)) / area;
      let w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const iz = w0 * iza + w1 * izb + w2 * izc, z = 1 / iz;
      const k = y * w + x;
      if (z >= depth[k]) continue;
      depth[k] = z;
      color[k * 3] = R; color[k * 3 + 1] = G; color[k * 3 + 2] = B;
    }
  }
});
const cv = createCanvas(w, h), c2 = cv.getContext('2d'), img = c2.createImageData(w, h);
const srgb = (v) => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)));
for (let i = 0; i < w * h; i++) { img.data[i * 4] = srgb(color[i * 3]); img.data[i * 4 + 1] = srgb(color[i * 3 + 1]); img.data[i * 4 + 2] = srgb(color[i * 3 + 2]); img.data[i * 4 + 3] = 255; }
c2.putImageData(img, 0, 0);
fs.writeFileSync(out, cv.toBuffer('image/png'));
console.log(`${out}: ${w}x${h}, ${drawn}/${tris} triangles drawn`);
