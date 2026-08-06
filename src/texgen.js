// Procedural canvas texture generation. No downloaded assets — every map in the
// game is painted here. All generators are seeded so visuals are reproducible.
import * as THREE from 'three';
import { mulberry32, fbm2 } from './rng.js';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { srgb = true, repeat = null, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.anisotropy = aniso;
  return t;
}

// ---------------------------------------------------------------- terrain
export function groundTexture() {
  const S = 1024, [c, g] = makeCanvas(S, S), rnd = mulberry32(101);
  g.fillStyle = '#9d8662'; g.fillRect(0, 0, S, S);
  // large fbm tonal blotches
  const img = g.getImageData(0, 0, S, S), d = img.data;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = fbm2(x * 0.008, y * 0.008, 4);
      const n2 = fbm2(x * 0.045 + 31, y * 0.045 + 17, 3);
      const i = (y * S + x) * 4;
      const shade = 0.74 + n * 0.42 + (n2 - 0.5) * 0.18;
      d[i] = Math.min(255, 157 * shade);
      d[i + 1] = Math.min(255, 133 * shade);
      d[i + 2] = Math.min(255, 95 * shade * (0.96 + n2 * 0.08));
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // pebbles & scrub speckle
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * S, y = rnd() * S, r = 0.5 + rnd() * 1.8;
    const v = rnd();
    g.fillStyle = v < 0.72 ? `rgba(60,48,34,${0.12 + rnd() * 0.2})`
      : v < 0.9 ? `rgba(200,180,140,${0.15 + rnd() * 0.2})`
        : `rgba(84,92,52,${0.2 + rnd() * 0.25})`;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // sparse dry scrub tufts
  for (let i = 0; i < 130; i++) {
    const x = rnd() * S, y = rnd() * S;
    g.strokeStyle = `rgba(96,98,58,${0.25 + rnd() * 0.3})`;
    g.lineWidth = 0.8;
    for (let k = 0; k < 6; k++) {
      const a = rnd() * Math.PI * 2, l = 2 + rnd() * 4;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l - 2); g.stroke();
    }
  }
  const t = toTexture(c, { repeat: [1, 1], aniso: 8 });
  return t;
}

export function asphaltTexture() {
  const S = 512, [c, g] = makeCanvas(S, S), rnd = mulberry32(202);
  g.fillStyle = '#3a3a3c'; g.fillRect(0, 0, S, S);
  const img = g.getImageData(0, 0, S, S), d = img.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const n = fbm2(x * 0.03, y * 0.03, 3), i = (y * S + x) * 4;
    const s = 0.85 + n * 0.3;
    d[i] = 58 * s; d[i + 1] = 58 * s; d[i + 2] = 61 * s; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 2400; i++) {
    g.fillStyle = `rgba(${140 + rnd() * 60},${140 + rnd() * 60},${140 + rnd() * 60},${0.05 + rnd() * 0.1})`;
    g.fillRect(rnd() * S, rnd() * S, 1.4, 1.4);
  }
  // cracks
  g.strokeStyle = 'rgba(20,20,22,0.5)'; g.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    let x = rnd() * S, y = rnd() * S;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (rnd() - 0.5) * 40; y += (rnd() - 0.5) * 40; g.lineTo(x, y); }
    g.stroke();
  }
  return toTexture(c, { repeat: [1, 1], aniso: 8 });
}

