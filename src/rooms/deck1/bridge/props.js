// Bridge-local kit-bash props (d1-bridge only; richer than shared/props.js, whose signatures stay frozen).
// Consoles with dense instrument fields, operator seats, the command chair, overhead readout bars, wall
// displays, cabinets, access hatches, vents, junction boxes, conduits and the bridge railing.
// Everything is world-space; a Frame gives a yawed local space where -z is the side the operator looks toward.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { decalRect } from "../../../textures.js";
import { IMP } from "../shared/palette.js";
import { SIGN } from "./screens.js";

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

// Point on an upright panel (its +z face toward the operator) rotated by `a` about local x and centred at c:
// u along x, h up the panel, n out of its face. a > 0 tips the face down toward the operator.
export function onPanel(c, a, u, h, n) {
  const s = Math.sin(a);
  const k = Math.cos(a);
  return [c[0] + u, c[1] + h * k - n * s, c[2] + h * s + n * k];
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
 * spec: { x, y, z, yaw, w, d, seed, screens: ["screenImp0" | {mat, rect}], ends, back, divider, tag,
 *         variant: 0 single-screen | 1 dual with a hood and a task light | 2 standing unit with a 30° overhead panel,
 *         service: open service panel on the -x end, dim: sill units (every other desk button unlit) }
 * Every unit carries ≥ 20 small emissive elements (indicator rows, readouts, lit keys, lamps, housing strip,
 * amber under-lip strip), so the housings keep a silhouette when the pool lights are elsewhere.
 */
export function bridgeConsole(kit, spec) {
  const { x, y, z, yaw = 0, w = 2.0, d = 0.85, seed = 1, screens = ["screenImp0"], ends = false, back = false, divider = false, tag = "console", variant = 0, service = false, dim = false, desk = "darkGloss" } = spec;
  const f = new Frame(kit, x, y, z, yaw);
  const rand = rng((seed * 7919 + 17) >>> 0);
  const body = shade(IMP.black, 0.8 + rand() * 0.5); // per-unit heat / dust variation
  const hz = -d / 2;

  // kick (scuffed), plinth, desk slab (top 0.88), amber under-lip strip along the operator edge. `desk` lets a
  // unit swap the gloss slab for a matte one (bridgeSeam, F90 0.25) where a camera sees a pool light mirrored in it.
  f.box("paintedMetal", 0, 0.04, 0, w - 0.12, 0.08, d - 0.14, { color: SCUFF, texel: 1 });
  f.box("paintedMetal", 0, 0.44, 0, w - 0.04, 0.72, d - 0.06, { color: body, texel: 1 });
  f.box(desk, 0, 0.84, 0.02, w, 0.08, d - 0.08, desk === "darkGloss" ? {} : { color: 0x0b0d10, texel: 1 });
  f.box("emitAmber", 0, 0.795, d / 2 - 0.023, w - 0.4, 0.008, 0.012);

  // display housing leaning back 10°, screens on its operator face
  const a = -0.17;
  const hc = [0, 1.09, hz + 0.16];
  f.box("paintedMetal", hc[0], hc[1], hc[2], w - 0.06, 0.42, 0.22, { color: shade(IMP.dark, 0.85), texel: 1, tilt: a });
  const n = w >= 2.6 || variant === 1 ? 2 : 1;
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
  if (variant === 1) {
    // hood over the screens + a cool task light on a stem 0.5 m above it (emissive, no descriptor)
    p = onTilt(hc, a, 0, 0.07, 0.228);
    f.box("paintedMetal", p[0], p[1], p[2], w - 0.02, 0.03, 0.4, { color: shade(IMP.dark, 0.75), texel: 1, tilt: a });
    const top = p[1];
    f.box("metal", 0.25, top + 0.26, hz + 0.02, 0.02, 0.5, 0.02, { color: IMP.mid, texel: 2 });
    // hooded head: a 0.1 × 0.02 bridgeLamp slot (emissive 1.05, no bloom) set 3 cm up inside a cheeked hood, so
    // from an eye at the head's own height (the window camera) only the dark cheeks show; emitWhite 0.2 × 0.03
    // slots read as two clipped lamp heads in the window view (critic round 2)
    const hd = shade(IMP.dark, 0.7);
    f.box("paintedMetal", 0, top + 0.54, hz + 0.16, 0.34, 0.04, 0.12, { color: hd, texel: 1 });
    for (const s of [-1, 1]) {
      f.box("paintedMetal", s * 0.16, top + 0.505, hz + 0.16, 0.02, 0.03, 0.12, { color: hd, texel: 1 });
      f.box("paintedMetal", 0, top + 0.505, hz + 0.16 + s * 0.05, 0.34, 0.03, 0.02, { color: hd, texel: 1 });
    }
    f.box("bridgeLamp", 0, top + 0.516, hz + 0.16, 0.1, 0.008, 0.02, { uv: "keep" });
  } else if (variant === 2) {
    // standing unit: two posts carry an overhead panel tipped 30° down toward the operator, two wide screens + a lamp row
    for (const s of [-1, 1]) f.box("paintedMetal", s * (w / 2 - 0.09), 1.72, hz + 0.1, 0.06, 0.84, 0.06, { color: shade(IMP.dark, 0.8), texel: 1 });
    const pa = 0.52;
    const pc = [0, 2.1, hz + 0.12];
    f.add("paintedMetal", new THREE.BoxGeometry(w - 0.1, 0.46, 0.06), pc[0], pc[1], pc[2], { color: shade(IMP.dark, 0.85), texel: 1, tilt: pa });
    const pw = (w - 0.5) / 2;
    for (let i = 0; i < 2; i++) {
      const s = screens[(i + 1) % screens.length];
      const mat = typeof s === "string" ? s : s.mat;
      const rect = typeof s === "string" ? null : s.rect;
      p = onPanel(pc, pa, (i - 0.5) * (pw + 0.1), 0.03, 0.036);
      f.add("darkGloss", new THREE.BoxGeometry(pw + 0.04, 0.3, 0.01), p[0], p[1], p[2], { tilt: pa });
      p = onPanel(pc, pa, (i - 0.5) * (pw + 0.1), 0.03, 0.044);
      f.add(mat, new THREE.BoxGeometry(pw, 0.24, 0.006), p[0], p[1], p[2], { tilt: pa, uv: "keep", ...(rect ? { uvRect: rect } : {}) });
    }
    for (let i = 0; i < 6; i++) {
      p = onPanel(pc, pa, -0.35 + i * 0.14, -0.18, 0.04);
      f.add(IND[(i * 5 + seed) % IND.length], new THREE.BoxGeometry(0.08, 0.025, 0.008), p[0], p[1], p[2], { tilt: pa });
    }
    p = onPanel(pc, pa, 0, 0.25, 0.0);
    f.add("emitRedImp", new THREE.BoxGeometry(0.06, 0.02, 0.06), p[0], p[1], p[2], { tilt: pa });
  }

  // indicator field on the desk: bezelled 5 mm buttons on a dark plate, lit rectangles, three readouts
  const nA = Math.min(10, Math.floor((w - 0.5) / 0.11));
  const xa = -((nA - 1) * 0.11) / 2;
  f.box("darkGloss", 0, 0.884, -0.13, nA * 0.11 + 0.04, 0.008, 0.06);
  for (let i = 0; i < nA; i++) {
    if (dim && i % 2) f.box("paintedMetal", xa + i * 0.11, 0.8905, -0.13, 0.07, 0.005, 0.03, { color: 0x1c1e22, texel: 2 });
    else f.box(IND[(i * 3 + seed) % IND.length], xa + i * 0.11, 0.8905, -0.13, 0.07, 0.005, 0.03);
  }
  const nB = Math.min(4, Math.floor((w - 0.5) / 0.34));
  const xb = -((nB - 1) * 0.34) / 2;
  for (let i = 0; i < nB; i++) {
    const lit = rand() < 0.75;
    if (lit) f.box(rand() < 0.5 ? "emitBlue" : "emitWhite", xb + i * 0.34, 0.886, -0.04, 0.09, 0.012, 0.05);
    else f.box("paintedMetal", xb + i * 0.34, 0.886, -0.04, 0.09, 0.012, 0.05, { color: shade(IMP.dark, 0.7), texel: 2 });
  }
  const rw = Math.min(0.26, (w - 0.5) / 3.6);
  for (let i = 0; i < 3; i++) f.box(["emitRedImp", "emitAmber", "emitBlue"][i], (i - 1) * (rw + 0.06), 0.884, 0.05, rw, 0.006, 0.02);
  if (w >= 2.6) {
    // wide units: two rotaries flanking the readouts and a 0.3 m slider bank on the right of the lit rectangles
    for (const s of [-1, 1]) {
      f.add("metal", new THREE.CylinderGeometry(0.03, 0.032, 0.025, 12), s * (rw * 1.5 + 0.2), 0.8925, 0.05, { color: IMP.steel, texel: 2 });
      f.box("emitWhite", s * (rw * 1.5 + 0.2), 0.906, 0.05 - 0.012, 0.004, 0.004, 0.02);
    }
    const xs = w / 2 - 0.55;
    f.box("darkGloss", xs, 0.884, -0.04, 0.3, 0.008, 0.12);
    for (let k = 0; k < 4; k++) {
      f.box("paintedMetal", xs - 0.09 + k * 0.06, 0.889, -0.04, 0.006, 0.004, 0.1, { color: SCUFF, texel: 2 });
      f.box("metal", xs - 0.09 + k * 0.06, 0.895, -0.04 + (rand() - 0.5) * 0.08, 0.024, 0.014, 0.02, { color: IMP.steel, texel: 2 });
    }
  }

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
      if (service && s < 0) continue;
      for (let k = 0; k < 2; k++) f.box("metal", s * (w / 2 - 0.014), 0.36 + k * 0.1, 0.05, 0.012, 0.025, 0.36, { color: IMP.mid, texel: 2 });
      f.box(s < 0 ? "emitAmber" : "emitRedImp", s * (w / 2 - 0.012), 0.64, -0.12, 0.01, 0.03, 0.03);
    }
  }
  // open service panel on the -x end: the end plate hangs open on its front hinge, the bay behind shows a
  // scuffed cavity with cable looms, a board and two lamps
  if (service) {
    f.box("paintedMetal", -w / 2 - 0.005, 0.44, 0.02, 0.03, 0.56, 0.56, { color: SCUFF, texel: 1 });
    for (let k = 0; k < 3; k++) f.add("paintedMetal", new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), -w / 2 - 0.04, 0.44, -0.15 + k * 0.1, { color: [IMP.black, 0x2a2320, IMP.dark][k], texel: 2 });
    f.box("darkGloss", -w / 2 - 0.03, 0.5, 0.15, 0.01, 0.3, 0.16);
    f.box("emitAmber", -w / 2 - 0.04, 0.6, 0.12, 0.008, 0.02, 0.02);
    f.box("emitRedImp", -w / 2 - 0.04, 0.36, 0.2, 0.008, 0.02, 0.02);
    const hinge = f.pos(-w / 2 - 0.01, 0, 0.31);
    const g = new Frame(kit, hinge[0], hinge[1], hinge[2], yaw + 1.15);
    g.box("paintedMetal", 0, 0.44, -0.3, 0.012, 0.6, 0.6, { color: shade(IMP.dark, 1.05), texel: 1 });
    g.box("metal", -0.012, 0.44, -0.45, 0.012, 0.16, 0.03, { color: IMP.mid, texel: 2 });
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

