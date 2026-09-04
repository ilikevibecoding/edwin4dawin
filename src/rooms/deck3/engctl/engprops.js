// Engineering-deck props shared by d3-engctl, d3-reactor and d3-hyperdrive. Local extension of the
// shared Deck 2/3 prop set (kit-bashed through `placer`, colliders as world AABBs); nothing here
// touches the shell. Yaw convention as in props.js: a prop's front faces local +Z.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { col, IMP } from "../../deck2/_shared/palette.js";
import { placer, indicatorField, crate } from "../../deck2/_shared/props.js";

export const TAU = Math.PI * 2;

// Point on an arc around (cx, cz): angle phi measured from −Z (forward) toward +X.
export const arcPos = (cx, cz, r, phi) => [cx + r * Math.sin(phi), cz - r * Math.cos(phi)];

// Segmented emissive arc marking on a floor at height y.
export function arcLine(kit, cx, y, cz, r, phi0, phi1, { w = 0.12, mat = "emitOrange", segLen = 1.2, color } = {}) {
  const len = Math.abs(phi1 - phi0) * r;
  const n = Math.max(1, Math.ceil(len / segLen));
  for (let i = 0; i < n; i++) {
    const a0 = phi0 + ((phi1 - phi0) * i) / n;
    const a1 = phi0 + ((phi1 - phi0) * (i + 1)) / n;
    const am = (a0 + a1) / 2;
    const chord = 2 * r * Math.sin(Math.abs(a1 - a0) / 2);
    const [x, z] = arcPos(cx, cz, r, am);
    kit.add(mat, new THREE.BoxGeometry(chord + 0.03, 0.006, w), { pos: [x, y + 0.003, z], rot: [0, -am, 0], ...(color ? { color } : {}) });
  }
}

// Axis-aligned box rotated about Y.
export function yawBox(kit, mat, c, size, yaw, opts = {}) {
  return kit.add(mat, new THREE.BoxGeometry(size[0], size[1], size[2]), { pos: c, rot: [0, yaw, 0], ...opts });
}

// Box strut between two world points (local Y along a→b), cross-section sx × sz.
export function strut(kit, mat, a, b, sx, sz, opts = {}) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return kit.add(mat, new THREE.BoxGeometry(sx, len, sz), { pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], quat: q, ...opts });
}

// Torus ring around an axis ("x" | "y" | "z") centred at c.
export function ring(kit, mat, c, r, tube, axis = "y", { radial = 8, tubular = 40, color, texel = 1 } = {}) {
  const rot = axis === "y" ? [Math.PI / 2, 0, 0] : axis === "x" ? [0, Math.PI / 2, 0] : [0, 0, 0];
  return kit.add(mat, new THREE.TorusGeometry(r, tube, radial, tubular), { pos: c, rot, color, texel });
}

// Floor-standing power-distribution cabinet (2.4 m): twin doors, vent slats, breaker lever, status field.
export function powerCabinet(kit, PALETTE, pos, yaw, { w = 1.6, h = 2.4, d = 0.8, seed = 3 } = {}) {
  const P = placer(kit, pos, yaw);
  const dark = col(PALETTE, "impDark");
  const black = col(PALETTE, "impBlack");
  const mid = col(PALETTE, "impMid");
  P.box("paintedMetal", 0, h / 2, 0, w, h, d, { color: dark, texel: 1 });
  P.box("paintedMetal", 0, 0.08, 0, w + 0.06, 0.16, d + 0.06, { color: black });
  P.box("paintedMetal", 0, h - 0.1, 0, w + 0.06, 0.2, d + 0.06, { color: black });
  for (const s of [-1, 1]) {
    P.box("impPanel", (s * w) / 4, h / 2 + 0.08, d / 2 + 0.012, w / 2 - 0.08, h - 0.6, 0.02, { color: mid, uv: "keep" });
    P.box("metal", s * 0.09, h / 2, d / 2 + 0.035, 0.03, 0.32, 0.025, { color: col(PALETTE, "steel") });
  }
  for (let i = 0; i < 6; i++) P.box("paintedMetal", 0, 0.5 + i * 0.07, d / 2 + 0.03, w - 0.5, 0.025, 0.02, { color: black });
  indicatorField(P, -w / 4, h - 0.5, d / 2 + 0.024, w / 2 - 0.2, 0.26, seed + 3);
  P.box("emitAmber", w / 4, h - 0.55, d / 2 + 0.03, 0.42, 0.12, 0.01);
  P.box("emitRedImp", w / 4 + 0.12, h - 0.36, d / 2 + 0.03, 0.14, 0.06, 0.01);
  P.box("emitGreen", w / 4 - 0.12, h - 0.36, d / 2 + 0.03, 0.14, 0.06, 0.01);
  P.box("metal", w / 4, h - 0.95, d / 2 + 0.09, 0.1, 0.36, 0.12, { color: col(PALETTE, "impRed") });
  P.collider([-w / 2 - 0.03, 0, -d / 2 - 0.03], [w / 2 + 0.03, h, d / 2 + 0.1], "cabinet");
  return P;
}

