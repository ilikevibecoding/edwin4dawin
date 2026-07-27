import * as THREE from 'three';
import { clamp, clamp01, lerp, makeRng, smoothstep } from './math';
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

      // Keep the low-frequency staining gentle: one tile is only half a metre,
      // so anything blotchy here repeats a dozen times across a sail and reads
      // as a printed pattern rather than as weathering.
      let tone = 0.88 + weave * 0.13 - (1 - thread) * 0.08;
      tone *= lerp(0.9, 1.0, stain);
      tone *= 0.96 + fibre * 0.08;

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

/**
 * Polished brass for the small fittings: binnacle head, wheel bosses, lamp
 * frames. Deliberately not the gold set - gold's tarnish blotches are a metre
 * across, which on a compass hood lands one or two to the whole object and
 * reads as lichen. This is fine turning marks and a bright, even alloy.
 */
function generateBrass(size: number, seed: number): MaterialMaps {
  const l = createLayers(size);
  const noise = new Noise2D(seed);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      // Concentric turning marks from the lathe, plus a fine polish grain.
      const turn = Math.sin(y * 0.9 + noise.sample(x * 0.03, y * 0.02) * 2.4) * 0.5 + 0.5;
      const grain = noise.fbm(x * 0.42, y * 0.42, 2);
      const patina = clamp01(noise.fbm(x * 0.07 + 11, y * 0.07 - 4, 3) * 1.2 - 0.15);

      const tone = 0.94 + turn * 0.05 + (grain - 0.5) * 0.06;
      const r = lerp(0.86, 0.62, patina) * tone;
      const g = lerp(0.69, 0.52, patina) * tone;
      const b = lerp(0.33, 0.28, patina) * tone;

      const height = 0.5 + (turn - 0.5) * 0.12 + (grain - 0.5) * 0.2;
      const rough = clamp01(0.24 + patina * 0.22 + (grain - 0.5) * 0.12);
      setPixel(l, i, r, g, b, height, rough);
    }
  }

  return finish(l, { normalStrength: 0.7, worldScale: 0.45 });
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
      // Strands laid in a helix. Struts author UVs in metres - circumference
      // across, length along - so equal frequencies on both axes put the lay at
      // 45 degrees whatever the rope's diameter, instead of the barber pole a
      // mismatched pitch gives on a thin shroud.
      const lays = 10;
      const spiral = Math.sin(((x - y) / size) * Math.PI * 2 * lays);
      const strand = spiral * 0.5 + 0.5;
      const fibre = noise.fbm(x * 0.14, y * 0.14, 3) * 0.5 + 0.5;
      // Tarred rigging is dark and matt; the shape should come from the normal
      // map, not from a light-and-dark stripe in the albedo.
      const tone = 0.6 + strand * 0.16 + fibre * 0.12;
      setPixel(l, i, tone * 0.5, tone * 0.42, tone * 0.3, clamp01(strand * 0.7 + fibre * 0.2), 0.9);
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

      // Coral sand is pale but not white: at 0.86 albedo under a tropical sun
      // the whole beach clips and every ripple in the height map is lost.
      let tone = 0.82 + ripple * 0.1 + grit * 0.12 + grain * 0.06;
      tone *= lerp(1.0, 0.74, damp * 0.7);
      const r = tone * 0.79;
      const g = tone * 0.7;
      const b = tone * 0.55;
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

// -------------------------------------------------------------- water surface

/**
 * The sea's own surface texture, and everything the ocean shader needs to
 * decode it.
 *
 * Packed as one RGBA tile: R and G carry the surface slope, B how much fine
 * ripple energy is in this patch, and A the height. Slope rather than a
 * tangent-space normal, because the ocean composes its layers as gradients and
 * builds a single normal at the end - handing it a normal would mean
 * unpacking, dividing and re-normalising three times per pixel to get back to
 * the number it actually wanted.
 */
export interface WaterDetail {
  texture: THREE.CanvasTexture;
  /** Texels across one tile. */
  size: number;
  /** Half-width of the slope encoding, in standard deviations. */
  slopeRange: number;
  /**
   * Mip level at which the patch starts losing content, and the one by which
   * all of it has gone. Between them the shader hands the slope it can no
   * longer draw over to the specular lobe as roughness.
   */
  lodStart: number;
  lodEnd: number;
}

/** Twiddle tables, one set per transform length. */
const fftTwiddle = new Map<number, { cos: Float64Array; sin: Float64Array }>();

function twiddleFor(n: number): { cos: Float64Array; sin: Float64Array } {
  const existing = fftTwiddle.get(n);
  if (existing) return existing;
  const cos = new Float64Array(n);
  const sin = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    cos[i] = Math.cos(a);
    sin[i] = Math.sin(a);
  }
  const table = { cos, sin };
  fftTwiddle.set(n, table);
  return table;
}

