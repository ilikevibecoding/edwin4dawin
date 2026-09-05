// Briefing-room-local props (tiered auditorium furniture, status boards, cable trays, duty desks).
// Everything is kit-bashed; colliders are world AABBs. Shared props stay untouched (see _shared/props.js).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rng } from "../../../kit.js";
import { IMP } from "../_shared/palette.js";
import { placer } from "../_shared/props.js";

const BLACK = IMP.impBlack;
const DARK = IMP.impDark;
const MID = IMP.impMid;
const STEEL = IMP.steel;
const SHELL = 0x767a83; // seat shells / desk tops: between impMid and impGrey

// Quaternion for a prop part tilted about its own X axis after the prop's yaw: q = Ry(yaw) * Rx(tilt).
const tiltQuat = (yaw, tilt) => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));

// Brightness overlay for animated emitters that live in the static kit: one multiply-blended mesh of
// quads floated 6 mm in front of screens / lit plates, each quad's vertex colour scaling what is
// behind it (0.7 = dip, 1.05 = flare). One draw call for every flickering screen and breathing board
// in the room; `set(i, f)` writes quad i's factor in place (no allocation, 4 vertices).
// quads: [{ pos, w, h, yaw } | { pos, w, h, quat }] — the quad faces local +Z like every prop.
export function screenOverlay(quads) {
  const geos = quads.map((q) => {
    const g = new THREE.PlaneGeometry(q.w, q.h);
    const quat = q.quat || new THREE.Quaternion().setFromEuler(new THREE.Euler(0, q.yaw || 0, 0));
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...q.pos), quat, new THREE.Vector3(1, 1, 1)));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(12).fill(1), 3));
    return g;
  });
  const geo = mergeGeometries(geos, false);
  const color = geo.attributes.color;
  color.setUsage(THREE.DynamicDrawUsage);
  geo.computeBoundingSphere();
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.MultiplyBlending, premultipliedAlpha: true, depthWrite: false, toneMapped: false, fog: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "overlay";
  mesh.renderOrder = -1; // before the additive holo so the product is taken on the screen, not the beam
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return {
    mesh,
    set(i, f) {
      for (let v = i * 4; v < i * 4 + 4; v++) color.setXYZ(v, f, f, f);
      color.needsUpdate = true;
    },
  };
}

