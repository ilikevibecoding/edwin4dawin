// Shared prop vocabulary for the Deck B command rooms (observation gallery, officers' quarters,
// briefing room, lounge, evacuation bay): seating, tables, framed viewscreens, lockers, cable runs,
// ceiling light boxes, floor decals and hologram helpers. Everything is room-local and merged through
// the Kit; animated pieces are returned as plain THREE objects for kit.attach.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { Frame, UP } from "./imperial_kit.js";
import { rng, worldUVs, setVertexColor } from "../kit.js";
import { impDecalRect } from "../textures_imperial.js";

/** Local frame for a free-standing prop: U = local x, V = up, N = local +z; props face -N. */
export function propFrame(kit, x, y, z, yaw = 0) {
  return new Frame(kit, new THREE.Vector3(x, y, z), new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), UP);
}

/** Cylinder between two room-local points. */
export function rod(kit, mat, a, b, r, opts = {}) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
  const g = new THREE.CylinderGeometry(r, r, len, opts.segments || 8);
  return kit.add(mat, g, { pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], color: opts.color || 0xffffff });
}

/** Decal lying on the floor. yaw 0 = arrow points +x, PI/2 = points -z (north), PI = -x, -PI/2 = +z. */
export function floorDecal(kit, index, x, z, size, yaw = 0, y = 0.004) {
  const g = new THREE.PlaneGeometry(size, size);
  g.rotateX(-Math.PI / 2);
  g.rotateY(yaw);
  return kit.add("decalImp", g, { pos: [x, y, z], uv: "keep", uvRect: impDecalRect(index) });
}

/** Thin emissive strip on the floor (2 mm proud so it never fights the deck). */
export function floorStrip(kit, key, x0, z0, x1, z1) {
  kit.boxMM(key, [Math.min(x0, x1), 0.002, Math.min(z0, z1)], [Math.max(x0, x1), 0.012, Math.max(z0, z1)]);
}

// ---------------------------------------------------------------------------
// Seating and tables
// ---------------------------------------------------------------------------
/** Padded Imperial bench (black frame, charcoal box, dark pad), facing -z locally; backrest on +z. */
export function bench(kit, x, z, len, yaw = 0, opts = {}) {
  const { back = true, pad = "rubber", padColor = PALETTE.impGreyDark, accentKey = null, tag = "bench", y = 0 } = opts;
  const f = propFrame(kit, x, y, z, yaw);
  const d = 0.62;
  f.box("impTrim", 0, 0.08, 0, len - 0.24, 0.16, d - 0.14, { color: PALETTE.impBlack, texel: 1 });
  f.box("impMetal", 0, 0.3, 0, len, 0.28, d, { color: PALETTE.impCharcoal, texel: 1 });
  f.box("impTrim", 0, 0.435, 0, len + 0.02, 0.03, d + 0.02, { color: PALETTE.impBlack });
  f.box(pad, 0, 0.5, 0.02, len - 0.06, 0.1, d - 0.08, { color: padColor, texel: 2 });
  if (back) {
    f.box("impTrim", 0, 0.78, d / 2 - 0.04, len, 0.66, 0.1, { color: PALETTE.impBlack, texel: 1 });
    f.box(pad, 0, 0.82, d / 2 - 0.115, len - 0.12, 0.44, 0.05, { color: padColor, texel: 2 });
  }
  if (accentKey) f.box(accentKey, 0, 0.2, -d / 2 - 0.006, len - 0.3, 0.02, 0.012);
  f.collider(-len / 2, len / 2, 0, back ? 1.1 : 0.56, -d / 2 - 0.02, d / 2 + 0.02, tag);
}

/** Pedestal table (black frame, glossy inlay); w along local x, d along local z. */
export function table(kit, x, z, w, d, yaw = 0, opts = {}) {
  const { h = 0.5, top = "impGloss", accentKey = null, tag = "table", y = 0 } = opts;
  const f = propFrame(kit, x, y, z, yaw);
  f.box("impTrim", 0, 0.03, 0, w * 0.6, 0.06, d * 0.6, { color: PALETTE.impBlack, texel: 1 });
  f.box("impMetal", 0, h / 2, 0, Math.min(0.5, w * 0.3), h, Math.min(0.5, d * 0.3), { color: PALETTE.impCharcoal, texel: 1 });
  f.box("impTrim", 0, h - 0.035, 0, w, 0.07, d, { color: PALETTE.impBlack, texel: 1 });
  f.box(top, 0, h + 0.006, 0, w - 0.1, 0.012, d - 0.1);
  if (accentKey) {
    f.box(accentKey, 0, h - 0.035, d / 2 + 0.006, w - 0.3, 0.014, 0.012);
    f.box(accentKey, 0, h - 0.035, -d / 2 - 0.006, w - 0.3, 0.014, 0.012);
  }
  f.collider(-w / 2, w / 2, 0, h + 0.02, -d / 2, d / 2, tag);
}