export function concreteTexture(withJoints = true) {
  const S = 512, [c, g] = makeCanvas(S, S), rnd = mulberry32(303);
  g.fillStyle = '#8d8d88'; g.fillRect(0, 0, S, S);
  const img = g.getImageData(0, 0, S, S), d = img.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const n = fbm2(x * 0.02 + 9, y * 0.02, 4), i = (y * S + x) * 4;
    const s = 0.86 + n * 0.26;
    d[i] = 141 * s; d[i + 1] = 141 * s; d[i + 2] = 136 * s; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(70,70,66,${0.04 + rnd() * 0.08})`;
    g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  // weather stains
  for (let i = 0; i < 26; i++) {
    const x = rnd() * S, y = rnd() * S, r = 14 + rnd() * 44;
    const grad = g.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, `rgba(60,58,50,${0.06 + rnd() * 0.1})`);
    grad.addColorStop(1, 'rgba(60,58,50,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  if (withJoints) {
    g.strokeStyle = 'rgba(40,40,38,0.65)'; g.lineWidth = 2.5;
    g.strokeRect(1, 1, S - 2, S - 2);
    g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.moveTo(0, S / 2); g.lineTo(S, S / 2); g.stroke();
  }
  return toTexture(c, { repeat: [1, 1], aniso: 8 });
}

export function hazardStripesTexture(colA = '#e8b820', colB = '#1c1c1c') {
  const S = 256, [c, g] = makeCanvas(S, S);
  g.fillStyle = colB; g.fillRect(0, 0, S, S);
  g.fillStyle = colA;
  const w = 32;
  for (let x = -S; x < S * 2; x += w * 2) {
    g.beginPath();
    g.moveTo(x, S); g.lineTo(x + S, 0); g.lineTo(x + S + w, 0); g.lineTo(x + w, S);
    g.closePath(); g.fill();
  }
  // grime
  const rnd = mulberry32(404);
  for (let i = 0; i < 300; i++) {
    g.fillStyle = `rgba(30,28,20,${0.05 + rnd() * 0.16})`;
    g.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 5, 1 + rnd() * 3);
  }
  return toTexture(c, { repeat: [1, 1] });
}

export function chainlinkTexture() {
  const S = 128, [c, g] = makeCanvas(S, S);
  g.clearRect(0, 0, S, S);
  g.strokeStyle = 'rgba(150,155,158,0.95)';
  g.lineWidth = 2.2;
  const step = 16;
  for (let y = -step; y < S + step; y += step) {
    for (let x = -step; x < S + step; x += step) {
      g.beginPath(); g.moveTo(x, y + step / 2); g.lineTo(x + step / 2, y); g.stroke();
      g.beginPath(); g.moveTo(x + step / 2, y); g.lineTo(x + step, y + step / 2); g.stroke();
      g.beginPath(); g.moveTo(x, y + step / 2); g.lineTo(x + step / 2, y + step); g.stroke();
      g.beginPath(); g.moveTo(x + step / 2, y + step); g.lineTo(x + step, y + step / 2); g.stroke();
    }
  }
  const t = toTexture(c, { repeat: [1, 1] });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function metalPanelTexture(base = '#5e6b58', seed = 7) {
  const S = 512, [c, g] = makeCanvas(S, S), rnd = mulberry32(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  // tonal variation
  for (let i = 0; i < 60; i++) {
    const x = rnd() * S, y = rnd() * S, r = 30 + rnd() * 90;
    const grad = g.createRadialGradient(x, y, 4, x, y, r);
    const v = rnd() < 0.5 ? 255 : 0;
    grad.addColorStop(0, `rgba(${v},${v},${v},${0.03 + rnd() * 0.05})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // panel seams
  g.strokeStyle = 'rgba(20,24,18,0.5)'; g.lineWidth = 2;
  const cols = 4, rows = 3;
  for (let i = 1; i < cols; i++) { g.beginPath(); g.moveTo((S / cols) * i, 0); g.lineTo((S / cols) * i, S); g.stroke(); }
  for (let i = 1; i < rows; i++) { g.beginPath(); g.moveTo(0, (S / rows) * i); g.lineTo(S, (S / rows) * i); g.stroke(); }
  // rivets
  g.fillStyle = 'rgba(28,32,26,0.8)';
  for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) {
    const px = Math.min(S - 6, Math.max(6, (S / cols) * i));
    const py = Math.min(S - 6, Math.max(6, (S / rows) * j));
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.arc(px + (k % 2 ? 10 : -10), py + (k > 1 ? 10 : -10), 2.2, 0, 7); g.fill();
    }
  }
  // grime streaks from top edges
  for (let i = 0; i < 40; i++) {
    const x = rnd() * S, y0 = rnd() * S * 0.5, len = 20 + rnd() * 80;
    const grad = g.createLinearGradient(x, y0, x, y0 + len);
    grad.addColorStop(0, `rgba(25,26,22,${0.12 + rnd() * 0.15})`);
    grad.addColorStop(1, 'rgba(25,26,22,0)');
    g.fillStyle = grad;
    g.fillRect(x, y0, 2 + rnd() * 4, len);
  }
  // scratches
  g.strokeStyle = 'rgba(180,185,175,0.25)'; g.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const x = rnd() * S, y = rnd() * S, a = rnd() * Math.PI, l = 8 + rnd() * 34;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return toTexture(c, { repeat: [1, 1] });
}