// Deterministic 0..1 hash of an integer step (flicker timing that replays for the same t).
export const stepHash = (k) => {
  const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// Screen "content refresh": a short dip, a ramp back with a slight overshoot, then steady. p = phase 0..1.
export const refreshCurve = (p) => (p < 0.015 ? 0.72 : p < 0.07 ? 0.72 + ((p - 0.015) / 0.055) * 0.36 : p < 0.2 ? 1.08 - ((p - 0.07) / 0.13) * 0.08 : 1.0);
// Local point (lx, ly, lz) measured in a plane tilted by `tilt` about X through `c`, in placer coords.
const onPlane = (c, tilt, lx, ly, lz) => [c[0] + lx, c[1] + ly * Math.cos(tilt) - lz * Math.sin(tilt), c[2] + ly * Math.sin(tilt) + lz * Math.cos(tilt)];

// Fixed auditorium seat facing local -Z (toward the screen wall): steel column on a black base disc,
// painted shell with a fabric cushion, leaning backrest with its own shell, armrests with black pads.
// `yaw` swivels the seat about its column, `folded` tips the pan up against the backrest, `headrest`
// adds a wing (front row), `shell`/`cushion` recolour the seat, `arms` 0 = tubular steel, 1 = solid
// side panels, `base` "disc" | "star" (five-arm task-chair base with casters).
export function fixedSeat(kit, x, y, z, { yaw = 0, folded = false, headrest = false, shell = SHELL, cushion = DARK, arms = 0, base = "disc" } = {}) {
  const P = placer(kit, [x, y, z], yaw);
  const lean = -0.16;
  const tq = tiltQuat(yaw, lean);
  const tilted = (mat, lx, ly, lz, sx, sy, sz, opts = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: P.world(lx, ly, lz), quat: tq, ...opts });
  if (base === "star") {
    P.cyl("metal", 0, 0.06, 0, 0.075, 0.12, "y", { color: BLACK, segments: 10 });
    for (let i = 0; i < 5; i++) {
      const a = yaw + (i * 2 * Math.PI) / 5;
      const dx = Math.cos(a);
      const dz = -Math.sin(a);
      kit.add("metal", new THREE.BoxGeometry(0.3, 0.04, 0.05), { pos: [x + dx * 0.18, y + 0.045, z + dz * 0.18], rot: [0, a, 0], color: STEEL });
      const cq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-dz, 0, dx));
      kit.add("metal", new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8), { pos: [x + dx * 0.32, y + 0.03, z + dz * 0.32], quat: cq, color: BLACK });
    }
    P.cyl("metal", 0, 0.27, 0, 0.055, 0.3, "y", { color: STEEL, segments: 10 });
  } else {
    P.cyl("metal", 0, 0.02, 0, 0.23, 0.04, "y", { color: BLACK, segments: 14 });
    P.cyl("metal", 0, 0.24, 0, 0.045, 0.4, "y", { color: STEEL, segments: 10 });
  }
  P.box("paintedMetal", 0, 0.43, 0.05, 0.3, 0.04, 0.34, { color: BLACK }); // seat carrier
  // shells are clean painted panels (the worn-metal map reads as grime on a seat-sized part)
  if (folded) {
    tilted("impPanel", 0, 0.74, 0.14, 0.54, 0.5, 0.05, { color: shell, uv: "keep" });
    tilted("fabric", 0, 0.73, 0.095, 0.48, 0.44, 0.05, { color: cushion, texel: 2 });
  } else {
    P.box("impPanel", 0, 0.47, 0.02, 0.54, 0.05, 0.5, { color: shell, uv: "keep" });
    P.box("fabric", 0, 0.535, 0.0, 0.48, 0.09, 0.46, { color: cushion, texel: 2 });
  }
  tilted("impPanel", 0, 0.86, 0.3, 0.56, 0.66, 0.04, { color: shell, uv: "keep" });
  tilted("fabric", 0, 0.85, 0.252, 0.48, 0.56, 0.06, { color: cushion, texel: 2 });
  if (headrest) tilted("fabric", 0, 1.27, 0.365, 0.34, 0.16, 0.08, { color: cushion, texel: 2 });
  for (const sx of [-1, 1]) {
    if (arms === 1) {
      // solid side panel from the carrier up to the pad, lighter shell colour so the style reads
      P.box("impPanel", sx * 0.315, 0.6, 0.1, 0.035, 0.34, 0.4, { color: shell, uv: "keep" });
      P.box("paintedMetal", sx * 0.315, 0.785, 0.08, 0.075, 0.03, 0.34, { color: BLACK });
    } else {
      P.cyl("metal", sx * 0.31, 0.72, 0.08, 0.016, 0.4, "z", { color: STEEL, segments: 8 });
      P.box("paintedMetal", sx * 0.31, 0.745, 0.06, 0.07, 0.03, 0.3, { color: BLACK });
      P.cyl("metal", sx * 0.31, 0.6, 0.22, 0.014, 0.24, "y", { color: STEEL, segments: 8 });
    }
  }
  P.collider([-0.34, 0, -0.34], [0.34, 1.2, 0.34], "seat");
}

