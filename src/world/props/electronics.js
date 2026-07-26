// Office electronics prop library — owner: fable3a.
// Also hosts the shared prop-material infrastructure used by furniture.js and
// clutter.js:
//   - ONE emissive "screens" atlas material (monitor UIs, cam feeds, TV, LEDs)
//   - ONE lit "print" atlas material (whiteboards, paper, keyboards, covers)
//   - ONE vertex-tinted material for small colored plastics/fabrics
// Keeping everything on 3 shared materials keeps the per-room merged batches
// (and therefore draw calls) small. All canvas content is original fictional
// UI ("NorthstarOS" — the game's own brand), drawn deterministically.

import * as THREE from 'three';
import { registerProp } from './index.js';
import { getMaterial } from '../materials.js';
import { Rng } from '../../core/rng.js';

// ---------------------------------------------------------------------------
// Shared geometry helpers (exported for furniture.js / clutter.js)
// ---------------------------------------------------------------------------

function resolveMat(mat) { return typeof mat === 'string' ? getMaterial(mat) : mat; }

function applyRot(mesh, o) {
  if (o.rx) mesh.rotation.x = o.rx;
  if (o.ry) mesh.rotation.y = o.ry;
  if (o.rz) mesh.rotation.z = o.rz;
}

export function box(parent, mat, w, h, d, x, y, z, o = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (o.tint != null) tintGeo(geo, o.tint);
  const m = new THREE.Mesh(geo, o.tint != null ? getTintMat() : resolveMat(mat));
  m.position.set(x, y, z);
  applyRot(m, o);
  parent.add(m);
  return m;
}

export function cyl(parent, mat, rt, rb, h, x, y, z, o = {}) {
  const geo = new THREE.CylinderGeometry(rt, rb, h, o.seg || 10, 1, !!o.open);
  if (o.tint != null) tintGeo(geo, o.tint);
  const m = new THREE.Mesh(geo, o.tint != null ? getTintMat() : resolveMat(mat));
  m.position.set(x, y, z);
  applyRot(m, o);
  parent.add(m);
  return m;
}

export function sph(parent, mat, r, x, y, z, o = {}) {
  const geo = new THREE.SphereGeometry(r, o.seg || 9, o.seg ? Math.max(6, o.seg - 2) : 7);
  if (o.tint != null) tintGeo(geo, o.tint);
  const m = new THREE.Mesh(geo, o.tint != null ? getTintMat() : resolveMat(mat));
  m.position.set(x, y, z);
  if (o.sx || o.sy || o.sz) m.scale.set(o.sx || 1, o.sy || 1, o.sz || 1);
  applyRot(m, o);
  parent.add(m);
  return m;
}

export function torus(parent, mat, r, tube, x, y, z, o = {}) {
  const geo = new THREE.TorusGeometry(r, tube, o.tseg || 6, o.seg || 12, o.arc || Math.PI * 2);
  if (o.tint != null) tintGeo(geo, o.tint);
  const m = new THREE.Mesh(geo, o.tint != null ? getTintMat() : resolveMat(mat));
  m.position.set(x, y, z);
  applyRot(m, o);
  parent.add(m);
  return m;
}

export function tube(parent, mat, points, r, x, y, z, o = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  const geo = new THREE.TubeGeometry(curve, o.seg || 10, r, o.rseg || 5, false);
  if (o.tint != null) tintGeo(geo, o.tint);
  const m = new THREE.Mesh(geo, o.tint != null ? getTintMat() : resolveMat(mat));
  m.position.set(x, y, z);
  applyRot(m, o);
  parent.add(m);
  return m;
}

export function C(x0, y0, z0, x1, y1, z1, surface = 'wood', extra = {}) {
  return { x0, y0, z0, x1, y1, z1, surface, ...extra };
}

// ---------------------------------------------------------------------------
// Shared materials
// ---------------------------------------------------------------------------

const shared = {};

// Vertex-tinted matte material: every colored non-textured bit (binders,
// mugs, foliage, sticky pads…) shares this one material.
export function getTintMat() {
  if (!shared.tint) {
    shared.tint = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.82, metalness: 0, vertexColors: true,
    });
    shared.tint.name = 'prop_tint';
  }
  return shared.tint;
}

