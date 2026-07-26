import * as THREE from 'three';
import * as KIT from '../map/kit.js';
import {
  MAT, tiled, plainMaterial, emissivePanel, cork, screenMaterial, screenOffMaterial,
  clearGlass, frostedGlass,
} from '../art/materials.js';
import { PALETTE, SHAPE_LANGUAGE as SL, shade, css, mix } from '../art/palette.js';
import { generateImageTexture, drawLabel, roundRectPath } from '../art/texgen.js';
import { SURFACE } from '../physics/world.js';
import { mulberry32, hashString } from '../core/rng.js';
import { ROOMS } from '../map/layout.js';

// ---------------------------------------------------------------------------
// Prop factory library.  (owner: fable3)
//
// Every factory returns a THREE.Group (pivot at base centre, -Z forward unless
// noted) built at real-world scale from the shared kit primitives. Collision
// proxies live in group.userData.collision as {pos:[x,y,z], size:[w,h,d],
// surface} boxes in the prop's LOCAL space; the populator transforms them.
// Geometry is cached inside kit.js, materials inside materials.js, and screen
// textures inside texgen.js, so cloning or re-calling factories is cheap.
// ---------------------------------------------------------------------------

const pm = plainMaterial;

function grp(name) {
  const g = new THREE.Group();
  g.name = name;
  g.userData.collision = [];
  return g;
}

function col(g, pos, size, surface = SURFACE.WOOD) {
  g.userData.collision.push({ pos, size, surface });
}

function M(g, geo, mat, x = 0, y = 0, z = 0, opts = {}) {
  const m = KIT.mesh(geo, mat, opts);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

// Shared small materials --------------------------------------------------
const ledCache = new Map();
export function ledMaterial(color, intensity = 2.2) {
  const key = `${color}:${intensity}`;
  if (!ledCache.has(key)) {
    ledCache.set(key, new THREE.MeshStandardMaterial({
      color: 0x111111, emissive: color, emissiveIntensity: intensity, roughness: 0.4,
    }));
  }
  return ledCache.get(key);
}

const steelLegMat = () => pm(0x3c4147, { roughness: 0.4, metalness: 0.75 }, 'desksteel');
const darkTrimMat = () => pm(0x2b2f34, { roughness: 0.5, metalness: 0.3 }, 'darktrim');
const aluTrimMat = () => pm(PALETTE.aluminum, { roughness: 0.35, metalness: 0.85 }, 'alutrim');
const chromePole = () => pm(0xc9ced4, { roughness: 0.14, metalness: 0.95 }, 'chromepole');

// =========================================================================
// BRAND & SCREEN PAINTERS — all copy is original "Northstar" material.
// =========================================================================

/** Original Northstar mark: an eight-point compass star in a ring. */
export function paintNorthstarMark(ctx, cx, cy, r, color = '#7fd4e8', ring = true) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const long = i % 2 === 0;
    const tip = long ? r : r * 0.52;
    const waist = r * 0.16;
    const a0 = a - Math.PI / 8;
    const a1 = a + Math.PI / 8;
    if (i === 0) ctx.moveTo(Math.cos(a0) * waist, Math.sin(a0) * waist);
    else ctx.lineTo(Math.cos(a0) * waist, Math.sin(a0) * waist);
    ctx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip);
    ctx.lineTo(Math.cos(a1) * waist, Math.sin(a1) * waist);
  }
  ctx.closePath();
  ctx.fill();
  if (ring) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function paintScreenChrome(ctx, w, h, title, accent = '#4fd0e8') {
  ctx.fillStyle = '#101820';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#182430';
  ctx.fillRect(0, 0, w, 18);
  paintNorthstarMark(ctx, 10, 9, 5, accent, false);
  drawLabel(ctx, title, 20, 4, { font: 'bold 10px Arial', color: '#cfe2ee' });
  drawLabel(ctx, '08:12', w - 6, 4, { font: '10px Arial', color: '#8ca4b4', align: 'right' });
}

const SCREEN_PAINTERS = {
  os(ctx, w, h) {
    // "Aurora Desk" — original OS desktop.
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#12303f');
    g.addColorStop(1, '#071219');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    paintNorthstarMark(ctx, w * 0.5, h * 0.44, h * 0.2, 'rgba(127,212,232,0.5)');
    drawLabel(ctx, 'NORTHSTAR AURORA DESK 4.2', w / 2, h * 0.72, { font: '9px Arial', color: 'rgba(200,225,240,0.55)', align: 'center' });
    // Desktop icons
    const rnd = mulberry32(hashString('osicons'));
    for (let i = 0; i < 6; i++) {
      const x = 10, y = 10 + i * 22;
      ctx.fillStyle = `rgba(${120 + rnd() * 80},${170 + rnd() * 60},${200 + rnd() * 40},0.85)`;
      roundRectPath(ctx, x, y, 14, 12, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(220,235,245,0.7)';
      ctx.fillRect(x - 2, y + 15, 20, 2);
    }
    // Taskbar
    ctx.fillStyle = '#0a141c';
    ctx.fillRect(0, h - 14, w, 14);
    ctx.fillStyle = '#4fd0e8';
    ctx.fillRect(4, h - 11, 8, 8);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(140,170,190,0.5)';
      ctx.fillRect(20 + i * 16, h - 10, 12, 6);
    }
  },
  sheet(ctx, w, h) {
    paintScreenChrome(ctx, w, h, 'LEDGER — Q3-BUDGET.NSX');
    const rnd = mulberry32(hashString('sheet'));
    const top = 22, rows = 9, cols = 6;
    const rh = (h - top - 4) / rows;
    const cw = (w - 8) / cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 4 + c * cw, y = top + r * rh;
        ctx.fillStyle = r === 0 ? '#22343f' : (r % 2 ? '#141f28' : '#18242e');
        ctx.fillRect(x + 0.5, y + 0.5, cw - 1, rh - 1);
        ctx.fillStyle = r === 0 ? '#9fc3d4' : '#6f8a99';
        ctx.font = '7px Arial';
        const v = r === 0 ? ['DEPT', 'Q1', 'Q2', 'Q3', 'FCST', 'VAR'][c]
          : c === 0 ? ['OPS', 'IT', 'HR', 'FAC', 'SEC', 'LOG', 'FIN', 'R&D'][r - 1]
            : (rnd() * 900 + 20).toFixed(1);
        ctx.fillText(String(v), x + 3, y + rh * 0.7);
      }
    }
  },
  mail(ctx, w, h) {
    paintScreenChrome(ctx, w, h, 'NSMAIL — INBOX (23)');
    const lines = [
      ['Facilities', 'RE: Parking lot ploughing schedule'],
      ['R. Calloway', 'Sunfield room booking — 08:30'],
      ['IT Helpdesk', 'Planned server maintenance tonight'],
      ['M. Oyelaran', 'Q3 numbers before the board call'],
      ['Security', 'Badge audit — action required'],
      ['HR', 'Winter storm: work from home policy'],
    ];
    lines.forEach(([from, subj], i) => {
      const y = 24 + i * 16;
      ctx.fillStyle = i % 2 ? '#131e27' : '#17232d';
      ctx.fillRect(2, y, w - 4, 15);
      drawLabel(ctx, from, 6, y + 3, { font: 'bold 7px Arial', color: '#a8c4d4' });
      drawLabel(ctx, subj, 60, y + 3, { font: '7px Arial', color: '#7d95a4' });
      ctx.fillStyle = i < 2 ? '#4fd0e8' : '#31424e';
      ctx.beginPath(); ctx.arc(w - 10, y + 8, 2, 0, Math.PI * 2); ctx.fill();
    });
  },
  cctv(ctx, w, h) {
    ctx.fillStyle = '#04070a';
    ctx.fillRect(0, 0, w, h);
    const rnd = mulberry32(hashString('cctv'));
    const cells = [['CAM 01 — LOBBY', '#22323c'], ['CAM 02 — DOCK', '#2a3026'], ['CAM 04 — CORRIDOR B', '#28303a'], ['CAM 07 — GARAGE', '#30302a']];
    cells.forEach(([label, tone], i) => {
      const x = (i % 2) * (w / 2) + 2;
      const y = Math.floor(i / 2) * (h / 2) + 2;
      const cw = w / 2 - 4, chh = h / 2 - 4;
      const g = ctx.createLinearGradient(x, y, x, y + chh);
      g.addColorStop(0, tone);
      g.addColorStop(1, '#0a0e12');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, cw, chh);
      // Blocky "room" shapes + scanline noise.
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      for (let b = 0; b < 4; b++) ctx.fillRect(x + rnd() * cw * 0.7, y + chh * 0.5 + rnd() * chh * 0.3, 8 + rnd() * 20, 6 + rnd() * 12);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let s = 0; s < chh; s += 3) ctx.fillRect(x, y + s, cw, 1);
      drawLabel(ctx, label, x + 3, y + 2, { font: '6px monospace', color: '#b8e6c8' });
      drawLabel(ctx, 'REC ●', x + cw - 3, y + 2, { font: '6px monospace', color: '#ff5548', align: 'right' });
    });
  },
  code(ctx, w, h) {
    paintScreenChrome(ctx, w, h, 'TERMINAL — build@ns-it02', '#4fe08a');
    ctx.font = '7px monospace';
    const rnd = mulberry32(hashString('term'));
    const words = ['patching', 'imaging', 'OK', 'deploy', 'verify', 'hash', 'node', 'sync', 'FAIL', 'retry'];
    for (let i = 0; i < 12; i++) {
      const parts = Math.floor(2 + rnd() * 4);
      let x = 6;
      const y = 26 + i * 10;
      ctx.fillStyle = '#3f9a5f';
      ctx.fillText('$', x, y); x += 8;
      for (let p = 0; p < parts; p++) {
        const word = words[Math.floor(rnd() * words.length)];
        ctx.fillStyle = word === 'FAIL' ? '#e06050' : '#8fb8a0';
        ctx.fillText(word, x, y);
        x += ctx.measureText(word).width + 5;
      }
    }
  },
  intel(ctx, w, h) {
    paintScreenChrome(ctx, w, h, 'VISITOR & ACCESS LOG — 14 JAN', '#ffb03a');
    const rows = [
      ['07:41', 'M. OYELARAN', 'EXEC M-301', 'BADGE OK'],
      ['07:55', 'R. CALLOWAY', 'SUNFIELD A-201', 'BADGE OK'],
      ['08:02', 'DELIVERY — PALLET x3', 'DOCK', 'ESCORTED'],
      ['08:07', 'UNLISTED CREW (4)', 'GARAGE', 'OVERRIDE ??'],
      ['08:09', 'ALARM MASKED', 'PANEL 2', 'SUPERVISOR'],
      ['08:11', 'CAMS 05/06 OFFLINE', 'SERVER RM', 'FAULT'],
    ];
    rows.forEach((r, i) => {
      const y = 24 + i * 15;
      ctx.fillStyle = i >= 3 ? 'rgba(255,80,60,0.12)' : (i % 2 ? '#131e27' : '#17232d');
      ctx.fillRect(2, y, w - 4, 14);
      drawLabel(ctx, r[0], 6, y + 3, { font: '7px monospace', color: '#8ca4b4' });
      drawLabel(ctx, r[1], 38, y + 3, { font: 'bold 7px Arial', color: i >= 3 ? '#ffb0a0' : '#a8c4d4' });
      drawLabel(ctx, r[2], 130, y + 3, { font: '7px Arial', color: '#7d95a4' });
      drawLabel(ctx, r[3], w - 6, y + 3, { font: '7px Arial', color: i >= 3 ? '#ff6a58' : '#6f9a80', align: 'right' });
    });
  },
  servers(ctx, w, h) {
    paintScreenChrome(ctx, w, h, 'RACK HEALTH — NODE B', '#4fe08a');
    const rnd = mulberry32(hashString('srvgraph'));
    for (let c = 0; c < 2; c++) {
      const x0 = 6 + c * (w / 2);
      const cw = w / 2 - 12;
      ctx.strokeStyle = '#26414d';
      ctx.strokeRect(x0, 26, cw, 48);
      ctx.strokeStyle = c ? '#ffa42b' : '#4fd0e8';
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const x = x0 + (cw * i) / 24;
        const y = 70 - (Math.sin(i * 0.6 + c * 2) * 0.35 + 0.5 + rnd() * 0.14) * 40;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      drawLabel(ctx, c ? 'TEMP 24.1C' : 'LOAD 62%', x0, 78, { font: '7px monospace', color: '#7d95a4' });
    }
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i === 5 ? '#e06050' : '#3f9a5f';
      ctx.fillRect(8 + i * 18, h - 18, 12, 8);
    }
  },
};

/** Cached emissive monitor content material. */
export function screenContentMaterial(content = 'os', px = 256, py = 160) {
  if (content === 'off') return screenOffMaterial();
  const tex = generateImageTexture(`screen:${content}`, px, py, (ctx, w, h) => {
    (SCREEN_PAINTERS[content] || SCREEN_PAINTERS.os)(ctx, w, h);
  });
  return screenMaterial(content, tex);
}

// =========================================================================
// OFFICE FURNITURE
// =========================================================================

export function deskStandard() {
  const g = grp('deskStandard');
  const topMat = tiled(MAT.laminateLight, 0.8);
  const top = M(g, KIT.bevelBox(1.6, 0.028, 0.8, 0.006), topMat, 0, 0.735 - 0.014, 0);
  top.name = 'top';
  // Cable grommet at the back of the top.
  M(g, KIT.cyl(0.032, 0.032, 0.02, 12), darkTrimMat(), 0.55, 0.732, -0.3);
  // Modesty panel.
  M(g, KIT.bevelBox(1.44, 0.34, 0.018, 0.004), pm(0x8d939a, { roughness: 0.5, metalness: 0.4 }, 'modesty'), 0, 0.52, -0.36);
  // Steel C-legs with feet.
  for (const sx of [-1, 1]) {
    M(g, KIT.bevelBox(0.05, 0.7, 0.06, 0.006), steelLegMat(), sx * 0.74, 0.35, -0.3);
    M(g, KIT.bevelBox(0.05, 0.04, 0.68, 0.006), steelLegMat(), sx * 0.74, 0.02, 0.02);
    M(g, KIT.bevelBox(0.05, 0.05, 0.62, 0.006), steelLegMat(), sx * 0.74, 0.695, 0.02);
  }
  col(g, [0, 0.37, 0], [1.6, 0.74, 0.8], SURFACE.WOOD);
  return g;
}

export function deskExecutive() {
  const g = grp('deskExecutive');
  const veneer = tiled(MAT.woodDark, 1);
  M(g, KIT.bevelBox(1.9, 0.035, 0.95, 0.008), veneer, 0, 0.735 - 0.017, 0);
  // Drawer pedestal (user's right).
  const ped = M(g, KIT.bevelBox(0.44, 0.62, 0.85, 0.006), veneer, 0.66, 0.4, 0);
  ped.name = 'pedestal';
  for (let i = 0; i < 3; i++) {
    M(g, KIT.bevelBox(0.38, 0.155, 0.014, 0.004), tiled(MAT.woodDesk, 0.6), 0.66, 0.19 + i * 0.185, 0.43);
    M(g, KIT.bevelBox(0.16, 0.018, 0.02, 0.004), aluTrimMat(), 0.66, 0.245 + i * 0.185, 0.445);
  }
  // Leg panel and modesty on the other side.
  M(g, KIT.bevelBox(0.05, 0.7, 0.85, 0.006), veneer, -0.9, 0.35, 0);
  M(g, KIT.bevelBox(1.5, 0.42, 0.03, 0.006), veneer, -0.1, 0.48, -0.42);
  // Leather writing inlay.
  M(g, KIT.box(0.7, 0.004, 0.45), tiled(MAT.leather, 0.5), -0.2, 0.737, 0.05);
  col(g, [0, 0.37, 0], [1.9, 0.74, 0.95], SURFACE.WOOD);
  return g;
}

export function receptionDesk() {
  const g = grp('receptionDesk');
  const veneer = tiled(MAT.woodDesk, 1);
  const accent = pm(PALETTE.brandDeep, { roughness: 0.42 }, 'recepaccent');

  // Curved front fascia: 120° arc facing +Z.
  const R = 1.25;
  const arc = new THREE.CylinderGeometry(R, R, 1.06, 28, 1, true, -Math.PI / 3 + Math.PI / 2, Math.PI * 2 / 3);
  const fascia = new THREE.Mesh(arc, veneer);
  fascia.castShadow = true; fascia.receiveShadow = true;
  fascia.position.y = 0.53;
  g.add(fascia);
  // Brand band on the fascia.
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.006, R + 0.006, 0.18, 28, 1, true, -Math.PI / 3 + Math.PI / 2, Math.PI * 2 / 3),
    accent
  );
  band.position.y = 0.62;
  g.add(band);
  paintNorthstarMark; // (logo panel is applied by the populator as SIGN-LOGO)

  // Transaction counter: annular sector on top of the arc.
  const ring = new THREE.Shape();
  ring.absarc(0, 0, R + 0.16, Math.PI / 6, Math.PI * 5 / 6, false);
  ring.absarc(0, 0, R - 0.22, Math.PI * 5 / 6, Math.PI / 6, true);
  const ringGeo = new THREE.ExtrudeGeometry(ring, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 24 });
  ringGeo.rotateX(-Math.PI / 2);
  KIT.applyBoxUV(ringGeo, 1);
  const counter = new THREE.Mesh(ringGeo, veneer);
  counter.castShadow = true; counter.receiveShadow = true;
  counter.position.y = 1.06;
  // Shape Y maps to -Z after rotateX(-PI/2); flip so the arc faces +Z like the fascia.
  counter.rotation.y = Math.PI;
  g.add(counter);

  // Interior worktop + support pedestals (staff side, -Z).
  M(g, KIT.bevelBox(2.0, 0.028, 0.62, 0.006), tiled(MAT.laminateLight, 0.8), 0, 0.72, -0.55);
  for (const sx of [-1, 1]) M(g, KIT.bevelBox(0.4, 0.69, 0.55, 0.006), veneer, sx * 0.75, 0.345, -0.55);

  col(g, [0, 0.55, 0.45], [2.6, 1.1, 0.95], SURFACE.WOOD);
  col(g, [0, 0.37, -0.55], [2.0, 0.74, 0.62], SURFACE.WOOD);
  return g;
}

export function cubiclePanel(width = 1.6, height = 1.2) {
  const g = grp(`cubiclePanel-${width}-${height}`);
  const t = 0.055;
  // Fabric core.
  M(g, KIT.bevelBox(width - 0.06, height - 0.12, t, 0.006), tiled(MAT.fabricPanel, 0.6), 0, (height - 0.06) / 2, 0);
  // Aluminium trim: top cap, kick strip, end rails.
  M(g, KIT.bevelBox(width, 0.045, t + 0.014, 0.005), aluTrimMat(), 0, height - 0.022, 0);
  M(g, KIT.bevelBox(width, 0.09, t + 0.008, 0.005), darkTrimMat(), 0, 0.045, 0);
  for (const sx of [-1, 1]) M(g, KIT.bevelBox(0.035, height, t + 0.006, 0.004), aluTrimMat(), sx * (width / 2 - 0.018), height / 2, 0);
  col(g, [0, height / 2, 0], [width, height, t + 0.02], SURFACE.FABRIC);
  return g;
}

export function cubiclePost(height = 1.2) {
  const g = grp('cubiclePost');
  M(g, KIT.bevelBox(0.07, height, 0.07, 0.008), aluTrimMat(), 0, height / 2, 0);
  M(g, KIT.bevelBox(0.09, 0.02, 0.09, 0.004), darkTrimMat(), 0, height + 0.01, 0);
  col(g, [0, height / 2, 0], [0.08, height, 0.08], SURFACE.METAL);
  return g;
}

export function conferenceTable() {
  const g = grp('conferenceTable');
  // Boat-shaped top: long edges bow outward.
  const L = 3.2, W = 1.2, bow = 0.12;
  const shape = new THREE.Shape();
  shape.moveTo(-L / 2, -W / 2 + bow);
  shape.quadraticCurveTo(0, -W / 2 - bow, L / 2, -W / 2 + bow);
  shape.lineTo(L / 2, W / 2 - bow);
  shape.quadraticCurveTo(0, W / 2 + bow, -L / 2, W / 2 - bow);
  shape.closePath();
  const topGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 12 });
  topGeo.rotateX(-Math.PI / 2);
  KIT.applyBoxUV(topGeo, 1.2);
  const top = new THREE.Mesh(topGeo, tiled(MAT.woodDesk, 1.4));
  top.castShadow = true; top.receiveShadow = true;
  top.position.y = 0.73;
  g.add(top);
  // Twin column bases.
  for (const sx of [-1, 1]) {
    M(g, KIT.bevelBox(0.14, 0.68, 0.6, 0.01), darkTrimMat(), sx * 0.95, 0.34, 0);
    M(g, KIT.bevelBox(0.5, 0.045, 0.78, 0.008), darkTrimMat(), sx * 0.95, 0.022, 0);
  }
  // Centre cable box with flip lid.
  M(g, KIT.bevelBox(0.42, 0.02, 0.14, 0.004), darkTrimMat(), 0, 0.775, 0);
  M(g, KIT.bevelBox(0.38, 0.012, 0.1, 0.003), aluTrimMat(), 0, 0.787, 0);
  col(g, [0, 0.385, 0], [3.2, 0.77, 1.32], SURFACE.WOOD);
  return g;
}

