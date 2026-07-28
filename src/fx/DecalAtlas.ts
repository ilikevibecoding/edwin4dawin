import * as THREE from 'three';
import { Noise, clamp, saturate, smoothstep } from '../core/MathUtils';
import { FxRng } from './Random';
import type { SurfaceKind } from '../core/Events';

/**
 * The decal atlas, synthesised at boot.
 *
 * Two pages come out of one pass: albedo with coverage, and a companion page
 * holding a tangent normal, a gloss term and an occlusion term. The normal is
 * derived from a height field rather than authored, because that is what makes
 * a bullet hole look punched into the wall instead of stickered onto it — the
 * crater rim has to catch the sun from the correct side and the hole has to go
 * dark when the light rakes across it, and only real relief does both.
 */

export const DecalTile = {
  BULLET_CONCRETE: 0,
  BULLET_METAL: 1,
  BULLET_WOOD: 2,
  BULLET_SAND: 3,
  BULLET_GLASS: 4,
  BULLET_PLASTER: 5,
  BULLET_TORN: 6,
  RIPPLE: 7,
  SCORCH_SMALL: 8,
  SCORCH_LARGE: 9,
  CRATER: 10,
  BLOOD_SPLAT_A: 11,
  BLOOD_SPLAT_B: 12,
  BLOOD_POOL: 13,
  BLOOD_SMEAR: 14,
  SCUFF: 15,
} as const;

export const DECAL_COLUMNS = 4;
export const DECAL_ROWS = 4;
const TILE = 128;

export interface DecalAtlas {
  albedo: THREE.DataTexture;
  surface: THREE.DataTexture;
  dispose(): void;
}

interface Sample {
  r: number;
  g: number;
  b: number;
  a: number;
  /** Relief in tile-relative units; positive is proud of the wall. */
  height: number;
  gloss: number;
  ao: number;
}

type Painter = (x: number, y: number, out: Sample) => void;

const noise = new Noise(0x4d3c);
const rng = new FxRng(0x77aa31);

function fbm(x: number, y: number, octaves = 4): number {
  return noise.fbm2(x, y, octaves, 2.15, 0.55);
}

/** Ragged radial cutoff shared by every impact: a circle reads as a sticker. */
function raggedEdge(x: number, y: number, radius: number, rag: number, seed: number): number {
  const angle = Math.atan2(y, x);
  const wobble =
    rag *
    (0.34 * Math.sin(angle * 3 + seed) +
      0.26 * Math.sin(angle * 5.7 - seed * 1.9) +
      0.18 * Math.sin(angle * 9.3 + seed * 2.7) +
      0.14 * fbm(Math.cos(angle) * 3 + seed, Math.sin(angle) * 3, 3));
  const r = Math.sqrt(x * x + y * y);
  return smoothstep(radius * (1 + wobble), radius * (1 + wobble) * 0.72, r);
}

