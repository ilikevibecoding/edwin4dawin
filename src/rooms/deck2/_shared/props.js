// Shared Imperial props for Decks 2/3 (§11 design language). Every prop is kit-bashed through a
// `placer` so it can be dropped at any position/yaw; colliders come out as world AABBs. Yaw is in
// radians about +Y; a prop's front faces local +Z, so front direction = (sin yaw, 0, cos yaw).
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { IMP, col } from "./palette.js";

// ---------------------------------------------------------------------------------------------------
export function placer(kit, pos, yaw = 0) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const w = (lx, ly, lz) => [pos[0] + lx * c + lz * s, pos[1] + ly, pos[2] - lx * s + lz * c];
  const rot = [0, yaw, 0];
  const api = {
    pos,
    yaw,
    world: w,
    box(mat, lx, ly, lz, sx, sy, sz, opts = {}) {
      return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: w(lx, ly, lz), rot, ...opts });
    },
    // cylinder along a local axis
    cyl(mat, lx, ly, lz, r, len, axis = "y", opts = {}) {
      const g = new THREE.CylinderGeometry(opts.r2 ?? r, r, len, opts.segments || 14, 1, !!opts.open);
      const base = axis === "x" ? new THREE.Euler(0, 0, Math.PI / 2) : axis === "z" ? new THREE.Euler(Math.PI / 2, 0, 0) : new THREE.Euler();
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(base));
      const { r2, open, segments, ...rest } = opts;
      return kit.add(mat, g, { pos: w(lx, ly, lz), quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
    },
    add(mat, geo, lx, ly, lz, opts = {}) {
      return kit.add(mat, geo, { pos: w(lx, ly, lz), rot, ...opts });
    },
    collider(lmin, lmax, tag = "prop") {
      const pts = [w(lmin[0], lmin[1], lmin[2]), w(lmax[0], lmin[1], lmin[2]), w(lmin[0], lmin[1], lmax[2]), w(lmax[0], lmin[1], lmax[2])];
      const xs = pts.map((p) => p[0]);
      const zs = pts.map((p) => p[2]);
      kit.collider([Math.min(...xs), pos[1] + lmin[1], Math.min(...zs)], [Math.max(...xs), pos[1] + lmax[1], Math.max(...zs)], tag);
    },
  };
  return api;
}

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
const LED_MATS = ["emitRedImp", "emitBlue", "emitAmber", "emitGreen", "emitWhite"];

// Dense indicator field: rows of tiny emitters in Imperial red/blue/amber on a matte-black plate.
// Local: plate centred at (lx, ly, lz) in the XY plane facing +Z.
export function indicatorField(P, lx, ly, lz, w, h, seed = 1, { density = 1, weights = [0.45, 0.35, 0.15, 0.05] } = {}) {
  const rand = rng(seed);
  P.box("darkGloss", lx, ly, lz, w, h, 0.02);
  const cols = Math.max(1, Math.floor((w - 0.06) / (0.05 / density)));
  const rows = Math.max(1, Math.floor((h - 0.06) / (0.06 / density)));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (rand() < 0.35) continue;
      const r = rand();
      const m = r < weights[0] ? "emitRedImp" : r < weights[0] + weights[1] ? "emitBlue" : r < weights[0] + weights[1] + weights[2] ? "emitAmber" : "emitGreen";
      const x = lx - w / 2 + 0.04 + (i + 0.5) * ((w - 0.08) / cols);
      const y = ly - h / 2 + 0.04 + (j + 0.5) * ((h - 0.08) / rows);
      P.box(m, x, y, lz + 0.013, 0.022, 0.016, 0.006);
    }
  }
}

