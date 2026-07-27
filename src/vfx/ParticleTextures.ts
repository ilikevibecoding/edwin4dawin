import * as THREE from 'three';
import { makeRng, type Rng, TAU, clamp, smoothstep } from '../core/MathX';

/**
 * Procedural sprite atlases for the particle engine.
 *
 * Everything is drawn into 2D canvases at boot — no downloads. Two atlases are
 * produced, one per blend mode:
 *
 *   • ADDITIVE atlas — sparks, muzzle-flash petals, fire flipbook, embers,
 *     shockwave ring, glints. Background is black (additive ignores it).
 *   • ALPHA atlas — smoke variants + flipbook, dust, blood mist, debris
 *     silhouettes, water splash, splinters, hessian fibres, sand grains.
 *     Background is transparent.
 *
 * Both are 8×8 grids of 128px cells (1024²). The shader addresses a cell by a
 * linear index and can walk N contiguous cells for a flipbook. Shapes are
 * modulated by value-noise so edges read organic rather than as clean
 * gradients (the #1 tell of a cheap particle system).
 *
 * Channel convention (shared by the shader):
 *   .a   = shape/coverage mask
 *   .rgb = per-texel colour detail (white where the effect is tinted per
 *          particle, baked colour for fire).
 */

export const ATLAS_COLS = 8;
const CELL = 128;
const SIZE = ATLAS_COLS * CELL; // 1024

/** Cell indices into the additive atlas. */
export const ADD = {
  FLASH0: 0,
  FLASH1: 1,
  FLASH2: 2,
  FLASH3: 3,
  SPARK: 4,
  CORE: 5,
  RING: 6,
  GLINT: 7,
  FIRE0: 8, // 8 contiguous frames -> 8..15
  EMBER: 16,
  FLASH4: 17,
  FLASH5: 18,
} as const;

/** Cell indices into the alpha atlas. */
export const ALP = {
  PUFF: 0,
  SMOKE0: 1,
  SMOKE1: 2,
  SMOKE2: 3,
  DUST: 4,
  BLOOD: 5,
  CHUNK: 6,
  SPLASH: 7,
  SMK0: 8, // 8 contiguous frames -> 8..15
  SPLINTER: 16,
  FIBRE: 17,
  GRAIN: 18,
  DROP: 19,
  SHARD: 20,
} as const;

export const MUZZLE_FLASHES = [ADD.FLASH0, ADD.FLASH1, ADD.FLASH2, ADD.FLASH3, ADD.FLASH4, ADD.FLASH5];

// ---------------------------------------------------------------------------
// value-noise / fbm helpers (also reused by DecalManager)
// ---------------------------------------------------------------------------

