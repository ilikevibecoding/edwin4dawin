import * as THREE from 'three';
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
// Procedural PBR map set for the truck. Four material families live here:
// automotive paint, worn/blasted metal, moulded rubber, and soft trim.
// ---------------------------------------------------------------------------

const S = 512;

/** Metallic flake normal + the micro-scratch roughness that sells clearcoat. */
export function paintFlakeNormal() {
  return cached('veh.flake', () => {
    const n = 256;
    const rnd = mulberry32(31);
    const hf = heightField(n, n, () => rnd() * 0.5);
    // clump the flakes slightly so they glint in groups under a light
    const out = new Float32Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let s = 0;
        for (let oy = -1; oy <= 1; oy++)
          for (let ox = -1; ox <= 1; ox++)
            s += hf[(((y + oy) % n) + n) % n * n + ((((x + ox) % n) + n) % n)];
        out[y * n + x] = hf[y * n + x] * 0.75 + (s / 9) * 0.25;
      }
    }
    return normalFromHeight(out, n, n, 1.1, { repeat: 34 });
  });
}

export function paintRoughness() {
  return cached('veh.paintRough', () =>
    roughnessTexture(
      S,
      S,
      (x, y) => {
        const u = x / S;
        const v = y / S;
        // swirl marks from machine polishing + a few deeper scratches
        const swirl = fbm(u * 90, v * 90, { octaves: 3, period: 90, seed: 12 });
        const streak = fbm(u * 4 + swirl * 0.4, v * 220, { octaves: 2, period: 4, seed: 44 });
        const grime = fbm(u * 6, v * 6, { octaves: 5, period: 6, seed: 91 });
        let r = 0.13 + swirl * 0.05 + streak * 0.05;
        r += smoothstep(0.62, 0.95, grime) * 0.22; // dulled, dusty patches
        return clamp(r, 0.05, 0.55);
      },
      { repeat: 2 },
    ),
  );
}

/** Broad dust/road-film mask, darker and dirtier toward V=0 (bottom of panel). */
export function paintGrimeMap(color = PALETTE.bodyPaint) {
  return cached('veh.grime.' + color, () => {
    const base = hexToRgb(color);
    const dust = hexToRgb(0xa08a6d);
    const soot = hexToRgb(0x2a2620);
    return pixelTexture(
      S,
      S,
      (x, y, out) => {
        const u = x / S;
        const v = y / S;
        const speckle = fbm(u * 22, v * 22, { octaves: 5, period: 22, seed: 5 });
        const runs = fbm(u * 30, v * 5, { octaves: 4, period: 30, seed: 71 });
        const low = smoothstep(0.55, 0.0, v); // dirt climbs from the bottom
        let d = clamp(low * (0.35 + speckle * 0.85) + smoothstep(0.72, 1.0, speckle) * 0.18);
        d = clamp(d * (0.55 + runs * 0.9));
        let c = mixRgb(base, dust, d * 0.62);
        // faint horizontal panel shading so flat doors are not one value
        const band = fbm(u * 3, v * 9, { octaves: 3, period: 3, seed: 22 });
        const shade = 0.93 + band * 0.14;
        c = mixRgb(c, soot, smoothstep(0.8, 1.0, runs) * 0.12);
        out[0] = c[0] * shade;
        out[1] = c[1] * shade;
        out[2] = c[2] * shade;
      },
      { srgb: true },
    );
  });
}

/** Sand-blasted, slightly pitted steel: skid plates, bumpers, rack. */
export function wornMetalMaps(seed = 3) {
  return cached('veh.metal.' + seed, () => {
    const n = S;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const pits = worley(u * 26, v * 26, 26, seed).f1;
      const grain = fbm(u * 60, v * 8, { octaves: 4, period: 60, seed: seed + 3 });
      const dents = fbm(u * 5, v * 5, { octaves: 4, period: 5, seed: seed + 17 });
      return (
        dents * 0.55 + grain * 0.18 + (1 - smoothstep(0.0, 0.16, pits)) * 0.35
      );
    });
    const normal = normalFromHeight(hf, n, n, 2.4, { repeat: 2 });
    const steel = hexToRgb(PALETTE.steel);
    const dark = hexToRgb(PALETTE.steelDark);
    const rust = hexToRgb(0x7a4423);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const rustMask = smoothstep(0.55, 0.95, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: seed + 41 }));
        const scuff = fbm(u * 120, v * 12, { octaves: 3, period: 120, seed: seed + 9 });
        let c = mixRgb(dark, steel, clamp(h * 1.3 + scuff * 0.25));
        c = mixRgb(c, rust, rustMask * 0.55);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 2 },
    );
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const rustMask = smoothstep(0.5, 0.95, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: seed + 41 }));
        return clamp(0.34 + (1 - h) * 0.34 + rustMask * 0.35);
      },
      { repeat: 2 },
    );
    const metalness = roughnessTexture(
      n,
      n,
      (x, y) => {
        const u = x / n;
        const v = y / n;
        const rustMask = smoothstep(0.5, 0.95, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: seed + 41 }));
        return clamp(1 - rustMask * 0.8);
      },
      { repeat: 2 },
    );
    return { map, normal, rough, metalness };
  });
}

