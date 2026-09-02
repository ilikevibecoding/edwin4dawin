import * as THREE from 'three';
import { CUFF, cuffTabDist } from './arm.js';

/**
 * Procedural canvas textures for the arms: olive knit, black synthetic leather, glove cuff with grey trim,
 * desert camo sleeve (with fold/weave normals) and forearm skin. All tile seamlessly (periodic lattice noise).
 * Textures are generated once at load; sizes are kept modest so generation stays well under a second.
 */

/* ------------------------------------------------------------------------------------------- noise */

function hash2(ix, iy, seed) {
  let h = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Periodic value noise on a lattice with `period` cells (x, y in cell units). */
function vnoise(x, y, period, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const ix0 = ((x0 % period) + period) % period;
  const iy0 = ((y0 % period) + period) % period;
  const ix1 = (ix0 + 1) % period;
  const iy1 = (iy0 + 1) % period;
  const a = hash2(ix0, iy0, seed);
  const b = hash2(ix1, iy0, seed);
  const c = hash2(ix0, iy1, seed);
  const d = hash2(ix1, iy1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Tileable fbm over the unit square: u,v ∈ [0,1), base frequency `freq` cells across, `oct` octaves. */
function fbm(u, v, freq, oct, seed, gain = 0.5) {
  let amp = 1;
  let sum = 0;
  let norm = 0;
  let f = freq;
  for (let o = 0; o < oct; o++) {
    sum += amp * vnoise(u * f, v * f, f, seed + o * 17);
    norm += amp;
    amp *= gain;
    f *= 2;
  }
  return sum / norm;
}

function sstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------------------------------------- helpers */

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(canvas, { srgb = true, anisotropy = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = anisotropy;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Height field (Float32Array w*h, 0..1) → tangent-space normal canvas (OpenGL convention, canvas rows flipped). */
function heightToNormal(height, w, h, strength) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const ym = (y - 1 + h) % h;
    const yp = (y + 1) % h;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w;
      const xp = (x + 1) % w;
      const dhdc = (height[y * w + xp] - height[y * w + xm]) * 0.5 * strength;
      const dhdr = (height[yp * w + x] - height[ym * w + x]) * 0.5 * strength;
      let nx = -dhdc;
      let ny = dhdr; // canvas rows run downward (v decreases), flipY texture upload
      let nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * w + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * 0.5 + 0.5) * 255;
      d[i + 2] = (nz * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function writeRGB(canvas, fn) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const rgb = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      fn(x, y, rgb);
      const i = (y * w + x) * 4;
      d[i] = Math.max(0, Math.min(255, rgb[0] * 255));
      d[i + 1] = Math.max(0, Math.min(255, rgb[1] * 255));
      d[i + 2] = Math.max(0, Math.min(255, rgb[2] * 255));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Distance from point (px,py) to segment (ax,ay)-(bx,by). */
function segDist(px, py, ax, ay, bx, by) {
  const bax = bx - ax;
  const bay = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * bax + (py - ay) * bay) / (bax * bax + bay * bay)));
  const dx = px - ax - bax * t;
  const dy = py - ay - bay * t;
  return Math.sqrt(dx * dx + dy * dy);
}

/* ------------------------------------------------------------------------------------------- knit */

/**
 * Olive knit: a ribbed jersey — 26 courses per 34 mm tile (1.3 mm pitch) running ACROSS the finger / hand axis
 * (v runs along the digits in the glove UVs), each course a rounded ridge with the interlocking V stitches (30
 * wales → 1.1 mm) riding on it, like the transverse ribbing on the MW2019 glove's back. Tile = 34 mm.
 */
export function makeKnit(aniso) {
  const S = 512;
  const COLS = 30;
  const ROWS = 26;
  const cw = S / COLS;
  const ch = S / ROWS;
  const height = new Float32Array(S * S);
  const legs = (cx, cy, px, py) => {
    // cell-local V: vertex at bottom centre, legs to the upper corners (in cell units); overlap into next row
    const u = (px - cx * cw) / cw;
    const v = (py - cy * ch) / ch;
    const dl = segDist(u, v, 0.5, 0.9, 0.1, 0.1);
    const dr = segDist(u, v, 0.5, 0.9, 0.9, 0.1);
    const d = Math.min(dl, dr);
    return Math.exp(-((d / 0.22) ** 2));
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const cx = Math.floor(x / cw);
      const cy = Math.floor(y / ch);
      let hgt = 0;
      // consider this cell + neighbours (wrapping) so the tube profile is continuous
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const ccx = cx + ox;
          const ccy = cy + oy;
          // wrap sample position rather than cell index
          let px = x;
          let py = y;
          if (ccx < 0) px += S;
          if (ccx >= COLS) px -= S;
          if (ccy < 0) py += S;
          if (ccy >= ROWS) py -= S;
          const wcx = ((ccx % COLS) + COLS) % COLS;
          const wcy = ((ccy % ROWS) + ROWS) % ROWS;
          hgt = Math.max(hgt, legs(wcx, wcy, px, py));
        }
      }
      // the course ridge (rounded, slightly wavy so the ribs are not ruler-straight) carries most of the relief;
      // the V stitches ride on it; yarn fuzz on top
      const wave = fbm(x / S, y / S, 4, 3, 3) - 0.5;
      const ridge = 0.5 + 0.5 * Math.cos(((y / ch + wave * 0.35) % 1) * Math.PI * 2);
      const fuzz = fbm(x / S, y / S, 128, 2, 7) - 0.5;
      height[y * S + x] = Math.max(0, Math.min(1, ridge * 0.55 + hgt * 0.3 + fuzz * 0.1 + 0.05));
    }
  }
  const albedo = writeRGB(makeCanvas(S, S), (x, y, rgb) => {
    const hgt = height[y * S + x];
    const cellHash = hash2(Math.floor(x / cw), Math.floor(y / ch), 11);
    const wear = fbm(x / S, y / S, 3, 3, 21);
    const mottle = fbm(x / S, y / S, 9, 2, 23);
    // grey-olive like the MW2019 glove (hue ≈ 75°, low saturation — the reference's knit is a near-grey green,
    // G ≥ R; the first pass leaned yellow in the sun): lighter on the course ridges, dark in the furrows between
    // them, and mottled at two scales (yarn dye + wear) so the back of the hand is not one flat tone
    const l = 0.42 + 0.7 * hgt + (cellHash - 0.5) * 0.14 + (wear - 0.5) * 0.3 + (mottle - 0.5) * 0.16;
    rgb[0] = 0.288 * l;
    rgb[1] = 0.313 * l;
    rgb[2] = 0.262 * l;
  });
  return { map: toTexture(albedo, { srgb: true, anisotropy: aniso }), normalMap: toTexture(heightToNormal(height, S, S, 5), { srgb: false, anisotropy: aniso }), size: 0.034 };
}

