import * as THREE from 'three';
import { pnoise, fbm, ridged, hash2, smoothstep, clamp01, mix } from './noise.js';

/**
 * Procedural canvas textures for the "charlie" arms: olive knit (glove back / cuff), black synthetic
 * leather (palm & finger pads), desert multi-scale camo (sleeve) and a helper that bakes a tangent-space
 * normal map from any height function. Everything is deterministic and tileable.
 *
 * Physical scale: KNIT_TILE / LEATHER_TILE are the metres covered by one texture repeat, so UVs are simply
 * `position_m / TILE` and the weave/grain size matches across the palm, fingers and cuff.
 */
export const KNIT_TILE = 0.032; // 20 stitches per 32 mm → 1.6 mm stitches
export const LEATHER_TILE = 0.032;
export const CAMO_TILE = 0.3;

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function commit(canvas, data, assets, { srgb = true } = {}) {
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(canvas.width, canvas.height);
  img.data.set(data);
  ctx.putImageData(img, 0, 0);
  const tex = assets.canvasTexture(canvas, { srgb });
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Normal map from a height field (Float32Array, values in "pixels" of relief). Wraps on both axes. */
function normalFromHeight(h, size, strength) {
  const out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      // t (v) increases upward in the canvas (flipY), so d/dt = h[row-1] - h[row+1]
      const dx = (h[y * size + xp] - h[y * size + xm]) * 0.5 * strength;
      const dy = (h[ym * size + x] - h[yp * size + x]) * 0.5 * strength;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const o = (y * size + x) * 4;
      out[o] = (-dx * inv * 0.5 + 0.5) * 255;
      out[o + 1] = (-dy * inv * 0.5 + 0.5) * 255;
      out[o + 2] = (inv * 0.5 + 0.5) * 255;
      out[o + 3] = 255;
    }
  }
  return out;
}

function grey(size, fn) {
  const out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = clamp01(fn(x, y)) * 255;
      const o = (y * size + x) * 4;
      out[o] = v;
      out[o + 1] = v;
      out[o + 2] = v;
      out[o + 3] = 255;
    }
  }
  return out;
}

/** Distance from point p to segment ab (2D). */
function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const t = clamp01((wx * vx + wy * vy) / (vx * vx + vy * vy));
  const dx = wx - vx * t;
  const dy = wy - vy * t;
  return Math.sqrt(dx * dx + dy * dy);
}

/* ------------------------------------------------------------------------------------------ knit */

/**
 * Ribbed knit (purl-side courses, as on the MW2019 glove back): horizontal yarn ridges ~1.6 mm apart, each
 * broken into individual stitches, offset every other course, with fibre fuzz and a slow unevenness.
 * Olive-grey yarn (reference lit ≈ sRGB 128,128,115; shaded ≈ 102,104,93). Returns { map, normalMap, roughnessMap }.
 */
