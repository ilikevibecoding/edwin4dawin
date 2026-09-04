// Bridge prop builders shared by src/rooms/bridge.js: equipment cabinets, display columns, the comms
// relay mast, guard alcoves, sensor scopes, the pit supervisors' plotting tables, the panelled faces
// of the crew pits, the holo table with its animated hologram, and the merged blinking status lamps.
// Everything is room-local; props take the kit and a `fx` (BridgeFx) collector for animated lamps.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE, setDomain } from "../materials.js";
import { rng } from "../kit.js";
import { UP } from "./imperial_kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";

export const BLACK = PALETTE.impBlack;
export const CHAR = PALETTE.impCharcoal;
export const GREYD = PALETTE.impGreyDark;
export const GREY = PALETTE.impGrey;
const X_AXIS = new THREE.Vector3(1, 0, 0);

// ---------------------------------------------------------------------------
// small geometry helpers
// ---------------------------------------------------------------------------
/** Cylinder between two room-local points. */
export function tube(kit, mat, a, b, r, opts = {}) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
  const g = new THREE.CylinderGeometry(r, r, len, opts.segments || 10);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  kit.add(mat, g, { pos: [mid.x, mid.y, mid.z], quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], color: opts.color || 0xffffff });
}
/** Yaw quaternion + placement helper for props built in a local frame (local +z = front / operator side). */
export function placer(cx, cy, cz, yaw) {
  const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  const o = new THREE.Vector3(cx, cy, cz);
  const place = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(o);
  return { q, place };
}
export function aabbOf(place, hw, hd, y0, y1, pad = 0) {
  const cs = [place(-hw, 0, -hd), place(hw, 0, -hd), place(-hw, 0, hd), place(hw, 0, hd)];
  let x0 = Infinity,
    x1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity;
  for (const c of cs) {
    x0 = Math.min(x0, c.x);
    x1 = Math.max(x1, c.x);
    z0 = Math.min(z0, c.z);
    z1 = Math.max(z1, c.z);
  }
  return [[x0 - pad, y0, z0 - pad], [x1 + pad, y1, z1 + pad]];
}
/** Box helper bound to a placer: (mat, lx, ly, lz, sx, sy, sz, extra) with optional tilt about local x. */
function boxer(kit, q, place) {
  return (mat, lx, ly, lz, sx, sy, sz, extra = {}) => {
    const p = place(lx, ly, lz);
    const qq = extra.tilt ? q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, extra.tilt)) : q;
    const { tilt, ...rest } = extra;
    kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: qq, ...rest });
  };
}

