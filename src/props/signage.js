import * as THREE from 'three';
import * as G from '../art/geometry.js';
import * as KIT from '../map/kit.js';
import { C, UI, rgbCss } from '../art/palette.js';
import { reg, OWNERS } from '../core/assets.js';
import { rngFor } from '../core/rng.js';

/**
 * SIGNAGE — Northstar Administrative Center
 * Owner: Fable 3.
 *
 * All printed graphics in the building are painted into ONE 4096×2048 canvas atlas
 * and rendered through ONE material, so every sign face in the level merges
 * into a single draw call. Sign builders return:
 *   { parts, faces, colliders }
 * where `parts` are normal KIT parts (backers, frames) that join the static
 * prop batch, and `faces` are { geometry, matrix } quads carrying atlas UVs
 * that dress.js merges via buildSignageMesh().
 *
 * Every string here is original fiction. Company: Northstar Administrative
 * Center. Divisions: Polar Logistics, Aurora Analytics, Meridian Facilities,
 * Northwind People Team.
 */

const P = KIT.part;
const BB = G.bevelBox;

const ATLAS_W = 4096;
const ATLAS_H = 2560; // WebGL2 handles NPOT with mips; book rows + notices pushed past 2048
const PAD = 6;

const FONT = '"Bahnschrift", "DIN Alternate", "Segoe UI", "Arial", sans-serif';

let atlasCanvas = null;
let atlasCtx = null;
let atlasTex = null;
let atlasMat = null;
const shelves = []; // { y, h, x } height-bucketed shelves for tight packing
let nextShelfY = PAD;
const REGIONS = new Map();

function ctx2d() {
  if (!atlasCanvas) {
    atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = ATLAS_W;
    atlasCanvas.height = ATLAS_H;
    atlasCtx = atlasCanvas.getContext('2d');
    atlasCtx.fillStyle = '#3a3f44';
    atlasCtx.fillRect(0, 0, ATLAS_W, ATLAS_H);
  }
  return atlasCtx;
}

/** Allocate (or fetch) an atlas region and paint it once. Returns UV rect. */
function region(key, wPx, hPx, draw) {
  let r = REGIONS.get(key);
  if (r) return r;
  const ctx = ctx2d();
  const w = Math.ceil(wPx);
  const h = Math.ceil(hPx);
  // Best-fit shelf: smallest shelf tall enough with remaining width
  let shelf = null;
  for (const s of shelves) {
    if (s.h >= h && s.x + w + PAD <= ATLAS_W && (!shelf || s.h < shelf.h)) shelf = s;
  }
  if (shelf && shelf.h > h * 1.6) {
    // Too wasteful — prefer a fresh, tighter shelf when space remains
    const sh = Math.ceil((h + 2) / 32) * 32;
    if (nextShelfY + sh + PAD <= ATLAS_H) shelf = null;
  }
  if (!shelf) {
    const sh = Math.ceil((h + 2) / 32) * 32;
    if (nextShelfY + sh + PAD > ATLAS_H) {
      console.error('[signage] atlas full — increase atlas dimensions');
      r = { u0: 0, v0: 0, u1: 0.001, v1: 0.001 };
      REGIONS.set(key, r);
      return r;
    }
    shelf = { y: nextShelfY, h: sh, x: PAD };
    shelves.push(shelf);
    nextShelfY += sh + PAD;
  }
  const x = shelf.x;
  const y = shelf.y;
  shelf.x += w + PAD;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  draw(ctx, w, h);
  ctx.restore();
  if (atlasTex) atlasTex.needsUpdate = true;
  r = {
    u0: x / ATLAS_W,
    v0: 1 - (y + h) / ATLAS_H,
    u1: (x + w) / ATLAS_W,
    v1: 1 - y / ATLAS_H,
  };
  REGIONS.set(key, r);
  return r;
}

/** Shared signage material (one draw call for every sign face in the level). */
export function signageMaterial() {
  if (atlasMat) return atlasMat;
  ctx2d();
  atlasTex = new THREE.CanvasTexture(atlasCanvas);
  atlasTex.colorSpace = THREE.SRGBColorSpace;
  atlasTex.anisotropy = 8;
  atlasTex.generateMipmaps = true;
  atlasTex.minFilter = THREE.LinearMipmapLinearFilter;
  atlasMat = new THREE.MeshStandardMaterial({ map: atlasTex, roughness: 0.55, metalness: 0.05 });
  atlasMat.name = 'signage.atlas';
  return atlasMat;
}

/** Face quad (w×h m) facing −Z at local origin, UV-mapped into the atlas region. */
function faceQuad(r, w, h, pos = [0, 0, 0], rot = [0, Math.PI, 0]) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, r.u0 + uv.getX(i) * (r.u1 - r.u0), r.v0 + uv.getY(i) * (r.v1 - r.v0));
  }
  uv.needsUpdate = true;
  return { geometry: g, matrix: G.matrixFrom(pos, rot), noProject: true, matName: 'signage.atlas' };
}

/** Merge collected face quads into one mesh with the shared atlas material. */
export function buildSignageMesh(faces) {
  if (!faces.length) return null;
  const merged = G.mergeParts(faces);
  const mesh = new THREE.Mesh(merged, signageMaterial());
  mesh.name = 'signage';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.userData.matName = 'plastic.smooth';
  mesh.userData.static = true;
  return mesh;
}

/* ------------------------------------------------------------------ */
/* SCREEN CONTENT ATLAS                                                 */
/*                                                                      */
/* Monitors, laptops, the conference display, the copier panel and the  */
/* CCTV bank all sample ONE 1024×1024 canvas used as both `map` and     */
/* `emissiveMap` of a single dedicated material, so every powered       */
/* screen in the level merges into one mesh + one draw call and reads   */
/* as CONTENT rather than a clipped white light source. Peak painted    */
/* luminance stays around #d8dde2 (~72% white).                         */
/* ------------------------------------------------------------------ */

const SCR_SIZE = 1024;
let scrCanvas = null;
let scrCtx = null;
let scrTex = null;
let scrMat = null;
let scrX = PAD;
let scrY = PAD;
let scrRowH = 0;
const SCR_REGIONS = new Map();

function scrCtx2d() {
  if (!scrCanvas) {
    scrCanvas = document.createElement('canvas');
    scrCanvas.width = SCR_SIZE;
    scrCanvas.height = SCR_SIZE;
    scrCtx = scrCanvas.getContext('2d');
    scrCtx.fillStyle = '#05070a';
    scrCtx.fillRect(0, 0, SCR_SIZE, SCR_SIZE);
  }
  return scrCtx;
}

function scrRegion(key, w, h, draw) {
  let r = SCR_REGIONS.get(key);
  if (r) return r;
  const ctx = scrCtx2d();
  if (scrX + w + PAD > SCR_SIZE) {
    scrX = PAD;
    scrY += scrRowH + PAD;
    scrRowH = 0;
  }
  if (scrY + h + PAD > SCR_SIZE) {
    console.error('[signage] screen atlas full');
    r = { u0: 0, v0: 0, u1: 0.001, v1: 0.001 };
    SCR_REGIONS.set(key, r);
    return r;
  }
  const x = scrX;
  const y = scrY;
  scrX += w + PAD;
  scrRowH = Math.max(scrRowH, h);
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  draw(ctx, w, h);
  ctx.restore();
  if (scrTex) scrTex.needsUpdate = true;
  r = { u0: x / SCR_SIZE, v0: 1 - (y + h) / SCR_SIZE, u1: (x + w) / SCR_SIZE, v1: 1 - y / SCR_SIZE };
  SCR_REGIONS.set(key, r);
  return r;
}

/** Dedicated screen material: content texture as map + emissiveMap (low intensity, legible). */
export function screenMaterial() {
  if (scrMat) return scrMat;
  scrCtx2d();
  scrTex = new THREE.CanvasTexture(scrCanvas);
  scrTex.colorSpace = THREE.SRGBColorSpace;
  scrTex.anisotropy = 8;
  scrTex.generateMipmaps = true;
  scrTex.minFilter = THREE.LinearMipmapLinearFilter;
  scrMat = new THREE.MeshStandardMaterial({
    map: scrTex,
    emissiveMap: scrTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.62,
    roughness: 0.3,
    metalness: 0,
  });
  scrMat.name = 'screen.atlas';
  return scrMat;
}

/* ---- screen content painters (all original fiction) ---- */

const SFONT = '"Bahnschrift", "Segoe UI", "Arial", sans-serif';
const MONO = '"Consolas", "Menlo", monospace';

