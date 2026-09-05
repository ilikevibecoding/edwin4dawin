// Deck 2 — Tactical Operations & Holographic Planning (sector d2_tactical).
//
// An amphitheatre around a central holo table: the table and a ring of standing consoles sit in a
// sunken well, a raised ring of platforms with seated stations wraps around it, a gangway leads in
// from the double door, a 6 m video wall and a fleet-disposition board face each other across the
// room, and a heavy octagonal ceiling ring carries the blue ring light over the hologram.
//
// This file also exports a few small helpers shared by the other Command Deck rooms (label atlas
// signage, merged dynamic meshes, vents, cable trays, small props).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE } from "../../materials.js";
import { roomShell, impConsole, wallScreen, equipmentRack, crate, stairs, platform, pipeRun, hologram, wallSegment, IMP_STYLES_TECH, IMP_THEME } from "../imperial.js";
import { pointLight, wallFrame, ceilingFrame, panelGrid } from "../builders.js";
import { rng, worldUVs, setVertexColor } from "../../kit.js";
import { makeCanvas, toTexture, decalRect } from "../../textures.js";

// ---------------------------------------------------------------------------
// Shared helpers (Command Deck rooms import these)
// ---------------------------------------------------------------------------

/**
 * Emissive text atlas: one canvas texture holding every label, registered once on ctx.materials
 * under `key`. Labels are shelf-packed (widest first, several per 48 px row) so the canvas is only
 * as large as the text needs — a 17-label sign set fits in ~1024×336 instead of a 96 px row per label
 * (the closest sign in any rubric view is still ~1.4× oversampled at 1280×720).
 * Returns { key, rect(i), aspect(i) } so a label can be placed with the right aspect:
 * `kit.add(atlas.key, new PlaneGeometry(h * atlas.aspect(i), h), { uv: "keep", uvRect: atlas.rect(i) })`.
 */
export function labelAtlas(ctx, key, labels, opts = {}) {
  const { w: wMax = 1024, rowH = 48, color = "#dfe7f5", accent = "#4a9dff", bg = "#07090d", intensity = 1.3 } = opts;
  const cache = (ctx.materials.__labelAtlas ||= {});
  if (!cache[key]) {
    const font = (px) => `bold ${px.toFixed(1)}px "DejaVu Sans", "Liberation Sans", Arial, sans-serif`;
    const spacing = (g, px) => {
      if ("letterSpacing" in g) g.letterSpacing = `${(px * 0.12).toFixed(1)}px`;
    };
    // measure every label at the nominal size; anything wider than the atlas is shrunk to fit
    const meas = makeCanvas(16, 16).getContext("2d");
    const pad = rowH * 0.8; // accent end-bars + margins around the text block
    const gap = Math.round(rowH * 0.25); // guard between cells so mip filtering does not bleed a neighbour in
    const items = labels.map((label, i) => {
      const spec = typeof label === "string" ? { text: label } : label;
      let px = rowH * 0.56;
      meas.font = font(px);
      spacing(meas, px);
      let tw = meas.measureText(spec.text).width;
      const maxW = wMax - pad - 2 * gap;
      if (tw > maxW) {
        px *= maxW / tw;
        meas.font = font(px);
        spacing(meas, px);
        tw = meas.measureText(spec.text).width;
      }
      return { i, spec, px, tw, cw: Math.ceil(tw + pad), x0: 0, row: 0 };
    });
    // shelf packing: widest first, left to right, a new shelf when a cell does not fit
    const shelves = [];
    for (const it of [...items].sort((a, b) => b.cw - a.cw)) {
      let s = shelves.find((sh) => sh.x + it.cw + gap <= wMax);
      if (!s) {
        s = { x: gap, row: shelves.length };
        shelves.push(s);
      }
      it.x0 = s.x;
      it.row = s.row;
      s.x += it.cw + gap;
    }
    const w = Math.min(wMax, Math.ceil(Math.max(...shelves.map((s) => s.x)) / 32) * 32);
    const h = shelves.length * rowH;
    const c = makeCanvas(w, h);
    const g = c.getContext("2d");
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    const barW = rowH * 0.1;
    for (const it of items) {
      const y0 = it.row * rowH;
      const xc = it.x0 + it.cw / 2;
      // accent end-bars hugging the text block
      g.fillStyle = it.spec.accent || accent;
      g.fillRect(xc - it.tw / 2 - rowH * 0.4, y0 + rowH * 0.25, barW, rowH * 0.5);
      g.fillRect(xc + it.tw / 2 + rowH * 0.4 - barW, y0 + rowH * 0.25, barW, rowH * 0.5);
      g.font = font(it.px);
      spacing(g, it.px);
      g.fillStyle = it.spec.color || color;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(it.spec.text, xc, y0 + rowH * 0.53);
    }
    const tex = toTexture(c, { srgb: true, wrap: false });
    ctx.materials[key] = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: intensity, roughness: 0.35, metalness: 0 });
    cache[key] = { rects: items.map((it) => [it.x0 / w, 1 - ((it.row + 1) * rowH) / h, (it.x0 + it.cw) / w, 1 - (it.row * rowH) / h]), aspects: items.map((it) => it.cw / rowH) };
  }
  const info = cache[key];
  return {
    key,
    rows: labels.length,
    rect(i) {
      return info.rects[i];
    },
    aspect(i) {
      return info.aspects[i];
    },
  };
}

/** Lit sign plate on a wall Frame: dark bezel + emissive label (row `i` of `atlas`), `h` metres tall. */
export function signPlate(frame, atlas, i, { u, v, n = 0.0, h = 0.28, bezel = true, color = PALETTE.impBlack } = {}) {
  const w = h * atlas.aspect(i);
  if (bezel) frame.box("paintedMetal", u, v, n + 0.025, w + 0.1, h + 0.1, 0.05, { color, texel: 2 });
  frame.add(atlas.key, new THREE.PlaneGeometry(w, h), u, v, n + 0.052, { uv: "keep", uvRect: atlas.rect(i) });
  return w;
}

/** Free-standing lit label facing +Z rotated by yaw (for podiums, pedestals, table rims). */
export function signAt(kit, atlas, i, { x, y, z, yaw = 0, h = 0.2, bezel = true }) {
  const w = h * atlas.aspect(i);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const off = (dz) => new THREE.Vector3(0, 0, dz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
  if (bezel) {
    const p = off(-0.03);
    kit.add("paintedMetal", new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.05), { pos: [p.x, p.y, p.z], quat: q, color: PALETTE.impBlack, texel: 2 });
  }
  const p2 = off(0.0);
  kit.add(atlas.key, new THREE.PlaneGeometry(w, h), { pos: [p2.x, p2.y, p2.z], quat: q, uv: "keep", uvRect: atlas.rect(i) });
  return w;
}

/**
 * Merge already-transformed geometries into one dynamic mesh (one draw call) using a kit material,
 * register it with ctx.mesh and return it. Items are geometries or `{ geo, uv }` where `uv` is
 * "keep", a constant `[u, v]` (samples one texel of an atlas) or a texel density for planar UVs.
 */
export function mergedMesh(ctx, matKey, items, { pos = [0, 0, 0], texel = 1, color = null } = {}) {
  const parts = items.map((it) => {
    const g = it.isBufferGeometry ? it : it.geo;
    const uv = it.isBufferGeometry ? texel : it.uv ?? texel;
    const gg = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(gg.attributes)) if (!["position", "normal", "uv"].includes(k)) gg.deleteAttribute(k);
    if (!gg.attributes.normal) gg.computeVertexNormals();
    if (Array.isArray(uv)) {
      const n = gg.attributes.position.count;
      const arr = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        arr[i * 2] = uv[0];
        arr[i * 2 + 1] = uv[1];
      }
      gg.setAttribute("uv", new THREE.BufferAttribute(arr, 2));
    } else if (uv !== "keep") worldUVs(gg, uv || 1);
    if (color) setVertexColor(gg, color);
    return gg;
  });
  const merged = mergeGeometries(parts, false);
  merged.computeBoundingSphere();
  const mesh = new THREE.Mesh(merged, ctx.materials[matKey]);
  mesh.position.set(...pos);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  ctx.mesh(mesh);
  return mesh;
}

/**
 * Additive hologram material with a "tactical scope" texture (haze, grid, range rings, sweep,
 * contacts) plus three solid swatches in the top-left corner for opaque-ish parts. Returns the key
 * and the swatch UVs: { key, bright, mid, dim }. Registered once per key on ctx.materials.
 */
