// Shared props and materials for the Crew Deck rooms (mess, quarters, medbay, recreation, armoury,
// detention, escape pods, life support). Everything here is deck-local and builds through the
// sector kit; custom materials are created once and registered on ctx.materials with the `crew_`
// prefix. No exported name starts with "build" (rooms/index.js would register it as a room).
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { rng } from "../../kit.js";
import { makeCanvas, toTexture, fbm } from "../../textures.js";
import { wallFrame, X_AXIS } from "../builders.js";
import { wallSegment } from "../imperial.js";

// ---------------------------------------------------------------------------
// Signage sheet: 4 columns x 10 rows of 256x64 labels. Two textures share the layout: an ink
// stencil (worn, for painted panels) and a lit version (bright glyphs, for emissive sign boxes).
// ---------------------------------------------------------------------------
export const SIGN = {
  MESS: 0, GALLEY: 1, RATIONS: 2, QUARTERS: 3,
  BAY1: 4, BAY2: 5, BAY3: 6, BAY4: 7,
  MEDICAL: 8, BACTA: 9, STERILE: 10, RECREATION: 11,
  ARMOURY: 12, RESTRICTED: 13, AUTHORISED: 14, CHARGE: 15,
  DETENTION: 16, CELL1: 17, CELL2: 18, CELL3: 19,
  CELL4: 20, CELL5: 21, CELL6: 22, INTERROGATION: 23,
  ESCAPE: 24, EVAC_R: 25, LIFESUPPORT: 26, H2O: 27,
  O2: 28, WASTE: 29, BIOHAZARD: 30, WASH: 31,
  POD1: 32, POD2: 33, POD3: 34, POD4: 35,
  POD5: 36, POD6: 37, EVAC_L: 38, MENU: 39,
};
const SIGN_COLS = 4;
const SIGN_ROWS = 10;
const SIGN_TEXT = [
  "MESS HALL", "GALLEY", "RATIONS", "CREW QUARTERS",
  "BAY 1", "BAY 2", "BAY 3", "BAY 4",
  "MEDICAL BAY", "BACTA", "STERILE AREA", "RECREATION",
  "ARMOURY", "RESTRICTED", "AUTHORISED ONLY", "CHARGE PACKS",
  "DETENTION BLOCK", "CELL 01", "CELL 02", "CELL 03",
  "CELL 04", "CELL 05", "CELL 06", "INTERROGATION",
  "ESCAPE PODS", "EVAC \u2192", "LIFE SUPPORT", "H2O",
  "O2", "WASTE", "BIOHAZARD", "WASH",
  "POD 1", "POD 2", "POD 3", "POD 4",
  "POD 5", "POD 6", "\u2190 EVAC", "MENU  CYCLE 04",
];
// lit colours per cell family
const LIT_COL = (i) => {
  if (i >= 13 && i <= 14) return "#ff4a3a";
  if (i >= 16 && i <= 23) return "#ff4a3a";
  if (i === 29 || i === 30) return "#ff6a3a";
  if ((i >= 24 && i <= 25) || (i >= 32 && i <= 38)) return "#ffb347";
  if (i >= 26 && i <= 28) return "#4cff88";
  if (i >= 8 && i <= 10) return "#8fe3ff";
  if (i <= 2 || i === 39) return "#fff1d6";
  return "#eef3ff";
};
const INK_COL = (i) => {
  if ((i >= 13 && i <= 14) || (i >= 16 && i <= 23) || i === 29 || i === 30) return "#7a1811";
  if ((i >= 24 && i <= 25) || (i >= 32 && i <= 38)) return "#8a4e10";
  return "#1d1e21";
};

