/**
 * Procedural texture library. Everything in this game is generated at runtime —
 * no image assets ship with the build. Height fields are authored first and
 * normal/roughness maps are derived from them so surfaces stay physically
 * consistent under the PBR pipeline.
 */
import * as THREE from 'three';
import { clamp, fbm2, gauss, lerp, noise2, ridge2, Rng, smoothstep, worley2 } from './math';

export type TexSet = {
  map: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  aoMap?: THREE.Texture;
  emissiveMap?: THREE.Texture;
};

const cache = new Map<string, unknown>();
function memo<T>(key: string, make: () => T): T {
  const hit = cache.get(key);
  if (hit) return hit as T;
  const v = make();
  cache.set(key, v);
  return v;
}

export function clearTextureCache(): void {
  for (const v of cache.values()) {
    if (v instanceof THREE.Texture) v.dispose();
  }
  cache.clear();
}

/* ------------------------------------------------------------------ core */

function makeCanvas(w: number, h: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  return { c, ctx };
}

function toTexture(c: HTMLCanvasElement, opts: { srgb?: boolean; repeat?: number; aniso?: number } = {}): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = opts.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  const r = opts.repeat ?? 1;
  t.repeat.set(r, r);
  t.anisotropy = opts.aniso ?? 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Render an RGBA field from a per-pixel callback. */
function field(
  size: number,
  fn: (u: number, v: number, x: number, y: number) => [number, number, number, number?],
  srgb: boolean,
  repeat = 1,
): THREE.Texture {
  const { c, ctx } = makeCanvas(size, size);
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
  return toTexture(c, { srgb, repeat });
}

/** Build a height array from a callback (tileable if the callback is). */
function heightField(size: number, fn: (u: number, v: number) => number): Float32Array {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = fn(x / size, y / size);
  return h;
}

/** Sobel-derive a tangent-space normal map from a height array. */
function normalFromHeight(h: Float32Array, size: number, strength = 2.2): THREE.Texture {
  const { c, ctx } = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const at = (x: number, y: number) => h[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy =
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      let nx = -dx * strength, ny = -dy * strength, nz = 1;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      const i = (y * size + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * 0.5 + 0.5) * 255;
      d[i + 2] = (nz * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c);
}

function grayTexture(h: Float32Array, size: number, lo = 0, hi = 1): THREE.Texture {
  const { c, ctx } = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let i = 0; i < size * size; i++) {
    const v = clamp(lerp(lo, hi, h[i])) * 255;
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c);
}

/* ------------------------------------------------------------ materials */

/** Cracked, oil-stained asphalt. The workhorse of a rainy Detroit street. */
export function asphalt(size = 512): TexSet {
  return memo(`asphalt${size}`, () => {
    const grain = (u: number, v: number) => fbm2(u * 190, v * 190, 5) * 0.5 + 0.5;
    const pebbles = (u: number, v: number) => 1 - worley2(u * 46, v * 46, 46);
    const cracks = (u: number, v: number) => smoothstep(0.72, 0.99, ridge2(u * 5.2, v * 5.2, 4));
    const patch = (u: number, v: number) => fbm2(u * 3.1 + 11, v * 3.1 - 5, 3) * 0.5 + 0.5;

    const h = heightField(size, (u, v) => {
      const p = pebbles(u, v);
      return clamp(0.5 + (grain(u, v) - 0.5) * 0.55 + p * 0.3 - cracks(u, v) * 0.75);
    });
    const map = field(
      size,
      (u, v) => {
        const g = grain(u, v);
        const p = patch(u, v);
        const cr = cracks(u, v);
        // Dark tarmac with lighter aggregate and a few tar repairs.
        let base = lerp(0.036, 0.075, g) + pebbles(u, v) * 0.03;
        base = lerp(base, base * 0.62, smoothstep(0.62, 0.86, p));
        const oil = smoothstep(0.78, 1, fbm2(u * 2.2 - 30, v * 2.2 + 8, 3) * 0.5 + 0.5);
        const r = lerp(base, base * 0.7 + 0.02, oil) * (1 - cr * 0.55);
        return [r * 1.02, r * 1.0, r * 1.06 + oil * 0.02];
      },
      true,
      1,
    );
    const rough = heightField(size, (u, v) => {
      const wetPool = smoothstep(0.45, 0.86, fbm2(u * 2.6 + 60, v * 2.6, 3) * 0.5 + 0.5);
      return clamp(lerp(0.92, 0.34, wetPool) - pebbles(u, v) * 0.06 + cracks(u, v) * 0.05);
    });
    return {
      map,
      normalMap: normalFromHeight(h, size, 1.5),
      roughnessMap: grayTexture(rough, size),
    };
  });
}

