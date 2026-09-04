// Deck C (crew deck) shared prop vocabulary: yawed placement helper, compound geometry for instanced
// props, and the furniture the five crew-deck rooms share (benches, long tables, locker banks, wall
// lamps, camera housings, cable runs, blaster rifle silhouettes, helmets, floor gratings…).
// Everything is room-local and kit-bashed from primitives; nothing here touches another workstream's files.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { setVertexColor, worldUVs, rng } from "../kit.js";
import { PALETTE, setDomain } from "../materials.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { GRATE_TILE, makeDiffuser } from "../textures.js";
import { lux } from "./imperial_kit.js";

// ---------------------------------------------------------------------------
// Materials owned by this workstream (keys prefixed roomsc_), created once and shared by the crew-deck cells
// ---------------------------------------------------------------------------
let deckCMaterials = null;
export function ensureDeckCMaterials(kit) {
  if (!deckCMaterials) {
    const emit = (color, intensity, extra = {}) => setDomain(new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.08), emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 0.45, metalness: 0, ...extra }), "interior");
    const diffuser = makeDiffuser(256, 29);
    // half of the kit's emitWhiteDim: a louvred ceiling slot that reads as a fixture beside the room's keys
    // without ever being the brightest surface in frame (medbay troughs / slots, sterile white rooms)
    const slot = emit("#dfe6f4", 0.4, { emissiveMap: diffuser });
    deckCMaterials = { roomsc_slot: slot };
  }
  for (const [k, m] of Object.entries(deckCMaterials)) if (!kit.materials[k]) kit.materials[k] = m;
  return deckCMaterials;
}

/**
 * Key light for the big crew-deck rooms (30 m+ across, 8 fixtures): the level directly below the
 * fixture is still lux(drop, k), but the falloff is linear (decay 1) so one fixture carries ~8 m and
 * the far walls are not black. `y` is the fixture height above the floor (drop).
 */
export function keyLight(kit, x, y, z, opts = {}) {
  const { color = 0xdfe8ff, k = 1.4, distance = 14, priority = 0.5 } = opts;
  return kit.light({ type: "point", pos: [x, y, z], color, intensity: lux(y, k) / y, decay: 1, distance, priority });
}

const UP = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const Y_AXIS = UP;

export const DECK_C = {
  fabricDark: new THREE.Color("#3a3d44"),
  fabricGrey: new THREE.Color("#7d828c"),
  fabricBlue: new THREE.Color("#46536b"),
  fabricRed: new THREE.Color("#6a2a28"),
  fabricGreen: new THREE.Color("#3d5a4d"),
  steel: new THREE.Color("#b4b8be"),
  copper: new THREE.Color("#a86a3c"),
  bacta: new THREE.Color("#5fe0c0"),
  teal: new THREE.Color("#7fe0d8"),
  redField: new THREE.Color("#ff4030"),
  orange: new THREE.Color("#ff7a3a"),
  amberWarm: new THREE.Color("#ffc36b"),
};

// ---------------------------------------------------------------------------
// Placer: build a prop in its own local frame (x right, y up, -z forward) at (cx, cy, cz) with a yaw.
// ---------------------------------------------------------------------------
export class Placer {
  constructor(kit, cx, cy, cz, yaw = 0) {
    this.kit = kit;
    this.o = new THREE.Vector3(cx, cy, cz);
    this.yaw = yaw;
    this.q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  }
  pos(lx, ly, lz) {
    return new THREE.Vector3(lx, ly, lz).applyQuaternion(this.q).add(this.o);
  }
  quat(extra = null) {
    return extra ? this.q.clone().multiply(extra) : this.q;
  }
  add(mat, geo, lx, ly, lz, opts = {}) {
    const p = this.pos(lx, ly, lz);
    const { tilt, roll, ...rest } = opts;
    let q = this.q;
    if (tilt) q = this.quat(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt));
    if (roll) q = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, roll));
    return this.kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...rest });
  }
  box(mat, lx, ly, lz, sx, sy, sz, opts = {}) {
    return this.add(mat, new THREE.BoxGeometry(sx, sy, sz), lx, ly, lz, opts);
  }
  /** cylinder along local axis 'x' | 'y' | 'z' */
  cyl(mat, lx, ly, lz, r, len, axis = "y", opts = {}) {
    const g = new THREE.CylinderGeometry(opts.r2 !== undefined ? opts.r2 : r, r, len, opts.segments || 12, 1, opts.open || false);
    if (axis === "x") g.rotateZ(Math.PI / 2);
    else if (axis === "z") g.rotateX(Math.PI / 2);
    const { r2, open, segments, ...rest } = opts;
    return this.add(mat, g, lx, ly, lz, { uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
  }
  sphere(mat, lx, ly, lz, r, opts = {}) {
    const g = new THREE.SphereGeometry(r, opts.segments || 14, opts.rings || 10);
    const { segments, rings, ...rest } = opts;
    return this.add(mat, g, lx, ly, lz, { uv: "scale", uvScale: [r * 4, r * 2], ...rest });
  }
  /** Plane facing a local direction: "+z" (default), "-z", "+x", "-x", "up", "down". */
  plane(mat, lx, ly, lz, w, h, facing = "+z", opts = {}) {
    const g = new THREE.PlaneGeometry(w, h);
    if (facing === "-z") g.rotateY(Math.PI);
    else if (facing === "+x") g.rotateY(Math.PI / 2);
    else if (facing === "-x") g.rotateY(-Math.PI / 2);
    else if (facing === "up") g.rotateX(-Math.PI / 2);
    else if (facing === "down") g.rotateX(Math.PI / 2);
    return this.add(mat, g, lx, ly, lz, { uv: "keep", ...opts });
  }
  screen(key, lx, ly, lz, w, h, facing = "+z", opts = {}) {
    return this.plane(key, lx, ly, lz, w, h, facing, opts);
  }
  decal(index, lx, ly, lz, size, facing = "+z", opts = {}) {
    return this.plane("decalImp", lx, ly, lz, size, opts.h || size, facing, { uvRect: impDecalRect(index), ...opts });
  }
  /** AABB collider of a local box (corners rotated into room space). */
  collider(x0, y0, z0, x1, y1, z1, tag = "prop") {
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
      const p = this.pos(x, 0, z);
      min.x = Math.min(min.x, p.x);
      min.z = Math.min(min.z, p.z);
      max.x = Math.max(max.x, p.x);
      max.z = Math.max(max.z, p.z);
    }
    min.y = this.o.y + y0;
    max.y = this.o.y + y1;
    this.kit.collider([min.x, min.y, min.z], [max.x, max.y, max.z], tag);
  }
  /** Instance matrix for kit.instance at a local offset (+ extra local yaw). */
  matrix(lx = 0, ly = 0, lz = 0, yaw = 0, scale = 1) {
    const p = this.pos(lx, ly, lz);
    const q = yaw ? this.quat(new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw)) : this.q;
    return new THREE.Matrix4().compose(p, q, new THREE.Vector3(scale, scale, scale));
  }
}