/* ------------------------------------------------------------------------------------------- leather */

/** Black synthetic leather with a pebble grain. Tile = 40 mm. */
export function makeLeather(aniso) {
  const S = 512;
  const height = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      const grain = fbm(u, v, 40, 3, 5, 0.55);
      const fine = fbm(u, v, 160, 2, 9);
      const pores = Math.pow(Math.max(0, grain - 0.35) / 0.65, 1.4);
      height[y * S + x] = Math.max(0, Math.min(1, pores * 0.8 + fine * 0.2));
    }
  }
  const albedo = writeRGB(makeCanvas(S, S), (x, y, rgb) => {
    const hgt = height[y * S + x];
    const dust = fbm(x / S, y / S, 5, 3, 31);
    const l = 0.55 + 0.7 * hgt + (dust - 0.5) * 0.25;
    rgb[0] = 0.052 * l;
    rgb[1] = 0.052 * l;
    rgb[2] = 0.056 * l;
  });
  return { map: toTexture(albedo, { srgb: true, anisotropy: aniso }), normalMap: toTexture(heightToNormal(height, S, S, 4), { srgb: false, anisotropy: aniso }), size: 0.04 };
}

/* ------------------------------------------------------------------------------------------- cuff */

/**
 * Glove cuff: matte black nylon wrist panel (ripstop weave) with the hook-and-loop closure — a thin strap round the
 * cuff and its rectangular tab over the back of the wrist (layout from arm.js CUFF / cuffTabDist so the paint lines
 * up with the displaced geometry), stitched outlines, and the thin grey piping at the forearm end.
 * u once around (0.25 = dorsal), v once along the cuff (0 = inside the glove, 1 = forearm end).
 */