// Speaker's lectern facing local +Z (the audience): base plate, 0.35 m column with a recessed front
// panel, emblem and amber bar, a 0.5 m sloped top (high edge toward the audience) carrying a screen,
// a key row and a lip, a blue edge light along the audience edge.
export function lectern(kit, pos, yaw, { screenMat = "screenImp1", h = 1.1 } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.02, 0, 0.62, 0.04, 0.52, { color: BLACK });
  P.box("paintedMetal", 0, 0.05, 0, 0.44, 0.02, 0.36, { color: MID });
  P.box("paintedMetal", 0, 0.06 + (h - 0.1) / 2, 0, 0.35, h - 0.1, 0.28, { color: DARK, texel: 2.5 });
  P.box("paintedMetal", 0, 0.6, 0.141, 0.27, 0.78, 0.01, { color: BLACK }); // front recess
  P.box("emitBlue", 0, 0.86, 0.148, 0.13, 0.13, 0.006); // emblem: lit square with a dark core
  P.box("darkGloss", 0, 0.86, 0.153, 0.075, 0.075, 0.004);
  P.box("emitAmber", 0, 0.4, 0.148, 0.18, 0.02, 0.006);
  P.box("paintedMetal", 0, 0.55, -0.141, 0.27, 0.34, 0.01, { color: BLACK }); // rear shelf recess
  P.box("paintedMetal", 0, 0.38, -0.12, 0.25, 0.02, 0.04, { color: MID }); // shelf lip
  const tilt = -0.32;
  const tq = tiltQuat(yaw, tilt);
  const c = [0, h, 0];
  const top = (mat, lx, ly, lz, sx, sy, sz, opts = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: P.world(...onPlane(c, tilt, lx, ly, lz)), quat: tq, ...opts });
  top("impPanel", 0, 0, 0, 0.5, 0.05, 0.42, { color: SHELL, uv: "keep" });
  top("darkGloss", 0, 0.03, 0.03, 0.4, 0.012, 0.28);
  top(screenMat, 0, 0.037, 0.05, 0.34, 0.006, 0.18, { uv: "keep" });
  for (let i = 0; i < 6; i++) top(i % 3 === 1 ? "emitAmber" : "emitBlue", -0.15 + i * 0.06, 0.036, -0.1, 0.035, 0.006, 0.03);
  top("paintedMetal", 0, 0.035, -0.2, 0.5, 0.03, 0.03, { color: MID }); // lip at the speaker's edge
  top("emitBlue", 0, 0.024, 0.205, 0.4, 0.008, 0.012); // audience edge light
  P.collider([-0.31, 0, -0.26], [0.31, h + 0.1, 0.26], "lectern");
}

// Audience-facing display on the sloped top of a shared `console` (mirrors the console's bank
// geometry: deskH 0.9, tilt -0.42, bank 0.42 deep at local z = -d/2 + 0.28): dark inset, screen and a
// row of indicator lights along the audience edge, so the console's top is lit from the seats.
export function podiumTop(kit, pos, yaw, w, { h = 1.2, d = 0.8, screenMat = "screenImp0" } = {}) {
  const P = placer(kit, pos, yaw);
  const tilt = -0.42;
  const slopeH = h - 0.9;
  const c = [0, 0.9 + slopeH / 2 - 0.03, -d / 2 + 0.28];
  const tq = tiltQuat(yaw, tilt);
  const on = (mat, lx, ly, lz, sx, sy, sz, opts = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: P.world(...onPlane(c, tilt, lx, ly, lz)), quat: tq, ...opts });
  const t = slopeH / 2;
  on("darkGloss", 0, t + 0.008, 0.02, w - 0.3, 0.012, 0.3);
  on(screenMat, 0, t + 0.016, 0.03, w - 0.4, 0.006, 0.2, { uv: "keep" });
  for (let i = 0; i < 8; i++) on(i % 4 === 3 ? "emitAmber" : i % 4 === 1 ? "emitRedImp" : "emitBlue", -w / 2 + 0.25 + i * ((w - 0.5) / 7), t + 0.014, -0.17, 0.05, 0.006, 0.03);
}

