// Bridge-local kit-bash props (d1-bridge only; richer than shared/props.js, whose signatures stay frozen).
// Consoles with dense instrument fields, operator seats, the command chair, overhead readout bars, wall
// displays, cabinets, access hatches, vents, junction boxes, conduits and the bridge railing.
// Everything is world-space; a Frame gives a yawed local space where -z is the side the operator looks toward.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { decalRect } from "../../../textures.js";
import { IMP } from "../shared/palette.js";

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const _qy = new THREE.Quaternion();
const _qt = new THREE.Quaternion();

// indicator palette: red + blue dominant, amber/white sparse (§11). No green: every material key is a draw call.
export const IND = ["emitRedImp", "emitBlue", "emitBlue", "emitAmber", "emitBlue", "emitRedImp", "emitWhite", "emitBlue", "emitAmber", "emitBlue", "emitRedImp", "emitAmber"];
export const POLISH = new THREE.Color("#c9cdd3"); // hand-polished rail steel
export const SCUFF = new THREE.Color("#0a0b0d"); // kick-level scuff tint

export function shade(color, k) {
  const c = color instanceof THREE.Color ? color.clone() : new THREE.Color(color);
  c.multiplyScalar(k);
  return c;
}

// Point on/over a plate tilted by `a` about local x and centred at c: u along x, v along the plate's depth
// (+z side), n along its normal (up). Tilt > 0 turns the plate's top face toward +z.
export function onTilt(c, a, u, v, n) {
  const s = Math.sin(a);
  const k = Math.cos(a);
  return [c[0] + u, c[1] - v * s + n * k, c[2] + v * k + n * s];
}

export class Frame {
  constructor(kit, cx, cy, cz, yaw = 0) {
    this.kit = kit;
    this.c = [cx, cy, cz];
    this.yaw = yaw;
    this.cos = Math.cos(yaw);
    this.sin = Math.sin(yaw);
  }
  pos(ox, oy, oz) {
    return [this.c[0] + ox * this.cos + oz * this.sin, this.c[1] + oy, this.c[2] - ox * this.sin + oz * this.cos];
  }
  quat(tilt) {
    _qy.setFromAxisAngle(Y_AXIS, this.yaw);
    if (tilt) _qy.multiply(_qt.setFromAxisAngle(X_AXIS, tilt));
    return _qy;
  }
  box(mat, ox, oy, oz, sx, sy, sz, opts = {}) {
    const { tilt = 0, ...rest } = opts;
    return this.kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: this.pos(ox, oy, oz), quat: this.quat(tilt), ...rest });
  }
  add(mat, geo, ox, oy, oz, opts = {}) {
    const { tilt = 0, ...rest } = opts;
    return this.kit.add(mat, geo, { pos: this.pos(ox, oy, oz), quat: this.quat(tilt), ...rest });
  }
  // decal square facing local +z at (ox, oy, oz)
  decal(index, ox, oy, oz, size = 0.16, opts = {}) {
    const g = new THREE.PlaneGeometry(size, size);
    if (opts.flip) g.rotateY(Math.PI);
    return this.add("decal", g, ox, oy, oz, { uv: "keep", uvRect: decalRect(index), tilt: opts.tilt || 0 });
  }
  // world AABB of the local footprint (ox ± sx/2, oz ± sz/2) between oy0 and oy1
  collider(ox, oy0, oy1, oz, sx, sz, tag) {
    const cs = [this.pos(ox - sx / 2, 0, oz - sz / 2), this.pos(ox + sx / 2, 0, oz - sz / 2), this.pos(ox - sx / 2, 0, oz + sz / 2), this.pos(ox + sx / 2, 0, oz + sz / 2)];
    const xs = cs.map((c) => c[0]);
    const zs = cs.map((c) => c[2]);
    this.kit.collider([Math.min(...xs), this.c[1] + oy0, Math.min(...zs)], [Math.max(...xs), this.c[1] + oy1, Math.max(...zs)], tag);
  }
}