export function makeCuff(aniso) {
  const W = 512;
  const H = 256;
  const height = new Float32Array(W * H);
  const cuffLen = CUFF.end - CUFF.start;
  const [st0, st1] = CUFF.stripe;
  const stripe = (v) => sstep(st0, st0 + 0.015, v) * (1 - sstep(st1 - 0.013, st1, v));
  const v0 = (CUFF.tab.s[0] - CUFF.start) / cuffLen;
  const v1 = (CUFF.tab.s[1] - CUFF.start) / cuffLen;
  const strapBand = (v) => sstep(v0 - 0.03, v0, v) * (1 - sstep(v1, v1 + 0.03, v));
  const stitch = (u, v, tabD) => {
    // piping seam at the forearm end, strap edges, and a box stitch 2 mm inside the tab's edge
    let s = Math.exp(-(((v - (st0 - 0.012)) / 0.005) ** 2));
    const band = strapBand(v);
    if (band > 0.01) s += Math.exp(-(((v - (v0 + 0.012)) / 0.005) ** 2)) + Math.exp(-(((v - (v1 - 0.012)) / 0.005) ** 2));
    s += Math.exp(-(((tabD + 0.002) / 0.00045) ** 2));
    // dashed thread
    const dash = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 220) * Math.sin(v * Math.PI * 2 * 60));
    return Math.min(1, s) * dash;
  };
  // canvas row 0 is texture v = 1 (flipY upload): v below is the texture coordinate (0 = hand end, 1 = forearm end)
  const sample = (x, y) => {
    const u = x / W;
    const v = 1 - y / H;
    const tabD = cuffTabDist(u, v);
    const tab = 1 - sstep(-0.0004, 0.0006, tabD);
    const strap = strapBand(v) * (1 - tab);
    // ripstop weave: two crossed sine grids over a coarser ripstop lattice
    const weave = 0.5 + 0.25 * Math.sin(u * Math.PI * 2 * 128) + 0.25 * Math.sin(v * Math.PI * 2 * 48);
    const grid = Math.max(sstep(0.9, 1, Math.abs(Math.sin(u * Math.PI * 16))), sstep(0.9, 1, Math.abs(Math.sin(v * Math.PI * 6))));
    const n = fbm(u, v, 6, 3, 41);
    // webbing rib along the strap and the tab (the tab is the strap's free end, hook side down)
    const rib = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 60);
    return { u, v, tabD, tab, strap, weave, grid, n, rib, st: stitch(u, v, tabD), s: stripe(v) };
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = sample(x, y);
      const web = k.tab + k.strap;
      height[y * W + x] = (k.weave * 0.35 + k.grid * 0.25) * (1 - web) + k.n * 0.3 + k.s * 0.12 + web * (0.15 + 0.12 * k.rib) - k.st * 0.25;
    }
  }
  const albedo = writeRGB(makeCanvas(W, H), (x, y, rgb) => {
    const k = sample(x, y);
    let black = 0.046 * (0.75 + 0.5 * k.weave + (k.n - 0.5) * 0.4);
    // strap / tab webbing: a shade lighter charcoal with the rib
    black *= 1 + (k.tab + k.strap) * (0.25 + 0.3 * k.rib);
    const grey = 0.24 * (0.85 + 0.3 * k.weave + (k.n - 0.5) * 0.3);
    let l = black + (grey - black) * k.s;
    // thread: light grey stitches
    l = l * (1 - 0.6 * k.st) + 0.38 * k.st;
    rgb[0] = l;
    rgb[1] = l;
    rgb[2] = l * (k.s > 0.5 ? 1.03 : 1.05);
  });
  return { map: toTexture(albedo, { srgb: true, anisotropy: aniso }), normalMap: toTexture(heightToNormal(height, W, H, 3), { srgb: false, anisotropy: aniso }) };
}

/* ------------------------------------------------------------------------------------------- camo */