export function holoMaterial(ctx, key = "cmd_holo", { size = 512, seed = 5, hue = [120, 190, 255] } = {}) {
  if (!ctx.materials[key]) {
    const c = makeCanvas(size, size);
    const g = c.getContext("2d");
    const [hr, hg, hb] = hue;
    const col = (a, k = 1) => `rgba(${Math.round(hr * k)},${Math.round(hg * k)},${Math.round(hb * k)},${a})`;
    g.fillStyle = "#000";
    g.fillRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.49;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, col(0.5));
    grad.addColorStop(0.45, col(0.2));
    grad.addColorStop(0.96, col(0.12));
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.clip();
    g.strokeStyle = col(0.3);
    g.lineWidth = 1;
    const step = size / 24;
    for (let k = 0; k <= 24; k++) {
      g.beginPath();
      g.moveTo(k * step, 0);
      g.lineTo(k * step, size);
      g.moveTo(0, k * step);
      g.lineTo(size, k * step);
      g.stroke();
    }
    if (g.createConicGradient) {
      const cg = g.createConicGradient(0.6, cx, cy);
      cg.addColorStop(0, col(0.45));
      cg.addColorStop(0.16, col(0));
      cg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = cg;
      g.fillRect(0, 0, size, size);
    }
    g.restore();
    g.strokeStyle = col(0.85);
    g.lineWidth = 2;
    for (const f of [0.25, 0.5, 0.75, 0.985]) {
      g.beginPath();
      g.arc(cx, cy, R * f, 0, Math.PI * 2);
      g.stroke();
    }
    g.lineWidth = 1.5;
    g.strokeStyle = col(0.55);
    g.beginPath();
    g.moveTo(cx - R, cy);
    g.lineTo(cx + R, cy);
    g.moveTo(cx, cy - R);
    g.lineTo(cx, cy + R);
    g.stroke();
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      const l = k % 6 === 0 ? 16 : 7;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * (R - l), cy + Math.sin(a) * (R - l));
      g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      g.stroke();
    }
    const rand = rng(seed);
    for (let k = 0; k < 18; k++) {
      const a = rand() * Math.PI * 2;
      const d = R * (0.15 + rand() * 0.8);
      const hostile = rand() < 0.3;
      g.fillStyle = hostile ? "rgba(255,110,90,0.95)" : col(0.95);
      const px = cx + Math.cos(a) * d;
      const py = cy + Math.sin(a) * d;
      g.beginPath();
      if (hostile) {
        g.moveTo(px, py - 5);
        g.lineTo(px + 5, py + 4);
        g.lineTo(px - 5, py + 4);
        g.closePath();
      } else g.rect(px - 3, py - 3, 6, 6);
      g.fill();
      g.fillStyle = col(0.5);
      g.fillRect(px + 7, py - 2, 14 + rand() * 20, 2);
    }
    // solid swatches (never sampled by the disc: they sit outside its inscribed-circle UV footprint)
    g.fillStyle = col(1, 1);
    g.fillRect(0, 0, 28, 28);
    g.fillStyle = col(1, 0.62);
    g.fillRect(32, 0, 28, 28);
    g.fillStyle = col(1, 0.26);
    g.fillRect(64, 0, 28, 28);
    g.fillStyle = "rgba(255,179,71,1)";
    g.fillRect(96, 0, 28, 28);
    const tex = toTexture(c, { srgb: true, wrap: false });
    ctx.materials[key] = new THREE.MeshBasicMaterial({ color: 0xffffff, map: tex, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  }
  const p = 14 / size;
  return { key, bright: [p, 1 - p], mid: [46 / size, 1 - p], dim: [78 / size, 1 - p], amber: [110 / size, 1 - p] };
}

/** Open projection cone (additive) from a lens of radius r0 at y0 up to radius r1 at y1. */
export function holoCone(x, y0, z, r0, y1, r1) {
  const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, 32, 1, true);
  g.translate(x, (y0 + y1) / 2, z);
  return g;
}

/** Slatted vent grille on a wall / ceiling Frame (u, v centre; w × h). */
export function ventGrille(frame, u, v, w, h, { n = 0.0, color = PALETTE.impDark } = {}) {
  frame.box("paintedMetal", u, v, n - 0.02, w, h, 0.04, { color, texel: 2 });
  frame.box("metal", u, v, n + 0.005, w - 0.06, h - 0.06, 0.01, { color: PALETTE.impBlack });
  const slats = Math.max(3, Math.floor((h - 0.1) / 0.07));
  for (let s = 0; s < slats; s++) {
    const sv = v - h / 2 + 0.07 + (s / (slats - 1)) * (h - 0.14);
    frame.box("metal", u, sv, n + 0.012, w - 0.12, 0.018, 0.03, { color: PALETTE.steel, tilt: 0.5 });
  }
}

/** Cable tray: an open channel with `count` cables lying in it, along a line from a to b (deck-local). */
export function cableTray(kit, a, b, { w = 0.28, count = 3, color = PALETTE.impMid } = {}) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const mid = A.clone().add(B).multiplyScalar(0.5);
  const dir = B.clone().sub(A).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
  kit.add("paintedMetal", new THREE.BoxGeometry(len, 0.03, w), { pos: [mid.x, mid.y, mid.z], quat: q, color, texel: 2 });
  for (const s of [-1, 1]) kit.add("paintedMetal", new THREE.BoxGeometry(len, 0.08, 0.02), { pos: mid.clone().add(new THREE.Vector3(0, 0.04, s * (w / 2 - 0.01)).applyQuaternion(q)).toArray(), quat: q, color, texel: 2 });
  const rand = rng(Math.round(len * 100));
  for (let i = 0; i < count; i++) {
    const off = -w / 2 + 0.06 + (i / Math.max(1, count - 1)) * (w - 0.12);
    const r = 0.014 + rand() * 0.012;
    const g = new THREE.CylinderGeometry(r, r, len - 0.02, 8);
    g.rotateZ(Math.PI / 2);
    const col = [PALETTE.impBlack, PALETTE.steel, PALETTE.impRed, PALETTE.impDark][Math.floor(rand() * 4)];
    kit.add("rubber", g, { pos: mid.clone().add(new THREE.Vector3(0, 0.015 + r, off).applyQuaternion(q)).toArray(), quat: q, color: col, uv: "scale", uvScale: [0.2, len] });
  }
}

/** Datapad: a slim dark tablet with a lit screen lying on a surface at (x, y, z). */
export function datapad(kit, x, y, z, yaw = 0, screen = 0) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  kit.add("paintedMetal", new THREE.BoxGeometry(0.22, 0.015, 0.16), { pos: [x, y + 0.0075, z], quat: q, color: PALETTE.impBlack, texel: 3 });
  const sg = new THREE.PlaneGeometry(0.18, 0.12);
  sg.rotateX(-Math.PI / 2);
  kit.add("impScreen" + (screen % 5), sg, { pos: [x, y + 0.016, z], quat: q, uv: "keep" });
}

/** Mug / cup on a surface. */
export function mug(kit, x, y, z, color = PALETTE.impLight) {
  kit.cyl("paintedMetal", x, y + 0.045, z, 0.04, 0.09, "y", { color, segments: 12 });
  kit.cyl("paintedMetal", x, y + 0.088, z, 0.032, 0.006, "y", { color: PALETTE.impBlack, segments: 12 });
}

/** Floor scuff marks near a doorway: thin dark streaks on the deck. */
export function floorScuffs(kit, x, z, { n = 5, len = 0.9, yaw = 0, seed = 3, y = 0 } = {}) {
  const rand = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = yaw + (rand() - 0.5) * 0.5;
    const l = len * (0.4 + rand() * 0.8);
    const px = x + (rand() - 0.5) * 1.6;
    const pz = z + (rand() - 0.5) * 1.6;
    kit.add("rubber", new THREE.BoxGeometry(l, 0.003, 0.03 + rand() * 0.05), { pos: [px, y + 0.0035, pz], rot: [0, a, 0], color: PALETTE.impBlack, texel: 2 });
  }
}

/** Yaw (radians) that makes an impConsole at (x, z) face the point (tx, tz). */
export function faceYaw(x, z, tx, tz) {
  return Math.atan2(tx - x, tz - z) + Math.PI;
}

