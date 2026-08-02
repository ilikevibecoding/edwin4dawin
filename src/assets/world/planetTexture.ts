import * as THREE from 'three';
import { protectResource } from '../../core/dispose';

/**
 * CPU-baked desert-planet textures.
 *
 * A GPU noise shader would be prettier but costs far too much fill rate when
 * the planet fills the frame, so the surface is baked once into equirectangular
 * canvases at load time and lit by the ordinary standard material pipeline.
 * Everything is driven by an integer hash so the result is byte-identical
 * between runs.
 */

// --- integer-hash gradient noise -------------------------------------------

const GRAD = new Float32Array(16 * 3);
(function buildGradients() {
  const g = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
    [1, 1, 0], [-1, 1, 0], [0, -1, 1], [0, -1, -1],
  ];
  for (let i = 0; i < 16; i++) {
    GRAD[i * 3] = g[i][0];
    GRAD[i * 3 + 1] = g[i][1];
    GRAD[i * 3 + 2] = g[i][2];
  }
})();

function hash3(x: number, y: number, z: number, seed: number): number {
  let h = seed ^ Math.imul(x, 0x8da6b343) ^ Math.imul(y, 0xd8163841) ^ Math.imul(z, 0xcb1ab31f);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

function gnoise(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  let n = 0;
  const corner = (cx: number, cy: number, cz: number): number => {
    const gi = (hash3(ix + cx, iy + cy, iz + cz, seed) & 15) * 3;
    const dx = fx - cx;
    const dy = fy - cy;
    const dz = fz - cz;
    return GRAD[gi] * dx + GRAD[gi + 1] * dy + GRAD[gi + 2] * dz;
  };

  const c000 = corner(0, 0, 0);
  const c100 = corner(1, 0, 0);
  const c010 = corner(0, 1, 0);
  const c110 = corner(1, 1, 0);
  const c001 = corner(0, 0, 1);
  const c101 = corner(1, 0, 1);
  const c011 = corner(0, 1, 1);
  const c111 = corner(1, 1, 1);

  const x00 = c000 + (c100 - c000) * ux;
  const x10 = c010 + (c110 - c010) * ux;
  const x01 = c001 + (c101 - c001) * ux;
  const x11 = c011 + (c111 - c011) * ux;
  const y0 = x00 + (x10 - x00) * uy;
  const y1 = x01 + (x11 - x01) * uy;
  n = y0 + (y1 - y0) * uz;
  return n;
}

function fbm3(x: number, y: number, z: number, octaves: number, seed: number, lac = 2.03, gain = 0.5): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += gnoise(x * f, y * f, z * f, seed + o * 7919) * amp;
    norm += amp;
    amp *= gain;
    f *= lac;
  }
  return sum / norm;
}

function ridged3(x: number, y: number, z: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const n = 1 - Math.abs(gnoise(x * f, y * f, z * f, seed + o * 6151));
    sum += n * n * amp;
    norm += amp;
    amp *= 0.52;
    f *= 2.07;
  }
  return sum / norm;
}

const smooth = (a: number, b: number, t: number): number => {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  const s = x * x * (3 - 2 * x);
  return a + (b - a) * s;
};

export interface PlanetTextureSet {
  albedo: THREE.Texture;
  rough: THREE.Texture;
  bump: THREE.Texture;
  clouds: THREE.Texture;
}

let cached: PlanetTextureSet | null = null;

/**
 * Bake the whole texture set. ~0.4 s at width 1024 on a typical laptop; the
 * loading screen reports it as a discrete step.
 */