// Extruded polygon along +y between y0 and y1; pts are [x, z] world coordinates (any convex/concave outline).
export function prismY(kit, mat, pts, y0, y1, opts = {}) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false });
  // shape (x, z) in the XY plane extruded along +Z -> rotate so the extrusion runs down -y, then lift to y1
  g.rotateX(Math.PI / 2);
  g.translate(0, y1, 0);
  return kit.add(mat, g, { uv: "world", texel: 1, ...opts });
}

/**
 * Operator console. Faces local -z (the operator sits at +z). w across, d deep, desk at 0.9, housing top 1.3.
 * spec: { x, y, z, yaw, w, d, seed, screens: ["screenImp0" | {mat, rect}], ends, back, divider, tag }
 * Every unit carries ≥ 20 small emissive elements (indicator rows, readouts, lit keys, lamps, housing strip).
 */
export function bridgeConsole(kit, spec) {
  const { x, y, z, yaw = 0, w = 2.0, d = 0.85, seed = 1, screens = ["screenImp0"], ends = false, back = false, divider = false, tag = "console" } = spec;
  const f = new Frame(kit, x, y, z, yaw);
  const rand = rng((seed * 7919 + 17) >>> 0);
  const body = shade(IMP.black, 0.8 + rand() * 0.5); // per-unit heat / dust variation
  const hz = -d / 2;

  // kick (scuffed), plinth, desk slab (top 0.88)
  f.box("paintedMetal", 0, 0.04, 0, w - 0.12, 0.08, d - 0.14, { color: SCUFF, texel: 1 });
  f.box("paintedMetal", 0, 0.44, 0, w - 0.04, 0.72, d - 0.06, { color: body, texel: 1 });
  f.box("darkGloss", 0, 0.84, 0.02, w, 0.08, d - 0.08);

  // display housing leaning back 10°, screens on its operator face
  const a = -0.17;
  const hc = [0, 1.09, hz + 0.16];
  f.box("paintedMetal", hc[0], hc[1], hc[2], w - 0.06, 0.42, 0.22, { color: shade(IMP.dark, 0.85), texel: 1, tilt: a });
  const n = w >= 2.6 ? 2 : 1;
  const sw = (w - 0.34 - (n - 1) * 0.14) / n;
  for (let i = 0; i < n; i++) {
    const sx = (i - (n - 1) / 2) * (sw + 0.14);
    const s = screens[i % screens.length];
    const mat = typeof s === "string" ? s : s.mat;
    const rect = typeof s === "string" ? null : s.rect;
    let p = onTilt(hc, a, sx, 0.117, 0);
    f.box("darkGloss", p[0], p[1], p[2], sw + 0.05, 0.34, 0.012, { tilt: a });
    p = onTilt(hc, a, sx, 0.127, 0);
    f.box(mat, p[0], p[1], p[2], sw, 0.27, 0.006, { tilt: a, uv: "keep", ...(rect ? { uvRect: rect } : {}) });
  }
  // housing top: blue edge strip + two red lamps at the corners
  let p = onTilt(hc, a, 0, -0.03, 0.214);
  f.box("emitBlue", p[0], p[1], p[2], w - 0.5, 0.008, 0.02, { tilt: a });
  for (const s of [-1, 1]) {
    p = onTilt(hc, a, s * (w / 2 - 0.14), 0.07, 0.225);
    f.box("emitRedImp", p[0], p[1], p[2], 0.03, 0.03, 0.03, { tilt: a });
  }

  // indicator field on the desk between the housing and the keyboard (10 + 4 + 3 emitters on a 2 m unit)
  const nA = Math.min(10, Math.floor((w - 0.5) / 0.11));
  const xa = -((nA - 1) * 0.11) / 2;
  for (let i = 0; i < nA; i++) f.box(IND[(i * 3 + seed) % IND.length], xa + i * 0.11, 0.884, -0.13, 0.07, 0.008, 0.03);
  const nB = Math.min(4, Math.floor((w - 0.5) / 0.34));
  const xb = -((nB - 1) * 0.34) / 2;
  for (let i = 0; i < nB; i++) {
    const lit = rand() < 0.75;
    if (lit) f.box(rand() < 0.5 ? "emitBlue" : "emitWhite", xb + i * 0.34, 0.886, -0.04, 0.09, 0.012, 0.05);
    else f.box("paintedMetal", xb + i * 0.34, 0.886, -0.04, 0.09, 0.012, 0.05, { color: shade(IMP.dark, 0.7), texel: 2 });
  }
  const rw = Math.min(0.26, (w - 0.5) / 3.6);
  for (let i = 0; i < 3; i++) f.box(["emitRedImp", "emitAmber", "emitBlue"][i], (i - 1) * (rw + 0.06), 0.884, 0.05, rw, 0.006, 0.02);

  // keyboard plate sloping toward the operator, two key rows, three lit keys, support block behind
  const ka = 0.22;
  const kc = [0, 0.88 + 0.012 + 0.15 * Math.sin(ka), 0.26];
  f.box("paintedMetal", kc[0], kc[1], kc[2], w - 0.36, 0.024, 0.3, { color: shade(IMP.dark, 0.6), texel: 1, tilt: ka });
  p = onTilt(kc, ka, 0, -0.02, 0.016);
  f.box("paintedMetal", p[0], p[1], p[2], w - 0.5, 0.008, 0.17, { color: 0x1c1e22, texel: 2, tilt: ka });
  for (let i = 0; i < 3; i++) {
    p = onTilt(kc, ka, (rand() - 0.5) * (w - 0.7), rand() < 0.5 ? -0.075 : 0.03, 0.024);
    f.box(IND[(i * 5 + seed + 1) % IND.length], p[0], p[1], p[2], 0.04, 0.012, 0.04, { tilt: ka });
  }
  f.box("paintedMetal", 0, 0.91, 0.14, w - 0.5, 0.06, 0.1, { color: shade(IMP.dark, 0.5), texel: 1 });

  // grab handles on the operator edge (polished)
  const hx = w >= 1.8 ? [-(w / 2 - 0.3), w / 2 - 0.3] : [0];
  for (const ox of hx) f.box("metal", ox, 0.85, d / 2 - 0.03, 0.26, 0.026, 0.026, { color: POLISH, texel: 2 });

  if (divider) f.box("metal", 0, 0.9, 0.06, 0.02, 0.05, d - 0.3, { color: IMP.mid, texel: 2 });

  // side panels: vent slats + a lamp
  if (ends) {
    for (const s of [-1, 1]) {
      for (let k = 0; k < 2; k++) f.box("metal", s * (w / 2 - 0.014), 0.36 + k * 0.1, 0.05, 0.012, 0.025, 0.36, { color: IMP.mid, texel: 2 });
      f.box(s < 0 ? "emitAmber" : "emitRedImp", s * (w / 2 - 0.012), 0.64, -0.12, 0.01, 0.03, 0.03);
    }
  }
  // housing back (seen when the operator faces a wall): plate, slats, lamp, stencil, cable ports
  if (back) {
    p = onTilt(hc, a, 0, -0.118, 0);
    f.box("paintedMetal", p[0], p[1], p[2], w - 0.3, 0.32, 0.012, { color: shade(IMP.dark, 1.05), texel: 1, tilt: a });
    for (let k = 0; k < 2; k++) {
      p = onTilt(hc, a, -w / 4, -0.128, -0.05 + k * 0.08);
      f.box("metal", p[0], p[1], p[2], w / 2 - 0.4, 0.012, 0.008, { color: IMP.mid, texel: 2, tilt: a });
    }
    p = onTilt(hc, a, w / 2 - 0.3, -0.13, 0.11);
    f.box("emitRedImp", p[0], p[1], p[2], 0.03, 0.03, 0.01, { tilt: a });
    p = onTilt(hc, a, w / 4, -0.128, 0.0);
    f.decal([6, 9, 14, 2][seed % 4], p[0], p[1], p[2], 0.16, { flip: true, tilt: a });
    for (let k = 0; k < 2; k++) f.box("paintedMetal", -w / 2 + 0.25 + k * 0.12, 0.3, hz - 0.006, 0.06, 0.06, 0.012, { color: SCUFF, texel: 2 });
  }
  // cable drop at the back
  f.add("paintedMetal", new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), 0.3, 0.25, hz - 0.05, { color: IMP.black, texel: 2 });

  f.collider(0, 0, 1.3, 0.02, w + 0.06, d + 0.02, tag);
}

