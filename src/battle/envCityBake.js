// CPU bakes for the Coruscant surface. Two RGBA8 maps, both plain typed arrays (no DOM) so the bake can
// be timed and tuned in Node:
//  - base (equirect, 2048x1024): smooth *fields*, not colours. R district density, G water field
//    (0.5 = coastline), B mood (dark-district / tint variation), A thin cloud cover. Everything sharp
//    (arterial networks, rings, hubs, capillaries, pin lights) is computed in the fragment shader so it
//    stays crisp at every camera range; this map only says where the city is dense, dark or wet.
//  - detail (tileable, 1024x1024): R capillary street network, G pin-point lights, B block texture,
//    A second set of pin lights (sampled at another scale / rotation so the tiling never lines up).
import { mulberry32 } from "../textures.js";

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (t) => t * t * (3 - 2 * t);

// Tileable value noise on an integer lattice with a precomputed hash table: ~4x faster than the
// generic vnoise for the millions of samples a planet needs.
// fx x fy cells: an equirect map wants twice as many cells in u as in v so the noise is isotropic on
// the sphere without repeating around it.
function makeLattice(fx, fy, seed) {
  const rand = mulberry32(seed);
  const v = new Float32Array(fx * fy);
  for (let i = 0; i < v.length; i++) v[i] = rand();
  return { fx, fy, v };
}
function sampleLattice(L, u, v) {
  const fx = L.fx;
  const fy = L.fy;
  const x = u * fx;
  const y = v * fy;
  let xi = Math.floor(x);
  let yi = Math.floor(y);
  const sx = smooth(x - xi);
  const sy = smooth(y - yi);
  xi = ((xi % fx) + fx) % fx;
  yi = ((yi % fy) + fy) % fy;
  const xj = (xi + 1) % fx;
  const yj = (yi + 1) % fy;
  const t = L.v;
  const a = t[yi * fx + xi];
  const b = t[yi * fx + xj];
  const c = t[yj * fx + xi];
  const d = t[yj * fx + xj];
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}
// fbm over lattices; freq doubles per octave
function makeFbm(freq, octaves, gain, seed, aspect = 1) {
  const layers = [];
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const f = freq << o;
    layers.push({ L: makeLattice(f * aspect, f, seed + o * 31), amp });
    norm += amp;
    amp *= gain;
  }
  return (u, v) => {
    let s = 0;
    for (const l of layers) s += sampleLattice(l.L, u, v) * l.amp;
    return s / norm;
  };
}

// Exact distance to the nearest Voronoi edge on a tileable jittered grid (feature points precomputed):
// nearest point first, then the distance to every bisector with the neighbours. No F2-F1 wedges.
function makeWorley(freq, seed) {
  const rand = mulberry32(seed);
  const pts = new Float32Array(freq * freq * 2);
  for (let i = 0; i < pts.length; i++) pts[i] = rand();
  return (u, v) => {
    const x = u * freq;
    const y = v * freq;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let f1 = 10;
    let mx = 0;
    let my = 0;
    for (let j = -1; j <= 1; j++) {
      const cy = (((yi + j) % freq) + freq) % freq;
      for (let i = -1; i <= 1; i++) {
        const cx = (((xi + i) % freq) + freq) % freq;
        const k = (cy * freq + cx) * 2;
        const dx = xi + i + pts[k] - x;
        const dy = yi + j + pts[k + 1] - y;
        const d = dx * dx + dy * dy;
        if (d < f1) {
          f1 = d;
          mx = dx;
          my = dy;
        }
      }
    }
    let edge = 10;
    for (let j = -2; j <= 2; j++) {
      const cy = (((yi + j) % freq) + freq) % freq;
      for (let i = -2; i <= 2; i++) {
        const cx = (((xi + i) % freq) + freq) % freq;
        const k = (cy * freq + cx) * 2;
        const dx = xi + i + pts[k] - x;
        const dy = yi + j + pts[k + 1] - y;
        const ex = dx - mx;
        const ey = dy - my;
        const l = ex * ex + ey * ey;
        if (l < 1e-6) continue;
        const inv = 1 / Math.sqrt(l);
        const d = (0.5 * (mx + dx) * ex + 0.5 * (my + dy) * ey) * inv;
        if (d < edge) edge = d;
      }
    }
    return edge;
  };
}