/** Round pedestal table. */
export function roundTable(kit, x, z, r, opts = {}) {
  const { h = 0.75, top = "impGloss", accentKey = null, tag = "table", y = 0 } = opts;
  kit.cyl("impTrim", x, y + 0.03, z, r * 0.7, 0.06, "y", { color: PALETTE.impBlack, segments: 20 });
  kit.cyl("impMetal", x, y + h / 2, z, 0.16, h, "y", { color: PALETTE.impCharcoal, segments: 14 });
  kit.cyl("impTrim", x, y + h - 0.035, z, r, 0.07, "y", { color: PALETTE.impBlack, segments: 28 });
  kit.cyl(top, x, y + h + 0.006, z, r - 0.06, 0.012, "y", { segments: 28 });
  if (accentKey) kit.cyl(accentKey, x, y + h - 0.035, z, r + 0.004, 0.014, "y", { segments: 28 });
  kit.collider([x - r, y, z - r], [x + r, y + h + 0.02, z + r], tag);
}

/**
 * Low circular seating ring: `segments` padded bench sections around (x, z), radius r to the outer
 * edge, `gap` sections left out around the bearing `gapYaw` (0 = +z, PI = -z / toward the windows).
 */
export function seatRing(kit, x, z, r, opts = {}) {
  const { segments = 8, gap = 2, gapYaw = Math.PI, pad = "fabric", padColor = PALETTE.impGreyDark, accentKey = null, seatW = 0.62, y = 0, tag = "seatring" } = opts;
  const rm = r - seatW / 2;
  const segAng = (2 * Math.PI) / segments;
  const segLen = 2 * rm * Math.sin(segAng / 2) - 0.08;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  for (let i = 0; i < segments; i++) {
    const a = segAng * (i + 0.5);
    if (Math.abs(wrap(a - gapYaw)) < (gap * segAng) / 2 - 1e-3) continue;
    const cx = x + Math.sin(a) * rm;
    const cz = z + Math.cos(a) * rm;
    const q = new THREE.Quaternion().setFromAxisAngle(UP, a);
    const add = (mat, ly, sx, sy, sz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [cx, y + ly, cz], quat: q, ...extra });
    add("impTrim", 0.07, segLen - 0.2, 0.14, seatW - 0.16, { color: PALETTE.impBlack, texel: 1 });
    add("impMetal", 0.27, segLen, 0.26, seatW, { color: PALETTE.impCharcoal, texel: 1 });
    add("impTrim", 0.415, segLen + 0.02, 0.03, seatW + 0.02, { color: PALETTE.impBlack });
    add(pad, 0.475, segLen - 0.06, 0.09, seatW - 0.08, { color: padColor, texel: 2 });
    if (accentKey) add(accentKey, 0.2, segLen - 0.3, 0.02, 0.012, { pos: [cx + Math.sin(a) * (seatW / 2 + 0.006), y + 0.2, cz + Math.cos(a) * (seatW / 2 + 0.006)] });
    // collider from the rotated footprint's corners
    const cs = [[-segLen / 2, -seatW / 2], [segLen / 2, -seatW / 2], [-segLen / 2, seatW / 2], [segLen / 2, seatW / 2]].map(([lx, lz]) => new THREE.Vector3(lx, 0, lz).applyQuaternion(q));
    const mn = [Infinity, Infinity];
    const mx = [-Infinity, -Infinity];
    for (const c of cs) {
      mn[0] = Math.min(mn[0], cx + c.x);
      mn[1] = Math.min(mn[1], cz + c.z);
      mx[0] = Math.max(mx[0], cx + c.x);
      mx[1] = Math.max(mx[1], cz + c.z);
    }
    kit.collider([mn[0], y, mn[1]], [mx[0], y + 0.56, mx[1]], tag);
  }
}

/** Simple stool. */
export function stool(kit, x, z, opts = {}) {
  const { h = 0.48, pad = "rubber", padColor = PALETTE.impGreyDark, y = 0 } = opts;
  kit.cyl("impTrim", x, y + 0.02, z, 0.22, 0.04, "y", { color: PALETTE.impBlack, segments: 14 });
  kit.cyl("impMetal", x, y + h / 2, z, 0.05, h, "y", { color: PALETTE.impCharcoal, segments: 10 });
  kit.cyl("impTrim", x, y + h - 0.02, z, 0.2, 0.04, "y", { color: PALETTE.impBlack, segments: 16 });
  kit.cyl(pad, x, y + h + 0.03, z, 0.19, 0.06, "y", { color: padColor, segments: 16 });
  kit.collider([x - 0.22, y, z - 0.22], [x + 0.22, y + h + 0.06, z + 0.22], "stool");
}