// Overhead cable tray between two axis-aligned points: channel (bottom + lips) with cables inside.
export function cableTray(kit, PALETTE, a, b, { w = 0.6, h = 0.14, cables = 3 } = {}) {
  const dark = col(PALETTE, "impDark");
  const shades = [col(PALETTE, "impBlack"), col(PALETTE, "impDark"), col(PALETTE, "steel")];
  const alongX = Math.abs(b[0] - a[0]) >= Math.abs(b[2] - a[2]);
  const lo = alongX ? Math.min(a[0], b[0]) : Math.min(a[2], b[2]);
  const hi = alongX ? Math.max(a[0], b[0]) : Math.max(a[2], b[2]);
  const c = alongX ? a[2] : a[0];
  const y = a[1];
  const bx = (l0, l1, y0, y1, c0, c1, opts) => (alongX ? kit.boxMM("paintedMetal", [l0, y0, c0], [l1, y1, c1], opts) : kit.boxMM("paintedMetal", [c0, y0, l0], [c1, y1, l1], opts));
  bx(lo, hi, y, y + 0.03, c - w / 2, c + w / 2, { color: dark, texel: 1 });
  bx(lo, hi, y, y + h, c - w / 2, c - w / 2 + 0.03, { color: dark });
  bx(lo, hi, y, y + h, c + w / 2 - 0.03, c + w / 2, { color: dark });
  for (let i = 0; i < cables; i++) {
    const off = c - w / 2 + 0.13 + (i * (w - 0.26)) / Math.max(1, cables - 1);
    const mid = (lo + hi) / 2;
    if (alongX) kit.cyl("metal", mid, y + 0.08, off, 0.05, hi - lo, "x", { color: shades[i % 3], segments: 8 });
    else kit.cyl("metal", off, y + 0.08, mid, 0.05, hi - lo, "z", { color: shades[i % 3], segments: 8 });
  }
  for (let t = lo + 1.5; t < hi; t += 3) bx(t, t + 0.06, y - 0.02, y + h + 0.02, c - w / 2 - 0.03, c + w / 2 + 0.03, { color: col(PALETTE, "impBlack") });
}

