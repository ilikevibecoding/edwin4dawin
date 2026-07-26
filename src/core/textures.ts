import * as THREE from 'three';
import { clamp01, lerp, makeRng } from './math';
import { Noise2D } from './noise';

/**
 * Every texture in the game is drawn here at load time - there are no image
 * files. Each generator paints an albedo layer plus a height field, and the
 * height field is converted to a tangent-space normal map with a Sobel filter,
 * so wood grain, canvas weave and hammered iron all catch light properly.
 */

export interface MaterialMaps {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  /** Metres covered by one tile of the texture, used to scale UVs. */
  worldScale: number;
}

interface Layers {
  size: number;
  /** RGB albedo, 0..1 per channel. */
  albedo: Float32Array;
  /** Surface height, 0..1. */
  height: Float32Array;
  /** Roughness, 0..1. */
  rough: Float32Array;
}

function createLayers(size: number): Layers {
  return {
    size,
    albedo: new Float32Array(size * size * 3),
    height: new Float32Array(size * size),
    rough: new Float32Array(size * size).fill(0.7),
  };
}

function setPixel(l: Layers, i: number, r: number, g: number, b: number, height: number, rough: number): void {
  l.albedo[i * 3] = r;
  l.albedo[i * 3 + 1] = g;
  l.albedo[i * 3 + 2] = b;
  l.height[i] = height;
  l.rough[i] = rough;
}

