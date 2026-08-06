// textures.js — every texture in the game is generated on <canvas>. No downloads.
import * as THREE from 'three';
import { Rand, fbm2D, clamp } from './util.js';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(canvas, { srgb = true, repeat = null, aniso = 4, filter = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  tex.anisotropy = aniso;
  if (!filter) { tex.magFilter = THREE.NearestFilter; }
  tex.generateMipmaps = true;
  return tex;
}

export function createTextures() {
  const rng = new Rand(1337);
  const cache = new Map();
  const memo = (key, fn) => {
    if (!cache.has(key)) cache.set(key, fn());
    return cache.get(key);
  };

  // ---------- ground / hard surfaces ----------

  const sand = () => memo('sand', () => {
    // macro tone variation rendered small, upscaled (cheap smooth fbm blend)
    const [mc, mg] = makeCanvas(256, 256);
    const mimg = mg.createImageData(256, 256);
    const A = [176, 147, 104]; // base tan
    const B = [203, 176, 131]; // light wash
    const C = [148, 113, 76];  // reddish-brown
    const D = [210, 198, 163]; // pale alkali flat
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        const n1 = fbm2D(x / 46 + 11, y / 46 - 4, 4);
        const n2 = fbm2D(x / 17 - 8, y / 17 + 21, 3);
        // anisotropic windrow bands (aligned with ripple bearing below)
        const wr = fbm2D((x * 0.82 - y * 0.5) / 60 + 31, (x * 0.5 + y * 0.82) / 21 - 14, 3);
        // blend base->light by n1, push toward red-brown in n2 valleys
        let r = A[0] + (B[0] - A[0]) * n1, g2 = A[1] + (B[1] - A[1]) * n1, b = A[2] + (B[2] - A[2]) * n1;
        const w = clamp((0.46 - n2) * 2.4, 0, 1);
        r += (C[0] - r) * w * 0.72; g2 += (C[1] - g2) * w * 0.72; b += (C[2] - b) * w * 0.72;
        // darker compacted windrow bands
        const wb = clamp((0.40 - wr) * 3.0, 0, 1) * 0.34;
        r *= 1 - wb * 0.28; g2 *= 1 - wb * 0.26; b *= 1 - wb * 0.2;
        // occasional pale alkali pans
        const p = clamp((n1 - 0.70) * 5, 0, 1);
        r += (D[0] - r) * p; g2 += (D[1] - g2) * p; b += (D[2] - b) * p;
        mimg.data[i] = r; mimg.data[i + 1] = g2; mimg.data[i + 2] = b; mimg.data[i + 3] = 255;
      }
    }
    mg.putImageData(mimg, 0, 0);

    const [c, g] = makeCanvas(1024, 1024);
    g.imageSmoothingEnabled = true;
    g.drawImage(mc, 0, 0, 1024, 1024);

    // wind ripple striations (consistent bearing, subtle)
    g.save();
    g.translate(512, 512);
    g.rotate(-0.52);
    for (let i = 0; i < 1500; i++) {
      const x = rng.range(-760, 760), y = rng.range(-760, 760);
      const len = rng.range(26, 90), wobble = rng.range(-8, 8);
      const light = rng.next() < 0.5;
      g.strokeStyle = light ? `rgba(228,206,166,${rng.range(0.05, 0.13)})` : `rgba(96,76,52,${rng.range(0.05, 0.12)})`;
      g.lineWidth = rng.range(1, 2.6);
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + len * 0.5, y + wobble, x + len, y);
      g.stroke();
    }
    g.restore();

    // fine grain
    const img = g.getImageData(0, 0, 1024, 1024);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng.next() - 0.5) * 22;
      d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.9;
    }
    g.putImageData(img, 0, 0);

    // scattered pebbles + darker gravel flecks + scrub shadows
    for (let i = 0; i < 1500; i++) {
      const x = rng.next() * 1024, y = rng.next() * 1024;
      g.fillStyle = rng.next() < 0.6 ? 'rgba(92,74,52,0.5)' : 'rgba(160,140,106,0.55)';
      g.beginPath(); g.arc(x, y, rng.range(0.6, 2.2), 0, 7); g.fill();
    }
    for (let i = 0; i < 70; i++) {
      const x = rng.next() * 1024, y = rng.next() * 1024;
      g.fillStyle = 'rgba(96,92,58,0.26)';
      g.beginPath(); g.arc(x, y, rng.range(3, 8), 0, 7); g.fill();
    }
    return toTexture(c, { repeat: [150, 150], aniso: 8 });
  });

  const concrete = () => memo('concrete', () => {
    const [c, g] = makeCanvas(1024, 1024);
    g.fillStyle = '#94928a';
    g.fillRect(0, 0, 1024, 1024);
    // per-slab tone variation (4x4 slabs) — pours differ subtly
    for (let sy = 0; sy < 4; sy++) {
      for (let sx = 0; sx < 4; sx++) {
        const l = rng.int(-9, 9);
        const warm = rng.int(-3, 4);
        g.fillStyle = `rgba(${148 + l + warm},${146 + l},${138 + l - warm},0.5)`;
        g.fillRect(sx * 256, sy * 256, 256, 256);
      }
    }
    for (let i = 0; i < 220; i++) {
      const x = rng.next() * 1024, y = rng.next() * 1024, r = rng.range(24, 130);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      const tone = rng.pick(['#8b8a82', '#a09f96', '#868589', '#999890', '#8f8d80']);
      grad.addColorStop(0, tone + '44');
      grad.addColorStop(1, tone + '00');
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const img = g.getImageData(0, 0, 1024, 1024);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng.next() - 0.5) * 18;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // tire scuff arcs
    for (let i = 0; i < 14; i++) {
      const x = rng.next() * 1024, y = rng.next() * 1024, r = rng.range(60, 220);
      const a0 = rng.next() * 7;
      g.strokeStyle = `rgba(38,36,34,${rng.range(0.05, 0.16)})`;
      g.lineWidth = rng.range(6, 14);
      g.beginPath(); g.arc(x, y, r, a0, a0 + rng.range(0.4, 1.4)); g.stroke();
    }
    // sand drift wisps blown across the slab
    for (let i = 0; i < 26; i++) {
      const x = rng.next() * 1024, y = rng.next() * 1024, len = rng.range(60, 200);
      g.strokeStyle = `rgba(168,148,110,${rng.range(0.05, 0.14)})`;
      g.lineWidth = rng.range(4, 16);
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + len * 0.5, y + rng.range(-16, 16), x + len, y + rng.range(-10, 10));
      g.stroke();
    }
    // expansion joints (tile 4x4): dark tar line + lighter chipped edge
    for (let i = 0; i <= 4; i++) {
      const p = Math.min(1022, Math.max(2, i * 256));
      g.strokeStyle = 'rgba(206,204,196,0.35)';
      g.lineWidth = 7;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 1024); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(1024, p); g.stroke();
      g.strokeStyle = 'rgba(58,56,52,0.55)';
      g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 1024); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(1024, p); g.stroke();
    }
    // cracks: directional meanders (dominant direction + small lateral jitter)
    // so they read as settling cracks instead of scribbles
    for (let i = 0; i < 11; i++) {
      let x = rng.next() * 1024, y = rng.next() * 1024;
      const dir = rng.next() * Math.PI * 2;
      const dx = Math.cos(dir), dy = Math.sin(dir);
      g.strokeStyle = `rgba(88,86,80,${rng.range(0.18, 0.3)})`;
      g.lineWidth = rng.range(0.8, 1.3);
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 12; s++) {
        const step = rng.range(14, 30);
        const lat = rng.range(-7, 7);
        x += dx * step - dy * lat; y += dy * step + dx * lat;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    // oil stains
    for (let i = 0; i < 14; i++) {
      const x = rng.next() * 1024, y = rng.next() * 1024, r = rng.range(10, 44);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(30,28,26,0.35)');
      grad.addColorStop(1, 'rgba(30,28,26,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    return toTexture(c, { repeat: [10, 10], aniso: 8 });
  });

  const asphalt = () => memo('asphalt', () => {
    const [c, g] = makeCanvas(512, 512);
    g.fillStyle = '#3c3d3f';
    g.fillRect(0, 0, 512, 512);
    const img = g.getImageData(0, 0, 512, 512);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng.next() - 0.5) * 24;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = rng.next() < 0.5 ? 'rgba(90,90,92,0.4)' : 'rgba(20,20,22,0.4)';
      g.beginPath(); g.arc(rng.next() * 512, rng.next() * 512, rng.range(0.5, 2), 0, 7); g.fill();
    }
    // sand drift at edges
    const drift = g.createLinearGradient(0, 0, 512, 0);
    drift.addColorStop(0.0, 'rgba(150,128,92,0.5)');
    drift.addColorStop(0.06, 'rgba(150,128,92,0.12)');
    drift.addColorStop(0.12, 'rgba(150,128,92,0)');
    drift.addColorStop(0.88, 'rgba(150,128,92,0)');
    drift.addColorStop(0.94, 'rgba(150,128,92,0.12)');
    drift.addColorStop(1.0, 'rgba(150,128,92,0.5)');
    g.fillStyle = drift;
    g.fillRect(0, 0, 512, 512);
    // wheel wear bands
    const wear = g.createLinearGradient(0, 0, 512, 0);
    wear.addColorStop(0.0, 'rgba(0,0,0,0)');
    wear.addColorStop(0.22, 'rgba(24,24,26,0.35)');
    wear.addColorStop(0.5, 'rgba(0,0,0,0)');
    wear.addColorStop(0.78, 'rgba(24,24,26,0.35)');
    wear.addColorStop(1.0, 'rgba(0,0,0,0)');
    g.fillStyle = wear;
    g.fillRect(0, 0, 512, 512);
    // patch repairs
    for (let i = 0; i < 7; i++) {
      const x = rng.next() * 512, y = rng.next() * 512, w = rng.range(30, 90), h = rng.range(20, 60);
      g.fillStyle = `rgba(20,20,23,${rng.range(0.18, 0.32)})`;
      g.fillRect(x, y, w, h);
    }
    return toTexture(c, { repeat: [1, 14], aniso: 8 });
  });

  const gravel = () => memo('gravel', () => {
    const [c, g] = makeCanvas(256, 256);
    g.fillStyle = '#8d7c60';
    g.fillRect(0, 0, 256, 256);
    const img = g.getImageData(0, 0, 256, 256);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng.next() - 0.5) * 26;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 900; i++) {
      const x = rng.next() * 256, y = rng.next() * 256, r = rng.range(0.8, 3.4);
      const l = rng.int(-40, 44);
      g.fillStyle = `rgba(${141 + l},${124 + l},${96 + l},0.85)`;
      g.beginPath(); g.ellipse(x, y, r, r * rng.range(0.55, 1), rng.next() * 3, 0, 7); g.fill();
      g.fillStyle = 'rgba(40,34,26,0.25)';
      g.beginPath(); g.ellipse(x + r * 0.4, y + r * 0.45, r * 0.8, r * 0.5, rng.next() * 3, 0, 7); g.fill();
    }
    return toTexture(c, { repeat: [1, 1], aniso: 8 });
  });

  // twin tire ruts decal (V runs along direction of travel)
  const sandTracks = () => memo('sandTracks', () => {
    const [c, g] = makeCanvas(128, 256);
    g.clearRect(0, 0, 128, 256);
    for (const cx of [36, 92]) {
      // compacted dark rut with soft edges
      const grad = g.createLinearGradient(cx - 16, 0, cx + 16, 0);
      grad.addColorStop(0, 'rgba(88,70,48,0)');
      grad.addColorStop(0.3, 'rgba(88,70,48,0.42)');
      grad.addColorStop(0.5, 'rgba(72,58,40,0.5)');
      grad.addColorStop(0.7, 'rgba(88,70,48,0.42)');
      grad.addColorStop(1, 'rgba(88,70,48,0)');
      g.fillStyle = grad;
      g.fillRect(cx - 16, 0, 32, 256);
      // tread dashes
      for (let y = 2; y < 256; y += 7) {
        g.fillStyle = `rgba(42,34,24,${rng.range(0.25, 0.5)})`;
        g.fillRect(cx - 9 + rng.range(-1.5, 1.5), y, 18, rng.range(2, 3.4));
      }
      // bright displaced-sand berms either side
      for (const s of [-1, 1]) {
        g.fillStyle = 'rgba(226,204,162,0.22)';
        g.fillRect(cx + s * 17 - 2, 0, 4, 256);
      }
    }
    // center crown lightly brushed
    g.fillStyle = 'rgba(210,188,148,0.10)';
    g.fillRect(56, 0, 16, 256);
    for (let i = 0; i < 130; i++) g.clearRect(rng.next() * 128, rng.next() * 256, 3, 2);
    const tex = toTexture(c, { srgb: true });
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });

  // ---------- military finishes ----------

  const camo = (key, base, blotches) => memo('camo:' + key, () => {
    const [c, g] = makeCanvas(512, 512);
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 512);
    for (const color of blotches) {
      for (let i = 0; i < 26; i++) {
        const x = rng.next() * 512, y = rng.next() * 512;
        g.fillStyle = color;
        g.beginPath();
        let a0 = rng.next() * 7;
        g.moveTo(x + Math.cos(a0) * 30, y + Math.sin(a0) * 30);
        for (let s = 1; s <= 8; s++) {
          const a = a0 + (s / 8) * Math.PI * 2;
          const r = rng.range(18, 66);
          g.quadraticCurveTo(
            x + Math.cos(a - 0.3) * r * 1.25, y + Math.sin(a - 0.3) * r * 1.25,
            x + Math.cos(a) * r, y + Math.sin(a) * r
          );
        }
        g.fill();
      }
    }
    // scratches & dust
    const img = g.getImageData(0, 0, 512, 512);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng.next() - 0.5) * 14;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = `rgba(30,28,24,${rng.range(0.08, 0.3)})`;
      g.lineWidth = rng.range(0.5, 1.4);
      const x = rng.next() * 512, y = rng.next() * 512;
      g.beginPath(); g.moveTo(x, y);
      g.lineTo(x + rng.range(-40, 40), y + rng.range(-12, 12));
      g.stroke();
    }
    return toTexture(c, { repeat: [1, 1], aniso: 4 });
  });

  const desertTan = () => camo('tan', '#a08a62', ['#8f7a54cc', '#b09a70bb', '#79684abb']);
  const oliveDrab = () => camo('olive', '#5c6248', ['#4d5340cc', '#6a7052bb', '#42472fbb']);

  const metalPlate = () => memo('metalPlate', () => {
    const [c, g] = makeCanvas(512, 512);
    g.fillStyle = '#7d8287';
    g.fillRect(0, 0, 512, 512);
    const img = g.getImageData(0, 0, 512, 512);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng.next() - 0.5) * 16;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // panel lines + rivets
    g.strokeStyle = 'rgba(40,42,46,0.65)';
    g.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke();
      g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke();
    }
    g.fillStyle = 'rgba(50,52,56,0.8)';
    for (let x = 16; x < 512; x += 32) {
      for (let y = 16; y < 512; y += 128) {
        g.beginPath(); g.arc(x, y + 6, 2.2, 0, 7); g.fill();
      }
    }
    return toTexture(c, { repeat: [1, 1] });
  });

  // heat discoloration for nozzles / canister mouths
  const heatBurn = () => memo('heatBurn', () => {
    const [c, g] = makeCanvas(256, 256);
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#242021');
    grad.addColorStop(0.35, '#403132');
    grad.addColorStop(0.6, '#5e4a3a');
    grad.addColorStop(0.78, '#6f6252');
    grad.addColorStop(1, '#7c7a74');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 500; i++) {
      const y = rng.next() * 256;
      g.fillStyle = `rgba(20,16,14,${(1 - y / 256) * 0.4 * rng.next()})`;
      g.fillRect(rng.next() * 256, y, rng.range(2, 14), rng.range(1, 3));
    }
    // bluish anneal band
    g.fillStyle = 'rgba(70,90,140,0.18)';
    g.fillRect(0, 90, 256, 46);
    return toTexture(c, { repeat: [3, 1] });
  });

  const hazardStripes = () => memo('hazard', () => {
    const [c, g] = makeCanvas(256, 64);
    g.fillStyle = '#c9a227';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#17181a';
    for (let x = -64; x < 300; x += 64) {
      g.beginPath();
      g.moveTo(x, 64); g.lineTo(x + 32, 0); g.lineTo(x + 64, 0); g.lineTo(x + 32, 64);
      g.fill();
    }
    // wear
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(120,110,90,${rng.range(0.05, 0.3)})`;
      g.fillRect(rng.next() * 256, rng.next() * 64, rng.range(1, 5), rng.range(1, 3));
    }
    return toTexture(c, { repeat: [8, 1] });
  });

  // galvanized chainlink: bright strands + shadow pass so it stays visible
  // (light gray, not a dark band) when mipmapped at distance
  const chainlink = () => memo('chainlink', () => {
    const [c, g] = makeCanvas(128, 128);
    g.clearRect(0, 0, 128, 128);
    const s = 32;
    // dark under-stroke (reads as wire thickness/shadow)
    g.strokeStyle = 'rgba(58,64,70,0.85)';
    g.lineWidth = 4;
    for (let i = -4; i < 8; i++) {
      g.beginPath(); g.moveTo(i * s, -8); g.lineTo(i * s + 136, 136); g.stroke();
      g.beginPath(); g.moveTo(i * s + 136, -8); g.lineTo(i * s, 136); g.stroke();
    }
    // bright galvanized strand
    g.strokeStyle = 'rgba(226,232,238,0.98)';
    g.lineWidth = 2.2;
    for (let i = -4; i < 8; i++) {
      g.beginPath(); g.moveTo(i * s, -8); g.lineTo(i * s + 136, 136); g.stroke();
      g.beginPath(); g.moveTo(i * s + 136, -8); g.lineTo(i * s, 136); g.stroke();
    }
    // knuckle highlights at weave crossings
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (let y = 0; y < 128; y += 16) {
      for (let x = ((y / 16) % 2) * 16; x < 128; x += 32) {
        g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill();
      }
    }
    const tex = toTexture(c, { repeat: [1, 1], aniso: 8 });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });

  // HESCO bastion: tan geotextile fabric behind a bright galvanized wire grid
  const hescoFabric = () => memo('hescoFabric', () => {
    const [c, g] = makeCanvas(256, 256);
    g.fillStyle = '#b2996c';
    g.fillRect(0, 0, 256, 256);
    // fabric wrinkles (vertical streaks, sagging between grid cells)
    for (let i = 0; i < 220; i++) {
      const x = rng.next() * 256;
      g.strokeStyle = rng.next() < 0.5 ? `rgba(84,66,44,${rng.range(0.05, 0.16)})` : `rgba(210,188,146,${rng.range(0.05, 0.14)})`;
      g.lineWidth = rng.range(1, 3);
      g.beginPath();
      g.moveTo(x, rng.range(-10, 40));
      g.quadraticCurveTo(x + rng.range(-6, 6), 128, x + rng.range(-10, 10), 256 + 10);
      g.stroke();
    }
    // dust gradient: darker at the foot, bleached top
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(226,208,168,0.20)');
    grad.addColorStop(0.75, 'rgba(120,96,64,0.08)');
    grad.addColorStop(1, 'rgba(84,66,46,0.4)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    // cell sag shading (fabric bulges between wires)
    for (let gy = 0; gy < 5; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        const cx = gx * 51.2 + 25.6, cy = gy * 51.2 + 25.6;
        const rgrad = g.createRadialGradient(cx, cy + 8, 4, cx, cy + 8, 30);
        rgrad.addColorStop(0, 'rgba(228,206,164,0.12)');
        rgrad.addColorStop(0.8, 'rgba(70,56,38,0.10)');
        rgrad.addColorStop(1, 'rgba(70,56,38,0)');
        g.fillStyle = rgrad;
        g.fillRect(cx - 32, cy - 26, 64, 64);
      }
    }
    // wire grid overlay: shadow pass then bright galvanized pass
    for (const [w, col, off] of [[4, 'rgba(52,48,40,0.55)', 1.6], [1.8, 'rgba(214,220,226,0.9)', 0]]) {
      g.strokeStyle = col;
      g.lineWidth = w;
      for (let i = 0; i <= 5; i++) {
        const p = clamp(i * 51.2, 1, 255) + off;
        g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 256); g.stroke();
        g.beginPath(); g.moveTo(0, p); g.lineTo(256, p); g.stroke();
      }
    }
    // spiral joins at verticals
    g.fillStyle = 'rgba(230,234,238,0.8)';
    for (let i = 0; i <= 5; i++) {
      for (let y = 6; y < 256; y += 14) {
        g.fillRect(clamp(i * 51.2, 1, 253) - 1, y, 3, 2);
      }
    }
    return toTexture(c, { repeat: [1, 1], aniso: 4 });
  });

  const woodPallet = () => memo('woodPallet', () => {
    const [c, g] = makeCanvas(128, 128);
    g.fillStyle = '#9b7f57';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 120; i++) {
      const y = rng.next() * 128;
      g.strokeStyle = `rgba(${96 + rng.int(0, 60)},${72 + rng.int(0, 40)},${44 + rng.int(0, 26)},${rng.range(0.2, 0.5)})`;
      g.lineWidth = rng.range(0.6, 1.8);
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(40, y + rng.range(-3, 3), 90, y + rng.range(-3, 3), 128, y + rng.range(-4, 4));
      g.stroke();
    }
    // knots
    for (let i = 0; i < 5; i++) {
      const x = rng.next() * 128, y = rng.next() * 128;
      g.fillStyle = 'rgba(70,52,32,0.6)';
      g.beginPath(); g.ellipse(x, y, rng.range(2, 4), rng.range(1.4, 2.6), rng.next() * 3, 0, 7); g.fill();
    }
    return toTexture(c, { repeat: [1, 1] });
  });

  // ---------- text / decals ----------

  const label = (text, { fg = '#e8e4da', bg = null, w = 256, h = 64, font = 'bold 34px "Arial Narrow", Arial, sans-serif', stencil = true } = {}) =>
    memo(`label:${text}:${fg}:${bg}:${w}x${h}`, () => {
      const [c, g] = makeCanvas(w, h);
      if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
      g.font = font;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = fg;
      if (stencil) g.globalAlpha = 0.88;
      g.fillText(text, w / 2, h / 2 + 2);
      // weathering
      g.globalAlpha = 1;
      for (let i = 0; i < 120; i++) {
        g.clearRect(rng.next() * w, rng.next() * h, 2, 1.5);
      }
      const tex = toTexture(c);
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    });

  const roundel = () => memo('roundel', () => {
    const [c, g] = makeCanvas(128, 128);
    g.strokeStyle = '#dfe3e6';
    g.lineWidth = 6;
    g.beginPath(); g.arc(64, 64, 48, 0, 7); g.stroke();
    g.beginPath();
    g.moveTo(64, 24); g.lineTo(92, 84); g.lineTo(36, 84); g.closePath();
    g.stroke();
    g.fillStyle = '#dfe3e6';
    g.font = 'bold 15px Arial';
    g.textAlign = 'center';
    g.fillText('IRONVEIL', 64, 112);
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // worn painted arrow (points +V so rotate the geometry to aim it)
  const arrowDecal = () => memo('arrowDecal', () => {
    const [c, g] = makeCanvas(128, 192);
    g.clearRect(0, 0, 128, 192);
    g.fillStyle = 'rgba(216,207,159,0.9)';
    g.beginPath();
    g.moveTo(52, 190); g.lineTo(52, 78); g.lineTo(24, 78); g.lineTo(64, 6); g.lineTo(104, 78); g.lineTo(76, 78); g.lineTo(76, 190);
    g.closePath();
    g.fill();
    for (let i = 0; i < 260; i++) g.clearRect(rng.next() * 128, rng.next() * 192, 3, 2.4);
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // wall-mounted tactical map board (lit material, must NOT glow at night)
  const mapBoard = () => memo('mapBoard', () => {
    const W = 768, H = 576;
    const [c, g] = makeCanvas(W, H);
    g.fillStyle = '#cfc8b0';
    g.fillRect(0, 0, W, H);
    // paper mottling + faint fold shadows
    for (let i = 0; i < 1100; i++) {
      g.fillStyle = `rgba(120,110,88,${irng.range(0.02, 0.06)})`;
      g.fillRect(irng.next() * W, irng.next() * H, irng.range(2, 14), irng.range(1, 7));
    }
    for (const fx of [W * 0.34, W * 0.67]) {
      const fg = g.createLinearGradient(fx - 7, 0, fx + 7, 0);
      fg.addColorStop(0, 'rgba(80,70,50,0)');
      fg.addColorStop(0.5, 'rgba(80,70,50,0.14)');
      fg.addColorStop(1, 'rgba(80,70,50,0)');
      g.fillStyle = fg;
      g.fillRect(fx - 7, 0, 14, H);
    }
    // terrain relief: soft hill shading blobs
    for (let i = 0; i < 30; i++) {
      const hx = irng.next() * W, hy = irng.range(40, H - 60), hr = irng.range(18, 60);
      const hg = g.createRadialGradient(hx, hy, 2, hx, hy, hr);
      hg.addColorStop(0, `rgba(146,128,86,${irng.range(0.10, 0.2)})`);
      hg.addColorStop(1, 'rgba(146,128,86,0)');
      g.fillStyle = hg;
      g.beginPath(); g.arc(hx, hy, hr, 0, 7); g.fill();
    }
    // water: lake NW + river ribbon
    g.fillStyle = 'rgba(112,140,158,0.55)';
    g.beginPath();
    g.moveTo(30, 90);
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.lineTo(95 + Math.cos(a) * (56 + fbm2D(Math.cos(a) * 3, Math.sin(a) * 3, 3) * 26), 128 + Math.sin(a) * (38 + fbm2D(Math.sin(a) * 3 + 9, Math.cos(a) * 3, 3) * 18));
    }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(112,140,158,0.7)';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(120, 160);
    for (let i = 1; i <= 20; i++) {
      const t = i / 20;
      g.lineTo(120 + t * 560 + fbm2D(t * 6, 3.3, 3) * 60, 160 + t * 330 + Math.sin(t * 6) * 34);
    }
    g.stroke();
    // topo contours
    for (let k = 0; k < 30; k++) {
      const cx = irng.range(-60, W + 60), cy = irng.range(-40, H + 40), r0 = irng.range(14, 48);
      g.strokeStyle = `rgba(150,116,74,${irng.range(0.3, 0.55)})`;
      g.lineWidth = 1;
      for (let ring = 0; ring < irng.int(2, 5); ring++) {
        g.beginPath();
        const rr = r0 + ring * irng.range(7, 13);
        for (let a = 0; a <= 24; a++) {
          const th = (a / 24) * Math.PI * 2;
          const rad = rr * (1 + fbm2D(Math.cos(th) * 2 + k * 7, Math.sin(th) * 2, 3) * 0.5);
          const px = cx + Math.cos(th) * rad, py = cy + Math.sin(th) * rad * 0.8;
          if (a === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath();
        g.stroke();
      }
    }
    // roads: one highway + spurs, and a small town block cluster
    g.strokeStyle = 'rgba(150,84,60,0.75)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 420);
    for (let i = 1; i <= 16; i++) g.lineTo((i / 16) * W, 420 + fbm2D(i * 0.7, 8.8, 3) * 70);
    g.stroke();
    g.lineWidth = 1.4;
    for (const [sx0, sy0, sx1, sy1] of [[180, 430, 260, 300], [420, 415, 470, 250], [600, 440, 700, 520]]) {
      g.beginPath(); g.moveTo(sx0, sy0);
      g.quadraticCurveTo((sx0 + sx1) / 2 + 24, (sy0 + sy1) / 2, sx1, sy1);
      g.stroke();
    }
    g.fillStyle = 'rgba(90,88,84,0.8)';
    for (let i = 0; i < 14; i++) g.fillRect(440 + irng.next() * 60, 216 + irng.next() * 44, irng.range(4, 9), irng.range(3, 7));
    g.font = 'italic 11px Georgia';
    g.fillStyle = 'rgba(70,66,58,0.85)';
    g.fillText('KESSEL FLATS', 452, 208);
    g.fillText('LAKE VARDA', 52, 78);
    // UTM grid + edge labels
    g.strokeStyle = 'rgba(70,86,110,0.4)';
    g.lineWidth = 1;
    for (let i = 0; i <= 12; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, H); g.stroke(); }
    for (let i = 0; i <= 9; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(W, i * 64); g.stroke(); }
    g.font = 'bold 10px monospace';
    g.fillStyle = 'rgba(60,74,96,0.8)';
    for (let i = 1; i < 12; i++) g.fillText(String(20 + i), i * 64 - 7, 40);
    for (let i = 1; i < 9; i++) g.fillText(String(86 - i), 6, i * 64 + 4);
    // threat sector wedges (translucent) from the base marker
    const bx = W * 0.52, by = H * 0.7;
    for (const [a0, a1, col] of [[-0.72, -0.22, 'rgba(200,80,30,0.13)'], [0.1, 0.5, 'rgba(170,40,32,0.15)']]) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(bx, by);
      g.arc(bx, by, 230, a0 - Math.PI / 2, a1 - Math.PI / 2);
      g.closePath(); g.fill();
    }
    // range rings + base marker
    g.strokeStyle = 'rgba(40,90,150,0.85)';
    g.lineWidth = 2;
    for (const r of [48, 96, 152]) { g.beginPath(); g.arc(bx, by, r, 0, 7); g.stroke(); }
    g.font = '10px monospace';
    g.fillStyle = 'rgba(40,90,150,0.9)';
    g.fillText('5', bx + 36, by - 36); g.fillText('10', bx + 70, by - 70); g.fillText('15 KM', bx + 110, by - 112);
    g.fillStyle = 'rgba(40,90,150,0.95)';
    g.fillRect(bx - 6, by - 6, 12, 12);
    g.font = 'bold 11px monospace';
    g.fillText('FDC', bx + 10, by + 4);
    // friendly battery symbols (blue rect + type letter)
    g.font = 'bold 10px monospace';
    for (const [ux, uy, l] of [[bx - 92, by + 44, 'P'], [bx + 40, by + 76, 'T'], [bx + 118, by + 30, 'S']]) {
      g.strokeStyle = 'rgba(30,80,150,0.95)';
      g.lineWidth = 2;
      g.strokeRect(ux - 9, uy - 7, 18, 14);
      g.fillStyle = 'rgba(30,80,150,0.95)';
      g.fillText(l, ux - 3, uy + 4);
    }
    // threat axes (red arrows in from the north sectors)
    g.strokeStyle = 'rgba(170,40,32,0.9)';
    g.lineWidth = 3;
    for (const a of [-0.5, -0.06, 0.34]) {
      g.beginPath();
      g.moveTo(bx + Math.sin(a) * 210, by - Math.cos(a) * 210);
      g.lineTo(bx + Math.sin(a) * 60, by - Math.cos(a) * 60);
      g.stroke();
      const hx = bx + Math.sin(a) * 60, hy = by - Math.cos(a) * 60;
      g.beginPath();
      g.moveTo(hx, hy);
      g.lineTo(hx + Math.sin(a + 0.5) * 14, hy - Math.cos(a + 0.5) * 14);
      g.lineTo(hx + Math.sin(a - 0.5) * 14, hy - Math.cos(a - 0.5) * 14);
      g.closePath();
      g.fillStyle = 'rgba(170,40,32,0.9)';
      g.fill();
    }
    // restricted polygon + label
    g.strokeStyle = 'rgba(160,30,26,0.75)';
    g.setLineDash([7, 5]);
    g.lineWidth = 2;
    g.strokeRect(96, 96, 200, 130);
    g.setLineDash([]);
    g.font = 'bold 12px monospace';
    g.fillStyle = 'rgba(160,30,26,0.85)';
    g.fillText('R-4402 NO FIRE', 120, 168);
    // grease-pencil annotation: circled area + arrow + scribble
    g.strokeStyle = 'rgba(60,28,72,0.7)';
    g.lineWidth = 3.5;
    g.beginPath();
    g.ellipse(bx + 150, by - 150, 46, 30, 0.3, 0, 7);
    g.stroke();
    g.beginPath();
    g.moveTo(bx + 108, by - 128); g.quadraticCurveTo(bx + 60, by - 100, bx + 34, by - 60);
    g.stroke();
    g.font = 'bold 13px "Comic Sans MS", cursive';
    g.fillStyle = 'rgba(60,28,72,0.8)';
    g.fillText('WATCH AXIS 3', bx + 108, by - 190);
    // coffee ring stain
    g.strokeStyle = 'rgba(120,78,40,0.28)';
    g.lineWidth = 7;
    g.beginPath(); g.arc(660, 120, 26, 0.3, 5.8); g.stroke();
    // pins with tiny shadows
    for (let i = 0; i < 11; i++) {
      const px = irng.range(50, W - 40), py = irng.range(60, H - 60);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath(); g.arc(px + 1.5, py + 2, 4.5, 0, 7); g.fill();
      g.fillStyle = irng.next() < 0.5 ? '#a02020' : irng.next() < 0.6 ? '#204880' : '#c9a227';
      g.beginPath(); g.arc(px, py, 4.5, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath(); g.arc(px - 1.3, py - 1.3, 1.4, 0, 7); g.fill();
    }
    // header + classification strips
    g.fillStyle = '#3a3d33';
    g.fillRect(0, 0, W, 30);
    g.fillStyle = '#e5e2d4';
    g.font = 'bold 19px Arial';
    g.textAlign = 'left';
    g.fillText('IRONVEIL RANGE — SECTOR MAP · GRID A7 · REV 6', 12, 22);
    g.font = 'bold 12px Arial';
    g.textAlign = 'right';
    g.fillText('1:50 000', W - 12, 21);
    g.textAlign = 'center';
    g.fillStyle = '#7a2018';
    g.fillRect(0, H - 22, W, 22);
    g.fillStyle = '#e8ded0';
    g.font = 'bold 13px Arial';
    g.fillText('EXERCISE USE ONLY — FICTIONAL TERRAIN — NOT FOR NAVIGATION', W / 2, H - 7);
    g.textAlign = 'left';
    // tape corners
    g.fillStyle = 'rgba(215,205,175,0.85)';
    for (const [x, y, r] of [[10, 38, -0.06], [W - 44, 36, 0.08], [10, H - 46, 0.05], [W - 44, H - 48, -0.07]]) {
      g.save(); g.translate(x + 17, y + 7); g.rotate(r); g.fillRect(-17, -7, 34, 14); g.restore();
    }
    return toTexture(c, { aniso: 4 });
  });

  // small emissive status terminal for the shelter's second screen
  const statusScreen = () => memo('statusScreen', () => {
    const [c, g] = makeCanvas(256, 160);
    g.fillStyle = '#04120a';
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#0a2414';
    g.fillRect(0, 0, 256, 18);
    g.fillStyle = '#57e389';
    g.font = 'bold 11px monospace';
    g.textAlign = 'left';
    g.fillText('IVR//SYS STATUS — GRID A7', 6, 13);
    // text-ish rows
    const rows = ['PWR BUS', 'RADAR', 'UPLINK', 'COOLANT', 'BTRY A', 'BTRY B', 'BTRY C'];
    for (let i = 0; i < rows.length; i++) {
      const y = 32 + i * 16;
      g.fillStyle = '#3fae6c';
      g.font = '10px monospace';
      g.fillText(rows[i], 8, y);
      // status bar
      const w = rng.range(40, 110);
      g.fillStyle = rng.next() < 0.8 ? '#2f8f56' : '#c9a227';
      g.fillRect(78, y - 8, w, 7);
      g.strokeStyle = '#1d5232';
      g.strokeRect(78, y - 8, 130, 7);
      g.fillStyle = '#57e389';
      g.fillText(rng.next() < 0.8 ? 'OK' : 'CHK', 218, y);
    }
    // scanlines
    for (let y = 0; y < 160; y += 3) {
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(0, y, 256, 1);
    }
    // vignette
    const vg = g.createRadialGradient(128, 80, 30, 128, 80, 170);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = vg;
    g.fillRect(0, 0, 256, 160);
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // ---------- particles / effects sprites ----------

  const softPuff = () => memo('softPuff', () => {
    const [c, g] = makeCanvas(128, 128);
    // lumpy smoke blob: several overlapping radial gradients
    const blobs = [[64, 64, 52], [44, 54, 30], [84, 58, 32], [58, 84, 30], [78, 82, 26], [52, 40, 24]];
    for (const [x, y, r] of blobs) {
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.55)');
      grad.addColorStop(0.7, 'rgba(255,255,255,0.18)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
    }
    const tex = toTexture(c, { srgb: false });
    return tex;
  });

  // clean elliptical contact-shadow blob for AO decals under objects
  const blobShadow = () => memo('blobShadow', () => {
    const [c, g] = makeCanvas(128, 128);
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = toTexture(c, { srgb: false });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  const oilStain = () => memo('oilStain', () => {
    // subtle warm-brown drip patch — must read as grime, never a black void
    const [c, g] = makeCanvas(128, 128);
    g.clearRect(0, 0, 128, 128);
    const blobs = [[64, 64, 30], [50, 54, 15], [80, 70, 13]];
    for (const [x, y, r] of blobs) {
      const grad = g.createRadialGradient(x, y, 2, x, y, r);
      grad.addColorStop(0, 'rgba(52,44,34,0.4)');
      grad.addColorStop(0.65, 'rgba(56,48,38,0.2)');
      grad.addColorStop(1, 'rgba(56,48,38,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
    }
    // drips
    for (let i = 0; i < 10; i++) {
      const a = rng.next() * 7, r = rng.range(24, 48);
      g.fillStyle = `rgba(50,43,34,${rng.range(0.12, 0.26)})`;
      g.beginPath();
      g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, rng.range(1.5, 3.5), 0, 7);
      g.fill();
    }
    const tex = toTexture(c, { srgb: false });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  const hardFlare = () => memo('hardFlare', () => {
    const [c, g] = makeCanvas(128, 128);
    let grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.18, 'rgba(255,244,214,0.85)');
    grad.addColorStop(0.5, 'rgba(255,190,120,0.22)');
    grad.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    // cross streaks
    g.globalCompositeOperation = 'lighter';
    grad = g.createLinearGradient(0, 60, 128, 68);
    grad.addColorStop(0, 'rgba(255,230,180,0)');
    grad.addColorStop(0.5, 'rgba(255,240,210,0.7)');
    grad.addColorStop(1, 'rgba(255,230,180,0)');
    g.fillStyle = grad;
    g.fillRect(0, 58, 128, 12);
    g.fillRect(58, 0, 12, 128); // vertical approximated with same gradient
    return toTexture(c, { srgb: false });
  });

  const scorch = () => memo('scorch', () => {
    const [c, g] = makeCanvas(256, 256);
    const grad = g.createRadialGradient(128, 128, 6, 128, 128, 120);
    grad.addColorStop(0, 'rgba(14,12,10,0.9)');
    grad.addColorStop(0.4, 'rgba(22,18,14,0.7)');
    grad.addColorStop(0.75, 'rgba(30,26,20,0.28)');
    grad.addColorStop(1, 'rgba(30,26,20,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 46; i++) {
      const a = rng.next() * 7, r = rng.range(60, 125);
      g.strokeStyle = `rgba(16,14,12,${rng.range(0.15, 0.5)})`;
      g.lineWidth = rng.range(2, 8);
      g.beginPath();
      g.moveTo(128 + Math.cos(a) * 30, 128 + Math.sin(a) * 30);
      g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r);
      g.stroke();
    }
    const tex = toTexture(c, { srgb: false });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  const scrub = () => memo('scrub', () => {
    const [c, g] = makeCanvas(128, 128);
    g.strokeStyle = 'rgba(96,92,52,0.9)';
    for (let i = 0; i < 60; i++) {
      const x = 64 + rng.range(-8, 8);
      g.strokeStyle = `rgba(${90 + rng.int(0, 30)},${86 + rng.int(0, 26)},${44 + rng.int(0, 20)},0.9)`;
      g.lineWidth = rng.range(1, 2.4);
      g.beginPath();
      g.moveTo(x, 128);
      const bend = rng.range(-34, 34);
      g.quadraticCurveTo(x + bend * 0.4, 78, x + bend, rng.range(18, 62));
      g.stroke();
    }
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // dry desert grass tuft (straw colored, thinner blades than scrub)
  const grassTuft = () => memo('grassTuft', () => {
    const [c, g] = makeCanvas(128, 128);
    for (let i = 0; i < 90; i++) {
      const x = 64 + rng.range(-14, 14);
      g.strokeStyle = `rgba(${168 + rng.int(0, 40)},${146 + rng.int(0, 34)},${86 + rng.int(0, 26)},${rng.range(0.65, 0.95)})`;
      g.lineWidth = rng.range(0.7, 1.5);
      g.beginPath();
      g.moveTo(x, 128);
      const bend = rng.range(-30, 30);
      g.quadraticCurveTo(x + bend * 0.3, 84, x + bend, rng.range(26, 70));
      g.stroke();
    }
    // seed heads
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(198,178,120,${rng.range(0.5, 0.85)})`;
      g.fillRect(rng.range(24, 104), rng.range(24, 62), 1.6, rng.range(2, 4));
    }
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // dashed road centerline strip
  const roadLine = () => memo('roadLine', () => {
    const [c, g] = makeCanvas(64, 256);
    g.clearRect(0, 0, 64, 256);
    g.fillStyle = 'rgba(210,200,170,0.75)';
    g.fillRect(24, 20, 16, 100);
    for (let i = 0; i < 60; i++) g.clearRect(rng.next() * 64, rng.next() * 256, 3, 3);
    return toTexture(c, { repeat: [1, 6] });
  });

  // ---------- base-environment additions ----------

  // large-scale sand albedo variation: dark windrows/patches with radial alpha
  // falloff — draped once over the near field so tiling never shows up close
  const sandOverlay = () => memo('sandOverlay', () => {
    const [c, g] = makeCanvas(1024, 1024);
    const img = g.createImageData(1024, 1024);
    const d = img.data;
    for (let y = 0; y < 1024; y++) {
      for (let x = 0; x < 1024; x++) {
        const i = (y * 1024 + x) * 4;
        // elongated windrow noise (same bearing as sand ripples)
        const u = (x * 0.86 - y * 0.51) / 210;
        const v = (x * 0.51 + y * 0.86) / 74;
        const wr = fbm2D(u + 7.7, v - 3.1, 3);
        const blotch = fbm2D(x / 260 + 19, y / 260 - 8, 4);
        const dark = clamp((0.46 - wr) * 2.6, 0, 1) * 0.55 + clamp((0.42 - blotch) * 2.2, 0, 1) * 0.7;
        const light = clamp((blotch - 0.62) * 3.2, 0, 1);
        // dark silty patches (slightly red-brown) or pale alkali washes
        if (dark >= light) {
          d[i] = 118; d[i + 1] = 92; d[i + 2] = 62;
          d[i + 3] = Math.min(200, dark * 148);
        } else {
          d[i] = 222; d[i + 1] = 208; d[i + 2] = 172;
          d[i + 3] = light * 96;
        }
        // radial fade to zero at the rim
        const dx = (x - 512) / 512, dy = (y - 512) / 512;
        const rr = Math.sqrt(dx * dx + dy * dy);
        d[i + 3] *= clamp((1 - rr) * 2.6, 0, 1);
      }
    }
    g.putImageData(img, 0, 0);
    const tex = toTexture(c, { srgb: true, aniso: 8 });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // dedicated seeded stream for the C2 interior set so texture edits here
  // never shift the speckle streams other modules' textures pull from `rng`
  const irng = new Rand(24601);

  // shelter interior wall: ONE FULL WALL HEIGHT per tile (v 0..1 = floor..ceiling,
  // u tiles every 2.4 m). Acoustic upper panels + darker wainscot + trim rail.
  const interiorWall = () => memo('interiorWall', () => {
    const W = 512, H = 640; // 2.4 m x 3.1 m
    const [c, g] = makeCanvas(W, H);
    const railY = H - Math.round((0.98 / 3.1) * H); // chair rail at 0.98 m
    // upper acoustic zone
    g.fillStyle = '#565b52';
    g.fillRect(0, 0, W, railY);
    // lower wainscot
    g.fillStyle = '#41453e';
    g.fillRect(0, railY, W, H - railY);
    const img = g.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (irng.next() - 0.5) * 9;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // acoustic perforation field on the upper zone (subtle dot grid w/ jitter)
    g.fillStyle = 'rgba(24,26,22,0.5)';
    for (let y = 14; y < railY - 12; y += 11) {
      for (let x = 8 + (Math.floor(y / 11) % 2) * 5.5; x < W; x += 11) {
        g.beginPath(); g.arc(x + irng.range(-0.7, 0.7), y + irng.range(-0.7, 0.7), 1.15, 0, 7); g.fill();
      }
    }
    // vertical panel seams every 128 px (0.6 m) with trim strips
    for (let x = 0; x <= W; x += 128) {
      const p = Math.min(W - 3, Math.max(3, x));
      g.fillStyle = 'rgba(16,18,15,0.55)';
      g.fillRect(p - 2.5, 0, 5, H);
      g.fillStyle = 'rgba(150,156,142,0.28)';
      g.fillRect(p - 3.5, 0, 1.6, H);
      g.fillStyle = 'rgba(10,12,10,0.4)';
      g.fillRect(p + 2, 0, 1.4, H);
    }
    // chair rail trim (bright top edge + shadow)
    g.fillStyle = 'rgba(20,22,18,0.6)';
    g.fillRect(0, railY - 1, W, 7);
    g.fillStyle = '#6a7062';
    g.fillRect(0, railY - 6, W, 5);
    g.fillStyle = 'rgba(220,226,208,0.18)';
    g.fillRect(0, railY - 6, W, 1.4);
    // top cornice shadow (ceiling AO) + skirting at the floor
    let grad = g.createLinearGradient(0, 0, 0, 46);
    grad.addColorStop(0, 'rgba(8,10,8,0.5)');
    grad.addColorStop(1, 'rgba(8,10,8,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, 46);
    g.fillStyle = '#31342e';
    g.fillRect(0, H - 26, W, 26);
    g.fillStyle = 'rgba(228,232,220,0.10)';
    g.fillRect(0, H - 26, W, 2);
    grad = g.createLinearGradient(0, H - 60, 0, H);
    grad.addColorStop(0, 'rgba(12,13,11,0)');
    grad.addColorStop(1, 'rgba(12,13,11,0.34)');
    g.fillStyle = grad;
    g.fillRect(0, H - 60, W, 60);
    // rivet columns along seams
    for (let x = 0; x <= W; x += 128) {
      const p = Math.min(W - 8, Math.max(8, x));
      for (let y = 26; y < H - 30; y += 52) {
        g.fillStyle = 'rgba(26,28,24,0.8)';
        g.beginPath(); g.arc(p, y, 2.2, 0, 7); g.fill();
        g.fillStyle = 'rgba(168,174,158,0.42)';
        g.beginPath(); g.arc(p - 0.7, y - 0.7, 0.9, 0, 7); g.fill();
      }
    }
    // scuffs on the wainscot + faint scratches above
    for (let i = 0; i < 110; i++) {
      const x = irng.next() * W, y = railY + Math.pow(irng.next(), 1.6) * (H - railY - 8);
      g.fillStyle = `rgba(20,22,19,${irng.range(0.07, 0.24)})`;
      g.fillRect(x, y, irng.range(4, 24), irng.range(1, 3.4));
    }
    for (let i = 0; i < 34; i++) {
      g.strokeStyle = `rgba(168,172,158,${irng.range(0.04, 0.1)})`;
      g.lineWidth = irng.range(0.5, 1.2);
      const x = irng.next() * W, y = irng.next() * railY;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + irng.range(-26, 26), y + irng.range(-7, 7)); g.stroke();
    }
    return toTexture(c, { repeat: [1, 1], aniso: 4 });
  });

  // shelter ceiling: pale panel grid with vents + subtle staining (tiles 0.6 m)
  const interiorCeiling = () => memo('interiorCeiling', () => {
    const [c, g] = makeCanvas(256, 256);
    g.fillStyle = '#aeb2a6';
    g.fillRect(0, 0, 256, 256);
    const img = g.getImageData(0, 0, 256, 256);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (irng.next() - 0.5) * 7;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // panel grid
    g.strokeStyle = 'rgba(60,64,56,0.5)';
    g.lineWidth = 2;
    for (let p = 0; p <= 256; p += 128) {
      const q = Math.min(255, Math.max(1, p));
      g.beginPath(); g.moveTo(q, 0); g.lineTo(q, 256); g.stroke();
      g.beginPath(); g.moveTo(0, q); g.lineTo(256, q); g.stroke();
    }
    g.strokeStyle = 'rgba(232,236,224,0.25)';
    g.lineWidth = 1;
    for (let p = 0; p <= 256; p += 128) {
      const q = Math.min(254, Math.max(2, p)) - 2;
      g.beginPath(); g.moveTo(q, 0); g.lineTo(q, 256); g.stroke();
      g.beginPath(); g.moveTo(0, q); g.lineTo(256, q); g.stroke();
    }
    // fastener dots at grid crossings + faint water stains
    g.fillStyle = 'rgba(70,74,64,0.55)';
    for (let y = 0; y <= 256; y += 128) {
      for (let x = 0; x <= 256; x += 128) {
        g.beginPath(); g.arc(Math.min(248, Math.max(8, x)), Math.min(248, Math.max(8, y)), 2, 0, 7); g.fill();
      }
    }
    for (let i = 0; i < 5; i++) {
      const x = irng.next() * 256, y = irng.next() * 256, r = irng.range(14, 42);
      const st = g.createRadialGradient(x, y, 2, x, y, r);
      st.addColorStop(0, 'rgba(122,116,92,0.13)');
      st.addColorStop(1, 'rgba(122,116,92,0)');
      g.fillStyle = st;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return toTexture(c, { repeat: [1, 1], aniso: 4 });
  });

  // one-shot painted floor for the C2 shelter (u = local +x, v = local +z):
  // slate deck tiles, painted border, door chevrons, wear paths, corner AO
  const paintedFloor = () => memo('paintedFloor', () => {
    const W = 768, H = 512; // 8.68 m x 5.68 m
    const [c, g] = makeCanvas(W, H);
    g.fillStyle = '#4b4f4b';
    g.fillRect(0, 0, W, H);
    const img = g.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (irng.next() - 0.5) * 10;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // anti-static tile grid (~0.55 m) with per-tile tone variation
    const T = 49;
    for (let ty = 0; ty < H; ty += T) {
      for (let tx = 0; tx < W; tx += T) {
        const l = irng.int(-5, 5);
        g.fillStyle = `rgba(${74 + l},${78 + l},${74 + l},0.42)`;
        g.fillRect(tx + 1, ty + 1, T - 2, T - 2);
      }
    }
    g.strokeStyle = 'rgba(30,32,29,0.55)';
    g.lineWidth = 1.4;
    for (let p = 0; p <= W; p += T) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, H); g.stroke(); }
    for (let p = 0; p <= H; p += T) { g.beginPath(); g.moveTo(0, p); g.lineTo(W, p); g.stroke(); }
    // painted border lane (worn, mostly-scrubbed-off ochre)
    g.strokeStyle = 'rgba(178,170,122,0.32)';
    g.lineWidth = 9;
    g.strokeRect(30, 30, W - 60, H - 60);
    // door chevron strip: door at local (+1.6, +z edge) -> u ≈ (1.6+4.34)/8.68
    g.save();
    g.translate(Math.round(((1.6 + 4.34) / 8.68) * W), H - 14);
    for (let i = -4; i < 5; i++) {
      g.fillStyle = i % 2 ? 'rgba(180,152,44,0.6)' : 'rgba(26,26,26,0.6)';
      g.beginPath();
      g.moveTo(i * 17, 12); g.lineTo(i * 17 + 8, -16); g.lineTo(i * 17 + 17, -16); g.lineTo(i * 17 + 9, 12);
      g.fill();
    }
    g.restore();
    // wear paths: door -> console row, door -> holo table, console lateral shuffle
    const wear = (x0, y0, x1, y1, w, a0 = 0.30, a1 = 0.10) => {
      const grad = g.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, `rgba(36,38,35,${a0})`);
      grad.addColorStop(1, `rgba(36,38,35,${a1})`);
      g.strokeStyle = grad;
      g.lineWidth = w;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    };
    const U = (x) => ((x + 4.34) / 8.68) * W;   // local x -> px
    const V = (z) => ((z + 2.84) / 5.68) * H;   // local z -> px
    wear(U(1.6), V(2.6), U(-1.2), V(-0.9), 46);
    wear(U(1.6), V(2.6), U(2.35), V(0.6), 40);
    wear(U(-1.2), V(-1.0), U(-2.9), V(-1.05), 34, 0.22, 0.16);
    wear(U(-3.5), V(-0.9), U(-3.6), V(0.9), 26, 0.18, 0.12); // rack service lane
    // chair swivel wear discs at the two operator seats
    for (const [cx, cz] of [[-1.25, -1.15], [-2.9, -1.2]]) {
      const rg = g.createRadialGradient(U(cx), V(cz), 4, U(cx), V(cz), 34);
      rg.addColorStop(0, 'rgba(30,32,29,0.4)');
      rg.addColorStop(1, 'rgba(30,32,29,0)');
      g.fillStyle = rg;
      g.fillRect(U(cx) - 36, V(cz) - 36, 72, 72);
    }
    // scuffs + a couple of paint chips
    for (let i = 0; i < 230; i++) {
      g.fillStyle = `rgba(26,28,25,${irng.range(0.05, 0.16)})`;
      g.fillRect(irng.next() * W, irng.next() * H, irng.range(2, 9), irng.range(1, 3));
    }
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(148,152,144,${irng.range(0.08, 0.2)})`;
      g.fillRect(irng.next() * W, irng.next() * H, irng.range(1.5, 4), irng.range(1, 3));
    }
    // perimeter AO so walls appear seated
    const edge = (x0, y0, x1, y1) => {
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, 'rgba(10,11,10,0.4)');
      gr.addColorStop(1, 'rgba(10,11,10,0)');
      g.fillStyle = gr;
      g.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) || W, Math.abs(y1 - y0) || H);
    };
    edge(0, 0, 40, 0); edge(W, 0, W - 40, 0); edge(0, 0, 0, 40); edge(0, H, 0, H - 40);
    const tex = toTexture(c, { aniso: 6 });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // equipment rack front: stacked modules — meters, breaker rows, patch bays,
  // vent grilles, digital readouts, U-rail numbers, silkscreen labels
  const rackFace = () => memo('rackFace', () => {
    const [c, g] = makeCanvas(256, 512);
    g.fillStyle = '#22252a';
    g.fillRect(0, 0, 256, 512);
    // rails with U-numbers + cage-nut holes
    g.fillStyle = '#31353a';
    g.fillRect(0, 0, 15, 512); g.fillRect(241, 0, 15, 512);
    g.font = '6px monospace';
    g.textAlign = 'left';
    let u = 1;
    for (let y = 10; y < 512; y += 24) {
      g.fillStyle = 'rgba(150,156,164,0.55)';
      g.fillRect(5, y, 4, 4); g.fillRect(247, y, 4, 4);
      g.fillStyle = 'rgba(120,126,132,0.5)';
      if (u % 2 === 0) g.fillText(String(u).padStart(2, '0'), 2, y - 3);
      u++;
    }
    const label = (txt, x, y, a = 0.6) => {
      g.fillStyle = `rgba(198,206,192,${a})`;
      g.font = '7px monospace';
      g.fillText(txt, x, y);
    };
    let y = 8;
    const modules = ['meter', 'vent', 'patch', 'breaker', 'digital', 'vent', 'knobs', 'blank', 'meter', 'patch', 'digital', 'vent', 'breaker', 'knobs'];
    let mi = 0;
    while (y < 480) {
      const kind = modules[mi++ % modules.length];
      const h = kind === 'blank' ? 22 : kind === 'vent' ? 34 : kind === 'patch' ? 56 : kind === 'breaker' ? 44 : 52;
      if (y + h > 496) break;
      const tone = irng.pick(['#2c3034', '#33373c', '#2b2f27', '#383c32', '#30343a']);
      g.fillStyle = tone;
      g.fillRect(16, y, 224, h - 5);
      g.strokeStyle = 'rgba(0,0,0,0.6)';
      g.strokeRect(16.5, y + 0.5, 223, h - 6);
      g.fillStyle = 'rgba(255,255,255,0.07)';
      g.fillRect(16, y, 224, 1.6);
      // rack handles on tall modules
      if (h > 30) {
        g.fillStyle = '#15181b';
        g.fillRect(21, y + 5, 7, h - 15); g.fillRect(228, y + 5, 7, h - 15);
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.fillRect(21, y + 5, 2, h - 15); g.fillRect(228, y + 5, 2, h - 15);
      }
      if (kind === 'meter') {
        // two analog meters w/ needle + arc
        for (const mx of [70, 150]) {
          g.fillStyle = '#0d0f11';
          g.fillRect(mx - 22, y + 7, 44, 26);
          g.strokeStyle = 'rgba(210,216,200,0.5)';
          g.lineWidth = 1;
          g.beginPath(); g.arc(mx, y + 30, 17, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
          const na = Math.PI * irng.range(1.25, 1.75);
          g.strokeStyle = 'rgba(255,180,80,0.9)';
          g.beginPath(); g.moveTo(mx, y + 30); g.lineTo(mx + Math.cos(na) * 15, y + 30 + Math.sin(na) * 15); g.stroke();
        }
        label('PWR MON', 100, y + h - 9);
      } else if (kind === 'vent') {
        g.fillStyle = 'rgba(12,13,15,0.85)';
        for (let vx = 42; vx < 200; vx += 9) g.fillRect(vx, y + 6, 5, h - 16);
      } else if (kind === 'patch') {
        // patch bay: 2 rows of jacks, some with jumper loops
        for (let r = 0; r < 2; r++) {
          for (let k = 0; k < 10; k++) {
            const px = 40 + k * 19, py = y + 13 + r * 20;
            g.fillStyle = '#0c0e10';
            g.beginPath(); g.arc(px, py, 4.6, 0, 7); g.fill();
            g.strokeStyle = 'rgba(190,196,184,0.4)';
            g.beginPath(); g.arc(px, py, 4.6, 0, 7); g.stroke();
          }
        }
        for (let k = 0; k < 4; k++) {
          const a = 40 + irng.int(0, 9) * 19, b = 40 + irng.int(0, 9) * 19;
          g.strokeStyle = irng.pick(['rgba(180,150,60,0.85)', 'rgba(90,140,180,0.85)', 'rgba(160,80,70,0.85)']);
          g.lineWidth = 2;
          g.beginPath(); g.moveTo(a, y + 13); g.quadraticCurveTo((a + b) / 2, y + 40, b, y + 33); g.stroke();
        }
        label('XFER BAY', 100, y + h - 9);
      } else if (kind === 'breaker') {
        for (let k = 0; k < 8; k++) {
          const bx = 42 + k * 22;
          const on = irng.next() < 0.8;
          g.fillStyle = '#101214';
          g.fillRect(bx, y + 8, 12, 24);
          g.fillStyle = on ? '#c8cfc2' : '#5a5f56';
          g.fillRect(bx + 2, on ? y + 10 : y + 20, 8, 10);
        }
        label('DC DIST', 100, y + h - 9);
      } else if (kind === 'digital') {
        g.fillStyle = '#050b07';
        g.fillRect(40, y + 8, 160, 18);
        g.font = 'bold 11px monospace';
        g.fillStyle = 'rgba(120,235,150,0.9)';
        g.fillText(irng.pick(['TX 4.72 GHZ', 'SYNC LOCK', 'BIT PASS', 'CH 04 ACT', 'PRF 1240']), 48, y + 21);
        label(irng.pick(['SIG PROC', 'IFF CODER', 'RX CHAIN', 'CRYPTO']), 100, y + h - 9);
      } else if (kind === 'knobs') {
        for (let k = 0; k < 4; k++) {
          const kx = 60 + k * 34;
          g.fillStyle = '#15181b';
          g.beginPath(); g.arc(kx, y + 18, 8, 0, 7); g.fill();
          g.strokeStyle = 'rgba(190,196,202,0.4)';
          g.beginPath(); g.arc(kx, y + 18, 8, 0, 7); g.stroke();
          const ka = irng.next() * 6.28;
          g.strokeStyle = 'rgba(230,234,226,0.8)';
          g.beginPath(); g.moveTo(kx, y + 18); g.lineTo(kx + Math.cos(ka) * 7, y + 18 + Math.sin(ka) * 7); g.stroke();
        }
        label('GAIN SET', 100, y + h - 9);
      }
      y += h;
    }
    // grime + edge wear
    for (let i = 0; i < 80; i++) {
      g.fillStyle = `rgba(0,0,0,${irng.range(0.05, 0.18)})`;
      g.fillRect(irng.next() * 256, irng.next() * 512, irng.range(2, 8), irng.range(1, 3));
    }
    for (let i = 0; i < 24; i++) {
      g.fillStyle = `rgba(170,176,168,${irng.range(0.06, 0.16)})`;
      g.fillRect(irng.pick([15, 16, 239, 240]), irng.next() * 512, 1.5, irng.range(2, 8));
    }
    return toTexture(c, { aniso: 4 });
  });

  // ---------- fire-direction console set ----------

  // sloped control-panel backdrop: charcoal w/ engraved group lines, screws,
  // silkscreen labels. 3D switches/knobs sit on top of this.
  const consolePanel = () => memo('consolePanel', () => {
    const [c, g] = makeCanvas(512, 256);
    g.fillStyle = '#2b2e31';
    g.fillRect(0, 0, 512, 256);
    const img = g.getImageData(0, 0, 512, 256);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (irng.next() - 0.5) * 7;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // brushed sheen
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(210,216,222,${irng.range(0.015, 0.05)})`;
      g.lineWidth = 1;
      const y = irng.next() * 256;
      g.beginPath(); g.moveTo(0, y); g.lineTo(512, y + irng.range(-2, 2)); g.stroke();
    }
    // engraved group boxes with titles
    const box = (x, y, w, h, title) => {
      g.strokeStyle = 'rgba(196,204,196,0.4)';
      g.lineWidth = 1.2;
      g.strokeRect(x + 0.5, y + 0.5, w, h);
      g.fillStyle = '#2b2e31';
      const tw = g.measureText(title).width + 8;
      g.fillRect(x + 10, y - 5, tw, 10);
      g.fillStyle = 'rgba(206,214,206,0.7)';
      g.font = 'bold 9px monospace';
      g.textAlign = 'left';
      g.fillText(title, x + 14, y + 3);
    };
    g.font = 'bold 9px monospace';
    box(14, 22, 150, 92, 'RADAR SET');
    box(180, 22, 150, 92, 'IFF / DATALINK');
    box(346, 22, 152, 92, 'LAUNCH AUTH');
    box(14, 138, 234, 96, 'AZ-EL SERVO');
    box(264, 138, 234, 96, 'DISPLAY / DIM');
    // tiny function labels under future switch positions
    g.font = '7px monospace';
    g.fillStyle = 'rgba(196,204,196,0.6)';
    const cols = ['XMIT', 'STBY', 'MTI', 'CFAR', 'M4 ON', 'CODE A', 'NET 1', 'NET 2', 'ARM', 'SAFE', 'SLAVE', 'AUTO'];
    for (let k = 0; k < 12; k++) {
      const gx = 14 + (k % 4) * 41 + (Math.floor(k / 4)) * 166;
      g.fillText(cols[k], 20 + (k % 4) * 38 + Math.floor(k / 4) * 166, 104);
    }
    for (let k = 0; k < 6; k++) g.fillText(['AZ', 'EL', 'SLEW', 'BRT', 'CONT', 'PHOS'][k], 30 + k * 78, 226);
    // corner + edge screws
    g.fillStyle = 'rgba(16,17,19,0.9)';
    for (const [sx, sy] of [[8, 8], [504, 8], [8, 248], [504, 248], [256, 8], [256, 248]]) {
      g.beginPath(); g.arc(sx, sy, 3.2, 0, 7); g.fill();
      g.strokeStyle = 'rgba(180,186,192,0.5)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(sx - 2, sy); g.lineTo(sx + 2, sy); g.stroke();
      g.fillStyle = 'rgba(16,17,19,0.9)';
    }
    // wear: paint chips at edges
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(150,156,160,${irng.range(0.08, 0.22)})`;
      const onEdge = irng.next() < 0.5;
      g.fillRect(onEdge ? irng.pick([irng.range(0, 20), irng.range(492, 510)]) : irng.next() * 512,
        onEdge ? irng.next() * 256 : irng.pick([irng.range(0, 12), irng.range(244, 254)]),
        irng.range(1, 4), irng.range(1, 3));
    }
    return toTexture(c, { aniso: 4 });
  });

  // keyboard: military console key field w/ trackball area left blank
  const keyboard = () => memo('keyboard', () => {
    const [c, g] = makeCanvas(256, 96);
    g.fillStyle = '#26292c';
    g.fillRect(0, 0, 256, 96);
    g.strokeStyle = 'rgba(0,0,0,0.6)';
    g.strokeRect(1, 1, 254, 94);
    const key = (x, y, w, h, lit = 0) => {
      g.fillStyle = lit ? `rgba(${90 + lit * 60},${120 + lit * 40},90,0.9)` : `#3a3e42`;
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.fillRect(x, y, w, 1.6);
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(x, y + h - 1.6, w, 1.6);
    };
    // 4 rows of keys + function row
    for (let k = 0; k < 14; k++) key(6 + k * 15, 8, 12, 10, k > 10 && irng.next() < 0.5 ? 1 : 0);
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 13; k++) key(8 + r * 3 + k * 15, 24 + r * 15, 12, 11);
    }
    key(52, 70, 96, 12); // spacebar
    key(14, 70, 30, 12); key(156, 70, 24, 12); key(186, 70, 24, 12);
    // legends (unreadable-small, just tonal dots)
    g.fillStyle = 'rgba(220,226,220,0.4)';
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 13; k++) g.fillRect(12 + r * 3 + k * 15, 28 + r * 15, 3, 2);
    }
    return toTexture(c, { aniso: 4 });
  });

  // annunciator cluster: backlit legend tiles, mixed lit/unlit states
  const annunciator = () => memo('annunciator', () => {
    const [c, g] = makeCanvas(384, 160);
    g.fillStyle = '#17191b';
    g.fillRect(0, 0, 384, 160);
    const tiles = [
      ['WPN TIGHT', '#e8b83a', 1], ['RADIATE', '#57d879', 1], ['HOLD FIRE', '#e8b83a', 0], ['LINK OK', '#57d879', 1],
      ['FAULT', '#e05648', 0], ['AUTH', '#e05648', 1], ['DRILL', '#57a8d8', 0], ['PWR A', '#57d879', 1],
    ];
    for (let i = 0; i < 8; i++) {
      const x = 8 + (i % 4) * 94, y = 12 + Math.floor(i / 4) * 72;
      const [txt, col, lit] = tiles[i];
      g.fillStyle = lit ? col : '#232527';
      g.fillRect(x, y, 84, 62);
      if (lit) {
        const rg = g.createRadialGradient(x + 42, y + 31, 4, x + 42, y + 31, 52);
        rg.addColorStop(0, 'rgba(255,255,255,0.32)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg;
        g.fillRect(x, y, 84, 62);
      }
      g.strokeStyle = 'rgba(0,0,0,0.85)';
      g.lineWidth = 3;
      g.strokeRect(x + 1.5, y + 1.5, 81, 59);
      g.strokeStyle = 'rgba(255,255,255,0.10)';
      g.lineWidth = 1;
      g.strokeRect(x - 0.5, y - 0.5, 85, 63);
      g.font = 'bold 13px Arial';
      g.textAlign = 'center';
      g.fillStyle = lit ? 'rgba(20,16,8,0.9)' : 'rgba(130,134,128,0.75)';
      g.fillText(txt, x + 42, y + 36);
    }
    const tex = toTexture(c, { aniso: 4 });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // wall clock face pair (LOCAL / ZULU set by label + hand angles)
  const clockFace = (name, hourA, minA) => memo('clock:' + name, () => {
    const [c, g] = makeCanvas(128, 128);
    g.fillStyle = '#dfe2d8';
    g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
    g.strokeStyle = '#22251f';
    g.lineWidth = 5;
    g.beginPath(); g.arc(64, 64, 59, 0, 7); g.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.strokeStyle = '#3a3d33';
      g.lineWidth = i % 3 === 0 ? 3 : 1.6;
      g.beginPath();
      g.moveTo(64 + Math.cos(a) * 48, 64 + Math.sin(a) * 48);
      g.lineTo(64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54);
      g.stroke();
    }
    g.font = 'bold 10px Arial';
    g.textAlign = 'center';
    g.fillStyle = '#3a3d33';
    g.fillText(name, 64, 92);
    g.strokeStyle = '#22251f';
    g.lineWidth = 3.4;
    g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(hourA) * 28, 64 + Math.sin(hourA) * 28); g.stroke();
    g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(minA) * 44, 64 + Math.sin(minA) * 44); g.stroke();
    g.strokeStyle = '#a03428';
    g.lineWidth = 1.2;
    const sa = minA + 2.4;
    g.beginPath(); g.moveTo(64 - Math.cos(sa) * 10, 64 - Math.sin(sa) * 10); g.lineTo(64 + Math.cos(sa) * 46, 64 + Math.sin(sa) * 46); g.stroke();
    g.fillStyle = '#22251f';
    g.beginPath(); g.arc(64, 64, 3, 0, 7); g.fill();
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // shelf of binder spines (varied colors, taped labels)
  const binderSpines = () => memo('binderSpines', () => {
    const [c, g] = makeCanvas(256, 128);
    g.fillStyle = '#1c1e1b';
    g.fillRect(0, 0, 256, 128);
    let x = 4;
    const cols = ['#5c6248', '#7a4438', '#3d4a55', '#8a7a4a', '#4a4f38', '#6e5a3a', '#54563e', '#42473a'];
    let ci = 0;
    while (x < 240) {
      const w = irng.range(20, 34);
      const lean = irng.next() < 0.15 ? irng.range(-6, 6) : 0;
      g.save();
      g.translate(x + w / 2, 126);
      g.rotate(lean * 0.02);
      g.fillStyle = cols[ci++ % cols.length];
      g.fillRect(-w / 2, -118, w, 118);
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(-w / 2, -118, 2.5, 118);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(w / 2 - 2.5, -118, 2.5, 118);
      // spine rings + label tape
      g.fillStyle = 'rgba(220,222,210,0.85)';
      g.fillRect(-w / 2 + 3, -86, w - 6, 26);
      g.fillStyle = 'rgba(60,60,56,0.8)';
      for (let ln = 0; ln < 3; ln++) g.fillRect(-w / 2 + 5, -80 + ln * 6, (w - 10) * irng.range(0.5, 0.9), 2);
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.beginPath(); g.arc(0, -104, 2.5, 0, 7); g.fill();
      g.restore();
      x += w + 2;
    }
    const tex = toTexture(c, { aniso: 4 });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // green EXIT sign (kept mid-brightness so bloom stays tasteful)
  const exitSign = () => memo('exitSign', () => {
    const [c, g] = makeCanvas(128, 48);
    g.fillStyle = '#0c2414';
    g.fillRect(0, 0, 128, 48);
    g.strokeStyle = 'rgba(140,235,170,0.8)';
    g.lineWidth = 2;
    g.strokeRect(2, 2, 124, 44);
    g.font = 'bold 28px Arial';
    g.textAlign = 'center';
    g.fillStyle = '#7bef9e';
    g.fillText('EXIT', 58, 34);
    g.beginPath();
    g.moveTo(100, 24); g.lineTo(114, 24);
    g.moveTo(108, 17); g.lineTo(115, 24); g.lineTo(108, 31);
    g.strokeStyle = '#7bef9e';
    g.lineWidth = 3;
    g.stroke();
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // floor cable-channel cover strip (runs along V)
  const floorChannel = () => memo('floorChannel', () => {
    const [c, g] = makeCanvas(64, 256);
    g.fillStyle = '#585c52';
    g.fillRect(0, 0, 64, 256);
    // edge stripes: near-neutral warm gray — any saturated yellow turns lime
    // green under the cyan holo point light at night
    g.fillStyle = 'rgba(138,132,112,0.55)';
    g.fillRect(0, 0, 7, 256); g.fillRect(57, 0, 7, 256);
    // tread ribs
    g.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = 4; y < 256; y += 12) g.fillRect(10, y, 44, 3);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let y = 2; y < 256; y += 12) g.fillRect(10, y, 44, 1.6);
    // screws
    for (let y = 14; y < 256; y += 48) {
      for (const x of [12, 52]) {
        g.fillStyle = 'rgba(10,11,10,0.9)';
        g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill();
        g.fillStyle = 'rgba(200,206,198,0.4)';
        g.beginPath(); g.arc(x - 0.8, y - 0.8, 1, 0, 7); g.fill();
      }
    }
    // scuffs
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(150,150,140,${irng.range(0.04, 0.12)})`;
      g.fillRect(irng.next() * 64, irng.next() * 256, irng.range(1, 4), irng.range(1, 3));
    }
    const tex = toTexture(c, { aniso: 4 });
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });

  // holo tabletop ring: engraved degree ticks + numerals (transparent center)
  const holoRing = () => memo('holoRing', () => {
    const [c, g] = makeCanvas(512, 512);
    g.clearRect(0, 0, 512, 512);
    const cx = 256, cy = 256;
    // brushed annulus
    g.beginPath();
    g.arc(cx, cy, 254, 0, 7);
    g.arc(cx, cy, 206, 0, 7, true);
    g.fillStyle = '#2e3236';
    g.fill();
    for (let i = 0; i < 250; i++) {
      const a = irng.next() * 6.29, r0 = irng.range(207, 252);
      g.strokeStyle = `rgba(210,218,224,${irng.range(0.02, 0.07)})`;
      g.lineWidth = 1;
      g.beginPath(); g.arc(cx, cy, r0, a, a + irng.range(0.1, 0.5)); g.stroke();
    }
    // degree ticks every 5°, numerals every 30°
    for (let dg = 0; dg < 360; dg += 5) {
      const a = ((dg - 90) / 180) * Math.PI;
      const major = dg % 30 === 0;
      g.strokeStyle = major ? 'rgba(140,235,240,0.85)' : 'rgba(140,235,240,0.4)';
      g.lineWidth = major ? 2.4 : 1.2;
      const r0 = major ? 214 : 222, r1 = 236;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      g.stroke();
      if (major) {
        g.save();
        g.translate(cx + Math.cos(a) * 245, cy + Math.sin(a) * 245);
        g.rotate(a + Math.PI / 2);
        g.font = 'bold 13px monospace';
        g.textAlign = 'center';
        g.fillStyle = 'rgba(150,240,244,0.9)';
        g.fillText(String(dg).padStart(3, '0'), 0, 4);
        g.restore();
      }
    }
    const tex = toTexture(c, { aniso: 6 });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // clipboard sheet with checklist scribbles
  const clipboard = () => memo('clipboard', () => {
    const [c, g] = makeCanvas(96, 128);
    g.fillStyle = '#8a6f4a';
    g.fillRect(0, 0, 96, 128);
    g.fillStyle = '#ddd8c4';
    g.fillRect(6, 12, 84, 110);
    g.fillStyle = '#4a4d44';
    g.fillRect(34, 2, 28, 14);
    g.font = 'bold 7px Arial';
    g.textAlign = 'left';
    g.fillStyle = 'rgba(50,52,48,0.9)';
    g.fillText('CREW ROTA — WK 31', 10, 24);
    for (let ln = 0; ln < 9; ln++) {
      g.strokeStyle = 'rgba(70,72,66,0.5)';
      g.strokeRect(10.5, 30.5 + ln * 10, 5, 5);
      if (irng.next() < 0.6) {
        g.strokeStyle = 'rgba(40,60,120,0.8)';
        g.beginPath(); g.moveTo(11, 33 + ln * 10); g.lineTo(13, 35.5 + ln * 10); g.lineTo(16, 30.5 + ln * 10); g.stroke();
      }
      g.fillStyle = 'rgba(60,62,58,0.7)';
      g.fillRect(20, 32 + ln * 10, 55 * irng.range(0.5, 1), 1.8);
    }
    const tex = toTexture(c, { aniso: 4 });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // twin black rubber tire scuffs for concrete (transparent decal strip)
  const tireMarks = () => memo('tireMarks', () => {
    const [c, g] = makeCanvas(128, 256);
    g.clearRect(0, 0, 128, 256);
    for (const cx of [40, 88]) {
      const grad = g.createLinearGradient(cx - 12, 0, cx + 12, 0);
      grad.addColorStop(0, 'rgba(24,23,22,0)');
      grad.addColorStop(0.35, 'rgba(24,23,22,0.34)');
      grad.addColorStop(0.5, 'rgba(20,19,18,0.42)');
      grad.addColorStop(0.65, 'rgba(24,23,22,0.34)');
      grad.addColorStop(1, 'rgba(24,23,22,0)');
      g.fillStyle = grad;
      g.fillRect(cx - 12, 0, 24, 256);
      for (let y = 0; y < 256; y += 6) {
        g.fillStyle = `rgba(14,13,12,${rng.range(0.1, 0.3)})`;
        g.fillRect(cx - 8 + rng.range(-1.5, 1.5), y, 16, rng.range(1.6, 3));
      }
    }
    for (let i = 0; i < 160; i++) g.clearRect(rng.next() * 128, rng.next() * 256, 3, 2);
    // fade both ends
    for (const [y0, y1] of [[0, 40], [256, 216]]) {
      const fade = g.createLinearGradient(0, y0, 0, y1);
      fade.addColorStop(0, 'rgba(0,0,0,1)');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = fade;
      g.fillRect(0, Math.min(y0, y1), 128, Math.abs(y1 - y0));
      g.globalCompositeOperation = 'source-over';
    }
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // worn painted lane stripe (white-ish; tint via material color)
  const paintStripe = () => memo('paintStripe', () => {
    const [c, g] = makeCanvas(64, 512);
    g.clearRect(0, 0, 64, 512);
    g.fillStyle = 'rgba(228,222,204,0.92)';
    g.fillRect(14, 0, 36, 512);
    // chipped edges + wear holes
    for (let i = 0; i < 300; i++) {
      const x = rng.next() < 0.5 ? rng.range(10, 22) : rng.range(42, 54);
      g.clearRect(x, rng.next() * 512, rng.range(2, 6), rng.range(2, 7));
    }
    for (let i = 0; i < 140; i++) g.clearRect(rng.range(14, 50), rng.next() * 512, rng.range(1, 4), rng.range(1, 5));
    const tex = toTexture(c);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });

  // drainage grate: dark recessed slots in a steel frame
  const drainGrate = () => memo('drainGrate', () => {
    const [c, g] = makeCanvas(128, 192);
    g.fillStyle = '#43464a';
    g.fillRect(0, 0, 128, 192);
    g.strokeStyle = 'rgba(210,214,220,0.35)';
    g.lineWidth = 3;
    g.strokeRect(3, 3, 122, 186);
    g.fillStyle = '#0c0d0f';
    for (let y = 14; y < 180; y += 16) g.fillRect(12, y, 104, 9);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let y = 12; y < 178; y += 16) g.fillRect(12, y, 104, 2);
    // rust bleed
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(112,74,40,${rng.range(0.08, 0.2)})`;
      g.fillRect(rng.next() * 128, rng.next() * 192, rng.range(3, 9), rng.range(2, 5));
    }
    const tex = toTexture(c, { aniso: 4 });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // phased-array radar face: element grid, cooling bars, hazard border
  const radarArray = () => memo('radarArray', () => {
    const [c, g] = makeCanvas(512, 384);
    g.fillStyle = '#4c5142';
    g.fillRect(0, 0, 512, 384);
    const img = g.getImageData(0, 0, 512, 384);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng.next() - 0.5) * 10;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // element grid
    for (let y = 26; y < 360; y += 17) {
      for (let x = 30; x < 484; x += 17) {
        const l = rng.int(-10, 10);
        g.fillStyle = `rgba(${34 + l},${38 + l},${32 + l},0.95)`;
        g.beginPath(); g.arc(x, y, 5.4, 0, 7); g.fill();
        g.fillStyle = 'rgba(150,160,140,0.28)';
        g.beginPath(); g.arc(x - 1.4, y - 1.4, 1.6, 0, 7); g.fill();
      }
    }
    // panel seams
    g.strokeStyle = 'rgba(24,26,22,0.6)';
    g.lineWidth = 2;
    for (let x = 128; x < 512; x += 128) { g.beginPath(); g.moveTo(x, 12); g.lineTo(x, 372); g.stroke(); }
    g.beginPath(); g.moveTo(12, 192); g.lineTo(500, 192); g.stroke();
    // hazard border
    g.save();
    g.strokeStyle = 'rgba(180,150,40,0.5)';
    g.lineWidth = 8;
    g.strokeRect(8, 8, 496, 368);
    g.restore();
    // stencil
    g.fillStyle = 'rgba(210,206,188,0.7)';
    g.font = 'bold 15px Arial';
    g.textAlign = 'left';
    g.fillText('AN/VPS-9 · NO STEP', 20, 378);
    return toTexture(c, { aniso: 4 });
  });

  // cork notice board with pinned pages
  const noticeBoard = () => memo('noticeBoard', () => {
    const [c, g] = makeCanvas(256, 192);
    g.fillStyle = '#7a6242';
    g.fillRect(0, 0, 256, 192);
    for (let i = 0; i < 600; i++) {
      g.fillStyle = `rgba(${90 + rng.int(0, 50)},${70 + rng.int(0, 40)},${44 + rng.int(0, 26)},0.4)`;
      g.fillRect(rng.next() * 256, rng.next() * 192, 2, 2);
    }
    g.strokeStyle = '#3a3d33';
    g.lineWidth = 8;
    g.strokeRect(4, 4, 248, 184);
    // pinned sheets
    for (let i = 0; i < 7; i++) {
      const x = rng.range(16, 190), y = rng.range(16, 120), w = rng.range(34, 60), h = rng.range(40, 62);
      g.save();
      g.translate(x + w / 2, y + h / 2);
      g.rotate(rng.range(-0.16, 0.16));
      g.fillStyle = rng.pick(['#ddd8c8', '#d8d2be', '#cfd6c8', '#e2d8a8']);
      g.fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle = 'rgba(60,60,58,0.7)';
      for (let ln = 0; ln < h - 16; ln += 7) g.fillRect(-w / 2 + 5, -h / 2 + 8 + ln, w * rng.range(0.5, 0.85), 2);
      g.fillStyle = rng.pick(['#a02020', '#204880', '#207040']);
      g.beginPath(); g.arc(0, -h / 2 + 4, 3, 0, 7); g.fill();
      g.restore();
    }
    const tex = toTexture(c, { aniso: 4 });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  const noiseTex = () => memo('noise', () => {
    const [c, g] = makeCanvas(256, 256);
    const img = g.createImageData(256, 256);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        const v = fbm2D(x / 34, y / 34, 4) * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const tex = toTexture(c, { srgb: false, repeat: [1, 1] });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });

  return {
    sand, concrete, asphalt, gravel, sandTracks, desertTan, oliveDrab, metalPlate,
    heatBurn, hazardStripes, chainlink, hescoFabric, woodPallet, label, roundel,
    arrowDecal, mapBoard, statusScreen, softPuff, blobShadow, oilStain, hardFlare,
    scorch, scrub, grassTuft, roadLine, noiseTex,
    sandOverlay, interiorWall, interiorCeiling, paintedFloor, rackFace, tireMarks,
    paintStripe, drainGrate, radarArray, noticeBoard,
    consolePanel, keyboard, annunciator, clockFace, binderSpines, exitSign,
    floorChannel, holoRing, clipboard,
  };
}