// Coolant valve station against a wall: stub pipe with flange, riser, big hand wheel facing +Z, gauge.
export function valveStation(kit, PALETTE, pos, yaw, { r = 0.18, h = 1.3 } = {}) {
  const P = placer(kit, pos, yaw);
  const steel = col(PALETTE, "steel");
  const dark = col(PALETTE, "impDark");
  P.cyl("metal", 0, h, 0.2, r, 0.9, "z", { color: steel, segments: 12 });
  P.cyl("paintedMetal", 0, h, -0.16, r + 0.1, 0.12, "z", { color: dark, segments: 12 });
  P.cyl("paintedMetal", 0, h, 0.45, r + 0.08, 0.3, "z", { color: dark, segments: 12 });
  P.cyl("metal", 0, h / 2, 0.5, r, h, "y", { color: steel, segments: 12 });
  P.cyl("paintedMetal", 0, 0.08, 0.5, r + 0.12, 0.16, "y", { color: col(PALETTE, "impBlack"), segments: 12 });
  // hand wheel on the riser top: torus about Y with a hub and four spokes
  const wy = h + r + 0.32;
  P.add("metal", new THREE.TorusGeometry(0.42, 0.04, 8, 28), 0, wy, 0.5, { rot: [Math.PI / 2, 0, 0], color: col(PALETTE, "impRed") });
  P.cyl("metal", 0, wy, 0.5, 0.09, 0.14, "y", { color: steel, segments: 10 });
  P.cyl("metal", 0, wy - 0.05, 0.5, 0.05, 0.4, "y", { color: steel, segments: 8 });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4;
    P.add("metal", new THREE.BoxGeometry(0.84, 0.03, 0.03), 0, wy, 0.5, { rot: [0, a, 0], color: steel });
  }
  // gauge on the stub
  P.cyl("darkGloss", 0, h + r + 0.16, 0.15, 0.11, 0.05, "z", { segments: 14 });
  P.box("emitAmber", 0, h + r + 0.16, 0.185, 0.06, 0.06, 0.01);
  P.collider([-0.55, 0, -0.25], [0.55, wy + 0.5, 0.95], "valve");
  return P;
}

// Wall tool rack: back panel with pegs, hanging tools and a low shelf with parts bins. Faces +Z.
export function toolRack(kit, PALETTE, pos, yaw, { w = 1.8, h = 2.0, seed = 5 } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const dark = col(PALETTE, "impDark");
  const steel = col(PALETTE, "steel");
  P.box("paintedMetal", 0, h / 2, 0, w, h, 0.06, { color: dark, texel: 1 });
  P.box("paintedMetal", 0, h - 0.06, 0.02, w, 0.12, 0.1, { color: col(PALETTE, "impBlack") });
  const n = Math.floor(w / 0.3);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.15 + i * 0.3;
    P.box("metal", x, h - 0.35, 0.08, 0.03, 0.03, 0.1, { color: steel });
    const kind = rand();
    if (kind < 0.35) P.cyl("metal", x, h - 0.75, 0.1, 0.03, 0.7, "y", { color: steel, segments: 8 });
    else if (kind < 0.7) {
      P.box("metal", x, h - 0.7, 0.1, 0.05, 0.6, 0.05, { color: steel });
      P.box("paintedMetal", x, h - 0.42, 0.1, 0.12, 0.1, 0.07, { color: col(PALETTE, "impRed") });
    } else if (kind < 0.9) P.box("paintedMetal", x, h - 0.6, 0.1, 0.08, 0.5, 0.06, { color: col(PALETTE, "impBlack") });
  }
  P.box("paintedMetal", 0, 0.75, 0.2, w, 0.05, 0.4, { color: dark });
  for (let i = 0; i < 3; i++) P.box("paintedMetal", -w / 2 + 0.35 + i * (w - 0.7) / 2, 0.9, 0.2, 0.42, 0.25, 0.34, { color: i === 1 ? col(PALETTE, "impMid") : col(PALETTE, "impGrey") });
  P.box("paintedMetal", 0, 0.3, 0.2, w, 0.05, 0.4, { color: dark });
  P.box("emitAmber", 0, h - 0.06, 0.075, w * 0.6, 0.03, 0.01);
  P.collider([-w / 2, 0, -0.05], [w / 2, h, 0.45], "rack");
  return P;
}

