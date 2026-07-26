/**
 * Physically based material families. Owner: Fable 3.
 *
 * One coherent family per real-world surface class. Colour, roughness variance and normal
 * relief are authored per family; callers tint within the family rather than inventing new
 * one-off materials, which is what keeps the whole building looking like one art direction.
 */
import * as THREE from 'three';
import {
  clamp01,
  drawTexture,
  forEachTexel,
  generate,
  lerp,
  noiseFbm,
  noiseRidge,
  noiseValue,
  noiseWorley,
  setRGB,
  smoothstep,
  type Layer,
  type PbrMaps,
} from './TextureLab';

const materialCache = new Map<string, THREE.Material>();

export function clearMaterialCache(): void {
  for (const m of materialCache.values()) m.dispose();
  materialCache.clear();
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Hex string/number -> normalised sRGB triple used by the painters. */
function rgbOf(hex: number): [number, number, number] {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

function cached<T extends THREE.Material>(key: string, make: () => T): T {
  const hit = materialCache.get(key);
  if (hit) return hit as T;
  const m = make();
  m.name = key;
  materialCache.set(key, m);
  return m;
}

function applyMaps(mat: THREE.MeshStandardMaterial, maps: PbrMaps, normalScale = 1): void {
  mat.map = maps.map;
  if (maps.normalMap) {
    mat.normalMap = maps.normalMap;
    mat.normalScale = new THREE.Vector2(normalScale, normalScale);
  }
  if (maps.roughnessMap) mat.roughnessMap = maps.roughnessMap;
  if (maps.metalnessMap) mat.metalnessMap = maps.metalnessMap;
  if (maps.aoMap) mat.aoMap = maps.aoMap;
  if (maps.emissiveMap) mat.emissiveMap = maps.emissiveMap;
}

// ===========================================================================
// Painters
// ===========================================================================

/** Painted drywall: fine orange-peel roller texture, subtle scuffs near the floor band. */
function paintDrywall(base: [number, number, number], seed: number, wear: number): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const peel = noiseFbm(u, v, 96, 3, seed) - 0.5;
      const roller = noiseFbm(u, v * 0.25, 12, 2, seed + 5) - 0.5;
      const grime = smoothstep(0.66, 1.0, noiseFbm(u, v, 6, 4, seed + 11)) * wear;
      const scuff = smoothstep(0.82, 0.98, noiseRidge(u, v, 9, 3, seed + 21)) * wear * 0.7;
      const tint = 1 + peel * 0.028 + roller * 0.018 - grime * 0.08 - scuff * 0.13;
      setRGB(l, i, base[0] * tint, base[1] * tint * (1 - grime * 0.02), base[2] * tint * (1 - grime * 0.05));
      l.h[i] = 0.5 + peel * 0.45 + roller * 0.12;
      l.rough[i] = clamp01(0.74 + peel * 0.16 + grime * 0.12 - scuff * 0.08);
      l.ao[i] = 1 - grime * 0.12;
    });
  };
}

/** Trowelled plaster: broader sweeping relief than drywall, slightly chalkier. */
function paintPlaster(base: [number, number, number], seed: number): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const sweep = noiseFbm(u * 1.4, v, 8, 4, seed) - 0.5;
      const grit = noiseFbm(u, v, 160, 2, seed + 3) - 0.5;
      const tint = 1 + sweep * 0.09 + grit * 0.04;
      setRGB(l, i, base[0] * tint, base[1] * tint, base[2] * tint);
      l.h[i] = 0.5 + sweep * 1.1 + grit * 0.2;
      l.rough[i] = clamp01(0.86 + sweep * 0.12 + grit * 0.05);
    });
  };
}

/** Acoustic ceiling tile: 600 mm grid of fissured mineral fibre with pinholes. */
function paintCeilingTile(stainAmount: number, seed: number): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      // two tiles across the texture -> one repeat = 1.2 m
      const gx = (u * 2) % 1;
      const gy = (v * 2) % 1;
      const gutter =
        smoothstep(0.0, 0.018, gx) * smoothstep(1.0, 0.982, gx) *
        smoothstep(0.0, 0.018, gy) * smoothstep(1.0, 0.982, gy);
      const fissure = noiseRidge(u, v, 20, 3, seed);
      const fis = smoothstep(0.76, 0.98, fissure);
      const pin = noiseWorley(u, v, 64, seed + 4) < 0.09 ? 1 : 0;
      const stain =
        smoothstep(0.62, 0.95, noiseFbm(u, v, 3.5, 4, seed + 30)) * stainAmount;
      const white = 0.9 - fis * 0.06 - pin * 0.12;
      const r = lerp(white, 0.52, stain * 0.9);
      const g = lerp(white, 0.44, stain * 0.95);
      const b = lerp(white * 0.99, 0.33, stain);
      const gk = lerp(0.58, 1, gutter);
      setRGB(l, i, r * gk, g * gk, b * gk);
      l.h[i] = 0.55 + (gutter - 1) * 1.2 - fis * 0.18 - pin * 0.22;
      l.rough[i] = clamp01(0.93 - stain * 0.22 + fis * 0.04);
      l.ao[i] = clamp01(0.7 + gutter * 0.3 - fis * 0.05);
    });
  };
}