// Wall vent grille facing local +Z: dark frame, black recess, mid-grey horizontal slats.
export function ventGrille(kit, pos, yaw, w = 0.9, h = 0.45) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, 0.03, w, h, 0.06, { color: DARK, texel: 2.5 });
  P.box("paintedMetal", 0, 0, 0.061, w - 0.1, h - 0.1, 0.004, { color: BLACK });
  const n = Math.max(3, Math.round((h - 0.1) / 0.06));
  for (let i = 0; i < n; i++) P.box("paintedMetal", 0, -h / 2 + 0.05 + (i + 0.5) * ((h - 0.1) / n), 0.066, w - 0.14, 0.018, 0.006, { color: MID });
  for (const sx of [-1, 1]) P.box("metal", (sx * (w - 0.06)) / 2, 0, 0.062, 0.025, 0.025, 0.008, { color: STEEL });
}

// Rectangular duct run between axis-aligned points a and b (same y): matte dark body proud of the wall,
// mid-grey flange bands every `flange` metres, black bracket straps at the flanges.
export function duct(kit, a, b, { w = 0.42, h = 0.3, flange = 2.0 } = {}) {
  const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[2] - a[2]);
  const len = alongX ? Math.abs(b[0] - a[0]) : Math.abs(b[2] - a[2]);
  const cx = (a[0] + b[0]) / 2;
  const cz = (a[2] + b[2]) / 2;
  const y = a[1];
  const sz = (l, t, hh) => (alongX ? [l, hh, t] : [t, hh, l]);
  kit.box("paintedMetal", cx, y, cz, ...sz(len, w, h), { color: DARK, texel: 2.5 });
  const n = Math.max(1, Math.floor(len / flange));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const px = a[0] + (b[0] - a[0]) * t;
    const pz = a[2] + (b[2] - a[2]) * t;
    const fx = alongX ? px : cx;
    const fz = alongX ? cz : pz;
    kit.box("paintedMetal", fx, y, fz, ...sz(0.08, w + 0.04, h + 0.04), { color: MID });
    kit.box("paintedMetal", fx, y - h / 2 - 0.015, fz, ...sz(0.06, w + 0.08, 0.03), { color: BLACK });
  }
}

// Datapad lying on a desk: dark slab with a lit face and a side key.
export function datapad(kit, x, y, z, yaw, mat = "screenImp2") {
  const P = placer(kit, [x, y, z], yaw);
  P.box("darkGloss", 0, 0.008, 0, 0.24, 0.016, 0.17);
  P.box(mat, 0, 0.0175, 0, 0.2, 0.004, 0.13, { uv: "keep" });
  P.box("emitBlue", 0.1, 0.0175, 0, 0.012, 0.004, 0.05);
}