function chairStarBase(g, poleH = 0.22) {
  M(g, KIT.cyl(0.028, 0.034, poleH, 10), chromePole(), 0, 0.1 + poleH / 2, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = M(g, KIT.bevelBox(0.3, 0.032, 0.05, 0.008), darkTrimMat(), Math.cos(a) * 0.15, 0.075, Math.sin(a) * 0.15);
    arm.rotation.y = -a;
    const castor = M(g, KIT.cyl(0.026, 0.026, 0.024, 8), darkTrimMat(), Math.cos(a) * 0.29, 0.028, Math.sin(a) * 0.29);
    castor.rotation.x = Math.PI / 2;
  }
}

export function taskChair() {
  const g = grp('taskChair');
  chairStarBase(g, 0.24);
  // Seat pan.
  M(g, KIT.bevelBox(0.48, 0.07, 0.46, 0.02), tiled(MAT.fabricChair, 0.5), 0, 0.465, 0.02);
  // Mesh back with frame, raked slightly.
  const back = new THREE.Group();
  const frame = KIT.mesh(KIT.bevelBox(0.46, 0.56, 0.035, 0.012), darkTrimMat());
  back.add(frame);
  const meshPane = KIT.mesh(KIT.bevelBox(0.4, 0.48, 0.018, 0.008), tiled(MAT.fabricChair, 0.5));
  meshPane.position.z = 0.004;
  back.add(meshPane);
  back.position.set(0, 0.82, -0.23);
  back.rotation.x = -0.12;
  g.add(back);
  // Lumbar spine connecting seat to back.
  M(g, KIT.bevelBox(0.05, 0.3, 0.04, 0.008), darkTrimMat(), 0, 0.56, -0.24).rotation.x = -0.18;
  // Arms.
  for (const sx of [-1, 1]) {
    M(g, KIT.bevelBox(0.035, 0.2, 0.05, 0.008), darkTrimMat(), sx * 0.24, 0.55, 0.02);
    M(g, KIT.bevelBox(0.05, 0.025, 0.24, 0.008), pm(0x33383e, { roughness: 0.7 }, 'armpad'), sx * 0.24, 0.66, 0.02);
  }
  col(g, [0, 0.5, 0], [0.56, 1.0, 0.56], SURFACE.FABRIC);
  return g;
}

export function conferenceChair() {
  const g = grp('conferenceChair');
  // Cantilever frame.
  const fm = chromePole();
  for (const sx of [-1, 1]) {
    M(g, KIT.bevelBox(0.03, 0.03, 0.52, 0.008), fm, sx * 0.22, 0.015, 0.02);
    M(g, KIT.bevelBox(0.03, 0.44, 0.03, 0.008), fm, sx * 0.22, 0.24, 0.24);
    M(g, KIT.bevelBox(0.03, 0.24, 0.03, 0.008), fm, sx * 0.22, 0.56, 0.24).rotation.x = 0.5;
  }
  M(g, KIT.bevelBox(0.47, 0.06, 0.45, 0.016), tiled(MAT.fabricChair, 0.5), 0, 0.46, 0.05);
  const back = M(g, KIT.bevelBox(0.47, 0.45, 0.05, 0.014), tiled(MAT.fabricChair, 0.5), 0, 0.76, -0.16);
  back.rotation.x = -0.1;
  for (const sx of [-1, 1]) M(g, KIT.bevelBox(0.04, 0.02, 0.3, 0.006), fm, sx * 0.22, 0.63, 0.06);
  col(g, [0, 0.5, 0], [0.52, 0.98, 0.55], SURFACE.FABRIC);
  return g;
}

export function waitingChair() {
  const g = grp('waitingChair');
  const fm = pm(0x3f454c, { roughness: 0.35, metalness: 0.8 }, 'sledframe');
  // Sled base: two runners.
  for (const sx of [-1, 1]) {
    M(g, KIT.bevelBox(0.028, 0.028, 0.56, 0.008), fm, sx * 0.23, 0.02, 0);
    M(g, KIT.bevelBox(0.028, 0.42, 0.028, 0.008), fm, sx * 0.23, 0.22, -0.2);
    M(g, KIT.bevelBox(0.028, 0.42, 0.028, 0.008), fm, sx * 0.23, 0.22, 0.2);
  }
  // Poly shell seat + back, upholstered pad.
  M(g, KIT.bevelBox(0.5, 0.045, 0.46, 0.014), pm(0x5c666e, { roughness: 0.55 }, 'shellgrey'), 0, 0.44, 0.02);
  M(g, KIT.bevelBox(0.5, 0.035, 0.4, 0.012), tiled(MAT.fabricPanel, 0.5), 0, 0.475, 0.02);
  const back = M(g, KIT.bevelBox(0.5, 0.4, 0.04, 0.012), pm(0x5c666e, { roughness: 0.55 }, 'shellgrey'), 0, 0.71, -0.2);
  back.rotation.x = -0.14;
  col(g, [0, 0.46, 0], [0.55, 0.92, 0.52], SURFACE.FABRIC);
  return g;
}

export function stackingChair() {
  const g = grp('stackingChair');
  const fm = aluTrimMat();
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = M(g, KIT.cyl(0.014, 0.016, 0.45, 8), fm, sx * 0.2, 0.225, sz * 0.19);
    leg.rotation.z = sx * 0.06;
    leg.rotation.x = -sz * 0.06;
  }
  M(g, KIT.bevelBox(0.45, 0.035, 0.44, 0.014), pm(0x8d4f3a, { roughness: 0.5 }, 'polyshell'), 0, 0.45, 0);
  const back = M(g, KIT.bevelBox(0.45, 0.34, 0.03, 0.012), pm(0x8d4f3a, { roughness: 0.5 }, 'polyshell'), 0, 0.68, -0.2);
  back.rotation.x = -0.12;
  col(g, [0, 0.44, 0], [0.48, 0.88, 0.48], SURFACE.PLASTIC);
  return g;
}

export function sofaThreeSeat() {
  const g = grp('sofaThreeSeat');
  const lm = tiled(MAT.leather, 0.7);
  M(g, KIT.bevelBox(1.92, 0.3, 0.85, 0.02), lm, 0, 0.23, 0);
  for (let i = 0; i < 3; i++) {
    M(g, KIT.bevelBox(0.58, 0.13, 0.62, 0.035), lm, -0.62 + i * 0.62, 0.44, 0.06);
    M(g, KIT.bevelBox(0.58, 0.42, 0.16, 0.04), lm, -0.62 + i * 0.62, 0.62, -0.33);
  }
  for (const sx of [-1, 1]) M(g, KIT.bevelBox(0.16, 0.52, 0.8, 0.03), lm, sx * 1.04, 0.34, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    M(g, KIT.cyl(0.022, 0.026, 0.08, 8), darkTrimMat(), sx * 1.0, 0.04, sz * 0.36);
  }
  col(g, [0, 0.42, 0], [2.24, 0.84, 0.85], SURFACE.FABRIC);
  return g;
}

export function sideTable() {
  const g = grp('sideTable');
  M(g, KIT.cyl(0.3, 0.3, 0.024, 20), tiled(MAT.woodDesk, 0.6), 0, 0.47, 0);
  M(g, KIT.cyl(0.03, 0.03, 0.44, 10), darkTrimMat(), 0, 0.24, 0);
  M(g, KIT.cyl(0.2, 0.22, 0.02, 20), darkTrimMat(), 0, 0.01, 0);
  col(g, [0, 0.25, 0], [0.6, 0.5, 0.6], SURFACE.WOOD);
  return g;
}

export function filingCabinet(drawers = 4) {
  const g = grp(`filingCabinet-${drawers}`);
  const h = drawers === 2 ? 0.72 : 1.32;
  const body = tiled(MAT.metalPainted, 0.8);
  M(g, KIT.bevelBox(0.47, h, 0.62, 0.006), body, 0, h / 2, 0);
  const dh = (h - 0.08) / drawers;
  for (let i = 0; i < drawers; i++) {
    const y = 0.05 + dh * i + dh / 2;
    M(g, KIT.bevelBox(0.42, dh - 0.025, 0.014, 0.004), tiled(MAT.metalPainted, 0.6), 0, y, 0.315);
    // Recessed pull + label holder.
    M(g, KIT.bevelBox(0.14, 0.025, 0.018, 0.004), aluTrimMat(), 0, y + dh * 0.28, 0.33);
    M(g, KIT.bevelBox(0.09, 0.045, 0.008, 0.002), pm(0xe8e4d8, { roughness: 0.7 }, 'labelcard'), 0, y - dh * 0.1, 0.328);
  }
  col(g, [0, h / 2, 0], [0.47, h, 0.62], SURFACE.METAL);
  return g;
}

export function pedestalDrawers() {
  const g = grp('pedestalDrawers');
  const body = tiled(MAT.metalPainted, 0.6);
  M(g, KIT.bevelBox(0.4, 0.58, 0.55, 0.006), body, 0, 0.33, 0);
  for (let i = 0; i < 3; i++) {
    const hgt = i === 2 ? 0.24 : 0.13;
    const y = i === 0 ? 0.13 : i === 1 ? 0.28 : 0.48;
    M(g, KIT.bevelBox(0.36, hgt, 0.012, 0.004), tiled(MAT.metalPainted, 0.5), 0, y + 0.04, 0.28);
    M(g, KIT.bevelBox(0.12, 0.02, 0.016, 0.004), aluTrimMat(), 0, y + 0.08, 0.292);
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    M(g, KIT.cyl(0.02, 0.02, 0.02, 8), darkTrimMat(), sx * 0.15, 0.03, sz * 0.2);
  }
  col(g, [0, 0.32, 0], [0.4, 0.64, 0.55], SURFACE.METAL);
  return g;
}

export function shelvingUnit() {
  const g = grp('shelvingUnit');
  const mat = tiled(MAT.laminateGrey, 0.8);
  for (const sx of [-1, 1]) M(g, KIT.bevelBox(0.02, 1.8, 0.34, 0.004), mat, sx * 0.39, 0.9, 0);
  M(g, KIT.bevelBox(0.8, 1.8, 0.014, 0.004), tiled(MAT.laminateGrey, 1), 0, 0.9, -0.163);
  for (let i = 0; i < 5; i++) M(g, KIT.bevelBox(0.76, 0.022, 0.32, 0.004), mat, 0, 0.06 + i * 0.43, 0);
  col(g, [0, 0.9, 0], [0.8, 1.8, 0.35], SURFACE.WOOD);
  return g;
}

/** Box-file spines drawn as one textured strip: cheap shelf dressing. */
function boxFileRowMaterial(seed) {
  const tex = generateImageTexture(`boxfiles:${seed}`, 256, 64, (ctx, w, h) => {
    const rnd = mulberry32(hashString(`bf${seed}`));
    const cols = ['#7a4a32', '#3d5a6b', '#5a6b3d', '#6b3d44', '#46536b', '#77683f'];
    let x = 0;
    while (x < w) {
      const bw = 18 + rnd() * 8;
      ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
      ctx.fillRect(x, 2, bw - 2, h - 4);
      ctx.fillStyle = 'rgba(240,236,224,0.9)';
      ctx.fillRect(x + 3, 10, bw - 8, 16);
      ctx.fillStyle = 'rgba(30,30,30,0.75)';
      ctx.fillRect(x + 5, 14, (bw - 12) * (0.4 + rnd() * 0.5), 2);
      ctx.fillRect(x + 5, 19, (bw - 12) * (0.3 + rnd() * 0.4), 2);
      ctx.beginPath();
      ctx.arc(x + bw / 2 - 1, h - 14, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fill();
      x += bw;
    }
  });
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
}

export function archiveRack(seed = 1) {
  const g = grp('archiveRack');
  const frame = tiled(MAT.metalPaintedDark, 1);
  const L = 2.4, D = 0.62, H = 2.1;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) M(g, KIT.bevelBox(0.05, H, 0.05, 0.006), frame, sx * (L / 2 - 0.03), H / 2, sz * (D / 2 - 0.03));
  }
  for (let lvl = 0; lvl < 5; lvl++) {
    const y = 0.12 + lvl * 0.46;
    M(g, KIT.bevelBox(L, 0.028, D, 0.005), frame, 0, y, 0);
    if (lvl < 4) {
      for (const sz of [-1, 1]) {
        const row = M(g, KIT.box(L - 0.14, 0.33, 0.24), boxFileRowMaterial(seed * 10 + lvl + (sz > 0 ? 5 : 0)), 0, y + 0.185, sz * 0.14);
        if (sz < 0) row.rotation.y = Math.PI;
      }
    }
  }
  // Rolling-rack handwheel on one end.
  const wheel = M(g, KIT.torus(0.09, 0.014, 16, 8), pm(0x2a2f35, { roughness: 0.5, metalness: 0.6 }, 'rackwheel'), L / 2 + 0.03, 1.0, 0);
  wheel.rotation.y = Math.PI / 2;
  M(g, KIT.cyl(0.018, 0.018, 0.06, 8), darkTrimMat(), L / 2 + 0.02, 1.0, 0).rotation.z = Math.PI / 2;
  col(g, [0, H / 2, 0], [L + 0.08, H, D], SURFACE.METAL);
  return g;
}

function bookRowMaterial(seed) {
  const tex = generateImageTexture(`books:${seed}`, 256, 64, (ctx, w, h) => {
    const rnd = mulberry32(hashString(`books${seed}`));
    ctx.fillStyle = '#241d16';
    ctx.fillRect(0, 0, w, h);
    let x = 0;
    while (x < w) {
      const bw = 6 + rnd() * 10;
      const bh = h * (0.72 + rnd() * 0.26);
      const hue = Math.floor(rnd() * 360);
      ctx.fillStyle = `hsl(${hue},${18 + rnd() * 25}%,${24 + rnd() * 22}%)`;
      ctx.fillRect(x, h - bh, bw - 1.5, bh);
      ctx.fillStyle = 'rgba(255,248,220,0.55)';
      ctx.fillRect(x + 1, h - bh + 4, bw - 3.5, 2);
      if (rnd() < 0.5) ctx.fillRect(x + 1, h - bh + 9, bw - 3.5, 1.5);
      x += bw;
    }
  });
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
}

export function bookcase(seed = 1) {
  const g = grp('bookcase');
  const mat = tiled(MAT.woodDesk, 0.9);
  M(g, KIT.bevelBox(0.9, 1.9, 0.02, 0.004), mat, 0, 0.95, -0.15);
  for (const sx of [-1, 1]) M(g, KIT.bevelBox(0.025, 1.9, 0.32, 0.005), mat, sx * 0.44, 0.95, 0);
  M(g, KIT.bevelBox(0.9, 0.05, 0.34, 0.006), mat, 0, 1.9, 0);
  M(g, KIT.bevelBox(0.9, 0.07, 0.34, 0.006), mat, 0, 0.035, 0);
  const rnd = mulberry32(hashString(`bookcase${seed}`));
  for (let i = 0; i < 4; i++) {
    const y = 0.12 + i * 0.44;
    M(g, KIT.bevelBox(0.85, 0.025, 0.3, 0.004), mat, 0, y, 0);
    const fill = 0.5 + rnd() * 0.45;
    M(g, KIT.box(0.82 * fill, 0.3, 0.2), bookRowMaterial(seed * 7 + i), (rnd() - 0.5) * 0.8 * (1 - fill), y + 0.165, -0.03);
  }
  col(g, [0, 0.95, 0], [0.9, 1.9, 0.34], SURFACE.WOOD);
  return g;
}

export function coatRack() {
  const g = grp('coatRack');
  M(g, KIT.cyl(0.02, 0.02, 1.7, 10), darkTrimMat(), 0, 0.85, 0);
  M(g, KIT.cyl(0.22, 0.26, 0.025, 14), darkTrimMat(), 0, 0.012, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const hook = M(g, KIT.cyl(0.008, 0.008, 0.14, 6), aluTrimMat(), Math.cos(a) * 0.08, 1.62, Math.sin(a) * 0.08);
    hook.rotation.z = Math.PI / 2 - 0.5;
    hook.rotation.y = -a;
    M(g, KIT.sphere(0.014, 8), aluTrimMat(), Math.cos(a) * 0.15, 1.66, Math.sin(a) * 0.15);
  }
  // One scarf left behind.
  M(g, KIT.bevelBox(0.08, 0.5, 0.04, 0.012), tiled(MAT.fabricPanel, 0.3), 0.13, 1.36, 0.05);
  col(g, [0, 0.85, 0], [0.4, 1.72, 0.4], SURFACE.METAL);
  return g;
}

export function breakTable() {
  const g = grp('breakTable');
  M(g, KIT.cyl(0.5, 0.5, 0.03, 22), tiled(MAT.laminateLight, 0.9), 0, 0.72, 0);
  M(g, KIT.cyl(0.035, 0.035, 0.68, 10), darkTrimMat(), 0, 0.36, 0);
  M(g, KIT.cyl(0.26, 0.3, 0.025, 18), darkTrimMat(), 0, 0.012, 0);
  col(g, [0, 0.37, 0], [1.0, 0.74, 1.0], SURFACE.WOOD);
  return g;
}

// =========================================================================
// ELECTRONICS
// =========================================================================

export function computerTower() {
  const g = grp('computerTower');
  const body = tiled(MAT.plasticBlack, 0.5);
  M(g, KIT.bevelBox(0.185, 0.42, 0.44, 0.006), body, 0, 0.21, 0);
  // Front face details: optical bay, ports, power button + LED, vent slots.
  M(g, KIT.bevelBox(0.15, 0.02, 0.008, 0.002), pm(0x1c1f23, { roughness: 0.5 }, 'bay'), 0, 0.36, 0.222);
  M(g, KIT.bevelBox(0.1, 0.014, 0.006, 0.002), pm(0x14161a, { roughness: 0.4 }, 'ports'), 0, 0.3, 0.223);
  M(g, KIT.cyl(0.009, 0.009, 0.006, 8), aluTrimMat(), 0.055, 0.36, 0.224).rotation.x = Math.PI / 2;
  M(g, KIT.cyl(0.004, 0.004, 0.005, 6), ledMaterial(0x57d8ff, 2.6), 0.055, 0.325, 0.224).rotation.x = Math.PI / 2;
  // Vent band low on the face.
  for (let i = 0; i < 5; i++) M(g, KIT.box(0.13, 0.006, 0.004), pm(0x101215, { roughness: 0.7 }, 'vent'), 0, 0.06 + i * 0.018, 0.223);
  col(g, [0, 0.21, 0], [0.19, 0.42, 0.45], SURFACE.ELECTRONIC);
  return g;
}

export function monitor24(content = 'os') {
  const g = grp(`monitor24-${content}`);
  const shell = tiled(MAT.plasticBlack, 0.4);
  // Base + stem.
  M(g, KIT.bevelBox(0.24, 0.018, 0.18, 0.006), shell, 0, 0.009, 0);
  M(g, KIT.bevelBox(0.045, 0.3, 0.04, 0.008), shell, 0, 0.16, -0.04);
  // Bezel + screen. 24" 16:9 = 0.531 x 0.298 visible.
  M(g, KIT.bevelBox(0.56, 0.34, 0.038, 0.006), shell, 0, 0.36, 0);
  const scr = M(g, KIT.plane(0.531, 0.298), screenContentMaterial(content), 0, 0.36, 0.0205, { cast: false });
  scr.name = 'screen';
  M(g, KIT.cyl(0.003, 0.003, 0.004, 6), ledMaterial(content === 'off' ? 0xff8830 : 0x59ffa2, 1.8), 0.24, 0.21, 0.02).rotation.x = Math.PI / 2;
  return g;
}

export function dualMonitorArm(contentA = 'sheet', contentB = 'mail') {
  const g = grp('dualMonitorArm');
  const shell = tiled(MAT.plasticBlack, 0.4);
  M(g, KIT.bevelBox(0.16, 0.016, 0.16, 0.005), darkTrimMat(), 0, 0.008, 0);
  M(g, KIT.cyl(0.02, 0.02, 0.44, 10), darkTrimMat(), 0, 0.23, 0);
  for (const [sx, content] of [[-1, contentA], [1, contentB]]) {
    const armPiv = new THREE.Group();
    armPiv.position.set(0, 0.42, 0);
    const arm = KIT.mesh(KIT.bevelBox(0.3, 0.025, 0.03, 0.006), darkTrimMat());
    arm.position.x = sx * 0.15;
    armPiv.add(arm);
    const head = new THREE.Group();
    head.position.set(sx * 0.29, 0, 0.02);
    head.add(KIT.mesh(KIT.bevelBox(0.56, 0.34, 0.036, 0.006), shell));
    const scr = KIT.mesh(KIT.plane(0.531, 0.298), screenContentMaterial(content), { cast: false });
    scr.position.z = 0.02;
    head.add(scr);
    head.rotation.y = -sx * 0.18;
    armPiv.add(head);
    g.add(armPiv);
  }
  return g;
}

function keycapMaterial() {
  const tex = generateImageTexture('keycaps', 256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#22262b';
    ctx.fillRect(0, 0, w, h);
    const rnd = mulberry32(hashString('keys'));
    const kw = 15, kh = 15;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 15; c++) {
        const wide = (r === 4 && c > 3 && c < 10);
        if (r === 4 && c >= 4 && c <= 9 && c !== 4) continue;
        const x = 4 + c * (kw + 1) + (r % 2) * 3;
        const y = 4 + r * (kh + 3);
        ctx.fillStyle = `rgb(${52 + rnd() * 8},${56 + rnd() * 8},${62 + rnd() * 8})`;
        roundRectPath(ctx, x, y, wide ? kw * 6 : kw, kh, 2.5);
        ctx.fill();
        ctx.fillStyle = 'rgba(200,210,220,0.55)';
        ctx.fillRect(x + 4, y + 4, 4, 4);
      }
    }
  });
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62 });
}