/** Commercial loop-pile carpet: dense low-contrast fibre with a subtle tonal fleck. */
function paintCarpet(
  base: [number, number, number],
  fleck: [number, number, number],
  seed: number,
  wear: number,
): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const loop = noiseWorley(u, v, 150, seed);
      const fibre = noiseFbm(u * 3, v, 220, 2, seed + 9);
      const tonal = noiseFbm(u, v, 10, 3, seed + 17);
      const isFleck = noiseValue(u * 90, v * 90, 90, seed + 44) > 0.82 ? 1 : 0;
      const path = smoothstep(0.45, 0.85, noiseFbm(u, v, 2.2, 3, seed + 61)) * wear;
      const shade = 0.86 + loop * 0.2 + fibre * 0.16 + (tonal - 0.5) * 0.16;
      const r = lerp(base[0], fleck[0], isFleck * 0.75) * shade * (1 - path * 0.16);
      const g = lerp(base[1], fleck[1], isFleck * 0.75) * shade * (1 - path * 0.15);
      const b = lerp(base[2], fleck[2], isFleck * 0.75) * shade * (1 - path * 0.13);
      setRGB(l, i, r, g, b);
      l.h[i] = 0.5 + loop * 0.7 + fibre * 0.5;
      // Trafficked lanes are crushed flat and therefore shinier than fresh pile.
      l.rough[i] = clamp01(0.97 - path * 0.16 - loop * 0.05);
      l.ao[i] = clamp01(0.72 + loop * 0.28);
    });
  };
}

/** Sheet vinyl flooring: welded seams every 2 m, faint marbled pattern, buffed sheen. */
function paintVinyl(base: [number, number, number], seed: number, wear: number): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const marble = noiseFbm(u * 2.5, v * 0.7, 22, 4, seed);
      const grain = noiseFbm(u, v, 320, 2, seed + 2);
      const seam = smoothstep(0.0, 0.004, Math.abs(((v * 2) % 1) - 0.5) ) ;
      const scratch = smoothstep(0.80, 0.99, noiseRidge(u * 6, v, 40, 3, seed + 12)) * wear;
      const scuff = smoothstep(0.6, 0.95, noiseFbm(u, v, 4, 3, seed + 21)) * wear;
      const tint = 0.9 + marble * 0.24 + grain * 0.06;
      setRGB(
        l,
        i,
        base[0] * tint * (1 - scuff * 0.1),
        base[1] * tint * (1 - scuff * 0.1),
        base[2] * tint * (1 - scuff * 0.08),
      );
      l.h[i] = 0.5 + grain * 0.3 - (1 - seam) * 0.8 + scratch * 0.15;
      l.rough[i] = clamp01(0.34 + scuff * 0.3 + scratch * 0.22 + grain * 0.08);
    });
  };
}

/** Ceramic tile with grout. `cells` = tiles across one texture repeat. */
function paintCeramicTile(
  base: [number, number, number],
  grout: [number, number, number],
  cells: number,
  seed: number,
  damp: number,
): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const gx = (u * cells) % 1;
      const gy = (v * cells) % 1;
      const gw = 0.045;
      const inTile =
        smoothstep(0, gw, gx) * smoothstep(1, 1 - gw, gx) *
        smoothstep(0, gw, gy) * smoothstep(1, 1 - gw, gy);
      const tileId = Math.floor(u * cells) * 31 + Math.floor(v * cells) * 17;
      const tonal = (Math.sin(tileId * 12.9898) * 43758.5453) % 1;
      const speck = noiseFbm(u, v, 300, 2, seed) - 0.5;
      const gGrit = noiseFbm(u, v, 120, 3, seed + 6);
      const dampPool = smoothstep(0.6, 0.95, noiseFbm(u, v, 3, 3, seed + 40)) * damp;
      const t = 1 + tonal * 0.05 + speck * 0.06;
      const r = lerp(grout[0] * (0.8 + gGrit * 0.4), base[0] * t, inTile);
      const g = lerp(grout[1] * (0.8 + gGrit * 0.4), base[1] * t, inTile);
      const b = lerp(grout[2] * (0.8 + gGrit * 0.4), base[2] * t, inTile);
      const k = 1 - dampPool * 0.12;
      setRGB(l, i, r * k, g * k, b * k);
      l.h[i] = 0.5 + inTile * 0.9 + speck * 0.1;
      // Glazed tile is smooth, grout is not, damp patches are smoother still.
      l.rough[i] = clamp01(lerp(0.88 + gGrit * 0.1, 0.16 + speck * 0.06, inTile) - dampPool * 0.1);
      l.ao[i] = clamp01(0.5 + inTile * 0.5);
    });
  };
}