const tintColor = new THREE.Color();
export function tintGeo(geo, hex) {
  tintColor.setHex(hex).convertSRGBToLinear();
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = tintColor.r; arr[i * 3 + 1] = tintColor.g; arr[i * 3 + 2] = tintColor.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// Semi-transparent bottle/glassware material
export function getBottleMat() {
  if (!shared.bottle) {
    shared.bottle = new THREE.MeshStandardMaterial({
      color: 0xbfd8e6, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.45,
    });
    shared.bottle.name = 'prop_bottle';
  }
  return shared.bottle;
}

// ---------------------------------------------------------------------------
// Screen atlas (emissive). 1024x1024. Rects in px: [x, y, w, h].
// ---------------------------------------------------------------------------

const SCREEN_RECTS = {
  spreadsheet: [0, 0, 256, 256], dashboard: [256, 0, 256, 256],
  code: [512, 0, 256, 256], memo: [768, 0, 256, 256],
  login: [0, 256, 256, 256], off: [256, 256, 256, 256],
  cam0: [512, 256, 256, 256], cam1: [768, 256, 256, 256],
  cam2: [0, 512, 256, 256], cam3: [256, 512, 256, 256],
  cam4: [512, 512, 256, 256], cam5: [768, 512, 256, 256],
  tv: [0, 768, 256, 256], projection: [256, 768, 256, 256],
  clock: [512, 768, 160, 160], lamp: [680, 768, 80, 160],
  copier: [512, 936, 160, 80], ledstrip: [512, 1016, 240, 8],
  led_g: [768, 768, 8, 8], led_a: [780, 768, 8, 8], led_b: [792, 768, 8, 8],
  phonepad: [768, 800, 64, 64],
};

// screen content variants monitors cycle through
export const SCREEN_VARIANTS = ['spreadsheet', 'dashboard', 'code', 'memo', 'login'];

function ctx2d(size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  return c.getContext('2d');
}

function txt(g, s, x, y, px, color, font = 'sans-serif', weight = '') {
  g.fillStyle = color;
  g.font = `${weight} ${px}px ${font}`.trim();
  g.fillText(s, x, y);
}

function drawSpreadsheet(g, x, y, rng) {
  g.fillStyle = '#c8d2d8'; g.fillRect(x, y, 256, 256);
  g.fillStyle = '#2d4a63'; g.fillRect(x, y, 256, 22);
  txt(g, 'NorthstarOS Sheets — Q3-BUDGET.nsx', x + 6, y + 15, 10, '#cfe4f2', 'monospace');
  g.fillStyle = '#a9b6bf'; g.fillRect(x, y + 22, 256, 14);
  for (let c = 0; c < 7; c++) txt(g, String.fromCharCode(65 + c), x + 12 + c * 36, y + 33, 9, '#3d4a55', 'monospace');
  for (let r = 0; r < 13; r++) {
    const ry = y + 36 + r * 17;
    g.fillStyle = r % 2 ? '#dee6ea' : '#e8eef1'; g.fillRect(x, ry, 256, 17);
    for (let c = 0; c < 7; c++) {
      if (rng.chance(0.75)) txt(g, (rng.range(1, 990) | 0).toLocaleString(), x + 4 + c * 36, ry + 12, 8, '#43525c', 'monospace');
    }
  }
  g.strokeStyle = 'rgba(60,80,95,0.25)';
  for (let c = 1; c < 8; c++) { g.beginPath(); g.moveTo(x + c * 36, y + 22); g.lineTo(x + c * 36, y + 256); g.stroke(); }
  g.strokeStyle = '#e09a3e'; g.lineWidth = 2; g.strokeRect(x + 76, y + 104, 36, 17); g.lineWidth = 1;
}

function drawDashboard(g, x, y, rng) {
  g.fillStyle = '#10161d'; g.fillRect(x, y, 256, 256);
  txt(g, 'NORTHSTAR OPS — FACILITY DASHBOARD', x + 8, y + 16, 9, '#7fd2ff', 'monospace', 'bold');
  const cards = [['POWER', '98.2%', '#7dd87d'], ['HVAC', '61.4%', '#7fd2ff'], ['UPTIME', '312d', '#ffb454']];
  for (let i = 0; i < 3; i++) {
    const cx = x + 8 + i * 82;
    g.fillStyle = '#182230'; g.fillRect(cx, y + 26, 74, 46);
    txt(g, cards[i][0], cx + 6, y + 40, 8, '#5d7284', 'monospace');
    txt(g, cards[i][1], cx + 6, y + 62, 15, cards[i][2], 'monospace', 'bold');
  }
  g.fillStyle = '#182230'; g.fillRect(x + 8, y + 82, 240, 90);
  g.strokeStyle = '#7fd2ff'; g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const px = x + 12 + i * 9.7, py = y + 160 - rng.range(4, 68);
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.stroke();
  g.strokeStyle = 'rgba(127,210,255,0.18)';
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x + 8, y + 100 + i * 20); g.lineTo(x + 248, y + 100 + i * 20); g.stroke(); }
  for (let i = 0; i < 10; i++) {
    g.fillStyle = i === 6 ? '#ffb454' : '#3e7ea6';
    g.fillRect(x + 12 + i * 24, y + 240 - rng.range(10, 55), 16, 60);
  }
  txt(g, 'ZONE LOAD', x + 8, y + 188, 8, '#5d7284', 'monospace');
}

function drawCode(g, x, y, rng) {
  g.fillStyle = '#0d1218'; g.fillRect(x, y, 256, 256);
  g.fillStyle = '#141b24'; g.fillRect(x, y, 26, 256);
  const cols = ['#7fd2ff', '#9db4c6', '#7dd87d', '#ffb454', '#c792ea'];
  for (let r = 0; r < 21; r++) {
    const ry = y + 14 + r * 11.6;
    txt(g, String(r + 40), x + 4, ry, 8, '#3d4c58', 'monospace');
    let px = x + 32 + rng.int(0, 3) * 14;
    const words = rng.int(2, 5);
    for (let wi = 0; wi < words; wi++) {
      const w = rng.range(14, 46);
      g.fillStyle = cols[rng.int(0, cols.length - 1)];
      g.globalAlpha = 0.85;
      g.fillRect(px, ry - 7, w, 7);
      g.globalAlpha = 1;
      px += w + 8;
      if (px > x + 236) break;
    }
  }
  txt(g, 'telemetry_relay.ns — nsc build 4.1', x + 32, y + 252, 8, '#5d7284', 'monospace');
}

function drawMemo(g, x, y, rng) {
  g.fillStyle = '#b9bfc2'; g.fillRect(x, y, 256, 256);
  g.fillStyle = '#e7e5dc'; g.fillRect(x + 24, y + 10, 208, 236);
  txt(g, 'NORTHSTAR DYNAMICS', x + 38, y + 34, 11, '#2d4a63', 'sans-serif', 'bold');
  txt(g, 'INTERNAL MEMO — FACILITIES', x + 38, y + 48, 8, '#6b7076');
  g.fillStyle = '#8a8f94';
  for (let r = 0; r < 15; r++) {
    let px = x + 38;
    const ry = y + 66 + r * 11;
    while (px < x + 200) {
      const w = rng.range(10, 34);
      g.fillRect(px, ry, Math.min(w, x + 212 - px), 5);
      px += w + 5;
    }
    if (rng.chance(0.15)) r++; // paragraph gaps
  }
}

function drawLogin(g, x, y) {
  const grad = g.createLinearGradient(x, y, x, y + 256);
  grad.addColorStop(0, '#0b1826'); grad.addColorStop(1, '#122c44');
  g.fillStyle = grad; g.fillRect(x, y, 256, 256);
  // four-point star, elongated north limb (motif reference, drawn simply)
  const cx = x + 128, cy = y + 88;
  g.fillStyle = '#7fd2ff';
  g.beginPath();
  g.moveTo(cx, cy - 40); g.lineTo(cx + 8, cy - 8); g.lineTo(cx + 30, cy);
  g.lineTo(cx + 8, cy + 8); g.lineTo(cx, cy + 30); g.lineTo(cx - 8, cy + 8);
  g.lineTo(cx - 30, cy); g.lineTo(cx - 8, cy - 8); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(127,210,255,0.5)'; g.beginPath(); g.arc(cx, cy, 46, 0, Math.PI * 2); g.stroke();
  g.textAlign = 'center';
  txt(g, 'NorthstarOS', cx, cy + 74, 17, '#e8f1f8', 'sans-serif', 'bold');
  txt(g, 'WORKSTATION LOCKED', cx, cy + 92, 8, '#9db4c6', 'monospace');
  g.textAlign = 'left';
  g.fillStyle = '#1a2c3e'; g.fillRect(x + 64, y + 186, 128, 18);
  g.fillStyle = '#1a2c3e'; g.fillRect(x + 64, y + 210, 128, 18);
  txt(g, 'user', x + 70, y + 199, 9, '#5d7284', 'monospace');
  txt(g, '••••••••', x + 70, y + 223, 9, '#5d7284', 'monospace');
}

