import * as THREE from 'three';
import { clamp, smoothstep } from '../../core/MathUtils';

/**
 * Small procedural textures for the weapon models: optic reticles and stencil
 * markings. Everything is rasterised into a DataTexture from code — no canvas,
 * no image files — so the result is identical on every platform and costs a few
 * tens of kilobytes.
 */

// ---------------------------------------------------------------------------
// Reticles
// ---------------------------------------------------------------------------

export type ReticleKind = 'dot' | 'holo' | 'chevron' | 'crosshair';

export interface ReticleTexture {
  texture: THREE.DataTexture;
  /** Illuminated reticles are drawn additively; etched glass reticles are not. */
  additive: boolean;
  color: number;
}

const reticleCache = new Map<ReticleKind, ReticleTexture>();

export function reticleTexture(kind: ReticleKind): ReticleTexture {
  const cached = reticleCache.get(kind);
  if (cached) return cached;

  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const aa = 2.4 / size;
  const black = kind === 'crosshair';
  const r = black ? 12 : 255;
  const g = black ? 12 : 255;
  const b = black ? 14 : 255;

  for (let y = 0; y < size; y++) {
    const py = (y / (size - 1)) * 2 - 1;
    for (let x = 0; x < size; x++) {
      const px = (x / (size - 1)) * 2 - 1;
      let a = 0;
      switch (kind) {
        case 'dot':
          a = dotReticle(px, py, aa);
          break;
        case 'holo':
          a = holoReticle(px, py, aa);
          break;
        case 'chevron':
          a = chevronReticle(px, py, aa);
          break;
        case 'crosshair':
          a = crosshairReticle(px, py, aa);
          break;
      }
      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = Math.round(clamp(a, 0, 1) * 255);
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = `reticle_${kind}`;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const result: ReticleTexture = {
    texture,
    additive: !black,
    color: kind === 'chevron' ? 0xff5a1e : kind === 'crosshair' ? 0x000000 : 0xff2418,
  };
  reticleCache.set(kind, result);
  return result;
}

function disc(px: number, py: number, radius: number, aa: number): number {
  return 1 - smoothstep(radius - aa, radius + aa, Math.hypot(px, py));
}

function ring(px: number, py: number, radius: number, thickness: number, aa: number): number {
  const d = Math.abs(Math.hypot(px, py) - radius);
  return 1 - smoothstep(thickness - aa, thickness + aa, d);
}

function segment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  thickness: number,
  aa: number,
): number {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 > 0 ? clamp(((px - ax) * vx + (py - ay) * vy) / len2, 0, 1) : 0;
  const d = Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
  return 1 - smoothstep(thickness - aa, thickness + aa, d);
}

function dotReticle(px: number, py: number, aa: number): number {
  const core = disc(px, py, 0.11, aa);
  const glow = Math.pow(1 - clamp(Math.hypot(px, py) / 0.42, 0, 1), 2.4) * 0.35;
  return Math.max(core, glow);
}

function holoReticle(px: number, py: number, aa: number): number {
  let a = Math.max(disc(px, py, 0.075, aa), ring(px, py, 0.62, 0.026, aa));
  // Four ticks pointing inwards from the ring, EOTech style.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const cx = Math.cos(ang);
    const cy = Math.sin(ang);
    a = Math.max(a, segment(px, py, cx * 0.62, cy * 0.62, cx * 0.44, cy * 0.44, 0.022, aa));
  }
  const glow = Math.pow(1 - clamp(Math.hypot(px, py) / 0.3, 0, 1), 3) * 0.25;
  return Math.max(a, glow);
}

function chevronReticle(px: number, py: number, aa: number): number {
  // The apex is the aim point, so the tip has to sit exactly at the centre of the
  // plane: the whole reticle hangs below it and the texture's upper half goes
  // unused. Offsetting it to balance the layout would put the point of aim off
  // the sight axis, which is a miss at every range.
  //
  // What a shooter aims with is the visible tip, and the strokes are capsules, so
  // the ink reaches a full stroke radius past where the two centre lines meet.
  // The join therefore has to sit one radius low for the tip to land on the axis.
  const t = 0.038;
  const apex = -t;
  let a = Math.max(
    segment(px, py, 0, apex, -0.26, apex - 0.38, t, aa),
    segment(px, py, 0, apex, 0.26, apex - 0.38, t, aa),
  );
  // Bullet-drop stadia below the apex.
  for (let i = 1; i <= 3; i++) {
    a = Math.max(a, disc(px, py + 0.34 + 0.18 * i, 0.028, aa));
  }
  return a;
}

function crosshairReticle(px: number, py: number, aa: number): number {
  const fine = 0.0065;
  const thick = 0.017;
  let a = 0;
  // Fine inner cross with a gap at the centre so the aim point stays visible.
  if (Math.abs(px) > 0.03 || Math.abs(py) > 0.03) {
    a = Math.max(
      segment(px, py, -0.62, 0, 0.62, 0, fine, aa),
      segment(px, py, 0, -0.62, 0, 0.62, fine, aa),
    );
  }
  // Heavy duplex posts from the edge inwards.
  a = Math.max(
    a,
    segment(px, py, -1.0, 0, -0.62, 0, thick, aa),
    segment(px, py, 1.0, 0, 0.62, 0, thick, aa),
    segment(px, py, 0, -1.0, 0, -0.62, thick, aa),
    segment(px, py, 0, 1.0, 0, 0.62, thick, aa),
  );
  // Mil-dots.
  for (let i = 1; i <= 4; i++) {
    const d = i * 0.125;
    a = Math.max(
      a,
      disc(px - d, py, 0.0115, aa),
      disc(px + d, py, 0.0115, aa),
      disc(px, py - d, 0.0115, aa),
      disc(px, py + d, 0.0115, aa),
    );
  }
  return a;
}

