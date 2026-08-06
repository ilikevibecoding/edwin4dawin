// Interceptor missiles: procedural airframes per battery family, staged
// boost/sustain/divert flight, simplified proportional-navigation guidance and
// proximity fuzing. Every number is a fictional gameplay value.
//
// Each round is kit-bashed from lathe profiles, extruded fin planforms and a
// handful of primitives, then merged down to three meshes: painted skin,
// heat-tempered nozzle hardware, and one decal sheet whose UVs index a shared
// marking atlas. Airframe geometry is built once per family and shared by every
// pooled instance, so the pool costs eight transforms rather than eight copies.

import * as THREE from 'three';
import { BATTERY_BY_ID } from './config.js';
import { std } from './util/materials.js';
import { chamferBox, mergeParts, transform, latheProfile, cylinder } from './util/geom.js';
import { integrateBody, proNav, alignToVelocity, leadSolution, closestApproach, trailPersistence } from './physics.js';
import { GlowSprite } from './util/billboard.js';
import {
  flareSprite,
  stencilDecal,
  warningStripes,
  makeCanvas,
  finishTexture,
  fbmCanvas,
  paintedMetalMaps,
  heatDiscolorMap,
} from './util/textures.js';
import { bus, state } from './state.js';

export const FLIGHT = {
  BOOST: 'BOOST',
  SUSTAIN: 'SUSTAIN',
  MANEUVER: 'MANEUVER',
  TERMINAL: 'TERMINAL',
  SPENT: 'SPENT',
};

let nextId = 1;

/* ========================================================= marking atlas = */

/**
 * One transparent canvas carrying every stencil, hazard band, panel-line sheet
 * and soot wash used by the three rounds. Decal quads index into it with custom
 * UVs, so all the markings on an airframe cost a single draw call.
 */
let ATLAS = null;

const ATLAS_W = 1024;
const ATLAS_H = 1280;

function stencilCell(lines, color = '#e8e2d2', px = 62, wear = 0.42) {
  const font = `bold ${px}px "Arial Narrow", Impact, sans-serif`;
  return (ctx, w, h) => {
    const tex = stencilDecal(lines, { w: Math.round(w), h: Math.round(h), color, font, wear });
    ctx.drawImage(tex.image, 0, 0, w, h);
  };
}

function stripeCell(a, b) {
  return (ctx, w, h) => ctx.drawImage(warningStripes(512, 64, a, b).image, 0, 0, w, h);
}

