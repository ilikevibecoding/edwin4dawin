import * as THREE from 'three';

/**
 * Procedural sprite/decal atlases drawn on canvases at load time (no external art).
 *
 *   createParticleAtlas()  → { map, normalMap, cols, rows }   16 cells, see CELLS
 *   createDecalAtlas()     → { map, cols, rows }               8 cells, see DECALS
 *   createNoiseTexture()   → small tiling grey noise (roughness / albedo variation)
 *   cellUv(atlas, index)   → { u0, v0, u1, v1 } for meshes that show one cell
 *
 * The particle atlas has a companion normal map (rgb = sprite-space normal, a = thickness) so
 * smoke/dust/debris sprites can be lit by the sun in the particle shader instead of reading as flat grey.
 */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

export class Noise {
  constructor(seed = 1) {
    const rnd = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = p[i];
      p[i] = p[j];
      p[j] = t;
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    this.vals = new Float32Array(256);
    for (let i = 0; i < 256; i++) this.vals[i] = rnd();
  }

  _h(i, j) {
    return this.vals[this.perm[(this.perm[i & 255] + j) & 255]];
  }

  /** Smooth value noise in [0,1]. */
  value(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = this._h(xi, yi);
    const b = this._h(xi + 1, yi);
    const c = this._h(xi, yi + 1);
    const d = this._h(xi + 1, yi + 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }

  fbm(x, y, octaves = 4, lacunarity = 2.0, gain = 0.5) {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * this.value(x, y);
      norm += amp;
      x = x * lacunarity + 17.3;
      y = y * lacunarity + 9.1;
      amp *= gain;
    }
    return sum / norm;
  }

  /** Ridged turbulence in [0,1] (fire / sharp billows). */
  turb(x, y, octaves = 4) {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * Math.abs(this.value(x, y) * 2 - 1);
      norm += amp;
      x = x * 2.03 + 5.7;
      y = y * 2.03 + 3.1;
      amp *= 0.5;
    }
    return sum / norm;
  }
}

export const CELLS = {
  SMOKE_A: 0,
  SMOKE_B: 1,
  SMOKE_C: 2,
  DUST: 3,
  FIRE_A: 4,
  FIRE_B: 5,
  FIRE_C: 6,
  STREAK: 7,
  FLASH_STAR: 8,
  FLASH_CORE: 9,
  FLASH_PETAL: 10,
  CHUNK_A: 11,
  CHUNK_B: 12,
  BLOOD: 13,
  SHARD: 14,
  RING: 15,
};

export const DECALS = {
  HOLE_STONE: 0,
  DENT_METAL: 1,
  HOLE_WOOD: 2,
  GLASS_WEB: 3,
  SCORCH: 4,
  BLOOD_SPLAT: 5,
  HOLE_DIRT: 6,
  HOLE_PLASTER: 7,
};

/** UV rectangle of one atlas cell (accounts for canvas flipY: cell row 0 is the top of the image). */
export function cellUv(atlas, index) {
  const col = index % atlas.cols;
  const row = Math.floor(index / atlas.cols);
  const u0 = col / atlas.cols;
  const u1 = (col + 1) / atlas.cols;
  const v1 = 1 - row / atlas.rows;
  const v0 = 1 - (row + 1) / atlas.rows;
  return { u0, v0, u1, v1 };
}

/** Remap a PlaneGeometry's uvs to a single atlas cell. */
export function setPlaneUvToCell(geometry, atlas, index) {
  const { u0, v0, u1, v1 } = cellUv(atlas, index);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, lerp(u0, u1, uv.getX(i)), lerp(v0, v1, uv.getY(i)));
  }
  uv.needsUpdate = true;
  return geometry;
}

// ---------------------------------------------------------------------------------------------
// Particle atlas
// ---------------------------------------------------------------------------------------------