// ---------------------------------------------------------------------------
// Animated overlays collector: blinking status lamps (three merged meshes), alert strips, scan bars
// ---------------------------------------------------------------------------
export class BridgeFx {
  constructor() {
    this.blink = { red: [], blue: [], amber: [] };
    this.alertStrips = [];
  }
  lamp(group, x, y, z, sx = 0.06, sy = 0.04, sz = 0.02) {
    this.blink[group].push([x, y, z, sx, sy, sz]);
  }
  alertStrip(x, y, z, sx, sy, sz) {
    this.alertStrips.push([x, y, z, sx, sy, sz]);
  }
  /** Merge the collected lamps into one mesh per colour and attach them; returns { red, blue, amber, alert }. */
  build(kit, M) {
    const out = {};
    for (const [name, list] of Object.entries(this.blink)) {
      if (!list.length) continue;
      const geos = list.map(([x, y, z, sx, sy, sz]) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z));
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), { red: M.emitRedImp, blue: M.emitBlue, amber: M.emitAmber }[name]);
      mesh.name = "bridge_blink_" + name;
      out[name] = kit.attach(mesh);
    }
    if (this.alertStrips.length) {
      const mesh = new THREE.Mesh(mergeGeometries(this.alertStrips.map(([x, y, z, sx, sy, sz]) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z)), false), M.emitRedImp);
      mesh.name = "bridge_alert";
      mesh.visible = false;
      out.alert = kit.attach(mesh);
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// Equipment cabinet: black shell, two door panels (vents / LED readout), stencil, status lamps
// ---------------------------------------------------------------------------
export function cabinet(kit, fx, x, y, z, yaw, seed, w = 1.4, h = 2.4, d = 0.7) {
  const r = rng(seed);
  const { q, place } = placer(x, y, z, yaw);
  const add = boxer(kit, q, place);
  add("impTrim", 0, h / 2, 0, w, h, d, { color: BLACK, texel: 1 });
  add("impMetal", 0, 0.08, 0, w + 0.04, 0.16, d + 0.04, { color: CHAR, texel: 1 });
  for (const s of [-1, 1]) {
    add("impMetalRough", s * (w / 4), h / 2 + 0.05, d / 2 + 0.01, w / 2 - 0.1, h - 0.4, 0.02, { color: GREYD, uv: "world", texel: 1 });
    add("impTrim", s * (w / 4), h / 2 + 0.05, d / 2 + 0.025, 0.05, h - 0.6, 0.01, { color: BLACK });
  }
  const nv = 5 + Math.floor(r() * 4);
  for (let k = 0; k < nv; k++) add("impTrim", -w / 4, 0.5 + k * 0.1, d / 2 + 0.028, w / 2 - 0.3, 0.03, 0.02, { color: BLACK });
  add("impGloss", w / 4, h - 0.55, d / 2 + 0.028, w / 2 - 0.3, 0.26, 0.02);
  add("leds", w / 4, h - 0.5, d / 2 + 0.04, w / 2 - 0.4, 0.05, 0.005, { uv: "keep" });
  const p = place(w / 4 - 0.15, h - 0.63, d / 2 + 0.04);
  fx.lamp(r() < 0.5 ? "blue" : "amber", p.x, p.y, p.z, 0.05, 0.04, 0.02);
  const p2 = place(w / 4 + 0.15, h - 0.63, d / 2 + 0.04);
  fx.lamp("red", p2.x, p2.y, p2.z, 0.05, 0.04, 0.02);
  const dp = place(-w / 4, h - 0.5, d / 2 + 0.031);
  kit.add("decalImp", new THREE.PlaneGeometry(0.34, 0.34), { pos: [dp.x, dp.y, dp.z], quat: q, uv: "keep", uvRect: impDecalRect([IMP_DECAL.power, IMP_DECAL.glyphs1, IMP_DECAL.bay02, IMP_DECAL.hazard][Math.floor(r() * 4)]) });
  add("impMetal", 0, h + 0.05, 0, w - 0.2, 0.1, d - 0.2, { color: CHAR });
  const [mn, mx] = aabbOf(place, w / 2, d / 2, y, y + h + 0.1);
  kit.collider(mn, mx, "cabinet");
}

// ---------------------------------------------------------------------------
// Free-standing display column (tall screen, lit edges, lamps)
// ---------------------------------------------------------------------------
export function displayColumn(kit, fx, x, y, z, yaw, seed) {
  const { q, place } = placer(x, y, z, yaw);
  const add = boxer(kit, q, place);
  add("impTrim", 0, 1.6, 0, 0.9, 3.2, 0.5, { color: BLACK, texel: 1 });
  add("impMetal", 0, 0.15, 0, 1.0, 0.3, 0.6, { color: CHAR, texel: 1 });
  add("impMetal", 0, 3.1, 0, 1.0, 0.2, 0.6, { color: CHAR, texel: 1 });
  add("impGloss", 0, 1.75, 0.245, 0.78, 2.34, 0.02);
  const p = place(0, 1.75, 0.257);
  kit.add(seed % 2 ? "scrBlue3" : "scrBlue2", new THREE.PlaneGeometry(0.7, 2.24), { pos: [p.x, p.y, p.z], quat: q, uv: "keep" });
  for (const s of [-1, 1]) add("emitWhiteDim", s * 0.455, 1.6, 0, 0.01, 2.6, 0.06, { uv: "keep" });
  add("impMetal", 0, 0.42, 0.26, 0.7, 0.14, 0.03, { color: CHAR });
  for (let k = 0; k < 3; k++) {
    const b = place(-0.25 + k * 0.25, 2.98, 0.26);
    fx.lamp(["red", "amber", "blue"][k], b.x, b.y, b.z, 0.08, 0.04, 0.02);
  }
  const dp = place(0, 0.42, 0.28);
  kit.add("decalImp", new THREE.PlaneGeometry(0.3, 0.3), { pos: [dp.x, dp.y, dp.z], quat: q, uv: "keep", uvRect: impDecalRect(IMP_DECAL.glyphs2) });
  const [mn, mx] = aabbOf(place, 0.5, 0.3, y, y + 3.3);
  kit.collider(mn, mx, "column");
}

