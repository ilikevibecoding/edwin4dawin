// Signage & environmental-text prop library — owner: fable3-b.
// Every piece of readable text in the world routes through ONE shared canvas
// atlas ("paper atlas"), so all plates/posters/notices/diagrams across a
// decorate section merge into a single draw call. Emissive signs (backlit
// logo) get their own small canvas materials.
//
// All fiction is original: company "Northstar Dynamics", divisions
// Operations / Records / Systems / Facilities / People & Culture, vending
// brand "Frostbyte", water brand "GlacierPure". No real-world marks.

import * as THREE from 'three';
import { registerProp } from './index.js';
import { getMaterial } from '../materials.js';
import * as MAP from '../map.js';

// ---------------------------------------------------------------------------
// palette (visual bible §2/§3)
const INK = '#e8f1f8';
const INK_DIM = '#9db4c6';
const ICE = '#7fd2ff';
const AMBER = '#ffb454';
const DANGER = '#ff5a4e';
const OK_GREEN = '#7dd87d';
const DEEP = '#0e1c2c';
const PAPER = '#e8e6dd';
const PAPER_WARM = '#e8d9bd';

const FONT = (w, px) => `${w} ${px}px Arial, Helvetica, sans-serif`;

// ---------------------------------------------------------------------------
// Shared paper atlas: shelf packer over a 2048 canvas. Deterministic because
// regions are allocated in placement order (decorators run in a fixed order).
const ATLAS_W = 2048;
const ATLAS_H = 3584; // grown for the audit-1 additions (art prints, clock, menu…)
const atlas = {
  canvas: null, ctx: null, tex: null, mat: null,
  shelves: new Map(), // height-class -> {y, x, h}
  cursorY: 0,
  cache: new Map(),
};

function atlasCtx() {
  if (!atlas.canvas) {
    atlas.canvas = document.createElement('canvas');
    atlas.canvas.width = ATLAS_W;
    atlas.canvas.height = ATLAS_H;
    atlas.ctx = atlas.canvas.getContext('2d');
    atlas.ctx.fillStyle = '#777';
    atlas.ctx.fillRect(0, 0, ATLAS_W, ATLAS_H);
  }
  return atlas.ctx;
}

// Allocate a region and draw into it once (cached by key). Shelf packing is
// bucketed by height class so mixed sign sizes don't waste rows; allocation
// order is deterministic (decorators run in a fixed order).
// draw(ctx, x, y, w, h) paints in absolute atlas coordinates.
export function atlasRegion(key, w, h, draw) {
  if (atlas.cache.has(key)) return atlas.cache.get(key);
  const ctx = atlasCtx();
  const pad = 4;
  const cls = Math.ceil((h + pad) / 56) * 56;
  let shelf = atlas.shelves.get(cls);
  if (!shelf || shelf.x + w + pad > ATLAS_W) {
    if (atlas.cursorY + cls > ATLAS_H) {
      console.warn('[signage] paper atlas full — recycling first shelf');
      shelf = { y: 0, x: 0, h: cls };
    } else {
      shelf = { y: atlas.cursorY, x: 0, h: cls };
      atlas.cursorY += cls;
    }
    atlas.shelves.set(cls, shelf);
  }
  const x = shelf.x, y = shelf.y;
  shelf.x += w + pad;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  draw(ctx, x, y, w, h);
  ctx.restore();
  if (atlas.tex) atlas.tex.needsUpdate = true;
  const rect = { x, y, w, h };
  atlas.cache.set(key, rect);
  return rect;
}