export function keyboard() {
  const g = grp('keyboard');
  M(g, KIT.bevelBox(0.44, 0.018, 0.15, 0.005), tiled(MAT.plasticBlack, 0.3), 0, 0.011, 0);
  const keys = M(g, KIT.box(0.42, 0.012, 0.13), keycapMaterial(), 0, 0.024, 0);
  keys.rotation.x = -0.03;
  return g;
}

export function mouse() {
  const g = grp('mouse');
  const body = M(g, KIT.sphere(0.032, 12), tiled(MAT.plasticBlack, 0.2), 0, 0.02, 0);
  body.scale.set(0.95, 0.62, 1.6);
  M(g, KIT.box(0.006, 0.008, 0.02), darkTrimMat(), 0, 0.038, -0.028);
  return g;
}

export function mousePad() {
  const g = grp('mousePad');
  M(g, KIT.bevelBox(0.26, 0.004, 0.22, 0.002), pm(0x22303a, { roughness: 0.92 }, 'mousepad'), 0, 0.002, 0, { cast: false });
  return g;
}

export function laptop(open = true) {
  const g = grp(`laptop-${open ? 'open' : 'closed'}`);
  const alu = tiled(MAT.aluminum, 0.4);
  M(g, KIT.bevelBox(0.34, 0.016, 0.24, 0.005), alu, 0, 0.008, 0);
  M(g, KIT.box(0.3, 0.006, 0.19), keycapMaterial(), 0, 0.017, -0.01);
  M(g, KIT.bevelBox(0.1, 0.004, 0.06, 0.002), pm(0x33383e, { roughness: 0.4 }, 'trackpad'), 0, 0.017, 0.08);
  const lid = new THREE.Group();
  lid.position.set(0, 0.016, -0.12);
  const lidPanel = KIT.mesh(KIT.bevelBox(0.34, 0.012, 0.235, 0.004), alu);
  lidPanel.position.set(0, 0, 0.117);
  lid.add(lidPanel);
  if (open) {
    const scr = KIT.mesh(KIT.plane(0.31, 0.2), screenContentMaterial('code'), { cast: false });
    scr.position.set(0, 0.008, 0.115);
    scr.rotation.x = -Math.PI / 2;
    lid.add(scr);
    lid.rotation.x = -Math.PI / 2 - 0.35;
  }
  g.add(lid);
  return g;
}

function phoneKeypadMaterial() {
  const tex = generateImageTexture('phonekeypad', 96, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2a2e33';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#405060';
    roundRectPath(ctx, 8, 6, w - 16, 28, 3);
    ctx.fill();
    ctx.fillStyle = '#9fe8c8';
    ctx.font = '9px monospace';
    ctx.fillText('08:12  LINE 1', 13, 24);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = '#3a4046';
        roundRectPath(ctx, 12 + c * 26, 42 + r * 21, 20, 15, 3);
        ctx.fill();
      }
    }
  });
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
}

export function deskPhone() {
  const g = grp('deskPhone');
  const shell = tiled(MAT.plasticBlack, 0.3);
  const body = M(g, KIT.bevelBox(0.2, 0.055, 0.19, 0.008), shell, 0.03, 0.032, 0);
  body.rotation.x = -0.18;
  const pad = M(g, KIT.box(0.13, 0.004, 0.16), phoneKeypadMaterial(), 0.045, 0.065, 0.005);
  pad.rotation.x = -0.18;
  // Handset on cradle (left side).
  M(g, KIT.bevelBox(0.045, 0.03, 0.05, 0.008), shell, -0.075, 0.075, -0.055);
  M(g, KIT.bevelBox(0.045, 0.03, 0.05, 0.008), shell, -0.075, 0.075, 0.06);
  M(g, KIT.bevelBox(0.04, 0.018, 0.11, 0.006), shell, -0.075, 0.078, 0.002);
  // Coiled cord.
  M(g, KIT.torus(0.02, 0.005, 10, 6), shell, -0.1, 0.02, 0.1).rotation.x = Math.PI / 2;
  return g;
}

export function headset() {
  const g = grp('headset');
  const band = M(g, KIT.torus(0.075, 0.008, 16, 8, Math.PI), tiled(MAT.plasticBlack, 0.2), 0, 0.1, 0);
  band.rotation.z = 0;
  for (const sx of [-1, 1]) M(g, KIT.cyl(0.032, 0.032, 0.02, 12), tiled(MAT.plasticBlack, 0.2), sx * 0.075, 0.09, 0).rotation.z = Math.PI / 2;
  M(g, KIT.cyl(0.004, 0.004, 0.07, 6), darkTrimMat(), -0.08, 0.05, 0.03).rotation.x = 0.6;
  // Stand.
  M(g, KIT.cyl(0.05, 0.06, 0.012, 12), darkTrimMat(), 0, 0.006, 0);
  M(g, KIT.cyl(0.012, 0.012, 0.09, 8), darkTrimMat(), 0, 0.05, 0);
  return g;
}

export function dockingStation() {
  const g = grp('dockingStation');
  M(g, KIT.bevelBox(0.22, 0.03, 0.09, 0.006), tiled(MAT.plasticBlack, 0.3), 0, 0.018, 0);
  M(g, KIT.bevelBox(0.2, 0.012, 0.02, 0.003), darkTrimMat(), 0, 0.04, -0.01);
  M(g, KIT.cyl(0.003, 0.003, 0.004, 6), ledMaterial(0x59ffa2, 2), 0.09, 0.036, 0.046).rotation.x = Math.PI / 2;
  return g;
}

export function printerDesktop() {
  const g = grp('printerDesktop');
  const shell = tiled(MAT.plasticWhite, 0.5);
  M(g, KIT.bevelBox(0.46, 0.24, 0.38, 0.014), shell, 0, 0.15, 0);
  M(g, KIT.bevelBox(0.4, 0.05, 0.3, 0.008), tiled(MAT.plasticGrey, 0.4), 0, 0.015, 0);
  // Output tray + paper.
  M(g, KIT.bevelBox(0.3, 0.012, 0.16, 0.004), tiled(MAT.plasticGrey, 0.3), 0, 0.28, 0.14);
  M(g, KIT.box(0.21, 0.005, 0.14), tiled(MAT.paper, 0.3), 0, 0.29, 0.13);
  // Small control panel.
  const cp = M(g, KIT.bevelBox(0.12, 0.008, 0.06, 0.003), darkTrimMat(), -0.15, 0.275, 0.12);
  cp.rotation.x = -0.4;
  M(g, KIT.cyl(0.004, 0.004, 0.005, 6), ledMaterial(0x59ffa2, 2), -0.18, 0.283, 0.13).rotation.x = Math.PI / 2;
  col(g, [0, 0.15, 0], [0.46, 0.3, 0.38], SURFACE.PLASTIC);
  return g;
}

function copierPanelMaterial() {
  const tex = generateImageTexture('copierpanel', 160, 64, (ctx, w, h) => {
    ctx.fillStyle = '#23272c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2f6f8f';
    roundRectPath(ctx, 6, 8, 70, 44, 4);
    ctx.fill();
    ctx.fillStyle = '#bfe8f4';
    ctx.font = '9px Arial';
    ctx.fillText('READY', 14, 26);
    ctx.fillText('TRAY 2: A4', 14, 42);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i === 5 ? '#3fae6a' : '#3a4046';
      roundRectPath(ctx, 84 + (i % 3) * 24, 10 + Math.floor(i / 3) * 24, 18, 16, 3);
      ctx.fill();
    }
  });
  return new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.4 });
}

export function copierFloor() {
  const g = grp('copierFloor');
  const shell = tiled(MAT.plasticWhite, 0.8);
  const grey = tiled(MAT.plasticGrey, 0.6);
  M(g, KIT.bevelBox(1.1, 0.5, 0.62, 0.014), shell, 0, 0.68, 0); // upper body
  M(g, KIT.bevelBox(1.05, 0.42, 0.58, 0.01), grey, 0, 0.25, 0); // base with trays
  for (let i = 0; i < 2; i++) {
    M(g, KIT.bevelBox(0.9, 0.15, 0.014, 0.004), shell, 0, 0.14 + i * 0.19, 0.3);
    M(g, KIT.bevelBox(0.2, 0.025, 0.02, 0.004), darkTrimMat(), 0, 0.2 + i * 0.19, 0.312);
  }
  // Scanner lid + document feeder hump.
  M(g, KIT.bevelBox(1.06, 0.045, 0.58, 0.01), shell, 0, 0.955, 0);
  M(g, KIT.bevelBox(0.5, 0.07, 0.4, 0.012), grey, -0.22, 1.005, 0);
  // Angled control panel with backlit screen.
  const cp = M(g, KIT.bevelBox(0.4, 0.02, 0.18, 0.005), darkTrimMat(), 0.32, 0.98, 0.24);
  cp.rotation.x = -0.5;
  const cpFace = M(g, KIT.box(0.38, 0.002, 0.15), copierPanelMaterial(), 0.32, 0.992, 0.245, { cast: false });
  cpFace.rotation.x = -0.5;
  // Output tray recess between body halves.
  M(g, KIT.bevelBox(0.6, 0.014, 0.4, 0.004), grey, -0.15, 0.47, 0.05);
  M(g, KIT.box(0.21, 0.008, 0.297), tiled(MAT.paper, 0.3), -0.15, 0.485, 0.03);
  col(g, [0, 0.55, 0], [1.1, 1.1, 0.64], SURFACE.PLASTIC);
  return g;
}

export function paperTray() {
  const g = grp('paperTray');
  M(g, KIT.bevelBox(0.26, 0.06, 0.33, 0.005), tiled(MAT.plasticBlack, 0.3), 0, 0.03, 0);
  M(g, KIT.box(0.21, 0.03, 0.297), tiled(MAT.paper, 0.3), 0, 0.055, 0);
  return g;
}

export function projector() {
  const g = grp('projector');
  M(g, KIT.bevelBox(0.32, 0.1, 0.24, 0.014), tiled(MAT.plasticWhite, 0.4), 0, 0.06, 0);
  M(g, KIT.cyl(0.032, 0.036, 0.02, 14), darkTrimMat(), 0.08, 0.06, 0.125).rotation.x = Math.PI / 2;
  M(g, KIT.cyl(0.024, 0.024, 0.004, 12), pm(0x101c26, { roughness: 0.1, metalness: 0.4 }, 'lens'), 0.08, 0.06, 0.137).rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) M(g, KIT.box(0.002, 0.05, 0.08), pm(0x1c1f23, { roughness: 0.6 }, 'projvent'), -0.161, 0.06, -0.05 + i * 0.03);
  M(g, KIT.cyl(0.004, 0.004, 0.005, 6), ledMaterial(0x59ffa2, 2), -0.1, 0.112, 0.09).rotation.x = 0;
  return g;
}

export function wallDisplay(content = 'os') {
  const g = grp('wallDisplay');
  // 65" panel: 1.45 x 0.83, pivot at wall mount plate (back centre).
  M(g, KIT.bevelBox(0.3, 0.4, 0.03, 0.006), darkTrimMat(), 0, 0, 0.016);
  M(g, KIT.bevelBox(1.46, 0.85, 0.05, 0.008), tiled(MAT.plasticBlack, 0.8), 0, 0, 0.06);
  M(g, KIT.plane(1.4, 0.79), screenContentMaterial(content, 512, 288), 0, 0, 0.087, { cast: false });
  return g;
}

function whiteboardMaterial(seed = 'main') {
  const tex = generateImageTexture(`whiteboard:${seed}`, 512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#eef0ee';
    ctx.fillRect(0, 0, w, h);
    // Ghosting from erased ink.
    const rnd = mulberry32(hashString(`wb${seed}`));
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = '#3a5a7a';
      ctx.beginPath();
      ctx.ellipse(rnd() * w, rnd() * h, 40 + rnd() * 80, 14 + rnd() * 26, rnd(), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const scribble = (x, y, len, color, wobble = 3) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      let cx = x;
      while (cx < x + len) {
        const step = 8 + rnd() * 14;
        ctx.quadraticCurveTo(cx + step / 2, y + (rnd() - 0.5) * wobble * 2, cx + step, y + (rnd() - 0.5) * wobble);
        cx += step;
      }
      ctx.stroke();
    };
    ctx.strokeStyle = '#27476b';
    ctx.lineWidth = 3;
    ctx.font = 'bold 26px "Comic Sans MS", "Segoe Print", cursive';
    ctx.fillStyle = '#27476b';
    ctx.fillText('Q3 REVIEW — actions', 24, 40);
    ctx.font = '19px "Comic Sans MS", "Segoe Print", cursive';
    ctx.fillStyle = '#2d5a35';
    ctx.fillText('1. badge audit friday', 40, 84);
    ctx.fillText('2. dock schedule ?!', 40, 118);
    ctx.fillStyle = '#a03028';
    ctx.fillText('3. CALL BACK VENDOR', 40, 152);
    // Diagram: three boxes with arrows.
    ctx.strokeStyle = '#27476b';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 3; i++) {
      const bx = 300 + (i % 2) * 110, by = 70 + i * 62;
      ctx.strokeRect(bx, by, 84, 38);
      if (i < 2) {
        ctx.beginPath();
        ctx.moveTo(bx + 42, by + 38);
        ctx.lineTo(342 + ((i + 1) % 2) * 110 + 12, 70 + (i + 1) * 62);
        ctx.stroke();
      }
      scribble(bx + 8, by + 22, 60, '#27476b', 2);
    }
    scribble(40, 200, 300, '#2d5a35');
    scribble(40, 228, 240, '#27476b');
    ctx.font = '15px "Comic Sans MS", "Segoe Print", cursive';
    ctx.fillStyle = '#a03028';
    ctx.fillText('do NOT erase!', 360, 286);
    ctx.strokeStyle = '#a03028';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(412, 280, 70, 20, -0.05, 0, Math.PI * 2);
    ctx.stroke();
  });
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.18, metalness: 0 });
}

export function whiteboard(seed = 'main') {
  const g = grp('whiteboard');
  // Wall-hung: pivot at back centre, 1.8 x 1.2 board at eye height handled by placer.
  M(g, KIT.bevelBox(1.84, 1.24, 0.03, 0.005), aluTrimMat(), 0, 0, 0.016);
  M(g, KIT.box(1.76, 1.16, 0.012), whiteboardMaterial(seed), 0, 0, 0.033, { cast: false });
  // Marker tray + markers.
  M(g, KIT.bevelBox(0.6, 0.02, 0.06, 0.004), aluTrimMat(), 0, -0.65, 0.05);
  for (let i = 0; i < 2; i++) {
    const mk = M(g, KIT.cyl(0.009, 0.009, 0.12, 8), pm(i ? 0xa03028 : 0x27476b, { roughness: 0.4 }, `marker${i}`), -0.1 + i * 0.16, -0.63, 0.055);
    mk.rotation.z = Math.PI / 2;
  }
  return g;
}

function clockFaceMaterial() {
  const tex = generateImageTexture('clockface', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f2f2ee';
    ctx.beginPath(); ctx.arc(64, 64, 62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22262b';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const long = i % 3 === 0;
      ctx.save();
      ctx.translate(64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52);
      ctx.rotate(a);
      ctx.fillRect(-(long ? 7 : 4), -1.6, long ? 14 : 8, 3.2);
      ctx.restore();
    }
    // Hands set to 08:12.
    const minute = (12 / 60) * Math.PI * 2 - Math.PI / 2;
    const hour = ((8 + 12 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#1a1e23';
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.cos(hour) * 30, 64 + Math.sin(hour) * 30); ctx.stroke();
    ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.cos(minute) * 46, 64 + Math.sin(minute) * 46); ctx.stroke();
    ctx.strokeStyle = '#c63b2f';
    ctx.lineWidth = 1.6;
    const sec = (37 / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.cos(sec) * 50, 64 + Math.sin(sec) * 50); ctx.stroke();
    ctx.fillStyle = '#22262b';
    ctx.beginPath(); ctx.arc(64, 64, 4, 0, Math.PI * 2); ctx.fill();
  });
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 });
}

export function wallClock() {
  const g = grp('wallClock');
  M(g, KIT.cyl(0.17, 0.17, 0.035, 24), darkTrimMat(), 0, 0, 0.018).rotation.x = Math.PI / 2;
  M(g, KIT.cyl(0.155, 0.155, 0.004, 24), clockFaceMaterial(), 0, 0, 0.037).rotation.x = Math.PI / 2;
  return g;
}

export function securityMonitorBank() {
  const g = grp('securityMonitorBank');
  const shell = tiled(MAT.plasticBlack, 0.5);
  // Console shelf carrying a 2x2 wall of small monitors.
  M(g, KIT.bevelBox(0.96, 0.05, 0.34, 0.008), darkTrimMat(), 0, 0.025, 0);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const x = -0.24 + c * 0.48;
      const y = 0.22 + r * 0.36;
      M(g, KIT.bevelBox(0.44, 0.32, 0.2, 0.01), shell, x, y, -0.05);
      M(g, KIT.plane(0.38, 0.26), screenContentMaterial(r === 0 && c === 0 ? 'cctv' : r === 0 ? 'servers' : c === 0 ? 'cctv' : 'intel'), x, y, 0.052, { cast: false });
    }
  }
  M(g, KIT.cyl(0.005, 0.005, 0.006, 6), ledMaterial(0xff5548, 2.4), 0.42, 0.06, 0.15).rotation.x = Math.PI / 2;
  col(g, [0, 0.4, -0.02], [0.98, 0.8, 0.36], SURFACE.ELECTRONIC);
  return g;
}

function rackFrontMaterial(seed) {
  const tex = generateImageTexture(`rackfront:${seed}`, 128, 512, (ctx, w, h) => {
    ctx.fillStyle = '#181b1f';
    ctx.fillRect(0, 0, w, h);
    const rnd = mulberry32(hashString(`rack${seed}`));
    let y = 6;
    while (y < h - 10) {
      const uh = rnd() < 0.3 ? 26 : 13;
      ctx.fillStyle = rnd() < 0.85 ? '#24282e' : '#1c1f24';
      roundRectPath(ctx, 5, y, w - 10, uh - 2, 2);
      ctx.fill();
      // Vent slits.
      ctx.fillStyle = '#101318';
      for (let i = 0; i < 5; i++) ctx.fillRect(10 + i * 8, y + 3, 4, uh - 8);
      // Status LEDs.
      for (let i = 0; i < 3; i++) {
        const on = rnd();
        ctx.fillStyle = on < 0.6 ? '#37e07a' : on < 0.85 ? '#ffa42b' : '#20242a';
        ctx.beginPath();
        ctx.arc(w - 14 - i * 7, y + uh / 2 - 1, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      y += uh;
    }
  });
  return new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5, roughness: 0.5 });
}

export function serverRack(seed = 1) {
  const g = grp('serverRack');
  const frame = tiled(MAT.metalPaintedDark, 1);
  M(g, KIT.bevelBox(0.6, 2.0, 1.0, 0.01), frame, 0, 1.0, 0);
  // Perforated mesh door with blade faces glowing through.
  M(g, KIT.box(0.54, 1.86, 0.02), rackFrontMaterial(seed), 0, 1.0, 0.492, { cast: false });
  M(g, KIT.bevelBox(0.02, 1.86, 0.02, 0.004), aluTrimMat(), 0.26, 1.0, 0.5);
  // Top cable slack.
  M(g, KIT.torus(0.06, 0.012, 10, 6), pm(0x22262c, { roughness: 0.8 }, 'cableslack'), 0.1, 2.03, -0.2).rotation.x = Math.PI / 2;
  M(g, KIT.torus(0.05, 0.01, 10, 6), pm(0x2c3038, { roughness: 0.8 }, 'cableslack2'), -0.12, 2.03, -0.1).rotation.x = Math.PI / 2;
  col(g, [0, 1.0, 0], [0.62, 2.02, 1.02], SURFACE.METAL);
  return g;
}

export function networkSwitch() {
  const g = grp('networkSwitch');
  const tex = generateImageTexture('switchface', 192, 24, (ctx, w, h) => {
    ctx.fillStyle = '#20242a';
    ctx.fillRect(0, 0, w, h);
    const rnd = mulberry32(hashString('sw'));
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = '#0e1114';
      ctx.fillRect(6 + i * 10, 8, 8, 9);
      ctx.fillStyle = rnd() < 0.55 ? '#37e07a' : '#20242a';
      ctx.fillRect(7 + i * 10, 4, 3, 2.4);
    }
  });
  M(g, KIT.bevelBox(0.44, 0.045, 0.24, 0.006), tiled(MAT.metalPaintedDark, 0.4), 0, 0.023, 0);
  M(g, KIT.box(0.42, 0.03, 0.004), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.7, roughness: 0.5 }), 0, 0.023, 0.122, { cast: false });
  return g;
}

