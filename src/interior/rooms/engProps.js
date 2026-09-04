// Engineering-deck prop kit: industrial Imperial details shared by the Deck 4 rooms (engineering
// control, hyperdrive, maintenance, cargo, reactor). Darker panel mixes, amber work lights, red hazard
// trim, cable trays, vents, tanks, shelving, bar gauges and pulsing emissive materials.
//
// All positions are deck-local metres (floor at y = 0 unless stated). Helpers add merged geometry
// through `kit`; anything animated goes through `ctx.mesh` / `ctx.anim`.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { rng } from "../../kit.js";
import { decalRect, GRATE_TILE, makeCanvas, toTexture } from "../../textures.js";
import { wallFrame, pointLight } from "../builders.js";
import { wallSegment } from "../imperial.js";

// hazard stripes: one tile per metre (texel 1). Finer tilings alias into orange dots at distance.
export const HAZARD_TEXEL = 1;

// Darker Imperial panel mixes for the working decks
export const ENG_PAINTS = [
  [PALETTE.impGrey, 0.42],
  [PALETTE.impMid, 0.3],
  [PALETTE.impLight, 0.14],
  [PALETTE.impDark, 0.14],
];
export const ENG_PAINTS_DARK = [
  [PALETTE.impMid, 0.45],
  [PALETTE.impDark, 0.35],
  [PALETTE.impGrey, 0.2],
];
export const ENG_CEIL_PAINTS = [
  [PALETTE.impGrey, 0.45],
  [PALETTE.impMid, 0.4],
  [PALETTE.impDark, 0.15],
];
export const ENG_STYLES = { panel: 0.5, vent: 0.12, greeble: 0.14, strip: 0.08, screen: 0.06, conduit: 0.1 };
export const ENG_THEME = { accent: "emitAmber", accent2: "emitRed", pipeCol: PALETTE.impAmber, screenMats: ["impScreen1", "impScreen4", "impScreen1"] };

export const AMBER = 0xffa64d;
export const AMBER_DEEP = 0xff8a2a;
export const COOL = 0xdfe9ff;
export const BLUE = 0x6fb4ff;
export const RED = 0xff3a2a;

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
/** Clone an emissive kit material under `key` (guarded) with its own colour / intensity. */
export function emitMat(ctx, key, hex, intensity = 2.4, base = "emitBlue") {
  if (!ctx.materials[key]) {
    const m = ctx.materials[base].clone();
    m.emissive = new THREE.Color(hex);
    m.emissiveIntensity = intensity;
    ctx.materials[key] = m;
  }
  return ctx.materials[key];
}

/**
 * One-off emissive canvas material under `key` (guarded): `draw(g, w, h)` paints a w×h canvas that
 * becomes the emissive map (black diffuse). Used for the big status boards and job boards.
 */
export function canvasEmitMat(ctx, key, w, h, draw, { intensity = 1.3 } = {}) {
  if (!ctx.materials[key]) {
    const c = makeCanvas(w, h);
    const g = c.getContext("2d");
    draw(g, w, h);
    ctx.materials[key] = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: toTexture(c, { srgb: true, wrap: false }), emissiveIntensity: intensity, roughness: 0.2, metalness: 0 });
  }
  return ctx.materials[key];
}

const MONO = '"DejaVu Sans Mono", "Liberation Mono", Menlo, Consolas, monospace';
const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

/**
 * Master systems display: one continuous schematic board (ship profile with subsystem nodes, a
 * power-flow diagram and a column of bar gauges) rather than a grid of small monitors.
 */
export function statusBoardMat(ctx, key = "eng_board", { accent = "#ffb347", cool = "#4a9dff", warn = "#ff4136", seed = 7, intensity = 1.25 } = {}) {
  return canvasEmitMat(
    ctx,
    key,
    2048,
    624,
    (g, w, h) => {
      const rand = rng(seed);
      g.fillStyle = "#04070c";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = rgba(accent, 0.07);
      g.lineWidth = 1;
      for (let x = 0; x < w; x += 32) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, h);
        g.stroke();
      }
      for (let y = 0; y < h; y += 32) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
      }
      const text = (s, x, y, px, color, align = "left") => {
        g.fillStyle = color;
        g.font = `bold ${px}px ${MONO}`;
        g.textAlign = align;
        g.textBaseline = "middle";
        g.fillText(s, x, y);
      };
      // header
      g.fillStyle = accent;
      g.fillRect(28, 26, w - 56, 4);
      text("MASTER SYSTEMS DISPLAY", 40, 62, 40, accent);
      text("ISD VIGILANCE  ·  DECK 04  ·  ENGINEERING CONTROL", w - 40, 62, 26, rgba(accent, 0.75), "right");
      g.fillStyle = rgba(accent, 0.5);
      for (let k = 0; k < 8; k++) g.fillRect(760 + k * 46, 52, 30, 18);
      g.fillStyle = warn;
      g.fillRect(760 + 5 * 46, 52, 30, 18);
      g.fillRect(28, 88, w - 56, 2);

      // left column: subsystem bar gauges
      const rows = ["REACTOR", "HYPERDRIVE", "SUBLIGHT", "SHIELDS", "TURBOLASERS", "TRACTOR", "LIFE SUPPORT", "SENSORS", "COMMS", "GRAVITY"];
      const lx = 40;
      const lw = 470;
      rows.forEach((name, i) => {
        const y = 128 + i * 47;
        text(name, lx, y, 21, rgba(accent, 0.85));
        g.fillStyle = rgba(accent, 0.18);
        g.fillRect(lx + 200, y - 10, lw - 200, 20);
        const f = [0.98, 0.12, 0.74, 1.0, 0.66, 0.3, 0.92, 0.81, 0.58, 1.0][i];
        g.fillStyle = f < 0.2 ? cool : f > 0.95 ? accent : rgba(accent, 0.8);
        g.fillRect(lx + 200, y - 10, (lw - 200) * f, 20);
        for (let k = 1; k < 10; k++) {
          g.fillStyle = "#04070c";
          g.fillRect(lx + 200 + ((lw - 200) * k) / 10 - 1, y - 10, 2, 20);
        }
        text(`${Math.round(f * 100)}%`.padStart(4), lx + lw + 12, y, 19, f < 0.2 ? cool : rgba(accent, 0.9));
      });
      g.fillStyle = rgba(accent, 0.35);
      g.fillRect(lx + lw + 80, 100, 2, h - 150);

      // centre: ship side-profile schematic with subsystem nodes
      const cx = 1130;
      const cy = 330;
      const S = 3.6;
      g.strokeStyle = accent;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(cx - 140 * S, cy + 8 * S); // bow
      g.lineTo(cx + 95 * S, cy - 22 * S); // top deck aft
      g.lineTo(cx + 112 * S, cy - 22 * S);
      g.lineTo(cx + 112 * S, cy + 28 * S); // stern
      g.lineTo(cx + 60 * S, cy + 36 * S);
      g.lineTo(cx - 60 * S, cy + 24 * S);
      g.closePath();
      g.stroke();
      // tower + bridge
      g.beginPath();
      g.moveTo(cx + 50 * S, cy - 22 * S);
      g.lineTo(cx + 52 * S, cy - 44 * S);
      g.lineTo(cx + 84 * S, cy - 44 * S);
      g.lineTo(cx + 86 * S, cy - 22 * S);
      g.moveTo(cx + 58 * S, cy - 44 * S);
      g.lineTo(cx + 60 * S, cy - 52 * S);
      g.lineTo(cx + 78 * S, cy - 52 * S);
      g.lineTo(cx + 80 * S, cy - 44 * S);
      g.stroke();
      // engines
      g.lineWidth = 2;
      for (const ey of [-8, 4, 16]) {
        g.beginPath();
        g.rect(cx + 112 * S, cy + (ey - 5) * S, 9 * S, 10 * S);
        g.stroke();
        g.fillStyle = rgba(cool, 0.75);
        g.fillRect(cx + 121 * S, cy + (ey - 3) * S, 4 * S, 6 * S);
      }
      // hangar cut-out and deck lines
      g.strokeStyle = rgba(accent, 0.45);
      g.beginPath();
      g.moveTo(cx - 40 * S, cy + 28 * S);
      g.lineTo(cx + 10 * S, cy + 34 * S);
      g.moveTo(cx - 120 * S, cy + 6 * S);
      g.lineTo(cx + 100 * S, cy - 14 * S);
      g.moveTo(cx - 100 * S, cy + 14 * S);
      g.lineTo(cx + 100 * S, cy + 0 * S);
      g.stroke();
      // nodes with leader lines and label blocks
      const nodes = [
        [cx + 40 * S, cy + 6 * S, "REACTOR", 0.98, accent, cx + 20 * S, cy + 70 * S],
        [cx + 90 * S, cy + 6 * S, "HYPERDRIVE", 0.12, cool, cx + 130 * S, cy + 70 * S],
        [cx + 68 * S, cy - 48 * S, "BRIDGE", 1.0, accent, cx + 130 * S, cy - 64 * S],
        [cx - 20 * S, cy - 4 * S, "SHIELD GEN", 1.0, accent, cx - 60 * S, cy - 62 * S],
        [cx - 90 * S, cy + 6 * S, "FWD BATTERY", 0.66, warn, cx - 150 * S, cy - 40 * S],
        [cx - 15 * S, cy + 30 * S, "HANGAR", 0.92, accent, cx - 90 * S, cy + 70 * S],
      ];
      for (const [nx, ny, label, f, col, tx, ty] of nodes) {
        g.strokeStyle = rgba(col, 0.7);
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(nx, ny);
        g.lineTo(tx, ty);
        g.stroke();
        g.fillStyle = col;
        g.beginPath();
        g.arc(nx, ny, 9, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = col;
        g.beginPath();
        g.arc(nx, ny, 16, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = "#04070c";
        g.fillRect(tx - 90, ty - 22, 180, 44);
        g.strokeStyle = rgba(col, 0.8);
        g.strokeRect(tx - 90, ty - 22, 180, 44);
        text(label, tx, ty - 8, 17, col, "center");
        g.fillStyle = rgba(col, 0.25);
        g.fillRect(tx - 78, ty + 6, 156, 8);
        g.fillStyle = col;
        g.fillRect(tx - 78, ty + 6, 156 * f, 8);
      }

      // right column: power-flow diagram
      const rx = 1690;
      const box = (x, y, bw, bh, label, col) => {
        g.fillStyle = rgba(col, 0.12);
        g.fillRect(x - bw / 2, y - bh / 2, bw, bh);
        g.strokeStyle = col;
        g.lineWidth = 2;
        g.strokeRect(x - bw / 2, y - bh / 2, bw, bh);
        text(label, x, y, 18, col, "center");
      };
      const line = (x0, y0, x1, y1, col) => {
        g.strokeStyle = rgba(col, 0.7);
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
      };
      text("POWER DISTRIBUTION", rx + 120, 120, 22, rgba(accent, 0.85), "center");
      box(rx + 120, 175, 220, 46, "MAIN REACTOR", accent);
      line(rx + 120, 198, rx + 120, 250, accent);
      box(rx + 120, 272, 260, 44, "DISTRIBUTION BUS", accent);
      const outs = [
        ["SUBLIGHT", cool],
        ["SHIELDS", accent],
        ["WEAPONS", warn],
        ["HYPERDRIVE", cool],
        ["LIFE SUP.", accent],
      ];
      outs.forEach(([lab, col], i) => {
        const y = 340 + i * 52;
        line(rx + 40, 294, rx + 40, y, col);
        line(rx + 40, y, rx + 70, y, col);
        box(rx + 150, y, 160, 36, lab, col);
        g.fillStyle = rgba(col, 0.3);
        g.fillRect(rx + 240, y - 8, 80, 16);
        g.fillStyle = col;
        g.fillRect(rx + 240, y - 8, 80 * (0.3 + rand() * 0.7), 16);
      });

      // footer readouts
      g.fillStyle = rgba(accent, 0.35);
      g.fillRect(28, h - 46, w - 56, 2);
      for (let k = 0; k < 12; k++) {
        g.fillStyle = k === 7 ? warn : rgba(accent, 0.55);
        g.fillRect(40 + k * 164, h - 32, 110, 12);
      }
      // scanlines
      g.fillStyle = "rgba(0,0,0,0.22)";
      for (let yy = 0; yy < h; yy += 3) g.fillRect(0, yy, w, 1);
    },
    { intensity },
  );
}