function drawSignSheet(lit, seed) {
  const w = 1024;
  const h = 640;
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const cw = w / SIGN_COLS;
  const ch = h / SIGN_ROWS;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < SIGN_TEXT.length; i++) {
    const cx = (i % SIGN_COLS) * cw;
    const cy = Math.floor(i / SIGN_COLS) * ch;
    const s = SIGN_TEXT[i];
    let px = 40;
    ctx.font = `bold ${px}px "DejaVu Sans Mono", "Liberation Mono", Menlo, Consolas, monospace`;
    const mw = ctx.measureText(s).width;
    if (mw > cw * 0.86) px = Math.floor((px * cw * 0.86) / mw);
    ctx.font = `bold ${px}px "DejaVu Sans Mono", "Liberation Mono", Menlo, Consolas, monospace`;
    ctx.fillStyle = lit ? LIT_COL(i) : INK_COL(i);
    ctx.fillText(s, cx + cw / 2, cy + ch / 2 + 1);
    // thin rule under lit labels (Imperial signage bar)
    if (lit) {
      ctx.fillRect(cx + cw * 0.08, cy + ch - 6, cw * 0.84, 2);
    }
  }
  if (!lit) {
    // erode the stencil so it reads as worn paint
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const k = (y * w + x) * 4;
        if (d[k + 3] === 0) continue;
        const u = x / w;
        const n = fbm(u, v, { octaves: 3, freq: 50, seed: seed + 2 });
        let a = d[k + 3] / 255;
        a *= Math.min(1, Math.max(0, (n - 0.28) * 4));
        d[k + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = toTexture(c, { srgb: true, wrap: false });
  tex.anisotropy = 8;
  return tex;
}

/** uvRect for a sign cell. */
export function signRect(i) {
  const col = i % SIGN_COLS;
  const row = Math.floor(i / SIGN_COLS);
  return [col / SIGN_COLS, 1 - (row + 1) / SIGN_ROWS, (col + 1) / SIGN_COLS, 1 - row / SIGN_ROWS];
}

/** Register the crew-deck materials once (idempotent). */
export function ensureCrewMaterials(ctx) {
  const m = ctx.materials;
  if (m.crew_sign) return m;
  const inkTex = drawSignSheet(false, 401);
  const litTex = drawSignSheet(true, 403);
  m.crew_sign = new THREE.MeshStandardMaterial({
    map: inkTex,
    transparent: true,
    depthWrite: false,
    roughness: 0.75,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    envMapIntensity: 0.3,
  });
  m.crew_signLit = new THREE.MeshStandardMaterial({
    map: litTex,
    color: 0x000000,
    emissive: 0xffffff,
    emissiveMap: litTex,
    emissiveIntensity: 1.7,
    transparent: true,
    depthWrite: false,
    roughness: 0.4,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  // grime / humidity: dark translucent blot with a soft fbm alpha
  {
    const size = 256;
    const c = makeCanvas(size, size);
    const g = c.getContext("2d");
    const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;
        const dx = u - 0.5;
        const dy = v - 0.5;
        const r = Math.hypot(dx * 2, dy * 2);
        const n = fbm(u, v, { octaves: 4, freq: 6, seed: 409 });
        const a = Math.max(0, 1 - r) * (0.45 + n * 0.9);
        const k = (y * size + x) * 4;
        const val = Math.min(255, a * 255);
        img.data[k] = val;
        img.data[k + 1] = val;
        img.data[k + 2] = val;
        img.data[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const tex = toTexture(c, { srgb: false, wrap: false });
    m.crew_grime = new THREE.MeshStandardMaterial({
      color: 0x06070a,
      alphaMap: tex,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      roughness: 1,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }
  // tank / cabinet glass: a real (if faint) pane, bluish
  m.crew_glass = new THREE.MeshPhysicalMaterial({
    color: 0x9fd0ff,
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    envMapIntensity: 0.6,
    side: THREE.DoubleSide,
  });
  // bacta: glowing blue liquid column
  m.crew_bacta = new THREE.MeshStandardMaterial({
    color: 0x062a44,
    emissive: new THREE.Color("#2f9fe6"),
    emissiveIntensity: 1.1,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    roughness: 0.3,
    metalness: 0,
  });
  // matte white armour / medical plastics (vertex tinted)
  m.crew_white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.05, vertexColors: true, envMapIntensity: 0.6 });
  // pulsing amber beacon emitter (escape pod bay) and red alert domes (armoury), animated by the rooms
  m.crew_beacon = m.emitAmber.clone();
  m.crew_alert = m.emitRed.clone();
  // detention cell containment field: own texture copy so the UV scroll does not touch holograms
  m.crew_cellField = m.forceField.clone();
  m.crew_cellField.map = m.forceField.map.clone();
  m.crew_cellField.map.needsUpdate = true;
  m.crew_cellField.opacity = 0.3;
  m.crew_cellField.color = new THREE.Color("#ff4a3a");
  // starfield "window" screens for the lounge
  {
    const w = 512;
    const h = 256;
    const c = makeCanvas(w, h);
    const g = c.getContext("2d");
    const rand = rng(419);
    g.fillStyle = "#04060e";
    g.fillRect(0, 0, w, h);
    // nebula: two soft lobes (blue and a warmer magenta) so the screen reads as space from afar
    const lobe = (cx, cy, r, c0, c1) => {
      const grad = g.createRadialGradient(cx, cy, 4, cx, cy, r);
      grad.addColorStop(0, c0);
      grad.addColorStop(0.55, c1);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    };
    lobe(w * 0.68, h * 0.38, w * 0.5, "rgba(90,130,220,0.75)", "rgba(50,70,160,0.3)");
    lobe(w * 0.5, h * 0.7, w * 0.35, "rgba(170,90,170,0.45)", "rgba(80,40,110,0.18)");
    lobe(w * 0.85, h * 0.8, w * 0.25, "rgba(70,150,200,0.4)", "rgba(30,60,120,0.15)");
    for (let i = 0; i < 520; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = rand() < 0.06 ? 2.2 : rand() < 0.5 ? 1.3 : 0.8;
      const b = 0.6 + rand() * 0.4;
      g.fillStyle = `rgba(${200 + rand() * 55},${210 + rand() * 45},255,${b})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // a planet limb low-left with a lit atmosphere rim
    const pg = g.createRadialGradient(w * 0.12, h * 1.3, h * 0.5, w * 0.12, h * 1.3, h * 1.02);
    pg.addColorStop(0, "rgba(120,165,215,1)");
    pg.addColorStop(0.72, "rgba(70,105,170,0.95)");
    pg.addColorStop(0.9, "rgba(140,190,255,0.7)");
    pg.addColorStop(1, "rgba(20,30,60,0)");
    g.fillStyle = pg;
    g.beginPath();
    g.arc(w * 0.12, h * 1.3, h * 1.02, 0, Math.PI * 2);
    g.fill();
    // cloud bands on the planet
    g.strokeStyle = "rgba(220,235,255,0.25)";
    g.lineWidth = 6;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.arc(w * 0.12, h * 1.3, h * (0.62 + k * 0.09), Math.PI * 1.15, Math.PI * 1.75);
      g.stroke();
    }
    // ship silhouette: a distant wedge with a lit engine dot
    g.fillStyle = "#0a0c12";
    g.beginPath();
    g.moveTo(w * 0.58, h * 0.62);
    g.lineTo(w * 0.72, h * 0.55);
    g.lineTo(w * 0.72, h * 0.66);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(160,200,255,0.9)";
    g.fillRect(w * 0.716, h * 0.6, 3, 3);
    const tex = toTexture(c, { srgb: true, wrap: false });
    // rough + no env reflection: the dark field must not pick up the room's grey env mirror
    m.crew_starScreen = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.9, roughness: 0.75, metalness: 0, envMapIntensity: 0 });
  }
  return m;
}

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------
/** Sign box on a wall side: dark plate + (lit) label. w is the label width; height is w/4. */
export function wallSign(kit, ctx, { side, u, v = 2.9, w = 1.6, cell, lit = true, plate = true, bounds = ctx.bounds }) {
  const seg = wallSegment(bounds, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, bounds[0][1]);
  const h = w / 4;
  if (plate) {
    frame.box("paintedMetal", u, v, 0.025, w + 0.16, h + 0.14, 0.05, { color: PALETTE.impBlack, texel: 2 });
    if (lit) frame.box("darkGloss", u, v, 0.052, w + 0.04, h + 0.04, 0.006);
  }
  frame.add(lit ? "crew_signLit" : "crew_sign", new THREE.PlaneGeometry(w, h), u, v, plate ? 0.058 : 0.004, { uv: "keep", uvRect: signRect(cell) });
  return frame;
}

/** Free sign quad: pos, rot (euler array), width; lies in the local XY plane facing +Z before rotation. */
export function signQuad(kit, cell, pos, rot, w, lit = false) {
  const g = new THREE.PlaneGeometry(w, w / 4);
  kit.add(lit ? "crew_signLit" : "crew_sign", g, { pos, rot, uv: "keep", uvRect: signRect(cell) });
}

/** Floor sign (lies flat, readable from +Z looking -Z when yaw = 0). */
export function floorSign(kit, cell, x, z, w, yaw = 0, lit = false) {
  const g = new THREE.PlaneGeometry(w, w / 4);
  g.rotateX(-Math.PI / 2);
  g.rotateY(yaw);
  kit.add(lit ? "crew_signLit" : "crew_sign", g, { pos: [x, 0.006, z], uv: "keep", uvRect: signRect(cell) });
}

// ---------------------------------------------------------------------------
// Wear
// ---------------------------------------------------------------------------
/** Grime blot on the floor (or any horizontal surface at y). */
export function floorGrime(kit, x, z, w, d, yaw = 0, y = 0.004) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  g.rotateY(yaw);
  kit.add("crew_grime", g, { pos: [x, y, z], uv: "keep" });
}

/** Grime / humidity streak on a wall side, centred at (u, v) with size w x h, sitting just proud of the panels. */
export function wallGrime(kit, ctx, side, u, v, w, h, bounds = ctx.bounds) {
  const seg = wallSegment(bounds, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, bounds[0][1]);
  frame.add("crew_grime", new THREE.PlaneGeometry(w, h), u, v, 0.006, { uv: "keep" });
}

/** Scuff marks on the floor along a walkway: a few dark stretched blots. */
export function scuffRun(kit, x0, z0, x1, z1, n, seed = 5, w = 0.9) {
  const rand = rng(seed);
  for (let i = 0; i < n; i++) {
    const t = (i + rand() * 0.8) / n;
    const x = x0 + (x1 - x0) * t + (rand() - 0.5) * 0.6;
    const z = z0 + (z1 - z0) * t + (rand() - 0.5) * 0.6;
    const ang = Math.atan2(x1 - x0, z1 - z0) + (rand() - 0.5) * 0.5;
    floorGrime(kit, x, z, w * (0.6 + rand() * 0.8), w * (1.4 + rand() * 1.6), ang);
  }
}

// ---------------------------------------------------------------------------
// Cables, conduits, vents
// ---------------------------------------------------------------------------
/** A drooping cable between two wall points (three straight segments approximating the sag). */
export function cableDroop(kit, a, b, sag = 0.25, r = 0.014, color = PALETTE.rubber) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const pts = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    const p = A.clone().lerp(B, t);
    p.y -= sag * Math.sin(Math.PI * t);
    pts.push(p);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const len = p.distanceTo(q) + r;
    const mid = p.clone().add(q).multiplyScalar(0.5);
    const g = new THREE.CylinderGeometry(r, r, len, 6);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize());
    kit.add("rubber", g, { pos: [mid.x, mid.y, mid.z], quat, color, uv: "scale", uvScale: [0.1, len] });
  }
}

/** Cable tray along a wall side at height v: a channel with 3 cables inside and clamps. */
export function cableTray(kit, ctx, side, u0, u1, v, bounds = ctx.bounds) {
  const seg = wallSegment(bounds, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, bounds[0][1]);
  const len = u1 - u0;
  const cu = (u0 + u1) / 2;
  frame.box("paintedMetal", cu, v, 0.06, len, 0.14, 0.12, { color: PALETTE.impDark, texel: 2 });
  frame.cylU("rubber", cu, v + 0.03, 0.09, 0.018, len - 0.04, { color: PALETTE.rubber, segments: 6 });
  frame.cylU("rubber", cu, v - 0.02, 0.1, 0.014, len - 0.04, { color: PALETTE.rubber, segments: 6 });
  frame.cylU("metal", cu, v + 0.035, 0.11, 0.012, len - 0.04, { color: PALETTE.steel, segments: 6 });
  for (let u = u0 + 0.6; u < u1 - 0.3; u += 1.8) frame.box("metal", u, v, 0.11, 0.08, 0.16, 0.14, { color: PALETTE.gunmetal });
}

/** Floor / wall vent grille: dark recess with slats. Built through a frame at (u, v, n). */
export function ventGrille(frame, u, v, w, h, n = 0.02) {
  frame.box("paintedMetal", u, v, n, w, h, 0.04, { color: PALETTE.impBlack, texel: 2 });
  const slats = Math.max(3, Math.floor(h / 0.06));
  for (let s = 0; s < slats; s++) {
    const sv = v - h / 2 + 0.04 + (s / Math.max(1, slats - 1)) * (h - 0.08);
    frame.box("metal", u, sv, n + 0.025, w - 0.08, 0.018, 0.03, { color: PALETTE.impMid, tilt: 0.5 });
  }
}

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------
/**
 * Mess table 3.6 x 0.9 with two benches, long axis along X when yaw = 0. `props` adds trays / cups.
 */
export function messTable(kit, ctx, { x, z, yaw = 0, len = 3.6, seed = 1, props = true }) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = local(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const rand = rng(seed);
  const w = 0.9;
  const h = 0.76;
  // table top: dark gloss slab over a grey panel core, black pedestal legs
  add("impPanel1", new THREE.BoxGeometry(len, 0.05, w), 0, h - 0.025, 0, { color: PALETTE.impLight, uv: "keep" });
  add("darkGloss", new THREE.BoxGeometry(len - 0.08, 0.012, w - 0.08), 0, h + 0.006, 0);
  add("paintedMetal", new THREE.BoxGeometry(len + 0.02, 0.06, w + 0.02), 0, h - 0.08, 0, { color: PALETTE.impBlack, texel: 2 });
  for (const s of [-1, 1]) {
    add("paintedMetal", new THREE.BoxGeometry(0.12, h - 0.12, 0.5), s * (len / 2 - 0.4), (h - 0.12) / 2, 0, { color: PALETTE.impDark, texel: 2 });
    add("paintedMetal", new THREE.BoxGeometry(0.4, 0.06, 0.8), s * (len / 2 - 0.4), 0.03, 0, { color: PALETTE.impBlack, texel: 2 });
  }
  // benches: rubber pad on a grey box, black legs
  for (const s of [-1, 1]) {
    const bz = s * (w / 2 + 0.42);
    add("paintedMetal", new THREE.BoxGeometry(len - 0.3, 0.06, 0.36), 0, 0.42, bz, { color: PALETTE.impDark, texel: 2 });
    add("rubber", new THREE.BoxGeometry(len - 0.34, 0.05, 0.32), 0, 0.475, bz, { color: PALETTE.rubber });
    for (const e of [-1, 1]) add("paintedMetal", new THREE.BoxGeometry(0.08, 0.4, 0.3), e * (len / 2 - 0.5), 0.2, bz, { color: PALETTE.impBlack, texel: 2 });
    add("paintedMetal", new THREE.BoxGeometry(len - 1.1, 0.04, 0.05), 0, 0.12, bz, { color: PALETTE.impMid, texel: 2 });
  }
  if (props) {
    const n = 1 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const tx = -len / 2 + 0.5 + rand() * (len - 1.0);
      const tz = (rand() < 0.5 ? -1 : 1) * (0.12 + rand() * 0.12);
      if (rand() < 0.6) {
        // ration tray with two compartments
        add("paintedMetal", new THREE.BoxGeometry(0.42, 0.03, 0.3), tx, h + 0.03, tz, { color: PALETTE.impMid, texel: 3 });
        add("darkGloss", new THREE.BoxGeometry(0.16, 0.016, 0.2), tx - 0.1, h + 0.05, tz);
        add("darkGloss", new THREE.BoxGeometry(0.14, 0.016, 0.2), tx + 0.11, h + 0.05, tz);
      } else {
        // cup
        const p = local(tx, h + 0.06, tz);
        kit.cyl("metal", p.x, p.y, p.z, 0.04, 0.1, "y", { color: rand() < 0.5 ? PALETTE.steel : PALETTE.impDark, segments: 10 });
      }
    }
  }
  // colliders (rotated footprint bound): table + both benches as one low block each
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const fw = len;
  const fd = w + 1.2;
  const ex = (fw * c + fd * s) / 2;
  const ez = (fw * s + fd * c) / 2;
  kit.collider([x - ex, 0, z - ez], [x + ex, 0.5, z + ez], "bench");
  const tx2 = (fw * c + w * s) / 2;
  const tz2 = (fw * s + w * c) / 2;
  kit.collider([x - tx2, 0, z - tz2], [x + tx2, h + 0.02, z + tz2], "table");
}

/**
 * Personnel locker column: `n` lockers wide, two stacked doors each, on a wall-facing frame.
 * Placed with its back at (x, z), facing yaw (0 → doors face +Z).
 */
export function lockerBank(kit, ctx, { x, z, yaw = 0, n = 3, w = 0.5, h = 2.0, d = 0.55, seed = 3, color = PALETTE.impGrey, lamp = "emitBlue" }) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = local(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const rand = rng(seed);
  const total = n * w;
  add("paintedMetal", new THREE.BoxGeometry(total + 0.04, h, d), 0, h / 2, d / 2, { color: PALETTE.impDark, texel: 1.5 });
  add("paintedMetal", new THREE.BoxGeometry(total + 0.08, 0.1, d + 0.04), 0, 0.05, d / 2, { color: PALETTE.impBlack, texel: 2 });
  for (let i = 0; i < n; i++) {
    const lx = -total / 2 + (i + 0.5) * w;
    const col = rand() < 0.12 ? PALETTE.impMid : color;
    for (let k = 0; k < 2; k++) {
      const y0 = 0.12 + k * (h - 0.12) / 2;
      const dh = (h - 0.12) / 2 - 0.03;
      add("impPanel", new THREE.BoxGeometry(w - 0.04, dh, 0.02), lx, y0 + dh / 2, d + 0.01, { color: col, uv: "keep" });
      // recessed pull + vent slots + a name plate
      add("paintedMetal", new THREE.BoxGeometry(0.03, 0.16, 0.02), lx + w * 0.3, y0 + dh * 0.5, d + 0.025, { color: PALETTE.impBlack, texel: 2 });
      for (let s = 0; s < 4; s++) add("paintedMetal", new THREE.BoxGeometry(w * 0.5, 0.012, 0.01), lx - w * 0.1, y0 + dh - 0.12 - s * 0.04, d + 0.026, { color: PALETTE.impBlack, texel: 2 });
      add("darkGloss", new THREE.BoxGeometry(w * 0.5, 0.06, 0.006), lx - w * 0.1, y0 + 0.16, d + 0.024);
      add(rand() < 0.85 ? lamp : "emitRed", new THREE.BoxGeometry(0.03, 0.03, 0.006), lx - w * 0.3, y0 + 0.16, d + 0.03);
    }
  }
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const cx = local(0, 0, d / 2);
  const ex = (total * c + d * s) / 2 + 0.03;
  const ez = (total * s + d * c) / 2 + 0.03;
  kit.collider([cx.x - ex, 0, cx.z - ez], [cx.x + ex, h, cx.z + ez], "locker");
}

/** Valve wheel (torus + spokes) on a stem at (x,y,z), axis 'x'|'y'|'z'. */
export function valveWheel(kit, x, y, z, r = 0.14, axis = "y", color = PALETTE.impRed) {
  const rot = axis === "y" ? [Math.PI / 2, 0, 0] : axis === "x" ? [0, Math.PI / 2, 0] : [0, 0, 0];
  kit.add("paintedMetal", new THREE.TorusGeometry(r, r * 0.12, 8, 20), { pos: [x, y, z], rot, color, texel: 3 });
  const t = r * 0.12;
  for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
    // spokes lie in the wheel plane
    const g = axis === "x" ? new THREE.BoxGeometry(t, r * 2, t) : new THREE.BoxGeometry(r * 2, t, t);
    const e = axis === "y" ? [0, a, 0] : axis === "x" ? [a, 0, 0] : [0, 0, a];
    kit.add("metal", g, { pos: [x, y, z], rot: e, color: PALETTE.steel });
  }
  const stemLen = r * 0.9;
  kit.cyl("metal", x, y, z, r * 0.15, stemLen, axis, { color: PALETTE.gunmetal, segments: 8 });
}

/** Small gauge: dark bezel with a lit face (screen material) on a frame at (u, v, n). */
export function gauge(frame, u, v, n, r = 0.1, screen = "impScreen1") {
  frame.cylN("paintedMetal", u, v, n + 0.02, r + 0.02, 0.04, { color: PALETTE.impBlack, segments: 16 });
  const g = new THREE.CircleGeometry(r, 16);
  frame.add(screen, g, u, v, n + 0.045, { uv: "keep" });
}

/** Wall-mounted intercom / keypad box on a frame. */
export function intercom(frame, u, v, n = 0.02) {
  frame.box("paintedMetal", u, v, n + 0.03, 0.18, 0.28, 0.06, { color: PALETTE.impDark, texel: 2 });
  for (let k = 0; k < 5; k++) frame.box("paintedMetal", u, v + 0.09 - k * 0.022, n + 0.062, 0.12, 0.008, 0.004, { color: PALETTE.impBlack, texel: 2 });
  frame.box("emitBlue", u - 0.05, v - 0.08, n + 0.062, 0.03, 0.03, 0.006);
  frame.box("rubber", u + 0.04, v - 0.08, n + 0.065, 0.05, 0.03, 0.01, { color: PALETTE.rubber });
}

/** Stool: black pedestal, round rubber seat. */
export function stool(kit, x, z, h = 0.47) {
  kit.cyl("metal", x, 0.02, z, 0.19, 0.04, "y", { color: PALETTE.impBlack, segments: 14 });
  kit.cyl("metal", x, h / 2, z, 0.04, h - 0.06, "y", { color: PALETTE.impMid, segments: 8 });
  kit.cyl("rubber", x, h, z, 0.19, 0.07, "y", { color: PALETTE.rubber, segments: 16 });
  kit.collider([x - 0.2, 0, z - 0.2], [x + 0.2, h + 0.04, z + 0.2], "stool");
}

/** Simple wall shelf with a lip on a frame; returns the frame for stacking props. */
export function wallShelf(frame, u, v, w, depth = 0.3) {
  frame.box("paintedMetal", u, v, depth / 2, w, 0.03, depth, { color: PALETTE.impMid, texel: 2 });
  frame.box("paintedMetal", u, v + 0.03, depth - 0.01, w, 0.04, 0.02, { color: PALETTE.impDark, texel: 2 });
  for (const s of [-1, 1]) frame.box("paintedMetal", u + s * (w / 2 - 0.05), v - 0.06, depth * 0.45, 0.04, 0.1, depth * 0.9, { color: PALETTE.impDark, texel: 2 });
}

/** Quaternion helper for props built around a yaw. */
export function yawQuat(yaw) {
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
}

/**
 * Local prop frame rotated by yaw about (x, y, z): at(lx,ly,lz) → world Vector3; add / box / cyl build
 * through the kit in local coordinates; collider(lx0, lz0, lx1, lz1, h, tag) is the rotated AABB.
 */
export function propFrame(kit, x, z, yaw = 0, y = 0) {
  const q = yawQuat(yaw);
  const origin = new THREE.Vector3(x, y, z);
  const at = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(origin);
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = at(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: extra.quat || q, ...extra });
  };
  const box = (mat, lx, ly, lz, sx, sy, sz, extra = {}) => add(mat, new THREE.BoxGeometry(sx, sy, sz), lx, ly, lz, extra);
  // cylinder along a local axis ("x" | "y" | "z")
  const cyl = (mat, lx, ly, lz, r, len, axis = "y", extra = {}) => {
    const g = new THREE.CylinderGeometry(r, r, len, extra.segments || 12, 1, extra.open || false);
    if (axis === "x") g.rotateZ(Math.PI / 2);
    else if (axis === "z") g.rotateX(Math.PI / 2);
    const { segments, open, ...rest } = extra;
    return add(mat, g, lx, ly, lz, { uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
  };
  const collider = (lx0, lz0, lx1, lz1, h, tag, y0 = 0) => {
    const c = [at(lx0, 0, lz0), at(lx1, 0, lz0), at(lx0, 0, lz1), at(lx1, 0, lz1)];
    const xs = c.map((p) => p.x);
    const zs = c.map((p) => p.z);
    kit.collider([Math.min(...xs), y + y0, Math.min(...zs)], [Math.max(...xs), y + h, Math.max(...zs)], tag);
  };
  return { q, at, add, box, cyl, collider };
}

export { X_AXIS };