/** Poured concrete: aggregate pitting, form lines, efflorescence. */
function paintConcrete(base: [number, number, number], seed: number, wear: number): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const agg = noiseWorley(u, v, 46, seed);
      const pit = agg < 0.18 ? 1 : 0;
      const broad = noiseFbm(u, v, 5, 4, seed + 3);
      const fine = noiseFbm(u, v, 150, 3, seed + 8);
      const form = smoothstep(0.48, 0.5, Math.abs(((u * 4) % 1) - 0.5) * 2) * 0.35;
      const stain = smoothstep(0.55, 0.95, noiseFbm(u * 0.7, v * 1.6, 3, 4, seed + 22)) * wear;
      const shade = 0.82 + broad * 0.3 + fine * 0.1 - pit * 0.22 - stain * 0.2;
      setRGB(l, i, base[0] * shade, base[1] * shade * (1 - stain * 0.03), base[2] * shade * (1 - stain * 0.05));
      l.h[i] = 0.5 + broad * 0.5 + fine * 0.35 - pit * 1.1 - form * 0.5;
      l.rough[i] = clamp01(0.84 + fine * 0.14 - stain * 0.14 + pit * 0.06);
      l.ao[i] = clamp01(0.78 + agg * 0.22 - stain * 0.1);
    });
  };
}

/** Painted metal: smooth enamel over sheet, with chips revealing primer near edges. */
function paintPaintedMetal(base: [number, number, number], seed: number, wear: number): (l: Layer) => void {
  const primer: [number, number, number] = [0.42, 0.4, 0.38];
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const orange = noiseFbm(u, v, 110, 2, seed) - 0.5;
      const chip = smoothstep(0.86, 0.97, noiseWorley(u, v, 26, seed + 4) < 0.3 ? noiseFbm(u, v, 60, 3, seed + 9) : 0) * wear;
      const scratch = smoothstep(0.86, 1.0, noiseRidge(u * 8, v, 50, 3, seed + 14)) * wear;
      const c = clamp01(chip + scratch * 0.6);
      setRGB(
        l,
        i,
        lerp(base[0] * (1 + orange * 0.04), primer[0], c),
        lerp(base[1] * (1 + orange * 0.04), primer[1], c),
        lerp(base[2] * (1 + orange * 0.04), primer[2], c),
      );
      l.h[i] = 0.5 + orange * 0.3 - c * 0.5;
      l.rough[i] = clamp01(lerp(0.42 + orange * 0.1, 0.72, c));
      l.metal[i] = c * 0.5;
    });
  };
}

/** Brushed metal: strong unidirectional grain. */
function paintBrushed(base: [number, number, number], seed: number, along: 'u' | 'v'): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const a = along === 'u' ? u : v;
      const b = along === 'u' ? v : u;
      const grain = noiseFbm(a * 0.03, b * 30, 256, 2, seed);
      const macro = noiseFbm(a, b * 2, 9, 3, seed + 5);
      const shade = 0.82 + grain * 0.34 + (macro - 0.5) * 0.1;
      setRGB(l, i, base[0] * shade, base[1] * shade, base[2] * shade);
      l.h[i] = 0.5 + (grain - 0.5) * 0.7;
      l.rough[i] = clamp01(0.3 + grain * 0.24 + macro * 0.06);
      l.metal[i] = 1;
    });
  };
}

/** Wood veneer: cathedral grain with pores and a satin lacquer. */
function paintWoodVeneer(
  light: [number, number, number],
  dark: [number, number, number],
  seed: number,
): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const warp = noiseFbm(u, v, 4, 3, seed) * 0.28;
      const rings = Math.abs(Math.sin((v * 7 + warp * 5 + noiseFbm(u, v, 2, 2, seed + 3) * 2) * Math.PI));
      const grain = Math.pow(rings, 0.55);
      const pore = smoothstep(0.75, 0.95, noiseRidge(u * 0.3, v * 8, 90, 3, seed + 11));
      const t = clamp01(grain * 0.85 + (noiseFbm(u, v, 40, 2, seed + 7) - 0.5) * 0.25);
      setRGB(
        l,
        i,
        lerp(dark[0], light[0], t) * (1 - pore * 0.18),
        lerp(dark[1], light[1], t) * (1 - pore * 0.18),
        lerp(dark[2], light[2], t) * (1 - pore * 0.18),
      );
      l.h[i] = 0.5 + (1 - t) * 0.35 - pore * 0.8;
      l.rough[i] = clamp01(0.36 + (1 - t) * 0.14 + pore * 0.24);
    });
  };
}