function scrSpreadsheet() {
  return scrRegion('spreadsheet', 320, 180, (ctx, w, h) => {
    ctx.fillStyle = '#c9cdd2';
    ctx.fillRect(0, 0, w, h);
    // Ribbon + formula bar
    ctx.fillStyle = '#31555e';
    ctx.fillRect(0, 0, w, 18);
    ctx.fillStyle = '#e0e3e6';
    ctx.fillRect(0, 18, w, 10);
    ctx.fillStyle = '#9aa0a6';
    ctx.font = `600 8px ${SFONT}`;
    ctx.fillText('NS-LEDGER — Q3 consumables.xls', 6, 12);
    // Grid
    const x0 = 22;
    const y0 = 38;
    ctx.strokeStyle = '#aeb3b8';
    ctx.lineWidth = 1;
    for (let c = 0; c <= 9; c++) {
      ctx.beginPath();
      ctx.moveTo(x0 + c * 33, y0 - 10);
      ctx.lineTo(x0 + c * 33, h);
      ctx.stroke();
    }
    for (let r = 0; r <= 12; r++) {
      ctx.beginPath();
      ctx.moveTo(0, y0 + r * 12);
      ctx.lineTo(w, y0 + r * 12);
      ctx.stroke();
    }
    // Header band + row numbers
    ctx.fillStyle = '#b4bac0';
    ctx.fillRect(0, y0 - 10, w, 10);
    ctx.fillRect(0, y0 - 10, x0, h);
    const rnd = rngFor('scrSheet');
    ctx.font = `500 8px ${MONO}`;
    for (let r = 0; r < 11; r++) {
      for (let c = 0; c < 9; c++) {
        if (rnd() < 0.6) {
          ctx.fillStyle = c === 0 ? '#3c434a' : '#565d64';
          const vv = c === 0 ? `INV-${100 + r * 7}` : (rnd() * 900).toFixed(c % 3 === 1 ? 2 : 0);
          ctx.fillText(vv, x0 + c * 33 + 3, y0 + r * 12 + 9);
        }
      }
    }
    // Selection
    ctx.strokeStyle = '#1f7a68';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 + 3 * 33, y0 + 4 * 12, 33, 12);
  });
}

function scrMail() {
  return scrRegion('mail', 320, 180, (ctx, w, h) => {
    ctx.fillStyle = '#d0d4d9';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1d3a52';
    ctx.fillRect(0, 0, w, 16);
    ctx.fillStyle = '#cfe3f2';
    ctx.font = `700 9px ${SFONT}`;
    ctx.fillText('NORTHMAIL — inbox (14)', 6, 11);
    // Folder rail
    ctx.fillStyle = '#28303a';
    ctx.fillRect(0, 16, 62, h);
    ctx.fillStyle = '#8fa4b8';
    ctx.font = `500 7px ${SFONT}`;
    ['Inbox', 'Sent', 'Drafts', 'Facilities', 'Rota', 'Archive'].forEach((t, i) => ctx.fillText(t, 8, 32 + i * 14));
    // Message list
    ctx.fillStyle = '#e4e7ea';
    ctx.fillRect(62, 16, 108, h);
    const subj = ['Dock door B sensor', 'Storm rota — final', 'Badge audit Friday', 'Re: vending refill', 'Q3 close checklist', 'Parking apron', 'Lift service window', 'All-hands moved'];
    subj.forEach((t, i) => {
      const y = 22 + i * 20;
      if (i === 1) {
        ctx.fillStyle = '#bcd4e4';
        ctx.fillRect(62, y - 4, 108, 19);
      }
      ctx.fillStyle = '#2c333b';
      ctx.font = `600 7px ${SFONT}`;
      ctx.fillText(t, 68, y + 4);
      ctx.fillStyle = '#78818b';
      ctx.font = `500 6px ${SFONT}`;
      ctx.fillText('M. Chen · 08:1' + i, 68, y + 12);
    });
    // Reading pane: subject + paragraph bars
    ctx.fillStyle = '#20262d';
    ctx.font = `700 10px ${SFONT}`;
    ctx.fillText('Storm rota — final', 178, 34);
    ctx.fillStyle = '#8b939c';
    const rnd = rngFor('scrMail');
    for (let r = 0; r < 14; r++) {
      ctx.fillRect(178, 44 + r * 9, 40 + rnd() * 92, 4);
    }
  });
}

function scrDashboard() {
  return scrRegion('dashboard', 320, 180, (ctx, w, h) => {
    ctx.fillStyle = '#10161d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7fd4ff';
    ctx.font = `700 11px ${SFONT}`;
    ctx.fillText('MERIDIAN FACILITIES — BUILDING SYSTEMS', 8, 16);
    ctx.strokeStyle = '#22303c';
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    // Stat tiles
    const tiles = [['AHU-1 SUPPLY', '18.4°C', '#5fd6a8'], ['LOAD', '412 kW', '#e8c15a'], ['HUMIDITY', '38%', '#5fd6a8'], ['DOCK DOOR B', 'FAULT', '#e0705a']];
    tiles.forEach((t, i) => {
      const x = 8 + i * 77;
      ctx.fillStyle = '#1a2430';
      ctx.fillRect(x, 26, 70, 40);
      ctx.fillStyle = '#5d6b78';
      ctx.font = `600 7px ${SFONT}`;
      ctx.fillText(t[0], x + 5, 38);
      ctx.fillStyle = t[2];
      ctx.font = `700 14px ${SFONT}`;
      ctx.fillText(t[1], x + 5, 57);
    });
    // Trend chart
    ctx.strokeStyle = '#22303c';
    for (let g = 0; g < 4; g++) {
      ctx.beginPath();
      ctx.moveTo(8, 84 + g * 20);
      ctx.lineTo(w - 8, 84 + g * 20);
      ctx.stroke();
    }
    const rnd = rngFor('scrDash');
    ctx.strokeStyle = '#54c7ec';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= 60; x++) {
      const px = 8 + (x / 60) * (w - 16);
      const py = 120 - Math.sin(x * 0.25) * 14 - rnd() * 10;
      if (x === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = '#3c4854';
    ctx.font = `500 6px ${MONO}`;
    ctx.fillText('06:00        08:00        10:00        12:00        14:00', 8, 172);
  });
}

function scrCad() {
  return scrRegion('cad', 320, 180, (ctx, w, h) => {
    ctx.fillStyle = '#0c1320';
    ctx.fillRect(0, 0, w, h);
    // Faint grid
    ctx.strokeStyle = 'rgba(80,110,140,0.14)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Plan outline (echoes the real footprint loosely)
    ctx.strokeStyle = '#9fd0e8';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 30, 200, 120);
    ctx.strokeRect(236, 60, 52, 90);
    ctx.lineWidth = 1;
    ctx.strokeRect(36, 30, 80, 52);
    ctx.strokeRect(116, 30, 60, 52);
    ctx.strokeRect(36, 96, 64, 54);
    ctx.strokeRect(140, 96, 96, 54);
    // Door swings
    ctx.strokeStyle = '#5b7c94';
    ctx.beginPath();
    ctx.arc(116, 66, 12, Math.PI * 0.5, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(140, 120, 12, 0, Math.PI * 0.5);
    ctx.stroke();
    // Dimension line
    ctx.strokeStyle = '#c8a34a';
    ctx.beginPath();
    ctx.moveTo(36, 162);
    ctx.lineTo(236, 162);
    ctx.stroke();
    ctx.fillStyle = '#c8a34a';
    ctx.font = `500 8px ${MONO}`;
    ctx.fillText('42 600', 122, 158);
    ctx.fillStyle = '#7fd4ff';
    ctx.font = `700 9px ${SFONT}`;
    ctx.fillText('NORTHSTAR ADMIN CENTER — LEVEL 1 — REV C', 8, 14);
  });
}

function scrLogin() {
  return scrRegion('login', 320, 180, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#101b2c');
    g.addColorStop(1, '#1a2c44');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    drawStar(ctx, w / 2, 44, 22, '#7fd4ff');
    centreText(ctx, 'NORTHSTAR ADMINISTRATIVE CENTER', w / 2, 80, 11, '#d5dde4', '700', 1);
    // Input fields
    ctx.fillStyle = '#dbe0e5';
    ctx.fillRect(w / 2 - 70, 96, 140, 16);
    ctx.fillRect(w / 2 - 70, 118, 140, 16);
    ctx.fillStyle = '#7c858e';
    ctx.font = `500 8px ${SFONT}`;
    ctx.fillText('user id', w / 2 - 64, 107);
    ctx.fillText('••••••••', w / 2 - 64, 129);
    ctx.fillStyle = '#2f89a8';
    ctx.fillRect(w / 2 - 70, 140, 140, 15);
    centreText(ctx, 'SIGN IN', w / 2, 148, 8, '#eaf6fb', '700');
  });
}

function scrLocked() {
  return scrRegion('locked', 320, 180, (ctx, w, h) => {
    ctx.fillStyle = '#0e1828';
    ctx.fillRect(0, 0, w, h);
    drawStar(ctx, w / 2, 52, 24, '#4f7d99');
    centreText(ctx, 'SESSION LOCKED', w / 2, 96, 17, '#d5dde4', '700', 2);
    centreText(ctx, 'Northstar Administrative Center', w / 2, 118, 9, '#7f95a8', '500');
    centreText(ctx, 'Press CTRL + ALT + DEL to resume', w / 2, 140, 8, '#5b6f80', '500');
    centreText(ctx, 'workstation NS-1174 · signed in as d.reyes', w / 2, 158, 7, '#44566a', '500');
  });
}