export function makeKnitMaps(assets, size = 1024) {
  const cols = 20; // stitches across one tile (1.6 mm)
  const rows = 26; // courses along one tile (1.2 mm)
  const h = new Float32Array(size * size);
  const alb = new Uint8ClampedArray(size * size * 4);
  const rough = new Float32Array(size * size);
  const base = [0.63, 0.635, 0.45];
  for (let py = 0; py < size; py++) {
    const y = (py / size) * rows;
    const j = Math.floor(y);
    const fy = y - j;
    // course ridge: rounded yarn profile across the row, deep narrow groove between courses
    const ridge = Math.pow(Math.max(0, Math.sin(fy * Math.PI)), 0.75);
    for (let px = 0; px < size; px++) {
      const x = (px / size) * cols + (j & 1 ? 0.5 : 0);
      const i = Math.floor(x);
      const fx = x - i;
      // stitch bulge along the course + the sloped "purl bump" that gives the fabric its diagonal look
      const bump = 0.7 + 0.3 * Math.sin(fx * Math.PI);
      const slope = 0.5 + 0.5 * Math.sin((fx - fy * 0.35) * Math.PI * 2);
      let yarn = ridge * (0.78 + 0.22 * bump) * (0.9 + 0.1 * slope);
      const fuzz = pnoise(px * 0.21, py * 0.21, Math.round(size * 0.21), Math.round(size * 0.21)) * 0.07;
      const uneven = fbm((px / size) * 4, (py / size) * 4, 4, 4, 3) * 0.09;
      const stitchTint = (hash2(i, j) - 0.5) * 0.09;
      const height = yarn + fuzz;
      h[py * size + px] = height * 8; // ~0.25 mm relief at 32 px/mm
      const shade = 0.7 + 0.3 * yarn + fuzz * 1.2 + uneven + stitchTint;
      const o = (py * size + px) * 4;
      alb[o] = clamp01(base[0] * shade) * 255;
      alb[o + 1] = clamp01(base[1] * shade + 0.01 * slope * yarn) * 255;
      alb[o + 2] = clamp01(base[2] * shade - 0.01 * slope * yarn) * 255;
      alb[o + 3] = 255;
      rough[py * size + px] = 0.84 + 0.1 * (1 - yarn) + fuzz;
    }
  }
  const map = commit(makeCanvas(size), alb, assets, { srgb: true });
  const normalMap = commit(makeCanvas(size), normalFromHeight(h, size, 0.6), assets, { srgb: false });
  const roughnessMap = commit(makeCanvas(size), grey(size, (x, y) => rough[y * size + x]), assets, { srgb: false });
  return { map, normalMap, roughnessMap };
}

/* ------------------------------------------------------------------------------------------ skin */

/**
 * Bare forearm skin (visible between the glove cuff and the rolled sleeve): warm tan with soft mottling,
 * faint veins/redness variation and fine pore relief. One tile = SKIN_TILE metres.
 */
export const SKIN_TILE = 0.08;
export function makeSkinMaps(assets, size = 512) {
  const h = new Float32Array(size * size);
  const alb = new Uint8ClampedArray(size * size * 4);
  const rough = new Float32Array(size * size);
  const base = [0.84, 0.56, 0.42];
  for (let py = 0; py < size; py++) {
    const v = py / size;
    for (let px = 0; px < size; px++) {
      const u = px / size;
      const mottle = fbm(u * 6, v * 6, 6, 6, 3);
      const redness = fbm(u * 3 + 5, v * 3 + 2, 3, 3, 2);
      const pores = pnoise(u * 160, v * 160, 160, 160);
      const fine = pnoise(u * 60 + 3, v * 60, 60, 60);
      h[py * size + px] = pores * 0.6 + fine * 0.4;
      const shade = 1 + 0.06 * mottle;
      const o = (py * size + px) * 4;
      alb[o] = clamp01(base[0] * shade + 0.03 * redness) * 255;
      alb[o + 1] = clamp01(base[1] * shade - 0.02 * redness) * 255;
      alb[o + 2] = clamp01(base[2] * shade - 0.03 * redness) * 255;
      alb[o + 3] = 255;
      rough[py * size + px] = 0.6 + 0.08 * mottle + 0.05 * pores;
    }
  }
  const map = commit(makeCanvas(size), alb, assets, { srgb: true });
  const normalMap = commit(makeCanvas(size), normalFromHeight(h, size, 0.5), assets, { srgb: false });
  const roughnessMap = commit(makeCanvas(size), grey(size, (x, y) => rough[y * size + x]), assets, { srgb: false });
  return { map, normalMap, roughnessMap };
}

/* --------------------------------------------------------------------------------------- leather */

/**
 * Black synthetic leather: pebbled grain (two scales), faint crease network, slightly polished grain tops.
 * The albedo is a dusty dark grey; clean areas are darkened toward true black through vertex colours.
 */