// ---------------------------------------------------------------------------
// Comms relay mast (lattice, dish, readout box)
// ---------------------------------------------------------------------------
export function commsMast(kit, fx, x, y, z) {
  kit.box("impTrim", x, y + 0.2, z, 0.9, 0.4, 0.9, { color: BLACK, texel: 1 });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.box("impMetal", x + dx * 0.3, y + 1.8, z + dz * 0.3, 0.06, 2.8, 0.06, { color: GREYD });
  for (let k = 0; k < 4; k++) {
    const yy = y + 0.9 + k * 0.7;
    kit.box("impMetal", x, yy, z, 0.68, 0.04, 0.04, { color: CHAR });
    kit.box("impMetal", x, yy, z, 0.04, 0.04, 0.68, { color: CHAR });
  }
  kit.cyl("impMetal", x, y + 3.5, z, 0.05, 0.7, "y", { color: GREYD, segments: 8 });
  kit.add("impMetal", new THREE.CylinderGeometry(0.45, 0.1, 0.25, 16, 1, true), { pos: [x, y + 3.6, z], rot: [-0.9, 0, 0], color: GREY, uv: "scale", uvScale: [2, 0.3] });
  kit.box("impTrim", x, y + 1.6, z + 0.36, 0.5, 0.5, 0.08, { color: BLACK });
  kit.box("leds", x, y + 1.6, z + 0.405, 0.4, 0.06, 0.006, { uv: "keep" });
  fx.lamp("red", x, y + 3.9, z, 0.06, 0.06, 0.06);
  fx.lamp("amber", x + 0.2, y + 1.48, z + 0.41, 0.05, 0.04, 0.02);
  kit.collider([x - 0.45, y, z - 0.45], [x + 0.45, y + 3.7, z + 0.45], "mast");
}

// ---------------------------------------------------------------------------
// Guard alcove on a wall frame at u: proud niche with posts and lintel, pale back panel, one red
// practical under the lintel (the alcove's only light), weapon rack, floor pad, restricted stencils
// ---------------------------------------------------------------------------
export function guardAlcove(kit, fx, f, u) {
  for (const s of [-1, 1]) f.box("impTrim", u + s * 1.15, 1.6, 0.36, 0.3, 3.2, 0.72, { color: BLACK, texel: 1 });
  f.box("impTrim", u, 3.05, 0.36, 2.6, 0.3, 0.72, { color: BLACK, texel: 1 });
  f.box("impPanel1", u, 1.5, 0.15, 2.0, 2.9, 0.02, { color: GREY, uv: "world", texel: 1 });
  // red practical: recessed fixture under the lintel + a thin red line on the lintel's face
  f.box("impMetal", u, 2.87, 0.4, 1.9, 0.04, 0.3, { color: CHAR });
  f.box("emitRedImp", u, 2.84, 0.4, 1.5, 0.02, 0.2, { uv: "keep" });
  f.box("emitRedDim", u, 2.92, 0.725, 2.2, 0.04, 0.01);
  for (const s of [-1, 1]) f.box("emitRedDim", u + s * 0.995, 1.6, 0.4, 0.01, 2.4, 0.04, { uv: "keep" });
  f.box("impMetal", u, 1.7, 0.2, 1.7, 0.08, 0.1, { color: GREYD });
  f.box("impMetal", u, 0.45, 0.2, 1.7, 0.06, 0.16, { color: GREYD });
  for (let k = 0; k < 4; k++) {
    const ru = u - 0.6 + k * 0.4;
    f.box("impTrim", ru, 1.0, 0.24, 0.06, 1.0, 0.1, { color: BLACK, tilt: 0.06 });
    f.cylV("impMetal", ru, 1.55, 0.24, 0.018, 0.45, { color: GREY, segments: 8 });
    f.box("impGloss", ru, 0.7, 0.29, 0.1, 0.22, 0.05);
    f.box("impTrim", ru + 0.08, 0.95, 0.27, 0.05, 0.16, 0.03, { color: CHAR });
    const p = f.pos(ru, 1.28, 0.3);
    fx.lamp("amber", p.x, p.y, p.z, 0.03, 0.03, 0.02);
  }
  for (const s of [-1, 1]) f.decal(IMP_DECAL.restricted, u + s * 1.15, 1.9, 0.725, 0.26);
  f.box("chevronR", u, 0.005, 0.5, 2.0, 0.01, 0.9, { texel: 1.5 });
  f.collider(u - 1.3, u - 1.0, 0, 3.2, 0, 0.75, "alcove");
  f.collider(u + 1.0, u + 1.3, 0, 3.2, 0, 0.75, "alcove");
  f.collider(u - 1.0, u + 1.0, 0, 3.2, 0, 0.18, "alcove");
}