/** Work-order / job board: amber header, rows of order ids, description bars and status squares. */
export function jobBoardMat(ctx, key = "eng_jobs", { title = "WORK ORDERS  ·  BAY 04", accent = "#ffb347", seed = 3, intensity = 1.2 } = {}) {
  return canvasEmitMat(
    ctx,
    key,
    1024,
    512,
    (g, w, h) => {
      const rand = rng(seed);
      g.fillStyle = "#05070b";
      g.fillRect(0, 0, w, h);
      g.fillStyle = accent;
      g.fillRect(20, 18, w - 40, 3);
      g.font = `bold 34px ${MONO}`;
      g.textBaseline = "middle";
      g.textAlign = "left";
      g.fillText(title, 30, 52);
      g.fillStyle = rgba(accent, 0.6);
      g.fillRect(20, 80, w - 40, 2);
      const cols = ["#4cff88", accent, "#ff4136"];
      for (let i = 0; i < 9; i++) {
        const y = 112 + i * 43;
        g.fillStyle = rgba(accent, 0.85);
        g.font = `bold 22px ${MONO}`;
        g.fillText(`WO-${(4100 + Math.floor(rand() * 800)).toString()}`, 30, y);
        g.fillStyle = rgba(accent, 0.3);
        g.fillRect(200, y - 8, 520, 16);
        g.fillStyle = rgba(accent, 0.75);
        g.fillRect(200, y - 8, 120 + rand() * 380, 16);
        const st = rand() < 0.5 ? 0 : rand() < 0.7 ? 1 : 2;
        g.fillStyle = cols[st];
        g.fillRect(760, y - 12, 24, 24);
        g.fillStyle = rgba(accent, 0.5);
        g.fillRect(810, y - 6, 60 + rand() * 120, 12);
      }
      g.fillStyle = "rgba(0,0,0,0.22)";
      for (let yy = 0; yy < h; yy += 3) g.fillRect(0, yy, w, 1);
    },
    { intensity },
  );
}

/**
 * A ring of `n` emissive materials whose intensities are phase-shifted along a travelling pulse.
 * Returns { keys, update(t) }. Geometry assigned to keys[i % n] along a length reads as energy
 * flowing along it once update() runs from ctx.anim.
 */
export function pulseSet(ctx, prefix, hex, n = 6, { min = 0.5, max = 3.2, speed = 2.2, base = "emitBlue" } = {}) {
  const keys = [];
  for (let i = 0; i < n; i++) keys.push(prefix + i);
  const mats = keys.map((k) => emitMat(ctx, k, hex, min, base));
  return {
    keys,
    mats,
    update(t) {
      for (let i = 0; i < n; i++) {
        const ph = Math.sin(t * speed - (i / n) * Math.PI * 2);
        const k = Math.pow(Math.max(0, ph), 3);
        mats[i].emissiveIntensity = min + (max - min) * k;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Overhead: cable trays, pipes, vents, hanging work lights, crane rails
// ---------------------------------------------------------------------------
/**
 * Cable tray along a straight run between two points at height y: a dark U-channel with side lips,
 * bundled cables inside and hanger rods up to `ceil`.
 */
export function cableTray(kit, [x0, z0], [x1, z1], y, { w = 0.5, ceil = null, cables = 4, seed = 3, color = PALETTE.impDark } = {}) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz);
  const rot = [0, ang, 0];
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const rand = rng(seed);
  kit.add("paintedMetal", new THREE.BoxGeometry(w, 0.05, len), { pos: [cx, y, cz], rot, color, texel: 2 });
  for (const s of [-1, 1]) kit.add("paintedMetal", new THREE.BoxGeometry(0.04, 0.16, len), { pos: [cx + Math.cos(ang) * s * (w / 2), y + 0.08, cz - Math.sin(ang) * s * (w / 2)], rot, color, texel: 2 });
  // cross rungs
  const nr = Math.max(2, Math.round(len / 0.6));
  for (let i = 0; i <= nr; i++) {
    const t = i / nr;
    kit.add("metal", new THREE.BoxGeometry(w - 0.02, 0.03, 0.04), { pos: [x0 + dx * t, y + 0.03, z0 + dz * t], rot, color: PALETTE.gunmetal });
  }
  // cables: a few thick runs lying in the tray
  const cols = [PALETTE.rubber, PALETTE.impBlack, PALETTE.impAmber, PALETTE.impMid];
  for (let i = 0; i < cables; i++) {
    const r = 0.025 + rand() * 0.03;
    const off = (i / Math.max(1, cables - 1) - 0.5) * (w - 0.16);
    const g = new THREE.CylinderGeometry(r, r, len - 0.05, 8);
    g.rotateX(Math.PI / 2);
    kit.add(i % 3 === 1 ? "metal" : "rubber", g, { pos: [cx + Math.cos(ang) * off, y + 0.04 + r, cz - Math.sin(ang) * off], rot, color: cols[Math.floor(rand() * cols.length)], uv: "scale", uvScale: [0.3, len] });
  }
  // hangers
  if (ceil !== null && ceil > y + 0.1) {
    const nh = Math.max(2, Math.round(len / 3.2));
    for (let i = 0; i <= nh; i++) {
      const t = nh === 0 ? 0.5 : i / nh;
      const px = x0 + dx * t;
      const pz = z0 + dz * t;
      kit.box("metal", px, (y + ceil) / 2 + 0.04, pz, 0.04, ceil - y - 0.08, 0.04, { color: PALETTE.steel });
      kit.box("paintedMetal", px, ceil - 0.03, pz, 0.24, 0.06, 0.24, { color: PALETTE.impBlack, texel: 2 });
    }
  }
}

/** Large wall vent grille with angled slats, an amber status lamp and grime frame. */
export function wallVent(kit, ctx, side, u, v, w = 1.6, h = 0.9, { bounds = ctx.bounds, slats = null, lamp = "emitAmber" } = {}) {
  const seg = wallSegment(bounds, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, bounds[0][1]);
  frame.box("paintedMetal", u, v, 0.05, w + 0.16, h + 0.16, 0.1, { color: PALETTE.impDark, texel: 2 });
  frame.box("metal", u, v, 0.07, w, h, 0.06, { color: PALETTE.impBlack });
  const n = slats ?? Math.max(3, Math.floor(h / 0.12));
  for (let i = 0; i < n; i++) {
    const sv = v - h / 2 + 0.08 + (i / Math.max(1, n - 1)) * (h - 0.16);
    frame.box("metal", u, sv, 0.1, w - 0.1, 0.03, 0.09, { color: PALETTE.slate, tilt: 0.6 });
  }
  frame.box("metal", u - w / 2 + 0.1, v, 0.1, 0.06, h - 0.05, 0.02, { color: PALETTE.gunmetal });
  frame.box("metal", u + w / 2 - 0.1, v, 0.1, 0.06, h - 0.05, 0.02, { color: PALETTE.gunmetal });
  frame.box(lamp, u + w / 2 + 0.03, v + h / 2 + 0.03, 0.105, 0.05, 0.05, 0.01);
}

/** Stencil decal on a wall (decal sheet cell `idx`). */
export function wallStencil(kit, ctx, side, u, v, size, idx, { bounds = ctx.bounds, n = 0.012 } = {}) {
  const seg = wallSegment(bounds, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, bounds[0][1]);
  frame.add("decal", new THREE.PlaneGeometry(size, size), u, v, n, { uv: "keep", uvRect: decalRect(idx) });
}

/** Stencil decal lying on the floor (or any horizontal surface at y). */
export function floorStencil(kit, x, z, size, idx, yaw = 0, y = 0.006) {
  const g = new THREE.PlaneGeometry(size, size);
  g.rotateX(-Math.PI / 2);
  g.rotateY(yaw);
  kit.add("decal", g, { pos: [x, y, z], uv: "keep", uvRect: decalRect(idx) });
}

/** Thin painted line on the floor (lane markings): from (x0,z0) to (x1,z1). */
export function floorLine(kit, x0, z0, x1, z1, { w = 0.12, mat = "paintedMetal", color = PALETTE.impAmber, y = 0.004 } = {}) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz);
  kit.add(mat, new THREE.BoxGeometry(w, 0.006, len), { pos: [(x0 + x1) / 2, y, (z0 + z1) / 2], rot: [0, ang, 0], color, texel: 3 });
}