export function ups() {
  const g = grp('ups');
  M(g, KIT.bevelBox(0.26, 0.42, 0.6, 0.01), tiled(MAT.metalPaintedDark, 0.6), 0, 0.21, 0);
  M(g, KIT.bevelBox(0.2, 0.06, 0.014, 0.004), darkTrimMat(), 0, 0.34, 0.305);
  M(g, KIT.cyl(0.005, 0.005, 0.006, 6), ledMaterial(0x37e07a, 2.2), -0.05, 0.34, 0.312).rotation.x = Math.PI / 2;
  M(g, KIT.cyl(0.005, 0.005, 0.006, 6), ledMaterial(0xffa42b, 2.2), 0.0, 0.34, 0.312).rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) M(g, KIT.box(0.16, 0.006, 0.004), pm(0x14171b, { roughness: 0.7 }, 'upsvent'), 0, 0.08 + i * 0.03, 0.305);
  col(g, [0, 0.21, 0], [0.26, 0.42, 0.6], SURFACE.METAL);
  return g;
}

export function cableBundle(length = 1.2) {
  const g = grp('cableBundle');
  const mats = [pm(0x22262c, { roughness: 0.85 }, 'cbl1'), pm(0x35405a, { roughness: 0.85 }, 'cbl2'), pm(0x4a3a30, { roughness: 0.85 }, 'cbl3')];
  for (let i = 0; i < 3; i++) {
    const c = M(g, KIT.cyl(0.008, 0.008, length, 6), mats[i], 0, 0.012 + (i % 2) * 0.014, (i - 1) * 0.018, { cast: false });
    c.rotation.z = Math.PI / 2;
  }
  return g;
}

export function looseCable(seed = 1) {
  const g = grp('looseCable');
  const rnd = mulberry32(hashString(`cable${seed}`));
  const pts = [];
  let x = -0.4, z = 0;
  for (let i = 0; i <= 8; i++) {
    pts.push(new THREE.Vector3(x, 0.012, z));
    x += 0.1 + rnd() * 0.05;
    z += (rnd() - 0.5) * 0.16;
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 16, 0.007, 5, false);
  const m = KIT.mesh(geo, pm(0x24282e, { roughness: 0.85 }, 'loosecbl'), { cast: false });
  g.add(m);
  return g;
}

// =========================================================================
// BREAK ROOM
// =========================================================================

export function baseCabinet(width = 0.6) {
  const g = grp('baseCabinet');
  const carc = tiled(MAT.laminateGrey, 0.7);
  M(g, KIT.bevelBox(width, 0.72, 0.58, 0.006), carc, 0, 0.4, 0);
  M(g, KIT.box(width, 0.08, 0.5), darkTrimMat(), 0, 0.04, -0.03);
  M(g, KIT.bevelBox(width - 0.04, 0.62, 0.016, 0.004), tiled(MAT.laminateLight, 0.7), 0, 0.44, 0.295);
  M(g, KIT.bevelBox(0.12, 0.018, 0.02, 0.004), aluTrimMat(), width * 0.22, 0.68, 0.31);
  col(g, [0, 0.38, 0], [width, 0.76, 0.6], SURFACE.WOOD);
  return g;
}

export function wallCabinet(width = 0.6) {
  const g = grp('wallCabinet');
  // Pivot at base centre of the cabinet (hung by the placer at +1.45 m).
  M(g, KIT.bevelBox(width, 0.7, 0.34, 0.006), tiled(MAT.laminateGrey, 0.7), 0, 0.35, 0);
  M(g, KIT.bevelBox(width - 0.04, 0.64, 0.016, 0.004), tiled(MAT.laminateLight, 0.7), 0, 0.35, 0.175);
  M(g, KIT.bevelBox(0.12, 0.018, 0.02, 0.004), aluTrimMat(), width * 0.22, 0.08, 0.19);
  return g;
}

export function counterSink(width = 1.8) {
  const g = grp('counterSink');
  // Countertop with backsplash over two base cabinets width.
  M(g, KIT.bevelBox(width, 0.04, 0.62, 0.006), tiled(MAT.laminateGrey, 1.2), 0, 0.9, 0);
  M(g, KIT.bevelBox(width, 0.1, 0.02, 0.004), tiled(MAT.laminateGrey, 1.2), 0, 0.95, -0.3);
  // Stainless basin: open box (rim + cavity walls).
  const steel = tiled(MAT.steel, 0.5);
  M(g, KIT.bevelBox(0.5, 0.02, 0.42, 0.004), steel, 0, 0.925, 0.02);
  const cavW = 0.42, cavD = 0.34, depth = 0.16;
  M(g, KIT.box(cavW, 0.012, cavD), steel, 0, 0.925 - depth, 0.02);
  for (const [w2, d2, x2, z2] of [[cavW, 0.012, 0, cavD / 2], [cavW, 0.012, 0, -cavD / 2], [0.012, cavD, cavW / 2, 0], [0.012, cavD, -cavW / 2, 0]]) {
    const wall = M(g, KIT.box(w2, depth, d2), steel, x2, 0.925 - depth / 2, 0.02 + z2);
    wall.receiveShadow = true;
  }
  // Gooseneck faucet.
  M(g, KIT.cyl(0.016, 0.02, 0.06, 10), tiled(MAT.chrome, 0.3), 0, 0.955, -0.22);
  M(g, KIT.cyl(0.011, 0.011, 0.22, 8), tiled(MAT.chrome, 0.3), 0, 1.08, -0.22);
  const spout = M(g, KIT.torus(0.07, 0.011, 12, 8, Math.PI), tiled(MAT.chrome, 0.3), 0, 1.19, -0.15);
  spout.rotation.y = Math.PI / 2;
  M(g, KIT.bevelBox(0.05, 0.014, 0.05, 0.004), tiled(MAT.chrome, 0.3), 0.09, 0.94, -0.22);
  col(g, [0, 0.46, 0], [width, 0.94, 0.64], SURFACE.TILE);
  return g;
}

export function refrigerator() {
  const g = grp('refrigerator');
  const shell = tiled(MAT.steel, 1.4);
  M(g, KIT.bevelBox(0.72, 1.76, 0.7, 0.014), shell, 0, 0.88, 0);
  M(g, KIT.bevelBox(0.68, 0.6, 0.02, 0.008), shell, 0, 1.44, 0.355); // freezer door
  M(g, KIT.bevelBox(0.68, 1.06, 0.02, 0.008), shell, 0, 0.6, 0.355); // fridge door
  for (const y of [1.2, 1.28]) M(g, KIT.cyl(0.012, 0.012, 0.5, 8), aluTrimMat(), -0.26, y === 1.2 ? 0.9 : 1.5, 0.385).rotation.x = 0;
  M(g, KIT.box(0.66, 0.06, 0.02), pm(0x14171b, { roughness: 0.7 }, 'fridgegrille'), 0, 0.04, 0.35);
  col(g, [0, 0.9, 0], [0.72, 1.8, 0.72], SURFACE.METAL);
  return g;
}

export function microwave() {
  const g = grp('microwave');
  M(g, KIT.bevelBox(0.5, 0.3, 0.38, 0.01), tiled(MAT.plasticBlack, 0.5), 0, 0.15, 0);
  M(g, KIT.bevelBox(0.32, 0.22, 0.012, 0.004), pm(0x11151a, { roughness: 0.15, metalness: 0.3 }, 'mwglass'), -0.05, 0.15, 0.192);
  const tex = generateImageTexture('mwpanel', 48, 96, (ctx, w, h) => {
    ctx.fillStyle = '#1c2025'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3fae6a'; ctx.font = '12px monospace'; ctx.fillText('0:00', 8, 20);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#31363c'; roundRectPath(ctx, 8, 30 + i * 10, w - 16, 7, 2); ctx.fill(); }
  });
  M(g, KIT.box(0.1, 0.24, 0.004), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5, roughness: 0.5 }), 0.17, 0.15, 0.192, { cast: false });
  return g;
}

export function coffeeMachine() {
  const g = grp('coffeeMachine');
  const shell = tiled(MAT.plasticBlack, 0.4);
  M(g, KIT.bevelBox(0.22, 0.36, 0.24, 0.008), shell, 0, 0.18, -0.03);
  M(g, KIT.bevelBox(0.22, 0.05, 0.3, 0.008), shell, 0, 0.025, 0);
  M(g, KIT.bevelBox(0.22, 0.05, 0.3, 0.008), shell, 0, 0.335, 0);
  // Glass carafe on hotplate.
  const carafe = M(g, KIT.cyl(0.07, 0.085, 0.16, 14), clearGlass(0xc8beb0, 0.3), 0, 0.13, 0.07, { cast: false });
  carafe.renderOrder = 3;
  M(g, KIT.cyl(0.06, 0.075, 0.09, 14), pm(0x38271c, { roughness: 0.35 }, 'coffee'), 0, 0.1, 0.07);
  M(g, KIT.bevelBox(0.02, 0.09, 0.035, 0.006), shell, 0.09, 0.14, 0.07);
  M(g, KIT.cyl(0.003, 0.003, 0.005, 6), ledMaterial(0xff7030, 2), 0.08, 0.06, 0.15).rotation.x = Math.PI / 2;
  return g;
}

export function kettle() {
  const g = grp('kettle');
  M(g, KIT.cyl(0.075, 0.09, 0.2, 14), tiled(MAT.steel, 0.4), 0, 0.11, 0);
  M(g, KIT.cyl(0.09, 0.095, 0.02, 14), darkTrimMat(), 0, 0.01, 0);
  M(g, KIT.sphere(0.02, 8), darkTrimMat(), 0, 0.225, 0);
  const handle = M(g, KIT.torus(0.07, 0.011, 12, 8, Math.PI * 0.8), darkTrimMat(), -0.07, 0.14, 0);
  handle.rotation.y = Math.PI / 2; handle.rotation.z = Math.PI / 2 + 0.3;
  M(g, KIT.cyl(0.014, 0.018, 0.09, 8), tiled(MAT.steel, 0.4), 0.085, 0.16, 0).rotation.z = -0.5;
  return g;
}

function vendingFrontMaterial() {
  const tex = generateImageTexture('vendingfront', 256, 512, (ctx, w, h) => {
    // Interior back panel behind glass, lit product rows.
    ctx.fillStyle = '#101418';
    ctx.fillRect(0, 0, w, h);
    const rnd = mulberry32(hashString('vend'));
    for (let row = 0; row < 5; row++) {
      const y = 30 + row * 84;
      ctx.fillStyle = '#1c2126';
      ctx.fillRect(10, y + 58, w - 20, 8);
      for (let cSlot = 0; cSlot < 6; cSlot++) {
        const x = 16 + cSlot * 38;
        const hue = Math.floor(rnd() * 360);
        ctx.fillStyle = `hsl(${hue},${45 + rnd() * 30}%,${38 + rnd() * 22}%)`;
        if (row < 2) { // bottles/cans
          roundRectPath(ctx, x + 6, y + 6, 18, 50, 8);
          ctx.fill();
          ctx.fillStyle = `hsl(${hue},60%,72%)`;
          ctx.fillRect(x + 6, y + 22, 18, 12);
        } else { // snack packets
          roundRectPath(ctx, x + 2, y + 8, 28, 48, 3);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(x + 5, y + 16, 22, 10);
        }
        // Spiral coil in front.
        ctx.strokeStyle = '#8a9098';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let s = 0; s < 5; s++) ctx.arc(x + 16, y + 30 + s * 6, 8, 0, Math.PI, s % 2 === 0);
        ctx.stroke();
      }
    }
    // Soft interior light gradient.
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(220,240,255,0.16)');
    gr.addColorStop(1, 'rgba(220,240,255,0.02)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
  });
  return new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.65, roughness: 0.4 });
}

export function vendingMachine() {
  const g = grp('vendingMachine');
  const shell = tiled(MAT.metalPainted, 1.4);
  M(g, KIT.bevelBox(0.95, 1.83, 0.78, 0.012), shell, 0, 0.915, 0);
  // Lit header with original brand.
  const headerTex = generateImageTexture('vendheader', 256, 48, (ctx, w, h) => {
    ctx.fillStyle = '#12324a'; ctx.fillRect(0, 0, w, h);
    paintNorthstarMark(ctx, 28, h / 2, 14, '#7fd4e8', false);
    drawLabel(ctx, 'POLAR PANTRY', w / 2 + 12, h / 2, { font: 'bold 22px Arial', color: '#dff2fa', align: 'center', baseline: 'middle' });
  });
  M(g, KIT.box(0.82, 0.18, 0.01), new THREE.MeshStandardMaterial({ map: headerTex, emissive: 0xffffff, emissiveMap: headerTex, emissiveIntensity: 0.9, roughness: 0.4 }), -0.04, 1.68, 0.392, { cast: false });
  // Product window: lit interior + glass.
  M(g, KIT.box(0.62, 1.18, 0.01), vendingFrontMaterial(), -0.13, 0.98, 0.385, { cast: false });
  const glass = M(g, KIT.plane(0.64, 1.2), clearGlass(0xcfe0ea, 0.1), -0.13, 0.98, 0.397, { cast: false });
  glass.renderOrder = 4;
  // Selection panel, coin slot, delivery flap.
  M(g, KIT.bevelBox(0.16, 0.5, 0.02, 0.005), darkTrimMat(), 0.33, 1.15, 0.39);
  const keypadTex = generateImageTexture('vendkeys', 48, 96, (ctx, w, h) => {
    ctx.fillStyle = '#1a1e23'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = '#2f353c'; roundRectPath(ctx, 6 + (i % 3) * 13, 6 + Math.floor(i / 3) * 15, 10, 11, 2); ctx.fill(); }
  });
  M(g, KIT.box(0.12, 0.24, 0.004), new THREE.MeshStandardMaterial({ map: keypadTex, roughness: 0.5 }), 0.33, 1.22, 0.402, { cast: false });
  M(g, KIT.bevelBox(0.03, 0.09, 0.012, 0.003), aluTrimMat(), 0.33, 0.92, 0.398);
  M(g, KIT.bevelBox(0.56, 0.16, 0.03, 0.008), darkTrimMat(), -0.13, 0.26, 0.39);
  col(g, [0, 0.915, 0], [0.95, 1.83, 0.8], SURFACE.METAL);
  return g;
}

export function waterCooler() {
  const g = grp('waterCooler');
  M(g, KIT.bevelBox(0.34, 1.0, 0.34, 0.01), tiled(MAT.plasticWhite, 0.7), 0, 0.5, 0);
  const bottle = M(g, KIT.cyl(0.13, 0.15, 0.36, 14), clearGlass(0xa8d4e8, 0.35), 0, 1.2, 0, { cast: false });
  bottle.renderOrder = 3;
  M(g, KIT.cyl(0.11, 0.13, 0.28, 14), pm(0x9fd0e8, { roughness: 0.2, transparent: true, opacity: 0.55 }, 'coolerwater'), 0, 1.15, 0);
  M(g, KIT.cyl(0.05, 0.05, 0.06, 10), tiled(MAT.plasticWhite, 0.4), 0, 1.0, 0);
  for (const sx of [-1, 1]) M(g, KIT.bevelBox(0.035, 0.05, 0.045, 0.006), pm(sx < 0 ? 0x3a76b8 : 0xc63b2f, { roughness: 0.4 }, sx < 0 ? 'tapcold' : 'taphot'), sx * 0.07, 0.78, 0.17);
  M(g, KIT.bevelBox(0.2, 0.05, 0.06, 0.006), darkTrimMat(), 0, 0.68, 0.16);
  col(g, [0, 0.7, 0], [0.36, 1.4, 0.36], SURFACE.PLASTIC);
  return g;
}

export function mug(colorIdx = 0) {
  const g = grp('mug');
  const cols = [0x8d4f3a, 0x39505f, 0xd8c9a8, 0x4a6b50];
  const m = pm(cols[colorIdx % cols.length], { roughness: 0.32 }, `mug${colorIdx % cols.length}`);
  M(g, KIT.cyl(0.042, 0.038, 0.1, 12), m, 0, 0.05, 0);
  const h = M(g, KIT.torus(0.026, 0.007, 10, 6, Math.PI), m, 0.045, 0.052, 0);
  h.rotation.z = -Math.PI / 2;
  return g;
}

export function paperCup() {
  const g = grp('paperCup');
  M(g, KIT.cyl(0.04, 0.03, 0.11, 10), tiled(MAT.paper, 0.2), 0, 0.055, 0);
  M(g, KIT.cyl(0.041, 0.041, 0.012, 10), pm(0xf7f4ea, { roughness: 0.6 }, 'cuplid'), 0, 0.115, 0);
  return g;
}

export function plate() {
  const g = grp('plate');
  M(g, KIT.cyl(0.11, 0.08, 0.018, 16), pm(0xe8e6de, { roughness: 0.25 }, 'plate'), 0, 0.009, 0);
  return g;
}

export function foodContainer() {
  const g = grp('foodContainer');
  M(g, KIT.bevelBox(0.17, 0.07, 0.12, 0.012), pm(0xcfe4ec, { roughness: 0.3, transparent: true, opacity: 0.75 }, 'lunchbox'), 0, 0.035, 0);
  M(g, KIT.bevelBox(0.175, 0.012, 0.125, 0.004), pm(0x3a76b8, { roughness: 0.45 }, 'lunchlid'), 0, 0.076, 0);
  return g;
}

export function snackPacket(idx = 0) {
  const g = grp('snackPacket');
  const cols = [0xc63b2f, 0x2f8fd6, 0xf0a020, 0x4a9a50];
  const p = M(g, KIT.bevelBox(0.09, 0.13, 0.03, 0.012), pm(cols[idx % 4], { roughness: 0.45 }, `snack${idx % 4}`), 0, 0.062, 0);
  p.rotation.x = -0.9;
  return g;
}

export function trashBin(recycle = false) {
  const g = grp(recycle ? 'recycleBin' : 'trashBin');
  const m = recycle ? pm(0x2f6fa8, { roughness: 0.55 }, 'binblue') : pm(0x3a3f45, { roughness: 0.55 }, 'bingrey');
  M(g, KIT.cyl(0.19, 0.16, 0.55, 14), m, 0, 0.275, 0);
  M(g, KIT.cyl(0.2, 0.2, 0.03, 14), shade ? pm(shade(recycle ? 0x2f6fa8 : 0x3a3f45, 0.8), { roughness: 0.5 }, recycle ? 'binlidb' : 'binlidg') : m, 0, 0.565, 0);
  // Swing flap.
  const flap = M(g, KIT.bevelBox(0.16, 0.11, 0.012, 0.004), pm(0x22262b, { roughness: 0.5 }, 'binflap'), 0, 0.53, 0.13);
  flap.rotation.x = 0.25;
  if (recycle) {
    const tex = generateImageTexture('recyclemark', 64, 64, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#dff2fa';
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(32, 34);
        ctx.rotate((i / 3) * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(-10, 12);
        ctx.lineTo(6, 12);
        ctx.lineTo(0, 4);
        ctx.stroke();
        ctx.restore();
      }
    });
    const mark = KIT.mesh(KIT.plane(0.14, 0.14), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1 }), { cast: false });
    mark.position.set(0, 0.32, 0.181);
    g.add(mark);
  }
  col(g, [0, 0.29, 0], [0.4, 0.58, 0.4], SURFACE.PLASTIC);
  return g;
}

export function paperTowelDispenser() {
  const g = grp('paperTowelDispenser');
  M(g, KIT.bevelBox(0.29, 0.38, 0.11, 0.01), tiled(MAT.plasticWhite, 0.4), 0, 0, 0.06);
  M(g, KIT.box(0.14, 0.05, 0.004), tiled(MAT.paper, 0.2), 0, -0.18, 0.08);
  return g;
}

export function soapDispenser() {
  const g = grp('soapDispenser');
  M(g, KIT.bevelBox(0.11, 0.17, 0.1, 0.01), tiled(MAT.plasticWhite, 0.3), 0, 0, 0.055);
  M(g, KIT.bevelBox(0.05, 0.03, 0.05, 0.006), pm(0xd0d4d8, { roughness: 0.4 }, 'soapbtn'), 0, -0.1, 0.08);
  return g;
}