// ---------------------------------------------------------------------------
// The room
// ---------------------------------------------------------------------------
export function buildTactical(kit, ctx) {
  const [min, max] = ctx.bounds; // [-22, 0, -24] .. [-2.4, 5, -8]
  const H = max[1];
  const cx = (min[0] + max[0]) / 2; // -12.2
  const cz = (min[2] + max[2]) / 2; // -16
  const PL = 0.4; // platform (raised ring) height
  // well (lower area) extents and the gangway from the door
  const wx0 = cx - 5;
  const wx1 = cx + 5;
  const wz0 = cz - 5;
  const wz1 = cz + 5;
  const gz0 = cz - 2.2;
  const gz1 = cz + 2.2;

  const labels = labelAtlas(ctx, "tac_labels", [
    "TACTICAL OPERATIONS",
    "FLEET DISPOSITION",
    "TAC OPS  ·  DECK 02  ·  SECTION T-1",
    "HOLO-PLANNING",
    { text: "RESTRICTED  —  COMMAND STAFF ONLY", accent: "#ff4136", color: "#ffd9d4" },
    "SECTOR GRID  ·  PRIORITY CONTACTS",
    { text: "HULL STATUS", accent: "#ffb347", color: "#ffe6c4" },
  ]);

  // --- shell: darker panel mix so the screens carry the room; the ceiling is built below
  roomShell(kit, ctx, {
    ceiling: false,
    walls: {
      rows: [0, 0.5, 1.6, 2.6, 3.7, H],
      styles: IMP_STYLES_TECH,
      paints: [
        [PALETTE.impGrey, 0.42],
        [PALETTE.impLight, 0.3],
        [PALETTE.impMid, 0.22],
        [PALETTE.impDark, 0.06],
      ],
    },
  });
  {
    const f = ceilingFrame(kit, min[0], min[2], H);
    panelGrid(f, max[0] - min[0], max[2] - min[2], { rowH: 1.4, panelW: 1.4, kick: false, topPipes: false, seed: ctx.seed * 17 + 3, collide: false, styles: { panel: 0.82, greeble: 0.1, vent: 0.08 }, paints: [[PALETTE.impMid, 0.6], [PALETTE.impDark, 0.3], [PALETTE.impGrey, 0.1]], ...IMP_THEME, decals: false });
    // recessed strips over the station rows only (the table stays under the blue ring): dark housing,
    // a faint diffuser body and a narrow dim core, so the fixture reads as lit without clipping
    const strip = (x0, z0, x1, z1) => {
      const alongX = x1 - x0 > z1 - z0;
      kit.boxMM("paintedMetal", [x0 - 0.16, H - 0.1, z0 - 0.16], [x1 + 0.16, H, z1 + 0.16], { color: PALETTE.impDark, texel: 2 });
      kit.boxMM("emitWhiteFaint", [x0 - 0.07, H - 0.115, z0 - 0.07], [x1 + 0.07, H - 0.095, z1 + 0.07], { uv: "keep" });
      kit.boxMM("emitWhiteDim", [x0 + (alongX ? 0.1 : 0.045), H - 0.125, z0 + (alongX ? 0.045 : 0.1)], [x1 - (alongX ? 0.1 : 0.045), H - 0.11, z1 - (alongX ? 0.045 : 0.1)], { uv: "keep" });
    };
    strip(min[0] + 2.35, min[2] + 1.2, min[0] + 2.5, max[2] - 1.2);
    strip(max[0] - 2.65, min[2] + 1.2, max[0] - 2.5, gz0 - 0.6);
    strip(max[0] - 2.65, gz1 + 0.6, max[0] - 2.5, max[2] - 1.2);
    strip(wx0 + 0.8, min[2] + 1.55, wx1 - 0.8, min[2] + 1.7);
    strip(wx0 + 0.8, max[2] - 1.7, wx1 - 0.8, max[2] - 1.55);
  }

  // --- raised ring: four platforms leave the central well and the door gangway at deck level
  platform(kit, ctx, { x0: min[0], z0: min[2], x1: wx0, z1: max[2], y: PL, thickness: PL, edge: false });
  platform(kit, ctx, { x0: wx1, z0: min[2], x1: max[0], z1: gz0, y: PL, thickness: PL, edge: false });
  platform(kit, ctx, { x0: wx1, z0: gz1, x1: max[0], z1: max[2], y: PL, thickness: PL, edge: false });
  platform(kit, ctx, { x0: wx0, z0: min[2], x1: wx1, z1: wz0, y: PL, thickness: PL, edge: false });
  platform(kit, ctx, { x0: wx0, z0: wz1, x1: wx1, z1: max[2], y: PL, thickness: PL, edge: false });
  // platform noses: plain black step edges everywhere (the room's colour stays blue); the only hazard
  // marking is a thin nosing strip on the riser where a stair meets the platform
  const nose = (x0, z0, x1, z1) => {
    const alongX = x1 - x0 > z1 - z0;
    if (alongX) kit.boxMM("paintedMetal", [x0, PL - 0.06, z0 - 0.03], [x1, PL + 0.005, z1 + 0.03], { color: PALETTE.impBlack, texel: 2 });
    else kit.boxMM("paintedMetal", [x0 - 0.03, PL - 0.06, z0], [x1 + 0.03, PL + 0.005, z1], { color: PALETTE.impBlack, texel: 2 });
  };
  nose(wx0, min[2], wx0, wz0);
  nose(wx0, wz0, wx0, wz1);
  nose(wx0, wz1, wx0, max[2]);
  nose(wx1, min[2], wx1, wz0);
  nose(wx1, wz0, wx1, gz0);
  nose(wx1, gz1, wx1, wz1);
  nose(wx1, wz1, wx1, max[2]);
  nose(wx0, wz0, wx1, wz0);
  nose(wx0, wz1, wx1, wz1);
  nose(wx1, gz0, max[0], gz0);
  nose(wx1, gz1, max[0], gz1);
  // steps down into the well (two on the display side, one each fore / aft)
  stairs(kit, ctx, { x: wx0 + 0.6, z: cz - 3.5, y0: 0, y1: PL, axis: "x", dir: -1, w: 1.6, stringers: false });
  stairs(kit, ctx, { x: wx0 + 0.6, z: cz + 3.5, y0: 0, y1: PL, axis: "x", dir: -1, w: 1.6, stringers: false });
  stairs(kit, ctx, { x: cx, z: wz0 + 0.6, y0: 0, y1: PL, axis: "z", dir: -1, w: 1.8, stringers: false });
  stairs(kit, ctx, { x: cx, z: wz1 - 0.6, y0: 0, y1: PL, axis: "z", dir: 1, w: 1.8, stringers: false });
  // hazard nosing strips on the platform top edge either side of each stair head only
  for (const [x0, z0, x1, z1] of [
    [wx0 - 0.12, cz - 3.5 - 1.1, wx0, cz - 3.5 + 1.1],
    [wx0 - 0.12, cz + 3.5 - 1.1, wx0, cz + 3.5 + 1.1],
    [cx - 1.2, wz0 - 0.12, cx + 1.2, wz0],
    [cx - 1.2, wz1, cx + 1.2, wz1 + 0.12],
  ]) {
    kit.boxMM("hazard", [x0, PL + 0.006, z0], [x1, PL + 0.014, z1], { texel: 3 });
  }
  // recessed floor light channels: two along the gangway edges running from the door into the well,
  // and a ring channel around the table, so the deck between the door and the hologram reads
  const channel = (x0, z0, x1, z1) => {
    kit.boxMM("rubber", [x0, 0.002, z0], [x1, 0.008, z1], { color: PALETTE.impBlack, texel: 4 });
    const alongX = x1 - x0 > z1 - z0;
    const c = alongX ? [(z0 + z1) / 2, 0] : [(x0 + x1) / 2, 0];
    if (alongX) kit.boxMM("emitBlueDim", [x0 + 0.1, 0.006, c[0] - 0.02], [x1 - 0.1, 0.012, c[0] + 0.02]);
    else kit.boxMM("emitBlueDim", [c[0] - 0.02, 0.006, z0 + 0.1], [c[0] + 0.02, 0.012, z1 - 0.1]);
  };
  channel(cx + 3.0, gz0 + 0.3, max[0] - 1.0, gz0 + 0.46);
  channel(cx + 3.0, gz1 - 0.46, max[0] - 1.0, gz1 - 0.3);
  kit.add("rubber", new THREE.RingGeometry(2.42, 2.7, 72).rotateX(-Math.PI / 2), { pos: [cx, 0.004, cz], color: PALETTE.impBlack, texel: 4 });
  kit.add("emitBlueDim", new THREE.RingGeometry(2.54, 2.58, 72).rotateX(-Math.PI / 2), { pos: [cx, 0.009, cz] });
  // blue guide strips on the well floor at the platform bases (the well edge only; the gangway is plain)
  const guide = (x0, z0, x1, z1) => kit.boxMM("emitBlue", [x0, 0.004, z0], [x1, 0.03, z1]);
  guide(wx0 + 0.02, wz0 + 0.02, wx0 + 0.07, cz - 4.4);
  guide(wx0 + 0.02, cz - 2.6, wx0 + 0.07, cz + 2.6);
  guide(wx0 + 0.02, cz + 4.4, wx0 + 0.07, wz1 - 0.02);
  guide(wx0 + 0.02, wz0 + 0.02, cx - 1.0, wz0 + 0.07);
  guide(cx + 1.0, wz0 + 0.02, wx1 - 0.02, wz0 + 0.07);
  guide(wx0 + 0.02, wz1 - 0.07, cx - 1.0, wz1 - 0.02);
  guide(cx + 1.0, wz1 - 0.07, wx1 - 0.02, wz1 - 0.02);
  guide(wx1 - 0.07, wz0 + 0.02, wx1 - 0.02, gz0 - 0.02);
  guide(wx1 - 0.07, gz1 + 0.02, wx1 - 0.02, wz1 - 0.02);
  // gangway deck: scuffs in front of the door
  floorScuffs(kit, max[0] - 1.6, cz, { n: 7, len: 1.2, yaw: Math.PI / 2, seed: 41 });

  // --- holo table
  holoTable(kit, ctx, cx, cz, labels);

  // --- standing console ring in the well (gap toward the gangway): three station types
  for (const deg of [30, 150, 210, 270, 330]) {
    const a = (deg * Math.PI) / 180;
    const r = 3.35;
    const x = cx + Math.sin(a) * r;
    const z = cz + Math.cos(a) * r;
    const yaw = faceYaw(x, z, cx, cz);
    ringStation(kit, ctx, { x, z, yaw, deg, seed: ctx.seed + deg });
    // floor conduit from the console underside to the table plinth
    const ux = Math.sin(a);
    const uz = Math.cos(a);
    pipeRun(kit, [[cx + ux * (r - 0.3), 0.045, cz + uz * (r - 0.3)], [cx + ux * 2.0, 0.045, cz + uz * 2.0]], 0.045, PALETTE.impBlack, "rubber");
  }
  // low guard ring around the projection (dark posts, steel rail, black kick tube), open toward the gangway
  {
    const r = 2.45;
    const h = 0.46;
    const degs = [135, 165, 195, 225, 255, 285, 315, 345, 15, 45];
    const at = (deg) => [cx + Math.sin((deg * Math.PI) / 180) * r, cz + Math.cos((deg * Math.PI) / 180) * r];
    for (const deg of degs) {
      const [x, z] = at(deg);
      kit.box("paintedMetal", x, h / 2, z, 0.06, h, 0.06, { color: PALETTE.impDark, texel: 2 });
      kit.box("metal", x, 0.03, z, 0.14, 0.06, 0.14, { color: PALETTE.impMid });
      kit.box("emitBlueDim", x, h - 0.1, z, 0.064, 0.05, 0.064);
    }
    for (let i = 0; i < degs.length - 1; i++) {
      const [x0, z0] = at(degs[i]);
      const [x1, z1] = at(degs[i + 1]);
      const len = Math.hypot(x1 - x0, z1 - z0);
      const ang = Math.atan2(x1 - x0, z1 - z0);
      for (const [yy, rr, col] of [[h, 0.022, PALETTE.steel], [0.16, 0.016, PALETTE.impBlack]]) {
        const g = new THREE.CylinderGeometry(rr, rr, len, 8);
        g.rotateX(Math.PI / 2);
        kit.add("metal", g, { pos: [(x0 + x1) / 2, yy, (z0 + z1) / 2], rot: [0, ang, 0], color: col, uv: "scale", uvScale: [0.2, len] });
      }
      kit.collider([Math.min(x0, x1) - 0.05, 0, Math.min(z0, z1) - 0.05], [Math.max(x0, x1) + 0.05, h, Math.max(z0, z1) + 0.05], "guard");
    }
  }
  // two low seated plotter stations backed against the door-side risers either side of the gangway
  // mouth, looking past the table at the video wall (an axis-aligned footprint keeps the walk lane
  // along the well's fore / aft edge and the passage past the 30° / 150° stations clear)
  for (const [z, seed] of [[gz0 - 1.3, 3], [gz1 + 1.3, 4]]) {
    const x = wx1 - 1.25;
    impConsole(kit, ctx, { x, z, yaw: Math.PI / 2, w: 1.3, d: 0.65, h: 0.82, screens: [2, 4], chair: true, seed: ctx.seed + 50 + seed, lampMat: "emitAmber", layout: seed === 3 ? "keypad" : "main" });
  }

  // --- seated analyst stations on the display-side platform (facing the 6 m wall)
  for (const z of [cz - 4.6, cz, cz + 4.6]) {
    impConsole(kit, ctx, { x: min[0] + 1.35, z, y: PL, yaw: Math.PI / 2, w: 2.1, d: 0.8, screens: [2, 0, 2], chair: true, seed: ctx.seed + Math.round(z) });
  }
  // seated stations fore / aft looking down at the table: the fore pair are sensor stations with a
  // raised readout, the aft pair wider comms desks with keypads (no two are the same layout)
  impConsole(kit, ctx, { x: cx - 3.0, z: min[2] + 1.6, y: PL, yaw: Math.PI, w: 1.9, d: 0.8, screens: [0, 1], chair: true, tall: true, seed: ctx.seed + 11, layout: "main" });
  impConsole(kit, ctx, { x: cx + 3.1, z: min[2] + 1.6, y: PL, yaw: Math.PI, w: 1.7, d: 0.8, h: 1.0, screens: [3, 0], chair: true, seed: ctx.seed + 12, layout: "equal", lampMat: "emitAmber" });
  impConsole(kit, ctx, { x: cx - 3.1, z: max[2] - 1.6, y: PL, yaw: 0, w: 2.2, d: 0.8, screens: [2, 0], chair: true, seed: ctx.seed + 17, layout: "keypad" });
  impConsole(kit, ctx, { x: cx + 3.0, z: max[2] - 1.6, y: PL, yaw: 0, w: 1.9, d: 0.8, screens: [1, 2], chair: true, seed: ctx.seed + 18, layout: "main", lampMat: "emitAmber" });
  // door-side platforms: a standing station on each, facing the table (one with the raised readout)
  impConsole(kit, ctx, { x: max[0] - 2.6, z: min[2] + 2.6, y: PL, yaw: faceYaw(max[0] - 2.6, min[2] + 2.6, cx, cz), w: 1.6, d: 0.75, h: 1.0, screens: [1, 0], tall: true, seed: ctx.seed + 23 });
  impConsole(kit, ctx, { x: max[0] - 2.6, z: max[2] - 2.6, y: PL, yaw: faceYaw(max[0] - 2.6, max[2] - 2.6, cx, cz), w: 1.5, d: 0.75, h: 0.92, screens: [0, 4], seed: ctx.seed + 29, lampMat: "emitAmber" });

  // --- 6 m segmented video wall on the xmin wall (5 × 3 tiles), header sign, readout ledge
  videoWall(kit, ctx, labels);

  // --- strategy board on the zmax wall
  strategyBoard(kit, ctx, labels);

  // --- zmin wall: three map screens over the fore stations, racks in the corners
  {
    const seg = wallSegment(ctx.bounds, "zmin");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    const raised = [[min[0], PL, min[2]], [max[0], H, max[2]]];
    for (const [x, s, w] of [[cx - 6.6, 1, 1.6], [cx, 0, 1.9], [cx + 6.6, 2, 1.9]]) wallScreen(kit, ctx, { side: "zmin", u: x - min[0], v: 2.75, w, h: 1.0, screen: s });
    // far corner: a narrow data tower (stacked displays, lamp column) instead of a second rack copy
    dataTower(kit, frame, 1.3, PL);
    equipmentRack(kit, ctx, { side: "zmin", u: max[0] - min[0] - 1.4, w: 1.5, h: 2.5, bounds: raised, seed: ctx.seed + 4, lit: "emitAmber" });
    signPlate(frame, labels, 5, { u: cx - min[0], v: 3.75, h: 0.26 });
    ventGrille(frame, 4.2, 4.3, 1.0, 0.5);
    ventGrille(frame, max[0] - min[0] - 4.2, 4.3, 1.0, 0.5);
    // wall-base conduit run on the platform
    pipeRun(kit, [[wx0 + 0.3, PL + 0.25, min[2] + 0.12], [wx1 - 0.3, PL + 0.25, min[2] + 0.12]], 0.05, PALETTE.impMid);
    pipeRun(kit, [[wx0 + 0.3, PL + 0.38, min[2] + 0.12], [wx1 - 0.3, PL + 0.38, min[2] + 0.12]], 0.03, PALETTE.steel);
  }

  // --- door wall (xmax): racks, screens, the room sign over the door, a comm panel, crates
  {
    const seg = wallSegment(ctx.bounds, "xmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    const raised = [[min[0], PL, min[2]], [max[0], H, max[2]]];
    const uDoor = cz - min[2];
    signPlate(frame, labels, 2, { u: uDoor, v: 3.75, h: 0.3 });
    signPlate(frame, labels, 4, { u: uDoor, v: 4.25, h: 0.2 });
    equipmentRack(kit, ctx, { side: "xmax", u: 1.2, w: 1.4, h: 2.6, bounds: raised, seed: ctx.seed + 7 });
    equipmentRack(kit, ctx, { side: "xmax", u: max[2] - min[2] - 1.2, w: 1.4, h: 2.6, bounds: raised, seed: ctx.seed + 8 });
    wallScreen(kit, ctx, { side: "xmax", u: uDoor - 3.4, v: 2.5, w: 1.6, h: 0.9, screen: 1 });
    wallScreen(kit, ctx, { side: "xmax", u: uDoor + 3.4, v: 2.4, w: 1.2, h: 0.7, screen: 4 });
    // comm panel beside the door (on the gangway wall, deck level)
    frame.box("paintedMetal", uDoor + 2.0, 1.35, 0.05, 0.36, 0.5, 0.1, { color: PALETTE.impDark, texel: 2 });
    frame.box("impScreen4", uDoor + 2.0, 1.45, 0.101, 0.28, 0.16, 0.006, { uv: "keep" });
    frame.box("emitRed", uDoor + 2.0, 1.2, 0.101, 0.06, 0.03, 0.006);
    frame.box("emitBlue", uDoor + 2.1, 1.2, 0.101, 0.06, 0.03, 0.006);
    frame.add("decal", new THREE.PlaneGeometry(0.3, 0.3), uDoor - 2.0, 1.4, 0.001, { uv: "keep", uvRect: decalRect(1) });
    crate(kit, ctx, { x: max[0] - 0.9, y: PL, z: min[2] + 4.2, sx: 1.0, sy: 0.8, sz: 1.0, yaw: 0.2, seed: 5 });
    crate(kit, ctx, { x: max[0] - 0.9, y: PL, z: max[2] - 4.2, sx: 0.9, sy: 1.1, sz: 0.9, yaw: -0.15, seed: 6 });
    crate(kit, ctx, { x: max[0] - 1.9, y: PL, z: max[2] - 4.0, sx: 0.7, sy: 0.6, sz: 0.7, yaw: 0.4, seed: 7 });
  }

  // --- hull-status pedestal with the ship hologram (fore platform, between the two stations)
  {
    const px = cx;
    const pz = min[2] + 1.5;
    kit.cyl("paintedMetal", px, PL + 0.06, pz, 0.55, 0.12, "y", { color: PALETTE.impBlack, segments: 24 });
    kit.cyl("paintedMetal", px, PL + 0.55, pz, 0.38, 0.86, "y", { color: PALETTE.impDark, segments: 24 });
    kit.cyl("darkGloss", px, PL + 1.0, pz, 0.46, 0.05, "y", { segments: 24 });
    kit.add("emitBlue", new THREE.TorusGeometry(0.44, 0.02, 8, 48).rotateX(Math.PI / 2), { pos: [px, PL + 1.03, pz] });
    const hm = holoMaterial(ctx, "cmd_holo");
    const swatch = (s) => [s[0], s[1], s[0], s[1]];
    kit.add(hm.key, new THREE.CircleGeometry(0.4, 32).rotateX(-Math.PI / 2), { pos: [px, PL + 1.04, pz], uv: "keep" });
    kit.add(hm.key, holoCone(px, PL + 1.05, pz, 0.08, PL + 1.5, 0.5), { uv: "keep", uvRect: swatch(hm.dim) });
    signAt(kit, labels, 6, { x: px, y: PL + 0.72, z: pz + 0.39, yaw: 0, h: 0.09 });
    kit.collider([px - 0.56, PL, pz - 0.56], [px + 0.56, PL + 1.05, pz + 0.56], "pedestal");
    hologram(kit, ctx, { x: px, y: PL + 1.62, z: pz, kind: "ship", scale: 0.75 });
  }

  // --- ceiling structure: octagonal ring beam with the blue ring light, radial beams, trays, vents
  ceilingStructure(kit, ctx, cx, cz, H);

  // --- lights (7 of the 8 allowed): blue key over the table, dim cool fill, amber accents
  ctx.light(pointLight(0x4a9dff, 7.5, 12, [cx, 3.0, cz]));
  ctx.light(pointLight(0xaec4ea, 2.6, 8, [min[0] + 2.4, H - 1.0, cz - 4.2]));
  ctx.light(pointLight(0xaec4ea, 2.6, 8, [min[0] + 2.4, H - 1.0, cz + 4.2]));
  ctx.light(pointLight(0xaec4ea, 2.4, 8, [max[0] - 2.6, H - 1.0, cz - 5.0]));
  ctx.light(pointLight(0xaec4ea, 2.4, 8, [max[0] - 2.6, H - 1.0, cz + 5.0]));
  ctx.light(pointLight(0xffb347, 3.5, 7, [cx, 3.3, max[2] - 1.2]));
  ctx.light(pointLight(0xffb347, 2.2, 5.5, [max[0] - 1.3, 3.4, cz]));

  // ambient loop hook
  if (ctx.audioZone) ctx.audioZone({ id: "tactical_hum", pos: [cx, 1.2, cz], radius: 9, loop: "hum_low" });
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
/**
 * Standing station of the console ring, three types keyed by the ring angle: plotters flanking the
 * gangway (low slab, amber lamps, readout pad on a side arm), fleet-control stations (taller body with
 * the raised rear readout) and the director's station opposite the door (widest, three screens, grab rail).
 */
function ringStation(kit, ctx, { x, z, yaw, deg, seed }) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
  const add = (mat, geo, lx, ly, lz, extra = {}, tiltX = 0) => {
    const p = local(lx, ly, lz);
    const qq = tiltX ? q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tiltX)) : q;
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: qq, ...extra });
  };
  if (deg === 30 || deg === 330) {
    impConsole(kit, ctx, { x, z, yaw, w: 1.6, d: 0.75, h: 0.92, screens: [2, 0], seed, lampMat: "emitAmber" });
    // readout pad on an arm bolted to the cheek away from the gangway
    const ax = -0.86;
    add("metal", new THREE.BoxGeometry(0.1, 0.03, 0.14), ax + 0.03, 0.56, -0.1, { color: PALETTE.impBlack });
    add("metal", new THREE.CylinderGeometry(0.022, 0.022, 0.66, 8), ax, 0.88, -0.1, { color: PALETTE.impMid });
    const tilt = -0.35;
    add("paintedMetal", new THREE.BoxGeometry(0.4, 0.28, 0.04), ax, 1.26, -0.06, { color: PALETTE.impBlack, texel: 3 }, tilt);
    add("impScreen4", new THREE.PlaneGeometry(0.34, 0.22), ax, 1.26 + 0.021 * Math.sin(-tilt), -0.06 + 0.021 * Math.cos(tilt), { uv: "keep" }, tilt);
    add("emitAmber", new THREE.BoxGeometry(0.06, 0.02, 0.01), ax + 0.15, 1.26 - 0.15 + 0.03 * Math.sin(-tilt), -0.06 + 0.03 * Math.cos(tilt), {}, tilt);
  } else if (deg === 150) {
    // fleet control A: the stock tall riser with one large display, a blue status bar and a cable loom
    impConsole(kit, ctx, { x, z, yaw, w: 1.9, d: 0.8, h: 1.08, screens: [3, 0], tall: true, seed, lampMat: "emitBlue", layout: "main" });
    add("emitBlue", new THREE.BoxGeometry(1.5, 0.02, 0.02), 0, 1.94, -0.34);
    add("rubber", new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), 0.3, 1.4, -0.47, { color: PALETTE.impBlack });
  } else if (deg === 210) {
    // fleet control B: wider, lower body with a keypad slab; an off-centre narrow riser column carrying
    // two stacked displays, a lamp column up its edge and an amber status bar (not a copy of A)
    const h = 1.0;
    impConsole(kit, ctx, { x, z, yaw, w: 2.1, d: 0.8, h, screens: [1, 2], seed, lampMat: "emitAmber", layout: "keypad" });
    const rx = 0.42;
    const rz = -0.35;
    add("paintedMetal", new THREE.BoxGeometry(1.1, 1.1, 0.12), rx, h + 0.58, rz, { color: PALETTE.impDark, texel: 1.5 });
    add("paintedMetal", new THREE.BoxGeometry(1.16, 0.06, 0.18), rx, h + 1.16, rz, { color: PALETTE.impBlack, texel: 2 });
    for (const [ly, idx] of [[h + 0.34, 1], [h + 0.82, 2]]) {
      add("darkGloss", new THREE.BoxGeometry(0.9, 0.4, 0.012), rx + 0.06, ly, rz + 0.065);
      add("impScreen" + idx, new THREE.PlaneGeometry(0.86, 0.36), rx + 0.06, ly, rz + 0.072, { uv: "keep" });
    }
    for (let k = 0; k < 6; k++) add(k === 4 ? "emitRed" : k % 2 ? "emitAmberDim" : "emitBlueDim", new THREE.BoxGeometry(0.05, 0.04, 0.01), rx - 0.47, h + 0.16 + k * 0.16, rz + 0.066);
    add("emitAmberDim", new THREE.BoxGeometry(1.0, 0.02, 0.02), rx, h + 1.2, rz + 0.08);
    add("rubber", new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), -0.7, 0.75, -0.46, { color: PALETTE.impBlack });
    add("rubber", new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), -0.62, 0.75, -0.46, { color: PALETTE.impBlack });
  } else {
    impConsole(kit, ctx, { x, z, yaw, w: 2.3, d: 0.8, h: 1.0, screens: [0, 3, 1], seed, lampMat: "emitBlue" });
    // grab rail along the operator edge and a lit strip up each cheek
    add("metal", new THREE.CylinderGeometry(0.02, 0.02, 2.0, 10).rotateZ(Math.PI / 2), 0, 0.9, 0.56, { color: PALETTE.steel });
    for (const s of [-1, 1]) {
      add("metal", new THREE.BoxGeometry(0.04, 0.04, 0.2), s * 0.95, 0.9, 0.47, { color: PALETTE.impBlack });
      add("emitBlue", new THREE.BoxGeometry(0.012, 0.5, 0.03), s * 1.16, 0.5, -0.1);
    }
  }
}

