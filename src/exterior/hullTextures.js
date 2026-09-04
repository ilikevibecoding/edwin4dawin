// Procedural exterior textures. Everything is generated once at start-up from seeded noise:
//  - makeHullPlating   light warm-grey armour plating, 24 m tile (macro seams, rivets, paint patches, soot)
//  - makeHullDetail    fine 3.5 m tile blended on top in the hull shader so close range stays crisp
//  - makeMachinery     dark equipment panels with pipes, conduits, louvres and boxes (trench, stern, ducts)
//  - makeWindowStrips  cut-out rows of lit windows (2.5 m pitch when tiled as intended)
//  - makeDetailAtlas   one 1024 atlas of small stamps: hatches, vents, pads, bays, doors, lights
import * as THREE from "three";
import { TexGen, mulberry32, vnoise, vnoise2, fbm, worley, makeCanvas, toTexture } from "../textures.js";

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

// Recursive split of the unit square into plates. The cut list wraps on the torus so the tile stays
// seamless: the outer rectangle is the whole tile and every cut is strictly inside it.
function platePartition(rand, depth = 4, minSize = 0.16, keep = 0.12) {
  let rects = [{ u0: 0, v0: 0, u1: 1, v1: 1 }];
  for (let d = 0; d < depth; d++) {
    const next = [];
    for (const r of rects) {
      const w = r.u1 - r.u0;
      const h = r.v1 - r.v0;
      if (Math.max(w, h) < minSize || (d > 1 && rand() < keep)) {
        next.push(r);
        continue;
      }
      const t = 0.3 + rand() * 0.4;
      if (w >= h * 1.15 || (Math.abs(w - h) < h * 0.15 && rand() < 0.5)) next.push({ ...r, u1: r.u0 + w * t }, { ...r, u0: r.u0 + w * t });
      else next.push({ ...r, v1: r.v0 + h * t }, { ...r, v0: r.v0 + h * t });
    }
    rects = next;
  }
  return rects;
}

// Per-texel plate lookup accelerated with a coarse grid of candidate lists.
function plateIndex(plates, cells = 32) {
  const grid = [];
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const u0 = i / cells;
      const v0 = j / cells;
      const u1 = u0 + 1 / cells;
      const v1 = v0 + 1 / cells;
      const list = [];
      for (let k = 0; k < plates.length; k++) {
        const r = plates[k];
        if (r.u1 > u0 && r.u0 < u1 && r.v1 > v0 && r.v0 < v1) list.push(k);
      }
      grid.push(list);
    }
  }
  return (u, v) => {
    const i = Math.min(cells - 1, Math.floor(u * cells));
    const j = Math.min(cells - 1, Math.floor(v * cells));
    const list = grid[j * cells + i];
    for (const k of list) {
      const r = plates[k];
      if (u >= r.u0 && u < r.u1 && v >= r.v0 && v < r.v1) return k;
    }
    return 0;
  };
}

