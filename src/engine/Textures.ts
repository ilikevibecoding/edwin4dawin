import * as THREE from 'three';
import { clamp, fbm, noise2, worley, lerp, smoothstep } from './math';

type PixelFn = (u: number, v: number, x: number, y: number) => [number, number, number, number?];
type HeightFn = (u: number, v: number) => number;

const cache = new Map<string, THREE.Texture>();

function canvasOf(size: number) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function finish(canvas: HTMLCanvasElement, srgb: boolean, repeat: number, aniso = 8): THREE.Texture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

/** Rasterise a per-pixel function into a texture. */
export function generate(
  key: string,
  size: number,
  fn: PixelFn,
  opts: { srgb?: boolean; repeat?: number } = {},
): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = canvasOf(size);
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const [r, g, b, a] = fn(x / size, y / size, x, y);
      d[i] = clamp(r) * 255;
      d[i + 1] = clamp(g) * 255;
      d[i + 2] = clamp(b) * 255;
      d[i + 3] = (a === undefined ? 1 : clamp(a)) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = finish(canvas, opts.srgb ?? false, opts.repeat ?? 1);
  cache.set(key, tex);
  return tex;
}

/** Build a tangent-space normal map by differentiating a height field. */
export function normalMap(key: string, size: number, height: HeightFn, strength = 1, repeat = 1): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) h[y * size + x] = height(x / size, y / size);
  }
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  const canvas = canvasOf(size);
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength * size * 0.02;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength * size * 0.02;
      let nx = -dx;
      let ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      const i = (y * size + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * 0.5 + 0.5) * 255;
      d[i + 2] = (nz / len) * 0.5 * 255 + 127.5;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = finish(canvas, false, repeat);
  cache.set(key, tex);
  return tex;
}

/** Grayscale data packed into a texture (roughness / AO / mask). */
export function grayMap(key: string, size: number, fn: HeightFn, repeat = 1): THREE.Texture {
  return generate(key, size, (u, v) => {
    const g = fn(u, v);
    return [g, g, g, 1];
  }, { repeat });
}

// ----------------------------------------------------------------- materials

const asphaltHeight: HeightFn = (u, v) => {
  const grain = fbm(u * 190, v * 190, 4);
  const pebbles = worley(u, v, 42);
  const cracks = Math.pow(1 - worley(u + 3.1, v + 8.7, 7), 12);
  return grain * 0.55 + (1 - pebbles) * 0.3 - cracks * 0.6;
};

