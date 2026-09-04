/** CPU-side coherent noise used to author the world. GLSL equivalents live in render/shaders. */

const PERM = new Uint8Array(512);
{
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // fixed shuffle (xorshift) so the world is identical on every machine
  let s = 0x2545f491;
  for (let i = 255; i > 0; i--) {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    const j = s % (i + 1);
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

const GRAD2 = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 0, 1, 0, -1];

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** 2D Perlin gradient noise in [-1,1]. */
export function perlin2(x: number, y: number): number {
  const X = Math.floor(x), Y = Math.floor(y);
  const xf = x - X, yf = y - Y;
  const xi = X & 255, yi = Y & 255;
  const u = fade(xf), v = fade(yf);
  const g = (h: number, dx: number, dy: number) => {
    const i = (h & 7) * 2;
    return GRAD2[i] * dx + GRAD2[i + 1] * dy;
  };
  const aa = PERM[PERM[xi] + yi], ab = PERM[PERM[xi] + yi + 1];
  const ba = PERM[PERM[xi + 1] + yi], bb = PERM[PERM[xi + 1] + yi + 1];
  const x1 = g(aa, xf, yf) + u * (g(ba, xf - 1, yf) - g(aa, xf, yf));
  const x2 = g(ab, xf, yf - 1) + u * (g(bb, xf - 1, yf - 1) - g(ab, xf, yf - 1));
  return (x1 + v * (x2 - x1)) * 1.41;
}

export function fbm2(x: number, y: number, octaves = 5, lacunarity = 2.0, gain = 0.5): number {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * perlin2(x * freq + i * 17.13, y * freq - i * 9.71);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Ridged multifractal, in [0,1]. Good for dunes / rocky outcrops. */
export function ridged2(x: number, y: number, octaves = 4): number {
  let amp = 0.5, freq = 1, sum = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(perlin2(x * freq + i * 3.3, y * freq + i * 7.7));
    sum += n * n * amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum;
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function clamp(x: number, a: number, b: number): number {
  return x < a ? a : x > b ? b : x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smooth minimum used to blend SDF landmasses into organic coastlines. */
export function smin(a: number, b: number, k: number): number {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return lerp(b, a, h) - k * h * (1 - h);
}

export function smax(a: number, b: number, k: number): number {
  return -smin(-a, -b, k);
}