/** Melamine laminate: flat colour, micro pebble finish, worn edges. */
function paintLaminate(base: [number, number, number], seed: number): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const pebble = noiseFbm(u, v, 210, 2, seed) - 0.5;
      const flecks = noiseValue(u * 160, v * 160, 160, seed + 3) > 0.9 ? 0.1 : 0;
      const shade = 1 + pebble * 0.06 - flecks;
      setRGB(l, i, base[0] * shade, base[1] * shade, base[2] * shade);
      l.h[i] = 0.5 + pebble * 0.5;
      l.rough[i] = clamp01(0.42 + pebble * 0.18);
    });
  };
}

/** Woven upholstery / office panel fabric. */
function paintFabric(base: [number, number, number], seed: number, weave: number): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const wu = Math.sin(u * weave * Math.PI * 2) * 0.5 + 0.5;
      const wv = Math.sin(v * weave * Math.PI * 2) * 0.5 + 0.5;
      const w = Math.max(wu, wv);
      const fuzz = noiseFbm(u, v, 260, 2, seed) - 0.5;
      const tonal = noiseFbm(u, v, 12, 3, seed + 5) - 0.5;
      const shade = 0.84 + w * 0.24 + fuzz * 0.12 + tonal * 0.1;
      setRGB(l, i, base[0] * shade, base[1] * shade, base[2] * shade);
      l.h[i] = 0.5 + (w - 0.5) * 0.8 + fuzz * 0.35;
      l.rough[i] = clamp01(0.92 + fuzz * 0.08 - w * 0.06);
      l.ao[i] = clamp01(0.7 + w * 0.3);
    });
  };
}

/** Synthetic leather: pebbled hide with soft creasing. */
function paintLeather(base: [number, number, number], seed: number): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const cell = noiseWorley(u, v, 42, seed);
      const crease = noiseRidge(u, v, 7, 3, seed + 4);
      const grain = noiseFbm(u, v, 200, 2, seed + 8) - 0.5;
      const shade = 0.8 + cell * 0.3 - smoothstep(0.72, 0.95, crease) * 0.12 + grain * 0.06;
      setRGB(l, i, base[0] * shade, base[1] * shade, base[2] * shade);
      l.h[i] = 0.5 + cell * 0.6 - smoothstep(0.7, 1, crease) * 0.5;
      l.rough[i] = clamp01(0.52 + (1 - cell) * 0.2 + grain * 0.08);
      l.ao[i] = clamp01(0.68 + cell * 0.32);
    });
  };
}

/** Injection-moulded plastic: fine spark-eroded texture. */
function paintPlastic(base: [number, number, number], seed: number, gloss: number): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const spark = noiseWorley(u, v, 120, seed);
      const micro = noiseFbm(u, v, 300, 2, seed + 2) - 0.5;
      const shade = 0.93 + spark * 0.1 + micro * 0.05;
      setRGB(l, i, base[0] * shade, base[1] * shade, base[2] * shade);
      l.h[i] = 0.5 + spark * 0.35 + micro * 0.2;
      l.rough[i] = clamp01(gloss + spark * 0.12 + micro * 0.05);
    });
  };
}

/** Rubber: matte, slightly dusty. */
function paintRubber(base: [number, number, number], seed: number): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const grain = noiseFbm(u, v, 180, 3, seed) - 0.5;
      const dust = smoothstep(0.55, 0.9, noiseFbm(u, v, 8, 3, seed + 4));
      const shade = 0.92 + grain * 0.14 + dust * 0.12;
      setRGB(l, i, base[0] * shade, base[1] * shade, base[2] * shade);
      l.h[i] = 0.5 + grain * 0.5;
      l.rough[i] = clamp01(0.9 + grain * 0.08 + dust * 0.06);
    });
  };
}

/** Paper / cardboard: fibrous, flute shadowing for corrugate. */
function paintCardboard(seed: number, corrugated: boolean): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const fibre = noiseFbm(u * 2, v, 190, 3, seed) - 0.5;
      const blotch = noiseFbm(u, v, 9, 3, seed + 5) - 0.5;
      const flute = corrugated ? Math.sin(u * Math.PI * 2 * 46) * 0.5 + 0.5 : 0.5;
      const shade = 0.78 + fibre * 0.18 + blotch * 0.14 + (corrugated ? (flute - 0.5) * 0.14 : 0);
      setRGB(l, i, 0.74 * shade, 0.61 * shade, 0.44 * shade);
      l.h[i] = 0.5 + fibre * 0.4 + (corrugated ? (flute - 0.5) * 0.9 : 0);
      l.rough[i] = clamp01(0.93 + fibre * 0.07);
      l.ao[i] = clamp01(0.8 + (corrugated ? flute * 0.2 : 0.2));
    });
  };
}