// Console: matte-black body, sloped upper face with screens, indicator field, key strip, kick.
// Local footprint: width w along X, depth d along Z (front at +d/2), height h at the back.
export function console(kit, PALETTE, pos, yaw, { w = 2.4, d = 0.9, h = 1.15, screens = 2, seed = 3, screenMat = null, sit = false, stool = false } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  const deskH = sit ? 0.74 : 0.9;
  // body
  P.box("paintedMetal", 0, deskH / 2, 0, w, deskH, d, { color: black, texel: 2.5 });
  P.box("paintedMetal", 0, 0.06, 0, w - 0.1, 0.12, d - 0.1, { color: dark }); // kick recess
  // sloped upper face (tilted box) with a screen bank
  const slopeH = h - deskH;
  const tilt = -0.42;
  // tilt about the console's own X axis: q = Ry(yaw) * Rx(tilt)
  const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
  P.add("paintedMetal", new THREE.BoxGeometry(w, slopeH, 0.42), 0, deskH + slopeH / 2 - 0.03, -d / 2 + 0.28, { quat: tq, color: black, texel: 2.5 });
  const sw = (w - 0.2) / screens - 0.06;
  // local offset of the screen plane: 0.2 along the tilted face normal (local +Z rotated by tilt)
  const nz = 0.2 * Math.cos(tilt);
  const ny = -0.2 * Math.sin(tilt);
  for (let i = 0; i < screens; i++) {
    const x = -w / 2 + 0.1 + (i + 0.5) * ((w - 0.2) / screens);
    // screenMat may be a key or an array of keys rotated per screen (seeded picks repeat for ~30 % of seeds)
    const m = Array.isArray(screenMat) ? screenMat[i % screenMat.length] : screenMat || "screenImp" + Math.floor(rand() * 4);
    kit.add("darkGloss", new THREE.BoxGeometry(sw + 0.05, slopeH * 0.62 + 0.05, 0.02), { pos: P.world(x, deskH + slopeH * 0.5 + ny, -d / 2 + 0.28 + nz), quat: tq });
    kit.add(m, new THREE.BoxGeometry(sw, slopeH * 0.62, 0.02), { pos: P.world(x, deskH + slopeH * 0.5 + ny * 1.08, -d / 2 + 0.28 + nz * 1.08), quat: tq, uv: "keep" });
  }
  // flat work surface: keys, indicator field, two knobs
  P.box("paintedMetal", 0, deskH + 0.005, d / 2 - 0.3, w - 0.1, 0.01, 0.5, { color: dark });
  indicatorField(P, -w / 4, deskH + 0.02, d / 2 - 0.3, w / 2 - 0.2, 0.32, seed + 11);
  P.box("darkGloss", w / 4, deskH + 0.015, d / 2 - 0.3, w / 2 - 0.2, 0.2, 0.02);
  for (let i = 0; i < 8; i++) P.box(pick(rand, ["emitBlue", "emitRedImp", "emitAmber"]), w / 4 - 0.2 + i * 0.055, deskH + 0.028, d / 2 - 0.22, 0.03, 0.012, 0.03);
  for (const x of [w / 4 - 0.15, w / 4 + 0.15]) P.cyl("metal", x, deskH + 0.04, d / 2 - 0.42, 0.03, 0.05, "y", { color: col(PALETTE, "steel"), segments: 12 });
  // edge light
  P.box("emitBlue", 0, deskH - 0.03, d / 2 + 0.006, w - 0.3, 0.012, 0.01);
  P.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "console");
  if (sit) chair(kit, PALETTE, P.world(0, 0, d / 2 + 0.55), yaw + Math.PI);
  else if (stool) chair(kit, PALETTE, P.world(0, 0, d / 2 + 0.55), yaw + Math.PI, { seatMat: "paintedMetal", back: false });
  return P;
}

// Simple pedestal chair facing local +Z. `seatMat` lets control rooms avoid spending a draw call on
// `fabric` (e.g. "paintedMetal"); `back: false` makes it a stool.
export function chair(kit, PALETTE, pos, yaw, { seatMat = "fabric", back = true } = {}) {
  const P = placer(kit, pos, yaw);
  const dark = col(PALETTE, "impDark");
  P.cyl("metal", 0, 0.02, 0, 0.26, 0.04, "y", { color: dark, segments: 16 });
  P.cyl("metal", 0, 0.25, 0, 0.04, 0.42, "y", { color: col(PALETTE, "steel"), segments: 10 });
  P.box(seatMat, 0, 0.49, 0, 0.5, 0.08, 0.5, { color: col(PALETTE, "impDark"), texel: 2 });
  if (back) P.box(seatMat, 0, 0.78, -0.22, 0.48, 0.5, 0.06, { color: col(PALETTE, "impDark"), texel: 2 });
  P.collider([-0.26, 0, -0.26], [0.26, back ? 1.0 : 0.55, 0.26], "chair");
}

