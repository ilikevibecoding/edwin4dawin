// Procedural texture generation. Everything here is canvas / typed-array based:
// no external images. Textures come back as THREE.Texture objects ready for PBR use.
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Seeded randomness + tileable value noise
// ---------------------------------------------------------------------------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PERM = (() => {
  const rand = mulberry32(1337);
  const p = new Uint8Array(512);
  const base = [];
  for (let i = 0; i < 256; i++) base.push(i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  return p;
})();

function smooth(t) {
  return t * t * (3 - 2 * t);
}

// Tileable value noise: u,v in [0,1), freq integer => seamless across the tile.
export function vnoise(u, v, freq, seed = 0) {
  const x = u * freq;
  const y = v * freq;
  let xi = Math.floor(x);
  let yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  xi = ((xi % freq) + freq) % freq;
  yi = ((yi % freq) + freq) % freq;
  const xj = (xi + 1) % freq;
  const yj = (yi + 1) % freq;
  const s = seed & 255;
  const h = (i, j) => PERM[(PERM[(i + s) & 255] + j) & 255] / 255;
  const a = h(xi, yi);
  const b = h(xj, yi);
  const c = h(xi, yj);
  const d = h(xj, yj);
  const sx = smooth(xf);
  const sy = smooth(yf);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

// Anisotropic tileable value noise: independent integer frequencies per axis (streaks, brushing).
export function vnoise2(u, v, fu, fv, seed = 0) {
  const x = u * fu;
  const y = v * fv;
  let xi = Math.floor(x);
  let yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  xi = ((xi % fu) + fu) % fu;
  yi = ((yi % fv) + fv) % fv;
  const xj = (xi + 1) % fu;
  const yj = (yi + 1) % fv;
  const s = seed & 255;
  const h = (i, j) => PERM[(PERM[(i + s) & 255] + j) & 255] / 255;
  const a = h(xi, yi);
  const b = h(xj, yi);
  const c = h(xi, yj);
  const d = h(xj, yj);
  const sx = smooth(xf);
  const sy = smooth(yf);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

export function fbm(u, v, { octaves = 5, freq = 4, gain = 0.5, seed = 0 } = {}) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let f = freq;
  for (let o = 0; o < octaves; o++) {
    sum += vnoise(u, v, f, seed + o * 17) * amp;
    norm += amp;
    amp *= gain;
    f *= 2;
  }
  return sum / norm;
}

// Ridged / worley-ish helper for scratches and cells.
export function worley(u, v, freq, seed = 0) {
  const x = u * freq;
  const y = v * freq;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let best = 10;
  const s = seed & 255;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = (((xi + i) % freq) + freq) % freq;
      const cy = (((yi + j) % freq) + freq) % freq;
      const rx = PERM[(PERM[(cx + s) & 255] + cy) & 255] / 255;
      const ry = PERM[(PERM[(cy + s + 91) & 255] + cx) & 255] / 255;
      const dx = xi + i + rx - x;
      const dy = yi + j + ry - y;
      const d = dx * dx + dy * dy;
      if (d < best) best = d;
    }
  }
  return Math.sqrt(best);
}

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------
export function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function toTexture(canvas, { srgb = true, repeat = [1, 1], anisotropy = 8, wrap = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = anisotropy;
  t.repeat.set(repeat[0], repeat[1]);
  t.needsUpdate = true;
  return t;
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;

// A small builder that holds float channels for a material set and bakes them out.
export class TexGen {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    const n = w * h;
    this.r = new Float32Array(n).fill(1);
    this.g = new Float32Array(n).fill(1);
    this.b = new Float32Array(n).fill(1);
    this.rough = new Float32Array(n).fill(0.5);
    this.metal = new Float32Array(n).fill(0);
    this.height = new Float32Array(n).fill(0.5);
    // optional coverage channel (cut-out materials such as grating); null = opaque
    this.alpha = null;
  }

  // fn(u, v, i) -> void, may write channels through `this`
  each(fn) {
    const { w, h } = this;
    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        fn(x / w, v, y * w + x, x, y);
      }
    }
  }

  setColor(i, r, g, b) {
    this.r[i] = r;
    this.g[i] = g;
    this.b[i] = b;
  }

  mulColor(i, k) {
    this.r[i] *= k;
    this.g[i] *= k;
    this.b[i] *= k;
  }

  // Draw a 2D-canvas layer into the height / color channels (rgba canvas).
  // mode: "height" adds (alpha*amount) to height; "color" blends rgb by alpha.
  blendCanvas(canvas, { height = 0, colorMix = 0, rough = null, metal = null } = {}) {
    const ctx = canvas.getContext("2d");
    const img = ctx.getImageData(0, 0, this.w, this.h).data;
    const n = this.w * this.h;
    for (let i = 0; i < n; i++) {
      const a = img[i * 4 + 3] / 255;
      if (a <= 0) continue;
      if (height !== 0) this.height[i] += a * height;
      if (colorMix > 0) {
        const k = a * colorMix;
        this.r[i] = lerp(this.r[i], img[i * 4] / 255, k);
        this.g[i] = lerp(this.g[i], img[i * 4 + 1] / 255, k);
        this.b[i] = lerp(this.b[i], img[i * 4 + 2] / 255, k);
      }
      if (rough !== null) this.rough[i] = lerp(this.rough[i], rough, a);
      if (metal !== null) this.metal[i] = lerp(this.metal[i], metal, a);
    }
  }

  bake({ normalStrength = 2.0, anisotropy = 8 } = {}) {
    const { w, h } = this;
    const n = w * h;
    // albedo
    const cAlb = makeCanvas(w, h);
    const ctxA = cAlb.getContext("2d");
    const imgA = ctxA.createImageData(w, h);
    // roughness (G) + metalness (B) packed
    const cRM = makeCanvas(w, h);
    const ctxRM = cRM.getContext("2d");
    const imgRM = ctxRM.createImageData(w, h);
    for (let i = 0; i < n; i++) {
      imgA.data[i * 4] = clamp01(this.r[i]) * 255;
      imgA.data[i * 4 + 1] = clamp01(this.g[i]) * 255;
      imgA.data[i * 4 + 2] = clamp01(this.b[i]) * 255;
      imgA.data[i * 4 + 3] = this.alpha ? clamp01(this.alpha[i]) * 255 : 255;
      imgRM.data[i * 4] = 255;
      imgRM.data[i * 4 + 1] = clamp01(this.rough[i]) * 255;
      imgRM.data[i * 4 + 2] = clamp01(this.metal[i]) * 255;
      imgRM.data[i * 4 + 3] = 255;
    }
    ctxA.putImageData(imgA, 0, 0);
    ctxRM.putImageData(imgRM, 0, 0);
    const normal = heightToNormal(this.height, w, h, normalStrength);
    return {
      map: toTexture(cAlb, { srgb: true, anisotropy }),
      roughnessMap: toTexture(cRM, { srgb: false, anisotropy }),
      metalnessMap: null, // set below (same texture object is shared)
      normalMap: toTexture(normal, { srgb: false, anisotropy }),
    };
  }
}