/**
 * Hazard-stripe border rectangle on the floor around x0..x1, z0..z1 (band `w` wide, outside the
 * rect). Coarse tiling (HAZARD_TEXEL) so the stripes stay stripes at distance; use sparingly — a
 * painted `floorBorder` is the quieter default for keep-clear zones.
 */
export function hazardBorder(kit, x0, z0, x1, z1, w = 0.3, y = 0.004) {
  const t = HAZARD_TEXEL;
  kit.boxMM("hazard", [x0 - w, y - 0.004, z0 - w], [x1 + w, y, z0], { texel: t });
  kit.boxMM("hazard", [x0 - w, y - 0.004, z1], [x1 + w, y, z1 + w], { texel: t });
  kit.boxMM("hazard", [x0 - w, y - 0.004, z0], [x0, y, z1], { texel: t });
  kit.boxMM("hazard", [x1, y - 0.004, z0], [x1 + w, y, z1], { texel: t });
}

/** Plain painted border line (amber by default) around a floor rectangle: the quiet keep-clear mark. */
export function floorBorder(kit, x0, z0, x1, z1, { w = 0.1, color = PALETTE.impAmber, mat = "paintedMetal", y = 0.004 } = {}) {
  floorLine(kit, x0, z0, x1, z0, { w, color, mat, y });
  floorLine(kit, x0, z1, x1, z1, { w, color, mat, y });
  floorLine(kit, x0, z0, x0, z1, { w, color, mat, y });
  floorLine(kit, x1, z0, x1, z1, { w, color, mat, y });
}

/** Dark, glossy spill on the floor: a few overlapping flattened discs. */
export function oilStain(kit, x, z, r = 0.6, seed = 5) {
  const rand = rng(seed);
  const n = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const rr = r * (0.35 + rand() * 0.6);
    const g = new THREE.CylinderGeometry(rr, rr, 0.004, 14);
    g.scale(1, 1, 0.55 + rand() * 0.6);
    kit.add("darkGloss", g, { pos: [x + (rand() - 0.5) * r * 1.1, 0.003 + i * 0.0005, z + (rand() - 0.5) * r * 1.1], rot: [0, rand() * Math.PI, 0] });
  }
}

/**
 * Hanging work light: cable from the ceiling, a boxy industrial housing with a soft emissive
 * diffuser underneath and an amber tell-tale. Optionally registers the real point light.
 */
export function workLight(kit, ctx, x, y, z, { ceil, color = COOL, intensity = 6, distance = 11, light = true, w = 0.9, d = 0.35, emit = "emitWhiteSoft" } = {}) {
  if (ceil !== undefined && ceil > y) {
    kit.box("rubber", x, (y + ceil) / 2 + 0.1, z, 0.03, ceil - y - 0.2, 0.03, { color: PALETTE.rubber });
    kit.box("paintedMetal", x, ceil - 0.04, z, 0.3, 0.08, 0.3, { color: PALETTE.impBlack, texel: 2 });
  }
  kit.box("paintedMetal", x, y + 0.1, z, w, 0.2, d, { color: PALETTE.impDark, texel: 2 });
  kit.box("metal", x, y + 0.22, z, w * 0.5, 0.06, d * 0.5, { color: PALETTE.gunmetal });
  kit.box(emit, x, y - 0.005, z, w - 0.1, 0.02, d - 0.1, { uv: "keep" });
  kit.box("emitAmber", x + w / 2 - 0.06, y + 0.12, z + d / 2 + 0.006, 0.05, 0.03, 0.01);
  if (light) ctx.light(pointLight(color, intensity, distance, [x, y - 0.3, z]));
}

/** Wall-mounted red rotating-beacon style warning lamp (dome + cage). */
export function warningLamp(kit, x, y, z, { mat = "emitRed", r = 0.12 } = {}) {
  kit.box("paintedMetal", x, y - r * 0.9, z, r * 2.6, 0.08, r * 2.6, { color: PALETTE.impBlack, texel: 2 });
  kit.add(mat, new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, y - r * 0.85, z] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    kit.box("metal", x + Math.cos(a) * r * 1.05, y - r * 0.4, z + Math.sin(a) * r * 1.05, 0.015, r * 1.1, 0.015, { color: PALETTE.steel });
  }
}

/** Overhead crane rail: an I-beam along x (or z) at height y with support brackets to the ceiling. */
export function craneRail(kit, a0, a1, fixed, y, { axis = "x", ceil = null, color = PALETTE.impAmber, seed = 1 } = {}) {
  const len = a1 - a0;
  const c = (a0 + a1) / 2;
  const sz = (l, h, t) => (axis === "x" ? [l, h, t] : [t, h, l]);
  const pos = (yy) => (axis === "x" ? [c, yy, fixed] : [fixed, yy, c]);
  kit.box("paintedMetal", ...pos(y), ...sz(len, 0.06, 0.5), { color, texel: 1.5 });
  kit.box("paintedMetal", ...pos(y + 0.3), ...sz(len, 0.5, 0.08), { color: PALETTE.impDark, texel: 1.5 });
  kit.box("paintedMetal", ...pos(y + 0.6), ...sz(len, 0.06, 0.5), { color, texel: 1.5 });
  if (ceil !== null) {
    const n = Math.max(2, Math.round(len / 5));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * len;
      const p = axis === "x" ? [a, 0, fixed] : [fixed, 0, a];
      kit.box("paintedMetal", p[0], (y + 0.63 + ceil) / 2, p[2], 0.14, ceil - y - 0.63, 0.14, { color: PALETTE.impDark, texel: 2 });
      kit.box("paintedMetal", p[0], ceil - 0.04, p[2], 0.5, 0.08, 0.5, { color: PALETTE.impBlack, texel: 2 });
    }
  }
}

// ---------------------------------------------------------------------------
// Machinery and storage
// ---------------------------------------------------------------------------
/**
 * Vertical coolant / fuel tank: cylinder, domed top, bands, plinth, valve wheel(s), gauge(s). The
 * dressing varies per tank: `gauges` (1–3 dials), `valves` (1–2 wheels with pipe stubs), `ladder`
 * (rungs up one flank), `stripe` (a coloured content band under the dome), `inspect` (an open
 * inspection hatch with the door swung out and lit internals behind it).
 */