// Wall-mounted screen with bezel. Face key: which way the screen faces (world dir as yaw).
// `tilt` (rad, downward) sends the glossy screen's reflection of ceiling fills to the deck instead of
// the eye; `accent` is the underline emitter (emitAmber in engineering rooms).
export function wallScreen(kit, pos, yaw, w = 1.6, h = 0.9, mat = "screenImp0", { tilt = 0, accent = "emitBlue" } = {}) {
  const P = placer(kit, pos, yaw);
  if (tilt) {
    const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
    const ny = -Math.sin(tilt);
    const nz = Math.cos(tilt);
    P.box("paintedMetal", 0, 0, -0.14, 0.3, 0.3, 0.2, { color: IMP.impBlack }); // mount block
    const at = (d) => P.world(0, ny * d, -0.04 + nz * d);
    kit.add("paintedMetal", new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.08), { pos: at(0), quat: tq, color: IMP.impBlack });
    kit.add("darkGloss", new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.01), { pos: at(0.042), quat: tq });
    kit.add(mat, new THREE.BoxGeometry(w, h, 0.01), { pos: at(0.052), quat: tq, uv: "keep" });
    return;
  }
  P.box("paintedMetal", 0, 0, -0.04, w + 0.12, h + 0.12, 0.08, { color: IMP.impBlack });
  P.box("darkGloss", 0, 0, 0.002, w + 0.04, h + 0.04, 0.01);
  P.box(mat, 0, 0, 0.012, w, h, 0.01, { uv: "keep" });
  P.box(accent, 0, -h / 2 - 0.03, 0.0, w * 0.6, 0.012, 0.01);
}

// Imperial cargo crate: 1.2 m module with recessed side panels and a lit status tab.
export function crate(kit, PALETTE, pos, yaw, { w = 1.2, h = 1.2, d = 1.2, color, seed = 5, bumperMat = "rubber" } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const body = color || pick(rand, [col(PALETTE, "impMid"), col(PALETTE, "impGrey"), col(PALETTE, "impDark")]);
  P.box("paintedMetal", 0, h / 2, 0, w, h, d, { color: body, texel: 2.5 });
  // recessed panels on four sides
  for (const [sx, sz, ax] of [[0, 1, "z"], [0, -1, "z"], [1, 0, "x"], [-1, 0, "x"]]) {
    const inset = 0.04;
    if (ax === "z") P.box("paintedMetal", 0, h / 2, (sz * d) / 2 + sz * 0.001, w - 0.3, h - 0.3, 0.03, { color: col(PALETTE, "impDark"), texel: 2.5 });
    else P.box("paintedMetal", (sx * w) / 2 + sx * 0.001, h / 2, 0, 0.03, h - 0.3, d - 0.3, { color: col(PALETTE, "impDark"), texel: 2.5 });
    void inset;
  }
  // corner bumpers + handles + status tab
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.box(bumperMat, (sx * (w - 0.1)) / 2, h / 2, (sz * (d - 0.1)) / 2, 0.1, h + 0.02, 0.1, { color: bumperMat === "rubber" ? 0xffffff : col(PALETTE, "impBlack") });
  P.box("metal", 0, h - 0.15, d / 2 + 0.03, 0.4, 0.05, 0.05, { color: col(PALETTE, "steel") });
  P.box(rand() < 0.7 ? "emitBlue" : "emitAmber", w / 2 - 0.2, h - 0.12, d / 2 + 0.017, 0.12, 0.03, 0.006);
  P.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "crate");
}

// Bank of tall lockers along local X, doors facing +Z.
export function lockerBank(kit, PALETTE, pos, yaw, { count = 6, unit = 0.6, h = 2.0, d = 0.5, color } = {}) {
  const P = placer(kit, pos, yaw);
  const w = count * unit;
  const body = color || col(PALETTE, "impMid");
  P.box("paintedMetal", 0, h / 2, 0, w, h, d, { color: body, texel: 2.5 });
  for (let i = 0; i < count; i++) {
    const x = -w / 2 + (i + 0.5) * unit;
    P.box("impPanel", x, h / 2, d / 2 + 0.012, unit - 0.04, h - 0.1, 0.02, { color: col(PALETTE, "impGrey"), uv: "keep" });
    P.box("metal", x + unit / 2 - 0.08, h * 0.55, d / 2 + 0.03, 0.02, 0.18, 0.02, { color: col(PALETTE, "steel") });
    for (let v = 0; v < 4; v++) P.box("paintedMetal", x, h - 0.3 - v * 0.05, d / 2 + 0.026, unit - 0.2, 0.012, 0.01, { color: col(PALETTE, "impDark") });
    P.box(i % 3 === 0 ? "emitAmber" : "emitBlue", x - unit / 2 + 0.1, h - 0.15, d / 2 + 0.025, 0.05, 0.02, 0.006);
  }
  P.box("paintedMetal", 0, 0.05, 0, w, 0.1, d, { color: col(PALETTE, "impBlack") });
  P.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "lockers");
}