function bulletHole(opts: {
  seed: number;
  holeRadius: number;
  spallRadius: number;
  holeColor: [number, number, number];
  rimColor: [number, number, number];
  bodyColor: [number, number, number];
  gloss: number;
  cracks: number;
  fibres: number;
  rimHeight: number;
}): Painter {
  const { seed, holeRadius, spallRadius, holeColor, rimColor, bodyColor } = opts;
  return (x, y, out) => {
    const r = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x);

    const coverage = raggedEdge(x, y, spallRadius, 0.22, seed);
    if (coverage <= 0.002) {
      out.a = 0;
      return;
    }

    // The hole itself, deliberately not round.
    const holeWobble = 1 + 0.22 * Math.sin(angle * 4 + seed * 3) + 0.14 * Math.sin(angle * 7 - seed);
    const hole = smoothstep(holeRadius * holeWobble, holeRadius * holeWobble * 0.55, r);

    // Radial spall cracks: strongest just outside the hole, dying at the rim.
    let cracks = 0;
    if (opts.cracks > 0) {
      const spokes = 0.5 + 0.5 * Math.cos(angle * 7 + fbm(Math.cos(angle) * 2.5, Math.sin(angle) * 2.5, 3) * 5 + seed);
      cracks =
        opts.cracks *
        Math.pow(spokes, 7) *
        smoothstep(holeRadius * 0.8, holeRadius * 1.6, r) *
        smoothstep(spallRadius, holeRadius * 1.4, r);
    }

    // Fibres for wood and fabric: the tear runs with the grain, not radially.
    let fibres = 0;
    if (opts.fibres > 0) {
      const grain = Math.abs(Math.sin(y * 34 + fbm(x * 4, y * 4, 3) * 3));
      fibres =
        opts.fibres *
        Math.pow(grain, 4) *
        smoothstep(holeRadius * 0.7, holeRadius * 2.1, r) *
        smoothstep(spallRadius, holeRadius * 1.2, r);
    }

    const grit = fbm(x * 11 + seed, y * 11, 4) * 0.5 + 0.5;
    // The crater, and the lip around the hole, are two different things and
    // used to be one. A real hole in stucco is a centimetre of black inside
    // five or six of pale broken surface — call it one to six — but the pale
    // part only reached two and a half hole radii, so at any distance where
    // the hole itself is a couple of pixels there was nothing else to see and
    // the mark read as a full stop rather than as a strike. The colour now
    // spreads across the whole spall; only the relief stays tight, because it
    // is the raised lip immediately around the hole that catches the light.
    const rim = smoothstep(spallRadius * 0.8, holeRadius, r) * (1 - hole);
    const lip = smoothstep(holeRadius * 2.6, holeRadius * 1.05, r) * (1 - hole);

    const t = saturate(rim * (0.55 + 0.6 * grit));
    let cr = bodyColor[0] * (0.7 + 0.6 * grit);
    let cg = bodyColor[1] * (0.7 + 0.6 * grit);
    let cb = bodyColor[2] * (0.7 + 0.6 * grit);
    cr += (rimColor[0] - cr) * t;
    cg += (rimColor[1] - cg) * t;
    cb += (rimColor[2] - cb) * t;
    cr += (holeColor[0] - cr) * hole;
    cg += (holeColor[1] - cg) * hole;
    cb += (holeColor[2] - cb) * hole;
    // Cracks and torn fibres are dark: they are shadow, not pigment.
    const dark = saturate(cracks + fibres);
    cr *= 1 - dark * 0.82;
    cg *= 1 - dark * 0.82;
    cb *= 1 - dark * 0.82;

    out.r = cr;
    out.g = cg;
    out.b = cb;
    out.a = saturate(coverage * (hole + rim * 0.9 + dark * 0.9 + 0.22 * grit * coverage));
    out.height =
      -hole * 1.0 +
      lip * opts.rimHeight * (0.6 + 0.7 * grit) -
      dark * 0.35 +
      (grit - 0.5) * 0.08 * coverage;
    out.gloss = opts.gloss * (1 - hole * 0.7);
    out.ao = 1 - hole * 0.92 - dark * 0.35;
  };
}

function glassCrack(seed: number): Painter {
  return (x, y, out) => {
    const r = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x);
    const coverage = raggedEdge(x, y, 0.9, 0.1, seed);
    if (coverage <= 0.002) {
      out.a = 0;
      return;
    }

    // Radial fractures with a random angular distribution, plus the concentric
    // rings a brittle sheet always produces around the strike.
    const spokes = 0.5 + 0.5 * Math.cos(angle * 9 + fbm(Math.cos(angle) * 3, Math.sin(angle) * 3, 3) * 6 + seed);
    const radial = Math.pow(spokes, 12) * smoothstep(0.86, 0.08, r);
    let rings = 0;
    for (let i = 0; i < 3; i++) {
      const rr = 0.2 + i * 0.19;
      const wob = 0.05 * Math.sin(angle * (4 + i * 3) + seed * (i + 1));
      rings = Math.max(rings, Math.exp(-Math.pow((r - rr + wob) / 0.016, 2)) * (0.9 - i * 0.2));
    }
    const shatter = smoothstep(0.14, 0.02, r);
    const lines = saturate(radial * 0.9 + rings * saturate(radial * 6 + 0.28));

    out.r = 0.72;
    out.g = 0.78;
    out.b = 0.84;
    out.a = saturate((lines * 0.85 + shatter) * coverage);
    out.height = -shatter * 0.7 - lines * 0.22;
    out.gloss = 0.85;
    out.ao = 1 - shatter * 0.6 - lines * 0.2;
  };
}