function scrCctv(v = 1) {
  return scrRegion(`cctv${v}`, 320, 180, (ctx, w, h) => {
    const rnd = rngFor(`cctv${v}`);
    const labels = v === 1
      ? ['CAM 02 — DOCK', 'CAM 05 — LOBBY', 'CAM 09 — GARAGE', 'CAM 11 — SPINE']
      : ['CAM 01 — VESTIBULE', 'CAM 07 — ARCHIVE', 'CAM 12 — EAST YARD', 'CAM 03 — MEZZ'];
    for (let q = 0; q < 4; q++) {
      const qx = (q % 2) * (w / 2);
      const qy = Math.floor(q / 2) * (h / 2);
      const qw = w / 2 - 1;
      const qh = h / 2 - 1;
      if (v === 2 && q === 3) {
        // dead feed
        ctx.fillStyle = '#06080a';
        ctx.fillRect(qx, qy, qw, qh);
        centreText(ctx, 'NO SIGNAL', qx + qw / 2, qy + qh / 2, 10, '#3d4854', '700');
      } else {
        ctx.fillStyle = '#1a211f';
        ctx.fillRect(qx, qy, qw, qh);
        // vague room shapes
        ctx.strokeStyle = 'rgba(150,170,160,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(qx + 14 + rnd() * 20, qy + 20, 50 + rnd() * 40, 40 + rnd() * 20);
        ctx.fillStyle = 'rgba(120,140,130,0.35)';
        for (let b = 0; b < 4; b++) ctx.fillRect(qx + 10 + rnd() * 120, qy + 24 + rnd() * 50, 8 + rnd() * 22, 5 + rnd() * 14);
        // scanline sheen
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        for (let s = 0; s < qh; s += 4) ctx.fillRect(qx, qy + s, qw, 1);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(qx, qy + qh - 12, qw, 12);
      ctx.fillStyle = '#a8c0b4';
      ctx.font = `600 7px ${MONO}`;
      ctx.fillText(labels[q], qx + 4, qy + qh - 4);
      ctx.fillStyle = '#d0d8d2';
      ctx.fillText(`03:1${q}:4${v}`, qx + qw - 42, qy + qh - 4);
    }
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  });
}

function scrRack() {
  return scrRegion('rack', 320, 180, (ctx, w, h) => {
    ctx.fillStyle = '#080b0d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#67d29a';
    ctx.font = `700 10px ${MONO}`;
    ctx.fillText('NSR CORE — RACK STATUS', 8, 16);
    const rnd = rngFor('scrRack');
    const hosts = ['nsr-core-01', 'nsr-core-02', 'nsr-dc-01', 'nsr-file-02', 'nsr-cam-01', 'nsr-badge-01', 'nsr-hvac-gw', 'nsr-backup-01', 'nsr-edge-03', 'nsr-print-q'];
    hosts.forEach((hst, i) => {
      const y = 34 + i * 14;
      ctx.fillStyle = '#4a5a52';
      ctx.font = `500 8px ${MONO}`;
      ctx.fillText(hst.padEnd(14, ' '), 8, y);
      const warn = rnd() < 0.2;
      ctx.fillStyle = warn ? '#e0b04a' : '#57b884';
      const blocks = 4 + Math.floor(rnd() * 14);
      for (let b = 0; b < blocks; b++) ctx.fillRect(108 + b * 9, y - 7, 7, 8);
      ctx.fillStyle = warn ? '#e0b04a' : '#3d5a4a';
      ctx.font = `500 7px ${MONO}`;
      ctx.fillText(warn ? 'WARN load>0.9' : 'ok', 278, y);
    });
  });
}

function scrSlides() {
  return scrRegion('slides', 320, 180, (ctx, w, h) => {
    ctx.fillStyle = '#e9ebed';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, 8);
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w * 0.42, h);
    ctx.lineTo(w * 0.28, h - 46);
    ctx.lineTo(0, h - 46);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c8a34a';
    ctx.fillRect(0, h - 50, w * 0.3, 4);
    drawStar(ctx, w - 34, 36, 18, NAVY);
    ctx.fillStyle = '#1d2735';
    ctx.font = `700 20px ${SFONT}`;
    ctx.fillText('Q3 OPERATIONS REVIEW', 22, 74);
    ctx.fillStyle = '#4d5866';
    ctx.font = `500 11px ${SFONT}`;
    ctx.fillText('Polar Logistics · Northstar Administrative Center', 22, 96);
    ctx.fillText('Winter readiness · dock throughput · storm rota', 22, 114);
    ctx.fillStyle = '#8a929b';
    ctx.font = `500 8px ${SFONT}`;
    ctx.fillText('slide 1 / 18', w - 60, h - 10);
  });
}

function scrCopier(jam = false) {
  return scrRegion(jam ? 'copierJam' : 'copier', 150, 82, (ctx, w, h) => {
    ctx.fillStyle = '#20262b';
    ctx.fillRect(0, 0, w, h);
    if (jam) {
      ctx.fillStyle = '#c8862e';
      ctx.beginPath();
      ctx.moveTo(24, 14);
      ctx.lineTo(38, 38);
      ctx.lineTo(10, 38);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#20262b';
      ctx.font = `700 16px ${SFONT}`;
      ctx.fillText('!', 21, 34);
      ctx.fillStyle = '#e3c084';
      ctx.font = `700 11px ${SFONT}`;
      ctx.fillText('PAPER JAM', 48, 24);
      ctx.fillStyle = '#b8bec4';
      ctx.font = `500 9px ${SFONT}`;
      ctx.fillText('Open panel B and clear', 48, 38);
      ctx.fillText('the fuser path.', 48, 50);
    } else {
      ctx.fillStyle = '#9fd6b8';
      ctx.font = `700 12px ${SFONT}`;
      ctx.fillText('READY', 10, 22);
      ctx.fillStyle = '#b8bec4';
      ctx.font = `500 9px ${SFONT}`;
      ctx.fillText('Tray 1: A4  ·  Tray 2: A4', 10, 38);
      ctx.fillText('Toner 62%', 10, 50);
    }
    // soft buttons
    for (let b = 0; b < 4; b++) {
      ctx.fillStyle = '#3a444c';
      ctx.fillRect(10 + b * 34, h - 18, 28, 11);
    }
  });
}

function scrNoSignal() {
  return scrRegion('nosignal', 160, 92, (ctx, w, h) => {
    ctx.fillStyle = '#04060a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1b3a8c';
    ctx.fillRect(38, 30, 84, 26);
    centreText(ctx, 'NO INPUT SIGNAL', 80, 44, 9, '#c3d0ea', '600');
  });
}

const SCREEN_PAINTERS = {
  spreadsheet: () => scrSpreadsheet(),
  mail: () => scrMail(),
  dashboard: () => scrDashboard(),
  cad: () => scrCad(),
  login: () => scrLogin(),
  locked: () => scrLocked(),
  cctv: () => scrCctv(1),
  cctv2: () => scrCctv(2),
  rack: () => scrRack(),
  slides: () => scrSlides(),
  copier: () => scrCopier(false),
  copierJam: () => scrCopier(true),
  nosignal: () => scrNoSignal(),
};

export const SCREEN_KINDS = Object.keys(SCREEN_PAINTERS);

/**
 * A powered screen face quad (w×h m, facing −Z before `rot`), UV-mapped into
 * the screen content atlas. Returned as a normal part; `prop()`/dress route
 * parts with matName 'screen.atlas' into the merged screen mesh.
 */
export function screenFacePart(kind, w, h, pos = [0, 0, 0], rot = [0, Math.PI, 0]) {
  const paint = SCREEN_PAINTERS[kind] ?? SCREEN_PAINTERS.locked;
  const r = paint();
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, r.u0 + uv.getX(i) * (r.u1 - r.u0), r.v0 + uv.getY(i) * (r.v1 - r.v0));
  }
  uv.needsUpdate = true;
  return { geometry: g, matrix: G.matrixFrom(pos, rot), noProject: true, matName: 'screen.atlas' };
}

/** Merge collected screen faces into one mesh with the shared screen material. */
export function buildScreenMesh(faces) {
  if (!faces.length) return null;
  const merged = G.mergeParts(faces);
  const mesh = new THREE.Mesh(merged, screenMaterial());
  mesh.name = 'screens';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.matName = 'emissive.screen';
  mesh.userData.static = true;
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Palette shortcuts                                                    */
/* ------------------------------------------------------------------ */

const NAVY = rgbCss(C.brandNavy);
const BLUE = rgbCss(C.brandBlue);
const CYAN = rgbCss(C.brandCyan);
const ICE = rgbCss(C.brandIce);
const GOLD = rgbCss(C.brandGold);

function centreText(ctx, text, x, y, px, color, weight = '600', spacing = 0) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${px}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (spacing > 0) {
    const chars = [...text];
    const widths = chars.map((c) => ctx.measureText(c).width + spacing);
    const total = widths.reduce((a, b) => a + b, 0) - spacing;
    let cx = x - total / 2;
    for (let i = 0; i < chars.length; i++) {
      ctx.textAlign = 'left';
      ctx.fillText(chars[i], cx, y);
      cx += widths[i];
    }
    ctx.textAlign = 'center';
  } else {
    ctx.fillText(text, x, y);
  }
}

/** Northstar compass-star mark. */
function drawStar(ctx, cx, cy, R, color = CYAN) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const r = i % 4 === 0 ? R : i % 2 === 0 ? R * 0.42 : R * 0.2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Region painters (each cached by key)                                 */
/* ------------------------------------------------------------------ */

function regionBrandLogo(wide = true) {
  const key = wide ? 'brand.wide' : 'brand.mark';
  const w = wide ? 640 : 220;
  const h = wide ? 190 : 220;
  return region(key, w, h, (ctx) => {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, h);
    if (wide) {
      drawStar(ctx, 95, 95, 62);
      centreText(ctx, 'NORTHSTAR', 390, 74, 62, ICE, '700', 6);
      centreText(ctx, 'ADMINISTRATIVE CENTER', 390, 132, 26, CYAN, '500', 6);
    } else {
      drawStar(ctx, w / 2, h / 2, 80);
    }
  });
}