// Continuous desk edge for one seating row: modesty panel, top, a lit key strip lying flat, an edge
// glow toward the seated officers, and a data slot per seat. Spans x0..x1 at the tier front z0.
// `seed` also picks which positions carry a datapad or a stack of data cards.
export function deskRow(kit, x0, x1, y, z0, seats, seed) {
  const rand = rng(seed);
  const len = x1 - x0;
  const cx = (x0 + x1) / 2;
  const zf = z0 + 0.32; // modesty panel front
  kit.box("paintedMetal", cx, y + 0.36, zf + 0.03, len, 0.72, 0.06, { color: BLACK, texel: 2.5 }); // modesty panel
  kit.box("paintedMetal", cx, y + 0.2, zf + 0.035, len - 0.2, 0.3, 0.005, { color: DARK, texel: 2.5 }); // recessed band
  kit.box("paintedMetal", cx, y + 0.745, zf + 0.26, len, 0.05, 0.52, { color: BLACK, texel: 2.5 }); // top
  kit.box("paintedMetal", cx, y + 0.72, zf + 0.5, len - 0.1, 0.03, 0.04, { color: DARK }); // lip
  kit.box("emitBlue", cx, y + 0.7, zf + 0.53, len - 0.3, 0.012, 0.01); // edge glow toward the seats
  // per-seat inset panel: darkGloss plate + a row of flat keys + a small readout (three layouts: the
  // briefing room keeps screenImp3 out of its kit to stay at 16 draw calls)
  const screenMats = ["screenImp0", "screenImp1", "screenImp2"];
  for (const sx of seats) {
    kit.box("darkGloss", sx, y + 0.772, zf + 0.22, 0.7, 0.008, 0.28);
    for (let i = 0; i < 9; i++) {
      if (rand() < 0.3) continue;
      const r = rand();
      const m = r < 0.5 ? "emitBlue" : r < 0.8 ? "emitAmber" : "emitRedImp";
      kit.box(m, sx - 0.24 + i * 0.06, y + 0.78, zf + 0.32, 0.035, 0.006, 0.03);
    }
    kit.box(screenMats[Math.floor(rand() * 3)], sx, y + 0.78, zf + 0.15, 0.46, 0.006, 0.12, { uv: "keep" });
    const v = rand();
    if (v < 0.3) datapad(kit, sx + 0.42, y + 0.77, zf + 0.36, (rand() - 0.5) * 0.9, screenMats[Math.floor(rand() * 3)]);
    else if (v < 0.42) {
      for (let k = 0; k < 3; k++) kit.box("paintedMetal", sx - 0.45 + k * 0.012, y + 0.78 + k * 0.008, zf + 0.4, 0.08, 0.008, 0.12, { color: k % 2 ? DARK : MID });
    }
  }
}

// Wall status board: black plate with a lighter frame, a header bar and rows of amber/blue bars of
// varied length (a duty roster / system status readout). `yaw` gives the facing direction like props.
export function statusBoard(kit, pos, yaw, w, h, seed, { accent = "emitAmber", secondary = "emitBlue", rows = 5 } = {}) {
  const P = placer(kit, pos, yaw);
  const box = P.box;
  const rand = rng(seed);
  box("paintedMetal", 0, 0, 0.03, w + 0.16, h + 0.16, 0.06, { color: DARK, texel: 2.5 });
  box("paintedMetal", 0, 0, 0.065, w, h, 0.01, { color: BLACK });
  box("darkGloss", 0, 0, 0.072, w - 0.06, h - 0.06, 0.004);
  // header
  box(accent, 0, h / 2 - 0.09, 0.078, w - 0.16, 0.025, 0.004);
  box(accent, -w / 2 + 0.32, h / 2 - 0.16, 0.078, 0.48, 0.05, 0.004);
  for (let k = 0; k < 3; k++) box(secondary, w / 2 - 0.2 - k * 0.2, h / 2 - 0.16, 0.078, 0.12, 0.05, 0.004);
  // rows of bars
  const top = h / 2 - 0.3;
  const bottom = -h / 2 + 0.12;
  const pitch = (top - bottom) / rows;
  for (let i = 0; i < rows; i++) {
    const y = top - (i + 0.5) * pitch;
    const label = 0.35 + rand() * 0.25;
    box(rand() < 0.75 ? secondary : accent, -w / 2 + 0.12 + label / 2, y, 0.078, label, 0.03, 0.004);
    const nb = 2 + Math.floor(rand() * 4);
    let x = -w / 2 + 0.2 + label;
    for (let j = 0; j < nb && x < w / 2 - 0.3; j++) {
      const bw = 0.15 + rand() * 0.45;
      if (x + bw > w / 2 - 0.15) break;
      const r = rand();
      const m = r < 0.55 ? secondary : r < 0.9 ? accent : "emitRedImp";
      box(m, x + bw / 2, y, 0.078, bw, pitch * 0.42, 0.004);
      x += bw + 0.08;
    }
  }
  // corner bolts
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box("metal", (sx * (w + 0.1)) / 2, (sy * (h + 0.1)) / 2, 0.062, 0.03, 0.03, 0.01, { color: STEEL });
  // overlay quad spec (screenOverlay) covering the lit plate, 6 mm in front of the bars
  return { pos: P.world(0, 0, 0.086), yaw, w: w - 0.08, h: h - 0.08 };
}

