import * as THREE from 'three';

/**
 * Procedural canvas textures for the arms: knit glove back, black synthetic leather, glove cuff with
 * grey trim, forearm skin and a desert-camo sleeve. Each returns { map, normalMap, roughnessMap? }.
 * Normal maps are derived from a height field with a Sobel filter so albedo and relief always agree.
 */

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

/** Deterministic hash noise in [0,1). */
function hash(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Tileable value noise on a size×size grid, `cells` cells per tile. */
function valueNoise(size, cells, seed) {
  const out = new Float32Array(size * size);
  const g = new Float32Array(cells * cells);
  for (let i = 0; i < cells * cells; i++) g[i] = hash(i % cells, Math.floor(i / cells), seed);
  const sm = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    const fy = (y / size) * cells;
    const y0 = Math.floor(fy);
    const ty = sm(fy - y0);
    const y1 = (y0 + 1) % cells;
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells;
      const x0 = Math.floor(fx);
      const tx = sm(fx - x0);
      const x1 = (x0 + 1) % cells;
      const a = g[y0 * cells + x0];
      const b = g[y0 * cells + x1];
      const c = g[y1 * cells + x0];
      const d = g[y1 * cells + x1];
      out[y * size + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
  }
  return out;
}

function fbm(size, baseCells, octaves, seed, gain = 0.5) {
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = valueNoise(size, baseCells << o, seed + o * 17);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    total += amp;
    amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** Height field (0..1, tileable) → tangent-space normal map canvas. */
function normalFromHeight(height, size, strength) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      d[o] = 128 + (-dx / l) * 127;
      d[o + 1] = 128 + (dy / l) * 127;
      d[o + 2] = 128 + (1 / l) * 127;
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function paint(size, fn) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const col = [0, 0, 0];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      fn(x, y, col);
      const o = (y * size + x) * 4;
      d[o] = Math.max(0, Math.min(255, col[0]));
      d[o + 1] = Math.max(0, Math.min(255, col[1]));
      d[o + 2] = Math.max(0, Math.min(255, col[2]));
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const mix = (a, b, t) => a + (b - a) * t;

/** Olive knit: columns of V-shaped stitches (wales) with row structure (courses). Tile ≈ 14 mm. */
export function makeKnit(assets) {
  const size = 256;
  const wales = 5; // stitch columns per tile (~2.8 mm each)
  const courses = 8; // stitch rows per tile
  const height = new Float32Array(size * size);
  const noise = fbm(size, 4, 3, 11);
  const fibre = valueNoise(size, 64, 5);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // the rib runs slightly diagonally across the back of the hand (like the reference glove)
      const u = ((x + y * 0.3) / size) * wales;
      const v = (y / size) * courses;
      const cu = u - Math.floor(u) - 0.5; // -0.5..0.5 across the wale
      const cv = v - Math.floor(v); // 0..1 along the course
      // Two legs of the V: ridges at cu = ±(0.25 - 0.2*cv) → a chevron per stitch
      const leg = Math.abs(Math.abs(cu) - (0.32 - 0.22 * cv));
      const ridge = Math.max(0, 1 - leg / 0.16);
      const seam = 1 - Math.pow(Math.abs(cu) / 0.5, 6); // valley between wales
      let h = ridge * 0.7 * seam + 0.15 * seam;
      h += (fibre[y * size + x] - 0.5) * 0.12;
      h *= 0.85 + 0.3 * noise[y * size + x];
      height[y * size + x] = h;
    }
  }
  const map = paint(size, (x, y, c) => {
    const h = height[y * size + x];
    const n = noise[y * size + x];
    const f = fibre[y * size + x];
    // grey-olive (sage) yarn: lit ridges, dark valleys — calibrated against the MW2019 reference
    const base = 0.45 + h * 0.95 + (n - 0.5) * 0.25 + (f - 0.5) * 0.15;
    c[0] = 134 * base + 8;
    c[1] = 138 * base + 8;
    c[2] = 110 * base + 6;
  });
  const opts = { srgb: true, anisotropy: true };
  const mapTex = assets.canvasTexture(map, opts);
  const normalTex = assets.canvasTexture(normalFromHeight(height, size, 6.0), { srgb: false, anisotropy: true });
  return { map: mapTex, normalMap: normalTex };
}

/** Black synthetic leather with a fine pebbled grain and faint stitched panel lines. Tile ≈ 30 mm. */
export function makeLeather(assets) {
  const size = 256;
  const grain = fbm(size, 24, 3, 21, 0.55);
  const macro = fbm(size, 3, 2, 22);
  const pebble = valueNoise(size, 48, 23);
  const height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) {
    const p = Math.pow(pebble[i], 1.4);
    height[i] = 0.45 * p + 0.4 * grain[i] + 0.15 * macro[i];
  }
  const map = paint(size, (x, y, c) => {
    const h = height[y * size + x];
    const m = macro[y * size + x];
    const v = 16 + h * 18 + (m - 0.5) * 8;
    c[0] = v;
    c[1] = v + 0.5;
    c[2] = v + 2;
  });
  const rough = paint(size, (x, y, c) => {
    const h = height[y * size + x];
    const r = 120 + h * 70 + (macro[y * size + x] - 0.5) * 40;
    c[0] = c[1] = c[2] = r;
  });
  return {
    map: assets.canvasTexture(map, { srgb: true }),
    normalMap: assets.canvasTexture(normalFromHeight(height, size, 3.2), { srgb: false }),
    roughnessMap: assets.canvasTexture(rough, { srgb: false }),
  };
}