function makeSmoke(noise, ox, oy, scale = 2.6, contrast = 1.35) {
  return (u, v, out) => {
    const r = Math.hypot(u, v);
    const n = noise.fbm(u * scale + ox, v * scale + oy, 5, 2.1, 0.55);
    const n2 = noise.fbm(u * scale * 2.3 + oy, v * scale * 2.3 + ox, 3, 2.0, 0.5);
    const n3 = noise.fbm(u * 7.0 + ox * 0.5, v * 7.0 + oy * 0.5, 3, 2.0, 0.5);
    // lumpy silhouette: the radial falloff is modulated by low-frequency noise, then feathered
    const edge = 0.7 + 0.3 * (n - 0.5) * 2.0;
    const disc = smooth(edge, edge * 0.22, r);
    let h = disc * (0.5 + 0.8 * n) * (0.82 + 0.36 * n2) * (0.85 + 0.3 * n3);
    h = clamp01((h - 0.05) * contrast);
    const shade = 0.8 + 0.2 * n + 0.08 * (n2 - 0.5);
    out.r = out.g = out.b = clamp01(shade);
    out.a = Math.pow(h, 1.6);
    // normals: mostly a soft dome (volumetric puff) with the lumps on top
    const dome = Math.sqrt(Math.max(0, 1 - (r / Math.max(edge, 1e-3)) ** 2)) * disc;
    out.h = clamp01(0.45 * h + 0.55 * dome);
  };
}

function makeDust(noise) {
  return (u, v, out) => {
    const r = Math.hypot(u, v);
    const n = noise.fbm(u * 3.2 + 4.1, v * 3.2 + 7.7, 4, 2.0, 0.5);
    const disc = Math.pow(smooth(1.0, 0.0, r), 1.4);
    const h = clamp01(disc * (0.35 + 0.9 * n) * 1.2);
    out.r = out.g = out.b = 0.82 + 0.18 * n;
    out.a = h * 0.85;
    out.h = h;
  };
}

function fireColor(i, out) {
  // i: 0 dark edge .. 1 white hot. Colors authored in sRGB (canvas), decoded to linear by the GPU.
  if (i < 0.3) {
    const t = i / 0.3;
    out.r = lerp(0.35, 0.95, t);
    out.g = lerp(0.03, 0.22, t);
    out.b = lerp(0.0, 0.02, t);
  } else if (i < 0.6) {
    const t = (i - 0.3) / 0.3;
    out.r = lerp(0.95, 1.0, t);
    out.g = lerp(0.22, 0.55, t);
    out.b = lerp(0.02, 0.06, t);
  } else if (i < 0.85) {
    const t = (i - 0.6) / 0.25;
    out.r = 1.0;
    out.g = lerp(0.55, 0.86, t);
    out.b = lerp(0.06, 0.35, t);
  } else {
    const t = (i - 0.85) / 0.15;
    out.r = 1.0;
    out.g = lerp(0.86, 0.98, t);
    out.b = lerp(0.35, 0.88, t);
  }
}

function makeFire(noise, ox, oy) {
  return (u, v, out) => {
    const r = Math.hypot(u, v * 0.92);
    const t = noise.turb(u * 2.1 + ox, v * 2.1 + oy, 5);
    const n = noise.fbm(u * 3.5 + oy, v * 3.5 + ox, 4, 2.0, 0.5);
    const shape = smooth(1.0, 0.12, r * (0.72 + 0.6 * t));
    const intensity = clamp01(shape * (0.35 + 0.55 * (1 - t) + 0.35 * n) * 1.25);
    fireColor(intensity, out);
    out.a = smooth(0.04, 0.42, intensity);
    out.h = intensity;
  };
}