export function makeHullPlating(size = 1024, seed = 301) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const plates = platePartition(rand, 5, 0.14, 0.1);
  const lookup = plateIndex(plates);
  const meta = plates.map(() => ({
    tone: 1 + (rand() - 0.5) * 0.2,
    warm: (rand() - 0.5) * 0.034,
    rough: (rand() - 0.5) * 0.16,
    soot: rand() < 0.14 ? 0.4 + rand() * 0.6 : 0,
    rivets: rand() < 0.5,
    bolts: rand() < 0.65,
    hatch: rand() < 0.13,
    vent: rand() < 0.09,
    grooves: rand() < 0.1,
  }));
  // repaint patches: rectangles that ignore the seams, a little lighter or darker than the base coat
  const patches = [];
  for (let i = 0; i < 9; i++) patches.push({ u: rand(), v: rand(), w: 0.04 + rand() * 0.14, h: 0.04 + rand() * 0.14, k: (rand() - 0.5) * 0.09 });
  // long scuffs / tool scratches
  const scuffs = [];
  for (let i = 0; i < 30; i++) scuffs.push({ x: rand(), y: rand(), a: rand() < 0.7 ? (rand() - 0.5) * 0.25 : rand() * Math.PI, l: 0.02 + rand() * 0.09, w: 0.0008 + rand() * 0.0012, k: rand() });
  const seam = 0.0045;
  t.each((u, v, i) => {
    const pi = lookup(u, v);
    const r = plates[pi];
    const m = meta[pi];
    const ed = Math.min(u - r.u0, r.u1 - u, v - r.v0, r.v1 - v);
    const pw = r.u1 - r.u0;
    const ph = r.v1 - r.v0;
    const grain = fbm(u, v, { octaves: 4, freq: 40, gain: 0.5, seed: seed + 3 });
    const blotch = vnoise(u, v, 3, seed + 5) * 0.6 + vnoise(u, v, 7, seed + 6) * 0.4;
    let lum = 0.7 * m.tone + (grain - 0.5) * 0.045 + (blotch - 0.5) * 0.06;
    let rough = 0.6 + m.rough + (grain - 0.5) * 0.18;
    let metal = 0.06;
    let hgt = 0.5;
    let warm = m.warm;
    const inSeam = ed < seam;
    if (inSeam) {
      const k = 1 - ed / seam;
      lum *= 0.36 + 0.14 * (1 - k);
      rough = 0.82;
      hgt = 0.3 + 0.06 * (1 - k);
    } else {
      const bevel = clamp01((ed - seam) / (seam * 2.2));
      hgt = 0.5 - (1 - smooth(bevel)) * 0.14;
      lum *= 0.9 + 0.1 * smooth(bevel);
    }
    // rivet rows just inside the plate edge, pitch ~48 cm
    if (m.rivets && !inSeam) {
      const rp = 0.02;
      const inset = seam + 0.011;
      const nearU = Math.min(Math.abs(u - r.u0 - inset), Math.abs(r.u1 - inset - u));
      const nearV = Math.min(Math.abs(v - r.v0 - inset), Math.abs(r.v1 - inset - v));
      const onRowU = nearU < 0.003;
      const onRowV = nearV < 0.003;
      if (onRowU || onRowV) {
        const along = onRowU ? v : u;
        const ph2 = (along / rp) % 1;
        const dd = Math.abs(ph2 - 0.5) * rp;
        if (dd < 0.0026) {
          const k = 1 - dd / 0.0026;
          hgt += 0.17 * smooth(k);
          lum *= 0.88 + 0.06 * (1 - k);
          rough -= 0.15 * k;
          metal += 0.3 * k;
        }
      }
    }
    // corner bolts (four per plate)
    if (m.bolts && !inSeam) {
      const bi = seam + 0.02;
      const cu = u < (r.u0 + r.u1) / 2 ? r.u0 + bi : r.u1 - bi;
      const cv = v < (r.v0 + r.v1) / 2 ? r.v0 + bi : r.v1 - bi;
      const dd = Math.hypot(u - cu, v - cv);
      if (dd < 0.0045) {
        const k = smooth(1 - dd / 0.0045);
        hgt += 0.12 * k;
        lum *= 0.72 + 0.1 * (1 - k);
        metal += 0.4 * k;
        rough -= 0.2 * k;
      }
    }
    // centred hatch: raised square with a darker rim and a cross seam
    if (m.hatch && pw > 0.11 && ph > 0.11) {
      const cu = (r.u0 + r.u1) / 2;
      const cv = (r.v0 + r.v1) / 2;
      const hs = Math.min(pw, ph) * 0.24;
      const du = Math.abs(u - cu);
      const dv = Math.abs(v - cv);
      if (du < hs && dv < hs) {
        const e2 = hs - Math.max(du, dv);
        if (e2 < 0.006) {
          lum *= 0.55;
          hgt -= 0.08;
        } else {
          hgt += 0.09;
          lum *= 0.94;
          if (Math.min(du, dv) < 0.0015) {
            lum *= 0.6;
            hgt -= 0.07;
          }
        }
      }
    }
    // vent: short horizontal louvres in the plate centre
    if (m.vent && pw > 0.12 && ph > 0.1) {
      const cu = (r.u0 + r.u1) / 2;
      const cv = (r.v0 + r.v1) / 2;
      const du = Math.abs(u - cu);
      const dv = Math.abs(v - cv);
      if (du < pw * 0.26 && dv < ph * 0.18) {
        const lv = ((v - cv) / 0.008) % 1;
        const k = Math.abs(lv) < 0.45 ? 1 : 0;
        lum *= 0.5 + 0.2 * k;
        hgt -= 0.06 + 0.05 * k;
        rough += 0.1;
      }
    }
    // long grooves (heat-exchanger style) across some plates
    if (m.grooves && pw > 0.14) {
      const gv = ((v - r.v0) / 0.012) % 1;
      if (v - r.v0 > 0.02 && r.v1 - v > 0.02 && Math.abs(gv - 0.5) < 0.16) {
        lum *= 0.78;
        hgt -= 0.05;
      }
    }
    // repaint patches (ignore seams)
    for (const p of patches) {
      let du = Math.abs(u - p.u);
      let dv = Math.abs(v - p.v);
      if (du > 0.5) du = 1 - du;
      if (dv > 0.5) dv = 1 - dv;
      if (du < p.w && dv < p.h) {
        const k = smooth(clamp01((Math.min(p.w - du, p.h - dv)) / 0.004));
        lum += p.k * k;
        rough += p.k * 0.5 * k;
      }
    }
    // streaky soot / grime running along v (exhaust direction on the hull top, drips on walls)
    const streak = vnoise2(u, v, 80, 8, seed + 7) * 0.65 + vnoise2(u, v, 160, 5, seed + 8) * 0.35;
    const grime = clamp01((streak - 0.56) * 2.4) * (0.18 + m.soot * 0.82);
    lum *= 1 - grime * 0.33;
    rough += grime * 0.22;
    // scuffs: bright ones expose primer, dark ones are rubbed-in dirt
    for (const s of scuffs) {
      let dx = u - s.x;
      let dy = v - s.y;
      if (dx > 0.5) dx -= 1;
      if (dx < -0.5) dx += 1;
      if (dy > 0.5) dy -= 1;
      if (dy < -0.5) dy += 1;
      const along = dx * Math.cos(s.a) + dy * Math.sin(s.a);
      const perp = -dx * Math.sin(s.a) + dy * Math.cos(s.a);
      if (Math.abs(along) < s.l && Math.abs(perp) < s.w) {
        const k = (1 - Math.abs(perp) / s.w) * 0.7;
        lum = lerp(lum, s.k > 0.5 ? 0.82 : 0.4, k);
        rough = lerp(rough, s.k > 0.5 ? 0.45 : 0.8, k);
      }
    }
    // fine scratches
    const sc = worley(u, v, 22, seed + 11);
    if (sc < 0.004) {
      const k = 1 - sc / 0.004;
      lum += 0.07 * k;
      rough -= 0.15 * k;
      hgt -= 0.02 * k;
    }
    // heat stain: soot-flagged plates drift warm-brown in the streaks
    const heat = m.soot > 0.75 ? clamp01((streak - 0.45) * 1.4) * 0.3 : 0;
    const rr = lum * (1.0 + warm + heat * 0.18);
    const gg = lum * (1.0 + warm * 0.3 - heat * 0.02);
    const bb = lum * (1.02 - warm * 1.2 - heat * 0.2);
    t.setColor(i, clamp01(rr), clamp01(gg), clamp01(bb));
    t.rough[i] = clamp01(rough);
    t.metal[i] = clamp01(metal + grime * 0.05);
    t.height[i] = clamp01(hgt);
  });
  const set = t.bake({ normalStrength: 3.2 });
  set.metalnessMap = set.roughnessMap;
  return set;
}