// ---------------------------------------------------------------------------
// Standing sensor scope: pedestal, binocular hood on a tilting yoke, small readout (faces -z at yaw 0)
// ---------------------------------------------------------------------------
export function scopeStation(kit, fx, x, y, z, yaw, seed = 1) {
  const { q, place } = placer(x, y, z, yaw);
  const add = boxer(kit, q, place);
  add("impMetal", 0, 0.06, 0, 0.9, 0.12, 0.9, { color: CHAR, texel: 1 });
  add("impTrim", 0, 0.7, 0, 0.5, 1.2, 0.5, { color: BLACK, texel: 1 });
  add("impMetal", 0, 1.32, 0, 0.6, 0.06, 0.6, { color: GREYD });
  // yoke + hood, tilted down toward the operator
  for (const s of [-1, 1]) add("impMetal", s * 0.33, 1.6, 0, 0.06, 0.55, 0.12, { color: GREYD });
  add("impTrim", 0, 1.78, -0.05, 0.7, 0.36, 0.7, { color: BLACK, tilt: 0.35, texel: 1 });
  add("impGloss", 0, 1.78, 0.32, 0.5, 0.2, 0.06, { tilt: 0.35 });
  for (const s of [-1, 1]) {
    const p = place(s * 0.12, 1.7, 0.36);
    kit.add("impGloss", new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12).rotateX(Math.PI / 2), { pos: [p.x, p.y, p.z], quat: q });
  }
  // readout on the pedestal's operator face
  add("impGloss", 0, 0.95, 0.26, 0.36, 0.26, 0.02);
  const sp = place(0, 0.95, 0.275);
  kit.add(seed % 2 ? "scrGreen0" : "scrBlue2", new THREE.PlaneGeometry(0.3, 0.2), { pos: [sp.x, sp.y, sp.z], quat: q, uv: "keep" });
  const lp = place(0.15, 1.2, 0.26);
  fx.lamp(seed % 3 ? "blue" : "amber", lp.x, lp.y, lp.z, 0.04, 0.03, 0.02);
  const [mn, mx] = aabbOf(place, 0.45, 0.45, y, y + 2.0);
  kit.collider(mn, mx, "scope");
}

// ---------------------------------------------------------------------------
// Pit supervisor's octagonal plotting table with a screen top and rim lamps (standing spot at +z)
// ---------------------------------------------------------------------------
export function plotTable(kit, fx, x, y, z) {
  kit.cyl("impTrim", x, y + 0.45, z, 0.85, 0.9, "y", { segments: 8, color: BLACK, texel: 1 });
  kit.cyl("impMetal", x, y + 0.06, z, 0.95, 0.12, "y", { segments: 8, color: CHAR });
  kit.cyl("impGloss", x, y + 0.93, z, 0.98, 0.06, "y", { segments: 8 });
  kit.add("scrBlue2", new THREE.CircleGeometry(0.82, 8).rotateX(-Math.PI / 2), { pos: [x, y + 0.965, z], uv: "keep" });
  kit.cyl("emitBlueDim", x, y + 0.7, z, 0.87, 0.03, "y", { segments: 8, uv: "keep" });
  kit.collider([x - 0.98, y, z - 0.98], [x + 0.98, y + 1.0, z + 0.98], "plot");
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 8;
    fx.lamp(k % 2 ? "blue" : "amber", x + Math.cos(a) * 0.9, y + 0.86, z + Math.sin(a) * 0.9, 0.05, 0.04, 0.05);
  }
}

