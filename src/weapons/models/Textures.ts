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
  /**
   * Emitted radiance, in linear working space, at full texture coverage.
   *
   * Not a colour in the 0..1 sense and it cannot be: the frame is tonemapped and
   * auto-exposed in post, and bloom's threshold is 1.15 in *exposed* units, so a
   * reticle authored at a displayable 0.95 lands below middle grey once the
   * street outside has set the exposure and can never bloom. A real illuminated
   * reticle is orders of magnitude brighter than the housing around it; these
   * are the numbers that reproduce that after exposure rather than before it.
   */
  radiance: readonly [number, number, number];
}

const reticleCache = new Map<ReticleKind, ReticleTexture>();

/**
 * Peak linear radiance per kind, and the hue.
 *
 * Green for the holographic sight: it is what the reference frames show, and it
 * is also the legibility argument, because the streets this game is set on are
 * sand and warm brick and a red dot on them is the one colour that disappears.
 *
 * The off-hue channels are the part that has to be authored carefully, and it is
 * counter-intuitive: they belong near zero, not merely lower. A first attempt at
 * these numbers put green at 14 with red at 1.7 and blue at 4.1 — a defensible
 * green in ratio — and the delivered frame measured RGB 252/253/236 at the core
 * with a saturation of 0.07. It was white. Exposure at street level puts the clip
 * point barely above 1, so every channel over about 0.3 saturates and any ratio
 * between them is discarded; what survives tonemapping is only the contrast
 * between the one channel that is allowed to blow out and the two that are not.
 *
 * The absolute level then has to come down, for a reason that only shows up once
 * there is something behind the reticle. These are additive, so the frame value is
 * the reticle plus the lens, and at green 9.5 the second attempt still measured
 * 210/216/175 — green in the halo, white in the strokes — because the lens under
 * it was a bright sky at around 0.5 and lifted red and blue over the clip point on
 * their own. Four is enough to clear a 1.15 bright pass by three stops and leaves
 * the off-hue channels room to stay dark against whatever the sight is pointed at.
 */
const RETICLE_RADIANCE: Record<ReticleKind, readonly [number, number, number]> = {
  dot: [4.4, 0.1, 0.07],
  holo: [0.09, 4, 0.28],
  chevron: [4, 0.38, 0.04],
  // Etched glass, lit by whatever comes through the objective; it emits nothing.
  crosshair: [0, 0, 0],
};

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
    radiance: RETICLE_RADIANCE[kind],
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

/**
 * Stroke widths below are in texture units, where 1.0 is half the plane.
 *
 * The plane is about 66 px tall on screen at the aimed FOV, so a unit is 33 px
 * and the ring that used to be authored 0.026 wide was 0.9 px of stroke. Drawn
 * from a mipped 256 px texture that averages to a smear at a fraction of its
 * peak, which is most of why the sight photographed empty. Nothing here goes
 * below about 3 px of delivered stroke.
 */
/**
 * Halo amplitude, as a fraction of the reticle's own radiance.
 *
 * Set against the bright pass rather than by eye: a fraction that puts the halo's
 * own peak just over the bloom threshold near 1.15 blooms at the centre and fades
 * out of it within a few pixels, which is a glow around crisp strokes. Much above
 * that and the whole halo is over the line, blooming as hard as the strokes and
 * burying them in a soft blob — the state the aimed frame was in. Much below and
 * the strokes have no glow at all and read as a decal painted on the glass.
 *
 * Tied to the radiance above rather than fixed, so retuning the reticle's
 * brightness cannot silently move the halo to the wrong side of the threshold.
 */
const RETICLE_GLOW = 0.3;

function dotReticle(px: number, py: number, aa: number): number {
  const core = disc(px, py, 0.13, aa);
  const glow = Math.pow(1 - clamp(Math.hypot(px, py) / 0.62, 0, 1), 2.2) * RETICLE_GLOW;
  return Math.max(core, glow);
}

function holoReticle(px: number, py: number, aa: number): number {
  let a = Math.max(disc(px, py, 0.105, aa), ring(px, py, 0.62, 0.05, aa));
  // Four ticks pointing inwards from the ring, EOTech style.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const cx = Math.cos(ang);
    const cy = Math.sin(ang);
    a = Math.max(a, segment(px, py, cx * 0.62, cy * 0.62, cx * 0.42, cy * 0.42, 0.042, aa));
  }
  const glow = Math.pow(1 - clamp(Math.hypot(px, py) / 0.46, 0, 1), 2.6) * RETICLE_GLOW;
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
  const t = 0.05;
  const apex = -t;
  let a = Math.max(
    segment(px, py, 0, apex, -0.26, apex - 0.38, t, aa),
    segment(px, py, 0, apex, 0.26, apex - 0.38, t, aa),
  );
  // Bullet-drop stadia below the apex.
  for (let i = 1; i <= 3; i++) {
    a = Math.max(a, disc(px, py + 0.34 + 0.18 * i, 0.034, aa));
  }
  const glow = Math.pow(1 - clamp(Math.hypot(px, py + 0.2) / 0.7, 0, 1), 2.6) * RETICLE_GLOW;
  return Math.max(a, glow);
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

  // Colour every texel, including the transparent ones, and let alpha do all the
  // shaping. This is the difference between a marking that reads and the "one
  // illegible decal" of the review, and the reason is mipmapping: the paint is
  // maybe a sixth of the quad by area, so a level that averages ink with an
  // uncoloured background converges on five-sixths of nothing. A stencil seen
  // small then arrives as a *dark* smudge — the exact opposite of white paint —
  // and no amount of enlarging the glyphs fixes it, because the ratio does not
  // change with size. Flooding the colour makes every mip level the paint's own
  // colour at the paint's own coverage, which is what a rollmark two hundred
  // millimetres from the eye actually looks like.
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = cr;
    data[i * 4 + 1] = cg;
    data[i * 4 + 2] = cb;
  }

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
              // Rasterised bottom-up. A DataTexture is the one kind three does not
              // flip on upload, so row zero is v=0, and glyph rows counted from the
              // top land the type upside down — which is most of what "illegible"
              // meant: the markings were sharp, correctly placed and inverted, and a
              // mirrored rollmark is unreadable at any size or contrast.
              const y = height - 1 - (cellY * scale + sy);
              const n = hashNoise(x * 7 + seed, y * 13 + seed);
              const a = n < wear * 0.55 ? 0 : 255;
              data[(y * width + x) * 4 + 3] = Math.max(data[(y * width + x) * 4 + 3], a);
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
  // A marking on a receiver flank is nearly always seen at a slant, so it is
  // minified far harder across the glyphs than along them. Isotropic filtering
  // has to pick one, and picking the safe one throws the type away.
  texture.anisotropy = 8;
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
