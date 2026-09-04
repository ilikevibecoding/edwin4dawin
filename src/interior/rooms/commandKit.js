// Furniture and equipment vocabulary shared by the command-deck rooms (tactical, comms, intel,
// officers' quarters, observation gallery, lift lobbies). Everything is kit-bashed from primitives in
// the Imperial palette: satin-black consoles with blue / red / amber instrument light, grey-white
// panels with black trim, dark decks, steel rails, stencilled markings. Objects are built through a
// `facingFrame` so one definition serves every orientation.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Frame, UP, panelGrid, wallFrame, WALL_T } from "../lib.js";
import { PALETTE } from "../../materials.js";
import { decalRect } from "../../textures.js";

const P = PALETTE;

export const OPPOSITE = { "+x": "-x", "-x": "+x", "+z": "-z", "-z": "+z" };
// Player / crew yaw (radians, three.js convention: yaw 0 looks down -z) for a facing direction.
export const YAW = { "+x": -Math.PI / 2, "-x": Math.PI / 2, "+z": Math.PI, "-z": 0 };

// Crew hook: register a seat / station marker for future NPC systems (no-op on kits without markers).
export function marker(kit, kind, pos, facing, extra = {}) {
  if (kit.marker) kit.marker(kind, [pos.x, pos.y, pos.z], YAW[facing] ?? 0, extra);
}

// Frame standing on the floor at (cx, y, cz) whose normal points along `facing` (toward the person
// using the object). u runs to that person's right, v is up, n comes out of the object toward them.
export function facingFrame(kit, cx, y, cz, facing) {
  const U = facing === "+x" ? new THREE.Vector3(0, 0, -1) : facing === "-x" ? new THREE.Vector3(0, 0, 1) : facing === "+z" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(-1, 0, 0);
  return new Frame(kit, new THREE.Vector3(cx, y, cz), U, UP);
}

// Box leaning back by `tilt` radians about the frame's U axis, standing on its bottom edge at (u, v, n).
// `at(t, off)` gives the [v, n] of a point t metres up the front face, `off` metres proud of it.
export function leaningBox(frame, mat, u, v, n, w, h, thick, tilt, opts = {}) {
  const s = Math.sin(tilt);
  const c = Math.cos(tilt);
  frame.box(mat, u, v + (h / 2) * c, n + (h / 2) * s, w, h, thick, { tilt, ...opts });
  const at = (t, off = 0) => {
    const k = thick / 2 + off;
    return [v + t * c - s * k, n + t * s + c * k];
  };
  return { at, face: (off = 0) => at(h / 2, off), tilt };
}

// Stencil decal on a frame (index into the 4x4 decal sheet).
export function stencil(frame, u, v, size, index, opts = {}) {
  const g = new THREE.PlaneGeometry(size, size);
  if (opts.spin) g.rotateZ(opts.spin);
  frame.add("decal", g, u, v, opts.n ?? 0.004, { uv: "keep", uvRect: decalRect(index) });
}

// Framed screen on a wall frame: black housing, glossy bezel, emissive UI, optional LED readout below.
export function wallScreen(frame, u, v, w, h, mat, opts = {}) {
  const { bezel = 0.07, leds = false, n = 0, housing = 0.08 } = opts;
  frame.box("satinBlack", u, v, n + housing / 2, w + bezel * 2, h + bezel * 2, housing);
  frame.box("darkGloss", u, v, n + housing + 0.004, w + 0.03, h + 0.03, 0.008);
  frame.box(mat, u, v, n + housing + 0.011, w, h, 0.005, { uv: "keep" });
  if (leds) {
    frame.box("satinBlack", u, v - h / 2 - bezel - 0.05, n + 0.03, w * 0.7, 0.08, 0.06);
    frame.box("leds", u, v - h / 2 - bezel - 0.05, n + 0.063, w * 0.7 - 0.06, 0.035, 0.006, { uv: "keep" });
  }
}

// Officer / operator chair: pedestal, padded seat at 0.45 m, reclined back, armrests.
export function chair(kit, cx, y, cz, facing, opts = {}) {
  const { seatColor = P.fabricTeal, arms = true, tag = "chair" } = opts;
  const f = facingFrame(kit, cx, y, cz, facing);
  f.cylV("metalRough", 0, 0.015, 0, 0.24, 0.03, { color: P.darkMetal, segments: 18 });
  f.cylV("metal", 0, 0.22, 0, 0.035, 0.4, { color: P.steel, segments: 10 });
  f.box("satinBlack", 0, 0.41, 0, 0.5, 0.05, 0.5);
  f.box("fabric", 0, 0.465, 0.01, 0.46, 0.06, 0.46, { color: seatColor, uv: "world", texel: 2 });
  f.box("satinBlack", 0, 0.72, -0.24, 0.44, 0.52, 0.05, { tilt: -0.14 });
  f.box("fabric", 0, 0.73, -0.2, 0.38, 0.42, 0.035, { color: seatColor, tilt: -0.14, uv: "world", texel: 2 });
  if (arms) {
    for (const s of [-1, 1]) {
      f.box("satinBlack", s * 0.26, 0.62, -0.04, 0.045, 0.04, 0.36);
      f.box("satinBlack", s * 0.26, 0.52, -0.18, 0.045, 0.2, 0.045);
    }
  }
  f.collider(-0.28, 0.28, 0, 0.98, -0.3, 0.28, tag);
  marker(kit, "seat", f.pos(0, 0, 0), facing, { id: tag });
}

