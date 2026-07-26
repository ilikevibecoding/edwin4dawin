import { PALETTE } from '../palette.js';
import {
  cached,
  clamp,
  fbm,
  heightField,
  hexToRgb,
  lerp,
  mixRgb,
  mulberry32,
  normalFromHeight,
  pixelTexture,
  ridged,
  roughnessTexture,
  smoothstep,
  worley,
} from './core.js';

// ---------------------------------------------------------------------------
// Terrain surfaces: packed dirt track, loose gravel verge, forest litter.
// All three tile and are blended per-vertex by the terrain shader.
// ---------------------------------------------------------------------------

const N = 512;

function dirtHeight(seed) {
  return heightField(N, N, (x, y) => {
    const u = x / N;
    const v = y / N;
    const stones = worley(u * 30, v * 30, 30, seed);
    const bigStones = worley(u * 11, v * 11, 11, seed + 5);
    const clods = fbm(u * 16, v * 16, { octaves: 5, period: 16, seed: seed + 2 });
    const drag = fbm(u * 3, v * 60, { octaves: 3, period: 3, seed: seed + 9 }); // wheel drag streaks
    let h = clods * 0.45 + drag * 0.16;
    h += (1 - smoothstep(0.0, 0.14, stones.f1)) * 0.22;
    h += (1 - smoothstep(0.0, 0.09, bigStones.f1)) * 0.3;
    return clamp(h);
  });
}

/** Compacted dirt/clay of the driving lane. */
export function dirtRoadMaps(seed = 17) {
  return cached('gnd.dirt.' + seed, () => {
    const hf = dirtHeight(seed);
    const normal = normalFromHeight(hf, N, N, 2.9, { repeat: 1 });
    const light = hexToRgb(PALETTE.dirtLight);
    const mid = hexToRgb(PALETTE.dirt);
    const dark = hexToRgb(PALETTE.dirtDark);
    const clay = hexToRgb(PALETTE.clay);
    const gravel = hexToRgb(PALETTE.gravel);
    const map = pixelTexture(
      N,
      N,
      (x, y, out) => {
        const u = x / N;
        const v = y / N;
        const h = hf[y * N + x];
        const patch = fbm(u * 4, v * 4, { octaves: 5, period: 4, seed: seed + 30 });
        const damp = smoothstep(0.62, 0.95, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: seed + 12 }));
        let c = mixRgb(dark, mid, smoothstep(0.1, 0.55, h));
        c = mixRgb(c, light, smoothstep(0.5, 0.9, h) * 0.8);
        c = mixRgb(c, clay, smoothstep(0.45, 0.85, patch) * 0.35);
        // exposed aggregate on the high points
        const stones = worley(u * 30, v * 30, 30, seed);
        c = mixRgb(c, gravel, (1 - smoothstep(0.0, 0.1, stones.f1)) * 0.55);
        const bigStones = worley(u * 11, v * 11, 11, seed + 5);
        c = mixRgb(c, mixRgb(gravel, [150, 146, 140], bigStones.id), (1 - smoothstep(0.0, 0.07, bigStones.f1)) * 0.7);
        c = mixRgb(c, hexToRgb(PALETTE.dirtWet), damp * 0.5);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(
      N,
      N,
      (x, y) => {
        const u = x / N;
        const v = y / N;
        const damp = smoothstep(0.6, 0.95, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: seed + 12 }));
        const stones = worley(u * 30, v * 30, 30, seed);
        const polish = (1 - smoothstep(0.0, 0.1, stones.f1)) * 0.18;
        return clamp(0.96 - damp * 0.42 - polish);
      },
      { repeat: 1 },
    );
    const ao = roughnessTexture(N, N, (x, y) => clamp(0.4 + hf[y * N + x] * 0.8), { repeat: 1 });
    return { map, normal, rough, ao, height: hf };
  });
}

