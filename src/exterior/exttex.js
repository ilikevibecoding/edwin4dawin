// Exterior-only procedural textures and materials (registered on the shared material library with
// the `ext_` prefix, created once). The worn armour set adds scratches, soot streaks, rivet lines and
// a finer sub-plate cut than the shared hull plate, so plates next to each other do not repeat the
// same tile.
import * as THREE from "three";
import { TexGen, mulberry32, fbm, vnoise, vnoise2 } from "../textures.js";

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

/** Worn armour plate: finer irregular sub-plates, scratches, soot streaks trailing aft (+v), rivets. */
export function makeExtHullWorn(size = 512, seed = 211) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const cols = 3 + Math.floor(rand() * 2);
  const cuts = [0];
  for (let i = 1; i < cols; i++) cuts.push(i / cols + (rand() - 0.5) * 0.08);
  cuts.push(1);
  const rowCuts = cuts.slice(0, cols).map(() => {
    const n = 2 + Math.floor(rand() * 2);
    const r = [0];
    for (let k = 1; k < n; k++) r.push(k / n + (rand() - 0.5) * 0.1);
    r.push(1);
    return r;
  });
  const scratches = [];
  for (let i = 0; i < 34; i++) {
    const a = rand() < 0.6 ? Math.PI / 2 + (rand() - 0.5) * 0.5 : rand() * Math.PI;
    scratches.push({ x: rand(), y: rand(), dx: Math.cos(a), dy: Math.sin(a), len: 0.08 + rand() * 0.35, w: 0.0015 + rand() * 0.0025, bright: rand() < 0.65 });
  }
  const streaks = [];
  for (let i = 0; i < 10; i++) streaks.push([rand(), rand() * 0.5, 0.2 + rand() * 0.5, 0.006 + rand() * 0.016]);
  const hatches = [];
  for (let i = 0; i < 3; i++) hatches.push([rand(), rand(), 0.03 + rand() * 0.04]);
  t.each((u, v, i) => {
    let col = 0;
    while (u > cuts[col + 1]) col++;
    const rc = rowCuts[col];
    let row = 0;
    while (v > rc[row + 1]) row++;
    const pu = (u - cuts[col]) / (cuts[col + 1] - cuts[col]);
    const pv = (v - rc[row]) / (rc[row + 1] - rc[row]);
    const ed = Math.min(pu, 1 - pu, pv, 1 - pv);
    const edTile = Math.min(u, 1 - u, v, 1 - v);
    const n1 = fbm(u, v, { octaves: 4, freq: 5, seed });
    const n2 = fbm(u, v, { octaves: 5, freq: 20, seed: seed + 3 });
    const plateTone = (vnoise(col * 0.41 + 0.17, row * 0.57 + 0.23, 3, seed + 9) - 0.5) * 0.1;
    let lum = 0.77 + plateTone + (n1 - 0.5) * 0.06 + (n2 - 0.5) * 0.04;
    let rough = 0.6 + (n2 - 0.5) * 0.2;
    let metal = 0.22 + (n1 - 0.5) * 0.15;
    let hgt = 0.55;
    // seams: sub-plate hairline, wider at the tile border (plate edge) with a bevel
    const seam = edTile < 0.02 ? 0.02 : 0.009;
    const e = edTile < 0.02 ? edTile : ed;
    if (e < seam) {
      const k = smooth(1 - e / seam);
      hgt -= 0.42 * k;
      lum *= 1 - 0.5 * k;
      rough += 0.25 * k;
      metal = lerp(metal, 0.1, k);
    }
    // rivet line just inside each sub-plate edge
    if (Math.abs(ed - 0.028) < 0.006) {
      const nearU = Math.min(pu, 1 - pu) < Math.min(pv, 1 - pv); // nearest edge runs along v
      const along = nearU ? pv : pu;
      const cell = Math.abs(((along * 18) % 1) - 0.5);
      if (cell < 0.16) {
        hgt += 0.12;
        lum *= 0.92;
        metal += 0.2;
      }
    }
    // grime pooling near seams + soot trailing aft (+v) with vertical streaking
    const grime = clamp01(1 - ed / 0.07) * (0.4 + 0.6 * fbm(u, v, { octaves: 3, freq: 9, seed: seed + 11 }));
    lum *= 1 - grime * 0.22;
    rough += grime * 0.15;
    const soot = smooth(clamp01((v - 0.35) / 0.65)) * (0.5 + 0.5 * vnoise2(u, v, 24, 3, seed + 5));
    lum *= 1 - soot * 0.16;
    rough += soot * 0.1;
    for (const [sx, sy, sl, sw] of streaks) {
      const dx = Math.abs(u - sx);
      if (dx < sw && v > sy && v < sy + sl) {
        const k = (1 - dx / sw) * (1 - (v - sy) / sl) * 0.55;
        lum *= 1 - k * 0.32;
        rough += k * 0.1;
      }
    }
    // scratches: bare-metal bright hairlines (or dark gouges)
    for (const s of scratches) {
      const rx = u - s.x;
      const ry = v - s.y;
      const along = rx * s.dx + ry * s.dy;
      if (along < 0 || along > s.len) continue;
      const perp = Math.abs(rx * s.dy - ry * s.dx);
      if (perp < s.w) {
        const k = (1 - perp / s.w) * (1 - along / s.len);
        if (s.bright) {
          lum = lerp(lum, 0.95, k * 0.8);
          metal = lerp(metal, 0.75, k);
          rough = lerp(rough, 0.3, k);
        } else lum *= 1 - k * 0.35;
        hgt -= 0.08 * k;
      }
    }
    // small round hatches / ports
    for (const [hx, hy, hr] of hatches) {
      const d = Math.hypot(u - hx, v - hy);
      if (d < hr) {
        const k = smooth(clamp01((hr - d) / (hr * 0.35)));
        hgt -= 0.12 * k;
        lum *= 1 - 0.18 * k;
        if (d > hr * 0.82) {
          hgt += 0.1;
          lum *= 0.8;
        }
      }
    }
    // chipped paint near seams
    const chip = fbm(u, v, { octaves: 5, freq: 36, seed: seed + 17 });
    if (chip > 0.7 && ed < 0.18) {
      const k = clamp01((chip - 0.7) * 8);
      lum *= 1 - k * 0.3;
      metal = lerp(metal, 0.6, k);
      rough -= k * 0.2;
    }
    t.setColor(i, lum * 0.98, lum, lum * 1.03);
    t.rough[i] = clamp01(rough);
    t.metal[i] = clamp01(metal);
    t.height[i] = hgt;
  });
  const set = t.bake({ normalStrength: 2.4 });
  set.metalnessMap = set.roughnessMap;
  return set;
}