// Operator seat facing local -z. Cushion top at 0.48.
export function bridgeSeat(kit, x, y, z, yaw = 0, { cushion = "fabric", tag = "seat" } = {}) {
  const f = new Frame(kit, x, y, z, yaw);
  const pad = 0x2b2e34;
  f.box("paintedMetal", 0, 0.02, 0, 0.52, 0.04, 0.52, { color: IMP.black, texel: 1 });
  f.box("paintedMetal", 0, 0.22, 0, 0.09, 0.36, 0.09, { color: shade(IMP.dark, 0.8), texel: 1 });
  f.box("paintedMetal", 0, 0.42, 0, 0.5, 0.04, 0.5, { color: IMP.dark, texel: 1 });
  f.box(cushion, 0, 0.46, 0.01, 0.46, 0.04, 0.46, { color: pad, texel: 2 });
  const bt = 0.14;
  const bc = [0, 0.8, 0.25];
  f.box("paintedMetal", bc[0], bc[1], bc[2], 0.46, 0.64, 0.05, { color: IMP.dark, texel: 1, tilt: bt });
  const p = onTilt(bc, bt, 0, -0.037, -0.02);
  f.box(cushion, p[0], p[1], p[2], 0.38, 0.5, 0.025, { color: pad, texel: 2, tilt: bt });
  for (const s of [-1, 1]) f.box("paintedMetal", s * 0.27, 0.6, 0.1, 0.05, 0.16, 0.3, { color: IMP.dark, texel: 1 });
  f.collider(0, 0, 1.15, 0.06, 0.56, 0.62, tag);
}