// ---------------------------------------------------------------------------
// Compound geometry for kit.instance: parts baked into one non-indexed geometry with per-part vertex
// colours and planar UVs, so a multi-tone prop needs only one material / draw call.
// parts: [{ geo, pos:[x,y,z], rot:[rx,ry,rz], color }]
// ---------------------------------------------------------------------------
export function compound(parts, texel = 1) {
  const geos = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  for (const p of parts) {
    let g = p.geo;
    q.setFromEuler(new THREE.Euler(...(p.rot || [0, 0, 0])));
    m.compose(new THREE.Vector3(...(p.pos || [0, 0, 0])), q, one);
    g.applyMatrix4(m);
    if (g.index) g = g.toNonIndexed();
    if (!g.attributes.normal) g.computeVertexNormals();
    worldUVs(g, p.texel || texel);
    setVertexColor(g, p.color || 0xffffff);
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(k)) g.deleteAttribute(k);
    geos.push(g);
  }
  return mergeGeometries(geos, false);
}
export const B = (sx, sy, sz, pos, color, rot) => ({ geo: new THREE.BoxGeometry(sx, sy, sz), pos, color, rot });
export const C = (r, len, pos, color, axis = "y", segments = 10, r2) => {
  const g = new THREE.CylinderGeometry(r2 !== undefined ? r2 : r, r, len, segments);
  if (axis === "x") g.rotateZ(Math.PI / 2);
  else if (axis === "z") g.rotateX(Math.PI / 2);
  return { geo: g, pos, color };
};
export const S = (r, pos, color, segments = 12) => ({ geo: new THREE.SphereGeometry(r, segments, Math.max(6, segments >> 1)), pos, color });

/** Straight rod (cylinder) between two room-local points a and b. */
export function rod(kit, mat, a, b, r, opts = {}) {
  const A = new THREE.Vector3(a[0], a[1], a[2]);
  const Bp = new THREE.Vector3(b[0], b[1], b[2]);
  const len = A.distanceTo(Bp);
  const dir = Bp.clone().sub(A).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir);
  const mid = A.add(Bp).multiplyScalar(0.5);
  const g = new THREE.CylinderGeometry(r, r, len, opts.segments || 10);
  return kit.add(mat, g, { pos: [mid.x, mid.y, mid.z], quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], color: opts.color || 0xffffff });
}

/** Sagging hose / cable through room-local points (Catmull-Rom tube). */
export function tube(kit, mat, points, r, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  const g = new THREE.TubeGeometry(curve, opts.segments || 24, r, opts.radial || 8, false);
  return kit.add(mat, g, { uv: "scale", uvScale: [curve.getLength(), 2 * Math.PI * r], color: opts.color || 0xffffff });
}

/** Ring (torus) lying flat (axis = y) or standing (axis = 'x' | 'z'). */
export function ring(kit, mat, x, y, z, r, tubeR, opts = {}) {
  const g = new THREE.TorusGeometry(r, tubeR, opts.tubeSegments || 8, opts.segments || 32);
  const axis = opts.axis || "y";
  if (axis === "y") g.rotateX(Math.PI / 2);
  else if (axis === "x") g.rotateY(Math.PI / 2);
  return kit.add(mat, g, { pos: [x, y, z], uv: "scale", uvScale: [2 * Math.PI * r, 2 * Math.PI * tubeR], color: opts.color || 0xffffff });
}

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------