export function tank(kit, x, z, { r = 0.9, h = 3.6, y = 0, color = PALETTE.impMid, band = PALETTE.impDark, lamp = "emitBlue", seed = 2, label = 12, front = 1, gauges = 1, valves = 1, ladder = false, stripe = null, inspect = false, inspectMat = "emitBlueDim" } = {}) {
  kit.box("paintedMetal", x, y + 0.1, z, r * 2.3, 0.2, r * 2.3, { color: PALETTE.impBlack, texel: 2 });
  kit.box("paintedMetal", x, y + 0.2, z, r * 2.0, 0.02, r * 2.0, { color: PALETTE.impLight, texel: 2 });
  kit.cyl("paintedMetal", x, y + 0.2 + (h - r) / 2, z, r, h - r, "y", { color, segments: 28, texel: 0.8 });
  kit.add("paintedMetal", new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, y + 0.2 + h - r, z], color, uv: "scale", uvScale: [4, 2] });
  for (const f of [0.18, 0.5, 0.82]) kit.cyl("metal", x, y + 0.2 + (h - r) * f, z, r + 0.05, 0.14, "y", { color: band, segments: 28 });
  if (stripe) kit.cyl("paintedMetal", x, y + 0.2 + (h - r) * 0.93, z, r + 0.01, 0.22, "y", { color: stripe, segments: 28, texel: 1 });
  // top fittings
  kit.cyl("metal", x, y + 0.2 + h + 0.15, z, r * 0.25, 0.4, "y", { color: PALETTE.steel, segments: 12 });
  kit.box("paintedMetal", x, y + 0.2 + h + 0.4, z, r * 0.7, 0.14, r * 0.7, { color: PALETTE.impDark, texel: 2 });
  // gauges + valves on the front face (front = +1: +z, -1: -z)
  const f = front;
  const fz = z + f * (r + 0.02);
  const rotY = f > 0 ? 0 : Math.PI;
  const gw = 0.36 * gauges + 0.08 * (gauges - 1);
  kit.box("paintedMetal", x, y + 1.3, fz, gw, 0.5, 0.08, { color: PALETTE.impDark, texel: 2 });
  for (let i = 0; i < gauges; i++) {
    const gx = x - gw / 2 + 0.18 + i * 0.44;
    if (i % 2 === 0) kit.add("impScreen4", new THREE.PlaneGeometry(0.28, 0.16), { pos: [gx, y + 1.38, fz + f * 0.045], rot: [0, rotY, 0], uv: "keep" });
    else {
      // round dial: steel bezel, dark face, a needle
      kit.cyl("metal", gx, y + 1.38, fz + f * 0.05, 0.12, 0.03, "z", { color: PALETTE.steel, segments: 18 });
      kit.cyl("darkGloss", gx, y + 1.38, fz + f * 0.07, 0.095, 0.01, "z", { segments: 18 });
      kit.box("emitAmberDim", gx + 0.02, y + 1.4, fz + f * 0.078, 0.07, 0.012, 0.005, { rot: [0, 0, 0.7] });
    }
    kit.box(i === 1 ? "emitRed" : lamp, gx - 0.1, y + 1.14, fz + f * 0.045, 0.06, 0.04, 0.01);
    kit.box(i === 1 ? lamp : "emitRed", gx + 0.1, y + 1.14, fz + f * 0.045, 0.06, 0.04, 0.01);
  }
  for (let i = 0; i < valves; i++) {
    const vy = y + 0.75 - i * 0.02;
    const vx = x + (valves === 1 ? 0 : (i - 0.5) * 0.7);
    const wheel = new THREE.TorusGeometry(i === 0 ? 0.14 : 0.1, 0.02, 8, 20);
    kit.add("metal", wheel, { pos: [vx, vy, z + f * (r + 0.16)], color: i === 0 ? PALETTE.impRed : PALETTE.impAmber });
    kit.cyl("metal", vx, vy, z + f * (r + 0.1), 0.03, 0.16, "z", { color: PALETTE.steel });
    if (i === 1) {
      // second valve sits on a pipe stub that drops to the plinth
      kit.cyl("metal", vx, vy, z + f * (r + 0.05), 0.05, 0.14, "z", { color: PALETTE.impMid, segments: 10 });
      kit.cyl("metal", vx, (vy + y + 0.2) / 2, z + f * (r + 0.12), 0.04, vy - y - 0.2, "y", { color: PALETTE.impMid, segments: 10 });
    }
  }
  if (ladder) {
    const lx = x + r * 0.72;
    const lz = z - f * r * 0.7;
    for (const s of [-0.16, 0.16]) kit.box("metal", lx + s, y + 0.2 + (h - r) / 2, lz, 0.03, h - r, 0.03, { color: PALETTE.steel });
    for (let ry = y + 0.5; ry < y + h - r; ry += 0.3) kit.box("metal", lx, ry, lz, 0.32, 0.025, 0.025, { color: PALETTE.steel });
    kit.box("metal", lx, y + 0.2 + (h - r) / 2, lz + f * 0.1, 0.36, 0.03, 0.2, { color: PALETTE.gunmetal });
  }
  if (inspect) {
    // open inspection hatch: dark recess into the shell, lit coils behind, door swung out on hinges
    const hw = 0.7;
    const hh = 0.9;
    const hy = y + 2.35;
    kit.box("paintedMetal", x, hy, z + f * (r - 0.2), hw + 0.1, hh + 0.1, 0.5, { color: PALETTE.impBlack, texel: 2 });
    for (let i = 0; i < 4; i++) kit.cyl("metal", x - hw / 2 + 0.12 + i * 0.16, hy, z + f * (r - 0.12), 0.05, hh - 0.2, "y", { color: [PALETTE.steel, PALETTE.brass, PALETTE.gunmetal, PALETTE.steel][i], segments: 10 });
    kit.box(inspectMat, x, hy - hh / 2 + 0.08, z + f * (r - 0.08), hw - 0.16, 0.04, 0.02, { uv: "keep" });
    kit.box(inspectMat, x, hy + hh / 2 - 0.08, z + f * (r - 0.08), hw - 0.16, 0.04, 0.02, { uv: "keep" });
    const hinge = new THREE.Vector3(x + hw / 2 + 0.02, hy, z + f * (r + 0.03));
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -f * 1.75);
    const c = new THREE.Vector3(hw / 2, 0, 0).applyQuaternion(q).add(hinge);
    kit.add("paintedMetal", new THREE.BoxGeometry(hw, hh, 0.05), { pos: [c.x, c.y, c.z], quat: q, color, texel: 1 });
    kit.add("metal", new THREE.BoxGeometry(hw - 0.2, hh - 0.2, 0.02), { pos: [c.x, c.y, c.z], quat: q, color: PALETTE.gunmetal });
    for (const s of [-1, 1]) kit.box("metal", hinge.x, hy + s * (hh / 2 - 0.1), hinge.z, 0.06, 0.12, 0.06, { color: PALETTE.steel });
  }
  kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [x, y + (inspect ? 1.75 : 2.1), z + f * (r + 0.003)], rot: [0, rotY, 0], uv: "keep", uvRect: decalRect(label) });
  void seed;
  kit.collider([x - r - 0.1, y, z - r - 0.15], [x + r + 0.1, y + h + 0.6, z + r + 0.15], "tank");
}

/**
 * Free-standing cabinet / breaker panel: dark body, grey face plate, rows of lamps and switches,
 * a screen and a stencil. Faces +Z before `yaw`.
 */
export function cabinet(kit, x, z, { yaw = 0, w = 1.2, h = 2.2, d = 0.6, y = 0, seed = 4, lamp = "emitAmber", screen = 1, color = PALETTE.impDark } = {}) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = local(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const rand = rng(seed);
  add("paintedMetal", new THREE.BoxGeometry(w, h, d), 0, h / 2, 0, { color, texel: 1.5 });
  add("impPanel1", new THREE.BoxGeometry(w - 0.12, h - 0.3, 0.02), 0, h / 2 + 0.05, d / 2 + 0.005, { color: PALETTE.impMid, uv: "keep" });
  add("paintedMetal", new THREE.BoxGeometry(w, 0.08, d + 0.01), 0, 0.04, 0, { color: PALETTE.impBlack, texel: 2 });
  // lamp rows
  const rows = Math.floor((h - 0.9) / 0.32);
  for (let r = 0; r < rows; r++) {
    const ly = 0.55 + r * 0.32;
    add("metal", new THREE.BoxGeometry(w - 0.3, 0.22, 0.03), 0, ly, d / 2 + 0.02, { color: rand() < 0.5 ? PALETTE.impBlack : PALETTE.gunmetal });
    const nl = 2 + Math.floor(rand() * 5);
    for (let i = 0; i < nl; i++) {
      const m = rand() < 0.15 ? "emitRed" : rand() < 0.2 ? "emitGreen" : lamp;
      add(m, new THREE.BoxGeometry(0.05, 0.03, 0.01), -w / 2 + 0.25 + i * 0.1, ly + 0.05, d / 2 + 0.04);
    }
    if (rand() < 0.5) add("rubber", new THREE.BoxGeometry(0.08, 0.05, 0.04), w / 2 - 0.3, ly - 0.04, d / 2 + 0.05, { color: PALETTE.rubber });
  }
  if (screen !== null) {
    add("darkGloss", new THREE.BoxGeometry(w * 0.6, 0.34, 0.02), 0, h - 0.4, d / 2 + 0.02);
    add("impScreen" + (screen % 5), new THREE.PlaneGeometry(w * 0.56, 0.3), 0, h - 0.4, d / 2 + 0.035, { uv: "keep" });
  }
  add("decal", new THREE.PlaneGeometry(0.3, 0.3), w * 0.25, 0.32, d / 2 + 0.018, { uv: "keep", uvRect: decalRect(5 + Math.floor(rand() * 2)) });
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (w * c + d * s) / 2;
  const ez = (w * s + d * c) / 2;
  kit.collider([x - ex, y, z - ez], [x + ex, y + h, z + ez], "cabinet");
}

// container paint tones: [body, trim] — grey, dark, blue-grey, amber-brown, rust-red
export const CONTAINER_TONES = [
  [PALETTE.impMid, PALETTE.impDark],
  [PALETTE.impDark, PALETTE.impBlack],
  [PALETTE.hullDark, PALETTE.impDark],
  [PALETTE.impAmber.clone().multiplyScalar(0.5), PALETTE.impAmber.clone().multiplyScalar(0.3)],
  [PALETTE.impRed.clone().multiplyScalar(0.42), PALETTE.impRed.clone().multiplyScalar(0.22)],
  [PALETTE.impGrey, PALETTE.impMid],
];

