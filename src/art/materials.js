import * as THREE from 'three';
import { PALETTE, css, mix, shade } from './palette.js';
import { generateTextureSet } from './texgen.js';
import { makeFbm, makeWorley, makeNoise2D, makeStreak } from './noise.js';
import { mulberry32, hashString } from '../core/rng.js';
import { assets } from '../core/assets.js';

// ---------------------------------------------------------------------------
// Material families.  (owner: fable3)
//
// Each family returns a cached THREE.MeshStandardMaterial (or Physical where
// clearcoat / transmission matters) with a full procedural PBR set. Tiling is
// expressed in metres so a wall and a floor sharing a texture look consistent.
// ---------------------------------------------------------------------------

const matCache = new Map();

export function clearMaterialCache() {
  for (const m of matCache.values()) m.dispose?.();
  matCache.clear();
}

function cached(key, factory) {
  if (matCache.has(key)) return matCache.get(key);
  const m = factory();
  m.userData.materialKey = key;
  matCache.set(key, m);
  return m;
}

/** Set the world-space tiling of a material's maps (metres per texture tile). */
export function setTiling(material, tilesX, tilesY = tilesX) {
  for (const slot of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'emissiveMap', 'metalnessMap', 'alphaMap']) {
    const t = material[slot];
    if (t) {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(tilesX, tilesY);
      t.needsUpdate = true;
    }
  }
  return material;
}

/** Clone a material with independent texture repeat, for per-surface tiling. */
export function tiled(material, tilesX, tilesY = tilesX) {
  const key = `${material.userData.materialKey}#${tilesX}x${tilesY}`;
  return cached(key, () => {
    const m = material.clone();
    for (const slot of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'emissiveMap', 'metalnessMap', 'alphaMap']) {
      if (m[slot]) {
        m[slot] = m[slot].clone();
        m[slot].needsUpdate = true;
      }
    }
    setTiling(m, tilesX, tilesY);
    return m;
  });
}

function std(maps, params = {}) {
  // Only pass map slots that actually exist: handing three.js an explicit
  // `undefined` for a texture slot makes it warn on every material.
  const opts = { ...params };
  for (const slot of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'emissiveMap', 'alphaMap']) {
    if (maps[slot]) opts[slot] = maps[slot];
  }
  const m = new THREE.MeshStandardMaterial(opts);
  if (maps.normalMap) m.normalScale = new THREE.Vector2(maps.normalScale ?? 1, maps.normalScale ?? 1);
  m.aoMapIntensity = params.aoMapIntensity ?? 0.85;
  return m;
}

// =========================================================================
// ARCHITECTURAL SURFACES
// =========================================================================

/** Painted drywall — the dominant interior surface. */
export function drywall(tint = PALETTE.drywallWarm, wear = 0.35, key = 'warm') {
  return cached(`drywall:${key}:${tint}:${wear}`, () => {
    const maps = generateTextureSet(
      `drywall:${key}:${tint}:${wear}`,
      512,
      (a) => {
        const { ctx, size } = a;
        const rnd = mulberry32(hashString(`drywall${key}${tint}`));
        const fbm = makeFbm(hashString(`dw${key}`), { octaves: 5 });
        ctx.fillStyle = css(tint);
        ctx.fillRect(0, 0, size, size);
        // Roller stipple: subtle low-frequency value break-up.
        const img = ctx.getImageData(0, 0, size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            // Three scales: metre-scale patchiness (so a long wall is not one
            // flat tone), roller stipple, and fine tooth.
            const low = fbm(u * 2, v * 2, 2) * 0.5 + 0.5;
            const n = fbm(u * 24, v * 24, 24) * 0.5 + 0.5;
            const fine = fbm(u * 110, v * 110, 110) * 0.5 + 0.5;
            const shadeF = 0.94 + n * 0.08 + (fine - 0.5) * 0.05 + (low - 0.5) * 0.055;
            const i = (y * size + x) * 4;
            d[i] = Math.min(255, d[i] * shadeF);
            d[i + 1] = Math.min(255, d[i + 1] * shadeF);
            d[i + 2] = Math.min(255, d[i + 2] * shadeF);
            a.height[y * size + x] = 0.5 + (fine - 0.5) * 0.12 + (n - 0.5) * 0.05;
            // Sheen patches where the roller overlapped read under grazing light.
            a.rough[y * size + x] = 0.86 + (fine - 0.5) * 0.1 + (low - 0.5) * 0.12;
          }
        }
        ctx.putImageData(img, 0, 0);
        // Scuffs near floor level and random dings.
        ctx.save();
        for (let i = 0; i < 26 * wear; i++) {
          const x = rnd() * size;
          const y = size * (0.62 + rnd() * 0.38);
          ctx.globalAlpha = 0.05 + rnd() * 0.1;
          ctx.strokeStyle = css(shade(tint, 0.62));
          ctx.lineWidth = 1 + rnd() * 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 10);
          ctx.stroke();
        }
        // Nail-pop / patch marks
        for (let i = 0; i < 8 * wear; i++) {
          const x = rnd() * size, y = rnd() * size, r = 2 + rnd() * 5;
          ctx.globalAlpha = 0.12;
          ctx.fillStyle = css(shade(tint, 1.06));
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      },
      { baseRoughness: 0.88, normalStrength: 1.4, aoRadius: 2, aoStrength: 0.6 }
    );
    return std(maps, { roughness: 1, metalness: 0, color: 0xffffff });
  });
}