export function paperAtlasMaterial() {
  if (atlas.mat) return atlas.mat;
  atlasCtx();
  atlas.tex = new THREE.CanvasTexture(atlas.canvas);
  atlas.tex.colorSpace = THREE.SRGBColorSpace;
  atlas.tex.anisotropy = 4;
  atlas.mat = new THREE.MeshStandardMaterial({
    map: atlas.tex, roughness: 0.72, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  atlas.mat.name = 'sign_paper_atlas';
  return atlas.mat;
}

// Plane (w × h meters) UV-mapped onto an atlas rect. CanvasTexture flipY=true:
// v = 1 - y/S at the top of the region.
export function atlasPlane(wM, hM, rect) {
  const g = new THREE.PlaneGeometry(wM, hM);
  const u0 = rect.x / ATLAS_W, u1 = (rect.x + rect.w) / ATLAS_W;
  const vT = 1 - rect.y / ATLAS_H, vB = 1 - (rect.y + rect.h) / ATLAS_H;
  const uv = g.attributes.uv;
  uv.setXY(0, u0, vT); uv.setXY(1, u1, vT); uv.setXY(2, u0, vB); uv.setXY(3, u1, vB);
  return g;
}

// ---------------------------------------------------------------------------
// canvas drawing helpers

function chamferPanel(ctx, x, y, w, h, fill, ch = 10) {
  ctx.beginPath();
  ctx.moveTo(x + ch, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - ch);
  ctx.lineTo(x + w - ch, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + ch);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
}

function tracked(ctx, text, cx, cy, font, color, spacing = 3, align = 'center') {
  ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = 'middle';
  const widths = [...text].map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let px = align === 'center' ? cx - total / 2 : cx;
  ctx.textAlign = 'left';
  for (let i = 0; i < text.length; i++) { ctx.fillText(text[i], px, cy); px += widths[i] + spacing; }
}

// The star-north emblem — geometry copied from src/ui/menus.js starNorthSvg()
// (bible §5: never redraw freehand). Base viewBox 64, ring center (32,34).
export function drawStarNorth(ctx, cx, cy, size, color, coreColor = INK) {
  const s = size / 64;
  ctx.save();
  ctx.translate(cx - 32 * s, cy - 34 * s);
  ctx.scale(s, s);
  ctx.strokeStyle = color; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(32, 34, 21, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(32, 9); ctx.lineTo(32, 13); ctx.moveTo(32, 55); ctx.lineTo(32, 59);
  ctx.moveTo(7, 34); ctx.lineTo(11, 34); ctx.moveTo(53, 34); ctx.lineTo(57, 34);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(32, 3); ctx.lineTo(36, 30); ctx.lineTo(48, 34); ctx.lineTo(36, 38);
  ctx.lineTo(32, 51); ctx.lineTo(28, 38); ctx.lineTo(16, 34); ctx.lineTo(28, 30);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.moveTo(32, 3); ctx.lineTo(36, 30); ctx.lineTo(32, 34); ctx.lineTo(28, 30);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function hazardStripes(ctx, x, y, w, h, a = '#d8b93a', b = '#22262a') {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = b; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = a;
  for (let i = -h; i < w + h; i += 28) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.lineTo(x + i + h + 14, y);
    ctx.lineTo(x + i + 14, y + h);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// shared non-atlas materials (each is exactly one extra draw call per section)

const matCache = new Map();
function customMat(key, make) {
  if (!matCache.has(key)) { const m = make(); m.name = key; matCache.set(key, m); }
  return matCache.get(key);
}

export function emissiveCanvasMat(key, w, h, draw, intensity = 1.0) {
  return customMat(key, () => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: intensity,
      roughness: 0.4, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
  });
}

// ---------------------------------------------------------------------------
// prop scaffolding

function P(assetId) {
  const g = new THREE.Group();
  g.userData.assetId = assetId;
  g.userData.colliders = [];
  return g;
}
function box(g, mat, w, h, d, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof mat === 'string' ? getMaterial(mat) : mat);
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  g.add(m);
  return m;
}
function paperPlane(g, wM, hM, rect, x, y, z, ry = 0) {
  const m = new THREE.Mesh(atlasPlane(wM, hM, rect), paperAtlasMaterial());
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  g.add(m);
  return m;
}

// ===========================================================================
// SGN-001 backlit company logo (lobby landmark)
registerProp('sign_logo_backlit', (opts) => {
  const g = P('SGN-001');
  let mat, w, h;
  if (opts.layout === 'band') {
    // single-line lockup sized for the lobby bulkhead frieze (band h 0.6 m)
    w = opts.w || 4.9; h = w * 0.105;
    mat = emissiveCanvasMat('sign_logo_ns_band', 1600, 168, (ctx, W, H) => {
      ctx.fillStyle = '#0a1420'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(127,210,255,0.10)'; ctx.lineWidth = 2;
      for (let x = 200; x < W; x += 200) { ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, H - 8); ctx.stroke(); }
      drawStarNorth(ctx, 106, 84, 132, ICE, INK);
      tracked(ctx, 'NORTHSTAR', 200, 72, FONT(800, 76), INK, 16, 'left');
      tracked(ctx, 'DYNAMICS', 790, 72, FONT(300, 74), INK_DIM, 24, 'left');
      // half-lit under siege: two letter cells dimmed (bible: "half-lit")
      ctx.fillStyle = 'rgba(10,20,32,0.82)';
      ctx.fillRect(352, 30, 74, 86);
      ctx.fillRect(986, 30, 70, 86);
      tracked(ctx, 'ADMINISTRATIVE CENTER', 200, 138, FONT(600, 26), '#3e7ea6', 8, 'left');
    }, 0.85);
  } else {
    w = opts.w || 5.6; h = w * 0.19;
    mat = emissiveCanvasMat('sign_logo_ns', 1024, 200, (ctx, W, H) => {
      ctx.fillStyle = '#0a1420'; ctx.fillRect(0, 0, W, H);
      // faint panel seams so the "off" parts still read as a lightbox
      ctx.strokeStyle = 'rgba(127,210,255,0.10)'; ctx.lineWidth = 2;
      for (let x = 128; x < W; x += 128) { ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, H - 8); ctx.stroke(); }
      drawStarNorth(ctx, 120, 100, 150, ICE, INK);
      tracked(ctx, 'NORTHSTAR', 230, 78, FONT(800, 62), INK, 14, 'left');
      tracked(ctx, 'DYNAMICS', 230, 140, FONT(300, 58), INK_DIM, 22, 'left');
      // half-lit under siege: two letter cells dimmed (bible: "half-lit")
      ctx.fillStyle = 'rgba(10,20,32,0.82)';
      ctx.fillRect(360, 42, 62, 70);
      ctx.fillRect(560, 108, 58, 64);
      tracked(ctx, 'ADMINISTRATIVE CENTER', 232, 183, FONT(600, 17), '#3e7ea6', 6, 'left');
    }, 0.85);
  }
  box(g, 'metal_dark', w + 0.1, h + 0.08, 0.07, 0, 0, -0.045);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  face.position.set(0, 0, 0.001);
  g.add(face);
  return g;
});

// SGN-002 lobby directory board
registerProp('sign_directory', () => {
  const g = P('SGN-002');
  const rect = atlasRegion('directory', 300, 420, (ctx, x, y, w, h) => {
    ctx.fillStyle = DEEP; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(127,210,255,0.25)'; ctx.lineWidth = 2;
    ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
    drawStarNorth(ctx, x + 36, y + 40, 40, ICE);
    tracked(ctx, 'DIRECTORY', x + 62, y + 36, FONT(700, 22), INK, 5, 'left');
    ctx.fillStyle = 'rgba(127,210,255,0.35)'; ctx.fillRect(x + 20, y + 66, w - 40, 2);
    const rows = [
      ['L1', 'RECEPTION · VISITOR SERVICES', ''],
      ['110', 'FACILITIES OFFICE', ''],
      ['112', 'TRAINING CENTER', ''],
      ['120', 'CONFERENCE CENTER', ''],
      ['130', 'EXECUTIVE SUITE', ''],
      ['140', 'OPERATIONS FLOOR', ''],
      ['148', 'COPY & MAIL', ''],
      ['152', 'RECORDS ARCHIVE', ''],
      ['156', 'SYSTEMS & IT', ''],
      ['158', 'SERVER HALL', 'restricted'],
      ['B1', 'FACILITIES · UTILITIES', ''],
      ['B1', 'LOADING DOCK · MOTOR POOL', ''],
    ];
    let ry = y + 92;
    for (const [num, name, tag] of rows) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = FONT(700, 15); ctx.fillStyle = ICE;
      ctx.fillText(num, x + 22, ry);
      tracked(ctx, name, x + 62, ry, FONT(500, 13), INK, 1.4, 'left');
      if (tag) tracked(ctx, tag.toUpperCase(), x + 218, ry, FONT(600, 10), AMBER, 1, 'left');
      ctx.fillStyle = 'rgba(157,180,198,0.12)'; ctx.fillRect(x + 20, ry + 13, w - 40, 1);
      ry += 27;
    }
  });
  box(g, 'metal_dark', 0.82, 1.14, 0.04, 0, 0, -0.024);
  paperPlane(g, 0.74, 1.04, rect, 0, 0, 0.001);
  return g;
});

// SGN-003 ceiling-hung directional sign (double-sided)
registerProp('sign_wayfind', (opts) => {
  const g = P('SGN-003');
  const text = opts.text || '\u2190 RECORDS      OPERATIONS \u2192';
  const w = opts.w || 1.7, h = 0.32;
  // region width tracks the physical sign width so long two-sided labels
  // don't collide in the middle; font auto-shrinks as a fallback
  const regW = Math.min(760, Math.round(300 * w));
  const rect = atlasRegion(`wayfind:${text}`, regW, 92, (ctx, x, y, wp, hp) => {
    ctx.fillStyle = '#1a232c'; ctx.fillRect(x, y, wp, hp);
    ctx.fillStyle = 'rgba(127,210,255,0.5)'; ctx.fillRect(x, y + hp - 5, wp, 3);
    const measure = (s, fs) => {
      ctx.font = FONT(600, fs);
      return [...s].reduce((a, c) => a + ctx.measureText(c).width + 3, 0);
    };
    const parts = text.split(/\s{3,}/);
    if (parts.length === 2) {
      let fs = 26;
      while (fs > 15 && measure(parts[0], fs) + measure(parts[1], fs) + 60 > wp - 36) fs -= 1;
      tracked(ctx, parts[0], x + 18, y + hp / 2, FONT(600, fs), INK, 3, 'left');
      const tw = measure(parts[1], fs);
      tracked(ctx, parts[1], x + wp - 18 - tw, y + hp / 2, FONT(600, fs), INK, 3, 'left');
    } else {
      let fs = 26;
      while (fs > 15 && measure(text, fs) > wp - 36) fs -= 1;
      tracked(ctx, text, x + wp / 2, y + hp / 2, FONT(600, fs), INK, 3);
    }
  });
  const drop = opts.drop ?? 0.35;
  box(g, 'metal_dark', 0.02, drop, 0.02, -w / 2 + 0.12, -drop / 2, 0);
  box(g, 'metal_dark', 0.02, drop, 0.02, w / 2 - 0.12, -drop / 2, 0);
  const yC = -drop - h / 2;
  box(g, 'metal_dark', w, h + 0.02, 0.035, 0, yC, 0);
  paperPlane(g, w - 0.04, h - 0.04, rect, 0, yC, 0.019);
  paperPlane(g, w - 0.04, h - 0.04, rect, 0, yC, -0.019, Math.PI);
  return g;
});

