import * as THREE from 'three';
import {
  cached,
  canvasTexture,
  clamp,
  cutoutTexture,
  fbm,
  lerp,
  mixRgb,
  mulberry32,
  normalFromHeight,
  smoothstep,
  worley,
} from '../../textures/core.js';
import { FACE, HEAD_SPLIT, HEAD_Z0, HEAD_Z1, headPoint } from './headspec.js';

// ---------------------------------------------------------------------------
// Every texture a lion wears, drawn on canvases.
//
// One atlas carries the whole animal so the skinned body is a single draw.
// Regions are in UV space (v up); the geometry maps each part into its region
// with `uvIn`, and the painters below draw into the same rectangles, so the
// two agree by construction rather than by a shared constant nobody reads.
// ---------------------------------------------------------------------------

export const ATLAS = {
  body: [0, 0.5, 1, 1],
  leg: [0, 0.25, 0.5, 0.5],
  skull: [0.5, 0.25, 1, 0.5],
  muzzle: [0, 0.125, 0.25, 0.25],
  nose: [0.25, 0.125, 0.375, 0.25],
  eye: [0.375, 0.125, 0.5, 0.25],
  earOut: [0.5, 0.125, 0.625, 0.25],
  earIn: [0.625, 0.125, 0.75, 0.25],
  pad: [0.75, 0.125, 0.875, 0.25],
  claw: [0.875, 0.125, 1, 0.25],
  jaw: [0, 0, 0.25, 0.125],
  tail: [0.25, 0, 0.75, 0.125],
  lid: [0.75, 0, 1, 0.125],
};

/** Map a part's own (u, v) in [0,1]² into an atlas region. */
export function uvIn(rect, u, v) {
  return [rect[0] + (rect[2] - rect[0]) * clamp(u), rect[1] + (rect[3] - rect[1]) * clamp(v)];
}

/**
 * The skull region is cylindrical about a vertical axis through the skull, in
 * head space (forward +z, up +y, unit head metres): u from the angle about
 * (0, cz), face at u = 0.5; v from height over `vSpan` centred on cy. The
 * geometry maps with this and the painter inverts it, so a mark placed here in
 * metres lands on the animal in metres.
 */
export const SKULL_MAP = { cy: 0.026, cz: 0.06, vSpan: 0.24, r: 0.115 };

// coat palette, [r,g,b] 0-255. Warm tawny over a cream ventral, umber dorsal;
// kept a little grey so the animal separates from red laterite.
const COAT = {
  side: [196, 168, 130],
  back: [150, 124, 94],
  belly: [222, 203, 168],
  dust: [138, 122, 100],
  cream: [234, 222, 198],
  black: [24, 18, 14],
  lip: [46, 32, 26],
  noseLeather: [48, 36, 32],
  noseBridge: [116, 74, 66],
  earBack: [30, 24, 20],
  earIn: [201, 173, 140],
  earPink: [176, 134, 118],
  pad: [58, 44, 36],
  clawBase: [206, 190, 164],
  clawTip: [90, 74, 60],
  irisOuter: [118, 76, 28],
  irisInner: [192, 134, 50],
  sclera: [196, 172, 134],
};

const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/** Pixel rectangle for a region on a canvas of size S (canvas y runs down). */
function px(rect, S) {
  const x0 = rect[0] * S;
  const y0 = (1 - rect[3]) * S;
  return { x0, y0, w: (rect[2] - rect[0]) * S, h: (rect[3] - rect[1]) * S };
}

/**
 * Fill a region per pixel. `fn(u, v, out)` gets the part's own (u, v) with v up
 * and writes [r,g,b] into out. Runs on the region's ImageData directly, which is
 * the only affordable way to put noise into a million pixels.
 */
function fillRegion(ctx, rect, S, fn) {
  const r = px(rect, S);
  const w = Math.round(r.w);
  const h = Math.round(r.h);
  const img = ctx.getImageData(Math.round(r.x0), Math.round(r.y0), w, h);
  const d = img.data;
  const out = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    const v = 1 - (y + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      fn(u, v, out);
      const i = (y * w + x) * 4;
      d[i] = clamp(out[0], 0, 255);
      d[i + 1] = clamp(out[1], 0, 255);
      d[i + 2] = clamp(out[2], 0, 255);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, Math.round(r.x0), Math.round(r.y0));
}

/**
 * Short hair strokes along the canvas vertical, which is "along the animal" for
 * the body, legs and tail regions. This is the 1 cm grain: without it a coat is
 * a colour, with it the surface has a direction.
 */
