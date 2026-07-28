import * as THREE from 'three';
import { Noise, clamp, saturate, smoothstep } from '../core/MathUtils';
import { FxRng } from './Random';

/**
 * Every particle sprite in the game, synthesised into one atlas at boot.
 *
 * There are no image assets, so the interesting question is not how to load a
 * smoke puff but how to author one that survives being blown up to four metres
 * across. A radial gradient does not: it has no internal structure, so a
 * hundred of them overlapping average out to a flat grey blob. Each puff here
 * is a domain-warped fBm masked by a lumpy silhouette, and the shader is handed
 * four channels rather than one so it can shade the inside of the puff:
 *
 *   R  luminance detail  — multiplies the lit result, the visible turbulence
 *   G  optical density   — drives transmission, self-shadowing and fire hue
 *   B  auxiliary mask    — soot in fire, core mask in flashes, grain elsewhere
 *   A  coverage          — the alpha the blend actually uses
 *
 * Splitting coverage from density is what lets a puff be simultaneously opaque
 * and translucent: dense in the middle where it blocks the sun, thin at the
 * edges where it lights up against it.
 */

/** Sprite indices, in atlas order. Shared with the effect recipes. */
export const Sprite = {
  SMOKE: 0,
  SMOKE_WISP: 1,
  DUST: 2,
  FIRE: 3,
  FLASH: 4,
  SPARK: 5,
  EMBER: 6,
  CHIP: 7,
  SPLINTER: 8,
  SHARD: 9,
  BLOOD: 10,
  LEAF: 11,
  RING: 12,
  STREAK: 13,
  SOFT: 14,
  GRIT: 15,
} as const;

export const ATLAS_COLUMNS = 4;
export const ATLAS_ROWS = 4;

const TILE = 128;

interface Texel {
  lum: number;
  density: number;
  aux: number;
  alpha: number;
}

type TilePainter = (x: number, y: number, out: Texel) => void;

/** Fades everything to nothing before the tile edge so mips cannot bleed. */
function border(x: number, y: number): number {
  const r = Math.max(Math.abs(x), Math.abs(y));
  return smoothstep(1.0, 0.86, r);
}

function makeSmoke(noise: Noise, seed: number, coarse: number, lumpiness: number): TilePainter {
  return (x, y, out) => {
    const warpX = noise.noise3(x * 1.7 + seed, y * 1.7, seed * 0.31);
    const warpY = noise.noise3(x * 1.7, y * 1.7 + seed, seed * 0.77 + 4.2);
    const wx = x + warpX * 0.34;
    const wy = y + warpY * 0.34;

    const n = noise.fbm3(wx * coarse, wy * coarse, seed * 3.1, 4, 2.1, 0.55) * 0.5 + 0.5;
    const fine = noise.fbm3(wx * coarse * 3.3, wy * coarse * 3.3, seed * 7.7, 3, 2.3, 0.5);

    // A lumpy silhouette rather than a circle: the outline is most of what
    // makes a puff read as a puff.
    const angle = Math.atan2(y, x);
    const lobe =
      1 +
      lumpiness *
        (0.34 * Math.sin(angle * 3 + seed) +
          0.22 * Math.sin(angle * 5 - seed * 2.3) +
          0.14 * Math.sin(angle * 8 + seed * 1.7));
    const r = Math.sqrt(x * x + y * y) / Math.max(0.35, lobe);

    const shape = smoothstep(0.95, 0.12, r);
    let density = saturate(shape * (0.36 + 0.9 * n) - 0.1);
    density = Math.pow(density, 1.3);

    out.alpha = saturate(density * 1.35) * border(x, y);
    out.density = saturate(density * 1.15);
    out.lum = saturate(0.5 + 0.55 * (n - 0.5) * 2 + 0.22 * fine);
    out.aux = saturate(0.35 + 0.65 * n);
  };
}