// SGN-004 door plate (room number + name)
registerProp('sign_doorplate', (opts) => {
  const g = P('SGN-004');
  const num = opts.num || '000', text = (opts.text || 'ROOM').toUpperCase();
  const rect = atlasRegion(`plate:${num}:${text}`, 168, 84, (ctx, x, y, w, h) => {
    ctx.fillStyle = '#39424a'; ctx.fillRect(x, y, w, h);
    chamferPanel(ctx, x + 4, y + 4, w - 8, h - 8, '#242c33', 8);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = FONT(800, 30); ctx.fillStyle = INK;
    ctx.fillText(num, x + 14, y + 28);
    tracked(ctx, text, x + 14, y + 60, FONT(600, 13), INK_DIM, 1.5, 'left');
    ctx.fillStyle = 'rgba(127,210,255,0.4)'; ctx.fillRect(x + 14, y + 42, w - 28, 1.5);
  });
  paperPlane(g, 0.26, 0.13, rect, 0, 0, 0.006);
  box(g, 'metal_dark', 0.27, 0.14, 0.008, 0, 0, 0.0015);
  return g;
});

// SGN-005 department plate (larger, for main rooms)
registerProp('sign_dept_plate', (opts) => {
  const g = P('SGN-005');
  const text = (opts.text || 'DEPARTMENT').toUpperCase();
  const sub = (opts.sub || 'NORTHSTAR DYNAMICS').toUpperCase();
  const rect = atlasRegion(`dept:${text}`, 280, 96, (ctx, x, y, w, h) => {
    ctx.fillStyle = DEEP; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(127,210,255,0.55)'; ctx.fillRect(x, y, 5, h);
    tracked(ctx, text, x + 22, y + 38, FONT(700, 24), INK, 3, 'left');
    tracked(ctx, sub, x + 22, y + 72, FONT(500, 12), '#3e7ea6', 3, 'left');
  });
  paperPlane(g, 0.5, 0.17, rect, 0, 0, 0.006);
  box(g, 'metal_dark', 0.51, 0.18, 0.008, 0, 0, 0.0015);
  return g;
});