function hairStrokes(ctx, rect, S, rnd, { count, len = [6, 14], light = 0.11, dir = 0 } = {}) {
  const r = px(rect, S);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x0, r.y0, r.w, r.h);
  ctx.clip();
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const x = r.x0 + rnd() * r.w;
    const y = r.y0 + rnd() * r.h;
    const l = lerp(len[0], len[1], rnd()) * (S / 1024);
    const a = dir + (rnd() - 0.5) * 0.5;
    const shade = (rnd() - 0.5) * 2 * light;
    ctx.strokeStyle = shade > 0 ? `rgba(255,240,215,${shade})` : `rgba(40,25,12,${-shade})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(a) * l, y + Math.cos(a) * l);
    ctx.stroke();
  }
  ctx.restore();
}

/** Small dark specks, the ticking of a lion's coat where dark hair tips show. */
function ticking(ctx, rect, S, rnd, count, color = 'rgba(50,32,18,0.45)', size = 1.2) {
  const r = px(rect, S);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = r.x0 + rnd() * r.w;
    const y = r.y0 + rnd() * r.h;
    const s = size * (0.6 + rnd() * 0.8) * (S / 1024);
    ctx.fillRect(x, y, s, s);
  }
}

function coatShade(u, v, seed, { spots, su = u, sv = v }) {
  // elevation around the body: 0 at the belly seam, 1 on the spine
  const e = 1 - Math.abs(2 * u - 1);
  let c = mixRgb(COAT.belly, COAT.side, smoothstep(0.06, 0.42, e));
  c = mixRgb(c, COAT.back, smoothstep(0.55, 1.0, e) * 0.85);
  // dorsal stripe, and the greyer saddle over the shoulders (v toward the head)
  c = mixRgb(c, COAT.black, 0.14 * smoothstep(0.035, 0.0, Math.abs(u - 0.5)));
  c = mixRgb(c, COAT.dust, 0.25 * smoothstep(0.5, 0.9, e) * smoothstep(0.5, 0.75, v) * smoothstep(0.95, 0.8, v));
  const m0 = fbm(u * 3 + seed, v * 4, { octaves: 2, period: 8, seed: 397 + seed });
  const m1 = fbm(u * 6 + seed, v * 9, { octaves: 3, period: 16, seed: 401 + seed });
  const m2 = fbm(u * 38, v * 52 + seed, { octaves: 3, period: 64, seed: 409 + seed });
  const light = 1 + (m0 - 0.5) * 0.16 + (m1 - 0.5) * 0.26 + (m2 - 0.5) * 0.16;
  c = [c[0] * light, c[1] * light, c[2] * light];
  if (spots) {
    // cub rosettes: sparse cells, strongest on the belly and flanks, fading
    // toward the spine and the way they fade on the animal itself as it grows
    const w = worley(su * 22, sv * 30, 22, 77);
    const spot = smoothstep(0.34, 0.2, w.f1) * (0.45 + 0.55 * w.id) * (1 - smoothstep(0.7, 1.0, e)) * 0.55;
    c = mixRgb(c, COAT.lip, spot);
  }
  // dust and environmental wear, heaviest along the belly seam
  const dust = smoothstep(0.32, 0.0, e) * (0.55 + 0.45 * m2);
  c = mixRgb(c, COAT.dust, dust * 0.55);
  return c;
}

/** Distance from a point to a segment, all in head metres. */
function segDist(x, y, z, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const l2 = dx * dx + dy * dy + dz * dz;
  const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy + (z - a[2]) * dz) / l2);
  return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t, z - a[2] - dz * t);
}

/**
 * The face, shaded at a point on the upper-head loft (head metres, x ≥ 0 —
 * the loft's texture is mirrored). `a` is the angle around the section from
 * under the lip; (nu, nv) are noise coordinates continuous across the two
 * regions. Colour is written to `o`.
 *
 * Tawny over the crown and the nose bridge, cream on the muzzle, under the
 * eye and along the jaw; the eye set in a soft dark ring with the tear line
 * running from its inner corner down the muzzle; whisker spots in rows on the
 * pads; a dark lip line under the upper lip that drops at the mouth corner,
 * the philtrum splitting the lip under the nose, and the nose leather painted
 * on the front for the tiers that carry no nose geometry.
 */
function faceShade(hx, hy, hz, a, nu, nv, o) {
  const [ex, ey, ez] = FACE.eye;
  // crown and back of the head: darker; the temples and the nose bridge warm tawny
  // the forehead, temples and the bridge are the darkest of the face, the
  // ground the pale markings are read against
  const crown = smoothstep(0.02, 0.07, hy) * smoothstep(0.24, 0.1, hz);
  let c = mixRgb(COAT.side, COAT.back, crown * 0.6 + smoothstep(0.0, -0.06, hz) * 0.3);
  const bridge = smoothstep(0.045, 0.02, hx) * smoothstep(0.17, 0.22, hz) * smoothstep(0.35, 0.33, hz) * smoothstep(0.02, 0.04, hy);
  c = mixRgb(c, COAT.noseBridge, bridge * 0.4);
  // the muzzle and the lip are cream up to the nose bridge; the whisker pads whitest
  const muzzlePale = smoothstep(0.19, 0.24, hz) * smoothstep(0.04, 0.0, hy);
  c = mixRgb(c, COAT.cream, muzzlePale * 0.55);
  const [wx, wy, wz] = FACE.whiskerPad;
  const pad = Math.hypot((hy - wy) * 1.2, hz - wz);
  c = mixRgb(c, COAT.cream, smoothstep(0.045, 0.02, pad) * smoothstep(0.03, 0.045, hx) * 0.5);
  // the cheek and jowl below the eye line, and the jaw edge, go pale
  const cheekPale = smoothstep(0.0, -0.035, hy) * smoothstep(0.02, 0.09, hz) * smoothstep(0.24, 0.16, hz);
  c = mixRgb(c, COAT.cream, cheekPale * 0.3);
  // the bold pale patch under the eye that frames a cat's eye
  const pu = Math.hypot((hx - ex) * 1.1, (hy - ey + 0.036) * 1.5, hz - ez - 0.012);
  c = mixRgb(c, COAT.cream, smoothstep(0.034, 0.018, pu));
  // a pale brow spot
  const bu = Math.hypot(hx - ex + 0.004, (hy - ey - 0.042) * 1.5, hz - ez + 0.012);
  c = mixRgb(c, COAT.cream, smoothstep(0.026, 0.012, bu) * 0.45);
  // the eye: a soft dark ring outside the lids, darkest at the inner corner
  const de = Math.hypot(hx - ex, hy - ey, hz - ez);
  const inner = smoothstep(0.06, 0.03, hx);
  c = mixRgb(c, COAT.lip, smoothstep(0.036, 0.026, de) * (0.35 + 0.35 * inner));
  // the black eyeline on the skin around the almond, where the socket's
  // recess meets the lid rims: it hides the facets of that edge and draws the
  // eye's outline from two metres
  c = mixRgb(c, COAT.black, smoothstep(0.028, 0.0235, de) * 0.9);
  // the dark line at the outer corner, back toward the temple
  const wing = segDist(hx, hy, hz, [ex + 0.018, ey - 0.002, ez - 0.006], [ex + 0.034, ey + 0.004, ez - 0.03]);
  c = mixRgb(c, COAT.lip, smoothstep(0.007, 0.0025, wing) * 0.7);
  // tear line from the inner corner down the side of the muzzle
  const tear = segDist(hx, hy, hz, [ex - 0.02, ey - 0.008, ez + 0.012], [ex - 0.012, ey - 0.052, ez + 0.085]);
  c = mixRgb(c, COAT.lip, smoothstep(0.009, 0.0035, tear) * 0.85 * smoothstep(0.26, 0.21, hz));
  // whisker spots: four rows of follicles on the pad, a few millimetres each
  if (hx > 0.04 && hz > 0.25) {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        const sy = 0.014 - row * 0.0125;
        const sz = 0.255 + col * 0.013 + (row % 2) * 0.006;
        const d = Math.hypot(hy - sy, hz - sz);
        c = mixRgb(c, COAT.lip, smoothstep(0.0038, 0.0018, d) * 0.7);
      }
    }
  }
  // the lip: a dark line along the seam under the upper lip, dropping at the
  // corner of the mouth into the jowl
  const [cx, cy, cz] = FACE.mouthCorner;
  const arc = a * 0.06; // arc distance from the seam, roughly
  const lip = smoothstep(0.0085, 0.0025, arc) * smoothstep(cz - 0.01, cz + 0.02, hz);
  c = mixRgb(c, COAT.lip, lip * 0.95);
  const corner = segDist(hx, hy, hz, [cx - 0.004, cy + 0.008, cz + 0.01], [cx + 0.01, cy - 0.02, cz - 0.03]);
  c = mixRgb(c, COAT.lip, smoothstep(0.009, 0.003, corner) * 0.7);
  // philtrum: the split of the upper lip under the nose
  const [nx, ny, nz] = FACE.nose;
  const phil = smoothstep(0.0045, 0.0015, hx) * smoothstep(nz - 0.03, nz - 0.01, hz) * smoothstep(ny - 0.02, ny - 0.03, hy);
  c = mixRgb(c, COAT.lip, phil * 0.6);
  // nose leather on the loft itself, for the tiers without the nose part
  const leather = smoothstep(nz - 0.018, nz - 0.008, hz) * smoothstep(ny - 0.03, ny - 0.02, hy) * smoothstep(FACE.noseW * 0.55, FACE.noseW * 0.42, hx);
  c = mixRgb(c, COAT.noseLeather, leather);
  // the lioness's ruff: a faint pale, streaky band along the jaw and cheek,
  // the hair there longer and lighter than the face
  const ruffBand = smoothstep(-0.03, -0.06, hy) * smoothstep(0.16, 0.1, hz) * smoothstep(-0.02, 0.02, hz) * smoothstep(0.06, 0.09, hx);
  const streak = fbm(nu * 3, nv * 40, { octaves: 2, period: 8, seed: 457 });
  c = mixRgb(c, COAT.cream, ruffBand * (0.2 + 0.4 * smoothstep(0.45, 0.7, streak)));
  // breakup
  const m = fbm(nu * 4, nv * 4, { octaves: 3, period: 16, seed: 451 });
  const l = 1 + (m - 0.5) * 0.16;
  o[0] = c[0] * l;
  o[1] = c[1] * l;
  o[2] = c[2] * l;
}

/**
 * The atlas. `spots` selects the cub coat. Everything an adult and a cub share
 * is drawn the same way, so the two read as the same species.
 */
export function coatAtlas({ size = 1024, spots = false } = {}) {
  return cached(`lion-coat-${size}-${spots}`, () => {
    const rnd = mulberry32(spots ? 9021 : 9001);
    const seed = spots ? 3 : 0;
    const tex = canvasTexture(
      size,
      (ctx, S) => {
        ctx.fillStyle = rgb(COAT.side);
        ctx.fillRect(0, 0, S, S);

        // --- body ------------------------------------------------------------
        fillRegion(ctx, ATLAS.body, S, (u, v, o) => {
          const c = coatShade(u, v, seed, { spots });
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });
        hairStrokes(ctx, ATLAS.body, S, rnd, { count: 30000, len: [7, 16], light: 0.14 });
        ticking(ctx, ATLAS.body, S, rnd, 14000, 'rgba(50,32,18,0.5)', 1.4);

        // --- legs: u around from the outside, v = 0 at the paw ----------------
        fillRegion(ctx, ATLAS.leg, S, (u, v, o) => {
          // inner face of the leg is paler, the paw end carries the dust
          const inner = smoothstep(0.25, 0.5, u) * smoothstep(0.75, 0.5, u);
          // spots are keyed to the leg's own (u, v) so they are cells, not bands
          let c = coatShade(0.22 + 0.2 * inner, v, seed + 1, { spots, su: u * 0.55, sv: v * 1.3 });
          c = mixRgb(c, COAT.cream, inner * 0.3);
          const m = fbm(u * 12, v * 18, { octaves: 3, period: 32, seed: 433 });
          c = mixRgb(c, COAT.dust, smoothstep(0.42, 0.0, v) * (0.5 + 0.5 * m) * 0.7);
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });
        hairStrokes(ctx, ATLAS.leg, S, rnd, { count: 9000, len: [5, 12] });
        ticking(ctx, ATLAS.leg, S, rnd, 2500);

        // --- tail: v = 0 at the tip, the tuft base goes dark ------------------
        fillRegion(ctx, ATLAS.tail, S, (u, v, o) => {
          let c = coatShade(0.3 + 0.4 * Math.abs(u - 0.5) * 2, v, seed + 2, { spots, su: u * 0.3, sv: v * 2.5 });
          c = mixRgb(c, COAT.black, smoothstep(0.28, 0.0, v) * 0.85);
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });
        hairStrokes(ctx, ATLAS.tail, S, rnd, { count: 5000, len: [5, 12] });

        // --- the face: skull region behind the stop, muzzle region ahead -------
        // Both regions are painted through the same head-space shader
        // (faceShade), inverting the mapping head.js gives the head loft, so a
        // mark placed in head metres lands on the animal in head metres and the
        // two regions meet without a step. Skull: u along the head from the
        // occiput to the stop, v around from under the lip (0) to the crown (1).
        // Muzzle: u around the same way, v from the stop to the nose.
        const hp = [0, 0, 0];
        fillRegion(ctx, ATLAS.skull, S, (u, v, o) => {
          const z = lerp(HEAD_Z0, HEAD_SPLIT, u);
          const a = v * Math.PI;
          headPoint(z, a, hp);
          faceShade(hp[0], hp[1], hp[2], a, u * 3.1, v * 2.3, o);
        });
        hairStrokes(ctx, ATLAS.skull, S, rnd, { count: 7000, len: [3, 8], light: 0.08, dir: Math.PI / 2 });
        fillRegion(ctx, ATLAS.muzzle, S, (u, v, o) => {
          const z = lerp(HEAD_SPLIT, HEAD_Z1, v);
          const a = u * Math.PI;
          headPoint(z, a, hp);
          faceShade(hp[0], hp[1], hp[2], a, 3.1 + v * 1.1, u * 2.3, o);
        });
        hairStrokes(ctx, ATLAS.muzzle, S, rnd, { count: 1600, len: [2, 4], light: 0.06 });

        // --- nose leather: front projected, nostrils and philtrum ------------
        fillRegion(ctx, ATLAS.nose, S, (u, v, o) => {
          // the leather is dark and matte-grained; its top edge fades into the
          // haired bridge, so the part has no hard outline against the muzzle
          let c = mixRgb(COAT.noseLeather, COAT.noseBridge, smoothstep(0.72, 0.98, v) * 0.75);
          const grain = fbm(u * 30, v * 30, { octaves: 3, period: 64, seed: 471 });
          c = mixRgb(c, [92, 76, 72], (grain - 0.5) * 0.45);
          for (const s of [-1, 1]) {
            // nostril: a comma opening outward and down, the wing above it a little lighter
            const dx = (u - (0.5 + s * 0.27)) * 3.8;
            const dy = (v - 0.4) * 3.0 + dx * s * 0.45;
            const d = Math.hypot(dx, dy);
            c = mixRgb(c, [8, 6, 6], smoothstep(0.46, 0.22, d));
            c = mixRgb(c, [112, 90, 86], smoothstep(0.64, 0.48, d) * smoothstep(0.46, 0.54, d) * 0.45);
          }
          // philtrum: the groove from between the nostrils down to the lip
          const phil = smoothstep(0.06, 0.015, Math.abs(u - 0.5)) * smoothstep(0.5, 0.28, v);
          c = mixRgb(c, [10, 8, 8], phil * 0.85);
          // the lower edge of the leather is pale skin toward the lip
          c = mixRgb(c, [120, 96, 90], smoothstep(0.18, 0.04, v) * (1 - phil) * 0.5);
          // moist highlight speckle across the top of the leather
          const sp = fbm(u * 60, v * 60, { octaves: 2, period: 64, seed: 479 });
          c = mixRgb(c, [156, 136, 134], smoothstep(0.6, 0.75, sp) * 0.55 * smoothstep(0.3, 0.6, v) * smoothstep(0.95, 0.8, v));
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });

        // --- eye: equirect with the iris at the pole (v = 1) ------------------
        fillRegion(ctx, ATLAS.eye, S, (u, v, o) => {
          const th = (1 - v) * Math.PI; // polar angle from the gaze axis
          const deg = (th * 180) / Math.PI;
          let c = COAT.sclera;
          // brown sclera vessels
          const vein = fbm(u * 8, v * 14, { octaves: 3, period: 8, seed: 491 });
          c = mixRgb(c, [120, 70, 40], smoothstep(0.58, 0.75, vein) * 0.5 * smoothstep(30, 60, deg));
          // iris with radial fibres; a lion's iris fills most of the opening
          const fib = fbm(u * 24, v * 3, { octaves: 4, period: 24, seed: 497 });
          // the iris fills the almond between the lids; sclera shows at the corners
          const irisT = smoothstep(40, 12, deg);
          let iris = mixRgb(COAT.irisOuter, COAT.irisInner, irisT);
          iris = [iris[0] * (0.8 + 0.4 * fib), iris[1] * (0.8 + 0.4 * fib), iris[2] * (0.8 + 0.35 * fib)];
          c = mixRgb(c, iris, smoothstep(42, 39, deg));
          // limbal ring
          c = mixRgb(c, [40, 26, 12], smoothstep(45, 41, deg) * smoothstep(36, 40, deg) * 0.85);
          // pupil, soft edged, round the way a lion's is
          c = mixRgb(c, [6, 4, 4], smoothstep(13, 10.5, deg));
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });

        // --- ears --------------------------------------------------------------
        // ear caps are polar: v = 1 at the centre of the cup, 0 at the rim; the
        // tip of the ear is at u = 0.25 and the base, toward the head, at 0.75
        fillRegion(ctx, ATLAS.earOut, S, (u, v, o) => {
          // the back of a lion's ear is black over most of its height, with a
          // tawny band at the base and a thin pale rim; the tip stays dark
          const tip = smoothstep(0.35, 0.05, Math.abs(u - 0.25));
          let c = mixRgb(COAT.side, COAT.earBack, smoothstep(0.03, 0.14, v) * (0.75 + 0.25 * tip));
          c = mixRgb(c, COAT.earBack, smoothstep(0.4, 0.9, v) * 0.2);
          const base = smoothstep(0.35, 0.1, Math.abs(u - 0.75)) * smoothstep(0.55, 0.1, v);
          c = mixRgb(c, COAT.side, base * 0.9);
          c = mixRgb(c, COAT.cream, smoothstep(0.05, 0.0, v) * (1 - tip * 0.6) * 0.5);
          const m = fbm(u * 10, v * 10, { octaves: 3, period: 16, seed: 503 });
          const l = 1 + (m - 0.5) * 0.3;
          o[0] = c[0] * l;
          o[1] = c[1] * l;
          o[2] = c[2] * l;
        });
        fillRegion(ctx, ATLAS.earIn, S, (u, v, o) => {
          // pale lining, pink-grey skin deep in the cup, a pale rim, and long
          // pale hairs fringing the inner edge with a dark fringe behind them
          let c = mixRgb(COAT.earIn, COAT.earPink, smoothstep(0.5, 0.95, v));
          c = mixRgb(c, COAT.cream, smoothstep(0.12, 0.0, v) * 0.7);
          const streak = fbm(u * 26, v * 4, { octaves: 3, period: 32, seed: 509 });
          const edge = smoothstep(0.55, 0.15, v) * smoothstep(0.02, 0.1, v);
          c = mixRgb(c, COAT.lip, smoothstep(0.55, 0.75, streak) * edge * 0.7);
          c = mixRgb(c, COAT.cream, smoothstep(0.3, 0.5, streak) * smoothstep(0.7, 0.75, streak) * edge * 0.6);
          const base = smoothstep(0.3, 0.08, Math.abs(u - 0.75)) * smoothstep(0.7, 0.2, v);
          c = mixRgb(c, COAT.cream, base * 0.85);
          // the fold of the ear canal, darker
          c = mixRgb(c, COAT.lip, smoothstep(0.82, 0.97, v) * 0.35);
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });
        hairStrokes(ctx, ATLAS.earIn, S, rnd, { count: 900, len: [4, 10], light: 0.16 });

        // --- pads and claws --------------------------------------------------
        fillRegion(ctx, ATLAS.pad, S, (u, v, o) => {
          const m = fbm(u * 24, v * 24, { octaves: 4, period: 64, seed: 521 });
          const c = mixRgb(COAT.pad, [96, 78, 66], (m - 0.4) * 0.8);
          // dust in the creases
          const d = mixRgb(c, COAT.dust, smoothstep(0.62, 0.8, m) * 0.5);
          o[0] = d[0];
          o[1] = d[1];
          o[2] = d[2];
        });
        fillRegion(ctx, ATLAS.claw, S, (u, v, o) => {
          const c = mixRgb(COAT.clawBase, COAT.clawTip, smoothstep(0.2, 0.9, v));
          const g = fbm(u * 6, v * 30, { octaves: 2, period: 8, seed: 523 });
          const l = 1 + (g - 0.5) * 0.25;
          o[0] = c[0] * l;
          o[1] = c[1] * l;
          o[2] = c[2] * l;
        });

        // --- chin, lids --------------------------------------------------------
        fillRegion(ctx, ATLAS.jaw, S, (u, v, o) => {
          // the jaw is coat coloured on its sides, no brighter than the lip
          // above it (a pale jaw under a darker lip reads as bared teeth from
          // two metres); only the chin and the underside go cream
          let c = mixRgb(COAT.side, COAT.belly, 0.45);
          const m = fbm(u * 8, v * 8, { octaves: 3, period: 16, seed: 531 });
          c = mixRgb(c, COAT.belly, (m - 0.5) * 0.5);
          const under = smoothstep(0.35, 0.48, Math.abs(u - 0.5));
          c = mixRgb(c, COAT.cream, under * 0.5);
          // lower lip runs along the top of the jaw loft (u = 0.5): a thin dark
          // line, most of the jaw the cream of the chin
          c = mixRgb(c, COAT.lip, smoothstep(0.05, 0.015, Math.abs(u - 0.5)) * 0.85);
          c = mixRgb(c, COAT.lip, smoothstep(0.86, 0.97, v) * smoothstep(0.3, 0.12, Math.abs(u - 0.5)) * 0.3);
          // the mouth corner: the dark lip line drops down the side of the jaw
          // just behind the middle of its length, into the jowl
          const drop = smoothstep(0.05, 0.015, Math.abs(Math.abs(u - 0.5) - 0.17 - (v - 0.5) * 0.25)) * smoothstep(0.62, 0.55, v) * smoothstep(0.3, 0.42, v);
          c = mixRgb(c, COAT.lip, drop * 0.6);
          // the chin itself is the whitest part of the face
          c = mixRgb(c, COAT.cream, smoothstep(0.7, 0.92, v) * 0.6);
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });
        hairStrokes(ctx, ATLAS.jaw, S, rnd, { count: 1200, len: [3, 7], light: 0.08 });
        fillRegion(ctx, ATLAS.lid, S, (u, v, o) => {
          // the lid is coat coloured with a thin black rim, the way the eye is
          // lined; u < 0.5 is the outer half, which carries a touch of the pale ring
          // a shade darker than the coat so the almond reads from two metres
          let c = mixRgb(COAT.side, COAT.back, 0.3);
          c = mixRgb(c, COAT.cream, smoothstep(0.4, 0.2, v) * 0.25);
          // the rim: a 3 mm black eyeline, the rest of the lid under the skin
          c = mixRgb(c, COAT.black, smoothstep(0.13, 0.05, v));
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });
      },
      { srgb: true, aniso: 8 },
    );
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Hair-direction normal map for the atlas. Streaks along the canvas vertical,
 * which is along the animal on every lofted region, plus a soft grain so the
 * surface breaks the sun into fur rather than reflecting it as a skin.
 */
export function coatNormal(size = 256) {
  return cached(`lion-coat-normal-${size}`, () => {
    const h = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;
        // a seamless tile of fine strands; the material repeats it several
        // times over the atlas so a hair is millimetres, not centimetres
        const strand = fbm(u * 28, v * 4, { octaves: 3, period: 4, seed: 601 });
        const grain = fbm(u * 12, v * 12, { octaves: 2, period: 12, seed: 607 });
        h[y * size + x] = strand * 0.75 + grain * 0.25;
      }
    }
    const tex = normalFromHeight(h, size, size, 0.9);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(7, 7);
    return tex;
  });
}

/**
 * Shell-fur strand map. Alpha encodes hair length: a shell at height h keeps a
 * texel only where alpha ≥ h, so one texture serves every shell and the hairs
 * thin out toward the outside. RGB is the strand colour, darker under the jaw
 * (u near 0 and 1, the bottom of the mane loft) and blonder on top.
 */
export function maneStrands(size = 512) {
  return cached(`lion-mane-${size}`, () => {
    const rnd = mulberry32(7331);
    return cutoutTexture(
      size,
      (ctx, S) => {
        // Rasterised by hand so a texel's alpha is the length of the LONGEST
        // hair over it, not the sum: canvas compositing would pile short
        // hairs up to full alpha and every shell would be a second skin.
        const img = ctx.createImageData(S, S);
        const px = img.data;
        const n = Math.round(S * S * 0.14);
        const dark = [58, 40, 26];
        const brown = [124, 86, 50];
        const tawny = [182, 134, 80];
        const blond = [218, 182, 126];
        for (let i = 0; i < n; i++) {
          const x = rnd() * S;
          const y = rnd() * S;
          const u = x / S;
          const top = 1 - Math.abs(2 * u - 1);
          // hair length: the mane is solid to about half its depth, then a
          // fringe — half the hairs reach three quarters out, a few per cent
          // the outermost shell — so the body of the mane reads as one mass
          // and only its edge breaks into strands against the sky
          const len = rnd() < 0.7 ? 0.6 + 0.4 * Math.pow(rnd(), 2) : 0.1 + 0.5 * rnd();
          // tawny over the crown and shoulders, darkening down the throat and
          // chest; the long hairs are the dark ones, so the tips of the mane
          // are darker than its body
          const t = rnd();
          let c;
          if (t < 0.1 + (1 - top) * 0.35 + Math.max(0, len - 0.8) * 1.5) c = dark;
          else if (t < 0.5) c = brown;
          else if (t < 0.86) c = tawny;
          else c = blond;
          const shade = (0.8 + rnd() * 0.4) * lerp(1.1, 0.85, len);
          const a8 = Math.round(len * 255);
          // long thin streaks, lying around the neck (the canvas vertical is
          // along the animal), the way the hair hangs down the sides
          // mostly short marks with some long hairs among them, so a shell
          // seen edge-on breaks into dashes rather than reading as a ribbon
          const l = (rnd() < 0.6 ? 3 + rnd() * 6 : 9 + rnd() * 14) * (S / 256);
          const ang = Math.PI / 2 + (rnd() - 0.5) * 0.7;
          const dx = Math.cos(ang);
          const dy = Math.sin(ang);
          for (let k = -l / 2; k < l / 2; k += 0.7) {
            const xi = ((Math.round(x + dx * k) % S) + S) % S;
            const yi = ((Math.round(y + dy * k) % S) + S) % S;
            const o = (yi * S + xi) * 4;
            if (px[o + 3] >= a8) continue;
            px[o] = c[0] * shade;
            px[o + 1] = c[1] * shade;
            px[o + 2] = c[2] * shade;
            px[o + 3] = a8;
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      { aniso: 4 },
    );
  });
}

/**
 * Short fuzz for the body shells. Grayscale: the value is the hair length,
 * because it is read through `alphaMap`, which samples the green channel. The
 * colour comes from the coat atlas underneath.
 */
export function fuzzStrands(size = 256) {
  return cached(`lion-fuzz-${size}`, () => {
    const rnd = mulberry32(5511);
    return canvasTexture(
      size,
      (ctx, S) => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, S, S);
        const n = Math.round(S * S * 0.2);
        for (let i = 0; i < n; i++) {
          const len = 0.12 + 0.88 * Math.pow(rnd(), 0.8);
          const v = Math.round(len * 255);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          const r = (0.7 + rnd() * 0.9) * (S / 256);
          ctx.fillRect(rnd() * S, rnd() * S, r, r * (1.5 + rnd() * 2));
        }
      },
      { srgb: false, aniso: 2 },
    );
  });
}

/**
 * Cutout atlas for the strands, in columns (head.js STRANDS): the tail tuft in
 * [0, 0.25], a fan of dark hairs hanging from the top edge; two mane cards in
 * [0.26, 0.55] and [0.56, 0.85], bundles of hair rooted solid at the top and
 * separating into strands that darken toward their tips; a single pale
 * whisker at 0.93, rooted at the top, tapering to nothing at the bottom.
 * Never below 512: the mane cards are looked at from two metres.
 */
export function alphaAtlas(size = 256) {
  size = Math.max(size, 512);
  return cached(`lion-alpha-${size}`, () => {
    const rnd = mulberry32(2211);
    return cutoutTexture(
      size,
      (ctx, S) => {
        ctx.clearRect(0, 0, S, S);
        ctx.lineCap = 'round';
        // --- tail tuft ---------------------------------------------------------
        for (let i = 0; i < 110; i++) {
          const x0 = S * (0.125 + (rnd() - 0.5) * 0.11);
          const spread = (rnd() - 0.5) * 0.28;
          const len = S * (0.5 + rnd() * 0.45);
          const shade = 16 + rnd() * 44;
          ctx.strokeStyle = rgba([shade * 1.35, shade, shade * 0.72], 0.95);
          ctx.lineWidth = (1.1 + rnd() * 1.5) * (S / 256);
          ctx.beginPath();
          ctx.moveTo(x0, S * 0.02);
          ctx.quadraticCurveTo(x0 + spread * S * 0.3, S * 0.45, x0 + spread * S * 0.5, S * 0.02 + len);
          ctx.stroke();
        }
        // --- mane cards ----------------------------------------------------------
        const dark = [46, 32, 22];
        const brown = [112, 76, 44];
        const tawny = [172, 126, 74];
        const blond = [210, 172, 116];
        const maneCard = (x0, x1, seed) => {
          const r = mulberry32(seed);
          const w = x1 - x0;
          const xc = (x0 + x1) / 2;
          // A card is a bundle of narrow locks with daylight between them, so
          // the silhouette of the card is hair and not a paddle: each lock a
          // tapered ribbon a few millimetres wide, brown at the root and dark
          // at the tip, ending at its own length; the roots merge in a short
          // dense band at the top so the bundle grows out of the shells.
          const lock = (cx, len, wTop, lean, cols) => {
            const g = ctx.createLinearGradient(0, 0, 0, len);
            g.addColorStop(0, rgba(cols[0], 1));
            g.addColorStop(0.5, rgba(cols[1], 1));
            g.addColorStop(1, rgba(cols[2], 1));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(cx - wTop, 0);
            ctx.lineTo(cx + wTop, 0);
            ctx.quadraticCurveTo(cx + wTop * 0.7 + lean * 0.4, len * 0.55, cx + lean + wTop * 0.1, len);
            ctx.lineTo(cx + lean - wTop * 0.1, len);
            ctx.quadraticCurveTo(cx - wTop * 0.7 + lean * 0.4, len * 0.55, cx - wTop, 0);
            ctx.closePath();
            ctx.fill();
          };
          const nLocks = 5;
          for (let i = 0; i < nLocks; i++) {
            const cx = x0 + w * (0.1 + 0.8 * ((i + 0.5) / nLocks) + (r() - 0.5) * 0.08);
            const centre = 1 - Math.abs(2 * ((i + 0.5) / nLocks) - 1);
            const len = S * (0.4 + 0.55 * Math.pow(r(), 0.7) * (0.6 + 0.4 * centre));
            const wTop = w * (0.03 + r() * 0.02);
            const lean = (r() - 0.5) * w * 0.35;
            const t = r();
            const root = t < 0.15 ? tawny : t < 0.6 ? brown : mixRgb(brown, tawny, 0.5);
            const mid = t < 0.15 ? mixRgb(tawny, brown, 0.5) : t < 0.6 ? mixRgb(brown, dark, 0.35) : brown;
            const tip = t < 0.25 ? mixRgb(brown, dark, 0.7) : dark;
            lock(cx, len, wTop, lean, [root, mid, tip]);
          }
          // the root band: short broad hair that fills between the locks
          const rg = ctx.createLinearGradient(0, 0, 0, S * 0.08);
          rg.addColorStop(0, rgba(brown, 1));
          rg.addColorStop(0.6, rgba(mixRgb(brown, tawny, 0.3), 0.9));
          rg.addColorStop(1, rgba(brown, 0));
          ctx.fillStyle = rg;
          ctx.fillRect(x0 + w * 0.08, 0, w * 0.84, S * 0.08);
          // pale and dark hairs over the locks, only where there is already hair
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          for (let i = 0; i < 60; i++) {
            const xs = x0 + w * (0.08 + r() * 0.84);
            const lean = (r() - 0.5) * w * 0.25;
            const len = S * (0.3 + r() * 0.65);
            const t = r();
            const col = t < 0.45 ? dark : t < 0.75 ? brown : t < 0.92 ? tawny : blond;
            ctx.strokeStyle = rgba(col, 0.5 + r() * 0.45);
            ctx.lineWidth = (0.7 + r() * 1.2) * (S / 512);
            ctx.beginPath();
            ctx.moveTo(xs, 0);
            ctx.quadraticCurveTo(xs + lean * 0.4, len * 0.5, xs + lean, len);
            ctx.stroke();
          }
          ctx.restore();
        };
        maneCard(S * 0.26, S * 0.55, 8801);
        maneCard(S * 0.56, S * 0.85, 8807);
        // --- whisker -------------------------------------------------------------
        const g = ctx.createLinearGradient(0, 0, 0, S);
        const c = [236, 228, 214];
        g.addColorStop(0, rgba(c, 1));
        g.addColorStop(0.75, rgba(c, 0.85));
        g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g;
        const wx = S * 0.93;
        ctx.beginPath();
        ctx.moveTo(wx - S * 0.02, 0);
        ctx.lineTo(wx + S * 0.02, 0);
        ctx.lineTo(wx + S * 0.003, S);
        ctx.lineTo(wx - S * 0.003, S);
        ctx.closePath();
        ctx.fill();
      },
      { aniso: 4 },
    );
  });
}

/**
 * Far-distance card: a side-on lion painted flat, in the coat colours. From
 * 120 m it is a dozen pixels, and what has to survive is the long low body,
 * the tail and — for the male — the bulk of the mane.
 */
export function farCard(mane) {
  return cached(`lion-card-${mane}`, () => {
    return cutoutTexture(
      128,
      (ctx, S) => {
        const H = S * 0.75;
        ctx.clearRect(0, 0, S, S);
        ctx.translate(0, S * 0.125);
        const body = rgb(COAT.side);
        const dark = rgb(COAT.back);
        const pale = rgb(COAT.belly);
        ctx.fillStyle = body;
        // body
        ctx.beginPath();
        ctx.ellipse(S * 0.5, H * 0.5, S * 0.3, H * 0.19, 0, 0, Math.PI * 2);
        ctx.fill();
        // belly
        ctx.fillStyle = pale;
        ctx.beginPath();
        ctx.ellipse(S * 0.5, H * 0.58, S * 0.27, H * 0.1, 0, 0, Math.PI);
        ctx.fill();
        // legs
        ctx.fillStyle = body;
        for (const x of [0.29, 0.36, 0.64, 0.71]) {
          ctx.fillRect(S * x - S * 0.028, H * 0.55, S * 0.056, H * 0.42);
        }
        // tail
        ctx.strokeStyle = body;
        ctx.lineWidth = S * 0.03;
        ctx.beginPath();
        ctx.moveTo(S * 0.22, H * 0.42);
        ctx.quadraticCurveTo(S * 0.1, H * 0.55, S * 0.12, H * 0.85);
        ctx.stroke();
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(S * 0.12, H * 0.87, S * 0.03, 0, Math.PI * 2);
        ctx.fill();
        // neck and head
        if (mane) {
          ctx.fillStyle = dark;
          ctx.beginPath();
          ctx.ellipse(S * 0.8, H * 0.38, S * 0.15, H * 0.24, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(S * 0.84, H * 0.32, S * 0.085, H * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pale;
        ctx.beginPath();
        ctx.ellipse(S * 0.9, H * 0.36, S * 0.04, H * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
      },
      { aniso: 2 },
    );
  });
}