function toTexture(data: Uint8Array, size: number, srgb: boolean, repeat: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(size, size);
  image.data.set(data);
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.repeat.setScalar(repeat);
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

/** Sobel filter on the height field, packed as an RGB tangent-space normal map. */
function heightToNormalBytes(l: Layers, strength: number): Uint8Array {
  const { size, height } = l;
  const out = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy =
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      let nx = -dx * strength;
      let ny = -dy * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      const i = (y * size + x) * 4;
      out[i] = Math.round((nx * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[i + 2] = Math.round((nz / len * 0.5 + 0.5) * 255);
      out[i + 3] = 255;
    }
  }
  return out;
}

function albedoBytes(l: Layers): Uint8Array {
  const out = new Uint8Array(l.size * l.size * 4);
  for (let i = 0; i < l.size * l.size; i++) {
    out[i * 4] = Math.round(clamp01(l.albedo[i * 3]) * 255);
    out[i * 4 + 1] = Math.round(clamp01(l.albedo[i * 3 + 1]) * 255);
    out[i * 4 + 2] = Math.round(clamp01(l.albedo[i * 3 + 2]) * 255);
    out[i * 4 + 3] = 255;
  }
  return out;
}

function roughBytes(l: Layers): Uint8Array {
  const out = new Uint8Array(l.size * l.size * 4);
  for (let i = 0; i < l.size * l.size; i++) {
    const v = Math.round(clamp01(l.rough[i]) * 255);
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return out;
}

function finish(l: Layers, opts: { normalStrength: number; worldScale: number }): MaterialMaps {
  // Geometry authors UVs in metres, so the repeat factor turns them into tiles.
  const repeat = 1 / opts.worldScale;
  return {
    map: toTexture(albedoBytes(l), l.size, true, repeat),
    normalMap: toTexture(heightToNormalBytes(l, opts.normalStrength), l.size, false, repeat),
    roughnessMap: toTexture(roughBytes(l), l.size, false, repeat),
    worldScale: opts.worldScale,
  };
}

// ----------------------------------------------------------------- generators

/**
 * Planked wood: boards running along U with darkened seams, end joints, grain
 * that follows the board, knots, and worn patches where feet and rope have been.
 */
function generateWood(opts: {
  size: number;
  boards: number;
  base: [number, number, number];
  dark: [number, number, number];
  grainStrength: number;
  seed: number;
  worldScale: number;
  wear: number;
}): MaterialMaps {
  const l = createLayers(opts.size);
  const noise = new Noise2D(opts.seed);
  const rng = makeRng(opts.seed * 7 + 3);
  const boardHeight = opts.size / opts.boards;

  // Per-board tone and joint position, so no two boards look alike. Only some
  // boards get a butt joint inside a single tile: give every board one and the
  // repeat turns a hull into a brick wall.
  const boardTone: number[] = [];
  const boardJoint: number[] = [];
  for (let b = 0; b < opts.boards; b++) {
    boardTone.push(0.82 + rng() * 0.36);
    boardJoint.push(rng() < 0.45 ? rng() : -1);
  }

  const knots: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < Math.max(2, Math.round(opts.boards * 0.7)); i++) {
    knots.push({ x: rng() * opts.size, y: rng() * opts.size, r: opts.size * (0.008 + rng() * 0.014) });
  }

  // Boards are stacked across U and run along V, so on a hull the strakes run
  // fore-and-aft and on a deck the planks run bow-to-stern.
  for (let x = 0; x < opts.size; x++) {
    const board = Math.floor(x / boardHeight);
    const inBoard = (x % boardHeight) / boardHeight;
    // Distance to the nearest board seam, in pixels.
    const seamDist = Math.min(x % boardHeight, boardHeight - (x % boardHeight));

    for (let y = 0; y < opts.size; y++) {
      const i = y * opts.size + x;

      // Grain: stretched noise along the board plus fine fibres.
      const grain =
        noise.fbm(y * 0.008, (x + board * 137) * 0.09, 4) * 0.5 +
        noise.sample(y * 0.045, (x + board * 91) * 0.55) * 0.28 +
        noise.sample(y * 0.2, x * 1.6) * 0.12;

      let tone = boardTone[board] + grain * opts.grainStrength;
      let height = 0.55 + grain * 0.12;
      let rough = 0.62 + grain * 0.1;

      // Seam between boards: dark, recessed, slightly chipped.
      const seam = clamp01(1 - seamDist / 2.2);
      if (seam > 0) {
        tone *= lerp(1, 0.34, seam);
        height -= seam * 0.42;
        rough += seam * 0.2;
      }

      // End joint across the board, running along V. Caulked, not gaping: it
      // should read as a hairline at arm's length, not a black bar.
      if (boardJoint[board] >= 0) {
        const jointY = boardJoint[board] * opts.size;
        const jointDist = Math.min(Math.abs(y - jointY), opts.size - Math.abs(y - jointY));
        if (jointDist < 1.2) {
          tone *= 0.72;
          height -= 0.2;
        }
      }

      // Knots.
      for (const knot of knots) {
        const d = Math.hypot(x - knot.x, y - knot.y);
        if (d < knot.r * 2.4) {
          const t = clamp01(1 - d / (knot.r * 2.4));
          const rings = 0.5 + 0.5 * Math.sin(d * 0.9);
          tone *= lerp(1, 0.45 + rings * 0.2, t);
          height -= t * 0.18;
          rough += t * 0.12;
        }
      }

      // Worn, polished patches: lighter and smoother.
      const wear = clamp01(noise.fbm(y * 0.004 + 40, x * 0.004 - 12, 3) * 1.4) * opts.wear;
      tone = lerp(tone, tone * 1.12 + 0.06, wear);
      rough = lerp(rough, 0.34, wear);

      // Slight bow across each board so planks are not dead flat.
      height += Math.sin(inBoard * Math.PI) * 0.05;

      const r = lerp(opts.dark[0], opts.base[0], clamp01(tone));
      const g = lerp(opts.dark[1], opts.base[1], clamp01(tone));
      const b = lerp(opts.dark[2], opts.base[2], clamp01(tone));
      setPixel(l, i, r, g, b, clamp01(height), clamp01(rough));
    }
  }

  return finish(l, { normalStrength: 2.6, worldScale: opts.worldScale });
}

/** Woven sailcloth: warp and weft threads, panel seams, stains and patches. */
function generateCanvas(size: number, seed: number): MaterialMaps {
  const l = createLayers(size);
  const noise = new Noise2D(seed);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;

      // Over-under weave: two interleaved thread sets. One tile is half a metre
      // of cloth, so this is a thread every few millimetres.
      const threads = 52;
      const u = (x / size) * threads * Math.PI * 2;
      const v = (y / size) * threads * Math.PI * 2;
      const weave = Math.sin(u) * Math.cos(v) * 0.5 + 0.5;
      const thread = Math.abs(Math.sin(u)) * 0.5 + Math.abs(Math.cos(v)) * 0.5;

      const fibre = noise.fbm(x * 0.03, y * 0.03, 3) * 0.5 + 0.5;
      const stain = clamp01(noise.fbm(x * 0.005 + 11, y * 0.005 - 7, 4) * 1.6 + 0.15);

      let tone = 0.86 + weave * 0.16 - (1 - thread) * 0.1;
      tone *= lerp(0.78, 1.0, stain);
      tone *= 0.94 + fibre * 0.12;

      // Panel seams belong to the cut of the sail, not to the cloth, so they are
      // drawn by the sail shader instead of being baked in here.
      const height = weave * 0.55 + thread * 0.2;
      const rough = 0.78 + (1 - weave) * 0.12;

      setPixel(l, i, tone * 0.95, tone * 0.88, tone * 0.74, clamp01(height), clamp01(rough));
    }
  }

  return finish(l, { normalStrength: 1.5, worldScale: 0.55 });
}