/**
 * In-place radix-2 inverse DFT of one row. Twiddles come from a table rather
 * than being stepped round the circle, since a stepped rotation drifts by
 * enough over a few hundred points to leave a visible seam in the tile.
 */
function ifft1d(re: Float64Array, im: Float64Array, n: number): void {
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  const { cos, sin } = twiddleFor(n);
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const step = n / len;
    for (let base = 0; base < n; base += len) {
      for (let k = 0; k < half; k++) {
        const t = k * step;
        const wr = cos[t];
        const wi = sin[t];
        const a = base + k;
        const b = a + half;
        const vr = re[b] * wr - im[b] * wi;
        const vi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - vr;
        im[b] = im[a] - vi;
        re[a] += vr;
        im[a] += vi;
      }
    }
  }
}

/** 2D inverse transform of a square tile, rows then columns. */
function ifft2d(re: Float64Array, im: Float64Array, size: number): void {
  const rowRe = new Float64Array(size);
  const rowIm = new Float64Array(size);
  for (let y = 0; y < size; y++) {
    const off = y * size;
    rowRe.set(re.subarray(off, off + size));
    rowIm.set(im.subarray(off, off + size));
    ifft1d(rowRe, rowIm, size);
    re.set(rowRe, off);
    im.set(rowIm, off);
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      rowRe[y] = re[y * size + x];
      rowIm[y] = im[y * size + x];
    }
    ifft1d(rowRe, rowIm, size);
    for (let y = 0; y < size; y++) {
      re[y * size + x] = rowRe[y];
      im[y * size + x] = rowIm[y];
    }
  }
}

/** Separable wrapping box blur, used to pull the slow part out of a field. */
function boxBlurWrap(field: Float64Array, size: number, radius: number): Float64Array {
  const out = new Float64Array(size * size);
  const tmp = new Float64Array(size * size);
  const width = radius * 2 + 1;
  for (let y = 0; y < size; y++) {
    const row = y * size;
    let sum = 0;
    for (let d = -radius; d <= radius; d++) sum += field[row + ((d + size) % size)];
    for (let x = 0; x < size; x++) {
      tmp[row + x] = sum / width;
      sum -= field[row + ((x - radius + size) % size)];
      sum += field[row + ((x + radius + 1) % size)];
    }
  }
  for (let x = 0; x < size; x++) {
    let sum = 0;
    for (let d = -radius; d <= radius; d++) sum += tmp[((d + size) % size) * size + x];
    for (let y = 0; y < size; y++) {
      out[y * size + x] = sum / width;
      sum -= tmp[((y - radius + size) % size) * size + x];
      sum += tmp[((y + radius + 1) % size) * size + x];
    }
  }
  return out;
}

/**
 * How much of the tile's slope each mip level still carries, measured rather
 * than guessed.
 *
 * The shader has to know at what distance the patch stops contributing shape
 * and starts contributing roughness, and the honest answer depends on the
 * spectrum that went into it. Averaging the field down two by two is exactly
 * what the driver does to build the mip chain, so the variance measured here
 * is the variance the hardware will hand back.
 *
 * Returns the two levels a straight ramp should run between to match it.
 */
function mipSlopeFade(slopeX: Float64Array, slopeY: Float64Array, size: number): { start: number; end: number } {
  let a = Float64Array.from(slopeX);
  let b = Float64Array.from(slopeY);
  let n = size;
  const variance = (f: Float64Array) => {
    let mean = 0;
    for (let i = 0; i < f.length; i++) mean += f[i];
    mean /= f.length;
    let v = 0;
    for (let i = 0; i < f.length; i++) v += (f[i] - mean) * (f[i] - mean);
    return v / f.length;
  };
  const lost: number[] = [];
  const base = variance(a) + variance(b);
  while (n >= 2) {
    lost.push(1 - (variance(a) + variance(b)) / base);
    const m = n >> 1;
    const na = new Float64Array(m * m);
    const nb = new Float64Array(m * m);
    for (let y = 0; y < m; y++) {
      for (let x = 0; x < m; x++) {
        const i0 = 2 * y * n + 2 * x;
        const i1 = i0 + n;
        na[y * m + x] = (a[i0] + a[i0 + 1] + a[i1] + a[i1 + 1]) * 0.25;
        nb[y * m + x] = (b[i0] + b[i0 + 1] + b[i1] + b[i1 + 1]) * 0.25;
      }
    }
    a = na;
    b = nb;
    n = m;
  }

  // Where the measured curve crosses a tenth and nine tenths gone, and the
  // straight line through those two points extended to the ends.
  const crossing = (target: number): number => {
    for (let i = 1; i < lost.length; i++) {
      if (lost[i] >= target) {
        const t = (target - lost[i - 1]) / Math.max(lost[i] - lost[i - 1], 1e-6);
        return i - 1 + t;
      }
    }
    return lost.length - 1;
  };
  const lo = crossing(0.1);
  const hi = crossing(0.9);
  const span = Math.max(hi - lo, 0.5);
  return { start: lo - span * 0.125, end: lo + span * 1.125 };
}