// Fine plating detail, meant to tile every ~3.5 m: sub-panel seams, small rivets, grain and scratches.
// The albedo is a linear multiplier centred on 0.5 (x2 in the shader) so mip-averaging stays neutral.
export function makeHullDetail(size = 512, seed = 311) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const plates = platePartition(rand, 3, 0.3, 0.1);
  const lookup = plateIndex(plates, 16);
  const meta = plates.map(() => ({ tone: (rand() - 0.5) * 0.05, rivets: rand() < 0.7, dots: rand() < 0.4 }));
  const seam = 0.0035;
  t.each((u, v, i) => {
    const pi = lookup(u, v);
    const r = plates[pi];
    const m = meta[pi];
    const ed = Math.min(u - r.u0, r.u1 - u, v - r.v0, r.v1 - v);
    const grain = fbm(u, v, { octaves: 4, freq: 28, gain: 0.55, seed: seed + 2 });
    const brush = vnoise2(u, v, 6, 180, seed + 4);
    let mul = 0.5 + m.tone + (grain - 0.5) * 0.07 + (brush - 0.5) * 0.03;
    let hgt = 0.5 + (grain - 0.5) * 0.04;
    let rough = 0.5;
    if (ed < seam) {
      const k = 1 - ed / seam;
      mul -= 0.14 * k;
      hgt -= 0.28 * smooth(k);
    } else {
      const bevel = clamp01((ed - seam) / (seam * 2));
      hgt -= (1 - smooth(bevel)) * 0.1;
    }
    if (m.rivets && ed >= seam) {
      const inset = seam + 0.012;
      const nearU = Math.min(Math.abs(u - r.u0 - inset), Math.abs(r.u1 - inset - u));
      const nearV = Math.min(Math.abs(v - r.v0 - inset), Math.abs(r.v1 - inset - v));
      const onU = nearU < 0.004;
      const onV = nearV < 0.004;
      if (onU || onV) {
        const along = onU ? v : u;
        const rp = 0.06;
        const dd = Math.abs(((along / rp) % 1) - 0.5) * rp;
        if (dd < 0.0032) {
          const k = smooth(1 - dd / 0.0032);
          hgt += 0.18 * k;
          mul -= 0.03 * k;
        }
      }
    }
    if (m.dots) {
      // inspection ports: a couple of small dark discs per plate
      const cu = (r.u0 + r.u1) / 2;
      const cv = (r.v0 + r.v1) / 2;
      const dd = Math.hypot(u - cu, v - cv);
      if (dd < 0.014) {
        const k = smooth(1 - dd / 0.014);
        mul -= 0.06 * k;
        hgt -= 0.08 * k;
      }
    }
    const sc = worley(u, v, 12, seed + 6);
    if (sc < 0.005) {
      const k = 1 - sc / 0.005;
      mul += 0.05 * k;
      hgt -= 0.03 * k;
    }
    t.setColor(i, clamp01(mul), clamp01(mul), clamp01(mul));
    t.rough[i] = rough;
    t.metal[i] = 0;
    t.height[i] = clamp01(hgt);
  });
  const set = t.bake({ normalStrength: 2.4 });
  set.map.colorSpace = THREE.NoColorSpace;
  set.map.needsUpdate = true;
  return { map: set.map, normalMap: set.normalMap };
}

