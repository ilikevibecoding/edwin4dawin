import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import {
  cached,
  canvasTexture,
  clamp,
  fbm,
  heightField,
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
// Procedural PBR map set for the truck. Five material families live here:
// automotive clearcoat paint, worn/blasted metal, moulded rubber, sun-faded
// black plastic, and soft trim.
//
// Colour-space note: `core.hexToRgb` hands back the *working space* (linear)
// components of a hex literal, because three converts hex from sRGB on the way
// in. Writing those bytes into an sRGB-tagged texture decodes them a second
// time and lands roughly a factor of ten too dark, which is what made the whole
// truck read as black. Everything here goes through `rgb()` instead, which
// keeps the literal sRGB bytes.
// ---------------------------------------------------------------------------

const S = 512;

const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

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
    // Per-pixel noise at a high repeat aliases into a visible cross-hatch once
    // the panel is more than a metre from the camera, which reads as woven cloth
    // rather than metallic flake. Kept coarse enough to survive mipmapping.
    return normalFromHeight(out, n, n, 1.1, { repeat: 7 });
  });
}

/**
 * Orange peel: the low-frequency ripple a sprayed panel always has. Sampled at
 * a much larger scale than the flake so it shows up as a soft warp in the
 * clearcoat highlight rather than as noise.
 */
export function paintPeelNormal() {
  return cached('veh.peel', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      return (
        fbm(u * 9, v * 9, { octaves: 4, period: 9, seed: 313 }) * 0.7 +
        fbm(u * 26, v * 26, { octaves: 2, period: 26, seed: 77 }) * 0.3
      );
    });
    return normalFromHeight(hf, n, n, 0.9, { repeat: 2 });
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
        // swirl marks from machine polishing + a few deeper wash scratches
        const swirl = fbm(u * 90, v * 90, { octaves: 3, period: 90, seed: 12 });
        const streak = fbm(u * 4 + swirl * 0.4, v * 220, { octaves: 2, period: 4, seed: 44 });
        const haze = fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: 91 });
        let r = 0.11 + swirl * 0.04 + streak * 0.05;
        r += smoothstep(0.66, 0.97, haze) * 0.16; // polish haze
        return clamp(r, 0.05, 0.42);
      },
      { repeat: 2 },
    ),
  );
}

/**
 * Basecoat map. Deliberately close to flat: the dirt gradient that used to live
 * in here is now driven from object space by `applyDirt`, so it climbs the real
 * body instead of restarting on every merged primitive's UV island.
 */
export function paintBaseMap(color = PALETTE.bodyPaint) {
  return cached('veh.base.' + color, () => {
    const base = rgb(color);
    const hi = [
      Math.min(255, base[0] * 1.22 + 14),
      Math.min(255, base[1] * 1.18 + 14),
      Math.min(255, base[2] * 1.14 + 12),
    ];
    const lo = [base[0] * 0.72, base[1] * 0.74, base[2] * 0.78];
    return pixelTexture(
      S,
      S,
      (x, y, out) => {
        const u = x / S;
        const v = y / S;
        // clearcoat thickness variation + a hint of metallic flake brightness
        const cloud = fbm(u * 5, v * 5, { octaves: 4, period: 5, seed: 401 });
        const flake = fbm(u * 150, v * 150, { octaves: 2, period: 150, seed: 9 });
        const scratch = smoothstep(0.93, 1.0, ridged(u * 3, v * 190, { octaves: 2, period: 3, seed: 61 }));
        let c = mixRgb(lo, hi, clamp(cloud * 0.55 + 0.32 + flake * 0.24));
        c = mixRgb(c, [190, 192, 190], scratch * 0.35);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 2 },
    );
  });
}

/**
 * Blue/green/red packed dirt noise, sampled twice in object space by the dirt
 * layer below. R is medium blobs, G fine grit, B vertical run-off streaks.
 */
export function dirtNoise() {
  return cached('veh.dirtNoise', () =>
    pixelTexture(
      S,
      S,
      (x, y, out) => {
        const u = x / S;
        const v = y / S;
        out[0] = clamp(fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: 61 }) * 1.35 - 0.15) * 255;
        out[1] = clamp(fbm(u * 34, v * 34, { octaves: 4, period: 34, seed: 88 })) * 255;
        out[2] = clamp(fbm(u * 26, v * 4, { octaves: 4, period: 26, seed: 133 }) * 1.2) * 255;
      },
      { repeat: 1 },
    ),
  );
}