// Commander's chair: high winged back, armrest control pods, rear spine with a status lamp. Faces local -z.
export function commandChair(kit, x, y, z, yaw = 0, { screen = "screenImp2" } = {}) {
  const f = new Frame(kit, x, y, z, yaw);
  const pad = 0x23262c;
  f.add("paintedMetal", new THREE.CylinderGeometry(0.46, 0.5, 0.06, 16), 0, 0.03, 0, { color: IMP.black, texel: 1 });
  f.add("paintedMetal", new THREE.CylinderGeometry(0.12, 0.14, 0.34, 10), 0, 0.23, 0, { color: shade(IMP.dark, 0.8), texel: 1 });
  f.box("paintedMetal", 0, 0.44, 0, 0.72, 0.08, 0.72, { color: IMP.dark, texel: 1 });
  f.box("fabric", 0, 0.51, 0.02, 0.62, 0.06, 0.6, { color: pad, texel: 2 });
  const bt = 0.1;
  const bc = [0, 1.06, 0.34];
  f.box("paintedMetal", bc[0], bc[1], bc[2], 0.72, 1.16, 0.08, { color: IMP.black, texel: 1, tilt: bt });
  let p = onTilt(bc, bt, 0, -0.055, -0.05);
  f.box("fabric", p[0], p[1], p[2], 0.5, 0.94, 0.03, { color: pad, texel: 2, tilt: bt });
  for (const s of [-1, 1]) {
    p = onTilt(bc, bt, s * 0.38, -0.06, 0.1);
    f.box("paintedMetal", p[0], p[1], p[2], 0.08, 0.86, 0.22, { color: IMP.black, texel: 1, tilt: bt });
    // armrests with control pods
    f.box("paintedMetal", s * 0.42, 0.72, 0.06, 0.12, 0.05, 0.62, { color: IMP.dark, texel: 1 });
    f.box("paintedMetal", s * 0.42, 0.6, 0.22, 0.06, 0.2, 0.06, { color: IMP.dark, texel: 1 });
    f.box("darkGloss", s * 0.42, 0.75, -0.08, 0.1, 0.014, 0.24);
    for (let k = 0; k < 4; k++) f.box(IND[(k * 2 + (s > 0 ? 1 : 0)) % IND.length], s * 0.42 + (k % 2 - 0.5) * 0.04, 0.76, -0.16 + Math.floor(k / 2) * 0.05, 0.025, 0.01, 0.025);
    f.box(screen, s * 0.42, 0.76, 0.0, 0.08, 0.006, 0.07, { uv: "keep" });
  }
  p = onTilt(bc, bt, 0, 0, 0.66);
  f.box("paintedMetal", p[0], p[1], p[2], 0.42, 0.18, 0.1, { color: IMP.black, texel: 1, tilt: bt });
  p = onTilt(bc, bt, 0, 0.055, 0.0);
  f.box("metal", p[0], p[1], p[2], 0.12, 1.1, 0.03, { color: IMP.mid, texel: 2, tilt: bt });
  p = onTilt(bc, bt, 0, 0.075, 0.42);
  f.box("emitRedImp", p[0], p[1], p[2], 0.05, 0.03, 0.01, { tilt: bt });
  f.collider(0, 0, 1.7, 0.1, 0.9, 0.9, "chair");
}