// Amber status strip in a black housing, wall mounted, running along local X.
export function statusStrip(kit, pos, yaw, len, mat = "emitAmber") {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, 0.03, len + 0.2, 0.18, 0.06, { color: BLACK, texel: 2.5 });
  P.box(mat, 0, 0, 0.066, len, 0.05, 0.012);
  for (const lx of [-len / 2 - 0.05, len / 2 + 0.05]) P.box("paintedMetal", lx, 0, 0.045, 0.06, 0.24, 0.09, { color: DARK });
}

// High-level cable tray along an axis-aligned line between a and b (same y): U-channel, three cables,
// wall brackets every `bracket` metres toward `wallDir` (unit vector pointing at the wall).
export function cableTray(kit, a, b, { w = 0.4, bracket = 3.0, wallDir = null, gap = 0.1 } = {}) {
  const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[2] - a[2]);
  const len = alongX ? Math.abs(b[0] - a[0]) : Math.abs(b[2] - a[2]);
  const cx = (a[0] + b[0]) / 2;
  const cz = (a[2] + b[2]) / 2;
  const y = a[1];
  const sz = (l, t) => (alongX ? [l, 0.03, t] : [t, 0.03, l]);
  const off = (d) => (alongX ? [cx, y, cz + d] : [cx + d, y, cz]);
  const B = (mat, p, s, opts) => kit.box(mat, p[0], p[1], p[2], s[0], s[1], s[2], opts);
  B("paintedMetal", [cx, y, cz], sz(len, w), { color: DARK, texel: 2.5 });
  for (const d of [-w / 2 + 0.015, w / 2 - 0.015]) {
    const p = off(d);
    B("paintedMetal", [p[0], y + 0.05, p[2]], alongX ? [len, 0.1, 0.03] : [0.03, 0.1, len], { color: DARK, texel: 2.5 });
  }
  const cableColors = [BLACK, DARK, 0x3a3f5a];
  for (let i = 0; i < 3; i++) {
    const p = off(-w / 2 + 0.08 + i * 0.12);
    kit.cyl("paintedMetal", p[0], y + 0.045, p[2], 0.028, len - 0.05, alongX ? "x" : "z", { color: cableColors[i], segments: 8, texel: 2.5 });
  }
  const n = Math.max(2, Math.floor(len / bracket));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const px = a[0] + (b[0] - a[0]) * t;
    const pz = a[2] + (b[2] - a[2]) * t;
    B("paintedMetal", [px, y - 0.03, pz], alongX ? [0.06, 0.04, w + 0.08] : [w + 0.08, 0.04, 0.06], { color: BLACK });
    if (wallDir) {
      // arm from the tray edge to the wall
      const armLen = gap + w / 2;
      B("paintedMetal", [px + (wallDir[0] * (w / 2 + gap)) / 2, y - 0.03, pz + (wallDir[2] * (w / 2 + gap)) / 2], alongX ? [0.06, 0.04, armLen] : [armLen, 0.04, 0.06], { color: BLACK });
      B("paintedMetal", [px + wallDir[0] * (w / 2 + gap - 0.01), y + 0.02, pz + wallDir[2] * (w / 2 + gap - 0.01)], alongX ? [0.12, 0.2, 0.02] : [0.02, 0.2, 0.12], { color: BLACK });
    }
  }
}