/** Register the exterior-only materials once on the shared library. */
export function ensureExtMaterials(materials) {
  if (materials.ext_hullWorn) return materials;
  // dim warm emitter for hatch rims / access-port lamps (the shared exteriorLight is too bright for ~4 m hatches)
  materials.ext_dimLight = new THREE.MeshStandardMaterial({ color: 0x0c0a08, emissive: new THREE.Color("#ffd39a"), emissiveIntensity: 1.1, roughness: 0.7, metalness: 0, fog: false });
  // superstructure / bridge window panes: same warm white as exteriorLight at about half the
  // intensity, so rows of 0.8 × 1.6 m panes read as lit rooms rather than blooming runway lights
  materials.ext_window = materials.exteriorLight.clone();
  materials.ext_window.emissiveIntensity = 1.4;
  materials.ext_window.color = new THREE.Color(0x0a0c10);
  const worn = makeExtHullWorn(512, 211);
  materials.ext_hullWorn = new THREE.MeshStandardMaterial({
    map: worn.map,
    roughnessMap: worn.roughnessMap,
    metalnessMap: worn.metalnessMap,
    normalMap: worn.normalMap,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughness: 1,
    metalness: 1,
    vertexColors: true,
    color: 0xffffff,
    envMapIntensity: 0.5,
    fog: false,
  });
  return materials;
}