function standardDeviation(field: Float64Array): number {
  let mean = 0;
  for (let i = 0; i < field.length; i++) mean += field[i];
  mean /= field.length;
  let variance = 0;
  for (let i = 0; i < field.length; i++) {
    const d = field[i] - mean;
    variance += d * d;
  }
  return Math.sqrt(variance / field.length) || 1;
}

/** Nothing at the scale of the tile itself; see the seam note in the generator. */
const WATER_LOW_CUT = 3.0;
/** Nor within a few texels of the grid, which no mip level could filter. */
const WATER_HIGH_CUT = 0.155;
/** Half-width of the slope encoding, in standard deviations. */
const WATER_SLOPE_RANGE = 3.5;

/**
 * A tiling patch of the sea's short waves, built in the frequency domain.
 *
 * Every other texture here is painted pixel by pixel, and that is the wrong
 * tool for water. What a surface looks like is decided by its spectrum - how
 * much slope sits at each scale - and the ocean's has been measured: the
 * height spectrum of wind waves falls as the fourth power of the wavenumber,
 * which is the same statement as every octave carrying an equal share of the
 * slope. That is why the sea looks the same however close you get to it, and
 * it is not something a stack of hand-tuned sine waves reproduces; they give a
 * lattice, which a sharp sun highlight turns into a grid of bright squares.
 *
 * So the spectrum is written down directly, filled with random phase, and
 * inverse-transformed onto the tile. Working on an integer lattice of
 * wavenumbers means the result is exactly periodic - it wraps with no seam and
 * no blending - which is the whole reason this can be a texture at all.
 *
 * Two departures from a plain Gaussian field, both of which are what make the
 * result read as water rather than as crumpled foil:
 *
 * - Crests are sharpened and troughs flattened, which is the Stokes asymmetry
 *   every gravity wave has and the reason a sea catches the sun in points
 *   rather than in even bands.
 * - Ripple is bunched onto the backs of the longer waves in the patch, because
 *   that is where the wind actually reaches it. An unmodulated field has its
 *   fine detail spread evenly, and evenly spread detail reads as noise.
 *
 * There is deliberately no energy at the scale of the tile. A patch whose
 * largest feature is a third of its width has nothing in it big enough to
 * recognise from one repeat to the next, and that - far more than the tile
 * size - is what decides whether a repeat is visible.
 */
