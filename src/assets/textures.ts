/**
 * Procedural texture factory.
 *
 * Everything the renderer samples is drawn here on a 2D canvas from seeded
 * noise: hull panelling, weathering, scorch, grating, star sprites and the
 * soft particle kernels. No image files are loaded at runtime.
 *
 * Textures are memoised by key because the same panel map is shared by every
 * hull plate on a ship.
 */

import * as THREE from 'three';
import { Rng, fbm2, noise2, hashString } from '../core/rng';

const cache = new Map<string, THREE.Texture>();

function makeCanvas(w: number, h: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: false })!;
  return { c, g };
}

function finish(
  c: HTMLCanvasElement,
  opts: { repeat?: [number, number]; srgb?: boolean; aniso?: number } = {},
): THREE.Texture {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  tex.colorSpace = opts.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = opts.aniso ?? 4;
  tex.needsUpdate = true;
  return tex;
}

function memo(key: string, build: () => THREE.Texture): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = build();
  cache.set(key, tex);
  return tex;
}

export function disposeTextureCache(): void {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}

/* -------------------------------------------------------------------------
   Hull panelling
   ------------------------------------------------------------------------- */

export interface PanelOptions {
  size?: number;
  /** Approximate panel edge length in pixels. */
  cell?: number;
  /** Base plate colour. */
  base?: string;
  /** Panel-to-panel value jitter, 0..1. */
  variance?: number;
  /** Strength of grime in the seams and lower edges. */
  grime?: number;
  /** Number of scorch smudges. */
  scorch?: number;
  /** Draw small rivets along seams. */
  rivets?: boolean;
  /** Grime hue. Rebel hulls weather warm; Imperial hulls weather cold. */
  grimeTint?: 'warm' | 'cool';
  seed?: string;
  /** Emissive window strips (Imperial hull). */
  windows?: number;
}

/**
 * Base-colour map: irregular rectangular plates, seams, rivets, streaked grime
 * and scorch. Subdivision is a seeded binary split so plate sizes vary the way
 * real panelling does.
 */
