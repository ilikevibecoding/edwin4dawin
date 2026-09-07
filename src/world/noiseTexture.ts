import * as THREE from 'three';

/** Tileable 3D noise texture used to shape the volumetric clouds.
 *  R: perlin-worley base shape (lattice periods 4/8/16 cells),
 *  G: worley fbm (periods 4/8/16) used as the edge-erosion detail,
 *  B: mid-frequency perlin fbm (periods 8/16) for wispy tops,
 *  A: perlin fbm (periods 4/8/16).
 *  Every channel is normalised to mean 0.5 and a fixed standard deviation (R/G/A 0.16, B 0.10) before the 8-bit
 *  quantisation: the raw fbm values used a fifth of the range (perlin std 0.063, perlin-worley 0.068), which both
 *  terraced the density into ~50 levels and left the shape term too weak to rag the cloud bases.
 *  No mip chain: the raymarch fades each channel toward its mean as its step grows past the periods it can
 *  resolve (sky.ts stepFade). A mipmapped textureLod fetch did the same thing exactly, but a trilinear mip fetch
 *  costs twice a plain one on a software rasteriser and the bench runs on one. */
const CHANNEL_STD = [0.16, 0.16, 0.10, 0.16];

export function createCloudNoiseTexture(size = 64): THREE.Data3DTexture {
  const N = size;
  const raw = new Float32Array(N * N * N * 4);

  const hash = (x: number, y: number, z: number, s: number): number => {
    let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1013904223) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const mod = (a: number, n: number) => ((a % n) + n) % n;

  // tileable gradient noise, period P (lattice cells over the texture)
  const perlin = (x: number, y: number, z: number, P: number, seed: number): number => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const f = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const u = f(xf), v = f(yf), w = f(zf);
    const g = (ix: number, iy: number, iz: number, dx: number, dy: number, dz: number) => {
      const h = hash(mod(ix, P), mod(iy, P), mod(iz, P), seed);
      const a = h * 6.2831853, b = hash(mod(ix, P), mod(iy, P), mod(iz, P), seed + 7) * 3.1415926;
      const gx = Math.cos(a) * Math.sin(b), gy = Math.sin(a) * Math.sin(b), gz = Math.cos(b);
      return gx * dx + gy * dy + gz * dz;
    };
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    const x00 = l(g(xi, yi, zi, xf, yf, zf), g(xi + 1, yi, zi, xf - 1, yf, zf), u);
    const x10 = l(g(xi, yi + 1, zi, xf, yf - 1, zf), g(xi + 1, yi + 1, zi, xf - 1, yf - 1, zf), u);
    const x01 = l(g(xi, yi, zi + 1, xf, yf, zf - 1), g(xi + 1, yi, zi + 1, xf - 1, yf, zf - 1), u);
    const x11 = l(g(xi, yi + 1, zi + 1, xf, yf - 1, zf - 1), g(xi + 1, yi + 1, zi + 1, xf - 1, yf - 1, zf - 1), u);
    return l(l(x00, x10, v), l(x01, x11, v), w);
  };

  // tileable worley: returns 1 - normalised distance to nearest feature point
  const worley = (x: number, y: number, z: number, P: number, seed: number): number => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let best = 1e9;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx, cy = yi + dy, cz = zi + dz;
      const px = cx + hash(mod(cx, P), mod(cy, P), mod(cz, P), seed);
      const py = cy + hash(mod(cx, P), mod(cy, P), mod(cz, P), seed + 3);
      const pz = cz + hash(mod(cx, P), mod(cy, P), mod(cz, P), seed + 5);
      const d = (px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2;
      if (d < best) best = d;
    }
    return 1 - Math.min(1, Math.sqrt(best));
  };

  const remap = (v: number, a: number, b: number, c: number, d: number) => c + ((v - a) / (b - a)) * (d - c);
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

  let i = 0;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, w = z / N;
    // perlin fbm with periods 4,8,16 cells
    let p = 0, amp = 0.5, norm = 0;
    for (let o = 0; o < 3; o++) {
      const P = 4 << o;
      p += amp * perlin(u * P, v * P, w * P, P, 11 + o);
      norm += amp; amp *= 0.5;
    }
    p = p / norm * 0.5 + 0.5;
    const w1 = worley(u * 4, v * 4, w * 4, 4, 31);
    const w2 = worley(u * 8, v * 8, w * 8, 8, 41);
    const w3 = worley(u * 16, v * 16, w * 16, 16, 51);
    const wf = w1 * 0.625 + w2 * 0.25 + w3 * 0.125;
    const pw = remap(p, 0, 1, wf, 1); // perlin-worley
    // erosion detail: three worley octaves (different seeds so it does not track the shape); the finest one is
    // 4 texels per cell and only the short surface steps near the camera resolve it (the march fades it out
    // where they do not)
    const e1 = worley(u * 4, v * 4, w * 4, 4, 61);
    const e2 = worley(u * 8, v * 8, w * 8, 8, 71);
    const e3 = worley(u * 16, v * 16, w * 16, 16, 101);
    const detail = e1 * 0.55 + e2 * 0.3 + e3 * 0.15;
    // mid-frequency perlin (periods 8/16) for wispy tops
    const pm = (perlin(u * 8, v * 8, w * 8, 8, 81) * 0.65 + perlin(u * 16, v * 16, w * 16, 16, 91) * 0.35) * 0.5 + 0.5;
    raw[i++] = pw;
    raw[i++] = detail;
    raw[i++] = pm;
    raw[i++] = p;
  }

  // normalise each channel (mean 0.5, fixed std) so the 8-bit range is used and the shader's erosion terms see a
  // known contrast whatever the fbm's raw amplitude
  const data = new Uint8Array(N * N * N * 4);
  const count = N * N * N;
  for (let c = 0; c < 4; c++) {
    let sum = 0, sq = 0;
    for (let k = c; k < raw.length; k += 4) { sum += raw[k]; sq += raw[k] * raw[k]; }
    const mean = sum / count;
    const std = Math.sqrt(Math.max(sq / count - mean * mean, 1e-8));
    const gain = CHANNEL_STD[c] / std;
    for (let k = c; k < raw.length; k += 4) data[k] = Math.round(clamp01(0.5 + (raw[k] - mean) * gain) * 255);
  }

  const tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}
