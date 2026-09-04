// Procedural exterior textures: light-grey armour plating with panel seams, rivet rows, paint variation,
// soot streaks and heat discolouration. Tileable; one tile is meant to cover about 24 m of hull.
import * as THREE from "three";
import { TexGen, mulberry32, vnoise, vnoise2, fbm, makeCanvas, toTexture } from "../textures.js";

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

// Recursive split of the unit square into plates (min size ~1/9 of the tile), tileable because the
// splits are applied on a torus (the same cut list wraps).
function platePartition(rand, depth = 4) {
  let rects = [{ u0: 0, v0: 0, u1: 1, v1: 1 }];
  for (let d = 0; d < depth; d++) {
    const next = [];
    for (const r of rects) {
      const w = r.u1 - r.u0;
      const h = r.v1 - r.v0;
      if (Math.max(w, h) < 0.16 || rand() < 0.12) {
        next.push(r);
        continue;
      }
      const t = 0.3 + rand() * 0.4;
      if (w >= h) next.push({ ...r, u1: r.u0 + w * t }, { ...r, u0: r.u0 + w * t });
      else next.push({ ...r, v1: r.v0 + h * t }, { ...r, v0: r.v0 + h * t });
    }
    rects = next;
  }
  return rects;
}

export function makeHullPlating(size = 1024, seed = 301) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const plates = platePartition(rand, 5);
  // per-plate paint offsets and wear seeds
  const meta = plates.map(() => ({ tone: 1 + (rand() - 0.5) * 0.09, rough: (rand() - 0.5) * 0.14, soot: rand() < 0.18 ? rand() : 0, rivets: rand() < 0.55 }));
  // lookup: plate index per texel (brute force over ~100 rects is fine at build time once)
  const seam = 0.006; // half seam width in tile units
  t.each((u, v, i) => {
    let pi = -1;
    let ed = 1;
    for (let k = 0; k < plates.length; k++) {
      const r = plates[k];
      if (u >= r.u0 && u < r.u1 && v >= r.v0 && v < r.v1) {
        pi = k;
        ed = Math.min(u - r.u0, r.u1 - u, v - r.v0, r.v1 - v);
        break;
      }
    }
    const m = pi >= 0 ? meta[pi] : meta[0];
    // base: light warm-grey paint with fine grain and a slow blotchy variation
    const grain = fbm(u, v, { octaves: 4, freq: 48, gain: 0.5, seed: seed + 3 });
    const blotch = vnoise(u, v, 3, seed + 5);
    let lum = 0.58 * m.tone + (grain - 0.5) * 0.05 + (blotch - 0.5) * 0.06;
    let rough = 0.66 + m.rough + (grain - 0.5) * 0.2;
    let hgt = 0.5;
    // seams: dark groove with a soft bevel
    const inSeam = ed < seam;
    const bevel = clamp01((ed - seam) / (seam * 2.5));
    if (inSeam) {
      lum *= 0.42;
      rough = 0.8;
      hgt = 0.34;
    } else {
      hgt = 0.5 - (1 - smooth(bevel)) * 0.12;
      lum *= 0.92 + 0.08 * smooth(bevel);
    }
    // rivet rows just inside the plate edge
    if (m.rivets && !inSeam) {
      const rp = 0.028; // rivet pitch
      const inset = seam + 0.012;
      const r = plates[pi];
      const nearU = Math.min(Math.abs(u - r.u0 - inset), Math.abs(r.u1 - inset - u));
      const nearV = Math.min(Math.abs(v - r.v0 - inset), Math.abs(r.v1 - inset - v));
      const onRowU = nearU < 0.0035;
      const onRowV = nearV < 0.0035;
      if (onRowU || onRowV) {
        const along = onRowU ? v : u;
        const ph = (along / rp) % 1;
        const dd = Math.abs(ph - 0.5) * rp;
        if (dd < 0.0032) {
          hgt += 0.16 * (1 - dd / 0.0032);
          lum *= 0.9;
          rough -= 0.15;
        }
      }
    }
    // streaky soot / grime running along v (exhaust direction), stronger on flagged plates
    const streak = vnoise2(u, v, 90, 9, seed + 7);
    const grime = clamp01((streak - 0.55) * 2.2) * (0.25 + m.soot * 0.75);
    lum *= 1 - grime * 0.35;
    rough += grime * 0.2;
    // scratches: thin bright lines
    const sc = vnoise2(u, v, 400, 6, seed + 11);
    if (sc > 0.93) {
      lum *= 1.12;
      rough -= 0.2;
    }
    // faint cool tint (grey-blue) in the paint, warmer where heat-stained
    const heat = m.soot > 0.7 ? clamp01((streak - 0.45) * 1.5) * 0.35 : 0;
    const r = lum * (1.0 + heat * 0.25);
    const g = lum * (1.0 + heat * 0.05);
    const b = lum * (1.03 - heat * 0.25);
    t.setColor(i, clamp01(r), clamp01(g), clamp01(b));
    t.rough[i] = clamp01(rough);
    t.metal[i] = 0.08 + grime * 0.05;
    t.height[i] = clamp01(hgt);
  });
  const set = t.bake({ normalStrength: 3.5 });
  set.metalnessMap = set.roughnessMap;
  return set;
}

// Dark trench / machinery texture: near-black panels with pipe rows, vents and tiny lit windows.
export function makeTrenchDetail(size = 512, seed = 351) {
  const t = new TexGen(size, size);
  t.each((u, v, i) => {
    const bands = vnoise2(u, v, 3, 60, seed);
    const cells = vnoise(u, v, 24, seed + 2);
    const n = fbm(u, v, { octaves: 3, freq: 16, gain: 0.5, seed: seed + 4 });
    let lum = 0.16 + (n - 0.5) * 0.1;
    let hgt = 0.5;
    if (bands > 0.62) {
      lum *= 0.7;
      hgt = 0.6;
    }
    if (cells > 0.72) {
      lum *= 0.55;
      hgt = 0.38;
    }
    t.setColor(i, lum, lum * 1.02, lum * 1.08);
    t.rough[i] = 0.7 + (n - 0.5) * 0.2;
    t.metal[i] = 0.3;
    t.height[i] = hgt;
  });
  const set = t.bake({ normalStrength: 3.0 });
  set.metalnessMap = set.roughnessMap;
  return set;
}

// Emissive window pattern for the superstructure faces: rows of small lit rectangles, most on, some off.
export function makeWindowStrips(w = 512, h = 128, seed = 401, pitch = 8, rows = 4) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  const rowH = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let x = 2; x < w - 2; x += pitch) {
      if (rand() < 0.22) continue;
      const warm = rand() < 0.15;
      const a = 0.55 + rand() * 0.45;
      ctx.fillStyle = warm ? `rgba(255,214,160,${a})` : `rgba(200,225,255,${a})`;
      ctx.fillRect(x, r * rowH + rowH * 0.36, pitch * 0.45, rowH * 0.28);
    }
  }
  const tex = toTexture(c, { srgb: true });
  tex.repeat.set(1, 1);
  return tex;
}

export { THREE };