/** Long mess/common table with a bench each side; length along local x, operator seats at ±z. */
export function longTable(kit, cx, cz, len, yaw = 0, opts = {}) {
  const { topColor = PALETTE.impGrey, benches = true, y = 0, tag = "table", items = null, seed = 1, legLight = true } = opts;
  const p = new Placer(kit, cx, y, cz, yaw);
  const w = 0.9;
  // top: grey enamel slab on a black frame, two pedestal legs
  p.box("impTrim", 0, 0.74, 0, len, 0.06, w, { color: PALETTE.impBlack, texel: 1 });
  p.box("impPanel1", 0, 0.775, 0, len - 0.06, 0.02, w - 0.06, { color: topColor, uv: "world", texel: 1 });
  p.box("impMetal", 0, 0.7, 0, len - 0.1, 0.03, w - 0.2, { color: PALETTE.impCharcoal });
  for (const s of [-1, 1]) {
    p.box("impTrim", s * (len / 2 - 0.5), 0.36, 0, 0.12, 0.7, 0.6, { color: PALETTE.impBlack, texel: 1 });
    p.box("impMetal", s * (len / 2 - 0.5), 0.04, 0, 0.5, 0.08, 0.8, { color: PALETTE.impCharcoal, texel: 1 });
    // pedestal face: a lit strip (barracks night marker) or a plain brushed inset (mess hall: no under-table LEDs)
    if (legLight) p.box(opts.accentKey || "emitBlue", s * (len / 2 - 0.5), 0.36, 0, 0.13, 0.35, 0.03);
    else p.box("impMetal", s * (len / 2 - 0.5), 0.36, 0, 0.13, 0.35, 0.03, { color: PALETTE.impGreyDark });
  }
  // under-top cable tray + power socket strip
  p.box("impMetal", 0, 0.66, 0, len - 0.6, 0.04, 0.2, { color: PALETTE.impGreyDark });
  if (benches) {
    for (const s of [-1, 1]) {
      const bz = s * 0.78;
      p.box("impTrim", 0, 0.43, bz, len - 0.4, 0.05, 0.36, { color: PALETTE.impBlack, texel: 1 });
      p.box("rubber", 0, 0.47, bz, len - 0.46, 0.04, 0.32, { color: PALETTE.impGreyDark });
      for (const e of [-1, 1]) p.box("impTrim", e * (len / 2 - 0.45), 0.2, bz, 0.08, 0.4, 0.3, { color: PALETTE.impBlack });
      // bench-to-table stretcher
      p.box("impMetal", 0, 0.12, bz * 0.5, len - 0.6, 0.04, 0.06, { color: PALETTE.impGreyDark });
    }
    p.collider(-len / 2, 0, -w / 2 - 0.55, len / 2, 0.8, w / 2 + 0.55, tag);
  } else p.collider(-len / 2, 0, -w / 2, len / 2, 0.8, w / 2, tag);
  // table-top items (trays, mugs, datapads)
  if (items) {
    const rand = rng(seed);
    for (let i = 0; i < items; i++) {
      const lx = -len / 2 + 0.5 + rand() * (len - 1);
      const lz = (rand() - 0.5) * 0.5;
      const r = rand();
      if (r < 0.4) {
        // meal tray with compartments
        p.box("impMetal", lx, 0.8, lz, 0.42, 0.025, 0.3, { color: PALETTE.impGrey });
        p.box("impTrim", lx - 0.08, 0.815, lz, 0.18, 0.012, 0.22, { color: PALETTE.impCharcoal });
        p.box("impTrim", lx + 0.12, 0.815, lz + 0.06, 0.12, 0.012, 0.1, { color: PALETTE.impCharcoal });
      } else if (r < 0.75) {
        p.cyl("impMetal", lx, 0.84, lz, 0.038, 0.1, "y", { color: rand() < 0.5 ? PALETTE.impGrey : PALETTE.impGreyDark, segments: 10 });
      } else {
        // datapad
        p.box("impGloss", lx, 0.795, lz, 0.22, 0.015, 0.15);
        p.plane("scrBlue1", lx, 0.808, lz, 0.18, 0.11, "up");
      }
    }
  }
  return p;
}