// Dark machinery / equipment texture (12 m tile): near-black panels with pipe runs, conduits, louvres,
// raised boxes and bolt rows. Used on the trench walls, stern wall, engine shrouds and duct greebles.
export function makeMachinery(size = 1024, seed = 351) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const plates = platePartition(rand, 4, 0.18, 0.15);
  const lookup = plateIndex(plates);
  const meta = plates.map(() => ({ tone: 1 + (rand() - 0.5) * 0.3, louvre: rand() < 0.22, box: rand() < 0.3, light: rand() < 0.08 }));
  const pipes = [];
  for (let i = 0; i < 4; i++) pipes.push({ v: rand(), r: 0.018 + rand() * 0.03, u0: rand() * 0.5, u1: 0.5 + rand() * 0.5 });
  const conduits = [];
  for (let i = 0; i < 6; i++) conduits.push({ u: rand(), r: 0.005 + rand() * 0.007 });
  const seam = 0.004;
  t.each((u, v, i) => {
    const pi = lookup(u, v);
    const r = plates[pi];
    const m = meta[pi];
    const ed = Math.min(u - r.u0, r.u1 - u, v - r.v0, r.v1 - v);
    const pw = r.u1 - r.u0;
    const ph = r.v1 - r.v0;
    const n = fbm(u, v, { octaves: 4, freq: 18, gain: 0.5, seed: seed + 4 });
    let lum = 0.25 * m.tone + (n - 0.5) * 0.08;
    let hgt = 0.5;
    let rough = 0.72 + (n - 0.5) * 0.2;
    let metal = 0.35;
    let tint = 0;
    if (ed < seam) {
      lum *= 0.5;
      hgt = 0.34;
    } else {
      const bevel = clamp01((ed - seam) / (seam * 2));
      hgt -= (1 - smooth(bevel)) * 0.1;
    }
    if (m.louvre && ed > 0.02) {
      const lv = ((v - r.v0) / 0.01) % 1;
      if (lv < 0.5) {
        lum *= 0.55;
        hgt -= 0.08;
      } else {
        lum *= 0.95;
        hgt += 0.02;
      }
    }
    if (m.box && pw > 0.1 && ph > 0.1) {
      const cu = (r.u0 + r.u1) / 2;
      const cv = (r.v0 + r.v1) / 2;
      const du = Math.abs(u - cu) / (pw * 0.3);
      const dv = Math.abs(v - cv) / (ph * 0.3);
      if (du < 1 && dv < 1) {
        const e2 = 1 - Math.max(du, dv);
        if (e2 < 0.08) {
          lum *= 0.6;
          hgt -= 0.05;
        } else {
          hgt += 0.16;
          lum *= 1.12;
          metal = 0.5;
        }
      }
    }
    if (m.light && pw > 0.08) {
      // small status placard: pale rectangle
      const cu = (r.u0 + r.u1) / 2;
      const cv = r.v0 + ph * 0.75;
      if (Math.abs(u - cu) < pw * 0.12 && Math.abs(v - cv) < 0.006) {
        lum = 0.55;
        tint = 1;
      }
    }
    // bolt rows along the seams
    const inset = seam + 0.008;
    const nearU = Math.min(Math.abs(u - r.u0 - inset), Math.abs(r.u1 - inset - u));
    const nearV = Math.min(Math.abs(v - r.v0 - inset), Math.abs(r.v1 - inset - v));
    if (ed > seam && (nearU < 0.0025 || nearV < 0.0025)) {
      const along = nearU < 0.0025 ? v : u;
      const dd = Math.abs(((along / 0.03) % 1) - 0.5) * 0.03;
      if (dd < 0.0022) {
        const k = smooth(1 - dd / 0.0022);
        hgt += 0.15 * k;
        lum += 0.08 * k;
        metal += 0.4 * k;
      }
    }
    // horizontal pipe runs with a cylindrical profile, over everything else
    for (const p of pipes) {
      let dv = Math.abs(v - p.v);
      if (dv > 0.5) dv = 1 - dv;
      if (dv < p.r && u > p.u0 && u < p.u1) {
        const k = Math.sqrt(1 - (dv / p.r) * (dv / p.r));
        hgt = 0.5 + k * 0.42;
        lum = 0.3 * m.tone + k * 0.06 + (n - 0.5) * 0.04;
        rough = 0.42;
        metal = 0.7;
        // clamp bands every ~1.2 m along the pipe
        const cl = ((u / 0.1) % 1);
        if (cl < 0.06) {
          hgt += 0.06;
          lum *= 0.75;
        }
      }
    }
    for (const c of conduits) {
      let du = Math.abs(u - c.u);
      if (du > 0.5) du = 1 - du;
      if (du < c.r) {
        const k = Math.sqrt(1 - (du / c.r) * (du / c.r));
        hgt = 0.5 + k * 0.28;
        lum = 0.22 + k * 0.05;
        metal = 0.6;
        rough = 0.5;
      }
    }
    const grime = clamp01((fbm(u, v, { octaves: 3, freq: 6, seed: seed + 9 }) - 0.5) * 2);
    lum *= 1 - grime * 0.25;
    const rr = tint ? lum * 1.15 : lum;
    const gg = tint ? lum * 0.95 : lum * 1.01;
    const bb = tint ? lum * 0.7 : lum * 1.08;
    t.setColor(i, clamp01(rr), clamp01(gg), clamp01(bb));
    t.rough[i] = clamp01(rough);
    t.metal[i] = clamp01(metal);
    t.height[i] = clamp01(hgt);
  });
  const set = t.bake({ normalStrength: 3.4 });
  set.metalnessMap = set.roughnessMap;
  return set;
}