function makeDust(noise: Noise, seed: number): TilePainter {
  return (x, y, out) => {
    const n = noise.fbm3(x * 4.1 + seed, y * 4.1, seed * 2.7, 4, 2.2, 0.52) * 0.5 + 0.5;
    const grain = noise.fbm3(x * 13 + seed, y * 13, seed * 5.1, 2, 2.4, 0.5) * 0.5 + 0.5;
    const r = Math.sqrt(x * x + y * y);
    const shape = smoothstep(0.98, 0.05, r);
    // Softer core than smoke and a much longer tail: airborne dust has no skin.
    const density = saturate(shape * shape * (0.4 + 0.85 * n));
    out.alpha = saturate(density * 1.1) * border(x, y);
    out.density = saturate(density * 0.8);
    out.lum = saturate(0.46 + 0.5 * (n - 0.5) * 2 + 0.3 * (grain - 0.5));
    out.aux = grain;
  };
}

function makeFire(noise: Noise, seed: number): TilePainter {
  return (x, y, out) => {
    const warp = noise.noise3(x * 2.3, y * 2.3 - 0.7, seed);
    const wx = x + warp * 0.4;
    const wy = y + warp * 0.28;
    const n = noise.fbm3(wx * 3.2 + seed, wy * 3.2, seed * 1.9, 4, 2.3, 0.55) * 0.5 + 0.5;
    const angle = Math.atan2(y, x);
    const lobe =
      1 + 0.4 * Math.sin(angle * 3 + seed * 2) + 0.24 * Math.sin(angle * 6 - seed);
    const r = Math.sqrt(x * x + y * y) / Math.max(0.4, lobe);
    const shape = smoothstep(1.0, 0.1, r);
    const density = saturate(shape * (0.3 + 1.05 * n) - 0.08);

    out.alpha = saturate(density * 1.5) * border(x, y);
    // Hottest where the medium is thickest, coolest in the tearing wisps.
    out.density = saturate(Math.pow(density, 0.7));
    out.lum = saturate(0.35 + 0.9 * n);
    // Soot forms first in the slow, cool outer folds.
    out.aux = saturate(1.15 - density * 1.4) * saturate(shape * 1.4);
  };
}

function makeFlash(noise: Noise, seed: number): TilePainter {
  return (x, y, out) => {
    const r = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x);
    // Five uneven lobes; a muzzle flash is never a symmetric star.
    const lobes =
      0.34 +
      0.4 * Math.pow(Math.abs(Math.cos(angle * 2.5 + seed)), 0.6) +
      0.2 * Math.pow(Math.abs(Math.cos(angle * 4 - seed * 1.7)), 1.4);
    const spikes = smoothstep(lobes, lobes * 0.15, r);
    const core = Math.exp(-r * r * 26);
    const halo = Math.exp(-r * r * 4.5) * 0.4;
    const grain = noise.fbm3(x * 6 + seed, y * 6, seed, 3, 2.2, 0.5) * 0.5 + 0.5;

    const v = saturate((spikes * (0.5 + 0.7 * grain) + core * 2.2 + halo) * 0.85);
    out.alpha = v * border(x, y);
    out.density = saturate(core * 1.6 + spikes * 0.4);
    out.lum = saturate(0.4 + 0.9 * saturate(core * 2 + spikes * 0.55));
    out.aux = 0;
  };
}

