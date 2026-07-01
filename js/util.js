import * as THREE from 'three';

// Deterministic RNG so prop scatter is reproducible across runs/screenshots.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function damp(current, target, rate, dt) {
  return THREE.MathUtils.damp(current, target, rate, dt);
}

// Procedural canvas textures (no external assets).
export function checkerTexture(c1, c2, cells = 8, size = 256) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const s = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      g.fillStyle = (x + y) % 2 ? c1 : c2;
      g.fillRect(x * s, y * s, s, s);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function plankTexture(base, groove, planks = 6, size = 256) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const pw = size / planks;
  for (let i = 0; i < planks; i++) {
    const shade = (i % 2 ? 8 : -6) + (i % 3) * 4;
    g.fillStyle = tint(base, shade);
    g.fillRect(i * pw, 0, pw - 2, size);
    g.fillStyle = groove;
    g.fillRect(i * pw + pw - 2, 0, 2, size);
    // stagger butt joints
    g.fillRect(i * pw, ((i * 97) % size), pw - 2, 2);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function noiseTexture(base, amount = 14, size = 128) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  let s = 12345;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 16807) % 2147483647;
    const n = ((s / 2147483647) - 0.5) * amount;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function tint(hex, delta) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + delta, 0, 255);
  const g = clamp(((n >> 8) & 255) + delta, 0, 255);
  const b = clamp((n & 255) + delta, 0, 255);
  return `rgb(${r},${g},${b})`;
}
