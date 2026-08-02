import * as THREE from 'three';
import { C, FINISH } from '../lego/palette.js';
import { PLATE, BRICK, P, B } from '../lego/brick.js';

/*
 * Shared plumbing for the set library: deterministic noise, greeble scatter and
 * a couple of small conveniences every location ends up needing.
 *
 * Everything here is pure and seeded -- two renders of the same set on two
 * machines must produce byte-identical geometry.
 */

// ----------------------------------------------------------------- options
// The lab hands factories raw query-string values, so every opt arrives as a
// string. These coerce without turning "0" into true.

export function num(opts, key, def) {
  const v = opts?.[key];
  if (v === undefined || v === null || v === '') return def;
  const n = +v;
  return Number.isFinite(n) ? n : def;
}

export function bool(opts, key, def) {
  const v = opts?.[key];
  if (v === undefined || v === null || v === '') return def;
  if (typeof v === 'string') return !(v === '0' || v === 'false' || v === 'no' || v === 'off');
  return !!v;
}

// ------------------------------------------------------------------- noise

/** Integer hash -> [0,1). Stable across engines: only Math.imul and shifts. */
export function hash2i(x, y, seed = 0) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function hash1i(x, seed = 0) { return hash2i(x, 0x5bf03635, seed); }

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Quintic fade -- second-derivative continuous, so the lattice stops showing. */
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/** Smoothed value noise. */
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const a = hash2i(xi, yi, seed), b = hash2i(xi + 1, yi, seed);
  const c = hash2i(xi, yi + 1, seed), d = hash2i(xi + 1, yi + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

export function fbm2(x, y, { seed = 0, octaves = 4, gain = 0.5, lacunarity = 2.03 } = {}) {
  let amp = 1, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * f, y * f, seed + i * 101);
    norm += amp;
    amp *= gain;
    f *= lacunarity;
  }
  return sum / norm;
}

/**
 * Value noise that wraps on the X axis every `px` lattice cells. Anything
 * mapped around a sphere or tiled edge-to-edge needs this or it shows a seam.
 */
export function noise2p(x, y, px, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const w0 = ((xi % px) + px) % px;
  const w1 = ((xi + 1) % px + px) % px;
  const a = hash2i(w0, yi, seed), b = hash2i(w1, yi, seed);
  const c = hash2i(w0, yi + 1, seed), d = hash2i(w1, yi + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/** fbm over `u` in [0,1) that closes seamlessly at u = 1. */
export function fbm2p(u, y, { seed = 0, octaves = 4, gain = 0.5, period = 4 } = {}) {
  let amp = 1, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2p(u * period * f, y * f, period * f, seed + i * 101);
    norm += amp;
    amp *= gain;
    f *= 2;
  }
  return sum / norm;
}

/** Expand fbm's narrow mid-band distribution so the detail actually shows. */
export const ctr = (v, k) => clamp(0.5 + (v - 0.5) * k, 0, 1);

/** Ridged noise -- sharper crests, good for dune spines and rock. */
export function ridge2(x, y, opts = {}) {
  const n = fbm2(x, y, opts);
  return 1 - Math.abs(n * 2 - 1);
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Quantise part sizes so the geometry cache actually gets reused. */
export const q = (v, step = 0.1) => Math.max(step, Math.round(v / step) * step);

// -------------------------------------------------------------- palettes

/** Battle-station / capital-ship hull greys, weighted toward mid grey. */
export const GREY_PANEL = [
  C.lightBluishGray, C.lightBluishGray, C.lightBluishGray, C.lightBluishGray,
  C.darkBluishGray, C.darkBluishGray, C.darkBluishGray,
  C.veryLightGray, C.veryLightGray,
  C.darkGray, C.white, C.flatSilver,
];

export const GREY_DEEP = [
  C.darkBluishGray, C.darkBluishGray, C.darkGray, C.darkGray,
  C.lightBluishGray, C.black, C.titanium, C.pearlDarkGray,
];

export const SAND_TONES = [C.tan, C.tan, C.tan, C.darkTan, C.darkTan, C.nougat];

export const ROCK_TONES = [C.darkTan, C.reddishBrown, C.mediumNougat, C.darkTan, C.brown];

export function pickFrom(list, h) { return list[Math.floor(h * list.length) % list.length]; }

// -------------------------------------------------------------- greebling

/**
 * Scatter raised panel greebles across an axis-aligned rectangle.
 *
 * `axis` is the rectangle's normal:
 *   'x' -> wall in the ZY plane, u = z, v = y
 *   'z' -> wall in the XY plane, u = x, v = y
 *   'y' -> floor/deck in the XZ plane, u = x, v = z, panels rise by `d`
 *
 * `dir` (+1/-1) picks which side of `at` the panels sit on. Everything is
 * placed strictly inside [u0,u1] x [v0,v1] so a rectangle can be tiled
 * edge-to-edge without a visible seam.
 */
export function greebleRect(bb, cfg) {
  const {
    axis = 'x', at = 0, dir = 1,
    u0 = 0, u1 = 10, v0 = 0, v1 = 10,
    cell = 5, seed = 7,
    colors = GREY_PANEL,
    dMin = 0.25, dMax = 1.3,
    fill = 0.92,
    sub = 0.5,
    pipes = 0.1,
    lights = 0,
    lightColor = C.transNeonOrange,
    lightSize = 0.55,
    free = true,
  } = cfg;

  const place = (uc, vc, uw, vh, d, color, finish) => {
    const o = { color, free, studs: false, h: q(vh, 0.05) };
    if (finish) o.finish = finish;
    const dd = q(d, 0.05);
    const w = q(uw, 0.05);
    if (axis === 'x') bb.brick(at + dir * dd / 2, vc - vh / 2, uc, dd, w, o);
    else if (axis === 'z') bb.brick(uc, vc - vh / 2, at + dir * dd / 2, w, dd, o);
    else bb.brick(uc, dir > 0 ? at : at - dd, vc, w, q(vh, 0.05), { ...o, h: dd });
  };

  const nu = Math.max(1, Math.round((u1 - u0) / cell));
  const nv = Math.max(1, Math.round((v1 - v0) / cell));
  const cu = (u1 - u0) / nu, cv = (v1 - v0) / nv;

  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const h0 = hash2i(i, j, seed);
      if (h0 > fill) continue;
      const h1 = hash2i(i, j, seed + 17);
      const h2 = hash2i(i, j, seed + 41);
      const h3 = hash2i(i, j, seed + 73);
      const h4 = hash2i(i, j, seed + 131);

      const uw = cu * (0.44 + h1 * 0.5);
      const vh = cv * (0.4 + h2 * 0.54);
      const uc = u0 + (i + 0.5) * cu + (h3 - 0.5) * (cu - uw) * 0.75;
      const vc = v0 + (j + 0.5) * cv + (h4 - 0.5) * (cv - vh) * 0.75;
      const d = dMin + h1 * h2 * (dMax - dMin);
      place(uc, vc, uw, vh, d, pickFrom(colors, h0 / Math.max(fill, 1e-3)));

      if (h3 < sub) {
        const uw2 = uw * (0.28 + h4 * 0.42);
        const vh2 = vh * (0.3 + h1 * 0.4);
        place(
          uc + (h2 - 0.5) * (uw - uw2) * 0.7,
          vc + (h1 - 0.5) * (vh - vh2) * 0.7,
          uw2, vh2, d + dMin * 0.8 + h4 * 0.45,
          pickFrom(colors, h4),
        );
      }

      if (h4 < pipes) {
        const t = 0.3 + h1 * 0.3;
        place(uc, vc + vh * 0.5 + t, cu * 0.92, t, d * 0.7 + 0.2,
          h2 < 0.4 ? C.flatSilver : C.darkBluishGray);
      }

      if (h2 < lights) {
        place(uc, vc, lightSize, lightSize, d + 0.4, lightColor, FINISH.GLOW);
      }
    }
  }
  return bb;
}