/** Textured/pebbled black plastic for cladding, bumper caps, mirror shells. */
export function trimMaps() {
  return cached('veh.trim', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const cell = worley(u * 46, v * 46, 46, 77);
      return smoothstep(0.0, 0.35, cell.f1) * 0.8 + fbm(u * 20, v * 20, { octaves: 3, period: 20, seed: 8 }) * 0.2;
    });
    const normal = normalFromHeight(hf, n, n, 1.5, { repeat: 4 });
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const h = hf[y * n + x];
        const chalk = fbm(x / n * 6, y / n * 6, { octaves: 4, period: 6, seed: 55 });
        return clamp(0.62 + h * 0.2 + smoothstep(0.6, 1.0, chalk) * 0.2);
      },
      { repeat: 4 },
    );
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const h = hf[y * n + x];
        const chalk = smoothstep(0.62, 1.0, fbm(x / n * 6, y / n * 6, { octaves: 4, period: 6, seed: 55 }));
        const c = mixRgb(hexToRgb(PALETTE.trim), hexToRgb(PALETTE.trimWorn), clamp(h * 0.5 + chalk * 0.7));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 4 },
    );
    return { map, normal, rough };
  });
}

/** Tyre sidewall: lettering-free but with mould flash, ribbing and dust. */
export function rubberMaps() {
  return cached('veh.rubber', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const ribs = Math.sin(v * Math.PI * 2 * 48) * 0.5 + 0.5;
      const pebble = worley(u * 40, v * 40, 40, 13).f1;
      return ribs * 0.25 + smoothstep(0, 0.3, pebble) * 0.4 + fbm(u * 18, v * 18, { octaves: 3, period: 18, seed: 6 }) * 0.35;
    });
    const normal = normalFromHeight(hf, n, n, 1.6, { repeat: 3 });
    const rubber = hexToRgb(PALETTE.rubber);
    const dust = hexToRgb(PALETTE.rubberDust);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const d = smoothstep(0.45, 0.95, fbm(u * 9, v * 9, { octaves: 5, period: 9, seed: 29 }));
        const c = mixRgb(rubber, dust, d * 0.5);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 3 },
    );
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const u = x / n;
        const v = y / n;
        const d = smoothstep(0.4, 0.95, fbm(u * 9, v * 9, { octaves: 5, period: 9, seed: 29 }));
        return clamp(0.78 + d * 0.2 - hf[y * n + x] * 0.08);
      },
      { repeat: 3 },
    );
    return { map, normal, rough };
  });
}

/** Aggressive mud-terrain tread, used as a normal map on the tyre crown. */
export function treadMaps(rows = 9) {
  return cached('veh.tread.' + rows, () => {
    const w = 256;
    const h = 256;
    const hf = heightField(w, h, (x, y) => {
      const u = x / w; // around the circumference
      const v = y / h; // across the tread
      const cv = v - 0.5;
      const stagger = Math.floor(u * rows * 2) % 2 === 0 ? 0.0 : 0.5;
      // chunky shoulder lugs + a broken centre rib
      const lugU = ((u * rows + stagger) % 1);
      const lug = smoothstep(0.06, 0.16, lugU) * (1 - smoothstep(0.84, 0.94, lugU));
      const shoulder = smoothstep(0.16, 0.3, Math.abs(cv)) * (1 - smoothstep(0.44, 0.5, Math.abs(cv)));
      const centre = (1 - smoothstep(0.02, 0.13, Math.abs(cv))) * smoothstep(0.2, 0.34, ((u * rows * 2) % 1));
      let hgt = Math.max(lug * shoulder, centre) * 0.9;
      // siping
      const sipe = Math.abs(Math.sin((u * rows * 6 + v * 2.5) * Math.PI));
      hgt *= 0.75 + smoothstep(0.0, 0.25, sipe) * 0.25;
      hgt += fbm(u * 40, v * 40, { octaves: 3, period: 40, seed: 4 }) * 0.08;
      return clamp(hgt);
    });
    const normal = normalFromHeight(hf, w, h, 3.6, { repeat: 1 });
    const rough = roughnessTexture(w, h, (x, y) => clamp(0.72 + (1 - hf[y * w + x]) * 0.2), { repeat: 1 });
    const ao = roughnessTexture(w, h, (x, y) => clamp(0.35 + hf[y * w + x] * 0.75), { repeat: 1 });
    return { normal, rough, ao, height: hf, w, h };
  });
}

/** Windscreen film: wiper arcs, dust build-up in the corners. */
export function glassRoughness() {
  return cached('veh.glassRough', () =>
    roughnessTexture(
      S,
      S,
      (x, y) => {
        const u = x / S;
        const v = y / S;
        const cx = u - 0.5;
        const cy = v - 0.12;
        const r = Math.hypot(cx * 1.15, cy);
        const wipe = smoothstep(0.52, 0.58, r) + (1 - smoothstep(0.1, 0.16, r));
        const dust = fbm(u * 14, v * 14, { octaves: 5, period: 14, seed: 33 });
        const edge = smoothstep(0.42, 0.5, Math.abs(cx)) + smoothstep(0.75, 1.0, v);
        return clamp(0.02 + wipe * 0.1 + dust * 0.06 + edge * 0.16, 0.02, 0.4);
      },
      { repeat: 1 },
    ),
  );
}