/** Bank of n lockers against a wall; local -z is the wall side, doors face +z. */
export function lockerBank(kit, cx, cz, yaw, n, opts = {}) {
  const { w = 0.6, h = 2.1, d = 0.55, color = PALETTE.impGrey, accentKey = "emitBlue", seed = 3, numbers = true, y = 0 } = opts;
  const p = new Placer(kit, cx, y, cz, yaw);
  const rand = rng(seed);
  const len = n * w;
  p.box("impTrim", 0, h / 2, 0, len + 0.04, h, d, { color: PALETTE.impBlack, texel: 1 });
  p.box("impTrim", 0, 0.05, 0.01, len + 0.08, 0.1, d + 0.02, { color: PALETTE.impBlack });
  p.box("impMetal", 0, h + 0.03, 0, len + 0.06, 0.06, d + 0.02, { color: PALETTE.impCharcoal, texel: 1 });
  for (let i = 0; i < n; i++) {
    const lx = -len / 2 + (i + 0.5) * w;
    const dz = d / 2 + 0.012;
    p.box("impPanel1", lx, h / 2 + 0.03, dz, w - 0.06, h - 0.2, 0.024, { color: rand() < 0.15 ? PALETTE.impWhite : color, uv: "world", texel: 1 });
    // seam, handle, vent slots, latch light, number
    p.box("impTrim", lx + w * 0.3, h * 0.5, dz + 0.02, 0.03, 0.26, 0.02, { color: PALETTE.impBlack });
    p.box("impMetal", lx + w * 0.3, h * 0.5, dz + 0.035, 0.015, 0.2, 0.012, { color: DECK_C.steel });
    for (let s = 0; s < 5; s++) p.box("impMetal", lx, 0.32 + s * 0.06, dz + 0.014, w * 0.5, 0.018, 0.012, { color: PALETTE.impGreyDark });
    for (let s = 0; s < 4; s++) p.box("impMetal", lx, h - 0.42 + s * 0.06, dz + 0.014, w * 0.5, 0.018, 0.012, { color: PALETTE.impGreyDark });
    p.box(rand() < 0.8 ? accentKey : "emitRedImp", lx - w * 0.3, h * 0.5 + 0.2, dz + 0.014, 0.04, 0.04, 0.01);
    if (numbers) p.decal([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03, IMP_DECAL.glyphs2][i % 4], lx, h - 0.6, dz + 0.014, 0.22);
  }
  p.collider(-len / 2 - 0.03, 0, -d / 2, len / 2 + 0.03, h + 0.06, d / 2 + 0.05, "locker");
  return p;
}

/** Wall lamp: black hood with an emissive slot and louvre fins, on a wall frame at (u, v). */
export function hoodLamp(frame, u, v, key = "emitWhiteSoft", w = 0.7) {
  frame.box("impTrim", u, v, 0.07, w, 0.14, 0.14, { color: PALETTE.impBlack });
  frame.box(key, u, v - 0.02, 0.13, w - 0.14, 0.05, 0.03, { uv: "keep" });
  for (let k = 0; k < 3; k++) frame.box("impMetal", u, v - 0.05 + k * 0.04, 0.145, w - 0.12, 0.008, 0.02, { color: PALETTE.impGreyDark });
}

/** Ceiling light panel: black housing, emissive diffuser inset 3 cm below the housing face. */
export function ceilingPanel(kit, cx, cz, y, w, d, key = "emitWhiteSoft") {
  kit.box("impTrim", cx, y - 0.05, cz, w + 0.16, 0.1, d + 0.16, { color: PALETTE.impBlack, texel: 1 });
  kit.box(key, cx, y - 0.105, cz, w, 0.02, d, { uv: "keep" });
  for (let f = -d / 2 + 0.2; f < d / 2 - 0.1; f += 0.25) kit.box("impTrim", cx, y - 0.125, cz + f, w + 0.02, 0.012, 0.02, { color: PALETTE.impBlack });
}

/**
 * Recessed ceiling slot light: black housing proud of the ceiling ribs, a narrow dim emissive bar set
 * back inside it and louvre fins across the opening, so the fixture reads as a shape and never blooms.
 * `axis` is the slot's long direction ("x" | "z"); `key` should be one of the *Dim emitters.
 */
