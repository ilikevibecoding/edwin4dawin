// Hull-specific procedural textures (workstream EXT-A): a second armour-plating variant with a
// different plate rhythm (long narrow plates, heavier scouring, a few replaced plates), a dark
// machinery panel for the trench "city" blocks, and a heat-discoloration ramp for the engine bells.
// Same TexGen approach as textures_imperial.js makeHullPlating; nothing is downloaded.
import { TexGen, fbm, vnoise2, worley, makeCanvas, toTexture, mulberry32 } from "./textures.js";

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
function finish(set) {
  set.metalnessMap = set.roughnessMap;
  return set;
}

// ---------------------------------------------------------------------------
// Armour plating, variant 2: three long plate columns per tile with independently staggered rows
// (plates ~8 m wide × 3–6 m tall at texel 1/26), deeper seams, a few darker replacement plates,
// directional micrometeorite scouring along v, seam grime, edge rivets and bright scratches.
// ---------------------------------------------------------------------------
export function makeHullPlating2(size = 1024, seed = 173) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const cols = 3;
  const colEdges = [0];
  for (let c = 1; c < cols; c++) colEdges.push(c / cols + (rand() - 0.5) * 0.05);
  colEdges.push(1);
  const rowsPerCol = [];
  const tone = [];
  const replaced = [];
  for (let c = 0; c < cols; c++) {
    const n = 5 + Math.floor(rand() * 4);
    const e = [0];
    for (let r = 1; r < n; r++) e.push(r / n + (rand() - 0.5) * 0.04);
    e.push(1);
    rowsPerCol.push(e);
    tone.push(e.map(() => 0.88 + (rand() - 0.5) * 0.2));
    replaced.push(e.map(() => rand() < 0.12));
  }
  const soot = [];
  for (let i = 0; i < 4; i++) soot.push([rand(), rand(), 0.08 + rand() * 0.16, rand()]);
  t.each((u, v, i) => {
    let c = 0;
    while (c < cols - 1 && u > colEdges[c + 1]) c++;
    const re = rowsPerCol[c];
    let r = 0;
    while (r < re.length - 2 && v > re[r + 1]) r++;
    const du = Math.min(u - colEdges[c], colEdges[c + 1] - u);
    const dv = Math.min(v - re[r], re[r + 1] - v);
    const ed = Math.min(du, dv);
    const seam = clamp01(1 - ed / 0.005);
    const bevel = clamp01((ed - 0.005) / 0.016);
    const n1 = fbm(u, v, { octaves: 4, freq: 6, seed });
    const n2 = fbm(u, v, { octaves: 3, freq: 36, seed: seed + 11 });
    let lum = tone[c][r] * (0.97 + (n1 - 0.5) * 0.1 + (n2 - 0.5) * 0.04);
    let rough = 0.6 + (n1 - 0.5) * 0.2 + seam * 0.25;
    let metal = 0.14;
    if (replaced[c][r]) {
      // a newer, darker, smoother plate that has not weathered with its neighbours
      lum *= 0.78;
      rough -= 0.12;
      metal = 0.3;
    }
    // directional scouring: long streaks along v
    const streak = Math.pow(vnoise2(u, v, 90, 4, seed + 21) * 0.6 + vnoise2(u, v, 160, 7, seed + 23) * 0.4, 2.2);
    lum *= 1 - streak * 0.16;
    rough += streak * 0.12;
    // grime pooling along seams
    const grime = clamp01(1 - ed / 0.03) * fbm(u, v, { octaves: 3, freq: 18, seed: seed + 5 });
    lum *= 1 - grime * 0.22;
    rough += grime * 0.2;
    for (const [sx, sy, sr, sk] of soot) {
      const d = Math.hypot((u - sx) * 1.3, v - sy);
      if (d < sr) lum *= 1 - smooth(1 - d / sr) * sk * 0.28;
    }
    let hgt = 0.5 + bevel * 0.22 - seam * 0.34;
    // rivet rows inside the plate edges
    const pitch = 0.025;
    const ru = (u - colEdges[c]) / pitch;
    const rv = (v - re[r]) / pitch;
    const nearU = du < 0.016 && du > 0.009;
    const nearV = dv < 0.016 && dv > 0.009;
    if ((nearU && Math.abs(rv - Math.round(rv)) < 0.16) || (nearV && Math.abs(ru - Math.round(ru)) < 0.16)) {
      hgt += 0.1;
      lum *= 0.82;
      metal = 0.65;
      rough = 0.42;
    }
    // bright scratches (bare metal showing through)
    const sc = worley(u, v, 11, seed + 7);
    if (sc < 0.005) {
      const k = 1 - sc / 0.005;
      lum += k * 0.16;
      hgt -= k * 0.03;
      metal = lerp(metal, 0.6, k);
    }
    t.setColor(i, lum * 0.99, lum, lum * 1.035);
    t.rough[i] = clamp01(rough);
    t.metal[i] = clamp01(metal);
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 2.4 }));
}