function regionRoomSign(number, name) {
  return region(`room:${number}:${name}`, 300, 120, (ctx, w, h) => {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = BLUE;
    ctx.fillRect(0, 0, 84, h);
    centreText(ctx, number, 42, h / 2, 34, ICE, '700');
    ctx.textAlign = 'left';
    ctx.fillStyle = ICE;
    ctx.font = `600 26px ${FONT}`;
    const lines = name.toUpperCase().split('\n');
    lines.forEach((ln, i) => ctx.fillText(ln, 100, h / 2 + (i - (lines.length - 1) / 2) * 32));
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  });
}

function regionDeptSign(name, sub) {
  return region(`dept:${name}`, 620, 170, (ctx, w, h) => {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, h);
    drawStar(ctx, 70, h / 2, 44);
    ctx.textAlign = 'left';
    ctx.fillStyle = ICE;
    ctx.font = `700 52px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(name.toUpperCase(), 135, sub ? 62 : h / 2);
    if (sub) {
      ctx.fillStyle = CYAN;
      ctx.font = `500 28px ${FONT}`;
      ctx.fillText(sub, 135, 118);
    }
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, h - 8, w, 8);
  });
}

function regionDirectional(entries) {
  const key = `dir:${entries.map((e) => e.text + e.dir).join('|')}`;
  const h = 60 + entries.length * 62;
  return region(key, 520, h, (ctx, w) => {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(127,212,255,0.35)';
    ctx.lineWidth = 2;
    entries.forEach((e, i) => {
      const y = 58 + i * 62;
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(24, y - 31);
        ctx.lineTo(w - 24, y - 31);
        ctx.stroke();
      }
      ctx.fillStyle = CYAN;
      ctx.font = `700 40px ${FONT}`;
      ctx.textBaseline = 'middle';
      const arrow = e.dir === 'left' ? '\u2190' : e.dir === 'right' ? '\u2192' : e.dir === 'up' ? '\u2191' : '\u2193';
      if (e.dir === 'left') {
        ctx.textAlign = 'left';
        ctx.fillText(arrow, 26, y);
        ctx.fillStyle = ICE;
        ctx.font = `600 32px ${FONT}`;
        ctx.fillText(e.text.toUpperCase(), 86, y);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(arrow, w - 26, y);
        ctx.fillStyle = ICE;
        ctx.font = `600 32px ${FONT}`;
        ctx.fillText(e.text.toUpperCase(), w - 86, y);
      }
    });
    ctx.textAlign = 'left';
  });
}

const SAFETY_POSTERS = [
  {
    key: 'winter', bg: '#12283c', accent: CYAN, title: 'WINTER FOOTING', sub: 'Grit before it grips you',
    body: ['Clear snow from your route', 'Report black ice to Facilities', 'Hold the handrail — every time'],
  },
  {
    key: 'lifting', bg: '#243428', accent: rgbCss(C.exitGreen), title: 'LIFT IT RIGHT', sub: 'Back straight, load close',
    body: ['Test the weight first', 'Two-person lift over 20 kg', 'Use the dock trolley'],
  },
  {
    key: 'fire', bg: '#3c2018', accent: rgbCss(C.emergencyAmber), title: 'IF YOU SEE FIRE', sub: 'Raise - Contain - Evacuate',
    body: ['Pull the nearest call point', 'Close doors behind you', 'Muster at the north court'],
  },
  {
    key: 'data', bg: '#1c2438', accent: CYAN, title: 'CLEAR DESK POLICY', sub: 'Lock it or lose it',
    body: ['Badge away from your desk', 'Shred client papers', 'Report tailgaters to Security'],
  },
];

function regionSafetyPoster(idx) {
  const p = SAFETY_POSTERS[idx % SAFETY_POSTERS.length];
  return region(`poster:${p.key}`, 300, 430, (ctx, w, h) => {
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = p.accent;
    ctx.fillRect(0, 0, w, 14);
    centreText(ctx, p.title, w / 2, 70, 34, '#f2f6fa', '700');
    centreText(ctx, p.sub, w / 2, 112, 20, p.accent, '600');
    // Pictogram: triangle
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(w / 2, 150);
    ctx.lineTo(w / 2 + 62, 258);
    ctx.lineTo(w / 2 - 62, 258);
    ctx.closePath();
    ctx.stroke();
    centreText(ctx, '!', w / 2, 218, 64, p.accent, '800');
    ctx.textAlign = 'left';
    ctx.fillStyle = '#d7dee6';
    ctx.font = `500 17px ${FONT}`;
    p.body.forEach((ln, i) => ctx.fillText(`\u2022  ${ln}`, 24, 300 + i * 32));
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `500 12px ${FONT}`;
    ctx.fillText('MERIDIAN FACILITIES — SAFETY BULLETIN 7', 24, h - 18);
  });
}

function regionEvacDiagram(floorLabel) {
  return region(`evac:${floorLabel}`, 320, 430, (ctx, w, h) => {
    ctx.fillStyle = '#e8ecef';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = rgbCss(C.dangerRed);
    ctx.fillRect(0, 0, w, 52);
    centreText(ctx, 'FIRE EVACUATION PLAN', w / 2, 26, 22, '#fff', '700');
    centreText(ctx, floorLabel, w / 2, 76, 18, '#30343a', '600');
    // Simplified plan: rectangles echoing the real double-loop layout
    ctx.strokeStyle = '#30343a';
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 100, 260, 220);
    ctx.strokeRect(30, 100, 90, 70);
    ctx.strokeRect(200, 100, 90, 70);
    ctx.strokeRect(30, 250, 90, 70);
    ctx.strokeRect(200, 250, 90, 70);
    ctx.strokeRect(120, 170, 80, 80);
    // Exit arrows
    ctx.strokeStyle = rgbCss(C.exitGreen);
    ctx.fillStyle = rgbCss(C.exitGreen);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(160, 210);
    ctx.lineTo(160, 100);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(160, 92);
    ctx.lineTo(150, 108);
    ctx.lineTo(170, 108);
    ctx.closePath();
    ctx.fill();
    // You-are-here dot
    ctx.fillStyle = rgbCss(C.dangerRed);
    ctx.beginPath();
    ctx.arc(160, 235, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#30343a';
    ctx.font = `600 14px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('\u25CF YOU ARE HERE', 30, 348);
    ctx.fillText('\u2192 PRIMARY ROUTE: NORTH COURT', 30, 372);
    ctx.fillText('\u2192 SECONDARY: WEST FIRE STAIR', 30, 396);
  });
}

const NOTICES = [
  ['KITCHEN NOTICE', 'Your mug is not self-cleaning.', 'Wash it. Dry it. Love it.', '— Northwind People Team'],
  ['BADGE REQUIRED', 'Server room access is logged.', 'No exceptions, no piggybacking.', '— Meridian Facilities'],
  ['SNOW ADVISORY', 'Storm cell expected after 14:00.', 'Move vehicles off the east apron.', '— Reception'],
  ['PRINTER 3 IS DOWN', 'A technician has been summoned.', 'Use the copy room MFD instead.', '— Aurora Analytics IT'],
  ['LOST: GREY SCARF', 'Last seen in the break room.', 'Reward: my eternal gratitude.', '— D. Reyes, ext. 4417'],
  ['BOOK CLUB — THURSDAY', 'This month: "The Long Winter".', 'Executive lounge, 17:30.', 'New members welcome'],
  ['OUT OF ORDER', 'Paper jam in the fuser path.', 'Engineer called — do not force it.', '— Meridian Facilities'],
  ['EVACUATION IN EFFECT', 'Leave by the nearest exit.', 'Assembly point: EAST YARD.', 'Do not use the lifts'],
];

/* ---- Book spines (flat colours — no high-frequency noise) ---- */

const SPINE_COLS = ['#5b6c7c', '#7c5a4a', '#4a5d52', '#8a8272', '#3e4a63', '#74513f', '#606a58', '#856f52', '#49525a', '#6b4a52', '#556549', '#7a6a5a'];

function regionBookRow(seed) {
  return region(`books:${seed % 8}`, 360, 116, (ctx, w, h) => {
    const rnd = rngFor(`bookrow${seed % 8}`);
    ctx.fillStyle = '#191a1d'; // shadowed case back behind the spines
    ctx.fillRect(0, 0, w, h);
    let x = 3;
    while (x < w - 16) {
      const bw = 11 + rnd() * 17;
      const bh = h * (0.58 + rnd() * 0.38);
      if (rnd() < 0.9) {
        const c = SPINE_COLS[(rnd() * SPINE_COLS.length) | 0];
        ctx.fillStyle = c;
        ctx.fillRect(x, h - bh, bw, bh);
        // subtle darker band at the foot of the spine
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(x, h - bh * 0.16, bw, bh * 0.16);
        // light title bar near the head
        ctx.fillStyle = 'rgba(232,227,212,0.75)';
        ctx.fillRect(x + bw * 0.22, h - bh * 0.84, bw * 0.56, Math.max(3, bh * 0.07));
        // one-pixel edge shade so spines separate without speckle
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x + bw - 1.5, h - bh, 1.5, bh);
      } else if (rnd() < 0.5) {
        // small horizontal stack lying in the gap
        const sw = 34 + rnd() * 20;
        for (let s = 0; s < 3; s++) {
          ctx.fillStyle = SPINE_COLS[(rnd() * SPINE_COLS.length) | 0];
          ctx.fillRect(x, h - 10 - s * 9, sw, 8);
        }
        x += sw;
      }
      x += bw + 1.5 + (rnd() < 0.14 ? 12 : 0);
    }
  });
}

/**
 * A flat book-spine face quad (w×h m, facing −Z before rot). Replaces
 * per-book geometry so shelves read as tidy spines instead of noisy blocks.
 */