// Small monitor pedestal: post with a tilted screen and a status strip. Screen faces +Z.
export function monitorPedestal(kit, PALETTE, pos, yaw, { screenMat = "screenImp2", h = 1.15 } = {}) {
  const P = placer(kit, pos, yaw);
  const black = col(PALETTE, "impBlack");
  P.box("paintedMetal", 0, 0.05, 0, 0.5, 0.1, 0.5, { color: black });
  P.box("paintedMetal", 0, h / 2, 0, 0.18, h, 0.14, { color: col(PALETTE, "impDark") });
  const tilt = -0.5;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
  kit.add("paintedMetal", new THREE.BoxGeometry(0.62, 0.46, 0.06), { pos: P.world(0, h + 0.12, 0.05), quat: q, color: black });
  kit.add(screenMat, new THREE.BoxGeometry(0.54, 0.38, 0.01), { pos: P.world(0, h + 0.12 - 0.035 * Math.sin(tilt), 0.05 + 0.035 * Math.cos(tilt)), quat: q, uv: "keep" });
  P.box("emitBlue", 0, h - 0.15, 0.075, 0.1, 0.02, 0.01);
  P.box("emitRedImp", 0, h - 0.22, 0.075, 0.1, 0.02, 0.01);
  P.collider([-0.31, 0, -0.25], [0.31, h + 0.4, 0.3], "pedestal");
  return P;
}

// Floodlight on a short post: dark head with a bright face, tilted `tilt` rad up from horizontal. Faces +Z.
export function floodlight(kit, PALETTE, pos, yaw, { tilt = 0.9, post = 0.9, mat = "emitWhite" } = {}) {
  const P = placer(kit, pos, yaw);
  const black = col(PALETTE, "impBlack");
  P.box("paintedMetal", 0, 0.05, 0, 0.6, 0.1, 0.6, { color: black });
  P.box("paintedMetal", 0, post / 2, 0, 0.12, post, 0.12, { color: col(PALETTE, "impDark") });
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-tilt, 0, 0)));
  const hc = P.world(0, post + 0.22, 0.08);
  kit.add("paintedMetal", new THREE.BoxGeometry(0.7, 0.45, 0.4), { pos: hc, quat: q, color: black });
  // bright face on the head's +Z side (rotated with the head)
  const fwd = new THREE.Vector3(0, 0, 0.205).applyQuaternion(q);
  kit.add(mat, new THREE.BoxGeometry(0.6, 0.36, 0.02), { pos: [hc[0] + fwd.x, hc[1] + fwd.y, hc[2] + fwd.z], quat: q });
  P.collider([-0.35, 0, -0.3], [0.35, post + 0.5, 0.35], "flood");
}