/** Snow: sparkling crystalline crust with drift relief. */
function paintSnow(seed: number, trampled: number): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const drift = noiseFbm(u, v, 6, 4, seed);
      const crust = noiseWorley(u, v, 90, seed + 3);
      const sparkle = noiseValue(u * 220, v * 220, 220, seed + 9) > 0.965 ? 1 : 0;
      const track = smoothstep(0.5, 0.9, noiseFbm(u * 0.6, v * 2.2, 4, 3, seed + 20)) * trampled;
      const bright = 0.9 + drift * 0.12 + crust * 0.06 - track * 0.18;
      setRGB(
        l,
        i,
        clamp01(bright * 0.97 + sparkle * 0.06),
        clamp01(bright * 0.99 + sparkle * 0.06),
        clamp01(bright * 1.0 + sparkle * 0.05),
      );
      l.h[i] = 0.5 + drift * 0.8 + crust * 0.25 - track * 0.7;
      l.rough[i] = clamp01(0.82 - sparkle * 0.5 - track * 0.25 + crust * 0.08);
      l.ao[i] = clamp01(0.85 + drift * 0.15);
    });
  };
}

/** Ice: near-clear with internal fracture planes. */
function paintIce(seed: number): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const frac = smoothstep(0.72, 0.95, noiseRidge(u, v, 14, 4, seed));
      const cloud = noiseFbm(u, v, 7, 3, seed + 4);
      const shade = 0.72 + cloud * 0.2 + frac * 0.2;
      setRGB(l, i, shade * 0.86, shade * 0.93, shade * 1.0);
      l.h[i] = 0.5 + frac * 0.6 + cloud * 0.2;
      l.rough[i] = clamp01(0.08 + frac * 0.2 + cloud * 0.06);
    });
  };
}

/** Perforated / vented electronics face plate. */
function paintElectronics(base: [number, number, number], seed: number): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const vent = noiseWorley(u, v, 64, seed) < 0.24 ? 1 : 0;
      const micro = noiseFbm(u, v, 240, 2, seed + 3) - 0.5;
      const dust = smoothstep(0.6, 0.95, noiseFbm(u, v, 7, 3, seed + 8)) * 0.5;
      const shade = 0.94 + micro * 0.08 - vent * 0.5 + dust * 0.1;
      setRGB(l, i, base[0] * shade, base[1] * shade * 0.99, base[2] * shade * 0.98);
      l.h[i] = 0.5 + micro * 0.25 - vent * 1.1;
      l.rough[i] = clamp01(0.55 + micro * 0.1 + dust * 0.22 + vent * 0.2);
      l.ao[i] = clamp01(1 - vent * 0.55);
    });
  };
}

/** Frosted glass: acid-etched diffusion. */
function paintFrost(seed: number): (l: Layer) => void {
  return (l) => {
    forEachTexel(l, (i, u, v) => {
      const etch = noiseFbm(u, v, 180, 3, seed);
      const swirl = noiseFbm(u, v, 10, 3, seed + 5);
      const shade = 0.88 + etch * 0.14 + swirl * 0.06;
      setRGB(l, i, shade * 0.95, shade * 0.98, shade);
      l.h[i] = 0.5 + etch * 0.4;
      l.rough[i] = clamp01(0.55 + etch * 0.24 + swirl * 0.08);
    });
  };
}

/** Speckled terrazzo-ish stone used on the lobby feature floor. */
function paintTerrazzo(seed: number): (l: Layer) => void {
  return (l) => {
    const chipsA: [number, number, number] = [0.3, 0.34, 0.38];
    const chipsB: [number, number, number] = [0.58, 0.6, 0.6];
    const chipsC: [number, number, number] = [0.42, 0.48, 0.52];
    const matrix: [number, number, number] = [0.72, 0.735, 0.735];
    forEachTexel(l, (i, u, v) => {
      const c1 = noiseWorley(u, v, 66, seed);
      const c2 = noiseWorley(u, v, 104, seed + 11);
      const c3 = noiseWorley(u, v, 150, seed + 23);
      let col = matrix;
      let chip = 0;
      if (c1 < 0.22) { col = chipsA; chip = 1; }
      else if (c2 < 0.19) { col = chipsB; chip = 1; }
      else if (c3 < 0.16) { col = chipsC; chip = 1; }
      const polish = noiseFbm(u, v, 260, 2, seed + 30) - 0.5;
      const shade = 1 + polish * 0.05;
      setRGB(l, i, col[0] * shade, col[1] * shade, col[2] * shade);
      l.h[i] = 0.5 + chip * 0.12 + polish * 0.15;
      l.rough[i] = clamp01(0.2 + chip * 0.06 + polish * 0.1);
      l.ao[i] = 1;
    });
  };
}