/** Poured concrete with form lines and water staining. */
export function concrete(size = 512, tint = 0.1): TexSet {
  return memo(`concrete${size}_${tint}`, () => {
    const h = heightField(size, (u, v) => {
      const pit = smoothstep(0.55, 0.95, 1 - worley2(u * 30, v * 30, 30)) * 0.5;
      return clamp(0.55 + fbm2(u * 96, v * 96, 5) * 0.28 - pit * 0.6 + noise2(u * 420, v * 420) * 0.06);
    });
    const map = field(
      size,
      (u, v) => {
        const n = fbm2(u * 7, v * 7, 5) * 0.5 + 0.5;
        const stain = smoothstep(0.5, 1, fbm2(u * 2.4, v * 5.5 + 40, 4) * 0.5 + 0.5);
        const streak = smoothstep(0.62, 1, fbm2(u * 26, v * 1.6 + 9, 3) * 0.5 + 0.5) * smoothstep(0.1, 0.6, v);
        let g = tint + n * 0.09 - stain * 0.05 - streak * 0.045;
        g = clamp(g, 0.012, 0.9);
        return [g * 1.03, g, g * 0.96];
      },
      true,
    );
    const rough = heightField(size, (u, v) => clamp(0.74 + fbm2(u * 40, v * 40, 3) * 0.16));
    return { map, normalMap: normalFromHeight(h, size, 1.1), roughnessMap: grayTexture(rough, size) };
  });
}

/** Weathered brick — vertical surfaces in the old districts. */
export function brick(size = 512): TexSet {
  return memo(`brick${size}`, () => {
    const rows = 16, cols = 8;
    const cell = (u: number, v: number) => {
      const ry = v * rows;
      const row = Math.floor(ry);
      const off = row % 2 ? 0.5 : 0;
      const rx = (u + off) * cols;
      const col = Math.floor(rx);
      return { fx: rx - col, fy: ry - row, id: (col * 73856093) ^ (row * 19349663) };
    };
    const mortar = (u: number, v: number) => {
      const { fx, fy } = cell(u, v);
      const m = 0.055;
      const ex = Math.min(fx, 1 - fx), ey = Math.min(fy, 1 - fy) * (rows / cols);
      return 1 - smoothstep(0, m, Math.min(ex, ey));
    };
    const h = heightField(size, (u, v) => {
      const m = mortar(u, v);
      const { id } = cell(u, v);
      const rng = new Rng(id >>> 0);
      const jitter = rng.next() * 0.1;
      return clamp(0.72 - m * 0.62 + fbm2(u * 130, v * 130, 4) * 0.12 + jitter * (1 - m));
    });
    const map = field(
      size,
      (u, v) => {
        const m = mortar(u, v);
        const { id } = cell(u, v);
        const rng = new Rng(id >>> 0);
        const t = rng.next();
        const grime = smoothstep(0.35, 1, fbm2(u * 3.4, v * 3.4 + 17, 4) * 0.5 + 0.5);
        let r = lerp(0.16, 0.29, t), g = lerp(0.07, 0.12, t), b = lerp(0.055, 0.09, t);
        const n = fbm2(u * 150, v * 150, 3) * 0.04;
        r += n; g += n; b += n;
        const mg = 0.13 + fbm2(u * 90, v * 90, 3) * 0.03;
        r = lerp(r, mg, m); g = lerp(g, mg * 1.0, m); b = lerp(b, mg * 0.98, m);
        const k = 1 - grime * 0.45;
        return [r * k, g * k, b * k];
      },
      true,
    );
    const rough = heightField(size, (u, v) => clamp(0.82 - mortar(u, v) * 0.05 + fbm2(u * 60, v * 60, 3) * 0.1));
    return { map, normalMap: normalFromHeight(h, size, 1.9), roughnessMap: grayTexture(rough, size) };
  });
}

/** Polished stone floor tiles — police station, corporate lobbies. */
export function stoneTile(size = 512, cols = 4): TexSet {
  return memo(`tile${size}_${cols}`, () => {
    const seam = (u: number, v: number) => {
      const fx = (u * cols) % 1, fy = (v * cols) % 1;
      const e = Math.min(Math.min(fx, 1 - fx), Math.min(fy, 1 - fy));
      return 1 - smoothstep(0, 0.012, e);
    };
    const h = heightField(size, (u, v) => clamp(0.8 - seam(u, v) * 0.8 + fbm2(u * 200, v * 200, 3) * 0.04));
    const map = field(
      size,
      (u, v) => {
        const s = seam(u, v);
        const vein = smoothstep(0.55, 0.95, ridge2(u * 8 + 3, v * 8, 5));
        const mottle = fbm2(u * 16, v * 16, 4) * 0.5 + 0.5;
        let g = 0.1 + mottle * 0.055 + vein * 0.085;
        g = lerp(g, 0.035, s);
        return [g * 1.0, g * 1.02, g * 1.1];
      },
      true,
    );
    const rough = heightField(size, (u, v) => clamp(0.16 + seam(u, v) * 0.55 + fbm2(u * 70, v * 70, 3) * 0.07));
    return { map, normalMap: normalFromHeight(h, size, 1.0), roughnessMap: grayTexture(rough, size) };
  });
}