// Writing desk with a drawer block and a small reclined monitor.
export function desk(kit, cx, y, cz, facing, opts = {}) {
  const { w = 1.5, d = 0.7, h = 0.76, color = P.creamDark, screen = "screen0", tag = "desk" } = opts;
  const f = facingFrame(kit, cx, y, cz, facing);
  f.box("satinBlack", 0, h - 0.025, 0, w, 0.05, d);
  for (const s of [-1, 1]) f.box("painted", s * (w / 2 - 0.03), (h - 0.05) / 2, 0, 0.06, h - 0.05, d - 0.1, { color, uv: "keep" });
  f.box("painted", 0, (h - 0.05) / 2 + 0.08, -d / 2 + 0.04, w - 0.12, h - 0.21, 0.04, { color: P.gunmetal, uv: "keep" });
  f.box("painted", w / 2 - 0.26, 0.34, 0.04, 0.42, 0.6, d - 0.2, { color, uv: "keep" });
  for (const dv of [0.22, 0.4, 0.58]) {
    f.box("metal", w / 2 - 0.26, dv, d / 2 - 0.07, 0.36, 0.012, 0.01, { color: P.darkMetal });
    f.box("metal", w / 2 - 0.26, dv - 0.05, d / 2 - 0.05, 0.12, 0.02, 0.02, { color: P.steel });
  }
  if (screen) {
    f.box("satinBlack", -0.2, h + 0.05, -d / 2 + 0.22, 0.22, 0.1, 0.14);
    const lean = leaningBox(f, "satinBlack", -0.2, h + 0.1, -d / 2 + 0.2, 0.56, 0.36, 0.04, -0.3);
    const [fv, fn] = lean.face(0.003);
    f.box(screen, -0.2, fv, fn, 0.5, 0.3, 0.006, { tilt: -0.3, uv: "keep" });
    f.box("darkGloss", 0.22, h + 0.006, 0.05, 0.42, 0.012, 0.16);
    f.box("leds", 0.22, h + 0.013, 0.05, 0.36, 0.004, 0.03, { uv: "keep" });
  }
  f.collider(-w / 2, w / 2, 0, h, -d / 2, d / 2, tag);
  return f;
}

// Seated operator station: black desk shell, glossy input inset, reclined instrument panel with screens.
export function station(kit, cx, y, cz, facing, opts = {}) {
  const { w = 1.7, d = 0.75, h = 0.74, screens = ["screen0", "screen1"], withChair = true, seatColor = P.fabricTeal, accent = "emitTeal", lamp = null, tag = "station" } = opts;
  const f = facingFrame(kit, cx, y, cz, facing);
  f.box("metal", 0, 0.05, 0, w - 0.24, 0.1, d - 0.24, { color: P.darkMetal });
  f.box("satinBlack", 0, 0.1 + (h - 0.14) / 2, 0, w, h - 0.14, d);
  f.box("satinBlack", 0, h - 0.02, 0.03, w + 0.04, 0.04, d + 0.1);
  f.box("darkGloss", 0, h + 0.005, 0.1, w - 0.36, 0.01, d * 0.4);
  f.box("leds", 0, h + 0.012, d / 2 - 0.07, w - 0.6, 0.004, 0.045, { uv: "keep" });
  f.box(accent, -w / 2 + 0.12, h + 0.012, d / 2 - 0.07, 0.05, 0.004, 0.03);
  const pw = w - 0.1;
  const ph = 0.46;
  const tilt = -0.4;
  const lean = leaningBox(f, "satinBlack", 0, h, -d / 2 + 0.18, pw, ph, 0.08, tilt);
  const n = screens.length;
  const sw = (pw - 0.1 * (n + 1)) / n;
  const [fv, fn] = lean.face(0.005);
  for (let i = 0; i < n; i++) {
    const su = -pw / 2 + 0.1 + sw / 2 + i * (sw + 0.1);
    f.box("darkGloss", su, fv, fn, sw + 0.03, ph - 0.12, 0.008, { tilt });
    f.box(screens[i], su, fv, fn + 0.006, sw - 0.02, ph - 0.17, 0.004, { tilt, uv: "keep" });
  }
  const [lv, ln] = lean.at(0.07, 0.004);
  f.box("leds", 0, lv, ln, pw * 0.5, 0.03, 0.006, { tilt, uv: "keep" });
  if (lamp) f.box(lamp, pw / 2 - 0.08, lv + 0.01, ln, 0.05, 0.03, 0.008, { tilt });
  f.collider(-w / 2 - 0.02, w / 2 + 0.02, 0, h + 0.5, -d / 2 - 0.05, d / 2 + 0.06, tag);
  if (withChair) {
    const p = f.pos(0, 0, d / 2 + 0.5);
    chair(kit, p.x, y, p.z, OPPOSITE[facing], { seatColor });
  }
  return f;
}

// Standing console: chest-high black podium with a sloped instrument face. Edge-lit so it reads from
// every side: a lit kick all round, a vertical light slot on each flank, an accent line along the top
// edge of the face and a rear readout (`rear`, a screen material) on the side away from the operator.
export function podium(kit, cx, y, cz, facing, opts = {}) {
  const { w = 1.2, d = 0.6, h = 0.95, screen = "screen4", accent = "emitBlue", rear = "screen9", edgeLit = true, tag = "podium" } = opts;
  const f = facingFrame(kit, cx, y, cz, facing);
  f.box("metal", 0, 0.05, 0, w - 0.3, 0.1, d - 0.3, { color: P.darkMetal });
  f.box(accent, 0, 0.05, d / 2 - 0.14, w - 0.5, 0.02, 0.01);
  f.box("satinBlack", 0, 0.1 + (h - 0.1) / 2, 0, w, h - 0.1, d);
  const tilt = -(Math.PI / 2 - 0.32);
  const lean = leaningBox(f, "satinBlack", 0, h, d / 2 + 0.02, w + 0.04, d * 0.98, 0.07, tilt);
  const [sv, sn] = lean.at(d * 0.56, 0.004);
  f.box("darkGloss", 0, sv, sn, w - 0.24, d * 0.5, 0.008, { tilt });
  f.box(screen, 0, sv, sn + 0.006, w - 0.3, d * 0.44, 0.004, { tilt, uv: "keep" });
  const [kv, kn] = lean.at(d * 0.15, 0.004);
  f.box("leds", -0.1, kv, kn, w * 0.45, 0.035, 0.006, { tilt, uv: "keep" });
  f.box(accent, w / 2 - 0.14, kv, kn, 0.06, 0.035, 0.006, { tilt });
  f.box("rubber", w / 2 - 0.26, kv, kn + 0.01, 0.05, 0.035, 0.02, { color: P.rubber, tilt });
  if (edgeLit) {
    // kick light on the other three sides
    f.box(accent, 0, 0.05, -d / 2 + 0.14, w - 0.5, 0.02, 0.01);
    for (const s of [-1, 1]) {
      f.box(accent, s * (w / 2 - 0.14), 0.05, 0, 0.01, 0.02, d - 0.5);
      // flank slot: black channel with a lit core
      f.box("satinBlack", s * (w / 2 + 0.005), 0.1 + (h - 0.1) / 2, 0, 0.012, h - 0.34, 0.09);
      f.box(accent, s * (w / 2 + 0.014), 0.1 + (h - 0.1) / 2, 0, 0.006, h - 0.4, 0.035);
    }
    // top edge line of the face
    const [tv, tn] = lean.at(d * 0.95, 0.004);
    f.box(accent, 0, tv, tn, w - 0.2, 0.014, 0.006, { tilt });
    // front readout on the vertical face under the slope (what a viewer at eye height actually sees)
    f.box("darkGloss", 0, h - 0.42, d / 2 + 0.006, w * 0.62, 0.26, 0.012);
    f.box(rear || screen, 0, h - 0.42, d / 2 + 0.014, w * 0.56, 0.2, 0.004, { uv: "keep" });
    f.box("leds", w * 0.05, h - 0.62, d / 2 + 0.01, w * 0.4, 0.03, 0.006, { uv: "keep" });
    if (rear) {
      f.box("darkGloss", 0, h - 0.34, -d / 2 - 0.006, w * 0.62, 0.3, 0.012);
      f.box(rear, 0, h - 0.34, -d / 2 - 0.014, w * 0.56, 0.24, 0.004, { uv: "keep" });
      f.box("leds", -w * 0.1, h - 0.58, -d / 2 - 0.01, w * 0.4, 0.03, 0.006, { uv: "keep" });
    }
  }
  f.collider(-w / 2 - 0.02, w / 2 + 0.02, 0, h + 0.25, -d / 2 - 0.02, d / 2 + 0.06, tag);
  marker(kit, "station", f.pos(0, 0, d / 2 + 0.45), OPPOSITE[facing], { id: tag });
  return f;
}