/**
 * Acoustic ceiling tile with fissured face. state: intact|stained|missing
 *
 * The texture is authored for the real 0.6 x 1.2 m tile: kit.js ceilingGrid
 * UVs the tile geometry at 0.62 m per repeat (applyBoxUV(tileGeo, 0.62)), so
 * at 512 px one texel is ~1.2 mm. Pin pits are 2-4 mm, fissures 1-2 mm wide
 * dashes — a fine mineral-fibre face, not soft blobs.
 */
export function ceilingTile(state = 'intact') {
  return cached(`ceil:${state}`, () => {
    const maps = generateTextureSet(
      `ceil:${state}`,
      512,
      (a) => {
        const { ctx, size } = a;
        const pitCells = 52;
        const fisCells = 24;
        const pitW = makeWorley(hashString(`ceilw${state}`), pitCells);
        const fisW = makeWorley(hashString(`ceilfw${state}`), fisCells);
        const fbm = makeFbm(hashString(`ceilf${state}`), { octaves: 4 });
        const warp = makeFbm(hashString(`ceilwp${state}`), { octaves: 3 });
        // A stained tile is only slightly aged overall; the tide-line below
        // carries the story. A saturated tan base read as camouflage.
        const base = state === 'stained'
          ? mix(PALETTE.ceilingTile, PALETTE.ceilingTileStained, 0.3)
          : PALETTE.ceilingTile;
        ctx.fillStyle = css(base);
        ctx.fillRect(0, 0, size, size);
        const img = ctx.getImageData(0, 0, size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            // Pin pits: tight cores of a dense worley field (~2-4 mm).
            const pitD = pitW(u, v).f1 * pitCells;
            const pits = pitD < 0.24 ? 1 - pitD / 0.24 : 0;
            // Fissures: thin cell borders, domain-warped and gated by noise so
            // the network breaks into short worm-like dashes.
            const wu = u + warp(u * 8, v * 8, 8) * 0.02;
            const wv = v + warp(v * 8 + 37, u * 8 + 37, 8) * 0.02;
            const fisEdge = fisW(((wu % 1) + 1) % 1, ((wv % 1) + 1) % 1).edge * fisCells;
            const gate = fbm(u * 26, v * 26, 26);
            const fissure = fisEdge < 0.055 && gate > -0.08
              ? Math.min(1, (0.055 - fisEdge) / 0.035) : 0;
            const grain = fbm(u * 150, v * 150, 150) * 0.5 + 0.5;
            const i = (y * size + x) * 4;
            const f = 1 - pits * 0.12 - fissure * 0.16 + (grain - 0.5) * 0.05;
            d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
            // Tide-line: a noise-warped blob with a faint dried rim. Drawn
            // per-pixel (not a canvas arc) so it never reads as a perfect
            // circle when the 0.62 m texture repeats twice on the tile.
            let stain = 0;
            if (state === 'stained') {
              const dx = u - 0.5, dy = v - 0.5;
              const dist = Math.hypot(dx, dy);
              const edge = 0.34 + warp(u * 3 + 91, v * 3 + 91, 3) * 0.09;
              const breakup = fbm(u * 7 + 53, v * 7 + 53, 7) * 0.5 + 0.5;
              if (dist < edge) {
                const tn = dist / edge;
                stain = 0.03 + tn * tn * 0.06;
                stain += Math.max(0, 1 - Math.abs(dist - edge) / 0.03)
                  * (0.03 + breakup * 0.08);
              }
              if (stain > 0) {
                d[i] += (150 - d[i]) * stain;
                d[i + 1] += (139 - d[i + 1]) * stain;
                d[i + 2] += (117 - d[i + 2]) * stain;
              }
            }
            a.height[y * size + x] = 0.62 - pits * 0.3 - fissure * 0.34 + (grain - 0.5) * 0.05;
            a.rough[y * size + x] = 0.94 + (grain - 0.5) * 0.04 - stain * 0.06;
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      { baseRoughness: 0.95, normalStrength: 1.1, aoRadius: 2, aoStrength: 0.45 }
    );
    return std(maps, { roughness: 1, metalness: 0 });
  });
}

/** Commercial loop-pile carpet. */
export function carpet(tint = PALETTE.carpetMain, key = 'main') {
  return cached(`carpet:${key}:${tint}`, () => {
    const maps = generateTextureSet(
      `carpet:${key}:${tint}`,
      512,
      (a) => {
        const { ctx, size } = a;
        const rnd = mulberry32(hashString(`carpet${key}`));
        const fbm = makeFbm(hashString(`carpetf${key}`), { octaves: 3 });
        ctx.fillStyle = css(tint);
        ctx.fillRect(0, 0, size, size);
        const img = ctx.getImageData(0, 0, size, size);
        const d = img.data;
        // Biased bright: under production lighting the palette tint is the
        // DARK end of the pile, or the whole floor collapses to black.
        const dark = shade(tint, 0.84);
        const light = shade(tint, 1.55);
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            // Loop pile: high-frequency dithered tufts on a coarse weave grid.
            const tuft = Math.sin(x * 2.7 + Math.sin(y * 1.9) * 2) * Math.sin(y * 2.9 + Math.cos(x * 2.1) * 2);
            const jitter = rnd() - 0.5;
            const coarse = fbm(u * 12, v * 12, 12) * 0.5 + 0.5;
            const t = 0.55 + tuft * 0.22 + jitter * 0.3 + (coarse - 0.5) * 0.35;
            const c = mix(dark, light, Math.max(0, Math.min(1, t)));
            const i = (y * size + x) * 4;
            d[i] = (c >> 16) & 255;
            d[i + 1] = (c >> 8) & 255;
            d[i + 2] = c & 255;
            a.height[y * size + x] = 0.5 + tuft * 0.22 + jitter * 0.2;
            // Loop crowns catch light; the gaps between loops stay matte.
            a.rough[y * size + x] = 0.86 + tuft * -0.09 + jitter * 0.08;
          }
        }
        ctx.putImageData(img, 0, 0);
        // Occasional darker traffic patch
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = css(shade(tint, 0.7));
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.ellipse(rnd() * size, rnd() * size, 30 + rnd() * 90, 20 + rnd() * 70, rnd() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
      { baseRoughness: 0.92, normalStrength: 2.0, aoRadius: 2, aoStrength: 0.5 }
    );
    return std(maps, { roughness: 1, metalness: 0 });
  });
}

/** Vinyl composition tile floor (break room, corridors). */
export function vinylFloor(tint = PALETTE.vinylFloor, key = 'vct') {
  return cached(`vinyl:${key}`, () => {
    const maps = generateTextureSet(
      `vinyl:${key}`,
      512,
      (a) => {
        const { ctx, size } = a;
        const fbm = makeFbm(hashString('vinyl'), { octaves: 4 });
        const rnd = mulberry32(hashString(`vinyl${key}`));
        const tiles = 4;
        const t = size / tiles;
        for (let ty = 0; ty < tiles; ty++) {
          for (let tx = 0; tx < tiles; tx++) {
            const v = 0.93 + rnd() * 0.14;
            ctx.fillStyle = css(shade(tint, v));
            ctx.fillRect(tx * t, ty * t, t, t);
          }
        }
        const img = ctx.getImageData(0, 0, size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = x / size, vv = y / size;
            // Chips of aggregate suspended in the vinyl.
            const speck = fbm(u * 160, vv * 160, 160);
            const swirl = fbm(u * 26, vv * 26, 26);
            const f = 1 + speck * 0.17 + swirl * 0.05;
            const i = (y * size + x) * 4;
            d[i] = Math.min(255, d[i] * f);
            d[i + 1] = Math.min(255, d[i + 1] * f);
            d[i + 2] = Math.min(255, d[i + 2] * f);
            const gx = x % t, gy = y % t;
            const grout = gx < 1.2 || gy < 1.2;
            a.height[y * size + x] = grout ? 0.28 : 0.72 + speck * 0.04;
            // Buffed vinyl is glossy, seams collect dirt and go rough.
            a.rough[y * size + x] = grout ? 0.8 : 0.28 + Math.abs(swirl) * 0.14;
          }
        }
        ctx.putImageData(img, 0, 0);
        // Seams
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= tiles; i++) {
          ctx.beginPath(); ctx.moveTo(i * t, 0); ctx.lineTo(i * t, size); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i * t); ctx.lineTo(size, i * t); ctx.stroke();
        }
      },
      { baseRoughness: 0.3, normalStrength: 1.2, aoRadius: 2, aoStrength: 0.5 }
    );
    return std(maps, { roughness: 1, metalness: 0 });
  });
}