// ---------------------------------------------------------------------------
// Wall fittings (on a wall Frame: u along the wall, v up, n into the room)
// ---------------------------------------------------------------------------
/** Framed viewscreen: black bezel, gloss inset, screen plane, status LEDs, underline accent. */
export function wallScreen(frame, u, v, w, h, matKey, opts = {}) {
  const { accentKey = "emitBlue", bezel = 0.14, leds = 3 } = opts;
  frame.box("impTrim", u, v, 0.06, w + bezel * 2, h + bezel * 2, 0.12, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impGloss", u, v, 0.125, w + 0.05, h + 0.05, 0.012);
  frame.screen(matKey, u, v, 0.135, w, h);
  frame.box(accentKey, u, v - h / 2 - bezel * 0.6, 0.125, w * 0.7, 0.02, 0.012);
  for (let i = 0; i < leds; i++) frame.box(i === 1 ? "emitRedImp" : i === 2 ? "emitWhite" : accentKey, u + w / 2 - 0.1 - i * 0.12, v - h / 2 - bezel * 0.6, 0.125, 0.05, 0.03, 0.012);
  frame.collider(u - w / 2 - bezel, u + w / 2 + bezel, v - h / 2 - bezel, v + h / 2 + bezel, 0, 0.14, "screen");
}

/** Storage locker proud of the wall: enamel body, black base/cap, door seams, handles, status lights. */
export function locker(frame, u, w, h, opts = {}) {
  const { doors = 1, accentKey = "emitBlue", color = PALETTE.impGrey, decal = null, depth = 0.5, vents = true } = opts;
  frame.box("impPanel1", u, h / 2, depth / 2, w, h, depth, { color, uv: "world", texel: 1 });
  frame.box("impTrim", u, 0.07, depth / 2 + 0.01, w + 0.03, 0.14, depth + 0.02, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impTrim", u, h - 0.05, depth / 2 + 0.01, w + 0.03, 0.1, depth + 0.02, { color: PALETTE.impBlack, texel: 1 });
  const dw = w / doors;
  for (let i = 0; i <= doors; i++) frame.box("impTrim", u - w / 2 + dw * i, h / 2, depth + 0.006, 0.025, h - 0.3, 0.012, { color: PALETTE.impBlack });
  for (let i = 0; i < doors; i++) {
    const du = u - w / 2 + dw * (i + 0.5);
    frame.box("impTrim", du + dw / 2 - 0.12, h * 0.55, depth + 0.02, 0.05, 0.22, 0.04, { color: PALETTE.impBlack });
    frame.box("impMetal", du + dw / 2 - 0.12, h * 0.55, depth + 0.045, 0.03, 0.18, 0.02, { color: PALETTE.impGrey });
    frame.box(accentKey, du - dw / 2 + 0.12, h - 0.32, depth + 0.007, 0.05, 0.05, 0.012);
    if (vents) for (let s = 0; s < 4; s++) frame.box("impTrim", du, 0.32 + s * 0.07, depth + 0.007, dw - 0.24, 0.025, 0.012, { color: PALETTE.impBlack });
    if (decal !== null) frame.decal(decal, du, h * 0.72, depth + 0.008, Math.min(0.42, dw * 0.55));
  }
  frame.collider(u - w / 2 - 0.02, u + w / 2 + 0.02, 0, h, 0, depth + 0.06, "locker");
}

/** Cable / pipe run along a wall at height v with black clamps. */
export function cableRun(frame, u0, u1, v, opts = {}) {
  const { n = 3, seed = 1, r = 0.03, clampStep = 1.6 } = opts;
  const rand = rng(seed);
  const len = u1 - u0;
  const cu = (u0 + u1) / 2;
  const colors = [PALETTE.impGreyDark, PALETTE.impCharcoal, PALETTE.impGrey];
  for (let i = 0; i < n; i++) {
    const rr = r * (0.7 + rand() * 0.6);
    frame.cylU("impMetal", cu, v + i * r * 2.6, 0.07 + rr, rr, len, { color: colors[i % 3], segments: 8 });
  }
  const clamps = Math.max(2, Math.round(len / clampStep));
  for (let k = 0; k < clamps; k++) {
    const ku = u0 + 0.2 + ((len - 0.4) * k) / (clamps - 1);
    frame.box("impTrim", ku, v + (n - 1) * r * 1.3, 0.05, 0.1, n * r * 2.6 + 0.1, 0.1 + r * 2.4, { color: PALETTE.impBlack });
  }
}

/** Fake door: framed recess with a header light, a status lamp and a keypad (no passage). */
export function fakeDoor(frame, u, w, h, opts = {}) {
  const { accentKey = "emitBlue", statusKey = "emitGreen", label = null } = opts;
  const t = 0.22;
  frame.box("impTrim", u, h / 2, 0.02, w + t * 2, h + t, 0.24, { color: PALETTE.impBlack, texel: 1 });
  // leaves, slightly recessed in the frame
  for (const s of [-1, 1]) frame.box("impPanel2", u + (s * w) / 4, h / 2, 0.1, w / 2 - 0.02, h - 0.04, 0.05, { color: PALETTE.impGrey, uv: "world", texel: 1 });
  frame.box("impTrim", u, h / 2, 0.13, 0.04, h - 0.04, 0.012, { color: PALETTE.impBlack });
  for (const vv of [h * 0.3, h * 0.7]) frame.box("impTrim", u, vv, 0.13, w - 0.04, 0.03, 0.012, { color: PALETTE.impBlack });
  frame.box("impMetal", u, h + t * 0.5, 0.15, w - 0.3, 0.1, 0.02, { color: PALETTE.impCharcoal });
  frame.box("emitWhiteSoft", u, h + t * 0.5, 0.165, w - 0.5, 0.04, 0.012, { uv: "keep" });
  frame.box("impTrim", u + w / 2 + t + 0.2, 1.3, 0.05, 0.22, 0.34, 0.1, { color: PALETTE.impBlack });
  frame.box(statusKey, u + w / 2 + t + 0.2, 1.4, 0.105, 0.1, 0.06, 0.012);
  frame.box(accentKey, u + w / 2 + t + 0.2, 1.22, 0.105, 0.14, 0.03, 0.012);
  if (label !== null) frame.decal(label, u, h * 0.82, 0.14, 0.34);
  frame.collider(u - w / 2 - t, u + w / 2 + t, 0, h + t, 0, 0.26, "fakedoor");
  return frame.pos(u + w / 2 + t + 0.2, 1.4, 0.11);
}

// ---------------------------------------------------------------------------
// Ceiling fittings
// ---------------------------------------------------------------------------
/** Slatted light box hanging from the ceiling at y (ceiling height). */
export function lightBox(kit, x, z, y, w, d, key = "emitWhiteSoft", opts = {}) {
  const { slats = 5, axis = "x", accentKey = null } = opts;
  kit.box("impTrim", x, y - 0.08, z, w, 0.16, d, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impMetal", x, y - 0.165, z, w - 0.1, 0.02, d - 0.1, { color: PALETTE.impCharcoal });
  kit.box(key, x, y - 0.18, z, w - 0.18, 0.012, d - 0.18, { uv: "keep" });
  for (let i = 0; i < slats; i++) {
    const t = (i + 0.5) / slats;
    if (axis === "x") kit.box("impTrim", x - w / 2 + 0.09 + t * (w - 0.18), y - 0.2, z, 0.035, 0.035, d - 0.16, { color: PALETTE.impBlack });
    else kit.box("impTrim", x, y - 0.2, z - d / 2 + 0.09 + t * (d - 0.18), w - 0.16, 0.035, 0.035, { color: PALETTE.impBlack });
  }
  if (accentKey) {
    kit.box(accentKey, x, y - 0.12, z + d / 2 + 0.006, w - 0.3, 0.02, 0.012);
    kit.box(accentKey, x, y - 0.12, z - d / 2 - 0.006, w - 0.3, 0.02, 0.012);
  }
}

/** Ceiling-mounted projector housing pointing down at `target` with a faint holo cone. */
export function projector(kit, x, y, z, target, opts = {}) {
  const { accentKey = "emitBlue", spread = 0.9, cone = true } = opts;
  kit.box("impTrim", x, y - 0.2, z, 0.9, 0.4, 0.9, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impMetal", x, y - 0.42, z, 0.7, 0.06, 0.7, { color: PALETTE.impCharcoal, texel: 1 });
  kit.cyl("impGloss", x, y - 0.47, z, 0.22, 0.06, "y", { segments: 20 });
  kit.cyl(accentKey, x, y - 0.46, z, 0.25, 0.02, "y", { segments: 20 });
  for (let i = 0; i < 4; i++) kit.box(i % 2 ? "emitRedImp" : accentKey, x - 0.3 + i * 0.2, y - 0.455, z + 0.32, 0.05, 0.02, 0.012);
  // optional faint cone from the lens to the target (cone: false leaves the beam to the spot light)
  if (!cone) return;
  ensureDeckBMaterials(kit.materials);
  kit.noShadowKeys.add("deckB_holoDim");
  const a = new THREE.Vector3(x, y - 0.5, z);
  const b = new THREE.Vector3(target[0], target[1], target[2]);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize().negate());
  const g = new THREE.CylinderGeometry(0.06, spread, len, 24, 1, true);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  kit.add("deckB_holoDim", g, { pos: [mid.x, mid.y, mid.z], quat: q, uv: "keep" });
}

// ---------------------------------------------------------------------------
// Instanced chair (two draw calls per room regardless of count)
// ---------------------------------------------------------------------------
function chairFrameGeo() {
  const parts = [];
  const add = (g, x, y, z, tilt = 0) => {
    if (tilt) g.rotateX(tilt);
    g.translate(x, y, z);
    parts.push(g.index ? g.toNonIndexed() : g);
  };
  add(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 10), 0, 0.2, 0);
  add(new THREE.CylinderGeometry(0.3, 0.32, 0.04, 16), 0, 0.02, 0);
  add(new THREE.BoxGeometry(0.56, 0.1, 0.54), 0, 0.46, 0);
  add(new THREE.BoxGeometry(0.5, 0.9, 0.1), 0, 0.95, 0.27, -0.15);
  add(new THREE.BoxGeometry(0.05, 0.05, 0.4), -0.31, 0.72, 0.05);
  add(new THREE.BoxGeometry(0.05, 0.05, 0.4), 0.31, 0.72, 0.05);
  const g = mergeGeos(parts);
  worldUVs(g, 1);
  setVertexColor(g, PALETTE.impBlack);
  return g;
}
function chairPadGeo() {
  const parts = [];
  const seat = new THREE.BoxGeometry(0.44, 0.05, 0.44);
  seat.translate(0, 0.53, 0.02);
  parts.push(seat.toNonIndexed());
  const back = new THREE.BoxGeometry(0.4, 0.75, 0.04);
  back.rotateX(-0.15);
  back.translate(0, 0.95, 0.21);
  parts.push(back.toNonIndexed());
  const g = mergeGeos(parts);
  worldUVs(g, 2);
  setVertexColor(g, PALETTE.impGreyDark);
  return g;
}
function mergeGeos(parts) {
  // minimal merge (positions / normals / uvs) so we do not depend on BufferGeometryUtils here
  let n = 0;
  for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  let o = 0;
  for (const p of parts) {
    const c = p.attributes.position.count;
    pos.set(p.attributes.position.array, o * 3);
    nor.set(p.attributes.normal.array, o * 3);
    uv.set(p.attributes.uv.array, o * 2);
    o += c;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}
/** Operator chair as two instances (frame + pad), facing -z locally, rotated by yaw. */
export function chairInstance(kit, x, z, yaw = 0, opts = {}) {
  const { y = 0, padColor = PALETTE.impGreyDark, collide = true } = opts;
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, yaw), new THREE.Vector3(1, 1, 1));
  kit.instance("deckb_chair_frame", "impTrim", chairFrameGeo, m, 0xffffff);
  kit.instance("deckb_chair_pad", "rubber", chairPadGeo, m, padColor);
  if (collide) kit.collider([x - 0.3, y, z - 0.3], [x + 0.3, y + 1.2, z + 0.3], "chair");
}

// ---------------------------------------------------------------------------
// Holograms
// ---------------------------------------------------------------------------
/** Wireframe-ish hologram of the ship (wedge outline + tower) as a THREE.Group for kit.attach. */
export function holoShip(materials, length = 3.0, opts = {}) {
  const { width = length * 0.6, mat = "holo", bright = "holoBright" } = opts;
  const g = new THREE.Group();
  const L = length / 2;
  const W = width / 2;
  // translucent fill plate
  const shape = new THREE.Shape([new THREE.Vector2(-W, -L * 0.9), new THREE.Vector2(W, -L * 0.9), new THREE.Vector2(0, L)]);
  const plate = new THREE.ShapeGeometry(shape);
  plate.rotateX(-Math.PI / 2);
  g.add(new THREE.Mesh(plate, materials[mat]));
  // edges
  const edge = (a, b, r = 0.012) => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(r, r, len, 6);
    const m = new THREE.Mesh(geo, materials[bright]);
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(UP, dir.normalize());
    g.add(m);
  };
  edge([-W, 0, L * 0.9], [0, 0, -L]);
  edge([W, 0, L * 0.9], [0, 0, -L]);
  edge([-W, 0, L * 0.9], [W, 0, L * 0.9]);
  // superstructure + tower
  const t0 = new THREE.Mesh(new THREE.BoxGeometry(W * 0.5, length * 0.04, L * 0.9), materials[mat]);
  t0.position.set(0, length * 0.03, L * 0.35);
  g.add(t0);
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(W * 0.22, length * 0.09, L * 0.35), materials[bright]);
  t1.position.set(0, length * 0.09, L * 0.55);
  g.add(t1);
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(W * 0.5, length * 0.03, L * 0.16), materials[bright]);
  t2.position.set(0, length * 0.14, L * 0.6);
  g.add(t2);
  // engine dots
  for (let i = -1; i <= 1; i++) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(length * 0.025, 8, 6), materials[bright]);
    e.position.set(i * W * 0.45, 0, L * 0.92);
    g.add(e);
  }
  return g;
}