// ---------------------------------------------------------------------------
// SGN-006 safety poster set (original designs)
const POSTERS = {
  lift: (ctx, x, y, w, h) => {
    ctx.fillStyle = '#dfe4e0'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#2c5a7a'; ctx.fillRect(x, y, w, 74);
    tracked(ctx, 'LIFT WITH YOUR LEGS', x + w / 2, y + 30, FONT(800, 22), INK, 2);
    tracked(ctx, 'NOT WITH YOUR BACK', x + w / 2, y + 56, FONT(600, 15), '#bcd7e8', 2);
    // stick figures: wrong (bent back, red X) vs right (squat, green check)
    const fig = (fx, fy, squat, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(fx, fy, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      if (squat) {
        ctx.moveTo(fx, fy + 12); ctx.lineTo(fx, fy + 52);
        ctx.moveTo(fx, fy + 52); ctx.lineTo(fx - 16, fy + 74); ctx.lineTo(fx - 14, fy + 98);
        ctx.moveTo(fx, fy + 52); ctx.lineTo(fx + 16, fy + 74); ctx.lineTo(fx + 18, fy + 98);
        ctx.moveTo(fx, fy + 24); ctx.lineTo(fx + 22, fy + 44);
      } else {
        ctx.moveTo(fx, fy + 12); ctx.quadraticCurveTo(fx + 30, fy + 30, fx + 34, fy + 62);
        ctx.moveTo(fx + 34, fy + 62); ctx.lineTo(fx + 26, fy + 98);
        ctx.moveTo(fx + 34, fy + 62); ctx.lineTo(fx + 44, fy + 98);
        ctx.moveTo(fx + 14, fy + 22); ctx.lineTo(fx + 44, fy + 50);
      }
      ctx.stroke();
      ctx.fillStyle = '#8a6a48';
      ctx.fillRect(squat ? fx + 12 : fx + 36, fy + (squat ? 40 : 44), 26, 20);
    };
    fig(x + 62, y + 108, false, '#6a4a48'); fig(x + 190, y + 108, true, '#3f6a50');
    ctx.lineWidth = 7; ctx.strokeStyle = DANGER;
    ctx.beginPath(); ctx.moveTo(x + 34, y + 226); ctx.lineTo(x + 66, y + 258); ctx.moveTo(x + 66, y + 226); ctx.lineTo(x + 34, y + 258); ctx.stroke();
    ctx.strokeStyle = '#3f8a52';
    ctx.beginPath(); ctx.moveTo(x + 176, y + 246); ctx.lineTo(x + 190, y + 260); ctx.lineTo(x + 216, y + 226); ctx.stroke();
    tracked(ctx, 'FACILITIES SAFETY BULLETIN 04', x + w / 2, y + h - 18, FONT(600, 11), '#5c6a72', 2);
  },
  ice: (ctx, x, y, w, h) => {
    hazardStripes(ctx, x, y, w, 40);
    hazardStripes(ctx, x, y + h - 40, w, 40);
    ctx.fillStyle = '#e6e3d4'; ctx.fillRect(x, y + 40, w, h - 80);
    tracked(ctx, 'SLIPS · TRIPS · FALLS', x + w / 2, y + 76, FONT(800, 24), '#22262a', 2);
    // slipping figure
    ctx.strokeStyle = '#22262a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    const fx = x + w / 2 - 10, fy = y + 118;
    ctx.beginPath(); ctx.arc(fx + 22, fy, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx + 16, fy + 12); ctx.lineTo(fx - 2, fy + 44);
    ctx.moveTo(fx - 2, fy + 44); ctx.lineTo(fx + 34, fy + 58);
    ctx.moveTo(fx - 2, fy + 44); ctx.lineTo(fx - 34, fy + 52);
    ctx.moveTo(fx + 10, fy + 22); ctx.lineTo(fx + 44, fy + 6);
    ctx.moveTo(fx + 10, fy + 22); ctx.lineTo(fx - 20, fy + 2);
    ctx.stroke();
    ctx.strokeStyle = '#7899ab'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(fx - 40 + i * 34, fy + 74); ctx.lineTo(fx - 18 + i * 34, fy + 74); ctx.stroke(); }
    tracked(ctx, 'ICE MELT STATIONS', x + w / 2, y + 226, FONT(700, 17), '#8c4a1e', 1.5);
    tracked(ctx, 'AT EVERY ENTRANCE — USE THEM', x + w / 2, y + 250, FONT(500, 13), '#44484a', 1);
  },
  exits: (ctx, x, y, w, h) => {
    ctx.fillStyle = '#12351f'; ctx.fillRect(x, y, w, h);
    tracked(ctx, 'KNOW YOUR EXITS', x + w / 2, y + 34, FONT(800, 24), '#bfe8c4', 2);
    // running figure toward door
    ctx.fillStyle = OK_GREEN;
    ctx.fillRect(x + 168, y + 78, 62, 128); // doorway
    ctx.fillStyle = '#12351f'; ctx.fillRect(x + 178, y + 88, 42, 118);
    ctx.strokeStyle = OK_GREEN; ctx.lineWidth = 8; ctx.lineCap = 'round';
    const fx = x + 84, fy = y + 108;
    ctx.beginPath(); ctx.arc(fx, fy, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx + 4, fy + 14); ctx.lineTo(fx + 20, fy + 48);
    ctx.moveTo(fx + 20, fy + 48); ctx.lineTo(fx - 6, fy + 74); ctx.lineTo(fx - 2, fy + 102);
    ctx.moveTo(fx + 20, fy + 48); ctx.lineTo(fx + 48, fy + 64); ctx.lineTo(fx + 44, fy + 96);
    ctx.moveTo(fx + 8, fy + 24); ctx.lineTo(fx + 44, fy + 30);
    ctx.moveTo(fx + 8, fy + 24); ctx.lineTo(fx - 24, fy + 40);
    ctx.stroke();
    ctx.fillStyle = OK_GREEN;
    ctx.beginPath(); ctx.moveTo(x + 132, y + 236); ctx.lineTo(x + 172, y + 236); ctx.lineTo(x + 172, y + 224); ctx.lineTo(x + 196, y + 244); ctx.lineTo(x + 172, y + 264); ctx.lineTo(x + 172, y + 252); ctx.lineTo(x + 132, y + 252); ctx.closePath(); ctx.fill();
    tracked(ctx, 'TWO ROUTES. EVERY ROOM.', x + w / 2, y + h - 24, FONT(600, 13), '#7fb98a', 1.5);
  },
  kitchen: (ctx, x, y, w, h) => {
    ctx.fillStyle = '#e9e4d6'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#3f6a50'; ctx.fillRect(x, y, w, 64);
    tracked(ctx, 'KITCHEN ETIQUETTE', x + w / 2, y + 26, FONT(800, 21), INK, 2);
    tracked(ctx, 'A CLEAN BREAK ROOM IS A KIND ONE', x + w / 2, y + 50, FONT(500, 11), '#bfe0c8', 1.5);
    const rules = [
      ['01', 'LABEL YOUR LEFTOVERS'],
      ['02', 'FRIDGE PURGE — FRIDAY 15:00'],
      ['03', 'YOUR MUG, YOUR WASH'],
      ['04', 'POT EMPTY? BREW THE NEXT'],
    ];
    rules.forEach(([n, t], i) => {
      const ry = y + 96 + i * 34;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = FONT(800, 16); ctx.fillStyle = '#3f6a50'; ctx.fillText(n, x + 18, ry);
      tracked(ctx, t, x + 48, ry, FONT(600, 13), '#3a4038', 1, 'left');
      ctx.fillStyle = 'rgba(63,106,80,0.25)'; ctx.fillRect(x + 18, ry + 15, w - 36, 1.5);
    });
    // steaming mug glyph
    const mx = x + w / 2, my = y + 262;
    ctx.strokeStyle = '#3f6a50'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.strokeRect(mx - 20, my - 14, 34, 28);
    ctx.beginPath(); ctx.arc(mx + 20, my, 9, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(mx - 10 + i * 14, my - 22);
      ctx.quadraticCurveTo(mx - 4 + i * 14, my - 30, mx - 10 + i * 14, my - 38);
      ctx.stroke();
    }
    tracked(ctx, 'PEOPLE & CULTURE · BREAK ROOM 108', x + w / 2, y + h - 16, FONT(500, 10), '#7a8272', 1.2);
  },
  cleandesk: (ctx, x, y, w, h) => {
    ctx.fillStyle = '#dee5ea'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = DEEP; ctx.fillRect(x, y, w, 8);
    drawStarNorth(ctx, x + w / 2, y + 66, 74, '#3e7ea6', '#dee5ea');
    tracked(ctx, 'CLEAN DESK POLICY', x + w / 2, y + 136, FONT(800, 22), '#22303a', 2);
    const lines = ['LOCK IT.', 'LOG OFF.', 'CLEAR IT.'];
    lines.forEach((l, i) => tracked(ctx, l, x + w / 2, y + 172 + i * 30, FONT(600, 18), '#3e7ea6', 3));
    tracked(ctx, 'RECORDS DIVISION · POLICY 12-C', x + w / 2, y + h - 18, FONT(500, 11), '#7a8a94', 1.5);
  },
  glacier: (ctx, x, y, w, h) => {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#0d2436'); grad.addColorStop(1, '#1c4258');
    ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
    // mountain + droplet mark
    ctx.fillStyle = '#9fd4ee';
    ctx.beginPath(); ctx.moveTo(x + 40, y + 150); ctx.lineTo(x + 110, y + 56); ctx.lineTo(x + 150, y + 108); ctx.lineTo(x + 186, y + 72); ctx.lineTo(x + 236, y + 150); ctx.closePath(); ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.moveTo(x + 110, y + 56); ctx.lineTo(x + 128, y + 80) ; ctx.lineTo(x + 96, y + 80); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 138, y + 168);
    ctx.bezierCurveTo(x + 118, y + 200, x + 118, y + 222, x + 138, y + 232);
    ctx.bezierCurveTo(x + 158, y + 222, x + 158, y + 200, x + 138, y + 168);
    ctx.fillStyle = '#7fd2ff'; ctx.fill();
    tracked(ctx, 'GLACIERPURE', x + w / 2, y + 262, FONT(800, 24), INK, 4);
    tracked(ctx, 'REFILL. DON\u2019T LANDFILL.', x + w / 2, y + 290, FONT(500, 13), '#9fd4ee', 2);
  },
  posture: (ctx, x, y, w, h) => {
    ctx.fillStyle = '#e9e2d2'; ctx.fillRect(x, y, w, h);
    tracked(ctx, '20 · 20 · 20', x + w / 2, y + 44, FONT(800, 34), '#8c5a28', 4);
    tracked(ctx, 'EVERY 20 MINUTES', x + w / 2, y + 88, FONT(600, 14), '#44403a', 2);
    tracked(ctx, 'LOOK 20 METERS AWAY', x + w / 2, y + 110, FONT(600, 14), '#44403a', 2);
    tracked(ctx, 'FOR 20 SECONDS', x + w / 2, y + 132, FONT(600, 14), '#44403a', 2);
    // eye mark
    ctx.strokeStyle = '#8c5a28'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + 194, 52, 30, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + w / 2, y + 194, 13, 0, Math.PI * 2); ctx.fillStyle = '#8c5a28'; ctx.fill();
    tracked(ctx, 'PEOPLE & CULTURE · WELLNESS', x + w / 2, y + h - 20, FONT(500, 11), '#8a8172', 1.5);
  },
};