export function slotLight(kit, cx, cz, y, len, axis = "x", key = "emitWhiteDim", opts = {}) {
  const { w = 0.36, h = 0.2, finStep = 0.25, bar = 0.07, tag = null, drop = 0 } = opts;
  const along = axis === "x";
  const sx = (along ? len : w) + 0.1;
  const sz = (along ? w : len) + 0.1;
  const top = y - drop; // top face of the housing (drop > 0: suspended on two stems)
  const bot = top - h;
  if (drop > 0) {
    for (const e of [-1, 1]) {
      const px = along ? cx + e * (len / 2 - 0.3) : cx;
      const pz = along ? cz : cz + e * (len / 2 - 0.3);
      kit.cyl("impMetal", px, y - drop / 2, pz, 0.015, drop, "y", { color: PALETTE.impGreyDark, segments: 6 });
      kit.cyl("impTrim", px, y - 0.03, pz, 0.06, 0.06, "y", { color: PALETTE.impBlack, segments: 10 });
    }
  }
  // hollow housing (top plate + four walls, open toward the floor) so the bar really is recessed inside it
  kit.box("impTrim", cx, top - 0.02, cz, sx, 0.04, sz, { color: PALETTE.impBlack, texel: 1 });
  for (const e of [-1, 1]) {
    kit.box("impTrim", cx + e * (sx / 2 - 0.015), top - h / 2, cz, 0.03, h, sz, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impTrim", cx, top - h / 2, cz + e * (sz / 2 - 0.015), sx, h, 0.03, { color: PALETTE.impBlack, texel: 1 });
  }
  kit.box("impMetal", cx, top - 0.06, cz, sx - 0.08, 0.02, sz - 0.08, { color: PALETTE.impCharcoal });
  kit.box(key, cx, top - 0.075, cz, along ? len - 0.3 : bar, 0.012, along ? bar : len - 0.3, { uv: "keep" });
  for (let f = -len / 2 + 0.2; f < len / 2 - 0.1; f += finStep) {
    if (along) kit.box("impTrim", cx + f, bot + 0.02, cz, 0.02, 0.04, w - 0.04, { color: PALETTE.impBlack });
    else kit.box("impTrim", cx, bot + 0.02, cz + f, w - 0.04, 0.04, 0.02, { color: PALETTE.impBlack });
  }
  if (tag) kit.collider([cx - sx / 2, bot, cz - sz / 2], [cx + sx / 2, y, cz + sz / 2], tag);
  return bot;
}

/** Pendant lamp over a table: rod, conical housing, warm diffuser. */
export function pendantGeo() {
  return compound([
    C(0.012, 1.0, [0, 0.5, 0], PALETTE.impGreyDark, "y", 6),
    // r2 = top radius (same convention as kit.cyl): narrow at the rod, wide at the diffuser
    C(0.32, 0.22, [0, -0.11, 0], PALETTE.impBlack, "y", 14, 0.16),
    C(0.06, 0.06, [0, 0.03, 0], PALETTE.impCharcoal, "y", 10),
  ]);
}
export function pendantGlowGeo() {
  return compound([C(0.27, 0.02, [0, -0.215, 0], 0xffffff, "y", 14)]);
}

/** Security camera housing in a corner: wedge box, lens barrel, red LED. dir = yaw the lens looks toward. */
export function cameraHousing(kit, x, y, z, yaw) {
  const p = new Placer(kit, x, y, z, yaw);
  p.box("impTrim", 0, 0, 0, 0.26, 0.16, 0.34, { color: PALETTE.impBlack });
  p.box("impMetal", 0, 0.1, 0.02, 0.08, 0.06, 0.2, { color: PALETTE.impCharcoal });
  p.cyl("impMetal", 0, -0.02, -0.2, 0.05, 0.1, "z", { color: PALETTE.impGreyDark, segments: 12 });
  p.cyl("impGloss", 0, -0.02, -0.26, 0.036, 0.02, "z", { segments: 12 });
  p.box("emitRedImp", 0.09, 0.03, -0.172, 0.02, 0.02, 0.01);
}

/** Cable / conduit run along a wall frame between u0 and u1 at height v, with clamps every 1.2 m. */
export function cableRun(frame, u0, u1, v, opts = {}) {
  const { n = 3, seed = 5, clampStep = 1.4 } = opts;
  const rand = rng(seed);
  const len = u1 - u0;
  const cu = (u0 + u1) / 2;
  const cols = [PALETTE.impGreyDark, PALETTE.impCharcoal, PALETTE.impGrey, DECK_C.copper];
  for (let i = 0; i < n; i++) {
    const r = 0.018 + rand() * 0.022;
    const dv = (i - (n - 1) / 2) * 0.09;
    frame.cylU("impMetal", cu, v + dv, 0.03 + r, r, len, { color: cols[Math.floor(rand() * cols.length)], segments: 8 });
  }
  for (let u = u0 + 0.3; u < u1 - 0.2; u += clampStep) {
    frame.box("impTrim", u, v, 0.04, 0.08, n * 0.09 + 0.06, 0.1, { color: PALETTE.impBlack });
    frame.cylN("impMetal", u, v + (n * 0.09) / 2 + 0.01, 0.09, 0.012, 0.012, { color: DECK_C.steel, segments: 6 });
  }
  // junction box at one end
  frame.box("impTrim", u1 - 0.1, v, 0.07, 0.2, n * 0.09 + 0.2, 0.16, { color: PALETTE.impBlack, texel: 1 });
  frame.box(opts.accentKey || "emitBlue", u1 - 0.1, v + (n * 0.09) / 2 + 0.05, 0.152, 0.05, 0.03, 0.01);
}

/** Blaster rifle silhouette (original kit-bash), muzzle toward +x, ~1.0 m long, lying flat. One material. */
export function rifleGeo() {
  const blk = PALETTE.impBlack;
  const chr = PALETTE.impCharcoal;
  const gd = PALETTE.impGreyDark;
  return compound(
    [
      B(0.36, 0.085, 0.055, [0.02, 0, 0], blk), // receiver
      B(0.14, 0.05, 0.062, [-0.02, 0.005, 0], chr), // side housing
      B(0.05, 0.11, 0.03, [0.06, -0.09, 0], blk), // magazine
      C(0.02, 0.5, [0.44, 0.01, 0], gd, "x", 10), // barrel
      C(0.035, 0.05, [0.7, 0.01, 0], blk, "x", 10), // muzzle guard
      C(0.03, 0.02, [0.3, 0.01, 0], gd, "x", 10), // barrel rings
      C(0.03, 0.02, [0.38, 0.01, 0], gd, "x", 10),
      C(0.03, 0.02, [0.46, 0.01, 0], gd, "x", 10),
      C(0.022, 0.24, [0.0, 0.085, 0], blk, "x", 10), // scope
      B(0.03, 0.03, 0.02, [-0.05, 0.05, 0], gd), // scope mount
      B(0.03, 0.03, 0.02, [0.08, 0.05, 0], gd),
      B(0.04, 0.12, 0.03, [-0.1, -0.08, 0], blk, [0, 0, 0.25]), // grip
      B(0.26, 0.02, 0.02, [-0.3, 0.0, 0.0], gd), // stock bar (folded frame)
      B(0.03, 0.09, 0.02, [-0.42, -0.03, 0], gd), // stock end
      B(0.2, 0.02, 0.02, [-0.3, -0.07, 0.0], gd),
    ],
    2,
  );
}

/** Rifle rack section: back plate, base shelf, clamp bar, `n` rifles standing upright. Faces +z local. */
export function rifleRack(kit, cx, cz, yaw, n, opts = {}) {
  const { accentKey = "emitAmber", seed = 1, key = "dc_rifle" } = opts;
  const p = new Placer(kit, cx, 0, cz, yaw);
  const pitch = 0.42;
  const len = n * pitch + 0.2;
  p.box("impTrim", 0, 1.1, -0.15, len, 2.2, 0.1, { color: PALETTE.impBlack, texel: 1 });
  // light backboard so the dark rifle silhouettes read from across the room
  p.box("impPanel1", 0, 1.1, -0.09, len - 0.12, 2.0, 0.02, { color: PALETTE.impGrey, uv: "world", texel: 1 });
  p.box("impMetal", 0, 0.12, 0.15, len, 0.06, 0.5, { color: PALETTE.impCharcoal, texel: 1 });
  p.box("impTrim", 0, 0.05, 0.15, len, 0.1, 0.5, { color: PALETTE.impBlack });
  p.box("impMetal", 0, 1.35, 0.14, len - 0.1, 0.05, 0.05, { color: PALETTE.impGreyDark });
  p.box("impTrim", 0, 2.1, 0.02, len - 0.1, 0.12, 0.3, { color: PALETTE.impBlack });
  p.box(accentKey, 0, 2.05, 0.12, len - 0.3, 0.03, 0.05);
  const rand = rng(seed);
  for (let i = 0; i < n; i++) {
    const lx = -len / 2 + 0.1 + (i + 0.5) * pitch;
    // clamp jaws around the barrel
    p.box("impMetal", lx, 1.35, 0.17, 0.09, 0.07, 0.1, { color: PALETTE.impGreyDark });
    if (rand() < 0.85) {
      // upright rifle: muzzle up; rotate about z by +90° so local +x -> +y, then a little yaw jitter
      const q = p.quat(new THREE.Quaternion().setFromAxisAngle(Y_AXIS, Math.PI / 2 + (rand() - 0.5) * 0.06).multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, Math.PI / 2)));
      const pos = p.pos(lx, 0.6, 0.15);
      kit.instance(key, "impMetal", rifleGeo, new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1)), 0xffffff);
    } else {
      // empty slot: issued-out tag
      p.decal(IMP_DECAL.glyphs1, lx, 1.0, -0.078, 0.2);
    }
    p.box(rand() < 0.7 ? accentKey : "emitRedImp", lx, 0.28, 0.4, 0.04, 0.02, 0.02);
  }
  p.collider(-len / 2, 0, -0.2, len / 2, 2.2, 0.42, "rack");
  return p;
}