// Cut-out window rows: transparent background, each window a black frame with a lit pane (most cool
// blue-white, some warm, ~20 % dark). One tile holds `cols` windows across; tiled so the pitch is 2.5 m.
export function makeWindowStrips(w = 512, h = 64, seed = 401, cols = 16, rows = 2) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  ctx.clearRect(0, 0, w, h);
  const cw = w / cols;
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x = k * cw;
      const y = r * rh;
      const ww = cw * 0.5;
      const wh = rh * 0.42;
      const x0 = x + (cw - ww) / 2;
      const y0 = y + (rh - wh) / 2;
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillRect(x0 - 1.5, y0 - 1.5, ww + 3, wh + 3);
      if (rand() < 0.2) {
        ctx.fillStyle = "rgba(8,10,14,1)";
        ctx.fillRect(x0, y0, ww, wh);
        continue;
      }
      const warm = rand() < 0.18;
      const a = 0.6 + rand() * 0.4;
      ctx.fillStyle = warm ? `rgba(255,214,160,${a})` : `rgba(205,228,255,${a})`;
      ctx.fillRect(x0, y0, ww, wh);
    }
  }
  return toTexture(c, { srgb: true });
}

// ---------------------------------------------------------------------------
// Detail atlas: 4x4 cells of 256 px. Albedo + emissive canvases share the layout.
// ---------------------------------------------------------------------------
export const ATLAS_CELLS = 4;
function cellRect(index) {
  const cc = index % ATLAS_CELLS;
  const rr = Math.floor(index / ATLAS_CELLS);
  const s = 1 / ATLAS_CELLS;
  // canvas rows run top-down, texture v runs bottom-up; inset half a texel so bilinear filtering never bleeds
  const e = 0.5 / 1024;
  return [cc * s + e, 1 - (rr + 1) * s + e, (cc + 1) * s - e, 1 - rr * s - e];
}