export function heightToNormal(height, w, h, strength = 2.0) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const ym = ((y - 1 + h) % h) * w;
    const yp = ((y + 1) % h) * w;
    const y0 = y * w;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w;
      const xp = (x + 1) % w;
      const dhdx = (height[y0 + xp] - height[y0 + xm]) * 0.5 * strength;
      // canvas y grows downward; texture v grows upward (flipY) => up = y-1
      const dhdv = (height[ym + x] - height[yp + x]) * 0.5 * strength;
      let nx = -dhdx;
      let ny = -dhdv;
      let nz = 1;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= inv;
      ny *= inv;
      nz *= inv;
      const i = (y0 + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * 0.5 + 0.5) * 255;
      d[i + 2] = (nz * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Helper: soft edge distance for a panel that occupies the whole tile (0..1 => distance to nearest edge)
function edgeDist(u, v) {
  return Math.min(u, 1 - u, v, 1 - v);
}

// ---------------------------------------------------------------------------
// Material texture sets
// ---------------------------------------------------------------------------

// Painted hull panel: white-ish multiplier texture (vertex color supplies the paint tint),
// chipped edges revealing bare metal, grime, rivets, beveled edges in the normal map.
export function makePaintedPanel(size = 512, seed = 11) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const dents = [];
  for (let i = 0; i < 6; i++) dents.push([rand(), rand(), 0.02 + rand() * 0.05, rand() * 0.6 + 0.2]);
  const rivetInset = 0.055;
  const rivets = [
    [rivetInset, rivetInset],
    [1 - rivetInset, rivetInset],
    [rivetInset, 1 - rivetInset],
    [1 - rivetInset, 1 - rivetInset],
  ];
  t.each((u, v, i) => {
    const ed = edgeDist(u, v);
    // base paint: slight warm variation
    const n1 = fbm(u, v, { octaves: 4, freq: 6, seed: seed });
    const n2 = fbm(u, v, { octaves: 5, freq: 16, seed: seed + 5 });
    let lum = 0.92 + (n1 - 0.5) * 0.1 + (n2 - 0.5) * 0.05;
    // grime concentrating near edges (slightly warm-dark, like handled paint)
    const grime = clamp01(1 - ed / 0.16) * fbm(u, v, { octaves: 4, freq: 9, seed: seed + 9 });
    // streaky dirt running down (v direction)
    const streak = Math.pow(fbm(u * 1.0, v * 0.15, { octaves: 3, freq: 20, seed: seed + 21 }), 3);
    lum *= 1 - streak * 0.1;
    // broad handling smudges across the face so the centre is never one flat tone
    const smudge = fbm(u, v, { octaves: 3, freq: 2.5, seed: seed + 31 });
    const smudgeK = clamp01((smudge - 0.5) * 2.2) * 0.07;
    lum *= 1 - smudgeK;
    let r = lum * (1 - grime * 0.18),
      g = lum * 0.995 * (1 - grime * 0.21),
      b = lum * 0.985 * (1 - grime * 0.25);
    let rough = 0.5 + (n2 - 0.5) * 0.25 + grime * 0.28 + smudgeK * 1.5;
    let metal = 0;
    // bevel height
    let hgt = 0.5 + clamp01(ed / 0.03) * 0.35;
    // dents (paint also tends to flake inside them)
    let dentK = 0;
    for (const [dx, dy, dr, ds] of dents) {
      const dd = Math.hypot(u - dx, v - dy);
      if (dd < dr) {
        const k = smooth(1 - dd / dr);
        hgt -= k * 0.08 * ds;
        rough += k * 0.15;
        dentK = Math.max(dentK, k * ds);
      }
    }
    // edge wear: paint polished lighter and smoother along the bevel where hands / gear rub
    const wearBand = smooth(clamp01(1 - Math.abs(ed - 0.028) / 0.022));
    const wearNoise = fbm(u, v, { octaves: 3, freq: 30, seed: seed + 13 });
    const wear = wearBand * clamp01((wearNoise - 0.48) * 3);
    r += wear * 0.07;
    g += wear * 0.07;
    b += wear * 0.06;
    rough -= wear * 0.18;
    // chipping: small flakes of paint gone, exposing grey primer (dielectric — a metallic chip would only
    // mirror the dark interior and read as a black blot). Confined to the outer ~4% of the panel, its
    // corners and the dents; the centre stays clean (the noise threshold there is ~never met).
    const chipNoise = fbm(u, v, { octaves: 3, freq: 48, seed: seed + 3 });
    // some stretches of edge stay intact: modulate by a slow noise along the perimeter
    const edgeVar = 0.3 + 0.7 * clamp01((fbm(u, v, { octaves: 2, freq: 3, seed: seed + 17 }) - 0.4) * 3.2);
    const edgeBias = Math.pow(clamp01(1 - ed / 0.045), 1.6) * edgeVar;
    const cornerBias = clamp01(1 - Math.hypot(Math.min(u, 1 - u), Math.min(v, 1 - v)) / 0.08);
    const chipMask = chipNoise - (0.93 - edgeBias * 0.3 - cornerBias * 0.06 - dentK * 0.28);
    if (chipMask > 0) {
      const k = clamp01(chipMask * 45);
      const m = 0.6 + (n2 - 0.5) * 0.1;
      r = lerp(r, m * 0.98, k);
      g = lerp(g, m * 1.0, k);
      b = lerp(b, m * 1.03, k);
      rough = lerp(rough, 0.62, k);
      metal = lerp(metal, 0.1, k);
      hgt -= k * 0.05;
    }
    // fine scratches (light, glancing)
    const sc = worley(u, v, 18, seed + 7);
    if (sc < 0.014) {
      const k = 1 - sc / 0.014;
      r = lerp(r, 0.6, k * 0.45);
      g = lerp(g, 0.6, k * 0.45);
      b = lerp(b, 0.62, k * 0.45);
      hgt -= k * 0.03;
      rough -= k * 0.08;
      metal = lerp(metal, 0.2, k * 0.5);
    }
    // rivets
    for (const [rx, ry] of rivets) {
      const dd = Math.hypot(u - rx, v - ry);
      if (dd < 0.02) {
        const k = smooth(clamp01(1 - dd / 0.02));
        hgt += k * 0.25;
        const ring = dd > 0.014 ? 1 : 0.7;
        r = lerp(r, 0.6 * ring, 0.85);
        g = lerp(g, 0.61 * ring, 0.85);
        b = lerp(b, 0.64 * ring, 0.85);
        rough = 0.42;
        metal = 1;
      }
    }
    t.setColor(i, r, g, b);
    t.rough[i] = clamp01(rough);
    t.metal[i] = clamp01(metal);
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 3.0 }));
}

// Brushed / worn metal, tileable. Vertex colors / material color tint it.
export function makeWornMetal(size = 1024, seed = 23) {
  const t = new TexGen(size, size);
  t.each((u, v, i) => {
    // brushed grain along u: fine, low-contrast in albedo (real brushing shows up in the roughness /
    // specular, not as visible light-and-dark bands, which read as wood grain). Strokes are short
    // (~4 cm at 1 m tiling) and 2–3 mm tall; long coherent strokes read as motion blur on a flat plate.
    const streak = vnoise2(u, v, 24, 300, seed) * 0.55 + vnoise2(u, v, 20, 520, seed + 3) * 0.45;
    const blotch = fbm(u, v, { octaves: 4, freq: 3, seed: seed + 2 });
    const spots = fbm(u, v, { octaves: 5, freq: 12, seed: seed + 6 });
    let lum = 0.66 + (streak - 0.5) * 0.06 + (blotch - 0.5) * 0.045;
    // dull oxidised patches
    const dull = clamp01((spots - 0.6) * 6);
    lum *= 1 - dull * 0.1;
    let rough = 0.36 + (streak - 0.5) * 0.16 + dull * 0.32 + (blotch - 0.5) * 0.1;
    let hgt = 0.5 + (streak - 0.5) * 0.05 + (spots - 0.5) * 0.04;
    // scratches
    const sc = worley(u, v, 10, seed + 4);
    if (sc < 0.012) {
      const k = 1 - sc / 0.012;
      lum += k * 0.18;
      hgt -= k * 0.06;
      rough -= k * 0.1;
    }
    const sc2 = worley(u, v, 22, seed + 8);
    if (sc2 < 0.006) {
      const k = 1 - sc2 / 0.006;
      lum -= k * 0.12;
      hgt -= k * 0.04;
    }
    t.setColor(i, lum, lum * 1.0, lum * 1.03);
    t.rough[i] = clamp01(rough);
    t.metal[i] = 1;
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 1.6 }));
}

// Deck plating: large plates with recessed seams, anti-slip knurl, rivets and scuffs.
export function makeDeckPlate(size = 1024, seed = 41) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const scuffs = [];
  for (let i = 0; i < 26; i++) {
    scuffs.push({ x: rand(), y: rand(), a: rand() * Math.PI, l: 0.08 + rand() * 0.25, w: 0.003 + rand() * 0.006, k: rand() });
  }
  const plates = 2; // 2x2 plates per tile
  t.each((u, v, i) => {
    const pu = (u * plates) % 1;
    const pv = (v * plates) % 1;
    const ed = edgeDist(pu, pv);
    const n1 = fbm(u, v, { octaves: 4, freq: 5, seed: seed });
    const n2 = fbm(u, v, { octaves: 5, freq: 24, seed: seed + 3 });
    // Worn *painted* plating rather than bare metal: a metalness-1 floor has no diffuse term, so
    // away from a specular highlight it renders black no matter how many lights are in the room.
    // Paint/oxide base (metalness 0.35) with the metal showing through on the raised knurl tops,
    // rivet heads and bright scuffs.
    let lum = 0.42 + (n1 - 0.5) * 0.14 + (n2 - 0.5) * 0.08;
    let rough = 0.62 + (n2 - 0.5) * 0.2;
    let metal = 0.35 + (n1 - 0.5) * 0.2;
    let hgt = 0.55;
    // seams between plates
    const seam = 0.018;
    if (ed < seam) {
      const k = 1 - ed / seam;
      hgt -= 0.35 * smooth(k);
      lum *= 0.55;
      rough += 0.25;
      metal = 0.2;
    } else {
      // knurl: raised dots in a grid, rotated 45deg
      const kx = (pu + pv) * 42;
      const ky = (pu - pv) * 42;
      const dx = kx - Math.round(kx);
      const dy = ky - Math.round(ky);
      const dd = Math.hypot(dx, dy);
      if (dd < 0.28) {
        const k = smooth(1 - dd / 0.28);
        hgt += k * 0.12;
        lum += k * 0.06;
        // boots polish the paint off the dot tops
        const worn = smooth(clamp01((k - 0.55) / 0.45)) * clamp01((n2 - 0.35) * 2.5);
        metal = lerp(metal, 0.75, worn);
        rough = lerp(rough, 0.42, worn);
      }
      // rivets in plate corners
      const rin = 0.06;
      const cx = pu < 0.5 ? rin : 1 - rin;
      const cy = pv < 0.5 ? rin : 1 - rin;
      const rd = Math.hypot(pu - cx, pv - cy);
      if (rd < 0.022) {
        const k = smooth(1 - rd / 0.022);
        hgt += k * 0.3;
        lum = lerp(lum, 0.55, 0.6);
        rough = 0.4;
        metal = 0.85;
      }
    }
    // dark grime toward seams
    const grime = clamp01(1 - ed / 0.12) * fbm(u, v, { octaves: 3, freq: 10, seed: seed + 11 });
    lum *= 1 - grime * 0.35;
    rough += grime * 0.2;
    metal *= 1 - grime * 0.5;
    // scuff marks: bright ones are paint worn through to steel, dark ones are rubber drag
    for (const s of scuffs) {
      const dx = u - s.x;
      const dy = v - s.y;
      const along = dx * Math.cos(s.a) + dy * Math.sin(s.a);
      const perp = -dx * Math.sin(s.a) + dy * Math.cos(s.a);
      if (Math.abs(along) < s.l && Math.abs(perp) < s.w) {
        const k = (1 - Math.abs(perp) / s.w) * (1 - Math.abs(along) / s.l) * 0.8;
        lum = lerp(lum, s.k > 0.5 ? 0.62 : 0.18, k);
        rough = lerp(rough, s.k > 0.5 ? 0.3 : 0.75, k);
        metal = lerp(metal, s.k > 0.5 ? 0.9 : 0.1, k);
      }
    }
    t.setColor(i, lum * 1.0, lum * 0.98, lum * 0.95);
    t.rough[i] = clamp01(rough);
    t.metal[i] = clamp01(metal);
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 2.2 }));
}