/** Trooper helmet: white shell, black visor slit, grey cheek vents. Sits on its base at (x, y, z). */
export function helmet(kit, x, y, z, yaw, opts = {}) {
  const p = new Placer(kit, x, y, z, yaw);
  const col = opts.color || PALETTE.impWhite;
  p.sphere("impPanel1", 0, 0.16, 0, 0.16, { color: col, segments: 16 });
  p.box("impPanel1", 0, 0.05, 0, 0.3, 0.1, 0.3, { color: col, uv: "world", texel: 2 });
  p.box("impTrim", 0, 0.17, -0.13, 0.22, 0.045, 0.08, { color: PALETTE.impBlack });
  p.box("impTrim", 0, 0.09, -0.13, 0.12, 0.05, 0.08, { color: PALETTE.impBlack });
  for (const s of [-1, 1]) p.box("impMetal", s * 0.12, 0.08, -0.06, 0.05, 0.03, 0.1, { color: PALETTE.impGreyDark });
  p.box("impTrim", 0, 0.03, 0, 0.32, 0.02, 0.32, { color: PALETTE.impBlack });
}

/** Pair of boots on the floor. */
export function boots(kit, x, z, yaw) {
  const p = new Placer(kit, x, 0, z, yaw);
  for (const s of [-1, 1]) {
    p.box("impTrim", s * 0.08, 0.17, 0, 0.11, 0.32, 0.13, { color: PALETTE.impBlack, texel: 2 });
    p.box("impTrim", s * 0.08, 0.03, -0.09, 0.11, 0.06, 0.3, { color: PALETTE.impBlack, texel: 2 });
    p.box("rubber", s * 0.08, 0.012, -0.09, 0.115, 0.024, 0.31, { color: PALETTE.impCharcoal });
  }
}

/**
 * Floor grating over the deck: the shell's floor slab cannot be cut, so a black plate sits 4 mm proud of
 * the deck, the grate quad 12 mm above it (holes read as a dark void), edge angles and proud rails on top.
 */
