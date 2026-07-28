import * as THREE from 'three';

/**
 * Procedural sprite atlas for the particle system.
 *
 * Every particle in the game samples one 256x256 RGBA texture baked here at
 * boot. Doing the density field as a texture rather than as per-fragment fBm
 * is not only ten times cheaper — a smoke plume is thousands of overlapping
 * screen-sized quads and the noise cost is paid per overdrawn fragment — it
 * also allows a *better* field, because a CPU bake can afford erosion and a
 * proper thickness channel that a fragment shader on a fill-bound quad cannot.
 *
 * The atlas holds four decorrelated puffs in a 2x2 grid. One shape mirrored
 * and rotated still reads as one shape when forty of them overlap: the eye
 * finds the repeat in the lobe pattern immediately. Four shapes, each also
 * mirrored and scaled per particle, is enough that a plume stops tiling.
 *
 *   R  density      billowy cloud with a ragged, non-circular silhouette
 *   G  thickness    optical depth through the puff, for shading and self-shadow
 *   B  erosion A    detail used to eat away the silhouette per particle
 *   A  erosion B    a second, decorrelated detail so no two puffs erode alike
 *
 * Every tile falls to zero density well inside its border, so the mip chain
 * blending neighbouring tiles together costs nothing.
 */

export const ATLAS_TILES = 2;

function hash2(x: number, y: number): number {
  let h = Math.imul(x | 0, 1597334673) ^ Math.imul(y | 0, 3812015801);
  h = Math.imul(h ^ (h >>> 15), 1597334673);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

/**
 * Billow fBm — the absolute value of signed noise. The cusps it leaves where
 * the signal crosses zero are what make a cloud look like it is made of
 * cauliflower lobes instead of hills, and that lobed structure is most of what
 * separates smoke from a blurred circle.
 */
function billow(x: number, y: number, octaves: number, seed: number): number {
  let v = 0;
  let a = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += a * Math.abs(valueNoise(x * f + seed * 13.7 + i * 31.1, y * f + seed * 7.3 - i * 17.9) * 2 - 1);
    norm += a;
    a *= 0.52;
    f *= 2.07;
  }
  return v / norm;
}

function ridged(x: number, y: number, octaves: number, seed: number): number {
  let v = 0;
  let a = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += a * valueNoise(x * f + seed * 5.1, y * f - seed * 9.4);
    norm += a;
    a *= 0.5;
    f *= 2.03;
  }
  return v / norm;
}

let cached: THREE.DataTexture | null = null;

export function puffTexture(): THREE.DataTexture {
  if (cached) return cached;

  const TILE = 128;
  const N = TILE * ATLAS_TILES;
  const data = new Uint8Array(N * N * 4);

  // Per-tile character. Lobe count and erosion depth vary so one plume mixes
  // tight cauliflower heads with torn, wispy remnants.
  const variants = [
    { seed: 1.7, lobes: 3.1, warp: 0.62, fray: 0.24, inner: 0.38 },
    { seed: 5.3, lobes: 2.3, warp: 0.74, fray: 0.16, inner: 0.30 },
    { seed: 9.1, lobes: 4.4, warp: 0.52, fray: 0.34, inner: 0.46 },
    { seed: 13.9, lobes: 1.7, warp: 0.86, fray: 0.20, inner: 0.34 },
  ];

  for (let tile = 0; tile < 4; tile++) {
    const cfg = variants[tile];
    const ox = (tile % ATLAS_TILES) * TILE;
    const oy = Math.floor(tile / ATLAS_TILES) * TILE;

    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const u = (x + 0.5) / TILE;
        const v = (y + 0.5) / TILE;
        const dx = (u - 0.5) * 2;
        const dy = (v - 0.5) * 2;
        const r = Math.sqrt(dx * dx + dy * dy);

        // Warp the radius by billow noise before the falloff, so the silhouette
        // is lobed rather than round. Two scales: the coarse one moves whole
        // lobes, the fine one frays their edges.
        const coarse = billow(u * cfg.lobes, v * cfg.lobes, 3, cfg.seed);
        const fine = billow(u * (cfg.lobes * 3), v * (cfg.lobes * 3), 3, cfg.seed + 2.6);
        const warped = r + (coarse - 0.5) * cfg.warp + (fine - 0.5) * cfg.fray;

        let density = 1 - smoothstep(0.14, 0.90, warped);
        // Internal structure: the puff is not uniformly dense inside either.
        density *= 1 - cfg.inner + cfg.inner * billow(u * 6.0, v * 6.0, 3, cfg.seed + 6.4);
        density = Math.min(1, density * 1.2);
        // Hard-clear the border so mip blending between tiles cannot bleed a
        // neighbouring puff into this one's silhouette.
        density *= 1 - smoothstep(0.84, 0.99, Math.max(Math.abs(dx), Math.abs(dy)));

        // Optical depth through a lobe. Peaks where the density is high and
        // falls to zero at the silhouette, which is what gives the shading a
        // bright thin rim without an explicit rim term.
        const thickness = Math.sqrt(Math.max(0, 1 - Math.min(1, warped) ** 2)) * density;

        const eroA = billow(u * 5.3 + 11.0, v * 5.3 - 3.0, 4, cfg.seed + 21.7);
        const eroB = ridged(u * 7.7 - 5.0, v * 7.7 + 9.0, 4, cfg.seed + 33.1);

        const i = ((oy + y) * N + ox + x) * 4;
        data[i] = Math.round(THREE.MathUtils.clamp(density, 0, 1) * 255);
        data[i + 1] = Math.round(THREE.MathUtils.clamp(thickness, 0, 1) * 255);
        data[i + 2] = Math.round(THREE.MathUtils.clamp(eroA, 0, 1) * 255);
        data[i + 3] = Math.round(THREE.MathUtils.clamp(eroB, 0, 1) * 255);
      }
    }
  }

  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