registerProp('sign_poster', (opts) => {
  const g = P('SGN-006');
  const design = opts.design || 'lift';
  const rect = atlasRegion(`poster:${design}`, 268, 320, POSTERS[design] || POSTERS.lift);
  box(g, 'metal_dark', 0.56, 0.72, 0.012, 0, 0, 0.003);
  paperPlane(g, 0.52, 0.68, rect, 0, 0, 0.011);
  return g;
});

// SGN-007 evacuation diagram — simplified true floor plan drawn from map.js
registerProp('sign_evac', (opts) => {
  const g = P('SGN-007');
  const level = opts.level || 'g';
  const rect = atlasRegion(`evac:${level}`, 300, 240, (ctx, x, y, w, h) => {
    ctx.fillStyle = PAPER; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#7a3f38'; ctx.fillRect(x, y, w, 34);
    tracked(ctx, 'EVACUATION PLAN', x + 10, y + 17, FONT(800, 17), INK, 2, 'left');
    tracked(ctx, level === 'g' ? 'LEVEL 1' : 'LEVEL B1', x + w - 74, y + 17, FONT(700, 13), PAPER_WARM, 1.5, 'left');
    // world-rect → canvas transform (map spans x 0..64, z 0..44 ground)
    const rooms = MAP.ROOMS.filter((r) => r.level === level && !r.outdoor);
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const r of rooms) for (const [x0, z0, x1, z1] of r.rects) {
      minX = Math.min(minX, x0); maxX = Math.max(maxX, x1);
      minZ = Math.min(minZ, z0); maxZ = Math.max(maxZ, z1);
    }
    const pad = 14, py = y + 44;
    const s = Math.min((w - pad * 2) / (maxX - minX), (h - 58 - pad) / (maxZ - minZ));
    const tx = (wx) => x + pad + (wx - minX) * s;
    const tz = (wz) => py + (wz - minZ) * s;
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#4a4740';
    for (const r of rooms) {
      for (const [x0, z0, x1, z1] of r.rects) {
        ctx.fillStyle = r.zone === 'stair' ? '#cfc9b8' : '#dedbce';
        ctx.fillRect(tx(x0), tz(z0), (x1 - x0) * s, (z1 - z0) * s);
        ctx.strokeRect(tx(x0), tz(z0), (x1 - x0) * s, (z1 - z0) * s);
      }
    }
    // exit routes: green arrows at egress
    ctx.fillStyle = '#2f7a42';
    const exits = level === 'g' ? [[31, 44, 'S'], [16, 15.3, 'STAIR']] : [[58, 8, 'RAMP'], [16, 12, 'STAIR']];
    for (const [ex, ez] of exits) {
      ctx.beginPath(); ctx.arc(tx(ex), tz(ez), 5, 0, Math.PI * 2); ctx.fill();
    }
    if (opts.here) {
      ctx.fillStyle = DANGER;
      ctx.beginPath(); ctx.arc(tx(opts.here[0]), tz(opts.here[1]), 4.5, 0, Math.PI * 2); ctx.fill();
      tracked(ctx, 'YOU ARE HERE', tx(opts.here[0]) + 8, tz(opts.here[1]), FONT(700, 9), DANGER, 0.5, 'left');
    }
    tracked(ctx, '\u25CF ASSEMBLY: NORTH PARKING', x + 12, y + h - 12, FONT(600, 10), '#2f7a42', 0.5, 'left');
  });
  box(g, 'aluminum', 0.56, 0.46, 0.012, 0, 0, 0.003);
  paperPlane(g, 0.52, 0.42, rect, 0, 0, 0.011);
  return g;
});