/** Small holographic figure (game piece / comm hologram): cone body + sphere head. */
export function holoFigure(materials, h = 0.22, bright = false) {
  const g = new THREE.Group();
  const m = materials[bright ? "holoBright" : "holo"];
  const body = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.12, h * 0.28, h * 0.7, 10), m);
  body.position.y = h * 0.35;
  const head = new THREE.Mesh(new THREE.SphereGeometry(h * 0.16, 10, 8), m);
  head.position.y = h * 0.86;
  g.add(body, head);
  return g;
}

/** Static hologram figure merged into the kit. */
export function holoFigureStatic(kit, x, y, z, h = 0.22, bright = false) {
  const key = bright ? "holoBright" : "holo";
  kit.cyl(key, x, y + h * 0.35, z, h * 0.28, h * 0.7, "y", { r2: h * 0.12, segments: 10, uv: "keep" });
  kit.add(key, new THREE.SphereGeometry(h * 0.16, 10, 8), { pos: [x, y + h * 0.86, z], uv: "keep" });
}

// ---------------------------------------------------------------------------
// Deck B extra materials (dim holograms for the gallery table, warm sconce emitter, red-team holo)
// ---------------------------------------------------------------------------
export function ensureDeckBMaterials(materials) {
  if (materials.deckB_holoDim) return materials;
  const holo = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  materials.deckB_holoDim = holo(0x6fa4ff, 0.11);
  materials.deckB_holoMid = holo(0x9fc6ff, 0.32);
  materials.deckB_holoRed = holo(0xff9a70, 0.42);
  materials.deckB_holoRedBright = holo(0xffc8a8, 0.8);
  // single-sided translucent globe for the gallery's planet holograms (a solid sphere in the additive
  // double-sided material reads as a white ball)
  materials.deckB_holoGlobe = new THREE.MeshBasicMaterial({ color: 0x6fa4ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide });
  materials.deckB_holoLine = new THREE.LineBasicMaterial({ color: 0x9fc6ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  materials.deckB_emitAmberWarm = new THREE.MeshStandardMaterial({ color: new THREE.Color("#ffb56b").multiplyScalar(0.08), emissive: new THREE.Color("#ffb56b"), emissiveIntensity: 1.3, roughness: 0.45, metalness: 0 });
  for (const k of ["deckB_holoDim", "deckB_holoMid", "deckB_holoRed", "deckB_holoRedBright", "deckB_holoGlobe", "deckB_holoLine", "deckB_emitAmberWarm"]) materials[k].name = k;
  return materials;
}

/** Register the deckB_* materials on a kit and keep the hologram keys out of the shadow pass. */
export function deckBSetup(kit) {
  ensureDeckBMaterials(kit.materials);
  for (const k of ["deckB_holoDim", "deckB_holoMid", "deckB_holoRed", "deckB_holoRedBright", "deckB_holoGlobe", "holo", "holoBright"]) kit.noShadowKeys.add(k);
}

// ---------------------------------------------------------------------------
// Holo-game creatures (original silhouettes: stacked spheres / cones with limbs) — four kinds
// ---------------------------------------------------------------------------
const Y = new THREE.Vector3(0, 1, 0);
function limb(parts, a, b, r, segs = 6) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A);
  const L = dir.length();
  const g = new THREE.CylinderGeometry(r, r * 0.8, L, segs);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  parts.push(g);
}
function blob(parts, x, y, z, r, sx = 1, sy = 1, sz = 1) {
  const g = new THREE.SphereGeometry(r, 10, 8);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  parts.push(g);
}
function spike(parts, x, y, z, r, len, dir) {
  const g = new THREE.ConeGeometry(r, len, 6);
  const d = new THREE.Vector3(...dir).normalize();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, d));
  g.translate(x + (d.x * len) / 2, y + (d.y * len) / 2, z + (d.z * len) / 2);
  parts.push(g);
}
/**
 * Geometry parts (already placed, facing +x) for one creature of total height h:
 *  0 strider (long-necked quadruped), 1 brute (hunched tusked biped), 2 coil (rearing serpent),
 *  3 stalker (tripod insectoid with antennae).
 */