export function buildTatooineTextures(width = 1024): PlanetTextureSet {
  if (cached) return cached;
  const w = width;
  const h = width / 2;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = w;
  albedoCanvas.height = h;
  const ag = albedoCanvas.getContext('2d')!;
  const albedoImg = ag.createImageData(w, h);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = w;
  roughCanvas.height = h;
  const rg = roughCanvas.getContext('2d')!;
  const roughImg = rg.createImageData(w, h);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = w;
  bumpCanvas.height = h;
  const bg = bumpCanvas.getContext('2d')!;
  const bumpImg = bg.createImageData(w, h);

  // Palette: bleached dune crests, ochre basins, dark igneous ridges,
  // pale evaporite flats.
  const cDuneHi = [0xf0, 0xd6, 0xa6];
  const cDuneLo = [0xd2, 0xa5, 0x69];
  const cBasin = [0xb4, 0x7d, 0x48];
  const cRock = [0x8f, 0x64, 0x40];
  const cSalt = [0xee, 0xe6, 0xd0];

  const SEED = 0x7a713;

  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h;
    const theta = v * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      const phi = u * Math.PI * 2;
      const px = sinT * Math.cos(phi);
      const py = cosT;
      const pz = sinT * Math.sin(phi);

      // Continental-scale basins.
      const base = fbm3(px * 2.1, py * 2.1, pz * 2.1, 5, SEED);
      // Wind-carved dune fields: stretched along longitude.
      const dunes = fbm3(px * 30, py * 7, pz * 30, 4, SEED + 31) * 0.62;
      // Ridge networks / canyon walls.
      const ridges = ridged3(px * 5.4, py * 5.4, pz * 5.4, 4, SEED + 77);
      // Evaporite flats mask.
      const flats = smooth(0, 1, (fbm3(px * 3.3 + 5, py * 3.3, pz * 3.3, 3, SEED + 211) - 0.14) * 4);

      let height = base * 0.6 + dunes * 0.26 + (ridges - 0.5) * 0.26;
      height = Math.max(-1, Math.min(1, height));

      const rocky = smooth(0, 1, (ridges - 0.7) * 4.0);
      const low = smooth(1, 0, (height + 0.18) * 2.4);

      let r = 0;
      let g = 0;
      let b = 0;
      const mixTo = (c: number[], t: number): void => {
        r = smooth(r, c[0], t);
        g = smooth(g, c[1], t);
        b = smooth(b, c[2], t);
      };
      r = cDuneLo[0];
      g = cDuneLo[1];
      b = cDuneLo[2];
      mixTo(cDuneHi, smooth(0, 1, height * 1.6 + 0.35));
      mixTo(cBasin, low * 0.7);
      mixTo(cRock, rocky * 0.55);
      mixTo(cSalt, flats * (1 - rocky) * 0.7);

      // Latitude bleaching towards the poles (thin frost / high albedo dust).
      const polar = Math.pow(Math.abs(cosT), 5);
      r = smooth(r, 0xf0, polar * 0.55);
      g = smooth(g, 0xe6, polar * 0.55);
      b = smooth(b, 0xd2, polar * 0.55);

      // Fine grain so the surface never looks like flat vector art.
      const grain = gnoise(px * 180, py * 180, pz * 180, SEED + 999) * 5;
      const i = (y * w + x) * 4;
      albedoImg.data[i] = Math.max(0, Math.min(255, r + grain));
      albedoImg.data[i + 1] = Math.max(0, Math.min(255, g + grain));
      albedoImg.data[i + 2] = Math.max(0, Math.min(255, b + grain));
      albedoImg.data[i + 3] = 255;

      // Salt flats are smoother; rock is rougher.
      const roughV = 226 - flats * 70 + rocky * 20;
      roughImg.data[i] = roughV;
      roughImg.data[i + 1] = roughV;
      roughImg.data[i + 2] = roughV;
      roughImg.data[i + 3] = 255;

      const bumpV = 128 + height * 92 + dunes * 26;
      const bClamped = Math.max(0, Math.min(255, bumpV));
      bumpImg.data[i] = bClamped;
      bumpImg.data[i + 1] = bClamped;
      bumpImg.data[i + 2] = bClamped;
      bumpImg.data[i + 3] = 255;
    }
  }

  ag.putImageData(albedoImg, 0, 0);
  rg.putImageData(roughImg, 0, 0);
  bg.putImageData(bumpImg, 0, 0);

  // --- high dust / thin cloud bands -----------------------------------------
  const cw = Math.max(512, w / 2);
  const ch = cw / 2;
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = cw;
  cloudCanvas.height = ch;
  const cg = cloudCanvas.getContext('2d')!;
  const cloudImg = cg.createImageData(cw, ch);
  for (let y = 0; y < ch; y++) {
    const v = (y + 0.5) / ch;
    const theta = v * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    for (let x = 0; x < cw; x++) {
      const u = (x + 0.5) / cw;
      const phi = u * Math.PI * 2;
      const px = sinT * Math.cos(phi);
      const py = cosT;
      const pz = sinT * Math.sin(phi);
      // Zonal banding plus turbulence: reads as a high dust haze, not cumulus.
      const band = Math.sin(py * 7.5 + fbm3(px * 1.6, py * 1.6, pz * 1.6, 3, 4242) * 2.4);
      const turb = fbm3(px * 4.5, py * 4.5, pz * 4.5, 4, 8811);
      let a = smooth(0, 1, band * 0.4 + turb * 0.66 - 0.02) * 0.9;
      a *= smooth(0, 1, 1.25 - Math.abs(cosT) * 1.3);
      const i = (y * cw + x) * 4;
      cloudImg.data[i] = 250;
      cloudImg.data[i + 1] = 236;
      cloudImg.data[i + 2] = 210;
      cloudImg.data[i + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
  }
  cg.putImageData(cloudImg, 0, 0);

  const mk = (canvas: HTMLCanvasElement, srgb: boolean, name: string): THREE.Texture => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    t.name = name;
    t.needsUpdate = true;
    protectResource(t);
    return t;
  };

  cached = {
    albedo: mk(albedoCanvas, true, 'tatooine.albedo'),
    rough: mk(roughCanvas, false, 'tatooine.rough'),
    bump: mk(bumpCanvas, false, 'tatooine.bump'),
    clouds: mk(cloudCanvas, true, 'tatooine.clouds'),
  };
  return cached;
}