/**
 * Desert camo (tan / khaki / brown / light) — printed blotches with HARD edges (a printed pattern does not fade
 * between colours), a fine 3-tone speckle inside them, a twill weave (diagonal ribs) in the normal map and soft
 * folds. Tile = 0.22 m; blotches ≈ 25–40 mm so several read on the ≈ 50 mm of rolled sleeve in the hip view.
 * Tones are kept ≈ 15 % below a neutral read: the plaza sun (plus the view-model fill) lifted the first pass to a
 * clipped cream in which the blotches vanished (sleeve mean 173, R − B +16 against the reference's +35).
 */
export function makeCamo(aniso) {
  const S = 1024;
  const palette = [
    [0.60, 0.50, 0.33], // sand base
    [0.46, 0.39, 0.24], // khaki
    [0.33, 0.25, 0.15], // brown
    [0.70, 0.63, 0.47], // light
    [0.38, 0.30, 0.19], // dark speckle
    [0.52, 0.44, 0.30], // mid speckle
  ];
  const height = new Float32Array(S * S);
  const albedo = writeRGB(makeCanvas(S, S), (x, y, rgb) => {
    const u = x / S;
    const v = y / S;
    const big = fbm(u, v, 7, 4, 101, 0.55);
    const mid = fbm(u, v, 12, 3, 202, 0.5);
    // blotch layering with edges one texel wide: khaki where big > 0.53, brown blotches where mid > 0.62 (printed
    // over sand and khaki alike), light where big < 0.43
    const e = 0.004;
    const kh = sstep(0.53 - e, 0.53 + e, big);
    const br = sstep(0.62 - e, 0.62 + e, mid);
    const lt = (1 - sstep(0.43 - e, 0.43 + e, big)) * (1 - br);
    let c = palette[0];
    let R = c[0] * (1 - kh) + palette[1][0] * kh;
    let G = c[1] * (1 - kh) + palette[1][1] * kh;
    let B = c[2] * (1 - kh) + palette[1][2] * kh;
    R = R * (1 - br) + palette[2][0] * br;
    G = G * (1 - br) + palette[2][1] * br;
    B = B * (1 - br) + palette[2][2] * br;
    R = R * (1 - lt) + palette[3][0] * lt;
    G = G * (1 - lt) + palette[3][1] * lt;
    B = B * (1 - lt) + palette[3][2] * lt;
    // three-tone speckle (≈ 1.5 mm dots): dark and mid flecks printed over every blotch, light flecks on the dark
    // ones — kept faint so at arm's length it reads as the print's grain, not as dirt
    const fleck = vnoise(u * 140, v * 140, 140, 303);
    const fleck2 = vnoise(u * 140 + 0.5, v * 140 + 0.5, 140, 304);
    const sp = sstep(0.87, 0.895, fleck) * 0.32;
    const sp2 = sstep(0.8, 0.83, fleck2) * 0.35;
    const spLight = sstep(0.13, 0.155, fleck) * Math.min(1, br + kh) * 0.35;
    R = R * (1 - sp) + palette[4][0] * sp;
    G = G * (1 - sp) + palette[4][1] * sp;
    B = B * (1 - sp) + palette[4][2] * sp;
    R = R * (1 - sp2) + palette[5][0] * sp2;
    G = G * (1 - sp2) + palette[5][1] * sp2;
    B = B * (1 - sp2) + palette[5][2] * sp2;
    R = R * (1 - spLight) + palette[3][0] * spLight;
    G = G * (1 - spLight) + palette[3][1] * spLight;
    B = B * (1 - spLight) + palette[3][2] * spLight;
    // twill weave: diagonal ribs ≈ 0.7 mm apart (yarns visible as a fine diagonal in the albedo too) & dirt
    const twill = 0.5 + 0.5 * Math.sin(((x + y) / S) * 314 * Math.PI * 2); // 314 ribs per tile → 0.7 mm pitch
    const yarn = 0.5 + 0.25 * Math.sin(u * Math.PI * 2 * 300) + 0.25 * Math.sin(v * Math.PI * 2 * 300);
    const dirt = fbm(u, v, 5, 3, 404);
    const l = 0.86 + 0.06 * twill + 0.04 * yarn + (dirt - 0.5) * 0.2;
    rgb[0] = R * l;
    rgb[1] = G * l;
    rgb[2] = B * l;
    // folds (soft, anisotropic) + twill
    const fold = fbm(u * 1.0, v * 1.0, 6, 3, 505, 0.5);
    const fold2 = fbm(u, v, 14, 2, 606, 0.5);
    height[y * S + x] = fold * 0.6 + fold2 * 0.15 + twill * 0.2 + yarn * 0.05;
  });
  return { map: toTexture(albedo, { srgb: true, anisotropy: aniso }), normalMap: toTexture(heightToNormal(height, S, S, 6), { srgb: false, anisotropy: aniso }), size: 0.22 };
}