// SGN-008 cork notice board with layered papers
registerProp('sign_corkboard', (opts) => {
  const g = P('SGN-008');
  const seed = opts.seed ?? 1;
  const rect = atlasRegion(`cork:${seed}`, 300, 220, (ctx, x, y, w, h) => {
    // cork field
    ctx.fillStyle = '#a9855a'; ctx.fillRect(x, y, w, h);
    let hsh = seed * 7919 + 17;
    const rnd = () => { hsh = (hsh * 1103515245 + 12345) & 0x7fffffff; return hsh / 0x7fffffff; };
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = `rgba(${90 + rnd() * 60 | 0},${62 + rnd() * 44 | 0},${34 + rnd() * 26 | 0},0.5)`;
      ctx.fillRect(x + rnd() * w, y + rnd() * h, 1 + rnd() * 2.4, 1 + rnd() * 2);
    }
    // layered papers
    const papers = [
      { t: 'BLIZZARD PROTOCOL N-7', c: PAPER_WARM, lines: 5 },
      { t: 'BREAK ROOM FRIDGE', c: PAPER, lines: 4 },
      { t: 'CARPOOL BOARD', c: '#d6e2d2', lines: 6 },
      { t: 'FIRST AID REFRESHER', c: PAPER, lines: 3 },
      { t: 'FOR SALE — SNOW TIRES', c: '#e2d2d2', lines: 4 },
      { t: 'HOLIDAY ROTA', c: PAPER, lines: 5 },
    ];
    for (let i = 0; i < papers.length; i++) {
      const p = papers[(i + seed) % papers.length];
      const pw = 62 + rnd() * 26, ph = 66 + rnd() * 30;
      const px = x + 12 + rnd() * (w - pw - 24), pyy = y + 12 + rnd() * (h - ph - 24);
      ctx.save();
      ctx.translate(px + pw / 2, pyy + ph / 2);
      ctx.rotate((rnd() - 0.5) * 0.16);
      ctx.fillStyle = 'rgba(30,22,14,0.28)'; ctx.fillRect(-pw / 2 + 2, -ph / 2 + 3, pw, ph);
      ctx.fillStyle = p.c; ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      ctx.fillStyle = '#33302a'; ctx.font = FONT(700, 7); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(p.t.slice(0, 16), -pw / 2 + 4, -ph / 2 + 5);
      ctx.fillStyle = 'rgba(60,58,50,0.55)';
      for (let l = 0; l < p.lines; l++) ctx.fillRect(-pw / 2 + 4, -ph / 2 + 18 + l * 8, pw - 8 - rnd() * 18, 2.4);
      ctx.fillStyle = DANGER;
      ctx.beginPath(); ctx.arc(0, -ph / 2 + 5, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  });
  box(g, 'wood_dark', 1.2, 0.9, 0.03, 0, 0, 0.0);
  paperPlane(g, 1.12, 0.82, rect, 0, 0, 0.017);
  return g;
});

// SGN-009 laminated notices (small, wall-mounted)
const NOTICES = {
  badge: (ctx, x, y, w, h) => {
    ctx.fillStyle = PAPER; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = DEEP; ctx.fillRect(x, y, w, 44);
    tracked(ctx, 'SECURITY', x + w / 2, y + 22, FONT(800, 18), INK, 4);
    tracked(ctx, 'BADGE REQUIRED', x + w / 2, y + 76, FONT(800, 17), '#22303a', 1.2);
    tracked(ctx, 'BEYOND THIS POINT', x + w / 2, y + 100, FONT(800, 15), '#22303a', 1.2);
    // badge glyph
    ctx.strokeStyle = '#3e7ea6'; ctx.lineWidth = 4;
    ctx.strokeRect(x + w / 2 - 26, y + 122, 52, 34);
    ctx.fillStyle = '#3e7ea6'; ctx.fillRect(x + w / 2 - 18, y + 130, 14, 14);
    ctx.fillRect(x + w / 2 + 2, y + 132, 20, 3); ctx.fillRect(x + w / 2 + 2, y + 140, 20, 3);
    tracked(ctx, 'ND-SEC 07-311', x + w / 2, y + h - 14, FONT(500, 9), '#7a8a94', 1);
  },
  authorized: (ctx, x, y, w, h) => {
    ctx.fillStyle = '#22262a'; ctx.fillRect(x, y, w, h);
    hazardStripes(ctx, x, y, w, 22);
    hazardStripes(ctx, x, y + h - 22, w, 22);
    tracked(ctx, 'AUTHORIZED', x + w / 2, y + 58, FONT(800, 19), AMBER, 1.6);
    tracked(ctx, 'PERSONNEL ONLY', x + w / 2, y + 84, FONT(800, 16), AMBER, 1.4);
    tracked(ctx, 'SERVER HALL 158', x + w / 2, y + 118, FONT(600, 12), INK_DIM, 1.5);
    tracked(ctx, 'SYSTEMS DIVISION', x + w / 2, y + 138, FONT(500, 10), '#5d7284', 1.5);
  },
  blizzard: (ctx, x, y, w, h) => {
    ctx.fillStyle = PAPER_WARM; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#8c4a1e'; ctx.fillRect(x, y, w, 40);
    tracked(ctx, 'BLIZZARD PROTOCOL', x + w / 2, y + 20, FONT(800, 14), INK, 1.2);
    const lines = [
      'CONDITION N-7 IN EFFECT:',
      '\u2022 Remain indoors',
      '\u2022 Fleet vehicles grounded',
      '\u2022 Dock doors stay sealed',
      '\u2022 Check in with Facilities',
      '  every 2 hours',
    ];
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#4a3a28';
    lines.forEach((l, i) => { ctx.font = FONT(i ? 500 : 700, 11.5); ctx.fillText(l, x + 12, y + 60 + i * 19); });
    tracked(ctx, 'FACILITIES · EXT 4410', x + w / 2, y + h - 13, FONT(600, 9), '#8c4a1e', 1);
  },
  handwash: (ctx, x, y, w, h) => {
    ctx.fillStyle = '#dbe8ee'; ctx.fillRect(x, y, w, h);
    tracked(ctx, 'WASH YOUR HANDS', x + w / 2, y + 26, FONT(800, 14), '#2c5a7a', 1.2);
    // hands + water glyph
    ctx.strokeStyle = '#2c5a7a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + w / 2 - 24, y + 56); ctx.quadraticCurveTo(x + w / 2, y + 92, x + w / 2 + 24, y + 56); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x + w / 2 - 14 + i * 14, y + 44); ctx.lineTo(x + w / 2 - 14 + i * 14, y + 52); ctx.stroke();
    }
    tracked(ctx, '20 SECONDS MINIMUM', x + w / 2, y + 116, FONT(600, 10.5), '#44606e', 1);
    tracked(ctx, 'PEOPLE & CULTURE', x + w / 2, y + h - 14, FONT(500, 9), '#7a8a94', 1);
  },
  recycle: (ctx, x, y, w, h) => {
    ctx.fillStyle = '#d8e4d2'; ctx.fillRect(x, y, w, h);
    tracked(ctx, 'SORT IT OUT', x + w / 2, y + 26, FONT(800, 15), '#2f5a38', 1.5);
    ctx.strokeStyle = '#2f5a38'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const cx = x + w / 2, cy = y + 78;
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 3);
      ctx.beginPath(); ctx.arc(cx, cy, 26, a + 0.35, a + 1.55); ctx.stroke();
      const tipA = a + 1.55;
      const txp = cx + Math.cos(tipA) * 26, typ = cy + Math.sin(tipA) * 26;
      ctx.beginPath(); ctx.moveTo(txp, typ);
      ctx.lineTo(txp + Math.cos(tipA + 2.4) * 10, typ + Math.sin(tipA + 2.4) * 10);
      ctx.moveTo(txp, typ);
      ctx.lineTo(txp + Math.cos(tipA - 3.6) * 10, typ + Math.sin(tipA - 3.6) * 10);
      ctx.stroke();
    }
    tracked(ctx, 'PAPER · CANS · LANDFILL', x + w / 2, y + 128, FONT(600, 10), '#44603e', 1);
    tracked(ctx, 'BINS IN EVERY KITCHEN', x + w / 2, y + h - 14, FONT(500, 9), '#6a7a66', 1);
  },
  menu: (ctx, x, y, w, h) => {
    ctx.fillStyle = PAPER; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = DEEP; ctx.fillRect(x, y, w, 42);
    tracked(ctx, 'CAF\u00C9 NORTH', x + w / 2, y + 16, FONT(800, 15), INK, 1.6);
    tracked(ctx, 'WEEK 47 MENU', x + w / 2, y + 33, FONT(500, 9), ICE, 1.5);
    const days = [
      ['MON', 'ramen bar'], ['TUE', 'elk chili + cornbread'], ['WED', 'flatbread oven'],
      ['THU', 'root-cellar stew'], ['FRI', 'waffle social'],
    ];
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    days.forEach(([d, m], i) => {
      const ry = y + 62 + i * 23;
      ctx.font = FONT(800, 10.5); ctx.fillStyle = '#2c5a7a'; ctx.fillText(d, x + 12, ry);
      ctx.font = FONT(500, 11); ctx.fillStyle = '#3a3f43'; ctx.fillText(m, x + 46, ry);
      ctx.fillStyle = 'rgba(60,70,78,0.14)'; ctx.fillRect(x + 12, ry + 10, w - 24, 1);
    });
    tracked(ctx, 'SERVICE 11:30 \u2013 13:30', x + w / 2, y + h - 14, FONT(600, 9), '#7a8a94', 1);
  },
  keys: (ctx, x, y, w, h) => {
    ctx.fillStyle = PAPER; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#39424a'; ctx.fillRect(x, y, w, 38);
    tracked(ctx, 'KEY DISCIPLINE', x + w / 2, y + 19, FONT(800, 13), INK, 1.5);
    const lines = ['SIGN OUT every key.', 'SIGN IN before close.', 'Lost key = building', 'rekey at your cost.'];
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#3a3f43';
    lines.forEach((l, i) => { ctx.font = FONT(500, 12); ctx.fillText(l, x + 14, y + 62 + i * 22); });
    tracked(ctx, 'FACILITIES OFFICE 110', x + w / 2, y + h - 14, FONT(600, 9), '#7a8a94', 1);
  },
};

registerProp('sign_notice', (opts) => {
  const g = P('SGN-009');
  const variant = opts.variant || 'badge';
  const rect = atlasRegion(`notice:${variant}`, 160, 200, NOTICES[variant] || NOTICES.badge);
  paperPlane(g, 0.3, 0.375, rect, 0, 0, 0.004);
  return g;
});