// Free-standing table (conference / mess style): slab top on a black pedestal foot.
export function table(kit, cx, y, cz, w, d, opts = {}) {
  const { h = 0.75, color = P.creamDark, topMat = "satinBlack", inlay = null, tag = "table" } = opts;
  kit.box(topMat, cx, y + h - 0.03, cz, w, 0.06, d, { color });
  if (inlay) kit.box(inlay, cx, y + h + 0.004, cz, w - 0.5, 0.008, d - 0.4, { uv: "keep" });
  kit.box("metal", cx, y + h - 0.09, cz, w - 0.3, 0.06, d - 0.3, { color: P.gunmetal });
  kit.box("satinBlack", cx, y + (h - 0.12) / 2, cz, Math.min(w * 0.55, w - 0.8), h - 0.12, Math.max(0.3, d * 0.35));
  kit.box("metal", cx, y + 0.04, cz, Math.min(w * 0.7, w - 0.5), 0.08, Math.max(0.5, d * 0.6), { color: P.darkMetal });
  kit.collider([cx - w / 2, y, cz - d / 2], [cx + w / 2, y + h, cz + d / 2], tag);
}

// Floor-standing cabinet built against a wall frame: plinth, painted body, doors with handles and
// vent slots, dark top cap, optional accent band / stencil / status lamp.
export function cabinet(frame, u, w, h, depth, opts = {}) {
  const { color = P.cream, doors = 2, band = P.orange, vents = true, label = null, lamp = null, tag = "cabinet" } = opts;
  frame.box("metal", u, 0.04, depth / 2, w - 0.04, 0.08, depth - 0.04, { color: P.darkMetal });
  frame.box("painted", u, 0.08 + (h - 0.08) / 2, depth / 2 - 0.01, w, h - 0.08, depth - 0.02, { color, uv: "keep" });
  frame.box("metal", u, h - 0.015, depth / 2, w + 0.02, 0.03, depth + 0.01, { color: P.gunmetal });
  const dw = (w - 0.04) / doors;
  for (let i = 0; i < doors; i++) {
    const du = u - w / 2 + 0.02 + dw / 2 + i * dw;
    frame.box("painted", du, 0.12 + (h - 0.26) / 2, depth, dw - 0.03, h - 0.26, 0.02, { color, uv: "keep" });
    frame.box("metal", du + (i % 2 ? -1 : 1) * (dw / 2 - 0.08), h * 0.5, depth + 0.025, 0.03, 0.22, 0.03, { color: P.steel });
    if (vents) for (let k = 0; k < 5; k++) frame.box("metal", du, 0.32 + k * 0.06, depth + 0.006, dw * 0.5, 0.014, 0.012, { color: P.darkMetal });
  }
  if (band) frame.box("painted", u, h * 0.74, depth + 0.012, w - 0.04, 0.08, 0.008, { color: band, uv: "keep" });
  if (label !== null) stencil(frame, u, h * 0.86, Math.min(0.26, w * 0.35), label, { n: depth + 0.017 });
  if (lamp) frame.box(lamp, u - w / 2 + 0.12, h - 0.14, depth + 0.012, 0.06, 0.03, 0.01);
  frame.collider(u - w / 2, u + w / 2, 0, h, 0, depth + 0.05, tag);
}

// Equipment rack against a wall frame: black chassis with stacked unit faces, LED readouts and
// (through `blink`) rows of indicator dots that animate.
export function rack(frame, u, w, h, depth, opts = {}) {
  const { blink = null, units = 6, lamp = "emitTeal", tag = "rack" } = opts;
  frame.box("metal", u, 0.05, depth / 2, w - 0.06, 0.1, depth - 0.06, { color: P.darkMetal });
  frame.box("satinBlack", u, 0.1 + (h - 0.1) / 2, depth / 2, w, h - 0.1, depth);
  frame.box("metal", u, h + 0.01, depth / 2, w + 0.02, 0.02, depth + 0.02, { color: P.gunmetal });
  for (const s of [-1, 1]) frame.box("metal", u + s * (w / 2 - 0.03), 0.1 + (h - 0.1) / 2, depth + 0.01, 0.03, h - 0.1, 0.02, { color: P.steel });
  const uh = (h - 0.3) / units;
  for (let k = 0; k < units; k++) {
    const v = 0.2 + uh * k + uh / 2;
    frame.box("paintedMetal", u, v, depth + 0.01, w - 0.12, uh - 0.04, 0.02, { color: k % 3 === 1 ? P.slate : P.gunmetal, texel: 2 });
    frame.box("metal", u - w / 2 + 0.11, v, depth + 0.024, 0.06, 0.06, 0.01, { color: P.steel });
    if (k % 2 === 0) frame.box("leds", u + 0.05, v - uh * 0.25, depth + 0.024, w * 0.45, 0.028, 0.006, { uv: "keep" });
    if (blink) {
      const cols = Math.max(3, Math.floor((w - 0.3) / 0.07));
      for (let c = 0; c < cols; c++) blink.dot(frame, u - w / 2 + 0.22 + c * 0.07, v + uh * 0.2, depth + 0.026, 0.03);
    } else frame.box(lamp, u + w / 2 - 0.14, v + uh * 0.2, depth + 0.024, 0.05, 0.02, 0.008);
  }
  frame.collider(u - w / 2, u + w / 2, 0, h, 0, depth + 0.05, tag);
}