export const T = {
  asphaltAlbedo: () =>
    generate(
      'asphaltAlbedo',
      512,
      (u, v) => {
        const g = fbm(u * 150, v * 150, 5);
        const p = worley(u, v, 42);
        const cracks = Math.pow(1 - worley(u + 3.1, v + 8.7, 7), 14);
        const base = 0.085 + g * 0.055 + (1 - p) * 0.022;
        const tint = base * (1 - cracks * 0.55);
        const streak = fbm(u * 6, v * 60, 3) * 0.02;
        return [tint + streak * 0.6, tint + streak * 0.55, tint * 1.06 + streak * 0.7, 1];
      },
      { srgb: true, repeat: 1 },
    ),
  asphaltNormal: () => normalMap('asphaltNormal', 512, asphaltHeight, 1.5),
  asphaltRough: () =>
    grayMap('asphaltRough', 512, (u, v) => {
      // Puddles and wet sheen: low roughness where water pools.
      const pools = smoothstep(0.52, 0.78, fbm(u * 3.2, v * 3.2, 4));
      const grain = fbm(u * 120, v * 120, 3);
      return lerp(0.62 + grain * 0.3, 0.06, pools);
    }),
  puddleMask: () =>
    grayMap('puddleMask', 512, (u, v) => smoothstep(0.5, 0.72, fbm(u * 3.2, v * 3.2, 4))),

  concreteAlbedo: () =>
    generate(
      'concreteAlbedo',
      512,
      (u, v) => {
        const g = fbm(u * 60, v * 60, 5);
        const stain = smoothstep(0.35, 0.85, fbm(u * 4 + 11, v * 9 + 3, 4));
        const pit = Math.pow(1 - worley(u + 1.7, v + 2.3, 60), 8);
        const base = 0.27 + g * 0.13 - pit * 0.06 - stain * 0.07;
        return [base * 1.02, base * 1.0, base * 0.99, 1];
      },
      { srgb: true },
    ),
  concreteNormal: () =>
    normalMap(
      'concreteNormal',
      512,
      (u, v) => fbm(u * 70, v * 70, 5) * 0.5 + (1 - worley(u + 1.7, v + 2.3, 60)) * 0.5,
      1.0,
    ),
  concreteRough: () =>
    grayMap('concreteRough', 512, (u, v) => 0.7 + fbm(u * 40, v * 40, 4) * 0.25),

  // Skin: fine pore structure + subtle blotchiness for believable specular breakup.
  skinNormal: () =>
    normalMap(
      'skinNormal',
      512,
      (u, v) => {
        const pores = 1 - worley(u, v, 170);
        const fine = fbm(u * 320, v * 320, 3);
        return pores * 0.55 + fine * 0.45;
      },
      0.34,
      1,
    ),
  skinRough: () =>
    grayMap('skinRough', 512, (u, v) => {
      const blotch = fbm(u * 9, v * 9, 4);
      const pores = 1 - worley(u, v, 150);
      return clamp(0.42 + blotch * 0.2 + pores * 0.16, 0.2, 0.85);
    }),
  skinAlbedo: () =>
    generate(
      'skinAlbedo',
      512,
      (u, v) => {
        const blotch = fbm(u * 7 + 2, v * 7, 4);
        const veins = fbm(u * 22, v * 18, 3);
        const r = 0.86 + blotch * 0.1;
        const g = 0.7 + blotch * 0.07 - veins * 0.03;
        const b = 0.63 + blotch * 0.05 + veins * 0.02;
        return [r, g, b, 1];
      },
      { srgb: true },
    ),

  fabricNormal: () =>
    normalMap(
      'fabricNormal',
      512,
      (u, v) => {
        const weave = Math.sin(u * Math.PI * 300) * Math.sin(v * Math.PI * 300);
        return 0.5 + weave * 0.25 + fbm(u * 100, v * 100, 3) * 0.25;
      },
      0.5,
      1,
    ),
  fabricRough: () =>
    grayMap('fabricRough', 256, (u, v) => 0.66 + fbm(u * 50, v * 50, 3) * 0.22),

  metalRough: () =>
    grayMap('metalRough', 512, (u, v) => {
      const brush = fbm(u * 400, v * 14, 4);
      const scratch = Math.pow(1 - worley(u * 0.7 + 5, v + 2, 18), 10);
      return clamp(0.22 + brush * 0.3 - scratch * 0.18, 0.03, 0.9);
    }),
  metalNormal: () =>
    normalMap('metalNormal', 512, (u, v) => fbm(u * 260, v * 12, 4), 0.25),

  // Emissive window grid for distant tower blocks.
  windows: () =>
    generate(
      'windows',
      512,
      (u, v) => {
        const cols = 16;
        const rows = 26;
        const cx = u * cols;
        const cy = v * rows;
        const ix = Math.floor(cx);
        const iy = Math.floor(cy);
        const fx = cx - ix;
        const fy = cy - iy;
        const inside = fx > 0.16 && fx < 0.84 && fy > 0.22 && fy < 0.8;
        const lit = noise2(ix * 3.1 + 0.5, iy * 7.7 + 0.5);
        const on = lit > 0.52;
        if (!inside || !on) return [0.012, 0.014, 0.02, 1];
        const warm = noise2(ix * 11.3, iy * 2.9);
        const flick = 0.55 + lit * 0.75;
        const r = lerp(0.45, 1.0, warm) * flick;
        const g = lerp(0.62, 0.85, warm) * flick;
        const b = lerp(1.0, 0.6, warm) * flick;
        const shade = 0.75 + noise2(ix * 5 + fy * 3, iy * 5) * 0.5;
        return [r * shade, g * shade, b * shade, 1];
      },
      { srgb: true },
    ),

  // Rain-on-glass / lens droplet field used by the post stack.
  droplets: () =>
    generate('droplets', 512, (u, v) => {
      let acc = 0;
      let nx = 0.5;
      let ny = 0.5;
      for (let s = 1; s <= 3; s++) {
        const scale = 9 * s;
        const d = worley(u * 1.0 + s * 3.7, v * 1.0 + s * 1.3, scale);
        const drop = Math.pow(clamp(1 - d * 2.6), 2.2);
        acc = Math.max(acc, drop);
        nx += (noise2(u * scale, v * scale) - 0.5) * drop * 0.7;
        ny += (noise2(u * scale + 9, v * scale + 4) - 0.5) * drop * 0.7;
      }
      return [nx, ny, acc, acc];
    }),

  // Screen-space blue-ish noise for grain and dithering.
  noise: () =>
    generate('blueNoise', 256, (_u, _v, x, y) => {
      const a = noise2(x * 12.9898, y * 78.233);
      const b = noise2(x * 39.3468 + 4.1, y * 11.135 + 7.3);
      const c = noise2(x * 3.1 + 19, y * 5.7 + 23);
      return [a, b, c, 1];
    }),

  hairClumps: () =>
    grayMap('hairClumps', 512, (u, v) => {
      // Vertical strand clumps: mostly opaque, torn at the tips.
      const strands = 1 - worley(u * 3.2, v * 0.55, 9);
      const wisps = fbm(u * 90, v * 12, 3);
      return clamp(strands * 0.75 + wisps * 0.55 + 0.12);
    }),

  scratchedGlass: () =>
    normalMap('scratchedGlass', 512, (u, v) => fbm(u * 30, v * 30, 3) * 0.5 + Math.pow(1 - worley(u, v, 9), 8), 0.18),

  tile: () =>
    generate(
      'tile',
      512,
      (u, v) => {
        const gx = Math.abs(((u * 8) % 1) - 0.5) * 2;
        const gy = Math.abs(((v * 8) % 1) - 0.5) * 2;
        const grout = smoothstep(0.86, 0.98, Math.max(gx, gy));
        const base = 0.26 + fbm(u * 80, v * 80, 4) * 0.07;
        const c = lerp(base, 0.1, grout);
        return [c, c * 1.03, c * 1.08, 1];
      },
      { srgb: true },
    ),
  tileRough: () =>
    grayMap('tileRough', 512, (u, v) => {
      const gx = Math.abs(((u * 8) % 1) - 0.5) * 2;
      const gy = Math.abs(((v * 8) % 1) - 0.5) * 2;
      const grout = smoothstep(0.86, 0.98, Math.max(gx, gy));
      return lerp(0.18 + fbm(u * 60, v * 60, 3) * 0.14, 0.85, grout);
    }),

  rustMetal: () =>
    generate(
      'rustMetal',
      512,
      (u, v) => {
        const rust = smoothstep(0.45, 0.8, fbm(u * 6, v * 6, 5));
        const grime = fbm(u * 40, v * 40, 4);
        const r = lerp(0.24, 0.4 + grime * 0.16, rust);
        const g = lerp(0.25, 0.19 + grime * 0.09, rust);
        const b = lerp(0.28, 0.12 + grime * 0.05, rust);
        return [r, g, b, 1];
      },
      { srgb: true },
    ),
  rustRough: () =>
    grayMap('rustRough', 512, (u, v) =>
      lerp(0.35, 0.92, smoothstep(0.45, 0.8, fbm(u * 6, v * 6, 5))) + fbm(u * 70, v * 70, 3) * 0.08,
    ),
};