export function bookRowFace(seed, w, h, pos = [0, 0, 0], rot = [0, Math.PI, 0]) {
  return faceQuad(regionBookRow(seed), w, h, pos, rot);
}

function regionNotice(idx) {
  const n = NOTICES[idx % NOTICES.length];
  return region(`notice:${idx % NOTICES.length}`, 210, 290, (ctx, w, h) => {
    ctx.fillStyle = '#f4f2ec';
    ctx.fillRect(0, 0, w, h);
    centreText(ctx, n[0], w / 2, 46, 22, '#232a33', '700');
    ctx.strokeStyle = '#b9b4a8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 70);
    ctx.lineTo(w - 30, 70);
    ctx.stroke();
    ctx.fillStyle = '#3a4048';
    ctx.font = `500 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(n[1], w / 2, 110);
    ctx.fillText(n[2], w / 2, 140);
    ctx.font = `italic 500 14px ${FONT}`;
    ctx.fillText(n[3], w / 2, 190);
    // tape corners
    ctx.fillStyle = 'rgba(200,198,190,0.8)';
    ctx.fillRect(-10, 8, 60, 18);
    ctx.fillRect(w - 50, 8, 60, 18);
    ctx.textAlign = 'left';
  });
}

function regionBulletin() {
  return region('bulletin', 460, 320, (ctx, w, h) => {
    // Cork
    ctx.fillStyle = '#a5814f';
    ctx.fillRect(0, 0, w, h);
    const rng = rngFor('bulletin');
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(${90 + rng() * 60 | 0},${60 + rng() * 50 | 0},${30 + rng() * 30 | 0},0.25)`;
      ctx.fillRect(rng() * w, rng() * h, 2, 2);
    }
    const pins = ['#c33', '#36c', '#3a3'];
    const notes = [
      ['#fff', 'SHIFT ROTA — DEC', 22],
      ['#ffec9e', 'carpool signup', 16],
      ['#d6ecfa', 'GYM DISCOUNT', 16],
      ['#fff', 'AURORA TEAM LUNCH FRI', 14],
      ['#ffd6d6', 'sublet: 2 rm near tramline', 13],
      ['#e8ffe8', 'FOUND: one glove (left)', 13],
    ];
    notes.forEach((n, i) => {
      const x = 20 + (i % 3) * 150 + (rng() - 0.5) * 16;
      const y = 24 + Math.floor(i / 3) * 150 + (rng() - 0.5) * 14;
      const ang = (rng() - 0.5) * 0.14;
      ctx.save();
      ctx.translate(x + 60, y + 60);
      ctx.rotate(ang);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-58, -56, 122, 122);
      ctx.fillStyle = n[0];
      ctx.fillRect(-60, -60, 120, 120);
      ctx.fillStyle = '#333';
      ctx.font = `600 ${n[2]}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(n[1], 0, -30);
      ctx.strokeStyle = '#889';
      ctx.lineWidth = 1;
      for (let l = 0; l < 4; l++) {
        ctx.beginPath();
        ctx.moveTo(-46, -6 + l * 18);
        ctx.lineTo(46, -6 + l * 18);
        ctx.stroke();
      }
      ctx.fillStyle = pins[i % 3];
      ctx.beginPath();
      ctx.arc(0, -52, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.textAlign = 'left';
  });
}

const WHITEBOARDS = [
  {
    key: 'sprint',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#2a3f66';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.33, 30); ctx.lineTo(w * 0.33, h - 30);
      ctx.moveTo(w * 0.66, 30); ctx.lineTo(w * 0.66, h - 30);
      ctx.stroke();
      ctx.font = `600 30px ${FONT}`;
      ctx.fillStyle = '#2a3f66';
      ctx.textAlign = 'center';
      ctx.fillText('TO DO', w * 0.165, 52);
      ctx.fillText('DOING', w * 0.5, 52);
      ctx.fillText('DONE', w * 0.83, 52);
      const items = [[0.1, 110, '#c33', 'Q3 filings'], [0.08, 170, '#2a3f66', 'vendor audit'], [0.42, 120, '#2a3f66', 'rota fix'], [0.72, 110, '#3a3', 'snow plan'], [0.75, 175, '#3a3', 'badge sync']];
      ctx.font = `500 22px cursive, ${FONT}`;
      ctx.textAlign = 'left';
      for (const [x, y, c, t] of items) {
        ctx.fillStyle = c;
        ctx.fillText(t, w * x + 14, y);
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.strokeRect(w * x, y - 26, 150, 40);
      }
    },
  },
  {
    key: 'chart',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#2a3f66';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, 40); ctx.lineTo(60, h - 60); ctx.lineTo(w - 60, h - 60);
      ctx.stroke();
      ctx.strokeStyle = '#c33';
      ctx.beginPath();
      ctx.moveTo(60, h - 90);
      ctx.quadraticCurveTo(w * 0.4, h - 200, w * 0.62, h - 130);
      ctx.quadraticCurveTo(w * 0.8, h - 80, w - 70, h - 190);
      ctx.stroke();
      ctx.fillStyle = '#2a3f66';
      ctx.font = `600 26px ${FONT}`;
      ctx.fillText('intake vs. capacity', 80, 60);
      ctx.font = `500 22px cursive, ${FONT}`;
      ctx.fillStyle = '#3a3';
      ctx.fillText('we are HERE \u2193', w * 0.55, h - 160);
    },
  },
  {
    key: 'meeting',
    draw(ctx, w, h) {
      ctx.fillStyle = '#2a3f66';
      ctx.font = `600 30px ${FONT}`;
      ctx.fillText('THU 09:00 — storm logistics', 40, 60);
      ctx.font = `500 24px cursive, ${FONT}`;
      const lines = ['- east apron must stay clear', '- generators: 72h fuel ok', '- comms tree updated?', '- who has the dock keys??'];
      lines.forEach((l, i) => ctx.fillText(l, 60, 120 + i * 46));
      ctx.strokeStyle = '#c33';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(330, 258, 190, 30, 0, 0, Math.PI * 2);
      ctx.stroke();
    },
  },
  {
    key: 'agendaHalf',
    draw(ctx, w, h) {
      // Half-erased meeting agenda: right side wiped mid-sentence
      ctx.fillStyle = '#2a3f66';
      ctx.font = `600 30px ${FONT}`;
      ctx.fillText('MON 08:30 — weekly ops', 40, 58);
      ctx.font = `500 24px cursive, ${FONT}`;
      const lines = ['1. dock rota (M. Chen)', '2. badge audit results', '3. vending contract', '4. AOB — heating??'];
      lines.forEach((l, i) => ctx.fillText(l, 60, 116 + i * 44));
      // dry-wipe smears over the lower half
      for (let s = 0; s < 5; s++) {
        const g = ctx.createLinearGradient(0, 0, 90, 0);
        g.addColorStop(0, 'rgba(242,244,244,0)');
        g.addColorStop(0.5, 'rgba(242,244,244,0.92)');
        g.addColorStop(1, 'rgba(242,244,244,0)');
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(w * 0.36 + s * 34, 150 + s * 22);
        ctx.rotate(-0.35);
        ctx.fillRect(0, -70, 88, 190);
        ctx.restore();
      }
      ctx.fillStyle = '#c33';
      ctx.font = `500 22px cursive, ${FONT}`;
      ctx.fillText('mtg moved — see mail', w * 0.55, h - 36);
    },
  },
];

function regionWhiteboard(idx) {
  const wdef = WHITEBOARDS[idx % WHITEBOARDS.length];
  return region(`wb:${wdef.key}`, 560, 350, (ctx, w, h) => {
    ctx.fillStyle = '#f2f4f4';
    ctx.fillRect(0, 0, w, h);
    // faint erased ghosts
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#446';
    ctx.font = `500 40px cursive, ${FONT}`;
    ctx.fillText('offsite??', w * 0.5, h * 0.85);
    ctx.globalAlpha = 1;
    wdef.draw(ctx, w, h);
    ctx.textAlign = 'left';
  });
}

const ART_PRINTS = [
  { key: 'aurora', draw(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#091120');
    g.addColorStop(1, '#12324a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const rng = rngFor('artAurora');
    for (let b = 0; b < 3; b++) {
      ctx.strokeStyle = `rgba(${80 + b * 30},${220 - b * 20},${170 + b * 25},0.35)`;
      ctx.lineWidth = 26 - b * 6;
      ctx.beginPath();
      ctx.moveTo(-10, h * 0.3 + b * 30);
      for (let x = 0; x <= w; x += 24) ctx.lineTo(x, h * 0.3 + b * 26 + Math.sin(x * 0.02 + b) * 44);
      ctx.stroke();
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + rng() * 0.6})`;
      ctx.fillRect(rng() * w, rng() * h, 2, 2);
    }
    ctx.fillStyle = '#dfe9f2';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w * 0.3, h * 0.72);
    ctx.lineTo(w * 0.5, h * 0.86);
    ctx.lineTo(w * 0.72, h * 0.66);
    ctx.lineTo(w, h * 0.88);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  } },
  { key: 'ridge', draw(ctx, w, h) {
    ctx.fillStyle = '#cfd9e2';
    ctx.fillRect(0, 0, w, h);
    const cols = ['#8fa9c6', '#5d7794', '#2e415a'];
    cols.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) ctx.lineTo(x, h * (0.42 + i * 0.16) + Math.sin(x * 0.013 + i * 2) * 34);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    });
  } },
  { key: 'starchart', draw(ctx, w, h) {
    ctx.fillStyle = '#0b1420';
    ctx.fillRect(0, 0, w, h);
    const rng = rngFor('starchart');
    ctx.strokeStyle = 'rgba(127,212,255,0.4)';
    ctx.lineWidth = 1.5;
    let px = rng() * w;
    let py = rng() * h;
    for (let i = 0; i < 9; i++) {
      const x = rng() * w;
      const y = rng() * h;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#d6ecfa';
      ctx.beginPath(); ctx.arc(x, y, 3 + rng() * 3, 0, Math.PI * 2); ctx.fill();
      px = x; py = y;
    }
    drawStar(ctx, w * 0.72, h * 0.3, 30, GOLD);
  } },
];