/** Deterministic value-noise sampler over a wrapping grid. */
export function makeNoise2D(seed: number, grid = 64) {
  const rng = makeRng(seed);
  const g = new Float32Array(grid * grid);
  for (let i = 0; i < g.length; i++) g[i] = rng();
  const at = (x: number, y: number) => g[(y & (grid - 1)) * grid + (x & (grid - 1))];
  const isPow2 = (grid & (grid - 1)) === 0;
  const wrap = (v: number, m: number) => ((v % m) + m) % m;
  const sample = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const idx = (ax: number, ay: number) =>
      isPow2 ? at(ax, ay) : g[wrap(ay, grid) * grid + wrap(ax, grid)];
    const a = idx(xi, yi);
    const b = idx(xi + 1, yi);
    const c = idx(xi, yi + 1);
    const d = idx(xi + 1, yi + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  return (x: number, y: number, octaves = 4, freq = 1) => {
    let v = 0;
    let amp = 0.5;
    let f = freq;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      v += amp * sample(x * f, y * f);
      norm += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return v / norm;
  };
}

type Noise = ReturnType<typeof makeNoise2D>;

export class ParticleTextures {
  readonly additive: THREE.CanvasTexture;
  readonly alpha: THREE.CanvasTexture;
  readonly cols = ATLAS_COLS;

  private canvases: HTMLCanvasElement[] = [];
  private tmpCanvas: HTMLCanvasElement;
  private tmpCtx: CanvasRenderingContext2D;

  private makeTmp() {
    const c = document.createElement('canvas');
    c.width = CELL;
    c.height = CELL;
    return c;
  }

  constructor() {
    this.tmpCanvas = this.makeTmp();
    this.tmpCtx = this.tmpCanvas.getContext('2d')!;
    this.additive = this.build('additive', 0x51f7c3, (c, n, rng) => this.drawAdditive(c, n, rng));
    this.alpha = this.build('alpha', 0x9a3b1e, (c, n, rng) => this.drawAlpha(c, n, rng));
  }

  private build(
    name: string,
    seed: number,
    draw: (ctx: CanvasRenderingContext2D, noise: Noise, rng: Rng) => void
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    const noise = makeNoise2D(seed, 64);
    const rng = makeRng(seed ^ 0x1234);
    draw(ctx, noise, rng);
    this.canvases.push(canvas);
    const tex = new THREE.CanvasTexture(canvas);
    tex.name = `vfx-atlas-${name}`;
    tex.colorSpace = THREE.SRGBColorSpace;
    // Mipmaps would blend neighbouring atlas cells into each other; particles
    // are large on screen so we forego them to keep cells clean.
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    // flipY=false so canvas pixel (0,0)=top-left maps to uv (0,0); the shader
    // addresses cells in that same top-left origin space.
    tex.flipY = false;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Render a sprite into a local 128² temp canvas (origin 0,0) then blit it to
   * the target cell. This is essential because `putImageData`/`getImageData`
   * ignore canvas transforms — the draw helpers all work in local space and we
   * composite here with `drawImage`, which respects the destination offset.
   */
  private cell(
    _ctx: CanvasRenderingContext2D,
    index: number,
    fn: (ctx: CanvasRenderingContext2D) => void
  ) {
    const cx = (index % ATLAS_COLS) * CELL;
    const cy = Math.floor(index / ATLAS_COLS) * CELL;
    const tc = this.tmpCtx;
    tc.setTransform(1, 0, 0, 1, 0, 0);
    tc.clearRect(0, 0, CELL, CELL);
    fn(tc);
    _ctx.drawImage(this.tmpCanvas, cx, cy);
  }

  // -------------------------------------------------------------------------
  // ADDITIVE atlas
  // -------------------------------------------------------------------------

  private drawAdditive(ctx: CanvasRenderingContext2D, noise: Noise, rng: Rng) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SIZE, SIZE);

    MUZZLE_FLASHES.forEach((idx, i) =>
      this.cell(ctx, idx, (c) => this.flashStar(c, noise, rng, i))
    );
    this.cell(ctx, ADD.SPARK, (c) => this.sparkStreak(c, noise));
    this.cell(ctx, ADD.CORE, (c) => this.softDot(c, 1, 1, 1, 0.55));
    this.cell(ctx, ADD.RING, (c) => this.ring(c, noise));
    this.cell(ctx, ADD.GLINT, (c) => this.glint(c));
    this.cell(ctx, ADD.EMBER, (c) => this.softDot(c, 1, 0.6, 0.28, 0.32));
    for (let f = 0; f < 8; f++) {
      this.cell(ctx, ADD.FIRE0 + f, (c) => this.fireLick(c, noise, f / 7));
    }
  }

  private flashStar(ctx: CanvasRenderingContext2D, noise: Noise, rng: Rng, variant: number) {
    // DIRECTIONAL muzzle flash: a ragged star whose long axis runs vertically
    // (local +Y). The shader's ALIGN mode rotates local +Y onto the barrel's
    // screen projection, so the long spikes always run down the bore. A tight
    // white-hot core keeps a readable shape instead of a uniform bloom ball.
    const h = CELL / 2;
    const petals = 4 + (variant % 3); // 4..6 side petals
    const spin = (rng() - 0.5) * 0.5; // small roll so the axis stays vertical
    const seedA = variant * 7.3 + 3;

    // Tight hot core, biased slightly toward the base (bottom = toward muzzle).
    const cy = h + CELL * 0.06;
    const core = ctx.createRadialGradient(h, cy, 0, h, cy, CELL * 0.15);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(0.5, 'rgba(255,244,214,0.92)');
    core.addColorStop(1, 'rgba(255,150,45,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, CELL, CELL);

    const img = ctx.getImageData(0, 0, CELL, CELL);
    const d = img.data;
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const dx = x - h;
        const dy = y - h;
        const r = Math.hypot(dx, dy) / h;
        if (r > 1) continue;
        const a = Math.atan2(dy, dx) + spin;
        // strong lobes along the vertical axis (up = forward gas jet, down =
        // shorter muzzle bloom), short side petals, all noise-jittered.
        const axis = Math.pow(Math.abs(Math.sin(a)), 2.2);
        const forward = Math.max(0, Math.sin(a)); // upper half reaches further
        const star = Math.pow(Math.abs(Math.cos((a * petals) / 2)), 3.4);
        const jag = noise(Math.cos(a) * 3 + seedA, Math.sin(a) * 3 + seedA, 3, 2);
        const reach =
          0.2 + 0.72 * axis * (0.6 + 0.7 * jag) + 0.28 * forward + 0.16 * star * (0.5 + jag);
        const spike = clamp(1 - r / reach, 0, 1);
        const s = spike * spike;
        const i = (y * CELL + x) * 4;
        const add = s * 255;
        d[i] = Math.min(255, d[i] + add);
        d[i + 1] = Math.min(255, d[i + 1] + add * 0.78);
        d[i + 2] = Math.min(255, d[i + 2] + add * 0.42);
        d[i + 3] = Math.min(255, d[i + 3] + add);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private sparkStreak(ctx: CanvasRenderingContext2D, noise: Noise) {
    // A hot vertical streak, tapered, jittered along its length.
    const cx = CELL / 2;
    for (let y = 0; y < CELL; y++) {
      const t = y / CELL;
      const taper = Math.sin(t * Math.PI);
      const width = 2 + taper * 7;
      const wob = (noise(t * 8, 3, 3, 3) - 0.5) * 10;
      const bright = Math.pow(taper, 0.6);
      const grad = ctx.createLinearGradient(cx + wob - width, 0, cx + wob + width, 0);
      grad.addColorStop(0, 'rgba(255,180,90,0)');
      grad.addColorStop(0.5, `rgba(255,${Math.round(210 + bright * 45)},${Math.round(160)},${bright})`);
      grad.addColorStop(1, 'rgba(255,180,90,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx + wob - width, y, width * 2, 1.5);
    }
  }

  private softDot(ctx: CanvasRenderingContext2D, r: number, g: number, b: number, falloff: number) {
    const h = CELL / 2;
    const grad = ctx.createRadialGradient(h, h, 0, h, h, h);
    const col = `${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)}`;
    grad.addColorStop(0, `rgba(${col},1)`);
    grad.addColorStop(falloff, `rgba(${col},0.5)`);
    grad.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CELL, CELL);
  }

  private ring(ctx: CanvasRenderingContext2D, noise: Noise) {
    const h = CELL / 2;
    const img = ctx.createImageData(CELL, CELL);
    const d = img.data;
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const dx = x - h;
        const dy = y - h;
        const r = Math.hypot(dx, dy) / h;
        const a = Math.atan2(dy, dx);
        const jag = 0.9 + 0.2 * noise(Math.cos(a) * 4 + 3, Math.sin(a) * 4 + 3, 3, 2);
        const band = Math.exp(-Math.pow((r - 0.82 * jag) / 0.10, 2));
        const s = clamp(band, 0, 1);
        const i = (y * CELL + x) * 4;
        d[i] = 255;
        d[i + 1] = Math.round(230 * s + 200);
        d[i + 2] = Math.round(180 * s);
        d[i + 3] = Math.round(s * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private glint(ctx: CanvasRenderingContext2D) {
    const h = CELL / 2;
    ctx.translate(h, h);
    for (let k = 0; k < 2; k++) {
      ctx.rotate(k === 0 ? 0 : Math.PI / 4);
      const grad = ctx.createLinearGradient(-h, 0, h, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      const w = k === 0 ? 3 : 1.5;
      ctx.fillRect(-h, -w, CELL, w * 2);
      ctx.fillRect(-w, -h, w * 2, CELL);
    }
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, h * 0.4);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.fillRect(-h, -h, CELL, CELL);
  }

  private fireLick(ctx: CanvasRenderingContext2D, noise: Noise, t: number) {
    // Flame that rises and narrows across the flipbook; hot white base,
    // orange body, dark-red wisps at the tip.
    const h = CELL / 2;
    const img = ctx.createImageData(CELL, CELL);
    const d = img.data;
    const rise = t * 0.35;
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const nx = x / CELL;
        const ny = y / CELL;
        // bottom of the cell is the flame base
        const up = 1 - ny;
        const width = (0.16 + 0.24 * (1 - t)) * (0.4 + up * 0.9);
        const cxOff = (noise(ny * 5 + t * 4, 2, 3, 2) - 0.5) * 0.35 * (1 - up);
        const dist = Math.abs(nx - 0.5 - cxOff) / width;
        const flame = clamp(1 - dist, 0, 1);
        const turb = noise(nx * 6, ny * 6 - t * 6, 4, 2);
        const body = clamp(flame * (0.6 + 0.8 * turb) * smoothstep((up - rise) * 1.6), 0, 1);
        if (body <= 0.01) continue;
        const heat = clamp(up * 1.4 - 0.1, 0, 1) * body;
        const i = (y * CELL + x) * 4;
        d[i] = Math.round(255 * clamp(body * 1.2, 0, 1));
        d[i + 1] = Math.round(255 * clamp(heat * 1.1, 0, 1));
        d[i + 2] = Math.round(255 * clamp(heat * heat * 0.7, 0, 1));
        d[i + 3] = Math.round(clamp(body, 0, 1) * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // -------------------------------------------------------------------------
  // ALPHA atlas
  // -------------------------------------------------------------------------

  private drawAlpha(ctx: CanvasRenderingContext2D, noise: Noise, rng: Rng) {
    ctx.clearRect(0, 0, SIZE, SIZE);

    this.cell(ctx, ALP.PUFF, (c) => this.puff(c, noise, 1.0));
    this.cell(ctx, ALP.SMOKE0, (c) => this.smokeWisp(c, makeNoise2D(11, 64), 0.9));
    this.cell(ctx, ALP.SMOKE1, (c) => this.smokeWisp(c, makeNoise2D(29, 64), 1.1));
    this.cell(ctx, ALP.SMOKE2, (c) => this.smokeWisp(c, makeNoise2D(47, 64), 0.75));
    this.cell(ctx, ALP.DUST, (c) => this.puff(c, makeNoise2D(63, 64), 1.25));
    this.cell(ctx, ALP.BLOOD, (c) => this.bloodSplat(c, noise, rng));
    this.cell(ctx, ALP.CHUNK, (c) => this.chunk(c, noise, rng, 0.55));
    this.cell(ctx, ALP.SPLASH, (c) => this.splash(c, noise));
    for (let f = 0; f < 8; f++) {
      this.cell(ctx, ALP.SMK0 + f, (c) => this.smokeFrame(c, makeNoise2D(101 + f * 13, 64), f / 7));
    }
    this.cell(ctx, ALP.SPLINTER, (c) => this.splinter(c, rng));
    this.cell(ctx, ALP.FIBRE, (c) => this.fibre(c, rng));
    this.cell(ctx, ALP.GRAIN, (c) => this.softDotAlpha(c, 0.35));
    this.cell(ctx, ALP.DROP, (c) => this.droplet(c));
    this.cell(ctx, ALP.SHARD, (c) => this.shard(c, rng));
  }

  private puff(ctx: CanvasRenderingContext2D, noise: Noise, density: number) {
    const h = CELL / 2;
    const img = ctx.createImageData(CELL, CELL);
    const d = img.data;
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const dx = (x - h) / h;
        const dy = (y - h) / h;
        const r = Math.hypot(dx, dy);
        const a = Math.atan2(dy, dx);
        const edge = 0.55 + 0.35 * noise(Math.cos(a) * 2.2 + 5, Math.sin(a) * 2.2 + 5, 4, 1.5);
        const lumps = noise(x / CELL * 5 + 2, y / CELL * 5 + 2, 4, 2);
        let cov = clamp(1 - r / edge, 0, 1);
        cov = Math.pow(cov, 1.4) * (0.5 + 0.9 * lumps) * density;
        cov = clamp(cov, 0, 1);
        const i = (y * CELL + x) * 4;
        const shade = 200 + Math.round(lumps * 55);
        d[i] = shade;
        d[i + 1] = shade;
        d[i + 2] = shade;
        d[i + 3] = Math.round(cov * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private smokeWisp(ctx: CanvasRenderingContext2D, noise: Noise, density: number) {
    const h = CELL / 2;
    const img = ctx.createImageData(CELL, CELL);
    const d = img.data;
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const dx = (x - h) / h;
        const dy = (y - h) / h;
        const r = Math.hypot(dx, dy);
        const warpX = (noise(x / CELL * 2.5, y / CELL * 2.5, 3, 1) - 0.5) * 0.6;
        const warpY = (noise(x / CELL * 2.5 + 9, y / CELL * 2.5 + 9, 3, 1) - 0.5) * 0.6;
        const n = noise((x / CELL + warpX) * 3.2, (y / CELL + warpY) * 3.2, 5, 1.5);
        const falloff = clamp(1 - r, 0, 1);
        let cov = clamp((n - 0.32) * 2.4, 0, 1) * Math.pow(falloff, 1.2) * density;
        cov = clamp(cov, 0, 1);
        const i = (y * CELL + x) * 4;
        const shade = 190 + Math.round(n * 60);
        d[i] = shade;
        d[i + 1] = shade;
        d[i + 2] = shade;
        d[i + 3] = Math.round(cov * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private smokeFrame(ctx: CanvasRenderingContext2D, noise: Noise, t: number) {
    // Flipbook smoke: a rolling, expanding puff whose internal detail scrolls.
    const h = CELL / 2;
    const img = ctx.createImageData(CELL, CELL);
    const d = img.data;
    const scroll = t * 0.5;
    const expand = 0.6 + t * 0.4;
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const dx = (x - h) / (h * expand);
        const dy = (y - h) / (h * expand);
        const r = Math.hypot(dx, dy);
        const warpX = (noise(x / CELL * 2, y / CELL * 2 + scroll, 3, 1) - 0.5) * 0.5;
        const n = noise((x / CELL + warpX) * 3.5, (y / CELL) * 3.5 - scroll, 5, 1.4);
        const falloff = clamp(1 - r, 0, 1);
        let cov = clamp((n - 0.3) * 2.3, 0, 1) * Math.pow(falloff, 1.3);
        cov = clamp(cov * (1 - t * 0.35), 0, 1);
        const i = (y * CELL + x) * 4;
        const shade = 180 + Math.round(n * 70);
        d[i] = shade;
        d[i + 1] = shade;
        d[i + 2] = shade;
        d[i + 3] = Math.round(cov * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private bloodSplat(ctx: CanvasRenderingContext2D, noise: Noise, rng: Rng) {
    // Reddish irregular mist blob (used as a particle, not the wall decal).
    const h = CELL / 2;
    const img = ctx.createImageData(CELL, CELL);
    const d = img.data;
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const dx = (x - h) / h;
        const dy = (y - h) / h;
        const r = Math.hypot(dx, dy);
        const a = Math.atan2(dy, dx);
        const edge = 0.5 + 0.4 * noise(Math.cos(a) * 3 + 1, Math.sin(a) * 3 + 1, 4, 2);
        const n = noise(x / CELL * 6, y / CELL * 6, 4, 2);
        let cov = clamp(1 - r / edge, 0, 1);
        cov = Math.pow(cov, 1.5) * (0.4 + n);
        cov = clamp(cov, 0, 1);
        const i = (y * CELL + x) * 4;
        d[i] = Math.round(150 + n * 60);
        d[i + 1] = Math.round(12 + n * 20);
        d[i + 2] = Math.round(10 + n * 14);
        d[i + 3] = Math.round(cov * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    // a few flung droplets
    ctx.fillStyle = 'rgba(120,10,8,0.9)';
    for (let k = 0; k < 8; k++) {
      const rr = 2 + rng() * 5;
      ctx.beginPath();
      ctx.arc(rng() * CELL, rng() * CELL, rr, 0, TAU);
      ctx.fill();
    }
  }

  private chunk(ctx: CanvasRenderingContext2D, noise: Noise, rng: Rng, fill: number) {
    // Irregular opaque debris silhouette with a lit top edge.
    const h = CELL / 2;
    const pts = 7 + Math.floor(rng() * 4);
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * TAU;
      const rad = h * (fill + 0.25 * noise(Math.cos(a) * 3 + 2, Math.sin(a) * 3 + 2, 3, 2));
      const x = h + Math.cos(a) * rad;
      const y = h + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, CELL);
    grad.addColorStop(0, 'rgba(150,140,128,1)');
    grad.addColorStop(0.5, 'rgba(96,88,78,1)');
    grad.addColorStop(1, 'rgba(46,42,38,1)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  private splash(ctx: CanvasRenderingContext2D, noise: Noise) {
    // Water crown: a ring of vertical liquid fingers, translucent bluish white.
    const h = CELL / 2;
    const img = ctx.createImageData(CELL, CELL);
    const d = img.data;
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const dx = (x - h) / h;
        const dy = (y - h) / h;
        const r = Math.hypot(dx, dy);
        const a = Math.atan2(dy, dx);
        const fingers = 0.5 + 0.5 * Math.cos(a * 9 + noise(Math.cos(a) * 3, Math.sin(a) * 3, 3, 2) * 6);
        const band = Math.exp(-Math.pow((r - 0.7) / (0.12 + 0.18 * fingers), 2));
        const cov = clamp(band * (0.5 + fingers), 0, 1);
        const i = (y * CELL + x) * 4;
        d[i] = 210;
        d[i + 1] = 228;
        d[i + 2] = 240;
        d[i + 3] = Math.round(cov * 220);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private splinter(ctx: CanvasRenderingContext2D, rng: Rng) {
    const h = CELL / 2;
    ctx.translate(h, h);
    ctx.rotate(rng() * TAU);
    const grad = ctx.createLinearGradient(0, -h, 0, h);
    grad.addColorStop(0, 'rgba(120,86,50,0)');
    grad.addColorStop(0.5, 'rgba(150,110,68,1)');
    grad.addColorStop(1, 'rgba(90,62,36,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-3, -h * 0.9);
    ctx.lineTo(2, -h * 0.5);
    ctx.lineTo(4, h * 0.9);
    ctx.lineTo(-2, h * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  private fibre(ctx: CanvasRenderingContext2D, rng: Rng) {
    const h = CELL / 2;
    ctx.translate(h, h);
    ctx.rotate(rng() * TAU);
    ctx.strokeStyle = 'rgba(174,150,96,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.85);
    for (let i = -h * 0.85; i < h * 0.85; i += 6) {
      ctx.lineTo((rng() - 0.5) * 8, i);
    }
    ctx.stroke();
  }

  private softDotAlpha(ctx: CanvasRenderingContext2D, falloff: number) {
    const h = CELL / 2;
    const grad = ctx.createRadialGradient(h, h, 0, h, h, h);
    grad.addColorStop(0, 'rgba(200,188,168,1)');
    grad.addColorStop(falloff, 'rgba(190,178,158,0.6)');
    grad.addColorStop(1, 'rgba(180,168,150,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CELL, CELL);
  }

  private droplet(ctx: CanvasRenderingContext2D) {
    const h = CELL / 2;
    const grad = ctx.createRadialGradient(h, h * 0.85, 0, h, h, h * 0.8);
    grad.addColorStop(0, 'rgba(220,235,245,0.95)');
    grad.addColorStop(0.7, 'rgba(170,200,220,0.7)');
    grad.addColorStop(1, 'rgba(150,180,205,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(h, h, h * 0.42, h * 0.6, 0, 0, TAU);
    ctx.fill();
  }

  private shard(ctx: CanvasRenderingContext2D, rng: Rng) {
    const h = CELL / 2;
    ctx.translate(h, h);
    ctx.rotate(rng() * TAU);
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.85);
    ctx.lineTo(h * 0.4, h * 0.2);
    ctx.lineTo(-h * 0.25, h * 0.75);
    ctx.closePath();
    const grad = ctx.createLinearGradient(-h * 0.4, -h, h * 0.4, h);
    grad.addColorStop(0, 'rgba(205,232,240,0.15)');
    grad.addColorStop(0.5, 'rgba(225,245,255,0.75)');
    grad.addColorStop(1, 'rgba(180,210,225,0.2)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  dispose() {
    this.additive.dispose();
    this.alpha.dispose();
    this.canvases.length = 0;
  }
}