// Collector for animated indicator dots. Dots are merged into one mesh per colour group so a whole
// wall of racks blinks for three draw calls; `finish` registers the update with the room.
export class BlinkSet {
  constructor(ctx, colors = [0x62d9c9, 0x6fb4ff, 0xffb347]) {
    this.ctx = ctx;
    this.groups = colors.map((c) => ({ color: c, geos: [] }));
    this.i = 0;
    this._m = new THREE.Matrix4();
    this._one = new THREE.Vector3(1, 1, 1);
  }
  dot(frame, u, v, n, size = 0.03) {
    const g = new THREE.BoxGeometry(size, size, 0.012);
    g.applyMatrix4(this._m.compose(frame.pos(u, v, n), frame.q, this._one));
    this.groups[this.i++ % this.groups.length].geos.push(g);
  }
  finish(name = "blink") {
    const root = new THREE.Group();
    root.name = name;
    const mats = [];
    for (const g of this.groups) {
      if (!g.geos.length) continue;
      const m = this.ctx.materials.emitTeal.clone();
      m.color = new THREE.Color(0x06100e);
      m.emissive = new THREE.Color(g.color);
      m.emissiveIntensity = 2.2;
      const mesh = new THREE.Mesh(mergeGeometries(g.geos, false), m);
      mesh.name = name;
      root.add(mesh);
      mats.push(m);
    }
    const rates = [1.9, 2.7, 1.1];
    let t = 0;
    this.ctx.dynamic.push({
      object: root,
      update(dt) {
        t += dt;
        for (let i = 0; i < mats.length; i++) {
          const s = Math.sin(t * rates[i] + i * 1.3) + 0.4 * Math.sin(t * rates[i] * 3.7 + i * 0.6);
          mats[i].emissiveIntensity = s > 0.15 ? 2.6 : 0.3;
        }
      },
    });
    return root;
  }
}

// Padded bench, optionally with a reclined back. `len` runs along u.
export function bench(kit, cx, y, cz, facing, opts = {}) {
  const { len = 2.0, back = true, color = P.fabricTeal, tag = "bench" } = opts;
  const f = facingFrame(kit, cx, y, cz, facing);
  f.box("metal", 0, 0.05, 0, len - 0.4, 0.1, 0.4, { color: P.darkMetal });
  f.box("satinBlack", 0, 0.27, 0, len, 0.16, 0.54);
  f.box("fabric", 0, 0.41, 0.02, len - 0.06, 0.12, 0.5, { color, uv: "world", texel: 2 });
  if (back) {
    f.box("satinBlack", 0, 0.72, -0.28, len, 0.54, 0.06, { tilt: -0.15 });
    f.box("fabric", 0, 0.74, -0.245, len - 0.1, 0.42, 0.04, { color, tilt: -0.15, uv: "world", texel: 2 });
  }
  f.collider(-len / 2, len / 2, 0, back ? 1.0 : 0.5, -0.32, 0.28, tag);
  benchSeats(kit, f, len, facing, tag);
}

// One seat marker per ~0.6 m of bench, centred along u.
function benchSeats(kit, f, len, facing, tag) {
  const n = Math.max(1, Math.floor(len / 0.6));
  for (let i = 0; i < n; i++) marker(kit, "seat", f.pos(-((n - 1) * 0.6) / 2 + i * 0.6, 0, 0.02), facing, { id: tag });
}

// Gallery / theatre bench: steel pedestal legs under a floating black seat frame with a fabric cushion,
// a reclined back on two posts with a fabric pad in front and a painted rear panel under a steel top
// rail, end armrests, a soft light strip under the seat front and a row plate on the rear. Reads from
// behind (rear panel, rail, legs) as well as from the front. `len` runs along u.
export function theatreBench(kit, cx, y, cz, facing, opts = {}) {
  const { len = 3.0, color = P.fabricTeal, rear = P.creamDark, strip = "emitCoolSoft", tag = "bench" } = opts;
  const f = facingFrame(kit, cx, y, cz, facing);
  for (const s of [-1, 1]) {
    f.box("metal", s * (len / 2 - 0.45), 0.03, -0.02, 0.5, 0.06, 0.5, { color: P.darkMetal });
    f.box("metal", s * (len / 2 - 0.45), 0.22, -0.02, 0.12, 0.34, 0.3, { color: P.steel });
  }
  f.box("metal", 0, 0.34, -0.1, len - 0.9, 0.06, 0.1, { color: P.gunmetal });
  f.box("satinBlack", 0, 0.42, 0, len, 0.06, 0.56);
  f.box("fabric", 0, 0.5, 0.02, len - 0.08, 0.1, 0.5, { color, uv: "world", texel: 2 });
  f.box(strip, 0, 0.387, 0.2, len - 0.5, 0.006, 0.03, { uv: "keep" });
  const tilt = -0.12;
  for (const s of [-1, 1]) f.box("metal", s * (len / 2 - 0.1), 0.74, -0.27, 0.05, 0.62, 0.05, { color: P.steel, tilt });
  f.box("fabric", 0, 0.8, -0.24, len - 0.3, 0.44, 0.05, { color, tilt, uv: "world", texel: 2 });
  f.box("painted", 0, 0.8, -0.3, len - 0.22, 0.52, 0.03, { color: rear, tilt, uv: "keep" });
  f.box("metal", 0, 1.06, -0.33, len, 0.04, 0.08, { color: P.steel, tilt });
  f.box("satinBlack", 0, 0.88, -0.33, 0.5, 0.12, 0.02, { tilt });
  f.box("leds", 0, 0.88, -0.345, 0.4, 0.05, 0.006, { tilt, uv: "keep" });
  for (const s of [-1, 1]) {
    f.box("satinBlack", s * (len / 2 - 0.03), 0.67, -0.02, 0.06, 0.04, 0.44);
    f.box("satinBlack", s * (len / 2 - 0.03), 0.57, -0.2, 0.06, 0.2, 0.05);
  }
  f.collider(-len / 2, len / 2, 0, 1.08, -0.38, 0.3, tag);
  benchSeats(kit, f, len, facing, tag);
}