// Stacked bunks: `tiers` beds along local X (length 2.1), head at -X, open side +Z.
export function bunkStack(kit, PALETTE, pos, yaw, { tiers = 3, len = 2.1, w = 0.9, gap = 0.75, seed = 7 } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const frame = col(PALETTE, "impDark");
  const h = 0.3 + tiers * gap;
  P.box("paintedMetal", 0, h / 2, -w / 2 - 0.02, len, h, 0.04, { color: frame, texel: 2.5 }); // back
  for (const x of [-len / 2 + 0.03, len / 2 - 0.03]) P.box("paintedMetal", x, h / 2, 0, 0.06, h, w + 0.04, { color: frame });
  for (let i = 0; i < tiers; i++) {
    const y = 0.3 + i * gap;
    P.box("paintedMetal", 0, y, 0, len, 0.08, w, { color: frame, texel: 2.5 });
    P.box("fabric", 0, y + 0.1, 0, len - 0.1, 0.12, w - 0.08, { color: col(PALETTE, "impGrey"), texel: 2 });
    P.box("fabric", -len / 2 + 0.35, y + 0.18, 0, 0.5, 0.06, w - 0.3, { color: col(PALETTE, "impWhite"), texel: 2 });
    if (rand() < 0.6) P.box("fabric", 0.15, y + 0.19, -0.05, len - 0.9, 0.05, w - 0.25, { color: col(PALETTE, "impMid"), texel: 2 });
    // reading light + rail
    P.box("emitWhite", -len / 2 + 0.6, y + gap - 0.12, -w / 2 + 0.03, 0.3, 0.02, 0.02);
    P.cyl("metal", 0, y + 0.3, w / 2, 0.015, len * 0.6, "x", { color: col(PALETTE, "steel"), segments: 8 });
  }
  P.box("paintedMetal", 0, h - 0.02, 0, len, 0.04, w + 0.04, { color: frame }); // top
  P.collider([-len / 2, 0, -w / 2 - 0.05], [len / 2, h, w / 2], "bunk");
}

// Long table with pedestal legs, optional benches both sides (along local X).
export function table(kit, PALETTE, pos, yaw, { len = 4.0, w = 0.9, h = 0.78, benches = true } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, h - 0.03, 0, len, 0.06, w, { color: col(PALETTE, "impGrey"), texel: 2.5 });
  P.box("paintedMetal", 0, h - 0.09, 0, len - 0.1, 0.06, w - 0.1, { color: col(PALETTE, "impDark") });
  for (const x of [-len / 2 + 0.5, len / 2 - 0.5]) {
    P.box("paintedMetal", x, (h - 0.1) / 2, 0, 0.12, h - 0.1, w - 0.3, { color: col(PALETTE, "impDark") });
    P.box("paintedMetal", x, 0.03, 0, 0.4, 0.06, w - 0.1, { color: col(PALETTE, "impBlack") });
  }
  P.box("emitBlue", 0, h - 0.06, w / 2 + 0.005, len - 0.4, 0.012, 0.01);
  P.collider([-len / 2, 0, -w / 2], [len / 2, h, w / 2], "table");
  if (benches) {
    for (const s of [-1, 1]) {
      const z = s * (w / 2 + 0.45);
      P.box("paintedMetal", 0, 0.42, z, len - 0.2, 0.06, 0.38, { color: col(PALETTE, "impMid"), texel: 2.5 });
      for (const x of [-len / 2 + 0.6, len / 2 - 0.6]) P.box("paintedMetal", x, 0.2, z, 0.1, 0.4, 0.3, { color: col(PALETTE, "impDark") });
      P.collider([-len / 2, 0, z - 0.2], [len / 2, 0.45, z + 0.2], "bench");
    }
  }
}