export function makeLeatherMaps(assets, size = 1024) {
  const h = new Float32Array(size * size);
  const alb = new Uint8ClampedArray(size * size * 4);
  const rough = new Float32Array(size * size);
  for (let py = 0; py < size; py++) {
    const v = py / size;
    for (let px = 0; px < size; px++) {
      const u = px / size;
      // pebble grain: soft cells ≈ 0.7 mm
      const g1 = fbm(u * 44, v * 44, 44, 44, 2, 0.5);
      const pebble = smoothstep(-0.55, 0.6, g1);
      // finer grain ≈ 0.25 mm
      const g2 = pnoise(u * 128, v * 128, 128, 128);
      // crease network (dark thin lines)
      const cr = ridged(u * 12, v * 12, 12, 12, 2);
      const crease = smoothstep(0.86, 0.99, cr);
      const slow = fbm(u * 3, v * 3, 3, 3, 3) * 0.5;
      const height = pebble * 0.75 + g2 * 0.18 - crease * 0.5 + slow * 0.15;
      h[py * size + px] = height * 6;
      const shade = 0.72 + 0.4 * pebble + 0.1 * g2 - 0.35 * crease + slow * 0.25;
      const o = (py * size + px) * 4;
      // dusty dark grey (≈ sRGB 82,80,77 at shade 1; vertex colours pull clean areas toward black)
      alb[o] = clamp01(0.32 * shade) * 255;
      alb[o + 1] = clamp01(0.312 * shade) * 255;
      alb[o + 2] = clamp01(0.302 * shade) * 255;
      alb[o + 3] = 255;
      rough[py * size + px] = 0.4 + 0.26 * (1 - pebble) + 0.15 * crease + g2 * 0.05 + slow * 0.1;
    }
  }
  const map = commit(makeCanvas(size), alb, assets, { srgb: true });
  const normalMap = commit(makeCanvas(size), normalFromHeight(h, size, 0.8), assets, { srgb: false });
  const roughnessMap = commit(makeCanvas(size), grey(size, (x, y) => rough[y * size + x]), assets, { srgb: false });
  return { map, normalMap, roughnessMap };
}

/* ------------------------------------------------------------------------------------------ camo */

/**
 * Desert multi-scale camouflage (MultiCam-Arid flavour): sand base with soft tan gradients, mid-size brown
 * blotches, small dark speckles and a faint ripstop weave. One repeat = CAMO_TILE metres.
 */
