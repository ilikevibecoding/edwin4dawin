// Exterior-only procedural textures and materials (registered on the shared material library with
// the `ext_` prefix, created once). The worn armour set adds scratches, soot streaks, rivet lines and
// a finer sub-plate cut than the shared hull plate, so plates next to each other do not repeat the
// same tile.
import * as THREE from "three";
import { TexGen, mulberry32, fbm, vnoise, vnoise2, makeCanvas, toTexture } from "../textures.js";

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

/**
 * Soft soot streaks for the plate textures: `n` streaks trailing aft (+v), each split into 1–3
 * segments offset sideways a little, with a smoothstep profile across the width, tapered ends and a
 * per-segment strength of 0.15–0.35 (as a multiply on the albedo). Returns the segment list;
 * streakFactor() evaluates it at a texel. Replaces the old hard-edged uniform strips.
 *
 * The streaks draw from a private stream seeded by the texture's first draw, and the rest of the old
 * generator's `legacyDraws` are burnt, so the scratches, rivets and scorch panels laid down after the
 * streaks keep their places in the tile.
 */
function softStreaks(rand, n, legacyDraws) {
  const sub = mulberry32(Math.floor(rand() * 4294967296));
  for (let i = 1; i < legacyDraws; i++) rand();
  const segs = [];
  for (let i = 0; i < n; i++) {
    const x = sub();
    const y0 = sub() * 0.5;
    const len = 0.2 + sub() * 0.5;
    const hw = 0.008 + sub() * 0.018;
    const parts = 1 + Math.floor(sub() * 3);
    let y = y0;
    for (let p = 0; p < parts; p++) {
      const l = (len / parts) * (0.8 + sub() * 0.5);
      segs.push({ x: x + (sub() - 0.5) * hw * 1.2, y0: y, len: l, hw: hw * (0.75 + sub() * 0.5), k: 0.15 + sub() * 0.2 });
      y += l * (0.85 + sub() * 0.2);
    }
  }
  return segs;
}
function streakFactor(u, v, segs) {
  let f = 1;
  for (const s of segs) {
    const dv = v - s.y0;
    if (dv < 0 || dv > s.len) continue;
    const du = Math.abs(u - s.x);
    if (du >= s.hw) continue;
    const across = smooth(1 - du / s.hw);
    const t = dv / s.len;
    const along = smooth(clamp01(t / 0.12)) * (1 - smooth(clamp01((t - 0.45) / 0.55)));
    f *= 1 - across * along * s.k;
  }
  return f;
}

/** Metres covered by one trench-wall tile (16 panels of 3 m). */
export const TRENCH_TILE = 48;

/**
 * Trench inner wall: 3 m panels in staggered rows with recessed seams, every third or so set back and
 * darker, vertical grime, and sparse 0.8 m window strips (about 5 % of the panels lit) on an emissive
 * map. Base tone is a dark warm-neutral grey so the wall reads as a wall behind the machinery, not a
 * void. Tile = TRENCH_TILE metres.
 */
export function makeExtTrenchWall(size = 512, seed = 223) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const n = TRENCH_TILE / 3; // panels per tile
  const rowOff = [];
  for (let r = 0; r < n; r++) rowOff.push(rand() < 0.5 ? 0 : 0.5);
  t.each((u, v, i) => {
    const row = Math.min(n - 1, Math.floor(v * n));
    const su = u * n + rowOff[row];
    const col = Math.floor(su) % n;
    const uu = su - Math.floor(su);
    const vv = v * n - row;
    const ed = Math.min(uu, 1 - uu, vv, 1 - vv);
    const batch = (vnoise(col * 0.37 + 0.11, row * 0.53 + 0.29, 3, seed + 9) - 0.5) * 0.07;
    let lum = 0.31 + batch + (fbm(u, v, { octaves: 4, freq: 6, seed }) - 0.5) * 0.04;
    let rough = 0.84;
    let hgt = 0.55;
    const seam = 0.06;
    if (ed < seam) {
      const k = smooth(1 - ed / seam);
      hgt -= 0.36 * k;
      lum *= 1 - 0.45 * k;
      rough += 0.1 * k;
    } else if (vnoise(col * 0.71 + 0.13, row * 0.37 + 0.41, 5, seed + 3) > 0.66) {
      // set-back panel
      hgt -= 0.2;
      lum *= 0.8;
    }
    // vertical grime runs
    const streak = fbm(u * 3, v * 0.25, { octaves: 3, freq: 9, seed: seed + 5 });
    lum *= 1 - 0.14 * smooth(clamp01((streak - 0.55) * 3));
    t.setColor(i, lum * 0.97, lum, lum * 1.06);
    t.rough[i] = clamp01(rough);
    t.metal[i] = 0.08;
    t.height[i] = hgt;
  });
  const set = t.bake({ normalStrength: 2.0 });
  set.metalnessMap = set.roughnessMap;
  // emissive window strips: 0.8 × 0.5 m panes in short runs on ~5 % of the panels
  const ec = makeCanvas(size, size);
  const ctx = ec.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  const ppm = size / TRENCH_TILE;
  const cellPx = size / n;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (rand() > 0.05) continue;
      const x0 = ((((c - rowOff[r]) % n) + n) % n) * cellPx;
      const y = r * cellPx + cellPx * 0.42;
      const run = 1 + Math.floor(rand() * 3);
      const k = rand();
      ctx.fillStyle = k < 0.8 ? "#ffe2b8" : k < 0.93 ? "#9fc8ff" : "#ffb070";
      for (let w = 0; w < run; w++) ctx.fillRect(x0 + (0.35 + w * 1.15) * ppm, y, 0.8 * ppm, 0.5 * ppm);
    }
  }
  set.emissiveMap = toTexture(ec, { srgb: true, anisotropy: 4 });
  return set;
}

