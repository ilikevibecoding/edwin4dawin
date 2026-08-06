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
    const [c, g] = makeCanvas(512, 384);
    g.fillStyle = '#cfc8b4';
    g.fillRect(0, 0, 512, 384);
    // paper mottling
    for (let i = 0; i < 700; i++) {
      g.fillStyle = `rgba(120,110,88,${rng.range(0.02, 0.07)})`;
      g.fillRect(rng.next() * 512, rng.next() * 384, rng.range(2, 12), rng.range(1, 6));
    }
    // topo contours
    for (let k = 0; k < 26; k++) {
      const cx = rng.range(-60, 560), cy = rng.range(-60, 440), r0 = rng.range(14, 46);
      g.strokeStyle = `rgba(150,116,74,${rng.range(0.35, 0.6)})`;
      g.lineWidth = 1;
      for (let ring = 0; ring < rng.int(2, 5); ring++) {
        g.beginPath();
        const rr = r0 + ring * rng.range(7, 13);
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
    // grid
    g.strokeStyle = 'rgba(70,86,110,0.4)';
    g.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 384); g.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke();
    }
    // base marker + range rings
    const bx = 256, by = 268;
    g.strokeStyle = 'rgba(40,90,150,0.85)';
    g.lineWidth = 2;
    for (const r of [34, 68, 108]) {
      g.beginPath(); g.arc(bx, by, r, 0, 7); g.stroke();
    }
    g.fillStyle = 'rgba(40,90,150,0.95)';
    g.fillRect(bx - 5, by - 5, 10, 10);
    // threat axes
    g.strokeStyle = 'rgba(170,40,32,0.9)';
    g.lineWidth = 3;
    for (const a of [-0.42, -0.1, 0.35]) {
      g.beginPath();
      g.moveTo(bx + Math.sin(a) * 116, by - Math.cos(a) * 116);
      g.lineTo(bx + Math.sin(a) * 34, by - Math.cos(a) * 34);
      g.stroke();
      // arrowhead
      const hx = bx + Math.sin(a) * 34, hy = by - Math.cos(a) * 34;
      g.beginPath();
      g.moveTo(hx, hy);
      g.lineTo(hx + Math.sin(a + 0.5) * 12, hy - Math.cos(a + 0.5) * 12);
      g.lineTo(hx + Math.sin(a - 0.5) * 12, hy - Math.cos(a - 0.5) * 12);
      g.closePath();
      g.fillStyle = 'rgba(170,40,32,0.9)';
      g.fill();
    }
    // restricted polygon
    g.strokeStyle = 'rgba(160,30,26,0.75)';
    g.setLineDash([6, 4]);
    g.lineWidth = 2;
    g.strokeRect(64, 40, 150, 96);
    g.setLineDash([]);
    // pins
    for (let i = 0; i < 9; i++) {
      g.fillStyle = rng.next() < 0.5 ? '#a02020' : '#204880';
      g.beginPath(); g.arc(rng.range(40, 470), rng.range(30, 350), 4, 0, 7); g.fill();
    }
    // header bar
    g.fillStyle = '#3a3d33';
    g.fillRect(0, 0, 512, 26);
    g.fillStyle = '#e5e2d4';
    g.font = 'bold 17px Arial';
    g.textAlign = 'left';
    g.fillText('IRONVEIL RANGE — SECTOR MAP · REV 6 · NOT TO SCALE', 10, 18);
    // tape corners
    g.fillStyle = 'rgba(210,200,170,0.8)';
    for (const [x, y] of [[6, 30], [482, 30], [6, 356], [482, 356]]) g.fillRect(x, y, 24, 10);
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

  // shelter interior: dark olive-grey ribbed wall panels with rivets + scuffs
  const interiorWall = () => memo('interiorWall', () => {
    const [c, g] = makeCanvas(512, 512);
    g.fillStyle = '#4b4f45';
    g.fillRect(0, 0, 512, 512);
    const img = g.getImageData(0, 0, 512, 512);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng.next() - 0.5) * 10;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // vertical panel seams every 128px with rib shading
    for (let x = 0; x <= 512; x += 128) {
      const p = Math.min(510, Math.max(2, x));
      const grad = g.createLinearGradient(p - 14, 0, p + 14, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.42, 'rgba(0,0,0,0.22)');
      grad.addColorStop(0.5, 'rgba(120,126,112,0.35)');
      grad.addColorStop(0.58, 'rgba(0,0,0,0.28)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(p - 14, 0, 28, 512);
    }
    // horizontal stiffener bands
    for (const y of [86, 296]) {
      g.fillStyle = 'rgba(30,32,28,0.4)';
      g.fillRect(0, y, 512, 5);
      g.fillStyle = 'rgba(140,146,130,0.22)';
      g.fillRect(0, y - 3, 512, 3);
    }
    // rivets along seams
    g.fillStyle = 'rgba(28,30,26,0.75)';
    for (let x = 0; x <= 512; x += 128) {
      const p = Math.min(505, Math.max(7, x));
      for (let y = 18; y < 512; y += 44) {
        g.beginPath(); g.arc(p, y, 2.4, 0, 7); g.fill();
        g.fillStyle = 'rgba(150,156,140,0.4)';
        g.beginPath(); g.arc(p - 0.8, y - 0.8, 1.0, 0, 7); g.fill();
        g.fillStyle = 'rgba(28,30,26,0.75)';
      }
    }
    // scuffs + grime near the bottom edge
    for (let i = 0; i < 120; i++) {
      const x = rng.next() * 512, y = 512 - Math.pow(rng.next(), 2.2) * 220;
      g.fillStyle = `rgba(24,25,22,${rng.range(0.06, 0.22)})`;
      g.fillRect(x, y, rng.range(4, 26), rng.range(1, 4));
    }
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(160,164,150,${rng.range(0.04, 0.12)})`;
      g.lineWidth = rng.range(0.5, 1.4);
      const x = rng.next() * 512, y = rng.next() * 512;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rng.range(-30, 30), y + rng.range(-8, 8)); g.stroke();
    }
    return toTexture(c, { repeat: [1, 1], aniso: 4 });
  });

  // one-shot painted floor for the C2 shelter: grey deck, walkway, wear path
  const paintedFloor = () => memo('paintedFloor', () => {
    const [c, g] = makeCanvas(512, 384);
    g.fillStyle = '#585c56';
    g.fillRect(0, 0, 512, 384);
    const img = g.getImageData(0, 0, 512, 384);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng.next() - 0.5) * 12;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // painted border lane
    g.strokeStyle = 'rgba(196,186,120,0.5)';
    g.lineWidth = 6;
    g.strokeRect(22, 22, 468, 340);
    // hazard chevrons at the door (door sits on +z edge, right-of-center)
    g.save();
    g.translate(354, 372);
    for (let i = -3; i < 4; i++) {
      g.fillStyle = i % 2 ? 'rgba(180,150,40,0.55)' : 'rgba(28,28,28,0.55)';
      g.beginPath();
      g.moveTo(i * 16, 12); g.lineTo(i * 16 + 8, -14); g.lineTo(i * 16 + 16, -14); g.lineTo(i * 16 + 8, 12);
      g.fill();
    }
    g.restore();
    // worn traffic path: door -> console desk & holo table
    const wear = (x0, y0, x1, y1, w) => {
      const grad = g.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, 'rgba(40,42,38,0.34)');
      grad.addColorStop(1, 'rgba(40,42,38,0.12)');
      g.strokeStyle = grad;
      g.lineWidth = w;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    };
    wear(354, 352, 200, 120, 44);
    wear(354, 352, 380, 170, 40);
    wear(210, 110, 120, 90, 34);
    // scuffs
    for (let i = 0; i < 200; i++) {
      g.fillStyle = `rgba(28,30,26,${rng.range(0.05, 0.18)})`;
      g.fillRect(rng.next() * 512, rng.next() * 384, rng.range(2, 9), rng.range(1, 3));
    }
    // cable channel strip toward racks (left side)
    g.fillStyle = 'rgba(34,36,32,0.6)';
    g.fillRect(60, 60, 10, 280);
    g.strokeStyle = 'rgba(150,154,142,0.3)';
    g.strokeRect(60, 60, 10, 280);
    const tex = toTexture(c, { aniso: 4 });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // equipment rack front: stacked modules, vents, handles, tiny silkscreen
  const rackFace = () => memo('rackFace', () => {
    const [c, g] = makeCanvas(256, 512);
    g.fillStyle = '#23262a';
    g.fillRect(0, 0, 256, 512);
    // rails
    g.fillStyle = '#31353a';
    g.fillRect(0, 0, 14, 512); g.fillRect(242, 0, 14, 512);
    g.fillStyle = 'rgba(150,156,164,0.5)';
    for (let y = 10; y < 512; y += 24) { g.fillRect(5, y, 4, 4); g.fillRect(247, y, 4, 4); }
    // module stack
    let y = 8;
    while (y < 490) {
      const h = rng.pick([26, 26, 40, 54, 68]);
      if (y + h > 500) break;
      const tone = rng.pick(['#2c3034', '#33373c', '#2a2e26', '#3a3e34']);
      g.fillStyle = tone;
      g.fillRect(16, y, 224, h - 5);
      g.strokeStyle = 'rgba(0,0,0,0.55)';
      g.strokeRect(16.5, y + 0.5, 223, h - 6);
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.fillRect(16, y, 224, 2);
      // handles
      g.fillStyle = '#171a1d';
      g.fillRect(22, y + 5, 7, h - 15); g.fillRect(227, y + 5, 7, h - 15);
      // vent slots or knobs
      if (rng.next() < 0.6) {
        g.fillStyle = 'rgba(12,13,15,0.8)';
        for (let vx = 44; vx < 190; vx += 9) g.fillRect(vx, y + 7, 5, h - 19);
      } else {
        for (let k = 0; k < 4; k++) {
          g.fillStyle = '#15181b';
          g.beginPath(); g.arc(60 + k * 26, y + h / 2 - 2, 5, 0, 7); g.fill();
          g.strokeStyle = 'rgba(180,186,192,0.35)';
          g.beginPath(); g.arc(60 + k * 26, y + h / 2 - 2, 5, 0, 7); g.stroke();
        }
      }
      // silkscreen label
      g.fillStyle = 'rgba(196,204,190,0.55)';
      g.font = '7px monospace';
      g.textAlign = 'left';
      g.fillText(rng.pick(['SIG PROC', 'PWR DIST', 'UPLINK', 'IFF CODER', 'RX CHAIN', 'CRYPTO', 'COOLING']), 100, y + h - 10);
      y += h;
    }
    // grime
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(0,0,0,${rng.range(0.05, 0.2)})`;
      g.fillRect(rng.next() * 256, rng.next() * 512, rng.range(2, 8), rng.range(1, 3));
    }
    return toTexture(c, { aniso: 4 });
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
    sandOverlay, interiorWall, paintedFloor, rackFace, tireMarks, paintStripe,
    drainGrate, radarArray, noticeBoard,
  };
}