export function corrugatedTexture(base = '#66705f', seed = 12) {
  const S = 512, [c, g] = makeCanvas(S, S), rnd = mulberry32(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  // vertical corrugation ridges
  for (let x = 0; x < S; x += 16) {
    const grad = g.createLinearGradient(x, 0, x + 16, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.22)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.10)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.05)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = grad; g.fillRect(x, 0, 16, S);
  }
  for (let i = 0; i < 50; i++) {
    const x = rnd() * S, y0 = rnd() * S * 0.4, len = 30 + rnd() * 120;
    const grad = g.createLinearGradient(x, y0, x, y0 + len);
    grad.addColorStop(0, `rgba(40,36,26,${0.1 + rnd() * 0.22})`);
    grad.addColorStop(1, 'rgba(40,36,26,0)');
    g.fillStyle = grad; g.fillRect(x, y0, 3 + rnd() * 5, len);
  }
  return toTexture(c, { repeat: [1, 1] });
}

// Stencilled label plate (used for canisters, pads, containers).
export function stencilTexture(text, { fg = '#dfe3d4', bg = null, w = 256, h = 64, size = 30 } = {}) {
  const [c, g] = makeCanvas(w, h);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } else g.clearRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = `bold ${size}px "Courier New", monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 1);
  // stencil wear
  const rnd = mulberry32(text.length * 91 + 5);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(0,0,0,${0.3 + rnd() * 0.5})`;
    g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2);
  }
  g.globalCompositeOperation = 'source-over';
  return toTexture(c);
}

// HESCO-style gabion: tan geotextile fill behind a steel wire grid
export function hescoTexture() {
  const S = 256, [c, g] = makeCanvas(S, S), rnd = mulberry32(919);
  g.fillStyle = '#a08b66'; g.fillRect(0, 0, S, S);
  // fabric wrinkles
  for (let i = 0; i < 46; i++) {
    const x = rnd() * S, y = rnd() * S, w = 20 + rnd() * 60, h = 4 + rnd() * 10;
    g.fillStyle = `rgba(${rnd() < 0.5 ? '60,50,34' : '210,190,150'},${0.05 + rnd() * 0.09})`;
    g.beginPath(); g.ellipse(x, y, w, h, rnd() * 3, 0, 7); g.fill();
  }
  // dirt spill from top
  const grad = g.createLinearGradient(0, 0, 0, 44);
  grad.addColorStop(0, 'rgba(70,58,40,0.5)');
  grad.addColorStop(1, 'rgba(70,58,40,0)');
  g.fillStyle = grad; g.fillRect(0, 0, S, 44);
  // wire grid
  g.strokeStyle = 'rgba(70,72,74,0.85)';
  g.lineWidth = 2.2;
  const cell = S / 5;
  for (let i = 0; i <= 5; i++) {
    g.beginPath(); g.moveTo(i * cell, 0); g.lineTo(i * cell, S); g.stroke();
    g.beginPath(); g.moveTo(0, i * cell); g.lineTo(S, i * cell); g.stroke();
  }
  g.strokeStyle = 'rgba(90,92,94,0.4)';
  g.lineWidth = 1;
  for (let i = 0; i <= 15; i++) {
    g.beginPath(); g.moveTo(i * S / 15, 0); g.lineTo(i * S / 15, S); g.stroke();
    g.beginPath(); g.moveTo(0, i * S / 15); g.lineTo(S, i * S / 15); g.stroke();
  }
  return toTexture(c);
}

export function warnSignTexture() {
  const S = 256, [c, g] = makeCanvas(S, S * 0.7);
  g.fillStyle = '#e8e4da'; g.fillRect(0, 0, S, S * 0.7);
  g.strokeStyle = '#b03028'; g.lineWidth = 8; g.strokeRect(6, 6, S - 12, S * 0.7 - 12);
  g.fillStyle = '#b03028';
  g.font = 'bold 34px "Arial Narrow", sans-serif'; g.textAlign = 'center';
  g.fillText('RESTRICTED', S / 2, 62);
  g.fillText('AREA', S / 2, 100);
  g.fillStyle = '#333';
  g.font = 'bold 17px "Arial Narrow", sans-serif';
  g.fillText('AUTHORIZED PERSONNEL ONLY', S / 2, 140);
  return toTexture(c);
}