/**
 * Engine exhaust disc: radial gradient, desaturated bright core → mid blue → transparent rim, so the
 * bells read as a hot throat with falloff instead of a flat saturated disc.
 */
export function makeExtEngineGlow(size = 256) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // #e0f4ff core → #4a8dff mid → transparent, each pulled 30 % toward grey
  g.addColorStop(0, "rgba(232,246,255,1)");
  g.addColorStop(0.22, "rgba(190,222,255,0.98)");
  g.addColorStop(0.5, "rgba(112,160,240,0.85)");
  g.addColorStop(0.78, "rgba(80,120,200,0.4)");
  g.addColorStop(1, "rgba(60,90,160,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return toTexture(c, { srgb: true, wrap: false });
}

/**
 * Clean armour plate, one tile per plate instance: 2–3 × 2–3 sub-panels with hairline seams, a
 * rectangular tone shift per sub-panel (a few noticeably darker / lighter panels, aligned to the
 * grid), one or two long panel lines along v (fore-aft on the hull) with rivet rows beside them,
 * rivet rows inside the sub-panel edges, grime pooling at the seams and faint fore-aft streaking.
 * All the relief is in the normal / roughness maps; the plate geometry itself stays a flat slab. No
 * round ports: at one tile per plate they repeated as identical blobs across the whole hull.
 */
export function makeExtHullPlate(size = 512, seed = 241) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const cols = 2 + Math.floor(rand() * 2);
  const cuts = [0];
  for (let i = 1; i < cols; i++) cuts.push(i / cols + (rand() - 0.5) * 0.1);
  cuts.push(1);
  const rowCuts = cuts.slice(0, cols).map(() => {
    const n = 2 + Math.floor(rand() * 2);
    const r = [0];
    for (let k = 1; k < n; k++) r.push(k / n + (rand() - 0.5) * 0.1);
    r.push(1);
    return r;
  });
  const lines = [];
  for (let i = 0, n = 1 + Math.floor(rand() * 2); i < n; i++) lines.push(0.15 + rand() * 0.7);
  const streaks = softStreaks(rand, 6, 32);
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
    const n2 = fbm(u, v, { octaves: 5, freq: 22, seed: seed + 3 });
    // rectangular discolouration aligned to the sub-panel grid: batch tone ±6 %, ~12 % of panels a
    // step darker (primer) and ~5 % a step lighter (replacement)
    const batch = vnoise(col * 0.41 + 0.17, row * 0.57 + 0.23, 3, seed + 9);
    const pick = vnoise(col * 0.73 + 0.31, row * 0.29 + 0.61, 5, seed + 13);
    let lum = 0.78 + (batch - 0.5) * 0.12 + (pick > 0.88 ? -0.1 : pick < 0.05 ? 0.06 : 0) + (n1 - 0.5) * 0.05 + (n2 - 0.5) * 0.03;
    let rough = 0.66 + (n2 - 0.5) * 0.14;
    let metal = 0.16 + (n1 - 0.5) * 0.1;
    let hgt = 0.55;
    // hairline sub-panel seams; the tile border (the plate edge) is a wider bevelled seam
    const seamW = edTile < 0.016 ? 0.016 : 0.006;
    const e = edTile < 0.016 ? edTile : ed;
    if (e < seamW) {
      const k = smooth(1 - e / seamW);
      hgt -= 0.35 * k;
      lum *= 1 - 0.4 * k;
      rough += 0.2 * k;
      metal = lerp(metal, 0.08, k);
    }
    // long panel lines along v (shallow grooves) with a rivet row beside each
    for (const lx of lines) {
      const d = Math.abs(u - lx);
      if (d < 0.0045) {
        const k = smooth(1 - d / 0.0045);
        hgt -= 0.22 * k;
        lum *= 1 - 0.24 * k;
        rough += 0.1 * k;
      }
      if (Math.abs(u - lx - 0.016) < 0.0035 && Math.abs(((v * 40) % 1) - 0.5) < 0.14) {
        hgt += 0.1;
        lum *= 0.94;
        metal += 0.15;
      }
    }
    // rivet rows just inside each sub-panel edge
    if (Math.abs(ed - 0.024) < 0.0045) {
      const nearU = Math.min(pu, 1 - pu) < Math.min(pv, 1 - pv);
      const along = nearU ? pv : pu;
      if (Math.abs(((along * 22) % 1) - 0.5) < 0.14) {
        hgt += 0.1;
        lum *= 0.93;
        metal += 0.15;
      }
    }
    // grime pooling at the seams, fore-aft (+v) soot and a few rain-style streaks
    const grime = clamp01(1 - ed / 0.06) * (0.4 + 0.6 * fbm(u, v, { octaves: 3, freq: 9, seed: seed + 11 }));
    lum *= 1 - grime * 0.16;
    rough += grime * 0.12;
    const soot = smooth(clamp01((v - 0.45) / 0.55)) * (0.4 + 0.6 * vnoise2(u, v, 20, 3, seed + 5));
    lum *= 1 - soot * 0.09;
    rough += soot * 0.08;
    const sf = streakFactor(u, v, streaks);
    lum *= 1 - (1 - sf) * 0.7;
    rough += (1 - sf) * 0.25;
    t.setColor(i, lum * 0.985, lum, lum * 1.02);
    t.rough[i] = clamp01(rough);
    t.metal[i] = clamp01(metal);
    t.height[i] = hgt;
  });
  const set = t.bake({ normalStrength: 2.2 });
  set.metalnessMap = set.roughnessMap;
  return set;
}