export function panelTexture(opts: PanelOptions = {}): THREE.Texture {
  const key = 'panel:' + JSON.stringify(opts);
  return memo(key, () => {
    const size = opts.size ?? 1024;
    const cell = opts.cell ?? 96;
    const base = opts.base ?? '#c9cbc6';
    const variance = opts.variance ?? 0.06;
    const grime = opts.grime ?? 0.4;
    const scorchCount = opts.scorch ?? 0;
    const rng = new Rng(opts.seed ?? 'panel');
    const { c, g } = makeCanvas(size, size);

    g.fillStyle = base;
    g.fillRect(0, 0, size, size);

    const baseCol = new THREE.Color(base);

    type Rect = { x: number; y: number; w: number; h: number };
    const rects: Rect[] = [];
    const split = (r: Rect, depth: number) => {
      const canSplit = depth < 6 && (r.w > cell * 1.5 || r.h > cell * 1.5);
      if (!canSplit || (depth > 2 && rng.chance(0.16))) {
        rects.push(r);
        return;
      }
      const horizontal = r.w > r.h ? rng.chance(0.82) : rng.chance(0.18);
      const f = rng.range(0.34, 0.66);
      if (horizontal) {
        const w = Math.round(r.w * f);
        split({ x: r.x, y: r.y, w, h: r.h }, depth + 1);
        split({ x: r.x + w, y: r.y, w: r.w - w, h: r.h }, depth + 1);
      } else {
        const h = Math.round(r.h * f);
        split({ x: r.x, y: r.y, w: r.w, h }, depth + 1);
        split({ x: r.x, y: r.y + h, w: r.w, h: r.h - h }, depth + 1);
      }
    };
    split({ x: 0, y: 0, w: size, h: size }, 0);

    // Plates
    for (const r of rects) {
      const v = 1 + rng.normal() * variance;
      const col = baseCol.clone().multiplyScalar(v);
      g.fillStyle = `rgb(${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0})`;
      g.fillRect(r.x, r.y, r.w, r.h);
    }

    // Seams: a dark line with a light highlight below it reads as a real gap.
    g.lineWidth = 1;
    for (const r of rects) {
      g.strokeStyle = `rgba(0,0,0,${0.3 + grime * 0.28})`;
      g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      g.strokeStyle = 'rgba(255,255,255,0.055)';
      g.beginPath();
      g.moveTo(r.x + 1, r.y + r.h - 1.5);
      g.lineTo(r.x + r.w - 1, r.y + r.h - 1.5);
      g.stroke();
    }

    if (opts.rivets !== false) {
      g.fillStyle = 'rgba(0,0,0,0.22)';
      for (const r of rects) {
        if (r.w < cell * 0.7 || r.h < cell * 0.7) continue;
        const step = Math.max(14, Math.min(r.w, r.h) / 5);
        for (let x = r.x + step * 0.6; x < r.x + r.w - step * 0.3; x += step) {
          g.fillRect(x, r.y + 3, 1.6, 1.6);
          g.fillRect(x, r.y + r.h - 5, 1.6, 1.6);
        }
      }
    }

    // Windows — thin emissive-looking strips for Imperial superstructure.
    if (opts.windows) {
      for (let i = 0; i < opts.windows; i++) {
        const r = rng.pick(rects);
        const rows = rng.int(1, 3);
        for (let row = 0; row < rows; row++) {
          const y = r.y + ((row + 1) * r.h) / (rows + 1);
          const n = Math.max(2, Math.floor(r.w / 13));
          for (let k = 0; k < n; k++) {
            if (rng.chance(0.24)) continue;
            g.fillStyle = rng.chance(0.8) ? 'rgba(196,222,255,0.85)' : 'rgba(120,150,190,0.5)';
            g.fillRect(r.x + 5 + k * 13, y - 1.4, 5.5, 2.8);
          }
        }
      }
    }

    // Streaked grime, biased downward in UV space.
    if (grime > 0) {
      const cool = opts.grimeTint === 'cool';
      const img = g.getImageData(0, 0, size, size);
      const d = img.data;
      const s = hashString(opts.seed ?? 'panel') & 0xffff;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          // Streaks are directional but not infinite: an extreme aspect ratio
          // here tiles into wood grain once the map repeats across a hull.
          const streak = fbm2(x / 46, y / 150, 3, s) * 0.6 + fbm2(x / 11, y / 64, 2, s + 7) * 0.4;
          const blotch = fbm2(x / 170, y / 170, 4, s + 31);
          const dirt = (streak * 0.38 + blotch * 0.62 - 0.32) * grime;
          const k = 1 - Math.max(0, dirt) * 0.72;
          // The tint is deliberately tiny. Grime covers the whole hull, so a
          // visible colour bias here reads as "the ship is painted brown"
          // rather than "the ship is dirty".
          if (cool) {
            d[i] *= k * 0.99;
            d[i + 1] *= k * 0.997;
            d[i + 2] *= k;
          } else {
            d[i] *= k;
            d[i + 1] *= k * 0.995;
            d[i + 2] *= k * 0.986;
          }
        }
      }
      g.putImageData(img, 0, 0);
    }

    // Scorch: soft radial soot smudges, near-neutral so a tiled hull does not
    // turn sepia when the map repeats.
    for (let i = 0; i < scorchCount; i++) {
      const x = rng.range(0, size);
      const y = rng.range(0, size);
      const r = rng.range(size * 0.03, size * 0.1);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(22,21,21,0.8)');
      grad.addColorStop(0.42, 'rgba(44,42,41,0.4)');
      grad.addColorStop(1, 'rgba(58,56,54,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    return finish(c, { srgb: true, aniso: 8 });
  });
}

/** Matching roughness map: seams and grime are rougher, plate faces smoother. */
export function panelRoughness(opts: PanelOptions = {}): THREE.Texture {
  const key = 'panelR:' + JSON.stringify(opts);
  return memo(key, () => {
    const size = (opts.size ?? 1024) / 2;
    const seed = hashString(opts.seed ?? 'panel') & 0xffff;
    const { c, g } = makeCanvas(size, size);
    const img = g.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const n = fbm2(x / 26, y / 26, 4, seed) * 0.6 + fbm2(x / 130, y / 130, 3, seed + 9) * 0.4;
        const v = 118 + n * 118;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return finish(c, { aniso: 4 });
  });
}