/** Ceramic tile — restrooms, kitchen splashback. */
export function ceramicTile(tint = PALETTE.ceramicTile, tilesPerTexture = 6, key = 'wall') {
  return cached(`ceramic:${key}:${tilesPerTexture}`, () => {
    const maps = generateTextureSet(
      `ceramic:${key}:${tilesPerTexture}`,
      512,
      (a) => {
        const { ctx, size } = a;
        const rnd = mulberry32(hashString(`cer${key}`));
        const fbm = makeFbm(hashString(`cerf${key}`), { octaves: 3 });
        const t = size / tilesPerTexture;
        const groutW = Math.max(2, t * 0.055);
        ctx.fillStyle = css(0x8f8c85);
        ctx.fillRect(0, 0, size, size);
        for (let ty = 0; ty < tilesPerTexture; ty++) {
          for (let tx = 0; tx < tilesPerTexture; tx++) {
            const v = 0.965 + rnd() * 0.07;
            ctx.fillStyle = css(shade(tint, v));
            ctx.fillRect(tx * t + groutW / 2, ty * t + groutW / 2, t - groutW, t - groutW);
          }
        }
        const img = ctx.getImageData(0, 0, size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            const gx = x % t, gy = y % t;
            const inGrout = gx < groutW / 2 || gy < groutW / 2 || gx > t - groutW / 2 || gy > t - groutW / 2;
            const n = fbm(u * 80, v * 80, 80);
            const i = (y * size + x) * 4;
            if (inGrout) {
              const g = 0.9 + n * 0.2;
              d[i] *= g; d[i + 1] *= g; d[i + 2] *= g;
              a.height[y * size + x] = 0.3 + n * 0.05;
              a.rough[y * size + x] = 0.88;
            } else {
              const g = 1 + n * 0.02;
              d[i] = Math.min(255, d[i] * g);
              d[i + 1] = Math.min(255, d[i + 1] * g);
              d[i + 2] = Math.min(255, d[i + 2] * g);
              a.height[y * size + x] = 0.8;
              a.rough[y * size + x] = 0.1 + Math.abs(n) * 0.06;
            }
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      { baseRoughness: 0.2, normalStrength: 3.2, aoRadius: 3, aoStrength: 1.2 }
    );
    return std(maps, { roughness: 1, metalness: 0 });
  });
}

/** Poured / sealed concrete for service spaces and the loading bay. */
export function concrete(tint = PALETTE.concrete, wear = 0.5, key = 'raw') {
  return cached(`concrete:${key}:${wear}`, () => {
    const maps = generateTextureSet(
      `concrete:${key}:${wear}`,
      512,
      (a) => {
        const { ctx, size } = a;
        const rnd = mulberry32(hashString(`conc${key}`));
        const fbm = makeFbm(hashString(`concf${key}`), { octaves: 5 });
        const worley = makeWorley(hashString(`concw${key}`), 14);
        ctx.fillStyle = css(tint);
        ctx.fillRect(0, 0, size, size);
        const img = ctx.getImageData(0, 0, size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            const blotch = fbm(u * 8, v * 8, 8) * 0.5 + 0.5;
            const fine = fbm(u * 120, v * 120, 120) * 0.5 + 0.5;
            const w = worley(u, v);
            const pit = w.f1 < 0.006 ? 1 : 0;
            const f = 0.86 + blotch * 0.26 + (fine - 0.5) * 0.14 - pit * 0.3;
            const i = (y * size + x) * 4;
            d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
            a.height[y * size + x] = 0.6 + (fine - 0.5) * 0.16 - pit * 0.5 + (blotch - 0.5) * 0.05;
            a.rough[y * size + x] = (key === 'sealed' ? 0.42 : 0.82) + (fine - 0.5) * 0.16;
          }
        }
        ctx.putImageData(img, 0, 0);
        // Hairline cracks
        ctx.strokeStyle = 'rgba(20,20,22,0.35)';
        for (let c = 0; c < 5 * wear; c++) {
          let x = rnd() * size, y = rnd() * size;
          ctx.lineWidth = 0.6 + rnd();
          ctx.beginPath();
          ctx.moveTo(x, y);
          let ang = rnd() * Math.PI * 2;
          for (let s = 0; s < 22; s++) {
            ang += (rnd() - 0.5) * 0.9;
            x += Math.cos(ang) * 9;
            y += Math.sin(ang) * 9;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      },
      { baseRoughness: 0.8, normalStrength: 2.0, aoRadius: 3, aoStrength: 0.9 }
    );
    return std(maps, { roughness: 1, metalness: 0 });
  });
}

/**
 * Wood veneer for desks and executive furniture.
 *
 * Commercial flat-cut veneer, authored for ~1 m per repeat (the desks tile at
 * 0.6-1.4 repeats/m): a low-contrast run of fine, mostly-parallel latewood
 * lines (~18 mm pitch) with a slow cathedral drift, plus pore streaks and
 * tiny flecks along the grain, under a satin finish. Never bark stripes.
 */
export function woodVeneer(tint = PALETTE.woodVeneer, key = 'oak', gloss = 0.35) {
  return cached(`wood:${key}:${tint}:${gloss}`, () => {
    const maps = generateTextureSet(
      `wood:${key}:${tint}`,
      512,
      (a) => {
        const { ctx, size } = a;
        const fbm = makeFbm(hashString(`wood${key}`), { octaves: 4 });
        const light = shade(tint, 1.08);
        const dark = shade(tint, 0.9);
        const img = ctx.createImageData(size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            // Cathedral figure: a slow phase drift bends the bands into
            // occasional arches; a faster wobble keeps lines from ruling up.
            const arch = fbm(u * 2, v * 2, 2) * 2.4;
            const wob = fbm(u * 6, v * 6, 6) * 0.4;
            const n = v * 56 + arch + wob;
            const f = n - Math.floor(n);
            // Asymmetric ring profile: wide light earlywood, a soft narrow
            // latewood line. Squared so the line fades in gently.
            const late = Math.max(0, 1 - Math.abs(f - 0.72) / 0.22);
            const ring = late * late;
            // Pore streaks and flecks elongated along the grain (u axis).
            const pores = fbm(u * 24, v * 288, 24) * 0.5 + 0.5;
            const fleck = fbm(u * 96, v * 768, 96) * 0.5 + 0.5;
            const t = 0.62 - ring * 0.34
              + (pores - 0.5) * 0.34
              + (fleck - 0.5) * 0.14;
            const c = mix(dark, light, Math.max(0, Math.min(1, t)));
            const i = (y * size + x) * 4;
            d[i] = (c >> 16) & 255;
            d[i + 1] = (c >> 8) & 255;
            d[i + 2] = c & 255;
            d[i + 3] = 255;
            a.height[y * size + x] = 0.5 - ring * 0.06 + (pores - 0.5) * 0.05;
            a.rough[y * size + x] = gloss + ring * 0.07 + (pores - 0.5) * 0.06;
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      { baseRoughness: gloss, normalStrength: 0.5, aoRadius: 2, aoStrength: 0.25 }
    );
    return std(maps, { roughness: 1, metalness: 0 });
  });
}

/** Laminate — cheaper desks, cabinets, break room. */
export function laminate(tint = PALETTE.laminate, key = 'beech') {
  return cached(`laminate:${key}:${tint}`, () => {
    const maps = generateTextureSet(
      `laminate:${key}:${tint}`,
      256,
      (a) => {
        const { ctx, size } = a;
        const fbm = makeFbm(hashString(`lam${key}`), { octaves: 3 });
        ctx.fillStyle = css(tint);
        ctx.fillRect(0, 0, size, size);
        const img = ctx.getImageData(0, 0, size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            const streaks = fbm(u * 140, v * 20, 140) * 0.5 + 0.5;
            const f = 0.92 + streaks * 0.18;
            const i = (y * size + x) * 4;
            d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
            a.height[y * size + x] = 0.5 + (streaks - 0.5) * 0.05;
            a.rough[y * size + x] = 0.32 + streaks * 0.1;
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      { baseRoughness: 0.35, normalStrength: 0.5, ao: false }
    );
    return std(maps, { roughness: 1, metalness: 0 });
  });
}

/** Painted metal — lockers, door frames, electrical panels. */
export function paintedMetal(tint = PALETTE.paintedMetal, wear = 0.4, key = 'grey') {
  return cached(`pmetal:${key}:${tint}:${wear}`, () => {
    const maps = generateTextureSet(
      `pmetal:${key}:${tint}:${wear}`,
      256,
      (a) => {
        const { ctx, size } = a;
        const rnd = mulberry32(hashString(`pm${key}`));
        const fbm = makeFbm(hashString(`pmf${key}`), { octaves: 4 });
        ctx.fillStyle = css(tint);
        ctx.fillRect(0, 0, size, size);
        const img = ctx.getImageData(0, 0, size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            const orange = fbm(u * 90, v * 90, 90) * 0.5 + 0.5; // orange-peel paint
            const f = 0.96 + orange * 0.09;
            const i = (y * size + x) * 4;
            d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
            a.height[y * size + x] = 0.5 + (orange - 0.5) * 0.1;
            a.rough[y * size + x] = 0.42 + (orange - 0.5) * 0.1;
          }
        }
        ctx.putImageData(img, 0, 0);
        // Chipped paint exposing bare steel
        for (let i = 0; i < 22 * wear; i++) {
          const x = rnd() * size, y = rnd() * size, r = 1 + rnd() * 3.2;
          ctx.fillStyle = `rgba(150,148,145,${0.4 + rnd() * 0.4})`;
          ctx.beginPath();
          ctx.ellipse(x, y, r, r * (0.5 + rnd()), rnd() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      { baseRoughness: 0.45, normalStrength: 1.0, ao: false }
    );
    return std(maps, { roughness: 1, metalness: 0.55 });
  });
}

/** Brushed / stainless metal — appliances, handles, kick plates. */
export function brushedMetal(tint = PALETTE.stainless, key = 'steel', rough = 0.28) {
  return cached(`bmetal:${key}:${tint}:${rough}`, () => {
    const maps = generateTextureSet(
      `bmetal:${key}:${tint}`,
      256,
      (a) => {
        const { ctx, size } = a;
        const streak = makeStreak(hashString(`bm${key}`), 40);
        const img = ctx.createImageData(size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            const s = streak(u, v, 64) * 0.5 + 0.5;
            const c = shade(tint, 0.86 + s * 0.28);
            const i = (y * size + x) * 4;
            d[i] = (c >> 16) & 255;
            d[i + 1] = (c >> 8) & 255;
            d[i + 2] = c & 255;
            d[i + 3] = 255;
            a.height[y * size + x] = 0.5 + (s - 0.5) * 0.06;
            a.rough[y * size + x] = rough + (s - 0.5) * 0.16;
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      { baseRoughness: rough, normalStrength: 0.7, ao: false }
    );
    return std(maps, { roughness: 1, metalness: 0.92 });
  });
}

/**
 * Upholstery fabric — chairs, sofa, cubicle panels, clothing.
 *
 * Low-contrast by design: real panel fabric reads as a slightly fuzzy heather,
 * not a warp/weft checkerboard. The weave is kept at a 2-texel period (a few
 * millimetres at the tiling the props use) and contributes less to the value
 * than the heathered yarn and fibre noise, so no grid survives at play
 * distance.
 */
export function fabric(tint = PALETTE.fabricChair, key = 'chair') {
  return cached(`fabric:${key}:${tint}`, () => {
    const maps = generateTextureSet(
      `fabric:${key}:${tint}`,
      256,
      (a) => {
        const { ctx, size } = a;
        const rnd = mulberry32(hashString(`fab${key}`));
        const fbm = makeFbm(hashString(`fabf${key}`), { octaves: 4 });
        const img = ctx.createImageData(size, size);
        const d = img.data;
        const light = shade(tint, 1.13);
        const dark = shade(tint, 0.88);
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            // Fine plain weave, barely resolved.
            const weave = ((x >> 1) + (y >> 1)) % 2 === 0
              ? Math.sin((x / 2) * Math.PI) * 0.5 + 0.5
              : Math.sin((y / 2) * Math.PI) * 0.5 + 0.5;
            // Mottle (panel-scale), heathered yarn and fibre fuzz dominate so
            // the panel still reads as fabric at gameplay distance.
            const mottle = fbm(u * 3, v * 3, 3) * 0.5 + 0.5;
            const heather = fbm(u * 9, v * 9, 9) * 0.5 + 0.5;
            const fuzz = fbm(u * 96, v * 96, 96) * 0.5 + 0.5;
            const t = 0.5
              + (weave - 0.5) * 0.34
              + (mottle - 0.5) * 0.4
              + (heather - 0.5) * 0.5
              + (fuzz - 0.5) * 0.55
              + (rnd() - 0.5) * 0.22;
            const c = mix(dark, light, Math.max(0, Math.min(1, t)));
            const i = (y * size + x) * 4;
            d[i] = (c >> 16) & 255;
            d[i + 1] = (c >> 8) & 255;
            d[i + 2] = c & 255;
            d[i + 3] = 255;
            a.height[y * size + x] = 0.5 + (weave - 0.5) * 0.16 + (fuzz - 0.5) * 0.1;
            a.rough[y * size + x] = 0.93 + (fuzz - 0.5) * 0.05 + (mottle - 0.5) * 0.04;
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      { baseRoughness: 0.94, normalStrength: 1.0, aoRadius: 1, aoStrength: 0.3 }
    );
    return std(maps, { roughness: 1, metalness: 0 });
  });
}

/** Synthetic leather for the executive chair and lobby sofa. */
export function leather(tint = PALETTE.leather, key = 'exec') {
  return cached(`leather:${key}:${tint}`, () => {
    const maps = generateTextureSet(
      `leather:${key}:${tint}`,
      256,
      (a) => {
        const { ctx, size } = a;
        const worley = makeWorley(hashString(`lea${key}`), 30);
        const fbm = makeFbm(hashString(`leaf${key}`), { octaves: 3 });
        const img = ctx.createImageData(size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            const w = worley(u, v);
            const cell = Math.min(1, w.edge * 26);
            const n = fbm(u * 60, v * 60, 60) * 0.5 + 0.5;
            const c = shade(tint, 0.78 + cell * 0.4 + n * 0.14);
            const i = (y * size + x) * 4;
            d[i] = (c >> 16) & 255;
            d[i + 1] = (c >> 8) & 255;
            d[i + 2] = c & 255;
            d[i + 3] = 255;
            a.height[y * size + x] = 0.35 + cell * 0.5 + n * 0.1;
            a.rough[y * size + x] = 0.52 - cell * 0.14 + n * 0.08;
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      { baseRoughness: 0.5, normalStrength: 2.4, aoRadius: 2, aoStrength: 0.8 }
    );
    return std(maps, { roughness: 1, metalness: 0 });
  });
}

/** Hard plastic — monitor bezels, phones, keyboards, equipment shells. */
export function hardPlastic(tint = PALETTE.hardPlastic, key = 'black', rough = 0.46) {
  return cached(`plastic:${key}:${tint}:${rough}`, () => {
    const maps = generateTextureSet(
      `plastic:${key}:${tint}`,
      128,
      (a) => {
        const { ctx, size } = a;
        const worley = makeWorley(hashString(`pl${key}`), 44);
        ctx.fillStyle = css(tint);
        ctx.fillRect(0, 0, size, size);
        const img = ctx.getImageData(0, 0, size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const w = worley(x / size, y / size);
            const pebble = Math.min(1, w.edge * 40);
            const f = 0.95 + pebble * 0.1;
            const i = (y * size + x) * 4;
            d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
            a.height[y * size + x] = 0.5 + pebble * 0.14;
            a.rough[y * size + x] = rough + (1 - pebble) * 0.12;
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      { baseRoughness: rough, normalStrength: 1.4, ao: false }
    );
    return std(maps, { roughness: 1, metalness: 0 });
  });
}

/** Paper / cardboard. */
export function paperMaterial(tint = PALETTE.paper, key = 'sheet') {
  return cached(`paper:${key}:${tint}`, () => {
    const maps = generateTextureSet(
      `paper:${key}:${tint}`,
      128,
      (a) => {
        const { ctx, size } = a;
        const fbm = makeFbm(hashString(`pap${key}`), { octaves: 3 });
        ctx.fillStyle = css(tint);
        ctx.fillRect(0, 0, size, size);
        const img = ctx.getImageData(0, 0, size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const n = fbm((x / size) * 90, (y / size) * 90, 90) * 0.5 + 0.5;
            const f = 0.96 + n * 0.08;
            const i = (y * size + x) * 4;
            d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
            a.height[y * size + x] = 0.5 + (n - 0.5) * 0.08;
            a.rough[y * size + x] = 0.9;
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      { baseRoughness: 0.9, normalStrength: 0.8, ao: false }
    );
    return std(maps, { roughness: 1, metalness: 0 });
  });
}

/** Snow — exterior ground and window ledges. */
export function snowMaterial(key = 'ground') {
  return cached(`snow:${key}`, () => {
    const maps = generateTextureSet(
      `snow:${key}`,
      512,
      (a) => {
        const { ctx, size } = a;
        const fbm = makeFbm(hashString(`snow${key}`), { octaves: 5 });
        const worley = makeWorley(hashString(`snoww${key}`), 20);
        const img = ctx.createImageData(size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            const drift = fbm(u * 6, v * 6, 6) * 0.5 + 0.5;
            const sparkleField = worley(u, v);
            const sparkle = sparkleField.f1 < 0.004 ? 1 : 0;
            const c = mix(shade(PALETTE.snow, 0.9), 0xffffff, drift * 0.7 + sparkle * 0.3);
            const i = (y * size + x) * 4;
            d[i] = (c >> 16) & 255;
            d[i + 1] = (c >> 8) & 255;
            d[i + 2] = c & 255;
            d[i + 3] = 255;
            a.height[y * size + x] = 0.4 + drift * 0.5 + sparkle * 0.1;
            a.rough[y * size + x] = 0.72 - sparkle * 0.5 + (drift - 0.5) * 0.1;
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      { baseRoughness: 0.7, normalStrength: 1.6, aoRadius: 3, aoStrength: 0.5 }
    );
    return std(maps, { roughness: 1, metalness: 0, color: 0xffffff });
  });
}

// =========================================================================
// NON-TEXTURED / SPECIAL MATERIALS
// =========================================================================

export function clearGlass(tintColor = 0xbcd6e4, opacity = 0.14) {
  return cached(`glass:clear:${tintColor}:${opacity}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: tintColor,
      metalness: 0,
      roughness: 0.03,
      transmission: 0,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.6,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      premultipliedAlpha: false,
    })
  );
}

export function frostedGlass(tintColor = 0xd4e2ea) {
  return cached(`glass:frost:${tintColor}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: tintColor,
      metalness: 0,
      roughness: 0.62,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      clearcoat: 0.6,
      clearcoatRoughness: 0.4,
    })
  );
}

export function tintedGlass(tintColor = 0x5e7f96, opacity = 0.3) {
  return cached(`glass:tint:${tintColor}:${opacity}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: tintColor,
      metalness: 0.1,
      roughness: 0.06,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    })
  );
}

export function emissivePanel(color, intensity = 1.6, key = 'panel') {
  return cached(`emis:${key}:${color}:${intensity}`, () =>
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.35,
      metalness: 0,
    })
  );
}

export function plainMaterial(color, { roughness = 0.7, metalness = 0, ...rest } = {}, key) {
  return cached(`plain:${key || color}:${roughness}:${metalness}`, () =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...rest })
  );
}

// =========================================================================
// The named library the rest of the game imports.
// =========================================================================

export const MAT = {
  // architecture
  get wallOffice() { return tiled(drywall(PALETTE.drywallWarm, 0.35, 'warm'), 1); },
  get wallCool() { return tiled(drywall(PALETTE.drywallCool, 0.3, 'cool'), 1); },
  get wallAccent() { return tiled(drywall(PALETTE.drywallAccent, 0.2, 'accent'), 1); },
  get wallService() { return tiled(drywall(shade(PALETTE.drywallCool, 0.82), 0.9, 'service'), 1); },
  get plaster() { return tiled(drywall(PALETTE.plaster, 0.5, 'plaster'), 1); },
  get ceiling() { return ceilingTile('intact'); },
  get ceilingStained() { return ceilingTile('stained'); },
  get carpetMain() { return carpet(PALETTE.carpetMain, 'main'); },
  get carpetAccent() { return carpet(PALETTE.carpetAccent, 'accent'); },
  get carpetExec() { return carpet(PALETTE.carpetExec, 'exec'); },
  get vinyl() { return vinylFloor(PALETTE.vinylFloor, 'vct'); },
  get tileFloor() { return ceramicTile(shade(PALETTE.ceramicTile, 0.86), 8, 'floor'); },
  get tileWall() { return ceramicTile(PALETTE.ceramicTile, 6, 'wall'); },
  get concrete() { return concrete(PALETTE.concrete, 0.5, 'raw'); },
  get concreteSealed() { return concrete(PALETTE.concreteSealed, 0.35, 'sealed'); },
  get snow() { return snowMaterial('ground'); },

  // furniture & props
  get woodDesk() { return woodVeneer(PALETTE.woodVeneer, 'oak', 0.42); },
  get woodDark() { return woodVeneer(PALETTE.woodDark, 'walnut', 0.36); },
  get laminateLight() { return laminate(PALETTE.laminate, 'beech'); },
  get laminateGrey() { return laminate(0x9aa0a4, 'grey'); },
  get metalPainted() { return paintedMetal(PALETTE.paintedMetal, 0.4, 'grey'); },
  get metalPaintedDark() { return paintedMetal(0x3a4048, 0.5, 'dark'); },
  get metalWarn() { return paintedMetal(PALETTE.hazardAmber, 0.7, 'warn'); },
  get steel() { return brushedMetal(PALETTE.stainless, 'steel', 0.26); },
  get aluminum() { return brushedMetal(PALETTE.aluminum, 'alu', 0.34); },
  get chrome() { return brushedMetal(0xd8dce0, 'chrome', 0.08); },
  get fabricChair() { return fabric(PALETTE.fabricChair, 'chair'); },
  get fabricPanel() { return fabric(PALETTE.fabricPanel, 'panel'); },
  get leather() { return leather(PALETTE.leather, 'exec'); },
  get plasticBlack() { return hardPlastic(PALETTE.hardPlastic, 'black', 0.46); },
  get plasticGrey() { return hardPlastic(0x6b7178, 'grey', 0.52); },
  get plasticWhite() { return hardPlastic(0xd7d5cf, 'white', 0.5); },
  get rubber() { return hardPlastic(PALETTE.rubber, 'rubber', 0.85); },
  get paper() { return paperMaterial(PALETTE.paper, 'sheet'); },
  get cardboard() { return paperMaterial(PALETTE.cardboard, 'box'); },

  // glass
  get glassClear() { return clearGlass(); },
  get glassFrosted() { return frostedGlass(); },
  get glassTinted() { return tintedGlass(); },
};

// =========================================================================
// Additional families appended for the prop library (owner: fable3).
// New exports only — nothing above this line changes signature.
// =========================================================================

/** Cork pinboard surface — notice boards. */
export function cork(tint = 0xb98d5a, key = 'board') {
  return cached(`cork:${key}:${tint}`, () => {
    const maps = generateTextureSet(
      `cork:${key}:${tint}`,
      256,
      (a) => {
        const { ctx, size } = a;
        const worley = makeWorley(hashString(`cork${key}`), 34);
        const fbm = makeFbm(hashString(`corkf${key}`), { octaves: 3 });
        ctx.fillStyle = css(tint);
        ctx.fillRect(0, 0, size, size);
        const img = ctx.getImageData(0, 0, size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            const w = worley(u, v);
            const grain = Math.min(1, w.edge * 30);
            const n = fbm(u * 70, v * 70, 70) * 0.5 + 0.5;
            const f = 0.8 + grain * 0.28 + n * 0.14;
            const i = (y * size + x) * 4;
            d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
            a.height[y * size + x] = 0.4 + grain * 0.35 + n * 0.1;
            a.rough[y * size + x] = 0.92;
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      { baseRoughness: 0.92, normalStrength: 1.8, aoRadius: 2, aoStrength: 0.7 }
    );
    return std(maps, { roughness: 1, metalness: 0 });
  });
}

/**
 * Emissive screen material built from an sRGB canvas texture. Shared cache so
 * every monitor showing the same UI reuses one material + texture.
 * @param {string} key unique content key
 * @param {THREE.Texture} tex texture from generateImageTexture
 */
export function screenMaterial(key, tex, intensity = 1.05) {
  return cached(`screen:${key}:${intensity}`, () => {
    const m = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: intensity,
      color: 0x202020,
      roughness: 0.22,
      metalness: 0,
    });
    return m;
  });
}

/** Dead / unpowered display glass: near-black with a tight specular. */
export function screenOffMaterial(key = 'off') {
  return cached(`screenoff:${key}`, () =>
    new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.12, metalness: 0.25 })
  );
}

// Register the material families in the asset manifest registry.
export function registerMaterialAssets() {
  const fam = [
    ['MAT-DRYWALL', 'Painted Drywall', ['reception', 'open-office', 'corridors', 'exec']],
    ['MAT-PLASTER', 'Plaster', ['stairwell', 'vestibule']],
    ['MAT-CEILTILE', 'Acoustic Ceiling Tile', ['all interior']],
    ['MAT-CARPET', 'Commercial Loop Carpet', ['open-office', 'exec', 'conference']],
    ['MAT-VINYL', 'Vinyl Composition Tile', ['breakroom', 'service-corridor', 'copy-room']],
    ['MAT-CERAMIC', 'Ceramic Tile', ['restrooms', 'kitchen']],
    ['MAT-CONCRETE', 'Concrete', ['mechanical', 'loading', 'garage', 'stairwell']],
    ['MAT-WOOD', 'Wood Veneer', ['exec-office', 'conference', 'reception']],
    ['MAT-LAMINATE', 'Laminate', ['desks', 'breakroom', 'cabinets']],
    ['MAT-PAINTMETAL', 'Painted Metal', ['doors', 'lockers', 'panels']],
    ['MAT-BRUSHMETAL', 'Brushed / Stainless Metal', ['kitchen', 'handles', 'server-room']],
    ['MAT-FABRIC', 'Upholstery Fabric', ['chairs', 'cubicle-panels', 'sofa']],
    ['MAT-LEATHER', 'Synthetic Leather', ['exec-chair', 'lobby-sofa']],
    ['MAT-PLASTIC', 'Hard Plastic', ['electronics', 'equipment']],
    ['MAT-PAPER', 'Paper & Cardboard', ['clutter', 'archive', 'loading']],
    ['MAT-SNOW', 'Snow', ['exterior', 'courtyard', 'ledges']],
    ['MAT-GLASS-CLEAR', 'Clear Glass', ['conference', 'exterior-windows', 'lobby']],
    ['MAT-GLASS-FROST', 'Frosted Glass', ['exec-corridor', 'restroom']],
    ['MAT-GLASS-TINT', 'Tinted Exterior Glass', ['curtain-wall']],
  ];
  for (const [id, name, rooms] of fam) {
    assets.register({
      id,
      name,
      category: 'material',
      owner: 'fable3',
      files: ['src/art/materials.js', 'src/art/texgen.js', 'src/art/noise.js'],
      rooms,
      dims: [1, 1, 0],
      pivot: 'tileable, metres-per-tile documented per surface',
      materials: ['standard'],
      textures: ['baseColor', 'normal', 'roughness', 'ao'],
      collision: 'n/a',
      lod: 'mipmapped, quality-scaled resolution (0.5x/0.75x/1x)',
      status: 'accepted',
      acceptance: 'No baked lighting in base colour; roughness authored independently; tiles seamlessly.',
      evidence: 'tests/materials.spec.js + gallery screenshots',
    });
  }
}