// Ceiling light channel (surface-mounted trough) running along X between x0..x1 at z, hung from
// ceilY: black housing, mid-grey lips, segmented emitter strip.
export function lightChannel(kit, x0, x1, z, ceilY, { w = 0.5, mat = "emitWhite", segment = 2.0, drop = 0.14 } = {}) {
  const len = x1 - x0;
  kit.boxMM("paintedMetal", [x0, ceilY - drop, z - w / 2], [x1, ceilY - 0.02, z + w / 2], { color: BLACK, texel: 2.5 });
  kit.boxMM("paintedMetal", [x0, ceilY - drop - 0.02, z - w / 2 - 0.05], [x1, ceilY - 0.02, z - w / 2], { color: MID, texel: 2.5 });
  kit.boxMM("paintedMetal", [x0, ceilY - drop - 0.02, z + w / 2], [x1, ceilY - 0.02, z + w / 2 + 0.05], { color: MID, texel: 2.5 });
  const nSeg = Math.max(1, Math.round(len / segment));
  for (let i = 0; i < nSeg; i++) {
    const s0 = x0 + (len * i) / nSeg + 0.12;
    const s1 = x0 + (len * (i + 1)) / nSeg - 0.12;
    kit.boxMM(mat, [s0, ceilY - drop - 0.015, z - 0.07], [s1, ceilY - drop + 0.005, z + 0.07]);
  }
}

// Small wall junction box with a conduit rising from its top (to a tray or the service band).
export function junctionBox(kit, pos, yaw, { w = 0.3, h = 0.4, conduitUp = 0 } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, 0.07, w, h, 0.14, { color: MID, texel: 2.5 });
  P.box("paintedMetal", 0, 0, 0.145, w - 0.06, h - 0.06, 0.01, { color: DARK });
  P.box("emitAmber", w / 2 - 0.08, h / 2 - 0.08, 0.152, 0.05, 0.02, 0.008);
  // matte conduit: a polished `metal` tube throws a bare white highlight from every fill
  if (conduitUp > 0) P.cyl("paintedMetal", 0, h / 2 + conduitUp / 2, 0.06, 0.03, conduitUp, "y", { color: DARK, segments: 8, texel: 2.5 });
}

