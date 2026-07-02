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

// ------------------------------------------------------------------ helpers
function canvas(size) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  return [cv, cv.getContext('2d')];
}

function toTexture(cv) {
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function tint(hex, delta) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + delta, 0, 255);
  const g = clamp(((n >> 8) & 255) + delta, 0, 255);
  const b = clamp((n & 255) + delta, 0, 255);
  return `rgb(${r},${g},${b})`;
}

function speckle(g, rng, size, count, alpha, light, dark) {
  for (let i = 0; i < count; i++) {
    const v = rng();
    g.fillStyle = v > 0.5 ? light : dark;
    g.globalAlpha = alpha * rng();
    g.fillRect(rng() * size, rng() * size, 1 + rng() * 2, 1 + rng() * 2);
  }
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------ floors
export function tileTexture(base, grout, cells = 6, size = 512, variation = 10) {
  const [cv, g] = canvas(size);
  const rng = mulberry32(7);
  g.fillStyle = grout;
  g.fillRect(0, 0, size, size);
  const s = size / cells;
  const gw = Math.max(2, size / 170); // grout width
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      g.fillStyle = tint(base, (rng() - 0.5) * 2 * variation);
      g.fillRect(x * s + gw / 2, y * s + gw / 2, s - gw, s - gw);
      // soft inner highlight
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.fillRect(x * s + gw / 2, y * s + gw / 2, s - gw, s * 0.16);
    }
  }
  speckle(g, rng, size, 900, 0.05, '#ffffff', '#000000');
  return toTexture(cv);
}

export function checkerTexture(c1, c2, cells = 8, size = 512) {
  const [cv, g] = canvas(size);
  const rng = mulberry32(11);
  const s = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      g.fillStyle = tint((x + y) % 2 ? c1 : c2, (rng() - 0.5) * 8);
      g.fillRect(x * s, y * s, s, s);
    }
  }
  // grout grid
  g.strokeStyle = 'rgba(70,80,78,0.35)';
  g.lineWidth = 2;
  for (let i = 0; i <= cells; i++) {
    g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, size); g.stroke();
    g.beginPath(); g.moveTo(0, i * s); g.lineTo(size, i * s); g.stroke();
  }
  speckle(g, rng, size, 700, 0.05, '#ffffff', '#22302c');
  return toTexture(cv);
}

export function plankTexture(base, groove, planks = 7, size = 512) {
  const [cv, g] = canvas(size);
  const rng = mulberry32(23);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const pw = size / planks;
  for (let i = 0; i < planks; i++) {
    const shade = (rng() - 0.5) * 26;
    g.fillStyle = tint(base, shade);
    g.fillRect(i * pw, 0, pw - 2, size);
    // wood grain streaks
    for (let k = 0; k < 22; k++) {
      g.strokeStyle = tint(base, shade - 14 - rng() * 18);
      g.globalAlpha = 0.22 + rng() * 0.2;
      g.lineWidth = 1 + rng();
      const x0 = i * pw + rng() * pw;
      g.beginPath();
      g.moveTo(x0, 0);
      g.bezierCurveTo(x0 + (rng() - 0.5) * 14, size * 0.33, x0 + (rng() - 0.5) * 14, size * 0.66, x0 + (rng() - 0.5) * 10, size);
      g.stroke();
    }
    g.globalAlpha = 1;
    // knots
    if (rng() > 0.55) {
      const kx = i * pw + pw * (0.25 + rng() * 0.5);
      const ky = rng() * size;
      g.fillStyle = tint(base, shade - 34);
      g.beginPath(); g.ellipse(kx, ky, 3 + rng() * 3, 5 + rng() * 4, 0, 0, Math.PI * 2); g.fill();
    }
    // groove + butt joints
    g.fillStyle = groove;
    g.fillRect(i * pw + pw - 2, 0, 2, size);
    const jy = (i * 173 + 60) % size;
    g.fillRect(i * pw, jy, pw - 2, 2);
  }
  return toTexture(cv);
}