/** Splattered mud decal (alpha) laid over the lower bodywork and arches. */
export function mudSplatterMap() {
  return cached('veh.mud', () => {
    const n = S;
    return pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const blob = fbm(u * 11, v * 11, { octaves: 5, period: 11, seed: 61 });
        const fling = fbm(u * 30, v * 8, { octaves: 4, period: 30, seed: 88 });
        const low = smoothstep(0.62, 0.02, v);
        let a = clamp(low * smoothstep(0.42, 0.78, blob) * 1.4);
        a = clamp(a + smoothstep(0.78, 0.95, fling) * low * 0.9);
        const c = mixRgb(hexToRgb(PALETTE.dirtDark), hexToRgb(PALETTE.dirtLight), blob);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        out[3] = a * 255;
      },
      { srgb: true },
    );
  });
}

/** Woven seat / door-card fabric. */
export function fabricMaps() {
  return cached('veh.fabric', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const warp = Math.sin(u * Math.PI * 2 * 42) * 0.5 + 0.5;
      const weft = Math.sin(v * Math.PI * 2 * 42) * 0.5 + 0.5;
      const weave = Math.abs(warp - weft);
      return weave * 0.7 + fbm(u * 30, v * 30, { octaves: 3, period: 30, seed: 15 }) * 0.3;
    });
    const normal = normalFromHeight(hf, n, n, 1.2, { repeat: 6 });
    const base = hexToRgb(PALETTE.interiorFabric);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const h = hf[y * n + x];
        const c = mixRgb(base, [base[0] * 1.5, base[1] * 1.45, base[2] * 1.35], h * 0.6);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 6 },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.82 + hf[y * n + x] * 0.14), { repeat: 6 });
    return { map, normal, rough };
  });
}

/** Diamond-plate for the rock sliders / bed floor. */
export function diamondPlateMaps() {
  return cached('veh.plate', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = (x / n) * 4;
      const v = (y / n) * 4;
      const fu = u % 1;
      const fv = v % 1;
      const flip = (Math.floor(u) + Math.floor(v)) % 2 === 0 ? 1 : -1;
      const d = Math.abs(fv - 0.5 - flip * (fu - 0.5) * 0.55);
      const bar = (1 - smoothstep(0.06, 0.14, d)) * (1 - smoothstep(0.34, 0.46, Math.abs(fu - 0.5)));
      return bar * 0.85 + fbm(x / n * 30, y / n * 30, { octaves: 3, period: 30, seed: 2 }) * 0.15;
    });
    const normal = normalFromHeight(hf, n, n, 3.0, { repeat: 3 });
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.42 + (1 - hf[y * n + x]) * 0.3), { repeat: 3 });
    return { normal, rough };
  });
}

/** Perforated / hex mesh alpha for grille inserts and vents. */
export function meshAlpha(kind = 'hex') {
  return cached('veh.mesh.' + kind, () => {
    const n = 128;
    return pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = (x / n) * 10;
        const v = (y / n) * 10;
        let a;
        if (kind === 'hex') {
          const row = Math.floor(v);
          const off = row % 2 === 0 ? 0 : 0.5;
          const fu = ((u + off) % 1) - 0.5;
          const fv = (v % 1) - 0.5;
          const d = Math.max(Math.abs(fu), Math.abs(fu) * 0.5 + Math.abs(fv) * 0.866);
          a = d > 0.34 ? 1 : 0;
        } else {
          const fu = (u % 1) - 0.5;
          const fv = (v % 1) - 0.5;
          a = Math.max(Math.abs(fu), Math.abs(fv)) > 0.32 ? 1 : 0;
        }
        out[0] = out[1] = out[2] = 40;
        out[3] = a * 255;
      },
      { srgb: true, repeat: 1 },
    );
  });
}

/** Headlight / fog-lamp reflector: concentric fresnel steps that catch light. */
export function reflectorNormal() {
  return cached('veh.reflector', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n - 0.5;
      const v = y / n - 0.5;
      const r = Math.hypot(u, v);
      const step = (r * 26) % 1;
      const cell = worley(x / n * 14, y / n * 14, 14, 91);
      return step * 0.5 + smoothstep(0.0, 0.25, cell.f1) * 0.5;
    });
    return normalFromHeight(hf, n, n, 2.2, { repeat: 1 });
  });
}

/** Small helper: build a ready-to-use painted-body material. */
export function makePaintMaterial(color = PALETTE.bodyPaint, opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    map: paintGrimeMap(color),
    roughnessMap: paintRoughness(),
    normalMap: paintFlakeNormal(),
    normalScale: new THREE.Vector2(0.16, 0.16),
    metalness: 0.72,
    roughness: 0.34,
    clearcoat: 1.0,
    clearcoatRoughness: 0.09,
    envMapIntensity: 1.25,
    ...opts,
  });
}