function makeStreak() {
  return (u, v, out) => {
    // vertical streak: bright head near the top (v≈0.75), tail fading to the bottom
    const core = Math.exp(-(u * u) * 22);
    const halo = Math.exp(-(u * u) * 5) * 0.35;
    const head = Math.exp(-((v - 0.72) * (v - 0.72)) * 9);
    const tail = smooth(-1.0, 0.7, v) * 0.75;
    const along = clamp01(head + tail) * smooth(1.0, 0.9, v);
    const a = clamp01((core + halo) * along);
    out.r = 1.0;
    out.g = lerp(0.62, 0.96, core);
    out.b = lerp(0.25, 0.85, core);
    out.a = a;
    out.h = a;
  };
}

function makeFlashStar(noise) {
  const spikes = [];
  const rnd = mulberry32(77);
  const count = 8;
  for (let i = 0; i < count; i++) {
    const major = i % 2 === 0;
    spikes.push({ ang: (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.35, len: (major ? 1.0 : 0.55) + rnd() * 0.4, w: major ? 14 + rnd() * 6 : 22 + rnd() * 8 });
  }
  return (u, v, out) => {
    const r = Math.hypot(u, v);
    const ang = Math.atan2(v, u);
    let i = Math.exp(-r * r * 30) * 1.3 + Math.exp(-r * r * 6) * 0.45;
    for (const s of spikes) {
      let d = ang - s.ang;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const perp = Math.abs(Math.sin(d)) * r;
      const along = Math.cos(d) * r;
      if (along > 0) i += Math.exp(-perp * perp * s.w * s.w * (1 + along * 2)) * Math.exp(-along * 2.2 / s.len) * 1.2;
    }
    i *= 0.8 + 0.4 * noise.fbm(u * 6, v * 6, 3);
    i = clamp01(i);
    out.r = 1.0;
    out.g = lerp(0.55, 0.97, i);
    out.b = lerp(0.12, 0.9, i * i);
    out.a = i;
    out.h = i;
  };
}

function makeFlashCore() {
  return (u, v, out) => {
    const r = Math.hypot(u, v);
    const i = clamp01(Math.exp(-r * r * 7) + Math.exp(-r * r * 1.6) * 0.25);
    out.r = 1.0;
    out.g = lerp(0.6, 1.0, i);
    out.b = lerp(0.2, 0.95, i * i);
    out.a = i;
    out.h = i;
  };
}

function makeFlashPetal(noise) {
  return (u, v, out) => {
    // teardrop flame along +v: base at v=-0.85, tip at v=+0.95
    const t = clamp01((v + 0.85) / 1.8);
    const w = 0.08 + 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.8);
    const across = Math.exp(-(u * u) / (w * w) * 1.6);
    const along = smooth(-1.0, -0.7, v) * smooth(1.0, 0.55, v);
    const tb = noise.turb(u * 3 + 2.0, v * 2 + 1.0, 4);
    let i = clamp01(across * along * (0.75 + 0.55 * (1 - tb)));
    const hot = clamp01(i * 1.4 - 0.25 * t);
    out.r = 1.0;
    out.g = lerp(0.5, 0.95, hot);
    out.b = lerp(0.1, 0.8, hot * hot);
    out.a = i;
    out.h = i;
  };
}

function makeChunk(noise, seed) {
  const rnd = mulberry32(seed);
  const verts = 7 + Math.floor(rnd() * 3);
  const radii = [];
  for (let i = 0; i < verts; i++) radii.push(0.42 + rnd() * 0.4);
  const rot = rnd() * Math.PI * 2;
  return (u, v, out) => {
    const r = Math.hypot(u, v);
    let ang = Math.atan2(v, u) - rot;
    ang = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const f = (ang / (Math.PI * 2)) * verts;
    const i0 = Math.floor(f) % verts;
    const i1 = (i0 + 1) % verts;
    const edge = lerp(radii[i0], radii[i1], f - i0);
    const inside = smooth(edge, edge - 0.03, r);
    const n = noise.fbm(u * 5 + seed, v * 5 + seed * 1.3, 4);
    const shade = 0.55 + 0.6 * n;
    out.r = clamp01(shade * 0.95);
    out.g = clamp01(shade * 0.9);
    out.b = clamp01(shade * 0.82);
    out.a = inside;
    out.h = inside * (0.45 + 0.55 * n * smooth(edge, edge * 0.4, r));
  };
}