/** Hammered, pitted, part-rusted iron for cannons, hoops and fittings. */
function generateIron(size: number, seed: number): MaterialMaps {
  const l = createLayers(size);
  const noise = new Noise2D(seed);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const hammer = noise.fbm(x * 0.06, y * 0.06, 3);
      const pit = noise.ridged(x * 0.22, y * 0.22, 2);
      const rust = clamp01(noise.fbm(x * 0.012 + 5, y * 0.012 + 9, 4) * 1.5 + 0.1);

      const steel = 0.3 + hammer * 0.1 - pit * 0.06;
      const r = lerp(steel, 0.36, rust);
      const g = lerp(steel, 0.19, rust);
      const b = lerp(steel * 1.05, 0.11, rust);

      const height = 0.5 + hammer * 0.22 - pit * 0.3;
      const rough = lerp(0.36, 0.86, rust) + pit * 0.1;
      setPixel(l, i, r, g, b, clamp01(height), clamp01(rough));
    }
  }

  return finish(l, { normalStrength: 2.2, worldScale: 1.1 });
}

/** Tarred hull planking below the waterline: dark pitch, barnacles, weed. */
function generateTar(size: number, seed: number): MaterialMaps {
  const l = createLayers(size);
  const noise = new Noise2D(seed);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const pitch = noise.fbm(x * 0.02, y * 0.02, 4);
      const streak = noise.sample(x * 0.006, y * 0.09) * 0.5 + 0.5;
      const growth = clamp01(noise.fbm(x * 0.05 + 30, y * 0.05 - 20, 3) * 1.8 - 0.35);

      let r = 0.11 + pitch * 0.05 + streak * 0.03;
      let g = 0.1 + pitch * 0.05 + streak * 0.03;
      let b = 0.09 + pitch * 0.04;
      // Barnacles and weed cling near the waterline.
      r = lerp(r, 0.42, growth * 0.5);
      g = lerp(g, 0.44, growth * 0.6);
      b = lerp(b, 0.34, growth * 0.4);

      const height = 0.45 + pitch * 0.2 + growth * 0.3;
      const rough = 0.5 + pitch * 0.15 + growth * 0.3;
      setPixel(l, i, r, g, b, clamp01(height), clamp01(rough));
    }
  }

  return finish(l, { normalStrength: 2.4, worldScale: 1.6 });
}

/** Tarnished gold for chests and trim. */
function generateGold(size: number, seed: number): MaterialMaps {
  const l = createLayers(size);
  const noise = new Noise2D(seed);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const dent = noise.fbm(x * 0.05, y * 0.05, 3);
      const tarnish = clamp01(noise.fbm(x * 0.02 + 3, y * 0.02 - 8, 4) * 1.4 + 0.2);
      const r = lerp(0.94, 0.5, tarnish) + dent * 0.05;
      const g = lerp(0.74, 0.36, tarnish) + dent * 0.04;
      const b = lerp(0.3, 0.16, tarnish);
      setPixel(l, i, r, g, b, clamp01(0.5 + dent * 0.3), clamp01(lerp(0.18, 0.6, tarnish)));
    }
  }

  return finish(l, { normalStrength: 1.8, worldScale: 0.8 });
}