/** Narrow wall-mounted data tower on a wall Frame: stacked displays, a lamp column, vented base (rack alternative). */
function dataTower(kit, frame, u, y0) {
  const w = 1.0;
  const h = 3.0;
  const d = 0.5;
  frame.box("paintedMetal", u, y0 + h / 2, d / 2, w, h, d, { color: PALETTE.impDark, texel: 1.5 });
  frame.box("impPanel", u, y0 + h / 2, d + 0.006, w - 0.1, h - 0.1, 0.012, { color: PALETTE.impBlack, uv: "keep" });
  frame.box("paintedMetal", u, y0 + 0.08, d / 2, w + 0.04, 0.16, d + 0.04, { color: PALETTE.impBlack, texel: 2 });
  ventGrille(frame, u, y0 + 0.45, 0.7, 0.3, { n: d + 0.01 });
  for (const [v, idx, sh] of [[y0 + 1.15, 2, 0.5], [y0 + 1.85, 0, 0.6], [y0 + 2.45, 4, 0.36]]) {
    frame.box("darkGloss", u + 0.06, v, d + 0.014, 0.66, sh + 0.04, 0.012);
    frame.add("impScreen" + idx, new THREE.PlaneGeometry(0.62, sh), u + 0.06, v, d + 0.021, { uv: "keep" });
  }
  for (let k = 0; k < 9; k++) frame.box(k === 6 ? "emitRed" : k % 3 === 1 ? "emitAmberDim" : "emitBlueDim", u - 0.38, y0 + 0.85 + k * 0.22, d + 0.016, 0.05, 0.05, 0.01);
  frame.box("emitAmberDim", u, y0 + h - 0.12, d + 0.016, w - 0.3, 0.02, 0.01);
  frame.box("leds", u + 0.06, y0 + 0.78, d + 0.016, 0.5, 0.03, 0.008, { uv: "keep" });
  frame.collider(u - w / 2, u + w / 2, y0, y0 + h, 0, d, "tower");
  void kit;
}