// Dark rubber / textured plastic (trim, seat bolsters, mats).
export function makeRubber(size = 256, seed = 53) {
  const t = new TexGen(size, size);
  t.each((u, v, i) => {
    const n = fbm(u, v, { octaves: 5, freq: 24, seed });
    const n2 = fbm(u, v, { octaves: 3, freq: 6, seed: seed + 2 });
    // charcoal, not black: 0.21 sRGB (~0.037 linear) is dark rubber that still shows its grain
    // under a ceiling light; the old 0.14 rendered as a void wherever it covered a floor
    const lum = 0.21 + (n - 0.5) * 0.07 + (n2 - 0.5) * 0.06;
    t.setColor(i, lum, lum, lum * 1.05);
    t.rough[i] = clamp01(0.86 + (n - 0.5) * 0.15);
    t.metal[i] = 0;
    t.height[i] = 0.5 + (n - 0.5) * 0.3;
  });
  return finish(t.bake({ normalStrength: 1.4 }));
}

// Woven fabric: for the bunk mattress / blanket and seat cushions.
export function makeFabric(size = 256, seed = 67) {
  const t = new TexGen(size, size);
  t.each((u, v, i) => {
    const wx = Math.sin(u * Math.PI * 2 * 48);
    const wy = Math.sin(v * Math.PI * 2 * 48);
    const weave = (wx * wy + 1) * 0.5;
    const n = fbm(u, v, { octaves: 4, freq: 8, seed });
    const fuzz = fbm(u, v, { octaves: 3, freq: 64, seed: seed + 4 });
    const lum = 0.9 + (n - 0.5) * 0.15 + (weave - 0.5) * 0.1 + (fuzz - 0.5) * 0.08;
    t.setColor(i, lum, lum, lum);
    t.rough[i] = clamp01(0.92 + (weave - 0.5) * 0.1);
    t.metal[i] = 0;
    t.height[i] = 0.5 + (weave - 0.5) * 0.25 + (fuzz - 0.5) * 0.1;
  });
  return finish(t.bake({ normalStrength: 1.2 }));
}

// Hazard stripes (orange/near-black), worn.
export function makeHazard(size = 256, seed = 71, colA = [0.92, 0.72, 0.18], colB = [0.1, 0.1, 0.11]) {
  const t = new TexGen(size, size);
  t.each((u, v, i) => {
    const s = ((u + v) * 4) % 1;
    const stripe = s < 0.5 ? 1 : 0;
    const n = fbm(u, v, { octaves: 4, freq: 12, seed });
    const wear = clamp01((n - 0.55) * 5);
    let r, g, b;
    if (stripe) [r, g, b] = colA;
    else [r, g, b] = colB;
    const m = 1 - wear * 0.6;
    t.setColor(i, lerp(r * m, 0.35, wear * 0.5), lerp(g * m, 0.35, wear * 0.5), lerp(b * m, 0.37, wear * 0.5));
    t.rough[i] = 0.5 + wear * 0.3;
    t.metal[i] = wear * 0.8;
    t.height[i] = 0.5 - wear * 0.05;
  });
  return finish(t.bake({ normalStrength: 1.0 }));
}

// Floor grating as a cut-out texture: one tile = GRATE_TILE metres (x across the trench, z along it),
// 5 rails running along z and a crossbar every 9 cm. A single textured quad with mipmaps replaces
// ~180 thin boxes, which shimmered into moiré arcs in the distance.
export const GRATE_TILE = [1.24, 0.9];
export function makeGrate(w = 1024, h = 768, seed = 61) {
  const t = new TexGen(w, h);
  t.alpha = new Float32Array(w * h);
  const railHalf = 0.017 / 1.24;
  const barHalf = 0.011 / 0.9;
  const bars = 10;
  const px = 1 / w;
  t.each((u, v, i) => {
    // distance to the nearest rail (u wraps) and crossbar (v wraps)
    const du = Math.abs(((u * 4 + 0.5) % 1) - 0.5) / 4;
    const dv = Math.abs(((v * bars + 0.5) % 1) - 0.5) / bars;
    const railK = clamp01((railHalf - du) / px + 0.5);
    const barK = clamp01((barHalf - dv) / (1 / h) + 0.5);
    const cover = Math.max(railK, barK);
    const streak = vnoise(u * 0.02, v, 260, seed) * 0.6 + vnoise(u, v * 0.02, 260, seed + 1) * 0.4;
    const grime = fbm(u, v, { octaves: 4, freq: 5, seed: seed + 2 });
    let lum = 0.58 + (streak - 0.5) * 0.08 - grime * 0.12;
    if (railK > barK) lum *= 0.85;
    // worn bright tops where boots land
    const wear = clamp01((fbm(u, v, { octaves: 3, freq: 3, seed: seed + 4 }) - 0.55) * 4);
    lum += wear * 0.14 * barK;
    t.setColor(i, lum, lum * 1.01, lum * 1.04);
    t.rough[i] = clamp01(0.46 + (streak - 0.5) * 0.2 + grime * 0.2 - wear * 0.18);
    t.metal[i] = 1;
    // alpha never quite zero: canvases store premultiplied colour, and a fully transparent texel would
    // turn black and darken the mip chain
    t.alpha[i] = 0.02 + 0.98 * cover;
    t.height[i] = 0.25 + cover * 0.45 + (streak - 0.5) * 0.04;
  });
  return finish(t.bake({ normalStrength: 1.4 }));
}

function finish(set) {
  set.metalnessMap = set.roughnessMap;
  return set;
}

// ---------------------------------------------------------------------------
// Emissive screens (UI graphics) — used as emissiveMap on console faces
// ---------------------------------------------------------------------------
export function makeScreen(w = 512, h = 256, seed = 5, accent = "#4fd8cc", warn = "#f08a3c") {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  ctx.fillStyle = "#04090c";
  ctx.fillRect(0, 0, w, h);
  // faint grid
  ctx.strokeStyle = "rgba(79,216,204,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  const pad = 14;
  // header bar
  ctx.fillStyle = accent;
  ctx.fillRect(pad, pad, w - pad * 2, 3);
  ctx.fillRect(pad, pad + 8, 60 + rand() * 80, 10);
  ctx.fillStyle = "rgba(79,216,204,0.5)";
  for (let k = 0; k < 3; k++) ctx.fillRect(w - pad - 90 + k * 30, pad + 8, 20, 10);
  // left column: text-like blocks
  let y = pad + 34;
  while (y < h - pad - 60) {
    const lw = 40 + rand() * 120;
    ctx.fillStyle = rand() < 0.15 ? warn : "rgba(79,216,204,0.75)";
    ctx.fillRect(pad, y, lw, 6);
    ctx.fillStyle = "rgba(79,216,204,0.3)";
    ctx.fillRect(pad + lw + 8, y, 30 + rand() * 40, 6);
    y += 14;
  }
  // graph area
  const gx = w * 0.45;
  const gy = pad + 34;
  const gw = w - pad - gx;
  const gh = h * 0.42;
  ctx.strokeStyle = "rgba(79,216,204,0.35)";
  ctx.strokeRect(gx, gy, gw, gh);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const px = gx + (i / 40) * gw;
    const py = gy + gh * (0.5 + Math.sin(i * 0.6 + seed) * 0.25 + (rand() - 0.5) * 0.15);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // bars along bottom
  const by = h - pad - 40;
  for (let i = 0; i < 12; i++) {
    const bh = 6 + rand() * 30;
    ctx.fillStyle = rand() < 0.2 ? warn : accent;
    ctx.globalAlpha = 0.5 + rand() * 0.5;
    ctx.fillRect(pad + i * ((w - pad * 2) / 12), by + 34 - bh, (w - pad * 2) / 12 - 6, bh);
  }
  ctx.globalAlpha = 1;
  // ring gauge
  const cx = w - pad - 44;
  const cy = h - pad - 46;
  ctx.strokeStyle = "rgba(79,216,204,0.3)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = warn;
  ctx.beginPath();
  ctx.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * (0.6 + rand() * 1.2));
  ctx.stroke();
  // scanlines
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  for (let yy = 0; yy < h; yy += 3) ctx.fillRect(0, yy, w, 1);
  return toTexture(c, { srgb: true, wrap: false });
}