export function creatureParts(kind, h = 0.28) {
  const p = [];
  switch (kind % 4) {
    case 0: {
      blob(p, 0, 0.5 * h, 0, 0.13 * h, 1.7, 0.9, 1.0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) limb(p, [sx * 0.14 * h, 0.44 * h, sz * 0.07 * h], [sx * 0.19 * h, 0, sz * 0.1 * h], 0.022 * h);
      limb(p, [0.18 * h, 0.55 * h, 0], [0.3 * h, 0.9 * h, 0], 0.035 * h);
      blob(p, 0.34 * h, 0.92 * h, 0, 0.07 * h, 1.7, 0.9, 1.0);
      spike(p, 0.3 * h, 0.97 * h, 0.03 * h, 0.018 * h, 0.14 * h, [-0.5, 1, 0.2]);
      spike(p, 0.3 * h, 0.97 * h, -0.03 * h, 0.018 * h, 0.14 * h, [-0.5, 1, -0.2]);
      limb(p, [-0.2 * h, 0.5 * h, 0], [-0.42 * h, 0.3 * h, 0], 0.02 * h);
      break;
    }
    case 1: {
      blob(p, 0, 0.56 * h, 0, 0.2 * h, 1.05, 1.25, 0.8);
      blob(p, 0.08 * h, 0.86 * h, 0, 0.1 * h, 1.1, 0.85, 1.0);
      for (const s of [-1, 1]) {
        blob(p, 0, 0.72 * h, s * 0.24 * h, 0.085 * h);
        limb(p, [0, 0.7 * h, s * 0.26 * h], [0.08 * h, 0.22 * h, s * 0.3 * h], 0.045 * h);
        blob(p, 0.1 * h, 0.18 * h, s * 0.3 * h, 0.06 * h);
        limb(p, [0, 0.34 * h, s * 0.1 * h], [0, 0, s * 0.12 * h], 0.06 * h);
        spike(p, 0.16 * h, 0.82 * h, s * 0.05 * h, 0.02 * h, 0.12 * h, [1, 0.6, s * 0.3]);
      }
      break;
    }
    case 2: {
      let x = -0.12 * h;
      let y = 0.06 * h;
      for (let i = 0; i < 7; i++) {
        const r = h * (0.085 - i * 0.006);
        const a = i * 0.85;
        const R = 0.16 * h * (1 - i * 0.09);
        blob(p, Math.cos(a) * R, y, Math.sin(a) * R, r);
        x = Math.cos(a) * R;
        y += 0.135 * h;
      }
      blob(p, x + 0.08 * h, y - 0.02 * h, 0, 0.06 * h, 1.8, 0.8, 1.0);
      spike(p, x + 0.18 * h, y - 0.05 * h, 0.02 * h, 0.012 * h, 0.08 * h, [1, -0.8, 0.3]);
      spike(p, x + 0.18 * h, y - 0.05 * h, -0.02 * h, 0.012 * h, 0.08 * h, [1, -0.8, -0.3]);
      break;
    }
    default: {
      blob(p, 0, 0.62 * h, 0, 0.1 * h, 1.2, 0.8, 1.0);
      blob(p, 0.14 * h, 0.7 * h, 0, 0.06 * h);
      spike(p, -0.08 * h, 0.6 * h, 0, 0.09 * h, 0.3 * h, [-1, -0.25, 0]);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
        const kx = Math.cos(a) * 0.2 * h;
        const kz = Math.sin(a) * 0.2 * h;
        limb(p, [Math.cos(a) * 0.08 * h, 0.6 * h, Math.sin(a) * 0.08 * h], [kx, 0.72 * h, kz], 0.018 * h);
        limb(p, [kx, 0.72 * h, kz], [kx * 1.5, 0, kz * 1.5], 0.016 * h);
      }
      limb(p, [0.18 * h, 0.74 * h, 0.02 * h], [0.42 * h, 1.0 * h, 0.12 * h], 0.01 * h, 4);
      limb(p, [0.18 * h, 0.74 * h, -0.02 * h], [0.42 * h, 1.0 * h, -0.12 * h], 0.01 * h, 4);
    }
  }
  return p;
}

