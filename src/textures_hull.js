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
// Armour plating (the hull's skin, three seeds / rhythms): plates 3–9 m in an irregular staggered
// grid at texel 1/26, per-plate tone variance ±12 % with darker replacement plates, seams as 0.3 m
// dark gaps (no rivet dots), faint fore–aft scouring streaks, weathering smears trailing 2–6 m from
// the seams, grime pooled toward the seams, per-plate roughness 0.4–0.75 and metalness 0.1–0.3, a few
// plates with an inset panel or a small raised hatch, bare-metal scratches. The mean albedo is the
// same for every variant so mixed materials never read as a quilt.
// ---------------------------------------------------------------------------
export function makeArmourPlating(size = 1024, seed = 211, { cols = 4, rowsMin = 4, rowsMax = 8, streak: streakAmt = 0.1 } = {}) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const colEdges = [0];
  for (let c = 1; c < cols; c++) colEdges.push(c / cols + (rand() - 0.5) * 0.06);
  colEdges.push(1);
  const rows = [];
  const tone = [];
  const rough = [];
  const metalP = [];
  const streakLen = [];
  const kind = [];
  const hatchAt = [];
  for (let c = 0; c < cols; c++) {
    const n = rowsMin + Math.floor(rand() * (rowsMax - rowsMin + 1));
    const e = [0];
    for (let r = 1; r < n; r++) e.push(r / n + (rand() - 0.5) * 0.05);
    e.push(1);
    rows.push(e);
    // per-plate tone ±12 % with one plate in ten a darker replacement, per-plate roughness 0.4–0.75
    // and metalness 0.1–0.3 (hash per tile): neighbouring plates differ in both albedo and specular
    tone.push(e.map(() => (rand() < 0.1 ? 0.72 : 0.89 + (rand() - 0.5) * 0.24)));
    rough.push(e.map(() => 0.4 + rand() * 0.35));
    metalP.push(e.map(() => 0.1 + rand() * 0.2));
    streakLen.push(e.map(() => (2 + rand() * 4) / 26));
    kind.push(
      e.map(() => {
        const k = rand();
        return k < 0.14 ? "inset" : k < 0.24 ? "hatch" : "plain";
      }),
    );
    hatchAt.push(e.map(() => [0.2 + rand() * 0.6, 0.2 + rand() * 0.6]));
  }
  const gapHalf = 0.15 / 26; // half of a 0.3 m seam gap on a 26 m tile
  t.each((u, v, i) => {
    let c = 0;
    while (c < cols - 1 && u > colEdges[c + 1]) c++;
    const re = rows[c];
    let r = 0;
    while (r < re.length - 2 && v > re[r + 1]) r++;
    const du = Math.min(u - colEdges[c], colEdges[c + 1] - u);
    const dv = Math.min(v - re[r], re[r + 1] - v);
    const ed = Math.min(du, dv);
    const seam = smooth(clamp01(1 - ed / gapHalf));
    const bevel = clamp01((ed - gapHalf) / 0.012);
    const n1 = fbm(u, v, { octaves: 4, freq: 6, seed });
    const n2 = fbm(u, v, { octaves: 3, freq: 36, seed: seed + 11 });
    let lum = tone[c][r] * (0.985 + (n1 - 0.5) * 0.05 + (n2 - 0.5) * 0.02);
    let rg = rough[c][r] + (n1 - 0.5) * 0.08;
    let metal = metalP[c][r];
    let hgt = 0.5 + bevel * 0.16;
    // faint directional scouring along v (fore–aft on the horizontal plates)
    const streak = Math.pow(vnoise2(u, v, 70, 5, seed + 21) * 0.6 + vnoise2(u, v, 130, 9, seed + 23) * 0.4, 2.4);
    lum *= 1 - streak * streakAmt;
    rg += streak * 0.1;
    // grime pooled toward the seams
    const grime = clamp01(1 - ed / 0.03) * fbm(u, v, { octaves: 3, freq: 18, seed: seed + 5 });
    lum *= 1 - grime * 0.2;
    rg += grime * 0.15;
    // fore–aft weathering streaks trailing 2–6 m from the plate's leading seam: −5..−8 % in a few
    // narrow lanes per plate (masked by a fine noise across u) so each plate carries its own smears
    const dv0 = v - re[r];
    if (dv0 < streakLen[c][r]) {
      const lane = clamp01((vnoise2(u, 0.37, 220, 3, seed + 31) - 0.62) * 4);
      const fade = 1 - dv0 / streakLen[c][r];
      lum *= 1 - lane * fade * fade * 0.08;
      rg += lane * fade * 0.08;
    }
    // plate features
    const pw = colEdges[c + 1] - colEdges[c];
    const ph = re[r + 1] - re[r];
    const pu = (u - colEdges[c]) / pw;
    const pv = (v - re[r]) / ph;
    if (kind[c][r] === "inset") {
      // recessed inner panel with a dark rim line 0.25 m wide, ~0.8 m in from the plate edge
      const m = 0.8 / 26;
      const rd = Math.min(u - colEdges[c] - m, colEdges[c + 1] - m - u, v - re[r] - m, re[r + 1] - m - v);
      if (rd > 0 && rd < 0.25 / 26) {
        lum *= 0.7;
        hgt -= 0.16;
        rg += 0.1;
      } else if (rd >= 0.25 / 26) {
        lum *= 0.965;
        hgt -= 0.07;
      }
    } else if (kind[c][r] === "hatch") {
      // small raised hatch (~1.2 m) with a darker border
      const [hu, hv] = hatchAt[c][r];
      const ax = Math.abs(pu - hu) * pw * 26;
      const ay = Math.abs(pv - hv) * ph * 26;
      const d = Math.max(ax, ay);
      if (d < 0.6) {
        hgt += 0.12;
        lum *= 1.02;
      } else if (d < 0.78) {
        hgt += 0.04;
        lum *= 0.72;
      }
    }
    // seam gap: dark, deep, rough
    lum *= 1 - seam * 0.55;
    hgt -= seam * 0.36;
    rg += seam * 0.2;
    // bright scratches (bare metal showing through)
    const sc = worley(u, v, 11, seed + 7);
    if (sc < 0.004) {
      const k = 1 - sc / 0.004;
      lum += k * 0.12;
      hgt -= k * 0.02;
      metal = lerp(metal, 0.55, k);
    }
    t.setColor(i, lum * 0.99, lum, lum * 1.035);
    t.rough[i] = clamp01(rg);
    t.metal[i] = clamp01(metal);
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 2.2 }));
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