function ripple(seed: number): Painter {
  return (x, y, out) => {
    const r = Math.sqrt(x * x + y * y);
    const coverage = raggedEdge(x, y, 0.92, 0.06, seed);
    const wave = Math.sin(r * 30 - 1.2) * Math.exp(-r * 3.4);
    const crown = Math.exp(-Math.pow(r / 0.1, 2)) * 0.8;
    out.r = 0.42;
    out.g = 0.5;
    out.b = 0.52;
    out.a = saturate((Math.abs(wave) * 1.5 + crown) * coverage);
    out.height = wave * 0.5 + crown;
    out.gloss = 1;
    out.ao = 1;
  };
}

function scorch(seed: number, streaks: number, radius: number): Painter {
  return (x, y, out) => {
    const angle = Math.atan2(y, x);
    const r = Math.sqrt(x * x + y * y);
    const lick =
      streaks *
      (0.5 + 0.5 * Math.cos(angle * 6 + fbm(Math.cos(angle) * 2 + seed, Math.sin(angle) * 2, 3) * 7));
    const reach = radius * (1 + lick * 0.42);
    const soot = smoothstep(reach, reach * 0.05, r);
    const n = fbm(x * 5.5 + seed, y * 5.5, 5) * 0.5 + 0.5;
    const core = smoothstep(radius * 0.55, 0, r);

    // Soot is nearly black but never uniform; the burnt-out middle is warmer
    // than the feathered edge because the binder cooked rather than deposited.
    const v = saturate(soot * (0.35 + 0.95 * n));
    out.r = 0.075 + 0.055 * core;
    out.g = 0.066 + 0.038 * core;
    out.b = 0.06 + 0.024 * core;
    out.a = saturate(v * 1.15) * 0.86;
    out.height = -core * 0.12 + (n - 0.5) * 0.06;
    out.gloss = 0.02;
    out.ao = 1 - core * 0.35;
  };
}

function crater(seed: number): Painter {
  return (x, y, out) => {
    const r = Math.sqrt(x * x + y * y);
    const coverage = raggedEdge(x, y, 0.94, 0.16, seed);
    if (coverage <= 0.002) {
      out.a = 0;
      return;
    }
    const n = fbm(x * 6 + seed, y * 6, 5) * 0.5 + 0.5;
    const bowl = -Math.exp(-Math.pow(r / 0.36, 2)) * (0.9 + 0.3 * n);
    const lip = Math.exp(-Math.pow((r - 0.5) / 0.17, 2)) * (0.42 + 0.5 * n);
    const ejecta = smoothstep(0.95, 0.55, r) * Math.pow(n, 2.2) * 0.5;

    const depth = saturate(-bowl);
    out.r = 0.052 + 0.11 * (1 - depth) * (0.5 + n * 0.7);
    out.g = 0.04 + 0.082 * (1 - depth) * (0.5 + n * 0.7);
    out.b = 0.03 + 0.058 * (1 - depth) * (0.5 + n * 0.7);
    out.a = saturate(coverage * (depth * 1.25 + lip * 1.1 + ejecta));
    out.height = bowl + lip + ejecta * 0.4;
    out.gloss = 0.03;
    out.ao = 1 - depth * 0.75;
  };
}

function bloodSplat(seed: number, fingers: number, droplets: number): Painter {
  const dx: number[] = [];
  const dy: number[] = [];
  const dr: number[] = [];
  const local = new FxRng(0x5150 + seed * 977);
  for (let i = 0; i < droplets; i++) {
    const a = local.range(0, Math.PI * 2);
    const d = 0.35 + Math.pow(local.next(), 0.55) * 0.55;
    dx.push(Math.cos(a) * d);
    dy.push(Math.sin(a) * d);
    dr.push(local.range(0.012, 0.055));
  }
  return (x, y, out) => {
    const angle = Math.atan2(y, x);
    const r = Math.sqrt(x * x + y * y);
    // A splat is a blob with fingers, and the fingers are where the eye reads
    // direction and force. A symmetric disc reads as paint.
    const fingerN =
      0.5 + 0.5 * Math.cos(angle * 6 + fbm(Math.cos(angle) * 2.2 + seed, Math.sin(angle) * 2.2, 3) * 6);
    const reach = 0.33 * (1 + fingers * Math.pow(fingerN, 3.5));
    let mass = smoothstep(reach, reach * 0.55, r);
    for (let i = 0; i < droplets; i++) {
      const ddx = x - dx[i];
      const ddy = y - dy[i];
      mass = Math.max(mass, smoothstep(dr[i], dr[i] * 0.4, Math.sqrt(ddx * ddx + ddy * ddy)));
    }
    if (mass <= 0.002) {
      out.a = 0;
      return;
    }
    const n = fbm(x * 9 + seed, y * 9, 3) * 0.5 + 0.5;
    const thick = saturate(mass * (0.7 + 0.5 * n));
    // Blood is dark and very saturated once it is more than a film thick.
    out.r = 0.055 + 0.13 * (1 - thick);
    out.g = 0.0055 + 0.014 * (1 - thick);
    out.b = 0.004 + 0.009 * (1 - thick);
    out.a = saturate(mass * 1.15);
    out.height = thick * 0.16;
    out.gloss = 0.75 * thick;
    out.ao = 1 - thick * 0.2;
  };
}