// Overhead readout bar over a console: two posts behind the unit, a bar at h with a screen strip and readouts
// on the operator side (the walkway side of the outer pit rows), red end lamps.
export function readoutBar(kit, x, y, z, yaw, w, { screen = "screenImp1", rect = null, h = 1.95 } = {}) {
  const f = new Frame(kit, x, y, z, yaw);
  const zb = -0.52;
  for (const s of [-1, 1]) f.box("paintedMetal", s * (w / 2 - 0.1), h / 2, zb, 0.06, h, 0.06, { color: IMP.dark, texel: 1 });
  f.box("paintedMetal", 0, h + 0.14, zb, w, 0.28, 0.14, { color: IMP.black, texel: 1 });
  f.box("darkGloss", 0, h + 0.14, zb + 0.075, w * 0.5 + 0.04, 0.2, 0.01);
  f.box(screen, 0, h + 0.14, zb + 0.083, w * 0.5, 0.16, 0.006, { uv: "keep", ...(rect ? { uvRect: rect } : {}) });
  const side = (w - w * 0.5 - 0.2) / 2;
  const nx = Math.max(2, Math.min(4, Math.floor(side / 0.16)));
  for (const s of [-1, 1]) for (let i = 0; i < Math.min(nx, 2); i++) f.box(IND[(i * 7 + (s > 0 ? 3 : 0)) % IND.length], s * (w * 0.25 + 0.14 + i * 0.2), h + 0.14 + (i % 2 ? 0.05 : -0.05), zb + 0.075, 0.14, 0.035, 0.006);
  for (const s of [-1, 1]) f.box("emitRedImp", s * (w / 2 - 0.04), h + 0.3, zb, 0.05, 0.04, 0.05);
  f.box("metal", 0, h + 0.005, zb, w - 0.1, 0.01, 0.16, { color: IMP.mid, texel: 2 });
}

// Wall-mounted display, local +z faces the room. Frame, bezel, screen, three lamps, optional stencil label.
export function wallDisplay(kit, { x, y, z, yaw, w = 1.5, h = 1.1, screen = "screenImp0", rect = null, label }) {
  const f = new Frame(kit, x, y, z, yaw);
  f.box("paintedMetal", 0, 0, 0.03, w + 0.16, h + 0.18, 0.06, { color: shade(IMP.dark, 0.9), texel: 1 });
  f.box("darkGloss", 0, 0.01, 0.07, w + 0.06, h + 0.06, 0.02);
  f.box(screen, 0, 0.01, 0.083, w, h, 0.006, { uv: "keep", ...(rect ? { uvRect: rect } : {}) });
  for (let i = 0; i < 2; i++) f.box(["emitBlue", "emitRedImp"][i], -w / 2 + 0.12 + i * 0.14, -h / 2 - 0.05, 0.065, 0.07, 0.02, 0.012);
  if (label !== undefined) f.decal(label, w / 2 - 0.14, -h / 2 - 0.05, 0.064, 0.12);
}