function makeBlood(noise) {
  return (u, v, out) => {
    const r = Math.hypot(u, v);
    const n = noise.fbm(u * 3.4 + 21.0, v * 3.4 + 3.0, 4, 2.0, 0.55);
    const disc = smooth(1.0, 0.1, r);
    const h = clamp01((disc * (0.35 + 1.0 * n) - 0.2) * 1.9);
    out.r = 1.0;
    out.g = lerp(0.02, 0.18, n);
    out.b = lerp(0.0, 0.08, n);
    out.a = h;
    out.h = h;
  };
}

function makeShard() {
  return (u, v, out) => {
    // sharp triangular sliver with a specular streak
    const inside = u > -0.55 && u < 0.55 && v > -0.95 && v < 0.95 && Math.abs(u) < 0.55 * (1 - (v + 0.95) / 1.9) + 0.06 ? 1 : 0;
    const spec = Math.exp(-Math.pow((u - v * 0.2) * 6, 2)) * 0.8;
    out.r = clamp01(0.75 + spec);
    out.g = clamp01(0.85 + spec);
    out.b = 1.0;
    out.a = inside * 0.85;
    out.h = inside * 0.6;
  };
}

function makeRing(noise) {
  return (u, v, out) => {
    const r = Math.hypot(u, v);
    const ang = Math.atan2(v, u);
    const n = noise.fbm(Math.cos(ang) * 2.5 + 3, Math.sin(ang) * 2.5 + 8, 3);
    const band = Math.exp(-Math.pow((r - 0.7) * 6.5, 2));
    const inner = smooth(0.35, 0.68, r) * 0.25;
    const a = clamp01((band * (0.65 + 0.5 * n) + inner) * smooth(1.0, 0.9, r));
    out.r = out.g = out.b = 1.0;
    out.a = a;
    out.h = a;
  };
}