// Steel handrail on black posts between two floor points (axis-aligned).
export function handrail(kit, a, b, y, opts = {}) {
  const { h = 1.0, postEvery = 2.0, color = P.steel, mid = true, tag = "rail" } = opts;
  const [x0, z0] = a;
  const [x1, z1] = b;
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  kit.cyl("metal", cx, y + h, cz, 0.025, len, alongX ? "x" : "z", { color, segments: 12 });
  if (mid) kit.cyl("metal", cx, y + h * 0.55, cz, 0.014, len, alongX ? "x" : "z", { color: P.gunmetal, segments: 8 });
  const n = Math.max(2, Math.round(len / postEvery) + 1);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const px = x0 + (x1 - x0) * t;
    const pz = z0 + (z1 - z0) * t;
    kit.box("satinBlack", px, y + h / 2, pz, 0.05, h, 0.05);
    kit.box("metal", px, y + 0.02, pz, 0.12, 0.04, 0.12, { color: P.gunmetal });
  }
  kit.collider([Math.min(x0, x1) - 0.04, y, Math.min(z0, z1) - 0.04], [Math.max(x0, x1) + 0.04, y + h + 0.03, Math.max(z0, z1) + 0.04], tag);
}

// Low light channel on the floor / a riser: black housing with a soft emitter (axis-aligned run).
export function floorStrip(kit, a, b, y, mat = "emitBlueSoft", opts = {}) {
  const { w = 0.08 } = opts;
  const [x0, z0] = a;
  const [x1, z1] = b;
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  if (alongX) {
    kit.box("satinBlack", cx, y + 0.015, cz, len, 0.03, w + 0.04);
    kit.box(mat, cx, y + 0.031, cz, len - 0.04, 0.006, w, { uv: "keep" });
  } else {
    kit.box("satinBlack", cx, y + 0.015, cz, w + 0.04, 0.03, len);
    kit.box(mat, cx, y + 0.031, cz, w, 0.006, len - 0.04, { uv: "keep" });
  }
}

// Overhead cable tray: two rails, cross rungs, a bundle of cables and a coloured conduit.
export function cableTray(kit, a, b, y, opts = {}) {
  const { w = 0.42, rung = 0.6 } = opts;
  const [x0, z0] = a;
  const [x1, z1] = b;
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const axis = alongX ? "x" : "z";
  for (const s of [-1, 1]) {
    if (alongX) kit.box("metal", cx, y, cz + (s * w) / 2, len, 0.09, 0.03, { color: P.gunmetal, texel: 2 });
    else kit.box("metal", cx + (s * w) / 2, y, cz, 0.03, 0.09, len, { color: P.gunmetal, texel: 2 });
  }
  const n = Math.max(1, Math.floor(len / rung));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x0 + (x1 - x0) * t;
    const pz = z0 + (z1 - z0) * t;
    if (alongX) kit.box("metal", px, y - 0.035, pz, 0.03, 0.02, w, { color: P.steel });
    else kit.box("metal", px, y - 0.035, pz, w, 0.02, 0.03, { color: P.steel });
  }
  const runs = [
    [-0.12, 0.028, "rubber", P.rubber],
    [-0.04, 0.022, "rubber", P.rubber],
    [0.05, 0.03, "metal", P.steel],
    [0.14, 0.02, "painted", P.orange],
  ];
  for (const [off, r, mat, col] of runs) {
    if (alongX) kit.cyl(mat, cx, y - 0.02 + r, cz + off, r, len - 0.05, axis, { color: col, segments: 8, uv: mat === "painted" ? "keep" : "scale" });
    else kit.cyl(mat, cx + off, y - 0.02 + r, cz, r, len - 0.05, axis, { color: col, segments: 8, uv: mat === "painted" ? "keep" : "scale" });
  }
}

// Axis-aligned pipe with saddle clamps every ~2 m.
export function pipe(kit, a, b, r, opts = {}) {
  const { color = P.steel, clamps = true, mat = "metal" } = opts;
  const [x0, y0, z0] = a;
  const [x1, y1, z1] = b;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const dz = Math.abs(z1 - z0);
  const axis = dx >= dy && dx >= dz ? "x" : dy >= dz ? "y" : "z";
  const len = axis === "x" ? dx : axis === "y" ? dy : dz;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const cz = (z0 + z1) / 2;
  kit.cyl(mat, cx, cy, cz, r, len, axis, { color, segments: 12 });
  if (clamps && axis !== "y") {
    const n = Math.max(1, Math.floor(len / 2.2));
    for (let i = 0; i <= n; i++) {
      const t = n === 0 ? 0.5 : (i + 0.5) / (n + 1);
      const px = x0 + (x1 - x0) * t;
      const pz = z0 + (z1 - z0) * t;
      kit.box("metal", px, cy, pz, axis === "x" ? 0.08 : r * 2 + 0.06, r * 2 + 0.06, axis === "z" ? 0.08 : r * 2 + 0.06, { color: P.darkMetal });
    }
  }
}

// Full-height wall pilaster with a lit vertical slot on its room-facing side.
export function pilaster(kit, x, z, y, h, facing, opts = {}) {
  const { w = 0.5, d = 0.42, slot = "emitCoolSoft", tag = "pilaster" } = opts;
  const f = facingFrame(kit, x, y, z, facing);
  f.box("satinBlack", 0, 0.55, d / 2, w, 1.1, d);
  f.box("painted", 0, 1.1 + (h - 1.1) / 2, d / 2, w - 0.04, h - 1.1, d - 0.04, { color: P.cream, uv: "world", texel: 1 });
  f.box("satinBlack", 0, h - 0.12, d / 2, w, 0.24, d);
  f.box("satinBlack", 0, 1.1 + (h - 1.4) / 2, d + 0.005, 0.14, h - 1.4, 0.03);
  f.box(slot, 0, 1.1 + (h - 1.4) / 2, d + 0.021, 0.06, h - 1.6, 0.004, { uv: "keep" });
  f.collider(-w / 2, w / 2, 0, h, 0, d + 0.03, tag);
}