// Floor cabinet against a wall; local +z faces the room, body spans z 0..d. Door panel, handle, LED column, slats.
export function cabinet(kit, { x, y, z, yaw, w = 0.8, h = 1.0, d = 0.5, seed = 1, tag = "cabinet" }) {
  const f = new Frame(kit, x, y, z, yaw);
  const rand = rng(seed);
  f.box("paintedMetal", 0, h / 2, d / 2, w, h, d, { color: shade(IMP.black, 0.9 + rand() * 0.35), texel: 1 });
  f.box("paintedMetal", 0, h / 2 + 0.02, d + 0.006, w - 0.1, h - 0.14, 0.012, { color: shade(IMP.dark, 0.85), texel: 1 });
  f.box("metal", w / 2 - 0.12, h * 0.55, d + 0.02, 0.03, 0.2, 0.02, { color: IMP.mid, texel: 2 });
  for (let k = 0; k < 3; k++) f.box(k === 1 ? "emitRedImp" : rand() < 0.3 ? "emitAmber" : "emitBlue", -w / 2 + 0.1, h - 0.16 - k * 0.06, d + 0.014, 0.03, 0.018, 0.006);
  for (let k = 0; k < 2; k++) f.box("metal", 0.06, 0.16 + k * 0.07, d + 0.014, w - 0.4, 0.014, 0.006, { color: IMP.mid, texel: 2 });
  f.collider(0, 0, h, d / 2, w, d, tag);
}

// Recessed access hatch on a vertical face; local +z faces the room, (x,y,z) is the hatch centre.
export function hatch(kit, { x, y, z, yaw, w = 1.2, h = 1.6, label }) {
  const f = new Frame(kit, x, y, z, yaw);
  f.box("paintedMetal", 0, 0, 0.01, w + 0.12, h + 0.12, 0.02, { color: SCUFF, texel: 1 });
  // dielectric plate: bare `metal` (metalness 1) only mirrors the dim room and reads as a black hole
  f.box("paintedMetal", 0, 0, 0.032, w, h, 0.03, { color: shade(IMP.mid, 0.9), texel: 1 });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) f.box("metal", sx * (w / 2 - 0.08), sy * (h / 2 - 0.08), 0.052, 0.05, 0.05, 0.02, { color: IMP.steel, texel: 2 });
  f.box("metal", 0, -0.1, 0.07, 0.04, 0.3, 0.03, { color: IMP.steel, texel: 2 });
  f.box("emitAmber", -w / 2 + 0.12, h / 2 - 0.18, 0.05, 0.04, 0.04, 0.008);
  if (label !== undefined) f.decal(label, w / 2 - 0.25, 0.25, 0.049, 0.28);
}

// Slotted vent panel on a vertical face; local +z faces the room.
export function ventPanel(kit, { x, y, z, yaw, w = 0.9, h = 0.5 }) {
  const f = new Frame(kit, x, y, z, yaw);
  f.box("paintedMetal", 0, 0, 0.015, w, h, 0.03, { color: shade(IMP.dark, 0.7), texel: 1 });
  const n = 5;
  for (let k = 0; k < n; k++) f.box("metal", 0, -h / 2 + (h / (n + 1)) * (k + 1), 0.036, w - 0.12, 0.02, 0.012, { color: IMP.mid, texel: 2 });
}

// Junction box with a lamp and a conduit stub; local +z faces the room.
export function junctionBox(kit, { x, y, z, yaw, w = 0.3, h = 0.36, lamp = "emitAmber" }) {
  const f = new Frame(kit, x, y, z, yaw);
  f.box("metalRough", 0, 0, 0.06, w, h, 0.12, { color: IMP.mid, texel: 2 });
  f.box(lamp, w / 2 - 0.06, h / 2 - 0.06, 0.124, 0.03, 0.03, 0.01);
}