// ---------------------------------------------------------------------------
// Stencil markings
// ---------------------------------------------------------------------------

/**
 * 5x7 stencil face. Selector markings and serial numbers are the details that
 * sell a weapon as a manufactured object, and they have to be legible at 20 cm,
 * so they are real glyphs rather than noise standing in for text.
 */
const GLYPHS: Record<string, string> = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '11111 00100 00100 00100 00100 00100 11111',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 11001 10101 10011 10001 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10011 01111',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 11011 01010',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  '0': '01110 10001 10011 10101 11001 10001 01110',
  '1': '00100 01100 00100 00100 00100 00100 01110',
  '2': '01110 10001 00001 00010 00100 01000 11111',
  '3': '11110 00001 00001 01110 00001 00001 11110',
  '4': '00010 00110 01010 10010 11111 00010 00010',
  '5': '11111 10000 10000 11110 00001 00001 11110',
  '6': '00110 01000 10000 11110 10001 10001 01110',
  '7': '11111 00001 00010 00100 01000 01000 01000',
  '8': '01110 10001 10001 01110 10001 10001 01110',
  '9': '01110 10001 10001 01111 00001 00010 01100',
  '-': '00000 00000 00000 11111 00000 00000 00000',
  '.': '00000 00000 00000 00000 00000 01100 01100',
  ':': '00000 01100 01100 00000 01100 01100 00000',
  '/': '00001 00001 00010 00100 01000 10000 10000',
  '*': '00000 01010 00100 11111 00100 01010 00000',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
};

const GLYPH_W = 5;
const GLYPH_H = 7;

export interface StencilOptions {
  /** Texture pixels per glyph pixel. */
  scale?: number;
  /** Blank border in glyph pixels. */
  padding?: number;
  color?: number;
  /** 0 = crisp, 1 = heavily worn edges. */
  wear?: number;
  seed?: number;
}

/**
 * Rasterises lines of text into an alpha texture sized to the content, so the
 * caller can build a quad with the same aspect ratio and get undistorted type.
 */
export function stencilTexture(
  lines: readonly string[],
  opts: StencilOptions = {},
): { texture: THREE.DataTexture; aspect: number } {
  const scale = Math.max(1, Math.round(opts.scale ?? 4));
  const padding = opts.padding ?? 1;
  const wear = clamp(opts.wear ?? 0.25, 0, 1);
  const seed = opts.seed ?? 1;

  const cols = Math.max(1, ...lines.map((l) => l.length));
  const glyphCells = cols * (GLYPH_W + 1) - 1;
  const rowCells = lines.length * (GLYPH_H + 2) - 2;
  const width = (glyphCells + padding * 2) * scale;
  const height = (rowCells + padding * 2) * scale;
  const data = new Uint8Array(width * height * 4);

  const color = new THREE.Color(opts.color ?? 0xd8d4cc);
  const cr = Math.round(color.r * 255);
  const cg = Math.round(color.g * 255);
  const cb = Math.round(color.b * 255);

  for (let li = 0; li < lines.length; li++) {
    const text = lines[li].toUpperCase();
    for (let ci = 0; ci < text.length; ci++) {
      const rows = (GLYPHS[text[ci]] ?? GLYPHS['*']).split(' ');
      for (let gy = 0; gy < GLYPH_H; gy++) {
        const row = rows[gy];
        for (let gx = 0; gx < GLYPH_W; gx++) {
          if (row[gx] !== '1') continue;
          const cellX = padding + ci * (GLYPH_W + 1) + gx;
          const cellY = padding + li * (GLYPH_H + 2) + gy;
          // Deterministic speckle so the paint looks rubbed rather than printed.
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const x = cellX * scale + sx;
              const y = cellY * scale + sy;
              const n = hashNoise(x * 7 + seed, y * 13 + seed);
              const a = n < wear * 0.55 ? 0 : 255;
              const i = (y * width + x) * 4;
              data[i] = cr;
              data[i + 1] = cg;
              data[i + 2] = cb;
              data[i + 3] = Math.max(data[i + 3], a);
            }
          }
        }
      }
    }
  }

  boxBlurAlpha(data, width, height);

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.name = `stencil_${lines.join('_')}`;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return { texture, aspect: width / height };
}

function hashNoise(x: number, y: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** One 3x3 pass, just enough to stop the 5x7 grid reading as pixel art. */
function boxBlurAlpha(data: Uint8Array, width: number, height: number): void {
  const src = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) src[i] = data[i * 4 + 3];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let oy = -1; oy <= 1; oy++) {
        const yy = y + oy;
        if (yy < 0 || yy >= height) continue;
        for (let ox = -1; ox <= 1; ox++) {
          const xx = x + ox;
          if (xx < 0 || xx >= width) continue;
          sum += src[yy * width + xx];
          count++;
        }
      }
      const i = (y * width + x) * 4;
      const blurred = sum / Math.max(1, count);
      data[i + 3] = Math.round(Math.max(src[y * width + x] * 0.55, blurred));
    }
  }
}

let stencilSerial = 0;

/** A plausible arsenal serial: two letters, five digits, a lot code. */
export function makeSerial(rng: { int(a: number, b: number): number; pick<T>(a: readonly T[]): T }): string {
  const letters = 'ABCDEFGHJKLMNPRSTVWXZ'.split('');
  const digits = `${rng.int(10000, 99999)}`;
  stencilSerial++;
  return `${rng.pick(letters)}${rng.pick(letters)} ${digits}`;
}

export function disposeTextureCache(): void {
  for (const entry of reticleCache.values()) entry.texture.dispose();
  reticleCache.clear();
}