/**
 * Object-space road film. Injected into any material so grime climbs from the
 * bottom of the bodywork, fans out of the wheel arches and settles as dust on
 * anything pointing at the sky. Doing it here rather than in a UV map is the
 * only way to get one continuous gradient across a merged, kit-bashed body.
 */
export function applyDirt(material, { amount = 1, tag = 'a', color = 0x9a8163, arch = 1 } = {}) {
  const tex = dirtNoise();
  const dust = new THREE.Color(color);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uDirtTex = { value: tex };
    shader.uniforms.uDirtColor = { value: dust };
    shader.uniforms.uDirtAmount = { value: amount };
    shader.uniforms.uDirtArch = { value: arch };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vDirtPos;
        varying vec3 vDirtNrm;`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        vDirtPos = position;
        vDirtNrm = objectNormal;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uDirtTex;
        uniform vec3 uDirtColor;
        uniform float uDirtAmount;
        uniform float uDirtArch;
        varying vec3 vDirtPos;
        varying vec3 vDirtNrm;
        float dirtAmt = 0.0;
        float dirtNz = 0.0;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          vec3 dp = vDirtPos;
          // two cheap projections stand in for a triplanar sample
          vec3 na = texture2D( uDirtTex, dp.xz * 0.62 ).rgb;
          vec3 nb = texture2D( uDirtTex, vec2( dp.z, dp.y ) * 0.78 ).rgb;
          dirtNz = na.r * 0.5 + nb.r * 0.5;
          float grit = nb.g * 0.6 + na.g * 0.4;
          float runs = nb.b;

          // road film creeping up off the sills. Squared, so it stays a band
          // along the bottom of the panels instead of washing the whole flank.
          float low = 1.0 - smoothstep( 0.6, 1.08, dp.y );
          low *= low * ( 0.32 + runs * 0.8 );

          // spray fanning out of the two wheel openings
          float dF = length( vec2( dp.z - 1.53, ( dp.y - 0.5 ) * 1.15 ) );
          float dR = length( vec2( dp.z + 1.53, ( dp.y - 0.5 ) * 1.15 ) );
          float near = 1.0 - smoothstep( 0.46, 1.0, min( dF, dR ) );
          float flank = smoothstep( 0.48, 0.8, abs( dp.x ) );
          float spray = near * flank * uDirtArch * ( 0.22 + grit * 0.8 ) * 0.6;

          // dust settling on anything that faces the sky
          float upY = vDirtNrm.y / max( length( vDirtNrm ), 1e-4 );
          float up = clamp( upY, 0.0, 1.0 );
          float settle = up * up * up * ( 0.06 + dirtNz * 0.3 );

          dirtAmt = clamp( ( low * ( 0.55 + dirtNz * 0.9 ) + spray + settle ) * uDirtAmount, 0.0, 0.88 );
          vec3 mud = uDirtColor * ( 0.62 + dirtNz * 0.72 );
          diffuseColor.rgb = mix( diffuseColor.rgb, mud, dirtAmt * 0.8 );
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp( roughnessFactor + dirtAmt * 0.46, 0.03, 1.0 );`,
      );

    if (shader.fragmentShader.includes('#include <lights_physical_fragment>')) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
        #ifdef USE_CLEARCOAT
          material.clearcoat = clamp( material.clearcoat * ( 1.0 - dirtAmt * 0.88 ), 0.0, 1.0 );
          material.clearcoatRoughness = clamp( material.clearcoatRoughness + dirtAmt * 0.4, 0.0, 1.0 );
        #endif`,
      );
    }
  };
  // onBeforeCompile edits are invisible to the default program cache key, so
  // two materials of the same class would otherwise share a compiled program.
  material.customProgramCacheKey = () => `dirt:${tag}:${amount}:${arch}`;
  return material;
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
      return dents * 0.55 + grain * 0.18 + (1 - smoothstep(0.0, 0.16, pits)) * 0.35;
    });
    const normal = normalFromHeight(hf, n, n, 2.2, { repeat: 2 });
    const steel = rgb(PALETTE.steel);
    const dark = rgb(PALETTE.steelDark);
    const rust = rgb(0x8a5027);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const rustMask = smoothstep(0.72, 0.98, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: seed + 41 }));
        const scuff = fbm(u * 120, v * 12, { octaves: 3, period: 120, seed: seed + 9 });
        let c = mixRgb(dark, steel, clamp(h * 1.3 + scuff * 0.25));
        c = mixRgb(c, rust, rustMask * 0.5);
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
        return clamp(0.3 + (1 - h) * 0.34 + rustMask * 0.35);
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
        return clamp(1 - rustMask * 0.75);
      },
      { repeat: 2 },
    );
    return { map, normal, rough, metalness };
  });
}