function regionArtPrint(idx) {
  const a = ART_PRINTS[idx % ART_PRINTS.length];
  return region(`art:${a.key}`, 300, 420, (ctx, w, h) => a.draw(ctx, w, h));
}

function regionVendingHeader() {
  return region('vend', 430, 110, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#123a5c');
    g.addColorStop(1, '#0c2740');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    drawStar(ctx, 52, h / 2, 34, '#bfe7ff');
    centreText(ctx, 'POLAR SNACKS', w / 2 + 26, h / 2 - 12, 44, '#eaf6ff', '800', 2);
    centreText(ctx, 'COLD DRINKS \u2022 HOT PICKS \u2022 24/7', w / 2 + 26, h / 2 + 30, 17, '#7fd4ff', '600', 2);
  });
}

function regionShippingLabel(idx) {
  const dests = [
    ['NORTHSTAR ADMIN CENTER', 'DOCK 2 — GOODS IN', 'PO 88-4417'],
    ['POLAR LOGISTICS', 'ROUTE 6 — KIRUNA HUB', 'PO 91-2203'],
    ['MERIDIAN FACILITIES', 'PLANT SPARES — FRAGILE', 'PO 77-0148'],
  ];
  const d = dests[idx % dests.length];
  return region(`ship:${idx % dests.length}`, 200, 140, (ctx, w, h) => {
    ctx.fillStyle = '#f4f2ec';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#232a33';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#232a33';
    ctx.font = `700 16px ${FONT}`;
    ctx.fillText(d[0], 14, 30);
    ctx.font = `500 14px ${FONT}`;
    ctx.fillText(d[1], 14, 54);
    ctx.fillText(d[2], 14, 76);
    // barcode
    const rng = rngFor(`bar${idx}`);
    let x = 14;
    while (x < w - 20) {
      const bw = 2 + Math.floor(rng() * 4);
      ctx.fillRect(x, 92, bw, 34);
      x += bw + 2 + Math.floor(rng() * 3);
    }
  });
}

function regionEquipLabel(text, danger = false) {
  return region(`equip:${text}`, 240, 96, (ctx, w, h) => {
    ctx.fillStyle = danger ? '#c8b400' : '#e8ecef';
    ctx.fillRect(0, 0, w, h);
    if (danger) {
      ctx.fillStyle = '#191919';
      for (let i = -2; i < 10; i++) {
        ctx.save();
        ctx.translate(i * 34, 0);
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(16, 0); ctx.lineTo(-8, h); ctx.lineTo(-24, h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#c8b400';
      ctx.fillRect(14, 20, w - 28, h - 40);
      ctx.fillStyle = '#191919';
    } else {
      ctx.strokeStyle = '#30343a';
      ctx.lineWidth = 3;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#30343a';
    }
    centreText(ctx, text, w / 2, h / 2, 26, danger ? '#191919' : '#30343a', '700');
  });
}

function regionHazardStripe() {
  return region('hazstripe', 420, 62, (ctx, w, h) => {
    ctx.fillStyle = '#c8b400';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#191919';
    for (let i = -1; i < 14; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 36, 0);
      ctx.lineTo(i * 36 + 18, 0);
      ctx.lineTo(i * 36 - 12, h);
      ctx.lineTo(i * 36 - 30, h);
      ctx.closePath();
      ctx.fill();
    }
  });
}

function regionWetFloor() {
  return region('wetfloor', 170, 300, (ctx, w, h) => {
    ctx.fillStyle = '#c8b400';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#191919';
    centreText(ctx, 'CAUTION', w / 2, 40, 30, '#191919', '800');
    ctx.beginPath();
    ctx.moveTo(w / 2, 70);
    ctx.lineTo(w / 2 + 46, 160);
    ctx.lineTo(w / 2 - 46, 160);
    ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#191919';
    ctx.stroke();
    // slipping figure
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(w / 2 - 6, 100, 8, 0, Math.PI * 2);
    ctx.moveTo(w / 2 - 4, 110);
    ctx.lineTo(w / 2 + 12, 128);
    ctx.moveTo(w / 2 + 2, 118);
    ctx.lineTo(w / 2 - 16, 134);
    ctx.moveTo(w / 2 + 12, 128);
    ctx.lineTo(w / 2 + 30, 122);
    ctx.stroke();
    centreText(ctx, 'WET', w / 2, 200, 34, '#191919', '800');
    centreText(ctx, 'FLOOR', w / 2, 240, 34, '#191919', '800');
  });
}

function regionDirectory(floor) {
  const rows = floor === 'upper'
    ? [['NORTHLIGHT BOARDROOM', 'U-01'], ['EXECUTIVE OFFICE', 'U-04'], ['RECORDS ANNEX', 'U-07'], ['EXECUTIVE LOUNGE', 'U-09']]
    : [['RECEPTION', 'G-01'], ['AURORA CONFERENCE', 'G-04'], ['OPEN PLAN FLOOR', 'G-06'], ['BREAK ROOM', 'G-09'], ['RECORDS ARCHIVE', 'G-12'], ['IT WORKSPACE', 'G-14']];
  return region(`directory:${floor}`, 340, 470, (ctx, w, h) => {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, h);
    drawStar(ctx, w / 2, 62, 36);
    centreText(ctx, 'BUILDING DIRECTORY', w / 2, 126, 24, ICE, '700', 2);
    centreText(ctx, floor === 'upper' ? 'LEVEL ONE' : 'GROUND LEVEL', w / 2, 158, 17, CYAN, '600', 3);
    ctx.textAlign = 'left';
    rows.forEach(([name, no], i) => {
      const y = 210 + i * 44;
      ctx.fillStyle = ICE;
      ctx.font = `500 18px ${FONT}`;
      ctx.fillText(name, 26, y);
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'right';
      ctx.fillText(no, w - 26, y);
      ctx.textAlign = 'left';
      ctx.strokeStyle = 'rgba(127,212,255,0.2)';
      ctx.beginPath();
      ctx.moveTo(26, y + 14);
      ctx.lineTo(w - 26, y + 14);
      ctx.stroke();
    });
  });
}

function regionSecurityNotice() {
  return region('cctv', 220, 300, (ctx, w, h) => {
    ctx.fillStyle = '#e8ecef';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#30343a';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    // camera glyph
    ctx.fillStyle = '#30343a';
    ctx.save();
    ctx.translate(w / 2, 90);
    ctx.rotate(-0.3);
    ctx.fillRect(-46, -22, 76, 44);
    ctx.fillRect(30, -12, 22, 24);
    ctx.restore();
    ctx.fillRect(w / 2 - 6, 110, 10, 40);
    centreText(ctx, 'CCTV', w / 2, 190, 40, '#30343a', '800');
    centreText(ctx, 'IN OPERATION', w / 2, 228, 20, '#30343a', '700');
    centreText(ctx, 'Northstar Security Ops', w / 2, 262, 14, '#5a6068', '500');
  });
}

function regionStairLevel(label) {
  return region(`stair:${label}`, 220, 220, (ctx, w, h) => {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, h);
    centreText(ctx, label, w / 2, h / 2 - 10, 110, ICE, '800');
    centreText(ctx, label === 'G' ? 'GROUND' : 'LEVEL ONE', w / 2, h - 40, 22, CYAN, '600', 3);
  });
}