// Operator seat facing local -z. Cushion top at 0.48. Pads in darkGloss (black leather read): the shared
// `fabric` was a draw call spent on 91 small pads, freed for the module-local bridgeLamp diffusers.
export function bridgeSeat(kit, x, y, z, yaw = 0, { cushion = "darkGloss", tag = "seat" } = {}) {
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

// Commander's chair on a 0.2 m plinth (blue light strip under its lip): seat 0.45 over the plinth, 1.4 m
// winged back with a headrest, two 0.35 m armrest consoles with three small displays each. Faces local -z.
export function commandChair(kit, x, y, z, yaw = 0, { screen = "screenImp2" } = {}) {
  const f = new Frame(kit, x, y, z, yaw);
  const pad = 0x23262c;
  // plinth: recessed body, overhanging top plate, lit reveal under the lip on all four sides
  f.box("paintedMetal", 0, 0.085, 0, 1.0, 0.17, 1.0, { color: SCUFF, texel: 1 });
  f.box("paintedMetal", 0, 0.185, 0, 1.16, 0.03, 1.16, { color: IMP.black, texel: 1 });
  for (const s of [-1, 1]) {
    f.box("emitBlue", s * 0.54, 0.163, 0, 0.012, 0.01, 0.9);
    f.box("emitBlue", 0, 0.163, s * 0.54, 0.9, 0.01, 0.012);
  }
  // pedestal, seat pan (cushion top 0.65 = plinth + 0.45)
  f.add("paintedMetal", new THREE.CylinderGeometry(0.13, 0.17, 0.3, 12), 0, 0.35, 0.05, { color: shade(IMP.dark, 0.8), texel: 1 });
  f.box("paintedMetal", 0, 0.545, 0.03, 0.72, 0.09, 0.7, { color: IMP.dark, texel: 1 });
  f.box("darkGloss", 0, 0.62, 0.05, 0.62, 0.06, 0.58, { color: pad, texel: 2 });
  // back 0.62..1.58 leaning back 6°: shell, pad, headrest, wings, rear spine with a status lamp
  const bt = 0.1;
  const bc = [0, 1.1, 0.36];
  f.box("paintedMetal", bc[0], bc[1], bc[2], 0.7, 0.96, 0.08, { color: IMP.black, texel: 1, tilt: bt });
  let p = onTilt(bc, bt, 0, -0.055, -0.08);
  f.box("darkGloss", p[0], p[1], p[2], 0.5, 0.7, 0.03, { color: pad, texel: 2, tilt: bt });
  p = onTilt(bc, bt, 0, -0.065, 0.36);
  f.box("darkGloss", p[0], p[1], p[2], 0.34, 0.16, 0.05, { color: shade(pad, 0.8), texel: 2, tilt: bt });
  for (const s of [-1, 1]) {
    p = onTilt(bc, bt, s * 0.37, -0.06, 0.06);
    f.box("paintedMetal", p[0], p[1], p[2], 0.06, 0.8, 0.22, { color: IMP.black, texel: 1, tilt: bt });
    // blue hairline down each wing's rear edge: 8 mm, in five 0.1 m segments (critic round 3: the continuous
    // 12 mm × 0.7 m bar 0.5 m from the dais camera was the brightest thing in that frame)
    for (let k = 0; k < 5; k++) {
      p = onTilt(bc, bt, s * 0.37, 0.052, 0.06 + (k - 2) * 0.15);
      f.box("emitBlue", p[0], p[1], p[2], 0.008, 0.1, 0.008, { tilt: bt });
    }
  }
  // rear face (fills the left third of the dais view, so it is detailed like a cabinet): painted spine, polished
  // top rail, a seam grid of 6 mm ridges, a slatted vent grille high on each half, two readout panels with a
  // screen and a recessed key row, a readout strip low on each half
  p = onTilt(bc, bt, 0, 0.055, 0.0);
  f.box("paintedMetal", p[0], p[1], p[2], 0.12, 0.9, 0.03, { color: shade(IMP.mid, 1.1), texel: 2, tilt: bt });
  p = onTilt(bc, bt, 0, 0.0, 0.49);
  f.box("metal", p[0], p[1], p[2], 0.74, 0.03, 0.1, { color: POLISH, texel: 2, tilt: bt });
  const ridge = shade(IMP.dark, 1.15);
  for (const s of [-1, 1]) {
    p = onTilt(bc, bt, s * 0.325, 0.043, 0.0);
    f.box("paintedMetal", p[0], p[1], p[2], 0.006, 0.9, 0.006, { color: ridge, texel: 2, tilt: bt });
    for (const hh of [-0.44, -0.24, 0.24, 0.42]) {
      p = onTilt(bc, bt, s * 0.2, 0.043, hh);
      f.box("paintedMetal", p[0], p[1], p[2], 0.25, 0.006, 0.006, { color: ridge, texel: 2, tilt: bt });
    }
    // vent grille: 5 slats over a dark recess, upper half
    p = onTilt(bc, bt, s * 0.2, 0.042, 0.33);
    f.box("paintedMetal", p[0], p[1], p[2], 0.2, 0.14, 0.004, { color: SCUFF, texel: 2, tilt: bt });
    for (let k = 0; k < 5; k++) {
      p = onTilt(bc, bt, s * 0.2, 0.048, 0.28 + k * 0.025);
      f.box("metal", p[0], p[1], p[2], 0.18, 0.008, 0.006, { color: IMP.mid, texel: 2, tilt: bt });
    }
    // readout panel: screen + four 14 mm keys sunk in a black well strip
    p = onTilt(bc, bt, s * 0.2, 0.046, 0.0);
    f.box("darkGloss", p[0], p[1], p[2], 0.2, 0.36, 0.012, { tilt: bt });
    p = onTilt(bc, bt, s * 0.2, 0.054, 0.09);
    f.box(s > 0 ? "screenImp1" : "screenImp3", p[0], p[1], p[2], 0.16, 0.09, 0.006, { tilt: bt, uv: "keep" });
    p = onTilt(bc, bt, s * 0.2, 0.053, -0.06);
    f.box("paintedMetal", p[0], p[1], p[2], 0.17, 0.03, 0.004, { color: IMP.black, texel: 2, tilt: bt });
    for (let k = 0; k < 4; k++) {
      p = onTilt(bc, bt, s * 0.2 - 0.06 + k * 0.04, 0.0555, -0.06);
      f.box(k === 2 ? "bridgeLamp" : k === 1 ? "paintedMetal" : IND[(k * 4 + (s > 0 ? 1 : 3)) % IND.length], p[0], p[1], p[2], 0.014, 0.012, 0.003, { tilt: bt, ...(k === 1 ? { color: 0x1c1e22, texel: 2 } : {}) });
    }
    // low readout strip: dark bezel, screen strip, three lamps
    p = onTilt(bc, bt, s * 0.2, 0.046, -0.34);
    f.box("darkGloss", p[0], p[1], p[2], 0.22, 0.07, 0.012, { tilt: bt });
    p = onTilt(bc, bt, s * 0.2 - 0.03, 0.054, -0.34);
    f.box(s > 0 ? "screenImp0" : "screenImp2", p[0], p[1], p[2], 0.12, 0.035, 0.006, { tilt: bt, uv: "keep" });
    for (let k = 0; k < 3; k++) {
      p = onTilt(bc, bt, s * 0.2 + 0.06 + k * 0.022, 0.054, -0.34);
      f.box(["emitRedImp", "emitBlue", "emitAmber"][(k + (s > 0 ? 1 : 0)) % 3], p[0], p[1], p[2], 0.012, 0.02, 0.006, { tilt: bt });
    }
  }
  p = onTilt(bc, bt, 0, 0.075, 0.36);
  f.box("emitRedImp", p[0], p[1], p[2], 0.05, 0.03, 0.01, { tilt: bt });
  // armrest consoles: 0.35 wide, gloss top with three displays, four 18 mm keys sunk in black wells (two lit
  // colours, one cool white, one unlit — critic round 2: "pastel keycaps oversized and candy-like") and a thumb wheel
  for (const s of [-1, 1]) {
    const ax = s * 0.49;
    f.box("paintedMetal", ax, 0.72, 0.12, 0.1, 0.3, 0.3, { color: IMP.dark, texel: 1 });
    f.box("paintedMetal", ax, 0.895, 0.02, 0.35, 0.09, 0.78, { color: IMP.black, texel: 1 });
    f.box("darkGloss", ax, 0.945, -0.02, 0.3, 0.012, 0.62);
    for (let k = 0; k < 3; k++) f.box(k === 1 ? screen : "screenImp" + ((k + (s > 0 ? 1 : 3)) % 4), ax, 0.953, -0.26 + k * 0.155, 0.22, 0.006, 0.12, { uv: "keep" });
    f.box("paintedMetal", ax, 0.953, 0.215, 0.12, 0.006, 0.08, { color: IMP.black, texel: 2 });
    for (let k = 0; k < 4; k++) {
      const kx = ax + ((k % 2) - 0.5) * 0.05;
      const kz = 0.195 + Math.floor(k / 2) * 0.04;
      f.box("paintedMetal", kx, 0.955, kz, 0.028, 0.004, 0.022, { color: SCUFF, texel: 2 });
      const km = k === 3 ? "bridgeLamp" : k === 1 ? "paintedMetal" : IND[(k * 3 + (s > 0 ? 2 : 0)) % IND.length];
      f.box(km, kx, 0.9575, kz, 0.018, 0.003, 0.013, km === "paintedMetal" ? { color: 0x1c1e22, texel: 2 } : {});
    }
    f.add("metal", new THREE.CylinderGeometry(0.028, 0.028, 0.02, 10), ax + s * 0.115, 0.955, 0.215, { color: IMP.steel, texel: 2 });
    f.box("emitAmber", ax, 0.9, 0.412, 0.24, 0.006, 0.01);
  }
  f.collider(0, 0, 1.6, 0.1, 1.2, 1.2, "chair");
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

// Wall-mounted display, local +z faces the room, (x, y, z) on the wall face. Mounted, not floating (critic
// round 2): a wall plate with a 0.1 m mounting arm carries the unit, a matte black bezel frames a dark-gloss
// inner bezel and the screen, two lamps + optional stencil under the screen, and `cableTo` (world y) runs a
// conduit from the unit's back down/up the wall to a tray or box, with clamps at both ends.
// Critic round 3 ("monitors still float"): `bracket` swaps the hidden arm for two 6 cm struts that run past the
// bezel top and bottom on a wall rail, a 3 cm cable and, with `cableBox`, a junction box where the cable ends.
// `style` varies the housing so a row is not one template: 1 = control ledge under the screen (key row + wheel),
// 2 = lamp column down the right of the bezel; 0 = plain.
export function wallDisplay(kit, { x, y, z, yaw, w = 1.5, h = 1.1, screen = "screenImp0", rect = null, label, arm = true, cableTo = null, cableOut = 0.05, bracket = false, cableBox = false, style = 0 }) {
  const f = new Frame(kit, x, y, z, yaw);
  const o = arm || bracket ? 0.1 : 0;
  if (bracket) {
    const sx = Math.max(0.2, w / 2 - 0.3);
    f.box("paintedMetal", 0, h / 2 + 0.22, 0.02, w + 0.4, 0.08, 0.04, { color: IMP.mid, texel: 2 });
    f.box("paintedMetal", 0, -h / 2 - 0.22, 0.02, w + 0.4, 0.08, 0.04, { color: IMP.mid, texel: 2 });
    for (const s of [-1, 1]) {
      f.box("paintedMetal", s * sx, 0, o / 2, 0.06, h + 0.6, o, { color: shade(IMP.mid, 1.15), texel: 2 });
      for (const sy of [-1, 1]) f.box("metal", s * sx, sy * (h / 2 + 0.22), 0.045, 0.03, 0.03, 0.012, { color: IMP.steel, texel: 2 });
    }
  } else if (arm) {
    f.box("paintedMetal", 0, 0, 0.012, 0.36, 0.3, 0.024, { color: IMP.mid, texel: 2 });
    f.box("paintedMetal", 0, 0, 0.024 + (o - 0.024) / 2, 0.14, 0.14, o - 0.024, { color: shade(IMP.dark, 0.8), texel: 2 });
    for (const s of [-1, 1]) f.box("metal", s * 0.14, 0.1, 0.03, 0.03, 0.03, 0.012, { color: IMP.steel, texel: 2 });
  }
  const bw = w + 0.16 + (style === 2 ? 0.2 : 0);
  const bx = style === 2 ? 0.1 : 0;
  const bh = h + 0.18 + (style === 1 ? 0.22 : 0);
  const by = style === 1 ? -0.11 : 0;
  f.box("paintedMetal", bx, by, o + 0.03, bw, bh, 0.06, { color: IMP.black, texel: 1 });
  f.box("darkGloss", 0, 0.01, o + 0.07, w + 0.06, h + 0.06, 0.02);
  f.box(screen, 0, 0.01, o + 0.083, w, h, 0.006, { uv: "keep", ...(rect ? { uvRect: rect } : {}) });
  for (let i = 0; i < 2; i++) f.box(["emitBlue", "emitRedImp"][i], -w / 2 + 0.12 + i * 0.14, -h / 2 - 0.05, o + 0.065, 0.07, 0.02, 0.012);
  if (label !== undefined) f.decal(label, w / 2 - 0.14, -h / 2 - 0.05, o + 0.064, 0.12);
  if (style === 1) {
    // control ledge: dark key well with six 2 cm keys (two lit) and a thumb wheel, under the screen
    f.box("paintedMetal", 0, -h / 2 - 0.19, o + 0.062, w * 0.5, 0.07, 0.008, { color: SCUFF, texel: 2 });
    for (let k = 0; k < 6; k++) f.box(k === 1 ? "emitBlue" : k === 4 ? "emitAmber" : "paintedMetal", -w * 0.25 + 0.06 + k * 0.07, -h / 2 - 0.19, o + 0.068, 0.02, 0.02, 0.006, k === 1 || k === 4 ? {} : { color: 0x1c1e22, texel: 2 });
    f.add("metal", new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10), w * 0.25 + 0.1, -h / 2 - 0.19, o + 0.07, { color: IMP.steel, texel: 2, tilt: Math.PI / 2 });
  } else if (style === 2) {
    // lamp column down the widened right side of the bezel
    for (let k = 0; k < 5; k++) f.box(k === 2 ? "emitRedImp" : k % 2 ? "emitBlue" : "emitAmber", w / 2 + 0.15, h / 2 - 0.1 - k * 0.12, o + 0.062, 0.05, 0.02, 0.006);
  }
  if (cableTo !== null) {
    // conduit from the unit's back edge (behind the bezel) to the tray/box height, hugging the wall
    const yb = cableTo > y ? h / 2 + 0.06 : -h / 2 - 0.06;
    const dy = cableTo - y;
    const y0 = Math.min(yb, dy);
    const y1 = Math.max(yb, dy);
    if (y1 - y0 > 0.2) {
      const r = bracket ? 0.03 : 0.022;
      f.add("metal", new THREE.CylinderGeometry(r, r, y1 - y0, 8), 0.3, (y0 + y1) / 2, cableOut, { color: IMP.mid, texel: 2 });
      for (const yy of [y0 + 0.12, y1 - 0.12]) f.box("paintedMetal", 0.3, yy, (cableOut + 0.02) / 2, 0.08, 0.06, cableOut + 0.02, { color: IMP.dark, texel: 2 });
      if (cableBox) {
        // junction box centred on the cable's far end (the cable runs into it)
        const p = f.pos(0.3, dy, 0);
        junctionBox(kit, { x: p[0], y: p[1], z: p[2], yaw, w: 0.22, h: 0.24, lamp: "emitAmber" });
      }
    }
  }
}

// Breaker-box cluster for a bare upper wall (critic round 3, pit view: "flat-lit bare panel grid"): a 2 × 1.4 m
// backing plate carrying six breaker boxes in two rows with lamps and lid seams, a manifold pipe with stubs into
// each box, a slotted vent grille across the top and a red status lamp. Local +z faces the room.
export function breakerCluster(kit, { x, y, z, yaw, seed = 1 }) {
  const f = new Frame(kit, x, y, z, yaw);
  const lamps = ["emitAmber", "emitRedImp", "emitBlue"];
  f.box("paintedMetal", 0, 0, 0.012, 2.0, 1.4, 0.024, { color: shade(IMP.dark, 0.9), texel: 1 });
  f.box("paintedMetal", 0, 0, 0.03, 1.9, 1.3, 0.012, { color: SCUFF, texel: 1 });
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const p = f.pos(-0.6 + c * 0.6, -0.42 + r * 0.5, 0.036);
      junctionBox(kit, { x: p[0], y: p[1], z: p[2], yaw, w: 0.44, h: 0.38, lamp: lamps[(seed + r * 3 + c) % 3] });
      // stub from the manifold into each box
      f.add("metal", new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8), -0.6 + c * 0.6 - 0.12, -0.42 + r * 0.5 + 0.28, 0.08, { color: IMP.mid, texel: 2 });
    }
    f.box("metal", 0, -0.42 + r * 0.5 + 0.37, 0.08, 1.7, 0.05, 0.05, { color: IMP.mid, texel: 2 });
  }
  // vent grille across the top with slats over a dark recess
  f.box("paintedMetal", 0, 0.5, 0.04, 1.7, 0.3, 0.02, { color: SCUFF, texel: 1 });
  for (let k = 0; k < 5; k++) f.box("metal", 0, 0.39 + k * 0.055, 0.056, 1.6, 0.018, 0.012, { color: IMP.mid, texel: 2 });
  f.box("emitRedImp", 0.9, 0.62, 0.04, 0.04, 0.04, 0.012);
  f.decal(11, -0.85, 0.62, 0.037, 0.14);
}

