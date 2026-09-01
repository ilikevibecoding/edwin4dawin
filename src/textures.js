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
      imgA.data[i * 4 + 3] = 255;
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
    let lum = 0.92 + (n1 - 0.5) * 0.08 + (n2 - 0.5) * 0.05;
    // grime concentrating near edges
    const grime = clamp01(1 - ed / 0.18) * fbm(u, v, { octaves: 4, freq: 9, seed: seed + 9 });
    lum *= 1 - grime * 0.22;
    // streaky dirt running down (v direction)
    const streak = Math.pow(fbm(u * 1.0, v * 0.15, { octaves: 3, freq: 20, seed: seed + 21 }), 3);
    lum *= 1 - streak * 0.12;
    let r = lum,
      g = lum * 0.995,
      b = lum * 0.985;
    let rough = 0.48 + (n2 - 0.5) * 0.25 + grime * 0.3;
    let metal = 0;
    // bevel height
    let hgt = 0.5 + clamp01(ed / 0.03) * 0.35;
    // dents
    for (const [dx, dy, dr, ds] of dents) {
      const dd = Math.hypot(u - dx, v - dy);
      if (dd < dr) {
        const k = smooth(1 - dd / dr);
        hgt -= k * 0.08 * ds;
        rough += k * 0.15;
      }
    }
    // chipping: threshold on noise, stronger near edges
    const chipNoise = fbm(u, v, { octaves: 4, freq: 24, seed: seed + 3 });
    const chipMask = chipNoise - 0.42 - clamp01(ed / 0.05) * 0.4;
    if (chipMask > 0) {
      const k = clamp01(chipMask * 12);
      const m = 0.3 + (n2 - 0.5) * 0.12;
      r = lerp(r, m * 1.0, k);
      g = lerp(g, m * 1.02, k);
      b = lerp(b, m * 1.08, k);
      rough = lerp(rough, 0.38, k);
      metal = lerp(metal, 1, k);
      hgt -= k * 0.05;
    }
    // fine scratches
    const sc = worley(u, v, 18, seed + 7);
    if (sc < 0.02) {
      const k = 1 - sc / 0.02;
      r = lerp(r, 0.35, k * 0.5);
      g = lerp(g, 0.35, k * 0.5);
      b = lerp(b, 0.37, k * 0.5);
      hgt -= k * 0.03;
      rough += k * 0.1;
    }
    // rivets
    for (const [rx, ry] of rivets) {
      const dd = Math.hypot(u - rx, v - ry);
      if (dd < 0.02) {
        const k = smooth(clamp01(1 - dd / 0.02));
        hgt += k * 0.25;
        const ring = dd > 0.014 ? 1 : 0.55;
        r = lerp(r, 0.42 * ring, 0.85);
        g = lerp(g, 0.43 * ring, 0.85);
        b = lerp(b, 0.46 * ring, 0.85);
        rough = 0.4;
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
export function makeWornMetal(size = 512, seed = 23) {
  const t = new TexGen(size, size);
  t.each((u, v, i) => {
    // brushed streaks along u
    const streak = vnoise(u * 0.02, v, 220, seed) * 0.6 + vnoise(u * 0.05, v, 90, seed + 1) * 0.4;
    const blotch = fbm(u, v, { octaves: 4, freq: 3, seed: seed + 2 });
    const spots = fbm(u, v, { octaves: 5, freq: 12, seed: seed + 6 });
    let lum = 0.62 + (streak - 0.5) * 0.22 + (blotch - 0.5) * 0.18;
    // dull oxidised patches
    const dull = clamp01((spots - 0.58) * 6);
    lum *= 1 - dull * 0.25;
    let rough = 0.34 + (streak - 0.5) * 0.2 + dull * 0.35 + (blotch - 0.5) * 0.1;
    let hgt = 0.5 + (streak - 0.5) * 0.08 + (spots - 0.5) * 0.04;
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
    let lum = 0.36 + (n1 - 0.5) * 0.14 + (n2 - 0.5) * 0.08;
    let rough = 0.55 + (n2 - 0.5) * 0.2;
    let metal = 1;
    let hgt = 0.55;
    // seams between plates
    const seam = 0.018;
    if (ed < seam) {
      const k = 1 - ed / seam;
      hgt -= 0.35 * smooth(k);
      lum *= 0.55;
      rough += 0.25;
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
        lum += k * 0.05;
      }
      // rivets in plate corners
      const rin = 0.06;
      const cx = pu < 0.5 ? rin : 1 - rin;
      const cy = pv < 0.5 ? rin : 1 - rin;
      const rd = Math.hypot(pu - cx, pv - cy);
      if (rd < 0.022) {
        const k = smooth(1 - rd / 0.022);
        hgt += k * 0.3;
        lum = lerp(lum, 0.5, 0.6);
        rough = 0.4;
      }
    }
    // dark grime toward seams
    const grime = clamp01(1 - ed / 0.12) * fbm(u, v, { octaves: 3, freq: 10, seed: seed + 11 });
    lum *= 1 - grime * 0.35;
    rough += grime * 0.2;
    // scuff marks: lighter, smoother streaks
    for (const s of scuffs) {
      const dx = u - s.x;
      const dy = v - s.y;
      const along = dx * Math.cos(s.a) + dy * Math.sin(s.a);
      const perp = -dx * Math.sin(s.a) + dy * Math.cos(s.a);
      if (Math.abs(along) < s.l && Math.abs(perp) < s.w) {
        const k = (1 - Math.abs(perp) / s.w) * (1 - Math.abs(along) / s.l) * 0.8;
        lum = lerp(lum, s.k > 0.5 ? 0.62 : 0.18, k);
        rough = lerp(rough, s.k > 0.5 ? 0.3 : 0.75, k);
      }
    }
    t.setColor(i, lum * 1.0, lum * 0.98, lum * 0.95);
    t.rough[i] = clamp01(rough);
    t.metal[i] = metal;
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
    const lum = 0.14 + (n - 0.5) * 0.06 + (n2 - 0.5) * 0.05;
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
export function makeHazard(size = 256, seed = 71) {
  const t = new TexGen(size, size);
  t.each((u, v, i) => {
    const s = ((u + v) * 4) % 1;
    const stripe = s < 0.5 ? 1 : 0;
    const n = fbm(u, v, { octaves: 4, freq: 12, seed });
    const wear = clamp01((n - 0.55) * 5);
    let r, g, b;
    if (stripe) {
      r = 0.9;
      g = 0.42;
      b = 0.12;
    } else {
      r = 0.12;
      g = 0.12;
      b = 0.13;
    }
    const m = 1 - wear * 0.6;
    t.setColor(i, lerp(r * m, 0.35, wear * 0.5), lerp(g * m, 0.35, wear * 0.5), lerp(b * m, 0.37, wear * 0.5));
    t.rough[i] = 0.5 + wear * 0.3;
    t.metal[i] = wear * 0.8;
    t.height[i] = 0.5 - wear * 0.05;
  });
  return finish(t.bake({ normalStrength: 1.0 }));
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
      const wisp = Math.pow(clamp01(n * 1.3 - 0.3), 1.8) * smooth(fall) * smooth(fall);
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
      const i = (y * w + x) * 4;
      const shade = 0.92 + (swirl - 0.5) * 0.25;
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
      const land = n > 0.53;
      let r, g, b;
      if (land) {
        const hgt = clamp01((n - 0.53) / 0.2);
        r = lerp(0.62, 0.85, hgt) + (detail - 0.5) * 0.1;
        g = lerp(0.58, 0.78, hgt) + (detail - 0.5) * 0.1;
        b = lerp(0.42, 0.66, hgt) + (detail - 0.5) * 0.1;
      } else {
        const depth = clamp01((0.53 - n) / 0.25);
        r = lerp(0.2, 0.06, depth);
        g = lerp(0.62, 0.3, depth);
        b = lerp(0.62, 0.42, depth);
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
      const a = clamp01((n - 0.48) * 3.2) * (0.6 + n2 * 0.4);
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: true, wrap: true });
}