function holoTable(kit, ctx, cx, cz, labels) {
  const R = 1.75;
  // plinth, kick recess, drum body, top slab, blue rim
  kit.cyl("paintedMetal", cx, 0.06, cz, R + 0.18, 0.12, "y", { color: PALETTE.impBlack, segments: 48 });
  kit.cyl("emitBlue", cx, 0.135, cz, R - 0.12, 0.03, "y", { segments: 48 });
  kit.cyl("paintedMetal", cx, 0.19, cz, R - 0.16, 0.08, "y", { color: PALETTE.impBlack, segments: 48 });
  kit.cyl("paintedMetal", cx, 0.55, cz, R, 0.64, "y", { color: PALETTE.impDark, segments: 48, texel: 1.5 });
  // vertical seam ribs and small status lamps around the drum
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x = cx + Math.cos(a) * (R + 0.01);
    const z = cz + Math.sin(a) * (R + 0.01);
    kit.add("impPanel", new THREE.BoxGeometry(0.05, 0.6, 0.06), { pos: [x, 0.55, z], rot: [0, -a, 0], color: PALETTE.impGrey, uv: "keep" });
    if (i % 2 === 0) kit.add(i % 6 === 0 ? "emitAmber" : "emitBlue", new THREE.BoxGeometry(0.04, 0.02, 0.012), { pos: [cx + Math.cos(a + 0.12) * (R + 0.006), 0.7, cz + Math.sin(a + 0.12) * (R + 0.006)], rot: [0, -a - 0.12, 0] });
  }
  kit.cyl("darkGloss", cx, 0.9 - 0.03, cz, R + 0.06, 0.06, "y", { segments: 48 });
  kit.add("emitBlue", new THREE.TorusGeometry(R + 0.02, 0.028, 8, 72).rotateX(Math.PI / 2), { pos: [cx, 0.905, cz] });
  // emitter face: dark glass disc with a holo-grid inlay and a lit centre lens
  kit.cyl("paintedMetal", cx, 0.905, cz, R - 0.25, 0.02, "y", { color: PALETTE.impBlack, segments: 48 });
  kit.add("holo", new THREE.CircleGeometry(R - 0.3, 48).rotateX(-Math.PI / 2), { pos: [cx, 0.92, cz], texel: 2 });
  kit.cyl("emitWhiteDim", cx, 0.918, cz, 0.22, 0.01, "y", { segments: 24, uv: "keep" });
  // eight sloped control panels around the rim (local x = radial / outward, local z = tangential;
  // the panel dips toward the operator standing outside the drum)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.45);
    const qq = q.clone().multiply(tilt);
    const px = cx + Math.cos(a) * (R - 0.42);
    const pz = cz + Math.sin(a) * (R - 0.42);
    const at = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(qq).add(new THREE.Vector3(px, 0.99, pz)).toArray();
    kit.add("paintedMetal", new THREE.BoxGeometry(0.34, 0.04, 0.5), { pos: at(0, 0, 0), quat: qq, color: PALETTE.impBlack, texel: 2 });
    const sg = new THREE.PlaneGeometry(0.34, 0.2);
    sg.rotateX(-Math.PI / 2);
    sg.rotateY(Math.PI / 2);
    kit.add("impScreen" + (i % 3 === 1 ? 2 : 0), sg, { pos: at(-0.05, 0.022, 0), quat: qq, uv: "keep" });
    for (let b = 0; b < 4; b++) {
      const lit = (i + b) % 3 === 0;
      kit.add(lit ? (b % 2 ? "emitAmber" : "emitBlue") : "rubber", new THREE.BoxGeometry(0.05, 0.02, 0.06), { pos: at(0.115, 0.03, -0.18 + b * 0.12), quat: qq, color: PALETTE.rubber });
    }
  }
  signAt(kit, labels, 3, { x: cx, y: 0.5, z: cz + R + 0.03, yaw: 0, h: 0.075 });
  signAt(kit, labels, 3, { x: cx, y: 0.5, z: cz - R - 0.03, yaw: Math.PI, h: 0.075 });
  kit.collider([cx - R - 0.2, 0, cz - R - 0.2], [cx + R + 0.2, 0.95, cz + R + 0.2], "holotable");

  // --- the projection: one merged additive mesh (scope disc, our own wedge, contacts with stems,
  // an orbital track) plus the projection cone rising from the lens; the whole thing turns slowly
  const hm = holoMaterial(ctx, "cmd_holo");
  const items = [];
  const disc = new THREE.CircleGeometry(1.55, 64);
  disc.rotateX(-Math.PI / 2);
  items.push({ geo: disc, uv: "keep" });
  items.push({ geo: new THREE.RingGeometry(1.55, 1.6, 64).rotateX(-Math.PI / 2), uv: hm.bright });
  // the flagship at the centre (a wedge with a tower) and its heading line
  const shape = new THREE.Shape([new THREE.Vector2(0, -0.6), new THREE.Vector2(0.32, 0.5), new THREE.Vector2(-0.32, 0.5)]);
  const wedge = new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: false });
  wedge.rotateX(Math.PI / 2);
  wedge.translate(0, 0.32, 0);
  items.push({ geo: wedge, uv: hm.mid });
  items.push({ geo: new THREE.BoxGeometry(0.18, 0.1, 0.12).translate(0, 0.41, 0.28), uv: hm.mid });
  items.push({ geo: new THREE.BoxGeometry(0.01, 0.01, 0.7).translate(0, 0.32, -0.98), uv: hm.bright });
  // hostile / friendly contacts with stems and floor markers
  const rnd = rng(19);
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 0.55 + rnd() * 0.95;
    const h = 0.14 + rnd() * 0.85;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const m = i % 4 === 0 ? new THREE.TetrahedronGeometry(0.08) : new THREE.OctahedronGeometry(0.065);
    m.translate(x, h, z);
    items.push({ geo: m, uv: hm.bright });
    items.push({ geo: new THREE.BoxGeometry(0.01, h, 0.01).translate(x, h / 2, z), uv: hm.mid });
    items.push({ geo: new THREE.RingGeometry(0.06, 0.09, 16).rotateX(-Math.PI / 2).translate(x, 0.006, z), uv: hm.bright });
  }
  // an orbital track and a planet marker
  items.push({ geo: new THREE.TorusGeometry(1.15, 0.01, 6, 96).rotateX(Math.PI / 2 + 0.35).translate(0, 0.45, 0), uv: hm.bright });
  items.push({ geo: new THREE.SphereGeometry(0.11, 16, 12).translate(1.15, 0.45, 0), uv: hm.mid });
  // projection cone from the lens up to the disc rim
  items.push({ geo: holoCone(0, -0.56, 0, 0.2, -0.01, 1.5), uv: hm.dim });
  const holo = mergedMesh(ctx, hm.key, items, { pos: [cx, 1.5, cz] });
  ctx.anim((dt, t) => {
    holo.rotation.y = t * 0.16;
    holo.position.y = 1.5 + Math.sin(t * 0.7) * 0.02;
  });
}