function regionVanLivery() {
  return region('vanlivery', 560, 240, (ctx, w, h) => {
    ctx.fillStyle = rgbCss(C.paintedMetal);
    ctx.fillRect(0, 0, w, h);
    drawStar(ctx, 78, h / 2 - 12, 52, NAVY);
    ctx.textAlign = 'left';
    ctx.fillStyle = NAVY;
    ctx.font = `800 58px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('POLAR LOGISTICS', 148, h / 2 - 24);
    ctx.fillStyle = '#33414e';
    ctx.font = `600 24px ${FONT}`;
    ctx.fillText('FACILITY SERVICES \u2022 UNIT 12', 150, h / 2 + 34);
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, h - 18, w, 18);
  });
}

function regionGrit() {
  return region('grit', 240, 130, (ctx, w, h) => {
    ctx.fillStyle = '#c8b400';
    ctx.fillRect(0, 0, w, h);
    centreText(ctx, 'GRIT', w / 2, h / 2 - 16, 56, '#191919', '800', 4);
    centreText(ctx, 'FOR ICE & SNOW — TAKE WHAT YOU NEED', w / 2, h / 2 + 34, 13, '#191919', '600');
  });
}

function regionNameplate(name, title) {
  return region(`plate:${name}`, 260, 70, (ctx, w, h) => {
    ctx.fillStyle = '#2b2f33';
    ctx.fillRect(0, 0, w, h);
    centreText(ctx, name, w / 2, 26, 24, ICE, '700');
    centreText(ctx, title, w / 2, 52, 14, CYAN, '500', 1);
  });
}

/* ------------------------------------------------------------------ */
/* Sign prop builders                                                   */
/* ------------------------------------------------------------------ */

/**
 * Build a sign in LOCAL space (face towards −Z, pivot per kind), then let the
 * caller transform. Most callers use the placed() helper below instead.
 * Returns { parts, faces, colliders }.
 */
export const SIGN_BUILDERS = {
  /** Door plate beside a door. opts: { number, name }. 0.3 × 0.12, centre pivot. */
  roomSign(opts) {
    const r = regionRoomSign(opts.number ?? 'G-00', opts.name ?? 'Room');
    return {
      parts: [P(BB(0.32, 0.14, 0.012, 0.003), 'metal.aluminium', [0, 0, -0.006])],
      faces: [faceQuad(r, 0.3, 0.12, [0, 0, -0.0135])],
      colliders: [],
    };
  },
  /** Department blade sign. opts: { name, sub }. 0.95 × 0.26. */
  deptSign(opts) {
    const r = regionDeptSign(opts.name ?? 'Division', opts.sub);
    return {
      parts: [P(BB(0.98, 0.29, 0.02, 0.004), 'metal.blackAnodised', [0, 0, -0.01])],
      faces: [faceQuad(r, 0.95, 0.26, [0, 0, -0.022])],
      colliders: [],
    };
  },
  /** Directional sign. opts: { entries: [{text, dir}] }. */
  directional(opts) {
    const entries = opts.entries ?? [{ text: 'Reception', dir: 'left' }];
    const h = (60 + entries.length * 62) / 520 * 0.8;
    const r = regionDirectional(entries);
    return {
      parts: [P(BB(0.84, h + 0.04, 0.016, 0.004), 'metal.blackAnodised', [0, 0, -0.008])],
      faces: [faceQuad(r, 0.8, h, [0, 0, -0.018])],
      colliders: [],
    };
  },
  /** Framed safety poster. opts: { idx }. 0.46 × 0.66. */
  safetyPoster(opts) {
    const r = regionSafetyPoster(opts.idx ?? 0);
    return {
      parts: [P(BB(0.48, 0.68, 0.018, 0.004), 'metal.aluminium', [0, 0, -0.008])],
      faces: [faceQuad(r, 0.44, 0.64, [0, 0, -0.019])],
      colliders: [],
    };
  },
  /** Evacuation diagram. opts: { floor: 'G'|'1' }. */
  evacDiagram(opts) {
    const r = regionEvacDiagram(opts.floor === '1' ? 'UPPER FLOOR' : 'GROUND FLOOR');
    return {
      parts: [P(BB(0.36, 0.5, 0.014, 0.003), 'plastic.smooth', [0, 0, -0.007])],
      faces: [faceQuad(r, 0.33, 0.46, [0, 0, -0.016])],
      colliders: [],
    };
  },
  /** Taped A4 notice. opts: { idx, tilt }. */
  notice(opts) {
    const rng = rngFor(`notice${opts.idx ?? 0}${opts.seed ?? ''}`);
    const tilt = opts.tilt ?? (rng() - 0.5) * 0.08;
    const r = regionNotice(opts.idx ?? 0);
    return {
      parts: [],
      faces: [{ ...faceQuad(r, 0.21, 0.29, [0, 0, -0.004], [0, Math.PI, tilt]) }],
      colliders: [],
    };
  },
  /** Cork bulletin board with pinned notes. 0.95 × 0.66. */
  bulletinBoard() {
    const r = regionBulletin();
    return {
      parts: [
        P(BB(0.98, 0.7, 0.03, 0.006), 'wood.pale', [0, 0, -0.012]),
      ],
      faces: [faceQuad(r, 0.9, 0.62, [0, 0, -0.029])],
      colliders: [],
    };
  },
  /** Whiteboard writing overlay quad matching prop.whiteboard face. opts: { idx }. */
  whiteboardContent(opts) {
    const r = regionWhiteboard(opts.idx ?? 0);
    return { parts: [], faces: [faceQuad(r, 1.7, 1.06, [0, 0, 0])], colliders: [] };
  },
  /** Brand logo wall sign. opts: { wide }. wide: 1.7 × 0.5, mark: 0.6 × 0.6. */
  brandLogo(opts = {}) {
    const wide = opts.wide !== false;
    const r = regionBrandLogo(wide);
    const w = wide ? 1.7 : 0.6;
    const h = wide ? 0.5 : 0.6;
    return {
      parts: [P(BB(w + 0.06, h + 0.06, 0.03, 0.006), 'drywall.brand', [0, 0, -0.014])],
      faces: [faceQuad(r, w, h, [0, 0, -0.032])],
      colliders: [],
    };
  },
  /** Framed art print. opts: { idx }. 0.64 × 0.88. */
  artPrint(opts) {
    const r = regionArtPrint(opts.idx ?? 0);
    return {
      parts: [P(BB(0.68, 0.92, 0.025, 0.005), 'wood.dark', [0, 0, -0.011])],
      faces: [faceQuad(r, 0.6, 0.84, [0, 0, -0.026])],
      colliders: [],
    };
  },
  /** Vending header face (no backer — sits on the machine). 0.84 × 0.2. */
  vendingHeader() {
    const r = regionVendingHeader();
    return { parts: [], faces: [faceQuad(r, 0.84, 0.2, [0, 0, 0])], colliders: [] };
  },
  /** Shipping label for crates/boxes. opts: { idx }. 0.2 × 0.14. */
  shippingLabel(opts) {
    const r = regionShippingLabel(opts.idx ?? 0);
    return { parts: [], faces: [faceQuad(r, 0.2, 0.14, [0, 0, 0])], colliders: [] };
  },
  /** Equipment tag. opts: { text, danger }. 0.24 × 0.1. */
  equipLabel(opts) {
    const r = regionEquipLabel(opts.text ?? 'UNIT', opts.danger);
    return { parts: [], faces: [faceQuad(r, 0.24, 0.1, [0, 0, 0])], colliders: [] };
  },
  /** Hazard stripe band (for barriers). opts: { w, h }. */
  hazardStripe(opts = {}) {
    const r = regionHazardStripe();
    return { parts: [], faces: [faceQuad(r, opts.w ?? 1.36, opts.h ?? 0.19, [0, 0, 0])], colliders: [] };
  },
  /** Wet-floor sign face (both boards). */
  wetFloorFaces() {
    const r = regionWetFloor();
    return {
      parts: [],
      faces: [
        faceQuad(r, 0.27, 0.5, [0, 0.27 - 0.005, -0.125], [0.38, Math.PI, 0]),
        faceQuad(r, 0.27, 0.5, [0, 0.27 - 0.005, 0.125], [-0.38, 0, 0]),
      ],
      colliders: [],
    };
  },
  /** Free-standing lobby directory. opts: { floor }. */
  directory(opts = {}) {
    const r = regionDirectory(opts.floor ?? 'ground');
    return {
      parts: [
        P(BB(0.6, 0.06, 0.42, 0.01), 'metal.blackAnodised', [0, 0.03, 0]),
        P(BB(0.08, 1.7, 0.08, 0.008), 'metal.blackAnodised', [0, 0.88, 0.02]),
        P(BB(0.56, 0.82, 0.04, 0.006), 'metal.blackAnodised', [0, 1.28, -0.02]),
      ],
      faces: [faceQuad(r, 0.5, 0.72, [0, 1.28, -0.042])],
      colliders: [KIT.collider(-0.3, 0, -0.21, 0.3, 1.7, 0.21, 'metal', 'directory')],
    };
  },
  /** CCTV notice. 0.22 × 0.3. */
  securityNotice() {
    const r = regionSecurityNotice();
    return {
      parts: [P(BB(0.24, 0.32, 0.01, 0.003), 'plastic.smooth', [0, 0, -0.005])],
      faces: [faceQuad(r, 0.22, 0.3, [0, 0, -0.011])],
      colliders: [],
    };
  },
  /** Stairwell level marker. opts: { label: 'G'|'1' }. 0.35 × 0.35. */
  stairLevel(opts) {
    const r = regionStairLevel(opts.label ?? 'G');
    return {
      parts: [],
      faces: [faceQuad(r, 0.35, 0.35, [0, 0, -0.004])],
      colliders: [],
    };
  },
  /** Van livery quad (both flanks handled by caller). 1.8 × 0.78. */
  vanLivery() {
    const r = regionVanLivery();
    return { parts: [], faces: [faceQuad(r, 1.8, 0.78, [0, 0, 0])], colliders: [] };
  },
  /** Grit bin label. 0.5 × 0.27. */
  gritLabel() {
    const r = regionGrit();
    return { parts: [], faces: [faceQuad(r, 0.5, 0.27, [0, 0, 0])], colliders: [] };
  },
  /** Desk nameplate. opts: { name, title }. Standing wedge. */
  nameplate(opts) {
    const r = regionNameplate(opts.name ?? 'K. HALVORSEN', opts.title ?? 'Executive Assistant');
    return {
      parts: [P(BB(0.26, 0.07, 0.03, 0.005), 'metal.blackAnodised', [0, 0.038, 0.008], [-0.22, 0, 0])],
      faces: [faceQuad(r, 0.25, 0.065, [0, 0.04, -0.009], [-0.22 + 0, Math.PI, 0])],
      colliders: [],
    };
  },
};

/**
 * Build and place a sign: applies pos/yaw to parts, faces and colliders.
 * `kind` is a key of SIGN_BUILDERS; opts includes { pos, rot, ...kindOpts }.
 */
export function signProp(kind, opts = {}) {
  const builder = SIGN_BUILDERS[kind];
  if (!builder) {
    console.error(`[signage] unknown sign kind "${kind}"`);
    return { parts: [], faces: [], colliders: [] };
  }
  const res = builder(opts);
  const pos = opts.pos ?? [0, 0, 0];
  const yaw = opts.rot ?? 0;
  const M = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(1, 1, 1),
  );
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return {
    parts: res.parts.map((p) => ({ ...p, matrix: M.clone().multiply(p.matrix) })),
    faces: res.faces.map((f) => ({ ...f, matrix: M.clone().multiply(f.matrix) })),
    colliders: (res.colliders ?? []).map((c) => {
      const corners = [[c.x0, c.z0], [c.x1, c.z0], [c.x0, c.z1], [c.x1, c.z1]]
        .map(([x, z]) => [pos[0] + x * cos + z * sin, pos[2] + (-x * sin + z * cos)]);
      const xs = corners.map((q) => q[0]);
      const zs = corners.map((q) => q[1]);
      return { ...c, x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs), y0: pos[1] + c.y0, y1: pos[1] + c.y1 };
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Manifest                                                             */
/* ------------------------------------------------------------------ */

const SIGN_DOC = [
  ['sign.roomSign', 'Room number plate', '0.30 × 0.12 m', 'beside every named door', 'Navy plate, number block, room name; brushed backer. Text legible at 2 m.'],
  ['sign.deptSign', 'Department sign', '0.95 × 0.26 m', 'openplan, it, archive, execcorr', 'Division name with star mark and gold keel line; legible at 6 m.'],
  ['sign.directional', 'Wayfinding sign', '0.80 × variable', 'corridor junctions, lobby', 'Arrow rows with rule separators; arrows read at 8 m.'],
  ['sign.safetyPoster', 'Safety poster', '0.44 × 0.64 m', 'corridors, breakroom, loading', 'Four original poster designs (winter footing, lifting, fire, clear desk) in aluminium frames.'],
  ['sign.evacDiagram', 'Evacuation diagram', '0.33 × 0.46 m', 'every wing, both floors', 'Simplified true-to-layout plan with route arrows and YOU ARE HERE dot.'],
  ['sign.notice', 'Taped notice', '0.21 × 0.29 m', 'breakroom, copy, doors', 'Eight original A4 memos (incl. paper-jam and evacuation notices) with tape corners and random tilt.'],
  ['sign.bulletinBoard', 'Bulletin board', '0.95 × 0.66 m', 'breakroom, openplanB', 'Cork board with six pinned, rotated notes and pin dots.'],
  ['sign.whiteboardContent', 'Whiteboard writing', '1.70 × 1.06 m', 'over prop.whiteboard faces', 'Four marker layouts (sprint board, chart, storm meeting, half-erased agenda) with erased ghosts.'],
  ['sign.bookRow', 'Book spine strip', '≈0.76 × 0.30 m per shelf', 'prop.bookcase, prop.rackArchive shelves', 'Eight flat-colour spine strips (muted palette, darker foot band, pale title bar) — no high-frequency noise; replaces per-book geometry.'],
  ['sign.brandLogo', 'Northstar brand sign', '1.70 × 0.50 m (wide) / 0.6² (mark)', 'lobby, execcorr', 'Compass-star mark + NORTHSTAR wordmark on navy; original design.'],
  ['sign.artPrint', 'Framed art print', '0.64 × 0.88 m', 'exec suite, lounge, boardroom', 'Three original prints: aurora bands, ridge line, star chart.'],
  ['sign.vendingHeader', 'Vending brand face', '0.84 × 0.20 m', 'prop.vendingMachine header', '"POLAR SNACKS" gradient header, fictional brand.'],
  ['sign.shippingLabel', 'Shipping label', '0.20 × 0.14 m', 'crates, boxes in loading', 'Three consignment labels with barcodes; fictional POs.'],
  ['sign.equipLabel', 'Equipment label', '0.24 × 0.10 m', 'panels, AHU, risers, racks', 'Engraved-read tags (AHU-1, PANEL LP-2 400V…), hazard chevron variant.'],
  ['sign.hazardStripe', 'Hazard stripe band', '1.36 × 0.19 m', 'prop.barrier plank, dock edge', 'Black/amber chevrons, tiling-safe.'],
  ['sign.wetFloorFaces', 'Wet floor sign face', '0.27 × 0.50 m ×2', 'prop.wetFloorSign', 'CAUTION WET FLOOR with slipping-figure pictogram, both boards.'],
  ['sign.directory', 'Lobby directory', '0.5 × 0.72 m panel on 1.7 m post', 'lobby, mezz', 'Free-standing directory listing fictional rooms; collider on the post.'],
  ['sign.securityNotice', 'CCTV notice', '0.22 × 0.30 m', 'vestibule, loading, garage', 'Camera pictogram + CCTV IN OPERATION.'],
  ['sign.stairLevel', 'Stair level marker', '0.35 × 0.35 m', 'stairwell, firestair', 'Giant G / 1 level letters on navy.'],
  ['sign.vanLivery', 'Van livery', '1.80 × 0.78 m', 'prop.vanUtility flanks', 'POLAR LOGISTICS wordmark with star; applied to both van sides.'],
  ['sign.gritLabel', 'Grit bin label', '0.50 × 0.27 m', 'prop.gritBin', 'GRIT block letters on amber.'],
  ['sign.nameplate', 'Desk nameplate', '0.25 × 0.065 m', 'reception, execante', 'Standing wedge with fictional staff names.'],
];

let registered = false;
export function registerSignageManifest() {
  if (registered) return;
  registered = true;
  for (const [id, name, dimensions, usedIn, acc] of SIGN_DOC) {
    reg({
      id,
      name,
      category: 'signage',
      owner: OWNERS.FABLE3,
      files: ['src/props/signage.js', 'src/props/dress.js'],
      usedIn,
      dimensions,
      pivot: 'sign centre against mount plane, face towards −Z before yaw',
      materials: ['signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces)', 'metal.aluminium / metal.blackAnodised / wood backers'],
      textures: ['baseColor from shared signage atlas (Canvas2D, original artwork/text only)'],
      collision: id === 'sign.directory' ? 'AABB on post' : 'none — flat wall/prop dressing',
      lod: 'single quad per face; whole signage set merges to one mesh + one texture, mips handle distance',
      status: 'accepted',
      acceptance: `${acc} No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).`,
      evidence: ['screenshots/gallery/signage.png'],
    });
  }
  for (const [kind, name, usedIn, acc] of SCREEN_DOC) {
    reg({
      id: `screen.${kind}`,
      name,
      category: 'signage',
      owner: OWNERS.FABLE3,
      files: ['src/props/signage.js', 'src/props/library.js'],
      usedIn,
      dimensions: 'atlas region ≈320 × 180 px, mapped to each device\u2019s panel size',
      pivot: 'quad centred on the device panel, facing −Z before yaw',
      materials: ['screen.atlas (shared 1024×1024 canvas as map + emissiveMap, emissive ×0.62 — legible, not clipped)'],
      textures: ['baseColor + emissive from shared screen atlas (Canvas2D, original UI fiction)'],
      collision: 'none — face quad on a device that carries its own collider where needed',
      lod: 'single quad per screen; all screens merge to one mesh + one texture, mips handle distance',
      status: 'accepted',
      acceptance: `${acc} Peak painted luminance ≈72% white so the panel reads as content, not a light source. All text original fiction.`,
      evidence: ['screenshots/gallery/screens.png'],
    });
  }
  void UI;
}

const SCREEN_DOC = [
  ['spreadsheet', 'Screen — ledger spreadsheet', 'desk monitors', 'Grid, header band, row/column figures, selection cell.'],
  ['mail', 'Screen — mail client', 'desk monitors, laptops', 'Folder rail, message list with original subjects, reading pane.'],
  ['dashboard', 'Screen — facilities dashboard', 'desk monitors, wall display', 'Meridian Facilities tiles (AHU, load, humidity, dock fault) + trend chart.'],
  ['cad', 'Screen — floor-plan CAD view', 'desk monitors (IT, records)', 'Dark plan view with rooms, door swings, gold dimension line.'],
  ['login', 'Screen — sign-in prompt', 'shared desks', 'Northstar star mark, user/password fields, SIGN IN button.'],
  ['locked', 'Screen — locked session', 'desk monitors, laptops', '"SESSION LOCKED — Northstar Administrative Center", resume hint, workstation id.'],
  ['cctv', 'Screen — CCTV quad split A', 'security monitor bank', 'Four labelled camera cells with timestamps and scanline sheen.'],
  ['cctv2', 'Screen — CCTV quad split B', 'security monitor bank', 'Second camera set; one dead cell reads NO SIGNAL.'],
  ['rack', 'Screen — rack monitoring console', 'server room console', 'Hostname rows with green/amber load blocks; NSR fleet fiction.'],
  ['slides', 'Screen — presentation title slide', 'conference/boardroom displays', '"Q3 OPERATIONS REVIEW — Polar Logistics" title slide with keel accent.'],
  ['copier', 'Screen — copier panel (ready)', 'prop.copierFloor', 'READY status, tray/toner lines, soft buttons.'],
  ['copierJam', 'Screen — copier panel (jam)', 'prop.copierFloor jam variant', 'Amber warning triangle, PAPER JAM — open panel B.'],
  ['nosignal', 'Screen — no input signal', 'one or two monitors', 'Black panel with drifted blue NO INPUT SIGNAL box.'],
];