// Duty desk: pedestal desk with a monitor on a post at the back edge (screen facing the operator at
// local +Z), keyboard, indicator strip, datapad and cup on the top, a fixed seat behind it.
export function dutyDesk(kit, pos, yaw, { w = 1.8, d = 0.8, screenMat = "screenImp2", seed = 1, headrest = true } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const H = 0.74;
  P.box("impPanel", 0, H - 0.025, 0, w, 0.05, d, { color: SHELL, uv: "keep" });
  P.box("paintedMetal", 0, H - 0.07, 0, w - 0.1, 0.04, d - 0.1, { color: BLACK });
  // mid-grey pedestals with black drawer seams: black pedestals vanished into the dark floor at range
  for (const sx of [-1, 1]) {
    P.box("paintedMetal", sx * (w / 2 - 0.25), (H - 0.1) / 2, 0.02, 0.5, H - 0.1, d - 0.16, { color: MID, texel: 2.5 });
    P.box("paintedMetal", sx * (w / 2 - 0.25), 0.03, 0.02, 0.5, 0.06, d - 0.14, { color: BLACK });
    for (let i = 0; i < 3; i++) {
      P.box("paintedMetal", sx * (w / 2 - 0.25), 0.14 + i * 0.2, d / 2 - 0.055, 0.44, 0.02, 0.01, { color: BLACK });
      P.box("metal", sx * (w / 2 - 0.25), 0.22 + i * 0.2, d / 2 - 0.05, 0.12, 0.016, 0.02, { color: STEEL });
    }
  }
  P.box("paintedMetal", 0, (H - 0.1) / 2 + 0.05, -d / 2 + 0.05, w - 1.0, H - 0.2, 0.04, { color: DARK, texel: 2.5 }); // modesty panel
  // monitor
  const tilt = -0.14;
  const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
  P.cyl("metal", 0, H + 0.13, -d / 2 + 0.16, 0.03, 0.26, "y", { color: STEEL, segments: 10 });
  P.box("paintedMetal", 0, H + 0.01, -d / 2 + 0.16, 0.3, 0.02, 0.2, { color: BLACK });
  const my = H + 0.26 + 0.27;
  const mz = -d / 2 + 0.14;
  const ny = -Math.sin(tilt);
  const nz = Math.cos(tilt);
  kit.add("paintedMetal", new THREE.BoxGeometry(0.98, 0.58, 0.05), { pos: P.world(0, my, mz), quat: tq, color: BLACK, texel: 2.5 });
  kit.add("darkGloss", new THREE.BoxGeometry(0.94, 0.54, 0.01), { pos: P.world(0, my + ny * 0.03, mz + nz * 0.03), quat: tq });
  kit.add(screenMat, new THREE.BoxGeometry(0.88, 0.48, 0.01), { pos: P.world(0, my + ny * 0.04, mz + nz * 0.04), quat: tq, uv: "keep" });
  kit.add("emitBlue", new THREE.BoxGeometry(0.5, 0.012, 0.01), { pos: P.world(0, my - 0.31 + ny * 0.03, mz + nz * 0.03), quat: tq });
  // desk top: keyboard with keys, indicator strip, datapad, cup
  P.box("darkGloss", -0.1, H + 0.006, 0.1, 0.62, 0.012, 0.2);
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 2; j++) {
      if (rand() < 0.2) continue;
      P.box(rand() < 0.75 ? "emitBlue" : "emitAmber", -0.1 - 0.27 + i * 0.06, H + 0.014, 0.05 + j * 0.07, 0.04, 0.006, 0.04);
    }
  }
  P.box("darkGloss", 0.45, H + 0.005, -0.12, 0.5, 0.01, 0.1);
  for (let i = 0; i < 6; i++) P.box(i % 3 === 0 ? "emitAmber" : "emitBlue", 0.25 + i * 0.08, H + 0.012, -0.12, 0.05, 0.006, 0.03);
  datapad(kit, ...P.world(0.55, H, 0.16), yaw + 0.35, rand() < 0.5 ? "screenImp0" : "screenImp2");
  P.cyl("metal", -0.7, H + 0.045, 0.2, 0.04, 0.09, "y", { color: STEEL, segments: 10 });
  P.cyl("metal", -0.7, H + 0.085, 0.2, 0.034, 0.01, "y", { color: BLACK, segments: 10 });
  P.collider([-w / 2, 0, -d / 2], [w / 2, H + 0.85, d / 2], "desk");
  // task chair: five-arm base, panel arms and a headrest so it reads as a chair from behind
  const seat = P.world(0, 0, d / 2 + 0.6);
  fixedSeat(kit, seat[0], seat[1], seat[2], { yaw: yaw + (rand() - 0.5) * 0.4, headrest, cushion: 0x2a2e3a, arms: 1, base: "star" });
  // overlay quad spec for the monitor (screenOverlay): 6 mm in front of the screen face, same tilt
  return { screen: { pos: P.world(0, my + ny * 0.051, mz + nz * 0.051), quat: tq, w: 0.86, h: 0.46 } };
}

// Audience-facing dressing for the back of a podium console: framed text screen, key row, blue edge.
export function podiumBack(kit, pos, yaw, w, { screenMat = "screenImp2" } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.52, 0.02, w - 0.2, 0.62, 0.04, { color: DARK, texel: 2.5 });
  P.box("darkGloss", 0, 0.6, 0.045, w - 0.36, 0.4, 0.01);
  P.box(screenMat, 0, 0.6, 0.052, w - 0.42, 0.34, 0.006, { uv: "keep" });
  P.box("emitBlue", 0, 0.82, 0.045, w - 0.36, 0.014, 0.01);
  for (let i = 0; i < 7; i++) P.box(i % 2 ? "emitAmber" : "emitBlue", -w / 2 + 0.35 + i * ((w - 0.7) / 6), 0.31, 0.05, 0.06, 0.03, 0.01);
  P.box("emitRedImp", w / 2 - 0.2, 0.31, 0.05, 0.05, 0.03, 0.01);
}