/** Static holographic creature merged into the kit (facing +x, rotated by yaw about y). */
export function holoCreatureStatic(kit, x, y, z, kind, h = 0.28, key = "holo", yaw = 0) {
  const q = new THREE.Quaternion().setFromAxisAngle(Y, yaw);
  for (const g of creatureParts(kind, h)) kit.add(key, g, { pos: [x, y, z], quat: q, uv: "keep" });
}

/** Holographic creature as a THREE.Group (for kit.attach and animation). */
export function holoCreature(materials, kind, h = 0.28, key = "holoBright") {
  const g = new THREE.Group();
  for (const part of creatureParts(kind, h)) g.add(new THREE.Mesh(part, materials[key]));
  return g;
}

// ---------------------------------------------------------------------------
// Gallery hologram: cut-away of the command tower (stacked deck plates, bridge head, a "you are
// here" blip on this deck). Dim by design (~0.6 of the old table): the view outside is the point.
// ---------------------------------------------------------------------------
export function holoTowerMap(materials, h = 1.1) {
  // one merged mesh per material (dim plates / mid plates / edge lines) + the blip: 4 objects, not ~40
  const g = new THREE.Group();
  const dimParts = [];
  const midParts = [];
  const linePos = [];
  const at = (geo, x, y, z) => {
    geo.translate(x, y, z);
    return geo.index ? geo.toNonIndexed() : geo;
  };
  const edgesAt = (box, x, y, z) => {
    const e = new THREE.EdgesGeometry(box);
    const p = e.attributes.position;
    for (let i = 0; i < p.count; i++) linePos.push(p.getX(i) + x, p.getY(i) + y, p.getZ(i) + z);
  };
  const decks = 5;
  for (let i = 0; i < decks; i++) {
    const t = i / (decks - 1);
    const w = 1.15 - t * 0.55;
    const dd = 0.62 - t * 0.28;
    const y = 0.08 + t * (h - 0.36);
    const box = new THREE.BoxGeometry(w, 0.035, dd);
    edgesAt(box, 0, y, 0);
    (i === 1 ? midParts : dimParts).push(at(box, 0, y, 0));
    // interior detail: a few compartment walls per deck
    for (let k = -1; k <= 1; k++) dimParts.push(at(new THREE.BoxGeometry(0.008, 0.11, dd * 0.8), k * w * 0.28, y + 0.075, 0));
    dimParts.push(at(new THREE.BoxGeometry(w * 0.85, 0.11, 0.008), 0, y + 0.075, 0));
  }
  // neck columns and the bridge head with two domes
  for (const s of [-1, 1]) dimParts.push(at(new THREE.CylinderGeometry(0.03, 0.04, h - 0.3, 8), s * 0.32, (h - 0.3) / 2 + 0.05, 0.02));
  const head = new THREE.BoxGeometry(0.9, 0.09, 0.42);
  edgesAt(head, 0, h - 0.18, 0);
  midParts.push(at(head, 0, h - 0.18, 0));
  for (const s of [-1, 1]) dimParts.push(at(new THREE.SphereGeometry(0.075, 10, 8), s * 0.3, h - 0.1, -0.06));
  midParts.push(at(new THREE.CylinderGeometry(0.008, 0.012, 0.3, 6), 0, h + 0.02, -0.1));
  // this deck: a brighter forward gallery strip and the blinking position blip
  const yB = 0.08 + 0.25 * (h - 0.36);
  g.add(new THREE.Mesh(mergeGeos(dimParts), materials.deckB_holoDim));
  g.add(new THREE.Mesh(mergeGeos(midParts), materials.deckB_holoMid));
  const lines = new THREE.BufferGeometry();
  lines.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
  g.add(new THREE.LineSegments(lines, materials.deckB_holoLine));
  const strip = at(new THREE.BoxGeometry(0.9, 0.012, 0.03), 0, yB + 0.03, -0.24);
  const blip = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), materials.holoBright);
  blip.position.set(0, yB + 0.05, -0.2);
  g.add(new THREE.Mesh(strip, materials.holoBright), blip);
  return { group: g, blip };
}