// restroom stick figure, shared by the pictogram plates. (cx, top) = head top.
function pictoFigure(ctx, kind, cx, top, s = 1) {
  ctx.beginPath(); ctx.arc(cx, top + 9 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
  if (kind === 'w') {
    ctx.beginPath();
    ctx.moveTo(cx, top + 21 * s); ctx.lineTo(cx + 14 * s, top + 53 * s); ctx.lineTo(cx - 14 * s, top + 53 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(cx - 3 * s, top + 51 * s, 2.6 * s, 18 * s);
    ctx.fillRect(cx + 1 * s, top + 51 * s, 2.6 * s, 18 * s);
  } else {
    ctx.fillRect(cx - 9 * s, top + 21 * s, 18 * s, 28 * s);
    ctx.fillRect(cx - 8 * s, top + 49 * s, 6 * s, 22 * s);
    ctx.fillRect(cx + 2 * s, top + 49 * s, 6 * s, 22 * s);
  }
}

// SGN-010 restroom pictograms
registerProp('sign_pictogram', (opts) => {
  const g = P('SGN-010');
  const kind = opts.kind || 'm';
  const rect = atlasRegion(`picto:${kind}`, 96, 96, (ctx, x, y, w, h) => {
    ctx.fillStyle = '#39424a'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = INK;
    pictoFigure(ctx, kind, x + w / 2, y + 13);
  });
  paperPlane(g, 0.17, 0.17, rect, 0, 0, 0.005);
  box(g, 'metal_dark', 0.18, 0.18, 0.006, 0, 0, 0.001);
  return g;
});

// SGN-017 restroom direction plate: M + W figures + arrow (opts.dir 'left'|'right')
registerProp('sign_picto_dir', (opts) => {
  const g = P('SGN-017');
  const dir = opts.dir || 'right';
  const rect = atlasRegion(`pictodir:${dir}`, 220, 96, (ctx, x, y, w, h) => {
    ctx.fillStyle = '#39424a'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = INK;
    const figX = dir === 'right' ? x + 36 : x + 96;
    pictoFigure(ctx, 'm', figX, y + 13, 0.92);
    pictoFigure(ctx, 'w', figX + 44, y + 13, 0.92);
    ctx.fillStyle = 'rgba(232,241,248,0.35)';
    ctx.fillRect(dir === 'right' ? figX + 66 : figX - 16, y + 14, 2, h - 28);
    // arrow
    const ax = dir === 'right' ? x + w - 52 : x + 52, sgn = dir === 'right' ? 1 : -1;
    ctx.fillStyle = INK;
    ctx.fillRect(ax - sgn * 26, y + h / 2 - 5, sgn * 34, 10);
    ctx.beginPath();
    ctx.moveTo(ax + sgn * 24, y + h / 2);
    ctx.lineTo(ax + sgn * 2, y + h / 2 - 16);
    ctx.lineTo(ax + sgn * 2, y + h / 2 + 16);
    ctx.closePath(); ctx.fill();
  });
  paperPlane(g, 0.4, 0.175, rect, 0, 0, 0.005);
  box(g, 'metal_dark', 0.41, 0.185, 0.006, 0, 0, 0.001);
  return g;
});

// SGN-011 stairwell level plate (stencil style; opts.w widens, e.g. dock signs)
registerProp('sign_level_plate', (opts) => {
  const g = P('SGN-011');
  const text = opts.text || 'L1 — GROUND';
  const rect = atlasRegion(`level:${text}`, 240, 110, (ctx, x, y, w, h) => {
    ctx.fillStyle = '#6e6e6a'; ctx.fillRect(x, y, w, h); // painted block on concrete
    ctx.strokeStyle = '#c9cec9'; ctx.lineWidth = 3; ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
    const [big, small] = text.split(' — ');
    tracked(ctx, big, x + w / 2, y + 40, FONT(800, 42), '#d8dcd6', 4);
    if (small) tracked(ctx, small, x + w / 2, y + 84, FONT(700, 16), '#b8bcb6', 5);
  });
  const w = opts.w || 0.48;
  paperPlane(g, w, w * 0.458, rect, 0, 0, 0.004);
  return g;
});

// SGN-012 garage bay letter (painted panel)
registerProp('sign_bay_letter', (opts) => {
  const g = P('SGN-012');
  const letter = opts.letter || 'A';
  const rect = atlasRegion(`bay:${letter}`, 110, 110, (ctx, x, y, w, h) => {
    ctx.fillStyle = '#54585c'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#d8b93a'; ctx.lineWidth = 5; ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
    tracked(ctx, letter, x + w / 2, y + h / 2 + 2, FONT(800, 62), '#d8b93a', 0);
  });
  paperPlane(g, 0.44, 0.44, rect, 0, 0, 0.004);
  return g;
});

// SGN-013 tiny equipment / shipping labels
registerProp('label_small', (opts) => {
  const g = P('SGN-013');
  const text = (opts.text || 'ND-EQ-000').toUpperCase();
  const style = opts.style || 'equip';
  const rect = atlasRegion(`label:${style}:${text}`, 120, 44, (ctx, x, y, w, h) => {
    if (style === 'ship') {
      ctx.fillStyle = PAPER; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#22262a';
      for (let i = 0; i < 22; i++) ctx.fillRect(x + 8 + i * 4.6, y + 6, i % 3 ? 1.6 : 2.8, 16);
      tracked(ctx, text, x + w / 2, y + 33, FONT(700, 10), '#22262a', 0.6);
    } else {
      ctx.fillStyle = '#d8b93a'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#22262a'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
      tracked(ctx, text, x + w / 2, y + h / 2, FONT(700, 11), '#d8b93a', 0.8);
    }
  });
  paperPlane(g, 0.15, 0.055, rect, 0, 0, 0.003);
  return g;
});

// SGN-014 wall whiteboard with original scribbles
const WB_CONTENT = {
  training: (ctx, x, y, w, h) => {
    ctx.strokeStyle = '#2c4a6a'; ctx.fillStyle = '#2c4a6a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = FONT(700, 26);
    ctx.fillText('WINTER OPS REFRESHER', x + 24, y + 34);
    ctx.font = FONT(500, 19); ctx.fillStyle = '#3a4a56';
    ctx.fillText('1. Generator handover', x + 30, y + 78);
    ctx.fillText('2. Dock shutter drill', x + 30, y + 108);
    ctx.fillText('3. Radio etiquette', x + 30, y + 138);
    // unfinished diagram: ramp + arrow, interrupted mid-line
    ctx.strokeStyle = '#7a3f38';
    ctx.beginPath(); ctx.moveTo(x + 330, y + 70); ctx.lineTo(x + 470, y + 70); ctx.lineTo(x + 470, y + 150); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 330, y + 70); ctx.lineTo(x + 330, y + 118); ctx.stroke();
    ctx.font = FONT(500, 15); ctx.fillStyle = '#7a3f38';
    ctx.fillText('B1 ramp', x + 372, y + 92);
    ctx.beginPath(); ctx.moveTo(x + 352, y + 170); ctx.lineTo(x + 404, y + 170); ctx.stroke(); // trails off
    ctx.fillStyle = '#3a4a56'; ctx.font = FONT(500, 15);
    ctx.fillText('quiz Fri \u2192 bring boots', x + 30, y + 186);
  },
  facility: (ctx, x, y, w, h) => {
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = FONT(700, 22); ctx.fillStyle = '#2c4a6a';
    ctx.fillText('WEEK 47 — PLANT CHECKS', x + 20, y + 30);
    const rows = [['AHU-2 filter', 'OK'], ['Pump P-3 seal', 'WATCH'], ['Salt stock', 'LOW'], ['Dock leveler', 'OK']];
    ctx.font = FONT(500, 17);
    rows.forEach(([k, v], i) => {
      ctx.fillStyle = '#3a4a56'; ctx.fillText(k, x + 26, y + 68 + i * 30);
      ctx.fillStyle = v === 'OK' ? '#2f7a42' : '#8c4a1e'; ctx.fillText(v, x + 240, y + 68 + i * 30);
    });
    ctx.strokeStyle = '#7a3f38'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x + 262, y + 128, 52, 16, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#7a3f38'; ctx.font = FONT(500, 14);
    ctx.fillText('order before storm!!', x + 330, y + 128);
  },
};

registerProp('whiteboard_wall', (opts) => {
  const g = P('SGN-014');
  const content = opts.content || 'training';
  const w = opts.w || 1.8, h = 0.66 * (w / 1.1);
  const rect = atlasRegion(`wb:${content}`, 512, 220, (ctx, x, y, wp, hp) => {
    ctx.fillStyle = '#f0f2ef'; ctx.fillRect(x, y, wp, hp);
    ctx.fillStyle = 'rgba(120,130,136,0.10)';
    ctx.fillRect(x, y, wp, hp * 0.3); // faint sheen band
    (WB_CONTENT[content] || WB_CONTENT.training)(ctx, x, y, wp, hp);
  });
  box(g, 'aluminum', w + 0.06, h + 0.06, 0.03, 0, 0, 0);
  paperPlane(g, w, h, rect, 0, 0, 0.017);
  // marker tray
  box(g, 'aluminum', w * 0.5, 0.025, 0.06, 0, -h / 2 - 0.045, 0.035);
  return g;
});

// ---------------------------------------------------------------------------
// SGN-015 framed abstract canvas prints — original art, 3 designs, for
// walls that need restrained decor (waiting room / restroom hall).
const ART = {
  // layered mountain ridges under a pale disc (deep blues)
  ridge: (ctx, x, y, w, h) => {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#101d2c'); grad.addColorStop(1, '#20415a');
    ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(232,241,248,0.75)';
    ctx.beginPath(); ctx.arc(x + w * 0.68, y + h * 0.3, 26, 0, Math.PI * 2); ctx.fill();
    const ridges = [
      ['#16293c', 0.55, 44], ['#22405a', 0.68, 34], ['#33587a', 0.8, 26], ['#4a7699', 0.92, 18],
    ];
    for (const [col, base, amp] of ridges) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      let seed = amp * 17 + 3;
      const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      for (let px = 0; px <= w; px += w / 8) {
        ctx.lineTo(x + px, y + h * base - rnd() * amp);
      }
      ctx.lineTo(x + w, y + h);
      ctx.closePath(); ctx.fill();
    }
  },
  // sweeping ice-blue strokes with one amber accent on warm white
  drift: (ctx, x, y, w, h) => {
    ctx.fillStyle = '#e7e4da'; ctx.fillRect(x, y, w, h);
    ctx.lineCap = 'round';
    const strokes = [
      ['rgba(127,178,210,0.75)', 14, 0.3, 0.55], ['rgba(62,126,166,0.6)', 9, 0.48, 0.35],
      ['rgba(158,196,220,0.7)', 18, 0.66, 0.72], ['rgba(44,90,122,0.5)', 6, 0.82, 0.5],
    ];
    for (const [col, lw, ty, bend] of strokes) {
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.08, y + h * ty);
      ctx.bezierCurveTo(x + w * 0.4, y + h * (ty - bend * 0.4), x + w * 0.6, y + h * (ty + bend * 0.3), x + w * 0.94, y + h * (ty - bend * 0.15));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(200,140,60,0.8)'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.14, y + h * 0.78);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.9, x + w * 0.88, y + h * 0.7);
    ctx.stroke();
  },
  // winter-palette color-field blocks
  field: (ctx, x, y, w, h) => {
    ctx.fillStyle = '#d9dde0'; ctx.fillRect(x, y, w, h);
    const blocks = [
      [0.06, 0.08, 0.52, 0.56, '#22405a'], [0.62, 0.08, 0.32, 0.34, '#9db4c6'],
      [0.62, 0.46, 0.32, 0.18, '#c88c3c'], [0.06, 0.68, 0.34, 0.24, '#7fb2d2'],
      [0.44, 0.68, 0.5, 0.24, '#33455a'],
    ];
    for (const [bx, by, bw, bh, col] of blocks) {
      ctx.fillStyle = col;
      ctx.fillRect(x + w * bx, y + h * by, w * bw, h * bh);
    }
  },
};