function bloodPool(seed: number): Painter {
  return (x, y, out) => {
    const coverage = raggedEdge(x, y * 1.15, 0.82, 0.14, seed);
    if (coverage <= 0.002) {
      out.a = 0;
      return;
    }
    const r = Math.sqrt(x * x + y * y * 1.3);
    const n = fbm(x * 4 + seed, y * 4, 4) * 0.5 + 0.5;
    const body = smoothstep(0.86, 0.5, r);
    // Coffee ring: pooled blood dries darkest at the perimeter.
    const ring = Math.exp(-Math.pow((r - 0.72) / 0.11, 2)) * 0.6;
    const thick = saturate(coverage * (body + ring * 0.4));
    out.r = 0.032 + 0.1 * (1 - thick) + ring * 0.02;
    out.g = 0.0035 + 0.011 * (1 - thick);
    out.b = 0.0028 + 0.007 * (1 - thick);
    out.a = saturate(coverage * (body * 1.2 + ring));
    out.height = -body * 0.08 + ring * 0.1 + (n - 0.5) * 0.03;
    out.gloss = 0.9 * body;
    out.ao = 1 - body * 0.12;
  };
}

function bloodSmear(seed: number): Painter {
  return (x, y, out) => {
    const along = (y + 1) * 0.5;
    const taper = Math.pow(1 - along, 1.4);
    const streak = Math.abs(Math.sin(x * 19 + fbm(x * 5 + seed, y * 2, 3) * 4));
    const mass =
      smoothstep(0.55 * (0.35 + taper), 0.1, Math.abs(x)) *
      smoothstep(1.0, 0.72, Math.abs(y)) *
      (0.35 + 0.85 * Math.pow(streak, 1.6));
    if (mass <= 0.002) {
      out.a = 0;
      return;
    }
    out.r = 0.045 + 0.1 * (1 - mass);
    out.g = 0.005 + 0.012 * (1 - mass);
    out.b = 0.004 + 0.008 * (1 - mass);
    out.a = saturate(mass);
    out.height = mass * 0.08;
    out.gloss = 0.55 * mass;
    out.ao = 1;
  };
}

function scuff(seed: number): Painter {
  return (x, y, out) => {
    const coverage = raggedEdge(x, y, 0.8, 0.3, seed);
    const n = fbm(x * 7 + seed, y * 7, 4) * 0.5 + 0.5;
    const flake = saturate(smoothstep(0.4, 0.85, n) * coverage);
    out.r = 0.3 + 0.22 * n;
    out.g = 0.27 + 0.2 * n;
    out.b = 0.24 + 0.17 * n;
    out.a = flake;
    out.height = flake * 0.22 - 0.05;
    out.gloss = 0.1;
    out.ao = 1 - flake * 0.3;
  };
}