// Room ceiling without the shell's centre-line rib: matte plate, cross beams and light channels that run
// across the room (perpendicular to `along`, the axis the viewer looks down), so nothing reads as a bar
// hanging into the far wall from the doorway.
export function flatCeiling(kit, room, y0, opts = {}) {
  const { beams = [], channels = [], channelMat = "emitWhiteSoft", channelW = 0.34, plate = P.gunmetal, along = "z" } = opts;
  const { x0, x1, z0, z1, height: h } = room;
  const yTop = y0 + h;
  kit.boxMM("painted", [x0 - WALL_T, yTop, z0 - WALL_T], [x1 + WALL_T, yTop + 0.12, z1 + WALL_T], { color: plate, uv: "world", texel: 0.5 });
  const acrossX = along === "z";
  const len = acrossX ? x1 - x0 : z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  for (const p of beams) {
    if (acrossX) kit.box("paintedMetal", cx, yTop - 0.1, p, len, 0.2, 0.22, { color: P.darkMetal, texel: 1.2 });
    else kit.box("paintedMetal", p, yTop - 0.1, cz, 0.22, 0.2, len, { color: P.darkMetal, texel: 1.2 });
  }
  for (const p of channels) {
    if (acrossX) {
      kit.box("satinBlack", cx, yTop - 0.03, p, len - 1.2, 0.06, channelW + 0.12);
      kit.box(channelMat, cx, yTop - 0.06, p, len - 1.4, 0.02, channelW, { uv: "keep" });
    } else {
      kit.box("satinBlack", p, yTop - 0.03, cz, channelW + 0.12, 0.06, len - 1.2);
      kit.box(channelMat, p, yTop - 0.06, cz, channelW, 0.02, len - 1.4, { uv: "keep" });
    }
  }
  return yTop;
}

// Stencil decal laid flat on the deck at (x, z), readable by someone looking along `facing`.
export function floorStencil(kit, x, y, z, size, index, facing = "+z") {
  const g = new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2);
  const yaw = { "+z": Math.PI, "-z": 0, "+x": -Math.PI / 2, "-x": Math.PI / 2 }[facing];
  g.rotateY(yaw);
  kit.add("decal", g, { pos: [x, y + 0.008, z], uv: "keep", uvRect: decalRect(index) });
}

// Recessed ceiling downlight: black housing with a soft emitter.
export function downlight(kit, cx, yTop, cz, sx, sz, mat = "emitCoolSoft") {
  kit.box("satinBlack", cx, yTop - 0.03, cz, sx + 0.1, 0.06, sz + 0.1);
  kit.box(mat, cx, yTop - 0.062, cz, sx, 0.008, sz, { uv: "keep" });
}

// Small wall-mounted communications panel: black box, screen, LED strip, call button.
export function commPanel(frame, u, v, opts = {}) {
  const { screen = "screen3", accent = "emitBlue", w = 0.42, h = 0.5 } = opts;
  frame.box("satinBlack", u, v, 0.04, w, h, 0.08);
  frame.box("darkGloss", u, v + 0.08, 0.082, w - 0.08, h * 0.44, 0.006);
  frame.box(screen, u, v + 0.08, 0.087, w - 0.11, h * 0.38, 0.004, { uv: "keep" });
  frame.box("leds", u - 0.04, v - 0.13, 0.082, w * 0.5, 0.03, 0.006, { uv: "keep" });
  frame.box("rubber", u + w / 2 - 0.08, v - 0.13, 0.09, 0.05, 0.05, 0.02, { color: P.rubber });
  frame.box(accent, u + w / 2 - 0.08, v - 0.2, 0.084, 0.05, 0.015, 0.006);
  frame.cylN("metal", u - w / 2 + 0.07, v - 0.2, 0.086, 0.025, 0.012, { color: P.steel, segments: 12 });
}

// Turbolift call panel on a portal surround band (which sits at n 0..0.1): a black box proud of the band
// with a small LED readout, two lit call buttons and a steel key switch.
export function callPanel(frame, u, v, accent = "emitBlue") {
  frame.box("satinBlack", u, v, 0.16, 0.24, 0.5, 0.12);
  frame.box("darkGloss", u, v + 0.16, 0.222, 0.18, 0.1, 0.006);
  frame.box("leds", u, v + 0.16, 0.226, 0.15, 0.03, 0.004, { uv: "keep" });
  for (const [dv, mat] of [[0.02, accent], [-0.08, "emitWhite"]]) {
    frame.box("rubber", u, v + dv, 0.225, 0.08, 0.07, 0.01, { color: P.rubber });
    frame.box(mat, u, v + dv, 0.232, 0.05, 0.03, 0.004);
  }
  frame.cylN("metal", u, v - 0.18, 0.222, 0.025, 0.012, { color: P.steel, segments: 12 });
}

// Cabin / station nameplate: black plate, cream text plate carrying a spec-text decal, a lit rule under
// it and an occupancy lamp. (u, v) is the plate centre on a wall frame.
export function nameplate(frame, u, v, opts = {}) {
  const { w = 0.64, h = 0.24, bar = "emitAmber", lamp = "emitBlue", label = 9, label2 = null, n = 0 } = opts;
  frame.box("satinBlack", u, v, n + 0.02, w, h, 0.04);
  const tw = w - 0.18;
  frame.box("painted", u + 0.05, v + 0.014, n + 0.043, tw, h - 0.08, 0.006, { color: P.cream, uv: "keep" });
  const d = h - 0.095;
  if (label2 === null) frame.add("decal", new THREE.PlaneGeometry(d, d), u + 0.05, v + 0.014, n + 0.048, { uv: "keep", uvRect: decalRect(label) });
  else {
    frame.add("decal", new THREE.PlaneGeometry(d, d), u + 0.05 - tw / 4, v + 0.014, n + 0.048, { uv: "keep", uvRect: decalRect(label) });
    frame.add("decal", new THREE.PlaneGeometry(d, d), u + 0.05 + tw / 4, v + 0.014, n + 0.048, { uv: "keep", uvRect: decalRect(label2) });
  }
  frame.box(bar, u, v - h / 2 + 0.024, n + 0.043, w - 0.08, 0.016, 0.006);
  frame.box(lamp, u - w / 2 + 0.065, v + 0.014, n + 0.043, 0.05, 0.05, 0.006);
}