// Crane gantry over a walkway: two posts, an I-beam lintel with a hoist trolley (block, hook and
// cable) hanging from it, hazard-banded beam ends, amber post strips. Spans local X, walkway along Z.
// `lamp: ±1` hangs a hooded floodlight head under the beam aimed down the walkway toward local ±Z.
export function portalArch(kit, PALETTE, pos, yaw, { span = 4.7, h = 4.5, post = 0.5, depth = 0.5, trolley = 0.3, lamp = 0, lampMat = "emitAmber" } = {}) {
  const P = placer(kit, pos, yaw);
  const dark = col(PALETTE, "impDark");
  const black = col(PALETTE, "impBlack");
  const steel = col(PALETTE, "steel");
  for (const s of [-1, 1]) {
    P.box("paintedMetal", (s * (span - post)) / 2, h / 2, 0, post, h, depth, { color: dark, texel: 2.5 });
    P.box("paintedMetal", (s * (span - post)) / 2, 0.15, 0, post + 0.1, 0.3, depth + 0.1, { color: black });
    P.box("emitAmber", (s * (span - post)) / 2, h * 0.55, depth / 2 + 0.006, 0.06, h * 0.5, 0.01);
    P.box("emitAmber", (s * (span - post)) / 2, h * 0.55, -depth / 2 - 0.006, 0.06, h * 0.5, 0.01);
    P.collider([(s * (span - post)) / 2 - post / 2 - 0.05, 0, -depth / 2 - 0.05], [(s * (span - post)) / 2 + post / 2 + 0.05, h, depth / 2 + 0.05], "arch");
  }
  // I-beam: flanges + web, hazard bands at the ends, a rail under the beam for the trolley
  P.box("paintedMetal", 0, h + 0.52, 0, span, 0.08, depth, { color: black, texel: 2.5 });
  P.box("paintedMetal", 0, h + 0.3, 0, span, 0.36, depth * 0.5, { color: dark, texel: 2.5 });
  P.box("paintedMetal", 0, h + 0.08, 0, span, 0.08, depth, { color: black, texel: 2.5 });
  for (const s of [-1, 1]) P.box("hazard", (s * (span - post - 0.9)) / 2, h + 0.3, depth * 0.25 + 0.006, 0.8, 0.3, 0.01, { uv: "keep" });
  P.box("metal", 0, h - 0.02, 0, span - post * 2 - 0.4, 0.06, 0.12, { color: steel });
  // hoist trolley off-centre with drum, hook block and cable
  const tx = trolley * (span - post * 2 - 1.2) * 0.5;
  P.box("paintedMetal", tx, h - 0.28, 0, 0.7, 0.44, 0.5, { color: dark, texel: 2.5 });
  P.cyl("metal", tx, h - 0.22, 0.3, 0.14, 0.4, "x", { color: steel, segments: 10 });
  P.box("emitAmber", tx, h - 0.16, -0.256, 0.16, 0.05, 0.01);
  P.box("emitRedImp", tx + 0.22, h - 0.16, -0.256, 0.06, 0.05, 0.01);
  P.box("metal", tx, h - 0.9, 0, 0.02, 0.8, 0.02, { color: steel });
  P.box("paintedMetal", tx, h - 1.42, 0, 0.26, 0.28, 0.2, { color: black });
  P.add("metal", new THREE.TorusGeometry(0.12, 0.025, 6, 12), tx, h - 1.68, 0, { rot: [0, yaw + Math.PI / 2, 0], color: steel });
  P.box("emitAmber", 0, h + 0.64, 0, span - 0.4, 0.08, depth * 0.5);
  if (lamp) {
    // floodlight head on the far side of the trolley: stub + hood under the beam, head box tilted
    // 0.8 rad down toward local ±Z with its bright face on the low side (the pool light sits below it)
    const s = Math.sign(lamp);
    const hx = -tx * 2.4;
    const tilt = 0.8;
    P.box("paintedMetal", hx, h - 0.06, s * 0.3, 0.14, 0.2, 0.14, { color: black });
    P.box("paintedMetal", hx, h - 0.2, s * 0.25, 1.0, 0.08, 0.8, { color: black, texel: 2.5 });
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(s * tilt, 0, 0)));
    const c = [hx, h - 0.5, s * 0.32];
    const n = [0, -Math.sin(tilt), s * Math.cos(tilt)];
    kit.add("paintedMetal", new THREE.BoxGeometry(0.8, 0.4, 0.3), { pos: P.world(c[0], c[1], c[2]), quat: q, color: black, texel: 2.5 });
    kit.add(lampMat, new THREE.BoxGeometry(0.64, 0.28, 0.02), { pos: P.world(c[0] + n[0] * 0.16, c[1] + n[1] * 0.16, c[2] + n[2] * 0.16), quat: q });
  }
}

// Housed wall lamp: dark hood on the wall with a bright face tilted `tilt` rad DOWN from horizontal,
// so the face is hidden from above and lights the floor/props below. Faces +Z (into the room).
export function wallLamp(kit, PALETTE, pos, yaw, { w = 0.9, tilt = 0.7, mat = "emitWhite" } = {}) {
  const P = placer(kit, pos, yaw);
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  P.box("paintedMetal", 0, 0.32, 0.2, 0.3, 0.16, 0.4, { color: dark, texel: 2.5 }); // bracket
  P.box("paintedMetal", 0, 0.42, 0.45, w, 0.06, 0.9, { color: black, texel: 2.5 }); // hood
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
  const hc = P.world(0, 0.12, 0.5);
  kit.add("paintedMetal", new THREE.BoxGeometry(w - 0.1, 0.4, 0.3), { pos: hc, quat: q, color: black, texel: 2.5 });
  const fwd = new THREE.Vector3(0, 0, 0.155).applyQuaternion(q);
  kit.add(mat, new THREE.BoxGeometry(w - 0.24, 0.28, 0.02), { pos: [hc[0] + fwd.x, hc[1] + fwd.y, hc[2] + fwd.z], quat: q });
  for (const s of [-1, 1]) P.box("paintedMetal", (s * (w - 0.06)) / 2, 0.1, 0.5, 0.06, 0.5, 0.7, { color: black });
}