/** Rope: twisted fibre strands, used for rigging and the capstan. */
function generateRope(size: number, seed: number): MaterialMaps {
  const l = createLayers(size);
  const noise = new Noise2D(seed);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      // Three strands spiralling along the rope's length (U).
      const spiral = Math.sin((x / size) * Math.PI * 2 * 3 + (y / size) * Math.PI * 2 * 9);
      const strand = spiral * 0.5 + 0.5;
      const fibre = noise.fbm(x * 0.12, y * 0.12, 3) * 0.5 + 0.5;
      const tone = 0.52 + strand * 0.3 + fibre * 0.14;
      setPixel(l, i, tone * 0.72, tone * 0.62, tone * 0.44, clamp01(strand * 0.7 + fibre * 0.2), 0.85);
    }
  }

  return finish(l, { normalStrength: 2.0, worldScale: 0.5 });
}

/**
 * Ground detail: fine relief for sand ripples, grass clumps and rock. Albedo is
 * near-white so the terrain's vertex colours still drive the palette; the value
 * of this texture is the normal and roughness detail.
 */
function generateGroundDetail(size: number, seed: number): MaterialMaps {
  const l = createLayers(size);
  const noise = new Noise2D(seed);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const grit = noise.fbm(x * 0.25, y * 0.25, 3);
      const clump = noise.fbm(x * 0.045, y * 0.045, 4);
      const ripple = Math.sin(x * 0.09 + clump * 5) * 0.5 + 0.5;

      const shade = 0.88 + grit * 0.12 + clump * 0.08;
      const height = 0.45 + grit * 0.3 + ripple * 0.15 + clump * 0.2;
      setPixel(l, i, shade, shade, shade * 0.98, clamp01(height), clamp01(0.8 + grit * 0.15));
    }
  }

  return finish(l, { normalStrength: 2.8, worldScale: 6 });
}

/**
 * Beach sand seen from above: fine grain, wind ripples, a scatter of shell
 * fragments and small pebbles, and darker damp patches.
 */
function generateSand(size: number, seed: number): MaterialMaps {
  const l = createLayers(size);
  const noise = new Noise2D(seed);
  const rng = makeRng(seed + 17);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      // Ripples run across the beach, bent by a low-frequency warp.
      const warp = noise.fbm(x * 0.006, y * 0.006, 3);
      const ripple = Math.sin((y + warp * 90) * 0.11) * 0.5 + 0.5;
      const grain = noise.sample(x * 0.9, y * 0.9) * 0.5 + 0.5;
      const grit = noise.fbm(x * 0.22, y * 0.22, 3);
      const damp = clamp01(noise.fbm(x * 0.008 + 40, y * 0.008 - 21, 4) * 1.5);

      let tone = 0.9 + ripple * 0.1 + grit * 0.12 + grain * 0.06;
      tone *= lerp(1.0, 0.76, damp * 0.7);
      const r = tone * 0.86;
      const g = tone * 0.77;
      const b = tone * 0.6;
      const height = 0.4 + ripple * 0.32 + grit * 0.18 + grain * 0.1;
      setPixel(l, i, r, g, b, clamp01(height), clamp01(0.85 + grit * 0.1 - damp * 0.15));
    }
  }

  // Shells and pebbles: a few bright, smooth flecks catch the eye and sell the
  // scale of the surface.
  const flecks = Math.round(size * 0.5);
  for (let n = 0; n < flecks; n++) {
    const cx = rng() * size;
    const cy = rng() * size;
    const radius = 0.8 + rng() * (size * 0.006);
    const pale = rng() > 0.4;
    for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
      for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const px = (Math.round(cx + dx) + size) % size;
        const py = (Math.round(cy + dy) + size) % size;
        const i = py * size + px;
        const shade = pale ? 1.06 : 0.66;
        l.albedo[i * 3] *= shade;
        l.albedo[i * 3 + 1] *= shade * (pale ? 1.02 : 0.98);
        l.albedo[i * 3 + 2] *= shade * (pale ? 1.04 : 0.94);
        l.height[i] = clamp01(l.height[i] + 0.22);
        l.rough[i] = pale ? 0.5 : 0.72;
      }
    }
  }

  return finish(l, { normalStrength: 1.6, worldScale: 3.0 });
}