/**
 * A run of recessed panel lines -- the long shallow grooves that make big
 * grey slabs read as a built surface rather than a flat plane.
 */
export function panelLines(bb, {
  axis = 'y', at = 0, along = 'x',
  a0 = -10, a1 = 10, b0 = -10, b1 = 10,
  step = 20, width = 0.45, rise = 0.14, color = C.darkBluishGray, offset = 0,
}) {
  for (let b = b0 + offset; b <= b1; b += step) {
    if (axis !== 'y') continue;
    if (along === 'x') bb.brick((a0 + a1) / 2, at, b, a1 - a0, width, { h: rise, color, free: true, studs: false });
    else bb.brick(b, at, (a0 + a1) / 2, width, a1 - a0, { h: rise, color, free: true, studs: false });
  }
  return bb;
}

// ----------------------------------------------------------------- lights

/** Practical light for enclosed sets -- interiors get no help from the rig. */
export function practical(group, x, y, z, color = 0xdce9ff, intensity = 70, distance = 46) {
  const l = new THREE.PointLight(new THREE.Color(color).convertSRGBToLinear(), intensity, distance, 2);
  l.position.set(x, y, z);
  l.castShadow = false;
  group.add(l);
  return l;
}

// --------------------------------------------------------------- geometry

/**
 * svgExtrude() mirrors the art on Y (SVG's axis points down), which leaves the
 * triangles wound backwards. Flip them back so the relief faces the room.
 */
export function fixWinding(geom) {
  const pos = geom.attributes.position;
  const arr = pos.array;
  for (let i = 0; i < pos.count; i += 3) {
    for (let c = 0; c < 3; c++) {
      const t = arr[i * 3 + c];
      arr[i * 3 + c] = arr[(i + 2) * 3 + c];
      arr[(i + 2) * 3 + c] = t;
    }
  }
  pos.needsUpdate = true;
  geom.deleteAttribute('normal');
  geom.computeVertexNormals();
  return geom;
}

/** Count triangles under an object -- handy when checking the budget. */
export function triangleCount(root) {
  let n = 0;
  root.traverse((o) => {
    if (!o.isMesh && !o.isPoints && !o.isLine) return;
    const g = o.geometry;
    if (!g) return;
    const count = g.index ? g.index.count : g.attributes.position.count;
    if (o.isMesh) n += count / 3;
  });
  return Math.round(n);
}

export { PLATE, BRICK, P, B, C, FINISH };
