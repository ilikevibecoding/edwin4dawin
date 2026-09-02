import * as THREE from 'three';

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

/** Olive knit: interlocking V stitches (24 wales × 32 courses per tile). Tile = 36 mm. */
export function makeKnit(aniso) {
  const S = 512;
  const COLS = 24;
  const ROWS = 32;
  const cw = S / COLS;
  const ch = S / ROWS;
  const height = new Float32Array(S * S);
  const legs = (cx, cy, px, py) => {
    // cell-local V: vertex at bottom centre, legs to the upper corners (in cell units); overlap into next row
    const u = (px - cx * cw) / cw;
    const v = (py - cy * ch) / ch;
    const dl = segDist(u, v, 0.5, 0.92, 0.08, 0.05);
    const dr = segDist(u, v, 0.5, 0.92, 0.92, 0.05);
    const d = Math.min(dl, dr);
    return Math.exp(-((d / 0.2) ** 2));
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
      // yarn fuzz + slight waviness
      const fuzz = fbm(x / S, y / S, 128, 2, 7) - 0.5;
      const wave = fbm(x / S, y / S, 4, 3, 3) - 0.5;
      height[y * S + x] = Math.max(0, Math.min(1, hgt * 0.85 + fuzz * 0.12 + wave * 0.1 + 0.05));
    }
  }
  const albedo = writeRGB(makeCanvas(S, S), (x, y, rgb) => {
    const hgt = height[y * S + x];
    const cellHash = hash2(Math.floor(x / cw), Math.floor(y / ch), 11);
    const wear = fbm(x / S, y / S, 3, 3, 21);
    // olive base, lighter on the yarn ridges, dark in the gaps
    const l = 0.56 + 0.66 * hgt + (cellHash - 0.5) * 0.12 + (wear - 0.5) * 0.16;
    rgb[0] = 0.385 * l;
    rgb[1] = 0.42 * l;
    rgb[2] = 0.275 * l;
  });
  return { map: toTexture(albedo, { srgb: true, anisotropy: aniso }), normalMap: toTexture(heightToNormal(height, S, S, 6), { srgb: false, anisotropy: aniso }), size: 0.036 };
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

/** Glove cuff: black nylon closure with the light grey trim stripe. u once around, v once along the cuff. */
export function makeCuff(aniso) {
  const W = 512;
  const H = 256;
  const height = new Float32Array(W * H);
  // grey elastic trim band at the forearm end of the cuff (v → 1), stitched; the hand end (v → 0) sits under the
  // glove's black wrist panel, so it stays plain black.
  const stripe = (v) => sstep(0.76, 0.79, v) * (1 - sstep(0.965, 0.985, v));
  // hook-and-loop closure strap running round the cuff (v 0.22..0.66) whose free end (tab) lies over the back of
  // the wrist (u ≈ 0.25); the strap is a slightly lighter charcoal webbing with a stitched outline.
  const strapBand = (v) => sstep(0.2, 0.23, v) * (1 - sstep(0.65, 0.68, v));
  const tabU = (u) => {
    const du = Math.abs(((u - 0.24 + 1.5) % 1) - 0.5);
    return 1 - sstep(0.13, 0.15, du);
  };
  const stitch = (u, v) => {
    let s = Math.exp(-(((v - 0.775) / 0.007) ** 2)) + Math.exp(-(((v - 0.97) / 0.007) ** 2));
    s += strapBand(v) > 0.01 ? Math.exp(-(((v - 0.235) / 0.007) ** 2)) + Math.exp(-(((v - 0.645) / 0.007) ** 2)) : 0;
    // tab outline (vertical stitch lines at the tab's ends)
    const du = Math.abs(((u - 0.24 + 1.5) % 1) - 0.5);
    s += strapBand(v) * Math.exp(-(((du - 0.135) / 0.006) ** 2));
    return s;
  };
  // canvas row 0 is texture v = 1 (flipY upload): v below is the texture coordinate (0 = hand end, 1 = forearm end)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const v = 1 - y / H;
      // ripstop weave: two crossed sine grids
      const weave = 0.5 + 0.25 * Math.sin(u * Math.PI * 2 * 128) + 0.25 * Math.sin(v * Math.PI * 2 * 48);
      const grid = Math.max(sstep(0.9, 1, Math.abs(Math.sin(u * Math.PI * 16))), sstep(0.9, 1, Math.abs(Math.sin(v * Math.PI * 6))));
      const n = fbm(u, v, 6, 3, 41);
      const strap = strapBand(v);
      const tab = strap * tabU(u);
      // webbing rib pattern on the strap, raised tab edge
      const rib = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 40);
      height[y * W + x] = weave * 0.35 * (1 - strap) + grid * 0.25 * (1 - strap) + n * 0.3 + stripe(v) * 0.12 + strap * (0.12 + 0.1 * rib) + tab * 0.15 - stitch(u, v) * 0.25;
    }
  }
  const albedo = writeRGB(makeCanvas(W, H), (x, y, rgb) => {
    const u = x / W;
    const v = 1 - y / H;
    const s = stripe(v);
    const n = fbm(u, v, 6, 3, 41);
    const weave = 0.5 + 0.25 * Math.sin(u * Math.PI * 2 * 128) + 0.25 * Math.sin(v * Math.PI * 2 * 48);
    const strap = strapBand(v);
    const tab = strap * tabU(u);
    const rib = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 40);
    let black = 0.045 * (0.75 + 0.5 * weave + (n - 0.5) * 0.4);
    black *= 1 + strap * (0.9 + 0.7 * rib) + tab * 0.7;
    const grey = 0.5 * (0.85 + 0.3 * weave + (n - 0.5) * 0.3);
    const st = Math.min(1, stitch(u, v));
    const l = (black + (grey - black) * s) * (1 - 0.6 * st);
    rgb[0] = l;
    rgb[1] = l;
    rgb[2] = l * (s > 0.5 ? 1.03 : 1.05);
  });
  return { map: toTexture(albedo, { srgb: true, anisotropy: aniso }), normalMap: toTexture(heightToNormal(height, W, H, 3), { srgb: false, anisotropy: aniso }) };
}