// ===========================================================================
// Material family accessors
// ===========================================================================

export interface FamilyOptions {
  color?: number;
  seed?: number;
  wear?: number;
  repeat?: number;
  /** metres covered by one texture repeat; overrides `repeat` when the mesh uses world UVs */
  scaleMeters?: number;
  size?: number;
  normalScale?: number;
}

function repeatFor(opts: FamilyOptions, defaultRepeat: number): number {
  return opts.repeat ?? defaultRepeat;
}

export const Mat = {
  /** Painted gypsum wall board. */
  drywall(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0xd9d7d0;
    const seed = opts.seed ?? 101;
    const wear = opts.wear ?? 0.35;
    const key = `drywall:${color}:${seed}:${wear}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintDrywall(rgbOf(color), seed, wear), {
        size: opts.size ?? 512,
        repeat: repeatFor(opts, 1),
        normalStrength: 1.1,
        ao: true,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.6);
      return m;
    });
  },

  plaster(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0xcfcabf;
    const seed = opts.seed ?? 202;
    const key = `plaster:${color}:${seed}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintPlaster(rgbOf(color), seed), {
        size: opts.size ?? 512,
        repeat: repeatFor(opts, 1),
        normalStrength: 1.4,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.8);
      return m;
    });
  },

  ceilingTile(opts: FamilyOptions & { stain?: number } = {}): THREE.MeshStandardMaterial {
    const stain = opts.stain ?? 0.12;
    const seed = opts.seed ?? 303;
    const key = `ceilingtile:${stain}:${seed}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintCeilingTile(stain, seed), {
        size: opts.size ?? 512,
        repeat: repeatFor(opts, 1),
        normalStrength: 0.8,
        ao: true,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.4);
      return m;
    });
  },

  carpet(opts: FamilyOptions & { fleck?: number } = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0x3a4048;
    const fleck = opts.fleck ?? 0x5b6472;
    const seed = opts.seed ?? 404;
    const wear = opts.wear ?? 0.4;
    const key = `carpet:${color}:${fleck}:${seed}:${wear}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintCarpet(rgbOf(color), rgbOf(fleck), seed, wear), {
        size: opts.size ?? 512,
        repeat: repeatFor(opts, 1),
        normalStrength: 1.5,
        ao: true,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.55);
      return m;
    });
  },

  vinyl(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0xb9b6ac;
    const seed = opts.seed ?? 505;
    const wear = opts.wear ?? 0.4;
    const key = `vinyl:${color}:${seed}:${wear}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintVinyl(rgbOf(color), seed, wear), {
        size: opts.size ?? 512,
        repeat: repeatFor(opts, 1),
        normalStrength: 0.8,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.4);
      return m;
    });
  },

  ceramicTile(
    opts: FamilyOptions & { grout?: number; cells?: number; damp?: number } = {},
  ): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0xd3d6d4;
    const grout = opts.grout ?? 0x8e8d86;
    const cells = opts.cells ?? 4;
    const damp = opts.damp ?? 0.2;
    const seed = opts.seed ?? 606;
    const key = `tile:${color}:${grout}:${cells}:${damp}:${seed}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintCeramicTile(rgbOf(color), rgbOf(grout), cells, seed, damp), {
        size: opts.size ?? 512,
        repeat: repeatFor(opts, 1),
        normalStrength: 2.2,
        ao: true,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.7);
      return m;
    });
  },

  concrete(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0x8f8f8c;
    const seed = opts.seed ?? 707;
    const wear = opts.wear ?? 0.45;
    const key = `concrete:${color}:${seed}:${wear}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintConcrete(rgbOf(color), seed, wear), {
        size: opts.size ?? 512,
        repeat: repeatFor(opts, 1),
        normalStrength: 1.5,
        ao: true,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.85);
      return m;
    });
  },

  paintedMetal(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0x6d7278;
    const seed = opts.seed ?? 808;
    const wear = opts.wear ?? 0.3;
    const key = `paintedmetal:${color}:${seed}:${wear}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintPaintedMetal(rgbOf(color), seed, wear), {
        size: opts.size ?? 512,
        repeat: repeatFor(opts, 1),
        normalStrength: 1.0,
        metal: true,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 1 });
      applyMaps(m, maps, opts.normalScale ?? 0.5);
      return m;
    });
  },

  brushedMetal(opts: FamilyOptions & { along?: 'u' | 'v' } = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0x9ea2a6;
    const seed = opts.seed ?? 909;
    const along = opts.along ?? 'u';
    const key = `brushed:${color}:${seed}:${along}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintBrushed(rgbOf(color), seed, along), {
        size: opts.size ?? 512,
        repeat: repeatFor(opts, 1),
        normalStrength: 0.6,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 1 });
      applyMaps(m, maps, opts.normalScale ?? 0.35);
      return m;
    });
  },

  stainless(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    return Mat.brushedMetal({ color: 0xc2c6c9, seed: 1201, along: 'v', ...opts });
  },

  aluminium(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    return Mat.brushedMetal({ color: 0xaeb2b6, seed: 1301, along: 'u', ...opts });
  },

  woodVeneer(opts: FamilyOptions & { dark?: number } = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0x9a6b41;
    const dark = opts.dark ?? 0x53341c;
    const seed = opts.seed ?? 1401;
    const key = `wood:${color}:${dark}:${seed}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintWoodVeneer(rgbOf(color), rgbOf(dark), seed), {
        size: opts.size ?? 512,
        repeat: repeatFor(opts, 1),
        normalStrength: 1.0,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.45);
      return m;
    });
  },

  laminate(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0xcdc7bb;
    const seed = opts.seed ?? 1501;
    const key = `laminate:${color}:${seed}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintLaminate(rgbOf(color), seed), {
        size: opts.size ?? 256,
        repeat: repeatFor(opts, 1),
        normalStrength: 0.7,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.3);
      return m;
    });
  },

  fabric(opts: FamilyOptions & { weave?: number } = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0x4a5058;
    const seed = opts.seed ?? 1601;
    const weave = opts.weave ?? 110;
    const key = `fabric:${color}:${seed}:${weave}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintFabric(rgbOf(color), seed, weave), {
        size: opts.size ?? 256,
        repeat: repeatFor(opts, 1),
        normalStrength: 1.2,
        ao: true,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.6);
      return m;
    });
  },

  leather(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0x2b2b2e;
    const seed = opts.seed ?? 1701;
    const key = `leather:${color}:${seed}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintLeather(rgbOf(color), seed), {
        size: opts.size ?? 256,
        repeat: repeatFor(opts, 1),
        normalStrength: 1.4,
        ao: true,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.7);
      return m;
    });
  },

  hardPlastic(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0x2e3134;
    const seed = opts.seed ?? 1801;
    const key = `plastic-hard:${color}:${seed}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintPlastic(rgbOf(color), seed, 0.4), {
        size: opts.size ?? 256,
        repeat: repeatFor(opts, 1),
        normalStrength: 0.9,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.35);
      return m;
    });
  },

  softPlastic(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0x3a3d40;
    const seed = opts.seed ?? 1901;
    const key = `plastic-soft:${color}:${seed}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintPlastic(rgbOf(color), seed, 0.72), {
        size: opts.size ?? 256,
        repeat: repeatFor(opts, 1),
        normalStrength: 1.1,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.45);
      return m;
    });
  },

  rubber(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0x212326;
    const seed = opts.seed ?? 2001;
    const key = `rubber:${color}:${seed}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintRubber(rgbOf(color), seed), {
        size: opts.size ?? 256,
        repeat: repeatFor(opts, 1),
        normalStrength: 1.0,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.5);
      return m;
    });
  },

  cardboard(opts: FamilyOptions & { corrugated?: boolean } = {}): THREE.MeshStandardMaterial {
    const seed = opts.seed ?? 2101;
    const corr = opts.corrugated ?? false;
    const key = `cardboard:${seed}:${corr}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintCardboard(seed, corr), {
        size: opts.size ?? 256,
        repeat: repeatFor(opts, 1),
        normalStrength: 1.2,
        ao: true,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.5);
      return m;
    });
  },

  paper(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    const key = `paper:${opts.color ?? 0xf1efe8}`;
    return cached(key, () => {
      const m = new THREE.MeshStandardMaterial({
        color: opts.color ?? 0xf1efe8,
        roughness: 0.92,
        metalness: 0,
      });
      return m;
    });
  },

  electronics(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    const color = opts.color ?? 0x33373b;
    const seed = opts.seed ?? 2201;
    const key = `electronics:${color}:${seed}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintElectronics(rgbOf(color), seed), {
        size: opts.size ?? 256,
        repeat: repeatFor(opts, 1),
        normalStrength: 1.6,
        ao: true,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0.15 });
      applyMaps(m, maps, opts.normalScale ?? 0.7);
      return m;
    });
  },

  snow(opts: FamilyOptions & { trampled?: number } = {}): THREE.MeshStandardMaterial {
    const seed = opts.seed ?? 2301;
    const trampled = opts.trampled ?? 0.25;
    const key = `snow:${seed}:${trampled}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintSnow(seed, trampled), {
        size: opts.size ?? 512,
        repeat: repeatFor(opts, 1),
        normalStrength: 1.3,
        ao: true,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.7);
      return m;
    });
  },

  ice(opts: FamilyOptions = {}): THREE.MeshPhysicalMaterial {
    const seed = opts.seed ?? 2401;
    const key = `ice:${seed}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintIce(seed), {
        size: opts.size ?? 256,
        repeat: repeatFor(opts, 1),
        normalStrength: 1.1,
      });
      const m = new THREE.MeshPhysicalMaterial({
        roughness: 1,
        metalness: 0,
        transmission: 0.35,
        thickness: 0.05,
        transparent: true,
        opacity: 0.85,
        ior: 1.31,
      });
      applyMaps(m as unknown as THREE.MeshStandardMaterial, maps, 0.5);
      return m;
    });
  },

  terrazzo(opts: FamilyOptions = {}): THREE.MeshStandardMaterial {
    const seed = opts.seed ?? 2501;
    const key = `terrazzo:${seed}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintTerrazzo(seed), {
        size: opts.size ?? 512,
        repeat: repeatFor(opts, 1),
        normalStrength: 0.5,
      });
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      applyMaps(m, maps, opts.normalScale ?? 0.25);
      return m;
    });
  },

  frostedGlass(opts: FamilyOptions = {}): THREE.MeshPhysicalMaterial {
    const seed = opts.seed ?? 2601;
    const key = `glass-frosted:${seed}:${opts.repeat ?? 1}`;
    return cached(key, () => {
      const maps = generate(key, paintFrost(seed), {
        size: opts.size ?? 256,
        repeat: repeatFor(opts, 1),
        normalStrength: 0.8,
      });
      const m = new THREE.MeshPhysicalMaterial({
        color: 0xdfe8ec,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.55,
        transmission: 0.55,
        thickness: 0.012,
        ior: 1.5,
        side: THREE.DoubleSide,
      });
      applyMaps(m as unknown as THREE.MeshStandardMaterial, maps, 0.4);
      return m;
    });
  },

  /**
   * Clear architectural glass. Deliberately low opacity with a strong specular response and a
   * faint green edge tint so it reads as glass rather than a blue wall.
   */
  clearGlass(opts: { tint?: number; opacity?: number; roughness?: number } = {}): THREE.MeshPhysicalMaterial {
    const tint = opts.tint ?? 0xd8e6e2;
    const opacity = opts.opacity ?? 0.13;
    const rough = opts.roughness ?? 0.035;
    const key = `glass-clear:${tint}:${opacity}:${rough}`;
    return cached(key, () => new THREE.MeshPhysicalMaterial({
      color: tint,
      transparent: true,
      opacity,
      roughness: rough,
      metalness: 0,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      premultipliedAlpha: false,
      specularIntensity: 1,
      iridescence: 0.08,
      clearcoat: 0.6,
      clearcoatRoughness: 0.04,
    }));
  },

  /** Exterior solar-tinted glazing seen from inside. */
  tintedGlass(): THREE.MeshPhysicalMaterial {
    return Mat.clearGlass({ tint: 0xa9c2c9, opacity: 0.2, roughness: 0.05 });
  },

  /** Simple emissive panel used for screens, exit signs and light fixtures. */
  emissive(color: number, intensity = 1, mapTex?: THREE.Texture): THREE.MeshStandardMaterial {
    const key = `emissive:${color}:${intensity}:${mapTex?.uuid ?? 'none'}`;
    return cached(key, () => {
      const m = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: new THREE.Color(color),
        emissiveIntensity: intensity,
        roughness: 0.35,
        metalness: 0,
      });
      if (mapTex) {
        m.emissiveMap = mapTex;
        m.map = mapTex;
        m.color = new THREE.Color(0x101010);
      }
      return m;
    });
  },

  /** Flat colour with a sensible PBR response; used for tiny parts not worth a texture. */
  solid(
    color: number,
    roughness = 0.6,
    metalness = 0,
    extra: Partial<THREE.MeshStandardMaterialParameters> = {},
  ): THREE.MeshStandardMaterial {
    const key = `solid:${color}:${roughness}:${metalness}:${JSON.stringify(extra)}`;
    return cached(key, () => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }));
  },

  /** Texture-mapped flat surface for signage/posters/screens. */
  printed(
    key: string,
    tex: THREE.Texture,
    opts: { roughness?: number; emissive?: number; emissiveIntensity?: number; transparent?: boolean } = {},
  ): THREE.MeshStandardMaterial {
    const k = `printed:${key}:${opts.emissive ?? 0}:${opts.emissiveIntensity ?? 0}`;
    return cached(k, () => {
      const m = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: opts.roughness ?? 0.72,
        metalness: 0,
        transparent: opts.transparent ?? false,
      });
      if (opts.emissive !== undefined) {
        m.emissive = new THREE.Color(opts.emissive);
        m.emissiveMap = tex;
        m.emissiveIntensity = opts.emissiveIntensity ?? 1;
      }
      return m;
    });
  },
};

export { drawTexture, srgbToLinear };