function videoWall(kit, ctx, labels) {
  const [min, max] = ctx.bounds;
  const PL = 0.4;
  const seg = wallSegment(ctx.bounds, "xmin");
  const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
  const uc = length / 2;
  const W = 6.0;
  const cols = 5;
  const rows = 3;
  const gap = 0.05;
  const tw = (W - gap * (cols - 1)) / cols;
  const v0 = 1.55;
  const th = 0.72;
  const Hd = rows * th + gap * (rows - 1);
  frame.box("paintedMetal", uc, v0 + Hd / 2, 0.075, W + 0.36, Hd + 0.36, 0.15, { color: PALETTE.impBlack, texel: 2 });
  frame.box("impPanel", uc, v0 + Hd / 2, 0.152, W + 0.2, Hd + 0.2, 0.006, { color: PALETTE.impDark, uv: "keep" });
  const rnd = rng(77);
  const pick = [0, 2, 0, 2, 0, 2, 0, 4, 0, 2, 0, 2, 3, 2, 0];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = uc - W / 2 + tw / 2 + c * (tw + gap);
      const v = v0 + th / 2 + r * (th + gap);
      frame.box("darkGloss", u, v, 0.165, tw + 0.02, th + 0.02, 0.012);
      frame.add("impScreen" + pick[(r * cols + c) % pick.length], new THREE.PlaneGeometry(tw, th), u, v, 0.173, { uv: "keep" });
      void rnd;
    }
  }
  // header sign, LED readout ledge, corner lamps
  signPlate(frame, labels, 0, { u: uc, v: v0 + Hd + 0.5, h: 0.34, n: 0.0 });
  frame.box("paintedMetal", uc, v0 - 0.22, 0.06, W + 0.36, 0.16, 0.12, { color: PALETTE.impDark, texel: 2 });
  for (let i = 0; i < 6; i++) frame.box("leds", uc - W / 2 + 0.5 + i * ((W - 1.0) / 5), v0 - 0.22, 0.121, 0.6, 0.05, 0.006, { uv: "keep" });
  for (const s of [-1, 1]) {
    frame.box("emitBlue", uc + s * (W / 2 + 0.11), v0 + Hd / 2, 0.152, 0.02, Hd - 0.2, 0.01);
  }
  // a hand-rail ledge for the standing briefers below the wall, with datapads and a mug
  const ledgeV = PL + 0.95;
  frame.box("paintedMetal", uc, ledgeV, 0.2, W - 0.4, 0.05, 0.4, { color: PALETTE.impDark, texel: 2 });
  frame.box("paintedMetal", uc, ledgeV - 0.5, 0.06, W - 0.6, 1.0, 0.12, { color: PALETTE.impBlack, texel: 2 });
  frame.box("emitAmber", uc, ledgeV - 0.04, 0.395, W - 0.6, 0.012, 0.01);
  frame.collider(uc - W / 2 + 0.2, uc + W / 2 - 0.2, PL, ledgeV + 0.03, 0, 0.42, "ledge");
  const p1 = frame.pos(uc - 1.6, ledgeV + 0.025, 0.22);
  const p2 = frame.pos(uc + 0.9, ledgeV + 0.025, 0.25);
  const p3 = frame.pos(uc + 2.2, ledgeV + 0.025, 0.2);
  datapad(kit, p1.x, p1.y, p1.z, 0.3, 2);
  datapad(kit, p2.x, p2.y, p2.z, -0.2, 0);
  mug(kit, p3.x, p3.y, p3.z);
  // conduit drops from the ceiling into junction boxes beside the display
  for (const du of [-3.5, 3.5]) {
    const yj = v0 + Hd * 0.5;
    frame.box("paintedMetal", uc + du, yj, 0.07, 0.24, 0.34, 0.14, { color: PALETTE.impDark, texel: 2 });
    frame.box("emitBlue", uc + du, yj + 0.1, 0.141, 0.05, 0.02, 0.006);
    frame.box("leds", uc + du, yj - 0.08, 0.141, 0.16, 0.03, 0.006, { uv: "keep" });
    frame.cylV("metal", uc + du, (yj + 0.17 + max[1]) / 2, 0.06, 0.035, max[1] - yj - 0.17, { color: PALETTE.impMid, segments: 10 });
  }
  void min;
}