/** Linear brush marks for milled aluminium: winch plate, hinges, rack feet. */
export function brushedMaps() {
  return cached('veh.brushed', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      return (
        fbm(u * 4, v * 210, { octaves: 3, period: 4, seed: 17 }) * 0.75 +
        fbm(u * 22, v * 22, { octaves: 3, period: 22, seed: 51 }) * 0.25
      );
    });
    const normal = normalFromHeight(hf, n, n, 1.1, { repeat: 3 });
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.26 + hf[y * n + x] * 0.24), { repeat: 3 });
    return { normal, rough };
  });
}

/**
 * Textured black plastic for cladding, bumper caps, flares and mirror shells.
 * Sun-faded: the raised pebbles keep their pigment, the flats go chalky grey.
 */
export function trimMaps() {
  return cached('veh.trim', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const cell = worley(u * 46, v * 46, 46, 77);
      return smoothstep(0.0, 0.35, cell.f1) * 0.8 + fbm(u * 20, v * 20, { octaves: 3, period: 20, seed: 8 }) * 0.2;
    });
    const normal = normalFromHeight(hf, n, n, 1.6, { repeat: 4 });
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const h = hf[y * n + x];
        const chalk = fbm((x / n) * 6, (y / n) * 6, { octaves: 4, period: 6, seed: 55 });
        return clamp(0.58 + h * 0.16 + smoothstep(0.55, 1.0, chalk) * 0.26);
      },
      { repeat: 4 },
    );
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const h = hf[y * n + x];
        const chalk = smoothstep(0.5, 1.0, fbm((x / n) * 6, (y / n) * 6, { octaves: 4, period: 6, seed: 55 }));
        const c = mixRgb(rgb(PALETTE.trim), rgb(PALETTE.trimWorn), clamp(h * 0.4 + chalk * 0.85));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 4 },
    );
    return { map, normal, rough };
  });
}

/** Tyre sidewall: mould flash, ribbing and dust. */
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
    const rubber = rgb(PALETTE.rubber);
    const dust = rgb(PALETTE.rubberDust);
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
      const lugU = (u * rows + stagger) % 1;
      const lug = smoothstep(0.06, 0.16, lugU) * (1 - smoothstep(0.84, 0.94, lugU));
      const shoulder = smoothstep(0.16, 0.3, Math.abs(cv)) * (1 - smoothstep(0.44, 0.5, Math.abs(cv)));
      const centre = (1 - smoothstep(0.02, 0.13, Math.abs(cv))) * smoothstep(0.2, 0.34, (u * rows * 2) % 1);
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
        const edge = smoothstep(0.42, 0.5, Math.abs(cx)) + smoothstep(0.78, 1.0, v);
        return clamp(0.015 + wipe * 0.07 + dust * 0.05 + edge * 0.14, 0.015, 0.34);
      },
      { repeat: 1 },
    ),
  );
}

/**
 * Grubby film on the glass. Bright where dust has dried on outside the wiper
 * sweep, near-clear in the swept arc, so the screen reads as glass you can see
 * through rather than a black panel.
 */