export function carpetTexture(base, size = 512) {
  const [cv, g] = canvas(size);
  const rng = mulberry32(31);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  // weave crosshatch
  g.globalAlpha = 0.10;
  for (let y = 0; y < size; y += 3) {
    g.fillStyle = y % 6 ? tint(base, -16) : tint(base, 12);
    g.fillRect(0, y, size, 1);
  }
  for (let x = 0; x < size; x += 3) {
    g.fillStyle = x % 6 ? tint(base, -12) : tint(base, 10);
    g.fillRect(x, 0, 1, size);
  }
  g.globalAlpha = 1;
  speckle(g, rng, size, 2600, 0.10, tint(base, 26), tint(base, -28));
  return toTexture(cv);
}

export function noiseTexture(base, amount = 14, size = 128) {
  const [cv, g] = canvas(size);
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
  return toTexture(cv);
}

// ------------------------------------------------------------------ soft goods
export function rugTexture(field, border, size = 512) {
  const [cv, g] = canvas(size);
  const rng = mulberry32(47);
  g.fillStyle = border;
  g.fillRect(0, 0, size, size);
  const m = size * 0.09;
  g.fillStyle = field;
  g.fillRect(m, m, size - 2 * m, size - 2 * m);
  g.strokeStyle = tint(border, -22);
  g.lineWidth = size * 0.012;
  g.strokeRect(m * 0.55, m * 0.55, size - 1.1 * m, size - 1.1 * m);
  g.strokeStyle = tint(field, -20);
  g.strokeRect(m * 1.6, m * 1.6, size - 3.2 * m, size - 3.2 * m);
  // simple diamond motif row
  g.fillStyle = tint(field, -26);
  const n = 5;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const cx = m * 2.4 + (i + 0.5) * (size - 4.8 * m) / n;
      const cy = m * 2.4 + (j + 0.5) * (size - 4.8 * m) / n;
      const r = size * 0.018 + rng() * 2;
      g.beginPath();
      g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy);
      g.closePath(); g.fill();
    }
  }
  speckle(g, rng, size, 1600, 0.08, '#fff', '#000');
  return toTexture(cv);
}