function drawOff(g, x, y) {
  g.fillStyle = '#05070a'; g.fillRect(x, y, 256, 256);
  const grad = g.createLinearGradient(x, y, x + 256, y + 256);
  grad.addColorStop(0.25, 'rgba(40,52,64,0)');
  grad.addColorStop(0.5, 'rgba(40,52,64,0.16)');
  grad.addColorStop(0.75, 'rgba(40,52,64,0)');
  g.fillStyle = grad; g.fillRect(x, y, 256, 256);
}

const CAM_LABELS = ['CAM 01 LOBBY', 'CAM 02 VESTIBULE', 'CAM 03 OPEN OFFICE', 'CAM 04 N CORRIDOR', 'CAM 05 GARAGE', 'CAM 06 LOADING'];

function drawCam(g, x, y, i, rng) {
  g.fillStyle = '#131a17'; g.fillRect(x, y, 256, 256);
  g.strokeStyle = 'rgba(190,210,200,0.55)'; g.lineWidth = 1;
  // simple one-point-perspective room sketch
  const hz = y + 96 + rng.range(-14, 14);
  const vx = x + 128 + rng.range(-40, 40);
  g.beginPath();
  g.moveTo(x, y + 250); g.lineTo(vx - 46, hz + 18); g.lineTo(vx + 46, hz + 18); g.lineTo(x + 256, y + 250);
  g.moveTo(vx - 46, hz + 18); g.lineTo(vx - 46, hz - 40); g.lineTo(vx + 46, hz - 40); g.lineTo(vx + 46, hz + 18);
  g.moveTo(x, y + 8); g.lineTo(vx - 46, hz - 40);
  g.moveTo(x + 256, y + 8); g.lineTo(vx + 46, hz - 40);
  g.stroke();
  // furniture blocks
  g.fillStyle = 'rgba(190,210,200,0.22)';
  const n = rng.int(2, 4);
  for (let k = 0; k < n; k++) {
    const bw = rng.range(26, 70), bh = rng.range(14, 34);
    const bx = x + rng.range(12, 240 - bw), by = hz + rng.range(24, 110);
    g.fillRect(bx, by, bw, bh);
    g.strokeRect(bx, by, bw, bh);
  }
  // scanlines + noise
  g.fillStyle = 'rgba(0,0,0,0.28)';
  for (let sy = y; sy < y + 256; sy += 4) g.fillRect(x, sy, 256, 1);
  g.fillStyle = 'rgba(220,240,230,0.9)';
  txt(g, CAM_LABELS[i], x + 8, y + 18, 10, 'rgba(220,240,230,0.9)', 'monospace', 'bold');
  txt(g, '06:57:1' + i, x + 194, y + 18, 10, 'rgba(220,240,230,0.9)', 'monospace');
  g.fillStyle = '#ff5a4e'; g.beginPath(); g.arc(x + 244, y + 240, 4, 0, Math.PI * 2); g.fill();
  txt(g, 'REC', x + 216, y + 244, 9, 'rgba(220,240,230,0.8)', 'monospace');
}

function drawTv(g, x, y, rng) {
  g.fillStyle = '#0c1420'; g.fillRect(x, y, 256, 256);
  g.fillStyle = '#12233a'; g.fillRect(x, y, 256, 30);
  txt(g, 'NDN', x + 8, y + 22, 16, '#7fd2ff', 'sans-serif', 'bold');
  txt(g, 'NORTHERN DESK NETWORK — LIVE', x + 52, y + 20, 8, '#9db4c6', 'monospace');
  // storm map panel
  g.fillStyle = '#152435'; g.fillRect(x + 8, y + 40, 152, 130);
  g.strokeStyle = 'rgba(127,210,255,0.4)';
  g.beginPath();
  g.moveTo(x + 20, y + 150);
  for (let i = 1; i < 8; i++) g.lineTo(x + 20 + i * 17, y + 150 - rng.range(0, 90));
  g.stroke();
  g.fillStyle = 'rgba(230,240,248,0.75)';
  for (let i = 0; i < 40; i++) g.fillRect(x + 12 + rng.range(0, 142), y + 44 + rng.range(0, 120), 2, 2);
  txt(g, 'WHITEOUT ADVISORY', x + 14, y + 56, 9, '#e8f1f8', 'monospace', 'bold');
  // side headlines
  for (let i = 0; i < 4; i++) {
    g.fillStyle = '#152435'; g.fillRect(x + 168, y + 40 + i * 33, 80, 27);
    g.fillStyle = '#8ea6b8'; g.fillRect(x + 172, y + 48 + i * 33, 66, 4); g.fillRect(x + 172, y + 56 + i * 33, 52, 4);
  }
  // ticker
  g.fillStyle = '#ffb454'; g.fillRect(x, y + 200, 256, 22);
  txt(g, 'STORM FRONT HOLDS — REGIONAL GRID STABLE — ', x + 6, y + 215, 10, '#1a1408', 'monospace', 'bold');
  g.fillStyle = '#0e1a2a'; g.fillRect(x, y + 222, 256, 34);
  txt(g, '-14°C  WIND NW 46', x + 8, y + 243, 10, '#9db4c6', 'monospace');
}

function drawProjection(g, x, y, rng) {
  // washed-out beamer image on a white screen surface
  g.fillStyle = '#cfd6d2'; g.fillRect(x, y, 256, 256);
  g.fillStyle = 'rgba(228,235,238,0.9)'; g.fillRect(x + 14, y + 14, 228, 228);
  txt(g, 'FY26 · Q3 REVIEW', x + 28, y + 46, 15, 'rgba(45,74,99,0.65)', 'sans-serif', 'bold');
  txt(g, 'NORTHSTAR DYNAMICS — CONFIDENTIAL', x + 28, y + 62, 7, 'rgba(93,114,132,0.6)');
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i === 3 ? 'rgba(224,154,62,0.55)' : 'rgba(62,126,166,0.45)';
    g.fillRect(x + 32 + i * 32, y + 200 - rng.range(20, 110), 22, 130);
  }
  g.strokeStyle = 'rgba(45,74,99,0.35)'; g.strokeRect(x + 28, y + 80, 200, 122);
}

function drawClock(g, x, y) {
  const r = 76, cx = x + 80, cy = y + 80;
  g.fillStyle = '#e8ebe9'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#3a4046'; g.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    g.beginPath();
    g.moveTo(cx + Math.sin(a) * (r - 12), cy - Math.cos(a) * (r - 12));
    g.lineTo(cx + Math.sin(a) * (r - 4), cy - Math.cos(a) * (r - 4));
    g.stroke();
  }
  // 07:42 — dawn assault
  const ha = ((7 + 42 / 60) / 12) * Math.PI * 2;
  const ma = (42 / 60) * Math.PI * 2;
  g.lineWidth = 6; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(ha) * (r - 34), cy - Math.cos(ha) * (r - 34)); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(ma) * (r - 14), cy - Math.cos(ma) * (r - 14)); g.stroke();
  g.strokeStyle = '#b8452f'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(2.1) * (r - 12), cy - Math.cos(2.1) * (r - 12)); g.stroke();
  g.fillStyle = '#3a4046'; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
}