export function glassFilmMap() {
  return cached('veh.glassFilm', () => {
    const film = rgb(0x8f8a7c);
    return pixelTexture(
      S,
      S,
      (x, y, out) => {
        const u = x / S;
        const v = y / S;
        const cx = u - 0.5;
        const cy = v - 0.12;
        const r = Math.hypot(cx * 1.15, cy);
        const swept = 1 - smoothstep(0.5, 0.58, r);
        const dust = fbm(u * 12, v * 12, { octaves: 5, period: 12, seed: 205 });
        const streak = fbm(u * 60, v * 6, { octaves: 3, period: 60, seed: 17 });
        const corners = smoothstep(0.4, 0.5, Math.abs(cx)) * 0.7 + smoothstep(0.8, 1.0, v) * 0.8;
        let d = clamp((dust * 0.5 + streak * 0.35 + corners) * (1 - swept * 0.82));
        d = clamp(d * 0.8);
        out[0] = film[0] * d;
        out[1] = film[1] * d;
        out[2] = film[2] * d;
        out[3] = 255;
      },
      { srgb: true, repeat: 1 },
    );
  });
}

/** Dried mud splatter, laid over the lower bodywork and inside the arches. */
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
        const c = mixRgb(rgb(PALETTE.dirtDark), rgb(PALETTE.dirtLight), blob);
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
    const base = rgb(PALETTE.interiorFabric);
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
      return bar * 0.85 + fbm((x / n) * 30, (y / n) * 30, { octaves: 3, period: 30, seed: 2 }) * 0.15;
    });
    const normal = normalFromHeight(hf, n, n, 3.0, { repeat: 3 });
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.42 + (1 - hf[y * n + x]) * 0.3), { repeat: 3 });
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const h = hf[y * n + x];
        const c = mixRgb(rgb(0x54585c), rgb(0x9aa0a4), clamp(h * 1.1));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 3 },
    );
    return { normal, rough, map };
  });
}

/** Spray-in bed liner: coarse, matte, high-grip speckle. */
export function bedLinerMaps() {
  return cached('veh.bedliner', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const blobs = worley(u * 30, v * 30, 30, 44).f1;
      return (
        (1 - smoothstep(0.0, 0.28, blobs)) * 0.7 + fbm(u * 70, v * 70, { octaves: 3, period: 70, seed: 12 }) * 0.3
      );
    });
    const normal = normalFromHeight(hf, n, n, 2.4, { repeat: 5 });
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.78 + (1 - hf[y * n + x]) * 0.18), { repeat: 5 });
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const h = hf[y * n + x];
        const c = mixRgb(rgb(0x191b1d), rgb(0x3b3e41), clamp(h * 0.9));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 5 },
    );
    return { normal, rough, map };
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
        out[0] = out[1] = out[2] = 68;
        out[3] = a * 255;
      },
      { srgb: true, repeat: 1 },
    );
  });
}

/**
 * Multi-facet reflector. Cells rather than concentric rings, because the bowl is
 * built from swept cones whose UVs run around the axis: a radial pattern would
 * smear into stripes, while facets read the same whichever way the seam falls.
 */
export function reflectorNormal() {
  return cached('veh.reflector', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const cell = worley(u * 11, v * 11, 11, 91);
      const dish = 1 - smoothstep(0.0, 0.34, cell.f1);
      return dish * 0.8 + fbm(u * 40, v * 40, { octaves: 2, period: 40, seed: 5 }) * 0.2;
    });
    return normalFromHeight(hf, n, n, 2.6, { repeat: 1 });
  });
}

/** Horizontal fresnel prisms, so a headlight lens is not a smooth disc. */
export function lensNormal() {
  return cached('veh.lens', () => {
    const n = 128;
    const hf = heightField(n, n, (x, y) => {
      const v = y / n;
      const bars = Math.abs(((v * 16) % 1) - 0.5) * 2;
      const flutes = Math.abs((((x / n) * 5) % 1) - 0.5) * 2;
      return bars * 0.7 + flutes * 0.3;
    });
    return normalFromHeight(hf, n, n, 1.6, { repeat: 1 });
  });
}

/** Prismatic tail-light / reflector lens cells. */
export function prismNormal() {
  return cached('veh.prism', () => {
    const n = 128;
    const hf = heightField(n, n, (x, y) => {
      const u = (x / n) * 9;
      const v = (y / n) * 9;
      const fu = Math.abs((u % 1) - 0.5) * 2;
      const fv = Math.abs((v % 1) - 0.5) * 2;
      return Math.max(fu, fv);
    });
    return normalFromHeight(hf, n, n, 2.6, { repeat: 1 });
  });
}