/**
 * Normal map derived from a height field of panel bevels and micro-noise.
 * Cheap central-difference conversion; good enough at the scale we view hulls.
 */
export function panelNormal(seed = 'panel', size = 512, strength = 2.4): THREE.Texture {
  return memo(`panelN:${seed}:${size}:${strength}`, () => {
    const s = hashString(seed) & 0xffff;
    const { c, g } = makeCanvas(size, size);
    const height = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        height[y * size + x] = fbm2(x / 15, y / 15, 4, s) * 0.7 + noise2(x / 3.5, y / 3.5, s + 5) * 0.3;
      }
    }
    const img = g.createImageData(size, size);
    const d = img.data;
    const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
        const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
        const len = Math.hypot(dx, dy, 1);
        const i = (y * size + x) * 4;
        d[i] = ((-dx / len) * 0.5 + 0.5) * 255;
        d[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
        d[i + 2] = (1 / len) * 0.5 * 255 + 127.5;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return finish(c, { aniso: 4 });
  });
}

/* -------------------------------------------------------------------------
   Interior surfaces
   ------------------------------------------------------------------------- */

/** Off-white corridor wall: inset rounded rectangles, seams, dirt at the base. */
export function corridorWallTexture(seed = 'wall'): THREE.Texture {
  return memo(`corridor:${seed}`, () => {
    const size = 512;
    const rng = new Rng(seed);
    const { c, g } = makeCanvas(size, size);
    // Held around 0.83 rather than near-white. The corridor is lit from a strip
    // directly overhead; at a higher albedo every panel clips before the lamp
    // itself does and the whole set goes flat.
    g.fillStyle = '#d8d6cf';
    g.fillRect(0, 0, size, size);

    const cols = 4;
    const rows = 3;
    const pad = 12;
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        const w = size / cols;
        const h = size / rows;
        const x = k * w + pad;
        const y = r * h + pad;
        const iw = w - pad * 2;
        const ih = h - pad * 2;
        g.fillStyle = `rgba(0,0,0,${0.05 + rng.range(0, 0.03)})`;
        g.fillRect(x, y, iw, ih);
        g.strokeStyle = 'rgba(0,0,0,0.24)';
        g.lineWidth = 2;
        g.strokeRect(x, y, iw, ih);
        g.strokeStyle = 'rgba(255,255,255,0.42)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(x, y + ih);
        g.lineTo(x, y);
        g.lineTo(x + iw, y);
        g.stroke();
        if (rng.chance(0.3)) {
          g.fillStyle = 'rgba(70,80,95,0.3)';
          g.fillRect(x + iw * 0.16, y + ih * 0.34, iw * 0.2, ih * 0.1);
        }
      }
    }

    const img = g.getImageData(0, 0, size, size);
    const d = img.data;
    const s = hashString(seed) & 0xffff;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const dirt = fbm2(x / 60, y / 60, 4, s) * 0.5 + fbm2(x / 14, y / 200, 3, s + 3) * 0.5;
        const floorBias = Math.pow(y / size, 2.4) * 0.26;
        // Light soiling only. Strong streaks on a moulded plastic wall read as
        // water damage rather than as a ship in service.
        const k = 1 - Math.max(0, dirt - 0.58) * 0.34 - floorBias * 0.34;
        d[i] *= k;
        d[i + 1] *= k * 0.995;
        d[i + 2] *= k * 0.982;
      }
    }
    g.putImageData(img, 0, 0);
    return finish(c, { srgb: true, aniso: 8 });
  });
}