function renderAtlas(cellFns, cellSize, cols, rows, { normals = false, normalStrength = 0.55 } = {}) {
  const W = cols * cellSize;
  const H = rows * cellSize;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const data = img.data;
  const height = normals ? new Float32Array(W * H) : null;
  const out = { r: 0, g: 0, b: 0, a: 0, h: 0 };
  const margin = 3;
  for (let ci = 0; ci < cellFns.length; ci++) {
    const fn = cellFns[ci];
    if (!fn) continue;
    const cx = (ci % cols) * cellSize;
    const cy = Math.floor(ci / cols) * cellSize;
    for (let py = 0; py < cellSize; py++) {
      const v = 1 - (2 * (py + 0.5)) / cellSize;
      for (let px = 0; px < cellSize; px++) {
        const u = (2 * (px + 0.5)) / cellSize - 1;
        out.r = out.g = out.b = out.a = out.h = 0;
        fn(u, v, out);
        const border = px < margin || py < margin || px >= cellSize - margin || py >= cellSize - margin;
        // every cell must reach exactly zero at its edge: wide gaussian halos (flash core, sparks) drawn additively
        // at colour 5–6 would otherwise reveal the quad as a faint square
        const win = smooth(1.0, 0.84, Math.max(Math.abs(u), Math.abs(v)));
        const a = border ? 0 : out.a * win;
        out.h *= win;
        const idx = (cy + py) * W + (cx + px);
        const o = idx * 4;
        data[o] = Math.round(clamp01(out.r) * 255);
        data[o + 1] = Math.round(clamp01(out.g) * 255);
        data[o + 2] = Math.round(clamp01(out.b) * 255);
        data[o + 3] = Math.round(clamp01(a) * 255);
        if (height) height[idx] = border ? 0 : out.h;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = 4;
  map.needsUpdate = true;

  let normalMap = null;
  if (normals) {
    // blur the height field (separable box, 2 passes) so normals describe soft volumes, not texel noise
    const blurred = new Float32Array(W * H);
    const tmp = new Float32Array(W * H);
    const R = Math.max(1, Math.round(cellSize / 64));
    for (let pass = 0; pass < 2; pass++) {
      const src = pass === 0 ? height : blurred;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          let s = 0;
          for (let k = -R; k <= R; k++) s += src[y * W + Math.min(W - 1, Math.max(0, x + k))];
          tmp[y * W + x] = s / (2 * R + 1);
        }
      }
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          let s = 0;
          for (let k = -R; k <= R; k++) s += tmp[Math.min(H - 1, Math.max(0, y + k)) * W + x];
          blurred[y * W + x] = s / (2 * R + 1);
        }
      }
    }
    const nc = document.createElement('canvas');
    nc.width = W;
    nc.height = H;
    const nctx = nc.getContext('2d');
    const nimg = nctx.createImageData(W, H);
    const nd = nimg.data;
    const texel = 2 / cellSize; // normalized units per texel inside a cell
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        const hl = blurred[y * W + Math.max(0, x - 1)];
        const hr = blurred[y * W + Math.min(W - 1, x + 1)];
        const hu = blurred[Math.max(0, y - 1) * W + x];
        const hd = blurred[Math.min(H - 1, y + 1) * W + x];
        const gx = (hr - hl) / (2 * texel);
        const gy = (hd - hu) / (2 * texel); // image y grows downward
        let nx = -gx * normalStrength;
        let ny = gy * normalStrength;
        let nz = 1;
        const l = Math.hypot(nx, ny, nz);
        nx /= l;
        ny /= l;
        nz /= l;
        const o = idx * 4;
        nd[o] = Math.round((nx * 0.5 + 0.5) * 255);
        nd[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        nd[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        nd[o + 3] = Math.round(clamp01(height[idx]) * 255);
      }
    }
    nctx.putImageData(nimg, 0, 0);
    normalMap = new THREE.CanvasTexture(nc);
    normalMap.colorSpace = THREE.NoColorSpace;
    normalMap.wrapS = normalMap.wrapT = THREE.ClampToEdgeWrapping;
    normalMap.minFilter = THREE.LinearMipmapLinearFilter;
    normalMap.magFilter = THREE.LinearFilter;
    normalMap.needsUpdate = true;
  }
  return { map, normalMap, cols, rows, cellSize, canvas };
}

export function createParticleAtlas(cellSize = 256) {
  const noise = new Noise(1337);
  const fns = [];
  fns[CELLS.SMOKE_A] = makeSmoke(noise, 0.0, 0.0, 2.6, 1.7);
  fns[CELLS.SMOKE_B] = makeSmoke(noise, 13.7, 4.2, 2.9, 1.6);
  fns[CELLS.SMOKE_C] = makeSmoke(noise, 41.1, 27.3, 2.3, 1.9);
  fns[CELLS.DUST] = makeDust(noise);
  fns[CELLS.FIRE_A] = makeFire(noise, 0.0, 0.0);
  fns[CELLS.FIRE_B] = makeFire(noise, 7.3, 2.9);
  fns[CELLS.FIRE_C] = makeFire(noise, 19.1, 11.4);
  fns[CELLS.STREAK] = makeStreak();
  fns[CELLS.FLASH_STAR] = makeFlashStar(noise);
  fns[CELLS.FLASH_CORE] = makeFlashCore();
  fns[CELLS.FLASH_PETAL] = makeFlashPetal(noise);
  fns[CELLS.CHUNK_A] = makeChunk(noise, 11);
  fns[CELLS.CHUNK_B] = makeChunk(noise, 29);
  fns[CELLS.BLOOD] = makeBlood(noise);
  fns[CELLS.SHARD] = makeShard();
  fns[CELLS.RING] = makeRing(noise);
  return renderAtlas(fns, cellSize, 4, 4, { normals: true, normalStrength: 0.55 });
}