/** Soft radial dot for the navigation-light glow points. */
export function makeExtNavGlow(size = 64) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,255,255,0.7)");
  g.addColorStop(0.5, "rgba(255,255,255,0.16)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return toTexture(c, { srgb: true, wrap: false });
}

/**
 * Soot-streak decal mask, four variants side by side (u = variant/4 … (variant+1)/4, v along the
 * streak from its source at v = 0 to the tail at v = 1). Mask in the red channel: smoothstep across
 * the width, a quick fade-in at the source and a long taper to the tail, two or three denser lanes
 * and mottling along the length — no hard edge anywhere.
 */
export function makeExtStreakMask(size = 256, variants = 4, seed = 271) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  const colW = size / variants;
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const k = Math.floor(x / colW);
      const u = ((x % colW) + 0.5) / colW;
      const across = smooth(clamp01((1 - Math.abs(2 * u - 1)) / 0.85));
      const tail = 0.4 + 0.12 * k;
      const along = smooth(clamp01(v / 0.14)) * (1 - smooth(clamp01((v - tail) / (1 - tail))));
      const lanes = 0.5 + 0.5 * vnoise2(u + k * 0.37, v, 3, 12, seed + k * 7);
      const mott = 0.7 + 0.3 * fbm(u * 0.25 + k * 0.25, v, { octaves: 3, freq: 6, seed: seed + 3 + k });
      const a = Math.round(clamp01(across * along * lanes * mott) * 255);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = a;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: false, wrap: false, anisotropy: 4 });
}

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
  const streaks = softStreaks(rand, 8, 40);
  // rectangular scorch patches aligned to the sub-panel grid (instead of round ports)
  const scorch = [];
  for (let i = 0; i < 3; i++) scorch.push([Math.floor(rand() * cols), Math.floor(rand() * 3), 0.5 + rand() * 0.4]);
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
    const sf = streakFactor(u, v, streaks);
    lum *= sf;
    rough += (1 - sf) * 0.3;
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
    // scorched sub-panels: a whole panel (or its aft part) a step darker, edges following the seams
    for (const [sc, sr, sk] of scorch) {
      if (col === sc && row === sr % rc.length && pv > 1 - sk) lum *= 0.86 - 0.08 * smooth(clamp01((pv - (1 - sk)) / sk));
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
  // superstructure / bridge window panes: the exteriorLight warm white at 0.85 (sparse clustered panes
  // must read as lit rooms, not as strips), and the emissive takes the per-instance tint so a run of
  // panes can mix ~15 % amber and ~15 % cool panes from one instanced mesh
  materials.ext_window = materials.exteriorLight.clone();
  materials.ext_window.emissiveIntensity = 0.85;
  materials.ext_window.color = new THREE.Color(0x0a0c10);
  materials.ext_window.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\n#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )\n\ttotalEmissiveRadiance *= vColor.rgb;\n#endif\n",
    );
  };
  materials.ext_window.customProgramCacheKey = () => "ext_window_tint";
  // docking-bay rim: exteriorLight at 0.3× so the bay reads as a lit opening, not a glare sprite
  materials.ext_dockLight = materials.exteriorLight.clone();
  materials.ext_dockLight.emissiveIntensity = 0.9;
  // painted-armour finish shared with the hull sets: matte (roughness ≥ 0.7 after the map, metalness
  // ≤ 0.35 after the map) and almost no environment reflection
  const armour = (set, normalScale) =>
    new THREE.MeshStandardMaterial({
      map: set.map,
      roughnessMap: set.roughnessMap,
      metalnessMap: set.metalnessMap,
      normalMap: set.normalMap,
      normalScale: new THREE.Vector2(normalScale, normalScale),
      roughness: 1.3,
      metalness: 0.9,
      vertexColors: true,
      color: 0xffffff,
      envMapIntensity: 0.18,
      fog: false,
    });
  // the plate field: one 512² set (its relief — panel lines, rivets, seams — is textural, so the
  // plate geometry can stay flat); the bridge slab and the stern plating share it
  materials.ext_hullPlate = armour(makeExtHullPlate(512, 241), 1.0);
  materials.ext_hullWorn = armour(makeExtHullWorn(512, 211), 1.0);
  const wall = makeExtTrenchWall(512, 223);
  materials.ext_trenchWall = new THREE.MeshStandardMaterial({
    map: wall.map,
    roughnessMap: wall.roughnessMap,
    metalnessMap: wall.metalnessMap,
    normalMap: wall.normalMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 1,
    metalness: 1,
    emissive: 0xffffff,
    emissiveMap: wall.emissiveMap,
    emissiveIntensity: 1.3,
    color: 0xffffff,
    envMapIntensity: 0.15,
    fog: false,
  });
  // engine exhaust: gradient disc recessed in the throat (normal blending so the dark bell shows
  // through the rim) + a faint additive bloom disc just outside the mouth
  const glowTex = makeExtEngineGlow(256);
  materials.ext_engineGlow = new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(1.6, 1.6, 1.6), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: true });
  materials.ext_engineBloom = new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color("#6f9fe6"), transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  // the bloom fades with the view angle (× max(0, dot(dir to camera, +z exhaust axis))): face-on from
  // astern it is the halo, from the dorsal quarter it vanishes instead of outlining the stern in blue
  materials.ext_engineBloom.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vBloomFade;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n\tvec4 bloomWP = modelMatrix * vec4( position, 1.0 );\n\tvBloomFade = max( 0.0, normalize( cameraPosition - bloomWP.xyz ).z );");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vBloomFade;")
      .replace("#include <color_fragment>", "#include <color_fragment>\n\tdiffuseColor.a *= vBloomFade;");
  };
  materials.ext_engineBloom.customProgramCacheKey = () => "ext_engineBloom_fade";
  // navigation lights: an unshaded lamp block coloured per instance (HDR instance colours, so the
  // lamp itself tone-maps to a bright core instead of a sun-shaded coloured cube) plus one additive
  // glow point per lamp (PointsMaterial: size in metres, one draw call for the whole set)
  materials.ext_navLamp = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, fog: false });
  materials.ext_navGlow = new THREE.PointsMaterial({ map: makeExtNavGlow(64), size: 3.6, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, fog: false });
  // soot-streak decals over the plating: instanced planes with the streak mask, multiplied onto the
  // plates (dst × (1 − mask × k)); k = instance colour .r (0.15–0.35), mask variant = .g (0, ¼, ½, ¾).
  // three ≥ r17x only multiplies with premultipliedAlpha (DST_COLOR, ONE_MINUS_SRC_ALPHA); alpha is
  // written as 1 so that is a pure multiply
  materials.ext_streak = new THREE.MeshBasicMaterial({ map: makeExtStreakMask(256, 4, 271), color: 0xffffff, transparent: true, premultipliedAlpha: true, depthWrite: false, blending: THREE.MultiplyBlending, side: THREE.DoubleSide, vertexColors: true, fog: false });
  materials.ext_streak.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <uv_vertex>", "#include <uv_vertex>\n#ifdef USE_INSTANCING_COLOR\n\tvMapUv.x = vMapUv.x * 0.25 + instanceColor.g;\n#endif\n");
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", "\tdiffuseColor.rgb = vec3( 1.0 - diffuseColor.r * vColor.r );\n\tdiffuseColor.a = 1.0;\n");
  };
  materials.ext_streak.customProgramCacheKey = () => "ext_streak_multiply";
  return materials;
}