/** Dark metal floor grating with a subtle tread pattern. */
export function floorGrateTexture(seed = 'floor'): THREE.Texture {
  return memo(`grate:${seed}`, () => {
    const size = 256;
    const { c, g } = makeCanvas(size, size);
    g.fillStyle = '#3a3c40';
    g.fillRect(0, 0, size, size);
    g.fillStyle = '#2a2c30';
    for (let y = 0; y < size; y += 32) {
      for (let x = 0; x < size; x += 32) {
        g.fillRect(x + 4, y + 4, 24, 24);
      }
    }
    g.strokeStyle = 'rgba(255,255,255,0.09)';
    g.lineWidth = 1;
    for (let y = 0; y <= size; y += 32) {
      g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(size, y + 0.5); g.stroke();
    }
    for (let x = 0; x <= size; x += 32) {
      g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, size); g.stroke();
    }
    const img = g.getImageData(0, 0, size, size);
    const d = img.data;
    const s = hashString(seed) & 0xffff;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const x = p % size;
      const y = (p / size) | 0;
      const k = 0.8 + fbm2(x / 20, y / 20, 3, s) * 0.4;
      d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
    }
    g.putImageData(img, 0, 0);
    return finish(c, { srgb: true, repeat: [1, 1], aniso: 8 });
  });
}

/** Illuminated control-panel face: readouts, keys and small status lamps. */
export function controlPanelTexture(seed = 'panel-ui'): THREE.Texture {
  return memo(`ctrl:${seed}`, () => {
    const size = 256;
    const rng = new Rng(seed);
    const { c, g } = makeCanvas(size, size);
    g.fillStyle = '#14161c';
    g.fillRect(0, 0, size, size);
    const colours = ['#6fd6ff', '#e8b657', '#ff5a4a', '#7dffa8', '#c8b4ff'];
    for (let i = 0; i < 26; i++) {
      const x = rng.range(6, size - 30);
      const y = rng.range(6, size - 16);
      const w = rng.range(8, 30);
      const h = rng.range(3, 8);
      g.fillStyle = rng.pick(colours);
      g.globalAlpha = rng.range(0.35, 1);
      g.fillRect(x, y, w, h);
    }
    g.globalAlpha = 1;
    // Waveform readout strip
    g.strokeStyle = '#6fd6ff';
    g.lineWidth = 1.4;
    g.beginPath();
    for (let x = 0; x < size; x += 3) {
      const y = size * 0.72 + Math.sin(x * 0.14) * 9 * fbm2(x / 20, 3, 2, 11) - 4;
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(180,210,255,0.55)';
      g.fillRect(rng.range(0, size), rng.range(0, size), 2, 2);
    }
    return finish(c, { srgb: true });
  });
}

/* -------------------------------------------------------------------------
   Particle kernels & sprites
   ------------------------------------------------------------------------- */