/** A streak: bright head at v = 1, tapering tail toward v = 0. */
function makeSpark(): TilePainter {
  return (x, y, out) => {
    const head = (y + 1) * 0.5;
    const taper = Math.pow(head, 1.6) * 0.85 + 0.15;
    const across = Math.abs(x) / Math.max(0.1, taper * 0.48);
    // Gaussian across the streak rather than a parabola clamped to one. The
    // parabola was flat-topped over half the width, so every tracer resolved as
    // an opaque bar with two hard sides — a glow stick, not a round. A core
    // that falls off from the centre reads as light instead of as geometry, and
    // it is what lets the bloom do the widening rather than the sprite.
    const line = Math.exp(-across * across * 5.0);
    const glow = Math.exp(-across * across * 0.9) * 0.3;
    // Confined across the streak as well as along it. Left as a function of
    // `head` alone this is not a tip but a band painted the full width of the
    // quad, and with the core term riding on top of it the round grows a white
    // collar at the nose.
    const tip = Math.exp(-((head - 0.94) * (head - 0.94)) * 220 - across * across * 3.0) * 0.9;
    // Brightest at the head and fading down the trail. Without this the sprite
    // is opaque over its whole length and a tracer draws as a flat ribbon with
    // two rounded ends — the thing that separates a round in flight from a
    // glow stick is that the light is at the front and the rest is afterglow.
    const trail = Math.pow(head, 2.1);
    const v = saturate((line + glow) * trail * smoothstep(0.0, 0.05, head) + tip);
    out.alpha = v * border(x, y);
    out.density = v;
    out.lum = saturate(0.3 + 0.9 * (line * trail + tip));
    // The burning trace element, as distinct from the envelope of glow around
    // it. Scaling one sprite by one colour cannot produce a tracer: brightness
    // and hue move together, so the round is either dim and green or bright and
    // white, and the dim-and-green version is what a sunlit street resolves it
    // to. Splitting the core out lets the shader clip this to white while the
    // skirt stays saturated, which is the only way film records a tracer and
    // the only way the eye reads one as light rather than as a painted rod.
    // Read solely by the stretched, non-fire path — the tracer batch — so the
    // embers that share this tile are untouched.
    out.aux = saturate(Math.exp(-across * across * 34) * Math.pow(head, 3.2) + tip * 0.85);
  };
}

function makeEmber(): TilePainter {
  return (x, y, out) => {
    const r = Math.sqrt(x * x + y * y);
    const core = Math.exp(-r * r * 48);
    const halo = Math.exp(-r * r * 7) * 0.42;
    const v = saturate(core * 1.5 + halo);
    out.alpha = v * border(x, y);
    out.density = saturate(core * 1.8);
    out.lum = saturate(0.45 + core);
    out.aux = 0;
  };
}

/** An angular fragment with a lit facet and a shadowed one. */
function makeChip(rng: FxRng, sides: number, aspect: number): TilePainter {
  const radii: number[] = [];
  for (let i = 0; i < sides; i++) radii.push(rng.range(0.5, 0.92));
  const facet = rng.range(0, Math.PI * 2);
  return (x, y, out) => {
    const angle = Math.atan2(y * aspect, x);
    const t = ((angle + Math.PI) / (Math.PI * 2)) * sides;
    const i0 = Math.floor(t) % sides;
    const i1 = (i0 + 1) % sides;
    const f = t - Math.floor(t);
    const limit = radii[i0] * (1 - f) + radii[i1] * f;
    const r = Math.sqrt(x * x * aspect * aspect + y * y) / aspect;
    const inside = smoothstep(limit, limit - 0.06, r);
    // A single hard facet break: enough to read as a solid object, not a blob.
    const lit = Math.cos(angle - facet) * 0.5 + 0.5;
    out.alpha = inside * border(x, y);
    out.density = inside;
    out.lum = saturate(0.34 + 0.95 * lit);
    out.aux = inside;
  };
}

function makeSplinter(rng: FxRng): TilePainter {
  const bend = rng.range(-0.25, 0.25);
  return (x, y, out) => {
    const cx = x - bend * (1 - y * y);
    const width = 0.11 * (1 - Math.abs(y) * 0.75);
    const inside = smoothstep(width, width * 0.35, Math.abs(cx)) * smoothstep(0.99, 0.9, Math.abs(y));
    out.alpha = inside * border(x, y);
    out.density = inside;
    out.lum = saturate(0.4 + 0.8 * (1 - Math.abs(cx) / Math.max(width, 1e-3)) * 0.5 + 0.3 * (y * 0.5 + 0.5));
    out.aux = inside;
  };
}