// Coolant manifold panel for a bare upper wall (critic round 3, pit view, second pass: the wall bay at z 480–484
// fills the left third of the pit camera head-on and carried one junction box): a 1.8 × 1.1 m backing plate
// with two horizontal pipes on wall saddles, end flanges, two vertical links, three valve wheels on the upper
// pipe, two gauge boxes with lit readings on the lower one, status lamps and a stencil. Local +z faces the room.
export function manifoldPanel(kit, { x, y, z, yaw, seed = 1 }) {
  const f = new Frame(kit, x, y, z, yaw);
  const pipe = shade(IMP.mid, 1.05);
  const flange = shade(IMP.mid, 1.2);
  f.box("paintedMetal", 0, 0, 0.012, 1.8, 1.1, 0.024, { color: shade(IMP.dark, 0.9), texel: 1 });
  f.box("paintedMetal", 0, 0, 0.03, 1.7, 1.0, 0.012, { color: SCUFF, texel: 1 });
  for (const py of [-0.2, 0.24]) {
    f.add("metal", new THREE.CylinderGeometry(0.05, 0.05, 1.66, 10).rotateZ(Math.PI / 2), 0, py, 0.13, { color: pipe, texel: 2 });
    for (const s of [-1, 1]) f.add("metal", new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10).rotateZ(Math.PI / 2), s * 0.78, py, 0.13, { color: flange, texel: 2 });
  }
  for (const s of [-1, 1]) {
    f.add("metal", new THREE.CylinderGeometry(0.04, 0.04, 0.44, 8), s * 0.62, 0.02, 0.13, { color: pipe, texel: 2 });
    f.box("paintedMetal", s * 0.62, 0.02, 0.06, 0.12, 0.08, 0.12, { color: IMP.dark, texel: 2 });
  }
  // valve wheels off the upper pipe: stem, torus rim, hub, two spokes
  for (const vx of [-0.42, 0, 0.42]) {
    f.add("metal", new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6).rotateX(Math.PI / 2), vx, 0.24, 0.24, { color: IMP.steel, texel: 2 });
    f.add("metal", new THREE.TorusGeometry(0.1, 0.012, 6, 16), vx, 0.24, 0.33, { color: IMP.steel, texel: 2 });
    f.add("metal", new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8).rotateX(Math.PI / 2), vx, 0.24, 0.33, { color: shade(IMP.mid, 0.8), texel: 2 });
    f.box("metal", vx, 0.24, 0.33, 0.19, 0.014, 0.01, { color: IMP.steel, texel: 2 });
    f.box("metal", vx, 0.24, 0.33, 0.014, 0.19, 0.01, { color: IMP.steel, texel: 2 });
  }
  for (const s of [-1, 1]) {
    f.box("paintedMetal", s * 0.3, -0.2, 0.2, 0.18, 0.18, 0.08, { color: IMP.mid, texel: 2 });
    f.box("darkGloss", s * 0.3, -0.2, 0.243, 0.13, 0.13, 0.006);
    f.box(s < 0 ? "emitAmber" : "emitBlue", s * 0.3, -0.2, 0.247, 0.06, 0.012, 0.004);
  }
  f.box("emitRedImp", -0.78, 0.47, 0.04, 0.04, 0.04, 0.012);
  f.box("emitAmber", 0.78, 0.47, 0.04, 0.04, 0.04, 0.012);
  f.decal(seed % 2 ? 11 : 7, 0.62, -0.42, 0.037, 0.14);
}