function drawLamp(g, x, y) {
  const grad = g.createLinearGradient(x, y, x, y + 160);
  grad.addColorStop(0, '#c98d3e'); grad.addColorStop(0.5, '#e8b06a'); grad.addColorStop(1, '#f2cf9a');
  g.fillStyle = grad; g.fillRect(x, y, 80, 160);
}

function drawCopier(g, x, y) {
  g.fillStyle = '#0e1a14'; g.fillRect(x, y, 160, 80);
  txt(g, 'READY', x + 10, y + 26, 15, '#7dd87d', 'monospace', 'bold');
  txt(g, 'TRAY 2 · A4 · 100%', x + 10, y + 44, 9, '#9dbfa8', 'monospace');
  txt(g, 'TONER ▮▮▮▯', x + 10, y + 62, 9, '#ffb454', 'monospace');
  g.strokeStyle = '#2c4436'; g.strokeRect(x + 108, y + 12, 42, 56);
  g.fillStyle = '#2c4436'; g.fillRect(x + 114, y + 40, 30, 22);
}

function drawLedStrip(g, x, y, rng) {
  g.fillStyle = '#0a0c0e'; g.fillRect(x, y, 240, 8);
  for (let i = 0; i < 30; i++) {
    if (rng.chance(0.62)) {
      g.fillStyle = rng.chance(0.78) ? '#57e07d' : '#ffb454';
      g.fillRect(x + 2 + i * 8, y + 2, 3, 3);
    }
  }
}

function drawPhonePad(g, x, y) {
  g.fillStyle = '#22262a'; g.fillRect(x, y, 64, 64);
  g.fillStyle = '#0f2b1e'; g.fillRect(x + 6, y + 4, 52, 14);
  txt(g, 'LINE 2', x + 10, y + 14, 8, '#7dd87d', 'monospace');
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    g.fillStyle = '#3a4046'; g.fillRect(x + 9 + c * 17, y + 22 + r * 10.5, 13, 8);
  }
}

function buildScreenAtlas() {
  const g = ctx2d(1024);
  g.fillStyle = '#050608'; g.fillRect(0, 0, 1024, 1024);
  const rng = new Rng(360301);
  drawSpreadsheet(g, ...SCREEN_RECTS.spreadsheet.slice(0, 2), rng);
  drawDashboard(g, ...SCREEN_RECTS.dashboard.slice(0, 2), rng);
  drawCode(g, ...SCREEN_RECTS.code.slice(0, 2), rng);
  drawMemo(g, ...SCREEN_RECTS.memo.slice(0, 2), rng);
  drawLogin(g, ...SCREEN_RECTS.login.slice(0, 2));
  drawOff(g, ...SCREEN_RECTS.off.slice(0, 2));
  for (let i = 0; i < 6; i++) drawCam(g, ...SCREEN_RECTS['cam' + i].slice(0, 2), i, rng);
  drawTv(g, ...SCREEN_RECTS.tv.slice(0, 2), rng);
  drawProjection(g, ...SCREEN_RECTS.projection.slice(0, 2), rng);
  drawClock(g, ...SCREEN_RECTS.clock.slice(0, 2));
  drawLamp(g, ...SCREEN_RECTS.lamp.slice(0, 2));
  drawCopier(g, ...SCREEN_RECTS.copier.slice(0, 2));
  drawLedStrip(g, ...SCREEN_RECTS.ledstrip.slice(0, 2), rng);
  drawPhonePad(g, ...SCREEN_RECTS.phonepad.slice(0, 2));
  // LED dots
  g.fillStyle = '#57e07d'; g.fillRect(...SCREEN_RECTS.led_g);
  g.fillStyle = '#ffb454'; g.fillRect(...SCREEN_RECTS.led_a);
  g.fillStyle = '#6fb9ff'; g.fillRect(...SCREEN_RECTS.led_b);
  const tex = new THREE.CanvasTexture(g.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function getScreenMat() {
  if (!shared.screens) {
    shared.screens = new THREE.MeshStandardMaterial({
      color: 0x05070a, roughness: 0.35, metalness: 0,
      emissive: 0xffffff, emissiveMap: buildScreenAtlas(), emissiveIntensity: 1.6,
    });
    shared.screens.name = 'prop_screens';
  }
  return shared.screens;
}

function remapUv(geo, rects, key, atlas = 1024) {
  const r = rects[key];
  if (!r) { console.warn(`[props] unknown atlas rect '${key}'`); return geo; }
  const u0 = r[0] / atlas, u1 = (r[0] + r[2]) / atlas;
  const v0 = 1 - (r[1] + r[3]) / atlas, v1 = 1 - r[1] / atlas;
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + (u1 - u0) * uv.getX(i), v0 + (v1 - v0) * uv.getY(i));
  }
  return geo;
}

// A plane showing an atlas cell. Adds mesh to parent, faces +Z.
export function screen(parent, w, h, key, x, y, z, o = {}) {
  const geo = remapUv(new THREE.PlaneGeometry(w, h), SCREEN_RECTS, key);
  const m = new THREE.Mesh(geo, getScreenMat());
  m.position.set(x, y, z);
  applyRot(m, o);
  parent.add(m);
  return m;
}

