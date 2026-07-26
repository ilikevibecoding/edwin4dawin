// Procedural PBR texture sets (Fable 3 domain). Every set is generated on canvases at load —
// no external assets. Color maps are sRGB, normal/roughness maps linear, all RepeatWrapping.
// Normal maps derive from procedural heightfields via a wrap-around Sobel filter, so every
// texture tiles seamlessly. Sets are cached by key; tint-only variants share one set and use
// material.color as the tint (color maps for those are near-white "variation" maps).
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Deterministic RNG + tileable noise
// ---------------------------------------------------------------------------
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (t) => t * t * (3 - 2 * t);

// Software rasterizers (SwiftShader in the QA pipeline) pay a heavy per-sample cost for
// anisotropic filtering; keep it modest. Real GPUs still get a useful improvement at 2.
export const ANISOTROPY = 1;

// Tileable value noise on an n×n lattice (u,v in [0,1) wrap).
function lattice(seed, n) {
  const rng = mulberry(seed);
  const g = new Float32Array(n * n);
  for (let i = 0; i < g.length; i++) g[i] = rng();
  return (u, v) => {
    let x = (u - Math.floor(u)) * n, y = (v - Math.floor(v)) * n;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = smooth(x - x0), fy = smooth(y - y0);
    const x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
    const a = g[y0 * n + x0], b = g[y0 * n + x1], c = g[y1 * n + x0], d = g[y1 * n + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

// Tileable fBm: octaves of value noise. Returns fn(u,v) -> ~[0,1].
export function fbm(seed, octaves = 4, baseCells = 4, gain = 0.55) {
  const layers = [];
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    layers.push({ n: lattice(seed * 7919 + o * 131, Math.min(256, baseCells << o)), amp });
    total += amp;
    amp *= gain;
  }
  return (u, v) => {
    let s = 0;
    for (const l of layers) s += l.n(u, v) * l.amp;
    return s / total;
  };
}

// ---------------------------------------------------------------------------
// Canvas + map plumbing
// ---------------------------------------------------------------------------
function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function texFromData(data, size, { srgb = false } = {}) {
  const c = makeCanvas(size);
  // Headless QA tools (nav-lab) run this in Node where ImageData doesn't exist; the pixels
  // only matter in the browser, so skip the blit there.
  if (typeof ImageData !== 'undefined') {
    c.getContext('2d').putImageData(new ImageData(data, size, size), 0, 0);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = ANISOTROPY;
  // Bilinear-within-nearest-mip halves the software-rasterizer sampling cost vs trilinear
  // with a barely visible mip transition; a worthwhile trade for the QA pipeline.
  t.minFilter = THREE.LinearMipmapNearestFilter;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// Wrap-around Sobel: heightfield (Float32Array, 0..1) -> tangent-space normal map.
export function normalFromHeight(h, size, strength = 1) {
  const out = new Uint8ClampedArray(size * size * 4);
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = at(x - 1, y - 1), t = at(x, y - 1), tr = at(x + 1, y - 1);
      const l = at(x - 1, y), r = at(x + 1, y);
      const bl = at(x - 1, y + 1), b = at(x, y + 1), br = at(x + 1, y + 1);
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      let nx = -dx * strength, ny = dy * strength, nz = 1; // +Y up in UV space (three convention)
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv; ny *= inv; nz *= inv;
      const i = (y * size + x) * 4;
      out[i] = (nx * 0.5 + 0.5) * 255;
      out[i + 1] = (ny * 0.5 + 0.5) * 255;
      out[i + 2] = (nz * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  return out;
}

/**
 * Generic tileable set generator.
 * pixel(u, v, put): called per texel; put({r,g,b} 0..255 | l luminance, h height 0..1, ro roughness 0..1)
 * Returns { map, normalMap, roughnessMap, size, tileM }.
 */
export function generateSet({ size = 512, tileM = 3, normalStrength = 2.0, pixel }) {
  const color = new Uint8ClampedArray(size * size * 4);
  const rough = new Uint8ClampedArray(size * size * 4);
  const height = new Float32Array(size * size);
  const px = { r: 200, g: 200, b: 200, h: 0.5, ro: 0.8 };
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      pixel(u, v, px);
      const i = (y * size + x) * 4;
      color[i] = px.r; color[i + 1] = px.g; color[i + 2] = px.b; color[i + 3] = 255;
      const rv = Math.max(0, Math.min(1, px.ro)) * 255;
      rough[i] = rv; rough[i + 1] = rv; rough[i + 2] = rv; rough[i + 3] = 255;
      height[y * size + x] = px.h;
    }
  }
  return {
    map: texFromData(color, size, { srgb: true }),
    normalMap: texFromData(normalFromHeight(height, size, normalStrength), size),
    roughnessMap: texFromData(rough, size),
    size, tileM,
  };
}

const gray = (px, l) => { px.r = px.g = px.b = l; };

// Distance to nearest grid line (u in tiles domain), for grout/seams. Returns 0 at line center.
function gridDist(t, lineHalf) {
  const f = t - Math.floor(t);
  const d = Math.min(f, 1 - f);
  return d - lineHalf;
}
// Stable per-cell hash 0..1
function cellHash(ix, iy, seed = 0) {
  let h = (ix * 374761393 + iy * 668265263 + seed * 962287) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Family generators (each returns a cached set). Near-white color maps expect
// material.color tinting; multi-hue maps bake color directly.
// ---------------------------------------------------------------------------
const cache = new Map();
function cached(key, make) {
  let s = cache.get(key);
  if (!s) { s = make(); cache.set(key, s); }
  return s;
}

// Painted drywall: orange-peel micro relief, roller undulation, sparse scuffs.
export function drywallSet() {
  return cached('drywall', () => {
    const peel = fbm(101, 3, 96, 0.55);
    const roll = fbm(102, 3, 4);
    const scuffN = fbm(103, 4, 6);
    return generateSet({
      size: 512, tileM: 3, normalStrength: 0.1,
      pixel(u, v, px) {
        const h = peel(u, v) * 0.7 + roll(u, v) * 0.3;
        const s = scuffN(u, v);
        const scuff = s > 0.78 ? (s - 0.78) * 1.4 : 0; // very faint darker patches
        gray(px, 238 - roll(u, v) * 4 - scuff * 12);
        px.h = h;
        px.ro = 0.84 + roll(u, v) * 0.05 + scuff * 0.05;
      },
    });
  });
}

// Trowelled plaster: broader sweeps, chalkier.
export function plasterSet() {
  return cached('plaster', () => {
    const sweep = fbm(111, 4, 6, 0.6);
    const fine = fbm(112, 3, 48, 0.5);
    return generateSet({
      size: 512, tileM: 3, normalStrength: 0.25,
      pixel(u, v, px) {
        const h = sweep(u, v) * 0.6 + fine(u, v) * 0.4;
        gray(px, 236 - sweep(u, v) * 7);
        px.h = h;
        px.ro = 0.88 + fine(u, v) * 0.05;
      },
    });
  });
}

// Acoustic ceiling tile: 0.6 m grid on a 2.4 m tile, fissured perforations.
export function acousticSet() {
  return cached('acoustic', () => {
    const fiss = fbm(121, 4, 110, 0.65);
    const blotch = fbm(122, 3, 4);
    return generateSet({
      // WP-012c: fissure/blotch amplitude reduced ~40% (was l-13 / blotch*6 / depth 0.18) —
      // audit flagged the speckle reading as dirt at 3 m in the lobby and open office.
      size: 512, tileM: 2.4, normalStrength: 0.5,
      pixel(u, v, px) {
        const gx = gridDist(u * 4, 0.006), gy = gridDist(v * 4, 0.006);
        const inGroove = Math.min(gx, gy) < 0;
        const f = fiss(u, v);
        const holes = f < 0.27; // fine fissure pits
        let l = 228 - blotch(u, v) * 4;
        let h = 0.7 + blotch(u, v) * 0.08;
        if (holes) { l -= 8; h -= 0.11; }
        if (inGroove) { l -= 34; h = 0.2; }
        gray(px, l);
        px.h = h;
        px.ro = 0.95;
      },
    });
  });
}

// Low-pile commercial carpet: heather speckle (luminance; tint via material.color).
export function carpetSet() {
  return cached('carpet', () => {
    const speck = fbm(131, 5, 48, 0.7);
    const tuft = fbm(132, 3, 96, 0.5);
    const broad = fbm(133, 3, 3);
    return generateSet({
      size: 512, tileM: 2, normalStrength: 0.8,
      pixel(u, v, px) {
        const s = speck(u, v), t = tuft(u, v);
        gray(px, 205 + (s - 0.5) * 66 + (t - 0.5) * 30 + (broad(u, v) - 0.5) * 18);
        px.h = 0.5 + (t - 0.5) * 0.5;
        px.ro = 0.96;
      },
    });
  });
}

// Worn carpet: adds traffic-lane darkening + flattened pile.
export function carpetWornSet() {
  return cached('carpetWorn', () => {
    const speck = fbm(131, 5, 48, 0.7);
    const tuft = fbm(132, 3, 96, 0.5);
    const wear = fbm(134, 3, 3);
    return generateSet({
      size: 512, tileM: 2, normalStrength: 0.6,
      pixel(u, v, px) {
        const w = Math.max(0, wear(u, v) - 0.45) * 1.6;
        const s = speck(u, v), t = tuft(u, v);
        gray(px, 205 + (s - 0.5) * 60 + (t - 0.5) * 26 - w * 34);
        px.h = 0.5 + (t - 0.5) * 0.5 * (1 - w * 0.7);
        px.ro = 0.96 - w * 0.06;
      },
    });
  });
}

// Vinyl sheet flooring: fine fleck, soft sheen streaks.
export function vinylSet() {
  return cached('vinyl', () => {
    const fleck = fbm(141, 5, 64, 0.65);
    const streak = fbm(142, 3, 4);
    return generateSet({
      size: 512, tileM: 2.5, normalStrength: 0.4,
      pixel(u, v, px) {
        const f = fleck(u, v);
        const dot = f > 0.74 ? 20 : (f < 0.3 ? -14 : 0);
        gray(px, 226 + dot + (streak(u, v) - 0.5) * 8);
        px.h = 0.5 + (f - 0.5) * 0.15;
        px.ro = 0.5 + streak(u, v) * 0.16;
      },
    });
  });
}

// Ceramic tile with grout (baked color).
export function ceramicSet(key, { cells = 4, tileM = 2.4, base = [178, 175, 168], varAmt = 10, groutL = 96, roTile = 0.32 } = {}) {
  return cached(key, () => {
    const glaze = fbm(151, 4, 24, 0.55);
    const soil = fbm(152, 3, 4);
    return generateSet({
      size: 512, tileM, normalStrength: 1.2,
      pixel(u, v, px) {
        const tx = u * cells, ty = v * cells;
        const gx = gridDist(tx, 0.016), gy = gridDist(ty, 0.016);
        const edge = Math.min(gx, gy);
        const hTile = cellHash(Math.floor(tx), Math.floor(ty), 5);
        const g = glaze(u, v);
        if (edge < 0) {
          const l = groutL + (soil(u, v) - 0.5) * 20;
          px.r = l; px.g = l; px.b = l - 4;
          px.h = 0.22;
          px.ro = 0.85;
        } else {
          const bevel = Math.min(1, edge / 0.018);
          const tint = (hTile - 0.5) * varAmt * 2;
          px.r = base[0] + tint + (g - 0.5) * 10;
          px.g = base[1] + tint + (g - 0.5) * 10;
          px.b = base[2] + tint + (g - 0.5) * 8;
          px.h = 0.35 + bevel * 0.55 + (g - 0.5) * 0.05;
          px.ro = roTile + g * 0.12 + (hTile - 0.5) * 0.06;
        }
      },
    });
  });
}

// Raised access floor (server room): 0.6 m panels, corner screws, brushed gray.
export function raisedTileSet() {
  return cached('raisedTile', () => {
    const wearN = fbm(161, 4, 20, 0.6);
    return generateSet({
      size: 512, tileM: 1.2, normalStrength: 1.1,
      pixel(u, v, px) {
        const tx = u * 2, ty = v * 2;
        const gx = gridDist(tx, 0.01), gy = gridDist(ty, 0.01);
        const edge = Math.min(gx, gy);
        const hTile = cellHash(Math.floor(tx), Math.floor(ty), 9);
        const w = wearN(u, v);
        // corner screws
        const fx = tx - Math.floor(tx), fy = ty - Math.floor(ty);
        let screw = false;
        for (const cx of [0.06, 0.94]) for (const cy of [0.06, 0.94]) {
          if ((fx - cx) ** 2 + (fy - cy) ** 2 < 0.0004) screw = true;
        }
        if (edge < 0) { gray(px, 66); px.h = 0.2; px.ro = 0.7; }
        else {
          gray(px, 132 + (hTile - 0.5) * 12 + (w - 0.5) * 14);
          px.h = 0.55 + Math.min(1, edge / 0.04) * 0.15 + (w - 0.5) * 0.04;
          px.ro = 0.46 + w * 0.14;
          if (screw) { gray(px, 90); px.h -= 0.2; px.ro = 0.4; }
        }
      },
    });
  });
}

// Concrete: broom-finish direction streaks + blotches + stains.
export function concreteSet(key = 'concrete', { painted = false } = {}) {
  return cached(key, () => {
    const blotch = fbm(171, 4, 4, 0.6);
    const broom = fbm(172, 2, 128, 0.5);
    const stain = fbm(173, 3, 3);
    const agg = fbm(174, 4, 60, 0.6);
    return generateSet({
      size: 512, tileM: 3, normalStrength: painted ? 0.4 : 0.9,
      pixel(u, v, px) {
        const b = blotch(u, v);
        const br = broom(u, v * 0.06); // stretched: directional broom lines along v
        const st = Math.max(0, stain(u, v) - 0.66) * 2.0;
        const a = agg(u, v);
        let l = painted ? 228 : 233;
        l += (b - 0.5) * (painted ? 9 : 17) + (br - 0.5) * 6 + (a - 0.5) * (painted ? 4 : 9);
        l -= st * (painted ? 22 : 32);
        gray(px, l);
        px.h = 0.5 + (b - 0.5) * 0.3 + (br - 0.5) * (painted ? 0.06 : 0.2) + (a - 0.5) * 0.1;
        px.ro = (painted ? 0.62 : 0.9) + st * 0.06 + (b - 0.5) * 0.06;
      },
    });
  });
}

// Corrugated metal deck (exposed ceilings): ribs along u.
export function deckSet() {
  return cached('deck', () => {
    const grime = fbm(181, 3, 5);
    return generateSet({
      size: 256, tileM: 1.8, normalStrength: 2.6,
      pixel(u, v, px) {
        const rib = Math.abs(((u * 6) % 1) - 0.5) * 2; // triangle wave, 6 ribs per tile
        const g = grime(u, v);
        gray(px, 224 - rib * 16 - g * 18);
        px.h = 1 - rib;
        px.ro = 0.55 + g * 0.2;
      },
    });
  });
}

// Wood veneer planks (luminance grain; tint via material.color).
export function woodSet(key = 'wood', { plankW = 0.14, grooves = true, grainStretch = 9 } = {}) {
  return cached(key, () => {
    const grain = fbm(191, 5, 6, 0.62);
    const fine = fbm(192, 3, 64, 0.5);
    const tileM = 1.4;
    const planks = Math.round(tileM / plankW);
    return generateSet({
      size: 512, tileM, normalStrength: grooves ? 1.1 : 0.5,
      pixel(u, v, px) {
        const pi = Math.floor(u * planks);
        const ph = cellHash(pi, 0, 3);
        const g = grain((u * 3 + ph * 7) % 1, (v / grainStretch + ph * 13) % 1);
        const streak = Math.sin((g * 6 + v * grainStretch) * Math.PI * 2) * 0.5 + 0.5;
        let l = 214 + (ph - 0.5) * 34 + (g - 0.5) * 36 - streak * 14 + (fine(u, v) - 0.5) * 10;
        let h = 0.6 + (g - 0.5) * 0.2 - streak * 0.08;
        if (grooves) {
          const e = gridDist(u * planks, 0.012);
          if (e < 0) { l -= 40; h = 0.25; }
          else h += Math.min(1, e / 0.05) * 0.12;
        }
        gray(px, l);
        px.h = h;
        px.ro = 0.55 + streak * 0.08 + (g - 0.5) * 0.05;
      },
    });
  });
}

// Brushed metal: horizontal micro-streaks.
export function brushedSet() {
  return cached('brushed', () => {
    const streak = fbm(201, 3, 128, 0.55);
    const broad = fbm(202, 2, 3);
    return generateSet({
      size: 256, tileM: 1, normalStrength: 0.5,
      pixel(u, v, px) {
        const s = streak(u * 0.04, v); // stretched along u
        gray(px, 232 + (s - 0.5) * 22 + (broad(u, v) - 0.5) * 8);
        px.h = 0.5 + (s - 0.5) * 0.3;
        px.ro = 0.3 + s * 0.12;
      },
    });
  });
}

// Painted metal: subtle orange peel + faint wear. wear:false = clean sheet (door leaves etc.,
// where 0..1 UVs stretch the map across the whole object and blotches would read as stains).
export function paintedMetalSet(key = 'paintedMetal', { wear = true } = {}) {
  return cached(key, () => {
    const peel = fbm(211, 3, 64, 0.55);
    const wearN = fbm(212, 3, 5);
    return generateSet({
      size: 256, tileM: 1.5, normalStrength: 0.3,
      pixel(u, v, px) {
        const w = wear ? Math.max(0, wearN(u, v) - 0.7) * 1.6 : 0;
        gray(px, 240 - w * 18 + (peel(u, v) - 0.5) * 5);
        px.h = peel(u, v);
        px.ro = 0.5 + w * 0.14 + (peel(u, v) - 0.5) * 0.06;
      },
    });
  });
}

// Snow: soft drifts + sparkle glints (tiny near-zero-roughness pixels).
export function snowSet() {
  return cached('snow', () => {
    const drift = fbm(221, 4, 4, 0.55);
    const granule = fbm(222, 4, 90, 0.6);
    const sparkle = lattice(223, 220);
    return generateSet({
      size: 512, tileM: 4, normalStrength: 1.4,
      pixel(u, v, px) {
        const d = drift(u, v), g = granule(u, v);
        const sp = sparkle(u, v) > 0.987;
        px.r = 242 + (d - 0.5) * 10;
        px.g = 246 + (d - 0.5) * 8;
        px.b = 252;
        px.h = d * 0.8 + g * 0.2;
        px.ro = sp ? 0.06 : 0.75 + g * 0.15;
      },
    });
  });
}

// Asphalt: dark aggregate + faint patches.
export function asphaltSet() {
  return cached('asphalt', () => {
    const agg = fbm(231, 5, 70, 0.65);
    const patch = fbm(232, 3, 3);
    return generateSet({
      size: 512, tileM: 4, normalStrength: 1.6,
      pixel(u, v, px) {
        const a = agg(u, v), p = patch(u, v);
        gray(px, 205 + (a - 0.5) * 60 + (p - 0.5) * 26);
        px.h = a;
        px.ro = 0.9 + (a - 0.5) * 0.08;
      },
    });
  });
}

// Brick: stylized running bond with mortar (baked color).
export function brickSet() {
  return cached('brick', () => {
    const face = fbm(241, 4, 30, 0.6);
    const rows = 8, cols = 4; // on a 1.6 m tile: bricks 0.4×0.2 (stylized-bold)
    return generateSet({
      size: 512, tileM: 1.6, normalStrength: 2.4,
      pixel(u, v, px) {
        const ry = v * rows;
        const row = Math.floor(ry);
        const off = (row % 2) * 0.5;
        const rx = u * cols + off;
        const gx = gridDist(rx, 0.035), gy = gridDist(ry, 0.05);
        const edge = Math.min(gx, gy);
        const hb = cellHash(Math.floor(rx), row, 7);
        const f = face(u, v);
        if (edge < 0) { gray(px, 168 + (f - 0.5) * 16); px.h = 0.2; px.ro = 0.95; }
        else {
          const l = 150 + (hb - 0.5) * 44 + (f - 0.5) * 26;
          px.r = l + 26; px.g = l - 4; px.b = l - 22;
          px.h = 0.5 + Math.min(1, edge / 0.08) * 0.4 + (f - 0.5) * 0.12;
          px.ro = 0.86 + (f - 0.5) * 0.08;
        }
      },
    });
  });
}

// Woven fabric: fine weave cross-hatch (tint via material.color).
export function fabricSet() {
  return cached('fabric', () => {
    const weaveN = fbm(251, 3, 80, 0.55);
    return generateSet({
      size: 256, tileM: 1, normalStrength: 0.8,
      pixel(u, v, px) {
        const wx = Math.sin(u * Math.PI * 2 * 90), wy = Math.sin(v * Math.PI * 2 * 90);
        const weave = (wx * wy) * 0.5 + 0.5;
        const n = weaveN(u, v);
        gray(px, 222 + (weave - 0.5) * 18 + (n - 0.5) * 22);
        px.h = 0.5 + (weave - 0.5) * 0.3 + (n - 0.5) * 0.2;
        px.ro = 0.96;
      },
    });
  });
}

// Exterior insulated panel: 1.2 m panel grid, matte metal.
export function panelSet() {
  return cached('panel', () => {
    const grime = fbm(261, 3, 4);
    const micro = fbm(262, 3, 40, 0.5);
    return generateSet({
      size: 512, tileM: 2.4, normalStrength: 0.9,
      pixel(u, v, px) {
        const gx = gridDist(u * 2, 0.005), gy = gridDist(v * 2, 0.005);
        const edge = Math.min(gx, gy);
        const g = grime(u, v);
        if (edge < 0) { gray(px, 164); px.h = 0.3; px.ro = 0.6; }
        else {
          gray(px, 222 - g * 12 + (micro(u, v) - 0.5) * 4);
          px.h = 0.5 + Math.min(1, edge / 0.015) * 0.2;
          px.ro = 0.5 + g * 0.14;
        }
      },
    });
  });
}

// Rubber: fine stipple.
export function rubberSet() {
  return cached('rubber', () => {
    const stip = fbm(271, 4, 90, 0.6);
    return generateSet({
      size: 256, tileM: 1, normalStrength: 0.7,
      pixel(u, v, px) {
        const s = stip(u, v);
        gray(px, 224 + (s - 0.5) * 20);
        px.h = s;
        px.ro = 0.92;
      },
    });
  });
}

// Cardboard: kraft fibers + faint corrugation lines (tint via material.color).
export function cardboardSet() {
  return cached('cardboard', () => {
    const fiber = fbm(281, 4, 50, 0.6);
    return generateSet({
      size: 256, tileM: 1.2, normalStrength: 0.6,
      pixel(u, v, px) {
        const f = fiber(u, v);
        const line = Math.sin(v * Math.PI * 2 * 60) * 0.5 + 0.5;
        gray(px, 226 + (f - 0.5) * 22 + (line - 0.5) * 5);
        px.h = 0.5 + (f - 0.5) * 0.2;
        px.ro = 0.95;
      },
    });
  });
}