const PAINTERS: Painter[] = [];
PAINTERS[DecalTile.BULLET_CONCRETE] = bulletHole({
  seed: 1.7,
  holeRadius: 0.19,
  spallRadius: 0.72,
  holeColor: [0.016, 0.015, 0.014],
  rimColor: [0.55, 0.53, 0.49],
  bodyColor: [0.3, 0.29, 0.27],
  gloss: 0.04,
  cracks: 0.85,
  fibres: 0,
  rimHeight: 0.34,
});
PAINTERS[DecalTile.BULLET_METAL] = bulletHole({
  seed: 4.3,
  holeRadius: 0.15,
  spallRadius: 0.52,
  holeColor: [0.012, 0.012, 0.013],
  rimColor: [0.62, 0.63, 0.66],
  bodyColor: [0.2, 0.2, 0.21],
  gloss: 0.72,
  cracks: 0.55,
  fibres: 0,
  rimHeight: 0.5,
});
PAINTERS[DecalTile.BULLET_WOOD] = bulletHole({
  seed: 8.1,
  holeRadius: 0.2,
  spallRadius: 0.66,
  holeColor: [0.02, 0.014, 0.009],
  rimColor: [0.34, 0.24, 0.13],
  bodyColor: [0.14, 0.095, 0.055],
  gloss: 0.1,
  cracks: 0.2,
  fibres: 0.9,
  rimHeight: 0.42,
});
PAINTERS[DecalTile.BULLET_SAND] = bulletHole({
  seed: 2.9,
  holeRadius: 0.26,
  spallRadius: 0.86,
  holeColor: [0.05, 0.04, 0.028],
  rimColor: [0.42, 0.36, 0.25],
  bodyColor: [0.24, 0.2, 0.14],
  gloss: 0.02,
  cracks: 0,
  fibres: 0,
  rimHeight: 0.28,
});
PAINTERS[DecalTile.BULLET_GLASS] = glassCrack(6.2);
PAINTERS[DecalTile.BULLET_PLASTER] = bulletHole({
  seed: 5.5,
  holeRadius: 0.17,
  spallRadius: 0.82,
  holeColor: [0.02, 0.019, 0.018],
  rimColor: [0.72, 0.7, 0.66],
  bodyColor: [0.4, 0.39, 0.37],
  gloss: 0.03,
  cracks: 0.5,
  fibres: 0,
  rimHeight: 0.3,
});
PAINTERS[DecalTile.BULLET_TORN] = bulletHole({
  seed: 9.4,
  holeRadius: 0.22,
  spallRadius: 0.6,
  holeColor: [0.01, 0.01, 0.009],
  rimColor: [0.18, 0.17, 0.15],
  bodyColor: [0.1, 0.1, 0.09],
  gloss: 0.05,
  cracks: 0.1,
  fibres: 1.15,
  rimHeight: 0.2,
});
PAINTERS[DecalTile.RIPPLE] = ripple(3.3);
PAINTERS[DecalTile.SCORCH_SMALL] = scorch(1.1, 0.55, 0.62);
PAINTERS[DecalTile.SCORCH_LARGE] = scorch(7.7, 0.85, 0.8);
PAINTERS[DecalTile.CRATER] = crater(4.9);
PAINTERS[DecalTile.BLOOD_SPLAT_A] = bloodSplat(1, 0.9, 22);
PAINTERS[DecalTile.BLOOD_SPLAT_B] = bloodSplat(2, 1.35, 30);
PAINTERS[DecalTile.BLOOD_POOL] = bloodPool(3.6);
PAINTERS[DecalTile.BLOOD_SMEAR] = bloodSmear(5.1);
PAINTERS[DecalTile.SCUFF] = scuff(8.8);