export function paintingTexture(kind, size = 256) {
  const [cv, g] = canvas(size);
  const rng = mulberry32(60 + kind);
  if (kind === 0) {
    // sunset hills
    const grad = g.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#f7c873'); grad.addColorStop(0.55, '#e98a5a'); grad.addColorStop(1, '#7e4b63');
    g.fillStyle = grad; g.fillRect(0, 0, size, size);
    g.fillStyle = '#f8e3ae';
    g.beginPath(); g.arc(size * 0.62, size * 0.38, size * 0.11, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5d3c55';
    g.beginPath(); g.moveTo(0, size * 0.72);
    g.quadraticCurveTo(size * 0.3, size * 0.5, size * 0.55, size * 0.74);
    g.quadraticCurveTo(size * 0.8, size * 0.94, size, size * 0.7);
    g.lineTo(size, size); g.lineTo(0, size); g.closePath(); g.fill();
    g.fillStyle = '#462e46';
    g.beginPath(); g.moveTo(0, size * 0.86);
    g.quadraticCurveTo(size * 0.45, size * 0.68, size, size * 0.88);
    g.lineTo(size, size); g.lineTo(0, size); g.closePath(); g.fill();
  } else if (kind === 1) {
    // abstract circles
    g.fillStyle = '#e9e2d2'; g.fillRect(0, 0, size, size);
    const cols = ['#c96f4a', '#5b7f8a', '#c9a44a', '#7a6a8f', '#4a7057'];
    for (let i = 0; i < 9; i++) {
      g.fillStyle = cols[i % cols.length];
      g.globalAlpha = 0.75;
      g.beginPath();
      g.arc(rng() * size, rng() * size, size * (0.06 + rng() * 0.14), 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  } else if (kind === 2) {
    // botanical
    g.fillStyle = '#f2eee0'; g.fillRect(0, 0, size, size);
    g.strokeStyle = '#4a6b4f'; g.lineWidth = size * 0.02;
    g.beginPath(); g.moveTo(size * 0.5, size * 0.9); g.quadraticCurveTo(size * 0.46, size * 0.5, size * 0.52, size * 0.14); g.stroke();
    g.fillStyle = '#5d8560';
    for (let i = 0; i < 7; i++) {
      const t = 0.2 + i * 0.1;
      const x = size * (0.5 + (i % 2 ? 0.03 : -0.03));
      const y = size * (0.95 - t * 0.85);
      const s = i % 2 ? 1 : -1;
      g.beginPath();
      g.ellipse(x + s * size * 0.09, y, size * 0.1, size * 0.035, s * 0.5, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    // little house print
    g.fillStyle = '#dfe8ec'; g.fillRect(0, 0, size, size);
    g.fillStyle = '#88a8b8'; g.fillRect(0, size * 0.72, size, size * 0.28);
    g.fillStyle = '#c9705a';
    g.fillRect(size * 0.32, size * 0.44, size * 0.36, size * 0.3);
    g.beginPath(); g.moveTo(size * 0.27, size * 0.46); g.lineTo(size * 0.5, size * 0.26); g.lineTo(size * 0.73, size * 0.46); g.closePath();
    g.fillStyle = '#7e4a3e'; g.fill();
    g.fillStyle = '#f2e8c8'; g.fillRect(size * 0.44, size * 0.55, size * 0.12, size * 0.19);
    g.fillStyle = '#f8f4e6';
    g.beginPath(); g.arc(size * 0.78, size * 0.2, size * 0.07, 0, Math.PI * 2); g.fill();
  }
  const tex = toTexture(cv);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// ------------------------------------------------------------------ outdoors
export function grassTexture(size = 512) {
  const [cv, g] = canvas(size);
  const rng = mulberry32(91);
  g.fillStyle = '#6d9a52';
  g.fillRect(0, 0, size, size);
  // mottled patches
  for (let i = 0; i < 40; i++) {
    g.fillStyle = tint('#6d9a52', (rng() - 0.5) * 30);
    g.globalAlpha = 0.25;
    g.beginPath();
    g.ellipse(rng() * size, rng() * size, size * (0.05 + rng() * 0.12), size * (0.04 + rng() * 0.1), rng() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  speckle(g, rng, size, 4200, 0.16, '#8fbc6a', '#4a7038');
  return toTexture(cv);
}

export function roadTexture(size = 512) {
  const [cv, g] = canvas(size);
  const rng = mulberry32(97);
  g.fillStyle = '#3d4043';
  g.fillRect(0, 0, size, size);
  speckle(g, rng, size, 5200, 0.12, '#5a5e62', '#26282b');
  // center dashed line runs along X
  g.fillStyle = '#e8d982';
  const dashW = size * 0.16;
  g.fillRect(size * 0.1, size / 2 - size * 0.014, dashW, size * 0.028);
  g.fillRect(size * 0.6, size / 2 - size * 0.014, dashW, size * 0.028);
  // edge lines
  g.fillStyle = '#d8dbd2';
  g.fillRect(0, size * 0.06, size, size * 0.018);
  g.fillRect(0, size * 0.925, size, size * 0.018);
  return toTexture(cv);
}

export function sidewalkTexture(size = 256) {
  const [cv, g] = canvas(size);
  const rng = mulberry32(101);
  g.fillStyle = '#b9b5ab';
  g.fillRect(0, 0, size, size);
  speckle(g, rng, size, 1800, 0.12, '#d0ccc2', '#928e84');
  g.strokeStyle = '#8f8b82';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 2); g.lineTo(size, 2); g.stroke();
  g.beginPath(); g.moveTo(2, 0); g.lineTo(2, size); g.stroke();
  return toTexture(cv);
}

export function skyTexture(size = 1024) {
  const [cv, g] = canvas(size);
  const grad = g.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0.0, '#3178c9');
  grad.addColorStop(0.42, '#7db8e8');
  grad.addColorStop(0.62, '#bfe0f2');
  grad.addColorStop(0.78, '#eaf4ef');
  grad.addColorStop(1.0, '#f4ecd8');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = toTexture(cv);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