/**
 * Shipping container: ribbed flanks, corner posts, a door end (two leaves, centre seam, latch bars
 * and handles) on the `face` (+1: +z, -1: -z) side, a label plate, a status lamp and — on some —
 * a hazard placard. `tone` indexes CONTAINER_TONES; no collider by default (racks carry their own).
 */
export function container(kit, { x, y = 0, z, sx = 1.2, sy = 1.0, sz = 1.2, yaw = 0, seed = 1, tone = null, face = 1, collide = false, ribs = true }) {
  const rand = rng(seed);
  const [body, trim] = CONTAINER_TONES[tone ?? Math.floor(rand() * CONTAINER_TONES.length)];
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  add("impPanel1", new THREE.BoxGeometry(sx, sy, sz), 0, sy / 2, 0, { color: body, uv: "keep" });
  // top / bottom rails and corner posts
  add("paintedMetal", new THREE.BoxGeometry(sx + 0.03, sy * 0.1, sz + 0.03), 0, sy * 0.05, 0, { color: PALETTE.impBlack, texel: 2 });
  add("paintedMetal", new THREE.BoxGeometry(sx + 0.03, sy * 0.08, sz + 0.03), 0, sy - sy * 0.04, 0, { color: PALETTE.impBlack, texel: 2 });
  for (const cx of [-1, 1]) for (const cz of [-1, 1]) add("paintedMetal", new THREE.BoxGeometry(0.07, sy, 0.07), cx * (sx / 2 - 0.02), sy / 2, cz * (sz / 2 - 0.02), { color: PALETTE.impBlack, texel: 2 });
  // corrugation ribs on the long flanks (±x faces) — skipped for bins packed side by side in racks
  if (ribs) {
    const nr = Math.max(2, Math.floor((sz - 0.3) / 0.3));
    for (const s of [-1, 1]) for (let i = 0; i < nr; i++) add("paintedMetal", new THREE.BoxGeometry(0.02, sy * 0.72, 0.06), s * (sx / 2 + 0.005), sy * 0.5, -sz / 2 + 0.2 + (i + 0.5) * ((sz - 0.4) / nr), { color: trim, texel: 2 });
  }
  // door end: two leaves with a centre seam, latch bars, handles, a sill
  const f = face;
  const dz = f * (sz / 2 + 0.006);
  add("paintedMetal", new THREE.BoxGeometry(0.03, sy * 0.78, 0.012), 0, sy * 0.5, dz, { color: PALETTE.impBlack, texel: 2 });
  for (const s of [-1, 1]) {
    add("paintedMetal", new THREE.BoxGeometry(sx * 0.42, sy * 0.72, 0.008), s * sx * 0.24, sy * 0.5, dz, { color: trim, texel: 2 });
    add("metal", new THREE.BoxGeometry(0.035, sy * 0.66, 0.03), s * sx * 0.16, sy * 0.5, dz + f * 0.02, { color: PALETTE.steel });
    add("metal", new THREE.BoxGeometry(0.12, 0.04, 0.05), s * sx * 0.16, sy * 0.42, dz + f * 0.03, { color: PALETTE.gunmetal });
    add("metal", new THREE.BoxGeometry(0.12, 0.04, 0.05), s * sx * 0.16, sy * 0.66, dz + f * 0.03, { color: PALETTE.gunmetal });
  }
  add("paintedMetal", new THREE.BoxGeometry(sx * 0.9, 0.05, 0.03), 0, sy * 0.1, dz + f * 0.01, { color: PALETTE.impBlack, texel: 2 });
  // label plate + stencil, status lamp
  const lw = Math.min(0.36, sx * 0.3);
  add("impPanel", new THREE.BoxGeometry(lw, lw * 0.55, 0.01), -sx * 0.3, sy * 0.78, dz + f * 0.008, { color: PALETTE.impLight, uv: "keep" });
  add("decal", new THREE.PlaneGeometry(lw * 0.5, lw * 0.5), -sx * 0.3, sy * 0.78, dz + f * 0.016, { uv: "keep", uvRect: decalRect([0, 8, 11, 14, 9][Math.floor(rand() * 5)]) });
  add(rand() < 0.8 ? "emitBlueDim" : "emitRedDim", new THREE.BoxGeometry(0.1, 0.03, 0.01), sx * 0.32, sy * 0.8, dz + f * 0.01);
  // hazard placard (diamond) on a third of the containers
  if (rand() < 0.35) {
    const pw = Math.min(0.32, sy * 0.3);
    const dq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 4));
    const p = new THREE.Vector3(sx * 0.3, sy * 0.28, dz + f * 0.008).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
    kit.add("paintedMetal", new THREE.BoxGeometry(pw, pw, 0.01), { pos: [p.x, p.y, p.z], quat: dq, color: PALETTE.impAmber, texel: 2 });
    add("decal", new THREE.PlaneGeometry(pw * 0.7, pw * 0.7), sx * 0.3, sy * 0.28, dz + f * 0.016, { uv: "keep", uvRect: decalRect(rand() < 0.5 ? 5 : 13) });
  }
  if (collide) {
    const c = Math.abs(Math.cos(yaw));
    const s = Math.abs(Math.sin(yaw));
    kit.collider([x - (sx * c + sz * s) / 2, y, z - (sx * s + sz * c) / 2], [x + (sx * c + sz * s) / 2, y + sy, z + (sx * s + sz * c) / 2], "container");
  }
}

/**
 * Wall-mounted pipe manifold: upper and lower header pipes with `n` vertical drops, each carrying a
 * valve wheel and a gauge, clamps to the wall, a lamp bar and a stencil. Sits in a wall frame.
 */
export function pipeManifold(kit, ctx, side, u, { w = 2.4, v0 = 0.5, v1 = 3.0, n = 5, bounds = ctx.bounds, lamp = "emitAmberDim", seed = 5 } = {}) {
  const seg = wallSegment(bounds, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, bounds[0][1]);
  const rand = rng(seed);
  frame.box("paintedMetal", u, (v0 + v1) / 2, 0.04, w + 0.3, v1 - v0 + 0.5, 0.08, { color: PALETTE.impDark, texel: 1.5 });
  frame.cylU("metal", u, v1, 0.22, 0.11, w, { color: PALETTE.impMid, segments: 14 });
  frame.cylU("metal", u, v0 + 0.2, 0.22, 0.09, w, { color: PALETTE.impMid, segments: 14 });
  for (const uu of [u - w / 2, u + w / 2]) {
    frame.box("metal", uu, v1, 0.22, 0.18, 0.3, 0.3, { color: PALETTE.impBlack });
    frame.box("metal", uu, v0 + 0.2, 0.22, 0.18, 0.26, 0.26, { color: PALETTE.impBlack });
  }
  for (let i = 0; i < n; i++) {
    const du = u - w / 2 + 0.3 + (i / (n - 1)) * (w - 0.6);
    const r = 0.04 + rand() * 0.02;
    const col = i === Math.floor(n / 2) ? PALETTE.impAmber : rand() < 0.5 ? PALETTE.steel : PALETTE.impMid;
    frame.cylV("metal", du, (v0 + v1) / 2 + 0.1, 0.22, r, v1 - v0 - 0.2, { color: col, segments: 10 });
    // valve wheel (facing out) on a stub
    const vv = v0 + 0.8 + rand() * 0.6;
    frame.cylN("metal", du, vv, 0.3, 0.03, 0.16, { color: PALETTE.steel, segments: 8 });
    frame.add("metal", new THREE.TorusGeometry(0.1, 0.016, 8, 18), du, vv, 0.38, { color: i % 2 ? PALETTE.impRed : PALETTE.impAmber });
    // gauge dial
    const gv = v1 - 0.55 - rand() * 0.3;
    frame.cylN("metal", du, gv, 0.29, 0.09, 0.05, { color: PALETTE.steel, segments: 16 });
    frame.cylN("darkGloss", du, gv, 0.315, 0.07, 0.006, { segments: 16 });
    frame.box("emitAmberDim", du + 0.015, gv + 0.01, 0.32, 0.05, 0.008, 0.004, { spin: 0.6 });
    // wall clamps
    frame.box("metal", du, v0 + 0.45, 0.12, r * 2 + 0.06, 0.06, 0.24, { color: PALETTE.gunmetal });
    frame.box("metal", du, v1 - 0.35, 0.12, r * 2 + 0.06, 0.06, 0.24, { color: PALETTE.gunmetal });
  }
  frame.box("paintedMetal", u, v0 - 0.05, 0.05, w - 0.2, 0.1, 0.03, { color: PALETTE.impBlack, texel: 2 });
  frame.box(lamp, u, v0 - 0.05, 0.066, w - 0.4, 0.03, 0.01, { uv: "keep" });
  frame.add("decal", new THREE.PlaneGeometry(0.4, 0.4), u + w / 2 - 0.15, v1 + 0.3, 0.085, { uv: "keep", uvRect: decalRect(5) });
  frame.collider(u - w / 2 - 0.15, u + w / 2 + 0.15, 0, v1 + 0.3, 0, 0.45, "manifold");
}