/* ------------------------------------------------------------------------------------------- camo */

/** Desert camo (tan / khaki / brown / light) with folds and a fine weave in the normal map. Tile = 0.22 m. */
export function makeCamo(aniso) {
  const S = 1024;
  const palette = [
    [0.70, 0.60, 0.44], // sand base
    [0.55, 0.47, 0.33], // khaki
    [0.40, 0.31, 0.21], // brown
    [0.80, 0.74, 0.60], // light
    [0.30, 0.24, 0.17], // dark speckle
  ];
  const height = new Float32Array(S * S);
  const albedo = writeRGB(makeCanvas(S, S), (x, y, rgb) => {
    const u = x / S;
    const v = y / S;
    const big = fbm(u, v, 3, 4, 101, 0.55);
    const mid = fbm(u, v, 7, 3, 202, 0.5);
    const small = fbm(u, v, 18, 2, 303, 0.5);
    let c = palette[0];
    // blotch layering: khaki where big > 0.52, brown where mid > 0.6 inside khaki, light where big < 0.4
    const kh = sstep(0.5, 0.54, big);
    const br = sstep(0.58, 0.62, mid) * sstep(0.45, 0.5, big);
    const lt = 1 - sstep(0.38, 0.42, big);
    const sp = sstep(0.66, 0.7, small) * 0.7;
    const r = c[0] * (1 - kh) + palette[1][0] * kh;
    const g = c[1] * (1 - kh) + palette[1][1] * kh;
    const b = c[2] * (1 - kh) + palette[1][2] * kh;
    let R = r * (1 - br) + palette[2][0] * br;
    let G = g * (1 - br) + palette[2][1] * br;
    let B = b * (1 - br) + palette[2][2] * br;
    R = R * (1 - lt) + palette[3][0] * lt;
    G = G * (1 - lt) + palette[3][1] * lt;
    B = B * (1 - lt) + palette[3][2] * lt;
    R = R * (1 - sp) + palette[4][0] * sp;
    G = G * (1 - sp) + palette[4][1] * sp;
    B = B * (1 - sp) + palette[4][2] * sp;
    // fabric weave & dirt
    const weave = 0.5 + 0.25 * Math.sin(u * Math.PI * 2 * 220) + 0.25 * Math.sin(v * Math.PI * 2 * 220);
    const dirt = fbm(u, v, 5, 3, 404);
    const l = 0.9 + 0.12 * weave + (dirt - 0.5) * 0.25;
    rgb[0] = R * l;
    rgb[1] = G * l;
    rgb[2] = B * l;
    // folds (soft, anisotropic) + weave
    const fold = fbm(u * 1.0, v * 1.0, 6, 3, 505, 0.5);
    const fold2 = fbm(u, v, 14, 2, 606, 0.5);
    height[y * S + x] = fold * 0.7 + fold2 * 0.2 + weave * 0.1;
  });
  return { map: toTexture(albedo, { srgb: true, anisotropy: aniso }), normalMap: toTexture(heightToNormal(height, S, S, 6), { srgb: false, anisotropy: aniso }), size: 0.22 };
}

/* ------------------------------------------------------------------------------------------- skin */

/** Forearm skin: warm mid tone with mottling, faint veins and pore normals. Tile = 0.12 m. */
export function makeSkin(aniso) {
  const S = 512;
  const height = new Float32Array(S * S);
  const albedo = writeRGB(makeCanvas(S, S), (x, y, rgb) => {
    const u = x / S;
    const v = y / S;
    const mottle = fbm(u, v, 6, 4, 701, 0.55);
    const red = fbm(u, v, 3, 3, 802);
    const freck = sstep(0.78, 0.84, fbm(u, v, 40, 2, 903));
    const pores = fbm(u, v, 120, 2, 1004);
    const l = 0.92 + (mottle - 0.5) * 0.28 - freck * 0.25;
    // base sRGB ≈ (200, 148, 118)
    rgb[0] = 0.78 * l + (red - 0.5) * 0.04;
    rgb[1] = 0.58 * l - (red - 0.5) * 0.03;
    rgb[2] = 0.47 * l - (red - 0.5) * 0.03;
    height[y * S + x] = pores * 0.35 + mottle * 0.25;
  });
  return { map: toTexture(albedo, { srgb: true, anisotropy: aniso }), normalMap: toTexture(heightToNormal(height, S, S, 1.6), { srgb: false, anisotropy: aniso }), size: 0.12 };
}