/** Tropical grass from above: clumps of blades over dark soil. */
function generateGrass(size: number, seed: number): MaterialMaps {
  const l = createLayers(size);
  const noise = new Noise2D(seed);
  const rng = makeRng(seed * 3 + 11);

  // Soil base, so gaps between blades read as shadowed earth rather than green.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const soil = noise.fbm(x * 0.03, y * 0.03, 3);
      setPixel(l, i, 0.16 + soil * 0.1, 0.15 + soil * 0.1, 0.09 + soil * 0.06, 0.25 + soil * 0.12, 0.95);
    }
  }

  // Blades: short strokes in random directions, tinted by a patch field so the
  // sward has lush and sun-bleached areas rather than one flat green.
  const blades = size * size * 0.045;
  for (let n = 0; n < blades; n++) {
    const x0 = rng() * size;
    const y0 = rng() * size;
    const patch = noise.fbm(x0 * 0.012, y0 * 0.012, 3);
    const angle = rng() * Math.PI * 2;
    const len = size * (0.006 + rng() * 0.018);
    const dry = clamp01(patch * 1.5 - 0.1) * rng();
    const shade = 0.7 + rng() * 0.55;
    const r = lerp(0.22, 0.62, dry) * shade;
    const g = lerp(0.46, 0.58, dry) * shade;
    const b = lerp(0.14, 0.22, dry) * shade;
    const steps = Math.max(2, Math.round(len));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = (Math.round(x0 + Math.cos(angle) * len * t) + size) % size;
      const py = (Math.round(y0 + Math.sin(angle) * len * t) + size) % size;
      const i = py * size + px;
      // Tips are lighter and stand proud of the mat.
      const tip = 0.85 + t * 0.35;
      l.albedo[i * 3] = r * tip;
      l.albedo[i * 3 + 1] = g * tip;
      l.albedo[i * 3 + 2] = b * tip;
      l.height[i] = clamp01(0.45 + t * 0.4);
      l.rough[i] = 0.82;
    }
  }

  return finish(l, { normalStrength: 1.1, worldScale: 2.2 });
}

/** Weathered coastal rock: bedding planes, cracks and lichen. */
function generateRock(size: number, seed: number): MaterialMaps {
  const l = createLayers(size);
  const noise = new Noise2D(seed);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      // Bedding: stretched noise bands, so the stone reads as layered.
      const strata = noise.fbm(x * 0.01, y * 0.075, 4);
      const grain = noise.fbm(x * 0.16, y * 0.16, 3);
      // Ridged noise makes convincing cracks.
      const crack = noise.ridged(x * 0.035 + 3.3, y * 0.035 - 8.1, 3);
      const cracked = clamp01((crack - 0.62) * 4.5);
      const lichen = clamp01(noise.fbm(x * 0.02 + 61, y * 0.02 + 17, 4) * 1.7 - 0.5);

      let tone = 0.44 + strata * 0.26 + grain * 0.14;
      tone *= 1.0 - cracked * 0.55;
      let r = tone * 0.98;
      let g = tone * 0.94;
      let b = tone * 0.86;
      // Grey-green lichen crusts on the exposed faces.
      r = lerp(r, 0.42, lichen * 0.55);
      g = lerp(g, 0.47, lichen * 0.6);
      b = lerp(b, 0.31, lichen * 0.5);

      const height = 0.5 + strata * 0.3 + grain * 0.16 - cracked * 0.55;
      const rough = 0.72 + grain * 0.2 + cracked * 0.1;
      setPixel(l, i, r, g, b, clamp01(height), clamp01(rough));
    }
  }

  return finish(l, { normalStrength: 2.6, worldScale: 4.0 });
}

/** Sea floor sand, seen through shallow water. */
function generateSeabed(size: number, seed: number): MaterialMaps {
  const l = createLayers(size);
  const noise = new Noise2D(seed);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const ripple = Math.sin(x * 0.08 + noise.fbm(x * 0.01, y * 0.01, 3) * 6) * 0.5 + 0.5;
      const grit = noise.fbm(x * 0.3, y * 0.3, 2);
      const shade = 0.86 + ripple * 0.16 + grit * 0.08;
      setPixel(l, i, shade, shade * 0.98, shade * 0.9, clamp01(0.4 + ripple * 0.45 + grit * 0.15), 0.9);
    }
  }

  return finish(l, { normalStrength: 2.2, worldScale: 8 });
}