function strategyBoard(kit, ctx, labels) {
  const [min, max] = ctx.bounds;
  const PL = 0.4;
  const seg = wallSegment(ctx.bounds, "zmax");
  const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
  const uc = length / 2;
  const W = 8.4;
  const v0 = 1.3;
  const Hb = 2.2;
  frame.box("paintedMetal", uc, v0 + Hb / 2, 0.05, W, Hb, 0.1, { color: PALETTE.impDark, texel: 1.5 });
  frame.box("paintedMetal", uc, v0 + Hb / 2, 0.1, W - 0.2, Hb - 0.2, 0.01, { color: PALETTE.impBlack, texel: 2 });
  signPlate(frame, labels, 1, { u: uc, v: v0 + Hb - 0.28, h: 0.3, n: 0.1 });
  // 2 rows × 4 screens with status lamp columns between them
  const sw = 1.55;
  const sh = 0.66;
  const rnd = rng(91);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      const u = uc - 3.1 + c * 2.05;
      const v = v0 + 0.5 + r * 0.82;
      frame.box("darkGloss", u, v, 0.112, sw + 0.04, sh + 0.04, 0.012);
      const idx = [0, 2, 1, 0, 2, 0, 4, 2][r * 4 + c];
      frame.add("impScreen" + idx, new THREE.PlaneGeometry(sw, sh), u, v, 0.12, { uv: "keep" });
      // lamp column to the right of the screen
      for (let k = 0; k < 5; k++) {
        const lit = rnd();
        frame.box(lit < 0.55 ? "emitBlue" : lit < 0.8 ? "emitAmber" : lit < 0.9 ? "emitRed" : "rubber", u + sw / 2 + 0.16, v - sh / 2 + 0.08 + k * 0.125, 0.112, 0.05, 0.05, 0.01, { color: PALETTE.rubber });
      }
    }
  }
  // ledge with datapads, a red alert lamp, cable drops to the ceiling
  const ledgeV = v0 - 0.08;
  frame.box("paintedMetal", uc, ledgeV, 0.16, W - 0.6, 0.06, 0.32, { color: PALETTE.impMid, texel: 2 });
  frame.collider(uc - W / 2 + 0.3, uc + W / 2 - 0.3, PL, ledgeV + 0.03, 0, 0.34, "ledge");
  for (const [du, yaw, s] of [[-2.9, 0.2, 0], [-0.6, -0.35, 2], [1.7, 0.1, 4], [3.2, 0.5, 0]]) {
    const p = frame.pos(uc + du, ledgeV + 0.03, 0.17);
    datapad(kit, p.x, p.y, p.z, yaw, s);
  }
  const pm = frame.pos(uc + 2.5, ledgeV + 0.03, 0.2);
  mug(kit, pm.x, pm.y, pm.z, PALETTE.impGrey);
  frame.box("paintedMetal", uc - W / 2 - 0.5, 3.6, 0.06, 0.3, 0.3, 0.12, { color: PALETTE.impBlack, texel: 2 });
  frame.box("emitRedSoft", uc - W / 2 - 0.5, 3.6, 0.125, 0.2, 0.2, 0.01, { uv: "keep" });
  frame.box("paintedMetal", uc + W / 2 + 0.5, 3.6, 0.06, 0.3, 0.3, 0.12, { color: PALETTE.impBlack, texel: 2 });
  frame.box("emitAmber", uc + W / 2 + 0.5, 3.6, 0.125, 0.2, 0.2, 0.01);
  for (const du of [-3.4, -1.1, 1.1, 3.4]) frame.cylV("metal", uc + du, (v0 + Hb + max[1]) / 2, 0.05, 0.03, max[1] - v0 - Hb, { color: PALETTE.impMid, segments: 8 });
  ventGrille(frame, 1.6, 4.2, 1.1, 0.5);
  ventGrille(frame, length - 1.6, 4.2, 1.1, 0.5);
  void min;
}