function noticeBoardMaterial(seed = 'break') {
  const tex = generateImageTexture(`noticeboard:${seed}`, 512, 384, (ctx, w, h) => {
    // Cork field.
    const rnd = mulberry32(hashString(`nb${seed}`));
    ctx.fillStyle = '#b98d5a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      ctx.fillStyle = `rgba(${90 + rnd() * 90},${60 + rnd() * 60},${30 + rnd() * 30},0.25)`;
      ctx.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
    }
    const notices = [
      ['STAFF NOTICE', 'Kitchen fridge is cleared every Friday 16:00. Label your food.', '#f4f1e6'],
      ['CAR POOL', 'Winter storm: shared rides from the north lot. Sign below.', '#e8f0d8'],
      ['FOR SALE', 'Cross-country skis, size 42 boots. Ext. 2214.', '#f4e2c8'],
      ['SAFETY', 'Report icy walkways to facilities. Ext. 2100.', '#f8d8d0'],
      ['SOCIAL CLUB', 'Solstice dinner — Thu 19:00, Sunfield Room.', '#dce8f4'],
      ['IT REMINDER', 'Lock your screen. Every time. Yes, you.', '#f4f1e6'],
    ];
    notices.forEach((n, i) => {
      const nx = 20 + (i % 3) * 160 + rnd() * 18;
      const ny = 24 + Math.floor(i / 3) * 170 + rnd() * 20;
      const ang = (rnd() - 0.5) * 0.12;
      ctx.save();
      ctx.translate(nx + 65, ny + 70);
      ctx.rotate(ang);
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = n[2];
      ctx.fillRect(-65, -70, 130, 140);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#20262c';
      ctx.font = 'bold 13px Arial';
      ctx.fillText(n[0], -55, -46);
      ctx.font = '10px Arial';
      const words = n[1].split(' ');
      let line = '', ly = -26;
      for (const word of words) {
        if (ctx.measureText(line + word).width > 112) {
          ctx.fillText(line, -55, ly); ly += 13; line = '';
        }
        line += word + ' ';
      }
      ctx.fillText(line, -55, ly);
      // Pin.
      ctx.fillStyle = ['#c63b2f', '#2f6fa8', '#3fae6a'][i % 3];
      ctx.beginPath(); ctx.arc(0, -62, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  });
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
}

export function noticeBoard(seed = 'break') {
  const g = grp('noticeBoard');
  M(g, KIT.bevelBox(1.24, 0.94, 0.03, 0.006), tiled(MAT.woodDesk, 0.6), 0, 0, 0.014);
  M(g, KIT.box(1.16, 0.86, 0.014), noticeBoardMaterial(seed), 0, 0, 0.032, { cast: false });
  return g;
}

// =========================================================================
// RESTROOM
// =========================================================================

export function restroomSink() {
  const g = grp('restroomSink');
  // Wall-hung basin, pivot at wall face / base of basin body.
  const porcelain = pm(0xe9eae6, { roughness: 0.12 }, 'porcelain');
  M(g, KIT.bevelBox(0.52, 0.14, 0.44, 0.03), porcelain, 0, 0.86, 0.22);
  M(g, KIT.bevelBox(0.4, 0.05, 0.3, 0.02), pm(0xdadbd6, { roughness: 0.2 }, 'basininner'), 0, 0.875, 0.2);
  // Faucet.
  M(g, KIT.cyl(0.012, 0.014, 0.1, 8), tiled(MAT.chrome, 0.2), 0, 0.97, 0.06);
  const sp = M(g, KIT.torus(0.045, 0.009, 10, 8, Math.PI * 0.9), tiled(MAT.chrome, 0.2), 0, 1.01, 0.1);
  sp.rotation.y = Math.PI / 2;
  // P-trap and supply lines below.
  M(g, KIT.cyl(0.022, 0.022, 0.18, 8), tiled(MAT.chrome, 0.4), 0, 0.72, 0.2);
  const trap = M(g, KIT.torus(0.05, 0.02, 10, 8, Math.PI), tiled(MAT.chrome, 0.4), 0, 0.62, 0.2);
  trap.rotation.z = Math.PI;
  M(g, KIT.cyl(0.02, 0.02, 0.16, 8), tiled(MAT.chrome, 0.4), 0, 0.64, 0.11).rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) {
    const line = M(g, KIT.cyl(0.008, 0.008, 0.3, 6), tiled(MAT.chrome, 0.4), sx * 0.14, 0.62, 0.05);
    line.rotation.x = 0.5;
  }
  col(g, [0, 0.65, 0.22], [0.52, 0.6, 0.46], SURFACE.TILE);
  return g;
}

export function mirror() {
  const g = grp('mirror');
  M(g, KIT.bevelBox(0.56, 0.8, 0.02, 0.004), aluTrimMat(), 0, 0, 0.01);
  M(g, KIT.box(0.52, 0.76, 0.006), pm(0xcfd8dd, { roughness: 0.04, metalness: 0.95 }, 'mirrorglass'), 0, 0, 0.022, { cast: false });
  return g;
}

export function toilet() {
  const g = grp('toilet');
  const porcelain = pm(0xe9eae6, { roughness: 0.14 }, 'porcelain');
  M(g, KIT.bevelBox(0.2, 0.35, 0.3, 0.03), porcelain, 0, 0.175, -0.16); // base column
  const bowl = M(g, KIT.cyl(0.19, 0.13, 0.16, 14), porcelain, 0, 0.32, 0.06);
  bowl.scale.z = 1.25;
  const seat = M(g, KIT.torus(0.16, 0.028, 16, 8), pm(0xf2f2ee, { roughness: 0.3 }, 'toiletseat'), 0, 0.415, 0.06);
  seat.rotation.x = Math.PI / 2;
  seat.scale.y = 1.2;
  M(g, KIT.bevelBox(0.44, 0.36, 0.16, 0.02), porcelain, 0, 0.6, -0.24); // cistern
  M(g, KIT.bevelBox(0.06, 0.015, 0.04, 0.004), tiled(MAT.chrome, 0.2), -0.12, 0.79, -0.24);
  col(g, [0, 0.4, -0.05], [0.44, 0.8, 0.64], SURFACE.TILE);
  return g;
}

export function urinal() {
  const g = grp('urinal');
  const porcelain = pm(0xe9eae6, { roughness: 0.14 }, 'porcelain');
  // Wall-hung; pivot at wall face, bowl centred ~0.6 m up.
  const shell = M(g, KIT.bevelBox(0.34, 0.6, 0.3, 0.06), porcelain, 0, 0.75, 0.15);
  M(g, KIT.bevelBox(0.24, 0.4, 0.16, 0.04), pm(0xdadbd6, { roughness: 0.2 }, 'urinner'), 0, 0.8, 0.19);
  M(g, KIT.cyl(0.016, 0.016, 0.12, 8), tiled(MAT.chrome, 0.3), 0, 1.14, 0.08);
  M(g, KIT.bevelBox(0.06, 0.05, 0.03, 0.008), tiled(MAT.chrome, 0.3), 0, 1.2, 0.08);
  col(g, [0, 0.75, 0.16], [0.36, 0.62, 0.32], SURFACE.TILE);
  return g;
}

export function stallPanel(depth = 1.5, height = 1.85) {
  const g = grp('stallPanel');
  const m = pm(0x5a6e78, { roughness: 0.4 }, 'stallpanel');
  M(g, KIT.bevelBox(0.03, height - 0.3, depth, 0.006), m, 0, (height - 0.3) / 2 + 0.3, 0);
  for (const sz of [-1, 1]) M(g, KIT.cyl(0.016, 0.016, 0.3, 8), tiled(MAT.chrome, 0.4), 0, 0.15, sz * (depth / 2 - 0.1));
  col(g, [0, height / 2 + 0.15, 0], [0.05, height, depth], SURFACE.METAL);
  return g;
}

export function stallDoor(width = 0.62, height = 1.85, openAngle = 0) {
  const g = grp('stallDoor');
  const m = pm(0x5a6e78, { roughness: 0.4 }, 'stallpanel');
  const door = new THREE.Group();
  const leaf = KIT.mesh(KIT.bevelBox(width, height - 0.3, 0.028, 0.006), m);
  leaf.position.set(width / 2, (height - 0.3) / 2 + 0.3, 0);
  door.add(leaf);
  const latch = KIT.mesh(KIT.bevelBox(0.05, 0.06, 0.04, 0.006), tiled(MAT.chrome, 0.3));
  latch.position.set(width - 0.06, 1.05, 0.02);
  door.add(latch);
  door.rotation.y = openAngle;
  door.position.x = -width / 2;
  g.add(door);
  col(g, [0, height / 2 + 0.15, 0], [width + 0.04, height, 0.06], SURFACE.METAL);
  return g;
}

export function handDryer() {
  const g = grp('handDryer');
  M(g, KIT.bevelBox(0.26, 0.32, 0.16, 0.02), tiled(MAT.steel, 0.5), 0, 0, 0.085);
  M(g, KIT.bevelBox(0.18, 0.03, 0.1, 0.008), pm(0x22262b, { roughness: 0.5 }, 'dryernozzle'), 0, -0.17, 0.1);
  M(g, KIT.cyl(0.004, 0.004, 0.005, 6), ledMaterial(0x59a2ff, 1.6), 0.08, -0.1, 0.168).rotation.x = Math.PI / 2;
  return g;
}

export function smallBin() {
  const g = grp('smallBin');
  M(g, KIT.cyl(0.13, 0.11, 0.36, 12), tiled(MAT.steel, 0.5), 0, 0.18, 0);
  M(g, KIT.torus(0.125, 0.008, 14, 6), darkTrimMat(), 0, 0.36, 0).rotation.x = Math.PI / 2;
  col(g, [0, 0.18, 0], [0.27, 0.37, 0.27], SURFACE.METAL);
  return g;
}

// =========================================================================
// MAINTENANCE & LOADING
// =========================================================================

export function electricalPanel() {
  const g = grp('electricalPanel');
  M(g, KIT.bevelBox(0.6, 0.9, 0.16, 0.008), tiled(MAT.metalPainted, 0.8), 0, 0, 0.09);
  M(g, KIT.bevelBox(0.52, 0.82, 0.014, 0.005), tiled(MAT.metalPainted, 0.7), 0, 0, 0.176);
  M(g, KIT.bevelBox(0.05, 0.12, 0.02, 0.005), darkTrimMat(), 0.2, 0, 0.185);
  // Conduits up and down.
  for (const [x2, y2, len] of [[-0.15, 0.75, 0.6], [0.1, 0.75, 0.6], [0, -0.75, 0.6]]) {
    M(g, KIT.cyl(0.022, 0.022, len, 8), tiled(MAT.metalPainted, 0.4), x2, y2, 0.1);
  }
  return g;
}

function breakerFaceMaterial() {
  const tex = generateImageTexture('breakers', 128, 192, (ctx, w, h) => {
    ctx.fillStyle = '#3a4147';
    ctx.fillRect(0, 0, w, h);
    const rnd = mulberry32(hashString('brk'));
    for (let r = 0; r < 10; r++) {
      for (let c2 = 0; c2 < 2; c2++) {
        const x = 18 + c2 * 52, y = 12 + r * 17;
        ctx.fillStyle = '#1c2024';
        ctx.fillRect(x, y, 38, 13);
        const on = rnd() < 0.8;
        ctx.fillStyle = on ? '#c63b2f' : '#2f353b';
        ctx.fillRect(x + (on ? 20 : 4), y + 2.5, 14, 8);
        ctx.fillStyle = '#e8e4d8';
        ctx.font = '6px Arial';
        ctx.fillText(String(r * 2 + c2 + 1), x - 12 + c2 * 64, y + 9);
      }
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(30, h - 14, 68, 9);
    ctx.fillStyle = '#22262b';
    ctx.font = 'bold 6px Arial';
    ctx.fillText('PANEL LP-2  208/120V', 33, h - 7);
  });
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
}

export function breakerBox(open = true) {
  const g = grp('breakerBox');
  M(g, KIT.bevelBox(0.4, 0.62, 0.12, 0.008), tiled(MAT.metalPainted, 0.6), 0, 0, 0.07);
  M(g, KIT.box(0.32, 0.52, 0.008), breakerFaceMaterial(), 0, 0, 0.132, { cast: false });
  if (open) {
    const door = new THREE.Group();
    door.position.set(-0.2, 0, 0.13);
    const leaf = KIT.mesh(KIT.bevelBox(0.4, 0.6, 0.014, 0.006), tiled(MAT.metalPainted, 0.6));
    leaf.position.x = 0.2;
    door.add(leaf);
    door.rotation.y = -1.9;
    g.add(door);
  }
  return g;
}

export function utilityCabinet() {
  const g = grp('utilityCabinet');
  const m = tiled(MAT.metalPainted, 1.2);
  M(g, KIT.bevelBox(0.9, 1.5, 0.6, 0.014), m, 0, 0.75, 0);
  for (let i = 0; i < 6; i++) M(g, KIT.box(0.7, 0.01, 0.008), pm(0x2c3238, { roughness: 0.6 }, 'utilvent'), 0, 1.05 + i * 0.05, 0.302);
  M(g, KIT.bevelBox(0.05, 0.16, 0.03, 0.006), darkTrimMat(), 0.32, 0.75, 0.31);
  // Hazard placard applied by populator (SIGN-EQUIP-LABEL).
  M(g, KIT.cyl(0.005, 0.005, 0.006, 6), ledMaterial(0xffa42b, 2.2), -0.3, 1.32, 0.305).rotation.x = Math.PI / 2;
  col(g, [0, 0.75, 0], [0.9, 1.5, 0.62], SURFACE.METAL);
  return g;
}

export function pipeAssembly() {
  const g = grp('pipeAssembly');
  const pipe = tiled(MAT.steel, 0.8);
  const painted = tiled(MAT.metalPainted, 0.5);
  // Two vertical risers with a horizontal cross-run, valves and a gauge.
  for (const sx of [-0.35, 0.35]) M(g, KIT.cyl(0.05, 0.05, 2.2, 12), pipe, sx, 1.1, 0);
  const run = M(g, KIT.cyl(0.04, 0.04, 0.7, 10), pipe, 0, 1.25, 0);
  run.rotation.z = Math.PI / 2;
  for (const sx of [-0.35, 0.35]) {
    M(g, KIT.cyl(0.065, 0.065, 0.05, 12), painted, sx, 1.25, 0).rotation.z = Math.PI / 2;
    M(g, KIT.cyl(0.065, 0.065, 0.05, 12), painted, sx, 0.4, 0);
  }
  // Valve wheel.
  const wheel = M(g, KIT.torus(0.085, 0.014, 16, 8), pm(0xa03028, { roughness: 0.5, metalness: 0.4 }, 'valvewheel'), 0, 1.42, 0);
  wheel.rotation.x = Math.PI / 2;
  M(g, KIT.cyl(0.014, 0.014, 0.16, 8), painted, 0, 1.34, 0);
  // Pressure gauge.
  const gaugeTex = generateImageTexture('gauge', 48, 48, (ctx, w, h) => {
    ctx.fillStyle = '#f0efe8'; ctx.beginPath(); ctx.arc(24, 24, 22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#22262b'; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5;
      ctx.beginPath(); ctx.moveTo(24 + Math.cos(a) * 16, 24 + Math.sin(a) * 16); ctx.lineTo(24 + Math.cos(a) * 20, 24 + Math.sin(a) * 20); ctx.stroke();
    }
    ctx.strokeStyle = '#c63b2f';
    ctx.beginPath(); ctx.moveTo(24, 24); ctx.lineTo(24 + Math.cos(Math.PI * 1.4) * 17, 24 + Math.sin(Math.PI * 1.4) * 17); ctx.stroke();
  });
  const gauge = M(g, KIT.cyl(0.05, 0.05, 0.03, 14), painted, -0.35, 1.65, 0.06);
  gauge.rotation.x = Math.PI / 2;
  const face = M(g, KIT.cyl(0.042, 0.042, 0.004, 14), new THREE.MeshStandardMaterial({ map: gaugeTex, roughness: 0.3 }), -0.35, 1.65, 0.078, { cast: false });
  face.rotation.x = Math.PI / 2;
  col(g, [0, 1.1, 0], [0.9, 2.2, 0.24], SURFACE.METAL);
  return g;
}

export function airHandler() {
  const g = grp('airHandler');
  const m = tiled(MAT.metalPainted, 1.6);
  M(g, KIT.bevelBox(1.7, 1.5, 0.9, 0.016), m, 0, 0.83, 0);
  M(g, KIT.bevelBox(1.7, 0.16, 0.9, 0.01), darkTrimMat(), 0, 0.08, 0);
  // Access panels with handles + grille.
  for (const sx of [-0.45, 0.45]) {
    M(g, KIT.bevelBox(0.68, 1.1, 0.016, 0.006), tiled(MAT.metalPainted, 0.9), sx, 0.75, 0.455);
    M(g, KIT.bevelBox(0.04, 0.12, 0.03, 0.006), darkTrimMat(), sx + 0.24, 0.75, 0.47);
  }
  for (let i = 0; i < 8; i++) M(g, KIT.box(0.5, 0.012, 0.01), pm(0x2c3238, { roughness: 0.6 }, 'ahugrille'), -0.45, 1.28 + i * 0.03, 0.462);
  // Duct collar on top.
  M(g, KIT.bevelBox(0.55, 0.4, 0.55, 0.012), tiled(MAT.aluminum, 0.9), 0.35, 1.78, 0);
  M(g, KIT.cyl(0.005, 0.005, 0.006, 6), ledMaterial(0x37e07a, 2), 0.14, 1.2, 0.462).rotation.x = Math.PI / 2;
  col(g, [0, 0.85, 0], [1.7, 1.7, 0.92], SURFACE.METAL);
  return g;
}

export function ductBranch(length = 2.4) {
  const g = grp('ductBranch');
  const duct = KIT.ductRun({ length, w: 0.45, h: 0.32, material: tiled(MAT.aluminum, 1.2) });
  g.add(duct);
  return g;
}

export function fireExtinguisher(withBracket = true) {
  const g = grp('fireExtinguisher');
  const red = pm(0xb02a20, { roughness: 0.32, metalness: 0.25 }, 'extred');
  M(g, KIT.cyl(0.075, 0.075, 0.42, 14), red, 0, 0.28, 0);
  M(g, KIT.sphere(0.074, 14), red, 0, 0.49, 0).scale.y = 0.55;
  M(g, KIT.cyl(0.02, 0.024, 0.06, 8), tiled(MAT.chrome, 0.3), 0, 0.545, 0);
  // Handle + lever + hose.
  M(g, KIT.bevelBox(0.09, 0.016, 0.025, 0.005), tiled(MAT.steel, 0.3), 0.02, 0.585, 0);
  M(g, KIT.bevelBox(0.08, 0.014, 0.02, 0.005), tiled(MAT.steel, 0.3), 0.02, 0.562, 0);
  const hose = M(g, KIT.torus(0.09, 0.011, 12, 6, Math.PI * 0.8), pm(0x1a1d20, { roughness: 0.8 }, 'exthose'), 0.03, 0.42, 0.06);
  hose.rotation.y = Math.PI / 2;
  // Instruction band.
  M(g, KIT.cyl(0.076, 0.076, 0.1, 14), pm(0xf0ede2, { roughness: 0.6 }, 'extlabel'), 0, 0.3, 0);
  if (withBracket) M(g, KIT.bevelBox(0.05, 0.16, 0.04, 0.006), darkTrimMat(), 0, 0.4, -0.09);
  return g;
}

export function fireCabinet() {
  const g = grp('fireCabinet');
  M(g, KIT.bevelBox(0.42, 0.72, 0.2, 0.01), pm(0xb02a20, { roughness: 0.4, metalness: 0.3 }, 'firecab'), 0, 0, 0.11);
  const tex = generateImageTexture('firecabglass', 96, 160, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(200,220,230,0.2)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f0ede2';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FIRE', w / 2, 30);
    ctx.fillText('EXTINGUISHER', w / 2, 46);
    ctx.strokeStyle = '#f0ede2';
    ctx.strokeRect(6, 6, w - 12, h - 12);
  });
  M(g, KIT.box(0.32, 0.6, 0.006), new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.92, roughness: 0.2 }), 0, 0, 0.215, { cast: false });
  const ext = fireExtinguisher(false);
  ext.scale.setScalar(0.8);
  ext.position.set(0, -0.32, 0.1);
  g.add(ext);
  return g;
}

export function sprinklerHead() {
  const g = grp('sprinklerHead');
  M(g, KIT.cyl(0.014, 0.014, 0.05, 8), tiled(MAT.chrome, 0.3), 0, -0.025, 0);
  M(g, KIT.cyl(0.032, 0.038, 0.01, 10), tiled(MAT.chrome, 0.3), 0, -0.055, 0);
  M(g, KIT.sphere(0.008, 6), pm(0xc63b2f, { roughness: 0.3 }, 'sprinklerbulb'), 0, -0.045, 0);
  return g;
}

export function smokeDetector() {
  const g = grp('smokeDetector');
  M(g, KIT.cyl(0.06, 0.05, 0.03, 14), tiled(MAT.plasticWhite, 0.3), 0, -0.015, 0);
  M(g, KIT.cyl(0.002, 0.002, 0.004, 6), ledMaterial(0xff4030, 2), 0.03, -0.032, 0);
  return g;
}

export function janitorCart() {
  const g = grp('janitorCart');
  const yellow = pm(0xd8b020, { roughness: 0.55 }, 'janyellow');
  M(g, KIT.bevelBox(0.9, 0.06, 0.5, 0.012), yellow, 0, 0.14, 0);
  M(g, KIT.bevelBox(0.9, 0.05, 0.5, 0.012), yellow, 0, 0.62, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    M(g, KIT.bevelBox(0.035, 0.55, 0.035, 0.006), yellow, sx * 0.42, 0.4, sz * 0.22);
    M(g, KIT.cyl(0.05, 0.05, 0.03, 10), darkTrimMat(), sx * 0.38, 0.05, sz * 0.2).rotation.z = Math.PI / 2;
  }
  // Vinyl refuse bag on one end.
  const bag = M(g, KIT.cyl(0.17, 0.13, 0.5, 10), pm(0x8f9498, { roughness: 0.85 }, 'janbag'), 0.32, 0.42, 0);
  bag.scale.z = 0.85;
  // Bottles and cloths on the top tray.
  for (let i = 0; i < 3; i++) M(g, KIT.cyl(0.03, 0.035, 0.16, 8), pm([0x3a76b8, 0x4a9a50, 0xc06828][i], { roughness: 0.5 }, `janbtl${i}`), -0.32 + i * 0.14, 0.72, -0.1);
  M(g, KIT.bevelBox(0.16, 0.03, 0.14, 0.008), tiled(MAT.fabricPanel, 0.2), -0.15, 0.66, 0.12);
  // Push handle.
  M(g, KIT.cyl(0.014, 0.014, 0.44, 8), darkTrimMat(), -0.46, 0.8, 0).rotation.x = Math.PI / 2;
  for (const sz of [-1, 1]) M(g, KIT.cyl(0.014, 0.014, 0.3, 8), darkTrimMat(), -0.46, 0.66, sz * 0.21).rotation.z = 0.15;
  col(g, [0, 0.45, 0], [1.0, 0.9, 0.55], SURFACE.PLASTIC);
  return g;
}