/**
 * Glove cuff: black synthetic wrist with a light grey trim stripe, a stitched hem and a hook-and-loop strap.
 * u wraps around the wrist (4 repeats), v runs from the forearm end (0) to the hand (1).
 */
export function makeCuff(assets) {
  const size = 256;
  const grain = fbm(size, 20, 3, 31, 0.55);
  const height = new Float32Array(size * size);
  const weave = valueNoise(size, 96, 32);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      let h = 0.4 + grain[y * size + x] * 0.35 + (weave[y * size + x] - 0.5) * 0.2;
      // elastic ribbing in the trim band
      const inBand = v > 0.08 && v < 0.19;
      if (inBand) h = 0.5 + 0.3 * Math.sin(u * Math.PI * 2 * 26) + (weave[y * size + x] - 0.5) * 0.1;
      // stitched hem rows
      const hem = Math.abs(v - 0.07) < 0.01 || Math.abs(v - 0.2) < 0.01 || Math.abs(v - 0.92) < 0.012;
      if (hem) h += 0.25 * Math.max(0, Math.sin(u * Math.PI * 2 * 60));
      // strap: raised panel
      const strap = v > 0.5 && v < 0.8 && ((u > 0.05 && u < 0.62) || u > 0.95);
      if (strap) h += 0.35 + (weave[y * size + x] - 0.5) * 0.15;
      height[y * size + x] = h;
    }
  }
  const map = paint(size, (x, y, c) => {
    const u = x / size;
    const v = y / size;
    const h = height[y * size + x];
    const g = grain[y * size + x];
    let r = 18 + g * 14;
    let gg = r + 1;
    let b = r + 3;
    if (v > 0.08 && v < 0.19) {
      // light grey elastic trim
      const t = 112 + (h - 0.5) * 60 + (g - 0.5) * 20;
      r = t;
      gg = t + 2;
      b = t + 2;
    }
    const hem = Math.abs(v - 0.07) < 0.01 || Math.abs(v - 0.2) < 0.01 || Math.abs(v - 0.92) < 0.012;
    if (hem) {
      const stitch = Math.max(0, Math.sin(u * Math.PI * 2 * 60));
      r += stitch * 55;
      gg += stitch * 50;
      b += stitch * 45;
    }
    const strap = v > 0.5 && v < 0.8 && ((u > 0.05 && u < 0.62) || u > 0.95);
    if (strap) {
      r += 10 + (h - 0.6) * 20;
      gg += 10 + (h - 0.6) * 20;
      b += 12 + (h - 0.6) * 20;
    }
    c[0] = r;
    c[1] = gg;
    c[2] = b;
  });
  const rough = paint(size, (x, y, c) => {
    const v = y / size;
    const g = grain[y * size + x];
    let r = 150 + g * 60;
    if (v > 0.08 && v < 0.19) r = 230;
    c[0] = c[1] = c[2] = r;
  });
  return {
    map: assets.canvasTexture(map, { srgb: true }),
    normalMap: assets.canvasTexture(normalFromHeight(height, size, 2.6), { srgb: false }),
    roughnessMap: assets.canvasTexture(rough, { srgb: false }),
  };
}

/** Forearm skin: warm tan with mottling, pores and faint veins. Tile ≈ 60 mm. */
export function makeSkin(assets) {
  const size = 256;
  const mottle = fbm(size, 3, 4, 41, 0.6);
  const pores = valueNoise(size, 96, 42);
  const fine = valueNoise(size, 180, 43);
  const height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) height[i] = 0.5 + (pores[i] - 0.5) * 0.35 + (fine[i] - 0.5) * 0.25 + (mottle[i] - 0.5) * 0.3;
  const map = paint(size, (x, y, c) => {
    const m = mottle[y * size + x];
    const p = pores[y * size + x];
    const t = (m - 0.5) * 0.35 + (p - 0.5) * 0.08;
    c[0] = 194 * (1 + t * 0.6);
    c[1] = 130 * (1 + t * 1.0) - 4;
    c[2] = 106 * (1 + t * 1.1) - 8;
  });
  const rough = paint(size, (x, y, c) => {
    const r = 140 + (mottle[y * size + x] - 0.5) * 60 + (pores[y * size + x] - 0.5) * 30;
    c[0] = c[1] = c[2] = r;
  });
  return {
    map: assets.canvasTexture(map, { srgb: true }),
    normalMap: assets.canvasTexture(normalFromHeight(height, size, 1.6), { srgb: false }),
    roughnessMap: assets.canvasTexture(rough, { srgb: false }),
  };
}