function makeShard(rng: FxRng): TilePainter {
  const ax = rng.range(-0.5, 0.5);
  return (x, y, out) => {
    // Triangle: wide at the base, meeting at a point.
    const t = (y + 0.95) / 1.9;
    const halfWidth = 0.42 * (1 - t) + 0.02;
    const centre = ax * t;
    const inside =
      smoothstep(halfWidth, halfWidth * 0.55, Math.abs(x - centre)) *
      smoothstep(1.0, 0.92, Math.abs(y));
    // Glass is mostly edge: a bright rim and a nearly transparent middle.
    const edge = saturate(1 - Math.abs(x - centre) / Math.max(halfWidth, 1e-3));
    out.alpha = saturate(inside * (0.3 + 0.85 * (1 - edge))) * border(x, y);
    out.density = inside * 0.5;
    out.lum = saturate(0.5 + 1.1 * (1 - edge));
    out.aux = inside;
  };
}

function makeBlood(noise: Noise, seed: number): TilePainter {
  return (x, y, out) => {
    // Teardrop: a round head with a thinning tail, the shape a droplet takes in
    // flight once surface tension loses to drag.
    const headD = Math.sqrt(x * x + (y + 0.22) * (y + 0.22)) / 0.42;
    const tailW = 0.3 * saturate(1 - (y - 0.05) / 0.85);
    const tailD = Math.abs(x) / Math.max(tailW, 1e-3);
    const tailMask = smoothstep(1.0, 0.6, y) * smoothstep(-0.3, 0.0, y);
    const d = Math.min(headD, tailD / Math.max(tailMask, 1e-3));
    const wobble = noise.noise3(x * 5 + seed, y * 5, seed) * 0.09;
    const inside = smoothstep(1.0 + wobble, 0.78 + wobble, d);
    out.alpha = inside * border(x, y);
    out.density = inside;
    // Wet, so the rim carries a specular sheen the middle does not.
    out.lum = saturate(0.3 + 1.0 * Math.pow(saturate(1 - headD), 2.2));
    out.aux = inside;
  };
}

function makeLeaf(noise: Noise, seed: number): TilePainter {
  return (x, y, out) => {
    const halfWidth = 0.34 * Math.sqrt(Math.max(0, 1 - y * y));
    const rag = noise.noise3(y * 7 + seed, seed, 1.3) * 0.05;
    const inside = smoothstep(halfWidth + rag, (halfWidth + rag) * 0.7, Math.abs(x));
    const vein = saturate(1 - Math.abs(x) / Math.max(halfWidth, 1e-3) * 6);
    out.alpha = inside * border(x, y);
    out.density = inside;
    out.lum = saturate(0.45 + 0.5 * vein + 0.35 * (1 - Math.abs(y)));
    out.aux = inside;
  };
}

function makeRing(noise: Noise, seed: number): TilePainter {
  return (x, y, out) => {
    const r = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x);
    const wobble = noise.fbm3(Math.cos(angle) * 2 + seed, Math.sin(angle) * 2, seed, 3, 2.2, 0.5) * 0.14;
    const band = Math.exp(-Math.pow((r - 0.62 + wobble) / 0.2, 2) * 2.4);
    const inner = smoothstep(0.0, 0.5, r) * 0.28;
    const n = noise.fbm3(x * 5 + seed, y * 5, seed * 2, 3, 2.3, 0.5) * 0.5 + 0.5;
    const v = saturate((band + inner) * (0.4 + 0.95 * n));
    out.alpha = v * border(x, y);
    out.density = saturate(v * 0.9);
    out.lum = saturate(0.5 + 0.6 * (n - 0.5) * 2);
    out.aux = n;
  };
}

function makeStreak(noise: Noise, seed: number): TilePainter {
  return (x, y, out) => {
    const n = noise.fbm3(x * 2.6 + seed, y * 6.5, seed * 1.7, 4, 2.2, 0.55) * 0.5 + 0.5;
    const shape = Math.exp(-y * y * 5.0) * smoothstep(1.05, 0.1, Math.abs(x));
    const v = saturate(shape * (0.25 + 1.1 * n) - 0.05);
    out.alpha = saturate(v * 1.2) * border(x, y);
    out.density = saturate(v * 0.85);
    out.lum = saturate(0.48 + 0.6 * (n - 0.5) * 2);
    out.aux = n;
  };
}