export function mopBucket() {
  const g = grp('mopBucket');
  const yellow = pm(0xd8b020, { roughness: 0.55 }, 'janyellow');
  M(g, KIT.bevelBox(0.36, 0.3, 0.44, 0.02), yellow, 0, 0.22, 0);
  M(g, KIT.bevelBox(0.3, 0.12, 0.16, 0.014), yellow, 0, 0.42, -0.1); // wringer
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    M(g, KIT.cyl(0.032, 0.032, 0.02, 8), darkTrimMat(), sx * 0.14, 0.035, sz * 0.18).rotation.z = Math.PI / 2;
  }
  // Mop standing in the bucket.
  const stick = M(g, KIT.cyl(0.013, 0.013, 1.3, 8), tiled(MAT.woodDesk, 0.2), 0.06, 0.9, 0.08);
  stick.rotation.z = 0.22;
  M(g, KIT.cyl(0.05, 0.07, 0.16, 8), pm(0xc8c2b2, { roughness: 0.95 }, 'mophead'), -0.06, 0.32, 0.08);
  col(g, [0, 0.25, 0], [0.4, 0.5, 0.48], SURFACE.PLASTIC);
  return g;
}

export function broom() {
  const g = grp('broom');
  // Leaning against a wall: pivot at bristle base.
  const stick = M(g, KIT.cyl(0.012, 0.012, 1.25, 8), tiled(MAT.woodDesk, 0.2), 0, 0.68, -0.08);
  stick.rotation.x = -0.18;
  M(g, KIT.bevelBox(0.26, 0.05, 0.06, 0.01), tiled(MAT.woodDesk, 0.2), 0, 0.1, 0.02);
  M(g, KIT.bevelBox(0.24, 0.09, 0.05, 0.01), pm(0xb89858, { roughness: 0.95 }, 'bristles'), 0, 0.045, 0.02);
  return g;
}

export function cleaningBottle(idx = 0) {
  const g = grp('cleaningBottle');
  const cols = [0x3a76b8, 0x4a9a50, 0xc06828, 0xa03060];
  const body = M(g, KIT.cyl(0.038, 0.042, 0.16, 10), pm(cols[idx % 4], { roughness: 0.45 }, `clean${idx % 4}`), 0, 0.08, 0);
  body.scale.z = 0.62;
  M(g, KIT.cyl(0.012, 0.03, 0.08, 8), pm(0xe8e6de, { roughness: 0.5 }, 'sprayhead'), 0, 0.2, 0);
  M(g, KIT.bevelBox(0.02, 0.025, 0.05, 0.006), pm(0xe8e6de, { roughness: 0.5 }, 'sprayhead'), 0, 0.225, 0.025);
  return g;
}

export function wireShelving() {
  const g = grp('wireShelving');
  const m = pm(0x9aa0a6, { roughness: 0.35, metalness: 0.8 }, 'wireshelf');
  const W = 1.2, D = 0.45, H = 1.8;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    M(g, KIT.cyl(0.016, 0.016, H, 8), m, sx * (W / 2 - 0.02), H / 2, sz * (D / 2 - 0.02));
  }
  for (let lvl = 0; lvl < 4; lvl++) {
    const y = 0.12 + lvl * 0.52;
    M(g, KIT.box(W, 0.014, D), m, 0, y, 0);
    M(g, KIT.cyl(0.008, 0.008, W, 6), m, 0, y + 0.025, D / 2 - 0.01).rotation.z = Math.PI / 2;
    M(g, KIT.cyl(0.008, 0.008, W, 6), m, 0, y + 0.025, -D / 2 + 0.01).rotation.z = Math.PI / 2;
  }
  col(g, [0, H / 2, 0], [W, H, D], SURFACE.METAL);
  return g;
}

function cardboardLabelMaterial(seed = 0) {
  const tex = generateImageTexture(`boxlabel:${seed}`, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = css(PALETTE.cardboard);
    ctx.fillRect(0, 0, w, h);
    const rnd = mulberry32(hashString(`bl${seed}`));
    // Corrugation hint + scuffs.
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = rnd() < 0.5 ? '#6b4c2e' : '#caa877';
      ctx.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 30, 1 + rnd() * 3);
    }
    ctx.globalAlpha = 1;
    // Tape stripe.
    ctx.fillStyle = 'rgba(190,178,150,0.85)';
    ctx.fillRect(0, h * 0.44, w, h * 0.12);
    // Shipping label.
    ctx.fillStyle = '#f2efe6';
    ctx.fillRect(w * 0.55, h * 0.62, w * 0.36, h * 0.28);
    ctx.fillStyle = '#22262b';
    ctx.font = '7px Arial';
    ctx.fillText('NORTHSTAR ADMIN CTR', w * 0.57, h * 0.7);
    ctx.fillText('DOCK 2 — GOODS IN', w * 0.57, h * 0.77);
    ctx.fillStyle = '#111';
    for (let i = 0; i < 18; i++) ctx.fillRect(w * 0.57 + i * 2.4, h * 0.8, rnd() < 0.5 ? 1 : 2, h * 0.07);
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  return m;
}

export function cardboardBox(size = 'm', open = false, seed = 0) {
  const dims = { s: [0.3, 0.24, 0.3], m: [0.45, 0.35, 0.42], l: [0.6, 0.45, 0.55] }[size] || [0.45, 0.35, 0.42];
  const g = grp(`cardboardBox-${size}${open ? '-open' : ''}`);
  const [w, h, d] = dims;
  const m = cardboardLabelMaterial(seed % 3);
  M(g, KIT.bevelBox(w, h, d, 0.008), m, 0, h / 2, 0);
  if (open) {
    for (const s of [-1, 1]) {
      const flap = M(g, KIT.bevelBox(w * 0.96, 0.008, d * 0.42, 0.003), m, 0, h + 0.05, s * d * 0.36);
      flap.rotation.x = s * 1.9;
      flap.position.y = h + Math.sin(0.35) * d * 0.2;
    }
    // Packing paper inside.
    M(g, KIT.bevelBox(w * 0.8, 0.05, d * 0.8, 0.02), tiled(MAT.paper, 0.3), 0, h - 0.04, 0);
  }
  col(g, [0, h / 2, 0], [w, h, d], SURFACE.PAPER);
  return g;
}

export function shippingCrate() {
  const g = grp('shippingCrate');
  const wood = tiled(MAT.woodDesk, 0.8);
  const W = 0.9, H = 0.8, D = 0.7;
  M(g, KIT.bevelBox(W, H, D, 0.01), wood, 0, H / 2, 0);
  // Batten frame.
  const batten = pm(shade(PALETTE.woodVeneer, 0.75), { roughness: 0.8 }, 'batten');
  for (const sy of [0.06, H - 0.06]) {
    M(g, KIT.bevelBox(W + 0.03, 0.08, D + 0.03, 0.006), batten, 0, sy, 0);
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    M(g, KIT.bevelBox(0.08, H, 0.08, 0.006), batten, sx * (W / 2 - 0.02), H / 2, sz * (D / 2 - 0.02));
  }
  col(g, [0, H / 2, 0], [W + 0.04, H, D + 0.04], SURFACE.WOOD);
  return g;
}

export function palletWood() {
  const g = grp('pallet');
  const wood = pm(shade(PALETTE.woodVeneer, 0.85), { roughness: 0.9 }, 'palletwood');
  for (let i = 0; i < 5; i++) M(g, KIT.bevelBox(1.2, 0.02, 0.14, 0.004), wood, 0, 0.13, -0.4 + i * 0.2);
  for (const sx of [-0.5, 0, 0.5]) {
    M(g, KIT.bevelBox(0.14, 0.09, 1.0, 0.006), wood, sx, 0.075, 0);
    M(g, KIT.bevelBox(0.14, 0.02, 1.0, 0.004), wood, sx, 0.02, 0);
  }
  col(g, [0, 0.075, 0], [1.2, 0.15, 1.0], SURFACE.WOOD);
  return g;
}

export function handTruck() {
  const g = grp('handTruck');
  const frame = pm(0xc06828, { roughness: 0.5, metalness: 0.4 }, 'handtruck');
  for (const sx of [-1, 1]) {
    const rail = M(g, KIT.cyl(0.014, 0.014, 1.25, 8), frame, sx * 0.2, 0.64, 0.02);
    rail.rotation.x = -0.12;
  }
  M(g, KIT.cyl(0.014, 0.014, 0.42, 8), frame, 0, 1.26, -0.06).rotation.z = Math.PI / 2;
  M(g, KIT.bevelBox(0.46, 0.012, 0.3, 0.004), tiled(MAT.aluminum, 0.4), 0, 0.05, 0.17);
  for (const sx of [-1, 1]) {
    const wheel = M(g, KIT.cyl(0.1, 0.1, 0.04, 14), pm(0x1c1f22, { roughness: 0.85 }, 'tyre'), sx * 0.24, 0.1, -0.04);
    wheel.rotation.z = Math.PI / 2;
    M(g, KIT.cyl(0.04, 0.04, 0.045, 10), tiled(MAT.aluminum, 0.3), sx * 0.24, 0.1, -0.04).rotation.z = Math.PI / 2;
  }
  col(g, [0, 0.6, 0.02], [0.5, 1.3, 0.4], SURFACE.METAL);
  return g;
}

export function stepLadder() {
  const g = grp('stepLadder');
  const alum = tiled(MAT.aluminum, 0.7);
  const H = 1.5, spread = 0.5;
  for (const side of [-1, 1]) {
    for (const sx of [-1, 1]) {
      const rail = M(g, KIT.bevelBox(0.05, H, 0.025, 0.005), alum, sx * 0.22, H / 2 - 0.02, side * spread * 0.36);
      rail.rotation.x = side * 0.32;
    }
  }
  for (let i = 0; i < 4; i++) {
    const y = 0.28 + i * 0.35;
    const z = -((y / H) * spread * 0.62 - spread * 0.3);
    M(g, KIT.bevelBox(0.42, 0.02, 0.1, 0.004), alum, 0, y, z - 0.22);
  }
  M(g, KIT.bevelBox(0.46, 0.03, 0.2, 0.006), pm(0xd8b020, { roughness: 0.6 }, 'laddertop'), 0, H - 0.02, 0);
  col(g, [0, H / 2, 0], [0.5, H, 0.62], SURFACE.METAL);
  return g;
}

export function toolCase() {
  const g = grp('toolCase');
  M(g, KIT.bevelBox(0.46, 0.2, 0.22, 0.014), pm(0xa03028, { roughness: 0.5, metalness: 0.3 }, 'toolbox'), 0, 0.1, 0);
  M(g, KIT.bevelBox(0.46, 0.05, 0.22, 0.012), pm(0x8a2822, { roughness: 0.5, metalness: 0.3 }, 'toolboxlid'), 0, 0.225, 0);
  M(g, KIT.cyl(0.012, 0.012, 0.3, 8), darkTrimMat(), 0, 0.27, 0).rotation.z = Math.PI / 2;
  for (const sx of [-1, 1]) M(g, KIT.bevelBox(0.04, 0.05, 0.014, 0.004), aluTrimMat(), sx * 0.14, 0.2, 0.11);
  col(g, [0, 0.13, 0], [0.46, 0.27, 0.22], SURFACE.METAL);
  return g;
}

export function warningCone() {
  const g = grp('warningCone');
  M(g, KIT.bevelBox(0.3, 0.025, 0.3, 0.008), pm(0xd85a20, { roughness: 0.6 }, 'cone'), 0, 0.012, 0);
  M(g, KIT.cyl(0.015, 0.13, 0.68, 12), pm(0xd85a20, { roughness: 0.6 }, 'cone'), 0, 0.36, 0);
  M(g, KIT.cyl(0.06, 0.085, 0.12, 12), pm(0xf0ede2, { roughness: 0.45 }, 'conestripe'), 0, 0.42, 0);
  return g;
}

export function wetFloorSign() {
  const g = grp('wetFloorSign');
  const tex = generateImageTexture('wetfloor', 96, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e8c020';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1c1c1c';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('CAUTION', w / 2, 30);
    ctx.font = 'bold 15px Arial';
    ctx.fillText('WET FLOOR', w / 2, h - 14);
    // Slipping figure.
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.arc(w / 2 - 6, 54, 7, 0, Math.PI * 2);
    ctx.moveTo(w / 2 - 4, 62); ctx.lineTo(w / 2 + 10, 78); ctx.lineTo(w / 2 + 26, 74);
    ctx.moveTo(w / 2 + 10, 78); ctx.lineTo(w / 2 + 4, 96);
    ctx.moveTo(w / 2 - 2, 70); ctx.lineTo(w / 2 - 18, 82);
    ctx.stroke();
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
  for (const s of [-1, 1]) {
    const face = M(g, KIT.box(0.3, 0.55, 0.008), m, 0, 0.34, s * 0.09);
    face.rotation.x = s * 0.3;
  }
  M(g, KIT.cyl(0.008, 0.008, 0.3, 6), pm(0xe8c020, { roughness: 0.6 }, 'wfhinge'), 0, 0.62, 0).rotation.z = Math.PI / 2;
  return g;
}

export function floorMat(w = 1.8, d = 1.1) {
  const g = grp('floorMat');
  M(g, KIT.bevelBox(w, 0.018, d, 0.008), tiled(MAT.rubber, 1.2), 0, 0.009, 0, { cast: false });
  return g;
}

export function bollard() {
  const g = grp('bollard');
  M(g, KIT.cyl(0.07, 0.07, 0.9, 12), tiled(MAT.metalWarn, 0.5), 0, 0.45, 0);
  M(g, KIT.sphere(0.07, 12), tiled(MAT.metalWarn, 0.5), 0, 0.9, 0).scale.y = 0.5;
  M(g, KIT.cyl(0.09, 0.1, 0.04, 12), darkTrimMat(), 0, 0.02, 0);
  col(g, [0, 0.45, 0], [0.16, 0.92, 0.16], SURFACE.METAL);
  return g;
}

export function garageControlBox() {
  const g = grp('garageControlBox');
  M(g, KIT.bevelBox(0.2, 0.28, 0.1, 0.01), tiled(MAT.metalPainted, 0.4), 0, 0, 0.055);
  const tex = generateImageTexture('garagectrl', 64, 96, (ctx, w, h) => {
    ctx.fillStyle = '#3a4147';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BAY DOOR 1', w / 2, 14);
    const btns = [['#3fae6a', 'OPEN'], ['#c63b2f', 'STOP'], ['#e8c020', 'CLOSE']];
    btns.forEach((b, i) => {
      ctx.fillStyle = b[0];
      ctx.beginPath(); ctx.arc(w / 2, 32 + i * 22, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#dfe4e8';
      ctx.font = '6px Arial';
      ctx.fillText(b[1], w / 2, 32 + i * 22 + 14);
    });
  });
  M(g, KIT.box(0.16, 0.24, 0.006), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }), 0, 0, 0.112, { cast: false });
  M(g, KIT.cyl(0.02, 0.02, 0.5, 8), tiled(MAT.metalPainted, 0.3), 0, 0.4, 0.04);
  return g;
}

export function supplyCrate() {
  const g = grp('supplyCrate');
  const olive = pm(0x4a523c, { roughness: 0.55, metalness: 0.2 }, 'olivecrate');
  M(g, KIT.bevelBox(0.85, 0.45, 0.5, 0.012), olive, 0, 0.225, 0);
  M(g, KIT.bevelBox(0.87, 0.06, 0.52, 0.01), pm(0x3c4432, { roughness: 0.55, metalness: 0.2 }, 'olivelid'), 0, 0.48, 0);
  for (const sx of [-1, 1]) {
    M(g, KIT.bevelBox(0.1, 0.05, 0.03, 0.008), darkTrimMat(), sx * 0.28, 0.44, 0.26);
    M(g, KIT.bevelBox(0.06, 0.14, 0.04, 0.008), darkTrimMat(), sx * 0.44, 0.24, 0);
  }
  const tex = generateImageTexture('supplystencil', 192, 96, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(230,225,200,0.85)';
    ctx.font = 'bold 21px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('5.56MM BALL', w / 2, 36);
    ctx.font = 'bold 14px monospace';
    ctx.fillText('LOT N-2214 — 800 RD', w / 2, 60);
  });
  M(g, KIT.plane(0.6, 0.28), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -1 }), 0, 0.24, 0.256, { cast: false });
  col(g, [0, 0.26, 0], [0.87, 0.52, 0.52], SURFACE.METAL);
  return g;
}

// =========================================================================
// DESK CLUTTER
// =========================================================================

export function paperSheet() {
  const g = grp('paperSheet');
  M(g, KIT.box(0.21, 0.0015, 0.297), tiled(MAT.paper, 0.3), 0, 0.001, 0, { cast: false });
  return g;
}

export function paperStack(height = 0.06) {
  const g = grp('paperStack');
  M(g, KIT.bevelBox(0.215, height, 0.3, 0.004), tiled(MAT.paper, 0.3), 0, height / 2, 0);
  const top = M(g, KIT.box(0.21, 0.0015, 0.297), tiled(MAT.paper, 0.3), 0.004, height + 0.001, 0.003, { cast: false });
  top.rotation.y = 0.06;
  return g;
}

export function folder(idx = 0) {
  const g = grp('folder');
  const cols = [0xc8a86a, 0x8aa8c0, 0xc08a8a];
  M(g, KIT.bevelBox(0.24, 0.008, 0.32, 0.003), pm(cols[idx % 3], { roughness: 0.8 }, `folder${idx % 3}`), 0, 0.004, 0);
  M(g, KIT.box(0.2, 0.003, 0.28), tiled(MAT.paper, 0.3), 0.008, 0.01, 0, { cast: false });
  return g;
}

export function ringBinder(idx = 0) {
  const g = grp('ringBinder');
  const cols = [0x39505f, 0x5f3939, 0x3c5a3c, 0x2a2e33];
  // Standing binder: pivot at base.
  M(g, KIT.bevelBox(0.07, 0.31, 0.28, 0.006), pm(cols[idx % 4], { roughness: 0.7 }, `binder${idx % 4}`), 0, 0.155, 0);
  M(g, KIT.box(0.04, 0.14, 0.002), pm(0xf2efe6, { roughness: 0.8 }, 'binderlabel'), 0, 0.16, 0.141, { cast: false });
  return g;
}

export function notebook() {
  const g = grp('notebook');
  M(g, KIT.bevelBox(0.15, 0.012, 0.21, 0.004), pm(0x2f3a45, { roughness: 0.6 }, 'notebookcover'), 0, 0.006, 0);
  M(g, KIT.cyl(0.006, 0.006, 0.2, 6), aluTrimMat(), -0.073, 0.008, 0).rotation.x = Math.PI / 2;
  return g;
}

export function pen() {
  const g = grp('pen');
  const p = M(g, KIT.cyl(0.004, 0.005, 0.14, 6), pm(0x22262b, { roughness: 0.4 }, 'penbody'), 0, 0.005, 0);
  p.rotation.z = Math.PI / 2;
  p.rotation.y = 0.4;
  return g;
}

export function pencil() {
  const g = grp('pencil');
  const p = M(g, KIT.cyl(0.0035, 0.0035, 0.15, 6), pm(0xd8a020, { roughness: 0.6 }, 'pencilbody'), 0, 0.004, 0);
  p.rotation.z = Math.PI / 2;
  p.rotation.y = -0.6;
  return g;
}

export function stapler() {
  const g = grp('stapler');
  M(g, KIT.bevelBox(0.15, 0.02, 0.04, 0.006), darkTrimMat(), 0, 0.01, 0);
  const top = M(g, KIT.bevelBox(0.15, 0.025, 0.035, 0.01), pm(0x8a2822, { roughness: 0.4 }, 'staplertop'), -0.005, 0.035, 0);
  top.rotation.z = 0.06;
  return g;
}

export function tapeDispenser() {
  const g = grp('tapeDispenser');
  M(g, KIT.bevelBox(0.14, 0.05, 0.045, 0.012), pm(0x2a2e33, { roughness: 0.5 }, 'tapebase'), 0, 0.025, 0);
  M(g, KIT.torus(0.03, 0.012, 12, 6), pm(0xd8d4c8, { roughness: 0.3, transparent: true, opacity: 0.85 }, 'taperoll'), -0.02, 0.055, 0);
  return g;
}

export function scissors() {
  const g = grp('scissors');
  for (const s of [-1, 1]) {
    const blade = M(g, KIT.bevelBox(0.1, 0.002, 0.012, 0.001), tiled(MAT.steel, 0.1), 0.03, 0.003 + (s + 1) * 0.001, s * 0.006);
    blade.rotation.y = s * 0.12;
    const handle = M(g, KIT.torus(0.014, 0.004, 8, 6), pm(0xc06828, { roughness: 0.5 }, 'scissorhandle'), -0.045, 0.004, s * 0.012);
    handle.rotation.x = Math.PI / 2;
  }
  return g;
}

export function stickyNotes() {
  const g = grp('stickyNotes');
  M(g, KIT.bevelBox(0.075, 0.02, 0.075, 0.003), pm(0xf0e060, { roughness: 0.75 }, 'sticky'), 0, 0.01, 0);
  return g;
}

export function clipsDish() {
  const g = grp('clipsDish');
  M(g, KIT.cyl(0.045, 0.035, 0.02, 12), darkTrimMat(), 0, 0.01, 0);
  for (let i = 0; i < 3; i++) {
    const clip = M(g, KIT.torus(0.008, 0.0018, 8, 4), tiled(MAT.steel, 0.1), (i - 1) * 0.015, 0.022, (i % 2) * 0.012);
    clip.rotation.x = Math.PI / 2 - 0.3 * i;
  }
  return g;
}