export function createDecalAtlas(): DecalAtlas {
  const width = TILE * DECAL_COLUMNS;
  const height = TILE * DECAL_ROWS;
  const albedoData = new Uint8Array(width * height * 4);
  const surfaceData = new Uint8Array(width * height * 4);
  const heights = new Float32Array(TILE * TILE);
  const sample: Sample = { r: 0, g: 0, b: 0, a: 0, height: 0, gloss: 0, ao: 1 };

  for (let tile = 0; tile < DECAL_COLUMNS * DECAL_ROWS; tile++) {
    const painter = PAINTERS[tile];
    if (!painter) continue;
    const ox = (tile % DECAL_COLUMNS) * TILE;
    const oy = Math.floor(tile / DECAL_COLUMNS) * TILE;

    for (let py = 0; py < TILE; py++) {
      const y = ((py + 0.5) / TILE) * 2 - 1;
      for (let px = 0; px < TILE; px++) {
        const x = ((px + 0.5) / TILE) * 2 - 1;
        sample.r = 0;
        sample.g = 0;
        sample.b = 0;
        sample.a = 0;
        sample.height = 0;
        sample.gloss = 0;
        sample.ao = 1;
        painter(x, y, sample);
        heights[py * TILE + px] = sample.height;
        const i = ((oy + py) * width + ox + px) * 4;
        // Albedo is stored sRGB-encoded so eight bits are spent where the eye
        // can see them; the shader decodes with the texture's colour space.
        albedoData[i] = encodeSrgb(sample.r);
        albedoData[i + 1] = encodeSrgb(sample.g);
        albedoData[i + 2] = encodeSrgb(sample.b);
        albedoData[i + 3] = clamp(sample.a, 0, 1) * 255;
        surfaceData[i + 2] = clamp(sample.gloss, 0, 1) * 255;
        surfaceData[i + 3] = clamp(sample.ao, 0, 1) * 255;
      }
    }

    // Central differences over the height field. The relief is authored in
    // tile-relative units, so the gradient scale is the tile resolution.
    const slope = 1.6;
    for (let py = 0; py < TILE; py++) {
      for (let px = 0; px < TILE; px++) {
        const l = heights[py * TILE + Math.max(0, px - 1)];
        const r = heights[py * TILE + Math.min(TILE - 1, px + 1)];
        const d = heights[Math.max(0, py - 1) * TILE + px];
        const u = heights[Math.min(TILE - 1, py + 1) * TILE + px];
        const nx = (l - r) * slope;
        const ny = (d - u) * slope;
        const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
        const i = ((oy + py) * width + ox + px) * 4;
        surfaceData[i] = clamp(nx * inv * 0.5 + 0.5, 0, 1) * 255;
        surfaceData[i + 1] = clamp(ny * inv * 0.5 + 0.5, 0, 1) * 255;
      }
    }
  }

  const albedo = new THREE.DataTexture(albedoData, width, height, THREE.RGBAFormat);
  albedo.name = 'fx.decalAlbedo';
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.magFilter = THREE.LinearFilter;
  albedo.minFilter = THREE.LinearMipmapLinearFilter;
  albedo.generateMipmaps = true;
  albedo.anisotropy = 4;
  albedo.needsUpdate = true;

  const surface = new THREE.DataTexture(surfaceData, width, height, THREE.RGBAFormat);
  surface.name = 'fx.decalSurface';
  surface.colorSpace = THREE.NoColorSpace;
  surface.magFilter = THREE.LinearFilter;
  surface.minFilter = THREE.LinearMipmapLinearFilter;
  surface.generateMipmaps = true;
  surface.anisotropy = 4;
  surface.needsUpdate = true;

  return {
    albedo,
    surface,
    dispose(): void {
      albedo.dispose();
      surface.dispose();
    },
  };
}

function encodeSrgb(linear: number): number {
  const c = clamp(linear, 0, 1);
  const s = c <= 0.0031308 ? c * 12.92 : Math.pow(c, 1 / 2.4) * 1.055 - 0.055;
  return Math.round(s * 255);
}

/** Which atlas tile a bullet hole uses on a given material. */
export function bulletTileFor(surface: SurfaceKind): number {
  switch (surface) {
    case 'metal':
      return DecalTile.BULLET_METAL;
    case 'wood':
      return DecalTile.BULLET_WOOD;
    case 'sand':
    case 'dirt':
      return DecalTile.BULLET_SAND;
    case 'glass':
      return DecalTile.BULLET_GLASS;
    case 'water':
      return DecalTile.RIPPLE;
    case 'flesh':
      return DecalTile.BLOOD_SPLAT_A;
    case 'foliage':
    case 'fabric':
      return DecalTile.BULLET_TORN;
    case 'rubber':
      return DecalTile.SCUFF;
    case 'plaster':
      return DecalTile.BULLET_PLASTER;
    default:
      return DecalTile.BULLET_CONCRETE;
  }
}

/**
 * Per-surface tint applied on top of the atlas albedo, so one concrete hole
 * serves brick, stucco and painted block without three more tiles.
 */
export function bulletTintFor(surface: SurfaceKind, out: THREE.Color): THREE.Color {
  switch (surface) {
    case 'metal':
      return out.setRGB(0.86, 0.9, 0.98);
    case 'wood':
      return out.setRGB(1.05, 0.92, 0.72);
    case 'sand':
      return out.setRGB(1.15, 1.02, 0.78);
    case 'dirt':
      return out.setRGB(0.85, 0.75, 0.6);
    case 'plaster':
      return out.setRGB(1.05, 1.02, 0.98);
    case 'glass':
      return out.setRGB(0.95, 1, 1.05);
    case 'foliage':
      return out.setRGB(0.7, 0.85, 0.6);
    case 'fabric':
      return out.setRGB(0.8, 0.76, 0.7);
    default:
      return out.setRGB(1, 0.98, 0.94);
  }
}