function makeSoft(): TilePainter {
  return (x, y, out) => {
    const r = Math.sqrt(x * x + y * y);
    const v = Math.pow(saturate(1 - r), 2.0);
    out.alpha = v * border(x, y);
    out.density = v;
    out.lum = 0.5 + 0.35 * v;
    out.aux = v;
  };
}

function makeGrit(rng: FxRng): TilePainter {
  const count = 34;
  const px: number[] = [];
  const py: number[] = [];
  const pr: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = Math.pow(rng.next(), 0.6) * 0.82;
    px.push(Math.cos(a) * d);
    py.push(Math.sin(a) * d);
    pr.push(rng.range(0.02, 0.075));
  }
  return (x, y, out) => {
    let v = 0;
    for (let i = 0; i < count; i++) {
      const dx = x - px[i];
      const dy = y - py[i];
      v = Math.max(v, smoothstep(pr[i], pr[i] * 0.3, Math.sqrt(dx * dx + dy * dy)));
    }
    out.alpha = v * border(x, y);
    out.density = v;
    out.lum = 0.55 + 0.4 * v;
    out.aux = v;
  };
}

/** Builds the 4x4 sprite atlas. One texture, one draw call per particle batch. */
export function createParticleAtlas(): THREE.DataTexture {
  const noise = new Noise(0x5ec7);
  const rng = new FxRng(0x1f4b21);

  const painters: TilePainter[] = [];
  painters[Sprite.SMOKE] = makeSmoke(noise, 1.3, 2.5, 0.34);
  painters[Sprite.SMOKE_WISP] = makeSmoke(noise, 7.9, 3.6, 0.55);
  painters[Sprite.DUST] = makeDust(noise, 3.1);
  painters[Sprite.FIRE] = makeFire(noise, 5.4);
  painters[Sprite.FLASH] = makeFlash(noise, 2.2);
  painters[Sprite.SPARK] = makeSpark();
  painters[Sprite.EMBER] = makeEmber();
  painters[Sprite.CHIP] = makeChip(rng, 7, 1.25);
  painters[Sprite.SPLINTER] = makeSplinter(rng);
  painters[Sprite.SHARD] = makeShard(rng);
  painters[Sprite.BLOOD] = makeBlood(noise, 9.7);
  painters[Sprite.LEAF] = makeLeaf(noise, 4.4);
  painters[Sprite.RING] = makeRing(noise, 6.6);
  painters[Sprite.STREAK] = makeStreak(noise, 8.8);
  painters[Sprite.SOFT] = makeSoft();
  painters[Sprite.GRIT] = makeGrit(rng);

  const width = TILE * ATLAS_COLUMNS;
  const height = TILE * ATLAS_ROWS;
  const data = new Uint8Array(width * height * 4);
  const texel: Texel = { lum: 0, density: 0, aux: 0, alpha: 0 };

  for (let tile = 0; tile < ATLAS_COLUMNS * ATLAS_ROWS; tile++) {
    const painter = painters[tile];
    if (!painter) continue;
    const ox = (tile % ATLAS_COLUMNS) * TILE;
    const oy = Math.floor(tile / ATLAS_COLUMNS) * TILE;
    for (let py = 0; py < TILE; py++) {
      const y = ((py + 0.5) / TILE) * 2 - 1;
      for (let px = 0; px < TILE; px++) {
        const x = ((px + 0.5) / TILE) * 2 - 1;
        texel.lum = 0.5;
        texel.density = 0;
        texel.aux = 0;
        texel.alpha = 0;
        painter(x, y, texel);
        const i = ((oy + py) * width + ox + px) * 4;
        data[i] = clamp(texel.lum, 0, 1) * 255;
        data[i + 1] = clamp(texel.density, 0, 1) * 255;
        data[i + 2] = clamp(texel.aux, 0, 1) * 255;
        data[i + 3] = clamp(texel.alpha, 0, 1) * 255;
      }
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.name = 'fx.particleAtlas';
  texture.colorSpace = THREE.NoColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  return texture;
}