// Pipe run between two world points with brackets every `bracket` metres.
export function pipe(kit, PALETTE, a, b, r = 0.08, { color, bracket = 2.5, mat = "metal", segments = 12 } = {}) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const dir = new THREE.Vector3(dx, dy, dz).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  kit.add(mat, new THREE.CylinderGeometry(r, r, len, segments), { pos: mid, quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], color: color || col(PALETTE, "steel") });
  const n = bracket > 0 ? Math.floor(len / bracket) : 0;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    kit.add("paintedMetal", new THREE.CylinderGeometry(r + 0.04, r + 0.04, 0.12, segments), { pos: [a[0] + dx * t, a[1] + dy * t, a[2] + dz * t], quat: q, color: col(PALETTE, "impDark") });
  }
}

// Rectangular duct between two points (axis-aligned), with flanges.
export function duct(kit, PALETTE, a, b, w = 0.6, h = 0.4, { color } = {}) {
  const min = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])];
  const max = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
  const axis = max[0] - min[0] > max[2] - min[2] ? "x" : "z";
  if (axis === "x") kit.boxMM("paintedMetal", [min[0], min[1] - h / 2, min[2] - w / 2], [max[0], min[1] + h / 2, min[2] + w / 2], { color: color || col(PALETTE, "impMid"), texel: 2.5 });
  else kit.boxMM("paintedMetal", [min[0] - w / 2, min[1] - h / 2, min[2]], [min[0] + w / 2, min[1] + h / 2, max[2]], { color: color || col(PALETTE, "impMid"), texel: 2.5 });
  const len = axis === "x" ? max[0] - min[0] : max[2] - min[2];
  for (let t = 1.5; t < len; t += 3) {
    if (axis === "x") kit.boxMM("paintedMetal", [min[0] + t, min[1] - h / 2 - 0.03, min[2] - w / 2 - 0.03], [min[0] + t + 0.08, min[1] + h / 2 + 0.03, min[2] + w / 2 + 0.03], { color: col(PALETTE, "impDark") });
    else kit.boxMM("paintedMetal", [min[0] - w / 2 - 0.03, min[1] - h / 2 - 0.03, min[2] + t], [min[0] + w / 2 + 0.03, min[1] + h / 2 + 0.03, min[2] + t + 0.08], { color: col(PALETTE, "impDark") });
  }
}

// Vertical tank on a plinth with bands, a gauge and a valve wheel facing +Z.
export function tank(kit, PALETTE, pos, yaw, { r = 1.2, h = 4, color, bands = 3, emit = "emitTeal" } = {}) {
  const P = placer(kit, pos, yaw);
  const body = color || col(PALETTE, "impGrey");
  P.cyl("paintedMetal", 0, 0.15, 0, r + 0.15, 0.3, "y", { color: col(PALETTE, "impBlack"), segments: 24 });
  P.cyl("metal", 0, h / 2 + 0.3, 0, r, h, "y", { color: body, segments: 28, texel: 0.5 });
  P.cyl("paintedMetal", 0, h + 0.3 + 0.15, 0, r * 0.85, 0.3, "y", { color: col(PALETTE, "impDark"), segments: 24 });
  for (let i = 1; i <= bands; i++) P.cyl("paintedMetal", 0, 0.3 + (h * i) / (bands + 1), 0, r + 0.05, 0.16, "y", { color: col(PALETTE, "impDark"), segments: 28 });
  P.box("darkGloss", 0, 1.4, r + 0.02, 0.3, 0.3, 0.04);
  P.box(emit, 0, 1.4, r + 0.045, 0.2, 0.2, 0.01);
  P.cyl("metal", 0, 1.0, r + 0.12, 0.16, 0.05, "z", { color: col(PALETTE, "impRed"), segments: 16 });
  P.cyl("metal", 0, h + 0.7, 0, 0.12, 0.6, "y", { color: col(PALETTE, "steel"), segments: 10 });
  P.collider([-r - 0.15, 0, -r - 0.15], [r + 0.15, h, r + 0.15], "tank");
}