export function makeDetailAtlas(size = 1024, seed = 421) {
  const alb = makeCanvas(size, size);
  const emi = makeCanvas(size, size);
  const a = alb.getContext("2d");
  const e = emi.getContext("2d");
  const rand = mulberry32(seed);
  const cell = size / ATLAS_CELLS;
  e.fillStyle = "#000";
  e.fillRect(0, 0, size, size);
  a.fillStyle = "#8f9297";
  a.fillRect(0, 0, size, size);
  const GREY = "#a9adb3";
  const GREY_D = "#6f737a";
  const DARK = "#2a2d33";
  const BLACK = "#121417";
  const ORANGE = "#b8552a";
  const at = (i, fn) => {
    const cx = (i % ATLAS_CELLS) * cell;
    const cy = Math.floor(i / ATLAS_CELLS) * cell;
    for (const ctx of [a, e]) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.rect(0, 0, cell, cell);
      ctx.clip();
    }
    fn(cell);
    a.restore();
    e.restore();
  };
  const grain = (ctx, s, base, amp) => {
    // cheap speckle so flat fills never read as vector art
    for (let k = 0; k < 900; k++) {
      const x = rand() * s;
      const y = rand() * s;
      const g = Math.round(base + (rand() - 0.5) * amp);
      ctx.fillStyle = `rgba(${g},${g},${g + 3},0.35)`;
      ctx.fillRect(x, y, 1 + rand() * 2, 1 + rand() * 2);
    }
  };
  const bolts = (ctx, s, inset, n, color = "#3a3d43") => {
    ctx.fillStyle = color;
    for (let k = 0; k < n; k++) {
      const tt = (k + 0.5) / n;
      for (const [x, y] of [
        [inset + tt * (s - inset * 2), inset],
        [inset + tt * (s - inset * 2), s - inset],
        [inset, inset + tt * (s - inset * 2)],
        [s - inset, inset + tt * (s - inset * 2)],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, s * 0.008, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  const lightDot = (x, y, r, color) => {
    const g = e.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(0.55, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    e.fillStyle = g;
    e.beginPath();
    e.arc(x, y, r, 0, Math.PI * 2);
    e.fill();
  };

  // 0: 4 m hatch top: dark rim, light lid with cross seam, four bolts, one hazard tick
  at(0, (s) => {
    a.fillStyle = DARK;
    a.fillRect(0, 0, s, s);
    a.fillStyle = GREY;
    a.fillRect(s * 0.08, s * 0.08, s * 0.84, s * 0.84);
    grain(a, s, 168, 24);
    a.fillStyle = "#4a4e55";
    a.fillRect(s * 0.49, s * 0.08, s * 0.02, s * 0.84);
    a.fillRect(s * 0.08, s * 0.49, s * 0.84, s * 0.02);
    a.strokeStyle = "#5a5e66";
    a.lineWidth = s * 0.012;
    a.strokeRect(s * 0.14, s * 0.14, s * 0.72, s * 0.72);
    bolts(a, s, s * 0.11, 3);
    a.fillStyle = ORANGE;
    a.fillRect(s * 0.2, s * 0.86, s * 0.6, s * 0.03);
    lightDot(s * 0.85, s * 0.15, s * 0.02, "rgba(255,120,60,1)");
  });
  // 1: vent grille: recessed louvres
  at(1, (s) => {
    a.fillStyle = BLACK;
    a.fillRect(0, 0, s, s);
    a.fillStyle = GREY_D;
    for (let k = 0; k < 9; k++) a.fillRect(s * 0.08, s * (0.1 + k * 0.095), s * 0.84, s * 0.045);
    a.fillStyle = "#4b4f56";
    a.fillRect(0, 0, s, s * 0.06);
    a.fillRect(0, s * 0.94, s, s * 0.06);
    a.fillRect(0, 0, s * 0.05, s);
    a.fillRect(s * 0.95, 0, s * 0.05, s);
    grain(a, s, 90, 30);
  });
  // 2: 60 m docking pad: pad grey with white border, corner brackets, centre ring, edge lights (emissive)
  at(2, (s) => {
    a.fillStyle = "#7c8087";
    a.fillRect(0, 0, s, s);
    grain(a, s, 124, 30);
    a.strokeStyle = "#d8dbe0";
    a.lineWidth = s * 0.018;
    a.strokeRect(s * 0.05, s * 0.05, s * 0.9, s * 0.9);
    a.lineWidth = s * 0.03;
    for (const [x, y, dx, dy] of [
      [0.12, 0.12, 1, 1],
      [0.88, 0.12, -1, 1],
      [0.12, 0.88, 1, -1],
      [0.88, 0.88, -1, -1],
    ]) {
      a.beginPath();
      a.moveTo(s * (x + dx * 0.16), s * y);
      a.lineTo(s * x, s * y);
      a.lineTo(s * x, s * (y + dy * 0.16));
      a.stroke();
    }
    a.lineWidth = s * 0.02;
    a.beginPath();
    a.arc(s * 0.5, s * 0.5, s * 0.2, 0, Math.PI * 2);
    a.stroke();
    a.fillStyle = "#d8dbe0";
    a.fillRect(s * 0.44, s * 0.36, s * 0.12, s * 0.28);
    a.fillRect(s * 0.36, s * 0.44, s * 0.28, s * 0.12);
    a.fillStyle = "#7c8087";
    a.fillRect(s * 0.47, s * 0.39, s * 0.06, s * 0.22);
    a.fillRect(s * 0.39, s * 0.47, s * 0.22, s * 0.06);
    a.fillStyle = ORANGE;
    a.fillRect(s * 0.3, s * 0.02, s * 0.4, s * 0.012);
    a.fillRect(s * 0.3, s * 0.968, s * 0.4, s * 0.012);
    // tyre / skid marks
    a.fillStyle = "rgba(40,42,46,0.35)";
    for (let k = 0; k < 6; k++) a.fillRect(s * (0.25 + rand() * 0.5), s * (0.25 + rand() * 0.5), s * 0.02, s * (0.05 + rand() * 0.15));
    for (let k = 0; k < 12; k++) {
      const tt = (k + 0.5) / 12;
      const col = k % 3 === 0 ? "rgba(255,190,110,1)" : "rgba(220,235,255,1)";
      lightDot(s * 0.025, s * tt, s * 0.012, col);
      lightDot(s * 0.975, s * tt, s * 0.012, col);
      lightDot(s * tt, s * 0.025, s * 0.012, col);
      lightDot(s * tt, s * 0.975, s * 0.012, col);
    }
  });
  // 3: secondary bay door (reserved, closed): two leaves, centre seam, hazard ticks, edge lights
  at(3, (s) => {
    a.fillStyle = "#5c6067";
    a.fillRect(0, 0, s, s);
    grain(a, s, 92, 26);
    a.fillStyle = BLACK;
    a.fillRect(s * 0.485, s * 0.04, s * 0.03, s * 0.92);
    a.fillRect(0, 0, s, s * 0.04);
    a.fillRect(0, s * 0.96, s, s * 0.04);
    a.fillRect(0, 0, s * 0.03, s);
    a.fillRect(s * 0.97, 0, s * 0.03, s);
    a.strokeStyle = "#454950";
    a.lineWidth = s * 0.008;
    for (let k = 1; k < 6; k++) {
      a.beginPath();
      a.moveTo(s * 0.03, s * (0.04 + k * 0.155));
      a.lineTo(s * 0.97, s * (0.04 + k * 0.155));
      a.stroke();
    }
    a.fillStyle = ORANGE;
    for (let k = 0; k < 8; k++) {
      a.fillRect(s * 0.44, s * (0.06 + k * 0.12), s * 0.04, s * 0.05);
      a.fillRect(s * 0.52, s * (0.06 + k * 0.12), s * 0.04, s * 0.05);
    }
    bolts(a, s, s * 0.06, 8, "#2f3237");
    for (let k = 0; k < 6; k++) lightDot(s * (0.12 + k * 0.152), s * 0.02, s * 0.012, "rgba(255,90,60,1)");
  });
  // 4: machinery panel: conduits, junction boxes, indicator lights
  at(4, (s) => {
    a.fillStyle = "#31343a";
    a.fillRect(0, 0, s, s);
    grain(a, s, 52, 24);
    a.fillStyle = "#4a4e55";
    for (let k = 0; k < 4; k++) a.fillRect(s * 0.08, s * (0.15 + k * 0.2), s * 0.84, s * 0.05);
    a.fillStyle = "#23262b";
    for (let k = 0; k < 4; k++) a.fillRect(s * 0.08, s * (0.2 + k * 0.2), s * 0.84, s * 0.012);
    a.fillStyle = "#5a5e66";
    a.fillRect(s * 0.15, s * 0.3, s * 0.2, s * 0.3);
    a.fillRect(s * 0.6, s * 0.5, s * 0.25, s * 0.2);
    a.fillStyle = "#1c1e22";
    a.fillRect(s * 0.17, s * 0.32, s * 0.16, s * 0.26);
    a.fillRect(s * 0.62, s * 0.52, s * 0.21, s * 0.16);
    bolts(a, s, s * 0.04, 5, "#5a5e66");
    lightDot(s * 0.2, s * 0.36, s * 0.012, "rgba(120,200,255,1)");
    lightDot(s * 0.3, s * 0.36, s * 0.012, "rgba(255,80,60,1)");
    lightDot(s * 0.8, s * 0.56, s * 0.012, "rgba(255,190,90,1)");
  });
  // 5: recessed bay: near-black with three rows of eight lit windows
  at(5, (s) => {
    a.fillStyle = "#0c0d10";
    a.fillRect(0, 0, s, s);
    a.fillStyle = "#3a3d43";
    a.fillRect(0, 0, s, s * 0.05);
    a.fillRect(0, s * 0.95, s, s * 0.05);
    a.fillRect(0, 0, s * 0.04, s);
    a.fillRect(s * 0.96, 0, s * 0.04, s);
    a.fillStyle = "#23262b";
    for (let k = 0; k < 3; k++) a.fillRect(s * 0.04, s * (0.3 + k * 0.22), s * 0.92, s * 0.03);
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 8; k++) {
        if (rand() < 0.2) continue;
        const warm = rand() < 0.2;
        e.fillStyle = warm ? "rgba(255,210,150,1)" : "rgba(190,220,255,1)";
        a.fillStyle = warm ? "#ffe0b0" : "#dcecff";
        const x = s * (0.08 + k * 0.11);
        const y = s * (0.13 + r * 0.22);
        e.fillRect(x, y, s * 0.06, s * 0.1);
        a.fillRect(x, y, s * 0.06, s * 0.1);
      }
    }
  });
  // 6: exhaust duct grille: vertical vanes with a heat-darkened frame
  at(6, (s) => {
    a.fillStyle = "#15171a";
    a.fillRect(0, 0, s, s);
    a.fillStyle = "#4d4a48";
    for (let k = 0; k < 10; k++) a.fillRect(s * (0.07 + k * 0.09), s * 0.08, s * 0.045, s * 0.84);
    a.fillStyle = "#3a3733";
    a.fillRect(0, 0, s, s * 0.07);
    a.fillRect(0, s * 0.93, s, s * 0.07);
    grain(a, s, 60, 30);
    lightDot(s * 0.5, s * 0.5, s * 0.45, "rgba(90,50,30,0.45)");
  });
  // 7: navigation light: dark housing ring, bright centre
  at(7, (s) => {
    a.fillStyle = "#2b2e33";
    a.fillRect(0, 0, s, s);
    a.fillStyle = "#e8eef8";
    a.beginPath();
    a.arc(s * 0.5, s * 0.5, s * 0.3, 0, Math.PI * 2);
    a.fill();
    lightDot(s * 0.5, s * 0.5, s * 0.42, "rgba(255,255,255,1)");
  });
  // 8: single window row, 16 windows (used on the terrace bays and the tower blocks)
  at(8, (s) => {
    a.fillStyle = "#3b3e44";
    a.fillRect(0, 0, s, s);
    grain(a, s, 60, 20);
    for (let k = 0; k < 16; k++) {
      const x = s * (k / 16 + 0.015);
      a.fillStyle = "#08090b";
      a.fillRect(x - 2, s * 0.36 - 2, s * 0.035 + 4, s * 0.28 + 4);
      if (rand() < 0.2) continue;
      const warm = rand() < 0.18;
      a.fillStyle = warm ? "#ffe0b0" : "#dcecff";
      e.fillStyle = warm ? "rgba(255,210,150,1)" : "rgba(200,225,255,1)";
      a.fillRect(x, s * 0.36, s * 0.035, s * 0.28);
      e.fillRect(x, s * 0.36, s * 0.035, s * 0.28);
    }
  });
  // 9: heat exchanger fins
  at(9, (s) => {
    a.fillStyle = "#2b2d31";
    a.fillRect(0, 0, s, s);
    a.fillStyle = "#9a9ea5";
    for (let k = 0; k < 14; k++) a.fillRect(s * (0.05 + k * 0.066), 0, s * 0.03, s);
    grain(a, s, 120, 40);
  });
  // 10: sensor panel: dark square grid of small elements
  at(10, (s) => {
    a.fillStyle = "#1f2226";
    a.fillRect(0, 0, s, s);
    a.fillStyle = "#3d4148";
    for (let j = 0; j < 6; j++) for (let k = 0; k < 6; k++) a.fillRect(s * (0.06 + k * 0.15), s * (0.06 + j * 0.15), s * 0.12, s * 0.12);
    a.fillStyle = "#15171a";
    for (let j = 0; j < 6; j++) for (let k = 0; k < 6; k++) a.fillRect(s * (0.1 + k * 0.15), s * (0.1 + j * 0.15), s * 0.04, s * 0.04);
    lightDot(s * 0.5, s * 0.5, s * 0.03, "rgba(255,70,50,1)");
  });
  // 11: service access cluster: three small hatches, a valve wheel, a stencil bar
  at(11, (s) => {
    a.fillStyle = GREY;
    a.fillRect(0, 0, s, s);
    grain(a, s, 160, 28);
    a.fillStyle = DARK;
    for (let k = 0; k < 3; k++) a.fillRect(s * (0.08 + k * 0.3), s * 0.12, s * 0.24, s * 0.3);
    a.fillStyle = "#8a8e95";
    for (let k = 0; k < 3; k++) a.fillRect(s * (0.11 + k * 0.3), s * 0.15, s * 0.18, s * 0.24);
    a.strokeStyle = "#3a3d43";
    a.lineWidth = s * 0.03;
    a.beginPath();
    a.arc(s * 0.25, s * 0.7, s * 0.12, 0, Math.PI * 2);
    a.stroke();
    a.fillStyle = ORANGE;
    a.fillRect(s * 0.5, s * 0.62, s * 0.4, s * 0.05);
    a.fillStyle = DARK;
    a.fillRect(s * 0.5, s * 0.72, s * 0.3, s * 0.03);
    a.fillRect(s * 0.5, s * 0.78, s * 0.36, s * 0.03);
    lightDot(s * 0.92, s * 0.9, s * 0.02, "rgba(120,255,140,1)");
  });
  // 12: plain light plate (sides of hatches, pad rims)
  at(12, (s) => {
    a.fillStyle = GREY;
    a.fillRect(0, 0, s, s);
    grain(a, s, 165, 26);
  });
  // 13: plain dark plate
  at(13, (s) => {
    a.fillStyle = DARK;
    a.fillRect(0, 0, s, s);
    grain(a, s, 44, 20);
  });
  // 14: pad edge-light strip: dark trough with alternating lit dashes
  at(14, (s) => {
    a.fillStyle = "#23262b";
    a.fillRect(0, 0, s, s);
    for (let k = 0; k < 8; k++) {
      const x = s * (0.04 + k * 0.12);
      a.fillStyle = "#e8f0ff";
      a.fillRect(x, s * 0.4, s * 0.07, s * 0.2);
      e.fillStyle = k % 4 === 0 ? "rgba(255,180,100,1)" : "rgba(210,230,255,1)";
      e.fillRect(x, s * 0.4, s * 0.07, s * 0.2);
    }
  });
  // 15: hazard band with a dark centre (bay rims, blast door edges)
  at(15, (s) => {
    a.fillStyle = "#3a3d43";
    a.fillRect(0, 0, s, s);
    a.fillStyle = ORANGE;
    for (let k = 0; k < 8; k++) {
      a.beginPath();
      a.moveTo(s * (k * 0.125), 0);
      a.lineTo(s * (k * 0.125 + 0.0625), 0);
      a.lineTo(s * (k * 0.125 + 0.0625 + 0.06), s);
      a.lineTo(s * (k * 0.125 + 0.06), s);
      a.closePath();
      a.fill();
    }
    a.fillStyle = "#1d1f23";
    a.fillRect(0, s * 0.3, s, s * 0.4);
  });

  const cells = {
    hatch: cellRect(0),
    vent: cellRect(1),
    pad: cellRect(2),
    bayDoor: cellRect(3),
    machinery: cellRect(4),
    bay: cellRect(5),
    duct: cellRect(6),
    navLight: cellRect(7),
    windowRow: cellRect(8),
    fins: cellRect(9),
    sensor: cellRect(10),
    service: cellRect(11),
    plate: cellRect(12),
    dark: cellRect(13),
    edgeLights: cellRect(14),
    hazard: cellRect(15),
  };
  const map = toTexture(alb, { srgb: true, wrap: false });
  const emissiveMap = toTexture(emi, { srgb: true, wrap: false });
  return { map, emissiveMap, cells };
}

export { THREE };