export function bakeBaseFields(w = 2048, h = 1024, seed = 501) {
  const out = new Uint8Array(w * h * 4);
  // fields are smooth: evaluate at half resolution and bilinearly upsample, adding one full-res octave
  const hw = w >> 1;
  const hh = h >> 1;
  const density = makeFbm(3, 5, 0.55, seed + 7, 2);
  const dark = makeFbm(9, 3, 0.5, seed + 3, 2);
  const water = makeFbm(3, 5, 0.5, seed + 11, 2);
  const mood = makeFbm(2, 3, 0.55, seed + 17, 2);
  const cloud = makeFbm(4, 4, 0.5, seed + 23, 2);
  const cloudFine = makeFbm(12, 2, 0.5, seed + 29, 2);
  const low = new Float32Array(hw * hh * 4);
  for (let y = 0; y < hh; y++) {
    const v = (y + 0.5) / hh;
    const lat = Math.abs(v - 0.5) * 2;
    // polar caps a little quieter (never in view from the battle, but keeps the limb honest)
    const polar = 1 - 0.35 * smooth(clamp01((lat - 0.7) / 0.3));
    for (let x = 0; x < hw; x++) {
      const u = (x + 0.5) / hw;
      const d = density(u, v);
      // whole planet is city: density modulates glow 0.3..1 with broad bright provinces
      let dens = clamp01(0.72 + (d - 0.5) * 2.4);
      const dk = dark(u, v);
      // occasional dark "shadow" districts (industrial / blackout zones)
      const darkK = smooth(clamp01((dk - 0.66) / 0.07));
      dens *= 1 - 0.75 * darkK;
      dens *= polar;
      // rare water / park patches: a smooth field centred on 0.5 at the coast (shader sharpens it)
      const wf = water(u, v);
      const waterF = clamp01(0.5 + (wf - 0.72) * 7);
      const md = mood(u, v);
      const c1 = cloud(u, v);
      const c2 = cloudFine(u, v);
      const cl = clamp01((c1 - 0.56) * 4.5) * (0.35 + 0.65 * c2);
      const i = (y * hw + x) * 4;
      low[i] = dens;
      low[i + 1] = waterF;
      low[i + 2] = md;
      low[i + 3] = cl;
    }
  }
  const fine = makeLattice(512, 256, seed + 41);
  for (let y = 0; y < h; y++) {
    const fy = ((y + 0.5) / h) * hh - 0.5;
    let y0 = Math.floor(fy);
    const ty = fy - y0;
    y0 = Math.max(0, y0);
    const y1 = Math.min(hh - 1, y0 + 1);
    const v = (y + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const fx = ((x + 0.5) / w) * hw - 0.5;
      const x0 = Math.floor(fx);
      const tx = fx - x0;
      const xa = ((x0 % hw) + hw) % hw;
      const xb = (xa + 1) % hw;
      const u = (x + 0.5) / w;
      const n = sampleLattice(fine, u, v) - 0.5;
      const i00 = (y0 * hw + xa) * 4;
      const i01 = (y0 * hw + xb) * 4;
      const i10 = (y1 * hw + xa) * 4;
      const i11 = (y1 * hw + xb) * 4;
      const o = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        const a = low[i00 + c] + (low[i01 + c] - low[i00 + c]) * tx;
        const b = low[i10 + c] + (low[i11 + c] - low[i10 + c]) * tx;
        let s = a + (b - a) * ty;
        // one octave of full-res texture so coasts, clouds and density have 5 km variation
        if (c === 0) s += n * 0.08;
        else if (c === 1) s += n * 0.06;
        else if (c === 3) s *= 0.8 + n * 0.8;
        out[o + c] = clamp01(s) * 255;
      }
    }
  }
  return out;
}

export function bakeDetail(size = 1024, seed = 733) {
  const out = new Uint8Array(size * size * 4);
  const rand = mulberry32(seed);
  const streets = makeWorley(40, seed + 1);
  const blocks = makeWorley(120, seed + 2);
  const blockNoise = makeFbm(8, 2, 0.5, seed + 3);
  const streetVar = makeFbm(6, 2, 0.5, seed + 5);
  const inv = 1 / size;
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) * inv;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) * inv;
      const e1 = streets(u, v); // cell ~25 texels
      const e2 = blocks(u, v); // cell ~8.5 texels
      const sv = streetVar(u, v);
      // lines one texel wide; the coarser network brighter, both modulated along their length
      const s1 = clamp01(1 - e1 / 0.05) * (0.55 + 0.45 * sv);
      const s2 =
        clamp01(1 - e2 / 0.14) *
        0.45 *
        (0.4 + 0.6 * clamp01((sv - 0.35) * 2.5));
      const street = clamp01(s1 + s2);
      const bn = blockNoise(u, v);
      const i = (y * size + x) * 4;
      out[i] = street * 255;
      out[i + 1] = 0;
      out[i + 2] = clamp01(0.15 + bn * 0.85) * 255;
      out[i + 3] = 0;
    }
  }
  // pin-point lights: two independent sets (G and A). Larger points read as single pixels from the
  // battle altitude; the small ones mip into the lace.
  const put = (ch, px, py, r, k) => {
    for (let dy = 0; dy < r; dy++) {
      const yy = (py + dy) % size;
      for (let dx = 0; dx < r; dx++) {
        const xx = (px + dx) % size;
        const i = (yy * size + xx) * 4 + ch;
        out[i] = Math.max(out[i], k * 255);
      }
    }
  };
  const cluster = makeFbm(5, 2, 0.5, seed + 9);
  for (const ch of [1, 3]) {
    let n = 0;
    while (n < 3200) {
      const u = rand();
      const v = rand();
      if (rand() > cluster(u, v) * 1.6) continue; // cluster toward brighter districts
      put(
        ch,
        Math.floor(u * size),
        Math.floor(v * size),
        2,
        0.55 + rand() * 0.45,
      );
      n++;
    }
    for (let k = 0; k < 9000; k++) {
      put(
        ch,
        Math.floor(rand() * size),
        Math.floor(rand() * size),
        1,
        0.3 + rand() * 0.6,
      );
    }
  }
  return out;
}