// wrap a cylinder (lamp shades) in an atlas cell
export function screenCyl(parent, rt, rb, h, key, x, y, z, o = {}) {
  const geo = remapUv(new THREE.CylinderGeometry(rt, rb, h, o.seg || 10, 1, true), SCREEN_RECTS, key);
  const m = new THREE.Mesh(geo, getScreenMat());
  m.material.side = THREE.FrontSide;
  m.position.set(x, y, z);
  applyRot(m, o);
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------------------
// Print atlas (lit, non-emissive): whiteboards, paper, keyboards, covers.
// ---------------------------------------------------------------------------

const PRINT_RECTS = {
  wbA: [0, 0, 384, 256], wbB: [384, 0, 384, 256],
  keys: [768, 0, 256, 120], spines: [768, 120, 256, 136],
  calendar: [0, 256, 192, 256], magA: [192, 256, 160, 224], magB: [352, 256, 160, 224],
  photo: [512, 256, 160, 128], paper: [672, 256, 144, 200], badge: [816, 256, 96, 144],
};

function drawWhiteboard(g, x, y, variant, rng) {
  g.fillStyle = '#e2e6e4'; g.fillRect(x, y, 384, 256);
  g.fillStyle = 'rgba(150,160,158,0.12)';
  for (let i = 0; i < 8; i++) g.fillRect(x + rng.range(0, 340), y + rng.range(0, 220), rng.range(20, 60), rng.range(10, 30)); // ghosting
  if (variant === 0) {
    g.strokeStyle = '#2d4a63'; g.lineWidth = 3;
    txt(g, 'Q3 ROLLOUT', x + 22, y + 40, 24, '#2d4a63', 'sans-serif', 'bold');
    g.strokeRect(x + 22, y + 62, 110, 54); g.strokeRect(x + 168, y + 62, 110, 54);
    txt(g, 'relay v2', x + 34, y + 92, 15, '#2d4a63');
    txt(g, 'field kits', x + 180, y + 92, 15, '#2d4a63');
    g.beginPath(); g.moveTo(x + 132, y + 89); g.lineTo(x + 162, y + 89); g.lineTo(x + 154, y + 82); g.moveTo(x + 162, y + 89); g.lineTo(x + 154, y + 96); g.stroke();
    g.strokeStyle = '#3f7a4a';
    g.beginPath(); g.moveTo(x + 30, y + 150);
    for (let i = 1; i < 7; i++) g.lineTo(x + 30 + i * 40, y + 220 - rng.range(10, 80));
    g.stroke();
    txt(g, 'ship it →', x + 250, y + 160, 16, '#3f7a4a');
    g.strokeStyle = '#b8452f'; g.beginPath(); g.arc(x + 300, y + 200, 26, 0, Math.PI * 2); g.stroke();
    txt(g, 'fri?', x + 286, y + 206, 15, '#b8452f');
  } else {
    txt(g, 'STANDUP — WK 47', x + 22, y + 36, 19, '#3a5a44', 'sans-serif', 'bold');
    const items = ['ingest lag fixed', 'perms audit @ IT', 'snow day plan??', 'coffee fund: 46'];
    for (let i = 0; i < items.length; i++) {
      txt(g, '• ' + items[i], x + 30, y + 70 + i * 30, 16, i === 2 ? '#b8452f' : '#2d4a63');
    }
    g.strokeStyle = '#2d4a63'; g.lineWidth = 3;
    g.strokeRect(x + 240, y + 60, 118, 120);
    for (let i = 1; i < 4; i++) {
      g.beginPath(); g.moveTo(x + 240, y + 60 + i * 30); g.lineTo(x + 358, y + 60 + i * 30); g.stroke();
    }
    txt(g, 'owners', x + 258, y + 52, 13, '#3a5a44');
  }
}

function drawKeys(g, x, y) {
  g.fillStyle = '#23262a'; g.fillRect(x, y, 256, 120);
  g.fillStyle = '#3a3f45';
  for (let r = 0; r < 5; r++) {
    const n = r === 4 ? 8 : 15;
    for (let c = 0; c < n; c++) {
      const kw = r === 4 && c === 3 ? 70 : 13.5;
      const kx = x + 6 + (r === 4 && c > 3 ? c * 16.5 + 56 : c * 16.5);
      if (kx + kw > x + 250) continue;
      g.fillRect(kx, y + 8 + r * 22, kw, 17);
    }
  }
}

function drawSpines(g, x, y, rng) {
  const cols = ['#3e5a78', '#7a5438', '#4a5d4a', '#777d85', '#8a7a4a', '#54406b'];
  let px = x;
  while (px < x + 250) {
    const w = rng.range(16, 30);
    g.fillStyle = cols[rng.int(0, cols.length - 1)];
    g.fillRect(px, y, Math.min(w, x + 256 - px), 136);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.fillRect(px + 3, y + 14, Math.min(w, x + 256 - px) - 6, 22);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(px, y, 2, 136);
    px += w;
  }
}

function drawCalendar(g, x, y, rng) {
  g.fillStyle = '#ecebe4'; g.fillRect(x, y, 192, 256);
  g.fillStyle = '#2d4a63'; g.fillRect(x, y, 192, 44);
  txt(g, 'NOVEMBER', x + 46, y + 29, 17, '#e8f1f8', 'sans-serif', 'bold');
  g.strokeStyle = '#9aa0a4';
  for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
    g.strokeRect(x + 6 + c * 25.7, y + 54 + r * 32, 25.7, 32);
    const d = r * 7 + c - 4;
    if (d > 0 && d <= 30) txt(g, String(d), x + 10 + c * 25.7, y + 66 + r * 32, 9, '#4a4f53');
  }
  g.strokeStyle = '#b8452f'; g.lineWidth = 2;
  g.beginPath(); g.arc(x + 6 + 3.5 * 25.7 + rng.range(-20, 20), y + 54 + 2.5 * 32, 12, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 1;
}

function drawMag(g, x, y, title, hue) {
  g.fillStyle = hue; g.fillRect(x, y, 160, 224);
  g.fillStyle = 'rgba(255,255,255,0.92)';
  txt(g, title, x + 10, y + 34, 21, 'rgba(255,255,255,0.92)', 'sans-serif', 'bold');
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 10, y + 50, 140, 130);
  g.fillStyle = 'rgba(20,30,40,0.5)';
  g.beginPath(); g.moveTo(x + 20, y + 176); g.lineTo(x + 70, y + 86); g.lineTo(x + 120, y + 176); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.fillRect(x + 10, y + 192, 92, 8); g.fillRect(x + 10, y + 206, 68, 8);
}

function drawPhoto(g, x, y) {
  const grad = g.createLinearGradient(x, y, x, y + 128);
  grad.addColorStop(0, '#a8c4dc'); grad.addColorStop(1, '#e5edf4');
  g.fillStyle = grad; g.fillRect(x, y, 160, 128);
  g.fillStyle = '#5d7186';
  g.beginPath(); g.moveTo(x, y + 118); g.lineTo(x + 52, y + 40); g.lineTo(x + 96, y + 108); g.lineTo(x + 160, y + 118); g.closePath(); g.fill();
  g.fillStyle = '#8ba3b8';
  g.beginPath(); g.moveTo(x + 70, y + 118); g.lineTo(x + 118, y + 56); g.lineTo(x + 160, y + 112); g.closePath(); g.fill();
  g.fillStyle = '#eef4f9';
  g.beginPath(); g.moveTo(x + 40, y + 58); g.lineTo(x + 52, y + 40); g.lineTo(x + 64, y + 58); g.closePath(); g.fill();
}