// Ceiling fixture: framed housing on a stem with a recessed light face (the fill light sits just below).
export function ceilingFixture(kit, PALETTE, pos, { w = 2.4, d = 0.7, stem = 1.0, mat = "emitAmber", yaw = 0 } = {}) {
  const P = placer(kit, pos, yaw);
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  for (const s of [-1, 1]) P.box("paintedMetal", (s * w) / 3, -stem / 2, 0, 0.06, stem, 0.06, { color: black });
  P.box("paintedMetal", 0, -stem - 0.16, 0, w, 0.32, d, { color: dark, texel: 2.5 });
  P.box("paintedMetal", 0, -stem - 0.33, 0, w - 0.16, 0.04, d - 0.16, { color: black });
  P.box(mat, 0, -stem - 0.3, 0, w - 0.3, 0.02, d - 0.3, { uv: "keep" });
  for (let i = 1; i < 4; i++) P.box("paintedMetal", -w / 2 + (i * w) / 4, -stem - 0.31, 0, 0.04, 0.05, d - 0.2, { color: black });
}

// Conduit bundle collecting a cabinet row: a collector duct on the cabinet tops plus a few thick
// risers (r 0.16–0.2) with flanges up to `topY`. `xs` are riser positions along the duct axis.
export function conduitBundle(kit, PALETTE, a, b, topY, risers, { r = 0.18, ductH = 0.32, ductW = 0.5 } = {}) {
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  const alongX = Math.abs(b[0] - a[0]) >= Math.abs(b[2] - a[2]);
  const min = [Math.min(a[0], b[0]), a[1], Math.min(a[2], b[2])];
  const max = [Math.max(a[0], b[0]), a[1] + ductH, Math.max(a[2], b[2])];
  if (alongX) { min[2] -= ductW / 2; max[2] += ductW / 2; } else { min[0] -= ductW / 2; max[0] += ductW / 2; }
  kit.boxMM("paintedMetal", min, max, { color: dark, texel: 2.5 });
  kit.boxMM("paintedMetal", [min[0] - 0.03, a[1] + ductH - 0.06, min[2] - 0.03], [max[0] + 0.03, a[1] + ductH, max[2] + 0.03], { color: black });
  for (const t of risers) {
    const p = alongX ? [t, a[1] + ductH, a[2]] : [a[0], a[1] + ductH, t];
    kit.cyl("metal", p[0], (p[1] + topY) / 2, p[2], r, topY - p[1], "y", { color: dark, segments: 12, texel: 0.5 });
    kit.cyl("paintedMetal", p[0], p[1] + 0.2, p[2], r + 0.08, 0.4, "y", { color: black, segments: 12 });
    kit.cyl("paintedMetal", p[0], topY - 0.25, p[2], r + 0.08, 0.5, "y", { color: black, segments: 12 });
    kit.cyl("paintedMetal", p[0], (p[1] + topY) / 2, p[2], r + 0.06, 0.25, "y", { color: black, segments: 12 });
  }
}