/** Cheap ambient IBL: a synthetic night-city gradient probe rendered to an equirect texture. */
export function skyEnvTexture(
  renderer: THREE.WebGLRenderer,
  palette: { top: THREE.ColorRepresentation; horizon: THREE.ColorRepresentation; ground: THREE.ColorRepresentation; glow?: THREE.ColorRepresentation },
): THREE.Texture {
  const size = 256;
  const canvas = canvasOf(size);
  const ctx = canvas.getContext('2d')!;
  const top = new THREE.Color(palette.top);
  const horizon = new THREE.Color(palette.horizon);
  const ground = new THREE.Color(palette.ground);
  const glow = new THREE.Color(palette.glow ?? palette.horizon);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const tmp = new THREE.Color();
  for (let y = 0; y < size; y++) {
    const v = y / (size - 1);
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      if (v < 0.5) {
        tmp.copy(horizon).lerp(top, Math.pow(1 - v * 2, 0.75));
      } else {
        tmp.copy(horizon).lerp(ground, Math.pow((v - 0.5) * 2, 0.6));
      }
      // Two soft city-glow lobes so reflections have direction.
      const lobe = Math.pow(Math.max(0, Math.cos((u - 0.25) * Math.PI * 2)), 8) * (1 - Math.abs(v - 0.52) * 2.2);
      const lobe2 = Math.pow(Math.max(0, Math.cos((u - 0.72) * Math.PI * 2)), 12) * (1 - Math.abs(v - 0.5) * 2.4);
      tmp.lerp(glow, clamp(Math.max(lobe, 0) * 0.55 + Math.max(lobe2, 0) * 0.35));
      const i = (y * size + x) * 4;
      d[i] = clamp(tmp.r) * 255;
      d[i + 1] = clamp(tmp.g) * 255;
      d[i + 2] = clamp(tmp.b) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return env;
}