function drawPaper(g, x, y, rng) {
  g.fillStyle = '#e9e7de'; g.fillRect(x, y, 144, 200);
  g.fillStyle = '#2d4a63'; g.fillRect(x + 12, y + 12, 60, 8);
  g.fillStyle = '#8a8f94';
  for (let r = 0; r < 17; r++) {
    let px = x + 12;
    while (px < x + 118) {
      const w = rng.range(8, 26);
      g.fillRect(px, y + 32 + r * 9, Math.min(w, x + 132 - px), 4);
      px += w + 4;
    }
  }
}

function drawBadge(g, x, y) {
  g.fillStyle = '#e4e8ea'; g.fillRect(x, y, 96, 144);
  g.fillStyle = '#2d4a63'; g.fillRect(x, y, 96, 30);
  txt(g, 'NORTHSTAR', x + 10, y + 20, 11, '#e8f1f8', 'sans-serif', 'bold');
  g.fillStyle = '#9db0bd'; g.fillRect(x + 22, y + 42, 52, 58);
  g.fillStyle = '#6b7d8a'; g.beginPath(); g.arc(x + 48, y + 64, 13, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(x + 48, y + 102, 22, Math.PI, 0); g.fill();
  g.fillStyle = '#4a4f53';
  g.fillRect(x + 14, y + 112, 68, 7); g.fillRect(x + 24, y + 126, 48, 6);
}

function buildPrintAtlas() {
  const g = ctx2d(1024);
  g.fillStyle = '#7c8084'; g.fillRect(0, 0, 1024, 1024);
  const rng = new Rng(360302);
  drawWhiteboard(g, ...PRINT_RECTS.wbA.slice(0, 2), 0, rng);
  drawWhiteboard(g, ...PRINT_RECTS.wbB.slice(0, 2), 1, rng);
  drawKeys(g, ...PRINT_RECTS.keys.slice(0, 2));
  drawSpines(g, ...PRINT_RECTS.spines.slice(0, 2), rng);
  drawCalendar(g, ...PRINT_RECTS.calendar.slice(0, 2), rng);
  drawMag(g, ...PRINT_RECTS.magA.slice(0, 2), 'SUMMIT', '#3e6e8e');
  drawMag(g, ...PRINT_RECTS.magB.slice(0, 2), 'FIELD+', '#7a5438');
  drawPhoto(g, ...PRINT_RECTS.photo.slice(0, 2));
  drawPaper(g, ...PRINT_RECTS.paper.slice(0, 2), rng);
  drawBadge(g, ...PRINT_RECTS.badge.slice(0, 2));
  const tex = new THREE.CanvasTexture(g.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function getPrintMat() {
  if (!shared.print) {
    shared.print = new THREE.MeshStandardMaterial({
      map: buildPrintAtlas(), roughness: 0.88, metalness: 0,
    });
    shared.print.name = 'prop_print';
  }
  return shared.print;
}

export function print(parent, w, h, key, x, y, z, o = {}) {
  const geo = remapUv(new THREE.PlaneGeometry(w, h), PRINT_RECTS, key);
  const m = new THREE.Mesh(geo, getPrintMat());
  m.position.set(x, y, z);
  applyRot(m, o);
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------------------
// Prop factories — electronics
// ---------------------------------------------------------------------------

function G(assetId, colliders) {
  const g = new THREE.Group();
  g.userData.assetId = assetId;
  if (colliders) g.userData.colliders = colliders;
  return g;
}

function pickScreen(rng, opts) {
  if (opts.screen) return opts.screen;
  return rng.chance(0.3) ? 'off' : SCREEN_VARIANTS[rng.int(0, SCREEN_VARIANTS.length - 1)];
}

// builds one 24" panel with stand, facing +Z, base at y=0; used by monitor +
// dual-arm setups.
function buildPanel(g, variant, x, y, z, ry = 0) {
  const sub = new THREE.Group();
  box(sub, 'plastic_dark', 0.555, 0.345, 0.02, 0, 0, 0);
  screen(sub, 0.525, 0.305, variant, 0, 0, 0.012);
  screen(sub, 0.012, 0.012, variant === 'off' ? 'led_a' : 'led_g', 0.245, -0.157, 0.012);
  sub.position.set(x, y, z);
  sub.rotation.y = ry;
  g.add(sub);
  return sub;
}

registerProp('monitor', (opts, rng) => {
  const g = G('ELEC-001', [C(-0.28, 0, -0.1, 0.28, 0.6, 0.06, 'metal', { blocksSight: false })]);
  box(g, 'plastic_dark', 0.21, 0.014, 0.16, 0, 0.007, -0.03);
  box(g, 'plastic_dark', 0.045, 0.24, 0.03, 0, 0.13, -0.065);
  buildPanel(g, pickScreen(rng, opts), 0, 0.42, 0, (rng.random() - 0.5) * 0.12);
  return g;
});

registerProp('monitor_dual', (opts, rng) => {
  const g = G('ELEC-002', [C(-0.58, 0, -0.14, 0.58, 0.68, 0.06, 'metal', { blocksSight: false })]);
  box(g, 'metal_dark', 0.24, 0.016, 0.2, 0, 0.008, -0.05);
  cyl(g, 'metal_dark', 0.02, 0.024, 0.48, 0, 0.25, -0.08);
  box(g, 'metal_dark', 1.0, 0.03, 0.035, 0, 0.47, -0.07);
  const a = opts.screenA || pickScreen(rng, opts);
  let b = opts.screenB || pickScreen(rng, opts);
  if (b === a && a !== 'off') b = 'off';
  buildPanel(g, a, -0.285, 0.47, -0.02, 0.14);
  buildPanel(g, b, 0.285, 0.47, -0.02, -0.14);
  return g;
});

registerProp('pc_tower', (opts, rng) => {
  const g = G('ELEC-003', [C(-0.09, 0, -0.23, 0.09, 0.42, 0.24, 'metal')]);
  box(g, 'plastic_dark', 0.175, 0.42, 0.44, 0, 0.21, 0);
  box(g, 'metal_dark', 0.176, 0.4, 0.02, 0, 0.21, 0.225);
  box(g, 'plastic_dark', 0.13, 0.012, 0.005, 0, 0.34, 0.236); // drive slot
  screen(g, 0.01, 0.01, rng.chance(0.8) ? 'led_g' : 'led_a', 0.05, 0.06, 0.237);
  return g;
});

registerProp('keyboard', () => {
  const g = G('ELEC-004');
  box(g, 'plastic_dark', 0.445, 0.016, 0.15, 0, 0.008, 0, { rx: 0.03 });
  print(g, 0.43, 0.142, 'keys', 0, 0.019, -0.002, { rx: -Math.PI / 2 + 0.03 });
  return g;
});

registerProp('mouse_pad', (opts, rng) => {
  const g = G('ELEC-005');
  box(g, 'rubber', 0.27, 0.004, 0.23, 0, 0.002, 0);
  sph(g, 'plastic_dark', 1, 0.05 + rng.range(-0.02, 0.02), 0.018, 0.01, { sx: 0.032, sy: 0.02, sz: 0.05, ry: rng.range(-0.5, 0.5) });
  return g;
});

registerProp('laptop', (opts, rng) => {
  const g = G('ELEC-006');
  const open = opts.open !== false;
  box(g, 'metal_brushed', 0.32, 0.016, 0.225, 0, 0.008, 0);
  if (open) {
    print(g, 0.29, 0.13, 'keys', 0, 0.017, 0.02, { rx: -Math.PI / 2 });
    const lid = new THREE.Group();
    box(lid, 'metal_brushed', 0.32, 0.21, 0.008, 0, 0.105, 0);
    screen(lid, 0.30, 0.19, pickScreen(rng, opts), 0, 0.105, 0.006);
    lid.position.set(0, 0.014, -0.108);
    lid.rotation.x = 0.32;
    g.add(lid);
  } else {
    box(g, 'metal_brushed', 0.32, 0.01, 0.225, 0, 0.021, 0);
  }
  return g;
});

registerProp('desk_phone', () => {
  const g = G('ELEC-007');
  box(g, 'plastic_dark', 0.2, 0.045, 0.165, 0, 0.028, 0, { rx: -0.14 });
  box(g, 'plastic_dark', 0.05, 0.028, 0.185, -0.07, 0.062, 0, { rx: -0.14 });
  box(g, 'plastic_dark', 0.052, 0.02, 0.04, -0.07, 0.075, -0.075, { rx: -0.14 });
  box(g, 'plastic_dark', 0.052, 0.02, 0.04, -0.07, 0.056, 0.078, { rx: -0.14 });
  screen(g, 0.075, 0.075, 'phonepad', 0.045, 0.058, 0.005, { rx: -Math.PI / 2 + 0.32 });
  return g;
});

registerProp('headset_stand', () => {
  const g = G('ELEC-008');
  cyl(g, 'plastic_dark', 0.05, 0.055, 0.012, 0, 0.006, 0);
  cyl(g, 'plastic_dark', 0.007, 0.007, 0.24, 0, 0.13, 0);
  torus(g, 'plastic_dark', 0.075, 0.011, 0, 0.2, 0, { arc: Math.PI, rz: 0 });
  cyl(g, null, 0.033, 0.033, 0.028, -0.078, 0.185, 0, { rz: Math.PI / 2, tint: 0x30353b });
  cyl(g, null, 0.033, 0.033, 0.028, 0.078, 0.185, 0, { rz: Math.PI / 2, tint: 0x30353b });
  return g;
});

registerProp('dock_station', () => {
  const g = G('ELEC-009');
  box(g, 'metal_dark', 0.2, 0.032, 0.09, 0, 0.016, 0, { rx: -0.12 });
  box(g, 'plastic_dark', 0.17, 0.012, 0.02, 0, 0.038, -0.01, { rx: -0.12 });
  screen(g, 0.008, 0.008, 'led_b', 0.08, 0.03, 0.036);
  return g;
});

registerProp('printer_desk', () => {
  const g = G('ELEC-010', [C(-0.23, 0, -0.19, 0.23, 0.32, 0.19, 'metal', { blocksSight: false })]);
  box(g, 'plastic_dark', 0.44, 0.05, 0.36, 0, 0.025, 0);
  box(g, 'plastic_light', 0.46, 0.2, 0.37, 0, 0.15, 0);
  box(g, 'plastic_dark', 0.46, 0.05, 0.37, 0, 0.275, -0.02);
  box(g, 'plastic_dark', 0.28, 0.008, 0.16, 0, 0.11, 0.24, { rx: 0.18 }); // out tray
  box(g, 'paper', 0.2, 0.004, 0.12, 0, 0.118, 0.235, { rx: 0.18 });
  box(g, 'paper', 0.21, 0.05, 0.01, 0, 0.32, -0.13, { rx: -0.25 }); // rear feed
  screen(g, 0.07, 0.03, 'copier', -0.14, 0.278, 0.16, { rx: -Math.PI / 2 + 0.4 });
  return g;
});

registerProp('copier_floor', () => {
  const g = G('ELEC-011', [
    C(-0.42, 0, -0.33, 0.42, 1.12, 0.33, 'metal'),
    C(-0.66, 0.4, -0.17, -0.42, 0.78, 0.17, 'metal', { blocksSight: false }),
  ]);
  box(g, 'plastic_dark', 0.72, 0.16, 0.58, 0, 0.08, 0);
  box(g, 'plastic_light', 0.76, 0.72, 0.62, 0, 0.54, 0);
  box(g, 'plastic_dark', 0.66, 0.09, 0.015, 0, 0.36, 0.312); // drawer gaps
  box(g, 'plastic_dark', 0.66, 0.09, 0.015, 0, 0.52, 0.312);
  box(g, 'aluminum', 0.1, 0.016, 0.016, 0.2, 0.4, 0.318);
  box(g, 'aluminum', 0.1, 0.016, 0.016, 0.2, 0.56, 0.318);
  box(g, 'plastic_light', 0.78, 0.1, 0.66, 0, 0.95, 0);
  box(g, 'plastic_dark', 0.52, 0.05, 0.46, -0.09, 1.04, 0, { rz: 0.015 }); // lid
  box(g, 'plastic_light', 0.3, 0.1, 0.42, 0.22, 1.07, 0); // feeder hump
  // side paper trays (west local -X)
  box(g, 'plastic_light', 0.26, 0.014, 0.3, -0.51, 0.62, 0, { rz: 0.1 });
  box(g, 'paper', 0.2, 0.01, 0.24, -0.5, 0.633, 0, { rz: 0.1 });
  box(g, 'plastic_light', 0.24, 0.014, 0.3, -0.5, 0.47, 0, { rz: 0.1 });
  // angled control panel
  const panel = new THREE.Group();
  box(panel, 'plastic_dark', 0.3, 0.02, 0.17, 0, 0, 0);
  screen(panel, 0.15, 0.075, 'copier', -0.05, 0.012, 0, { rx: -Math.PI / 2 });
  box(panel, 'aluminum', 0.02, 0.008, 0.02, 0.1, 0.012, 0.03);
  box(panel, 'aluminum', 0.02, 0.008, 0.02, 0.1, 0.012, -0.01);
  panel.position.set(0.22, 1.02, 0.24);
  panel.rotation.x = 0.42;
  g.add(panel);
  return g;
});

registerProp('projector_ceiling', () => {
  // pivot at the ceiling mount; place with explicit y (~ceiling height)
  const g = G('ELEC-012');
  box(g, 'metal_dark', 0.14, 0.02, 0.14, 0, -0.01, 0);
  cyl(g, 'aluminum', 0.015, 0.015, 0.3, 0, -0.17, 0);
  box(g, 'plastic_light', 0.36, 0.11, 0.28, 0, -0.38, 0);
  cyl(g, 'metal_dark', 0.036, 0.036, 0.025, 0.09, -0.38, 0.148, { rx: Math.PI / 2 });
  screen(g, 0.01, 0.01, 'led_g', -0.1, -0.36, 0.142);
  return g;
});

registerProp('screen_wall', () => {
  // pull-down projection screen; pivot floor at wall, faces +Z
  const g = G('ELEC-013');
  cyl(g, 'aluminum', 0.035, 0.035, 2.05, 0, 2.42, 0.02, { rz: Math.PI / 2 });
  box(g, 'metal_dark', 0.06, 0.06, 0.05, -1.0, 2.42, 0.02);
  box(g, 'metal_dark', 0.06, 0.06, 0.05, 1.0, 2.42, 0.02);
  screen(g, 1.9, 1.2, 'projection', 0, 1.78, 0.045);
  box(g, 'aluminum', 1.92, 0.035, 0.02, 0, 1.16, 0.045);
  return g;
});

registerProp('wall_clock', (opts) => {
  const g = G('ELEC-014');
  const y = opts.y ?? 2.4;
  cyl(g, 'plastic_dark', 0.185, 0.185, 0.04, 0, y, 0.025, { rx: Math.PI / 2, seg: 20 });
  screen(g, 0.34, 0.34, 'clock', 0, y, 0.048);
  return g;
});

registerProp('tv_panel', (opts) => {
  const g = G('ELEC-015');
  const y = opts.y ?? 1.55;
  box(g, 'metal_dark', 0.2, 0.3, 0.05, 0, y, 0.03);
  box(g, 'plastic_dark', 1.26, 0.74, 0.05, 0, y, 0.08);
  screen(g, 1.2, 0.68, opts.screen || 'tv', 0, y, 0.108);
  return g;
});

registerProp('security_wall', () => {
  const g = G('ELEC-016');
  box(g, 'metal_dark', 0.05, 1.16, 0.03, -0.52, 1.7, 0.015);
  box(g, 'metal_dark', 0.05, 1.16, 0.03, 0.52, 1.7, 0.015);
  let idx = 0;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const x = (col - 1) * 0.47, y = row ? 1.42 : 1.98;
      box(g, 'plastic_dark', 0.44, 0.29, 0.035, x, y, 0.04);
      screen(g, 0.41, 0.26, 'cam' + idx, x, y, 0.06);
      idx++;
    }
  }
  box(g, 'metal_dark', 1.5, 0.04, 0.03, 0, 1.12, 0.02);
  return g;
});

registerProp('ups_box', () => {
  const g = G('ELEC-017');
  box(g, 'metal_dark', 0.19, 0.3, 0.38, 0, 0.15, 0);
  box(g, 'plastic_dark', 0.15, 0.22, 0.01, 0, 0.15, 0.192);
  screen(g, 0.01, 0.01, 'led_a', 0.05, 0.25, 0.196);
  return g;
});

registerProp('switch_shelf', (opts, rng) => {
  // wall-mounted comms shelf; pivot floor at wall, faces +Z
  const g = G('ELEC-018');
  box(g, 'metal_painted', 0.56, 0.02, 0.3, 0, 1.58, 0.15);
  box(g, 'metal_painted', 0.04, 0.16, 0.26, -0.25, 1.5, 0.14);
  box(g, 'metal_painted', 0.04, 0.16, 0.26, 0.25, 1.5, 0.14);
  box(g, 'metal_dark', 0.48, 0.045, 0.24, 0, 1.62, 0.15);
  box(g, 'metal_dark', 0.48, 0.045, 0.24, 0, 1.7, 0.15);
  screen(g, 0.42, 0.014, 'ledstrip', 0, 1.62, 0.273);
  screen(g, 0.42, 0.014, 'ledstrip', 0, 1.705, 0.273);
  // drooping patch cables
  for (let i = 0; i < 3; i++) {
    const px = rng.range(-0.18, 0.18);
    tube(g, null, [[px, 1.6, 0.27], [px + 0.05, 1.44, 0.2], [px + 0.02, 1.3, 0.06]], 0.006, 0, 0, 0, { tint: 0x30507a });
  }
  return g;
});

registerProp('cable_bundle', (opts, rng) => {
  // floor cable run along local +X; tiny (distance-culled), no collider
  const g = G('ELEC-019');
  const len = opts.len || 2;
  const pts = [];
  const n = 5;
  for (let i = 0; i <= n; i++) {
    pts.push([(i / n) * len, 0.012, rng.range(-0.045, 0.045)]);
  }
  tube(g, 'rubber', pts, 0.013, 0, 0, 0, { seg: 12 });
  tube(g, null, pts.map((p) => [p[0], p[1] + 0.014, p[2] + 0.01]), 0.007, 0, 0, 0, { seg: 12, tint: 0x30507a });
  return g;
});

registerProp('cable_tray_wall', (opts, rng) => {
  // wall cable tray along local +X at ~2.2m; pivot floor at wall
  const g = G('ELEC-020');
  const len = opts.len || 3;
  box(g, 'metal_painted', len, 0.016, 0.13, len / 2, 2.18, 0.07);
  box(g, 'metal_painted', len, 0.07, 0.012, len / 2, 2.21, 0.008);
  box(g, 'metal_painted', len, 0.07, 0.012, len / 2, 2.21, 0.132);
  tube(g, 'rubber', [[0.02, 2.21, 0.06], [len * 0.5, 2.2, 0.05], [len - 0.02, 2.21, 0.07]], 0.014, 0, 0, 0, { seg: 8 });
  tube(g, null, [[0.02, 2.22, 0.09], [len * 0.5, 2.215, 0.1], [len - 0.02, 2.22, 0.08]], 0.009, 0, 0, 0, { seg: 8, tint: 0x30507a });
  // one drop to desk height
  const dx = rng.range(len * 0.25, len * 0.75);
  tube(g, 'rubber', [[dx, 2.18, 0.07], [dx + 0.06, 1.7, 0.045], [dx, 1.1, 0.03]], 0.011, 0, 0, 0, { seg: 8 });
  return g;
});