// Two small angled status screens standing on a console's flat top (local +Z = operator side).
export function topScreens(kit, pos, yaw, w, mats = ["screenImp0", "screenImp3"]) {
  const P = placer(kit, pos, yaw);
  const tilt = -1.05;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
  const n = w > 2.6 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : (i === 0 ? -1 : 1) * (w / 4);
    P.box("paintedMetal", x, 0.96, 0.22, 0.12, 0.12, 0.16, { color: IMP.impBlack });
    kit.add("paintedMetal", new THREE.BoxGeometry(0.44, 0.3, 0.03), { pos: P.world(x, 1.13, 0.2), quat: q, color: IMP.impBlack });
    const nz = 0.02 * Math.cos(tilt);
    const ny = -0.02 * Math.sin(tilt);
    kit.add(mats[i % mats.length], new THREE.BoxGeometry(0.38, 0.24, 0.01), { pos: P.world(x, 1.13 + ny, 0.2 + nz), quat: q, uv: "keep" });
    // status LED strip on the housing's top edge (the edge faces back and up, i.e. the service side)
    const ey = 0.16 * Math.cos(tilt);
    const ez = 0.16 * Math.sin(tilt);
    kit.add("emitBlue", new THREE.BoxGeometry(0.26, 0.012, 0.02), { pos: P.world(x, 1.13 + ey, 0.2 + ez), quat: q });
  }
}

// Crate with black bumpers (no `rubber` key), a light label plate with a stencil bar and two latches.
export function labelCrate(kit, PALETTE, pos, yaw, opts = {}) {
  const { w = 1.2, h = 1.2, d = 1.2, seed = 5 } = opts;
  crate(kit, PALETTE, pos, yaw, { ...opts, bumperMat: "paintedMetal" });
  const P = placer(kit, pos, yaw);
  const rand = rng(seed + 77);
  const grey = col(PALETTE, "impGrey");
  const black = col(PALETTE, "impBlack");
  const lw = Math.min(0.5, w - 0.5);
  P.box("impPanel", -w / 2 + 0.35, h * 0.55, d / 2 + 0.036, lw, 0.22, 0.01, { color: grey, uv: "keep" });
  P.box("paintedMetal", -w / 2 + 0.35, h * 0.55 + 0.06, d / 2 + 0.044, lw - 0.1, 0.03, 0.005, { color: black });
  P.box("paintedMetal", -w / 2 + 0.35, h * 0.55 - 0.04, d / 2 + 0.044, lw - 0.24, 0.02, 0.005, { color: rand() < 0.5 ? col(PALETTE, "impAmber") : black });
  for (const s of [-1, 1]) {
    P.box("metal", (s * (w - 0.45)) / 2, h * 0.3, d / 2 + 0.04, 0.12, 0.2, 0.04, { color: col(PALETTE, "steel") });
    P.box("paintedMetal", (s * (w - 0.45)) / 2, h * 0.3, d / 2 + 0.065, 0.06, 0.1, 0.02, { color: black });
  }
  if (rand() < 0.5) P.box("hazard", w / 2 - 0.3, h * 0.55, d / 2 + 0.036, 0.3, 0.14, 0.01, { texel: 2 });
}