// -------------------------------------------------------------------- library

export type TextureName =
  | 'deck'
  | 'hull'
  | 'hullDark'
  | 'tar'
  | 'canvas'
  | 'iron'
  | 'gold'
  | 'rope'
  | 'ground'
  | 'sand'
  | 'grass'
  | 'rock'
  | 'seabed';

const cache = new Map<TextureName, MaterialMaps>();

/** Texture size scales with the quality tier: 512 looks good, 256 loads fast. */
let textureSize = 512;

export function setTextureQuality(size: number): void {
  textureSize = size;
}

export function getMaps(name: TextureName): MaterialMaps {
  const existing = cache.get(name);
  if (existing) return existing;

  const s = textureSize;
  let maps: MaterialMaps;
  switch (name) {
    case 'deck':
      // Wide, well-trodden deck boards.
      maps = generateWood({
        size: s,
        boards: 7,
        base: [0.8, 0.62, 0.41],
        dark: [0.34, 0.23, 0.14],
        grainStrength: 0.34,
        seed: 4021,
        worldScale: 2.6,
        wear: 0.8,
      });
      break;
    case 'hull':
      // Narrower hull strakes, less wear, more weathering.
      maps = generateWood({
        size: s,
        boards: 10,
        base: [0.72, 0.53, 0.34],
        dark: [0.28, 0.19, 0.11],
        grainStrength: 0.4,
        seed: 917,
        worldScale: 2.2,
        wear: 0.3,
      });
      break;
    case 'hullDark':
      maps = generateWood({
        size: s,
        boards: 12,
        base: [0.52, 0.38, 0.24],
        dark: [0.19, 0.13, 0.08],
        grainStrength: 0.45,
        seed: 3312,
        worldScale: 2.0,
        wear: 0.15,
      });
      break;
    case 'tar':
      maps = generateTar(s, 6611);
      break;
    case 'canvas':
      maps = generateCanvas(s, 2255);
      break;
    case 'iron':
      maps = generateIron(s, 7788);
      break;
    case 'gold':
      maps = generateGold(s, 1414);
      break;
    case 'rope':
      maps = generateRope(s, 5150);
      break;
    case 'ground':
      maps = generateGroundDetail(s, 8080);
      break;
    case 'sand':
      maps = generateSand(s, 2468);
      break;
    case 'grass':
      maps = generateGrass(s, 1357);
      break;
    case 'rock':
      maps = generateRock(s, 9753);
      break;
    default:
      maps = generateSeabed(s, 9090);
      break;
  }

  cache.set(name, maps);
  return maps;
}

/**
 * A PBR material driven by one of the generated texture sets. Vertex colours are
 * kept as a tint on top, so the existing per-plank shading still works.
 */
export function texturedMaterial(
  name: TextureName,
  options: {
    vertexColors?: boolean;
    metalness?: number;
    roughness?: number;
    color?: THREE.ColorRepresentation;
    normalScale?: number;
    side?: THREE.Side;
    envMapIntensity?: number;
  } = {},
): THREE.MeshStandardMaterial {
  const maps = getMaps(name);
  const material = new THREE.MeshStandardMaterial({
    map: maps.map,
    normalMap: maps.normalMap,
    roughnessMap: maps.roughnessMap,
    vertexColors: options.vertexColors ?? true,
    metalness: options.metalness ?? 0.02,
    roughness: options.roughness ?? 1,
    color: options.color ?? 0xffffff,
    side: options.side ?? THREE.FrontSide,
  });
  material.normalScale.setScalar(options.normalScale ?? 1);
  material.envMapIntensity = options.envMapIntensity ?? 1;
  return material;
}

/** Metres per texture tile, for code that generates UVs in world units. */
export function worldScaleOf(name: TextureName): number {
  return getMaps(name).worldScale;
}

export function disposeTextures(): void {
  for (const maps of cache.values()) {
    maps.map.dispose();
    maps.normalMap.dispose();
    maps.roughnessMap.dispose();
  }
  cache.clear();
}