// Small indicator-light strip: row of coloured LEDs on dark panel.
export function makeLedStrip(w = 256, h = 32, seed = 9) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  ctx.fillStyle = "#050607";
  ctx.fillRect(0, 0, w, h);
  const colors = ["#4fd8cc", "#4fd8cc", "#f08a3c", "#ffd27a", "#2a6f8f", "#4fd8cc"];
  for (let x = 8; x < w - 8; x += 16) {
    if (rand() < 0.3) continue;
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.beginPath();
    ctx.arc(x, h / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c, { srgb: true, wrap: false });
}

// Light-fixture diffuser: emissive multiplier that is full-bright down the middle and falls off to the
// edges and ends, with a faint mottle, so a strip light reads as a diffuser over a tube instead of a
// flat white rectangle. Mapped 0..1 across each emitter face.
export function makeDiffuser(size = 256, seed = 13) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const g = (t) => 0.3 + 0.7 * (1 - Math.pow(Math.abs(2 * t - 1), 3.5));
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const mottle = 1 + (fbm(u, v, { octaves: 3, freq: 6, seed }) - 0.5) * 0.08;
      const k = clamp01(g(u) * g(v) * mottle);
      const i = (y * size + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = k * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: true, wrap: false });
}

// ---------------------------------------------------------------------------
// Imperial stencil decals: a 4x4 sheet (transparent background) of Aurebesh-style stencils, deck numbers,
// hazard chevrons, restricted bands and the cog emblem. Cell index -> uv rect via decalRect().
// The glyph alphabet is an original angular design in the spirit of the films' signage.
// ---------------------------------------------------------------------------
export const DECAL_CELLS = 4;
export const DECAL = {
  EMBLEM: 0,
  RESTRICTED: 1,
  HAZARD_BAND: 2,
  DECK_A: 3,
  NUMBER0: 4, // 4..7 = numerals 1..4 in Aurebesh-style digits + latin
  NUMBER1: 5,
  NUMBER2: 6,
  NUMBER3: 7,
  ARROW: 8,
  TEXT_A: 9,
  TEXT_B: 10,
  TEXT_C: 11,
  WARNING: 12,
  SPEC_PLATE: 13,
  BAY_CODE: 14,
  EMBLEM_RED: 15,
};

export function decalRect(index) {
  const c = index % DECAL_CELLS;
  const r = Math.floor(index / DECAL_CELLS);
  const s = 1 / DECAL_CELLS;
  return [c * s, 1 - (r + 1) * s, (c + 1) * s, 1 - r * s];
}