// ---------------------------------------------------------------- fx sprites
export function softSmokeTexture() {
  const S = 128, [c, g] = makeCanvas(S, S), rnd = mulberry32(551);
  g.clearRect(0, 0, S, S);
  // blotchy cloud: big soft body + smaller dense clumps for texture
  for (let i = 0; i < 10; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * S * 0.16;
    const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
    const rad = S * (0.18 + rnd() * 0.16);
    const maxRad = Math.min(x, y, S - x, S - y) - 1;
    const rr = Math.max(4, Math.min(rad, maxRad));
    const grad = g.createRadialGradient(x, y, 0, x, y, rr);
    grad.addColorStop(0, 'rgba(255,255,255,0.13)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
  }
  for (let i = 0; i < 22; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * S * 0.26;
    const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
    const rad = S * (0.04 + rnd() * 0.08);
    const maxRad = Math.min(x, y, S - x, S - y) - 1;
    const rr = Math.max(2, Math.min(rad, maxRad));
    const grad = g.createRadialGradient(x, y, 0, x, y, rr);
    grad.addColorStop(0, `rgba(255,255,255,${0.1 + rnd() * 0.14})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
  }
  const t = toTexture(c, { srgb: false });
  return t;
}

export function glowTexture() {
  const S = 64, [c, g] = makeCanvas(S, S);
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  return toTexture(c, { srgb: false });
}

export function fireTexture() {
  const S = 128, [c, g] = makeCanvas(S, S), rnd = mulberry32(661);
  g.clearRect(0, 0, S, S);
  for (let i = 0; i < 20; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * S * 0.18;
    const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
    const rad = S * (0.1 + rnd() * 0.22);
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, 'rgba(255,255,255,0.5)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  return toTexture(c, { srgb: false });
}

export function ringTexture() {
  const S = 128, [c, g] = makeCanvas(S, S);
  g.clearRect(0, 0, S, S);
  const grad = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.5);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.75, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.fill();
  return toTexture(c, { srgb: false });
}

export function craterTexture() {
  const S = 256, [c, g] = makeCanvas(S, S), rnd = mulberry32(771);
  g.clearRect(0, 0, S, S);
  const cx = S / 2, cy = S / 2;
  let grad = g.createRadialGradient(cx, cy, 0, cx, cy, S * 0.5);
  grad.addColorStop(0, 'rgba(12,10,8,0.95)');
  grad.addColorStop(0.35, 'rgba(20,16,12,0.8)');
  grad.addColorStop(0.7, 'rgba(30,24,18,0.35)');
  grad.addColorStop(1, 'rgba(30,24,18,0)');
  g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, S / 2, 0, 7); g.fill();
  // ejecta rays
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, l = S * (0.28 + rnd() * 0.24), w = 2 + rnd() * 7;
    g.save(); g.translate(cx, cy); g.rotate(a);
    const rg = g.createLinearGradient(0, 0, l, 0);
    rg.addColorStop(0, 'rgba(16,13,10,0.7)');
    rg.addColorStop(1, 'rgba(16,13,10,0)');
    g.fillStyle = rg;
    g.fillRect(S * 0.14, -w / 2, l, w);
    g.restore();
  }
  return toTexture(c, { srgb: false });
}

export function scorchTexture() {
  const S = 128, [c, g] = makeCanvas(S, S), rnd = mulberry32(881);
  g.clearRect(0, 0, S, S);
  for (let i = 0; i < 10; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * S * 0.16;
    const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
    const rad = S * (0.14 + rnd() * 0.22);
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, 'rgba(14,12,10,0.6)');
    grad.addColorStop(1, 'rgba(14,12,10,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  return toTexture(c, { srgb: false });
}

export function cloudPuffTexture() {
  const S = 256, [c, g] = makeCanvas(S, S), rnd = mulberry32(991);
  g.clearRect(0, 0, S, S);
  for (let i = 0; i < 30; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * S * 0.16;
    const x = S / 2 + Math.cos(a) * r * 1.5, y = S / 2 + Math.sin(a) * r * 0.7;
    const rad = S * (0.07 + rnd() * 0.1);
    // keep every gradient fully inside the canvas to avoid hard quad edges
    const maxRad = Math.min(x, y, S - x, S - y) - 2;
    const rr = Math.max(4, Math.min(rad, maxRad));
    const grad = g.createRadialGradient(x, y, 0, x, y, rr);
    grad.addColorStop(0, 'rgba(255,255,255,0.20)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.09)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
  }
  return toTexture(c, { srgb: false });
}

export function cirrusTexture() {
  const S = 512, [c, g] = makeCanvas(S, S / 2);
  g.clearRect(0, 0, S, S / 2);
  const img = g.getImageData(0, 0, S, S / 2), d = img.data;
  for (let y = 0; y < S / 2; y++) for (let x = 0; x < S; x++) {
    const n = fbm2(x * 0.012, y * 0.05, 4);
    const streak = Math.pow(Math.max(0, n - 0.42) * 1.9, 1.6);
    const i = (y * S + x) * 4;
    d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
    d[i + 3] = Math.min(255, streak * 150) * (0.4 + 0.6 * Math.sin((y / (S / 2)) * Math.PI));
  }
  g.putImageData(img, 0, 0);
  const t = toTexture(c, { srgb: false });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function blowoutCoverTexture(open = false) {
  const S = 128, [c, g] = makeCanvas(S, S);
  if (open) {
    // burnt open tube
    const grad = g.createRadialGradient(S / 2, S / 2, 6, S / 2, S / 2, S / 2);
    grad.addColorStop(0, '#050505');
    grad.addColorStop(0.72, '#141210');
    grad.addColorStop(0.88, '#2a2018');
    grad.addColorStop(1, '#3c3428');
    g.fillStyle = grad; g.fillRect(0, 0, S, S);
  } else {
    g.fillStyle = '#5a6452'; g.fillRect(0, 0, S, S);
    g.strokeStyle = '#39412f'; g.lineWidth = 3;
    g.beginPath(); g.arc(S / 2, S / 2, S * 0.42, 0, 7); g.stroke();
    // X-seams
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(S * 0.14, S * 0.14); g.lineTo(S * 0.86, S * 0.86);
    g.moveTo(S * 0.86, S * 0.14); g.lineTo(S * 0.14, S * 0.86); g.stroke();
    g.fillStyle = '#39412f';
    g.beginPath(); g.arc(S / 2, S / 2, 5, 0, 7); g.fill();
  }
  return toTexture(c);
}

// Heat discoloration strip (blued / burnt metal gradient) for muzzle ends.
export function heatTexture() {
  const W = 256, H = 64, [c, g] = makeCanvas(W, H);
  const grad = g.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0.0, 'rgba(20,16,14,0.9)');
  grad.addColorStop(0.25, 'rgba(48,34,26,0.75)');
  grad.addColorStop(0.5, 'rgba(88,62,80,0.5)');
  grad.addColorStop(0.75, 'rgba(60,80,110,0.3)');
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const rnd = mulberry32(444);
  for (let i = 0; i < 200; i++) {
    g.fillStyle = `rgba(10,8,6,${0.1 + rnd() * 0.25})`;
    g.fillRect(rnd() * W * 0.55, rnd() * H, 1 + rnd() * 4, 1 + rnd() * 2);
  }
  return toTexture(c, { srgb: false });
}

// horizontal soft falloff for ribbon trails (u = across the strip)
export function trailEdgeTexture() {
  const W = 64, H = 8, [c, g] = makeCanvas(W, H);
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / (W - 1);
    const a = Math.pow(Math.sin(u * Math.PI), 1.35);
    const i = (y * W + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
    img.data[i + 3] = Math.round(a * 255);
  }
  g.putImageData(img, 0, 0);
  const t = toTexture(c, { srgb: false });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function streakTexture() {
  const W = 64, H = 8, [c, g] = makeCanvas(W, H);
  const grad = g.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  return toTexture(c, { srgb: false });
}
