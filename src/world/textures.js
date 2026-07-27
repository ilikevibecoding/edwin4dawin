import * as THREE from 'three';
import { makeRNG, clamp } from '../core/math.js';

/**
 * Procedural PBR texture factory. Every surface in the game is generated
 * here on canvases at load time — albedo, normal (derived from height via
 * sobel), and roughness — so the build ships zero binary assets.
 */

const rng = makeRNG(90210);

/* ------------------------------------------------------------------ */
/*  low-level pixel helpers                                            */
/* ------------------------------------------------------------------ */

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** Tileable value noise. */
function makeValueNoise(size, freq, seed) {
  const r = makeRNG(seed);
  const g = freq;
  const grid = new Float32Array((g + 1) * (g + 1));
  for (let y = 0; y <= g; y++)
    for (let x = 0; x <= g; x++)
      grid[y * (g + 1) + x] = r();
  // Wrap edges for tileability
  for (let y = 0; y <= g; y++) grid[y * (g + 1) + g] = grid[y * (g + 1)];
  for (let x = 0; x <= g; x++) grid[g * (g + 1) + x] = grid[x];
  const fade = (t) => t * t * (3 - 2 * t);
  return (u, v) => {
    const fx = (u * g) % g, fy = (v * g) % g;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fade(fx - x0), ty = fade(fy - y0);
    const a = grid[y0 * (g + 1) + x0], b = grid[y0 * (g + 1) + x0 + 1];
    const c = grid[(y0 + 1) * (g + 1) + x0], d = grid[(y0 + 1) * (g + 1) + x0 + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

/** fbm of tileable value noise. */
function makeFBM(size, baseFreq, octaves, seed) {
  const layers = [];
  let f = baseFreq, amp = 1, total = 0;
  for (let i = 0; i < octaves; i++) {
    layers.push({ n: makeValueNoise(size, f, seed + i * 131), amp });
    total += amp; f *= 2; amp *= 0.5;
  }
  return (u, v) => {
    let s = 0;
    for (const L of layers) s += L.n(u, v) * L.amp;
    return s / total;
  };
}

/** Generate ImageData by evaluating fn(u,v) -> [r,g,b] (0..255). */
function paint(size, fn) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const [r, g, b] = fn(u, v, x, y);
      const i = (y * size + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Height canvas (grayscale fn -> 0..1) → normal map canvas via sobel. */
function normalFromHeight(size, heightFn, strength = 1.5) {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      h[y * size + x] = heightFn(x / size, y / size);
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * size + x) * 4;
      d[i] = (-dx * inv * 0.5 + 0.5) * 255;
      d[i + 1] = (dy * inv * 0.5 + 0.5) * 255;   // three.js expects +Y up normal maps flipped for canvas Y
      d[i + 2] = inv * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function tex(cnv, { srgb = false, repeat = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(cnv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (c1, c2, t) => [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)];
/** Pull a tint toward its own luminance (k = 0..1 desaturation amount). */
const desat = (c, k) => {
  const l = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  return [mix(c[0], l, k), mix(c[1], l, k), mix(c[2], l, k)];
};

/* ------------------------------------------------------------------ */
/*  texture sets                                                       */
/* ------------------------------------------------------------------ */

export function asphaltSet(size = 1024) {
  const fbm = makeFBM(size, 7, 4, 11);
  const fine = makeFBM(size, 52, 3, 12);
  const micro = makeFBM(size, 132, 2, 18);   // ~4cm aggregate grain (tile ≈ 5m)
  const crackN = makeFBM(size, 8, 4, 13);
  const stainN = makeFBM(size, 3, 3, 14);
  const crackMask = makeFBM(size, 2, 2, 15);
  const bleachN = makeFBM(size, 2, 3, 16);   // 2-4m blotches (tile ≈ 5m)
  const sandN = makeFBM(size, 3, 4, 17);     // wind-blown sand-dust film

  const crackAt = (u, v) => {
    if (crackMask(u, v) < 0.52) return 0;        // cracks only in worn patches
    const w = crackN(u, v);
    const ridge = Math.abs(w - 0.5) * 2;         // 0 at "crack lines"
    return ridge < 0.014 ? (1 - ridge / 0.014) : 0;
  };

  const sandAt = (u, v) => clamp((sandN(u, v) - 0.5) * 2.4, 0, 1);

  const albedo = paint(size, (u, v) => {
    // Sun-baked desert asphalt, dropped another ~15% for round 7 (the
    // glancing ENE sun still clipped the ads-frame road to near-white) —
    // mid ~68-72 grey so lit road keeps albedo under a hot key + ACES
    const base = 61 + fbm(u, v) * 6 + fine(u, v) * 11;
    let r = base, g = base * 1.01, b = base * 1.02;
    // Bleach blotches at 2-4m scale (±9 value — pale patches bloom first
    // under glancing sun, so their amplitude is reined in)
    const blk = (bleachN(u, v) - 0.5) * 18;
    r += blk; g += blk; b += blk * 0.9;
    // Oil stains — rare, soft
    const st = stainN(u, v);
    if (st > 0.78) { const k = (st - 0.78) * 2.2; r *= 1 - k * 0.2; g *= 1 - k * 0.2; b *= 1 - k * 0.19; }
    // Cracks — dark hairlines
    const cr = crackAt(u, v);
    if (cr > 0) { r *= 1 - cr * 0.42; g *= 1 - cr * 0.42; b *= 1 - cr * 0.42; }
    // Aggregate: bright chip sparkle + dark micro pocks (close-range grain)
    if (fine(u * 2 % 1, v * 2 % 1) > 0.82) { r += 10; g += 10; b += 10; }
    const mg = micro(u, v);
    if (mg > 0.74) { const k = (mg - 0.74) * 3; r += k * 13; g += k * 13; b += k * 12; }
    else if (mg < 0.3) { const k = (0.3 - mg) * 2.4; r *= 1 - k * 0.16; g *= 1 - k * 0.16; b *= 1 - k * 0.16; }
    // Sand-dust film (~20% alpha where present, dust target darkened with
    // the base; map overlay concentrates an extra pass toward road edges)
    const sk = sandAt(u, v) * 0.2;
    r = mix(r, 134, sk); g = mix(g, 121, sk); b = mix(b, 101, sk);
    return [r, g, b];
  });

  const height = (u, v) =>
    fbm(u, v) * 0.18 + fine(u, v) * 0.5 + micro(u, v) * 0.34 - crackAt(u, v) * 0.45;
  const normal = normalFromHeight(size, height, 1.55);
  // Roughness floor ~0.85 with a tight spread: at grazing incidence the
  // old 0.72-floor map let the GGX lobe run a white streak up the whole
  // road when a camera faced the sun — matte floor kills the clip while
  // the ±14 ripple keeps micro sheen variation alive.
  const rough = paint(size, (u, v) => {
    const r = Math.max(218,
      228 + fine(u, v) * 16 + (micro(u, v) - 0.5) * 14
      - (stainN(u, v) > 0.78 ? 20 : 0) + sandAt(u, v) * 10);
    return [r, r, r];
  });
  return { albedo, normal, rough };
}

export function concreteSet(size = 1024, tint = [168, 160, 148]) {
  const fbm = makeFBM(size, 5, 5, 21);
  const fine = makeFBM(size, 40, 3, 22);
  const streak = makeFBM(size, 8, 2, 23);
  const albedo = paint(size, (u, v) => {
    const n = fbm(u, v) * 0.5 + fine(u, v) * 0.28;
    let [r, g, b] = mix3([tint[0] * 0.7, tint[1] * 0.7, tint[2] * 0.7], tint, n + 0.3);
    // Vertical weather streaks
    const s = streak(u, v * 0.15);
    if (s > 0.55) { const k = (s - 0.55) * 1.4 * clamp(v * 2, 0, 1); r *= 1 - k * 0.3; g *= 1 - k * 0.3; b *= 1 - k * 0.28; }
    return [r, g, b];
  });
  const normal = normalFromHeight(size, (u, v) => fbm(u, v) * 0.5 + fine(u, v) * 0.3, 1.4);
  const rough = paint(size, (u, v) => { const r = 205 + fine(u, v) * 30; return [r, r, r]; });
  return { albedo, normal, rough };
}

export function plasterSet(size = 1024, tint = [205, 186, 158], seed = 31) {
  const fbm = makeFBM(size, 4, 5, seed);
  const fine = makeFBM(size, 30, 3, seed + 1);
  const grime = makeFBM(size, 3, 3, seed + 2);
  const chip = makeFBM(size, 9, 4, seed + 3);

  const chipAt = (u, v) => {
    const c = chip(u, v);
    return c > 0.68 ? clamp((c - 0.68) * 6, 0, 1) : 0;
  };

  // Large aged repair-patch rectangles (±12% value, slight hue drift) —
  // macro variation that breaks flat plaster fields; per-building UV
  // offsets shuffle where they land on each facade
  const pr = makeRNG(seed + 7);
  const patches = [];
  const nPatch = 2 + (pr() < 0.5 ? 1 : 0);
  for (let i = 0; i < nPatch; i++) {
    patches.push({
      u0: 0.05 + pr() * 0.58, v0: 0.05 + pr() * 0.6,
      w: 0.14 + pr() * 0.26, h: 0.12 + pr() * 0.22,
      val: 0.88 + pr() * 0.24,
      hue: (pr() - 0.5) * 0.08,
    });
  }
  const patchAt = (u, v) => {
    for (const p of patches)
      if (u > p.u0 && u < p.u0 + p.w && v > p.v0 && v < p.v0 + p.h) return p;
    return null;
  };

  const albedo = paint(size, (u, v) => {
    let [r, g, b] = [tint[0], tint[1], tint[2]];
    const n = fbm(u, v);
    r *= 0.82 + n * 0.3; g *= 0.82 + n * 0.3; b *= 0.82 + n * 0.3;
    const pt = patchAt(u, v);
    if (pt) { r *= pt.val * (1 + pt.hue); g *= pt.val; b *= pt.val * (1 - pt.hue); }
    // grime from top streaking down + at bottom
    const gr = grime(u, v * 0.3) * (0.4 + v * 0.8);
    r *= 1 - gr * 0.32; g *= 1 - gr * 0.34; b *= 1 - gr * 0.36;
    // chipped plaster reveals grey/brown masonry underneath
    const ch = chipAt(u, v);
    if (ch > 0.15) { const uc = [126 + fine(u, v) * 30, 112 + fine(u, v) * 26, 96 + fine(u, v) * 22]; [r, g, b] = mix3([r, g, b], uc, Math.min(1, ch * 1.4)); }
    // fine speckle
    const f = fine(u, v);
    r += (f - 0.5) * 16; g += (f - 0.5) * 16; b += (f - 0.5) * 16;
    return [r, g, b];
  });
  const normal = normalFromHeight(size, (u, v) => fbm(u, v) * 0.4 + fine(u, v) * 0.22 - chipAt(u, v) * 0.7, 1.8);
  const rough = paint(size, (u, v) => { const r = 215 - chipAt(u, v) * 20 + fine(u, v) * 24; return [r, r, r]; });
  return { albedo, normal, rough };
}

export function brickSet(size = 1024, tint = [148, 92, 70]) {
  const fine = makeFBM(size, 34, 3, 41);
  const varN = makeFBM(size, 6, 3, 42);
  const smearN = makeFBM(size, 2, 2, 43); // large-scale render/plaster-smear patches
  const rows = 18, cols = 8;
  const brickAt = (u, v) => {
    const row = Math.floor(v * rows);
    const off = (row % 2) * 0.5;
    const bu = (u * cols + off) % 1;
    const bv = (v * rows) % 1;
    const mortarU = bu < 0.045 || bu > 0.955;
    const mortarV = bv < 0.09 || bv > 0.91;
    return { mortar: mortarU || mortarV, id: Math.floor(u * cols + off) + row * cols };
  };
  const smearAt = (u, v) => clamp((smearN(u, v) - 0.55) * 4, 0, 1);
  const albedo = paint(size, (u, v) => {
    const { mortar, id } = brickAt(u, v);
    const f = fine(u, v);
    let r, g, b;
    if (mortar) {
      const m = 148 + f * 26;
      r = m; g = m * 0.985; b = m * 0.95;
    } else {
      const idr = makeRNG(id * 7919 + 3);
      const shade = 0.75 + idr() * 0.42;
      r = tint[0] * shade; g = tint[1] * shade; b = tint[2] * shade;
      const n = varN(u, v);
      r *= 0.86 + n * 0.3; g *= 0.86 + n * 0.3; b *= 0.86 + n * 0.3;
      r += (f - 0.5) * 22; g += (f - 0.5) * 20; b += (f - 0.5) * 18;
    }
    // Patchy old plaster smears (~3-5m visual scale with per-building UV offsets)
    const sm = smearAt(u, v);
    if (sm > 0) {
      const p = [176 + (f - 0.5) * 26, 160 + (f - 0.5) * 24, 138 + (f - 0.5) * 22];
      [r, g, b] = mix3([r, g, b], p, sm * 0.9);
    }
    return [r, g, b];
  });
  const normal = normalFromHeight(size, (u, v) => {
    const { mortar } = brickAt(u, v);
    const base = (mortar ? 0.25 : 0.72) + fine(u, v) * 0.14;
    return mix(base, 0.6 + fine(u, v) * 0.1, smearAt(u, v)); // smears flatten the relief
  }, 2.6);
  const rough = paint(size, (u, v) => {
    const { mortar } = brickAt(u, v);
    const r = mix(mortar ? 235 : 205 + fine(u, v) * 26, 216, smearAt(u, v));
    return [r, r, r];
  });
  return { albedo, normal, rough };
}

export function dirtSet(size = 1024) {
  const fbm = makeFBM(size, 5, 5, 51);
  const fine = makeFBM(size, 44, 3, 52);
  const albedo = paint(size, (u, v) => {
    // ~8% darker (round 7): the shoulders/silt shared the road's glancing
    // sun blowout, so the whole ground family steps down together
    const n = fbm(u, v), f = fine(u, v);
    let r = 106 + n * 30 + (f - 0.5) * 24;
    let g = 87 + n * 30 + (f - 0.5) * 20;
    let b = 63 + n * 28 + (f - 0.5) * 17;
    if (f > 0.76) { r += 20; g += 18; b += 16; } // pebbles
    return [r, g, b];
  });
  const normal = normalFromHeight(size, (u, v) => fbm(u, v) * 0.6 + fine(u, v) * 0.35, 2.0);
  const rough = paint(size, () => [235, 235, 235]);
  return { albedo, normal, rough };
}

export function metalPaintedSet(size = 512, tint = [88, 106, 92], seed = 61) {
  const fbm = makeFBM(size, 6, 4, seed);
  const scratch = makeFBM(size, 24, 2, seed + 1);
  const albedo = paint(size, (u, v) => {
    const n = fbm(u, v);
    let r = tint[0] * (0.8 + n * 0.4), g = tint[1] * (0.8 + n * 0.4), b = tint[2] * (0.8 + n * 0.4);
    const sc = scratch(u * 3 % 1, v);
    if (sc > 0.8) { const k = (sc - 0.8) * 5; r = mix(r, 130, k); g = mix(g, 125, k); b = mix(b, 115, k); }
    // rust bloom at edges/noise
    if (n > 0.72) { const k = (n - 0.72) * 3; r = mix(r, 120, k); g = mix(g, 70, k); b = mix(b, 40, k); }
    return [r, g, b];
  });
  const normal = normalFromHeight(size, (u, v) => fbm(u, v) * 0.2, 0.8);
  const rough = paint(size, (u, v) => {
    const n = fbm(u, v);
    const r = 150 + n * 60 + (scratch(u * 3 % 1, v) > 0.8 ? -70 : 0);
    return [r, r, r];
  });
  return { albedo, normal, rough };
}

export function corrugatedSet(size = 512, tint = [126, 122, 116]) {
  const fbm = makeFBM(size, 5, 3, 71);
  const wavesAt = (u) => Math.sin(u * Math.PI * 2 * 14) * 0.5 + 0.5;
  const albedo = paint(size, (u, v) => {
    const w = wavesAt(u), n = fbm(u, v);
    let r = tint[0] * (0.7 + w * 0.34), g = tint[1] * (0.7 + w * 0.34), b = tint[2] * (0.7 + w * 0.34);
    if (n > 0.66) { const k = (n - 0.66) * 2.4; r = mix(r, 130, k); g = mix(g, 78, k); b = mix(b, 44, k); } // rust
    return [r, g, b];
  });
  const normal = normalFromHeight(size, (u, v) => wavesAt(u) * 0.8 + fbm(u, v) * 0.1, 2.6);
  const rough = paint(size, (u, v) => { const r = 130 + fbm(u, v) * 80; return [r, r, r]; });
  return { albedo, normal, rough };
}

/** Burlap for sandbags (round 7 rebake — the old 88-thread weave aliased
 *  into a smooth peanut at gameplay distance). Chunky plain weave with
 *  visible over/under checker + slub streaks, stitched seams down BOTH
 *  flanks, cinched tied-off ends with radial pucker folds, settling
 *  creases across the girth, and baked grime/bleach patches so bags stop
 *  reading identical (u wraps the girth, v runs the bag axis). */
export function burlapSet(size = 512, tint = [148, 132, 98], seed = 83) {
  const fbm = makeFBM(size, 5, 3, seed);
  const blotch = makeFBM(size, 2, 2, seed + 4);   // bag-scale grime/bleach
  const slub = makeFBM(size, 26, 2, seed + 9);    // thread thickness wobble
  const TU = 34, TV = 26;                          // threads around / along
  const weave = (u, v) => {
    const iu = Math.floor(u * TU), iv = Math.floor(v * TV);
    const fu = u * TU - iu, fv = v * TV - iv;
    const over = (iu + iv) % 2;                    // plain-weave checker
    const bump = Math.sin(fu * Math.PI) * Math.sin(fv * Math.PI);
    return (over ? 0.64 : 0.36) + (bump - 0.5) * 0.5;
  };
  const endK = (v) => { const e = Math.min(v, 1 - v); return e < 0.12 ? e / 0.12 : 1; };
  const albedo = paint(size, (u, v) => {
    const n = fbm(u, v), w = weave(u, v), sl = slub(u, v);
    let k = 0.6 + n * 0.28 + (w - 0.5) * 0.58 + (sl - 0.5) * 0.16;
    // grime / sun-bleach patches at near-bag scale
    const bl = blotch(u, v);
    if (bl > 0.58) k *= 1 - (bl - 0.58) * 1.05;
    else if (bl < 0.36) k *= 1 + (0.36 - bl) * 0.45;
    // stitched seam lines down both flanks (visible at any bag yaw)
    for (const su of [0.27, 0.77]) {
      const d = Math.abs(u - su);
      if (d < 0.012) k *= 0.58;
      else if (d < 0.028) k *= 0.86;
      if (d < 0.005 && (v * 46) % 1 < 0.55) k *= 0.74; // stitch dashes
    }
    // tied-off cinched ends: deep shade + radial pucker folds
    const e = endK(v);
    if (e < 1) {
      k *= 0.4 + e * 0.6;
      k *= 1 - (1 - e) * 0.32 * (Math.sin(u * Math.PI * 2 * 9) * 0.5 + 0.5);
    }
    // fill-settling crease shadows running across the girth
    const crease = Math.sin(v * Math.PI * 2 * 3.1 + n * 5.2);
    if (crease > 0.84) k *= 1 - (crease - 0.84) * 1.5;
    return [tint[0] * k, tint[1] * k, tint[2] * k * 0.97];
  });
  const normal = normalFromHeight(size, (u, v) => {
    const e = endK(v);
    let h = weave(u, v) * 0.6 + fbm(u, v) * 0.18;
    h += (1 - e) * (Math.sin(u * Math.PI * 2 * 9) * 0.5 + 0.5) * 0.5; // end puckers
    if (Math.abs(u - 0.27) < 0.012 || Math.abs(u - 0.77) < 0.012) h -= 0.3;
    return h;
  }, 2.4);
  const rough = paint(size, (u, v) => {
    const r = 226 + (weave(u, v) - 0.5) * 32 + fbm(u, v) * 12;
    return [r, r, r];
  });
  return { albedo, normal, rough };
}

export function fabricSet(size = 512, tint = [120, 112, 88], seed = 81) {
  const fbm = makeFBM(size, 8, 4, seed);
  const weave = (u, v) => ((Math.sin(u * Math.PI * 2 * 90) * Math.sin(v * Math.PI * 2 * 90)) * 0.5 + 0.5);
  const albedo = paint(size, (u, v) => {
    const n = fbm(u, v), w = weave(u, v);
    const k = 0.78 + n * 0.34 + (w - 0.5) * 0.12;
    return [tint[0] * k, tint[1] * k, tint[2] * k];
  });
  const normal = normalFromHeight(size, (u, v) => weave(u, v) * 0.16 + fbm(u, v) * 0.3, 1.2);
  const rough = paint(size, () => [242, 242, 242]);
  return { albedo, normal, rough };
}

export function camoSet(size = 512, palette = [[142, 130, 102], [112, 102, 78], [162, 148, 118], [88, 80, 62]]) {
  const n1 = makeFBM(size, 5, 3, 91);
  const n2 = makeFBM(size, 9, 3, 92);
  const albedo = paint(size, (u, v) => {
    const a = n1(u, v), b = n2(u, v);
    const idx = (a > 0.55 ? 2 : a > 0.42 ? 0 : 1);
    const c = b > 0.62 ? palette[3] : palette[idx];
    const f = (n2(v, u) - 0.5) * 14;
    return [c[0] + f, c[1] + f, c[2] + f];
  });
  const normal = normalFromHeight(size, (u, v) => n2(u, v) * 0.15, 0.7);
  const rough = paint(size, () => [235, 235, 235]);
  return { albedo, normal, rough };
}

export function woodSet(size = 512, tint = [136, 100, 66]) {
  const grain = makeFBM(size, 3, 4, 101);
  const fine = makeFBM(size, 30, 2, 102);
  const albedo = paint(size, (u, v) => {
    const g = grain(u * 0.15, v);
    const rings = Math.sin((g * 6 + v * 18) * Math.PI) * 0.5 + 0.5;
    const k = 0.68 + rings * 0.3 + (fine(u, v) - 0.5) * 0.16;
    // plank separations
    const plank = (v * 6) % 1;
    const gap = plank < 0.03 || plank > 0.97 ? 0.55 : 1;
    return [tint[0] * k * gap, tint[1] * k * gap, tint[2] * k * gap];
  });
  const normal = normalFromHeight(size, (u, v) => {
    const plank = (v * 6) % 1;
    const gap = plank < 0.03 || plank > 0.97 ? 0 : 0.6;
    return gap + fine(u, v) * 0.15;
  }, 1.8);
  const rough = paint(size, () => [225, 225, 225]);
  return { albedo, normal, rough };
}

/* ------------------------------------------------------------------ */
/*  sprites (particles, decals, flashes)                               */
/* ------------------------------------------------------------------ */

/** Soft smoke puff with fbm-broken silhouette. */
export function smokeSprite(size = 128, seed = 7) {
  const fbm = makeFBM(size, 5, 4, seed);
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size - 0.5, v = y / size - 0.5;
      const r = Math.sqrt(u * u + v * v) * 2;
      const n = fbm(x / size, y / size);
      let a = clamp(1 - r - (n - 0.5) * 0.8, 0, 1);
      a = a * a * 1.4;
      const i = (y * size + x) * 4;
      const lum = 200 + n * 55;
      d[i] = lum; d[i + 1] = lum; d[i + 2] = lum;
      d[i + 3] = clamp(a, 0, 1) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Hot fireball sprite (white core → orange → transparent). */
export function fireSprite(size = 128, seed = 9) {
  const fbm = makeFBM(size, 6, 4, seed);
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size - 0.5, v = y / size - 0.5;
      const r = Math.sqrt(u * u + v * v) * 2;
      const n = fbm(x / size, y / size);
      const edge = clamp(1 - r - (n - 0.5) * 0.7, 0, 1);
      const heat = Math.pow(edge, 1.6);
      const i = (y * size + x) * 4;
      d[i] = 255;
      d[i + 1] = clamp(90 + heat * 200, 0, 255);
      d[i + 2] = clamp(heat * 190 - 60, 0, 255);
      d[i + 3] = clamp(edge * 1.8, 0, 1) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Muzzle flash star. */
export function muzzleSprite(size = 128) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const cx = size / 2;
  const grd = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grd.addColorStop(0, 'rgba(255,255,240,1)');
  grd.addColorStop(0.25, 'rgba(255,220,130,0.95)');
  grd.addColorStop(0.55, 'rgba(255,150,40,0.4)');
  grd.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  // Star spikes
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(cx, cx);
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3 + rng() * 0.4);
    const len = size * (0.3 + rng() * 0.22);
    const g2 = ctx.createLinearGradient(0, 0, len, 0);
    g2.addColorStop(0, 'rgba(255,240,190,0.95)');
    g2.addColorStop(1, 'rgba(255,140,30,0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.02);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, size * 0.02);
    ctx.fill();
  }
  return c;
}

/** Bullet-hole decal. */
export function bulletHoleSprite(size = 64) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const cx = size / 2;
  const grd = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grd.addColorStop(0, 'rgba(12,10,8,0.95)');
  grd.addColorStop(0.3, 'rgba(28,24,20,0.8)');
  grd.addColorStop(0.62, 'rgba(60,54,46,0.35)');
  grd.addColorStop(1, 'rgba(80,72,60,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  // Chips
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2, r = size * (0.18 + rng() * 0.2);
    ctx.fillStyle = `rgba(20,18,14,${0.5 + rng() * 0.4})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cx + Math.sin(a) * r, 1 + rng() * 2.4, 0, 7);
    ctx.fill();
  }
  return c;
}

/** Scorch decal for explosions. */
export function scorchSprite(size = 256) {
  const fbm = makeFBM(size, 6, 4, 999);
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size - 0.5, v = y / size - 0.5;
      const r = Math.sqrt(u * u + v * v) * 2;
      const n = fbm(x / size, y / size);
      const a = clamp(1 - r * (0.85 + n * 0.5), 0, 1);
      const i = (y * size + x) * 4;
      const lum = 14 + n * 22;
      d[i] = lum; d[i + 1] = lum * 0.92; d[i + 2] = lum * 0.82;
      d[i + 3] = Math.pow(a, 0.8) * 235;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Spark streak sprite. */
export function sparkSprite(size = 64) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const grd = ctx.createLinearGradient(0, size / 2, size, size / 2);
  grd.addColorStop(0, 'rgba(255,255,230,0)');
  grd.addColorStop(0.5, 'rgba(255,230,150,1)');
  grd.addColorStop(1, 'rgba(255,160,40,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, size * 0.44, size, size * 0.12);
  return c;
}

/* ------------------------------------------------------------------ */
/*  material library                                                   */
/* ------------------------------------------------------------------ */

let LIB = null;

/** Clone a material with independent texture repeats (shares canvas sources). */
export function matWithRepeat(base, rx, ry) {
  const m = base.clone();
  for (const key of ['map', 'normalMap', 'roughnessMap']) {
    if (base[key]) {
      const t = base[key].clone();
      t.repeat.set(rx, ry);
      t.needsUpdate = true;
      m[key] = t;
    }
  }
  return m;
}

/**
 * Rescale BoxGeometry UVs to world units so every wall piece shares one
 * texture scale (fixes per-box UV stretch). ku/kv = tiles per meter.
 */
export function scaleBoxUVs(geo, sx, sy, sz, ku, kv = ku) {
  const uv = geo.attributes.uv;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const dims = [
    [sz, sy], [sz, sy],
    [sx, sz], [sx, sz],
    [sx, sy], [sx, sy],
  ];
  for (let f = 0; f < 6; f++) {
    const [du, dv] = dims[f];
    for (let i = f * 4; i < f * 4 + 4; i++) {
      uv.setXY(i, uv.getX(i) * du * ku, uv.getY(i) * dv * kv);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

/** World-Y darkening gradient: grounds walls with grime toward the base. */
export function addWallGradient(mat, low = 0.58, upTo = 2.6) {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vWallY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWallY = (modelMatrix * vec4(position, 1.0)).y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vWallY;')
      .replace('#include <map_fragment>', `#include <map_fragment>\ndiffuseColor.rgb *= mix(${low.toFixed(2)}, 1.0, smoothstep(0.0, ${upTo.toFixed(2)}, vWallY));`);
  };
  return mat;
}

export function getMaterialLib() {
  if (LIB) return LIB;
  const std = (set, { rough = 1, metal = 0, repeat = [1, 1], color = 0xffffff, normalScale = 1, env = 1 } = {}) => {
    const m = new THREE.MeshStandardMaterial({
      map: tex(set.albedo, { srgb: true, repeat }),
      normalMap: tex(set.normal, { repeat }),
      roughnessMap: set.rough ? tex(set.rough, { repeat }) : null,
      roughness: rough,
      metalness: metal,
      color,
    });
    m.normalScale.set(normalScale, normalScale);
    m.envMapIntensity = env;
    return m;
  };

  // Palettes pre-desaturated toward Taraq's chalky sun-bleached range:
  // global ~10% pull, the terracotta pair (ochre/rose, the right-hand row
  // in the vista) a heavier 22-25% so they stop reading toy-orange.
  const asphalt = asphaltSet();
  const conc = concreteSet();
  const concDark = concreteSet(1024, [128, 122, 112]);
  const plasterSand = plasterSet(1024, desat([199, 179, 147], 0.12), 31);
  const plasterWhite = plasterSet(1024, desat([214, 206, 190], 0.1), 131);
  const plasterOchre = plasterSet(1024, desat([185, 152, 112], 0.25), 231);
  const plasterRose = plasterSet(1024, desat([176, 141, 118], 0.22), 331);
  const brick = brickSet(1024, desat([148, 92, 70], 0.15));
  const dirt = dirtSet();
  const metalGreen = metalPaintedSet(512, [80, 96, 84], 61);
  const metalBlue = metalPaintedSet(512, [70, 88, 106], 161);
  const metalWhite = metalPaintedSet(512, [168, 168, 162], 261);
  const metalRed = metalPaintedSet(512, [128, 62, 48], 361);
  const corr = corrugatedSet();
  const sandbag = burlapSet(512, [148, 132, 98], 83);
  const tarp = fabricSet(512, [110, 118, 96], 181);
  const camo = camoSet();
  const wood = woodSet();
  const woodStall = woodSet(512, [90, 70, 48]); // sun-scorched dark stall lumber

  LIB = {
    // env clamped low so grazing sky reflection can't stack on the sun's
    // forward-scatter and clip the road to white in the ads sightline
    asphalt: std(asphalt, { repeat: [1, 1], normalScale: 1.45, env: 0.3 }),
    concrete: std(conc, { repeat: [6, 6] }),
    concreteDark: std(concDark, { repeat: [1, 1] }),
    sidewalk: std(conc, { repeat: [1, 1], color: 0xd6cec0 }), // ~120 cream, distinct from asphalt
    plasterSand: addWallGradient(std(plasterSand, { repeat: [1, 1] })),
    plasterWhite: addWallGradient(std(plasterWhite, { repeat: [1, 1] })),
    plasterOchre: addWallGradient(std(plasterOchre, { repeat: [1, 1] })),
    plasterRose: addWallGradient(std(plasterRose, { repeat: [1, 1] })),
    brick: addWallGradient(std(brick, { repeat: [1, 1] })),
    dirt: std(dirt, { repeat: [1, 1], normalScale: 1.4 }),
    metalGreen: std(metalGreen, { rough: 0.7, metal: 0.35 }),
    metalBlue: std(metalBlue, { rough: 0.65, metal: 0.35 }),
    metalWhite: std(metalWhite, { rough: 0.6, metal: 0.3 }),
    metalRed: std(metalRed, { rough: 0.7, metal: 0.35 }),
    corrugated: std(corr, { rough: 0.62, metal: 0.55, repeat: [2, 1] }),
    sandbag: std(sandbag, { repeat: [1, 1] }), // burlap UVs are per-bag
    tarp: std(tarp, { repeat: [3, 3] }),
    camo: std(camo),
    wood: std(wood, { repeat: [1.6, 1.6] }),
    woodDark: std(wood, { repeat: [1.6, 1.6], color: 0x86776a }),
    woodStall: std(woodStall, { repeat: [1.6, 1.6] }),

    gunMetal: new THREE.MeshStandardMaterial({ color: 0x3d4145, roughness: 0.36, metalness: 0.88, envMapIntensity: 1.4 }),
    gunPolymer: new THREE.MeshStandardMaterial({ color: 0x2e3134, roughness: 0.6, metalness: 0.15 }),
    gunTan: new THREE.MeshStandardMaterial({ color: 0x8a7a5c, roughness: 0.6, metalness: 0.25 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc8a24a, roughness: 0.32, metalness: 0.95 }),
    glassDark: new THREE.MeshStandardMaterial({ color: 0x131c22, roughness: 0.08, metalness: 0.9, envMapIntensity: 3.0 }),
    // Building panes: sky-blue tinted, env-mapped and semi-transparent so
    // the dark interior plane 0.3m behind reads through (fake parallax)
    // while the surface still catches a sky reflection instead of reading
    // as a matte black hole. Roughness spread 0.08-0.26 per pane.
    glassWindow: new THREE.MeshStandardMaterial({
      color: 0xa4bcca, roughness: 0.08, metalness: 0.75, envMapIntensity: 2.4,
      transparent: true, opacity: 0.5, depthWrite: false,
    }),
    glassWindow2: new THREE.MeshStandardMaterial({
      color: 0x8ea6b4, roughness: 0.16, metalness: 0.7, envMapIntensity: 1.9,
      transparent: true, opacity: 0.56, depthWrite: false,
    }),
    glassWindow3: new THREE.MeshStandardMaterial({
      color: 0x7c929e, roughness: 0.26, metalness: 0.65, envMapIntensity: 1.5,
      transparent: true, opacity: 0.62, depthWrite: false,
    }),
    tire: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0 }),
    darkInterior: new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0x8a6248, roughness: 0.85 }),
    charred: new THREE.MeshStandardMaterial({ color: 0x181614, roughness: 0.95 }),
    rubble: std(conc, { repeat: [2, 2], color: 0xb8ac9c }),
  };
  return LIB;
}

export { tex, canvas };