// Riser bank: n vertical pipes up a wall face between world heights y0 and y1, `out` off the wall, spread along
// the wall at `pitch`, with a flange at both ends and a wall clamp every ~1.3 m. (x, z) is the bank centre on
// the wall face; local +z faces the room.
export function riserBank(kit, { x, z, yaw, y0, y1, n = 3, pitch = 0.3, r = 0.045, out = 0.13 }) {
  const f = new Frame(kit, x, (y0 + y1) / 2, z, yaw);
  const h = y1 - y0;
  const clamps = Math.max(2, Math.round(h / 1.3));
  const flange = shade(IMP.mid, 1.2);
  for (let i = 0; i < n; i++) {
    const px = (i - (n - 1) / 2) * pitch;
    f.add("metal", new THREE.CylinderGeometry(r, r, h, 8), px, 0, out, { color: i === 1 ? shade(IMP.mid, 1.12) : IMP.mid, texel: 2 });
    for (const e of [-1, 1]) f.add("metal", new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.05, 8), px, e * (h / 2 - 0.05), out, { color: flange, texel: 2 });
  }
  const w = (n - 1) * pitch + 2 * r + 0.1;
  for (let k = 1; k < clamps; k++) f.box("paintedMetal", 0, -h / 2 + (h / clamps) * k, (out + r) / 2, w, 0.08, out + r, { color: IMP.dark, texel: 2 });
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

