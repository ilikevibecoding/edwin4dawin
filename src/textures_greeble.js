// Greeble textures (workstream EXT-C): a light painted equipment-panel set in the hull's plate tone so
// instanced surface detail reads by shadow rather than by albedo. Tile ≈ 8 m (bash() texel 1/8):
// sub-panels with 0.15 m seams, faint directional wear, a few louvre bands and stencil marks, per-panel
// roughness 0.5–0.7. Same TexGen approach as the other procedural sets; nothing is downloaded.
import { TexGen, fbm, vnoise2, worley, mulberry32 } from "./textures.js";

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;

export function makeGreeblePanel(size = 512, seed = 311) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  // 3 × 3 sub-panels with jittered splits; each gets its own tone / roughness / feature
  const n = 3;
  const cu = [0];
  const cv = [0];
  for (let i = 1; i < n; i++) {
    cu.push(i / n + (rand() - 0.5) * 0.08);
    cv.push(i / n + (rand() - 0.5) * 0.08);
  }
  cu.push(1);
  cv.push(1);
  const tone = [];
  const rough = [];
  const feature = [];
  for (let i = 0; i < n * n; i++) {
    tone.push(0.87 + (rand() - 0.5) * 0.09);
    rough.push(0.5 + rand() * 0.2);
    const f = rand();
    feature.push(f < 0.22 ? "louvre" : f < 0.36 ? "inset" : f < 0.44 ? "stencil" : "plain");
  }
  const seamW = 0.15 / 8; // 0.15 m gap on an 8 m tile
  t.each((u, v, i) => {
    let a = 0;
    while (a < n - 1 && u > cu[a + 1]) a++;
    let b = 0;
    while (b < n - 1 && v > cv[b + 1]) b++;
    const k = b * n + a;
    const du = Math.min(u - cu[a], cu[a + 1] - u);
    const dv = Math.min(v - cv[b], cv[b + 1] - v);
    const ed = Math.min(du, dv);
    const seam = clamp01(1 - ed / seamW);
    const bevel = clamp01((ed - seamW) / 0.02);
    const n1 = fbm(u, v, { octaves: 4, freq: 5, seed });
    const n2 = fbm(u, v, { octaves: 3, freq: 30, seed: seed + 3 });
    let lum = tone[k] * (0.985 + (n1 - 0.5) * 0.05 + (n2 - 0.5) * 0.025);
    let rg = rough[k] + (n1 - 0.5) * 0.08;
    let metal = 0.08;
    let hgt = 0.5 + bevel * 0.12;
    // faint wear streaks along v
    const streak = Math.pow(vnoise2(u, v, 60, 3, seed + 21), 2.4);
    lum *= 1 - streak * 0.08;
    rg += streak * 0.08;
    // grime pooled toward the seams
    const grime = clamp01(1 - ed / 0.025) * fbm(u, v, { octaves: 3, freq: 16, seed: seed + 5 });
    lum *= 1 - grime * 0.16;
    rg += grime * 0.15;
    const pu = (u - cu[a]) / (cu[a + 1] - cu[a]);
    const pv = (v - cv[b]) / (cv[b + 1] - cv[b]);
    if (feature[k] === "louvre" && pu > 0.2 && pu < 0.8 && pv > 0.3 && pv < 0.7) {
      // horizontal slats: dark slots between raised lips
      const s = (pv - 0.3) / 0.4;
      const ph = (s * 7) % 1;
      if (ph < 0.55) {
        lum *= 0.5;
        hgt -= 0.2;
        rg = 0.75;
      } else {
        hgt += 0.06;
      }
    } else if (feature[k] === "inset") {
      // recessed rectangle with a bright rim
      const ru = Math.min(pu - 0.18, 0.82 - pu);
      const rv = Math.min(pv - 0.18, 0.82 - pv);
      const rd = Math.min(ru, rv);
      if (rd > 0 && rd < 0.04) {
        lum *= 0.72;
        hgt -= 0.14;
      } else if (rd >= 0.04) {
        lum *= 0.94;
        hgt -= 0.06;
      }
    } else if (feature[k] === "stencil" && pu > 0.3 && pu < 0.7 && pv > 0.42 && pv < 0.58) {
      // faded dark stencil band (two bars)
      const s = (pu - 0.3) / 0.4;
      const bar = (s * 4) % 1;
      if (bar < 0.5) lum *= 0.62;
    }
    // seam gap: dark, deep, rough
    lum *= 1 - seam * 0.5;
    hgt -= seam * 0.3;
    rg += seam * 0.2;
    // scratches to bare metal
    const sc = worley(u, v, 9, seed + 7);
    if (sc < 0.004) {
      const kk = 1 - sc / 0.004;
      lum += kk * 0.12;
      metal = lerp(metal, 0.5, kk);
    }
    t.setColor(i, lum * 0.99, lum, lum * 1.03);
    t.rough[i] = clamp01(rg);
    t.metal[i] = clamp01(metal);
    t.height[i] = hgt;
  });
  const set = t.bake({ normalStrength: 2.0 });
  set.metalnessMap = set.roughnessMap;
  return set;
}
