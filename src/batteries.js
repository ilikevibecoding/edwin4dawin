// batteries.js — three fictionalized interceptor batteries: RAMPART (Patriot-
// inspired truck + trailer TEL), HALBERD (THAAD-inspired 10-wheel truck with an
// 8-tube lattice pack), SENTINEL (fictional fixed long-range gantry rail).
// All numbers are gameplay values, not real system characteristics. Static
// detail is merged per-material into few meshes to stay inside the draw-call
// budget; repeated small parts (covers, scorch rings) are instanced.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, damp, stepAngle, wrapAngle, TAU, Rand } from './util.js';
import { makeColliderBox, makeColliderCyl } from './physics.js';

export const BATTERY_DEFS = {
  patriot: {
    id: 'patriot',
    name: 'RAMPART PX-4',
    kind: 'Terminal-phase battery',
    desc: 'Fast response · agile near base',
    ammo: 8,
    launchDelay: 1.0,
    reloadTime: 3.5,
    slewRate: 1.5,
    interceptor: {
      accel: 300, boostTime: 2.4, maxSpeed: 950, turnRate: 0.62,
      killRadius: 10, avgSpeed: 560, trailWidth: 0.8,
      color: 0xd8d4c8, flame: 0xffc26e, length: 5.2, girth: 0.21,
    },
    envelope: { minAlt: 120, maxAlt: 2800, maxRange: 4200, sweetLow: 300, sweetHigh: 2200 },
  },
  thaad: {
    id: 'thaad',
    name: 'HALBERD HA-9',
    kind: 'High-altitude battery',
    desc: 'Slow spin-up · wide window',
    ammo: 6,
    launchDelay: 2.4,
    reloadTime: 6.5,
    slewRate: 0.85,
    interceptor: {
      accel: 210, boostTime: 4.4, maxSpeed: 1400, turnRate: 0.34,
      killRadius: 14, avgSpeed: 800, trailWidth: 1.05,
      color: 0xcfd4d9, flame: 0xa9d4ff, length: 6.2, girth: 0.28,
    },
    envelope: { minAlt: 1200, maxAlt: 5200, maxRange: 8000, sweetLow: 1800, sweetHigh: 4600 },
  },
  sentinel: {
    id: 'sentinel',
    name: 'SENTINEL LR-1',
    kind: 'Long-range test battery',
    desc: 'Three rounds · maximum reach',
    ammo: 3,
    launchDelay: 3.4,
    reloadTime: 12,
    slewRate: 0.5,
    interceptor: {
      accel: 165, boostTime: 6.2, maxSpeed: 1800, turnRate: 0.22,
      killRadius: 20, avgSpeed: 980, trailWidth: 1.5,
      color: 0xe3e0d5, flame: 0xffa24d, length: 9.5, girth: 0.42,
    },
    envelope: { minAlt: 1900, maxAlt: 12500, maxRange: 14000, sweetLow: 2400, sweetHigh: 9000 },
  },
};