/** Soft radial falloff used by sparks, glows and engine flares. */
export function glowSprite(hardness = 0.18, size = 128): THREE.Texture {
  return memo(`glow:${hardness}:${size}`, () => {
    const { c, g } = makeCanvas(size, size);
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(hardness, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.24)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    const t = finish(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Billowing smoke puff — fbm-modulated alpha inside a soft disc. */
export function smokeSprite(seed = 'smoke', size = 128): THREE.Texture {
  return memo(`smoke:${seed}:${size}`, () => {
    const { c, g } = makeCanvas(size, size);
    const s = hashString(seed) & 0xffff;
    const img = g.createImageData(size, size);
    const d = img.data;
    const half = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const dist = Math.hypot(x - half, y - half) / half;
        const n = fbm2(x / 17, y / 17, 5, s);
        const a = Math.max(0, 1 - dist) ** 1.7 * (0.42 + n * 0.85);
        d[i] = d[i + 1] = d[i + 2] = 255;
        d[i + 3] = Math.min(255, a * 255);
      }
    }
    g.putImageData(img, 0, 0);
    const t = finish(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Star point sprite: tiny bright core with a faint four-point diffraction cross. */
export function starSprite(size = 64): THREE.Texture {
  return memo(`star:${size}`, () => {
    const { c, g } = makeCanvas(size, size);
    const h = size / 2;
    const grad = g.createRadialGradient(h, h, 0, h, h, h);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.18, 'rgba(255,255,255,0.55)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    g.strokeStyle = 'rgba(255,255,255,0.2)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(h, 6); g.lineTo(h, size - 6);
    g.moveTo(6, h); g.lineTo(size - 6, h);
    g.stroke();
    const t = finish(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/**
 * Engine bell face.
 *
 * Used as an emissive map on the flat disc that closes each nozzle. A constant
 * emissive across the disc blooms into a featureless white coin; grading it
 * from an incandescent core out to a dim rim keeps the drive reading as a
 * throat with depth, and leaves the bloom pass something to shape.
 */
export function nozzleTexture(size = 128): THREE.Texture {
  return memo(`nozzle:${size}`, () => {
    const { c, g } = makeCanvas(size, size);
    const h = size / 2;
    const grad = g.createRadialGradient(h, h, 0, h, h, h);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(228,242,255,1)');
    grad.addColorStop(0.62, 'rgba(120,178,240,1)');
    grad.addColorStop(0.86, 'rgba(38,66,104,1)');
    grad.addColorStop(1, 'rgba(6,10,18,1)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    // Faint radial vanes: turbine structure glimpsed inside the throat.
    g.globalCompositeOperation = 'multiply';
    g.strokeStyle = 'rgba(120,130,150,1)';
    g.lineWidth = Math.max(1, size / 64);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.moveTo(h + Math.cos(a) * h * 0.22, h + Math.sin(a) * h * 0.22);
      g.lineTo(h + Math.cos(a) * h * 0.9, h + Math.sin(a) * h * 0.9);
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    const t = finish(c, { srgb: true });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Rectangular flare used for engine bloom cards. */
export function flareSprite(size = 128): THREE.Texture {
  return memo(`flare:${size}`, () => {
    const { c, g } = makeCanvas(size, size);
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.25, 'rgba(210,235,255,0.5)');
    grad.addColorStop(0.62, 'rgba(120,180,255,0.13)');
    grad.addColorStop(1, 'rgba(90,150,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    const t = finish(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Scorch decal applied to breached doors and impacted hull. */
export function scorchSprite(seed = 'scorch', size = 128): THREE.Texture {
  return memo(`scorch:${seed}:${size}`, () => {
    const { c, g } = makeCanvas(size, size);
    const s = hashString(seed) & 0xffff;
    const img = g.createImageData(size, size);
    const d = img.data;
    const half = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const ang = Math.atan2(y - half, x - half);
        const wob = 0.72 + fbm2(Math.cos(ang) * 3 + 5, Math.sin(ang) * 3 + 5, 4, s) * 0.5;
        const dist = Math.hypot(x - half, y - half) / (half * wob);
        const a = Math.max(0, 1 - dist) ** 1.4;
        const n = fbm2(x / 11, y / 11, 4, s + 3);
        d[i] = 26 + n * 26;
        d[i + 1] = 20 + n * 20;
        d[i + 2] = 17 + n * 15;
        d[i + 3] = Math.min(255, a * 245 * (0.55 + n * 0.7));
      }
    }
    g.putImageData(img, 0, 0);
    const t = finish(c, { srgb: true });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Hex-cell pattern used by the deflector-shield flash shader. */
export function hexShieldTexture(size = 256): THREE.Texture {
  return memo(`hex:${size}`, () => {
    const { c, g } = makeCanvas(size, size);
    g.fillStyle = 'rgba(0,0,0,0)';
    g.clearRect(0, 0, size, size);
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 2.2;
    const r = size / 8;
    const hw = Math.sqrt(3) * r * 0.5;
    for (let row = -1; row < size / (r * 1.5) + 1; row++) {
      for (let col = -1; col < size / (hw * 2) + 1; col++) {
        const cx = col * hw * 2 + (row % 2 ? hw : 0);
        const cy = row * r * 1.5;
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
        }
        g.closePath();
        g.stroke();
      }
    }
    return finish(c);
  });
}

/** Cloth-like fabric shading for Leia's gown and Vader's cape. */
export function fabricTexture(base: string, seed = 'fabric'): THREE.Texture {
  return memo(`fabric:${base}:${seed}`, () => {
    const size = 256;
    const { c, g } = makeCanvas(size, size);
    g.fillStyle = base;
    g.fillRect(0, 0, size, size);
    const s = hashString(seed) & 0xffff;
    const img = g.getImageData(0, 0, size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const weave = (Math.sin(x * 1.6) * Math.sin(y * 1.6)) * 0.03;
        const n = fbm2(x / 30, y / 30, 3, s) * 0.14 - 0.07;
        const k = 1 + weave + n;
        d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
      }
    }
    g.putImageData(img, 0, 0);
    return finish(c, { srgb: true });
  });
}