// Horizontal conduit along a wall between two world points at height y, offset `out` from the wall plane along
// the wall normal `n` ([nx, nz]); clamps every `every` metres.
export function conduitRun(kit, from, to, y, n, { r = 0.04, out = 0.08, every = 2.0, color = IMP.mid, clampColor = IMP.dark } = {}) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  if (len < 0.1) return;
  const cx = (from[0] + to[0]) / 2 + n[0] * out;
  const cz = (from[1] + to[1]) / 2 + n[1] * out;
  const alongX = Math.abs(dx) > Math.abs(dz);
  kit.cyl("metal", cx, y, cz, r, len, alongX ? "x" : "z", { color, segments: 8, texel: 2 });
  const k = Math.max(2, Math.round(len / every));
  for (let i = 0; i <= k; i++) {
    const t = i / k;
    const px = from[0] + dx * t + n[0] * (out - 0.02);
    const pz = from[1] + dz * t + n[1] * (out - 0.02);
    if (alongX) kit.box("paintedMetal", px, y, pz, 0.08, r * 2 + 0.04, out + 0.04, { color: clampColor, texel: 2 });
    else kit.box("paintedMetal", px, y, pz, out + 0.04, r * 2 + 0.04, 0.08, { color: clampColor, texel: 2 });
  }
}

/**
 * Bridge railing between [x,z] points at floor y: hand-polished top rail at 1.02 m, mid rail, black kick plate,
 * posts with dull collars where hands never reach, blue marker lamps on alternate posts.
 */
export function bridgeRail(kit, from, to, y, { postEvery = 2.4, collide = true, tag = "rail", markers = true } = {}) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  if (len < 0.05) return;
  const ux = dx / len;
  const uz = dz / len;
  const cx = (from[0] + to[0]) / 2;
  const cz = (from[1] + to[1]) / 2;
  const rot = [0, Math.atan2(dx, dz), 0];
  kit.add("metal", new THREE.BoxGeometry(0.06, 0.05, len), { pos: [cx, y + 1.02, cz], rot, color: POLISH, texel: 2 });
  kit.add("metal", new THREE.BoxGeometry(0.03, 0.03, len), { pos: [cx, y + 0.62, cz], rot, color: IMP.mid, texel: 2 });
  kit.add("paintedMetal", new THREE.BoxGeometry(0.04, 0.14, len), { pos: [cx, y + 0.07, cz], rot, color: IMP.black, texel: 2 });
  const n = Math.max(2, Math.round(len / postEvery) + 1);
  for (let i = 0; i < n; i++) {
    const s = (i / (n - 1)) * len;
    const px = from[0] + ux * s;
    const pz = from[1] + uz * s;
    kit.add("paintedMetal", new THREE.BoxGeometry(0.07, 0.98, 0.07), { pos: [px, y + 0.49, pz], rot, color: IMP.dark, texel: 2 });
    if (i % 2 === 0) kit.add("metal", new THREE.BoxGeometry(0.08, 0.06, 0.1), { pos: [px, y + 1.02, pz], rot, color: IMP.steel, texel: 2 });
    else if (markers) kit.add("emitBlue", new THREE.BoxGeometry(0.085, 0.03, 0.02), { pos: [px, y + 0.88, pz], rot });
  }
  if (collide) {
    kit.collider([Math.min(from[0], to[0]) - 0.06, y, Math.min(from[1], to[1]) - 0.06], [Math.max(from[0], to[0]) + 0.06, y + 1.1, Math.max(from[1], to[1]) + 0.06], tag);
  }
}