/** Woven fabric for upholstery and clothing. */
export function fabric(size = 256, r = 0.2, g = 0.2, b = 0.24, weave = 120): TexSet {
  return memo(`fabric${size}_${r}_${g}_${b}_${weave}`, () => {
    const w = (u: number, v: number) => {
      const a = Math.sin(u * weave * Math.PI) * 0.5 + 0.5;
      const c = Math.sin(v * weave * Math.PI) * 0.5 + 0.5;
      return a * 0.5 + c * 0.5;
    };
    const h = heightField(size, (u, v) => clamp(w(u, v) * 0.8 + fbm2(u * 220, v * 220, 3) * 0.2));
    const map = field(
      size,
      (u, v) => {
        const k = 0.86 + w(u, v) * 0.22 + fbm2(u * 90, v * 90, 3) * 0.07;
        const lint = smoothstep(0.85, 1, noise2(u * 300, v * 300) * 0.5 + 0.5) * 0.1;
        return [r * k + lint, g * k + lint, b * k + lint];
      },
      true,
    );
    const rough = heightField(size, (u, v) => clamp(0.86 - w(u, v) * 0.07));
    return { map, normalMap: normalFromHeight(h, size, 1.3), roughnessMap: grayTexture(rough, size) };
  });
}

/** Brushed / scuffed metal panels. */
export function metal(size = 512, dark = 0.32): TexSet {
  return memo(`metal${size}_${dark}`, () => {
    const brush = (u: number, v: number) => noise2(u * 900, v * 12) * 0.5 + 0.5;
    const h = heightField(size, (u, v) => clamp(0.6 + (brush(u, v) - 0.5) * 0.25 + fbm2(u * 60, v * 60, 3) * 0.1));
    const map = field(
      size,
      (u, v) => {
        const k = dark * (0.9 + (brush(u, v) - 0.5) * 0.16);
        const scuff = smoothstep(0.7, 1, fbm2(u * 24, v * 24, 4) * 0.5 + 0.5) * 0.06;
        return [k + scuff, k + scuff * 1.02, k * 1.05 + scuff];
      },
      true,
    );
    const rough = heightField(size, (u, v) =>
      clamp(0.3 + (brush(u, v) - 0.5) * 0.22 + smoothstep(0.62, 1, fbm2(u * 15, v * 15, 3) * 0.5 + 0.5) * 0.4),
    );
    return { map, normalMap: normalFromHeight(h, size, 0.8), roughnessMap: grayTexture(rough, size) };
  });
}

/** Painted / lacquered wood. */
export function wood(size = 512, warm = 1): TexSet {
  return memo(`wood${size}_${warm}`, () => {
    const rings = (u: number, v: number) => {
      const g = fbm2(u * 3, v * 0.6, 3) * 0.6;
      return Math.sin((v * 26 + g * 9) * Math.PI) * 0.5 + 0.5;
    };
    const h = heightField(size, (u, v) => clamp(0.6 + (rings(u, v) - 0.5) * 0.3 + noise2(u * 400, v * 60) * 0.1));
    const map = field(
      size,
      (u, v) => {
        const t = rings(u, v);
        const knot = smoothstep(0.86, 1, 1 - worley2(u * 4, v * 4, 4));
        const r = lerp(0.11, 0.2, t) * warm, g = lerp(0.055, 0.1, t) * warm, b = lerp(0.03, 0.06, t);
        const k = 1 - knot * 0.4;
        return [r * k, g * k, b * k];
      },
      true,
    );
    const rough = heightField(size, (u, v) => clamp(0.42 + (1 - rings(u, v)) * 0.16 + fbm2(u * 50, v * 50, 3) * 0.08));
    return { map, normalMap: normalFromHeight(h, size, 0.9), roughnessMap: grayTexture(rough, size) };
  });
}

/** Human skin: subtle blotching, pores, and a fine wrinkle field. */
export function skin(
  size = 512,
  base: [number, number, number] = [0.68, 0.47, 0.4],
): TexSet {
  return memo(`skin${size}_${base.join('_')}`, () => {
    const h = heightField(size, (u, v) => {
      const pores = 1 - worley2(u * 190, v * 190, 190);
      const fine = fbm2(u * 300, v * 300, 3) * 0.5 + 0.5;
      return clamp(0.62 - pores * 0.28 + fine * 0.16);
    });
    const map = field(
      size,
      (u, v) => {
        const blotch = fbm2(u * 9, v * 9, 4) * 0.5 + 0.5;
        const flush = smoothstep(0.55, 1, fbm2(u * 4 + 22, v * 4, 3) * 0.5 + 0.5);
        const pore = (1 - worley2(u * 190, v * 190, 190)) * 0.05;
        const k = 0.94 + blotch * 0.11 - pore;
        return [
          base[0] * k + flush * 0.055,
          base[1] * k * (1 - flush * 0.05),
          base[2] * k * (1 - flush * 0.055),
        ];
      },
      true,
    );
    const rough = heightField(size, (u, v) => {
      const oily = smoothstep(0.5, 1, fbm2(u * 6 + 4, v * 6, 3) * 0.5 + 0.5);
      return clamp(0.62 - oily * 0.2 + fbm2(u * 120, v * 120, 3) * 0.07);
    });
    return { map, normalMap: normalFromHeight(h, size, 0.55), roughnessMap: grayTexture(rough, size) };
  });
}