registerProp('sign_art_print', (opts) => {
  const g = P('SGN-015');
  const design = opts.design || 'ridge';
  const w = opts.w || 0.66, h = w * 0.75;
  const rect = atlasRegion(`art:${design}`, 264, 198, ART[design] || ART.ridge);
  box(g, 'wood_dark', w + 0.07, h + 0.07, 0.024, 0, 0, 0.007);
  paperPlane(g, w, h, rect, 0, 0, 0.021);
  return g;
});

// SGN-016 square-cased wall clock (static hands, original face)
registerProp('sign_clock', () => {
  const g = P('SGN-016');
  const rect = atlasRegion('clock', 160, 160, (ctx, x, y, w, h) => {
    ctx.fillStyle = '#2a3138'; ctx.fillRect(x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2;
    ctx.fillStyle = '#e8e6dd';
    ctx.beginPath(); ctx.arc(cx, cy, 66, 0, Math.PI * 2); ctx.fill();
    // ticks
    ctx.strokeStyle = '#3a4048';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const major = i % 3 === 0;
      ctx.lineWidth = major ? 5 : 2.4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (major ? 50 : 55), cy + Math.sin(a) * (major ? 50 : 55));
      ctx.lineTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60);
      ctx.stroke();
    }
    // hands at 10:09 + red seconds
    const hand = (ang, len, lw, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
      ctx.stroke();
    };
    hand(-Math.PI / 2 + (10.15 / 12) * Math.PI * 2, 32, 7, '#2a3138');
    hand(-Math.PI / 2 + (9 / 60) * Math.PI * 2, 50, 5, '#2a3138');
    hand(-Math.PI / 2 + (37 / 60) * Math.PI * 2, 54, 2, '#9e2f28');
    ctx.fillStyle = '#2a3138';
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
  });
  box(g, 'metal_dark', 0.34, 0.34, 0.032, 0, 0, 0.0);
  paperPlane(g, 0.31, 0.31, rect, 0, 0, 0.018);
  return g;
});

export const SIGNAGE_PROP_IDS = [
  'sign_logo_backlit', 'sign_directory', 'sign_wayfind', 'sign_doorplate',
  'sign_dept_plate', 'sign_poster', 'sign_evac', 'sign_corkboard',
  'sign_notice', 'sign_pictogram', 'sign_level_plate', 'sign_bay_letter',
  'label_small', 'whiteboard_wall', 'sign_art_print', 'sign_clock',
  'sign_picto_dir',
];