// ---------------------------------------------------------------------------
// Panelled vertical face of a crew pit (frame base at the pit floor, N into the pit): black backing,
// kick with a dim service light, instrument modules (screens / vents / stencils / LED boards),
// cable runs, and a collider 0.5 m deep behind the face.
// ---------------------------------------------------------------------------
export function pitWall(kit, fx, frame, length, opts = {}) {
  const { seed = 1, screens = false, h = 1.8, panelColor = GREY } = opts;
  const r = rng(seed);
  frame.box("impTrim", length / 2, h / 2, -0.24, length, h, 0.5, { color: BLACK, texel: 1 });
  frame.box("impTrim", length / 2, 0.14, 0.04, length, 0.28, 0.06, { color: BLACK, texel: 1 });
  frame.box("emitBlueDim", length / 2, 0.295, 0.05, length - 0.16, 0.025, 0.04, { uv: "keep" });
  // top rail: dark metal capping under the deck edge (no lit rim; the railings above carry the light)
  frame.box("impMetal", length / 2, h - 0.12, 0.04, length, 0.24, 0.06, { color: CHAR, texel: 1 });
  const n = Math.max(1, Math.round(length / 1.6));
  const mw = length / n;
  for (let k = 0; k <= n; k++) frame.box("impTrim", Math.min(length - 0.04, Math.max(0.04, k * mw)), 0.92, 0.045, 0.08, 1.3, 0.05, { color: BLACK });
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) * mw;
    frame.box("impPanel1", u, 0.92, 0.04, mw - 0.14, 1.22, 0.04, { color: panelColor, uv: "world", texel: 1 });
    const t = r();
    if (screens && t < 0.45) {
      frame.box("impGloss", u, 1.22, 0.07, 0.96, 0.46, 0.03);
      frame.screen(["scrBlue0", "scrBlue1", "scrAmber0", "scrRed1", "scrBlue3"][Math.floor(r() * 5)], u, 1.22, 0.09, 0.88, 0.38);
    } else if (t < 0.62) {
      frame.box("impTrim", u, 1.0, 0.065, mw - 0.4, 0.6, 0.02, { color: CHAR });
      for (let sI = 0; sI < 5; sI++) frame.box("impMetal", u, 0.8 + sI * 0.1, 0.085, mw - 0.6, 0.03, 0.03, { color: GREYD, tilt: 0.5 });
    } else if (t < 0.78) {
      frame.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.hazard, IMP_DECAL.power][Math.floor(r() * 4)], u, 1.0, 0.062, 0.4);
    } else {
      frame.box("impTrim", u, 1.2, 0.07, 0.5, 0.2, 0.02, { color: BLACK });
      frame.box("leds", u, 1.2, 0.082, 0.42, 0.06, 0.006, { uv: "keep" });
      const p = frame.pos(u - 0.15, 1.1, 0.085);
      fx.lamp(r() < 0.5 ? "red" : "blue", p.x, p.y, p.z);
    }
  }
  frame.cylU("impMetal", length / 2, 0.36, 0.09, 0.03, length - 0.1, { color: GREYD, segments: 8 });
  frame.cylU("impMetal", length / 2, 0.45, 0.09, 0.02, length - 0.1, { color: CHAR, segments: 8 });
  frame.collider(0, length, 0, h, -0.5, 0.1, "pitface");
}