export function idBadge() {
  const g = grp('idBadge');
  const tex = generateImageTexture('idbadge', 64, 96, (ctx, w, h) => {
    ctx.fillStyle = '#f2f4f6'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0e2233'; ctx.fillRect(0, 0, w, 20);
    paintNorthstarMark(ctx, 12, 10, 6, '#7fd4e8', false);
    drawLabel(ctx, 'NORTHSTAR', 22, 6, { font: 'bold 7px Arial', color: '#dfeaf2' });
    ctx.fillStyle = '#b8c4cc';
    ctx.fillRect(16, 28, 32, 34);
    ctx.fillStyle = '#5a6870';
    ctx.beginPath(); ctx.arc(32, 40, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(32, 62, 14, Math.PI, 0); ctx.fill();
    drawLabel(ctx, 'T. HALVORSEN', 32, 70, { font: 'bold 6px Arial', color: '#22262b', align: 'center' });
    drawLabel(ctx, 'FACILITIES', 32, 80, { font: '6px Arial', color: '#5a6870', align: 'center' });
  });
  M(g, KIT.box(0.055, 0.001, 0.085), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }), 0, 0.001, 0, { cast: false });
  // Lanyard puddle.
  const strap = M(g, KIT.torus(0.03, 0.004, 12, 6), pm(0x1d6f8c, { roughness: 0.8 }, 'lanyard'), 0.01, 0.004, -0.07);
  strap.rotation.x = Math.PI / 2;
  strap.scale.y = 1.6;
  return g;
}

export function keycardProp() {
  const g = grp('keycard');
  const tex = generateImageTexture('keycard', 64, 40, (ctx, w, h) => {
    ctx.fillStyle = '#dfe4e8'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1d6f8c'; ctx.fillRect(0, 0, w, 12);
    drawLabel(ctx, 'ACCESS — L2', 4, 15, { font: 'bold 8px Arial', color: '#22303a' });
    ctx.fillStyle = '#c8a020';
    ctx.fillRect(6, 26, 12, 9);
  });
  M(g, KIT.box(0.086, 0.0018, 0.054), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 }), 0, 0.002, 0, { cast: false });
  return g;
}

export function deskCalendar() {
  const g = grp('deskCalendar');
  const tex = generateImageTexture('deskcal', 96, 64, (ctx, w, h) => {
    ctx.fillStyle = '#f6f4ee'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c63b2f'; ctx.fillRect(0, 0, w, 14);
    drawLabel(ctx, 'JANUARY', w / 2, 3, { font: 'bold 9px Arial', color: '#fff', align: 'center' });
    ctx.fillStyle = '#22262b'; ctx.font = '6px Arial';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) ctx.fillText(String(r * 7 + c + 1), 8 + c * 12, 26 + r * 9);
    ctx.strokeStyle = '#c63b2f';
    ctx.beginPath(); ctx.arc(8 + 6 * 12 + 2, 24 + 9, 5, 0, Math.PI * 2); ctx.stroke();
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  for (const s of [-1, 1]) {
    const face = M(g, KIT.box(0.14, 0.1, 0.003), m, 0, 0.05, s * 0.028);
    face.rotation.x = s * 0.5;
  }
  return g;
}

export function photoFrame() {
  const g = grp('photoFrame');
  const tex = generateImageTexture('photo', 64, 48, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#8fb8d8');
    grad.addColorStop(0.6, '#c8d8e0');
    grad.addColorStop(1, '#5a7a5a');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    // Fjord + cabin silhouette.
    ctx.fillStyle = '#37506b';
    ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(16, 10); ctx.lineTo(30, 24); ctx.lineTo(44, 8); ctx.lineTo(64, 26); ctx.lineTo(64, 30); ctx.lineTo(0, 30); ctx.fill();
    ctx.fillStyle = '#6b4028';
    ctx.fillRect(40, 30, 10, 7);
    ctx.beginPath(); ctx.moveTo(38, 30); ctx.lineTo(45, 24); ctx.lineTo(52, 30); ctx.fill();
  });
  const frame = M(g, KIT.bevelBox(0.13, 0.1, 0.008, 0.003), tiled(MAT.woodDark, 0.2), 0, 0.05, 0);
  frame.rotation.x = -0.12;
  const pic = M(g, KIT.box(0.11, 0.08, 0.002), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }), 0, 0.05, 0.005, { cast: false });
  pic.rotation.x = -0.12;
  return g;
}

export function brochure() {
  const g = grp('brochure');
  const tex = generateImageTexture('brochure', 96, 64, (ctx, w, h) => {
    ctx.fillStyle = '#0e2233'; ctx.fillRect(0, 0, w, h);
    paintNorthstarMark(ctx, w / 2, 22, 12, '#7fd4e8');
    drawLabel(ctx, 'NORTHSTAR', w / 2, 40, { font: 'bold 9px Arial', color: '#dfeaf2', align: 'center' });
    drawLabel(ctx, 'Regional services guide', w / 2, 52, { font: '6px Arial', color: '#8ca4b4', align: 'center' });
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  for (let i = 0; i < 3; i++) {
    const panel = M(g, KIT.box(0.095, 0.066, 0.0015), m, -0.03 + i * 0.031, 0.033 + (i === 1 ? 0.012 : 0), 0);
    panel.rotation.z = i === 1 ? 0.5 : i === 2 ? -0.06 : 0.06;
    panel.rotation.x = Math.PI / 2 - (i === 1 ? 0.25 : 1.45);
  }
  return g;
}

export function waterBottle() {
  const g = grp('waterBottle');
  const b = M(g, KIT.cyl(0.032, 0.034, 0.2, 10), clearGlass(0xa8d4e8, 0.3), 0, 0.1, 0, { cast: false });
  b.renderOrder = 3;
  M(g, KIT.cyl(0.03, 0.032, 0.1, 10), pm(0x9fd0e8, { roughness: 0.2, transparent: true, opacity: 0.5 }, 'bottlewater'), 0, 0.06, 0);
  M(g, KIT.cyl(0.015, 0.015, 0.02, 8), pm(0x3a76b8, { roughness: 0.4 }, 'bottlecap'), 0, 0.21, 0);
  return g;
}

export function drinksCan(idx = 0) {
  const g = grp('drinksCan');
  const cols = [0xc63b2f, 0x2f8fd6, 0x3fae6a];
  M(g, KIT.cyl(0.033, 0.033, 0.115, 12), pm(cols[idx % 3], { roughness: 0.3, metalness: 0.6 }, `can${idx % 3}`), 0, 0.058, 0);
  M(g, KIT.cyl(0.028, 0.03, 0.01, 12), tiled(MAT.aluminum, 0.2), 0, 0.118, 0);
  return g;
}

export function foodWrapper() {
  const g = grp('foodWrapper');
  const w = M(g, KIT.bevelBox(0.1, 0.015, 0.06, 0.006), pm(0xd0a838, { roughness: 0.5, metalness: 0.3 }, 'wrapper'), 0, 0.008, 0, { cast: false });
  w.rotation.y = 0.7;
  w.scale.set(1, 0.6, 1);
  return g;
}

export function deskOrganiser() {
  const g = grp('deskOrganiser');
  M(g, KIT.bevelBox(0.16, 0.09, 0.09, 0.006), pm(0x33383e, { roughness: 0.6 }, 'organiser'), 0, 0.045, 0);
  M(g, KIT.bevelBox(0.13, 0.07, 0.06, 0.004), pm(0x24282d, { roughness: 0.6 }, 'organiserin'), 0, 0.075, 0);
  for (let i = 0; i < 3; i++) {
    const p = M(g, KIT.cyl(0.0035, 0.0045, 0.13, 6), pm([0x22262b, 0xc63b2f, 0x2f6fa8][i], { roughness: 0.4 }, `orgpen${i}`), -0.03 + i * 0.03, 0.11, 0);
    p.rotation.x = (i - 1) * 0.14;
    p.rotation.z = 0.1 - i * 0.08;
  }
  return g;
}

export function plantPot(r = 0.11, h = 0.16) {
  const g = grp('plantPot');
  M(g, KIT.cyl(r, r * 0.8, h, 12), pm(0x9a6a4a, { roughness: 0.7 }, 'terracotta'), 0, h / 2, 0);
  M(g, KIT.cyl(r * 0.92, r * 0.92, 0.02, 12), pm(0x2e241c, { roughness: 0.95 }, 'soil'), 0, h - 0.012, 0);
  return g;
}

/** Snake plant: stiff upright tapered blades. */
export function plantSnake(seed = 1) {
  const g = plantPot(0.11, 0.16);
  g.name = 'plantSnake';
  const rnd = mulberry32(hashString(`snake${seed}`));
  const leafMat = pm(0x3c5a34, { roughness: 0.6 }, 'snakeleaf');
  const leafMatLight = pm(0x5a7a44, { roughness: 0.6 }, 'snakeleaf2');
  for (let i = 0; i < 9; i++) {
    const h = 0.35 + rnd() * 0.3;
    const geo = new THREE.ConeGeometry(0.028, h, 4, 1);
    geo.scale(1, 1, 0.28);
    const leaf = KIT.mesh(geo, rnd() < 0.5 ? leafMat : leafMatLight);
    const a = rnd() * Math.PI * 2;
    const rr = rnd() * 0.06;
    leaf.position.set(Math.cos(a) * rr, 0.14 + h / 2, Math.sin(a) * rr);
    leaf.rotation.y = rnd() * Math.PI;
    leaf.rotation.x = (rnd() - 0.5) * 0.22;
    leaf.rotation.z = (rnd() - 0.5) * 0.22;
    g.add(leaf);
  }
  return g;
}

/** Ficus: trunk + foliage clusters of tapered leaves on branch tips. */
export function plantFicus(seed = 1) {
  const g = grp('plantFicus');
  const potR = 0.19;
  M(g, KIT.cyl(potR, potR * 0.82, 0.34, 14), pm(0x4a4e52, { roughness: 0.6 }, 'planterdark'), 0, 0.17, 0);
  M(g, KIT.cyl(potR * 0.9, potR * 0.9, 0.02, 14), pm(0x2e241c, { roughness: 0.95 }, 'soil'), 0, 0.325, 0);
  const rnd = mulberry32(hashString(`ficus${seed}`));
  const trunkMat = pm(0x6b5236, { roughness: 0.85 }, 'ficustrunk');
  const trunk = M(g, KIT.cyl(0.018, 0.028, 0.85, 8), trunkMat, 0, 0.75, 0);
  trunk.rotation.z = 0.05;
  const leafMats = [pm(0x2e4a28, { roughness: 0.62 }, 'ficusleaf1'), pm(0x3d5c30, { roughness: 0.62 }, 'ficusleaf2')];
  // Leaf = tapered squashed cone; clustered at branch tips.
  const leafGeo = (() => {
    const geo = new THREE.ConeGeometry(0.03, 0.13, 4, 1);
    geo.scale(1, 1, 0.24);
    geo.translate(0, 0.065, 0);
    return geo;
  })();
  for (let b = 0; b < 7; b++) {
    const a = rnd() * Math.PI * 2;
    const by = 0.85 + rnd() * 0.55;
    const br = 0.1 + rnd() * 0.2;
    const bx = Math.cos(a) * br, bz = Math.sin(a) * br;
    const branch = M(g, KIT.cyl(0.006, 0.011, br * 1.5, 6), trunkMat, bx * 0.5, by, bz * 0.5);
    branch.rotation.z = Math.atan2(bx, br * 1.2);
    branch.rotation.x = -Math.atan2(bz, br * 1.2);
    for (let l = 0; l < 7; l++) {
      const leaf = KIT.mesh(leafGeo, leafMats[(b + l) % 2]);
      leaf.castShadow = true;
      leaf.position.set(bx + (rnd() - 0.5) * 0.16, by + (rnd() - 0.3) * 0.14, bz + (rnd() - 0.5) * 0.16);
      leaf.rotation.set(rnd() * 1.4 - 0.2, rnd() * Math.PI * 2, (rnd() - 0.5) * 1.2);
      g.add(leaf);
    }
  }
  col(g, [0, 0.2, 0], [0.4, 0.4, 0.4], SURFACE.PLASTIC);
  return g;
}

export function backpack() {
  const g = grp('backpack');
  const m = tiled(MAT.fabricChair, 0.4);
  const body = M(g, KIT.bevelBox(0.32, 0.42, 0.16, 0.045), m, 0, 0.21, 0);
  body.rotation.x = -0.14;
  M(g, KIT.bevelBox(0.24, 0.2, 0.07, 0.03), m, 0, 0.15, 0.1);
  for (const sx of [-1, 1]) {
    const strap = M(g, KIT.bevelBox(0.05, 0.3, 0.02, 0.008), pm(0x22262b, { roughness: 0.8 }, 'strap'), sx * 0.09, 0.2, -0.1);
    strap.rotation.x = 0.25;
  }
  M(g, KIT.torus(0.028, 0.007, 8, 6), pm(0x22262b, { roughness: 0.8 }, 'strap'), 0, 0.43, -0.02).rotation.x = 0.6;
  return g;
}

export function briefcase() {
  const g = grp('briefcase');
  M(g, KIT.bevelBox(0.42, 0.32, 0.11, 0.014), tiled(MAT.leather, 0.4), 0, 0.16, 0);
  M(g, KIT.torus(0.05, 0.009, 10, 6, Math.PI), pm(0x1a1511, { roughness: 0.5 }, 'bchandle'), 0, 0.33, 0);
  for (const sx of [-1, 1]) M(g, KIT.bevelBox(0.04, 0.03, 0.02, 0.006), aluTrimMat(), sx * 0.12, 0.28, 0.06);
  return g;
}

export function umbrella() {
  const g = grp('umbrella');
  const u = M(g, KIT.cyl(0.012, 0.03, 0.75, 8), pm(0x1d3a52, { roughness: 0.6 }, 'umbrella'), 0, 0.38, 0);
  u.rotation.x = 0.12;
  M(g, KIT.torus(0.035, 0.007, 8, 6, Math.PI), darkTrimMat(), 0, 0.78, 0.05).rotation.z = Math.PI / 2;
  M(g, KIT.cyl(0.005, 0.005, 0.05, 6), darkTrimMat(), 0, 0.02, -0.004);
  return g;
}

// =========================================================================
// SIGNAGE — every painter writes original Northstar copy.
// =========================================================================

function signMesh(g, w, h, tex, { emissiveIntensity = 0, backing = true, backMat } = {}) {
  if (backing) M(g, KIT.bevelBox(w + 0.02, h + 0.02, 0.014, 0.004), backMat || darkTrimMat(), 0, 0, 0.008);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.42,
    ...(emissiveIntensity > 0 ? { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity } : {}),
  });
  M(g, KIT.box(w, h, 0.006), mat, 0, 0, 0.02, { cast: false });
  return g;
}

export function logoPanel(width = 2.4) {
  const g = grp('logoPanel');
  const tex = generateImageTexture('logopanel', 512, 160, (ctx, w, h) => {
    ctx.fillStyle = '#0e2233';
    ctx.fillRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(29,111,140,0.35)');
    grad.addColorStop(1, 'rgba(14,34,51,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    paintNorthstarMark(ctx, 78, h / 2, 42, '#7fd4e8');
    drawLabel(ctx, 'NORTHSTAR', 140, 34, { font: 'bold 52px Arial', color: '#e8f2f8' });
    drawLabel(ctx, 'ADMINISTRATIVE CENTER — NORDVIK', 143, 96, { font: '20px Arial', color: '#7fa8bc' });
  });
  signMesh(g, width, width * 0.3125, tex, { emissiveIntensity: 0.35, backMat: pm(0x0a1824, { roughness: 0.4, metalness: 0.3 }, 'logoback') });
  return g;
}

export function deptSign(text = 'OPEN OFFICE', sub = '') {
  const g = grp('deptSign');
  const tex = generateImageTexture(`deptsign:${text}:${sub}`, 256, 80, (ctx, w, h) => {
    ctx.fillStyle = '#182a36';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7fd4e8';
    ctx.fillRect(0, 0, 6, h);
    drawLabel(ctx, text, 18, sub ? 14 : h / 2 - 12, { font: 'bold 24px Arial', color: '#dfeaf2' });
    if (sub) drawLabel(ctx, sub, 18, 48, { font: '15px Arial', color: '#8ca4b4' });
  });
  signMesh(g, 0.55, 0.17, tex);
  return g;
}

export function roomPlate(num = 'B-101', name = '') {
  const g = grp('roomPlate');
  const tex = generateImageTexture(`roomplate:${num}:${name}`, 128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#c9cfd4';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1b2a33';
    ctx.fillRect(4, 4, w - 8, h - 8);
    drawLabel(ctx, num, w / 2, name ? 10 : h / 2 - 10, { font: 'bold 20px Arial', color: '#dfeaf2', align: 'center' });
    if (name) drawLabel(ctx, name, w / 2, 38, { font: '11px Arial', color: '#8ca4b4', align: 'center' });
  });
  signMesh(g, 0.16, 0.08, tex, { backing: false });
  return g;
}

export function wayfindSign(entries = [['RECEPTION', 'W'], ['OPEN OFFICE', 'S'], ['CONFERENCE', 'E']]) {
  const g = grp('wayfindSign');
  const key = entries.map((e) => e.join('')).join('|');
  const tex = generateImageTexture(`wayfind:${key}`, 256, 40 + entries.length * 40, (ctx, w, h) => {
    ctx.fillStyle = '#12222e';
    ctx.fillRect(0, 0, w, h);
    drawLabel(ctx, 'NORTHSTAR CENTER', 14, 10, { font: 'bold 13px Arial', color: '#5f8296' });
    entries.forEach(([label, dir], i) => {
      const y = 40 + i * 40;
      ctx.strokeStyle = 'rgba(127,212,232,0.2)';
      ctx.beginPath(); ctx.moveTo(10, y - 5); ctx.lineTo(w - 10, y - 5); ctx.stroke();
      // Arrow.
      ctx.save();
      ctx.translate(26, y + 14);
      const ang = { N: -Math.PI / 2, S: Math.PI / 2, E: 0, W: Math.PI, U: -Math.PI / 2 }[dir] ?? 0;
      ctx.rotate(ang);
      ctx.fillStyle = '#7fd4e8';
      ctx.beginPath();
      ctx.moveTo(10, 0); ctx.lineTo(-4, -8); ctx.lineTo(-4, -3); ctx.lineTo(-12, -3);
      ctx.lineTo(-12, 3); ctx.lineTo(-4, 3); ctx.lineTo(-4, 8);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      drawLabel(ctx, label, 52, y + 4, { font: 'bold 17px Arial', color: '#dfeaf2' });
      if (dir === 'U') drawLabel(ctx, '(UPPER)', w - 14, y + 6, { font: '11px Arial', color: '#8ca4b4', align: 'right' });
    });
  });
  const hgt = 0.1 + entries.length * 0.1;
  signMesh(g, 0.64, hgt, tex);
  return g;
}

export function safetyPoster(variant = 0) {
  const g = grp('safetyPoster');
  const data = [
    ['LIFT WITH YOUR LEGS', 'Back injuries are the #1 lost-time incident at this site.', '#2f6fa8'],
    ['SLIPS TRIPS FALLS', 'Snow gets tracked in. Use the mats. Report puddles to ext. 2100.', '#c06828'],
    ['EYES UP, PHONE DOWN', 'Forklifts operate in the dock area between 06:00 and 10:00.', '#3c7a48'],
  ];
  const [title, body, tint] = data[variant % data.length];
  const tex = generateImageTexture(`safety:${variant}`, 192, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ece9e0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, 56);
    ctx.font = 'bold 17px Arial';
    ctx.fillStyle = '#f4f2ea';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 34, w - 16);
    // Pictogram circle.
    ctx.strokeStyle = tint;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(w / 2, 120, 42, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(w / 2, 104, 9, 0, Math.PI * 2); // head
    ctx.moveTo(w / 2, 113); ctx.lineTo(w / 2 - 4, 136); ctx.lineTo(w / 2 - 16, 148);
    ctx.moveTo(w / 2 - 2, 124); ctx.lineTo(w / 2 + 16, 130);
    ctx.stroke();
    ctx.fillStyle = '#3a3f45';
    ctx.font = '11px Arial';
    const words = body.split(' ');
    let line = '', y = 190;
    for (const word of words) {
      if (ctx.measureText(line + word).width > w - 30) { ctx.fillText(line, w / 2, y); y += 15; line = ''; }
      line += word + ' ';
    }
    ctx.fillText(line, w / 2, y);
    drawLabel(ctx, 'NORTHSTAR SAFETY PROGRAMME', w / 2, h - 14, { font: 'bold 8px Arial', color: '#8a8f95', align: 'center' });
  });
  signMesh(g, 0.42, 0.56, tex, { backing: false });
  return g;
}

