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
    const [c, g] = makeCanvas(1024, 1024);
    g.fillStyle = '#b09368';
    g.fillRect(0, 0, 1024, 1024);
    // large blotches
    for (let i = 0; i < 260; i++) {
      const x = rng.next() * 1024, y = rng.next() * 1024, r = rng.range(30, 160);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      const tone = rng.pick(['#a58a60', '#bb9f74', '#9c815b', '#c2a87e', '#ab8f66']);
      grad.addColorStop(0, tone + '55');
      grad.addColorStop(1, tone + '00');
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // fine grain
    const img = g.getImageData(0, 0, 1024, 1024);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng.next() - 0.5) * 26;
      d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.9;
    }
    g.putImageData(img, 0, 0);
    // scattered pebbles + scrub flecks
    for (let i = 0; i < 1600; i++) {
      const x = rng.next() * 1024, y = rng.next() * 1024;
      g.fillStyle = rng.next() < 0.65 ? 'rgba(90,74,52,0.5)' : 'rgba(150,132,100,0.55)';
      g.beginPath(); g.arc(x, y, rng.range(0.6, 2.4), 0, 7); g.fill();
    }
    for (let i = 0; i < 90; i++) {
      const x = rng.next() * 1024, y = rng.next() * 1024;
      g.fillStyle = 'rgba(96,92,58,0.30)';
      g.beginPath(); g.arc(x, y, rng.range(3, 9), 0, 7); g.fill();
    }
    return toTexture(c, { repeat: [170, 170], aniso: 8 });
  });

  const concrete = () => memo('concrete', () => {
    const [c, g] = makeCanvas(1024, 1024);
    g.fillStyle = '#96958f';
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 220; i++) {
      const x = rng.next() * 1024, y = rng.next() * 1024, r = rng.range(24, 130);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      const tone = rng.pick(['#8d8c86', '#a09f98', '#87868a', '#9a9992']);
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
    // expansion joints (tile 4x4)
    g.strokeStyle = 'rgba(40,40,40,0.55)';
    g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * 256, 0); g.lineTo(i * 256, 1024); g.stroke();
      g.beginPath(); g.moveTo(0, i * 256); g.lineTo(1024, i * 256); g.stroke();
    }
    // cracks
    g.strokeStyle = 'rgba(60,58,54,0.5)';
    g.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) {
      let x = rng.next() * 1024, y = rng.next() * 1024;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 14; s++) {
        x += rng.range(-26, 26); y += rng.range(-26, 26);
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
    // wheel wear bands
    const wear = g.createLinearGradient(0, 0, 512, 0);
    wear.addColorStop(0.0, 'rgba(0,0,0,0)');
    wear.addColorStop(0.22, 'rgba(24,24,26,0.35)');
    wear.addColorStop(0.5, 'rgba(0,0,0,0)');
    wear.addColorStop(0.78, 'rgba(24,24,26,0.35)');
    wear.addColorStop(1.0, 'rgba(0,0,0,0)');
    g.fillStyle = wear;
    g.fillRect(0, 0, 512, 512);
    return toTexture(c, { repeat: [1, 14], aniso: 8 });
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

  const chainlink = () => memo('chainlink', () => {
    const [c, g] = makeCanvas(128, 128);
    g.clearRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(190,196,200,0.95)';
    g.lineWidth = 2.5;
    const s = 32;
    for (let i = -4; i < 8; i++) {
      g.beginPath();
      g.moveTo(i * s, -8); g.lineTo(i * s + 136, 128 + 8);
      g.stroke();
      g.beginPath();
      g.moveTo(i * s + 136, -8); g.lineTo(i * s, 128 + 8);
      g.stroke();
    }
    const tex = toTexture(c, { repeat: [1, 1] });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
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
        g.clearRect(Math.random() * w, Math.random() * h, 2, 1.5);
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

  // dashed road centerline strip
  const roadLine = () => memo('roadLine', () => {
    const [c, g] = makeCanvas(64, 256);
    g.clearRect(0, 0, 64, 256);
    g.fillStyle = 'rgba(210,200,170,0.75)';
    g.fillRect(24, 20, 16, 100);
    for (let i = 0; i < 60; i++) g.clearRect(rng.next() * 64, rng.next() * 256, 3, 3);
    return toTexture(c, { repeat: [1, 6] });
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
    sand, concrete, asphalt, desertTan, oliveDrab, metalPlate, heatBurn,
    hazardStripes, chainlink, label, roundel, softPuff, hardFlare, scorch,
    scrub, roadLine, noiseTex,
  };
}