// Angular glyph strokes on a unit cell (x right, y down), ~22 letters + 10 digits.
const GLYPHS = [
  [[[0, 1], [0, 0], [1, 0], [1, 0.5], [0.4, 0.5]]],
  [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0.4]]],
  [[[1, 0], [0, 0.5], [1, 1]], [[0.3, 0.5], [1, 0.5]]],
  [[[0, 1], [0, 0], [0.7, 0], [1, 0.3], [1, 1]]],
  [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]], [[0.2, 1], [0.8, 1]]],
  [[[0, 0.3], [0.5, 0], [1, 0.3], [1, 1]], [[0, 0.3], [0, 1]]],
  [[[0, 1], [0, 0], [1, 0.5], [0, 0.5]]],
  [[[0, 0], [0, 1], [1, 1]], [[0.5, 0.5], [1, 0.5]]],
  [[[0, 0], [1, 0], [0.5, 0.5], [1, 1], [0, 1]]],
  [[[0, 0.5], [0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]]],
  [[[0, 0], [1, 1]], [[0, 1], [1, 0]], [[0.5, 0], [0.5, 1]]],
  [[[0, 1], [0.5, 0], [1, 1]], [[0.25, 0.5], [0.75, 0.5]]],
  [[[0, 0], [1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
  [[[0, 1], [0, 0], [1, 0]], [[0, 0.5], [0.6, 0.5], [0.6, 1]]],
  [[[0, 0], [0, 1], [1, 0.5], [0, 0]]],
  [[[1, 0], [0, 0], [0, 1], [1, 1], [1, 0.6]]],
  [[[0, 0], [1, 0]], [[1, 0], [0, 1]], [[0, 1], [1, 1]]],
  [[[0, 0.5], [1, 0.5]], [[0.5, 0], [0.5, 1]], [[0, 0], [1, 1]]],
  [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
  [[[0, 1], [1, 0.5], [0, 0]], [[1, 0.5], [1, 1]]],
  [[[0, 0], [0.5, 0.5], [1, 0]], [[0.5, 0.5], [0.5, 1]]],
  [[[0.5, 0], [0, 0.4], [0.5, 1], [1, 0.4], [0.5, 0]]],
];
const DIGITS = [
  [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
  [[[0.5, 0], [0.5, 1]], [[0.2, 1], [0.8, 1]]],
  [[[0, 0], [1, 0], [1, 0.5], [0, 0.5], [0, 1], [1, 1]]],
  [[[0, 0], [1, 0], [1, 1], [0, 1]], [[0.4, 0.5], [1, 0.5]]],
  [[[0, 0], [0, 0.5], [1, 0.5]], [[1, 0], [1, 1]]],
  [[[1, 0], [0, 0], [0, 0.5], [1, 0.5], [1, 1], [0, 1]]],
  [[[1, 0], [0, 0.5], [0, 1], [1, 1], [1, 0.5], [0, 0.5]]],
  [[[0, 0], [1, 0], [0.3, 1]]],
  [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]], [[0, 0.5], [1, 0.5]]],
  [[[1, 0.5], [0, 0.5], [0, 0], [1, 0], [1, 1]]],
];

/** Draw an Aurebesh-style string: `text` letters/digits map to glyphs; x,y top-left; cell height h. */
export function drawGlyphs(ctx, text, x, y, h, color, weight = 0.14) {
  ctx.strokeStyle = color;
  ctx.lineWidth = h * weight;
  ctx.lineCap = "square";
  ctx.lineJoin = "miter";
  const w = h * 0.72;
  let cx = x;
  for (const ch of text) {
    if (ch === " ") {
      cx += w * 0.7;
      continue;
    }
    let g;
    if (ch >= "0" && ch <= "9") g = DIGITS[ch.charCodeAt(0) - 48];
    else g = GLYPHS[(ch.toUpperCase().charCodeAt(0) - 65 + 26) % GLYPHS.length];
    const pad = h * weight * 0.6;
    for (const stroke of g) {
      ctx.beginPath();
      stroke.forEach(([gx, gy], i) => {
        const px = cx + pad + gx * (w - pad * 2);
        const py = y + pad + gy * (h - pad * 2);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
    cx += w * 1.15;
  }
  return cx - x;
}

/** Imperial-style cog emblem: outer ring, six inward tabs, inner disc + ring. Drawn centred at (cx,cy). */
export function drawEmblem(ctx, cx, cy, R, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  // outer ring
  ctx.lineWidth = R * 0.14;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.9, 0, Math.PI * 2);
  ctx.stroke();
  // six tabs
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i / 6) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(-R * 0.2, -R * 0.86);
    ctx.lineTo(R * 0.2, -R * 0.86);
    ctx.lineTo(R * 0.13, -R * 0.5);
    ctx.lineTo(-R * 0.13, -R * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // inner ring + disc
  ctx.lineWidth = R * 0.1;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function makeDecalSheet(size = 1024, seed = 19) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const cell = size / DECAL_CELLS;
  const WHITE = "#dfe4ee";
  const RED = "#e63b2e";
  const AMBER = "#f0b040";
  const BLACK = "#0c0d10";
  const at = (i, fn) => {
    const cx = (i % DECAL_CELLS) * cell;
    const cy = Math.floor(i / DECAL_CELLS) * cell;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.rect(0, 0, cell, cell);
    ctx.clip();
    fn(cell);
    ctx.restore();
  };
  const chevrons = (x, y, w, h, n, color) => {
    ctx.fillStyle = color;
    const step = w / n;
    for (let k = 0; k < n; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * step, y);
      ctx.lineTo(x + k * step + step * 0.5, y);
      ctx.lineTo(x + k * step + step * 0.5 + h * 0.6, y + h);
      ctx.lineTo(x + k * step + h * 0.6, y + h);
      ctx.closePath();
      ctx.fill();
    }
  };
  at(DECAL.EMBLEM, (s) => drawEmblem(ctx, s / 2, s / 2, s * 0.44, WHITE));
  at(DECAL.EMBLEM_RED, (s) => drawEmblem(ctx, s / 2, s / 2, s * 0.44, RED));
  at(DECAL.RESTRICTED, (s) => {
    ctx.fillStyle = RED;
    ctx.fillRect(s * 0.06, s * 0.3, s * 0.88, s * 0.4);
    drawGlyphs(ctx, "RESTRICTED", s * 0.1, s * 0.38, s * 0.24, BLACK, 0.16);
    chevrons(s * 0.06, s * 0.12, s * 0.88, s * 0.1, 6, RED);
    chevrons(s * 0.06, s * 0.78, s * 0.88, s * 0.1, 6, RED);
  });
  at(DECAL.HAZARD_BAND, (s) => chevrons(s * 0.02, s * 0.3, s * 0.96, s * 0.4, 4, AMBER));
  at(DECAL.DECK_A, (s) => {
    drawGlyphs(ctx, "DECK", s * 0.14, s * 0.18, s * 0.28, WHITE);
    ctx.fillStyle = WHITE;
    ctx.fillRect(s * 0.12, s * 0.52, s * 0.76, s * 0.04);
    drawGlyphs(ctx, "07", s * 0.3, s * 0.6, s * 0.3, AMBER);
  });
  for (let n = 0; n < 4; n++) {
    at(DECAL.NUMBER0 + n, (s) => {
      drawGlyphs(ctx, String(n + 1), s * 0.3, s * 0.12, s * 0.5, WHITE, 0.18);
      ctx.fillStyle = WHITE;
      ctx.font = `bold ${s * 0.22}px "DejaVu Sans", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(String(n + 1), s / 2, s * 0.9);
    });
  }
  at(DECAL.ARROW, (s) => {
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.moveTo(s * 0.1, s * 0.36);
    ctx.lineTo(s * 0.55, s * 0.36);
    ctx.lineTo(s * 0.55, s * 0.2);
    ctx.lineTo(s * 0.92, s * 0.47);
    ctx.lineTo(s * 0.55, s * 0.74);
    ctx.lineTo(s * 0.55, s * 0.58);
    ctx.lineTo(s * 0.1, s * 0.58);
    ctx.closePath();
    ctx.fill();
    drawGlyphs(ctx, "HANGAR", s * 0.12, s * 0.78, s * 0.14, WHITE);
  });
  at(DECAL.TEXT_A, (s) => {
    drawGlyphs(ctx, "SECTOR", s * 0.08, s * 0.2, s * 0.2, WHITE);
    drawGlyphs(ctx, "TK 421", s * 0.08, s * 0.5, s * 0.2, WHITE);
    ctx.fillStyle = AMBER;
    ctx.fillRect(s * 0.08, s * 0.8, s * 0.84, s * 0.05);
  });
  at(DECAL.TEXT_B, (s) => {
    for (let k = 0; k < 4; k++) drawGlyphs(ctx, ["POWER", "COUPLING", "ACCESS", "LEVEL 3"][k], s * 0.08, s * 0.12 + k * s * 0.2, s * 0.14, k === 3 ? RED : WHITE, 0.14);
  });
  at(DECAL.TEXT_C, (s) => {
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = s * 0.03;
    ctx.strokeRect(s * 0.08, s * 0.12, s * 0.84, s * 0.76);
    drawGlyphs(ctx, "CARGO", s * 0.16, s * 0.22, s * 0.22, WHITE);
    drawGlyphs(ctx, "CLASS B", s * 0.16, s * 0.56, s * 0.18, AMBER);
  });
  at(DECAL.WARNING, (s) => {
    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.08);
    ctx.lineTo(s * 0.94, s * 0.82);
    ctx.lineTo(s * 0.06, s * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = BLACK;
    ctx.fillRect(s * 0.46, s * 0.3, s * 0.08, s * 0.3);
    ctx.fillRect(s * 0.46, s * 0.66, s * 0.08, s * 0.08);
    drawGlyphs(ctx, "HIGH ENERGY", s * 0.1, s * 0.86, s * 0.1, WHITE, 0.16);
  });
  at(DECAL.SPEC_PLATE, (s) => {
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = s * 0.02;
    ctx.strokeRect(s * 0.1, s * 0.15, s * 0.8, s * 0.7);
    for (let k = 0; k < 5; k++) drawGlyphs(ctx, ["KDY 1137", "IMP NAVY", "SER 0091", "LOT 14 A", "REDOUBT"][k], s * 0.14, s * 0.2 + k * s * 0.12, s * 0.08, WHITE, 0.16);
  });
  at(DECAL.BAY_CODE, (s) => {
    drawGlyphs(ctx, "BAY", s * 0.16, s * 0.12, s * 0.3, AMBER, 0.16);
    drawGlyphs(ctx, "3 27", s * 0.12, s * 0.5, s * 0.36, WHITE, 0.16);
  });
  // erode: knock out speckles + scuffed streaks so stencils look worn
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (d[i + 3] === 0) continue;
      const u = x / size;
      const n = fbm(u, v, { octaves: 3, freq: 60, seed: seed + 2 });
      const scuff = Math.pow(fbm(u * 0.3, v, { octaves: 3, freq: 40, seed: seed + 5 }), 2);
      let a = d[i + 3] / 255;
      a *= clamp01((n - 0.28) * 4.5);
      a *= 1 - scuff * 0.5;
      d[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = toTexture(c, { srgb: true, wrap: false });
  tex.anisotropy = 8;
  return tex;
}

// ---------------------------------------------------------------------------
// Imperial interior plating: dark painted steel with bevelled edges, faint sub-panel seams, scratches and
// edge grime. Vertex colour supplies the tint (plate / plateDark / plateBlue / plateLight).
// ---------------------------------------------------------------------------
export function makeImperialPanel(size = 512, seed = 5) {
  const t = new TexGen(size, size);
  t.each((u, v, i) => {
    const ed = edgeDist(u, v);
    const n1 = fbm(u, v, { octaves: 4, freq: 5, seed });
    const n2 = fbm(u, v, { octaves: 4, freq: 18, seed: seed + 3 });
    let lum = 0.9 + (n1 - 0.5) * 0.12 + (n2 - 0.5) * 0.05;
    const grime = clamp01(1 - ed / 0.12) * fbm(u, v, { octaves: 3, freq: 8, seed: seed + 9 });
    lum *= 1 - grime * 0.22;
    // sub-panel seam: one recessed line splitting the plate at a third
    const seamU = Math.abs(u - 0.66);
    const seamV = Math.abs(v - 0.34);
    let hgt = 0.5 + clamp01(ed / 0.025) * 0.3;
    let rough = 0.55 + (n2 - 0.5) * 0.2 + grime * 0.25;
    if (seamU < 0.006) {
      hgt -= 0.2 * (1 - seamU / 0.006);
      lum *= 0.8;
    }
    if (seamV < 0.006 && u > 0.66) {
      hgt -= 0.2 * (1 - seamV / 0.006);
      lum *= 0.8;
    }
    // scratches: glancing bright hairlines
    const sc = worley(u, v, 14, seed + 7);
    if (sc < 0.01) {
      const k = 1 - sc / 0.01;
      lum += k * 0.12;
      rough -= k * 0.15;
    }
    // edge polish
    const wear = smooth(clamp01(1 - Math.abs(ed - 0.02) / 0.015)) * clamp01((fbm(u, v, { octaves: 3, freq: 26, seed: seed + 13 }) - 0.5) * 3);
    lum += wear * 0.1;
    rough -= wear * 0.2;
    t.setColor(i, lum, lum * 1.0, lum * 1.02);
    t.rough[i] = clamp01(rough);
    t.metal[i] = 0.25 + wear * 0.5;
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 2.6 }));
}

// ---------------------------------------------------------------------------
// Exterior armour plating: irregular plate grid with recessed seams, per-plate paint variation, rivet rows,
// soot streaks, heat discolouration, scratches and dust. One tile ≈ 40 m of hull.
// ---------------------------------------------------------------------------
export function makeHullPlate(size = 2048, seed = 31) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  // irregular plate grid: 7 rows of varying height, each split into 3..6 plates with random cuts
  const rows = [];
  {
    let y = 0;
    const heights = [];
    for (let r = 0; r < 7; r++) heights.push(0.6 + rand() * 0.9);
    const total = heights.reduce((a, b) => a + b, 0);
    for (let r = 0; r < 7; r++) {
      const h = heights[r] / total;
      const n = 3 + Math.floor(rand() * 4);
      const cuts = [0];
      for (let k = 1; k < n; k++) cuts.push(k / n + (rand() - 0.5) * (0.4 / n));
      cuts.push(1);
      const shade = [];
      for (let k = 0; k < n; k++) shade.push((rand() - 0.5) * 0.14);
      rows.push({ y0: y, y1: y + h, cuts, shade, offset: rand() });
      y += h;
    }
  }
  const streaks = [];
  for (let i = 0; i < 40; i++) streaks.push({ x: rand(), y: rand(), len: 0.05 + rand() * 0.25, w: 0.004 + rand() * 0.01, k: rand() });
  const heat = [];
  for (let i = 0; i < 6; i++) heat.push({ x: rand(), y: rand(), r: 0.06 + rand() * 0.12 });
  t.each((u, v, i) => {
    // find row / plate
    let row = rows[rows.length - 1];
    for (const r of rows) {
      if (v >= r.y0 && v < r.y1) {
        row = r;
        break;
      }
    }
    const uu = (u + row.offset) % 1;
    let pi = 0;
    for (let k = 0; k < row.cuts.length - 1; k++) if (uu >= row.cuts[k] && uu < row.cuts[k + 1]) pi = k;
    const pu0 = row.cuts[pi];
    const pu1 = row.cuts[pi + 1];
    const pw = pu1 - pu0;
    const ph = row.y1 - row.y0;
    const lu = (uu - pu0) / pw; // local plate coords 0..1
    const lv = (v - row.y0) / ph;
    const edU = Math.min(lu, 1 - lu) * pw; // distance to seam in tile units
    const edV = Math.min(lv, 1 - lv) * ph;
    const ed = Math.min(edU, edV);
    const n1 = fbm(u, v, { octaves: 3, freq: 6, seed });
    const n2 = fbm(u, v, { octaves: 4, freq: 40, seed: seed + 3 });
    let lum = 0.72 + row.shade[pi] + (n1 - 0.5) * 0.08 + (n2 - 0.5) * 0.05;
    let rough = 0.58 + (n2 - 0.5) * 0.2;
    let metal = 0.55;
    let hgt = 0.5;
    // seams
    const seam = 0.004;
    if (ed < seam) {
      const k = 1 - ed / seam;
      hgt -= 0.4 * smooth(k);
      lum *= 0.45 + 0.2 * (1 - k);
      rough += 0.3;
    } else {
      hgt += clamp01((ed - seam) / 0.006) * 0.08;
      // rivet rows just inside the seams
      const rivetPitch = 0.012;
      const inU = Math.min(lu, 1 - lu) * pw;
      const inV = Math.min(lv, 1 - lv) * ph;
      if (inU > 0.008 && inU < 0.012) {
        const along = (v % rivetPitch) / rivetPitch;
        if (Math.abs(along - 0.5) < 0.15) {
          hgt += 0.12;
          lum += 0.05;
          metal = 0.9;
        }
      } else if (inV > 0.008 && inV < 0.012) {
        const along = (u % rivetPitch) / rivetPitch;
        if (Math.abs(along - 0.5) < 0.15) {
          hgt += 0.12;
          lum += 0.05;
          metal = 0.9;
        }
      }
      // sub-panel line across big plates
      if (pw > 0.25 && Math.abs(lu - 0.5) < 0.004) {
        hgt -= 0.15;
        lum *= 0.75;
      }
    }
    // grime toward seams
    const grime = clamp01(1 - ed / 0.03) * fbm(u, v, { octaves: 3, freq: 12, seed: seed + 11 });
    lum *= 1 - grime * 0.3;
    rough += grime * 0.15;
    // soot streaks trailing "aft" (+v)
    for (const s of streaks) {
      const dx = u - s.x;
      let dy = v - s.y;
      if (dy < 0) dy += 1;
      if (Math.abs(dx) < s.w && dy < s.len) {
        const k = (1 - Math.abs(dx) / s.w) * (1 - dy / s.len) * 0.7;
        lum = lerp(lum, s.k > 0.7 ? 0.85 : 0.3, k);
        rough = lerp(rough, s.k > 0.7 ? 0.35 : 0.85, k);
      }
    }
    let r = lum,
      g = lum * 1.0,
      b = lum * 1.03;
    // heat discolouration: warm-brown to blue-ish tint patches
    for (const hcirc of heat) {
      const dd = Math.hypot(u - hcirc.x, v - hcirc.y);
      if (dd < hcirc.r) {
        const k = smooth(1 - dd / hcirc.r) * 0.5;
        r = lerp(r, lum * 0.95, k);
        g = lerp(g, lum * 0.78, k);
        b = lerp(b, lum * 0.62, k);
        rough += k * 0.2;
      }
    }
    // fine scratches
    const sc = worley(u, v, 30, seed + 7);
    if (sc < 0.004) {
      const k = 1 - sc / 0.004;
      r += k * 0.15;
      g += k * 0.15;
      b += k * 0.15;
      rough -= k * 0.2;
    }
    // dust: light matte haze in low-frequency patches
    const dust = clamp01((fbm(u, v, { octaves: 2, freq: 3, seed: seed + 21 }) - 0.55) * 4) * 0.08;
    r += dust;
    g += dust;
    b += dust * 0.9;
    rough += dust * 2;
    t.setColor(i, clamp01(r), clamp01(g), clamp01(b));
    t.rough[i] = clamp01(rough);
    t.metal[i] = clamp01(metal - dust * 3);
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 3.2, anisotropy: 16 }));
}

// Black gloss deck (bridge / lobbies): near-black plates with a fine grid, scuffs and a soft sheen.
export function makeDeckBlack(size = 1024, seed = 43) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const scuffs = [];
  for (let i = 0; i < 30; i++) scuffs.push({ x: rand(), y: rand(), a: rand() * Math.PI, l: 0.05 + rand() * 0.2, w: 0.002 + rand() * 0.005 });
  const plates = 4;
  t.each((u, v, i) => {
    const pu = (u * plates) % 1;
    const pv = (v * plates) % 1;
    const ed = edgeDist(pu, pv);
    const n = fbm(u, v, { octaves: 4, freq: 6, seed });
    let lum = 0.16 + (n - 0.5) * 0.05;
    let rough = 0.32 + (n - 0.5) * 0.15;
    let hgt = 0.5;
    if (ed < 0.01) {
      const k = 1 - ed / 0.01;
      hgt -= 0.25 * smooth(k);
      lum *= 0.7;
      rough += 0.3;
    }
    for (const s of scuffs) {
      const dx = u - s.x;
      const dy = v - s.y;
      const along = dx * Math.cos(s.a) + dy * Math.sin(s.a);
      const perp = -dx * Math.sin(s.a) + dy * Math.cos(s.a);
      if (Math.abs(along) < s.l && Math.abs(perp) < s.w) {
        const k = (1 - Math.abs(perp) / s.w) * 0.6;
        lum = lerp(lum, 0.3, k);
        rough = lerp(rough, 0.7, k);
      }
    }
    t.setColor(i, lum, lum * 1.02, lum * 1.08);
    t.rough[i] = clamp01(rough);
    t.metal[i] = 0.35;
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 1.6 }));
}

// Grey corridor deck: matte plates with a tight grid, worn traffic lane down the middle.
export function makeDeckGrey(size = 1024, seed = 47) {
  const t = new TexGen(size, size);
  const plates = 4;
  t.each((u, v, i) => {
    const pu = (u * plates) % 1;
    const pv = (v * plates) % 1;
    const ed = edgeDist(pu, pv);
    const n = fbm(u, v, { octaves: 4, freq: 7, seed });
    const n2 = fbm(u, v, { octaves: 4, freq: 28, seed: seed + 2 });
    let lum = 0.5 + (n - 0.5) * 0.14 + (n2 - 0.5) * 0.06;
    let rough = 0.7 + (n2 - 0.5) * 0.2;
    let metal = 0.3;
    let hgt = 0.5;
    if (ed < 0.012) {
      const k = 1 - ed / 0.012;
      hgt -= 0.3 * smooth(k);
      lum *= 0.55;
      rough += 0.2;
    }
    // anti-slip micro texture
    const kn = vnoise(u, v, 96, seed + 5);
    hgt += (kn - 0.5) * 0.05;
    // worn lane along v in the middle of the tile
    const lane = smooth(clamp01(1 - Math.abs(u - 0.5) / 0.3));
    lum += lane * 0.05 * n2;
    rough -= lane * 0.15;
    metal += lane * 0.2;
    t.setColor(i, lum, lum * 1.0, lum * 1.03);
    t.rough[i] = clamp01(rough);
    t.metal[i] = clamp01(metal);
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 2.0 }));
}

// ---------------------------------------------------------------------------
// Emissive atlases: 4x4 screens (Imperial UI: red / blue / amber graphics) and 4x4 LED matrices.
// ---------------------------------------------------------------------------
const ATLAS_CELLS = 4;
export function screenRect(i) {
  const c = i % ATLAS_CELLS;
  const r = Math.floor(i / ATLAS_CELLS);
  const s = 1 / ATLAS_CELLS;
  // inset slightly so bilinear filtering never bleeds a neighbour
  const e = 0.004;
  return [c * s + e, 1 - (r + 1) * s + e, (c + 1) * s - e, 1 - r * s - e];
}
export const ledRect = screenRect;

export function makeScreenAtlas(size = 2048, seed = 5) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const cell = size / ATLAS_CELLS;
  const RED = "#ff3b2f";
  const BLUE = "#3f8dff";
  const AMBER = "#ffb547";
  const GREEN = "#3ad17a";
  const WHITE = "#dfe8ff";
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const at = (i, fn) => {
    const cx = (i % ATLAS_CELLS) * cell;
    const cy = Math.floor(i / ATLAS_CELLS) * cell;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.rect(0, 0, cell, cell);
    ctx.clip();
    ctx.fillStyle = "#03050a";
    ctx.fillRect(0, 0, cell, cell);
    fn(cell);
    // scanlines
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < cell; y += 4) ctx.fillRect(0, y, cell, 1);
    ctx.restore();
  };
  const grid = (s, color, step) => {
    ctx.strokeStyle = rgba(color, 0.12);
    ctx.lineWidth = 1;
    for (let x = 0; x < s; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, s);
      ctx.stroke();
    }
    for (let y = 0; y < s; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y);
      ctx.stroke();
    }
  };
  const textLines = (s, x, y, n, color, h) => {
    for (let k = 0; k < n; k++) {
      const len = 3 + Math.floor(rand() * 7);
      let str = "";
      for (let q = 0; q < len; q++) str += String.fromCharCode(65 + Math.floor(rand() * 22));
      drawGlyphs(ctx, str, x, y + k * h * 1.6, h, k % 5 === 4 ? AMBER : color, 0.14);
    }
  };
  const wedge = (s, cx, cy, L, color) => {
    // top-down Star Destroyer silhouette (schematic)
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.006;
    ctx.beginPath();
    ctx.moveTo(cx, cy - L / 2);
    ctx.lineTo(cx + L * 0.28, cy + L / 2);
    ctx.lineTo(cx + L * 0.2, cy + L * 0.44);
    ctx.lineTo(cx - L * 0.2, cy + L * 0.44);
    ctx.lineTo(cx - L * 0.28, cy + L / 2);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - L * 0.2);
    ctx.lineTo(cx + L * 0.12, cy + L * 0.42);
    ctx.lineTo(cx - L * 0.12, cy + L * 0.42);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = rgba(color, 0.5);
    ctx.fillRect(cx - L * 0.08, cy + L * 0.26, L * 0.16, L * 0.04);
  };
  // 0: tactical radar
  at(0, (s) => {
    grid(s, BLUE, s / 16);
    ctx.strokeStyle = rgba(BLUE, 0.6);
    ctx.lineWidth = 2;
    for (let r = 1; r <= 4; r++) {
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, (s * 0.42 * r) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(s * 0.08, s / 2);
    ctx.lineTo(s * 0.92, s / 2);
    ctx.moveTo(s / 2, s * 0.08);
    ctx.lineTo(s / 2, s * 0.92);
    ctx.stroke();
    const g = ctx.createConicGradient ? ctx.createConicGradient(-1.2, s / 2, s / 2) : null;
    if (g) {
      g.addColorStop(0, rgba(BLUE, 0.0));
      g.addColorStop(0.2, rgba(BLUE, 0.35));
      g.addColorStop(0.21, rgba(BLUE, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let k = 0; k < 9; k++) {
      ctx.fillStyle = k < 6 ? RED : GREEN;
      const a = rand() * Math.PI * 2;
      const r = rand() * s * 0.38;
      ctx.fillRect(s / 2 + Math.cos(a) * r - 3, s / 2 + Math.sin(a) * r - 3, 7, 7);
    }
    textLines(s, s * 0.05, s * 0.05, 3, BLUE, s * 0.03);
  });
  // 1: ship schematic
  at(1, (s) => {
    grid(s, BLUE, s / 12);
    wedge(s, s * 0.32, s * 0.5, s * 0.8, BLUE);
    textLines(s, s * 0.62, s * 0.12, 8, WHITE, s * 0.035);
    ctx.fillStyle = rgba(AMBER, 0.9);
    ctx.fillRect(s * 0.62, s * 0.86, s * 0.3, s * 0.03);
  });
  // 2: waveform
  at(2, (s) => {
    grid(s, GREEN, s / 10);
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const x = (i / 80) * s;
      const y = s / 2 + Math.sin(i * 0.4 + seed) * s * 0.18 * Math.sin(i * 0.07) + (rand() - 0.5) * s * 0.02;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    textLines(s, s * 0.05, s * 0.82, 1, GREEN, s * 0.05);
  });
  // 3: status bars (red/amber)
  at(3, (s) => {
    for (let k = 0; k < 9; k++) {
      const y = s * 0.08 + k * s * 0.1;
      ctx.fillStyle = rgba(WHITE, 0.25);
      ctx.fillRect(s * 0.3, y, s * 0.62, s * 0.05);
      const f = rand();
      ctx.fillStyle = f > 0.8 ? RED : f > 0.55 ? AMBER : BLUE;
      ctx.fillRect(s * 0.3, y, s * 0.62 * f, s * 0.05);
      drawGlyphs(ctx, String.fromCharCode(65 + k) + "" + (k + 1), s * 0.05, y, s * 0.05, WHITE, 0.14);
    }
  });
  // 4: planet orbit display
  at(4, (s) => {
    grid(s, BLUE, s / 14);
    ctx.strokeStyle = rgba(BLUE, 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.55, s * 0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = rgba(BLUE, 0.25);
    ctx.fill();
    ctx.strokeStyle = rgba(WHITE, 0.6);
    ctx.beginPath();
    ctx.ellipse(s * 0.5, s * 0.55, s * 0.4, s * 0.14, 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = RED;
    ctx.fillRect(s * 0.86, s * 0.45, 8, 8);
    textLines(s, s * 0.05, s * 0.06, 2, WHITE, s * 0.035);
  });
  // 5: red alert text block
  at(5, (s) => {
    ctx.fillStyle = rgba(RED, 0.15);
    ctx.fillRect(0, 0, s, s);
    textLines(s, s * 0.06, s * 0.08, 9, RED, s * 0.045);
    ctx.fillStyle = RED;
    ctx.fillRect(s * 0.06, s * 0.9, s * 0.88, s * 0.03);
  });
  // 6: power distribution bars
  at(6, (s) => {
    grid(s, AMBER, s / 12);
    for (let k = 0; k < 14; k++) {
      const h = s * (0.15 + rand() * 0.6);
      ctx.fillStyle = k % 4 === 3 ? RED : AMBER;
      ctx.globalAlpha = 0.6 + rand() * 0.4;
      ctx.fillRect(s * 0.06 + k * s * 0.064, s * 0.9 - h, s * 0.045, h);
    }
    ctx.globalAlpha = 1;
    textLines(s, s * 0.06, s * 0.05, 1, AMBER, s * 0.05);
  });
  // 7: hangar traffic board
  at(7, (s) => {
    for (let k = 0; k < 8; k++) {
      const y = s * 0.1 + k * s * 0.1;
      drawGlyphs(ctx, "TIE " + (k + 1), s * 0.06, y, s * 0.05, WHITE, 0.14);
      ctx.fillStyle = [GREEN, AMBER, BLUE, GREEN, RED, GREEN, BLUE, AMBER][k];
      ctx.fillRect(s * 0.6, y, s * 0.3, s * 0.05);
    }
  });
  // 8: sensor sweep (blue rings + noise)
  at(8, (s) => {
    for (let k = 0; k < 400; k++) {
      ctx.fillStyle = rgba(BLUE, rand() * 0.8);
      ctx.fillRect(rand() * s, rand() * s, 3, 3);
    }
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2;
    for (let r = 0; r < 5; r++) {
      ctx.beginPath();
      ctx.arc(s * 0.5, s * 0.9, s * 0.16 * (r + 1), Math.PI, Math.PI * 2);
      ctx.stroke();
    }
  });
  // 9: engineering gauges
  at(9, (s) => {
    for (let g = 0; g < 4; g++) {
      const cx = s * (0.25 + (g % 2) * 0.5);
      const cy = s * (0.3 + Math.floor(g / 2) * 0.45);
      ctx.strokeStyle = rgba(WHITE, 0.3);
      ctx.lineWidth = s * 0.03;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.14, Math.PI * 0.75, Math.PI * 2.25);
      ctx.stroke();
      ctx.strokeStyle = g === 3 ? RED : g === 1 ? AMBER : BLUE;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.14, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * (0.3 + rand() * 0.7)));
      ctx.stroke();
    }
  });
  // 10: navigation vector field
  at(10, (s) => {
    grid(s, BLUE, s / 8);
    ctx.strokeStyle = rgba(WHITE, 0.7);
    ctx.lineWidth = 2;
    for (let k = 0; k < 24; k++) {
      const x = rand() * s;
      const y = rand() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + s * 0.06, y - s * 0.03);
      ctx.stroke();
    }
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s * 0.1, s * 0.8);
    ctx.quadraticCurveTo(s * 0.5, s * 0.1, s * 0.9, s * 0.3);
    ctx.stroke();
  });
  // 11: life support readouts
  at(11, (s) => {
    for (let k = 0; k < 6; k++) {
      const y = s * 0.1 + k * s * 0.14;
      drawGlyphs(ctx, ["O2", "CO2", "H2O", "TEMP", "PRESS", "WASTE"][k], s * 0.06, y, s * 0.06, WHITE, 0.14);
      ctx.strokeStyle = k === 5 ? AMBER : GREEN;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const x = s * 0.4 + (i / 30) * s * 0.52;
        const yy = y + s * 0.03 + Math.sin(i * 0.5 + k) * s * 0.02;
        if (i === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  });
  // 12: targeting reticle
  at(12, (s) => {
    ctx.strokeStyle = RED;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.1, s / 2);
    ctx.lineTo(s * 0.35, s / 2);
    ctx.moveTo(s * 0.65, s / 2);
    ctx.lineTo(s * 0.9, s / 2);
    ctx.moveTo(s / 2, s * 0.1);
    ctx.lineTo(s / 2, s * 0.35);
    ctx.moveTo(s / 2, s * 0.65);
    ctx.lineTo(s / 2, s * 0.9);
    ctx.stroke();
    ctx.strokeStyle = rgba(WHITE, 0.4);
    ctx.strokeRect(s * 0.42, s * 0.42, s * 0.16, s * 0.16);
    textLines(s, s * 0.6, s * 0.75, 3, RED, s * 0.035);
  });
  // 13: crew manifest (white text)
  at(13, (s) => textLines(s, s * 0.06, s * 0.06, 11, WHITE, s * 0.038));
  // 14: hyperdrive plot
  at(14, (s) => {
    grid(s, "#8a7cff", s / 10);
    ctx.strokeStyle = "#8a7cff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const x = (i / 60) * s;
      const y = s * 0.7 - Math.pow(i / 60, 3) * s * 0.55;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    textLines(s, s * 0.06, s * 0.78, 2, WHITE, s * 0.04);
  });
  // 15: cargo manifest grid
  at(15, (s) => {
    for (let r = 0; r < 6; r++) {
      for (let cc = 0; cc < 4; cc++) {
        const f = rand();
        ctx.fillStyle = f > 0.85 ? RED : f > 0.6 ? AMBER : rgba(BLUE, 0.7);
        ctx.fillRect(s * 0.06 + cc * s * 0.23, s * 0.08 + r * s * 0.15, s * 0.2, s * 0.1);
      }
    }
  });
  return toTexture(c, { srgb: true, wrap: false });
}

/** 4x4 atlas of indicator-light matrices (Death Star computer panels): coloured squares/dots on black. */
export function makeLedAtlas(size = 1024, seed = 9) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const cell = size / ATLAS_CELLS;
  const colors = ["#ff3b2f", "#3f8dff", "#dfe8ff", "#ffb547", "#3ad17a", "#3f8dff", "#ff3b2f", "#dfe8ff"];
  ctx.fillStyle = "#04050a";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 16; i++) {
    const cx = (i % ATLAS_CELLS) * cell;
    const cy = Math.floor(i / ATLAS_CELLS) * cell;
    const cols = 6 + Math.floor(rand() * 10);
    const rows = 1 + Math.floor(rand() * 3);
    const pad = cell * 0.08;
    const w = (cell - pad * 2) / cols;
    const h = (cell - pad * 2) / rows;
    const density = 0.35 + rand() * 0.5;
    const square = rand() < 0.5;
    const palette = rand() < 0.3 ? [colors[i % 8]] : colors;
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        if (rand() > density) continue;
        ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
        ctx.globalAlpha = 0.6 + rand() * 0.4;
        const x = cx + pad + k * w + w * 0.2;
        const y = cy + pad + r * h + h * 0.25;
        if (square) ctx.fillRect(x, y, w * 0.6, h * 0.5);
        else {
          ctx.beginPath();
          ctx.arc(x + w * 0.3, y + h * 0.25, Math.min(w, h) * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  return toTexture(c, { srgb: true, wrap: false });
}


// ---------------------------------------------------------------------------
// Space textures
// ---------------------------------------------------------------------------
export function makeStarSprite(size = 64) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.8)");
  g.addColorStop(0.6, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return toTexture(c, { srgb: true, wrap: false });
}

export function makeNebula(size = 512, seed = 3, colA = [0.25, 0.75, 0.8], colB = [0.95, 0.5, 0.3]) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const dx = u - 0.5;
      const dy = v - 0.5;
      const rad = Math.hypot(dx, dy) * 2;
      const fall = clamp01(1 - rad);
      const n = fbm(u, v, { octaves: 6, freq: 3, seed });
      const n2 = fbm(u, v, { octaves: 5, freq: 7, seed: seed + 3 });
      const lanes = fbm(u, v, { octaves: 4, freq: 5, seed: seed + 11 });
      // filamentary body with dark dust lanes cutting through it
      let wisp = Math.pow(clamp01(n * 1.55 - 0.42), 2.2) * smooth(fall) * smooth(fall);
      wisp *= 0.45 + 0.55 * clamp01((lanes - 0.42) * 3.5);
      const mix = clamp01(n2 * 1.4 - 0.2);
      const i = (y * size + x) * 4;
      d[i] = lerp(colA[0], colB[0], mix) * 255;
      d[i + 1] = lerp(colA[1], colB[1], mix) * 255;
      d[i + 2] = lerp(colA[2], colB[2], mix) * 255;
      d[i + 3] = wisp * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: true, wrap: false });
}

// Gas giant: banded, turbulent, warm palette.
export function makeGasGiant(w = 1024, h = 512, seed = 77) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const palette = [
    [0.93, 0.85, 0.72],
    [0.85, 0.62, 0.42],
    [0.62, 0.38, 0.26],
    [0.96, 0.9, 0.8],
    [0.78, 0.5, 0.3],
    [0.55, 0.33, 0.25],
  ];
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const turb = fbm(u, v, { octaves: 5, freq: 6, seed }) - 0.5;
      const turb2 = fbm(u, v, { octaves: 4, freq: 14, seed: seed + 9 }) - 0.5;
      const band = v * 14 + turb * 1.6 + turb2 * 0.4;
      const bi = Math.floor(band);
      const bf = band - bi;
      const cA = palette[((bi % palette.length) + palette.length) % palette.length];
      const cB = palette[(((bi + 1) % palette.length) + palette.length) % palette.length];
      const k = smooth(clamp01((bf - 0.35) / 0.3));
      const swirl = fbm(u * 3, v, { octaves: 4, freq: 24, seed: seed + 4 });
      // fine zonal streaks (stretched 8:1 along the bands) so the disc stays crisp at window distance
      const fine = vnoise2(u, v, 14, 100, seed + 13) * 0.6 + vnoise2(u, v, 28, 190, seed + 17) * 0.4;
      const i = (y * w + x) * 4;
      const shade = 0.9 + (swirl - 0.5) * 0.3 + (fine - 0.5) * 0.16;
      d[i] = clamp01(lerp(cA[0], cB[0], k) * shade) * 255;
      d[i + 1] = clamp01(lerp(cA[1], cB[1], k) * shade) * 255;
      d[i + 2] = clamp01(lerp(cA[2], cB[2], k) * shade) * 255;
      d[i + 3] = 255;
    }
  }
  // a big storm oval
  ctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.translate(w * 0.62, h * 0.63);
  ctx.scale(1.8, 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 34);
  g.addColorStop(0, "rgba(240,150,90,0.9)");
  g.addColorStop(0.6, "rgba(200,110,70,0.6)");
  g.addColorStop(1, "rgba(200,110,70,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return toTexture(c, { srgb: true, wrap: true });
}

// Ocean world: teal seas, cream continents, polar ice.
export function makeOceanWorld(w = 1024, h = 512, seed = 88) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const v = y / h;
    const lat = Math.abs(v - 0.5) * 2;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const n = fbm(u, v, { octaves: 7, freq: 5, seed });
      const detail = fbm(u, v, { octaves: 4, freq: 30, seed: seed + 2 });
      const land = n > 0.56;
      let r, g, b;
      if (land) {
        // olive lowlands rising to ochre highlands; nowhere near cloud-white, so land, sea and cloud
        // stay three distinct reads even through a small porthole
        const hgt = clamp01((n - 0.56) / 0.18);
        r = lerp(0.3, 0.6, hgt) + (detail - 0.5) * 0.12;
        g = lerp(0.36, 0.5, hgt) + (detail - 0.5) * 0.12;
        b = lerp(0.2, 0.34, hgt) + (detail - 0.5) * 0.1;
      } else {
        // turquoise shelves falling to deep blue; shallows glow near coasts. Kept well under the cloud
        // albedo so the disc reads as sea with clouds over it, not a white ball with blue edges.
        const depth = clamp01((0.56 - n) / 0.22);
        r = lerp(0.14, 0.03, depth);
        g = lerp(0.6, 0.2, depth);
        b = lerp(0.7, 0.48, depth);
      }
      const ice = clamp01((lat - 0.78 + (detail - 0.5) * 0.1) / 0.08);
      r = lerp(r, 0.95, ice);
      g = lerp(g, 0.96, ice);
      b = lerp(b, 0.98, ice);
      const i = (y * w + x) * 4;
      d[i] = clamp01(r) * 255;
      d[i + 1] = clamp01(g) * 255;
      d[i + 2] = clamp01(b) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: true, wrap: true });
}

// Cratered grey moon.
export function makeMoon(w = 512, h = 256, seed = 99) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const rand = mulberry32(seed);
  const craters = [];
  for (let i = 0; i < 70; i++) craters.push([rand(), rand(), 0.01 + rand() * rand() * 0.06]);
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const n = fbm(u, v, { octaves: 5, freq: 8, seed });
      let lum = 0.42 + (n - 0.5) * 0.3;
      for (const [cx, cy, cr] of craters) {
        let dx = u - cx;
        if (dx > 0.5) dx -= 1;
        if (dx < -0.5) dx += 1;
        const dd = Math.hypot(dx, v - cy);
        if (dd < cr) {
          const k = dd / cr;
          lum *= k > 0.8 ? 1.25 : 0.7 + k * 0.25;
        }
      }
      const i = (y * w + x) * 4;
      d[i] = clamp01(lum * 1.0) * 255;
      d[i + 1] = clamp01(lum * 0.98) * 255;
      d[i + 2] = clamp01(lum * 0.95) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: true, wrap: true });
}

// Cloud alpha layer for the ocean world.
export function makeClouds(w = 1024, h = 512, seed = 111) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const n = fbm(u, v, { octaves: 6, freq: 6, seed });
      const n2 = fbm(u * 2, v, { octaves: 4, freq: 18, seed: seed + 5 });
      // ~35 % coverage in broken bands, wispy at the edges
      const a = clamp01((n - 0.53) * 3.4) * (0.5 + n2 * 0.5);
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: true, wrap: true });
}