export type FaceTexOpts = {
  tone: [number, number, number];
  /** UV positions of the sculpt's landmarks, face centred at u = 0.5. */
  uvl: Record<string, [number, number]>;
  female?: boolean;
  age?: number;
  stubble?: number;
  lipTint?: [number, number, number];
  browColor?: number;
  browThickness?: number;
  size?: number;
  /** Horizontal:vertical UV scale ratio, for keeping features circular. */
  aspect?: number;
};

/**
 * Painted face map: lips, brows, socket shading, stubble and skin variation.
 *
 * Geometry alone cannot sell a face at dialogue distance — the lip line, brows
 * and the darker sockets do most of the work. Painting them in the head's UV
 * space (face centred at u = 0.5) keeps everything anchored to the sculpt.
 */
export function faceTexture(o: FaceTexOpts): TexSet {
  const size = o.size ?? 1024;
  const key = `face_${JSON.stringify(o)}_${size}`;
  return memo(key, () => {
    const { c, ctx } = makeCanvas(size, size);
    const tone = o.tone;
    const aspect = o.aspect ?? 2.1; // u spans the circumference, v the height
    const U = (u: number) => u * size;
    const V = (v: number) => (1 - v) * size;
    const uvl = o.uvl;
    const lm = (name: string, fallback: [number, number]): [number, number] => uvl[name] ?? fallback;
    const age = o.age ?? 30;

    const rgb = (r: number, g: number, b: number, a = 1) =>
      `rgba(${Math.round(clamp(r) * 255)},${Math.round(clamp(g) * 255)},${Math.round(clamp(b) * 255)},${a})`;

    /* ---- base tone with blotching and vascular variation ---- */
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = 1 - y / size;
        const blotch = fbm2(u * 11 * aspect, v * 11, 4) * 0.5 + 0.5;
        const fine = fbm2(u * 90 * aspect, v * 90, 3) * 0.5 + 0.5;
        const pore = (1 - worley2(u * 200 * aspect, v * 200, 200)) * 0.05;
        let k = 0.93 + blotch * 0.11 + (fine - 0.5) * 0.05 - pore;
        // Warmth in the cheeks, nose and ears; cooler across the forehead.
        const cheekL = gauss(u - 0.42, 0.05) * gauss(v - 0.42, 0.06);
        const cheekR = gauss(u - 0.58, 0.05) * gauss(v - 0.42, 0.06);
        const nose = gauss(u - 0.5, 0.03) * gauss(v - 0.36, 0.05);
        const chin = gauss(u - 0.5, 0.05) * gauss(v - 0.12, 0.05);
        const warm = clamp((cheekL + cheekR) * 0.9 + nose * 0.7 + chin * 0.35);
        const cool = gauss(v - 0.66, 0.1) * gauss(u - 0.5, 0.14);
        const i = (y * size + x) * 4;
        d[i] = clamp(tone[0] * k + warm * 0.09 - cool * 0.01) * 255;
        d[i + 1] = clamp(tone[1] * k * (1 - warm * 0.06) + cool * 0.004) * 255;
        d[i + 2] = clamp(tone[2] * k * (1 - warm * 0.07) + cool * 0.012) * 255;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    /* ---- eye sockets: soft shading and a lash line ---- */
    for (const side of ['L', 'R'] as const) {
      const [eu, ev] = lm(`eye${side}`, [side === 'L' ? 0.442 : 0.558, 0.455]);
      const w = 0.052, h = 0.03;
      // Socket shadow.
      const g = ctx.createRadialGradient(U(eu), V(ev), 1, U(eu), V(ev), U(w * 1.9));
      g.addColorStop(0, rgb(tone[0] * 0.6, tone[1] * 0.52, tone[2] * 0.55, 0.5));
      g.addColorStop(0.55, rgb(tone[0] * 0.78, tone[1] * 0.72, tone[2] * 0.74, 0.25));
      g.addColorStop(1, rgb(tone[0], tone[1], tone[2], 0));
      ctx.fillStyle = g;
      ctx.fillRect(U(eu - w * 2), V(ev + h * 3), U(w * 4), U(h * 6));

      // Lash line along the upper lid.
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(U(eu), V(ev + h * 0.15), U(w * 0.95), U(h * 0.62), 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = rgb(0.06, 0.04, 0.04, o.female ? 0.85 : 0.6);
      ctx.lineWidth = size * (o.female ? 0.0055 : 0.004);
      ctx.stroke();
      ctx.restore();

      // Lid crease.
      ctx.beginPath();
      ctx.ellipse(U(eu), V(ev + h * 0.5), U(w * 0.9), U(h * 1.0), 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.strokeStyle = rgb(tone[0] * 0.62, tone[1] * 0.55, tone[2] * 0.58, 0.4);
      ctx.lineWidth = size * 0.0022;
      ctx.stroke();
    }

    /* ---- eyebrows ---- */
    {
      const bc = new THREE.Color(o.browColor ?? 0x1a1210);
      const th = (o.browThickness ?? 1) * (o.female ? 0.72 : 1.05);
      for (const side of ['L', 'R'] as const) {
        const [bu, bv] = lm(`brow${side}`, [side === 'L' ? 0.44 : 0.56, 0.52]);
        const dir = side === 'L' ? -1 : 1;
        const rngB = new Rng(side === 'L' ? 991 : 992);
        // Hair-by-hair strokes give a soft, natural edge.
        for (let i = 0; i < 260; i++) {
          const t = rngB.next();
          const along = (t - 0.42) * 0.088 * dir;
          const arch = -Math.pow(t - 0.45, 2) * 0.06 + 0.012;
          const jitterV = rngB.normal(0, 0.0042) * th;
          const x0 = U(bu + along);
          const y0 = V(bv + arch + jitterV);
          const len = size * (0.006 + rngB.next() * 0.008);
          const ang = dir * (0.5 + (t - 0.5) * 1.6) + rngB.normal(0, 0.25);
          ctx.strokeStyle = rgb(bc.r * (0.7 + rngB.next() * 0.5), bc.g * (0.7 + rngB.next() * 0.5), bc.b * (0.7 + rngB.next() * 0.5), 0.55);
          ctx.lineWidth = size * 0.0016;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0 + Math.cos(ang) * len, y0 - Math.sin(ang) * len * 0.5);
          ctx.stroke();
        }
      }
    }

    /* ---- lips ---- */
    {
      const [mu, mv] = lm('mouth', [0.5, 0.19]);
      const [lu] = lm('mouthL', [0.462, 0.19]);
      const [ru] = lm('mouthR', [0.538, 0.19]);
      const halfW = Math.max(0.03, Math.abs(ru - lu) * 0.5);
      const tint = o.lipTint ?? (o.female
        ? [tone[0] * 0.88, tone[1] * 0.52, tone[2] * 0.52]
        : [tone[0] * 0.86, tone[1] * 0.66, tone[2] * 0.64]);
      const upH = 0.019 * (o.female ? 1.12 : 0.95);
      const loH = 0.023 * (o.female ? 1.15 : 1);

      // Upper lip with a cupid's bow, drawn as two lobes.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(U(mu - halfW), V(mv));
      ctx.bezierCurveTo(U(mu - halfW * 0.55), V(mv + upH * 1.15), U(mu - halfW * 0.2), V(mv + upH * 0.95), U(mu), V(mv + upH * 0.5));
      ctx.bezierCurveTo(U(mu + halfW * 0.2), V(mv + upH * 0.95), U(mu + halfW * 0.55), V(mv + upH * 1.15), U(mu + halfW), V(mv));
      ctx.bezierCurveTo(U(mu + halfW * 0.5), V(mv - upH * 0.12), U(mu - halfW * 0.5), V(mv - upH * 0.12), U(mu - halfW), V(mv));
      ctx.closePath();
      const gu = ctx.createLinearGradient(0, V(mv + upH), 0, V(mv));
      gu.addColorStop(0, rgb(tint[0] * 0.92, tint[1] * 0.92, tint[2] * 0.95, 0.9));
      gu.addColorStop(1, rgb(tint[0] * 0.7, tint[1] * 0.66, tint[2] * 0.7, 0.95));
      ctx.fillStyle = gu;
      ctx.fill();

      // Lower lip, fuller and lighter.
      ctx.beginPath();
      ctx.moveTo(U(mu - halfW * 0.94), V(mv));
      ctx.bezierCurveTo(U(mu - halfW * 0.6), V(mv - loH * 1.25), U(mu + halfW * 0.6), V(mv - loH * 1.25), U(mu + halfW * 0.94), V(mv));
      ctx.bezierCurveTo(U(mu + halfW * 0.4), V(mv + loH * 0.1), U(mu - halfW * 0.4), V(mv + loH * 0.1), U(mu - halfW * 0.94), V(mv));
      ctx.closePath();
      const gl = ctx.createLinearGradient(0, V(mv - loH), 0, V(mv));
      gl.addColorStop(0, rgb(tint[0] * 1.05, tint[1] * 1.0, tint[2] * 1.0, 0.85));
      gl.addColorStop(1, rgb(tint[0] * 0.8, tint[1] * 0.7, tint[2] * 0.72, 0.95));
      ctx.fillStyle = gl;
      ctx.fill();

      // Vermilion line.
      ctx.beginPath();
      ctx.moveTo(U(mu - halfW), V(mv));
      ctx.bezierCurveTo(U(mu - halfW * 0.4), V(mv + upH * 0.26), U(mu - halfW * 0.14), V(mv + upH * 0.1), U(mu), V(mv + upH * 0.16));
      ctx.bezierCurveTo(U(mu + halfW * 0.14), V(mv + upH * 0.1), U(mu + halfW * 0.4), V(mv + upH * 0.26), U(mu + halfW), V(mv));
      ctx.strokeStyle = rgb(tint[0] * 0.4, tint[1] * 0.3, tint[2] * 0.32, 0.85);
      ctx.lineWidth = size * 0.0028;
      ctx.stroke();

      // Vertical lip texture.
      const rngL = new Rng(555);
      for (let i = 0; i < 90; i++) {
        const t = rngL.next() * 2 - 1;
        const x0 = U(mu + t * halfW * 0.92);
        const top = V(mv - loH * (0.9 - Math.abs(t) * 0.5) * rngL.range(0.3, 1));
        const bot = V(mv + upH * (0.8 - Math.abs(t) * 0.4) * rngL.range(0.2, 0.9));
        ctx.strokeStyle = rgb(tint[0] * 0.6, tint[1] * 0.45, tint[2] * 0.48, 0.16);
        ctx.lineWidth = size * 0.0014;
        ctx.beginPath();
        ctx.moveTo(x0, top);
        ctx.lineTo(x0 + size * 0.002 * (rngL.next() - 0.5), bot);
        ctx.stroke();
      }
      ctx.restore();

      // Mouth corner shadows.
      for (const sx of [-1, 1]) {
        const g2 = ctx.createRadialGradient(U(mu + sx * halfW), V(mv), 1, U(mu + sx * halfW), V(mv), size * 0.022);
        g2.addColorStop(0, rgb(tone[0] * 0.5, tone[1] * 0.42, tone[2] * 0.44, 0.55));
        g2.addColorStop(1, rgb(tone[0], tone[1], tone[2], 0));
        ctx.fillStyle = g2;
        ctx.fillRect(U(mu + sx * halfW) - size * 0.03, V(mv) - size * 0.03, size * 0.06, size * 0.06);
      }
    }

    /* ---- nostrils ---- */
    {
      const [nu, nv] = lm('noseBase', [0.5, 0.3]);
      for (const sx of [-1, 1]) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(U(nu + sx * 0.017), V(nv + 0.004), U(0.009), U(0.006), sx * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = rgb(tone[0] * 0.22, tone[1] * 0.16, tone[2] * 0.17, 0.9);
        ctx.fill();
        ctx.restore();
      }
      // Shadow under the nose.
      const g3 = ctx.createRadialGradient(U(nu), V(nv - 0.004), 1, U(nu), V(nv - 0.004), size * 0.03);
      g3.addColorStop(0, rgb(tone[0] * 0.62, tone[1] * 0.54, tone[2] * 0.56, 0.4));
      g3.addColorStop(1, rgb(tone[0], tone[1], tone[2], 0));
      ctx.fillStyle = g3;
      ctx.fillRect(U(nu) - size * 0.04, V(nv) - size * 0.04, size * 0.08, size * 0.08);
    }

    /* ---- stubble / beard shadow ---- */
    if ((o.stubble ?? 0) > 0.01) {
      const s = o.stubble!;
      const [, chinV] = lm('chin', [0.5, 0.06]);
      const [, mouthV] = lm('mouth', [0.5, 0.19]);
      const rngS = new Rng(1234);
      ctx.save();
      for (let i = 0; i < Math.round(9000 * s); i++) {
        const u = 0.5 + rngS.normal(0, 0.055);
        const v = lerp(chinV - 0.02, mouthV + 0.055, Math.pow(rngS.next(), 0.7));
        // Keep it off the lips and out of the philtrum centre.
        const lipDist = Math.abs(v - mouthV);
        if (lipDist < 0.028 && Math.abs(u - 0.5) < 0.04) continue;
        const edge = gauss(u - 0.5, 0.062) * smoothstep(mouthV + 0.075, mouthV - 0.02, v);
        if (rngS.next() > edge * 1.2) continue;
        ctx.fillStyle = rgb(0.16, 0.13, 0.13, 0.35 * s);
        ctx.fillRect(U(u), V(v), size * 0.0022, size * 0.0022);
      }
      ctx.restore();
    }

    /* ---- age lines ---- */
    if (age > 38) {
      const w = smoothstep(38, 68, age);
      const rngA = new Rng(4321);
      ctx.save();
      ctx.strokeStyle = rgb(tone[0] * 0.62, tone[1] * 0.54, tone[2] * 0.56, 0.3 * w);
      ctx.lineWidth = size * 0.0016;
      // Forehead lines.
      for (let i = 0; i < 3; i++) {
        const v = 0.6 + i * 0.032;
        ctx.beginPath();
        for (let k = 0; k <= 20; k++) {
          const u = 0.42 + (k / 20) * 0.16;
          const yy = V(v + Math.sin(k * 0.9 + i) * 0.0025);
          if (k === 0) ctx.moveTo(U(u), yy);
          else ctx.lineTo(U(u), yy);
        }
        ctx.stroke();
      }
      // Crow's feet and nasolabial lines.
      for (const side of ['L', 'R'] as const) {
        const [eu, ev] = lm(`eye${side}`, [side === 'L' ? 0.442 : 0.558, 0.455]);
        const dir = side === 'L' ? -1 : 1;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(U(eu + dir * 0.05), V(ev + 0.004 - i * 0.008));
          ctx.lineTo(U(eu + dir * (0.07 + rngA.next() * 0.01)), V(ev + 0.012 - i * 0.014));
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(U(eu + dir * 0.008), V(0.3));
        ctx.quadraticCurveTo(U(eu + dir * 0.03), V(0.24), U(eu + dir * 0.026), V(0.16));
        ctx.stroke();
      }
      ctx.restore();
    }

    const map = toTexture(c, { srgb: true });
    map.wrapS = map.wrapT = THREE.RepeatWrapping;

    /* ---- matching roughness: glossy lips, oily T-zone, matte cheeks ---- */
    const roughCanvas = makeCanvas(size >> 1, size >> 1);
    {
      const rs = size >> 1;
      const rimg = roughCanvas.ctx.createImageData(rs, rs);
      const rd = rimg.data;
      const [mu, mv] = lm('mouth', [0.5, 0.19]);
      for (let y = 0; y < rs; y++) {
        for (let x = 0; x < rs; x++) {
          const u = x / rs, v = 1 - y / rs;
          const tzone = gauss(u - 0.5, 0.035) * smoothstep(0.28, 0.66, v) + gauss(v - 0.6, 0.06) * gauss(u - 0.5, 0.09);
          const lips = gauss(u - mu, 0.035) * gauss(v - mv, 0.02);
          const noise = fbm2(u * 60 * aspect, v * 60, 3) * 0.5 + 0.5;
          let r = 0.62 - tzone * 0.16 - lips * 0.34 + (noise - 0.5) * 0.08;
          rd[(y * rs + x) * 4] = rd[(y * rs + x) * 4 + 1] = rd[(y * rs + x) * 4 + 2] = clamp(r) * 255;
          rd[(y * rs + x) * 4 + 3] = 255;
        }
      }
      roughCanvas.ctx.putImageData(rimg, 0, 0);
    }
    const roughnessMap = toTexture(roughCanvas.c);

    /* ---- pore / detail normals ---- */
    const nSize = size >> 1;
    const h = heightField(nSize, (u, v) => {
      const pores = 1 - worley2(u * 210 * aspect, v * 210, 210);
      const fine = fbm2(u * 340 * aspect, v * 340, 3) * 0.5 + 0.5;
      const lipRidge = gauss(u - 0.5, 0.05) * gauss(v - (uvl.mouth?.[1] ?? 0.19), 0.02);
      return clamp(0.62 - pores * 0.3 + fine * 0.16 + lipRidge * 0.1);
    });
    const normalMap = normalFromHeight(h, nSize, 0.5);

    return { map, normalMap, roughnessMap };
  });
}

/** Anisotropic-ish hair card texture with alpha strands. */
export function hairStrands(size = 256): THREE.Texture {
  return memo(`hair${size}`, () => {
    const { c, ctx } = makeCanvas(size, size);
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        const strand = Math.sin(u * 190 + fbm2(u * 6, v * 2, 3) * 6) * 0.5 + 0.5;
        const density = smoothstep(0.1, 0.55, strand);
        const tipFade = smoothstep(1, 0.55, v);
        const a = clamp(density * tipFade + fbm2(u * 40, v * 8, 3) * 0.12);
        const shade = 0.45 + strand * 0.55;
        const i = (y * size + x) * 4;
        d[i] = 255 * 0.14 * shade;
        d[i + 1] = 255 * 0.1 * shade;
        d[i + 2] = 255 * 0.085 * shade;
        d[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c, { srgb: true });
  });
}

/** Radial falloff used for rain splashes, dust motes, light blooms. */
export function radialSprite(size = 128, hardness = 2.2, ring = 0): THREE.Texture {
  return memo(`radial${size}_${hardness}_${ring}`, () =>
    field(
      size,
      (u, v) => {
        const d = Math.hypot(u - 0.5, v - 0.5) * 2;
        let a = Math.pow(clamp(1 - d), hardness);
        if (ring > 0) a = Math.max(a * 0.25, Math.pow(clamp(1 - Math.abs(d - ring) * 6), 3));
        return [1, 1, 1, a];
      },
      true,
    ),
  );
}

/** Rain ripple normal map — concentric rings animated by UV scroll. */
export function rippleNormal(size = 256): THREE.Texture {
  return memo(`ripple${size}`, () => {
    const rng = new Rng(4242);
    const centers: [number, number, number][] = [];
    for (let i = 0; i < 22; i++) centers.push([rng.next(), rng.next(), rng.range(0.05, 0.2)]);
    const h = heightField(size, (u, v) => {
      let s = 0.5;
      for (const [cx, cy, r] of centers) {
        let dx = u - cx, dy = v - cy;
        if (dx > 0.5) dx -= 1; if (dx < -0.5) dx += 1;
        if (dy > 0.5) dy -= 1; if (dy < -0.5) dy += 1;
        const d = Math.hypot(dx, dy);
        if (d < r) {
          const t = d / r;
          s += Math.sin(t * Math.PI * 5) * (1 - t) * 0.32;
        }
      }
      return clamp(s);
    });
    return normalFromHeight(h, size, 1.6);
  });
}

/** Blue-noise-ish mask for dithering and film grain. */
export function grainTexture(size = 256): THREE.Texture {
  return memo(`grain${size}`, () => {
    const rng = new Rng(777);
    return field(size, () => {
      const g = rng.next();
      return [g, rng.next(), rng.next(), 1];
    }, false);
  });
}

/* --------------------------------------------------------------- signage */

export type SignOpts = {
  text: string;
  sub?: string;
  color?: string;
  bg?: string;
  w?: number;
  h?: number;
  font?: string;
  size?: number;
  vertical?: boolean;
  border?: boolean;
  glowBlur?: number;
};

/** Neon / LED sign panels. Used as emissive maps on storefronts and billboards. */
export function signTexture(o: SignOpts): THREE.Texture {
  const key = `sign_${JSON.stringify(o)}`;
  return memo(key, () => {
    const w = o.w ?? 512, h = o.h ?? 256;
    const { c, ctx } = makeCanvas(w, h);
    ctx.fillStyle = o.bg ?? '#000000';
    ctx.fillRect(0, 0, w, h);
    const col = o.color ?? '#7fe6ff';
    ctx.save();
    if (o.vertical) {
      ctx.translate(w / 2, h / 2);
      ctx.rotate(Math.PI / 2);
      ctx.translate(-h / 2, -w / 2);
    }
    const cw = o.vertical ? h : w;
    const ch = o.vertical ? w : h;
    const size = o.size ?? Math.floor(ch * 0.42);
    ctx.font = `${o.font ?? '700'} ${size}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = col;
    ctx.shadowBlur = o.glowBlur ?? 26;
    ctx.fillStyle = col;
    const yMain = o.sub ? ch * 0.4 : ch * 0.5;
    // Draw twice for a hotter core.
    ctx.fillText(o.text, cw / 2, yMain);
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(o.text, cw / 2, yMain);
    if (o.sub) {
      ctx.shadowBlur = 14;
      ctx.fillStyle = col;
      ctx.font = `500 ${Math.floor(size * 0.34)}px Inter, sans-serif`;
      ctx.letterSpacing = '6px';
      ctx.fillText(o.sub, cw / 2, ch * 0.72);
    }
    if (o.border) {
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(2, ch * 0.02);
      ctx.shadowBlur = 20;
      ctx.strokeRect(ch * 0.06, ch * 0.06, cw - ch * 0.12, ch - ch * 0.12);
    }
    ctx.restore();
    const t = toTexture(c, { srgb: true });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Window light grid for distant buildings (emissive). */
export function windowGrid(size = 512, cols = 14, rows = 26, lit = 0.42, seed = 5): THREE.Texture {
  return memo(`wingrid${size}_${cols}_${rows}_${lit}_${seed}`, () => {
    const rng = new Rng(seed);
    const on: number[] = [];
    const warm: number[] = [];
    for (let i = 0; i < cols * rows; i++) {
      on.push(rng.chance(lit) ? rng.range(0.35, 1) : 0);
      warm.push(rng.next());
    }
    return field(
      size,
      (u, v) => {
        const cx = Math.floor(u * cols), cy = Math.floor(v * rows);
        const fx = u * cols - cx, fy = v * rows - cy;
        const inside = fx > 0.16 && fx < 0.84 && fy > 0.22 && fy < 0.78 ? 1 : 0;
        const i = cy * cols + cx;
        const a = on[i] * inside;
        if (a <= 0) return [0, 0, 0, 1];
        const w = warm[i];
        // Mix of cold office fluorescents and warm apartments.
        const r = lerp(0.55, 1, w), g = lerp(0.75, 0.86, w), b = lerp(1, 0.62, w);
        const flick = 1;
        return [r * a * flick, g * a * flick, b * a * flick, 1];
      },
      true,
    );
  });
}

/** Wet-road caustic streak mask for headlight reflections. */
export function streakMask(size = 256): THREE.Texture {
  return memo(`streak${size}`, () =>
    field(
      size,
      (u, v) => {
        const s = Math.pow(clamp(1 - Math.abs(u - 0.5) * 2), 3) * Math.pow(clamp(1 - Math.abs(v - 0.5) * 2), 0.6);
        const broken = 0.6 + fbm2(u * 4, v * 30, 3) * 0.8;
        return [1, 1, 1, clamp(s * broken)];
      },
      true,
    ),
  );
}

/** Layered dirt/streak decal for glass. */
export function glassGrime(size = 256): THREE.Texture {
  return memo(`grime${size}`, () =>
    field(
      size,
      (u, v) => {
        const streak = smoothstep(0.55, 1, fbm2(u * 30, v * 2.2, 4) * 0.5 + 0.5);
        const blob = smoothstep(0.6, 1, fbm2(u * 6, v * 6, 3) * 0.5 + 0.5);
        const a = clamp(streak * 0.5 + blob * 0.35) * 0.5;
        return [0.6, 0.62, 0.66, a];
      },
      true,
    ),
  );
}