// Power cabinet variant with the front panel swung open: dark interior, cable bundles, breaker rows.
export function openPowerCabinet(kit, PALETTE, pos, yaw, { w = 1.6, h = 2.4, d = 0.8, seed = 3 } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const dark = col(PALETTE, "impDark");
  const black = col(PALETTE, "impBlack");
  const mid = col(PALETTE, "impMid");
  const steel = col(PALETTE, "steel");
  // carcass with an open front (interior box slightly inset), top/bottom trims
  P.box("paintedMetal", 0, h / 2, -0.06, w, h, d - 0.12, { color: dark, texel: 2.5 });
  P.box("paintedMetal", 0, h / 2, d / 2 - 0.11, w - 0.12, h - 0.4, 0.02, { color: black });
  P.box("paintedMetal", 0, 0.08, 0, w + 0.06, 0.16, d + 0.06, { color: black });
  P.box("paintedMetal", 0, h - 0.1, 0, w + 0.06, 0.2, d + 0.06, { color: black });
  // interior: breaker rows, cable bundles dropping from the top, lamps
  for (let i = 0; i < 5; i++) {
    P.box("paintedMetal", -w / 4, 0.55 + i * 0.32, d / 2 - 0.08, w / 2 - 0.2, 0.18, 0.08, { color: mid });
    for (let k = 0; k < 4; k++) P.box(k % 3 === 0 ? "emitRedImp" : "emitGreen", -w / 4 - 0.2 + k * 0.13, 0.62 + i * 0.32, d / 2 - 0.035, 0.05, 0.03, 0.01);
  }
  for (let k = 0; k < 6; k++) {
    const x = w / 4 - 0.25 + k * 0.1;
    P.cyl("metal", x, h / 2 + 0.1, d / 2 - 0.16 - (k % 2) * 0.08, 0.025, h - 0.8, "y", { color: [black, dark, steel][k % 3], segments: 6 });
  }
  P.box("paintedMetal", w / 4, 0.45, d / 2 - 0.1, w / 2 - 0.2, 0.3, 0.14, { color: black });
  P.box("emitAmber", w / 4, 0.5, d / 2 - 0.025, 0.3, 0.06, 0.01);
  // door swung open ~75° on the right-hand hinge, with its panel and handle
  const hx = w / 2 - 0.02;
  const ang = -1.3;
  const dq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + ang, 0));
  const dc = [hx + (Math.cos(ang) * w) / 2, h / 2, d / 2 + 0.02 - (Math.sin(ang) * w) / 2];
  kit.add("paintedMetal", new THREE.BoxGeometry(w, h - 0.3, 0.04), { pos: P.world(dc[0], dc[1], dc[2]), quat: dq, color: dark, texel: 2.5 });
  const nrm = [Math.sin(ang), 0, Math.cos(ang)];
  kit.add("impPanel", new THREE.BoxGeometry(w - 0.16, h - 0.6, 0.02), { pos: P.world(dc[0] + nrm[0] * 0.03, dc[1] + 0.08, dc[2] + nrm[2] * 0.03), quat: dq, color: mid, uv: "keep" });
  kit.add("metal", new THREE.BoxGeometry(0.1, 0.36, 0.03), { pos: P.world(dc[0] + nrm[0] * 0.05 - Math.cos(ang) * (w / 2 - 0.2), dc[1], dc[2] + nrm[2] * 0.05 + Math.sin(ang) * (w / 2 - 0.2)), quat: dq, color: col(PALETTE, "impRed") });
  P.collider([-w / 2 - 0.03, 0, -d / 2 - 0.03], [w / 2 + 0.03 + w * 0.3, h, d / 2 + w * 0.97], "cabinet");
  void rand;
  return P;
}

// Wall junction box with a conduit stub and two indicator lamps. Faces +Z.
export function junctionBox(kit, PALETTE, pos, yaw, { w = 0.5, h = 0.6, d = 0.2, seed = 1 } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, h / 2, d / 2 + 0.02, w, h, d, { color: col(PALETTE, "impDark"), texel: 1 });
  P.box("paintedMetal", 0, h / 2, d + 0.03, w - 0.08, h - 0.08, 0.02, { color: col(PALETTE, "impMid") });
  P.box(rand() < 0.5 ? "emitAmber" : "emitBlue", -w / 4, h - 0.12, d + 0.045, 0.08, 0.04, 0.01);
  P.box(rand() < 0.7 ? "emitGreen" : "emitRedImp", w / 4, h - 0.12, d + 0.045, 0.08, 0.04, 0.01);
  P.cyl("metal", 0, h + 0.3, d / 2 + 0.02, 0.04, 0.6, "y", { color: col(PALETTE, "steel"), segments: 8 });
}

// Dark wall vent grille with horizontal slats. Faces +Z (sits 0.02 proud of the wall at pos).
export function ventGrille(kit, PALETTE, pos, yaw, { w = 1.2, h = 0.6 } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, 0.05, w, h, 0.06, { color: col(PALETTE, "impBlack") });
  const n = Math.floor(h / 0.09);
  for (let i = 0; i < n; i++) P.box("paintedMetal", 0, -h / 2 + 0.06 + i * 0.09, 0.085, w - 0.1, 0.03, 0.02, { color: col(PALETTE, "impMid") });
}