// Structural pillar (square) with a recessed light strip on each face.
export function pillar(kit, PALETTE, pos, size, h, { strip = true, faceColor } = {}) {
  kit.box("paintedMetal", pos[0], pos[1] + h / 2, pos[2], size, h, size, { color: col(PALETTE, "impDark"), texel: 2.5 });
  // clean painted faces over the dark core (the worn-metal map at pillar scale reads as blotchy concrete)
  const fc = faceColor || col(PALETTE, "impMid");
  const fh = h - 1.0;
  const fy = pos[1] + 0.35 + fh / 2;
  kit.box("impPanel", pos[0], fy, pos[2] + size / 2 + 0.006, size - 0.16, fh, 0.012, { color: fc, uv: "keep" });
  kit.box("impPanel", pos[0], fy, pos[2] - size / 2 - 0.006, size - 0.16, fh, 0.012, { color: fc, uv: "keep" });
  kit.box("impPanel", pos[0] + size / 2 + 0.006, fy, pos[2], 0.012, fh, size - 0.16, { color: fc, uv: "keep" });
  kit.box("impPanel", pos[0] - size / 2 - 0.006, fy, pos[2], 0.012, fh, size - 0.16, { color: fc, uv: "keep" });
  kit.box("paintedMetal", pos[0], pos[1] + 0.15, pos[2], size + 0.1, 0.3, size + 0.1, { color: col(PALETTE, "impBlack") });
  kit.box("paintedMetal", pos[0], pos[1] + h - 0.2, pos[2], size + 0.1, 0.4, size + 0.1, { color: col(PALETTE, "impBlack") });
  if (strip) {
    kit.box("emitWhite", pos[0], pos[1] + h / 2, pos[2] + size / 2 + 0.016, 0.05, h - 1.2, 0.006);
    kit.box("emitWhite", pos[0], pos[1] + h / 2, pos[2] - size / 2 - 0.016, 0.05, h - 1.2, 0.006);
  }
  kit.collider([pos[0] - size / 2 - 0.05, pos[1], pos[2] - size / 2 - 0.05], [pos[0] + size / 2 + 0.05, pos[1] + h, pos[2] + size / 2 + 0.05], "pillar");
}

// Straight stair along local +Z climbing `rise` over `run`, width w, with side rails.
export function stairs(kit, PALETTE, pos, yaw, { rise = 3.0, run = 4.5, w = 1.8, step = 0.2 } = {}) {
  const P = placer(kit, pos, yaw);
  const n = Math.max(1, Math.round(rise / step));
  const sh = rise / n;
  const sd = run / n;
  for (let i = 0; i < n; i++) {
    P.box("impFloor", 0, sh * (i + 0.5), sd * (i + 0.5), w, sh, sd, { color: col(PALETTE, "impMid"), texel: 0.5 });
    P.box("emitWhite", 0, sh * (i + 1) - 0.015, sd * i + 0.02, w - 0.2, 0.01, 0.02);
  }
  for (const s of [-1, 1]) {
    P.box("paintedMetal", (s * (w + 0.06)) / 2, rise / 2, run / 2, 0.06, rise + 0.3, run, { color: col(PALETTE, "impDark") }); // stringer
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.atan2(rise, run), 0, 0)));
    kit.add("metal", new THREE.CylinderGeometry(0.03, 0.03, Math.hypot(rise, run), 10), { pos: P.world((s * (w + 0.06)) / 2, rise / 2 + 1.0, run / 2), quat: q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))), color: col(PALETTE, "steel") });
    for (let i = 0; i <= 3; i++) P.box("paintedMetal", (s * (w + 0.06)) / 2, (rise * i) / 3 + 0.5, (run * i) / 3, 0.05, 1.0, 0.05, { color: col(PALETTE, "impDark") });
  }
  // colliders: side walls only (the player has no gravity; stairs are visual unless a room teleports)
  P.collider([-w / 2 - 0.1, 0, 0], [-w / 2, rise + 1, run], "stair-rail");
  P.collider([w / 2, 0, 0], [w / 2 + 0.1, rise + 1, run], "stair-rail");
  P.collider([-w / 2, 0, 0], [w / 2, rise, run], "stair");
}