/**
 * Small holographic planet for a viewing pedestal: banded globe, a thin ring and a polar axis. Returns a
 * group (globe rotates about y) for kit.attach; static parts merged, 2 meshes in all.
 */
export function holoPlanet(materials, r = 0.32, opts = {}) {
  const { ring = true } = opts;
  const g = new THREE.Group();
  const globe = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), materials.deckB_holoGlobe);
  g.add(globe);
  const parts = [];
  const at = (geo, x, y, z, rx = 0) => {
    if (rx) geo.rotateX(rx);
    geo.translate(x, y, z);
    parts.push(geo.index ? geo.toNonIndexed() : geo);
  };
  // latitude bands (thin tori) and a polar axis: the dim material so the globe stays the read
  for (const lat of [-0.5, 0, 0.5]) at(new THREE.TorusGeometry(r * Math.cos(lat) + 0.004, 0.004, 4, 32), 0, r * Math.sin(lat), 0, Math.PI / 2);
  at(new THREE.CylinderGeometry(0.004, 0.004, r * 2.6, 6), 0, 0, 0);
  if (ring) at(new THREE.TorusGeometry(r * 1.6, 0.006, 4, 48), 0, 0, 0, Math.PI / 2 + 0.35);
  g.add(new THREE.Mesh(mergeGeos(parts), materials.deckB_holoDim));
  return { group: g, globe };
}