/** Row of tall crew lockers against a wall (frame u centre, `n` doors), vents, numbers, a lit strip. */
export function lockerRow(kit, ctx, side, u, { n = 8, w = 0.55, h = 2.0, d = 0.5, bounds = ctx.bounds, seed = 4 } = {}) {
  const seg = wallSegment(bounds, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, bounds[0][1]);
  const rand = rng(seed);
  const total = n * w;
  frame.box("paintedMetal", u, h / 2, d / 2, total + 0.1, h, d, { color: PALETTE.impDark, texel: 1.5 });
  frame.box("paintedMetal", u, h + 0.06, d / 2, total + 0.16, 0.12, d + 0.04, { color: PALETTE.impBlack, texel: 2 });
  frame.box("paintedMetal", u, 0.05, d / 2 + 0.01, total + 0.16, 0.1, d + 0.04, { color: PALETTE.impBlack, texel: 2 });
  for (let i = 0; i < n; i++) {
    const du = u - total / 2 + (i + 0.5) * w;
    const col = rand() < 0.3 ? PALETTE.impMid : PALETTE.impGrey;
    frame.box("impPanel", du, h / 2 + 0.05, d + 0.008, w - 0.05, h - 0.2, 0.016, { color: col, uv: "keep" });
    // vent slots top and bottom, handle, number plate
    for (const vv of [h - 0.35, 0.45]) for (let s = 0; s < 3; s++) frame.box("metal", du, vv + s * 0.05, d + 0.02, w * 0.5, 0.012, 0.01, { color: PALETTE.impBlack });
    frame.box("metal", du + w * 0.3, h * 0.55, d + 0.03, 0.03, 0.14, 0.03, { color: PALETTE.steel });
    frame.add("decal", new THREE.PlaneGeometry(0.16, 0.16), du, h - 0.55, d + 0.018, { uv: "keep", uvRect: decalRect(rand() < 0.5 ? 2 : 14) });
    if (rand() < 0.15) frame.box("emitAmberDim", du - w * 0.3, h * 0.55, d + 0.02, 0.03, 0.03, 0.006);
  }
  frame.box("emitWhiteDim", u, h + 0.06, d + 0.03, total - 0.4, 0.03, 0.01, { uv: "keep" });
  frame.collider(u - total / 2 - 0.1, u + total / 2 + 0.1, 0, h + 0.12, 0, d + 0.04, "lockers");
}

/** Rolling tool chest: red body, drawer fronts with handles, wheels, a tray of tools on top. */
export function toolChest(kit, x, z, { yaw = 0, w = 0.95, h = 1.0, d = 0.5, color = PALETTE.impRed.clone().multiplyScalar(0.55), seed = 2 } = {}) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const rand = rng(seed);
  add("paintedMetal", new THREE.BoxGeometry(w, h - 0.14, d), 0, 0.14 + (h - 0.14) / 2, 0, { color, texel: 2 });
  add("metal", new THREE.BoxGeometry(w + 0.04, 0.04, d + 0.04), 0, h + 0.02, 0, { color: PALETTE.gunmetal });
  const nd = 5;
  for (let i = 0; i < nd; i++) {
    const ly = 0.22 + i * ((h - 0.3) / nd);
    add("paintedMetal", new THREE.BoxGeometry(w - 0.08, (h - 0.3) / nd - 0.03, 0.02), 0, ly + (h - 0.3) / nd / 2, d / 2 + 0.005, { color: PALETTE.impDark, texel: 2 });
    add("metal", new THREE.BoxGeometry(w * 0.4, 0.025, 0.03), 0, ly + (h - 0.3) / nd / 2, d / 2 + 0.025, { color: PALETTE.steel });
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add("rubber", new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10).rotateZ(Math.PI / 2), sx * (w / 2 - 0.1), 0.06, sz * (d / 2 - 0.08), { color: PALETTE.rubber });
  add("metal", new THREE.CylinderGeometry(0.015, 0.015, d - 0.1, 6).rotateX(Math.PI / 2), -w / 2 - 0.05, h - 0.1, 0, { color: PALETTE.steel });
  const nt = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < nt; i++) add("metal", new THREE.BoxGeometry(0.06 + rand() * 0.2, 0.03, 0.05 + rand() * 0.1), (rand() - 0.5) * (w - 0.3), h + 0.06, (rand() - 0.5) * (d - 0.2), { color: rand() < 0.5 ? PALETTE.steel : PALETTE.gunmetal });
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  kit.collider([x - (w * c + d * s) / 2, 0, z - (w * s + d * c) / 2], [x + (w * c + d * s) / 2, h + 0.1, z + (w * s + d * c) / 2], "toolchest");
}

/** Portable welding screen: two hinged dark-red panels on feet with a hazard header. Centre (x,z). */
export function weldScreen(kit, x, z, { yaw = 0, w = 1.4, h = 1.9, fold = 0.5, color = PALETTE.impRed.clone().multiplyScalar(0.28) } = {}) {
  for (const s of [-1, 1]) {
    const a = yaw + s * fold;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
    const c = new THREE.Vector3(s * (w / 2) * Math.cos(a), 0, -s * (w / 2) * Math.sin(a)).add(new THREE.Vector3(x, 0, z));
    kit.add("paintedMetal", new THREE.BoxGeometry(w, h - 0.25, 0.03), { pos: [c.x, 0.2 + (h - 0.25) / 2, c.z], quat: q, color, texel: 1 });
    kit.add("paintedMetal", new THREE.BoxGeometry(w + 0.04, 0.06, 0.05), { pos: [c.x, h, c.z], quat: q, color: PALETTE.impBlack, texel: 2 });
    kit.add("hazard", new THREE.BoxGeometry(w - 0.1, 0.12, 0.035), { pos: [c.x, h - 0.15, c.z], quat: q, texel: HAZARD_TEXEL });
    for (const e of [-1, 1]) {
      const p = new THREE.Vector3(e * (w / 2 - 0.05), 0, 0).applyQuaternion(q).add(c);
      kit.add("metal", new THREE.BoxGeometry(0.04, h, 0.04), { pos: [p.x, h / 2, p.z], quat: q, color: PALETTE.gunmetal });
      kit.add("metal", new THREE.BoxGeometry(0.06, 0.04, 0.5), { pos: [p.x, 0.02, p.z], quat: q, color: PALETTE.gunmetal });
    }
    kit.collider([c.x - w / 2 - 0.3, 0, c.z - w / 2 - 0.3], [c.x + w / 2 + 0.3, h, c.z + w / 2 + 0.3], "weldscreen");
  }
}

/** Hose or cable lying on the floor through `points` ([x, z]) — a sagging rubber run with a nozzle end. */
export function hose(kit, points, { r = 0.03, color = PALETTE.rubber, mat = "rubber", y = 0 } = {}) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = new THREE.Vector3(points[i][0], y + r, points[i][1]);
    const b = new THREE.Vector3(points[i + 1][0], y + r, points[i + 1][1]);
    const len = a.distanceTo(b);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    kit.add(mat, new THREE.CylinderGeometry(r, r, len, 8), { pos: [mid.x, mid.y, mid.z], quat: q, color, uv: "scale", uvScale: [0.2, len] });
    if (i > 0) kit.add(mat, new THREE.SphereGeometry(r * 1.1, 8, 6), { pos: [a.x, a.y, a.z], color });
  }
  const e = points[points.length - 1];
  kit.cyl("metal", e[0], y + r, e[1], r * 1.6, 0.16, "x", { color: PALETTE.brass, segments: 8 });
}

/** Small display on a railing post: bracket + screen tilted toward the deck, facing `yaw`. */
export function railScreen(kit, x, y, z, yaw, { w = 0.5, h = 0.3, screen = 1 } = {}) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.35));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  kit.box("metal", x, y - 0.12, z, 0.04, 0.24, 0.04, { color: PALETTE.steel });
  add("paintedMetal", new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.05), 0, 0.12, 0, { color: PALETTE.impDark, texel: 2 });
  add("darkGloss", new THREE.BoxGeometry(w + 0.02, h + 0.02, 0.006), 0, 0.12, 0.027);
  add("impScreen" + (screen % 5), new THREE.PlaneGeometry(w, h), 0, 0.12, 0.032, { uv: "keep" });
}

/**
 * Steel storage shelving frame from (x0,z0) to (x1,z1): posts every ~2.8 m, `levels` beams, wire
 * decking on each level. Returns the level heights so callers can stack crates on them.
 */