// Two-sided interior partition (both faces panelled) with optional door openings, capped on top.
// a -> b as seen from side A (its normal points to the left of a->b, i.e. U x UP); openings are given in
// side-A u coordinates and mirrored automatically for side B.
export function partition(kit, a, b, y, h, opts = {}) {
  // depth must stay >= the shell wall thickness: panelGrid's backing plate reaches 0.05 in front of
  // -depth, so anything thinner puts the plate in front of the painted faces
  const { openings = [], seed = 900, styles = { panel: 0.86, strip: 0.06, greeble: 0.05, screen: 0.03 }, paintsA = null, paintsB = null, depth = WALL_T, tag = "partition" } = opts;
  // each face's body lies behind its own plane, so the two planes are pushed apart by the depth
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const nx = -dz / len;
  const nz = dx / len;
  const A = wallFrame(kit, [a[0] + nx * depth, a[1] + nz * depth], [b[0] + nx * depth, b[1] + nz * depth], y);
  const B = wallFrame(kit, [b[0] - nx * depth, b[1] - nz * depth], [a[0] - nx * depth, a[1] - nz * depth], y);
  const L = A.length;
  const opsB = openings.map((o) => ({ ...o, u0: L - o.u1, u1: L - o.u0 }));
  const base = { depth, kick: true, topPipes: false, styles, tag };
  panelGrid(A.frame, L, h, { ...base, openings, seed, paints: paintsA || undefined });
  panelGrid(B.frame, L, h, { ...base, openings: opsB, seed: seed + 1, paints: paintsB || undefined });
  A.frame.box("satinBlack", L / 2, h - 0.09, 0.02, L, 0.18, 0.05);
  B.frame.box("satinBlack", L / 2, h - 0.09, 0.02, L, 0.18, 0.05);
  // sliding door dressing per door opening: black jambs + header, a track above and a leaf edge peeking
  // out of its wall pocket, a door control by the jamb. `pocket: -1` parks the leaf on the -u side (side A).
  for (const o of openings) {
    if (o.type && o.type !== "door") continue;
    const uc = (o.u0 + o.u1) / 2;
    const w = o.u1 - o.u0;
    const dh = o.v1;
    const pk = o.pocket === -1 ? -1 : 1;
    for (const F of [A.frame, B.frame]) {
      const sideA = F === A.frame;
      const c = sideA ? uc : L - uc;
      const sgn = (sideA ? 1 : -1) * pk;
      F.box("satinBlack", c - w / 2 - 0.06, dh / 2, -depth / 2, 0.12, dh, depth + 0.06, { uv: "world" });
      F.box("satinBlack", c + w / 2 + 0.06, dh / 2, -depth / 2, 0.12, dh, depth + 0.06, { uv: "world" });
      F.box("satinBlack", c, dh + 0.08, -depth / 2, w + 0.24, 0.16, depth + 0.06, { uv: "world" });
      F.box("satinBlack", c + sgn * w * 0.25, dh + 0.2, 0.0, w * 1.5 + 0.2, 0.08, 0.06);
      F.box("emitBlue", c - sgn * (w / 2 + 0.06), 1.15, 0.035, 0.03, 0.4, 0.01);
    }
    // the leaf: retracted into its pocket, the leading edge left in the opening
    A.frame.box("painted", uc + pk * (w / 2 - 0.1), dh / 2, -depth, 0.2, dh - 0.04, 0.05, { color: P.impGrey, uv: "keep" });
    A.frame.box("darkGloss", uc + pk * (w / 2 - 0.19), dh / 2, -depth, 0.02, dh - 0.3, 0.06);
    A.frame.collider(uc + Math.min(pk * (w / 2 - 0.2), pk * (w / 2)), uc + Math.max(pk * (w / 2 - 0.2), pk * (w / 2)), 0, dh, -depth - 0.03, -depth + 0.03, "leaf");
  }
  return { A, B, length: L };
}

// One wall of a spec room rebuilt with custom panel styles / paints (for rooms that skip a shell wall so
// they can dress it themselves). Door openings on that wall are cut automatically.
export function customWall(kit, room, dir, y, opts = {}) {
  const { styles = { panel: 1 }, paints = [[P.cream, 1]], extraOpenings = [], seed = 31, height = room.height, trim = true, depth = WALL_T } = opts;
  const { x0, x1, z0, z1 } = room;
  const seg = dir === "-z" ? [[x0, z0], [x1, z0]] : dir === "+z" ? [[x1, z1], [x0, z1]] : dir === "-x" ? [[x0, z1], [x0, z0]] : [[x1, z0], [x1, z1]];
  const { frame, length } = wallFrame(kit, seg[0], seg[1], y);
  const ops = [...extraOpenings];
  for (const door of room.doors || []) {
    if (door[3] !== dir) continue;
    const [dx, dz, w] = door;
    let u;
    if (dir === "-z") u = dx - x0;
    else if (dir === "+z") u = x1 - dx;
    else if (dir === "-x") u = z1 - dz;
    else u = dz - z0;
    ops.push({ u0: Math.max(0, u - w / 2), u1: Math.min(length, u + w / 2), v0: 0, v1: Math.min(height - 0.1, door[4] || 2.1), type: "door" });
  }
  panelGrid(frame, length, height, { openings: ops, depth, seed, kick: true, topPipes: false, styles, paints, tag: room.id + dir });
  if (trim) frame.box("satinBlack", length / 2, height - 0.09, 0.02, length, 0.18, 0.05);
  return { frame, length, openings: ops };
}