// ---------------------------------------------------------------------------
// Machinery panel for trench / recess walls: near-black cast panels split into sub-panels, three
// horizontal pipe ridges, a band of vent slots, bolt heads and oxidised patches. Tile ≈ 12 m.
// ---------------------------------------------------------------------------
export function makeMachineryPanel(size = 512, seed = 57) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const pipes = [0.18, 0.52, 0.8].map((y) => [y + (rand() - 0.5) * 0.04, 0.02 + rand() * 0.02]);
  const ventV0 = 0.3;
  const ventV1 = 0.42;
  const subCols = 4;
  const subRows = 3;
  t.each((u, v, i) => {
    const fu = (u * subCols) % 1;
    const fv = (v * subRows) % 1;
    const ed = Math.min(fu, 1 - fu, fv, 1 - fv);
    const seam = clamp01(1 - ed / 0.03);
    const n1 = fbm(u, v, { octaves: 4, freq: 7, seed });
    const speck = fbm(u, v, { octaves: 3, freq: 50, seed: seed + 3 });
    let lum = 0.42 + (n1 - 0.5) * 0.14 + (speck - 0.5) * 0.05;
    let rough = 0.58 + (n1 - 0.5) * 0.2;
    let metal = 0.7;
    let hgt = 0.5 - seam * 0.25;
    lum *= 1 - seam * 0.4;
    // oxidised patches
    const ox = clamp01((fbm(u, v, { octaves: 3, freq: 4, seed: seed + 9 }) - 0.58) * 5);
    lum = lerp(lum, 0.3, ox * 0.6);
    rough += ox * 0.3;
    metal -= ox * 0.4;
    // pipe ridges: half-round profile in the height map, brighter crown
    for (const [py, pr] of pipes) {
      const d = Math.abs(v - py);
      if (d < pr) {
        const k = Math.sqrt(1 - (d / pr) * (d / pr));
        hgt = 0.5 + k * 0.42;
        lum = 0.42 + k * 0.14 + (speck - 0.5) * 0.04;
        rough = 0.42 + (1 - k) * 0.2;
        metal = 0.85;
        // clamps every 1/6 tile
        const cu = (u * 6) % 1;
        if (cu < 0.05 || cu > 0.95) {
          hgt += 0.08;
          lum *= 0.8;
        }
      }
    }
    // vent slots band
    if (v > ventV0 && v < ventV1) {
      const su = (u * 24) % 1;
      const slot = su > 0.25 && su < 0.75 && v > ventV0 + 0.015 && v < ventV1 - 0.015;
      if (slot) {
        hgt -= 0.3;
        lum *= 0.45;
        rough = 0.8;
        metal = 0.3;
      } else {
        hgt += 0.04;
      }
    }
    // bolt heads at sub-panel corners
    const bx = Math.min(fu, 1 - fu);
    const by = Math.min(fv, 1 - fv);
    const bd = Math.hypot(bx - 0.06, by - 0.06);
    if (bd < 0.018) {
      const k = smooth(1 - bd / 0.018);
      hgt += k * 0.2;
      lum = lerp(lum, 0.5, k * 0.7);
      metal = 0.9;
      rough = 0.4;
    }
    t.setColor(i, lum * 0.98, lum, lum * 1.05);
    t.rough[i] = clamp01(rough);
    t.metal[i] = clamp01(metal);
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 2.2 }));
}

// ---------------------------------------------------------------------------
// Engine heat ramp: 1D gradient (u = 0 at the collar, 1 at the lip) from painted grey through
// straw / bronze / violet-blue tempering colours to soot black at the lip. Used as the bell map.
// ---------------------------------------------------------------------------
export function makeHeatRamp(w = 256, h = 16) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0.0, "#a0a4aa");
  g.addColorStop(0.45, "#8f9298");
  g.addColorStop(0.62, "#8c7f66");
  g.addColorStop(0.74, "#7a5a4e");
  g.addColorStop(0.84, "#4d4a66");
  g.addColorStop(0.93, "#2b2d38");
  g.addColorStop(1.0, "#15161a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // faint banding so the ramp is not a perfect gradient
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = 1 + (fbm(x / w, y / h, { octaves: 3, freq: 12, seed: 5 }) - 0.5) * 0.18;
      const i = (y * w + x) * 4;
      d[i] = clamp01((d[i] / 255) * k) * 255;
      d[i + 1] = clamp01((d[i + 1] / 255) * k) * 255;
      d[i + 2] = clamp01((d[i + 2] / 255) * k) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: true, wrap: false });
}
