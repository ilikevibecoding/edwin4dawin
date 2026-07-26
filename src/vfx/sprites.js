import * as THREE from 'three';
import { rand, randRange, randSpread, randInt } from '../core/rand.js';

const TAU = Math.PI * 2;

function canvasTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2;
  return t;
}

/** Soft radial blob helper. */
function blotch(g, x, y, r, rgb, a) {
  const grad = g.createRadialGradient(x, y, 0, x, y, Math.max(r, 1));
  grad.addColorStop(0, `rgba(${rgb},${a})`);
  grad.addColorStop(0.55, `rgba(${rgb},${a * 0.55})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

/** Simple radial gradient sprite (soft glow / hard spark cores). */
function circleSprite(size, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return canvasTexture(c);
}

/**
 * 2x2 atlas of blotchy fireball sprites. All white — color comes from the
 * GPU fire ramp, so the same atlas serves white-hot cores and dying embers.
 */
function fireAtlas() {
  const T = 256, c = document.createElement('canvas');
  c.width = c.height = T * 2;
  const g = c.getContext('2d');
  for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
    g.save();
    g.translate(tx * T, ty * T);
    g.beginPath(); g.rect(0, 0, T, T); g.clip();
    const cx = T / 2, cy = T / 2;
    // main body: clustered blobs, denser toward center
    for (let i = 0; i < 20; i++) {
      const a = rand() * TAU;
      const rr = Math.pow(rand(), 0.75) * T * 0.27;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      const rad = T * randRange(0.09, 0.2) * (1 - (rr / (T * 0.3)) * 0.45);
      blotch(g, x, y, rad, '255,255,255', randRange(0.22, 0.5));
    }
    // hot core, slightly off-center for asymmetry
    const ox = randSpread(T * 0.06), oy = randSpread(T * 0.06);
    blotch(g, cx + ox, cy + oy, T * 0.17, '255,255,255', 0.95);
    blotch(g, cx + ox * 0.5, cy + oy * 0.5, T * 0.1, '255,255,255', 1);
    // ragged edge cutouts
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 7; i++) {
      const a = rand() * TAU;
      const rr = T * randRange(0.24, 0.4);
      blotch(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, T * randRange(0.06, 0.13), '0,0,0', randRange(0.35, 0.7));
    }
    g.globalCompositeOperation = 'source-over';
    g.restore();
  }
  return canvasTexture(c);
}

/**
 * 2x2 atlas of smoke puffs with baked top-light shading so puffs read as
 * volume instead of flat cards. Tint via particle color.
 */
function smokeAtlas() {
  const T = 256, c = document.createElement('canvas');
  c.width = c.height = T * 2;
  const g = c.getContext('2d');
  for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
    g.save();
    g.translate(tx * T, ty * T);
    g.beginPath(); g.rect(0, 0, T, T); g.clip();
    const cx = T / 2, cy = T / 2;
    for (let i = 0; i < 30; i++) {
      const a = rand() * TAU;
      const rr = Math.pow(rand(), 0.8) * T * 0.24;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.9;
      const rad = T * randRange(0.1, 0.19);
      // top-lit: lobes near the top of the sprite are brighter
      const lit = Math.min(1, Math.max(0, 0.42 + 0.75 * (1 - y / T) + randSpread(0.08)));
      const v = Math.round(120 + 135 * lit);
      blotch(g, x, y, rad, `${v},${v},${v}`, randRange(0.22, 0.34));
    }
    // dark under-shadow, biased to lower half
    g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 8; i++) {
      const x = cx + randSpread(T * 0.22), y = cy + T * randRange(0.04, 0.24);
      blotch(g, x, y, T * randRange(0.09, 0.16), '20,18,16', randRange(0.12, 0.24));
    }
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 6; i++) {
      const a = rand() * TAU;
      const rr = T * randRange(0.26, 0.4);
      blotch(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, T * randRange(0.05, 0.11), '0,0,0', randRange(0.3, 0.55));
    }
    g.globalCompositeOperation = 'source-over';
    g.restore();
  }
  return canvasTexture(c);
}

/** Tapered spike polygon filled with a fading gradient, along +X from origin. */
function spike(g, len, w, alpha) {
  const grad = g.createLinearGradient(0, 0, len, 0);
  grad.addColorStop(0, `rgba(255,250,240,${alpha})`);
  grad.addColorStop(0.35, `rgba(255,230,190,${alpha * 0.7})`);
  grad.addColorStop(1, 'rgba(255,190,120,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, -w);
  g.quadraticCurveTo(len * 0.35, -w * 0.42, len, 0);
  g.quadraticCurveTo(len * 0.35, w * 0.42, 0, w);
  g.closePath();
  g.fill();
}

/**
 * 2x2 atlas of star muzzle flashes: 4-6 irregular main spikes, short
 * perpendicular brake spikes, hot core. White-warm; HDR tint at emit time.
 */
function flashAtlas() {
  const T = 256, c = document.createElement('canvas');
  c.width = c.height = T * 2;
  const g = c.getContext('2d');
  for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
    g.save();
    g.translate(tx * T + T / 2, ty * T + T / 2);
    const n = randInt(4, 6);
    const base = rand() * TAU;
    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * TAU + randSpread(0.55 / n * TAU);
      const long = rand() < 0.35;
      const len = T * (long ? randRange(0.34, 0.46) : randRange(0.16, 0.28));
      g.save();
      g.rotate(a);
      spike(g, len, T * randRange(0.014, 0.03), randRange(0.75, 1));
      g.restore();
    }
    // brake spikes: a matched perpendicular pair, shorter and wider
    const brakeA = base + randSpread(0.4);
    for (const s of [0, Math.PI]) {
      g.save();
      g.rotate(brakeA + s + Math.PI / 2);
      spike(g, T * randRange(0.14, 0.2), T * randRange(0.025, 0.04), 0.85);
      g.restore();
    }
    // core
    blotch(g, 0, 0, T * 0.1, '255,252,245', 1);
    blotch(g, 0, 0, T * 0.2, '255,235,200', 0.55);
    blotch(g, 0, 0, T * 0.34, '255,210,150', 0.22);
    g.restore();
  }
  return canvasTexture(c);
}

/**
 * Tracer strip: bright white-hot head at top (v=1), orange tail fading to
 * nothing, width tapering toward the tail. Mapped onto the stretched quad.
 */
function tracerTexture() {
  const W = 32, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);            // 0 = head (canvas top), 1 = tail
    const head = Math.pow(1 - t, 1.6);
    const rr = Math.round(255);
    const gg = Math.round(140 + 115 * head);
    const bb = Math.round(50 + 195 * Math.pow(head, 2.2));
    const alpha = t < 0.04 ? t / 0.04 : Math.pow(1 - t, 1.25);
    const halfW = (W / 2) * (0.26 + 0.66 * head);
    const grad = g.createLinearGradient(W / 2 - halfW, 0, W / 2 + halfW, 0);
    grad.addColorStop(0, `rgba(${rr},${gg},${bb},0)`);
    grad.addColorStop(0.4, `rgba(${rr},${gg},${bb},${alpha})`);
    grad.addColorStop(0.6, `rgba(${rr},${gg},${bb},${alpha})`);
    grad.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, y, W, 1);
  }
  return canvasTexture(c);
}

/** Bullet hole: dark center, radial cracks, subtle top-left rim highlight. */
function bulletHoleTexture() {
  const S = 96, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const cx = S / 2, cy = S / 2;
  // surrounding dust/darkening
  blotch(g, cx, cy, S * 0.46, '28,24,20', 0.4);
  // radial cracks
  const n = randInt(4, 7);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + randSpread(0.5);
    let x = cx, y = cy, ca = a;
    const segs = randInt(2, 4);
    const totalLen = S * randRange(0.18, 0.34);
    g.strokeStyle = `rgba(10,8,6,${randRange(0.5, 0.8)})`;
    g.lineCap = 'round';
    for (let sgi = 0; sgi < segs; sgi++) {
      g.lineWidth = Math.max(0.6, 2.4 * (1 - sgi / segs));
      const sl = totalLen / segs;
      const nx = x + Math.cos(ca) * sl, ny = y + Math.sin(ca) * sl;
      g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
      x = nx; y = ny; ca += randSpread(0.55);
    }
  }
  // pit
  blotch(g, cx, cy, S * 0.2, '6,5,4', 0.95);
  blotch(g, cx + randSpread(2), cy + randSpread(2), S * 0.11, '2,2,2', 1);
  // rim highlight (catching light from above)
  g.strokeStyle = 'rgba(255,240,215,0.4)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(cx, cy, S * 0.15, Math.PI * 0.95, Math.PI * 1.7);
  g.stroke();
  g.strokeStyle = 'rgba(255,240,215,0.16)';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cy, S * 0.17, Math.PI * 1.05, Math.PI * 1.6);
  g.stroke();
  return canvasTexture(c);
}

/** Blood splat: dark red blotch cluster with a few downward drips. */
function bloodSplatTexture() {
  const S = 96, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const cx = S / 2, cy = S / 2 - S * 0.06;
  for (let i = 0; i < 9; i++) {
    const a = rand() * TAU, rr = Math.pow(rand(), 0.7) * S * 0.16;
    blotch(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, S * randRange(0.08, 0.16), '58,8,6', randRange(0.5, 0.85));
  }
  blotch(g, cx, cy, S * 0.1, '38,5,4', 0.9);
  // satellites
  for (let i = 0; i < 7; i++) {
    const a = rand() * TAU, rr = S * randRange(0.2, 0.36);
    blotch(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, S * randRange(0.02, 0.05), '52,7,5', randRange(0.5, 0.8));
  }
  // drips
  for (let i = 0; i < 3; i++) {
    const x = cx + randSpread(S * 0.16);
    const len = S * randRange(0.12, 0.3);
    const grad = g.createLinearGradient(x, cy, x, cy + len);
    grad.addColorStop(0, 'rgba(54,7,5,0.75)');
    grad.addColorStop(1, 'rgba(44,6,4,0)');
    g.fillStyle = grad;
    g.fillRect(x - 1.2, cy, 2.4, len);
    blotch(g, x, cy + len * 0.85, 2.2, '48,6,5', 0.7);
  }
  return canvasTexture(c);
}

/** Scorch mark: blotchy asymmetric char with radial streaks + brown fringe. */
function scorchTexture() {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const cx = S / 2, cy = S / 2;
  // charred body from overlapping blobs
  for (let i = 0; i < 12; i++) {
    const a = rand() * TAU, rr = Math.pow(rand(), 0.8) * S * 0.17;
    blotch(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, S * randRange(0.13, 0.22), '8,7,6', randRange(0.5, 0.85));
  }
  blotch(g, cx, cy, S * 0.14, '4,4,4', 0.95);
  // radial streaks (tapered)
  for (let i = 0; i < 22; i++) {
    const a = rand() * TAU;
    const len = S * randRange(0.2, 0.44);
    g.save();
    g.translate(cx, cy);
    g.rotate(a);
    const grad = g.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, `rgba(10,9,8,${randRange(0.3, 0.55)})`);
    grad.addColorStop(1, 'rgba(15,12,9,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(S * 0.05, -S * randRange(0.012, 0.03));
    g.lineTo(len, 0);
    g.lineTo(S * 0.05, S * randRange(0.012, 0.03));
    g.closePath();
    g.fill();
    g.restore();
  }
  // scorched-brown fringe
  g.globalCompositeOperation = 'destination-over';
  for (let i = 0; i < 10; i++) {
    const a = rand() * TAU, rr = S * randRange(0.16, 0.26);
    blotch(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, S * randRange(0.1, 0.18), '52,36,22', randRange(0.14, 0.26));
  }
  g.globalCompositeOperation = 'source-over';
  return canvasTexture(c);
}

/** Build every VFX texture once at startup. */
export function makeTextures() {
  return {
    soft: circleSprite(128, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]),
    hard: circleSprite(64, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.9)'], [0.72, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]),
    fire: fireAtlas(),
    smoke: smokeAtlas(),
    flash: flashAtlas(),
    tracer: tracerTexture(),
    holes: [bulletHoleTexture(), bulletHoleTexture(), bulletHoleTexture()],
    scorch: scorchTexture(),
    blood: bloodSplatTexture(),
  };
}
