// Every texture in the film is drawn at runtime into a <canvas>. Nothing is
// loaded from disk, which keeps the whole thing a single self-contained page and
// means the "art direction" lives in code alongside the geometry.

import * as THREE from 'three';
import { RNG, makeNoise2D } from '../util/rng.js';
import { clamp, lerp, TAU } from '../util/math.js';

const cache = new Map();

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function finish(c, { repeat = [1, 1], srgb = true, aniso = 4, wrap = THREE.RepeatWrapping } = {}) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = wrap;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = aniso;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function memo(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

function rgb(r, g, b) {
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function shade(base, k) {
  return rgb(base[0] * k, base[1] * k, base[2] * k);
}

// --- hull plating ----------------------------------------------------------

/**
 * Imperial-grey (or any colour) panel plating: recursively subdivided plates,
 * panel lines, rivet rows, vents and grime. Used on every large hull surface.
 */
export function hullPanels({
  size = 1024,
  base = [150, 155, 162],
  seed = 7,
  density = 5,
  lineDark = 0.55,
  grime = 0.25,
  rivets = true,
  vents = true,
} = {}) {
  const key = `hull:${size}:${base.join(',')}:${seed}:${density}:${lineDark}:${grime}:${rivets}:${vents}`;
  return memo(key, () => {
    const r = new RNG(seed);
    const c = canvas(size, size);
    const g = c.getContext('2d');
    g.fillStyle = shade(base, 1);
    g.fillRect(0, 0, size, size);

    // Big tonal blotches so the plating is not uniform.
    for (let i = 0; i < 24; i++) {
      const x = r.float(0, size);
      const y = r.float(0, size);
      const rad = r.float(size * 0.05, size * 0.35);
      const k = r.float(0.9, 1.08);
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, `rgba(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0},0.5)`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }

    // Recursive plate subdivision.
    const plates = [];
    const split = (x, y, w, h, depth) => {
      if (depth <= 0 || w < size / 40 || h < size / 40) {
        plates.push([x, y, w, h]);
        return;
      }
      const horiz = w > h ? r.bool(0.75) : r.bool(0.25);
      const f = r.float(0.32, 0.68);
      if (horiz) {
        split(x, y, w * f, h, depth - 1);
        split(x + w * f, y, w * (1 - f), h, depth - 1);
      } else {
        split(x, y, w, h * f, depth - 1);
        split(x, y + h * f, w, h * (1 - f), depth - 1);
      }
    };
    const cells = 3;
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        split((i * size) / cells, (j * size) / cells, size / cells, size / cells, density);
      }
    }

    for (const [x, y, w, h] of plates) {
      const k = r.float(0.9, 1.1);
      g.fillStyle = `rgba(${(base[0] * k) | 0},${(base[1] * k) | 0},${(base[2] * k) | 0},${r.float(0.25, 0.75)})`;
      g.fillRect(x, y, w, h);
      // Panel line + highlight lip.
      g.strokeStyle = shade(base, lineDark);
      g.lineWidth = Math.max(1, size / 900);
      g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      g.strokeStyle = `rgba(255,255,255,0.06)`;
      g.beginPath();
      g.moveTo(x + 1, y + h - 1);
      g.lineTo(x + 1, y + 1);
      g.lineTo(x + w - 1, y + 1);
      g.stroke();

      if (vents && r.bool(0.12) && w > size / 22 && h > size / 30) {
        const n = r.int(3, 7);
        g.fillStyle = shade(base, 0.45);
        for (let i = 0; i < n; i++) {
          const vy = y + h * 0.2 + ((h * 0.6) / n) * i;
          g.fillRect(x + w * 0.15, vy, w * 0.7, Math.max(1, (h * 0.25) / n));
        }
      }
      if (rivets && r.bool(0.3) && w > size / 30) {
        g.fillStyle = shade(base, 0.7);
        const n = Math.max(2, Math.floor(w / (size / 60)));
        for (let i = 0; i < n; i++) {
          const rx = x + 3 + ((w - 6) / (n - 1 || 1)) * i;
          g.fillRect(rx, y + 3, 1.5, 1.5);
          g.fillRect(rx, y + h - 4, 1.5, 1.5);
        }
      }
    }

    // Grime streaks running "down" the plate.
    g.globalAlpha = grime;
    for (let i = 0; i < 90; i++) {
      const x = r.float(0, size);
      const y = r.float(0, size);
      const h = r.float(size * 0.02, size * 0.2);
      const w = r.float(1, 4);
      const grd = g.createLinearGradient(0, y, 0, y + h);
      grd.addColorStop(0, 'rgba(0,0,0,0.5)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(x, y, w, h);
    }
    g.globalAlpha = 1;

    return finish(c);
  });
}

/**
 * Matching emissive map: black plate with sparse lit windows, so bloom picks out
 * city-lights across a capital ship hull.
 */
export function hullWindows({ size = 1024, seed = 11, rows = 46, density = 0.4, tint = [255, 220, 150] } = {}) {
  const key = `win:${size}:${seed}:${rows}:${density}:${tint.join(',')}`;
  return memo(key, () => {
    const r = new RNG(seed);
    const c = canvas(size, size);
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, size, size);
    const step = size / rows;
    for (let j = 0; j < rows; j++) {
      if (r.bool(0.45)) continue;
      const y = j * step + step * 0.3;
      const h = Math.max(1, step * 0.28);
      const cols = Math.floor(size / (step * 0.7));
      for (let i = 0; i < cols; i++) {
        if (!r.bool(density)) continue;
        const x = i * step * 0.7 + step * 0.2;
        const w = Math.max(1, step * r.float(0.14, 0.34));
        const a = r.float(0.35, 1);
        g.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${a})`;
        g.fillRect(x, y, w, h);
      }
    }
    return finish(c, { srgb: true });
  });
}

// --- surface / ground ------------------------------------------------------

export function sandTexture({ size = 1024, seed = 3, base = [205, 168, 118] } = {}) {
  return memo(`sand:${size}:${seed}:${base.join(',')}`, () => {
    const n = makeNoise2D(seed);
    const c = canvas(size, size);
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const u = (x / size) * 9;
        const v = (y / size) * 9;
        const big = n.fbm(u, v, 4) * 0.5 + 0.5;
        const ripple = Math.sin((u * 22 + n.fbm(u * 2, v * 2, 2) * 6)) * 0.5 + 0.5;
        const fine = n.fbm(u * 28, v * 28, 2) * 0.5 + 0.5;
        const k = 0.72 + big * 0.3 + ripple * 0.08 + fine * 0.1;
        d[i] = clamp(base[0] * k, 0, 255);
        d[i + 1] = clamp(base[1] * k, 0, 255);
        d[i + 2] = clamp(base[2] * k, 0, 255);
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return finish(c);
  });
}

/** Weathered rock: strata bands, pitting, no man-made straight lines. */
export function stoneTexture({ size = 512, seed = 4, base = [176, 138, 98], strata = 1 } = {}) {
  return memo(`stone:${size}:${seed}:${base.join()}:${strata}`, () => {
    const n = makeNoise2D(seed);
    const c = canvas(size, size);
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * 6;
        const v = (y / size) * 6;
        const band = Math.sin(v * 5.5 + n.fbm(u * 0.7, v * 0.7, 3) * 3.2) * 0.5 + 0.5;
        const grain = n.fbm(u * 9, v * 9, 4) * 0.5 + 0.5;
        const pit = n.ridged(u * 22, v * 22, 2);
        const k = 0.7 + band * 0.24 * strata + grain * 0.26 + pit * 0.1;
        const i = (y * size + x) * 4;
        d[i] = clamp(base[0] * k, 0, 255);
        d[i + 1] = clamp(base[1] * k, 0, 255);
        d[i + 2] = clamp(base[2] * k, 0, 255);
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return finish(c);
  });
}

/** Hand-smoothed adobe plaster for desert buildings. */
export function plasterTexture({ size = 512, seed = 6, base = [206, 186, 152] } = {}) {
  return memo(`plaster:${size}:${seed}:${base.join()}`, () => {
    const n = makeNoise2D(seed);
    const r = new RNG(seed + 3);
    const c = canvas(size, size);
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const k = 0.88 + (n.fbm((x / size) * 7, (y / size) * 7, 4) * 0.5 + 0.5) * 0.22
          + (n.fbm((x / size) * 40, (y / size) * 40, 2) * 0.5 + 0.5) * 0.06;
        const i = (y * size + x) * 4;
        d[i] = clamp(base[0] * k, 0, 255);
        d[i + 1] = clamp(base[1] * k, 0, 255);
        d[i + 2] = clamp(base[2] * k, 0, 255);
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    // Wind-scoured streaks near the base.
    g.globalAlpha = 0.18;
    for (let i = 0; i < 40; i++) {
      const x = r.float(0, size);
      const h = r.float(size * 0.1, size * 0.5);
      const grd = g.createLinearGradient(0, size - h, 0, size);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(90,60,30,0.5)');
      g.fillStyle = grd;
      g.fillRect(x, size - h, r.float(2, 14), h);
    }
    g.globalAlpha = 1;
    return finish(c);
  });
}

/** Equirectangular desert planet, with polar ice and cloud wisps. */
export function planetDesert({ w = 1024, h = 512, seed = 21 } = {}) {
  return memo(`planet:${w}:${h}:${seed}`, () => {
    const n = makeNoise2D(seed);
    const n2 = makeNoise2D(seed + 99);
    const c = canvas(w, h);
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      const lat = (y / h) * Math.PI; // 0..PI
      const sinLat = Math.sin(lat);
      for (let x = 0; x < w; x++) {
        const lon = (x / w) * TAU;
        // Sample on the sphere so the seam matches up.
        const sx = Math.cos(lon) * sinLat * 2.4;
        const sy = Math.sin(lon) * sinLat * 2.4;
        const sz = Math.cos(lat) * 2.4;
        const f = n.fbm(sx + sz * 0.3, sy + sz * 0.7, 5) * 0.5 + 0.5;
        const ridge = n.ridged(sx * 2.2, sy * 2.2, 4);
        let r = lerp(196, 232, f);
        let gg = lerp(150, 186, f);
        let b = lerp(96, 126, f);
        // Dark rocky highlands.
        const rockK = clamp((ridge - 0.62) * 4);
        r = lerp(r, 138, rockK);
        gg = lerp(gg, 106, rockK);
        b = lerp(b, 74, rockK);
        // Dry sea beds.
        const sea = clamp((0.34 - f) * 6);
        r = lerp(r, 168, sea);
        gg = lerp(gg, 138, sea);
        b = lerp(b, 104, sea);
        // Polar frost.
        const pole = clamp((Math.abs(y / h - 0.5) - 0.42) * 12);
        r = lerp(r, 236, pole);
        gg = lerp(gg, 240, pole);
        b = lerp(b, 246, pole);
        // Thin cloud bands.
        const cl = clamp((n2.fbm(sx * 1.4 + 4, sy * 1.4, 4) * 0.5 + 0.5 - 0.58) * 3.4) * 0.7 * sinLat;
        r = lerp(r, 250, cl);
        gg = lerp(gg, 248, cl);
        b = lerp(b, 244, cl);

        const i = (y * w + x) * 4;
        d[i] = r;
        d[i + 1] = gg;
        d[i + 2] = b;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return finish(c, { wrap: THREE.RepeatWrapping });
  });
}

/** Grey armoured moon: plate bands, crater pocks and a superlaser scar line. */
export function stationSurface({ w = 2048, h = 1024, seed = 5 } = {}) {
  return memo(`station:${w}:${h}:${seed}`, () => {
    const r = new RNG(seed);
    const n = makeNoise2D(seed);
    const c = canvas(w, h);
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const f = n.fbm((x / w) * 26, (y / h) * 13, 4) * 0.5 + 0.5;
        const k = 0.82 + f * 0.36;
        const i = (y * w + x) * 4;
        d[i] = 118 * k;
        d[i + 1] = 124 * k;
        d[i + 2] = 130 * k;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);

    // Latitudinal plate bands.
    for (let i = 0; i < 60; i++) {
      const y = r.float(0, h);
      g.fillStyle = `rgba(0,0,0,${r.float(0.05, 0.18)})`;
      g.fillRect(0, y, w, r.float(1, 5));
    }
    // Longitudinal seams.
    for (let i = 0; i < 90; i++) {
      const x = r.float(0, w);
      g.fillStyle = `rgba(0,0,0,${r.float(0.04, 0.14)})`;
      g.fillRect(x, r.float(0, h), r.float(1, 3), r.float(h * 0.05, h * 0.5));
    }
    // Surface complexes: clusters of bright/dark rectangles.
    for (let i = 0; i < 2600; i++) {
      const x = r.float(0, w);
      const y = r.float(0, h);
      const bw = r.float(2, 26);
      const bh = r.float(2, 16);
      const k = r.float(0.72, 1.28);
      g.fillStyle = `rgba(${118 * k | 0},${124 * k | 0},${132 * k | 0},${r.float(0.4, 0.95)})`;
      g.fillRect(x, y, bw, bh);
      if (r.bool(0.1)) {
        g.fillStyle = `rgba(255,214,150,${r.float(0.15, 0.5)})`;
        g.fillRect(x + 1, y + 1, Math.max(1, bw * 0.2), Math.max(1, bh * 0.2));
      }
    }
    // Trenches criss-crossing the surface.
    for (let i = 0; i < 14; i++) {
      const y = r.float(0, h);
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(0, y, w, r.float(3, 9));
      g.fillStyle = 'rgba(255,255,255,0.05)';
      g.fillRect(0, y - 1, w, 1);
    }
    return finish(c);
  });
}

/** Dense mechanical noise used for trench walls and hangar interiors. */
export function greebleTexture({ size = 1024, seed = 31, base = [96, 100, 108], lights = 0.06 } = {}) {
  return memo(`greeble:${size}:${seed}:${base.join(',')}:${lights}`, () => {
    const r = new RNG(seed);
    const c = canvas(size, size);
    const g = c.getContext('2d');
    g.fillStyle = shade(base, 0.85);
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 4200; i++) {
      const x = r.float(0, size);
      const y = r.float(0, size);
      const w = r.float(2, size * 0.06);
      const h = r.float(2, size * 0.04);
      const k = r.float(0.6, 1.35);
      g.fillStyle = `rgba(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0},${r.float(0.35, 1)})`;
      g.fillRect(x, y, w, h);
      if (r.bool(0.35)) {
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        g.lineWidth = 1;
        g.strokeRect(x + 0.5, y + 0.5, w, h);
      }
      if (r.bool(lights)) {
        g.fillStyle = r.bool(0.5) ? 'rgba(255,190,120,0.85)' : 'rgba(150,220,255,0.7)';
        g.fillRect(x, y, Math.max(1.5, w * 0.18), Math.max(1.5, h * 0.3));
      }
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(0, r.float(0, size), size, r.float(1, 4));
      g.fillRect(r.float(0, size), 0, r.float(1, 4), size);
    }
    return finish(c);
  });
}

/**
 * Equirectangular deep-space backdrop: dust lanes, two nebula colours and a
 * dense field of background stars, painted onto the inside of a sky sphere.
 */
export function nebulaTexture({ w = 2048, h = 1024, seed = 77, hueA = [90, 40, 190], hueB = [200, 70, 60], density = 1 } = {}) {
  return memo(`neb:${w}:${h}:${seed}:${hueA.join()}:${hueB.join()}:${density}`, () => {
    const n = makeNoise2D(seed);
    const n2 = makeNoise2D(seed + 41);
    const r = new RNG(seed + 7);
    const c = canvas(w, h);
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      const lat = (y / h) * Math.PI;
      const sinLat = Math.sin(lat);
      for (let x = 0; x < w; x++) {
        const lon = (x / w) * TAU;
        const sx = Math.cos(lon) * sinLat * 1.7;
        const sy = Math.sin(lon) * sinLat * 1.7;
        const sz = Math.cos(lat) * 1.7;
        const band = clamp(1 - Math.abs(Math.sin(lat * 1.0 + n.fbm(sx, sy, 3) * 0.9) - 0.55) * 2.2);
        const fa = clamp(n.fbm(sx * 1.6 + 3, sy * 1.6 + sz, 5) * 0.5 + 0.5);
        const fb = clamp(n2.fbm(sx * 2.3 - 5, sy * 2.3 + sz * 0.6, 5) * 0.5 + 0.5);
        const ka = clamp((fa - 0.52) * 2.6) * band * density;
        const kb = clamp((fb - 0.56) * 2.8) * band * density * 0.8;
        const i = (y * w + x) * 4;
        d[i] = clamp(3 + hueA[0] * ka + hueB[0] * kb, 0, 255);
        d[i + 1] = clamp(4 + hueA[1] * ka + hueB[1] * kb, 0, 255);
        d[i + 2] = clamp(7 + hueA[2] * ka + hueB[2] * kb, 0, 255);
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);

    // Stars: dense small ones plus a few bright ones with a cross flare.
    const count = Math.floor(w * h * 0.0016 * density);
    for (let i = 0; i < count; i++) {
      const x = r.float(0, w);
      const y = r.float(0, h);
      // Compress toward the poles so the sphere mapping does not clump them.
      const lat = (y / h) * Math.PI;
      if (r.next() > Math.sin(lat) * 0.9 + 0.1) continue;
      const b = r.float(0.25, 1) ** 2.2;
      const size = b > 0.7 ? r.float(1.2, 2.4) : r.float(0.6, 1.3);
      const tint = r.next();
      const col = tint < 0.15 ? [190, 210, 255] : tint > 0.9 ? [255, 220, 190] : [255, 255, 255];
      g.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${b})`;
      g.beginPath();
      g.arc(x, y, size, 0, TAU);
      g.fill();
      if (b > 0.93) {
        const grd = g.createRadialGradient(x, y, 0, x, y, size * 9);
        grd.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.5)`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.fillRect(x - size * 9, y - size * 9, size * 18, size * 18);
      }
    }
    return finish(c);
  });
}

/** TIE solar array: a dark cell grid with a faint sheen. */
export function solarPanel({ size = 512, seed = 9, base = [46, 52, 62], cells = 12 } = {}) {
  return memo(`solar:${size}:${seed}:${base.join()}:${cells}`, () => {
    const r = new RNG(seed);
    const c = canvas(size, size);
    const g = c.getContext('2d');
    g.fillStyle = shade(base, 1);
    g.fillRect(0, 0, size, size);
    const step = size / cells;
    for (let j = 0; j < cells; j++) {
      for (let i = 0; i < cells; i++) {
        const k = r.float(0.82, 1.18);
        g.fillStyle = `rgba(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0},0.9)`;
        g.fillRect(i * step + 1, j * step + 1, step - 2, step - 2);
      }
    }
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    g.lineWidth = Math.max(1, size / 340);
    for (let i = 0; i <= cells; i++) {
      g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, size); g.stroke();
      g.beginPath(); g.moveTo(0, i * step); g.lineTo(size, i * step); g.stroke();
    }
    // Faint diagonal sheen.
    const grd = g.createLinearGradient(0, 0, size, size);
    grd.addColorStop(0, 'rgba(255,255,255,0.06)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0)');
    grd.addColorStop(1, 'rgba(255,255,255,0.05)');
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return finish(c);
  });
}

// --- sprites / glows -------------------------------------------------------

export function radialGlow({ size = 256, inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,0.35)', outer = 'rgba(255,255,255,0)', power = 1 } = {}) {
  return memo(`glow:${size}:${inner}:${mid}:${outer}:${power}`, () => {
    const c = canvas(size, size);
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, inner);
    grd.addColorStop(0.25 * power, mid);
    grd.addColorStop(1, outer);
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

export function starSprite({ size = 64 } = {}) {
  return memo('starSprite', () => {
    const c = canvas(size, size);
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.18, 'rgba(255,255,255,0.75)');
    grd.addColorStop(0.45, 'rgba(190,215,255,0.16)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

export function smokeSprite({ size = 256, seed = 17 } = {}) {
  return memo(`smoke:${size}:${seed}`, () => {
    const r = new RNG(seed);
    const c = canvas(size, size);
    const g = c.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const x = size / 2 + r.gauss(0, size * 0.11);
      const y = size / 2 + r.gauss(0, size * 0.11);
      const rad = r.float(size * 0.08, size * 0.28);
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      const a = r.float(0.05, 0.16);
      grd.addColorStop(0, `rgba(255,255,255,${a})`);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // Fade the edges so the quad never shows a hard border.
    const vg = g.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.5);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = vg;
    g.fillRect(0, 0, size, size);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

export function shockRing({ size = 512 } = {}) {
  return memo('shockRing', () => {
    const c = canvas(size, size);
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.5);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.55, 'rgba(255,240,210,0.15)');
    grd.addColorStop(0.86, 'rgba(255,255,255,0.95)');
    grd.addColorStop(0.95, 'rgba(255,190,120,0.35)');
    grd.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** Soft-edged bolt sprite: a bright core stretched along X. */
export function boltSprite({ w = 256, h = 64, color = [255, 90, 60] } = {}) {
  return memo(`bolt:${w}:${h}:${color.join(',')}`, () => {
    const c = canvas(w, h);
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(0.12, `rgba(${color[0]},${color[1]},${color[2]},0.25)`);
    grd.addColorStop(0.5, 'rgba(255,255,255,1)');
    grd.addColorStop(0.88, `rgba(${color[0]},${color[1]},${color[2]},0.25)`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, h * 0.28, w, h * 0.44);
    // Vertical falloff.
    const vg = g.createLinearGradient(0, 0, 0, h);
    vg.addColorStop(0, 'rgba(0,0,0,1)');
    vg.addColorStop(0.3, 'rgba(0,0,0,0)');
    vg.addColorStop(0.7, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

// --- text ------------------------------------------------------------------

/**
 * Draws the yellow "STAR WARS"-style logo lockup into a transparent canvas.
 * Heavy condensed caps, thick dark outline, warm gradient fill.
 */
export function logoTexture({ w = 2048, h = 1024, top = 'STAR', bottom = 'WARS', sub = '' } = {}) {
  return memo(`logo:${w}:${h}:${top}:${bottom}:${sub}`, () => {
    const c = canvas(w, h);
    const g = c.getContext('2d');
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    const drawWord = (word, cy, fontSize, stretch) => {
      g.save();
      g.translate(w / 2, cy);
      g.scale(stretch, 1);
      g.font = `${fontSize}px Anton, "Arial Black", Impact, sans-serif`;
      const grad = g.createLinearGradient(0, -fontSize * 0.5, 0, fontSize * 0.5);
      grad.addColorStop(0, '#ffe14d');
      grad.addColorStop(0.45, '#ffd21a');
      grad.addColorStop(0.55, '#f5b400');
      grad.addColorStop(1, '#ffe98a');
      g.lineJoin = 'round';
      g.strokeStyle = '#0b0b0f';
      g.lineWidth = fontSize * 0.1;
      g.strokeText(word, 0, 0);
      g.fillStyle = grad;
      g.fillText(word, 0, 0);
      g.restore();
    };

    drawWord(top, h * 0.31, h * 0.36, 1.0);
    drawWord(bottom, h * 0.66, h * 0.36, 1.0);
    if (sub) {
      g.font = `${h * 0.062}px "News Cycle", Arial, sans-serif`;
      g.fillStyle = '#ffd21a';
      g.strokeStyle = '#0b0b0f';
      g.lineWidth = h * 0.012;
      const y = h * 0.9;
      g.save();
      g.translate(w / 2, y);
      g.scale(1.6, 1);
      g.strokeText(sub, 0, 0);
      g.fillText(sub, 0, 0);
      g.restore();
    }
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/**
 * Word-wraps the opening crawl into a tall canvas. Returns the texture plus the
 * measured content height so the scroll distance can be derived from the text
 * instead of hand-tuned.
 */
export function crawlTexture({ w = 1024, title = '', paragraphs = [], fontSize = 44, lineGap = 1.32 } = {}) {
  const key = `crawl:${w}:${title}:${paragraphs.join('|')}:${fontSize}`;
  return memo(key, () => {
    const measure = canvas(8, 8).getContext('2d');
    const font = `700 ${fontSize}px "News Cycle", Arial, Helvetica, sans-serif`;
    measure.font = font;
    const maxW = w * 0.86;
    const lines = [];
    if (title) {
      lines.push({ text: title, title: true });
      lines.push({ text: '', title: false });
    }
    for (const p of paragraphs) {
      const words = p.split(/\s+/);
      let cur = '';
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (measure.measureText(test).width > maxW && cur) {
          lines.push({ text: cur });
          cur = word;
        } else {
          cur = test;
        }
      }
      if (cur) lines.push({ text: cur });
      lines.push({ text: '' });
    }
    const lh = fontSize * lineGap;
    const h = Math.ceil(lines.length * lh + fontSize * 4);
    const pow2 = 2 ** Math.ceil(Math.log2(h));
    const c = canvas(w, pow2);
    const g = c.getContext('2d');
    g.clearRect(0, 0, w, pow2);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffd21a';
    let y = fontSize * 1.6;
    for (const line of lines) {
      if (line.text) {
        g.font = line.title ? `700 ${fontSize * 1.18}px "News Cycle", Arial, sans-serif` : font;
        g.fillText(line.text, w / 2, y);
      }
      y += lh;
    }
    const tex = finish(c, { wrap: THREE.ClampToEdgeWrapping });
    tex.userData.contentHeight = y / pow2;
    tex.userData.pixelHeight = pow2;
    return tex;
  });
}

/** Generic centred text card (used for "A long time ago..." and end titles). */
export function textCard({
  w = 2048,
  h = 512,
  text = '',
  font = '700 88px "News Cycle", Arial, sans-serif',
  color = '#4bd5ff',
  align = 'center',
  lines = null,
  lineGap = 1.4,
} = {}) {
  return memo(`card:${w}:${h}:${text}:${font}:${color}:${(lines || []).join('|')}`, () => {
    const c = canvas(w, h);
    const g = c.getContext('2d');
    g.clearRect(0, 0, w, h);
    g.font = font;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.fillStyle = color;
    const arr = lines || [text];
    const size = parseInt(font.match(/(\d+)px/)[1], 10);
    const total = (arr.length - 1) * size * lineGap;
    arr.forEach((ln, i) => {
      g.fillText(ln, align === 'center' ? w / 2 : w * 0.06, h / 2 - total / 2 + i * size * lineGap);
    });
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

export function disposeTextureCache() {
  for (const tex of cache.values()) if (tex && tex.dispose) tex.dispose();
  cache.clear();
}