export function shelfFrame(kit, x0, z0, x1, z1, { levels = 3, levelH = 1.5, y = 0, color = PALETTE.impAmber, post = PALETTE.impDark, collide = true } = {}) {
  const w = x1 - x0;
  const d = z1 - z0;
  const alongX = w >= d;
  const len = alongX ? w : d;
  const nBays = Math.max(1, Math.round(len / 2.8));
  const top = y + levels * levelH;
  const heights = [];
  for (let i = 0; i <= nBays; i++) {
    const a = (alongX ? x0 : z0) + (i / nBays) * len;
    for (const s of [0, 1]) {
      const px = alongX ? a : s ? x1 : x0;
      const pz = alongX ? (s ? z1 : z0) : a;
      kit.box("paintedMetal", px, (y + top) / 2, pz, 0.1, top - y, 0.1, { color: post, texel: 2 });
      kit.box("paintedMetal", px, y + 0.05, pz, 0.2, 0.1, 0.2, { color: PALETTE.impBlack, texel: 2 });
    }
  }
  for (let l = 1; l <= levels; l++) {
    const ly = y + l * levelH;
    heights.push(ly);
    // long beams (both sides), bright safety paint
    for (const s of [0, 1]) {
      if (alongX) kit.box("paintedMetal", (x0 + x1) / 2, ly - 0.06, s ? z1 : z0, w, 0.12, 0.06, { color, texel: 1.5 });
      else kit.box("paintedMetal", s ? x1 : x0, ly - 0.06, (z0 + z1) / 2, 0.06, 0.12, d, { color, texel: 1.5 });
    }
    // deck
    kit.boxMM("metal", [x0 + 0.05, ly - 0.05, z0 + 0.05], [x1 - 0.05, ly - 0.02, z1 - 0.05], { color: PALETTE.gunmetal, texel: 2 });
  }
  // back cross bracing
  if (alongX) {
    for (let i = 0; i < nBays; i++) {
      const a = x0 + ((i + 0.5) / nBays) * len;
      const g = new THREE.BoxGeometry(0.04, Math.hypot(len / nBays, top - y) * 0.9, 0.04);
      kit.add("metal", g, { pos: [a, (y + top) / 2, z0 + 0.03], rot: [0, 0, Math.atan2(len / nBays, top - y) * (i % 2 ? 1 : -1)], color: PALETTE.steel });
    }
  }
  if (collide) kit.collider([x0 - 0.05, y, z0 - 0.05], [x1 + 0.05, top, z1 + 0.05], "shelf");
  return heights;
}

/** Workbench with a vice, tool clutter, an under-shelf and a lit task lamp. Faces +Z before yaw. */
export function workbench(kit, x, z, { yaw = 0, w = 2.4, y = 0, seed = 6, lamp = true } = {}) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = local(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const rand = rng(seed);
  const d = 0.9;
  add("metal", new THREE.BoxGeometry(w, 0.08, d), 0, 0.92, 0, { color: PALETTE.steel, texel: 1.5 });
  add("paintedMetal", new THREE.BoxGeometry(w, 0.1, d), 0, 0.83, 0, { color: PALETTE.impDark, texel: 2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add("paintedMetal", new THREE.BoxGeometry(0.08, 0.8, 0.08), sx * (w / 2 - 0.08), 0.4, sz * (d / 2 - 0.08), { color: PALETTE.impDark, texel: 2 });
  add("metal", new THREE.BoxGeometry(w - 0.2, 0.04, d - 0.2), 0, 0.3, 0, { color: PALETTE.gunmetal, texel: 2 });
  // drawers under one half
  add("paintedMetal", new THREE.BoxGeometry(w * 0.4, 0.44, d - 0.1), -w * 0.25, 0.56, 0, { color: PALETTE.impMid, texel: 2 });
  for (let i = 0; i < 2; i++) add("metal", new THREE.BoxGeometry(w * 0.25, 0.03, 0.03), -w * 0.25, 0.45 + i * 0.2, d / 2 - 0.03, { color: PALETTE.steel });
  // vice
  add("metal", new THREE.BoxGeometry(0.22, 0.16, 0.16), w / 2 - 0.35, 1.04, 0.1, { color: PALETTE.gunmetal });
  add("metal", new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), w / 2 - 0.35, 1.04, 0.3, { color: PALETTE.steel, rot: null });
  // clutter: parts, a datapad, small boxes
  const n = 4 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const bx = (rand() - 0.5) * (w - 0.8);
    const bz = (rand() - 0.5) * (d - 0.4);
    const r = rand();
    if (r < 0.4) add("metal", new THREE.BoxGeometry(0.1 + rand() * 0.25, 0.04 + rand() * 0.1, 0.1 + rand() * 0.2), bx, 1.0, bz, { color: [PALETTE.steel, PALETTE.gunmetal, PALETTE.impRed][Math.floor(rand() * 3)] });
    else if (r < 0.7) add("rubber", new THREE.CylinderGeometry(0.03 + rand() * 0.05, 0.03 + rand() * 0.05, 0.12 + rand() * 0.2, 10), bx, 1.06, bz, { color: PALETTE.rubber });
    else add("impScreen4", new THREE.BoxGeometry(0.22, 0.015, 0.16), bx, 0.97, bz, { uv: "keep" });
  }
  // tool board behind the bench with hung tools
  add("paintedMetal", new THREE.BoxGeometry(w - 0.2, 0.9, 0.04), 0, 1.65, -d / 2 + 0.02, { color: PALETTE.impMid, texel: 2 });
  const nt = Math.floor((w - 0.4) / 0.22);
  for (let i = 0; i < nt; i++) {
    const tx = -w / 2 + 0.3 + i * 0.22;
    const th = 0.2 + rand() * 0.35;
    add("metal", new THREE.BoxGeometry(0.03, th, 0.03), tx, 1.95 - th / 2, -d / 2 + 0.06, { color: PALETTE.steel });
    if (rand() < 0.6) add("rubber", new THREE.BoxGeometry(0.06, 0.12, 0.04), tx, 1.95 - th - 0.06, -d / 2 + 0.06, { color: PALETTE.rubber });
  }
  if (lamp) {
    add("metal", new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), w / 2 - 0.15, 1.35, -d / 2 + 0.1, { color: PALETTE.steel });
    add("paintedMetal", new THREE.BoxGeometry(0.4, 0.06, 0.16), w / 2 - 0.35, 1.72, -d / 2 + 0.25, { color: PALETTE.impDark, texel: 2 });
    add("emitWhiteSoft", new THREE.BoxGeometry(0.34, 0.01, 0.1), w / 2 - 0.35, 1.685, -d / 2 + 0.25, { uv: "keep" });
  }
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (w * c + d * s) / 2;
  const ez = (w * s + d * c) / 2;
  kit.collider([x - ex, y, z - ez], [x + ex, y + 1.0, z + ez], "bench");
}

/**
 * Floor grating over a lit trench: recessed channel (dark walls, floor at -depth) with an emissive
 * strip along its bottom and a single grate quad on top. Walkable (the trench is covered).
 */
export function gratedTrench(kit, x0, z0, x1, z1, { depth = 0.55, emit = "emitAmber", y = 0 } = {}) {
  const w = x1 - x0;
  const d = z1 - z0;
  kit.boxMM("paintedMetal", [x0, y - depth - 0.05, z0], [x1, y - depth, z1], { color: PALETTE.impBlack, texel: 2 });
  // walls
  const t = 0.06;
  kit.boxMM("paintedMetal", [x0 - t, y - depth, z0 - t], [x1 + t, y - 0.02, z0], { color: PALETTE.impDark, texel: 2 });
  kit.boxMM("paintedMetal", [x0 - t, y - depth, z1], [x1 + t, y - 0.02, z1 + t], { color: PALETTE.impDark, texel: 2 });
  kit.boxMM("paintedMetal", [x0 - t, y - depth, z0], [x0, y - 0.02, z1], { color: PALETTE.impDark, texel: 2 });
  kit.boxMM("paintedMetal", [x1, y - depth, z0], [x1 + t, y - 0.02, z1], { color: PALETTE.impDark, texel: 2 });
  // pipes and a light strip at the bottom
  const alongX = w >= d;
  if (alongX) {
    kit.boxMM(emit, [x0 + 0.1, y - depth + 0.005, (z0 + z1) / 2 - 0.16], [x1 - 0.1, y - depth + 0.02, (z0 + z1) / 2 + 0.16], { uv: "keep" });
    kit.cyl("metal", (x0 + x1) / 2, y - depth + 0.12, z0 + 0.18, 0.06, w - 0.2, "x", { color: PALETTE.steel });
    kit.cyl("rubber", (x0 + x1) / 2, y - depth + 0.09, z1 - 0.18, 0.04, w - 0.2, "x", { color: PALETTE.rubber });
  } else {
    kit.boxMM(emit, [(x0 + x1) / 2 - 0.16, y - depth + 0.005, z0 + 0.1], [(x0 + x1) / 2 + 0.16, y - depth + 0.02, z1 - 0.1], { uv: "keep" });
    kit.cyl("metal", x0 + 0.18, y - depth + 0.12, (z0 + z1) / 2, 0.06, d - 0.2, "z", { color: PALETTE.steel });
  }
  // grate quad (cut-out texture, tiled in metres)
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  kit.add("grate", g, { pos: [(x0 + x1) / 2, y - 0.01, (z0 + z1) / 2], uv: "scale", uvScale: [w / GRATE_TILE[0], d / GRATE_TILE[1]] });
  // edge rails
  kit.boxMM("metal", [x0 - t, y - 0.03, z0 - t], [x1 + t, y, z0], { color: PALETTE.steel });
  kit.boxMM("metal", [x0 - t, y - 0.03, z1], [x1 + t, y, z1 + t], { color: PALETTE.steel });
  kit.boxMM("metal", [x0 - t, y - 0.03, z0], [x0, y, z1], { color: PALETTE.steel });
  kit.boxMM("metal", [x1, y - 0.03, z0], [x1 + t, y, z1], { color: PALETTE.steel });
}

/**
 * Bank of animated bar gauges: two InstancedMeshes (amber + blue) whose bar heights follow slow
 * noise. Positioned in a wall frame: `frame`, u centre, v base, n offset. Returns the meshes.
 */