// ---------------------------------------------------------------------------------------------
// Decal atlas
// ---------------------------------------------------------------------------------------------

function cracks(count, seed) {
  const rnd = mulberry32(seed);
  const lines = [];
  for (let i = 0; i < count; i++) {
    lines.push({ ang: (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.7, len: 0.35 + rnd() * 0.6, w: 0.012 + rnd() * 0.012, wob: rnd() * 6 });
  }
  return (u, v, noise) => {
    const r = Math.hypot(u, v);
    const ang = Math.atan2(v, u);
    let c = 0;
    for (const l of lines) {
      let d = ang - l.ang;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const wobble = (noise.value(r * 9 + l.wob, l.wob) - 0.5) * 0.18;
      const perp = Math.abs(Math.sin(d + wobble)) * r;
      const along = Math.cos(d) * r;
      if (along > 0 && along < l.len) c = Math.max(c, smooth(l.w * (1 + along * 1.5), 0, perp) * (1 - along / l.len * 0.6));
    }
    return c;
  };
}

function makeHole(noise, { center, ring, ringWidth = 0.22, dust = 0.55, crackCount = 5, seed = 5, ringLight = 0.85, speckle = 0.6 }) {
  const crk = cracks(crackCount, seed);
  return (u, v, out) => {
    const r = Math.hypot(u, v);
    const n = noise.fbm(u * 5 + seed, v * 5 + seed * 2, 4);
    const n2 = noise.fbm(u * 11 + 3, v * 11 + 1, 3);
    const holeR = 0.2 + 0.05 * (n - 0.5);
    const hole = smooth(holeR + 0.04, holeR - 0.03, r);
    const rim = smooth(holeR + ringWidth + 0.15 * n, holeR, r) * (1 - hole);
    const dustHalo = smooth(1.0, holeR + 0.1, r) * (0.25 + 0.75 * n) * dust;
    const spk = smooth(0.62, 0.78, n2) * smooth(0.95, 0.35, r) * speckle;
    const c = crk(u, v, noise) * smooth(0.95, 0.2, r);
    // colour: dark cavity, light chipped rim, dusty halo
    const light = ringLight * (0.75 + 0.35 * n2);
    const rimA = rim * 0.9;
    let R = center[0] * hole + ring[0] * light * rimA + ring[0] * light * dustHalo * 0.8 + center[0] * (spk + c);
    let G = center[1] * hole + ring[1] * light * rimA + ring[1] * light * dustHalo * 0.8 + center[1] * (spk + c);
    let B = center[2] * hole + ring[2] * light * rimA + ring[2] * light * dustHalo * 0.8 + center[2] * (spk + c);
    const a = clamp01(hole + rimA + dustHalo * 0.55 + spk * 0.8 + c * 0.9);
    if (a > 0) {
      R /= a;
      G /= a;
      B /= a;
    }
    out.r = clamp01(R);
    out.g = clamp01(G);
    out.b = clamp01(B);
    out.a = a * smooth(1.0, 0.85, r);
  };
}

function makeMetalDent(noise) {
  const scr = cracks(9, 91);
  return (u, v, out) => {
    const r = Math.hypot(u, v);
    const n = noise.fbm(u * 6 + 1, v * 6 + 2, 3);
    const holeR = 0.16 + 0.03 * (n - 0.5);
    const hole = smooth(holeR + 0.03, holeR - 0.02, r);
    // bright specular rim on the upper-left (light usually from above), dark lower-right
    const dirLight = clamp01((-u * 0.6 + v * 0.8) * 0.5 + 0.5);
    const rim = smooth(holeR + 0.22, holeR, r) * (1 - hole);
    const bright = rim * dirLight * 1.0;
    const dark = rim * (1 - dirLight) * 0.7;
    const scratches = scr(u, v, noise) * smooth(0.9, 0.2, r) * 0.6;
    const a = clamp01(hole + rim * 0.9 + scratches);
    const bareMetal = 0.62 + 0.3 * n;
    const R = (0.05 * hole + bareMetal * bright + 0.08 * dark + 0.6 * scratches) / Math.max(a, 1e-3);
    out.r = clamp01(R);
    out.g = clamp01(R * 0.98);
    out.b = clamp01(R * 0.92);
    out.a = a * smooth(1.0, 0.8, r);
  };
}

function makeWoodHole(noise) {
  return (u, v, out) => {
    // splintered elongated hole, fibres along v
    const r = Math.hypot(u * 1.25, v * 0.85);
    const n = noise.fbm(u * 4 + 8, v * 14 + 3, 4, 2.0, 0.6);
    const holeR = 0.19 + 0.07 * (n - 0.5);
    const hole = smooth(holeR + 0.03, holeR - 0.02, r);
    const fibres = smooth(0.55, 0.8, noise.fbm(u * 3 + 30, v * 22 + 5, 3));
    const rim = smooth(holeR + 0.32 + 0.12 * fibres, holeR, r) * (1 - hole);
    const a = clamp01(hole + rim * (0.55 + 0.45 * fibres)) * smooth(1.0, 0.75, r);
    const light = 0.62 + 0.35 * n;
    const wr = 0.85 * light, wg = 0.68 * light, wb = 0.42 * light;
    const t = hole / Math.max(a, 1e-3);
    out.r = clamp01(lerp(wr, 0.06, t));
    out.g = clamp01(lerp(wg, 0.035, t));
    out.b = clamp01(lerp(wb, 0.02, t));
    out.a = a;
  };
}

function makeGlassWeb(noise) {
  const radial = cracks(11, 44);
  return (u, v, out) => {
    const r = Math.hypot(u, v);
    const ang = Math.atan2(v, u);
    let c = radial(u, v, noise);
    for (let k = 0; k < 3; k++) {
      const rr = 0.28 + k * 0.22 + (noise.value(Math.cos(ang) * 3 + k * 7, Math.sin(ang) * 3 + k * 5) - 0.5) * 0.12;
      c = Math.max(c, smooth(0.014, 0.0, Math.abs(r - rr)) * (0.9 - k * 0.2));
    }
    const holeR = 0.13;
    const hole = smooth(holeR + 0.03, holeR - 0.02, r);
    const frost = smooth(holeR + 0.14, holeR, r) * 0.45;
    const a = clamp01(hole + c * 0.9 + frost) * smooth(1.0, 0.8, r);
    const t = hole / Math.max(a, 1e-3);
    out.r = lerp(0.92, 0.05, t);
    out.g = lerp(0.96, 0.06, t);
    out.b = lerp(1.0, 0.08, t);
    out.a = a;
  };
}

function makeScorch(noise) {
  return (u, v, out) => {
    const r = Math.hypot(u, v);
    const ang = Math.atan2(v, u);
    const n = noise.fbm(u * 3.2 + 50, v * 3.2 + 20, 5, 2.0, 0.55);
    const rays = noise.fbm(Math.cos(ang) * 4 + 9, Math.sin(ang) * 4 + 9, 3);
    const edge = 0.6 + 0.45 * (n - 0.5) + 0.3 * (rays - 0.5);
    const body = smooth(edge + 0.2, edge * 0.35, r);
    const streaks = smooth(0.4, 0.75, noise.fbm(ang * 2.2 + 11, r * 5 + 4, 3)) * smooth(0.2, 0.7, r) * smooth(1.0, 0.7, r) * 0.55;
    // dense soot in the middle, ragged translucent fringe
    const a = clamp01((body * (0.8 + 0.5 * n) * smooth(0.95, 0.15, r) + body * 0.35 + streaks) * smooth(1.0, 0.9, r));
    // near-black soot, slightly lighter ash toward the centre
    const ash = smooth(0.4, 0.0, r) * 0.1;
    const shade = 0.035 + ash + 0.06 * n;
    out.r = clamp01(shade * 1.05);
    out.g = clamp01(shade * 0.95);
    out.b = clamp01(shade * 0.85);
    out.a = a;
  };
}

function makeBloodSplat(noise) {
  const rnd = mulberry32(303);
  const drops = [];
  for (let i = 0; i < 14; i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = 0.25 + rnd() * 0.6;
    drops.push({ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, r: 0.03 + rnd() * 0.09, ex: 1 + rnd() * 1.6, ang });
  }
  return (u, v, out) => {
    const r = Math.hypot(u, v);
    const n = noise.fbm(u * 5 + 70, v * 5 + 40, 4);
    let a = smooth(0.34 + 0.16 * (n - 0.5), 0.1, r);
    for (const d of drops) {
      const dx = u - d.x;
      const dy = v - d.y;
      const c = Math.cos(d.ang), s = Math.sin(d.ang);
      const lx = (dx * c + dy * s) / d.ex;
      const ly = -dx * s + dy * c;
      const dd = Math.hypot(lx, ly);
      a = Math.max(a, smooth(d.r, d.r * 0.6, dd));
    }
    a = clamp01(a * (0.75 + 0.35 * n)) * smooth(1.0, 0.85, r);
    const dark = 0.22 + 0.25 * n;
    out.r = clamp01(dark);
    out.g = clamp01(dark * 0.12);
    out.b = clamp01(dark * 0.08);
    out.a = a;
  };
}

export function createDecalAtlas(cellSize = 256) {
  const noise = new Noise(4242);
  const fns = [];
  fns[DECALS.HOLE_STONE] = makeHole(noise, { center: [0.07, 0.065, 0.06], ring: [0.72, 0.68, 0.6], ringWidth: 0.2, dust: 0.5, crackCount: 5, seed: 5 });
  fns[DECALS.DENT_METAL] = makeMetalDent(noise);
  fns[DECALS.HOLE_WOOD] = makeWoodHole(noise);
  fns[DECALS.GLASS_WEB] = makeGlassWeb(noise);
  fns[DECALS.SCORCH] = makeScorch(noise);
  fns[DECALS.BLOOD_SPLAT] = makeBloodSplat(noise);
  fns[DECALS.HOLE_DIRT] = makeHole(noise, { center: [0.12, 0.08, 0.05], ring: [0.35, 0.25, 0.16], ringWidth: 0.3, dust: 0.7, crackCount: 0, seed: 9, ringLight: 0.7, speckle: 0.9 });
  fns[DECALS.HOLE_PLASTER] = makeHole(noise, { center: [0.1, 0.09, 0.085], ring: [0.95, 0.93, 0.88], ringWidth: 0.3, dust: 0.8, crackCount: 6, seed: 17, ringLight: 0.95, speckle: 0.4 });
  return renderAtlas(fns, cellSize, 4, 2, { normals: false });
}

/** Tiling grey noise (for roughness / albedo variation on casings, debris, jets). */
export function createNoiseTexture(size = 64, seed = 9, { scale = 6, contrast = 1, base = 0.5 } = {}) {
  const noise = new Noise(seed);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // tile by blending 4 shifted samples
      const u = x / size, v = y / size;
      const n =
        noise.fbm(u * scale, v * scale, 3) * (1 - u) * (1 - v) +
        noise.fbm((u + 1) * scale, v * scale, 3) * u * (1 - v) +
        noise.fbm(u * scale, (v + 1) * scale, 3) * (1 - u) * v +
        noise.fbm((u + 1) * scale, (v + 1) * scale, 3) * u * v;
      const g = clamp01(base + (n - 0.5) * contrast);
      const o = (y * size + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(g * 255);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}