export function createBatteries(ctx) {
  const { scene, textures, baseMaterials: M } = ctx;
  const pads = ctx.base.batteryPads;
  const list = [];
  const byId = new Map();
  const vr = new Rand(90210); // local, deterministic, visual-only randomness

  // ============================================ inline canvas textures
  function bCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d')];
  }
  function bTex(c, { srgb = true } = {}) {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }
  const rgba = (r, g2, b, a) => `rgba(${r},${g2},${b},${a})`;

  /** military vehicle paint: soft 2-tone mottle, panel seams, rivets, hatches,
   *  streaking, grime skirt. Returns { map, bump } with a matching bump canvas. */
  function paintSet(base, blotA, blotB, seed, { fade = 0.1 } = {}) {
    const rng = new Rand(seed);
    const S = 512;
    const [c, g] = bCanvas(S, S);
    const [cb, gb] = bCanvas(S, S);
    g.fillStyle = base;
    g.fillRect(0, 0, S, S);
    gb.fillStyle = '#7f7f7f';
    gb.fillRect(0, 0, S, S);
    // large soft camo mottle (subtle — reads as tonal variation, not blobs)
    for (let i = 0; i < 22; i++) {
      const x = rng.next() * S, y = rng.next() * S, r = rng.range(55, 150);
      const col = rng.next() < 0.5 ? blotA : blotB;
      const grad = g.createRadialGradient(x, y, r * 0.15, x, y, r);
      grad.addColorStop(0, rgba(col[0], col[1], col[2], rng.range(0.10, 0.22)));
      grad.addColorStop(1, rgba(col[0], col[1], col[2], 0));
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // sun fade from the top
    const fg = g.createLinearGradient(0, 0, 0, S);
    fg.addColorStop(0, rgba(255, 250, 235, fade));
    fg.addColorStop(0.5, rgba(255, 250, 235, 0));
    fg.addColorStop(1, rgba(20, 18, 14, 0.16));
    g.fillStyle = fg;
    g.fillRect(0, 0, S, S);
    // panel seam layout (shared with bump)
    const vLines = [], hLines = [];
    for (let x = rng.range(30, 90); x < S; x += rng.range(80, 150)) vLines.push(x);
    for (let y = rng.range(30, 80); y < S; y += rng.range(70, 130)) hLines.push(y);
    g.lineWidth = 2;
    gb.lineWidth = 3;
    for (const x of vLines) {
      g.strokeStyle = rgba(10, 10, 8, 0.30);
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke();
      g.strokeStyle = rgba(255, 255, 240, 0.07);
      g.beginPath(); g.moveTo(x + 2, 0); g.lineTo(x + 2, S); g.stroke();
      gb.strokeStyle = rgba(30, 30, 30, 0.9);
      gb.beginPath(); gb.moveTo(x, 0); gb.lineTo(x, S); gb.stroke();
    }
    for (const y of hLines) {
      g.strokeStyle = rgba(10, 10, 8, 0.30);
      g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke();
      g.strokeStyle = rgba(255, 255, 240, 0.07);
      g.beginPath(); g.moveTo(0, y + 2); g.lineTo(S, y + 2); g.stroke();
      gb.strokeStyle = rgba(30, 30, 30, 0.9);
      gb.beginPath(); gb.moveTo(0, y); gb.lineTo(S, y); gb.stroke();
    }
    // rivet rows along some seams
    for (const x of vLines) {
      if (rng.next() < 0.45) continue;
      for (let y = 8; y < S; y += 15) {
        g.fillStyle = rgba(12, 12, 10, 0.35);
        g.beginPath(); g.arc(x + 6, y, 1.6, 0, 7); g.fill();
        g.fillStyle = rgba(255, 252, 240, 0.16);
        g.beginPath(); g.arc(x + 5.4, y - 0.6, 0.8, 0, 7); g.fill();
        gb.fillStyle = '#d8d8d8';
        gb.beginPath(); gb.arc(x + 6, y, 1.7, 0, 7); gb.fill();
      }
    }
    for (const y of hLines) {
      if (rng.next() < 0.55) continue;
      for (let x = 10; x < S; x += 16) {
        g.fillStyle = rgba(12, 12, 10, 0.32);
        g.beginPath(); g.arc(x, y + 6, 1.5, 0, 7); g.fill();
        gb.fillStyle = '#d4d4d4';
        gb.beginPath(); gb.arc(x, y + 6, 1.6, 0, 7); gb.fill();
      }
    }
    // access hatches / panels
    for (let i = 0; i < 7; i++) {
      const w = rng.range(34, 78), h = rng.range(26, 54);
      const x = rng.next() * (S - w), y = rng.next() * (S - h);
      g.strokeStyle = rgba(8, 8, 6, 0.4);
      g.lineWidth = 1.6;
      g.strokeRect(x, y, w, h);
      g.fillStyle = rgba(255, 252, 240, rng.range(0.02, 0.07));
      g.fillRect(x, y, w, h);
      gb.strokeStyle = '#4a4a4a';
      gb.lineWidth = 2;
      gb.strokeRect(x, y, w, h);
      g.fillStyle = rgba(10, 10, 8, 0.5);
      for (const [dx, dy] of [[5, 5], [w - 5, 5], [5, h - 5], [w - 5, h - 5]]) {
        g.beginPath(); g.arc(x + dx, y + dy, 1.5, 0, 7); g.fill();
      }
    }
    // rain/grime streaks down from seam intersections
    for (let i = 0; i < 42; i++) {
      const x = rng.next() * S, y = rng.next() * S * 0.8, len = rng.range(18, 90);
      const grad = g.createLinearGradient(x, y, x, y + len);
      grad.addColorStop(0, rgba(16, 15, 12, rng.range(0.10, 0.24)));
      grad.addColorStop(1, rgba(16, 15, 12, 0));
      g.fillStyle = grad;
      g.fillRect(x, y, rng.range(1.5, 4), len);
    }
    // scuffs and chips
    for (let i = 0; i < 90; i++) {
      g.fillStyle = rng.next() < 0.5
        ? rgba(200, 196, 180, rng.range(0.05, 0.16))
        : rgba(14, 13, 11, rng.range(0.08, 0.2));
      g.fillRect(rng.next() * S, rng.next() * S, rng.range(2, 9), rng.range(1, 2.6));
    }
    // faint service stencils
    g.fillStyle = rgba(20, 20, 16, 0.4);
    for (let i = 0; i < 5; i++) {
      const x = rng.next() * (S - 60), y = rng.next() * (S - 20);
      for (let k = 0; k < 4; k++) g.fillRect(x + k * 12, y, 8, 3.4);
      g.fillRect(x, y + 6, 34, 2.6);
    }
    return {
      map: bTex(c),
      bump: bTex(cb, { srgb: false }),
    };
  }
  const tanSet = paintSet('#a2906a', [122, 104, 72], [176, 156, 116], 7401);
  const oliveSet = paintSet('#636a52', [76, 82, 62], [100, 106, 82], 7402, { fade: 0.13 });

  // steel tread plate (decks / steps)
  const treadSet = (() => {
    const S = 192;
    const [c, g] = bCanvas(S, S);
    const [cb, gb] = bCanvas(S, S);
    g.fillStyle = '#4e5257';
    g.fillRect(0, 0, S, S);
    gb.fillStyle = '#787878';
    gb.fillRect(0, 0, S, S);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = rgba(20, 22, 24, vr.range(0.06, 0.18));
      g.fillRect(vr.next() * S, vr.next() * S, vr.range(6, 26), vr.range(4, 16));
    }
    const stud = (x, y, a) => {
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = rgba(160, 166, 172, 0.5);
      g.fillRect(-7, -2.4, 14, 4.8);
      g.fillStyle = rgba(18, 20, 22, 0.45);
      g.fillRect(-7, 1.2, 14, 1.6);
      g.restore();
      gb.save(); gb.translate(x, y); gb.rotate(a);
      gb.fillStyle = '#e6e6e6';
      gb.fillRect(-7, -2.4, 14, 4.8);
      gb.restore();
    };
    for (let y = 8; y < S; y += 24) {
      for (let x = 8; x < S; x += 24) {
        const off = ((y / 24) | 0) % 2 ? 12 : 0;
        stud(x + off, y, Math.PI / 4);
        stud(x + off + 12, y + 12, -Math.PI / 4);
      }
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = rgba(200, 205, 210, vr.range(0.04, 0.1));
      g.fillRect(vr.next() * S, vr.next() * S, vr.range(3, 10), 1.4);
    }
    return { map: bTex(c), bump: bTex(cb, { srgb: false }) };
  })();

  // tire tread (wraps cylinder side) + sidewall/hub disc (cylinder caps)
  // tread (left half) + sidewall/rim (right half) in ONE atlas so a whole
  // wheel set is a single material bucket (halves the tire draw calls)
  const tireTex = (() => {
    const [c, g] = bCanvas(512, 256);
    // --- tread block: x 0..256, tiles horizontally around the circumference
    g.fillStyle = '#1c1e21';
    g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 20) {
      const off = ((x / 20) | 0) % 2 ? 18 : 0;
      g.fillStyle = '#2b2e32';
      g.fillRect(x + 2, 6 + off, 14, 92);
      g.fillRect(x + 6, 132 + off, 14, 100);
      g.fillStyle = '#101215';
      g.fillRect(x, 0, 3, 256);
    }
    g.fillStyle = '#101215';
    g.fillRect(0, 114, 256, 22);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = rgba(120, 116, 104, vr.range(0.04, 0.14));
      g.fillRect(vr.next() * 256, vr.next() * 256, vr.range(3, 10), vr.range(2, 4));
    }
    // --- sidewall + rim disc: x 256..512
    const cx = 384, cy = 128;
    g.fillStyle = '#191b1e';
    g.fillRect(256, 0, 256, 256);
    g.strokeStyle = '#26282c';
    g.lineWidth = 12;
    g.beginPath(); g.arc(cx, cy, 104, 0, 7); g.stroke();
    g.lineWidth = 4;
    g.strokeStyle = '#111316';
    g.beginPath(); g.arc(cx, cy, 90, 0, 7); g.stroke();
    // brand dash ring
    g.fillStyle = '#3d4045';
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU;
      g.save(); g.translate(cx + Math.cos(a) * 96, cy + Math.sin(a) * 96); g.rotate(a + Math.PI / 2);
      g.fillRect(-8, -3.2, 16, 6.4);
      g.restore();
    }
    // steel rim + bolts + hub
    g.fillStyle = '#585d63';
    g.beginPath(); g.arc(cx, cy, 68, 0, 7); g.fill();
    g.fillStyle = '#43474d';
    g.beginPath(); g.arc(cx, cy, 60, 0, 7); g.fill();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      g.fillStyle = '#23262a';
      g.beginPath(); g.arc(cx + Math.cos(a) * 48, cy + Math.sin(a) * 48, 6.8, 0, 7); g.fill();
      g.fillStyle = '#787d84';
      g.beginPath(); g.arc(cx + Math.cos(a) * 48 - 1.6, cy + Math.sin(a) * 48 - 1.6, 2.8, 0, 7); g.fill();
    }
    g.fillStyle = '#31353a';
    g.beginPath(); g.arc(cx, cy, 18, 0, 7); g.fill();
    g.fillStyle = '#15171a';
    g.beginPath(); g.arc(cx, cy, 10, 0, 7); g.fill();
    // dust
    for (let i = 0; i < 50; i++) {
      g.fillStyle = rgba(150, 138, 112, vr.range(0.04, 0.12));
      const a = vr.next() * TAU, r = vr.range(72, 124);
      g.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, vr.range(2, 8), vr.range(2, 6));
    }
    return bTex(c);
  })();

  // HALBERD launch-tube skin: filament-wound composite, hazard ring + stencil
  // band near the mouth (u wraps the circumference, v runs down the length)
  const tubeTex = (() => {
    const [c, g] = bCanvas(256, 256);
    g.fillStyle = '#4d5138';
    g.fillRect(0, 0, 256, 256);
    // circumferential filament banding
    for (let y = 0; y < 256; y += 3) {
      g.fillStyle = rgba(30, 32, 20, vr.range(0.04, 0.2));
      g.fillRect(0, y, 256, 1.4);
    }
    for (let i = 0; i < 46; i++) {
      g.fillStyle = rgba(118, 124, 88, vr.range(0.05, 0.13));
      g.fillRect(vr.next() * 256, vr.next() * 256, vr.range(10, 42), 1.3);
    }
    // canvas top = v1 = tube mouth: hazard ring + repeated stencil band
    g.fillStyle = '#a8923a';
    g.fillRect(0, 20, 256, 7);
    g.font = 'bold 13px Arial';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(232,228,210,0.9)';
    for (const x of [8, 136]) g.fillText('HA-9 · IV-DEF', x, 44);
    // shaded rear collar
    g.fillStyle = 'rgba(18,19,14,0.5)';
    g.fillRect(0, 244, 256, 12);
    // axial grime streaks (vertical in canvas)
    for (let i = 0; i < 26; i++) {
      g.fillStyle = rgba(24, 26, 18, vr.range(0.05, 0.16));
      g.fillRect(vr.next() * 256, vr.range(30, 130), vr.range(1.5, 4), vr.range(30, 120));
    }
    return bTex(c);
  })();

  // canister front face (dark composite, bolted frame, two cell holes baked)
  const canFaceTex = (() => {
    const S = 192;
    const [c, g] = bCanvas(S, S);
    g.fillStyle = '#33362f';
    g.fillRect(0, 0, S, S);
    const grad = g.createRadialGradient(S / 2, S / 2, 20, S / 2, S / 2, S * 0.7);
    grad.addColorStop(0, rgba(70, 74, 62, 0.5));
    grad.addColorStop(1, rgba(8, 9, 7, 0.55));
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    // frame
    g.strokeStyle = '#454a3e';
    g.lineWidth = 10;
    g.strokeRect(5, 5, S - 10, S - 10);
    g.strokeStyle = rgba(10, 10, 8, 0.7);
    g.lineWidth = 2;
    g.strokeRect(10, 10, S - 20, S - 20);
    // perimeter bolts
    g.fillStyle = '#171a15';
    for (let i = 0; i < 12; i++) {
      const t = i / 12;
      const px = t < 0.25 ? 10 + t * 4 * (S - 20) : t < 0.5 ? S - 10 : t < 0.75 ? S - 10 - (t - 0.5) * 4 * (S - 20) : 10;
      const py = t < 0.25 ? 10 : t < 0.5 ? 10 + (t - 0.25) * 4 * (S - 20) : t < 0.75 ? S - 10 : S - 10 - (t - 0.75) * 4 * (S - 20);
      g.beginPath(); g.arc(px, py, 3, 0, 7); g.fill();
    }
    // two dark cell throats (behind pop-off covers)
    for (const cx of [S * 0.245, S * 0.755]) {
      const rg = g.createRadialGradient(cx, S / 2, 4, cx, S / 2, S * 0.205);
      rg.addColorStop(0, '#050604');
      rg.addColorStop(0.75, '#0b0d09');
      rg.addColorStop(0.92, '#2c2f28');
      rg.addColorStop(1, '#4a4f41');
      g.fillStyle = rg;
      g.beginPath(); g.arc(cx, S / 2, S * 0.205, 0, 7); g.fill();
    }
    for (let i = 0; i < 80; i++) {
      g.fillStyle = rgba(200, 196, 180, vr.range(0.03, 0.09));
      g.fillRect(vr.next() * S, vr.next() * S, vr.range(1, 4), 1.4);
    }
    return bTex(c);
  })();

  // pop-off cell cover (dark umber membrane, X-score, bolt ring, chevrons)
  const coverTex = (() => {
    const S = 128;
    const [c, g] = bCanvas(S, S);
    g.fillStyle = '#5b4132';
    g.fillRect(0, 0, S, S);
    const grad = g.createRadialGradient(52, 50, 6, 64, 64, 66);
    grad.addColorStop(0, rgba(255, 226, 196, 0.18));
    grad.addColorStop(0.75, rgba(30, 18, 12, 0.18));
    grad.addColorStop(1, rgba(12, 8, 6, 0.55));
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    // X-scoring
    g.strokeStyle = rgba(24, 14, 10, 0.85);
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(20, 20); g.lineTo(108, 108); g.stroke();
    g.beginPath(); g.moveTo(108, 20); g.lineTo(20, 108); g.stroke();
    g.strokeStyle = rgba(214, 196, 170, 0.3);
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(17, 23); g.lineTo(105, 111); g.stroke();
    g.beginPath(); g.moveTo(111, 17); g.lineTo(23, 105); g.stroke();
    // bolt ring
    g.fillStyle = '#241a14';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      g.beginPath(); g.arc(64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54, 2.6, 0, 7); g.fill();
    }
    g.strokeStyle = rgba(20, 12, 8, 0.6);
    g.lineWidth = 3;
    g.beginPath(); g.arc(64, 64, 47, 0, 7); g.stroke();
    // safety chevrons
    g.fillStyle = rgba(226, 178, 54, 0.85);
    for (const a0 of [0.35, Math.PI / 2 + 0.35, Math.PI + 0.35, Math.PI * 1.5 + 0.35]) {
      g.save(); g.translate(64 + Math.cos(a0) * 40, 64 + Math.sin(a0) * 40); g.rotate(a0 + Math.PI / 2);
      g.fillRect(-6, -2, 12, 4);
      g.restore();
    }
    for (let i = 0; i < 70; i++) {
      g.fillStyle = rgba(16, 10, 8, vr.range(0.05, 0.25));
      g.fillRect(vr.next() * S, vr.next() * S, vr.range(1, 3), vr.range(1, 2));
    }
    return bTex(c);
  })();

  // transparent scorch ring revealed around fired muzzles
  const scorchRingTex = (() => {
    const S = 128;
    const [c, g] = bCanvas(S, S);
    g.clearRect(0, 0, S, S);
    const grad = g.createRadialGradient(64, 64, 14, 64, 64, 62);
    grad.addColorStop(0, rgba(4, 4, 4, 0));
    grad.addColorStop(0.34, rgba(8, 7, 6, 0.85));
    grad.addColorStop(0.66, rgba(16, 12, 9, 0.5));
    grad.addColorStop(1, rgba(20, 14, 10, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    // radial streaks
    for (let i = 0; i < 26; i++) {
      const a = vr.next() * TAU, r0 = vr.range(26, 40), r1 = r0 + vr.range(14, 26);
      g.strokeStyle = rgba(10, 8, 6, vr.range(0.2, 0.5));
      g.lineWidth = vr.range(2, 5);
      g.beginPath();
      g.moveTo(64 + Math.cos(a) * r0, 64 + Math.sin(a) * r0);
      g.lineTo(64 + Math.cos(a) * r1, 64 + Math.sin(a) * r1);
      g.stroke();
    }
    return bTex(c);
  })();

  // painted truss girder with lightening holes (sentinel rail sides)
  const girderSet = (() => {
    const W = 512, H = 128;
    const [c, g] = bCanvas(W, H);
    const [cb, gb] = bCanvas(W, H);
    g.fillStyle = '#a3a49c';
    g.fillRect(0, 0, W, H);
    gb.fillStyle = '#808080';
    gb.fillRect(0, 0, W, H);
    // flanges
    for (const y of [7, H - 7]) {
      g.fillStyle = '#8d8e86';
      g.fillRect(0, y - 7, W, 14);
      g.strokeStyle = rgba(30, 30, 26, 0.5);
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, y + (y < 20 ? 7 : -7)); g.lineTo(W, y + (y < 20 ? 7 : -7)); g.stroke();
      gb.fillStyle = '#a8a8a8';
      gb.fillRect(0, y - 7, W, 14);
    }
    // lightening holes with inner shading
    for (let x = 52; x < W; x += 104) {
      const r = 34;
      const rg = g.createRadialGradient(x - 6, H / 2 - 8, 4, x, H / 2, r);
      rg.addColorStop(0, '#23241f');
      rg.addColorStop(0.8, '#151612');
      rg.addColorStop(0.92, '#5c5d55');
      rg.addColorStop(1, '#c4c5bb');
      g.fillStyle = rg;
      g.beginPath(); g.arc(x, H / 2, r, 0, 7); g.fill();
      gb.fillStyle = '#232323';
      gb.beginPath(); gb.arc(x, H / 2, r, 0, 7); gb.fill();
      // bolt ring between holes
      g.fillStyle = rgba(30, 30, 26, 0.7);
      for (const by of [26, H - 26]) {
        g.beginPath(); g.arc(x + 52, by, 2.4, 0, 7); g.fill();
        gb.fillStyle = '#d0d0d0';
        gb.beginPath(); gb.arc(x + 52, by, 2.4, 0, 7); gb.fill();
        gb.fillStyle = '#232323';
      }
      // grime under hole
      const lg = g.createLinearGradient(0, H / 2 + r - 6, 0, H - 12);
      lg.addColorStop(0, rgba(24, 22, 18, 0.3));
      lg.addColorStop(1, rgba(24, 22, 18, 0));
      g.fillStyle = lg;
      g.fillRect(x - 12, H / 2 + r - 6, 24, H / 2 - r);
    }
    for (let i = 0; i < 90; i++) {
      g.fillStyle = vr.next() < 0.5 ? rgba(230, 228, 218, vr.range(0.05, 0.12)) : rgba(24, 22, 18, vr.range(0.06, 0.16));
      g.fillRect(vr.next() * W, vr.next() * H, vr.range(2, 9), vr.range(1, 2.4));
    }
    return { map: bTex(c), bump: bTex(cb, { srgb: false }) };
  })();

  // sentinel round skin (white composite, frames, roll band, tail scorch)
  const roundTex = (() => {
    const W = 512, H = 256;
    const [c, g] = bCanvas(W, H);
    g.fillStyle = '#ddd9cd';
    g.fillRect(0, 0, W, H);
    // longeron lines (u = around)
    g.strokeStyle = rgba(90, 86, 76, 0.25);
    g.lineWidth = 1.4;
    for (const x of [0, 128, 256, 384]) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    }
    // frame rings along the length (v = along axis; v=1 at nose)
    for (const v of [0.09, 0.2, 0.34, 0.52, 0.66, 0.8, 0.9]) {
      const y = (1 - v) * H;
      g.strokeStyle = rgba(70, 66, 58, 0.5);
      g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      g.strokeStyle = rgba(255, 255, 250, 0.35);
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, y + 2); g.lineTo(W, y + 2); g.stroke();
    }
    // red roll-reference band near the nose + thin stripes
    g.fillStyle = '#a83a2c';
    g.fillRect(0, (1 - 0.84) * H - 7, W, 14);
    g.fillStyle = '#2e3236';
    g.fillRect(0, (1 - 0.62) * H - 3, W, 6);
    // rivet dots along frames
    g.fillStyle = rgba(70, 66, 58, 0.5);
    for (const v of [0.2, 0.52, 0.8]) {
      const y = (1 - v) * H;
      for (let x = 6; x < W; x += 18) { g.beginPath(); g.arc(x, y + 6, 1.4, 0, 7); g.fill(); }
    }
    // axial stencils (rotated 90° so they read along the airframe)
    g.save();
    g.rotate(-Math.PI / 2);
    g.textAlign = 'center';
    for (const u of [96, 352]) {
      g.fillStyle = '#41403a';
      g.font = 'bold 26px Arial';
      g.fillText('SENTINEL LR-1', -(1 - 0.44) * H, u);
      g.font = 'bold 15px Arial';
      g.fillText('ROUND T-3 · INERT TM', -(1 - 0.44) * H, u + 20);
    }
    g.restore();
    g.strokeStyle = '#41403a';
    g.lineWidth = 2;
    g.strokeRect(288, (1 - 0.3) * H - 12, 90, 18);
    // tail heat soak
    const tg = g.createLinearGradient(0, H, 0, H - 60);
    tg.addColorStop(0, rgba(38, 30, 24, 0.8));
    tg.addColorStop(1, rgba(38, 30, 24, 0));
    g.fillStyle = tg;
    g.fillRect(0, H - 60, W, 60);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = rgba(120, 112, 96, vr.range(0.04, 0.12));
      g.fillRect(vr.next() * W, vr.next() * H, vr.range(2, 8), vr.range(1, 2));
    }
    return bTex(c);
  })();

  // sentinel spare-round shipping canister. Cylinder mapping: u (canvas x)
  // wraps around, v (canvas y) runs along the axis — rings are horizontal
  // bands, stencil text is drawn rotated so it reads along the tube.
  const whiteCanTex = (() => {
    const W = 256, H = 512;
    const [c, g] = bCanvas(W, H);
    g.fillStyle = '#c6c4ba';
    g.fillRect(0, 0, W, H);
    // rib shading rings along the length
    for (let y = 40; y < H; y += 74) {
      g.fillStyle = rgba(60, 58, 50, 0.30);
      g.fillRect(0, y - 3, W, 6);
      g.fillStyle = rgba(255, 255, 250, 0.35);
      g.fillRect(0, y + 3, W, 2);
    }
    // hazard ring near one end + thin blue reference ring at the other
    g.fillStyle = 'rgba(168,58,44,0.85)';
    g.fillRect(0, 14, W, 12);
    g.fillStyle = 'rgba(60,80,110,0.6)';
    g.fillRect(0, H - 22, W, 6);
    // axial stencils (rotated 90° so they run along the canister)
    g.save();
    g.rotate(-Math.PI / 2);
    g.textAlign = 'center';
    for (const u of [64, 192]) {
      g.fillStyle = '#3c3b35';
      g.font = 'bold 26px Arial';
      g.fillText('SNTL LR-1 · TEST ARTICLE', -H / 2, u - 6);
      g.font = 'bold 15px Arial';
      g.fillText('GROSS 4 900 KG · LIFT AT RINGS ONLY', -H / 2, u + 16);
    }
    g.restore();
    for (let i = 0; i < 150; i++) {
      g.fillStyle = vr.next() < 0.5 ? rgba(255, 255, 250, vr.range(0.05, 0.1)) : rgba(50, 46, 40, vr.range(0.05, 0.14));
      g.fillRect(vr.next() * W, vr.next() * H, vr.range(2, 8), vr.range(1, 3));
    }
    return bTex(c);
  })();

  // truck grille louvers
  const grilleTex = (() => {
    const [c, g] = bCanvas(128, 64);
    g.fillStyle = '#0f1114';
    g.fillRect(0, 0, 128, 64);
    for (let y = 5; y < 60; y += 8) {
      g.fillStyle = '#3d4248';
      g.fillRect(4, y, 120, 3);
      g.fillStyle = '#181b1f';
      g.fillRect(4, y + 3, 120, 2);
    }
    g.strokeStyle = '#2c3036';
    g.lineWidth = 5;
    g.strokeRect(2, 2, 124, 60);
    return bTex(c);
  })();

  // red/white obstruction paint bands (tower legs)
  const bandTex = (() => {
    const [c, g] = bCanvas(32, 256);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#b7b8b2' : '#9c3227';
      g.fillRect(0, i * 32, 32, 32);
    }
    for (let i = 0; i < 120; i++) {
      g.fillStyle = rgba(42, 36, 30, vr.range(0.04, 0.2));
      g.fillRect(vr.next() * 32, vr.next() * 256, vr.range(1, 2.5), vr.range(4, 24));
    }
    return bTex(c);
  })();

  // worn/darkened metal edge banding
  const wornTex = (() => {
    const [c, g] = bCanvas(256, 32);
    g.fillStyle = '#303338';
    g.fillRect(0, 0, 256, 32);
    for (let i = 0; i < 170; i++) {
      g.fillStyle = vr.next() < 0.55
        ? rgba(126, 130, 134, vr.range(0.08, 0.45))
        : rgba(12, 13, 14, vr.range(0.1, 0.4));
      g.fillRect(vr.next() * 256, vr.next() * 32, vr.range(3, 26), vr.range(1, 3));
    }
    return bTex(c);
  })();

  // scorched blast-deflector steel
  const scorchSteelTex = (() => {
    const [c, g] = bCanvas(256, 256);
    g.fillStyle = '#6a6d72';
    g.fillRect(0, 0, 256, 256);
    const grad = g.createRadialGradient(128, 120, 8, 128, 120, 155);
    grad.addColorStop(0, 'rgba(14,11,9,0.95)');
    grad.addColorStop(0.42, 'rgba(36,27,20,0.82)');
    grad.addColorStop(0.72, 'rgba(74,54,36,0.45)');
    grad.addColorStop(1, 'rgba(92,82,72,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 80; i++) {
      const x = vr.next() * 256;
      g.fillStyle = rgba(16, 13, 11, vr.range(0.1, 0.5));
      g.fillRect(x, vr.range(30, 130), vr.range(2, 6), vr.range(30, 120));
    }
    g.strokeStyle = 'rgba(70,92,150,0.16)';
    g.lineWidth = 16;
    g.beginPath(); g.arc(128, 120, 118, 0, 7); g.stroke();
    return bTex(c);
  })();

  // DANGER placard decal
  const dangerTex = (() => {
    const [c, g] = bCanvas(256, 96);
    g.fillStyle = '#d9d4c6';
    g.fillRect(0, 0, 256, 96);
    g.fillStyle = '#8e1d12';
    g.fillRect(6, 6, 244, 42);
    g.fillStyle = '#e6e1d3';
    g.font = 'bold 31px Arial';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('DANGER', 128, 28);
    g.fillStyle = '#24262a';
    g.font = 'bold 16px Arial';
    g.fillText('HOT EXHAUST — STAND CLEAR', 128, 68);
    g.strokeStyle = '#24262a';
    g.lineWidth = 4;
    g.strokeRect(2, 2, 252, 92);
    for (let i = 0; i < 80; i++) {
      g.fillStyle = 'rgba(120,110,90,0.25)';
      g.fillRect(vr.next() * 256, vr.next() * 96, vr.range(1, 4), vr.range(1, 2));
    }
    return bTex(c);
  })();

  // cross-scored frangible membrane (halberd tube end caps)
  const membraneTex = (() => {
    const [c, g] = bCanvas(128, 128);
    g.fillStyle = '#3a4034';
    g.fillRect(0, 0, 128, 128);
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.12)');
    grad.addColorStop(0.72, 'rgba(0,0,0,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0.42)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(18,20,16,0.9)';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(16, 16); g.lineTo(112, 112); g.stroke();
    g.beginPath(); g.moveTo(112, 16); g.lineTo(16, 112); g.stroke();
    g.strokeStyle = 'rgba(150,154,140,0.55)';
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(13, 19); g.lineTo(109, 115); g.stroke();
    g.beginPath(); g.moveTo(115, 13); g.lineTo(19, 109); g.stroke();
    g.beginPath(); g.arc(64, 64, 38, 0, 7); g.stroke();
    g.fillStyle = '#1d201b';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      g.beginPath(); g.arc(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56, 2.6, 0, 7); g.fill();
    }
    for (let i = 0; i < 90; i++) {
      g.fillStyle = rgba(16, 18, 14, vr.range(0.05, 0.28));
      g.fillRect(vr.next() * 128, vr.next() * 128, vr.range(1, 3), vr.range(1, 2));
    }
    return bTex(c);
  })();

  // ============================================ shared materials
  // envMapIntensity > 1 keeps shadow sides readable under the desert IBL.
  const EI = 1.5;
  const mkStd = (opts) => {
    const m = new THREE.MeshStandardMaterial(opts);
    m.envMapIntensity = opts.envMapIntensity ?? EI;
    return m;
  };
  const oliveMap = oliveSet.map.clone(); oliveMap.needsUpdate = true;
  const matTan = mkStd({ map: tanSet.map, bumpMap: tanSet.bump, bumpScale: 0.7, roughness: 0.74, metalness: 0.16 });
  const matOlive = mkStd({ map: oliveMap, bumpMap: oliveSet.bump, bumpScale: 0.7, roughness: 0.7, metalness: 0.18, envMapIntensity: 1.75 });
  const matChassis = mkStd({ color: 0x474b52, roughness: 0.58, metalness: 0.55 });
  const matSteel = mkStd({ color: 0x8f959c, roughness: 0.4, metalness: 0.85, envMapIntensity: 1.6 });
  // chrome shares the steel bucket — the 0.1 roughness difference never read
  // on the thin piston rods and the alias saves a mesh in every group
  const matChrome = matSteel;
  const matTread = mkStd({ map: treadSet.map, bumpMap: treadSet.bump, bumpScale: 0.6, roughness: 0.62, metalness: 0.5 });
  const matTire = mkStd({ map: tireTex, roughness: 0.92, metalness: 0.08, envMapIntensity: 1.15 });
  const matCanFace = mkStd({ map: canFaceTex, roughness: 0.8, metalness: 0.12 });
  const matCover = mkStd({ map: coverTex, roughness: 0.82, metalness: 0.05 });
  const matScorchRing = mkStd({
    map: scorchRingTex, transparent: true, depthWrite: false, roughness: 1, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
  const matGirder = mkStd({ map: girderSet.map, bumpMap: girderSet.bump, bumpScale: 0.8, roughness: 0.6, metalness: 0.35 });
  // same girder look minus the shadow pass — for bulkheads/end plates whose
  // silhouette is buried inside the rack they close off (rail girders keep
  // casting: their long shadow is a major form on the pad)
  const matGirderLite = mkStd({ map: girderSet.map, bumpMap: girderSet.bump, bumpScale: 0.8, roughness: 0.6, metalness: 0.35 });
  const matRound = mkStd({ map: roundTex, roughness: 0.4, metalness: 0.14, envMapIntensity: 1.7 });
  const matWhiteCan = mkStd({ map: whiteCanTex, roughness: 0.6, metalness: 0.2 });
  const matTube = mkStd({ map: tubeTex, roughness: 0.66, metalness: 0.22, envMapIntensity: 1.6 });
  // metals tint reflections by albedo — glass needs a light blue-gray base so
  // the sky reflection reads bright instead of void-black
  const matGlass = mkStd({ color: 0x4a5661, roughness: 0.06, metalness: 0.9, envMapIntensity: 2.4 });
  const grilleMat = mkStd({ map: grilleTex, roughness: 0.7, metalness: 0.3 });
  const bandMat = mkStd({ map: bandTex, roughness: 0.72, metalness: 0.15 });
  const wornMat = mkStd({ map: wornTex, roughness: 0.6, metalness: 0.55 });
  // exhausts/venturis/mouth collars share the worn-metal bucket: the scuffed
  // dark map reads close enough to heat-stained steel and saves a mesh per rig
  const matBurnt = wornMat;
  const scorchSteelMat = mkStd({ map: scorchSteelTex, roughness: 0.66, metalness: 0.35 });
  const dangerMat = mkStd({ map: dangerTex, roughness: 0.85 });
  const membraneMat = mkStd({ map: membraneTex, roughness: 0.9 });
  const redPaint = mkStd({ color: 0x93251b, roughness: 0.6, metalness: 0.2 });
  // headlight lenses switch on with the floodlights (emissive driven from update)
  const lensMat = mkStd({ color: 0xd9dee6, roughness: 0.16, metalness: 0.85, envMapIntensity: 1.9, emissive: 0xffedc2, emissiveIntensity: 0 });
  // clearance/marker lamps: ONE material for all three rigs (they follow the
  // same floodlight switch), so world-merged statics collapse to one mesh
  const markerMat = new THREE.MeshStandardMaterial({ color: 0x40230a, emissive: 0xff7722, emissiveIntensity: 0.4, roughness: 0.5 });
  const scorchDecalMat = new THREE.MeshStandardMaterial({
    map: textures.scorch(), transparent: true, depthWrite: false, roughness: 1,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
  const shadowBlobMat = new THREE.MeshBasicMaterial({
    map: textures.blobShadow(), color: 0x000000, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3, opacity: 0.6,
  });
  // physical texel density (m per texture tile) — applied per-face in bucket.add
  matTan.userData.texScale = 3.2;
  matOlive.userData.texScale = 3.6;
  matTread.userData.texScale = 1.4;

  // fake ground-bounce: the desert IBL has a dark floor, so downward/shadow
  // faces go dead black without a tiny warm emissive lift. Dimmed at night
  // from the module update so vehicles don't read self-lit in the dark.
  const bounceMats = [];
  const bounce = (mat, k, hex = 0x8a7a5e) => {
    mat.emissive.setHex(hex);
    mat.emissiveIntensity = k;
    bounceMats.push([mat, k]);
  };
  bounce(matOlive, 0.07);
  bounce(matTan, 0.06);
  bounce(matChassis, 0.07);
  bounce(matTread, 0.09);
  bounce(matGirder, 0.08);
  bounce(matGirderLite, 0.08);
  bounce(wornMat, 0.07);
  bounce(matCanFace, 0.06);
  bounce(matTire, 0.05);
  bounce(scorchSteelMat, 0.05);
  bounce(matWhiteCan, 0.05);
  bounce(matTube, 0.06);
  bounce(membraneMat, 0.06);
  bounce(matCover, 0.06);
  bounce(matSteel, 0.04);
  let lastBounceDim = -1;

  // shadow-pass budget: only major-form buckets cast into the sun shadow map.
  // Trim/greeble materials skip it — their silhouette lives inside the hull's
  // cast shadow anyway, and every casting mesh doubles its draw-call cost.
  for (const m of [matSteel, matTread, matCanFace, membraneMat, matGlass,
    grilleMat, lensMat, dangerMat, redPaint, M.rubber, M.cable,
    matTire, wornMat, M.hazard, markerMat, matGirderLite]) {
    m.userData.noShadow = true;
  }

  // ============================================ merge helpers
  const _pe = new THREE.Euler();
  const _pq2 = new THREE.Quaternion();
  const _pv = new THREE.Vector3();
  const _psc = new THREE.Vector3();
  const _pm = new THREE.Matrix4();

  /** scale box/plane UVs so the texture repeats at a fixed physical size
   *  (ts meters per tile) with a per-part random tile offset for variety */
  function autoFaceUV(geo, ts) {
    const p = geo.parameters;
    if (!p) return;
    const uv = geo.attributes.uv;
    const du = vr.next() * 4, dv = vr.next() * 4;
    if (p.depth !== undefined) {
      const dims = [
        [p.depth, p.height], [p.depth, p.height],
        [p.width, p.depth], [p.width, p.depth],
        [p.width, p.height], [p.width, p.height],
      ];
      for (let f = 0; f < 6; f++) {
        const [fw, fh] = dims[f];
        for (let k = f * 4; k < f * 4 + 4; k++) {
          uv.setXY(k, uv.getX(k) * (fw / ts) + du, uv.getY(k) * (fh / ts) + dv);
        }
      }
    } else if (p.width !== undefined && p.height !== undefined && p.widthSegments !== undefined) {
      for (let k = 0; k < uv.count; k++) {
        uv.setXY(k, uv.getX(k) * (p.width / ts) + du, uv.getY(k) * (p.height / ts) + dv);
      }
    }
  }

  /** collect geometries per material under `parent`, then flush to one mesh per
   *  material. setBase(m) premultiplies a fixed matrix onto every add — used to
   *  bake rig-pad transforms so statics from several rigs merge in world space. */
  function bucketFor(parent, { receive = false } = {}) {
    const byMat = new Map();
    let base = null;
    return {
      setBase(m) { base = m; },
      add(mat, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
        if (mat.userData?.texScale) autoFaceUV(geo, mat.userData.texScale);
        _pe.set(rx, ry, rz);
        _pq2.setFromEuler(_pe);
        _pm.compose(_pv.set(x, y, z), _pq2, _psc.set(1, 1, 1));
        if (base) _pm.premultiply(base);
        geo.applyMatrix4(_pm);
        let arr = byMat.get(mat);
        if (!arr) { arr = []; byMat.set(mat, arr); }
        arr.push(geo);
        return geo;
      },
      flush({ shadow = true } = {}) {
        for (const [mat, geos] of byMat) {
          const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
          for (const g2 of geos) g2.dispose();
          mesh.castShadow = shadow && !mat.userData.noShadow;
          mesh.receiveShadow = receive;
          parent.add(mesh);
        }
        byMat.clear();
      },
    };
  }

  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const C = (rt, rb, h, seg = 10, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  const CZ = (rt, rb, h, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg).rotateX(Math.PI / 2);
  const TO = (r, t, arc = TAU, seg = 12) => new THREE.TorusGeometry(r, t, 6, seg, arc);
  const P = (w, h) => new THREE.PlaneGeometry(w, h);
  const SP = (r, ws = 10, hs = 7) => new THREE.SphereGeometry(r, ws, hs);

  function uvShift(geo, du, dv) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + du, uv.getY(i) + dv);
    return geo;
  }
  function uvScale(geo, su, sv) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return geo;
  }

  // ============================================ instanced repeated parts
  const _ie = new THREE.Euler();
  const _iq = new THREE.Quaternion();
  const _im = new THREE.Matrix4();
  /** instanced set with per-slot show/hide via matrix scale (covers, scorch) */
  function instancedSet(parent, geo, mat, spots, { shadow = false } = {}) {
    const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
    mesh.castShadow = shadow;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false; // instance matrices move slots away from origin
    const setAt = (i, s) => {
      const p = spots[i];
      _ie.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0);
      _iq.setFromEuler(_ie);
      _im.compose(_pv.set(p.x, p.y, p.z), _iq, _psc.setScalar(s));
      mesh.setMatrixAt(i, _im);
      mesh.instanceMatrix.needsUpdate = true;
    };
    for (let i = 0; i < spots.length; i++) setAt(i, spots[i].on === false ? 0.0001 : (spots[i].s ?? 1));
    parent.add(mesh);
    return {
      mesh,
      show: (i) => setAt(i, spots[i].s ?? 1),
      hide: (i) => setAt(i, 0.0001),
      reset: () => { for (let i = 0; i < spots.length; i++) setAt(i, spots[i].on === false ? 0.0001 : (spots[i].s ?? 1)); },
    };
  }

  // ============================================ shared small builders
  /** status stack: short mast + cage + lens; lens material is state-driven */
  function statusFixture(bucket, parent, x, y, z) {
    bucket.add(matChassis, C(0.035, 0.045, 1.0, 8), x, y - 0.62, z);
    bucket.add(matChassis, C(0.075, 0.09, 0.07, 10), x, y - 0.14, z);
    bucket.add(matChassis, C(0.02, 0.02, 0.3, 6), x, y + 0.05, z);
    bucket.add(matChassis, C(0.06, 0.075, 0.05, 10), x, y + 0.22, z);
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.07, 0.17, 12),
      new THREE.MeshStandardMaterial({ color: 0x123312, emissive: 0x22ff44, emissiveIntensity: 2.2, roughness: 0.35 })
    );
    lens.position.set(x, y + 0.05, z);
    parent.add(lens);
    return lens;
  }

  function hydraulics(parent, from, to, r1 = 0.07, r2 = 0.05) {
    // painted cylinder barrel + chrome rod from->to; returns updater
    const grpTmp = new THREE.Group();
    parent.add(grpTmp);
    const cylA = new THREE.Mesh(new THREE.CylinderGeometry(r1, r1 * 1.06, 1, 10), matOlive);
    const cylB = new THREE.Mesh(new THREE.CylinderGeometry(r2, r2, 1, 8), matChrome);
    grpTmp.add(cylA); grpTmp.add(cylB);
    // rods are thin — skipping the shadow pass saves 4 draws per rig
    cylA.castShadow = cylB.castShadow = false;
    const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Vector3(), _d = new THREE.Vector3();
    const _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _dn = new THREE.Vector3();
    function update() {
      _a.copy(from.pos); from.node?.localToWorld?.(_a);
      _b.copy(to.pos); to.node?.localToWorld?.(_b);
      parent.worldToLocal(_a); parent.worldToLocal(_b);
      _d.subVectors(_b, _a);
      const len = _d.length();
      _q.setFromUnitVectors(_up, _dn.copy(_d).normalize());
      _m.addVectors(_a, _b).multiplyScalar(0.5);
      cylA.position.copy(_a).addScaledVector(_d, 0.28);
      cylA.quaternion.copy(_q);
      cylA.scale.set(1, len * 0.5, 1);
      cylB.position.copy(_m).addScaledVector(_d, 0.12);
      cylB.quaternion.copy(_q);
      cylB.scale.set(1, len * 0.62, 1);
    }
    update();
    return update;
  }

  /** mirror-symmetric erection-ram PAIR merged into TWO meshes (bodies + rods)
   *  instead of four. Works when anchors sit at (±x, y, z) and targets at
   *  (±x, ...) in the same parent: both rams then rotate by the same angle
   *  about the X line through the anchors, so one rigid pair mesh suffices.
   *  from.pos = +x-side anchor in parent-local coords; to = {pos(+x), node}. */
  function hydraulicsPair(parent, from, to, r1 = 0.07, r2 = 0.05) {
    const grp = new THREE.Group();
    grp.position.set(0, from.pos.y, from.pos.z);
    parent.add(grp);
    const mk = (r, taper, mat) => {
      const g1 = new THREE.CylinderGeometry(r, r * taper, 1, 10).translate(from.pos.x, 0.5, 0);
      const g2 = new THREE.CylinderGeometry(r, r * taper, 1, 10).translate(-from.pos.x, 0.5, 0);
      const m = new THREE.Mesh(mergeGeometries([g1, g2], false), mat);
      m.castShadow = false;
      grp.add(m);
      return m;
    };
    const bodies = mk(r1, 1.06, matOlive);
    const rods = mk(r2, 1, matChrome);
    const _t = new THREE.Vector3();
    function update() {
      _t.copy(to.pos);
      to.node.localToWorld(_t);
      parent.worldToLocal(_t);
      const dy = _t.y - from.pos.y, dz = _t.z - from.pos.z;
      const len = Math.hypot(dy, dz);
      grp.rotation.x = Math.atan2(dz, dy);
      bodies.position.y = len * 0.03; bodies.scale.y = len * 0.5;
      rods.position.y = len * 0.31; rods.scale.y = len * 0.62;
    }
    update();
    return update;
  }

  // tire atlas mapping: tread samples the left half, sidewall/rim the right half
  const treadGeo = (r, w) => uvScale(new THREE.CylinderGeometry(r, r, w, 18, 1, true), 0.5, 1);
  const sideGeo = (r) => uvShift(uvScale(new THREE.CircleGeometry(r, 18), 0.5, 1), 0.5, 0);

  /** wheel: treaded tire (open cylinder) + sidewall discs + hub — one material */
  function wheelsFor(bucket, positions, radius = 0.55, width = 0.42) {
    for (const [x, z] of positions) {
      bucket.add(matTire, treadGeo(radius, width), x, radius, z, 0, 0, Math.PI / 2);
      for (const s of [-1, 1]) {
        bucket.add(matTire, sideGeo(radius).rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2), x + s * width / 2, radius, z);
      }
      bucket.add(matChassis, C(radius * 0.16, radius * 0.16, width + 0.08, 8), x, radius, z, 0, 0, Math.PI / 2);
    }
  }

  /** several labels atlased into ONE canvas + ONE merged mesh (1 draw call).
   *  items: [{ text|img, w, h, x, y, z, rx, ry, px, base }] — px = cell height
   *  in texels (64 default, use 128 for square decals like the roundel);
   *  base = optional Matrix4 baked onto the quad (world-merged strips). */
  function labelStrip(parent, items, opts = {}) {
    const rng = new Rand(4177);
    const CW = 256;
    // repeated image items share ONE atlas cell (range boards stamped on every rig)
    const imgCell = new Map();
    const cells = [], hs = [];
    let yCur = 0;
    items.forEach((it) => {
      if (it.img && imgCell.has(it.img)) {
        const c0 = imgCell.get(it.img);
        cells.push(c0.y); hs.push(c0.h);
        return;
      }
      const ch = it.px ?? 64;
      cells.push(yCur); hs.push(ch);
      if (it.img) imgCell.set(it.img, { y: yCur, h: ch });
      yCur += ch;
    });
    const H = yCur;
    const [c, q] = bCanvas(CW, H);
    q.clearRect(0, 0, CW, H);
    items.forEach((it, i) => {
      const ch = hs[i], cy = cells[i];
      if (it.img && imgCell.get(it.img).drawn) return; // shared cell already drawn
      const bg = it.bg ?? opts.bg;
      if (bg) { q.fillStyle = bg; q.fillRect(0, cy, CW, ch); }
      if (it.img) {
        q.drawImage(it.img, (CW - ch) / 2, cy, ch, ch);
        imgCell.get(it.img).drawn = true;
      } else {
        q.font = it.font ?? opts.font ?? 'bold 30px Arial';
        q.textAlign = 'center'; q.textBaseline = 'middle';
        q.fillStyle = it.fg ?? opts.fg ?? '#dcd8ca';
        q.fillText(it.text, CW / 2, cy + ch / 2 + 2);
      }
      for (let k = 0; k < ch * 1.4; k++) q.clearRect(rng.next() * CW, cy + rng.next() * ch, 2, 1.5);
    });
    const tex = bTex(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const geos = items.map((it, i) => {
      const gp = new THREE.PlaneGeometry(it.w, it.h);
      const ch = hs[i], cy = cells[i];
      const u0 = it.img ? (CW - ch) / 2 / CW : 0;
      const u1 = it.img ? (CW + ch) / 2 / CW : 1;
      const uv = gp.attributes.uv;
      for (let k = 0; k < uv.count; k++) {
        uv.setXY(k, u0 + uv.getX(k) * (u1 - u0), (H - cy - ch + uv.getY(k) * ch) / H);
      }
      if (it.rx) gp.rotateX(it.rx);
      if (it.ry) gp.rotateY(it.ry);
      gp.translate(it.x, it.y, it.z);
      if (it.base) gp.applyMatrix4(it.base);
      return gp;
    });
    const mesh = new THREE.Mesh(
      mergeGeometries(geos, false),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9 })
    );
    parent.add(mesh);
    return mesh;
  }

  /** catmull cable dropped into a bucket (merges into one mesh per rig).
   *  Pass mat=matChassis inside small dynamic groups so the cable rides the
   *  group's existing bucket instead of adding an M.cable mesh of its own. */
  function cableRun(bucket, points, r = 0.03, mat = M.cable) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    bucket.add(mat, new THREE.TubeGeometry(curve, 16, r, 6));
  }
  /** drooping cable between two anchors */
  function droop(bucket, a, b, sag = 0.5, r = 0.035, mat = M.cable) {
    cableRun(bucket, [a, [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - sag, (a[2] + b[2]) / 2], b], r, mat);
  }

  /** soft contact-shadow blob under a vehicle (cheap grounding, merged in a bucket) */
  function contactShadow(bucket, w, d, x, z, ry = 0) {
    bucket.add(shadowBlobMat, P(w, d).rotateX(-Math.PI / 2), x, 0.045, z, 0, ry, 0);
  }

  /** pad-local XZ -> world XZ (for colliders) */
  function padWorld(pad, x, z) {
    const c = Math.cos(pad.heading), s = Math.sin(pad.heading);
    return { x: pad.position.x + x * c + z * s, z: pad.position.z - x * s + z * c };
  }

  // ============================================ cross-rig world-space statics
  // No rig yaws its chassis (all three aim with a turntable / pallet / pivot),
  // so every static part of ALL THREE rigs is baked into world space and
  // merged into ONE mesh per material — one draw per material for the whole
  // battery group. Only the aiming assemblies stay in their own scene nodes.
  const staticRoot = new THREE.Group();
  staticRoot.name = 'batteriesStatic';
  scene.add(staticRoot);
  const WS = bucketFor(staticRoot, { receive: true }); // shadow-casting statics
  const WD = bucketFor(staticRoot);                    // decals/glass/lamps, shadowless
  const worldLabels = [];                              // stencil quads -> one atlas mesh
  const roundelImg = textures.roundel().image;         // unit insignia, atlased into strips
  // high-visibility range identification board (international-orange diagonals):
  // stamped on every rig via ONE shared label-atlas cell — pops against the tan
  // desert at the 40-80 m readability band and sells the "test range" fiction
  const rangeBoardImg = (() => {
    const [c, q] = bCanvas(96, 96);
    q.fillStyle = '#ded8c4'; q.fillRect(0, 0, 96, 96);
    q.fillStyle = '#cf5514';
    q.save(); q.translate(48, 48); q.rotate(-Math.PI / 4);
    for (let i = -2; i <= 2; i += 2) q.fillRect(i * 24 - 12, -80, 24, 160);
    q.restore();
    q.strokeStyle = '#23241f'; q.lineWidth = 5; q.strokeRect(2.5, 2.5, 91, 91);
    q.fillStyle = '#3a3b35';
    for (const [bx, by] of [[10, 10], [86, 10], [10, 86], [86, 86]]) {
      q.beginPath(); q.arc(bx, by, 3.6, 0, TAU); q.fill();
    }
    return c;
  })();

  // =================================================== RAMPART (Patriot-like)
  function buildRampart(pad) {
    const g = new THREE.Group();
    g.position.copy(pad.position);
    g.rotation.y = pad.heading;
    scene.add(g);
    g.updateMatrix();
    const gm = g.matrix.clone();
    // statics bake the pad transform and merge into the cross-rig world buckets
    const S = WS, D = WD;
    S.setBase(gm); D.setBase(gm);

    // ---------------- trailer frame: C-rails, cross members, tread deck ----
    for (const x of [-0.88, 0.88]) S.add(matChassis, B(0.16, 0.34, 8.9), x, 0.92, 0);
    for (const z of [-4.2, -2.8, -1.4, 0, 1.4, 2.8, 4.2]) S.add(matChassis, B(1.9, 0.18, 0.14), 0, 0.9, z);
    S.add(matTread, uvShift(B(2.6, 0.09, 8.8), 0.13, 0.4), 0, 1.14, 0);
    for (const x of [-1.31, 1.31]) S.add(matChassis, B(0.07, 0.24, 8.8), x, 1.05, 0);
    // lifting lugs at deck corners
    for (const [x, z] of [[-1.2, 4.3], [1.2, 4.3], [-1.2, -4.3], [1.2, -4.3]]) {
      S.add(matChassis, B(0.06, 0.16, 0.12), x, 1.26, z);
      S.add(matChassis, TO(0.055, 0.018, TAU, 10), x, 1.36, z, 0, Math.PI / 2, 0);
    }

    // ---- axles, wheels (mid-rear), fenders, mud flaps ----
    const wheelZ = [-0.9, -2.1];
    for (const z of wheelZ) S.add(matChassis, C(0.075, 0.075, 2.4, 8), 0, 0.55, z, 0, 0, Math.PI / 2);
    wheelsFor(S, [[-1.38, -0.9], [1.38, -0.9], [-1.38, -2.1], [1.38, -2.1]], 0.55, 0.45);
    for (const sx of [-1, 1]) {
      S.add(matTan, uvShift(B(0.52, 0.06, 2.9), 0.4 * sx, 0.7), sx * 1.38, 1.26, -1.5);
      S.add(matTan, B(0.52, 0.06, 0.5), sx * 1.38, 1.12, 0.15, -0.75, 0, 0);
      S.add(matTan, B(0.52, 0.06, 0.5), sx * 1.38, 1.12, -3.15, 0.75, 0, 0);
      S.add(M.rubber, B(0.46, 0.4, 0.03), sx * 1.38, 0.58, -3.38);
    }
    // wheel chocks
    for (const [x, z] of [[-1.38, -0.42], [1.38, -2.58]]) {
      S.add(matBurnt, B(0.4, 0.2, 0.24), x, 0.1, z, 0.5, 0, 0);
    }

    // ---- outrigger jacks with X-pattern base plates ----
    for (const [x, z] of [[-1.5, 2.9], [1.5, 2.9], [-1.5, -3.7], [1.5, -3.7]]) {
      const sx = Math.sign(x);
      S.add(matChassis, B(0.26, 0.22, 0.62), sx * 1.06, 0.9, z);           // sleeve on frame
      S.add(matSteel, B(0.15, 0.15, 0.95), sx * 1.55, 0.88, z);            // extended beam
      S.add(matChassis, C(0.1, 0.1, 0.5, 10), sx * 1.95, 0.62, z);         // jack body
      S.add(matChrome, C(0.045, 0.045, 0.55, 8), sx * 1.95, 0.28, z);      // screw
      S.add(matChassis, B(0.78, 0.06, 0.16), sx * 1.95, 0.07, z, 0, Math.PI / 4, 0);
      S.add(matChassis, B(0.78, 0.06, 0.16), sx * 1.95, 0.07, z, 0, -Math.PI / 4, 0);
      S.add(matChassis, B(0.4, 0.05, 0.4), sx * 1.95, 0.03, z);            // pad under the X
      S.add(matSteel, C(0.02, 0.02, 0.34, 6), sx * 1.95, 0.9, z + 0.2, Math.PI / 2, 0, 0); // crank
      S.add(matSteel, SP(0.035, 8, 6), sx * 1.95, 0.9, z + 0.38);
    }

    // ---- A-frame drawbar + ring hitched to the tractor pintle ----
    for (const sx of [-1, 1]) {
      S.add(matChassis, B(0.13, 0.13, 2.35), sx * 0.36, 0.79, 5.35, 0.06, -sx * 0.335, 0);
    }
    S.add(matSteel, TO(0.13, 0.045, TAU, 12), 0, 0.7, 6.42, Math.PI / 2, 0, 0);
    // stowed parking jack (folded horizontal under the drawbar)
    S.add(matChassis, C(0.05, 0.05, 0.5, 8), 0.2, 0.62, 5.9, 0, 0, Math.PI / 2);

    // ---- front-deck equipment: stowage, cable reel, spare tire, fire ext ----
    S.add(matOlive, uvShift(B(0.85, 0.62, 1.45), 0.31, 0.5), -0.82, 1.5, 3.5);
    S.add(matOlive, uvShift(B(0.85, 0.55, 1.05), 0.62, 0.15), -0.82, 1.46, 2.15);
    for (const z of [3.5, 2.15]) {
      S.add(matChassis, B(0.06, 0.2, 0.05), -0.38, 1.45, z);
      S.add(matChassis, B(0.87, 0.05, 0.06), -0.82, 1.76, z + 0.52);
    }
    // cable reel
    for (const x of [0.62, 1.02]) S.add(matChassis, C(0.4, 0.4, 0.05, 14), x, 1.62, 4.0, 0, 0, Math.PI / 2);
    S.add(M.cable, C(0.26, 0.26, 0.36, 12), 0.82, 1.62, 4.0, 0, 0, Math.PI / 2);
    for (const sx of [0.62, 1.02]) S.add(matChassis, B(0.06, 0.5, 0.3), sx, 1.35, 4.0);
    S.add(matSteel, C(0.02, 0.02, 0.22, 6), 1.1, 1.62, 4.14, Math.PI / 2, 0, 0);
    // spare tire flat on deck
    S.add(matTire, treadGeo(0.55, 0.38), 0.7, 1.4, 2.6);
    S.add(matTire, sideGeo(0.55).rotateX(-Math.PI / 2), 0.7, 1.6, 2.6);
    S.add(matSteel, C(0.05, 0.05, 0.5, 8), 0.7, 1.45, 2.6);
    // fire extinguisher box
    S.add(redPaint, B(0.32, 0.5, 0.4), 1.12, 1.44, 1.75);
    S.add(matChassis, B(0.34, 0.05, 0.06), 1.12, 1.6, 1.96);

    // ---- antenna whip (front-left) ----
    S.add(matChassis, C(0.05, 0.08, 0.16, 8), -1.18, 1.28, 4.25);
    S.add(matSteel, C(0.012, 0.02, 2.7, 6), -1.18, 2.7, 4.25, 0, 0, 0.05);
    S.add(matSteel, SP(0.028, 8, 6), -1.25, 4.04, 4.25);

    // ---- junction box + trailer power cabling ----
    S.add(matChassis, B(0.55, 0.66, 0.26), 1.16, 1.56, 3.0);
    S.add(matTread, B(0.34, 0.3, 0.03), 1.16, 1.62, 3.15);
    for (const dy of [-0.18, 0, 0.18]) S.add(M.cable, CZ(0.035, 0.035, 0.14, 8), 1.16 + dy, 1.32, 3.15);

    // ---- status fixture (front-left, clear of rack sweep) ----
    const light = statusFixture(S, g, -1.22, 2.28, 3.6);

    // ---- marker lights: trailer corners + truck bumper + cab roof ----
    for (const [x, z] of [[-1.33, -4.38], [1.33, -4.38]]) D.add(markerMat, B(0.07, 0.09, 0.06), x, 1.02, z);
    for (const [x, z] of [[-1.33, 4.36], [1.33, 4.36]]) D.add(markerMat, B(0.07, 0.09, 0.06), x, 1.02, z);
    for (const x of [-1.33, 1.33]) D.add(markerMat, B(0.07, 0.09, 0.06), x, 1.02, 0);
    D.add(markerMat, B(0.07, 0.09, 0.06), -1.28, 0.98, 11.62);
    D.add(markerMat, B(0.07, 0.09, 0.06), 1.28, 0.98, 11.62);
    for (const x of [-0.8, -0.4, 0, 0.4, 0.8]) D.add(markerMat, B(0.1, 0.06, 0.06), x, 2.79, 10.78);

    // ---- side stencils + number plate (into the shared world atlas) ----
    for (const it of [
      { text: 'RAMPART PX-4', w: 1.5, h: 0.3, x: -1.36, y: 1.42, z: 1.2, ry: -Math.PI / 2 },
      { text: 'RAMPART PX-4', w: 1.5, h: 0.3, x: 1.36, y: 1.42, z: 0.6, ry: Math.PI / 2 },
      { text: 'IV-DEF 04', w: 0.8, h: 0.2, x: -0.82, y: 1.5, z: 4.24 },
      { text: 'FIRE', w: 0.26, h: 0.11, x: 1.295, y: 1.44, z: 1.75, ry: Math.PI / 2 },
      { text: 'PWR', w: 0.3, h: 0.12, x: 1.16, y: 1.86, z: 3.14 },
      { text: 'IV 22-041', w: 0.62, h: 0.15, x: 0, y: 1.06, z: 11.77, fg: '#1c1d20', bg: '#c9c4b2' },
      // range ID boards bolted to the trailer edge rails (shared atlas cell)
      { img: rangeBoardImg, px: 96, w: 0.56, h: 0.3, x: -1.362, y: 1.05, z: 0.9, ry: -Math.PI / 2 },
      { img: rangeBoardImg, px: 96, w: 0.56, h: 0.3, x: 1.362, y: 1.05, z: 0.9, ry: Math.PI / 2 },
    ]) worldLabels.push({ ...it, base: gm });

    // ---- turntable at trailer rear + trunnion towers ----
    S.add(matChassis, C(1.0, 1.15, 0.3, 18), 0, 1.3, -2.9); // riser between deck and slew ring
    const turntable = new THREE.Group();
    turntable.position.set(0, 1.55, -2.9);
    g.add(turntable);
    const T = bucketFor(turntable);
    T.add(matChassis, C(1.12, 1.28, 0.34, 20), 0, 0, 0);
    T.add(matTread, new THREE.CircleGeometry(1.06, 20).rotateX(-Math.PI / 2), 0, 0.172, 0);
    T.add(matChassis, C(1.31, 1.31, 0.1, 20), 0, -0.16, 0);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      T.add(matChassis, B(0.1, 0.12, 0.16), Math.cos(a) * 1.16, 0.02, Math.sin(a) * 1.16, 0, -a, 0);
    }
    // trunnion towers + bearing bosses (elevation axis of the rack)
    for (const sx of [-1, 1]) {
      T.add(matChassis, B(0.3, 0.78, 0.6), sx * 1.38, 0.48, 0);
      T.add(matChassis, C(0.16, 0.16, 0.16, 12), sx * 1.52, 0.85, 0, 0, 0, Math.PI / 2);
      T.add(matChassis, B(0.32, 0.2, 0.7), sx * 1.38, 0.12, 0);
    }
    // azimuth drive box + erection-ram anchor lugs (ride the turntable so the
    // ram pair tracks azimuth slew with a pure elevation-plane rotation)
    T.add(matChassis, B(0.5, 0.38, 0.55), 0.72, 0.28, 0.75);
    T.add(matChassis, C(0.07, 0.07, 0.2, 8), 0.72, 0.28, 1.08, Math.PI / 2, 0, 0);
    for (const sx of [-1, 1]) T.add(matChassis, B(0.24, 0.2, 0.26), sx * 0.78, 0.08, 1.0);
    T.flush();

    const erector = new THREE.Group();
    erector.position.y = 0.3;
    turntable.add(erector);

    // ---- 2x2 canister rack (8 cells) ----
    const canGrp = new THREE.Group();
    erector.add(canGrp);
    canGrp.position.set(0, 0.55, 0);
    const R = bucketFor(canGrp);
    const tubes = [];
    const tubeLabels = [];
    const coverSpots = [];
    const scorchSpots = [];
    for (let cx = 0; cx < 2; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        const px = (cx - 0.5) * 1.18, py = cy * 1.18;
        const i = cx * 2 + cy;
        R.add(matOlive, uvShift(B(1.02, 1.02, 5.4), i * 0.37 + 0.11, i * 0.29), px, py, 0);
        // rib bands
        for (const zz of [-2.1, -0.7, 0.7, 2.1]) R.add(matChassis, B(1.1, 1.1, 0.09), px, py, zz);
        // composite front face + rear closure
        R.add(matCanFace, P(0.98, 0.98), px, py, 2.72);
        R.add(matChassis, P(0.98, 0.98), px, py, -2.72, 0, Math.PI, 0);
        // rear exhaust venturis
        for (const s of [-0.26, 0.26]) R.add(matBurnt, CZ(0.14, 0.2, 0.28, 12), px + s, py, -2.86);
        // per-cell pop-off covers + fired scorch rings (instanced below)
        for (const s of [-0.26, 0.26]) {
          R.add(matChassis, TO(0.225, 0.02, TAU, 18), px + s, py, 2.74);
          const idx = coverSpots.length;
          coverSpots.push({ x: px + s, y: py, z: 2.755 });
          scorchSpots.push({ x: px + s, y: py, z: 2.76, s: 1.0, on: false });
          tubes.push({ offset: new THREE.Vector3(px + s, py, 2.6), used: false, coverIdx: idx });
        }
        tubeLabels.push({ text: `RMP-${cx}${cy}`, w: 0.72, h: 0.2, x: px, y: py + 0.32, z: 2.757 });
      }
    }
    // roundel decal on the left outer canister rides the tube-label atlas
    tubeLabels.push({ img: roundelImg, px: 128, w: 0.62, h: 0.62, x: -1.125, y: 0.59, z: 1.9, ry: -Math.PI / 2 });
    labelStrip(canGrp, tubeLabels, { font: 'bold 26px Arial' });
    const covers = instancedSet(canGrp, new THREE.CircleGeometry(0.21, 18), matCover, coverSpots);
    const scorches = instancedSet(canGrp, new THREE.CircleGeometry(0.34, 16), matScorchRing, scorchSpots);
    for (const t of tubes) {
      t.hide = () => { covers.hide(t.coverIdx); scorches.show(t.coverIdx); };
      t.show = () => { covers.show(t.coverIdx); scorches.hide(t.coverIdx); };
      t.hasCover = true;
    }
    // X-brace stiffeners on outer side faces (signature look)
    for (const sx of [-1, 1]) {
      for (const py of [0, 1.18]) {
        for (const zc of [-1.4, 0, 1.4]) {
          R.add(wornMat, B(0.035, 0.06, 1.62), sx * 1.115, py, zc, 0.55, 0, 0);
          R.add(wornMat, B(0.035, 0.06, 1.62), sx * 1.115, py, zc, -0.55, 0, 0);
        }
      }
    }
    // top-face X braces
    for (const px of [-0.59, 0.59]) {
      for (const zc of [-1.4, 0, 1.4]) {
        R.add(wornMat, B(0.06, 0.035, 1.62), px, 1.695, zc, 0, 0.57, 0);
        R.add(wornMat, B(0.06, 0.035, 1.62), px, 1.695, zc, 0, -0.57, 0);
      }
    }
    // worn edge banding along outer long edges
    for (const [ex, ey] of [[-1.11, -0.51], [1.11, -0.51], [-1.11, 1.69], [1.11, 1.69]]) {
      R.add(wornMat, B(0.05, 0.05, 5.42), ex, ey, 0);
    }
    // belly structure: channel beams, cross ribs, conduit + cabling — the
    // elevated rack shows its underside to most ground viewpoints, so it
    // must not read as one flat dark face
    for (const bx of [-0.6, 0.6]) R.add(wornMat, B(0.2, 0.08, 5.2), bx, -0.56, 0);
    for (const bz of [-2.2, -1.1, 0, 1.1, 2.2]) R.add(matChassis, B(2.24, 0.07, 0.16), 0, -0.55, bz);
    R.add(matChassis, B(0.09, 0.12, 4.6), -1.0, -0.56, 0);
    R.add(matChassis, B(0.05, 0.05, 4.9), 0.2, -0.585, 0);
    cableRun(R, [[-1.0, -0.6, -2.2], [-0.88, -0.63, 0], [-1.02, -0.6, 2.0]], 0.032, matChassis);
    for (const [px, pz] of [[-0.3, -1.6], [0.85, 0.6]]) R.add(matTread, B(0.4, 0.05, 0.5), px, -0.555, pz);
    // rack frame — NO outer side plates: the olive canister walls with proud
    // X-braces are the launcher's visible flank (Patriot-style), a solid slab
    // here buried all that detail and read as one flat face
    R.add(matGirderLite, uvScale(B(2.24, 2.2, 0.16), 0.55, 2), 0, 0.7, -2.8);
    // blast deflector: scuffed kick plate hinged under the rack rear, angled
    // down-away with louver ribs + side gussets (elevation is fixed at 0.66,
    // so ground clearance never changes; yaws with the rack) — rides the
    // wornMat/chassis meshes already in this bucket: zero extra draws
    R.add(wornMat, uvShift(B(2.24, 0.05, 0.9), 0.3, 0.62), 0, -0.92, -3.16, -0.8, 0, 0);
    for (const dk of [-0.28, 0, 0.28]) {
      R.add(matChassis, B(2.1, 0.08, 0.03), 0, -0.885 + dk * 0.752, -3.196 + dk * 0.661, -0.8, 0, 0);
    }
    for (const sx of [-1.09, 1.09]) R.add(matChassis, B(0.06, 0.08, 0.86), sx, -0.79, -3.05, -0.8, 0, 0);
    R.add(matChassis, B(0.1, 2.42, 5.15), 0, 0.59, 0);
    R.add(matChassis, B(2.24, 0.18, 5.15), 0, 0.59, 0);
    // trunnion stubs bridging the cell walls out to the tower bearings
    for (const s of [-1.28, 1.28]) R.add(matChassis, C(0.13, 0.13, 0.36, 12), s, -0.55, 0, 0, 0, Math.PI / 2);
    // lifting lugs on top canisters
    for (const [px, zz] of [[-0.59, -1.7], [0.59, -1.7], [-0.59, 1.7], [0.59, 1.7]]) {
      R.add(matChassis, B(0.05, 0.14, 0.1), px, 1.76, zz);
      R.add(matChassis, TO(0.05, 0.016, TAU, 10), px, 1.84, zz, 0, Math.PI / 2, 0);
    }
    // umbilical conduit along right rail down to the turntable
    R.add(matChassis, B(0.07, 0.12, 4.4), 1.33, 1.0, -0.3);
    R.add(matChassis, B(0.18, 0.22, 0.3), 1.33, 0.9, -2.4);
    cableRun(R, [[1.33, 0.8, -2.4], [1.28, 0.2, -2.0], [1.05, -0.5, -1.1], [0.75, -0.72, -0.4]], 0.04, matChassis);
    R.flush();

    // hydraulic erector ram pair (prominent), anchored on the turntable lugs
    const hyd = hydraulicsPair(turntable,
      { pos: new THREE.Vector3(0.78, 0.12, 1.0) },
      { pos: new THREE.Vector3(0.78, -0.45, 1.55), node: canGrp }, 0.09, 0.062);

    // umbilical from turntable base to trailer junction box + ground exit
    cableRun(S, [[0.55, 1.15, -2.6], [0.95, 1.25, -0.5], [1.16, 1.3, 2.85]], 0.04);
    droop(S, [1.16, 1.25, 3.15], [2.3, 0.06, 4.6], 0.55, 0.045);
    droop(S, [-0.4, 1.05, -2.95], [-2.2, 0.06, -4.6], 0.5, 0.04);

    // ================= tractor truck (heavy 4x4 with generator bed) =========
    // frame + pintle towing the trailer ring at z=6.42
    for (const x of [-0.55, 0.55]) S.add(matChassis, B(0.14, 0.3, 5.0), x, 0.82, 9.15);
    for (const z of [7.2, 8.4, 9.6, 10.8]) S.add(matChassis, B(1.1, 0.16, 0.12), 0, 0.78, z);
    S.add(matChassis, B(0.3, 0.34, 0.3), 0, 0.72, 6.85);
    S.add(matSteel, TO(0.09, 0.03, Math.PI * 1.5, 10), 0, 0.7, 6.6, 0, 0, Math.PI / 2); // pintle hook
    // axles + wheels
    for (const z of [7.7, 10.55]) S.add(matChassis, C(0.085, 0.085, 2.3, 8), 0, 0.58, z, 0, 0, Math.PI / 2);
    wheelsFor(S, [[-1.18, 7.7], [1.18, 7.7], [-1.18, 10.55], [1.18, 10.55]], 0.58, 0.5);
    // generator bed behind the cab (EPP look): tread deck + olive gen box
    S.add(matTread, uvShift(B(2.35, 0.08, 2.7), 0.31, 0.7), 0, 1.24, 8.25);
    S.add(matOlive, uvShift(B(2.0, 1.05, 2.3), 0.44, 0.62), 0, 1.82, 8.2);
    S.add(matChassis, B(2.04, 0.08, 2.34), 0, 2.38, 8.2);
    S.add(grilleMat, B(0.03, 0.6, 1.5), 1.02, 1.86, 8.2);
    S.add(grilleMat, B(0.03, 0.6, 1.5), -1.02, 1.86, 8.2);
    S.add(matBurnt, C(0.07, 0.07, 0.5, 8), 0.8, 2.62, 7.4);        // gen exhaust
    S.add(matBurnt, C(0.1, 0.09, 0.1, 8), 0.8, 2.9, 7.4);
    for (const z of [7.2, 9.2]) S.add(matChassis, B(2.3, 0.05, 0.06), 0, 1.6, z); // hold-down straps
    // power cable from generator down across the hitch to the trailer PWR box
    droop(S, [0.85, 1.4, 7.05], [1.16, 1.35, 3.2], 0.75, 0.045);
    // cab (short hood, big glass house)
    S.add(matTan, uvShift(B(2.3, 0.7, 1.1), 0.12, 0.05), 0, 1.55, 11.0);   // hood
    S.add(matTan, uvShift(B(2.35, 1.28, 1.75), 0.55, 0.35), 0, 2.02, 9.95); // cab body
    S.add(matTan, B(2.4, 0.09, 1.85), 0, 2.72, 9.95);                       // roof
    S.add(matChassis, B(2.15, 0.5, 1.6), 0, 1.06, 10.0);                    // cab floor/skirt
    // windshield (raked) + gasket
    S.add(matChassis, B(2.1, 0.78, 0.07), 0, 2.34, 10.86, -0.12, 0, 0);
    D.add(matGlass, P(1.9, 0.62), 0, 2.35, 10.905, -0.12, 0, 0);
    S.add(matChassis, B(0.09, 0.78, 0.07), -0.02, 2.34, 10.86, -0.12, 0, 0); // center pillar
    // side windows + door seams + handles + steps
    for (const sx of [-1, 1]) {
      D.add(matGlass, P(0.9, 0.52), sx * 1.181, 2.36, 9.95, 0, sx * Math.PI / 2, 0);
      S.add(matChassis, B(0.02, 1.2, 0.05), sx * 1.18, 1.95, 9.35);
      S.add(matChassis, B(0.02, 1.2, 0.05), sx * 1.18, 1.95, 10.55);
      S.add(matSteel, B(0.03, 0.05, 0.2), sx * 1.19, 1.86, 9.55);
      S.add(matTread, B(0.42, 0.05, 0.5), sx * 1.25, 0.78, 9.9);
      S.add(matTread, B(0.42, 0.05, 0.5), sx * 1.25, 1.2, 9.9);
      // mirrors
      S.add(matSteel, C(0.018, 0.018, 0.5, 6), sx * 1.3, 2.62, 10.7, 0, 0, sx * 1.15);
      S.add(matChassis, B(0.2, 0.34, 0.03), sx * 1.52, 2.42, 10.72);
      D.add(matGlass, P(0.16, 0.28), sx * 1.52, 2.42, 10.74);
    }
    // grille, bumper, headlights, brush guard
    S.add(grilleMat, B(1.4, 0.5, 0.06), 0, 1.62, 11.56);
    S.add(matChassis, B(2.5, 0.36, 0.3), 0, 0.95, 11.6);
    for (const x of [-0.92, -0.68, 0.68, 0.92]) {
      S.add(lensMat, CZ(0.08, 0.08, 0.06, 12), x, 1.32, 11.62);
      S.add(matChassis, CZ(0.1, 0.1, 0.05, 12), x, 1.32, 11.6);
    }
    for (const x of [-0.75, 0, 0.75]) S.add(matSteel, C(0.025, 0.025, 1.3, 8), x, 1.65, 11.72);
    for (const y of [1.25, 1.85]) S.add(matSteel, C(0.022, 0.022, 1.9, 8), 0, y, 11.73, 0, 0, Math.PI / 2);
    // fenders + exhaust stack + air snorkel
    for (const sx of [-1, 1]) {
      S.add(matTan, B(0.5, 0.06, 1.5), sx * 1.2, 1.32, 10.55);
      S.add(M.rubber, B(0.44, 0.42, 0.03), sx * 1.2, 0.6, 9.75);
      // rear-axle mudflaps under the generator bed
      S.add(matChassis, B(0.48, 0.05, 0.04), sx * 1.18, 0.72, 7.02);
      S.add(M.rubber, B(0.44, 0.44, 0.03), sx * 1.18, 0.46, 7.0);
    }
    // work lamp on the cab roof rear edge, lighting the generator bed at night
    S.add(matChassis, B(0.06, 0.06, 0.14), -0.75, 2.79, 9.08);
    D.add(markerMat, B(0.11, 0.09, 0.06), -0.75, 2.76, 8.99);
    S.add(matBurnt, C(0.075, 0.075, 1.7, 8), 1.12, 2.2, 9.0);
    S.add(matSteel, new THREE.CylinderGeometry(0.11, 0.11, 1.0, 8, 1, true, 0, Math.PI), 1.12, 2.2, 9.0);
    S.add(matBurnt, C(0.07, 0.075, 0.24, 8), 1.12, 3.12, 8.96, 0.5, 0, 0);
    S.add(matChassis, B(0.16, 0.9, 0.16), -1.12, 2.5, 9.25);
    S.add(matChassis, B(0.22, 0.22, 0.2), -1.12, 3.0, 9.25);
    // roof: AC unit + horn + antenna + sun visor
    S.add(matTan, uvShift(B(0.9, 0.24, 0.9), 0.7, 0.8), -0.45, 2.86, 9.6);
    S.add(grilleMat, B(0.92, 0.12, 0.5), -0.45, 2.84, 9.6);
    S.add(matSteel, C(0.04, 0.07, 0.3, 8), 0.35, 2.86, 9.55, -1.2, 0, 0);
    S.add(matSteel, C(0.01, 0.016, 1.4, 6), 0.9, 3.4, 9.4, 0, 0, 0.06);
    S.add(matTan, B(2.2, 0.04, 0.34), 0, 2.78, 10.92, 0.35, 0, 0); // visor
    // (front number plate folded into the side-stencil strip above)

    // contact shadows: trailer + truck
    contactShadow(D, 5.4, 11.0, 0, 0.2);
    contactShadow(D, 4.6, 6.6, 0, 9.2);
    // (world buckets flush once after all rigs are built)

    ctx.world.colliders.push(makeColliderBox(pad.position.x, pad.position.z, 2.0, 4.8, pad.heading, 0, 3));
    const tw = padWorld(pad, 0, 9.2);
    ctx.world.colliders.push(makeColliderBox(tw.x, tw.z, 1.6, 2.7, pad.heading, 0, 3));

    return {
      group: g, turntable, elevGroup: canGrp, tubes, statusLight: light, markerMat,
      restElevation: 0.66, fireElevation: 0.66, elevAxis: 'x', elevSign: -1,
      hydUpdaters: [hyd],
      muzzleForward: new THREE.Vector3(0, 0, 1),
      recoilNode: canGrp, recoilBase: 0, recoilAmp: 0.11, recoil: 0,
      resetWear: () => { covers.reset(); scorches.reset(); },
    };
  }

  // =================================================== HALBERD (THAAD-like)
  function buildHalberd(pad) {
    const g = new THREE.Group();
    g.position.copy(pad.position);
    g.rotation.y = pad.heading;
    scene.add(g);
    g.updateMatrix();
    const gm = g.matrix.clone();
    // the pack aims on a slew pallet, so the whole truck is world-static and
    // its parts merge into the shared cross-rig buckets like the other rigs
    const S = WS, D = WD;
    S.setBase(gm); D.setBase(gm);

    // ---- chassis + frame ----
    S.add(matTan, uvShift(B(2.5, 0.6, 10.6), 0.07, 0.33), 0, 1.02, 0);
    for (const x of [-0.78, 0.78]) S.add(matChassis, B(0.18, 0.4, 10.8), x, 0.6, 0);
    for (const z of [-4.6, -3.0, -1.4, 0.2, 1.8, 3.4]) S.add(matChassis, B(1.6, 0.16, 0.14), 0, 0.55, z);
    S.add(matTread, uvShift(B(2.5, 0.06, 6.6), 0.5, 0.24), 0, 1.36, -1.9);
    // tie-down cleats along deck edges
    for (const z of [-4.6, -2.6, -0.6]) {
      for (const sx of [-1, 1]) S.add(matSteel, TO(0.06, 0.02, Math.PI, 8), sx * 1.2, 1.4, z);
    }

    // ---- cab (cab-over) ----
    S.add(matTan, uvShift(B(2.6, 1.15, 2.4), 0.42, 0.13), 0, 1.78, 4.55);
    S.add(matTan, uvShift(B(2.5, 1.0, 2.05), 0.8, 0.55), 0, 2.85, 4.38);
    S.add(matTan, B(2.56, 0.09, 2.12), 0, 3.4, 4.38);
    // windshield recessed in a gasket frame
    S.add(matChassis, B(2.3, 0.8, 0.06), 0, 3.0, 5.4, -0.1, 0, 0);
    D.add(matGlass, P(2.14, 0.66), 0, 3.0, 5.44, -0.1, 0, 0);
    for (const x of [-1.1, 0, 1.1]) S.add(matChassis, B(0.08, 0.8, 0.07), x, 3.0, 5.41, -0.1, 0, 0);
    // wipers
    for (const x of [-0.55, 0.45]) S.add(matChassis, B(0.02, 0.34, 0.02), x, 2.78, 5.475, -0.1, 0, 0.5);
    // side windows + door seams + handles
    for (const sx of [-1, 1]) {
      S.add(matChassis, B(0.03, 0.65, 0.88), sx * 1.255, 2.98, 4.6);
      D.add(matGlass, P(0.78, 0.55), sx * 1.272, 2.98, 4.6, 0, sx * Math.PI / 2, 0);
      S.add(matChassis, B(0.02, 1.5, 0.05), sx * 1.26, 2.4, 5.25);
      S.add(matChassis, B(0.02, 1.5, 0.05), sx * 1.26, 2.4, 3.95);
      S.add(matSteel, B(0.03, 0.05, 0.22), sx * 1.27, 2.42, 4.1);
    }
    // grille + headlights + brush guard + bumper
    S.add(grilleMat, B(1.8, 0.62, 0.08), 0, 1.98, 5.78);
    for (const x of [-1.02, -0.78, 0.78, 1.02]) S.add(lensMat, CZ(0.085, 0.085, 0.07, 12), x, 1.5, 5.79);
    for (const x of [-1.02, -0.78, 0.78, 1.02]) S.add(matChassis, CZ(0.105, 0.105, 0.05, 12), x, 1.5, 5.77);
    S.add(matChassis, B(2.85, 0.42, 0.35), 0, 0.94, 5.9);
    for (const x of [-0.85, 0, 0.85]) S.add(matSteel, C(0.028, 0.028, 1.5, 8), x, 1.7, 6.02);
    for (const y of [1.35, 2.05]) S.add(matSteel, C(0.024, 0.024, 2.2, 8), 0, y, 6.03, 0, 0, Math.PI / 2);
    // (bumper plate folded into the unit stencil strip below)
    // roof: AC unit, horns, marker lights, antenna, sun visor
    S.add(matTan, uvShift(B(1.0, 0.26, 1.0), 0.66, 0.74), -0.35, 3.56, 4.1);
    S.add(grilleMat, B(1.02, 0.13, 0.55), -0.35, 3.53, 4.1);
    S.add(matTan, B(2.4, 0.04, 0.36), 0, 3.46, 5.5, 0.35, 0, 0); // visor
    for (const sx of [-1, 1]) S.add(matSteel, C(0.05, 0.085, 0.42, 10), sx * 0.42, 3.52, 4.9, -1.25, 0, 0);
    // roof stowage beside the AC (the pack's elevated 3/4 views look straight
    // down at this roof): strapped tarp roll + jerry can pair on a low rail
    S.add(matOlive, uvShift(C(0.16, 0.16, 1.15, 10), 0.7, 0.2).rotateZ(Math.PI / 2), 0.62, 3.63, 3.72);
    for (const rx2 of [0.35, 0.9]) S.add(matChassis, TO(0.165, 0.018, TAU, 10), rx2, 3.63, 3.72, 0, Math.PI / 2, 0);
    for (const [cx, cz] of [[0.45, 4.42], [0.82, 4.42]]) {
      S.add(matOlive, uvShift(B(0.32, 0.4, 0.17), cx, cz * 0.1), cx, 3.66, cz);
      S.add(matChassis, B(0.14, 0.05, 0.05), cx, 3.88, cz);
    }
    for (const rz2 of [3.52, 4.62]) S.add(matSteel, C(0.016, 0.016, 1.0, 6), 0.62, 3.52, rz2, 0, 0, Math.PI / 2);
    // clearance lamps: roof bar + cab corners + deck edges (markerMat rides the
    // S bucket — it carries the noShadow flag, so no extra shadow cost)
    for (const x of [-0.9, -0.45, 0, 0.45, 0.9]) S.add(markerMat, B(0.11, 0.06, 0.06), x, 3.47, 5.42);
    for (const sx of [-1, 1]) S.add(markerMat, B(0.06, 0.09, 0.09), sx * 1.29, 3.42, 5.35);
    for (const [x, z] of [[-1.28, -5.28], [1.28, -5.28]]) S.add(markerMat, B(0.07, 0.09, 0.06), x, 1.05, z);
    for (const [x, z] of [[-1.28, -2.4], [1.28, -2.4], [-1.28, 1.4], [1.28, 1.4]]) S.add(markerMat, B(0.07, 0.09, 0.06), x, 1.05, z);
    S.add(matSteel, C(0.012, 0.018, 1.6, 6), -1.05, 4.2, 3.6, 0, 0, 0.06);
    // mirrors
    for (const sx of [-1, 1]) {
      S.add(matSteel, C(0.02, 0.02, 0.55, 8), sx * 1.42, 3.15, 5.3, 0, 0, sx * 1.2);
      S.add(matChassis, B(0.24, 0.38, 0.04), sx * 1.66, 2.95, 5.32);
      D.add(matGlass, P(0.19, 0.32), sx * 1.66, 2.95, 5.345);
    }
    // exhaust stack + heat shield behind cab (right)
    S.add(matBurnt, C(0.085, 0.085, 2.15, 10), 1.16, 2.65, 3.25);
    S.add(matSteel, new THREE.CylinderGeometry(0.13, 0.13, 1.3, 10, 1, true, 0, Math.PI), 1.16, 2.4, 3.25);
    S.add(matBurnt, C(0.08, 0.085, 0.3, 10), 1.16, 3.82, 3.2, 0.5, 0, 0);
    // fuel tanks + straps + top step plates
    for (const sx of [-1, 1]) {
      S.add(matSteel, CZ(0.34, 0.34, 1.7, 14), sx * 1.22, 0.8, 2.3);
      for (const z of [1.85, 2.75]) S.add(matChassis, TO(0.36, 0.028, TAU, 14), sx * 1.22, 0.8, z);
      S.add(matTread, B(0.55, 0.04, 1.6), sx * 1.22, 1.17, 2.3);
    }
    // cab steps + grab rails
    for (const sx of [-1, 1]) {
      S.add(matTread, B(0.5, 0.05, 0.55), sx * 1.32, 0.62, 4.9);
      S.add(matTread, B(0.5, 0.05, 0.55), sx * 1.32, 1.08, 4.9);
      S.add(matSteel, C(0.02, 0.02, 1.3, 8), sx * 1.31, 1.95, 5.52);
    }
    // front fenders + mud flaps
    for (const sx of [-1, 1]) {
      S.add(matTan, B(0.56, 0.06, 1.6), sx * 1.42, 1.42, 4.2);
      S.add(matTan, B(0.56, 0.06, 0.45), sx * 1.42, 1.3, 5.1, -0.6, 0, 0);
      S.add(M.rubber, B(0.5, 0.5, 0.035), sx * 1.42, 0.62, 3.35);
      S.add(M.rubber, B(0.5, 0.5, 0.035), sx * 1.42, 0.62, -5.12);
    }

    // ---- 10 wheels + axles ----
    const wz = [4.2, 1.6, -0.6, -2.6, -4.4];
    for (const z of wz) S.add(matChassis, C(0.08, 0.08, 2.4, 8), 0, 0.62, z, 0, 0, Math.PI / 2);
    wheelsFor(S, wz.flatMap((z) => [[-1.42, z], [1.42, z]]), 0.62, 0.5);
    // mudflaps behind the front axle and the rear bogie
    for (const sx of [-1, 1]) {
      for (const fz of [3.5, -5.1]) {
        S.add(matChassis, B(0.52, 0.05, 0.04), sx * 1.42, 0.72, fz);
        S.add(M.rubber, B(0.5, 0.46, 0.03), sx * 1.42, 0.45, fz - 0.02);
      }
    }
    // work lamp under the cab roof rear edge, aimed at the deck/pallet
    S.add(matChassis, B(0.06, 0.06, 0.14), 0.75, 3.32, 3.4);
    D.add(markerMat, B(0.11, 0.09, 0.06), 0.75, 3.28, 3.31);

    // ---- rear stabilizer legs ----
    for (const sx of [-1, 1]) {
      S.add(matChassis, B(0.32, 0.3, 0.5), sx * 1.25, 1.0, -4.95);
      S.add(matChrome, C(0.09, 0.09, 1.1, 10), sx * 1.6, 0.62, -4.95);
      S.add(matChassis, B(0.6, 0.1, 0.6), sx * 1.6, 0.07, -4.95);
      S.add(matChassis, B(0.55, 0.12, 0.14), sx * 1.42, 1.05, -4.95, 0, 0, sx * 0.45);
    }

    // ---- slew ring base for the yaw pallet (pallet itself rotates, below) ----
    S.add(matChassis, C(1.2, 1.28, 0.05, 24), 0, 1.415, -3.4);
    D.add(redPaint, TO(1.36, 0.018, TAU, 28), 0, 1.4, -3.4, Math.PI / 2, 0, 0); // slew-arc warning ring
    // spare wheel against the cab rear + tool boxes + air reservoirs
    S.add(matTire, treadGeo(0.6, 0.35).rotateX(Math.PI / 2), -0.55, 2.0, 3.28);
    S.add(matTire, sideGeo(0.6), -0.55, 2.0, 3.455);
    S.add(matOlive, uvShift(B(0.7, 0.52, 0.8), 0.55, 0.8), 1.18, 1.06, 0.5);
    S.add(matOlive, uvShift(B(0.7, 0.5, 0.85), 0.15, 0.42), -1.18, 1.04, -1.6);
    for (const sy of [-0.1, 0.14]) S.add(matSteel, C(0.11, 0.11, 0.9, 10), 0.2, 0.62 + sy, -3.9, 0, 0, Math.PI / 2);
    // transport bolster the pack rests on
    S.add(matChassis, B(2.2, 0.24, 0.4), 0, 1.5, 0.9);
    S.add(M.rubber, B(2.1, 0.06, 0.34), 0, 1.65, 0.9);

    // ---- yaw pallet on the slew ring: carries trunnions, rams and the pack
    // (the truck no longer spins in place to lay — far more believable) ----
    const turntable = new THREE.Group();
    turntable.position.set(0, 1.55, -3.4);
    g.add(turntable);
    const TT = bucketFor(turntable);
    TT.add(matChassis, B(2.1, 0.07, 3.5), 0, -0.075, 1.05);                      // pallet plate
    TT.add(matTread, uvShift(B(1.9, 0.02, 3.3), 0.6, 0.15), 0, -0.03, 1.05);     // tread top
    for (const sx of [-1, 1]) {
      TT.add(matChassis, B(0.42, 0.62, 0.55), sx * 0.95, 0, 0);                  // trunnion pedestals
      TT.add(matSteel, C(0.17, 0.17, 0.2, 12), sx * 1.21, 0, 0, 0, 0, Math.PI / 2);
      // axle stubs are coaxial with the elevation axis (rotation-invariant),
      // so they merge here instead of costing a bucket on the pivot itself
      TT.add(matChassis, C(0.14, 0.14, 0.3, 12), sx * 1.02, 0, 0, 0, 0, Math.PI / 2);
      TT.add(matChassis, B(0.26, 0.18, 0.26), sx * 0.92, 0.05, 2.4);             // ram anchor lugs
    }
    TT.add(matChassis, uvShift(B(0.55, 0.36, 0.5), 0.3, 0.66), -0.62, 0.14, 1.75); // hyd power pack
    TT.add(matChassis, TO(0.13, 0.035, TAU, 12), -0.62, 0.35, 1.75, Math.PI / 2, 0, 0); // hose coil
    TT.flush();

    // ---- elevating tube pack: 8 tubes (2 cols x 4 rows), open lattice ----
    const pivot = new THREE.Group();
    turntable.add(pivot);
    const pack = new THREE.Group();
    pivot.add(pack);
    pack.position.set(0, 0.3, 1.2);
    const K = bucketFor(pack);
    const tubes = [];
    const tubeLabels = [];
    const coverSpots = [];
    const scorchSpots = [];
    const TUBE_L = 7.0, TUBE_R = 0.4, ROW_DY = 0.86, COL_DX = 1.0;
    // fire order: bottom 3 rows (6 live tubes), then top row = expended pair
    const rowsOrder = [0, 1, 2, 3];
    for (const row of rowsOrder) {
      for (let col = 0; col < 2; col++) {
        const tx = (col - 0.5) * COL_DX, ty = 0.35 + row * ROW_DY;
        const i = row * 2 + col;
        const expended = row === 3;
        // u-shift spins each tube's stencil band start; v stays aligned
        K.add(matTube, uvShift(CZ(TUBE_R, TUBE_R, TUBE_L, 18), i * 0.29 + 0.07, 0), tx, ty, 0.4);
        // wound-composite wrap bands
        for (const zz of [-2.6, -1.2, 0.2, 1.6, 3.0]) K.add(matChassis, CZ(TUBE_R + 0.02, TUBE_R + 0.02, 0.1, 18), tx, ty, zz + 0.4);
        K.add(matBurnt, CZ(TUBE_R + 0.03, TUBE_R + 0.03, 0.18, 18), tx, ty, 0.4 + TUBE_L / 2 + 0.02); // mouth collar
        K.add(matChassis, CZ(TUBE_R + 0.02, TUBE_R + 0.02, 0.1, 18), tx, ty, 0.4 - TUBE_L / 2 + 0.02); // rear ring
        // (no rear membranes — the girder bulkhead sits right behind them)
        const mouthZ = 0.4 + TUBE_L / 2 + 0.12;
        if (!expended) {
          const idx = coverSpots.length;
          coverSpots.push({ x: tx, y: ty, z: mouthZ });
          scorchSpots.push({ x: tx, y: ty, z: mouthZ + 0.005, s: 1.15, on: false });
          tubes.push({ offset: new THREE.Vector3(tx, ty + 0.3, 1.2 + mouthZ - 0.1), used: false, coverIdx: idx, row, col });
          K.add(matChassis, B(0.36, 0.16, 0.05), tx, ty + 0.52, mouthZ - 0.06);
          tubeLabels.push({ text: `H-${idx + 1}`, w: 0.3, h: 0.12, x: tx, y: ty + 0.52, z: mouthZ - 0.03 });
        } else {
          // expended tube: open scorched mouth
          K.add(matBurnt, new THREE.CircleGeometry(TUBE_R - 0.04, 16), tx, ty, mouthZ - 0.16);
          scorchSpots.push({ x: tx, y: ty, z: mouthZ, s: 1.3, on: true });
        }
      }
    }
    labelStrip(pack, tubeLabels, { font: 'bold 34px Arial' });
    const covers = instancedSet(pack, new THREE.CircleGeometry(TUBE_R - 0.015, 20), membraneMat, coverSpots);
    const scorches = instancedSet(pack, new THREE.CircleGeometry(TUBE_R, 16), matScorchRing, scorchSpots);
    for (const t of tubes) {
      t.hide = () => { covers.hide(t.coverIdx); scorches.show(t.coverIdx); };
      t.show = () => { covers.show(t.coverIdx); scorches.hide(t.coverIdx); };
      t.hasCover = true;
    }
    // open lattice frame: corner longerons + X-bracing (tubes visible through)
    const packH = 0.35 + 3 * ROW_DY + TUBE_R + 0.28;
    const halfW = COL_DX / 2 + TUBE_R + 0.16;
    const latt = { zs: [-3.0, -1.5, 0.0, 1.5, 3.0] };
    for (const sx of [-1, 1]) {
      // longerons at top/bottom corners
      K.add(wornMat, uvShift(B(0.09, 0.14, TUBE_L + 0.5), sx, 0.2), sx * halfW, -0.25, 0.4);
      K.add(wornMat, uvShift(B(0.09, 0.14, TUBE_L + 0.5), sx, 0.5), sx * halfW, packH - 0.5, 0.4);
      // verticals + X diagonals per bay
      for (let bi = 0; bi < latt.zs.length; bi++) {
        const z = latt.zs[bi] + 0.4;
        K.add(matChassis, B(0.07, packH - 0.28, 0.09), sx * halfW, (packH - 0.5 - 0.25) / 2, z);
        if (bi < latt.zs.length - 1) {
          const zm = (latt.zs[bi] + latt.zs[bi + 1]) / 2 + 0.4;
          const bay = latt.zs[bi + 1] - latt.zs[bi];
          const diagL = Math.hypot(bay, packH - 0.4);
          const ang = Math.atan2(packH - 0.4, bay);
          K.add(matChassis, C(0.026, 0.026, diagL * 0.98, 6).rotateZ(Math.PI / 2), sx * halfW, (packH - 0.75) / 2, zm, ang, Math.PI / 2, 0);
          K.add(matChassis, C(0.026, 0.026, diagL * 0.98, 6).rotateZ(Math.PI / 2), sx * halfW, (packH - 0.75) / 2, zm, -ang, Math.PI / 2, 0);
        }
      }
    }
    // cross straps between columns (front/rear/top faces)
    for (const z of [-3.0 + 0.4, 0.4, 3.0 + 0.4]) {
      K.add(matChassis, B(halfW * 2, 0.1, 0.09), 0, packH - 0.5, z);
      K.add(matChassis, B(halfW * 2, 0.1, 0.09), 0, -0.25, z);
    }
    // base plate under the bottom row only (open above)
    K.add(matTread, uvShift(B(halfW * 2, 0.12, TUBE_L + 0.4), 0.23, 0.5), 0, -0.36, 0.4);
    for (const zf of [0.4 + TUBE_L / 2 - 0.1, 0.4 - TUBE_L / 2 + 0.1]) {
      K.add(matChassis, B(halfW * 2 + 0.12, 0.16, 0.2), 0, -0.22, zf);
      K.add(matChassis, B(halfW * 2 + 0.12, 0.16, 0.2), 0, packH - 0.42, zf);
      for (const sx of [-1, 1]) K.add(matChassis, B(0.16, packH + 0.1, 0.2), sx * halfW, (packH - 0.36) / 2, zf);
    }
    // cable runs: conduit along the right longeron + drop loops per row
    K.add(matChassis, B(0.07, 0.12, TUBE_L - 0.6), halfW + 0.08, 1.2, 0.2);
    for (const row of [0, 1, 2]) {
      const ty = 0.35 + row * ROW_DY;
      cableRun(K, [[halfW + 0.06, 1.2, -2.2 + row * 0.5], [halfW - 0.1, ty + 0.2, -2.6 + row * 0.4], [COL_DX / 2 + TUBE_R - 0.05, ty, -2.9 + row * 0.4]], 0.026, matChassis);
    }
    // rear bulkhead: manifold, access panels, valve wheels, cable elbows
    K.add(matGirderLite, uvScale(B(halfW * 2 - 0.2, packH - 0.7, 0.12), 0.5, 3), 0, (packH - 0.6) / 2, 0.4 - TUBE_L / 2 - 0.1);
    for (const [px, py] of [[-0.5, 0.6], [0.5, 0.6], [-0.5, 1.85], [0.5, 1.85]]) {
      K.add(matTread, B(0.44, 0.44, 0.06), px, py, 0.4 - TUBE_L / 2 - 0.18);
    }
    for (const [px, py] of [[-0.2, 1.25], [0.25, 1.3]]) K.add(matChassis, TO(0.07, 0.02, TAU, 10), px, py, 0.4 - TUBE_L / 2 - 0.2);
    for (const [px, py] of [[-0.85, 0.3], [0.88, 2.3]]) K.add(matChassis, TO(0.1, 0.03, Math.PI / 2, 8), px, py, 0.4 - TUBE_L / 2 - 0.18);
    K.flush();
    // unit stencils live on the chassis skirt (the pack sides are open lattice);
    // the cab-door roundel rides the same world atlas as the other rigs
    for (const it of [
      { text: 'HALBERD HA-9', w: 1.7, h: 0.3, x: -1.26, y: 1.06, z: 1.4, ry: -Math.PI / 2 },
      { text: 'HALBERD HA-9', w: 1.7, h: 0.3, x: 1.26, y: 1.06, z: -0.6, ry: Math.PI / 2 },
      { text: 'HA-9 · IV-DEF', w: 0.9, h: 0.18, x: 0.7, y: 0.98, z: 6.09, fg: '#1c1d20', bg: '#c9c4b2', font: 'bold 26px Arial' },
      { text: 'HALBERD HA-9', w: 1.9, h: 0.36, x: 0, y: 1.6, z: 5.93, bg: '#42452f' },
      { img: roundelImg, px: 128, w: 0.5, h: 0.5, x: -1.287, y: 2.35, z: 4.62, ry: -Math.PI / 2 },
      // range ID boards on the lower cab panels, above the front fender line
      { img: rangeBoardImg, px: 96, w: 0.5, h: 0.42, x: -1.315, y: 1.85, z: 3.85, ry: -Math.PI / 2 },
      { img: rangeBoardImg, px: 96, w: 0.5, h: 0.42, x: 1.315, y: 1.85, z: 3.85, ry: Math.PI / 2 },
    ]) worldLabels.push({ ...it, base: gm });

    // prominent elevation piston pair (one merged pair mesh) on the pallet lugs
    const hyd = hydraulicsPair(turntable,
      { pos: new THREE.Vector3(0.92, 0.08, 2.4) },
      { pos: new THREE.Vector3(0.92, 0.1, 1.8), node: pack }, 0.115, 0.08);

    // ---- interconnect cable bundle to a ground junction box ----
    S.add(matChassis, B(0.72, 0.52, 0.38), 2.5, 0.26, -5.2);
    S.add(matTread, B(0.5, 0.28, 0.04), 2.5, 0.3, -4.99);
    droop(S, [0.4, 1.1, -4.9], [2.35, 0.52, -5.15], 0.35, 0.04);
    droop(S, [0.1, 1.05, -4.95], [2.42, 0.5, -5.3], 0.5, 0.035);
    droop(S, [-0.2, 1.0, -4.85], [2.3, 0.48, -5.0], 0.65, 0.03);
    droop(S, [2.62, 0.4, -5.2], [3.8, 0.05, -5.9], 0.3, 0.05);

    // ---- status fixture on rear-left mast ----
    const light = statusFixture(S, g, -1.35, 2.45, -5.05);

    contactShadow(D, 5.2, 13.4, 0, 0.3);
    // (world buckets flush once after all rigs are built)

    ctx.world.colliders.push(makeColliderBox(pad.position.x, pad.position.z, 1.9, 5.8, pad.heading, 0, 3.4));
    const jb = padWorld(pad, 2.5, -5.2);
    ctx.world.colliders.push(makeColliderCyl(jb.x, jb.z, 0.6, 0, 0.6));

    return {
      group: g, turntable, elevGroup: pivot, tubes, statusLight: light, markerMat,
      // pallet slew matches the old whole-truck yaw rate exactly (0.55x), so
      // time-to-lay — and therefore intercept timing — is unchanged
      slewMul: 0.55,
      restElevation: 0.5, fireElevation: 1.18, elevAxis: 'x', elevSign: -1,
      hydUpdaters: [hyd],
      muzzleForward: new THREE.Vector3(0, 0, 1),
      recoilNode: pack, recoilBase: 1.2, recoilAmp: 0.14, recoil: 0,
      resetWear: () => { covers.reset(); scorches.reset(); },
    };
  }

  // =================================================== SENTINEL (fictional)
  function buildSentinel(pad) {
    const g = new THREE.Group();
    g.position.copy(pad.position);
    g.rotation.y = pad.heading;
    scene.add(g);
    g.updateMatrix();
    const gm = g.matrix.clone();
    // fixed emplacement: all statics bake into the cross-rig world buckets
    const S = WS, D = WD;
    S.setBase(gm); D.setBase(gm);

    // ---- ring base + hazard edge band ----
    S.add(M.concrete, C(4.4, 4.8, 0.7, 28), 0, 0.35, 0);
    S.add(M.hazard, new THREE.CylinderGeometry(4.45, 4.45, 0.14, 28, 1, true), 0, 0.66, 0);

    // ---- pedestal under the pivot ----
    S.add(matChassis, C(0.95, 1.25, 1.15, 16), 0.4, 0.575, 0);
    S.add(matTread, C(1.12, 1.12, 0.09, 16), 0.4, 1.1, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      S.add(matSteel, C(0.05, 0.05, 0.1, 6), 0.4 + Math.cos(a) * 1.0, 1.16, Math.sin(a) * 1.0);
    }

    // ---- blast deflector wedge + scorch + cooling ribs ----
    S.add(scorchSteelMat, B(2.6, 0.18, 2.5), 0.4, 0.9, -2.1, 0.62, 0, 0);
    for (const sx of [-1, 1]) S.add(scorchSteelMat, B(0.14, 1.0, 2.2), 0.4 + sx * 1.32, 0.85, -2.1, 0.45, 0, 0);
    for (const dz of [-0.8, -0.4, 0, 0.4, 0.8]) {
      S.add(matBurnt, B(2.5, 0.06, 0.1), 0.4, 0.98, -2.1 + dz, 0.62, 0, 0);
    }
    for (const sx of [-0.7, 0.7]) S.add(matChassis, B(0.16, 0.7, 0.16), 0.4 + sx, 0.55, -1.6);
    D.add(scorchDecalMat, P(4.2, 4.2).rotateX(-Math.PI / 2), 0.4, 0.715, -2.4);

    // ---- gantry tower (tower-local adds, baked via a shifted base matrix) ----
    const tm = gm.clone().multiply(_pm.makeTranslation(-3.0, 0, 0));
    const TW = WS;
    TW.setBase(tm); WD.setBase(tm);
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
      TW.add(bandMat, C(0.09, 0.13, 13, 10), x, 6.5, z);
      TW.add(matChassis, B(0.5, 0.08, 0.5), x, 0.04, z);
    }
    // perimeter beams + X diagonals per level
    for (let i = 1; i <= 6; i++) {
      const y = i * 2;
      for (const s of [-0.6, 0.6]) {
        TW.add(matSteel, B(1.32, 0.08, 0.08), 0, y, s);
        TW.add(matSteel, B(0.08, 0.08, 1.32), s, y, 0);
      }
      for (const s of [-0.6, 0.6]) {
        TW.add(matSteel, C(0.024, 0.024, 2.2, 6), 0, y - 1, s, 0, 0, 0.55);
        TW.add(matSteel, C(0.024, 0.024, 2.2, 6), 0, y - 1, s, 0, 0, -0.55);
        TW.add(matSteel, C(0.024, 0.024, 2.2, 6), s, y - 1, 0, 0.55, 0, 0);
        TW.add(matSteel, C(0.024, 0.024, 2.2, 6), s, y - 1, 0, -0.55, 0, 0);
      }
    }
    // work platforms with railings (two levels + top); the mid platform keeps a
    // gap on the +x face where the umbilical boom is mounted
    for (const py of [4.4, 8.8, 12.4]) {
      const gapX = py === 4.4;
      TW.add(matTread, uvShift(B(2.6, 0.1, 2.2), py * 0.13, 0.3), 0, py, 0);
      TW.add(matChassis, B(2.6, 0.12, 0.03), 0, py - 0.02, 1.11);
      TW.add(matChassis, B(2.6, 0.12, 0.03), 0, py - 0.02, -1.11);
      TW.add(matChassis, B(0.03, 0.12, 2.2), 1.29, py - 0.02, 0);
      TW.add(matChassis, B(0.03, 0.12, 2.2), -1.29, py - 0.02, 0);
      for (const [px, pz] of [[-1.25, -1.05], [0, -1.05], [1.25, -1.05], [-1.25, 1.05], [0, 1.05], [1.25, 1.05], [-1.25, 0], [1.25, 0]]) {
        if (gapX && px === 1.25 && pz === 0) continue;
        TW.add(matSteel, B(0.045, 1.0, 0.045), px, py + 0.55, pz);
      }
      for (const s of [-1.05, 1.05]) {
        TW.add(matSteel, B(2.55, 0.045, 0.045), 0, py + 1.05, s);
        TW.add(matSteel, B(2.55, 0.045, 0.045), 0, py + 0.6, s);
      }
      for (const s of [-1.25, 1.25]) {
        if (gapX && s > 0) continue;
        TW.add(matSteel, B(0.045, 0.045, 2.15), s, py + 1.05, 0);
        TW.add(matSteel, B(0.045, 0.045, 2.15), s, py + 0.6, 0);
      }
    }
    // umbilical boom bracket cantilevered off the mid platform edge
    TW.add(matChassis, B(0.55, 0.12, 0.26), 1.32, 4.42, 0);
    TW.add(matSteel, C(0.05, 0.05, 0.5, 8), 1.45, 4.62, 0);
    TW.add(matSteel, B(0.08, 0.1, 0.5), 1.28, 4.3, 0, 0, 0, 0.7);
    // service ladder up the -x face with safety cage
    for (const s of [-0.22, 0.22]) TW.add(matSteel, B(0.05, 12.6, 0.05), -0.85, 6.3, s);
    for (let y = 0.5; y < 12.5; y += 0.38) TW.add(matSteel, B(0.04, 0.04, 0.42), -0.85, y, 0);
    for (let y = 2.6; y < 12.2; y += 1.2) {
      TW.add(matSteel, TO(0.38, 0.02, Math.PI * 1.2, 12), -0.85, y, 0, Math.PI / 2, 0, Math.PI * 0.4);
    }
    // cable tray up a rear leg + cables
    TW.add(matChassis, B(0.3, 12.4, 0.05), 0.62, 6.2, 0.78);
    for (const s of [-0.14, 0.14]) TW.add(matChassis, B(0.04, 12.4, 0.12), 0.62 + s, 6.2, 0.72);
    for (const s of [-0.08, 0, 0.08]) TW.add(M.cable, C(0.022, 0.022, 12.3, 6), 0.62 + s, 6.2, 0.76);
    TW.add(matChassis, B(0.4, 0.5, 0.22), 0.62, 12.7, 0.7);
    // ---- loading crane jib over the pad (big silhouette read) ----
    TW.add(matGirder, uvScale(B(4.8, 0.26, 0.3), 4.6, 1), 1.7, 13.15, 0);
    TW.add(matGirder, B(0.3, 0.26, 0.3), 4.05, 13.15, 0);
    TW.add(matSteel, C(0.03, 0.03, 3.6, 6), 1.9, 13.9, 0, 0, 0, 1.25);       // tie-back
    TW.add(matChassis, B(0.5, 0.45, 0.45), 0.1, 13.05, 0);                    // winch house
    TW.add(matSteel, C(0.09, 0.09, 0.4, 10), 0.1, 13.0, 0, 0, 0, Math.PI / 2);
    TW.add(M.cable, C(0.022, 0.022, 2.4, 6), 3.6, 12.0, 0);                  // fall cable
    TW.add(matChassis, B(0.18, 0.3, 0.14), 3.6, 10.7, 0);                     // hook block
    TW.add(matSteel, TO(0.09, 0.026, Math.PI * 1.6, 10), 3.6, 10.42, 0);      // hook
    // floodlight pair on the mid platform aimed at the rail
    for (const pz of [-0.5, 0.5]) {
      TW.add(matChassis, B(0.16, 0.2, 0.16), 1.16, 9.0, pz, 0.5, -0.6, 0);
    }
    for (const pz of [-0.5, 0.5]) WD.add(markerMat, P(0.13, 0.15), 1.24, 8.98, pz, -0.6, Math.PI / 2 - 0.6, 0);
    // top mast
    TW.add(matSteel, C(0.03, 0.045, 1.5, 8), 0, 13.65, 0);
    // warning strobes: blinking material, merged into the shadowless world bucket
    const strobeMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2a1a, emissiveIntensity: 0.15, roughness: 0.4 });
    WD.add(strobeMat, SP(0.1, 10, 7), 0, 14.45, 0);
    WD.add(strobeMat, SP(0.075, 8, 6), -1.25, 13.1, -1.0);
    WD.add(strobeMat, SP(0.075, 8, 6), 1.25, 13.1, 1.0);
    for (const [px, pz] of [[-1.25, -1.0], [1.25, 1.0]]) {
      TW.add(matSteel, C(0.02, 0.02, 0.5, 6), px, 12.78, pz);
    }
    // range ID boards zip-tied to the lower lattice (shared atlas cell)
    worldLabels.push({ img: rangeBoardImg, px: 96, w: 0.6, h: 0.6, x: 0, y: 2.4, z: -0.68, ry: Math.PI, base: tm });
    worldLabels.push({ img: rangeBoardImg, px: 96, w: 0.6, h: 0.6, x: 0.68, y: 3.3, z: 0, ry: Math.PI / 2, base: tm });
    // restore the pad-origin base for the remaining ground-level statics
    S.setBase(gm); WD.setBase(gm);

    // ---- erecting rail on pivot pedestal ----
    const pivot = new THREE.Group();
    pivot.position.set(0.4, 1.15, 0);
    g.add(pivot);
    const PV = bucketFor(pivot);
    PV.add(matTread, C(1.02, 1.02, 0.14, 18), 0, -0.02, 0);
    for (const sx of [-1, 1]) {
      PV.add(matChassis, B(0.24, 0.5, 0.7), sx * 0.55, 0.1, 0);
      PV.add(matChassis, C(0.14, 0.14, 0.18, 12), sx * 0.69, 0.28, 0, 0, 0, Math.PI / 2);
    }
    PV.flush();

    const rail = new THREE.Group();
    pivot.add(rail);
    const R = bucketFor(rail);
    // truss rail: two girder webs with lightening holes + top/bottom chords
    for (const sx of [-1, 1]) {
      R.add(matGirder, uvScale(B(0.09, 0.66, 12.6), 4.8, 1), sx * 0.39, 0, 1.8);
    }
    R.add(matChassis, B(0.86, 0.08, 12.6), 0, 0.3, 1.8);   // top chord plate
    R.add(matChassis, B(0.86, 0.08, 12.6), 0, -0.3, 1.8);  // bottom chord plate
    for (let z = -3.6; z <= 7.6; z += 1.6) R.add(matChassis, B(0.88, 0.1, 0.14), 0, -0.31, z);
    // underside X-bracing + conduit + winch cable (this face reads from the base side)
    for (let z = -2.8; z <= 6.8; z += 1.6) {
      R.add(matChassis, B(0.05, 0.04, 1.78), 0, -0.34, z, 0, 0.5, 0);
      R.add(matChassis, B(0.05, 0.04, 1.78), 0, -0.34, z, 0, -0.5, 0);
    }
    R.add(matChassis, B(0.06, 0.08, 11.6), 0.3, -0.33, 2.0);
    R.add(matChassis, CZ(0.02, 0.02, 10.8, 6), -0.22, -0.32, 2.4);
    R.add(M.hazard, B(0.74, 0.55, 0.22), 0, 0, -0.6);
    R.add(redPaint, B(0.73, 0.53, 0.18), 0, 0, 7.85);
    // head sheave + fork at rail tip
    R.add(matChassis, C(0.2, 0.2, 0.1, 14), 0, 0.06, 8.0, 0, 0, Math.PI / 2);
    for (const sx of [-1, 1]) R.add(matChassis, B(0.05, 0.44, 0.5), sx * 0.1, 0.1, 7.95);
    // trolley carriage under the round
    R.add(matChassis, B(0.95, 0.26, 1.5), 0, 0.4, 0.6);
    for (const [sx, zz] of [[-0.44, 0.15], [0.44, 0.15], [-0.44, 1.05], [0.44, 1.05]]) {
      R.add(matChassis, C(0.1, 0.1, 0.09, 10), sx, 0.14, zz, 0, 0, Math.PI / 2);
    }
    // released hold-down clamp arms + cradle saddles
    for (const zz of [0.0, 1.2]) {
      for (const sx of [-1, 1]) R.add(matChassis, B(0.08, 0.5, 0.12), sx * 0.52, 0.68, zz, 0, 0, sx * 2.2);
    }
    for (const zz of [-1.6, 2.6]) {
      R.add(matChassis, TO(0.5, 0.05, Math.PI, 14), 0, 0.75, zz, 0, 0, Math.PI);
      R.add(matChassis, B(0.9, 0.22, 0.2), 0, 0.3, zz);
    }
    // winch drum + guard at rail rear
    R.add(matChassis, C(0.16, 0.16, 0.5, 12), 0, 0.12, -2.9, 0, 0, Math.PI / 2);
    R.add(matChassis, B(0.7, 0.08, 0.5), 0, 0.34, -2.9);
    R.flush();
    labelStrip(rail, [
      { text: 'SENTINEL LR-1', w: 1.9, h: 0.4, x: -0.445, y: 0, z: 3.6, ry: -Math.PI / 2 },
      { text: 'SENTINEL LR-1', w: 1.9, h: 0.4, x: 0.445, y: 0, z: 3.6, ry: Math.PI / 2 },
    ], { fg: '#33342e', font: 'bold 30px Arial' });
    const tubes = [{ cover: null, offset: new THREE.Vector3(0, 0.75, 4.0), used: false },
                   { cover: null, offset: new THREE.Vector3(0, 0.75, 4.0), used: false },
                   { cover: null, offset: new THREE.Vector3(0, 0.75, 4.0), used: false }];

    // ---- visible loaded round (hidden while a shot reloads) ----
    const roundMesh = new THREE.Group();
    {
      const RB = bucketFor(roundMesh);
      const noseMat = mkStd({ color: 0x2f3338, roughness: 0.28, metalness: 0.55, envMapIntensity: 1.7 });
      RB.add(matRound, CZ(0.44, 0.44, 7.6, 20), 0, 0, 0);
      RB.add(noseMat, new THREE.ConeGeometry(0.44, 1.9, 20).rotateX(Math.PI / 2), 0, 0, 4.75);
      RB.add(matBurnt, CZ(0.3, 0.4, 0.5, 14), 0, 0, -4.0);
      RB.add(matBurnt, CZ(0.26, 0.3, 0.18, 12), 0, 0, -4.3);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + Math.PI / 4;
        RB.add(matBurnt, B(0.05, 0.55, 1.2), Math.cos(a) * 0.55, Math.sin(a) * 0.55, -3.4, 0, 0, a);
      }
      // umbilical service port on the +x side
      RB.add(noseMat, B(0.1, 0.22, 0.34), 0.42, 0.12, 1.6);
      RB.flush();
      roundMesh.position.set(0, 0.75, 0.6);
      // only the body + nose need the shadow pass; fins/nozzle are worn trim
      roundMesh.traverse((o) => { if (o.isMesh) o.castShadow = o.material !== matBurnt; });
      rail.add(roundMesh);
    }

    for (const ax of [1.4, -1.0]) S.add(matChassis, B(0.26, 0.22, 0.26), ax, 0.78, -1.6);
    const hyd = hydraulics(g, { pos: new THREE.Vector3(1.4, 0.86, -1.6), node: g }, { pos: new THREE.Vector3(0.42, -0.1, 3.4), node: rail }, 0.1, 0.07);
    const hyd2 = hydraulics(g, { pos: new THREE.Vector3(-1.0, 0.86, -1.6), node: g }, { pos: new THREE.Vector3(-0.42, -0.1, 3.4), node: rail }, 0.1, 0.07);

    // ---- umbilical service arm (swings clear during launch) ----
    const armGroup = new THREE.Group();
    armGroup.position.set(-1.55, 4.85, 0);
    g.add(armGroup);
    const armYawExtended = -Math.atan2(1.26, 1.95);
    armGroup.rotation.y = armYawExtended;
    {
      const AB = bucketFor(armGroup);
      AB.add(matChassis, B(1.85, 0.16, 0.2), 0.92, 0, 0);
      AB.add(matChassis, B(0.09, 0.13, 0.85), 0.7, -0.26, 0, 0.85, 0, 0); // kick brace
      AB.add(matChassis, B(0.28, 0.42, 0.3), 1.86, -0.06, 0);
      for (const dy of [-0.16, 0.04]) AB.add(matChassis, C(0.03, 0.03, 0.16, 8), 2.04, dy, 0, 0, 0, Math.PI / 2);
      cableRun(AB, [[1.95, -0.25, 0.04], [2.2, -0.75, 0.18], [2.35, -0.4, 0.42], [2.3, -0.25, 0.6]], 0.04, matChassis);
      cableRun(AB, [[0.06, -0.06, 0.06], [0.7, -0.22, 0.1], [1.35, -0.16, 0.06], [1.8, -0.12, 0]], 0.028, matChassis);
      AB.flush();
    }

    // ---- spare rounds in white shipping canisters on cradles ----
    for (const [x, z, a] of [[4.4, -3.6, 0.5], [5.2, -1.2, 0.35]]) {
      const dirx = Math.cos(a), dirz = -Math.sin(a);
      S.add(matWhiteCan, uvShift(C(0.55, 0.55, 9.6, 18), x * 0.2, z * 0.2), x, 0.88, z, 0, a, Math.PI / 2);
      for (const s of [-4.9, 4.9]) {
        S.add(redPaint, C(0.55, 0.4, 0.35, 18), x + dirx * s, 0.88, z + dirz * s, 0, a, Math.PI / 2 * Math.sign(s));
        S.add(matSteel, TO(0.56, 0.02, TAU, 18), x + dirx * (s - Math.sign(s) * 0.18), 0.88, z + dirz * (s - Math.sign(s) * 0.18), 0, a + Math.PI / 2, 0);
      }
      for (const s of [-3.1, 0, 3.1]) S.add(matChassis, TO(0.57, 0.03, TAU, 18), x + dirx * s, 0.88, z + dirz * s, 0, a + Math.PI / 2, 0);
      for (const s of [-3, 3]) {
        for (const ss of [-1, 1]) {
          S.add(matChassis, B(0.12, 1.0, 0.16), x + dirx * s + ss * 0.45 * -dirz, 0.42, z + dirz * s + ss * 0.45 * dirx, 0, a, ss * 0.42);
        }
        S.add(matChassis, B(0.16, 0.14, 1.15), x + dirx * s, 0.14, z + dirz * s, 0, a + Math.PI / 2, 0);
        S.add(matSteel, TO(0.58, 0.025, Math.PI, 12), x + dirx * s, 0.88, z + dirz * s, 0, a + Math.PI / 2, Math.PI);
      }
      contactShadow(D, 10.6, 2.2, x, z, a);
    }

    // ---- ground cabling: tower -> pedestal + trench covers ----
    droop(S, [-2.35, 0.75, 0.7], [-0.75, 0.75, 0.35], 0.4, 0.04);
    droop(S, [-2.3, 0.75, -0.5], [-0.7, 0.75, -0.3], 0.5, 0.035);
    S.add(matTread, B(0.6, 0.05, 1.9), -1.5, 0.73, 0.05, 0, 0.12, 0);
    droop(S, [1.3, 0.72, -0.4], [3.6, 0.06, -3.2], 0.4, 0.045);
    droop(S, [0.9, 0.72, 1.0], [2.6, 0.06, 4.2], 0.5, 0.04);

    // ---- console pillar with status fixture ----
    S.add(matChassis, B(0.42, 1.25, 0.34), -2.5, 1.32, 1.5);
    S.add(matTread, B(0.3, 0.4, 0.04), -2.5, 1.5, 1.68);
    const light = statusFixture(S, g, -2.5, 2.1, 1.5);

    // ---- signage ----
    S.add(matChassis, B(2.6, 0.55, 0.07), 0, 1.35, -4.55);
    for (const sx of [-1.1, 1.1]) S.add(matSteel, C(0.035, 0.035, 0.75, 8), sx, 1.0, -4.55);
    worldLabels.push({ text: 'SENTINEL LR-1', w: 2.4, h: 0.44, x: 0, y: 1.35, z: -4.51, ry: Math.PI, bg: '#5a4632', base: gm });
    D.add(dangerMat, P(1.0, 0.38), 1.55, 0.6, 0, 0, Math.PI / 2, 0);
    D.add(dangerMat, P(1.0, 0.38), 0.4, 0.6, 1.14, 0, 0, 0);
    D.add(dangerMat, P(1.1, 0.4), -3.62, 1.6, 0.62, 0, -Math.PI / 2, 0);

    // ---- amber pad markers for night readability (sign posts + cradles) ----
    for (const sx of [-1.1, 1.1]) D.add(markerMat, B(0.07, 0.09, 0.07), sx, 1.68, -4.55);
    D.add(markerMat, B(0.07, 0.09, 0.07), -2.5, 2.0, 1.68);
    for (const [x, z] of [[4.4, -3.6], [5.2, -1.2]]) D.add(markerMat, B(0.08, 0.1, 0.08), x, 1.48, z);
    // (world buckets flush once after all rigs are built)

    ctx.world.colliders.push(makeColliderCyl(pad.position.x, pad.position.z, 5.0, 0, 2.2));
    ctx.world.colliders.push(makeColliderBox(
      pad.position.x + Math.cos(pad.heading) * -3.0, pad.position.z - Math.sin(pad.heading) * -3.0, 1.5, 1.5, pad.heading, 0, 13
    ));
    // full-length box colliders — gapped cylinders let the player slip inside
    // the canister mesh (camera fills with dark geometry)
    for (const [x, z, a] of [[4.4, -3.6, 0.5], [5.2, -1.2, 0.35]]) {
      const w = padWorld(pad, x, z);
      ctx.world.colliders.push(makeColliderBox(w.x, w.z, 5.4, 0.95, pad.heading + a, 0, 1.7));
    }

    // per-frame hook: strobes blink, umbilical arm tracks battery state,
    // pre-launch vapor vents from the round's service port
    let armK = 0;
    let ventAt = 0;
    const restElevation = 1.05;
    const _ventPos = new THREE.Vector3();
    function extraUpdate(battery, dt) {
      const t = ctx.time.now % 1.6;
      strobeMat.emissiveIntensity = (t < 0.07 || (t > 0.24 && t < 0.31)) ? 3.8 : 0.15;
      const connected = battery.state === 'ready' && roundMesh.visible &&
        Math.abs(wrapAngle(pivot.rotation.y)) < 0.05 &&
        Math.abs(battery.currentElev - restElevation) < 0.05;
      armK = damp(armK, connected ? 0 : 1, 2.6, dt);
      armGroup.rotation.y = armYawExtended - armK * 1.95;
      // countdown venting: cold gas puffs off the umbilical port while arming
      if (battery.state === 'launching' && roundMesh.visible && ctx.time.now > ventAt) {
        ventAt = ctx.time.now + 0.22;
        _ventPos.set(0.45, 0.2, 1.6);
        roundMesh.localToWorld(_ventPos);
        ctx.effects.muzzlePuff(_ventPos, 0.32);
      }
    }

    return {
      group: g, turntable: pivot, elevGroup: rail, tubes, statusLight: light, markerMat,
      restElevation, fireElevation: 1.45, elevAxis: 'x', elevSign: -1,
      hydUpdaters: [hyd, hyd2],
      muzzleForward: new THREE.Vector3(0, 0, 1),
      isSentinel: true,
      roundMesh,
      extraUpdate,
    };
  }

  // =================================================== battery runtime
  const _q = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const _dir = new THREE.Vector3();

  class Battery {
    constructor(def, rig) {
      this.def = def;
      this.id = def.id;
      this.rig = rig;
      this.ammo = def.ammo;
      this.state = 'ready'; // ready | slewing | launching | reload | empty
      this.readyIn = 0;
      this.targetAz = null; // world azimuth to face
      this.currentElev = rig.restElevation;
      this.targetElev = rig.restElevation;
      this.launchTimer = -1;
      this.pendingTrack = null;
      this.tubeIndex = 0;
      this.applyElevation();
    }
    get displayState() {
      if (this.ammo <= 0 && this.state !== 'launching') return 'EMPTY';
      switch (this.state) {
        case 'ready': return 'READY';
        case 'slewing': return 'SLEWING';
        case 'launching': return 'LAUNCHING';
        case 'reload': return 'RELOADING';
        default: return this.state.toUpperCase();
      }
    }
    canAccept() { return this.ammo > 0 && (this.state === 'ready' || this.state === 'slewing'); }
    applyElevation() {
      // rotate around x by -elev so the +z muzzle axis tips upward
      this.rig.elevGroup.rotation.x = -this.currentElev;
    }
    /** Point launcher toward a world position (azimuth only + set fire elevation). */
    pointAt(worldPos) {
      const gp = this.rig.group.position;
      this.targetAz = Math.atan2(worldPos.x - gp.x, worldPos.z - gp.z);
      this.targetElev = this.rig.fireElevation;
      if (this.state === 'ready') this.state = 'slewing';
    }
    relax() {
      this.targetAz = null;
      this.targetElev = this.rig.restElevation;
    }
    /** world-space muzzle position + direction */
    muzzle(outPos, outDir) {
      const r = this.rig;
      const tube = r.tubes[Math.min(this.tubeIndex, r.tubes.length - 1)];
      outPos.copy(tube.offset);
      r.elevGroup.localToWorld(outPos);
      outDir.set(0, 0, 1).applyQuaternion(r.elevGroup.getWorldQuaternion(_q));
      return outPos;
    }
    /** begin launch sequence; interceptor spawns after launchDelay */
    launch(track) {
      if (!this.canAccept()) return false;
      this.state = 'launching';
      this.launchTimer = this.def.launchDelay;
      this.pendingTrack = track;
      ctx.events.emit('battery-launching', { battery: this, track });
      return true;
    }
    update(dt) {
      const r = this.rig;
      // slew
      if (this.targetAz !== null) {
        const cur = r.group.rotation.y + (r.turntable ? r.turntable.rotation.y : 0);
        const desiredLocal = wrapAngle(this.targetAz - r.group.rotation.y);
        if (r.turntable) {
          r.turntable.rotation.y = stepAngle(r.turntable.rotation.y, desiredLocal, this.def.slewRate * dt * (r.slewMul || 1));
        } else {
          r.group.rotation.y = stepAngle(r.group.rotation.y, this.targetAz, this.def.slewRate * dt * 0.55);
        }
        const err = Math.abs(wrapAngle(this.targetAz - (r.group.rotation.y + (r.turntable ? r.turntable.rotation.y : 0))));
        if (this.state === 'slewing' && err < 0.02 && Math.abs(this.currentElev - this.targetElev) < 0.02) {
          this.state = 'ready';
          ctx.events.emit('battery-laid', { battery: this });
        }
        void cur;
      }
      // elevation
      this.currentElev = damp(this.currentElev, this.targetElev, 2.2, dt);
      this.applyElevation();
      for (const u of r.hydUpdaters) u();
      // launch recoil: short kick along the rack -z, purely visual
      if (r.recoilNode) {
        r.recoil = Math.max(0, r.recoil - dt * 2.2);
        const k = r.recoil;
        r.recoilNode.position.z = r.recoilBase - r.recoilAmp * k * k * (3 - 2 * k);
      }

      // launch countdown
      if (this.state === 'launching') {
        this.launchTimer -= dt;
        if (this.launchTimer <= 0) {
          this.fire();
        }
      }
      // reload
      if (this.state === 'reload') {
        this.readyIn -= dt;
        if (this.readyIn <= 0) {
          this.state = this.ammo > 0 ? 'ready' : 'empty';
          if (this.ammo > 0) {
            if (this.rig.roundMesh) this.rig.roundMesh.visible = true;
            ctx.events.emit('battery-ready', { battery: this });
          }
        }
      }
      // status light
      const mat = r.statusLight.material;
      if (this.ammo <= 0) { mat.emissive.setHex(0xff2222); mat.emissiveIntensity = 1.2; }
      else if (this.state === 'ready') { mat.emissive.setHex(0x22ff44); mat.emissiveIntensity = 2.4; }
      else if (this.state === 'launching') { mat.emissive.setHex(0xff8822); mat.emissiveIntensity = 2.6 + Math.sin(ctx.time.now * 20) * 2.2; }
      else { mat.emissive.setHex(0xffaa22); mat.emissiveIntensity = 1.8; }
      if (r.extraUpdate) r.extraUpdate(this, dt);
    }
    fire() {
      const track = this.pendingTrack;
      this.pendingTrack = null;
      this.ammo -= 1;
      this.state = 'reload';
      this.readyIn = this.def.reloadTime;
      const tube = this.rig.tubes[Math.min(this.tubeIndex, this.rig.tubes.length - 1)];
      this.muzzle(_v, _dir);
      // pop the cover + reveal muzzle scorch
      if (tube.hasCover) {
        tube.hide();
        ctx.effects.coverPop(_v, _dir);
      }
      if (this.rig.recoilNode) this.rig.recoil = 1;
      if (this.rig.roundMesh) this.rig.roundMesh.visible = false;
      this.tubeIndex = (this.tubeIndex + 1) % this.rig.tubes.length;
      ctx.interceptors.launch(this, track, _v.clone(), _dir.clone());
      ctx.events.emit('interceptor-launched', { battery: this, track });
    }
    resetAmmo() {
      this.ammo = this.def.ammo;
      this.state = 'ready';
      this.readyIn = 0;
      this.tubeIndex = 0;
      this.pendingTrack = null;
      this.launchTimer = -1;
      for (const t of this.rig.tubes) t.used = false;
      if (this.rig.resetWear) this.rig.resetWear();
      if (this.rig.roundMesh) this.rig.roundMesh.visible = true;
    }
  }

  const rigs = {
    patriot: buildRampart(pads.patriot),
    thaad: buildHalberd(pads.thaad),
    sentinel: buildSentinel(pads.sentinel),
  };
  // one flush for BOTH world-merged rigs: one mesh per material + one label atlas
  WS.flush();
  WD.flush({ shadow: false });
  labelStrip(staticRoot, worldLabels);
  for (const id of ['patriot', 'thaad', 'sentinel']) {
    const b = new Battery(BATTERY_DEFS[id], rigs[id]);
    list.push(b);
    byId.set(id, b);
  }

  return {
    list,
    staticRoot, // world-merged static meshes (exposed for perf probes)
    get(id) { return byId.get(id); },
    update(dt) {
      // day/night material state: sun-bounce emissive off at night, marker
      // lamps + headlights on with the floodlights (shared mats, set once)
      const night = ctx.weather.floodlightsOn;
      const dim = night ? 0.25 : 1;
      if (dim !== lastBounceDim) {
        lastBounceDim = dim;
        for (const [m, k] of bounceMats) m.emissiveIntensity = k * dim;
        lensMat.emissiveIntensity = night ? 2.6 : 0;
      }
      markerMat.emissiveIntensity = night ? 6.0 : 0.35;
      for (const b of list) b.update(dt);
    },
    resetAll() { for (const b of list) { b.resetAmmo(); b.relax(); } },
  };
}