function ceilingStructure(kit, ctx, cx, cz, H) {
  const [min, max] = ctx.bounds;
  const yTop = H;
  const beamH = 0.5;
  const yb = yTop - beamH / 2; // beam centre
  // octagonal ring beam (apothem 4.05 outer / 3.7 inner)
  const oct = (apothem) => {
    const R = apothem / Math.cos(Math.PI / 8);
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      pts.push(new THREE.Vector2(Math.cos(a) * R, Math.sin(a) * R));
    }
    return pts;
  };
  const shape = new THREE.Shape(oct(4.05));
  shape.holes.push(new THREE.Path(oct(3.7)));
  const ring = new THREE.ExtrudeGeometry(shape, { depth: beamH, bevelEnabled: false });
  ring.rotateX(Math.PI / 2);
  kit.add("paintedMetal", ring, { pos: [cx, yTop, cz], color: PALETTE.impDark, texel: 1.2 });
  // recessed channel on the underside: a faint diffuser body carries the ring, a thin blue core is
  // the only bright element (the old full-width blue + white rings clipped to one white halo)
  kit.add("paintedMetal", new THREE.RingGeometry(3.45, 3.98, 72).rotateX(Math.PI / 2), { pos: [cx, yTop - beamH - 0.001, cz], color: PALETTE.impBlack, texel: 2 });
  kit.add("emitWhiteFaint", new THREE.RingGeometry(3.58, 3.80, 72).rotateX(Math.PI / 2), { pos: [cx, yTop - beamH - 0.004, cz], uv: "keep" });
  kit.add("emitBlue", new THREE.RingGeometry(3.66, 3.72, 72).rotateX(Math.PI / 2), { pos: [cx, yTop - beamH - 0.007, cz] });
  // eight downlight fixtures at the octagon corners: faint pad with a small dim core
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const R = 3.7 / Math.cos(Math.PI / 8) - 0.35;
    const x = cx + Math.cos(a) * R;
    const z = cz + Math.sin(a) * R;
    kit.box("paintedMetal", x, yTop - beamH - 0.06, z, 0.3, 0.12, 0.3, { color: PALETTE.impBlack, texel: 2 });
    kit.box("emitWhiteFaint", x, yTop - beamH - 0.125, z, 0.2, 0.01, 0.2, { uv: "keep" });
    kit.box(i % 2 ? "emitWhiteDim" : "emitBlueDim", x, yTop - beamH - 0.132, z, 0.08, 0.008, 0.08, { uv: "keep" });
  }
  // radial beams to the four walls, each with a cable tray alongside and a junction box
  const rad = [
    [cx + 4.0, cz, max[0], cz],
    [cx - 4.0, cz, min[0], cz],
    [cx, cz - 4.0, cx, min[2]],
    [cx, cz + 4.0, cx, max[2]],
  ];
  for (const [x0, z0, x1, z1] of rad) {
    const alongX = Math.abs(x1 - x0) > 0.01;
    const L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    kit.box("paintedMetal", mx, yb, mz, alongX ? L : 0.32, beamH, alongX ? 0.32 : L, { color: PALETTE.impDark, texel: 1.2 });
    kit.box("emitWhiteDim", mx, yTop - beamH - 0.005, mz, alongX ? L - 0.6 : 0.03, 0.01, alongX ? 0.03 : L - 0.6, { uv: "keep" });
    const off = 0.45;
    const a = alongX ? [x0, yTop - 0.12, z0 + off] : [x0 + off, yTop - 0.12, z0];
    const b = alongX ? [x1, yTop - 0.12, z1 + off] : [x1 + off, yTop - 0.12, z1];
    cableTray(kit, a, b, { w: 0.26, count: 3 });
    kit.box("paintedMetal", alongX ? (x0 + x1) / 2 : x0 + off, yTop - 0.3, alongX ? z0 + off : (z0 + z1) / 2, 0.36, 0.3, 0.36, { color: PALETTE.impMid, texel: 2 });
    kit.box("emitAmber", alongX ? (x0 + x1) / 2 : x0 + off, yTop - 0.4, alongX ? z0 + off - 0.185 : (z0 + z1) / 2, 0.08, 0.03, 0.01);
  }
  // pendant fixtures over the platform stations (housings; the real lights sit beside them)
  for (const [x, z] of [
    [min[0] + 2.4, cz - 4.6],
    [min[0] + 2.4, cz],
    [min[0] + 2.4, cz + 4.6],
    [max[0] - 2.6, min[2] + 2.6],
    [max[0] - 2.6, max[2] - 2.6],
    [cx - 3, min[2] + 1.6],
    [cx + 3, min[2] + 1.6],
    [cx - 3, max[2] - 1.6],
    [cx + 3, max[2] - 1.6],
  ]) {
    kit.box("paintedMetal", x, yTop - 0.35, z, 0.7, 0.16, 0.7, { color: PALETTE.impBlack, texel: 2 });
    kit.box("emitWhiteFaint", x, yTop - 0.435, z, 0.5, 0.01, 0.5, { uv: "keep" });
    kit.box("emitWhiteDim", x, yTop - 0.442, z, 0.16, 0.008, 0.16, { uv: "keep" });
    kit.cyl("metal", x, yTop - 0.135, z, 0.03, 0.27, "y", { color: PALETTE.impMid, segments: 8 });
  }
  // service pipes along both long walls, passing through the radial beams, hung from the ceiling
  const yp = yTop - 0.25;
  for (const x of [max[0] - 0.6, min[0] + 0.6]) {
    pipeRun(kit, [[x, yp, min[2] + 0.6], [x, yp, cz - 0.25]], 0.06, PALETTE.impMid);
    pipeRun(kit, [[x, yp, cz + 0.25], [x, yp, max[2] - 0.6]], 0.06, PALETTE.impMid);
    for (const z of [min[2] + 2.5, cz - 3.2, cz + 3.2, max[2] - 2.5]) kit.box("paintedMetal", x, yTop - 0.095, z, 0.14, 0.19, 0.14, { color: PALETTE.impDark, texel: 2 });
  }
}