/**
 * Worn stencil decal. Drawn on a canvas, eroded by noise so it reads as vinyl
 * that has spent a couple of seasons in the sun. `map` + `alphaTest`, never
 * `alphaMap` — three samples alphaMap from green, which silently eats dark art.
 */
export function decalMap(kind = 'name') {
  return cached('veh.decal.' + kind, () => {
    const w = 512;
    const h = kind === 'name' ? 128 : 256;
    const tex = canvasTexture(w, (ctx, cw, ch) => {
      ctx.clearRect(0, 0, cw, ch);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (kind === 'name') {
        ctx.fillStyle = '#e8e2d4';
        ctx.font = `700 ${Math.round(ch * 0.52)}px "Arial Narrow", Arial, sans-serif`;
        ctx.setTransform(1, 0, -0.14, 1, ch * 0.09, 0);
        ctx.fillText('RIDGELINE', cw * 0.5, ch * 0.44);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#d4671f';
        ctx.fillRect(cw * 0.16, ch * 0.72, cw * 0.68, ch * 0.07);
        ctx.fillStyle = '#9aa0a4';
        ctx.font = `600 ${Math.round(ch * 0.15)}px Arial, sans-serif`;
        ctx.fillText('T R A I L   S E R I E S', cw * 0.5, ch * 0.88);
      } else if (kind === 'badge') {
        ctx.fillStyle = '#c9ced2';
        ctx.font = `700 ${Math.round(ch * 0.3)}px Arial, sans-serif`;
        ctx.fillText('4x4', cw * 0.5, ch * 0.32);
        ctx.fillStyle = '#d4671f';
        ctx.font = `700 ${Math.round(ch * 0.18)}px Arial, sans-serif`;
        ctx.fillText('OFF ROAD', cw * 0.5, ch * 0.62);
        ctx.strokeStyle = '#8f959a';
        ctx.lineWidth = ch * 0.02;
        ctx.strokeRect(cw * 0.16, ch * 0.12, cw * 0.68, ch * 0.68);
      } else {
        // stencilled unit number on the doors
        ctx.fillStyle = '#e3ddcd';
        ctx.font = `700 ${Math.round(ch * 0.62)}px Arial, sans-serif`;
        ctx.fillText('07', cw * 0.5, ch * 0.48);
      }

      // erode: punch holes with noise so the vinyl looks lifted and scuffed
      const img = ctx.getImageData(0, 0, cw, ch);
      const d = img.data;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const i = (y * cw + x) * 4;
          if (d[i + 3] === 0) continue;
          const n = fbm((x / cw) * 16, (y / ch) * 8, { octaves: 4, period: 16, seed: 707 });
          const scratch = fbm((x / cw) * 3, (y / ch) * 90, { octaves: 2, period: 3, seed: 21 });
          const wear = clamp(n * 1.25 + scratch * 0.3 - 0.28);
          d[i + 3] = wear > 0.34 ? 255 : 0;
        }
      }
      ctx.putImageData(img, 0, 0);
    }, { srgb: true, height: h, repeat: 1 });
    return tex;
  });
}

/** Small helper: build a ready-to-use painted-body material. */
export function makePaintMaterial(color = PALETTE.bodyPaint, opts = {}) {
  const { dirt = 1, dirtTag = String(color), dirtArch = 1, ...rest } = opts;
  const m = new THREE.MeshPhysicalMaterial({
    map: paintBaseMap(color),
    roughnessMap: paintRoughness(),
    normalMap: paintPeelNormal(),
    normalScale: new THREE.Vector2(0.22, 0.22),
    // Automotive paint is a dielectric basecoat under clear lacquer. Pushing
    // metalness up kills the hue and turns the truck into bare aluminium; the
    // clearcoat layer is what supplies the wet highlight.
    metalness: 0.04,
    roughness: 0.32,
    clearcoat: 1.0,
    clearcoatRoughness: 0.055,
    clearcoatNormalMap: paintFlakeNormal(),
    clearcoatNormalScale: new THREE.Vector2(0.055, 0.055),
    envMapIntensity: 1.5,
    ...rest,
  });
  if (dirt > 0) applyDirt(m, { amount: dirt, tag: 'paint' + dirtTag, arch: dirtArch });
  return m;
}