export function floorGrate(kit, x0, z0, x1, z1, y = 0) {
  const w = x1 - x0;
  const d = z1 - z0;
  kit.boxMM("impTrim", [x0, y + 0.002, z0], [x1, y + 0.006, z1], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impMetal", [x0 - 0.06, y + 0.002, z0 - 0.06], [x1 + 0.06, y + 0.03, z0], { color: PALETTE.impGreyDark });
  kit.boxMM("impMetal", [x0 - 0.06, y + 0.002, z1], [x1 + 0.06, y + 0.03, z1 + 0.06], { color: PALETTE.impGreyDark });
  kit.boxMM("impMetal", [x0 - 0.06, y + 0.002, z0], [x0, y + 0.03, z1], { color: PALETTE.impGreyDark });
  kit.boxMM("impMetal", [x1, y + 0.002, z0], [x1 + 0.06, y + 0.03, z1], { color: PALETTE.impGreyDark });
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  kit.add("grate", g, { pos: [(x0 + x1) / 2, y + 0.018, (z0 + z1) / 2], uv: "scale", uvScale: [w / GRATE_TILE[0], d / GRATE_TILE[1]] });
  const nR = Math.max(2, Math.round(d / 0.6));
  for (let i = 0; i <= nR; i++) kit.box("impMetal", (x0 + x1) / 2, y + 0.026, z0 + (i / nR) * d, w, 0.02, 0.03, { color: PALETTE.impGreyDark, texel: 2 });
}

/** Painted floor marking strip (chevron material) between two points, room-local; sits 2 cm proud so it clears the deck lane. */
export function floorStripe(kit, x0, z0, x1, z1, w = 0.3, mat = "chevronY", y = 0.02) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz);
  kit.add(mat, new THREE.BoxGeometry(w, 0.008, len), { pos: [(x0 + x1) / 2, y, (z0 + z1) / 2], rot: [0, yaw, 0], texel: 1.5 });
}

/** Wall sign: black plate with a decal and an accent strip on a wall frame. */
export function wallSign(frame, u, v, decal, size = 0.5, accentKey = "emitBlue") {
  frame.box("impTrim", u, v, 0.03, size + 0.2, size + 0.2, 0.06, { color: PALETTE.impBlack });
  frame.decal(decal, u, v, 0.065, size);
  frame.box(accentKey, u, v - size / 2 - 0.06, 0.062, size, 0.02, 0.01);
}

/** Standing droid silhouette (original design): tripod base, drum body, dome head with a visor slit, tool arms. */
export function medDroid(kit, x, z, yaw, opts = {}) {
  const p = new Placer(kit, x, opts.y || 0, z, yaw);
  const eye = opts.eyeKey || "emitRedImp";
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
    p.box("impTrim", Math.cos(a) * 0.22, 0.05, Math.sin(a) * 0.22, 0.12, 0.1, 0.16, { color: PALETTE.impBlack, roll: 0 });
    p.cyl("impMetal", Math.cos(a) * 0.16, 0.25, Math.sin(a) * 0.16, 0.025, 0.4, "y", { color: PALETTE.impGreyDark, segments: 8 });
  }
  p.cyl("impMetal", 0, 0.5, 0, 0.2, 0.12, "y", { color: PALETTE.impCharcoal, segments: 16 });
  p.cyl("impPanel1", 0, 1.0, 0, 0.24, 0.9, "y", { color: opts.body || PALETTE.impGrey, segments: 18, uv: "scale", uvScale: [1.5, 1] });
  p.box("impTrim", 0, 1.0, 0, 0.5, 0.06, 0.5, { color: PALETTE.impBlack });
  p.box("impTrim", 0, 0.7, 0, 0.5, 0.06, 0.5, { color: PALETTE.impBlack });
  p.plane("scrGreen1", 0, 1.15, 0.245, 0.24, 0.14, "+z");
  for (let k = 0; k < 4; k++) p.box(k % 2 ? eye : "emitGreen", -0.12 + k * 0.08, 0.86, 0.245, 0.04, 0.03, 0.01);
  p.cyl("impMetal", 0, 1.5, 0, 0.1, 0.12, "y", { color: PALETTE.impGreyDark, segments: 12 });
  p.sphere("impPanel1", 0, 1.68, 0, 0.2, { color: opts.body || PALETTE.impGrey, segments: 16 });
  p.box("impTrim", 0, 1.7, 0.16, 0.24, 0.05, 0.1, { color: PALETTE.impBlack });
  p.box(eye, 0, 1.7, 0.2, 0.16, 0.02, 0.01);
  p.box("impMetal", 0, 1.9, 0, 0.02, 0.1, 0.02, { color: DECK_C.steel });
  // two arms: shoulder ball, upper arm, elbow, tool
  for (const s of [-1, 1]) {
    p.sphere("impMetal", s * 0.28, 1.25, 0, 0.06, { color: PALETTE.impGreyDark, segments: 10 });
    p.cyl("impMetal", s * 0.34, 1.05, 0.06, 0.025, 0.4, "y", { color: PALETTE.impGreyDark, segments: 8, tilt: 0.3 });
    p.sphere("impMetal", s * 0.36, 0.86, 0.12, 0.045, { color: PALETTE.impCharcoal, segments: 8 });
    p.cyl("impMetal", s * 0.36, 0.86, 0.3, 0.018, 0.3, "z", { color: DECK_C.steel, segments: 8 });
    p.box("impTrim", s * 0.36, 0.86, 0.46, 0.05, 0.06, 0.06, { color: PALETTE.impBlack });
  }
  p.collider(-0.4, 0, -0.4, 0.4, 1.95, 0.5, "droid");
}