// Holo table: black pedestal, glowing rim, an additive holo volume mesh added to ctx.group (returned
// so the room can animate it in update()).
export function holoTable(ctx, pos, { r = 1.4, h = 0.95, holoH = 1.6, mat = "holo" } = {}) {
  const { kit, PALETTE, group, materials } = ctx;
  const P = placer(kit, pos, 0);
  P.cyl("paintedMetal", 0, h / 2, 0, r, h, "y", { color: col(PALETTE, "impBlack"), segments: 32, texel: 2.5 });
  P.cyl("paintedMetal", 0, 0.1, 0, r + 0.15, 0.2, "y", { color: col(PALETTE, "impDark"), segments: 32 });
  P.cyl("darkGloss", 0, h + 0.01, 0, r - 0.1, 0.02, "y", { segments: 32 });
  P.cyl("emitBlue", 0, h - 0.04, 0, r + 0.01, 0.04, "y", { segments: 32, open: true });
  indicatorField(P, 0, h - 0.3, r + 0.001, 1.2, 0.2, 21);
  P.collider([-r, 0, -r], [r, h, r], "holo");
  // per-instance material clone so a room can pulse opacity without touching other holo tables
  const holoMat = (materials[mat] || materials.holo).clone();
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.2, holoH, 24, 1, true), holoMat);
  cone.position.set(pos[0], pos[1] + h + holoH / 2, pos[2]);
  const grid = new THREE.Mesh(new THREE.TorusGeometry(r * 0.55, 0.02, 6, 48), holoMat);
  grid.rotation.x = Math.PI / 2;
  grid.position.set(pos[0], pos[1] + h + 0.5, pos[2]);
  group.add(cone, grid);
  return { cone, grid, material: holoMat };
}

// Floor marking (yellow/white line) slightly proud of the deck.
export function floorLine(kit, a, b, w = 0.12, mat = "emitAmber", color) {
  const min = [Math.min(a[0], b[0]), a[1], Math.min(a[2], b[2])];
  const max = [Math.max(a[0], b[0]), a[1], Math.max(a[2], b[2])];
  const alongX = max[0] - min[0] >= max[2] - min[2];
  if (alongX) kit.boxMM(mat, [min[0], a[1], min[2] - w / 2], [max[0], a[1] + 0.006, min[2] + w / 2], color ? { color } : {});
  else kit.boxMM(mat, [min[0] - w / 2, a[1], min[2]], [min[0] + w / 2, a[1] + 0.006, max[2]], color ? { color } : {});
}

// Ceiling drop fixture: dark housing with a bright diffuser, hung from a stem.
export function dropLight(kit, PALETTE, pos, { w = 1.6, d = 0.4, stem = 0.6, mat = "emitCoolSoft" } = {}) {
  kit.box("paintedMetal", pos[0], pos[1] - stem / 2, pos[2], 0.06, stem, 0.06, { color: col(PALETTE, "impBlack") });
  kit.box("paintedMetal", pos[0], pos[1] - stem - 0.06, pos[2], w, 0.12, d, { color: col(PALETTE, "impDark"), texel: 2.5 });
  kit.box(mat, pos[0], pos[1] - stem - 0.125, pos[2], w - 0.12, 0.02, d - 0.12, { uv: "keep" });
}

// Wall-mounted equipment cabinet with a lit status panel, doors facing local +Z.
export function cabinet(kit, PALETTE, pos, yaw, { w = 1.2, h = 1.8, d = 0.5, color, emit = "emitBlue", seed = 9 } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, h / 2, 0, w, h, d, { color: color || col(PALETTE, "impMid"), texel: 2.5 });
  P.box("impPanel", 0, h / 2, d / 2 + 0.012, w - 0.08, h - 0.08, 0.02, { color: col(PALETTE, "impGrey"), uv: "keep" });
  P.box("paintedMetal", 0, h / 2, d / 2 + 0.024, 0.02, h - 0.2, 0.01, { color: col(PALETTE, "impBlack") });
  indicatorField(P, 0, h - 0.25, d / 2 + 0.025, w - 0.3, 0.16, seed);
  P.box(emit, -w / 2 + 0.15, h - 0.5, d / 2 + 0.026, 0.08, 0.02, 0.006);
  P.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "cabinet");
}

// Hazard chevron strip on the floor at world rect (uses the shared hazard material).
export function hazardStrip(kit, min, max, y) {
  kit.boxMM("hazard", [min[0], y, min[1]], [max[0], y + 0.005, max[1]], { texel: 2 });
}