function generateWaterDetail(size: number, seed: number): WaterDetail {
  const rng = makeRng(seed);
  const total = size * size;
  const half = size / 2;
  const specRe = new Float64Array(total);
  const specIm = new Float64Array(total);

  // Waves run a little more across the tile than along it, so the patch has a
  // grain to it. Kept mild: the tile is laid down in a fixed world orientation
  // (see the ocean shader) and a strongly combed one could not then be right
  // for every wind.
  const combX = Math.cos(0.62);
  const combY = Math.sin(0.62);
  const lowCut = WATER_LOW_CUT;
  const highCut = size * WATER_HIGH_CUT;

  // Box-Muller, two at a time.
  let spare = 0;
  let hasSpare = false;
  const gauss = (): number => {
    if (hasSpare) {
      hasSpare = false;
      return spare;
    }
    const u = Math.max(rng(), 1e-9);
    const v = rng() * Math.PI * 2;
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(v);
    hasSpare = true;
    return r * Math.cos(v);
  };

  for (let iy = 0; iy < size; iy++) {
    const ny = iy < half ? iy : iy - size;
    for (let ix = 0; ix < size; ix++) {
      const nx = ix < half ? ix : ix - size;
      const n = Math.hypot(nx, ny);
      if (n < 0.5) continue;
      const i = iy * size + ix;
      // Phillips, without the wind-speed cutoff: the patch is only ever the
      // short end of the spectrum, and the long end is the Gerstner set's job.
      let amp = 1 / (n * n);
      const align = Math.abs((nx * combX + ny * combY) / n);
      amp *= 0.46 + 0.54 * align;
      amp *= smoothstep(lowCut * 0.5, lowCut * 2.2, n);
      amp *= Math.exp(-(n / highCut) * (n / highCut));
      specRe[i] = gauss() * amp;
      specIm[i] = gauss() * amp;
    }
  }

  // Height, and the two slopes. Differentiating in the frequency domain is a
  // multiply by the wavenumber, so the slopes come out exact rather than as a
  // Sobel difference of a field that has already been rounded to bytes.
  const heightRe = Float64Array.from(specRe);
  const heightIm = Float64Array.from(specIm);
  ifft2d(heightRe, heightIm, size);

  const slopeX = new Float64Array(total);
  const slopeY = new Float64Array(total);
  {
    const re = new Float64Array(total);
    const im = new Float64Array(total);
    for (let iy = 0; iy < size; iy++) {
      for (let ix = 0; ix < size; ix++) {
        const nx = ix < half ? ix : ix - size;
        const i = iy * size + ix;
        re[i] = -nx * specIm[i];
        im[i] = nx * specRe[i];
      }
    }
    ifft2d(re, im, size);
    slopeX.set(re);
    for (let iy = 0; iy < size; iy++) {
      const ny = iy < half ? iy : iy - size;
      for (let ix = 0; ix < size; ix++) {
        const i = iy * size + ix;
        re[i] = -ny * specIm[i];
        im[i] = ny * specRe[i];
      }
    }
    ifft2d(re, im, size);
    slopeY.set(re);
  }

  const heightSigma = standardDeviation(heightRe);
  const slow = boxBlurWrap(heightRe, size, Math.max(2, Math.round(size / 22)));
  const slowSigma = standardDeviation(slow);

  for (let i = 0; i < total; i++) {
    const h = heightRe[i] / heightSigma;
    // Stokes: the slope of a real wave is not symmetric about its mean level,
    // it steepens towards the crest. Applied to the slope rather than to the
    // height so the field stays exactly differentiable.
    const stokes = 1 + 0.5 * clamp(h, -1.6, 1.6);
    // And the ripple sits on the backs of the longer waves.
    const bunch = 0.55 + 0.75 * clamp01(slow[i] / slowSigma * 0.5 + 0.5);
    const k = stokes * bunch;
    slopeX[i] *= k;
    slopeY[i] *= k;
  }

  const slopeSigma = Math.sqrt(
    (standardDeviation(slopeX) ** 2 + standardDeviation(slopeY) ** 2) * 0.5,
  );

  // How much fine ripple this patch has, smoothed over about a tenth of the
  // tile. Slope dies away with every mip level, but this is slow enough to
  // survive them all, so the sheen it drives is still there at a distance
  // where nothing else of the texture is.
  const energyRaw = new Float64Array(total);
  for (let i = 0; i < total; i++) {
    energyRaw[i] = (slopeX[i] * slopeX[i] + slopeY[i] * slopeY[i]) / (slopeSigma * slopeSigma * 2);
  }
  const energy = boxBlurWrap(energyRaw, size, Math.max(2, Math.round(size / 11)));
  const energySigma = standardDeviation(energy);

  const bytes = new Uint8Array(total * 4);
  const encode = (v: number) => Math.round(clamp01(v * 0.5 + 0.5) * 255);
  for (let i = 0; i < total; i++) {
    bytes[i * 4] = encode(slopeX[i] / (slopeSigma * WATER_SLOPE_RANGE));
    bytes[i * 4 + 1] = encode(slopeY[i] / (slopeSigma * WATER_SLOPE_RANGE));
    bytes[i * 4 + 2] = encode((energy[i] - 1) / (energySigma * 2.4));
    bytes[i * 4 + 3] = encode(heightRe[i] / (heightSigma * 3.0));
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(size, size);
  image.data.set(bytes);
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  // The ocean picks its own mip level from the size of a pixel's footprint on
  // the water, so there is nothing here for anisotropy to do - and a software
  // rasteriser charges the full sixteen taps for it.
  texture.anisotropy = 1;
  // Tile space maps straight onto world XZ, so the V axis must not be flipped
  // or the two slope channels come back describing a mirrored surface.
  texture.flipY = false;
  texture.needsUpdate = true;

  const fade = mipSlopeFade(slopeX, slopeY, size);
  return { texture, size, slopeRange: WATER_SLOPE_RANGE, lodStart: fade.start, lodEnd: fade.end };
}

let waterDetail: WaterDetail | undefined;

/**
 * The tiling sea-surface patch. One tile is shared by every scale the ocean
 * lays it down at, so this is generated once and never regenerated: it is a
 * dimensionless slope field, and what it means in metres is decided entirely
 * by the scale the shader samples it at.
 *
 * Fixed at 256 rather than following the quality tier. The tile is laid down
 * at three scales spanning nearly four octaves, so its effective resolution is
 * many times its own, and a quarter-megabyte texture stays in cache on the
 * software rasteriser the tests run under.
 */
export function getWaterDetail(): WaterDetail {
  if (!waterDetail) waterDetail = generateWaterDetail(256, 60919);
  return waterDetail;
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
  | 'brass'
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
    case 'brass':
      maps = generateBrass(s, 6262);
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
  waterDetail?.texture.dispose();
  waterDetail = undefined;
}