// Free-standing data pillar (pit aisles): black body, corner posts, LED columns, a small screen strip, red top lamp.
export function dataPillar(kit, x, y, z, { seed = 1, screen = "screenImp3", h = 2.2 } = {}) {
  const rand = rng(seed);
  kit.box("paintedMetal", x, y + h / 2, z, 0.6, h, 0.6, { color: shade(IMP.black, 0.9 + rand() * 0.3), texel: 1 });
  kit.box("paintedMetal", x, y + h / 2, z, 0.64, h - 0.3, 0.16, { color: IMP.mid, texel: 2 });
  kit.box("paintedMetal", x, y + h + 0.025, z, 0.7, 0.05, 0.7, { color: IMP.mid, texel: 2 });
  kit.box("emitRedImp", x, y + h + 0.08, z, 0.08, 0.06, 0.08);
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 4; k++) kit.box(rand() < 0.2 ? "emitRedImp" : rand() < 0.5 ? "emitBlue" : "emitAmber", x + sx * 0.31, y + 0.6 + k * 0.16, z - 0.15, 0.01, 0.04, 0.07);
    kit.box("darkGloss", x + sx * 0.308, y + 1.55, z + 0.08, 0.01, 0.3, 0.3);
    kit.box(screen, x + sx * 0.317, y + 1.55, z + 0.08, 0.006, 0.24, 0.24, { uv: "keep" });
  }
  kit.collider([x - 0.35, y, z - 0.35], [x + 0.35, y + h + 0.1, z + 0.35], "pillar");
}

// Tall equipment rack against a wall; local +z faces the room, body spans z 0..d. Four bay plates with
// handles, a lamp column (8 lamps), a top vent, a red status lamp, a stencil and a scuffed kick.
export function rack(kit, { x, y, z, yaw, w = 1.0, h = 1.9, d = 0.6, seed = 1, label, tag = "rack" }) {
  const f = new Frame(kit, x, y, z, yaw);
  const rand = rng(seed * 31 + 5);
  f.box("paintedMetal", 0, (h - 0.06) / 2, d / 2, w, h - 0.06, d, { color: shade(IMP.black, 0.85 + rand() * 0.4), texel: 1 });
  f.box("paintedMetal", 0, 0.06, d / 2 + 0.01, w + 0.02, 0.12, d + 0.02, { color: SCUFF, texel: 1 });
  f.box("paintedMetal", 0, h - 0.03, d / 2 + 0.005, w + 0.01, 0.06, d + 0.01, { color: shade(IMP.dark, 0.8), texel: 1 });
  const bays = 4;
  const bh = (h - 0.5) / bays;
  for (let k = 0; k < bays; k++) {
    const cy = 0.3 + bh * (k + 0.5);
    f.box("paintedMetal", 0.06, cy, d + 0.008, w - 0.3, bh - 0.06, 0.016, { color: shade(IMP.dark, 0.75 + rand() * 0.4), texel: 1 });
    f.box("metal", w / 2 - 0.22, cy, d + 0.03, 0.03, bh * 0.4, 0.02, { color: IMP.mid, texel: 2 });
    for (let i = 0; i < 2; i++) f.box(IND[(k * 3 + i * 5 + seed) % IND.length], -w / 2 + 0.36 + i * 0.16, cy - bh / 2 + 0.06, d + 0.018, 0.1, 0.014, 0.006);
  }
  // lamp column down the left edge
  for (let k = 0; k < 8; k++) f.box(k === 3 ? "emitRedImp" : rand() < 0.25 ? "emitAmber" : "emitBlue", -w / 2 + 0.08, 0.45 + k * 0.17, d + 0.014, 0.03, 0.02, 0.006);
  // top vent slats + red status lamp
  for (let k = 0; k < 3; k++) f.box("metal", 0, h + 0.006, d * 0.25 + k * 0.12, w - 0.3, 0.012, 0.03, { color: IMP.mid, texel: 2 });
  f.box("emitRedImp", w / 2 - 0.1, h - 0.03, d + 0.012, 0.05, 0.03, 0.006);
  if (label !== undefined) f.decal(label, w / 2 - 0.2, 0.22, d + 0.01, 0.14);
  f.collider(0, 0, h, d / 2, w + 0.02, d + 0.03, tag);
}