/**
 * Desert camo (3-colour blotch pattern in tans/browns) over a ripstop weave. Tile ≈ 180 mm.
 * The normal map carries the weave plus soft cloth wrinkles; the sleeve geometry adds the big folds.
 */
export function makeCamo(assets) {
  const size = 512;
  const blotchA = fbm(size, 4, 3, 51, 0.55);
  const blotchB = fbm(size, 7, 3, 52, 0.5);
  const blotchC = fbm(size, 14, 2, 53, 0.5);
  const dirt = fbm(size, 3, 4, 54, 0.6);
  const wrinkle = fbm(size, 5, 3, 55, 0.45);
  const height = new Float32Array(size * size);
  const weaveCells = 128; // ripstop grid
  // sun-faded desert pattern: light sand ground with low-contrast tan/brown blotches (see reference sleeve)
  const colours = {
    base: [214, 198, 162],
    light: [228, 216, 184],
    mid: [186, 166, 126],
    dark: [156, 134, 98],
    brown: [128, 106, 76],
  };
  const map = paint(size, (x, y, c) => {
    const i = y * size + x;
    const a = blotchA[i];
    const b = blotchB[i];
    const s = blotchC[i];
    let col = colours.base;
    if (a > 0.6) col = colours.mid;
    if (a > 0.72) col = colours.dark;
    if (b > 0.66 && a < 0.6) col = colours.light;
    if (s > 0.78 && a > 0.55) col = colours.brown;
    if (s < 0.3 && b < 0.4) col = colours.light;
    // weave: ripstop grid darkens along thread lines
    const wx = Math.abs(Math.sin((x / size) * Math.PI * weaveCells));
    const wy = Math.abs(Math.sin((y / size) * Math.PI * weaveCells));
    const weave = 0.9 + 0.1 * Math.min(wx, wy);
    const rip = (x % 16 === 0 || y % 16 === 0) ? 0.93 : 1;
    const d = 0.9 + dirt[i] * 0.2;
    const w = 0.96 + (wrinkle[i] - 0.5) * 0.14;
    const k = weave * rip * d * w;
    c[0] = col[0] * k;
    c[1] = col[1] * k;
    c[2] = col[2] * k;
    height[i] = 0.5 + (Math.min(wx, wy) - 0.5) * 0.25 + (wrinkle[i] - 0.5) * 0.9 + (rip < 1 ? 0.12 : 0);
  });
  const rough = paint(size, (x, y, c) => {
    const r = 215 + (dirt[y * size + x] - 0.5) * 40;
    c[0] = c[1] = c[2] = r;
  });
  return {
    map: assets.canvasTexture(map, { srgb: true }),
    normalMap: assets.canvasTexture(normalFromHeight(height, size, 2.2), { srgb: false }),
    roughnessMap: assets.canvasTexture(rough, { srgb: false }),
  };
}

/** Create all arm materials (MeshStandardMaterial so they take the cascaded shadows). */
export function createArmMaterials(assets) {
  const knitT = makeKnit(assets);
  const leatherT = makeLeather(assets);
  const cuffT = makeCuff(assets);
  const skinT = makeSkin(assets);
  const camoT = makeCamo(assets);

  const knit = new THREE.MeshStandardMaterial({
    name: 'arms_knit',
    map: knitT.map,
    normalMap: knitT.normalMap,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.55,
  });
  const leather = new THREE.MeshStandardMaterial({
    name: 'arms_leather',
    map: leatherT.map,
    normalMap: leatherT.normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: leatherT.roughnessMap,
    roughness: 0.62,
    metalness: 0.0,
    envMapIntensity: 0.9,
  });
  const cuff = new THREE.MeshStandardMaterial({
    name: 'arms_cuff',
    map: cuffT.map,
    normalMap: cuffT.normalMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: cuffT.roughnessMap,
    roughness: 0.75,
    metalness: 0,
    envMapIntensity: 0.7,
  });
  const skin = new THREE.MeshStandardMaterial({
    name: 'arms_skin',
    map: skinT.map,
    normalMap: skinT.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughnessMap: skinT.roughnessMap,
    roughness: 0.6,
    metalness: 0,
    envMapIntensity: 0.7,
  });
  const camo = new THREE.MeshStandardMaterial({
    name: 'arms_camo',
    map: camoT.map,
    normalMap: camoT.normalMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: camoT.roughnessMap,
    roughness: 0.95,
    metalness: 0,
    envMapIntensity: 0.5,
  });
  const all = [knit, leather, cuff, skin, camo];
  for (const m of all) {
    for (const key of ['map', 'normalMap', 'roughnessMap']) {
      const t = m[key];
      if (t) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = assets.anisotropy;
        t.needsUpdate = true;
      }
    }
  }
  return { knit, leather, cuff, skin, camo, all };
}