// ---------------------------------------------------------------------------
// Holo table with the animated hologram (kit.attach + update) and the interactable top. The hologram
// is kept low (top < 1.5 m above the deck) so it never rises into the viewport line from the walkway.
// ---------------------------------------------------------------------------
export function buildHoloTable(kit, M, x, y, z, accentKey = "emitBlue") {
  const R = 1.0;
  kit.cyl("impTrim", x, y + 0.24, z, R - 0.15, 0.48, "y", { segments: 8, color: BLACK, texel: 1 });
  kit.cyl("impMetal", x, y + 0.6, z, R + 0.2, 0.24, "y", { segments: 8, color: CHAR, texel: 1 });
  kit.cyl("impTrim", x, y + 0.78, z, R + 0.12, 0.12, "y", { segments: 8, color: BLACK, texel: 1 });
  kit.cyl("emitBlueDim", x, y + 0.05, z, R - 0.13, 0.03, "y", { segments: 8, uv: "keep" });
  kit.add("emitBlueSoft", new THREE.TorusGeometry(R + 0.04, 0.014, 8, 48).rotateX(Math.PI / 2), { pos: [x, y + 0.86, z], uv: "keep" });
  // command dais: darker deck disc under the table with a metal kerb ring
  kit.cyl("impDeck", x, y + 0.012, z, 1.7, 0.024, "y", { segments: 24, color: GREYD, texel: 0.5 });
  kit.add("impMetal", new THREE.TorusGeometry(1.7, 0.02, 6, 48).rotateX(Math.PI / 2), { pos: [x, y + 0.026, z], color: GREYD });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const sx = x + Math.cos(a) * (R - 0.08);
    const sz = z + Math.sin(a) * (R - 0.08);
    kit.box("impMetal", sx, y + 0.9, sz, 0.14, 0.08, 0.14, { color: GREYD });
    kit.box("emitCyan", sx, y + 0.945, sz, 0.06, 0.015, 0.06);
  }
  for (const s of [-1, 1]) {
    kit.box("impGloss", x + s * (R - 0.1), y + 0.87, z + 0.45, 0.3, 0.02, 0.2);
    for (let k = 0; k < 3; k++) kit.box(k === 1 ? "emitRedImp" : accentKey, x + s * (R - 0.17 + k * 0.07), y + 0.885, z + 0.5, 0.04, 0.01, 0.04);
  }
  kit.collider([x - R - 0.25, y, z - R - 0.25], [x + R + 0.25, y + 0.95, z + R + 0.25], "holotable");

  // --- hologram group (scaled to stay under 1.5 m)
  const group = new THREE.Group();
  group.position.set(x, y + 0.87, z);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x8fc4ff, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false });
  const gridMat = new THREE.LineBasicMaterial({ color: 0x4f8dff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = [];
  const seg = (a, b) => pts.push(new THREE.Vector3(...a), new THREE.Vector3(...b));
  const boxEdges = (x0, x1, y0, y1, z0, z1) => {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    for (let i = 0; i < 4; i++) {
      seg(c[i], c[(i + 1) % 4]);
      seg(c[4 + i], c[4 + ((i + 1) % 4)]);
      seg(c[i], c[4 + i]);
    }
  };
  const poly = (cx, cy, cz, r, n, axis) => {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      const p = (a) => (axis === "y" ? [cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r] : [cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz]);
      seg(p(a0), p(a1));
    }
  };
  // hull wedge (bow at -z), 2.4 m long
  const Lh = 2.4;
  const hw = 0.75;
  const bow = [0, 0.015, -Lh / 2];
  const sl = [-hw, 0.015, Lh / 2];
  const sr = [hw, 0.015, Lh / 2];
  const bowB = [0, -0.075, -Lh / 2 + 0.08];
  const slB = [-hw * 0.94, -0.12, Lh / 2];
  const srB = [hw * 0.94, -0.12, Lh / 2];
  seg(bow, sl);
  seg(bow, sr);
  seg(sl, sr);
  seg(bowB, slB);
  seg(bowB, srB);
  seg(slB, srB);
  seg(bow, bowB);
  seg(sl, slB);
  seg(sr, srB);
  seg([0, 0.015, -Lh / 2], [0, 0.015, Lh / 2]);
  seg([-0.38, -0.045, -0.15], [-hw * 0.97, -0.045, Lh / 2]);
  seg([0.38, -0.045, -0.15], [hw * 0.97, -0.045, Lh / 2]);
  boxEdges(-0.27, 0.27, 0.015, 0.12, -0.22, Lh / 2);
  boxEdges(-0.18, 0.18, 0.12, 0.21, 0.08, Lh / 2);
  boxEdges(-0.06, 0.06, 0.21, 0.37, 0.71, 0.9);
  boxEdges(-0.21, 0.21, 0.37, 0.45, 0.64, 0.97);
  poly(-0.13, 0.49, 0.86, 0.05, 8, "y");
  poly(0.13, 0.49, 0.86, 0.05, 8, "y");
  for (const ex of [-0.32, 0, 0.32]) poly(ex, -0.045, Lh / 2, 0.075, 8, "z");
  const ship = new THREE.Group();
  ship.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  const body = new THREE.BufferGeometry();
  const tri = (a, b, c) => [...a, ...b, ...c];
  body.setAttribute("position", new THREE.Float32BufferAttribute([...tri(bow, sr, sl), ...tri(bowB, slB, srB), ...tri(bow, sl, slB), ...tri(bow, slB, bowB), ...tri(bow, bowB, srB), ...tri(bow, srB, sr), ...tri(sl, sr, srB), ...tri(sl, srB, slB)], 3));
  ship.add(new THREE.Mesh(body, M.holo));
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.1, 1.4), M.holo);
  tower.position.set(0, 0.07, 0.5);
  ship.add(tower);
  // low over the table: from the aft door the hologram's top must stay under the viewport sill line
  ship.scale.setScalar(0.8);
  ship.position.y = 0.16;
  group.add(ship);
  // polar grid on the table top
  const gp = [];
  const gseg = (a, b) => gp.push(new THREE.Vector3(...a), new THREE.Vector3(...b));
  for (const r of [0.35, 0.65, 0.92]) for (let i = 0; i < 48; i++) gseg([Math.cos((i / 48) * Math.PI * 2) * r, 0, Math.sin((i / 48) * Math.PI * 2) * r], [Math.cos(((i + 1) / 48) * Math.PI * 2) * r, 0, Math.sin(((i + 1) / 48) * Math.PI * 2) * r]);
  for (let i = 0; i < 12; i++) gseg([Math.cos((i / 12) * Math.PI * 2) * 0.15, 0, Math.sin((i / 12) * Math.PI * 2) * 0.15], [Math.cos((i / 12) * Math.PI * 2) * 0.92, 0, Math.sin((i / 12) * Math.PI * 2) * 0.92]);
  const grid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gp), gridMat);
  grid.position.y = 0.025;
  group.add(grid);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40).rotateX(-Math.PI / 2), M.holo);
  glow.position.y = 0.012;
  group.add(glow);
  const scan = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.01, 6, 64).rotateX(Math.PI / 2), M.holoBright);
  group.add(scan);
  // alternate mode: sector plot (planet, orbit rings, contacts)
  const sector = new THREE.Group();
  const wire = M.holo.clone();
  wire.wireframe = true;
  sector.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12), wire));
  for (const [r, tilt] of [[0.5, 0.3], [0.72, -0.2]]) sector.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.007, 6, 72).rotateX(Math.PI / 2 + tilt), M.holoBright));
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.08), M.holoBright);
    c.position.set(Math.cos(a) * (0.5 + (k % 2) * 0.2), 0.04 * (k % 3), Math.sin(a) * (0.5 + (k % 2) * 0.2));
    sector.add(c);
  }
  sector.position.y = 0.3;
  sector.visible = false;
  group.add(sector);
  kit.attach(group);
  // interactable glossy top (own material so the hover tint does not touch the shared gloss)
  const topMat = setDomain(M.impGloss.clone(), "interior");
  const top = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.06, R + 0.06, 0.05, 8), topMat);
  top.position.set(x, y + 0.845, z);
  kit.attach(top);
  let mode = 0;
  kit.interactable({
    object: top,
    material: topMat,
    id: "bridge_holo",
    label: "Holo-display: cycle plot",
    key: "E",
    onActivate: async ({ hud }) => {
      mode = (mode + 1) % 2;
      ship.visible = mode === 0;
      sector.visible = mode === 1;
      hud.setStatus(mode === 0 ? "Holo-display: ISD Vindicator — ship status." : "Holo-display: sector plot — six contacts tracked.");
    },
  });
  return {
    update(dt, t) {
      ship.rotation.y = t * 0.22;
      ship.position.y = 0.16 + Math.sin(t * 0.7) * 0.02;
      grid.rotation.y = -t * 0.05;
      sector.rotation.y = t * 0.12;
      scan.position.y = 0.04 + ((t * 0.16) % 1) * 0.42;
      lineMat.opacity = 0.56 + 0.07 * Math.sin(t * 17.3) * Math.sin(t * 3.1);
    },
  };
}