export function makeCamoMaps(assets, size = 1024) {
  const alb = new Uint8ClampedArray(size * size * 4);
  const rough = new Float32Array(size * size);
  // reference sleeve: pale khaki ≈ sRGB (216,208,181), mid tan ≈ (178,166,141), brown blotch ≈ (139,112,88)
  // (warmer than the reference sRGB values: the plaza's blue sky ambient desaturates them in the render)
  const sand = [0.8, 0.73, 0.57];
  const tan = [0.68, 0.59, 0.43];
  const brown = [0.52, 0.4, 0.28];
  const dark = [0.38, 0.29, 0.2];
  const pale = [0.86, 0.81, 0.66];
  const c = [0, 0, 0];
  const setMix = (a, b, t) => {
    c[0] = mix(a[0], b[0], t);
    c[1] = mix(a[1], b[1], t);
    c[2] = mix(a[2], b[2], t);
  };
  for (let py = 0; py < size; py++) {
    const v = py / size;
    for (let px = 0; px < size; px++) {
      const u = px / size;
      const big = fbm(u * 4, v * 4, 4, 4, 3); // ~7 cm gradients
      const mid = fbm(u * 11 + 3.1, v * 11 + 1.7, 11, 11, 3); // ~3 cm blotches
      const small = fbm(u * 34 + 7.3, v * 34 + 5.9, 34, 34, 2); // ~1 cm speckles
      const streak = pnoise(u * 7, v * 48, 7, 48); // vertical MultiCam "smear" streaks
      // base gradient sand ↔ tan
      setMix(sand, tan, smoothstep(-0.4, 0.55, big + streak * 0.25));
      // brown blotches with soft edges, elongated by the streak field (sparser than real MultiCam: the
      // reference sleeve is mostly pale khaki)
      const bl = smoothstep(0.22, 0.4, mid + streak * 0.15);
      setMix(c, brown, bl);
      // darker cores inside blotches
      const core = smoothstep(0.5, 0.66, mid) * bl;
      setMix(c, dark, core * 0.8);
      // pale sand patches
      const pl = smoothstep(-0.3, -0.5, mid + big * 0.3);
      setMix(c, pale, pl * 0.85);
      // small dark speckles (mostly on the mid tones)
      const sp = smoothstep(0.58, 0.74, small) * (1 - pl) * 0.7;
      setMix(c, dark, sp);
      // ripstop weave modulation (2 px threads)
      const wx = Math.sin(px * Math.PI * 0.5) * 0.5 + 0.5;
      const wy = Math.sin(py * Math.PI * 0.5) * 0.5 + 0.5;
      const weave = 0.965 + 0.035 * Math.max(wx, wy) + 0.02 * ((px % 24 < 2 || py % 24 < 2) ? 1 : 0);
      const fade = 1 - 0.06 * smoothstep(-0.2, 0.7, fbm(u * 5 + 11, v * 5 + 2, 5, 5, 2));
      const o = (py * size + px) * 4;
      alb[o] = clamp01(c[0] * weave * fade) * 255;
      alb[o + 1] = clamp01(c[1] * weave * fade) * 255;
      alb[o + 2] = clamp01(c[2] * weave * fade) * 255;
      alb[o + 3] = 255;
      rough[py * size + px] = 0.88 + 0.06 * weave - 0.04 * core + 0.05 * (small * 0.5);
    }
  }
  const map = commit(makeCanvas(size), alb, assets, { srgb: true });
  const roughnessMap = commit(makeCanvas(size), grey(size, (x, y) => rough[y * size + x]), assets, { srgb: false });
  return { map, roughnessMap };
}

/* ---------------------------------------------------------------------------------- normal bake */

/**
 * Bake a tangent-space normal map from `heightFn(u, v) → metres` over a surface that is `widthM` metres
 * along u (wrapping) and `heightM` metres along v. Adds a faint ripstop weave.
 */
export function bakeNormalMap(assets, heightFn, widthM, heightM, size = 1024, { weave = 0.0025, strength = 1, weaveMask = null } = {}) {
  const h = new Float32Array(size * size);
  const pxU = widthM / size; // metres per texel along u
  const pxV = heightM / size;
  for (let py = 0; py < size; py++) {
    const v = 1 - (py + 0.5) / size; // canvas row 0 is v = 1
    for (let px = 0; px < size; px++) {
      const u = (px + 0.5) / size;
      let hh = heightFn(u, v);
      if (weave > 0) {
        const wx = Math.sin(px * Math.PI * 0.5);
        const wy = Math.sin(py * Math.PI * 0.5);
        hh += weave * 0.5 * (wx * wx + wy * wy) * 0.5 * (weaveMask ? weaveMask(u, v) : 1);
      }
      h[py * size + px] = hh;
    }
  }
  // Convert slopes to texel units: dh/dx_px = dh/dx_m * metres-per-texel⁻¹ — do it per axis.
  const out = new Uint8ClampedArray(size * size * 4);
  const kx = strength / pxU;
  const ky = strength / pxV;
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dx = (h[y * size + xp] - h[y * size + xm]) * 0.5 * kx;
      const dy = (h[ym * size + x] - h[yp * size + x]) * 0.5 * ky;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const o = (y * size + x) * 4;
      out[o] = (-dx * inv * 0.5 + 0.5) * 255;
      out[o + 1] = (-dy * inv * 0.5 + 0.5) * 255;
      out[o + 2] = (inv * 0.5 + 0.5) * 255;
      out[o + 3] = 255;
    }
  }
  const tex = commit(makeCanvas(size), out, assets, { srgb: false });
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