// Junction box with a lamp and a lid seam; local +z faces the room. Painted steel like every other box on these
// walls (the shared wall() helper keeps metalRough in the bridge's material set anyway, via its panel joints).
export function junctionBox(kit, { x, y, z, yaw, w = 0.3, h = 0.36, lamp = "emitAmber" }) {
  const f = new Frame(kit, x, y, z, yaw);
  f.box("paintedMetal", 0, 0, 0.06, w, h, 0.12, { color: IMP.mid, texel: 2 });
  f.box("paintedMetal", 0, 0, 0.123, w - 0.05, h - 0.05, 0.006, { color: shade(IMP.mid, 0.8), texel: 2 });
  f.box(lamp, w / 2 - 0.06, h / 2 - 0.06, 0.13, 0.03, 0.03, 0.01);
}

// Junction-box cluster on a wall (a swap-in for a wall display so a display row is not one template tiled):
// a backing plate, three boxes of two sizes, a conduit between them and two stubs off the plate.
export function junctionCluster(kit, { x, y, z, yaw, seed = 1 }) {
  const f = new Frame(kit, x, y, z, yaw);
  const lamps = ["emitAmber", "emitRedImp", "emitBlue"];
  f.box("paintedMetal", 0, 0, 0.012, 1.5, 0.9, 0.024, { color: shade(IMP.dark, 0.9), texel: 1 });
  const p = f.pos(0, 0, 0);
  junctionBox(kit, { x: p[0], y: p[1] + 0.15, z: p[2], yaw, w: 0.44, h: 0.4, lamp: lamps[seed % 3] });
  for (const s of [-1, 1]) {
    const q = f.pos(s * 0.5, 0, 0);
    junctionBox(kit, { x: q[0], y: q[1] - 0.12 + (s > 0 ? 0.1 : 0), z: q[2], yaw, w: 0.3, h: 0.34, lamp: lamps[(seed + s + 3) % 3] });
  }
  f.box("metal", 0, -0.08, 0.06, 1.0, 0.05, 0.05, { color: IMP.mid, texel: 2 });
  for (const s of [-1, 1]) f.add("metal", new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), s * 0.5, 0.3, 0.07, { color: IMP.mid, texel: 2 });
  f.box("emitRedImp", -0.62, 0.36, 0.03, 0.03, 0.03, 0.012);
}