/* ------------------------------------------------------------------------------------------- skin */

/**
 * Forearm skin as ONE unwrapped map: u runs once around the forearm (0.25 = dorsal/extensor side, 0.75 = inner/
 * flexor side), v runs from the glove cuff (0) to the rolled sleeve (1). Albedo: desaturated warm base, redder toward
 * the elbow and on the dorsal/ulnar side, lighter on the inner forearm, multi-scale mottling, sparse freckles/moles,
 * faint bluish veins on the inner forearm, fine dark arm hair (dorsal side), soft compression darkening at the cuff.
 * Height (→ normal map): pores, micro-wrinkles across the arm, raised veins, flexor tendons near the wrist.
 * Roughness map: pores/oilier areas vary around 0.6.
 * `circumference`/`length` (metres) give the map its physical scale so pores and hairs come out life-sized.
 */
export function makeSkin(aniso, { circumference = 0.23, length = 0.12 } = {}) {
  const W = 1024;
  const H = 512;
  const height = new Float32Array(W * H);
  const rough = new Float32Array(W * H);
  const hairField = new Float32Array(W * H);
  const mmU = (circumference * 1000) / W; // mm per texel around
  const mmV = (length * 1000) / H; // mm per texel along

  // --- veins: a few meandering longitudinal paths on the inner forearm (u ≈ 0.55..0.95), with branches.
  const veins = [];
  const VEIN_N = 24;
  const addVein = (u0, v0, v1, width, seed, wander = 0.03) => {
    const pts = [];
    let u = u0;
    for (let i = 0; i <= VEIN_N; i++) {
      const t = i / VEIN_N;
      u += (vnoise(t * 6, seed, 64, seed) - 0.5) * wander;
      pts.push([u, v0 + (v1 - v0) * t]);
    }
    veins.push({ pts, width, v0, v1 });
  };
  addVein(0.66, 0.0, 1.0, 1.7, 5.1, 0.035); // basilic-ish, whole length
  addVein(0.8, 0.1, 1.0, 1.4, 9.7, 0.03); // median antebrachial
  addVein(0.73, 0.55, 0.98, 1.1, 3.3, 0.05); // branch joining toward the elbow
  addVein(0.6, 0.35, 0.72, 0.9, 7.9, 0.04); // short tributary
  addVein(0.9, 0.0, 0.45, 1.0, 2.2, 0.025); // ulnar-side small vein
  const vein = { d: Infinity, width: 1 };
  // distance (mm) to the nearest vein centre line; the polylines are monotonic in v, so only the segments around
  // the matching parameter need testing
  const veinDist = (u, v) => {
    let best = Infinity;
    let width = 1;
    for (const vn of veins) {
      const p = vn.pts;
      const k = Math.floor(((v - vn.v0) / (vn.v1 - vn.v0)) * VEIN_N);
      const i0 = Math.max(0, k - 2);
      const i1 = Math.min(VEIN_N - 1, k + 2);
      for (let i = i0; i <= i1; i++) {
        // wrap-aware distance in mm
        let du = u - p[i][0];
        du -= Math.round(du);
        const bx = (p[i + 1][0] - p[i][0]) * circumference * 1000;
        const by = (p[i + 1][1] - p[i][1]) * length * 1000;
        const px = du * circumference * 1000;
        const py = (v - p[i][1]) * length * 1000;
        const d = segDist(px, py, 0, 0, bx, by);
        if (d < best) {
          best = d;
          width = vn.width;
        }
      }
    }
    vein.d = best;
    vein.width = width;
    return vein;
  };

  // --- hairs: short dark strokes, denser on the dorsal side, lying roughly along the arm (toward the wrist)
  const hairs = [];
  {
    let seed = 1;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 6000; i++) {
      const u = rnd();
      const v = rnd();
      // density: dorsal side (u ≈ 0.25) high, inner side (u ≈ 0.75) near zero; fewer right at the cuff
      const dorsal = 0.5 + 0.5 * Math.cos((u - 0.25) * Math.PI * 2);
      const density = Math.pow(dorsal, 1.8) * (0.3 + 0.7 * sstep(0.05, 0.3, v)) * (0.3 + 0.7 * fbm(u, v, 5, 2, 77));
      if (rnd() > density) continue;
      const len = 2.5 + rnd() * 2.5; // mm
      // hairs lie along the arm toward the wrist (canvas +y = texture -v), fanning slightly around the arm
      const ang = Math.PI / 2 + (rnd() - 0.5) * 0.7 + Math.sin(u * Math.PI * 2) * 0.3;
      const curve = (rnd() - 0.5) * 0.7;
      hairs.push({ x: u * W, y: (1 - v) * H, len, ang, curve, dark: 0.14 + rnd() * 0.22, w: 0.18 + rnd() * 0.1 });
    }
  }
  // rasterise hairs into hairField (coverage 0..1)
  for (const h of hairs) {
    const steps = Math.ceil((h.len / mmU) * 2);
    let x = h.x;
    let y = h.y;
    let a = h.ang;
    const dl = h.len / steps;
    for (let s = 0; s < steps; s++) {
      x += (Math.cos(a) * dl) / mmU;
      y += (Math.sin(a) * dl) / mmV;
      a += h.curve / steps;
      const t = s / steps;
      const taper = Math.min(1, t * 6) * (1 - t * 0.7); // fine root, tapering tip
      const rad = h.w * taper;
      const xi = Math.round(x);
      const yi = Math.round(y);
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const px = (((xi + ox) % W) + W) % W;
          const py = yi + oy;
          if (py < 0 || py >= H) continue;
          const dd = Math.hypot((xi + ox - x) * mmU, (yi + oy - y) * mmV) / (rad * 0.55);
          const cov = Math.exp(-dd * dd) * h.dark;
          const i = py * W + px;
          hairField[i] = Math.max(hairField[i], cov);
        }
      }
    }
  }

  const albedo = writeRGB(makeCanvas(W, H), (x, y, rgb) => {
    const u = x / W;
    const v = 1 - y / H; // canvas row 0 = v 1 (flipY upload)
    const i = y * W + x;
    const dorsal = 0.5 + 0.5 * Math.cos((u - 0.25) * Math.PI * 2); // 1 dorsal, 0 inner forearm
    const mottle = fbm(u, v, 5, 4, 701, 0.55);
    const mottleFine = fbm(u, v, 14, 3, 702, 0.5);
    const red = fbm(u, v, 3, 3, 802);
    const freck = sstep(0.83, 0.89, fbm(u, v, 46, 2, 903)) * (0.5 + 0.5 * dorsal);
    // a handful of 2 mm moles: fine lattice peaks, gated by a coarse mask so they stay sparse
    const mole = sstep(0.955, 0.975, vnoise(u * 110, v * 55, 110, 904)) * sstep(0.62, 0.68, fbm(u, v, 7, 2, 905)) * dorsal;
    const pores = fbm(u, v, 200, 2, 1004);
    const wrinkle = Math.sin(v * Math.PI * 2 * 90 + fbm(u, v, 8, 2, 1102) * 9) * 0.5 + 0.5; // fine transverse creases
    const vein = veinDist(u, v);
    const veinCore = Math.exp(-((vein.d / vein.width) ** 2)) * (1 - dorsal) * 0.85;
    const veinHalo = Math.exp(-((vein.d / (vein.width * 2.6)) ** 2)) * (1 - dorsal) * 0.5;
    const hair = hairField[i];
    // flexor tendons: two soft longitudinal ridges converging to the wrist on the inner side
    const tendon = (uc) => Math.exp(-(((u - uc) / 0.028) ** 2)) * (1 - sstep(0.2, 0.55, v));
    const tendons = (tendon(0.71 + 0.04 * v) + tendon(0.8 - 0.03 * v)) * 0.6;
    // extensor tendons on the back of the wrist (the hand is extended over the handguard, so they stand out):
    // two ridges either side of the dorsal centre line, fading out a third of the way up the forearm
    const extensor = (Math.exp(-(((u - 0.215) / 0.02) ** 2)) + 0.8 * Math.exp(-(((u - 0.29) / 0.018) ** 2))) * (1 - sstep(0.12, 0.5, v));
    // ulnar bone ridge near the wrist (u ≈ 0.5)
    const ulna = Math.exp(-(((u - 0.5) / 0.05) ** 2)) * (1 - sstep(0.05, 0.4, v)) * 0.5;
    const cuffShade = 1 - 0.22 * (1 - sstep(0.0, 0.09, v)) - 0.08 * Math.exp(-(((v - 0.03) / 0.03) ** 2));

    // --- albedo (sRGB) ---
    // muted rose-tan (hue ≈ 15°, saturation ≈ 0.4 like the MW2019 reference forearm), kept 15 % darker than a
    // neutral read since the plaza sun lifts it; the blue channel sits closer to green than a peach tone would
    // put it (R − B ≈ 47 in the map) so the sunlit render lands near the reference's R − B ≈ 65 rather than 90.
    // Inner forearm a touch lighter / yellower, dorsal + elbow end ruddier.
    let R = 0.548;
    let G = 0.403;
    let B = 0.384;
    const inner = 1 - dorsal;
    R += inner * 0.03 - dorsal * 0.01;
    G += inner * 0.03 - dorsal * 0.015;
    B += inner * 0.025 - dorsal * 0.02;
    const elbowRed = sstep(0.55, 1.0, v) * 0.4 + dorsal * 0.25 + (red - 0.5) * 0.5;
    R += elbowRed * 0.025;
    G -= elbowRed * 0.03;
    B -= elbowRed * 0.02;
    let l = 0.755 + (mottle - 0.5) * 0.12 + (mottleFine - 0.5) * 0.06 + (pores - 0.5) * 0.04;
    l *= cuffShade;
    l -= freck * 0.1 + mole * 0.16;
    // veins: cooler and slightly darker (faint — they read mostly through the soft ridge in the normal map)
    R -= veinCore * 0.025 + veinHalo * 0.01;
    G -= veinCore * 0.012 + veinHalo * 0.004;
    B += veinCore * 0.004;
    // cuff compression: a touch of redness along with the darkening
    const press = 1 - sstep(0.0, 0.08, v);
    R += press * 0.025;
    G -= press * 0.01;
    // hair: fine dark-brown strokes — a visible peppering on the back of the forearm at arm's length
    const hr = 0.2;
    const hg = 0.13;
    const hb = 0.09;
    rgb[0] = R * l * (1 - hair) + hr * hair;
    rgb[1] = G * l * (1 - hair) + hg * hair;
    rgb[2] = B * l * (1 - hair) + hb * hair;

    // --- height & roughness ---
    height[i] = 0.5 + (pores - 0.5) * 0.5 + (wrinkle - 0.5) * 0.08 + (mottleFine - 0.5) * 0.12 + veinCore * 0.22 + veinHalo * 0.08 + tendons * 0.45 + extensor * 0.4 + ulna * 0.3 - freck * 0.05 + hair * 0.08 - press * 0.15;
    rough[i] = 0.66 + (pores - 0.5) * 0.18 + (mottle - 0.5) * 0.06 - veinCore * 0.04 - inner * 0.03 + hair * 0.1;
  });
  const roughCanvas = writeRGB(makeCanvas(W, H), (x, y, rgb) => {
    const r = Math.max(0.35, Math.min(0.85, rough[y * W + x]));
    rgb[0] = 1;
    rgb[1] = r;
    rgb[2] = 0;
  });
  return {
    map: toTexture(albedo, { srgb: true, anisotropy: aniso }),
    normalMap: toTexture(heightToNormal(height, W, H, 3.0), { srgb: false, anisotropy: aniso }),
    roughnessMap: toTexture(roughCanvas, { srgb: false, anisotropy: aniso }),
    size: 1,
  };
}