/** Vertical stack of small crates with hazard / number stencils in a corner. */
export function crateStack(kit, x, z, yaw, opts = {}) {
  const { seed = 1, decal = IMP_DECAL.hazard, n = 3 } = opts;
  const rand = rng(seed);
  const p = new Placer(kit, x, 0, z, yaw);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const sx = 0.9 - i * 0.12;
    const sz = 0.7 - i * 0.08;
    const sy = 0.45 - i * 0.05;
    p.box("impPanel1", (rand() - 0.5) * 0.1, y + sy / 2, 0, sx, sy, sz, { color: i % 2 ? PALETTE.impGreyDark : PALETTE.impGrey, uv: "world", texel: 1 });
    p.box("impTrim", 0, y + sy / 2, 0, sx + 0.02, sy * 0.15, sz + 0.02, { color: PALETTE.impBlack });
    p.box("impTrim", 0, y + sy - 0.02, 0, sx + 0.02, 0.04, sz + 0.02, { color: PALETTE.impBlack });
    p.box("impTrim", 0, y + 0.02, 0, sx + 0.02, 0.04, sz + 0.02, { color: PALETTE.impBlack });
    p.decal(decal, 0, y + sy * 0.55, sz / 2 + 0.014, Math.min(0.32, sy * 0.7));
    y += sy;
  }
  p.collider(-0.5, 0, -0.4, 0.5, y, 0.4, "crates");
}

/** Half-height counter (serving line / issue counter), length along local x, front face +z. */
export function counter(kit, cx, cz, yaw, len, opts = {}) {
  const { depth = 0.7, h = 0.95, top = PALETTE.impGrey, front = PALETTE.impWhite, accentKey = "emitAmber", y = 0, tag = "counter", kickLight = true } = opts;
  const p = new Placer(kit, cx, y, cz, yaw);
  p.box("impTrim", 0, h / 2, 0, len, h, depth, { color: PALETTE.impBlack, texel: 1 });
  p.box("impPanel1", 0, h / 2 + 0.05, depth / 2 + 0.012, len - 0.1, h - 0.3, 0.024, { color: front, uv: "world", texel: 1 });
  for (let x = -len / 2 + 0.9; x < len / 2 - 0.4; x += 0.9) p.box("impTrim", x, h / 2 + 0.05, depth / 2 + 0.026, 0.02, h - 0.34, 0.01, { color: PALETTE.impBlack });
  p.box("impMetal", 0, h + 0.02, 0, len + 0.06, 0.04, depth + 0.1, { color: top, texel: 1 });
  p.box("impMetal", 0, h + 0.05, 0, len + 0.02, 0.02, depth + 0.06, { color: PALETTE.impGrey, texel: 1 });
  if (kickLight) p.box(accentKey, 0, 0.12, depth / 2 + 0.012, len - 0.3, 0.025, 0.01);
  p.collider(-len / 2 - 0.03, 0, -depth / 2 - 0.05, len / 2 + 0.03, h + 0.08, depth / 2 + 0.06, tag);
  return p;
}

/** Overhead monitor arm: ceiling post, elbow, articulated arm ending in a screen facing `facing`. */
export function monitorArm(kit, x, z, hCeil, opts = {}) {
  const { screen = "scrGreen0", yaw = 0, drop = 1.4, reach = 0.6, w = 0.55, h = 0.36 } = opts;
  const p = new Placer(kit, x, hCeil, z, yaw);
  p.cyl("impMetal", 0, -drop / 2, 0, 0.035, drop, "y", { color: PALETTE.impGreyDark, segments: 10 });
  p.cyl("impTrim", 0, -0.04, 0, 0.12, 0.08, "y", { color: PALETTE.impBlack, segments: 12 });
  p.sphere("impMetal", 0, -drop, 0, 0.07, { color: PALETTE.impCharcoal, segments: 10 });
  p.cyl("impMetal", 0, -drop - 0.02, reach / 2, 0.028, reach, "z", { color: PALETTE.impGreyDark, segments: 8 });
  p.box("impTrim", 0, -drop - 0.05, reach, w + 0.08, h + 0.08, 0.06, { color: PALETTE.impBlack });
  p.plane(screen, 0, -drop - 0.05, reach + 0.032, w, h, "+z");
  p.box("emitGreen", -w / 2 + 0.06, -drop - 0.05 - h / 2 - 0.01, reach + 0.032, 0.05, 0.02, 0.01);
  return p;
}

/** Slim wall-mounted status unit: bezel, screen, LEDs, decal (fills bare panels between props). */
export function statusUnit(frame, u, v, opts = {}) {
  const { screen = "scrWhite0", accentKey = "emitBlue", w = 0.7 } = opts;
  frame.box("impTrim", u, v, 0.05, w, 0.5, 0.1, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impGloss", u, v + 0.04, 0.105, w - 0.12, 0.3, 0.01);
  frame.screen(screen, u, v + 0.04, 0.112, w - 0.16, 0.26);
  frame.box("leds", u, v - 0.17, 0.105, w - 0.2, 0.04, 0.01, { uv: "keep" });
  frame.box(accentKey, u - w / 2 + 0.08, v - 0.17, 0.106, 0.04, 0.04, 0.01);
}