export function barGauges(ctx, frame, u, v, n, { count = 10, w = 0.16, gap = 0.08, maxH = 1.2, blueEvery = 4 } = {}) {
  const geo = new THREE.BoxGeometry(w, 1, 0.03);
  geo.translate(0, 0.5, 0);
  const amber = new THREE.InstancedMesh(geo, ctx.materials.emitAmber, count);
  const blue = new THREE.InstancedMesh(geo.clone(), ctx.materials.emitBlue, count);
  amber.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  blue.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  amber.frustumCulled = false;
  blue.frustumCulled = false;
  const total = count * (w + gap) - gap;
  const m = new THREE.Matrix4();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const seeds = [];
  const rand = rng(31);
  for (let i = 0; i < count; i++) seeds.push([rand() * 6, 0.4 + rand() * 0.6, rand() * 6]);
  const place = (i, h, mesh) => {
    const uu = u - total / 2 + w / 2 + i * (w + gap);
    const p = frame.pos(uu, v, n);
    m.compose(p, frame.q, new THREE.Vector3(1, Math.max(0.02, h), 1));
    mesh.setMatrixAt(i, m);
  };
  const update = (t) => {
    for (let i = 0; i < count; i++) {
      const [a, b, c] = seeds[i];
      const lvl = 0.45 + 0.28 * Math.sin(t * 0.6 * b + a) + 0.14 * Math.sin(t * 2.1 + c) + 0.08 * Math.sin(t * 5.3 + a * 2);
      const h = THREE.MathUtils.clamp(lvl, 0.06, 1) * maxH;
      const isBlue = i % blueEvery === blueEvery - 1;
      place(i, h, isBlue ? blue : amber);
      (isBlue ? amber : blue).setMatrixAt(i, zero);
    }
    amber.instanceMatrix.needsUpdate = true;
    blue.instanceMatrix.needsUpdate = true;
  };
  update(0);
  ctx.mesh(amber);
  ctx.mesh(blue);
  ctx.anim((dt, t) => update(t));
  // dark channel behind each bar + scale ticks
  for (let i = 0; i < count; i++) {
    const uu = u - total / 2 + w / 2 + i * (w + gap);
    frame.box("paintedMetal", uu, v + maxH / 2, n - 0.02, w + 0.04, maxH + 0.06, 0.02, { color: PALETTE.impBlack, texel: 2 });
    for (let k = 1; k < 5; k++) frame.box("metal", uu + w / 2 + 0.03, v + (k / 5) * maxH, n - 0.005, 0.03, 0.006, 0.01, { color: PALETTE.steel });
  }
  return { amber, blue };
}

/** Boxy Imperial loader vehicle (forklift-style): chassis, wheels, cab cage, mast with forks, beacon. */
export function loader(kit, ctx, x, z, { yaw = 0, seed = 8, color = PALETTE.impAmber, carry = null } = {}) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = local(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  // chassis (front is -Z local)
  add("paintedMetal", new THREE.BoxGeometry(1.5, 0.5, 2.4), 0, 0.55, 0.2, { color, texel: 1.5 });
  add("paintedMetal", new THREE.BoxGeometry(1.4, 0.3, 1.0), 0, 0.95, 0.8, { color: PALETTE.impDark, texel: 1.5 });
  add("hazard", new THREE.BoxGeometry(1.52, 0.1, 0.08), 0, 0.45, 1.42, { texel: HAZARD_TEXEL });
  // wheels
  for (const sx of [-1, 1]) for (const sz of [-0.8, 0.9]) {
    const g = new THREE.CylinderGeometry(0.34, 0.34, 0.3, 16);
    g.rotateZ(Math.PI / 2);
    add("rubber", g, sx * 0.75, 0.34, sz, { color: PALETTE.rubber });
    add("metal", new THREE.CylinderGeometry(0.16, 0.16, 0.32, 12).rotateZ(Math.PI / 2), sx * 0.75, 0.34, sz, { color: PALETTE.steel });
  }
  // seat + controls + cage
  add("rubber", new THREE.BoxGeometry(0.6, 0.1, 0.5), 0, 0.85, 0.5, { color: PALETTE.rubber });
  add("rubber", new THREE.BoxGeometry(0.6, 0.6, 0.1), 0, 1.2, 0.8, { color: PALETTE.rubber });
  add("paintedMetal", new THREE.BoxGeometry(0.7, 0.3, 0.1), 0, 1.1, -0.1, { color: PALETTE.impDark, texel: 2 });
  add("impScreen1", new THREE.PlaneGeometry(0.4, 0.14), 0, 1.15, -0.04, { uv: "keep" });
  for (const sx of [-1, 1]) for (const sz of [-0.3, 1.1]) add("paintedMetal", new THREE.BoxGeometry(0.06, 1.5, 0.06), sx * 0.7, 1.55, sz, { color: PALETTE.impDark, texel: 2 });
  add("paintedMetal", new THREE.BoxGeometry(1.5, 0.08, 1.5), 0, 2.32, 0.4, { color: PALETTE.impDark, texel: 2 });
  add("emitAmber", new THREE.CylinderGeometry(0.08, 0.1, 0.14, 10), 0.55, 2.43, 0.4);
  // mast (two channels + crossbars + a lift chain) and the fork carriage at the front
  for (const sx of [-1, 1]) {
    add("paintedMetal", new THREE.BoxGeometry(0.12, 2.6, 0.16), sx * 0.5, 1.3, -1.05, { color: PALETTE.impMid, texel: 2 });
    add("paintedMetal", new THREE.BoxGeometry(0.06, 2.2, 0.1), sx * 0.36, 1.2, -1.08, { color: PALETTE.impDark, texel: 2 });
  }
  for (const my of [2.55, 1.6]) add("paintedMetal", new THREE.BoxGeometry(1.1, 0.1, 0.12), 0, my, -1.05, { color: PALETTE.impMid, texel: 2 });
  add("metal", new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6), 0, 1.4, -1.0, { color: PALETTE.gunmetal, rot: null });
  const forkY = carry ? 0.3 : 0.12;
  // carriage plate with a backrest grid, then two heavy tines with vertical heels
  add("metal", new THREE.BoxGeometry(1.0, 0.36, 0.08), 0, forkY + 0.34, -1.16, { color: PALETTE.gunmetal });
  for (let i = 0; i < 4; i++) add("metal", new THREE.BoxGeometry(0.04, 0.9, 0.04), -0.42 + i * 0.28, forkY + 0.95, -1.18, { color: PALETTE.steel });
  add("metal", new THREE.BoxGeometry(0.9, 0.04, 0.04), 0, forkY + 1.38, -1.18, { color: PALETTE.steel });
  for (const sx of [-1, 1]) {
    add("metal", new THREE.BoxGeometry(0.15, 0.07, 1.3), sx * 0.32, forkY, -1.86, { color: PALETTE.steel });
    add("metal", new THREE.BoxGeometry(0.15, 0.5, 0.08), sx * 0.32, forkY + 0.25, -1.24, { color: PALETTE.steel });
  }
  add("emitWhite", new THREE.BoxGeometry(0.16, 0.06, 0.02), -0.55, 0.75, -1.0);
  add("emitWhite", new THREE.BoxGeometry(0.16, 0.06, 0.02), 0.55, 0.75, -1.0);
  add("emitRed", new THREE.BoxGeometry(0.16, 0.06, 0.02), -0.55, 0.75, 1.42);
  add("emitRed", new THREE.BoxGeometry(0.16, 0.06, 0.02), 0.55, 0.75, 1.42);
  add("decal", new THREE.PlaneGeometry(0.3, 0.3), 0.55, 0.6, 1.43, { uv: "keep", uvRect: decalRect(14) });
  if (carry) {
    const p = local(0, forkY + 0.03, -1.75);
    carry(p.x, p.y, p.z, yaw);
  }
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (1.6 * c + 3.6 * s) / 2;
  const ez = (1.6 * s + 3.6 * c) / 2;
  const cc = local(0, 0, -0.3);
  kit.collider([cc.x - ex, 0, cc.z - ez], [cc.x + ex, 2.4, cc.z + ez], "loader");
}

/** Hand pallet jack (small, low). Faces -Z before yaw. */
export function palletJack(kit, x, z, yaw = 0) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  for (const sx of [-1, 1]) add("paintedMetal", new THREE.BoxGeometry(0.16, 0.08, 1.2), sx * 0.27, 0.1, -0.5, { color: PALETTE.impAmber, texel: 2 });
  add("paintedMetal", new THREE.BoxGeometry(0.7, 0.3, 0.3), 0, 0.2, 0.25, { color: PALETTE.impAmber, texel: 2 });
  add("metal", new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), 0, 0.7, 0.42, { color: PALETTE.steel, rot: null });
  add("rubber", new THREE.BoxGeometry(0.4, 0.05, 0.05), 0, 1.15, 0.42, { color: PALETTE.rubber });
  kit.collider([x - 0.45, 0, z - 1.2], [x + 0.45, 0.4, z + 0.5], "jack");
}

/** Spot light helper (deck-local position + target). */
export function spotLight(color, intensity, distance, pos, target, { angle = 0.7, penumbra = 0.5, shadow = false } = {}) {
  const s = new THREE.SpotLight(color, intensity * 0.8, distance, angle, penumbra, 1.6);
  s.position.set(pos[0], pos[1], pos[2]);
  s.target.position.set(target[0], target[1], target[2]);
  if (shadow) {
    s.castShadow = true;
    s.shadow.mapSize.set(1024, 1024);
    s.shadow.camera.near = 0.5;
    s.shadow.camera.far = distance;
    s.shadow.bias = -0.0005;
    s.shadow.normalBias = 0.02;
  }
  return s;
}