// Vent-grille pair on a wall (the other swap-in): two slotted panels side by side on a shared dark surround
// with a red lamp between them.
export function ventCluster(kit, { x, y, z, yaw, w = 1.0, h = 0.5 }) {
  const f = new Frame(kit, x, y, z, yaw);
  f.box("paintedMetal", 0, 0, 0.008, 2 * w + 0.4, h + 0.3, 0.016, { color: shade(IMP.dark, 0.9), texel: 1 });
  for (const s of [-1, 1]) {
    const p = f.pos(s * (w / 2 + 0.1), 0, 0.016);
    ventPanel(kit, { x: p[0], y: p[1], z: p[2], yaw, w, h });
  }
  f.box("emitRedImp", 0, h / 2 + 0.06, 0.02, 0.03, 0.03, 0.01);
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

// Free-standing data pillar (pit aisles, aft deck): black body on a scuffed kick, four corner posts, LED columns,
// a small screen strip on each x face, and a header cap carrying the "DATA TERMINAL" sign cell on all four faces
// with a red top lamp (critic round 3: the aft-deck pillar's lit screen under a wall display read as "a random
// lit hole in the wall" — the header names it and the posts frame it).
export function dataPillar(kit, x, y, z, { seed = 1, screen = "screenImp3", h = 2.2 } = {}) {
  const rand = rng(seed);
  kit.box("paintedMetal", x, y + 0.04, z, 0.7, 0.08, 0.7, { color: SCUFF, texel: 1 });
  kit.box("paintedMetal", x, y + h / 2, z, 0.6, h, 0.6, { color: shade(IMP.black, 0.9 + rand() * 0.3), texel: 1 });
  kit.box("paintedMetal", x, y + h / 2, z, 0.64, h - 0.3, 0.16, { color: IMP.mid, texel: 2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box("paintedMetal", x + sx * 0.3, y + h / 2, z + sz * 0.3, 0.05, h, 0.05, { color: shade(IMP.dark, 0.9), texel: 2 });
  // header cap: dark band with the sign strip on every face, mid-grey top plate, red lamp
  kit.box("paintedMetal", x, y + h + 0.13, z, 0.72, 0.26, 0.72, { color: IMP.black, texel: 1 });
  for (const sx of [-1, 1]) {
    kit.box("bridgeScreen", x + sx * 0.362, y + h + 0.13, z, 0.006, 0.14, 0.56, { uv: "keep", uvRect: SIGN.data });
    kit.box("bridgeScreen", x, y + h + 0.13, z + sx * 0.362, 0.56, 0.14, 0.006, { uv: "keep", uvRect: SIGN.data });
  }
  kit.box("paintedMetal", x, y + h + 0.275, z, 0.76, 0.03, 0.76, { color: IMP.mid, texel: 2 });
  kit.box("emitRedImp", x, y + h + 0.32, z, 0.08, 0.06, 0.08);
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 4; k++) kit.box(rand() < 0.2 ? "emitRedImp" : rand() < 0.5 ? "emitBlue" : "emitAmber", x + sx * 0.31, y + 0.6 + k * 0.16, z - 0.15, 0.01, 0.04, 0.07);
    kit.box("darkGloss", x + sx * 0.308, y + 1.55, z + 0.08, 0.01, 0.3, 0.3);
    kit.box(screen, x + sx * 0.317, y + 1.55, z + 0.08, 0.006, 0.24, 0.24, { uv: "keep" });
  }
  kit.collider([x - 0.36, y, z - 0.36], [x + 0.36, y + h + 0.35, z + 0.36], "pillar");
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

// 1.1 m control pillar at a rail head: black column on a scuffed base, sloped top with a small screen and six
// keys facing local +z, LED column, red status lamp, polished grab bar on the side.
export function controlPillar(kit, x, y, z, yaw = 0, { seed = 1, screen = "screenImp1" } = {}) {
  const f = new Frame(kit, x, y, z, yaw);
  const rand = rng(seed * 13 + 3);
  f.box("paintedMetal", 0, 0.025, 0, 0.44, 0.05, 0.44, { color: SCUFF, texel: 1 });
  f.box("paintedMetal", 0, 0.55, 0, 0.34, 1.0, 0.34, { color: shade(IMP.black, 0.9 + rand() * 0.3), texel: 1 });
  f.box("paintedMetal", 0, 0.6, 0.171, 0.22, 0.6, 0.012, { color: shade(IMP.dark, 0.9), texel: 1 });
  for (let k = 0; k < 4; k++) f.box(k === 2 ? "emitRedImp" : rand() < 0.5 ? "emitBlue" : "emitAmber", -0.07, 0.42 + k * 0.1, 0.18, 0.03, 0.02, 0.006);
  const a = 0.5;
  const c = [0, 1.07, 0.0];
  f.box("paintedMetal", c[0], c[1], c[2], 0.38, 0.05, 0.36, { color: IMP.dark, texel: 1, tilt: a });
  let p = onTilt(c, a, 0, -0.06, 0.03);
  f.box("darkGloss", p[0], p[1], p[2], 0.3, 0.008, 0.18, { tilt: a });
  p = onTilt(c, a, 0, -0.06, 0.036);
  f.box(screen, p[0], p[1], p[2], 0.26, 0.006, 0.14, { tilt: a, uv: "keep" });
  for (let k = 0; k < 6; k++) {
    p = onTilt(c, a, -0.1 + (k % 3) * 0.1, 0.09 + Math.floor(k / 3) * 0.05, 0.03);
    f.box(IND[(k * 5 + seed) % IND.length], p[0], p[1], p[2], 0.05, 0.006, 0.03, { tilt: a });
  }
  f.box("emitRedImp", 0.172, 0.95, 0, 0.006, 0.03, 0.06);
  f.box("metal", -0.2, 0.9, 0, 0.025, 0.025, 0.3, { color: POLISH, texel: 2 });
  f.collider(0, 0, 1.15, 0, 0.46, 0.46, "pillar");
}

// Sloped handrail along x = const beside a stair running in z: top rail (polished) and mid rail follow the
// flight from (zTop, yTop) to (zBot, yBot); three posts stand on the treads.
export function stairRail(kit, x, zTop, zBot, yTop, yBot) {
  const len = Math.hypot(zBot - zTop, yBot - yTop) + 0.3;
  const ang = Math.atan2(yTop - yBot, zBot - zTop);
  const cz = (zTop + zBot) / 2;
  const cy = (yTop + yBot) / 2;
  kit.add("metal", new THREE.BoxGeometry(0.05, 0.05, len), { pos: [x, cy + 1.0, cz], rot: [ang, 0, 0], color: POLISH, texel: 2 });
  kit.add("metal", new THREE.BoxGeometry(0.03, 0.03, len), { pos: [x, cy + 0.6, cz], rot: [ang, 0, 0], color: IMP.mid, texel: 2 });
  for (const t of [0.08, 0.5, 0.92]) {
    const z = zTop + (zBot - zTop) * t;
    const yb = yTop + (yBot - yTop) * t;
    kit.box("paintedMetal", x, yb + 0.49, z, 0.06, 0.98, 0.06, { color: IMP.dark, texel: 2 });
  }
}

// Vertical conduit dropping down a wall from y1 to y0 (local +z faces the room), clamps top and bottom,
// optional junction box at boxY.
export function dropConduit(kit, { x, z, yaw, y0, y1, r = 0.035, out = 0.07, boxY = null, lamp = "emitAmber" }) {
  const f = new Frame(kit, x, 0, z, yaw);
  f.add("metal", new THREE.CylinderGeometry(r, r, y1 - y0, 8), 0, (y0 + y1) / 2, out, { color: IMP.mid, texel: 2 });
  for (const yy of [y0 + 0.2, y1 - 0.2]) f.box("paintedMetal", 0, yy, out - 0.02, r * 2 + 0.04, 0.08, out + 0.04, { color: IMP.dark, texel: 2 });
  if (boxY !== null) junctionBox(kit, { x, y: boxY, z, yaw, w: 0.28, h: 0.34, lamp });
}

// Round floor hatch (1 m): plate, rim ring, six bolts, recessed handle, amber lamp. Sits 12–20 mm proud.
export function floorHatch(kit, x, y, z, { r = 0.5 } = {}) {
  kit.add("paintedMetal", new THREE.CylinderGeometry(r, r, 0.012, 24), { pos: [x, y + 0.006, z], color: shade(IMP.black, 1.3), texel: 1 });
  kit.add("paintedMetal", new THREE.RingGeometry(r - 0.07, r + 0.02, 24), { pos: [x, y + 0.014, z], rot: [-Math.PI / 2, 0, 0], color: IMP.mid, texel: 1 });
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + 0.26;
    kit.box("metal", x + Math.cos(a) * (r - 0.03), y + 0.018, z + Math.sin(a) * (r - 0.03), 0.04, 0.008, 0.04, { color: IMP.steel, texel: 2 });
  }
  kit.box("paintedMetal", x, y + 0.016, z, 0.2, 0.008, 0.07, { color: SCUFF, texel: 2 });
  kit.box("metal", x, y + 0.021, z, 0.14, 0.006, 0.02, { color: IMP.steel, texel: 2 });
  kit.box("emitAmber", x + r - 0.18, y + 0.016, z, 0.04, 0.006, 0.04);
}

// Deck-plate joints: 2 cm dark seam lines on a dx × dz grid over [x0..x1] × [z0..z1] at floor y, 3 mm proud.
// xs / zs give the first seam position (defaults to the grid aligned on x0 / z0). `mat` "darkGloss" for the gloss
// decks: a matte (paintedMetal) seam scatters the raking key toward a grazing camera and read as a lighter dashed
// line down the walkway; the glossier dark seam reflects the near-black ceiling and stays a dark joint.
export function deckSeams(kit, [x0, z0], [x1, z1], y, { dx = 1.2, dz = 2.4, xs = null, zs = null, color = SCUFF, mat = "paintedMetal" } = {}) {
  for (let x = xs ?? x0 + dx; x < x1 - 0.05; x += dx) {
    if (x <= x0 + 0.05) continue;
    kit.boxMM(mat, [x - 0.01, y, z0], [x + 0.01, y + 0.003, z1], { color, texel: 2 });
  }
  for (let z = zs ?? z0 + dz; z < z1 - 0.05; z += dz) {
    if (z <= z0 + 0.05) continue;
    kit.boxMM(mat, [x0, y, z - 0.01], [x1, y + 0.003, z + 0.01], { color, texel: 2 });
  }
}

// Raised 0.3 m cable-cover channel on the floor between two x positions at z: black base, mid-grey cover, lamp.
export function cableCover(kit, xa, xb, y, z) {
  const x0 = Math.min(xa, xb);
  const x1 = Math.max(xa, xb);
  kit.boxMM("paintedMetal", [x0, y, z - 0.15], [x1, y + 0.04, z + 0.15], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [x0 + 0.04, y + 0.04, z - 0.12], [x1 - 0.04, y + 0.055, z + 0.12], { color: IMP.mid, texel: 2 });
  kit.box("emitAmber", (x0 + x1) / 2, y + 0.058, z + 0.09, 0.05, 0.006, 0.02);
}