// A room's +x wall rebuilt around a recessed niche (z from..to, `depth` deep) for an alcove cabinet.
// Floor and ceiling extend into the niche, black jambs and a header frame it, the back is panelled; the
// whole niche is blocked by a collider so the player never leaves the room's bounds. Returns the two wall
// segment frames (u = z - z0) and the niche back frame (u = z - zFrom, normal into the room).
export function nicheWall(kit, room, y, zFrom, zTo, opts = {}) {
  const { depth = 0.6, styles = { panel: 0.84, strip: 0.06, greeble: 0.06, vent: 0.04 }, paints = [[P.cream, 0.8], [P.creamDark, 0.2]], seed = 60, jamb = "satinBlack" } = opts;
  const { x1, z0, z1, height: h } = room;
  const yTop = y + h;
  const segs = [];
  let s = seed;
  for (const [za, zb] of [[z0, zFrom], [zTo, z1]]) {
    const { frame, length } = wallFrame(kit, [x1, za], [x1, zb], y);
    panelGrid(frame, length, h, { depth: WALL_T, seed: s++, kick: true, topPipes: false, styles, paints, tag: room.id + "+x" });
    frame.box("satinBlack", length / 2, h - 0.09, 0.02, length, 0.18, 0.05);
    segs.push(frame);
  }
  const xo = x1 + depth + WALL_T;
  kit.boxMM("deck", [x1, y - 0.12, zFrom - 0.2], [xo, y, zTo + 0.2], { color: P.impGreyDark, uv: "world", texel: 1 });
  kit.boxMM("paintedMetal", [x1, yTop, zFrom - 0.2], [xo, yTop + 0.12, zTo + 0.2], { color: P.gunmetal, uv: "world", texel: 0.7 });
  kit.boxMM(jamb, [x1 - 0.02, y, zFrom - 0.14], [xo, yTop, zFrom]);
  kit.boxMM(jamb, [x1 - 0.02, y, zTo], [xo, yTop, zTo + 0.14]);
  kit.boxMM(jamb, [x1 - 0.02, yTop - 0.22, zFrom], [xo, yTop, zTo]);
  const back = wallFrame(kit, [x1 + depth, zFrom], [x1 + depth, zTo], y);
  panelGrid(back.frame, back.length, h - 0.22, { depth: WALL_T, seed: seed + 7, kick: true, topPipes: false, styles: { panel: 1 }, paints, tag: room.id + "niche" });
  kit.collider([x1 - 0.05, y, zFrom - 0.14], [xo, yTop, zTo + 0.14], "niche");
  return { segs, back: back.frame, length: zTo - zFrom };
}

// Small personal effects for desks and shelves: datapad, mug, a stack of flimsis, a holo-frame.
export function effects(kit, x, y, z, kind, rot = 0) {
  const f = new Frame(kit, new THREE.Vector3(x, y, z), new THREE.Vector3(Math.cos(rot), 0, -Math.sin(rot)), UP);
  switch (kind) {
    case "datapad":
      f.box("darkGloss", 0, 0.008, 0, 0.22, 0.016, 0.15);
      f.box("screen3", 0, 0.017, 0, 0.19, 0.002, 0.12, { uv: "keep" });
      break;
    case "mug":
      f.cylV("painted", 0, 0.05, 0, 0.04, 0.1, { color: P.tealPaint, uv: "keep", segments: 12 });
      f.cylV("painted", 0, 0.1, 0, 0.032, 0.005, { color: P.darkMetal, uv: "keep", segments: 12 });
      break;
    case "stack":
      f.box("painted", 0, 0.02, 0, 0.3, 0.04, 0.22, { color: P.cream, uv: "keep" });
      f.box("painted", 0.02, 0.05, 0.01, 0.28, 0.02, 0.2, { color: P.creamDark, uv: "keep" });
      break;
    case "frame":
      f.box("satinBlack", 0, 0.08, 0, 0.16, 0.16, 0.02, { tilt: -0.2 });
      f.box("emitBlueSoft", 0, 0.08, 0.013, 0.12, 0.12, 0.004, { tilt: -0.2, uv: "keep" });
      break;
    case "canister":
      f.cylV("metal", 0, 0.12, 0, 0.06, 0.24, { color: P.steel, segments: 14 });
      f.box("painted", 0, 0.14, 0, 0.125, 0.06, 0.125, { color: P.orange, uv: "keep" });
      break;
    case "lamp":
      f.cylV("metal", 0, 0.01, 0, 0.07, 0.02, { color: P.darkMetal, segments: 12 });
      f.cylV("metal", 0.03, 0.2, 0, 0.012, 0.38, { color: P.steel, segments: 8 });
      f.box("metal", -0.04, 0.4, 0.04, 0.2, 0.06, 0.12, { color: P.gunmetal, tilt: 0.3 });
      f.box("emitWarm", -0.04, 0.37, 0.05, 0.16, 0.012, 0.08, { tilt: 0.3 });
      break;
    case "coolLamp":
      f.cylV("metal", 0, 0.01, 0, 0.07, 0.02, { color: P.darkMetal, segments: 12 });
      f.cylV("metal", 0.03, 0.2, 0, 0.012, 0.38, { color: P.steel, segments: 8 });
      f.box("metal", -0.04, 0.4, 0.04, 0.2, 0.06, 0.12, { color: P.gunmetal, tilt: 0.3 });
      f.box("emitCool", -0.04, 0.37, 0.05, 0.16, 0.012, 0.08, { tilt: 0.3 });
      break;
    case "case":
      // classified document case: black shell, steel latches, red seal stripe and a lock lamp
      f.box("satinBlack", 0, 0.06, 0, 0.44, 0.12, 0.32);
      f.box("metal", 0, 0.125, 0, 0.4, 0.01, 0.28, { color: P.gunmetal });
      for (const s of [-1, 1]) f.box("metal", s * 0.12, 0.07, 0.165, 0.06, 0.04, 0.012, { color: P.steel });
      f.box("painted", 0, 0.06, 0.165, 0.44, 0.03, 0.004, { color: P.orange, uv: "keep" });
      f.box("emitRed", 0.18, 0.1, 0.165, 0.02, 0.012, 0.004);
      break;
    case "folder":
      // flimsi folder with a red classification band
      f.box("painted", 0, 0.012, 0, 0.32, 0.024, 0.24, { color: P.cream, uv: "keep" });
      f.box("painted", 0, 0.026, 0, 0.32, 0.004, 0.06, { color: P.orange, uv: "keep" });
      f.box("painted", 0.02, 0.036, 0.01, 0.28, 0.014, 0.2, { color: P.creamDark, uv: "keep" });
      break;
    default:
      break;
  }
}