/** Sapphire seeker window: faceted panes in a machined frame. */
function drawSeeker(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.0, '#9aa1a7');
  g.addColorStop(0.12, '#0b141b');
  g.addColorStop(0.44, '#16323f');
  g.addColorStop(0.6, '#31687d');
  g.addColorStop(0.8, '#0e1c25');
  g.addColorStop(0.9, '#9aa1a7');
  g.addColorStop(1.0, '#5c6268');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(172,180,186,0.8)';
  ctx.lineWidth = Math.max(2, w / 190);
  for (let i = 1; i < 10; i++) {
    const x = (i / 10) * w;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.12);
    ctx.lineTo(x, h * 0.88);
    ctx.stroke();
  }
  // a couple of panes catching the sky
  ctx.globalCompositeOperation = 'lighter';
  for (const i of [2, 6]) {
    const lg = ctx.createLinearGradient((i / 10) * w, h * 0.15, ((i + 1) / 10) * w, h * 0.85);
    lg.addColorStop(0, 'rgba(154,196,220,0.5)');
    lg.addColorStop(1, 'rgba(154,196,220,0)');
    ctx.fillStyle = lg;
    ctx.fillRect((i / 10) * w, h * 0.13, w / 10, h * 0.74);
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** Panel joints, longitudinal seams and rivet rows over a body section. */
function drawPanels(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const line = (x0, y0, x1, y1, a) => {
    ctx.strokeStyle = `rgba(26,28,30,${a})`;
    ctx.lineWidth = Math.max(1.6, w / 280);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = `rgba(232,234,236,${a * 0.45})`;
    ctx.lineWidth = Math.max(1, w / 420);
    ctx.beginPath();
    ctx.moveTo(x0 + 2, y0 + 2);
    ctx.lineTo(x1 + 2, y1 + 2);
    ctx.stroke();
  };
  const rivets = (x0, y0, x1, y1, n) => {
    ctx.fillStyle = 'rgba(38,40,42,0.6)';
    const r = Math.max(1.3, w / 300);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      ctx.beginPath();
      ctx.arc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  for (const v of [0.16, 0.46, 0.76]) {
    line(0, v * h, w, v * h, 0.85);
    rivets(0, v * h + 6, w, v * h + 6, 30);
  }
  for (const u of [0.2, 0.55, 0.85]) {
    line(u * w, 0, u * w, h, 0.72);
    rivets(u * w + 6, 0, u * w + 6, h, 20);
  }
  ctx.strokeStyle = 'rgba(28,30,32,0.9)';
  ctx.lineWidth = Math.max(1.8, w / 240);
  ctx.strokeRect(w * 0.58, h * 0.52, w * 0.2, h * 0.17);
  ctx.fillStyle = 'rgba(46,48,50,0.55)';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(w * (0.596 + (i % 2) * 0.168), h * (0.537 + Math.floor(i / 2) * 0.136), Math.max(1.8, w / 220), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Bolted clamp band, used at stage separation planes. */
function drawClamp(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#34373a');
  g.addColorStop(0.16, '#bcc1c6');
  g.addColorStop(0.5, '#878e94');
  g.addColorStop(0.84, '#b0b6bb');
  g.addColorStop(1, '#2f3235');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const n = 24;
  for (let i = 0; i < n; i++) {
    const x = ((i + 0.5) / n) * w;
    ctx.fillStyle = 'rgba(24,26,28,0.7)';
    ctx.beginPath();
    ctx.arc(x + 1.5, h * 0.5 + 1.5, h * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ced3d7';
    ctx.beginPath();
    ctx.arc(x, h * 0.5, h * 0.23, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#696f75';
    ctx.beginPath();
    ctx.arc(x, h * 0.5, h * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Roll-index stripe with station ticks, run down the length of a round. */
function drawRoll(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(230,224,208,0.92)';
  ctx.fillRect(0, h * 0.3, w, h * 0.4);
  ctx.fillStyle = 'rgba(26,26,24,0.85)';
  for (let i = 0; i <= 12; i++) {
    const x = (i / 12) * w;
    ctx.fillRect(x - 2.5, i % 3 === 0 ? 0 : h * 0.18, 5, i % 3 === 0 ? h : h * 0.64);
  }
  const n = fbmCanvas(128, { seed: 19, octaves: 5, scale: 12, contrast: 1.8 });
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = 0.32;
  ctx.drawImage(n, 0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

/** Louvred equipment-bay vent. */
function drawVent(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(56,58,60,0.94)';
  ctx.fillRect(w * 0.08, h * 0.14, w * 0.84, h * 0.72);
  ctx.fillStyle = 'rgba(12,12,12,0.95)';
  for (let i = 0; i < 6; i++) ctx.fillRect(w * 0.13, h * (0.2 + i * 0.11), w * 0.74, h * 0.055);
  ctx.strokeStyle = 'rgba(196,200,204,0.75)';
  ctx.lineWidth = Math.max(1.5, w / 60);
  ctx.strokeRect(w * 0.08, h * 0.14, w * 0.84, h * 0.72);
}

/**
 * Exhaust wash climbing the aft body. Cell v runs forward along the round, so
 * the densest soot sits at v = 0, right at the nozzle.
 */
function drawSoot(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const n = fbmCanvas(256, { seed: 61, octaves: 6, scale: 7, contrast: 1.5 });
  const tmp = makeCanvas(w, h);
  const tc = tmp.getContext('2d', { willReadFrequently: true });
  tc.drawImage(n, 0, 0, w, h);
  const img = tc.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const fade = Math.pow(y / (h - 1), 0.85);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = d[i] / 255;
      d[i] = 26;
      d[i + 1] = 23;
      d[i + 2] = 21;
      d[i + 3] = Math.min(255, Math.pow(lum, 0.7) * 320) * fade;
    }
  }
  tc.putImageData(img, 0, 0);
  ctx.drawImage(tmp, 0, 0);
}

const ATLAS_CELLS = [
  { name: 'panels', w: 256, h: 256, draw: drawPanels },
  { name: 'soot', w: 256, h: 256, draw: drawSoot },
  { name: 'vent', w: 128, h: 128, draw: drawVent },
  { name: 'p_nostep', w: 256, h: 64, draw: stencilCell(['NO STEP'], '#ded7c4', 40) },

  { name: 'seeker', w: 512, h: 128, draw: drawSeeker },
  { name: 'p_id', w: 384, h: 96, draw: stencilCell(['HK-R07'], '#e8e2d2', 64) },

  { name: 's_id', w: 640, h: 112, draw: stencilCell(['IRONWOOD 3'], '#f2e8d2', 82) },
  { name: 's_lift', w: 256, h: 64, draw: stencilCell(['LIFT POINT'], '#ded7c4', 38) },

  { name: 't_id', w: 384, h: 96, draw: stencilCell(['LV-K02'], '#efe6cf', 64) },
  { name: 'p_name', w: 512, h: 96, draw: stencilCell(['HAWKEYE ROUND'], '#e8e2d2', 56) },

  { name: 's_test', w: 896, h: 88, draw: stencilCell(['TEST ARTICLE — RANGE USE ONLY'], '#e8a24c', 56) },

  { name: 't_kill', w: 512, h: 88, draw: stencilCell(['KILL STAGE'], '#efe6cf', 58) },
  { name: 't_stage', w: 384, h: 88, draw: stencilCell(['STAGE II'], '#e2dac6', 58) },

  { name: 's_stage1', w: 384, h: 88, draw: stencilCell(['STAGE I'], '#e9dfc8', 58) },
  { name: 's_stage2', w: 384, h: 88, draw: stencilCell(['STAGE II'], '#e9dfc8', 58) },

  { name: 'hazard', w: 512, h: 64, draw: stripeCell('#d8b23a', '#22201c') },
  { name: 'p_umb', w: 256, h: 64, draw: stencilCell(['UMBILICAL'], '#ded7c4', 38) },

  { name: 'hazardO', w: 512, h: 64, draw: stripeCell('#d2701f', '#2b2723') },
  { name: 'arm', w: 256, h: 64, draw: stencilCell(['ARM'], '#e6cf68', 44) },

  { name: 'clamp', w: 512, h: 64, draw: drawClamp },
  { name: 'roll', w: 512, h: 48, draw: drawRoll },
];

function atlas() {
  if (ATLAS) return ATLAS;
  const canvas = makeCanvas(ATLAS_W, ATLAS_H);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, ATLAS_W, ATLAS_H);
  const cells = {};
  const PAD = 8;
  let cx = 0;
  let cy = 0;
  let rowH = 0;
  for (const c of ATLAS_CELLS) {
    if (cx + c.w > ATLAS_W) {
      cx = 0;
      cy += rowH + PAD;
      rowH = 0;
    }
    ctx.save();
    ctx.translate(cx, cy);
    c.draw(ctx, c.w, c.h);
    ctx.restore();
    cells[c.name] = { u0: cx / ATLAS_W, u1: (cx + c.w) / ATLAS_W, v0: 1 - (cy + c.h) / ATLAS_H, v1: 1 - cy / ATLAS_H };
    cx += c.w + PAD;
    rowH = Math.max(rowH, c.h);
  }
  const texture = finishTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  const material = std({
    map: texture,
    transparent: true,
    depthWrite: false,
    alphaTest: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    roughness: 0.8,
    // Near-zero metalness: the soot wash has a nearly black albedo and any
    // environment reflection turns it into a pale grey frost band.
    metalness: 0.04,
    envMapIntensity: 0.3,
  });
  material.name = 'roundMarkings';
  ATLAS = { cells, texture, material };
  return ATLAS;
}

/* ============================================================== finishes = */

let ROUND_MATS = null;

/**
 * The rounds get their own finishes rather than the shared `interceptorSkin`,
 * which is a bare brushed metal tuned for launcher hardware and reads as chrome
 * under the sky IBL. A missile wants low-gloss paint so the stencils, panel
 * joints and the heat gradient on the nozzle are what catch the eye.
 */
function roundMats() {
  if (ROUND_MATS) return ROUND_MATS;
  // Tiled several times over each body: at repeat 1 a 512 px sheet stretches
  // the whole airframe and the paint mottle turns into cloud-sized blobs.
  const paint = repeatMaps(paintedMetalMaps(512, '#c4c7c3', { rust: 0.1, streaks: 14, scratches: 26 }), 4, 3);
  ROUND_MATS = {
    skin: std({
      ...paint,
      color: 0xffffff,
      roughness: 0.6,
      metalness: 0.2,
      envMapIntensity: 0.85,
      normalScale: new THREE.Vector2(0.3, 0.3),
    }),
    // Tempered steel: the discolour map supplies the straw/violet banding, so
    // the base stays metallic instead of reading as rust.
    nozzle: std({
      map: heatDiscolorMap(256),
      color: 0x968f87,
      roughness: 0.44,
      metalness: 0.8,
      envMapIntensity: 1.1,
    }),
  };
  return ROUND_MATS;
}

function repeatMaps(maps, rx, ry) {
  const out = {};
  for (const [k, v] of Object.entries(maps)) {
    const t = v.clone();
    t.needsUpdate = true;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    out[k] = t;
  }
  return out;
}

/* ================================================================ kit bag = */

/**
 * Tangent-ogive nose profile, tip first, so it can be spliced straight onto a
 * body profile. Returned as [radius, y] pairs.
 */
function ogive(rBase, len, tipY, n = 7, tipR = 0.005) {
  const rho = (rBase * rBase + len * len) / (2 * rBase);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = Math.pow(i / n, 0.86);
    const x = len * t;
    const r = Math.sqrt(Math.max(0, rho * rho - (len - x) * (len - x))) - (rho - rBase);
    pts.push([Math.max(tipR, r), tipY - x]);
  }
  return pts;
}

/** Raised panel-joint ring spliced into a body profile at station `y`. */
function ringAt(r, y, h = 0.034, proud = 0.011) {
  return [
    [r, y + h],
    [r + proud, y + h * 0.6],
    [r + proud, y - h * 0.6],
    [r, y - h],
  ];
}

/**
 * Rocket bell revolved from a closed cross-section: outer wall down to the
 * exit lip, inner wall back up to the throat, then a plate across the throat
 * so nothing shows through the motor from behind.
 */
function nozzleBell(yTop, len, rAttach, rThroat, rExit, seg = 14) {
  return latheProfile(
    [
      [rAttach, yTop],
      [rAttach * 0.99, yTop - len * 0.1],
      [rExit * 0.86, yTop - len * 0.62],
      [rExit, yTop - len],
      [rExit * 0.965, yTop - len - 0.006],
      [rExit * 0.83, yTop - len * 0.6],
      [rThroat * 1.35, yTop - len * 0.26],
      [rThroat, yTop - len * 0.1],
      [0.004, yTop - len * 0.06],
    ],
    seg
  );
}

/**
 * Tapered fin planform extruded to a thickness. Span runs along local +X so
 * the blade projects radially when placed by `radialParts`; chord runs along
 * +Y with the leading edge toward the nose.
 */
function finPlate(rootChord, tipChord, span, sweep, thick, bevel = 0.01) {
  const s = new THREE.Shape();
  s.moveTo(0, -rootChord / 2);
  s.lineTo(0, rootChord / 2);
  s.lineTo(span, tipChord / 2 - sweep);
  s.lineTo(span, -tipChord / 2 - sweep);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: thick,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  g.translate(0, 0, -thick / 2);
  g.computeVertexNormals();
  return g;
}

/** Place one geometry `n` times around the body axis, local +X pointing out. */
function radialParts(parts, geometry, n, phase, radius, y, { pitch = 0, roll = 0 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + phase;
    parts.push({
      geometry,
      matrix: transform({ pos: [Math.cos(a) * radius, y, Math.sin(a) * radius], rot: [pitch, -a, roll] }),
    });
  }
}

/** Cable raceway: a conduit half-sunk into the skin with periodic clamps. */
function raceway(parts, { radius, y0, y1, angle, r = 0.038, clamps = 3 }) {
  const len = Math.abs(y1 - y0);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  parts.push({ geometry: cylinder(r, r, len, 7), matrix: transform({ pos: [c * radius, (y0 + y1) / 2, s * radius] }) });
  const block = new THREE.BoxGeometry(r * 3.2, 0.06, r * 2.6);
  for (let i = 0; i < clamps; i++) {
    const y = y0 + ((i + 0.5) / clamps) * (y1 - y0);
    parts.push({ geometry: block, matrix: transform({ pos: [c * (radius - r * 0.35), y, s * (radius - r * 0.35)], rot: [0, -angle, 0] }) });
  }
}

/**
 * Curved decal patch hugging the body. `arc` is the swept angle about
 * `arcMid`; `along` rotates the cell 90° so text reads up the round.
 */
function decalGeometry(cell, { radius, radiusTop = null, y, h, arcMid = 0, arc = 1.2, seg = 8, ySeg = 1, lift = 0.016, along = false }) {
  const c = atlas().cells[cell];
  const rTop = radiusTop === null ? radius : radiusTop;
  const pos = [];
  const nor = [];
  const uvs = [];
  const idx = [];
  for (let j = 0; j <= ySeg; j++) {
    const v = j / ySeg;
    const yy = y - h / 2 + v * h;
    const rr = radius + (rTop - radius) * v + lift;
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      const a = arcMid - arc / 2 + u * arc;
      pos.push(Math.cos(a) * rr, yy, Math.sin(a) * rr);
      nor.push(Math.cos(a), 0, Math.sin(a));
      const cu = along ? v : 1 - u;
      const cv = along ? u : v;
      uvs.push(c.u0 + cu * (c.u1 - c.u0), c.v0 + cv * (c.v1 - c.v0));
    }
  }
  for (let j = 0; j < ySeg; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i;
      idx.push(a, a + seg + 1, a + 1, a + 1, a + seg + 1, a + seg + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}

const decalPatch = (cell, opts) => ({ geometry: decalGeometry(cell, opts) });

/** Full-circumference decal band. */
const decalBand = (cell, opts) => ({ geometry: decalGeometry(cell, { arcMid: 0, arc: Math.PI * 2, seg: 20, ...opts }) });

const push = (list, geometry, matrix) => list.push(matrix ? { geometry, matrix } : { geometry });

/* =============================================================== airframes */

/**
 * HAWKEYE round: slim single-stage terminal interceptor. Mid-body strakes,
 * tail control fins on visible actuator fairings, a recessed seeker window
 * behind the nose, an umbilical fitting and a heat-tempered nozzle.
 */
function buildHawkeyeRound() {
  const R = 0.27;
  const SEG = 18;
  const skin = [];
  const hot = [];
  const dec = [];

  // ---- nose, body and boat-tail as a single lathe --------------------
  push(
    skin,
    latheProfile(
      [
        ...ogive(R, 1.5, 2.92, 7),
        [R, 1.24],
        [0.259, 1.2],
        [0.259, 0.92], // recessed seeker window
        [R, 0.88],
        ...ringAt(R, 0.34),
        ...ringAt(R, -0.5),
        ...ringAt(R, -1.32),
        [R, -1.66],
        [0.262, -1.8],
        [0.226, -2.03],
      ],
      SEG
    )
  );

  // ---- motor ----------------------------------------------------------
  push(hot, nozzleBell(-2.03, 0.3, 0.226, 0.115, 0.235, 14));
  push(hot, cylinder(0.248, 0.238, 0.05, SEG), transform({ pos: [0, -1.98, 0] }));

  // ---- mid-body strakes ------------------------------------------------
  radialParts(skin, finPlate(1.0, 0.62, 0.13, 0.16, 0.026, 0.008), 4, Math.PI / 4, R - 0.012, 0.6);

  // ---- tail control fins with actuator fairings ------------------------
  radialParts(skin, finPlate(0.56, 0.3, 0.32, 0.14, 0.032, 0.01), 4, 0, R - 0.014, -1.14);
  const fairing = new THREE.SphereGeometry(1, 8, 4);
  fairing.scale(0.062, 0.24, 0.088);
  radialParts(skin, fairing, 4, 0, R - 0.012, -1.14);
  radialParts(skin, cylinder(0.028, 0.028, 0.09, 7), 4, 0, R + 0.024, -1.14, { roll: -Math.PI / 2 });

  // ---- attitude-control ports just aft of the seeker -------------------
  radialParts(skin, cylinder(0.03, 0.024, 0.036, 7), 4, Math.PI / 4, R - 0.004, 0.78, { roll: -Math.PI / 2 });

  // ---- umbilical / lanyard fitting -------------------------------------
  push(skin, chamferBox(0.05, 0.16, 0.12, 0.012, 0), transform({ pos: [R - 0.008, -0.86, 0] }));
  push(skin, cylinder(0.032, 0.04, 0.06, 8), transform({ pos: [R + 0.03, -0.86, 0], rot: [0, 0, -Math.PI / 2] }));
  push(skin, new THREE.TorusGeometry(0.028, 0.009, 4, 8), transform({ pos: [R + 0.045, -0.66, 0], rot: [0, Math.PI / 2, 0] }));

  // ---- raceway from the seeker bay to the aft equipment bay -------------
  raceway(skin, { radius: R + 0.022, y0: -1.5, y1: 0.72, angle: Math.PI, r: 0.026, clamps: 3 });

  // ---- markings ---------------------------------------------------------
  dec.push(decalBand('seeker', { radius: 0.259, y: 1.06, h: 0.28, lift: 0.006 }));
  dec.push(decalBand('hazard', { radius: R, y: 1.33, h: 0.14 }));
  dec.push(decalBand('hazard', { radius: R, y: -1.5, h: 0.12 }));
  dec.push(decalBand('panels', { radius: R, y: -0.08, h: 0.72 }));
  dec.push(decalBand('soot', { radius: 0.226, radiusTop: R, y: -1.78, h: 0.5, ySeg: 2 }));
  for (const a of [0.5, 0.5 + Math.PI]) {
    dec.push(decalPatch('p_id', { radius: R, y: 0.0, h: 0.6, arcMid: a, arc: 0.48, along: true, seg: 3 }));
  }
  dec.push(decalPatch('p_name', { radius: R, y: -0.78, h: 0.92, arcMid: 2.15, arc: 0.34, along: true, seg: 3 }));
  dec.push(decalPatch('p_umb', { radius: R, y: -1.02, h: 0.12, arcMid: 0, arc: 0.8, seg: 5 }));
  dec.push(decalPatch('p_nostep', { radius: R, y: -0.86, h: 0.1, arcMid: Math.PI * 0.62, arc: 0.7, seg: 5 }));
  dec.push(decalPatch('vent', { radius: R, y: 0.06, h: 0.14, arcMid: -1.15, arc: 0.52, seg: 4 }));
  dec.push(decalPatch('roll', { radius: R, y: 0.4, h: 1.4, arcMid: Math.PI * 1.5, arc: 0.34, along: true, seg: 3 }));

  return {
    skin,
    hot,
    dec,
    nozzles: [{ x: 0, z: 0, r: 0.235 }],
    tipY: 2.92,
    exitY: -2.33,
    sheathR: 0.42,
  };
}

/**
 * LONGVIEW round: a slim kill stage riding a fat booster. Visible separation
 * clamp, divert thruster ports ringing the forward section, an interstage
 * shroud, long booster strakes and a large tempered nozzle bell.
 */
function buildLongviewRound() {
  const RB = 0.3;
  const RK = 0.215;
  const SEG = 18;
  const skin = [];
  const hot = [];
  const dec = [];

  push(
    skin,
    latheProfile(
      [
        ...ogive(RK, 0.92, 3.9, 7),
        [RK, 2.9],
        [0.204, 2.86],
        [0.204, 2.66], // recessed seeker window
        [RK, 2.62],
        ...ringAt(RK, 2.3, 0.026, 0.009),
        [RK, 2.06],
        [0.228, 2.02], // separation clamp shoulder
        [0.228, 1.9],
        [0.248, 1.84], // interstage shroud
        [RB, 1.62],
        ...ringAt(RB, 1.1),
        ...ringAt(RB, 0.1),
        ...ringAt(RB, -0.9),
        [RB, -1.98],
        [0.292, -2.16],
        [0.256, -2.4],
      ],
      SEG
    )
  );

  push(hot, nozzleBell(-2.4, 0.46, 0.256, 0.135, 0.3, 16));
  push(hot, cylinder(0.28, 0.268, 0.055, SEG), transform({ pos: [0, -2.35, 0] }));

  // ---- divert thruster ports around the kill stage ---------------------
  radialParts(skin, cylinder(0.044, 0.034, 0.05, 8), 6, 0.2, RK - 0.008, 2.44, { roll: -Math.PI / 2 });
  radialParts(hot, cylinder(0.024, 0.024, 0.056, 6), 6, 0.2, RK + 0.012, 2.44, { roll: -Math.PI / 2 });
  // finer attitude jets further forward
  radialParts(skin, cylinder(0.026, 0.02, 0.032, 6), 4, Math.PI / 4, RK - 0.004, 3.06, { roll: -Math.PI / 2 });

  // ---- kill-stage avionics blisters ------------------------------------
  const blister = new THREE.SphereGeometry(1, 8, 4);
  blister.scale(0.05, 0.18, 0.072);
  radialParts(skin, blister, 3, 0.9, RK - 0.01, 2.14);

  // ---- interstage attachment ring --------------------------------------
  radialParts(skin, cylinder(0.024, 0.024, 0.05, 6), 10, 0.15, 0.238, 1.86, { roll: -Math.PI / 2 });

  // ---- long booster strakes --------------------------------------------
  radialParts(skin, finPlate(1.9, 1.1, 0.16, 0.3, 0.028, 0.008), 4, Math.PI / 4, RB - 0.014, 0.42);

  // ---- tail fins on actuator fairings ----------------------------------
  radialParts(skin, finPlate(0.62, 0.3, 0.36, 0.2, 0.036, 0.011), 4, 0, RB - 0.016, -1.54);
  const fairing = new THREE.SphereGeometry(1, 8, 4);
  fairing.scale(0.07, 0.28, 0.098);
  radialParts(skin, fairing, 4, 0, RB - 0.014, -1.54);
  radialParts(skin, cylinder(0.03, 0.03, 0.1, 7), 4, 0, RB + 0.028, -1.54, { roll: -Math.PI / 2 });

  raceway(skin, { radius: RB + 0.024, y0: -1.9, y1: 1.5, angle: Math.PI, r: 0.03, clamps: 4 });
  raceway(skin, { radius: RK + 0.018, y0: 2.06, y1: 2.9, angle: Math.PI, r: 0.022, clamps: 2 });

  // ---- markings ----------------------------------------------------------
  dec.push(decalBand('seeker', { radius: 0.204, y: 2.76, h: 0.2, lift: 0.005 }));
  dec.push(decalBand('clamp', { radius: 0.228, y: 1.96, h: 0.12, lift: 0.006 }));
  dec.push(decalBand('hazard', { radius: RK, y: 3.18, h: 0.12 }));
  dec.push(decalBand('hazard', { radius: RB, y: -1.86, h: 0.14 }));
  dec.push(decalBand('panels', { radius: RB, y: -0.4, h: 0.9 }));
  dec.push(decalBand('panels', { radius: RK, y: 2.5, h: 0.28 }));
  dec.push(decalBand('soot', { radius: 0.256, radiusTop: RB, y: -2.16, h: 0.48, ySeg: 2 }));
  for (const a of [0.6, 0.6 + Math.PI]) {
    dec.push(decalPatch('t_id', { radius: RK, y: 2.36, h: 0.5, arcMid: a, arc: 0.5, along: true, seg: 3 }));
  }
  dec.push(decalPatch('t_kill', { radius: RK, y: 2.16, h: 0.8, arcMid: 2.4, arc: 0.4, along: true, seg: 3 }));
  for (const a of [0.9, 0.9 + Math.PI]) {
    dec.push(decalPatch('t_stage', { radius: RB, y: 0.66, h: 0.9, arcMid: a, arc: 0.38, along: true, seg: 3 }));
  }
  dec.push(decalPatch('arm', { radius: RB, y: -1.28, h: 0.12, arcMid: -0.7, arc: 0.62, seg: 5 }));
  dec.push(decalPatch('vent', { radius: RB, y: -0.38, h: 0.16, arcMid: -1.3, arc: 0.54, seg: 4 }));
  dec.push(decalPatch('roll', { radius: RB, y: -0.4, h: 2.1, arcMid: Math.PI * 1.5, arc: 0.3, along: true, seg: 3 }));

  return {
    skin,
    hot,
    dec,
    nozzles: [{ x: 0, z: 0, r: 0.3 }],
    tipY: 3.9,
    exitY: -2.86,
    sheathR: 0.6,
  };
}

/**
 * IRONWOOD test round: hammerhead fairing over a slim second stage, a flanged
 * interstage, a fat first stage wrapped in cable raceways, and a wide skirt
 * carrying four gimballed bells.
 */
function buildIronwoodRound() {
  const R2 = 0.44;
  const R1 = 0.6;
  const SEG = 18;
  const skin = [];
  const hot = [];
  const dec = [];

  push(
    skin,
    latheProfile(
      [
        ...ogive(0.52, 1.12, 5.42, 8),
        [0.52, 4.3],
        ...ringAt(0.52, 4.02),
        [0.52, 3.74],
        [0.505, 3.58], // hammerhead shoulder
        [R2, 3.34],
        ...ringAt(R2, 2.5),
        ...ringAt(R2, 1.2),
        [R2, 0.34],
        [0.46, 0.3], // interstage flange
        [0.5, 0.22],
        [0.5, 0.0],
        [0.56, -0.1],
        [R1, -0.2],
        ...ringAt(R1, -1.05),
        ...ringAt(R1, -2.5),
        [R1, -3.28],
        [0.7, -3.6], // skirt flare
        [0.82, -3.96],
        [0.84, -4.14],
        [0.83, -4.18], // rim
        [0.815, -4.14],
        [0.79, -3.98],
        [0.0, -3.94], // thrust plate closing the skirt
      ],
      SEG
    )
  );

  // ---- four gimballed bells under the skirt ------------------------------
  const bellR = 0.42;
  const bell = nozzleBell(-4.02, 0.52, 0.15, 0.095, 0.26, 12);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    push(hot, bell, transform({ pos: [Math.cos(a) * bellR, 0, Math.sin(a) * bellR] }));
  }
  radialParts(skin, cylinder(0.16, 0.152, 0.17, 9), 4, Math.PI / 4, bellR, -3.96);

  // ---- interstage flange hardware ----------------------------------------
  radialParts(skin, cylinder(0.032, 0.032, 0.07, 6), 8, 0.12, 0.49, -0.04, { roll: -Math.PI / 2 });

  // ---- first-stage strakes and skirt fins --------------------------------
  radialParts(skin, finPlate(2.3, 1.4, 0.2, 0.36, 0.04, 0.012), 4, Math.PI / 4, R1 - 0.016, -1.4);
  radialParts(skin, finPlate(0.95, 0.42, 0.6, 0.34, 0.05, 0.014), 4, 0, 0.78, -3.72);
  const fairing = new THREE.SphereGeometry(1, 6, 3);
  fairing.scale(0.1, 0.34, 0.14);
  radialParts(skin, fairing, 4, 0, 0.7, -3.6);

  // ---- cable raceways running the length of the vehicle ------------------
  for (const a of [Math.PI * 0.5, Math.PI, Math.PI * 1.5]) {
    raceway(skin, { radius: R1 + 0.034, y0: -3.2, y1: -0.02, angle: a, r: 0.045, clamps: 3 });
  }
  for (const a of [Math.PI, Math.PI * 1.5]) {
    raceway(skin, { radius: R2 + 0.03, y0: 0.34, y1: 3.3, angle: a, r: 0.038, clamps: 3 });
  }
  const jbox = chamferBox(0.17, 0.22, 0.12, 0.014, 0);
  for (const a of [Math.PI, Math.PI * 1.5]) {
    push(skin, jbox, transform({ pos: [Math.cos(a) * 0.53, 0.12, Math.sin(a) * 0.53], rot: [0, -a, 0] }));
  }

  // ---- markings ------------------------------------------------------------
  dec.push(decalBand('hazardO', { radius: 0.52, y: 4.16, h: 0.2 }));
  dec.push(decalBand('hazardO', { radius: R1, y: -3.12, h: 0.2 }));
  dec.push(decalBand('clamp', { radius: 0.5, y: 0.11, h: 0.18, lift: 0.01 }));
  dec.push(decalBand('panels', { radius: R2, y: 2.2, h: 0.9 }));
  dec.push(decalBand('panels', { radius: R1, y: -1.4, h: 0.9 }));
  dec.push(decalBand('soot', { radius: 0.8, radiusTop: R1, y: -3.6, h: 0.62, ySeg: 2 }));
  for (const a of [0.55, 0.55 + Math.PI]) {
    dec.push(decalPatch('s_id', { radius: R2, y: 2.4, h: 1.5, arcMid: a, arc: 0.44, along: true, seg: 3 }));
  }
  for (const a of [0.7, 0.7 + Math.PI]) {
    dec.push(decalPatch('s_test', { radius: R1, y: -1.5, h: 2.4, arcMid: a, arc: 0.3, along: true, seg: 3 }));
  }
  dec.push(decalPatch('s_stage2', { radius: R2, y: 0.75, h: 0.72, arcMid: 2.5, arc: 0.34, along: true, seg: 3 }));
  dec.push(decalPatch('s_stage1', { radius: R1, y: -0.55, h: 0.72, arcMid: 2.5, arc: 0.3, along: true, seg: 3 }));
  dec.push(decalPatch('s_lift', { radius: R1, y: -2.5, h: 0.16, arcMid: -0.8, arc: 0.58, seg: 5 }));
  dec.push(decalPatch('arm', { radius: R1, y: -2.2, h: 0.16, arcMid: 0.9, arc: 0.44, seg: 4 }));
  dec.push(decalPatch('vent', { radius: R1, y: -1.95, h: 0.22, arcMid: -1.5, arc: 0.44, seg: 4 }));
  dec.push(decalPatch('roll', { radius: R1, y: -1.6, h: 3.0, arcMid: Math.PI * 0.25, arc: 0.22, along: true, seg: 3 }));

  const nozzles = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    nozzles.push({ x: Math.cos(a) * bellR, z: Math.sin(a) * bellR, r: 0.26 });
  }
  return { skin, hot, dec, nozzles, tipY: 5.42, exitY: -4.54, sheathR: 1.0 };
}

const BUILDERS = {
  PATRIOT: buildHawkeyeRound,
  THAAD: buildLongviewRound,
  SENTINEL: buildIronwoodRound,
};

/* ================================================================== plume = */

/**
 * One lathe shell of the plume. The layer id goes into uv.x (0 core, 0.5 mid,
 * 1 outer sheath) and normalised distance aft into uv.y, so the shader is
 * independent of where the geometry sits or how it is scaled.
 */
function plumeShell({ y0, len, r0, flare, power, layer, seg = 12, steps = 8, x = 0, z = 0 }) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bulge = 1 + flare * Math.sin(Math.PI * Math.pow(t, 0.6));
    pts.push(new THREE.Vector2(Math.max(0.004, r0 * bulge * Math.pow(1 - t, power)), -len * t));
  }
  const g = new THREE.LatheGeometry(pts, seg);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = layer;
    uv[i * 2 + 1] = THREE.MathUtils.clamp(-pos.getY(i) / len, 0, 1);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  g.translate(x, y0, z);
  return g;
}

function buildPlumeGeometry(body, plumeScale) {
  const len = 8.4 * plumeScale;
  const parts = [];
  // A cluster spends its budget on four small columns that are individually
  // never more than a few pixels across, so each one gets coarser rings than
  // the single fat column of a one-motor round.
  const cluster = body.nozzles.length > 1;
  const coreSeg = cluster ? 10 : 14;
  const coreSteps = cluster ? 7 : 8;
  const midSeg = cluster ? 12 : 18;
  const midSteps = cluster ? 8 : 10;
  for (const n of body.nozzles) {
    parts.push({
      geometry: plumeShell({ y0: body.exitY + 0.04, len: len * 0.4, r0: n.r * 0.95, flare: 0.42, power: 1.5, layer: 0, seg: coreSeg, steps: coreSteps, x: n.x, z: n.z }),
    });
    parts.push({
      geometry: plumeShell({ y0: body.exitY + 0.04, len: len * 0.8, r0: n.r * 1.0, flare: 1.15, power: 1.05, layer: 0.5, seg: midSeg, steps: midSteps, x: n.x, z: n.z }),
    });
  }
  // The sheath is the widest, softest thing on screen and is where faceting
  // would show first, so it carries the finest ring count of the three shells.
  parts.push({
    geometry: plumeShell({ y0: body.exitY + 0.2, len, r0: body.sheathR, flare: 1.1, power: 0.85, layer: 1, seg: 24, steps: 10 }),
  });
  const g = mergeParts(parts);
  parts.forEach((p) => p.geometry.dispose());
  return g;
}

const PLUME_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vView;
void main() {
  vUv = uv;
  vN = normalize( mat3( modelMatrix ) * normal );
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vView = normalize( cameraPosition - wp.xyz );
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const PLUME_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vView;
uniform float uIntensity;
uniform float uTime;
uniform float uShock;
uniform vec3 uColorCore;
uniform vec3 uColorHot;
uniform vec3 uColorCool;
void main() {
  float layer = vUv.x;
  float t = clamp( vUv.y, 0.0, 1.0 );
  float isCore = 1.0 - step( 0.25, layer );
  float isMid = step( 0.25, layer ) * ( 1.0 - step( 0.75, layer ) );
  float isOut = step( 0.75, layer );

  // Mach-disc train. The cells are narrow bright discs rather than a sine
  // wobble, and they wash out downstream as the flow loses its structure.
  float phase = t * uShock * 6.2831853 - uTime * 7.0;
  float shock = pow( 0.5 + 0.5 * sin( phase ), 3.0 );
  float decay = exp( -t * 1.8 );
  float turb = 0.5 * sin( t * 21.0 - uTime * 26.0 ) + 0.5 * sin( t * 9.7 + uTime * 17.0 );
  float rim = pow( 1.0 - abs( dot( normalize( vN ), vView ) ), 1.4 );

  // Core: a hard bright column with the shock cells riding on top of it.
  vec3 cCore = mix( uColorCore, uColorHot, pow( t, 0.6 ) );
  cCore += vec3( 0.35, 0.3, 0.25 ) * shock * decay;
  float aCore = 0.85 * pow( 1.0 - t, 0.7 ) * ( 0.55 + 0.9 * shock * decay );

  // Shocked mid layer: the visible barrel of flame.
  vec3 cMid = mix( uColorHot, uColorCool, pow( t, 0.7 ) );
  float aMid = 0.5 * pow( 1.0 - t, 1.15 ) * ( 0.52 + 0.8 * shock * decay ) * ( 0.9 + 0.1 * turb );

  // Outer sheath: entrained air, only really visible edge-on. It is faded in
  // over the first tenth of its length so the shell does not begin as a hard
  // ring at the nozzle plane, and the rim term is spread wide enough that the
  // silhouette reads as haze rather than as an outline drawn round the cone.
  vec3 cOut = mix( uColorCool, uColorCool * 0.35, t );
  float rimSoft = pow( 1.0 - abs( dot( normalize( vN ), vView ) ), 0.9 );
  float aOut = 0.2 * pow( 1.0 - t, 1.5 ) * smoothstep( 0.0, 0.12, t ) * ( 0.1 + 0.8 * rimSoft ) * ( 0.85 + 0.15 * turb );

  vec3 c = cCore * isCore + cMid * isMid + cOut * isOut;
  float a = ( aCore * isCore + aMid * isMid + aOut * isOut ) * uIntensity;
  a *= smoothstep( 0.0, 0.08, 1.0 - t );
  if ( a < 0.004 ) discard;
  gl_FragColor = vec4( c, a );
}
`;

/** Shock-cell counts per family: bigger motors run fewer, larger cells. */
const PLUME_SHOCK = { PATRIOT: 9.0, THAAD: 7.5, SENTINEL: 6.0 };

/* ------------------------------------------------------- shared airframes */

const BODY_CACHE = {};
const PLUME_CACHE = {};

/**
 * Nose-to-nozzle length each family is normalised to. The builders work in a
 * larger, easier-to-reason-about layout unit and get scaled down here, which
 * keeps every station number in one place if a round needs resizing.
 */
const BODY_LENGTH = { PATRIOT: 3.2, THAAD: 4.2, SENTINEL: 5.7 };

function bodyData(id) {
  if (!BODY_CACHE[id]) {
    const b = BUILDERS[id]();
    const k = BODY_LENGTH[id] / (b.tipY - b.exitY);
    const scaled = (list) => {
      const g = mergeParts(list);
      g.scale(k, k, k);
      return g;
    };
    const data = {
      skin: scaled(b.skin),
      hot: scaled(b.hot),
      decal: scaled(b.dec),
      nozzles: b.nozzles.map((n) => ({ x: n.x * k, z: n.z * k, r: n.r * k })),
      tipY: b.tipY * k,
      exitY: b.exitY * k,
      sheathR: b.sheathR * k,
    };
    for (const list of [b.skin, b.hot, b.dec]) for (const p of list) p.geometry.dispose();
    BODY_CACHE[id] = data;
    PLUME_CACHE[id] = buildPlumeGeometry(data, BATTERY_BY_ID[id].plumeScale);
  }
  return BODY_CACHE[id];
}

/** A pooled instance of a family: three meshes sharing the cached geometry. */
function instanceBody(id) {
  const mats = roundMats();
  const b = bodyData(id);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(b.skin, mats.skin));
  g.add(new THREE.Mesh(b.hot, mats.nozzle));
  const dec = new THREE.Mesh(b.decal, atlas().material);
  dec.renderOrder = 2;
  g.add(dec);
  g.userData.body = b;
  return g;
}

export class Interceptor {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    // Bright exhaust cone welded to the nozzles: core, shocked mid and sheath.
    this.plumeMat = new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: 0 },
        uTime: { value: 0 },
        uShock: { value: 8 },
        uColorCore: { value: new THREE.Color(1.0, 0.99, 0.95) },
        uColorHot: { value: new THREE.Color(1.0, 0.86, 0.55) },
        uColorCool: { value: new THREE.Color(1.0, 0.42, 0.12) },
      },
      vertexShader: PLUME_VERT,
      fragmentShader: PLUME_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: true,
    });

    this.bodies = {};
    this.plumes = {};
    for (const id of Object.keys(BUILDERS)) {
      const m = instanceBody(id);
      m.visible = false;
      this.group.add(m);
      this.bodies[id] = m;
      const p = new THREE.Mesh(PLUME_CACHE[id], this.plumeMat);
      p.visible = false;
      p.renderOrder = 6;
      this.group.add(p);
      this.plumes[id] = p;
    }
    this.plume = null;

    this.glow = new GlowSprite(flareSprite(256), 0xfff0c0, 0.0038, 1.6);
    scene.add(this.glow.mesh);

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.mass = 1;
    this.cdA = 3e-5;
    this.alive = false;
    this.lastCmd = null;
    this.predicted = new THREE.Vector3();
    this.glowOffset = 2;
  }

  launch(cfg) {
    this.id = nextId++;
    this.label = `I${String(this.id).padStart(2, '0')}`;
    this.cfg = BATTERY_BY_ID[cfg.batteryId];
    this.batteryId = cfg.batteryId;
    this.pos.copy(cfg.pos);
    this.vel.copy(cfg.dir).normalize().multiplyScalar(38);
    this.target = cfg.target;
    this.targetId = cfg.target ? cfg.target.id : null;
    this.trackId = cfg.trackId;
    this.alive = true;
    this.age = 0;
    this.flight = FLIGHT.BOOST;
    this.cdA = this.cfg.dragK;
    this.lastCmd = null;
    this.detonated = false;
    this.missDistance = Infinity;
    this.minRange = Infinity;
    this.reason = null;
    this.maxLife = 60;
    this.divertBudget = 1;
    // Fly the rail direction before guidance takes over, like a real launch.
    this.launchAxis = cfg.dir.clone().normalize();
    this.straightTime = 0.55 + this.cfg.boostTime * 0.22;

    for (const [id, m] of Object.entries(this.bodies)) m.visible = id === this.batteryId;
    for (const p of Object.values(this.plumes)) p.visible = false;
    this.group.visible = true;
    this.group.position.copy(this.pos);
    this.glow.mesh.visible = true;
    this.glow.setColor(this.cfg.color);

    const data = this.bodies[this.batteryId].userData.body;
    this.plume = this.plumes[this.batteryId];
    this.plumeMat.uniforms.uShock.value = PLUME_SHOCK[this.batteryId] || 8;
    // The glow rides the nozzle plane rather than the airframe centroid, so a
    // close pass reads as a lit motor instead of a washed-out body.
    this.glowOffset = -data.exitY;

    this.trail = this.effects.acquireTrail({
      grow: 1.35,
      fade: 0.026,
      minStep: 12,
    });
    this.hotTrail = this.effects.acquireHotTrail({ grow: 0.6, fade: 2.6, minStep: 6, emissive: 1 });
    bus.emit('interceptor:launch', this);
    return this;
  }

  release() {
    this.alive = false;
    this.group.visible = false;
    this.glow.mesh.visible = false;
    if (this.plume) this.plume.visible = false;
    if (this.trail) {
      this.trail.detach();
      this.trail = null;
    }
    if (this.hotTrail) {
      this.hotTrail.detach();
      this.hotTrail = null;
    }
  }

  get thrustNow() {
    const c = this.cfg;
    if (this.age < c.boostTime) {
      // A short ramp keeps the launch from snapping to full thrust.
      return c.boostThrust * Math.min(1, 0.35 + this.age / 0.4);
    }
    if (this.age < c.boostTime + c.sustainTime) return c.sustainThrust;
    return 0;
  }

  update(dt, camera, time) {
    if (!this.alive) return;
    this.age += dt;
    const c = this.cfg;

    // ---- flight phase ------------------------------------------------
    const prev = this.flight;
    if (this.age < c.boostTime) this.flight = FLIGHT.BOOST;
    else if (this.age < c.boostTime + c.sustainTime) this.flight = FLIGHT.SUSTAIN;
    else this.flight = FLIGHT.MANEUVER;

    const tgtAlive = this.target && this.target.alive;
    let toGo = Infinity;
    if (tgtAlive) {
      toGo = this.pos.distanceTo(this.target.pos);
      // Endgame starts early enough that divert authority can still matter.
      if (toGo < 4200) this.flight = FLIGHT.TERMINAL;
    }
    if (prev !== this.flight) {
      if (this.flight === FLIGHT.SUSTAIN) {
        this.effects.puff(this.pos.clone(), 6 * c.plumeScale, 0xd8d2c8, 6);
      }
      bus.emit('interceptor:phase', this);
    }

    // ---- guidance ----------------------------------------------------
    const accel = new THREE.Vector3();
    const speed = this.vel.length();
    const fwd = speed > 1e-3 ? this.vel.clone().multiplyScalar(1 / speed) : new THREE.Vector3(0, 1, 0);

    let thrust = this.thrustNow;
    // Soft speed limit rather than a hard clamp so acceleration stays smooth.
    if (speed > c.maxSpeed * 0.94) thrust *= Math.max(0, 1 - (speed - c.maxSpeed * 0.94) / (c.maxSpeed * 0.12));
    accel.addScaledVector(fwd, thrust);

    if (tgtAlive) {
      // Predict with a characteristic flight speed, not the instantaneous one:
      // a round still on the rail would otherwise solve for a nonsense point.
      const speedRef = THREE.MathUtils.clamp(speed, c.maxSpeed * 0.62, c.maxSpeed);
      const tti = leadSolution(this.pos, speedRef, this.target.pos, this.target.vel, this.predicted, 0.35, 5);
      const predGround = this.effects.groundAt(this.predicted.x, this.predicted.z);
      if (this.predicted.y < predGround + 80) this.predicted.y = predGround + 80;
      this.timeToGo = tti;
      // Turn authority is limited by turn RATE, not just lateral g: a slow round
      // just off the rail physically cannot swing onto a new heading.
      // Divert thrusters give the kill stage far more authority than the
      // aerodynamic phases; this is a fictional but stable balance.
      const terminal = this.flight === FLIGHT.TERMINAL;
      const turnRate = terminal ? 1.6 : this.flight === FLIGHT.BOOST ? 0.5 : 0.8;
      const maxLat = Math.min(
        c.maxLateralG * 9.81 * (terminal ? 2.4 : 1),
        turnRate * Math.max(60, speed)
      );
      const cmd = new THREE.Vector3();
      if (this.age < this.straightTime) {
        // Hold the rail attitude; only damp any drift off the launch axis.
        const err = this.launchAxis.clone().sub(fwd);
        cmd.copy(err).multiplyScalar(maxLat * 0.5);
      } else {
        // Proportional navigation on the real target. The arc comes from the
        // launcher's loft angle, not from an artificial aim offset; a gravity
        // bias term keeps the round from sagging below the collision course.
        proNav(this, this.target.pos, this.target.vel, 4.0, maxLat * 0.94, dt, cmd);
        cmd.y += 9.81;
      }
      // Terrain guard: never let guidance fly the round into the deck.
      const ground = this.effects.groundAt(this.pos.x, this.pos.z);
      const agl = this.pos.y - ground;
      if (agl < 700 && this.vel.y < 40) {
        const pull = THREE.MathUtils.clamp(1 - agl / 700, 0, 1);
        cmd.y += pull * maxLat * 1.1;
      }
      accel.add(cmd);
      this.lastLateral = cmd.length();
    } else {
      this.lastLateral = 0;
      if (!this.detonated && this.age > 1.5) {
        // Target already gone: fly ballistic then scuttle.
        if (this.age > this.selfDestructAt || 0) {
          /* handled below */
        }
      }
    }

    const before = this.pos.clone();
    integrateBody(this, dt, accel);

    // ---- proximity fuze ---------------------------------------------
    if (tgtAlive) {
      const ca = closestApproach(before, this.vel, this.target.pos, this.target.vel, dt);
      const dist = Math.min(ca.dist, this.pos.distanceTo(this.target.pos));
      this.missDistance = Math.min(this.missDistance, dist);
      if (dist <= c.fuzeRadius) {
        this.detonate(dist, camera);
        return;
      }
      // Range opened back up after the closest point: the round has flown past.
      const range = this.pos.distanceTo(this.target.pos);
      this.minRange = Math.min(this.minRange === undefined ? Infinity : this.minRange, range);
      if (this.age > 4 && range > this.minRange + Math.max(200, c.fuzeRadius * 6)) {
        this.fail('MISS_PASSED', camera);
        return;
      }
    }

    // ---- lifetime ----------------------------------------------------
    if (this.pos.y < this.effects.groundAt(this.pos.x, this.pos.z) + 1) {
      this.fail('MISS_GROUND', camera);
      return;
    }
    if (this.age > this.maxLife || (!tgtAlive && this.age > c.boostTime + c.sustainTime + 4)) {
      this.fail(tgtAlive ? 'MISS_ENERGY' : 'NO_TARGET', camera);
      return;
    }

    // ---- presentation ------------------------------------------------
    this.group.position.copy(this.pos);
    alignToVelocity(this.group, this.vel, dt, this.flight === FLIGHT.BOOST ? 5 : 8, this.lastCmd, 0.006);
    const dist = this.pos.distanceTo(camera.position);
    const boost = THREE.MathUtils.clamp(dist / 1100, 1, 8);
    this.group.scale.setScalar(boost);

    // Exposure by eye. A boosting motor a few metres off the lens would white
    // out the whole frame through the bloom, so plume, glow and smoke are all
    // pulled back inside ~90 m. Nothing changes past that, which is what keeps
    // a round 20 km out readable as a bright point with a trail.
    const near = THREE.MathUtils.clamp(dist / 90, 0.4, 1);

    const burning = thrust > 1;
    this.plumeMat.uniforms.uIntensity.value = burning ? (this.flight === FLIGHT.BOOST ? 1.0 : 0.42) * (0.5 + 0.5 * near) : 0;
    this.plumeMat.uniforms.uTime.value = time;
    if (this.plume) this.plume.visible = burning;

    // The glow keeps its angular size with range, so a round 20 km out is still
    // a bright point; only an extreme close pass is damped so the airframe and
    // its markings stay readable.
    this.glow.mesh.position.copy(this.pos).addScaledVector(fwd, -this.glowOffset * boost);
    this.glow.update(camera, (burning ? (this.flight === FLIGHT.BOOST ? 1.5 : 0.8) : 0.35) * near);
    this.glow.opacity = burning ? 1 : 0.4;

    const persist = trailPersistence(this.pos.y);
    const tangent = fwd;
    // Far out the ribbon is widened so a round 20 km away still reads as a line
    // in the sky. Close in it is pulled back towards the motor's own exit
    // diameter, otherwise the airframe is born inside its own smoke column and
    // nothing of the round is visible at all.
    const widthScale = Math.max(1, dist * 0.0007) * THREE.MathUtils.clamp(dist / 110, 0.3, 1);
    if (this.trail) {
      this.trail.push(
        this.pos,
        tangent,
        this.effects.time,
        c.trailWidth * widthScale * (0.5 + persist * 0.9),
        (burning ? 0.62 : 0.2) * (0.2 + persist),
        new THREE.Color(0.88, 0.87, 0.85)
      );
    }
    if (this.hotTrail && burning) {
      this.hotTrail.push(this.pos, tangent, this.effects.time, c.trailWidth * 0.55 * widthScale, 0.9, new THREE.Color(1.0, 0.72, 0.35));
    }
    if (burning) {
      this.effects.exhaust(this.pos, this.vel, {
        scale: c.plumeScale * (this.flight === FLIGHT.BOOST ? 1 : 0.5),
        dt,
        rate: this.flight === FLIGHT.BOOST ? 1.4 : 0.7,
        boosting: true,
        backDir: fwd.clone().multiplyScalar(-1),
        smokeColor: 0xc8c4be,
      });
    }
    // Divert-thruster puffs make the control corrections visible.
    if (this.flight === FLIGHT.TERMINAL && this.lastLateral > 30 && Math.random() < dt * 26) {
      const side = new THREE.Vector3().crossVectors(fwd, this.lastCmd || fwd).normalize();
      this.effects.glowPuff(this.pos.clone().addScaledVector(side, 1.5 * boost), 3 * boost, 0.18, 0xfff0d0, 0.8);
    }
  }

  detonate(dist, camera) {
    this.detonated = true;
    const c = this.cfg;
    const lethal = c.fuzeRadius * 0.7;
    const hit = dist <= lethal || (dist <= c.fuzeRadius && Math.random() < 0.72);
    this.missDistance = dist;
    this.reason = hit ? 'HIT' : 'MISS_FUZE';
    this.effects.intercept(
      this.pos.clone(),
      (hit ? 30 : 18) * c.warheadYield,
      camera,
      { hot: new THREE.Color(1, 0.97, 0.88), mid: new THREE.Color(1, 0.55, 0.16), cool: new THREE.Color(0.1, 0.09, 0.09) }
    );
    bus.emit('interceptor:detonate', { interceptor: this, hit, dist });
    this.release();
  }

  fail(reason, camera) {
    this.reason = reason;
    this.detonated = true;
    this.effects.intercept(this.pos.clone(), 14, camera, {
      hot: new THREE.Color(1, 0.9, 0.75),
      mid: new THREE.Color(0.95, 0.45, 0.14),
      cool: new THREE.Color(0.1, 0.09, 0.09),
    });
    bus.emit('interceptor:detonate', { interceptor: this, hit: false, dist: this.missDistance, reason });
    this.release();
  }
}

export class InterceptorManager {
  constructor(scene, effects, poolSize = 8) {
    this.pool = [];
    for (let i = 0; i < poolSize; i++) this.pool.push(new Interceptor(scene, effects));
    this.active = [];
    this.effects = effects;
    this.time = 0;
  }

  launch(cfg) {
    const m = this.pool.find((p) => !p.alive);
    if (!m) return null;
    m.launch(cfg);
    this.active.push(m);
    state.stats.launched++;
    return m;
  }

  update(dt, camera) {
    this.time += dt;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const m = this.active[i];
      m.update(dt, camera, this.time);
      if (!m.alive) this.active.splice(i, 1);
    }
    state.stats.inFlight = this.active.length;
  }

  clear() {
    for (const m of this.active) m.release();
    this.active.length = 0;
  }
}