export function evacDiagram() {
  const g = grp('evacDiagram');
  const tex = generateImageTexture('evacdiagram', 256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#f0efe8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2f6f4a';
    ctx.fillRect(0, 0, w, 34);
    drawLabel(ctx, 'EVACUATION PLAN', w / 2, 8, { font: 'bold 17px Arial', color: '#f0efe8', align: 'center' });
    drawLabel(ctx, 'GROUND FLOOR — ASSEMBLY: NORTH LOT', w / 2, 40, { font: '9px Arial', color: '#3a3f45', align: 'center' });
    // Simplified plan drawn from the real room rectangles.
    const rooms = ROOMS.filter((r) => r.floor === 'ground' && !r.exterior);
    const minX = -23, maxX = 27, minZ = -16, maxZ = 18;
    const sx = (w - 30) / (maxX - minX);
    const sz = (h - 110) / (maxZ - minZ);
    const s = Math.min(sx, sz);
    const ox = 15, oy = 58;
    for (const r of rooms) {
      const x = ox + (r.x0 - minX) * s;
      const y = oy + (r.z0 - minZ) * s;
      ctx.fillStyle = r.zone === 'service' ? '#d8d5c8' : '#e4e8ea';
      ctx.strokeStyle = '#3a3f45';
      ctx.lineWidth = 1.2;
      ctx.fillRect(x, y, (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
      ctx.strokeRect(x, y, (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
    }
    // Escape arrows to the north entrance and the dock.
    ctx.strokeStyle = '#2f8f4a';
    ctx.lineWidth = 3;
    const arrow = (x1, y1, x2, y2) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - Math.cos(a - 0.5) * 8, y2 - Math.sin(a - 0.5) * 8);
      ctx.lineTo(x2 - Math.cos(a + 0.5) * 8, y2 - Math.sin(a + 0.5) * 8);
      ctx.closePath(); ctx.fill();
    };
    ctx.fillStyle = '#2f8f4a';
    const px = (wx) => ox + (wx - minX) * s;
    const py = (wz) => oy + (wz - minZ) * s;
    arrow(px(0), py(-4), px(0), py(-15));
    arrow(px(-2), py(10), px(-2), py(2)); // corridor to office
    arrow(px(17), py(12), px(17), py(8));
    // You-are-here dot.
    ctx.fillStyle = '#c63b2f';
    ctx.beginPath(); ctx.arc(px(0), py(10), 5, 0, Math.PI * 2); ctx.fill();
    drawLabel(ctx, '● YOU ARE HERE', 16, h - 34, { font: 'bold 9px Arial', color: '#c63b2f' });
    drawLabel(ctx, '→ PRIMARY ROUTE   ▲ FIRE POINT', 16, h - 20, { font: '9px Arial', color: '#2f6f4a' });
  });
  signMesh(g, 0.42, 0.52, tex, { backing: false });
  return g;
}

export function employeeNotice(variant = 0) {
  const g = grp('employeeNotice');
  const data = [
    ['BADGE AUDIT', 'All access badges will be re-validated this week. Carry photo ID.'],
    ['STORM PROTOCOL', 'When the county issues a white-out warning, dial 2900 for transport.'],
  ];
  const [title, body] = data[variant % data.length];
  const tex = generateImageTexture(`empnotice:${variant}`, 160, 200, (ctx, w, h) => {
    ctx.fillStyle = '#f6f3ea';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#8a8f95';
    ctx.strokeRect(4, 4, w - 8, h - 8);
    paintNorthstarMark(ctx, w / 2, 32, 13, '#39505f');
    drawLabel(ctx, title, w / 2, 56, { font: 'bold 14px Arial', color: '#22303a', align: 'center' });
    ctx.fillStyle = '#3a3f45';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    const words = body.split(' ');
    let line = '', y = 88;
    for (const word of words) {
      if (ctx.measureText(line + word).width > w - 30) { ctx.fillText(line, w / 2, y); y += 14; line = ''; }
      line += word + ' ';
    }
    ctx.fillText(line, w / 2, y);
    drawLabel(ctx, 'FACILITIES OFFICE — EXT 2100', w / 2, h - 20, { font: '8px Arial', color: '#8a8f95', align: 'center' });
  });
  signMesh(g, 0.28, 0.36, tex, { backing: false });
  return g;
}

export function securityNotice() {
  const g = grp('securityNotice');
  const tex = generateImageTexture('secnotice', 160, 200, (ctx, w, h) => {
    ctx.fillStyle = '#f2ecdc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#a03028';
    ctx.fillRect(0, 0, w, 40);
    drawLabel(ctx, 'RESTRICTED AREA', w / 2, 12, { font: 'bold 14px Arial', color: '#f6f2e8', align: 'center' });
    ctx.fillStyle = '#3a3f45';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ['Access beyond this point requires', 'a Level-2 badge. Tailgating is a', 'dismissable offence.', '', 'CCTV IN CONSTANT OPERATION'].forEach((l, i) => ctx.fillText(l, w / 2, 66 + i * 16));
    ctx.strokeStyle = '#a03028';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(w / 2, h - 34, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w / 2 - 10, h - 24); ctx.lineTo(w / 2 + 10, h - 44); ctx.stroke();
  });
  signMesh(g, 0.28, 0.36, tex, { backing: false });
  return g;
}

export function flyer(variant = 0) {
  const g = grp('flyer');
  const data = [
    ['SOLSTICE DINNER', 'Thursday 19:00 — Sunfield Room. Bring a dish!', '#dce8f4'],
    ['5-A-SIDE', 'Winter league needs two players. See Dana in IT.', '#e8f0d8'],
    ['LOST GLOVES?', 'A pair of blue mittens is at reception.', '#f4e2c8'],
  ];
  const [title, body, bg] = data[variant % data.length];
  const tex = generateImageTexture(`flyer:${variant}`, 128, 160, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    drawLabel(ctx, title, w / 2, 18, { font: 'bold 13px Arial', color: '#22303a', align: 'center' });
    ctx.fillStyle = '#3a3f45';
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    const words = body.split(' ');
    let line = '', y = 52;
    for (const word of words) {
      if (ctx.measureText(line + word).width > w - 24) { ctx.fillText(line, w / 2, y); y += 13; line = ''; }
      line += word + ' ';
    }
    ctx.fillText(line, w / 2, y);
    // Tear-off strips.
    ctx.strokeStyle = '#8a8f95';
    for (let i = 0; i < 6; i++) {
      ctx.strokeRect(6 + i * 20, h - 34, 18, 28);
      ctx.save();
      ctx.translate(15 + i * 20, h - 20);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#5a6068';
      ctx.font = '6px Arial';
      ctx.fillText('2214', -10, 2);
      ctx.restore();
    }
  });
  signMesh(g, 0.16, 0.2, tex, { backing: false });
  return g;
}

export function pictogramSign(kind = 'wc') {
  const g = grp('pictogramSign');
  const tex = generateImageTexture(`picto:${kind}`, 96, 96, (ctx, w, h) => {
    ctx.fillStyle = '#1b2a33';
    roundRectPath(ctx, 0, 0, w, h, 8);
    ctx.fill();
    ctx.fillStyle = '#dfeaf2';
    ctx.strokeStyle = '#dfeaf2';
    if (kind === 'wc') {
      // Two figures + divider.
      for (const sx of [-1, 1]) {
        const cx = w / 2 + sx * 22;
        ctx.beginPath(); ctx.arc(cx, 24, 7, 0, Math.PI * 2); ctx.fill();
        if (sx < 0) {
          ctx.fillRect(cx - 5, 33, 10, 22);
          ctx.fillRect(cx - 5, 55, 3.4, 16);
          ctx.fillRect(cx + 1.6, 55, 3.4, 16);
        } else {
          ctx.beginPath();
          ctx.moveTo(cx, 33); ctx.lineTo(cx + 11, 58); ctx.lineTo(cx - 11, 58);
          ctx.closePath(); ctx.fill();
          ctx.fillRect(cx - 4.6, 58, 3.2, 13);
          ctx.fillRect(cx + 1.4, 58, 3.2, 13);
        }
      }
      ctx.fillRect(w / 2 - 1, 14, 2, 62);
    } else if (kind === 'accessible') {
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(w / 2 + 4, 52, 18, -0.6, Math.PI * 1.15); ctx.stroke();
      ctx.beginPath(); ctx.arc(w / 2 - 4, 22, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w / 2 - 4, 30); ctx.lineTo(w / 2 - 2, 48); ctx.lineTo(w / 2 + 14, 48); ctx.stroke();
    } else { // exit runner
      ctx.fillStyle = '#36d17a';
      roundRectPath(ctx, 0, 0, w, h, 8);
      ctx.fill();
      ctx.fillStyle = '#0a2016';
      ctx.beginPath(); ctx.arc(40, 24, 7, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#0a2016';
      ctx.beginPath();
      ctx.moveTo(38, 32); ctx.lineTo(48, 46); ctx.lineTo(60, 42);
      ctx.moveTo(48, 46); ctx.lineTo(40, 62); ctx.lineTo(30, 74);
      ctx.moveTo(44, 40); ctx.lineTo(28, 48);
      ctx.stroke();
      ctx.fillRect(66, 40, 18, 6);
      ctx.beginPath(); ctx.moveTo(84, 30); ctx.lineTo(84, 56); ctx.lineTo(94, 43); ctx.closePath(); ctx.fill();
    }
  });
  signMesh(g, 0.15, 0.15, tex, { backing: false });
  return g;
}

export function shippingLabelSign() {
  const g = grp('shippingLabelSign');
  const tex = generateImageTexture('shiplabelbig', 192, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f2efe6';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#22262b';
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    drawLabel(ctx, 'GOODS IN — DOCK 2', 10, 10, { font: 'bold 14px Arial', color: '#22262b' });
    drawLabel(ctx, 'CONSIGNEE: NORTHSTAR ADMIN CTR', 10, 34, { font: '9px Arial', color: '#3a3f45' });
    drawLabel(ctx, 'CARRIER: KARSTAD FREIGHT', 10, 48, { font: '9px Arial', color: '#3a3f45' });
    drawLabel(ctx, 'PIECES: 12   WT: 340 KG', 10, 62, { font: '9px Arial', color: '#3a3f45' });
    const rnd = mulberry32(hashString('shipbar'));
    for (let i = 0; i < 40; i++) ctx.fillRect(12 + i * 4, 82, rnd() < 0.5 ? 1.6 : 3, 30);
  });
  signMesh(g, 0.3, 0.2, tex, { backing: false });
  return g;
}

export function equipmentLabel(text = 'PANEL LP-2', sub = '480V — AUTHORISED PERSONNEL') {
  const g = grp('equipmentLabel');
  const tex = generateImageTexture(`equiplabel:${text}`, 192, 64, (ctx, w, h) => {
    ctx.fillStyle = '#e8c020';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1c1c1c';
    // Hazard chevrons.
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 22 - 8, 0); ctx.lineTo(i * 22, 0); ctx.lineTo(i * 22 - 14, h); ctx.lineTo(i * 22 - 22, h);
      ctx.closePath();
      if (i % 2 === 0) ctx.fill();
    }
    ctx.fillStyle = '#f2efe6';
    ctx.fillRect(14, 10, w - 28, h - 20);
    drawLabel(ctx, `⚡ ${text}`, w / 2, 15, { font: 'bold 15px Arial', color: '#1c1c1c', align: 'center' });
    drawLabel(ctx, sub, w / 2, 36, { font: '9px Arial', color: '#3a3f45', align: 'center' });
  });
  signMesh(g, 0.24, 0.08, tex, { backing: false });
  return g;
}

export function emergencyPlacard() {
  const g = grp('emergencyPlacard');
  const tex = generateImageTexture('emergplacard', 160, 224, (ctx, w, h) => {
    ctx.fillStyle = '#f0efe8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c63b2f';
    ctx.fillRect(0, 0, w, 36);
    drawLabel(ctx, 'IN AN EMERGENCY', w / 2, 10, { font: 'bold 13px Arial', color: '#fff', align: 'center' });
    const steps = ['1. Raise the alarm — pull station', '2. Dial 0-2999 (site security)', '3. Close doors behind you', '4. Use stairs, never the lift', '5. Assemble: NORTH LOT, POINT C'];
    ctx.fillStyle = '#22262b';
    ctx.font = '9px Arial';
    steps.forEach((s2, i) => ctx.fillText(s2, 12, 60 + i * 22));
    ctx.strokeStyle = '#c63b2f';
    ctx.strokeRect(8, h - 46, w - 16, 32);
    drawLabel(ctx, 'FIRE WARDEN: T. HALVORSEN', w / 2, h - 40, { font: 'bold 9px Arial', color: '#c63b2f', align: 'center' });
    drawLabel(ctx, 'DEPUTY: I. BRANDT', w / 2, h - 26, { font: '9px Arial', color: '#c63b2f', align: 'center' });
  });
  signMesh(g, 0.26, 0.36, tex, { backing: false });
  return g;
}

// =========================================================================
// Factory index — the populator and the QA gallery build from this map.
// =========================================================================

export const PROP_FACTORIES = {
  'PROP-DESK-STD': () => deskStandard(),
  'PROP-DESK-EXEC': () => deskExecutive(),
  'PROP-DESK-RECEPTION': () => receptionDesk(),
  'PROP-CUBE-PANEL-LOW': () => cubiclePanel(1.6, 1.2),
  'PROP-CUBE-PANEL-HIGH': () => cubiclePanel(1.6, 1.6),
  'PROP-CUBE-PANEL-SIDE': () => cubiclePanel(0.8, 1.2),
  'PROP-CUBE-POST': () => cubiclePost(1.2),
  'PROP-TABLE-CONF': () => conferenceTable(),
  'PROP-CHAIR-TASK': () => taskChair(),
  'PROP-CHAIR-CONF': () => conferenceChair(),
  'PROP-CHAIR-SLED': () => waitingChair(),
  'PROP-CHAIR-STACK': () => stackingChair(),
  'PROP-SOFA-3': () => sofaThreeSeat(),
  'PROP-TABLE-SIDE': () => sideTable(),
  'PROP-TABLE-BREAK': () => breakTable(),
  'PROP-CAB-FILE-2': () => filingCabinet(2),
  'PROP-CAB-FILE-4': () => filingCabinet(4),
  'PROP-PEDESTAL': () => pedestalDrawers(),
  'PROP-SHELF-OPEN': () => shelvingUnit(),
  'PROP-RACK-ARCHIVE': () => archiveRack(1),
  'PROP-BOOKCASE': () => bookcase(1),
  'PROP-COATRACK': () => coatRack(),
  'ELEC-TOWER': () => computerTower(),
  'ELEC-MONITOR-24': () => monitor24('os'),
  'ELEC-MONITOR-24-OFF': () => monitor24('off'),
  'ELEC-MONITOR-DUAL': () => dualMonitorArm(),
  'ELEC-KEYBOARD': () => keyboard(),
  'ELEC-MOUSE': () => mouse(),
  'ELEC-MOUSEPAD': () => mousePad(),
  'ELEC-LAPTOP-OPEN': () => laptop(true),
  'ELEC-LAPTOP-CLOSED': () => laptop(false),
  'ELEC-PHONE': () => deskPhone(),
  'ELEC-HEADSET': () => headset(),
  'ELEC-DOCK': () => dockingStation(),
  'ELEC-PRINTER-DESK': () => printerDesktop(),
  'ELEC-COPIER': () => copierFloor(),
  'ELEC-PAPERTRAY': () => paperTray(),
  'ELEC-PROJECTOR': () => projector(),
  'ELEC-DISPLAY-WALL': () => wallDisplay('os'),
  'ELEC-WHITEBOARD': () => whiteboard('main'),
  'ELEC-CLOCK': () => wallClock(),
  'ELEC-SECMONITORS': () => securityMonitorBank(),
  'ELEC-RACK-42U': () => serverRack(1),
  'ELEC-SWITCH': () => networkSwitch(),
  'ELEC-UPS': () => ups(),
  'ELEC-CABLE-BUNDLE': () => cableBundle(1.2),
  'ELEC-CABLE-LOOSE': () => looseCable(1),
  'BREAK-CAB-BASE': () => baseCabinet(0.6),
  'BREAK-CAB-WALL': () => wallCabinet(0.6),
  'BREAK-COUNTER-SINK': () => counterSink(1.8),
  'BREAK-FRIDGE': () => refrigerator(),
  'BREAK-MICROWAVE': () => microwave(),
  'BREAK-COFFEE': () => coffeeMachine(),
  'BREAK-KETTLE': () => kettle(),
  'BREAK-VENDING': () => vendingMachine(),
  'BREAK-WATERCOOLER': () => waterCooler(),
  'BREAK-MUG': () => mug(0),
  'BREAK-CUP-PAPER': () => paperCup(),
  'BREAK-PLATE': () => plate(),
  'BREAK-FOODBOX': () => foodContainer(),
  'BREAK-SNACK': () => snackPacket(0),
  'BREAK-BIN-TRASH': () => trashBin(false),
  'BREAK-BIN-RECYCLE': () => trashBin(true),
  'BREAK-TOWEL-DISP': () => paperTowelDispenser(),
  'BREAK-SOAP-DISP': () => soapDispenser(),
  'BREAK-NOTICEBOARD': () => noticeBoard('break'),
  'REST-SINK': () => restroomSink(),
  'REST-MIRROR': () => mirror(),
  'REST-TOILET': () => toilet(),
  'REST-URINAL': () => urinal(),
  'REST-STALL-PANEL': () => stallPanel(),
  'REST-STALL-DOOR': () => stallDoor(),
  'REST-HANDDRYER': () => handDryer(),
  'REST-BIN': () => smallBin(),
  'MAINT-ELECPANEL': () => electricalPanel(),
  'MAINT-BREAKERBOX': () => breakerBox(true),
  'MAINT-TRANSFORMER': () => utilityCabinet(),
  'MAINT-PIPES': () => pipeAssembly(),
  'MAINT-AHU': () => airHandler(),
  'MAINT-DUCT': () => ductBranch(2.4),
  'MAINT-EXTINGUISHER': () => fireExtinguisher(true),
  'MAINT-FIRECABINET': () => fireCabinet(),
  'MAINT-SPRINKLER': () => sprinklerHead(),
  'MAINT-SMOKEDET': () => smokeDetector(),
  'MAINT-JANITORCART': () => janitorCart(),
  'MAINT-MOPBUCKET': () => mopBucket(),
  'MAINT-BROOM': () => broom(),
  'MAINT-CLEANBOTTLE': () => cleaningBottle(0),
  'MAINT-WIRESHELF': () => wireShelving(),
  'MAINT-BOX-S': () => cardboardBox('s', false, 0),
  'MAINT-BOX-M': () => cardboardBox('m', false, 1),
  'MAINT-BOX-L': () => cardboardBox('l', false, 2),
  'MAINT-BOX-OPEN': () => cardboardBox('m', true, 2),
  'MAINT-CRATE': () => shippingCrate(),
  'MAINT-PALLET': () => palletWood(),
  'MAINT-HANDTRUCK': () => handTruck(),
  'MAINT-LADDER': () => stepLadder(),
  'MAINT-TOOLCASE': () => toolCase(),
  'MAINT-CONE': () => warningCone(),
  'MAINT-WETFLOOR': () => wetFloorSign(),
  'MAINT-FLOORMAT': () => floorMat(1.8, 1.1),
  'MAINT-BOLLARD': () => bollard(),
  'MAINT-GARAGECTRL': () => garageControlBox(),
  'MAINT-SUPPLYCRATE': () => supplyCrate(),
  'CLUT-PAPER': () => paperSheet(),
  'CLUT-PAPERSTACK': () => paperStack(0.06),
  'CLUT-FOLDER': () => folder(0),
  'CLUT-BINDER': () => ringBinder(0),
  'CLUT-NOTEBOOK': () => notebook(),
  'CLUT-PEN': () => pen(),
  'CLUT-PENCIL': () => pencil(),
  'CLUT-STAPLER': () => stapler(),
  'CLUT-TAPE': () => tapeDispenser(),
  'CLUT-SCISSORS': () => scissors(),
  'CLUT-STICKY': () => stickyNotes(),
  'CLUT-CLIPSDISH': () => clipsDish(),
  'CLUT-BADGE': () => idBadge(),
  'CLUT-KEYCARD': () => keycardProp(),
  'CLUT-CALENDAR': () => deskCalendar(),
  'CLUT-PHOTOFRAME': () => photoFrame(),
  'CLUT-BROCHURE': () => brochure(),
  'CLUT-BOTTLE': () => waterBottle(),
  'CLUT-CAN': () => drinksCan(0),
  'CLUT-WRAPPER': () => foodWrapper(),
  'CLUT-ORGANISER': () => deskOrganiser(),
  'CLUT-PLANT-SNAKE': () => plantSnake(1),
  'CLUT-PLANT-FICUS': () => plantFicus(1),
  'CLUT-PLANT-POT': () => plantPot(),
  'CLUT-BACKPACK': () => backpack(),
  'CLUT-BRIEFCASE': () => briefcase(),
  'CLUT-UMBRELLA': () => umbrella(),
  'SIGN-LOGO': () => logoPanel(2.4),
  'SIGN-DEPT': () => deptSign('OPEN OFFICE', 'B-100'),
  'SIGN-ROOMPLATE': () => roomPlate('B-101'),
  'SIGN-WAYFIND': () => wayfindSign(),
  'SIGN-SAFETY': () => safetyPoster(0),
  'SIGN-EVAC-DIAGRAM': () => evacDiagram(),
  'SIGN-NOTICE-EMP': () => employeeNotice(0),
  'SIGN-NOTICE-SEC': () => securityNotice(),
  'SIGN-FLYER': () => flyer(0),
  'SIGN-PICTO-WC': () => pictogramSign('wc'),
  'SIGN-PICTO-EXIT': () => pictogramSign('exit'),
  'SIGN-SHIPLABEL': () => shippingLabelSign(),
  'SIGN-EQUIP-LABEL': () => equipmentLabel(),
  'SIGN-EMERG-PLACARD': () => emergencyPlacard(),
};