/** Loose gravel + dry grass on the verge either side of the ruts. */
export function vergeMaps(seed = 23) {
  return cached('gnd.verge.' + seed, () => {
    const hf = heightField(N, N, (x, y) => {
      const u = x / N;
      const v = y / N;
      const pebbles = worley(u * 24, v * 24, 24, seed);
      const clump = fbm(u * 9, v * 9, { octaves: 5, period: 9, seed: seed + 4 });
      return clamp((1 - smoothstep(0, 0.13, pebbles.f1)) * 0.55 + clump * 0.45);
    });
    const normal = normalFromHeight(hf, N, N, 2.6, { repeat: 1 });
    const gravel = hexToRgb(PALETTE.gravel);
    const dirt = hexToRgb(PALETTE.dirt);
    const grass = hexToRgb(PALETTE.grass);
    const dry = hexToRgb(PALETTE.grassDry);
    const map = pixelTexture(
      N,
      N,
      (x, y, out) => {
        const u = x / N;
        const v = y / N;
        const h = hf[y * N + x];
        const pebbles = worley(u * 24, v * 24, 24, seed);
        const veg = smoothstep(0.5, 0.85, fbm(u * 6, v * 6, { octaves: 5, period: 6, seed: seed + 22 }));
        let c = mixRgb(dirt, gravel, (1 - smoothstep(0.0, 0.1, pebbles.f1)) * (0.5 + pebbles.id * 0.5));
        c = mixRgb(c, mixRgb(grass, dry, pebbles.id), veg * 0.62);
        c = mixRgb(c, [c[0] * 0.7, c[1] * 0.72, c[2] * 0.7], (1 - h) * 0.35);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(N, N, (x, y) => clamp(0.86 + (1 - hf[y * N + x]) * 0.12), { repeat: 1 });
    const ao = roughnessTexture(N, N, (x, y) => clamp(0.45 + hf[y * N + x] * 0.7), { repeat: 1 });
    return { map, normal, rough, ao };
  });
}

/** Needle and leaf litter of the forest floor. */
export function litterMaps(seed = 41) {
  return cached('gnd.litter.' + seed, () => {
    const hf = heightField(N, N, (x, y) => {
      const u = x / N;
      const v = y / N;
      let h = fbm(u * 14, v * 14, { octaves: 5, period: 14, seed });
      // scattered needles read as fine directional streaks
      const n1 = ridged(u * 70 + v * 20, v * 30, { octaves: 2, period: 70, seed: seed + 1 });
      const n2 = ridged(v * 70 - u * 18, u * 30, { octaves: 2, period: 70, seed: seed + 2 });
      h = h * 0.6 + Math.max(n1, n2) * 0.4;
      return clamp(h);
    });
    const normal = normalFromHeight(hf, N, N, 2.2, { repeat: 1 });
    const litterA = hexToRgb(0x6b4f33);
    const litterB = hexToRgb(0x3d2f22);
    const moss = hexToRgb(PALETTE.moss);
    const leafDry = hexToRgb(0x9c6f3c);
    const map = pixelTexture(
      N,
      N,
      (x, y, out) => {
        const u = x / N;
        const v = y / N;
        const h = hf[y * N + x];
        const mossMask = smoothstep(0.55, 0.9, fbm(u * 5, v * 5, { octaves: 5, period: 5, seed: seed + 15 }));
        const leaves = worley(u * 18, v * 18, 18, seed + 31);
        let c = mixRgb(litterB, litterA, smoothstep(0.2, 0.8, h));
        c = mixRgb(c, leafDry, (1 - smoothstep(0.02, 0.12, leaves.f1)) * 0.55 * leaves.id);
        c = mixRgb(c, moss, mossMask * 0.55);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(
      N,
      N,
      (x, y) => {
        const u = x / N;
        const v = y / N;
        const mossMask = smoothstep(0.55, 0.9, fbm(u * 5, v * 5, { octaves: 5, period: 5, seed: seed + 15 }));
        return clamp(0.9 - mossMask * 0.18);
      },
      { repeat: 1 },
    );
    const ao = roughnessTexture(N, N, (x, y) => clamp(0.35 + hf[y * N + x] * 0.85), { repeat: 1 });
    return { map, normal, rough, ao };
  });
}

/** High-frequency detail normal tiled on top of everything up close. */
export function detailNormal() {
  return cached('gnd.detail', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const grit = worley(u * 40, v * 40, 40, 71).f1;
      return clamp(fbm(u * 34, v * 34, { octaves: 4, period: 34, seed: 6 }) * 0.6 + (1 - smoothstep(0, 0.12, grit)) * 0.4);
    });
    return normalFromHeight(hf, n, n, 1.8, { repeat: 1 });
  });
}

/** Soft dust puff sprite for the wheels. */
export function dustPuff() {
  return cached('gnd.dust', () => {
    const n = 128;
    return pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n - 0.5;
        const v = y / n - 0.5;
        const r = Math.hypot(u, v) * 2;
        const puff = fbm(x / n * 6, y / n * 6, { octaves: 5, period: 6, seed: 3 });
        const a = clamp((1 - smoothstep(0.15, 1.0, r)) * (0.35 + puff * 0.95));
        const c = mixRgb(hexToRgb(PALETTE.dirtLight), [235, 226, 210], puff * 0.6);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        out[3] = a * 255;
      },
      { srgb: true },
    );
  });
}
